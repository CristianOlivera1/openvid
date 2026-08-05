"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";
import { getAutozoomJob, type AutozoomJob } from "@/lib/autozoom-api";
import { createQueuedAutozoomJob, getLatestActiveAutozoomJob, jobFromRow, type AutozoomJobRow } from "@/lib/autozoom-jobs-repo";
import { requestPresignedUpload, uploadVideoToR2, validateAutozoomVideo } from "@/lib/r2-upload";
import { startAutozoomJob } from "@/lib/autozoom-api";

export type AutozoomFlowStatus =
  | "idle"
  | "validating"
  | "uploading"
  | "queueing"
  | "processing"
  | "completed"
  | "failed";

export interface AutozoomFlowState {
  status: AutozoomFlowStatus;
  progress: number;
  stage: string | null;
  error: string | null;
  job: AutozoomJob | null;
  fileName: string | null;
  fileSize: number | null;
}

const INITIAL_STATE: AutozoomFlowState = {
  status: "idle",
  progress: 0,
  stage: null,
  error: null,
  job: null,
  fileName: null,
  fileSize: null,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "autozoom_processing_failed";
}

function statusFromJob(job: AutozoomJob): AutozoomFlowStatus {
  if (job.status === "completed") return "completed";
  if (job.status === "failed" || job.status === "expired") return "failed";
  return "processing";
}

export function useAutozoomJob({ user, session }: { user: User | null; session: Session | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<AutozoomFlowState>(INITIAL_STATE);
  const stateRef = useRef(state);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const resumedUserIdRef = useRef<string | null>(null);
  const startInFlightRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopWatching = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [supabase]);

  const applyJob = useCallback((job: AutozoomJob) => {
    activeJobIdRef.current = job.job_id;
    setState((previous) => ({
      ...previous,
      status: statusFromJob(job),
      progress: Math.max(previous.progress, job.progress || 0),
      stage: job.stage,
      error: job.error?.message || (job.status === "expired" ? "job_expired" : null),
      job,
    }));
  }, []);

  const watchJob = useCallback(async (jobId: string) => {
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error("missing_auth_session");

    stopWatching();
    activeJobIdRef.current = jobId;
    setState((previous) => ({ ...previous, status: "processing", stage: previous.stage || "queued", error: null }));

    let reachedTerminalState = false;
    const receiveRow = (row: AutozoomJobRow) => {
      const job = jobFromRow(row);
      applyJob(job);
      if (job.status === "completed" || job.status === "failed" || job.status === "expired") {
        reachedTerminalState = true;
        stopWatching();
      }
    };

    const channel = supabase
      .channel(`autozoom-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "autozoom_jobs", filter: `id=eq.${jobId}` },
        (payload) => receiveRow(payload.new as AutozoomJobRow),
      )
      .subscribe();
    channelRef.current = channel;

    const refresh = async () => {
      try {
        const job = await getAutozoomJob(jobId, accessToken);
        applyJob(job);
        if (job.status === "completed" || job.status === "failed" || job.status === "expired") {
          reachedTerminalState = true;
          stopWatching();
        }
      } catch (error) {
        console.warn("Unable to refresh autozoom job", error);
      }
    };

    await refresh();
    // `refresh` may have completed the job and called stopWatching(). Do not
    // recreate its interval afterwards, otherwise a finished job can revive
    // the processing overlay after a refresh.
    if (activeJobIdRef.current === jobId && !reachedTerminalState) {
      pollTimerRef.current = window.setInterval(refresh, 5000);
    }
  }, [applyJob, session?.access_token, stopWatching, supabase]);

  const start = useCallback(async (file: File) => {
    if (!user || !session?.access_token) {
      throw new Error("authentication_required");
    }
    if (startInFlightRef.current || ["validating", "uploading", "queueing", "processing"].includes(stateRef.current.status)) {
      return;
    }
    startInFlightRef.current = true;

    pendingFileRef.current = file;
    setState({
      status: "validating",
      progress: 0,
      stage: "validating",
      error: null,
      job: null,
      fileName: file.name,
      fileSize: file.size,
    });

    try {
      validateAutozoomVideo(file);
      const upload = await requestPresignedUpload(file);
      setState((previous) => ({ ...previous, status: "uploading", stage: "upload", progress: 0.02 }));
      await uploadVideoToR2(file, upload, (progress) => {
        setState((previous) => ({ ...previous, progress: 0.02 + progress * 0.43 }));
      });

      setState((previous) => ({ ...previous, status: "queueing", stage: "queued", progress: 0.46 }));
      const row = await createQueuedAutozoomJob(supabase, user.id, upload.r2Url);
      activeJobIdRef.current = row.id;
      await startAutozoomJob(row.id, upload.r2Url, session.access_token);
      await watchJob(row.id);
    } catch (error) {
      stopWatching();
      setState((previous) => ({
        ...previous,
        status: "failed",
        stage: previous.stage,
        error: errorMessage(error),
      }));
    } finally {
      startInFlightRef.current = false;
    }
  }, [session?.access_token, stopWatching, supabase, user, watchJob]);

  const retry = useCallback(async () => {
    if (!pendingFileRef.current) return;
    await start(pendingFileRef.current);
  }, [start]);

  const reset = useCallback(() => {
    stopWatching();
    activeJobIdRef.current = null;
    pendingFileRef.current = null;
    setState(INITIAL_STATE);
  }, [stopWatching]);

  useEffect(() => {
    if (!user || !session?.access_token || resumedUserIdRef.current === user.id) return;
    resumedUserIdRef.current = user.id;

    const resume = async () => {
      try {
        const activeJob = await getLatestActiveAutozoomJob(supabase);
        if (!activeJob) return;
        setState((previous) => ({
          ...previous,
          fileName: previous.fileName || "Video en procesamiento",
          status: "processing",
          progress: activeJob.progress || 0,
          stage: activeJob.stage,
          job: jobFromRow(activeJob),
        }));
        await watchJob(activeJob.id);
      } catch (error) {
        console.warn("Unable to resume autozoom job", error);
      }
    };

    void resume();
  }, [session?.access_token, supabase, user, watchJob]);

  useEffect(() => () => stopWatching(), [stopWatching]);

  return {
    state,
    start,
    retry,
    reset,
    isBusy: ["validating", "uploading", "queueing", "processing"].includes(state.status),
    activeJobId: activeJobIdRef.current,
  };
}
