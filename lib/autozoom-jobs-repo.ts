import type { SupabaseClient } from "@supabase/supabase-js";

import type { AutozoomJob, AutozoomStatus } from "./autozoom-api";

export interface AutozoomJobRow {
  id: string;
  user_id: string;
  r2_url: string | null;
  status: AutozoomStatus;
  stage: AutozoomJob["stage"];
  progress: number;
  error_code: string | null;
  error_message: string | null;
  duration_s: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  fragments: AutozoomJob["fragments"];
  output_url: string | null;
  converted: boolean | null;
  created_at: string;
}

/** A completed Autozoom job is the durable video-library record. */
export interface AutozoomLibraryVideo {
  id: string;
  outputUrl: string;
  fileName: string;
  duration: number;
  width: number | null;
  height: number | null;
  job: AutozoomJob;
}

function filenameFromUrl(url: string): string {
  try {
    const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return fileName || "autozoom-video.mp4";
  } catch {
    return "autozoom-video.mp4";
  }
}

export async function createQueuedAutozoomJob(
  supabase: SupabaseClient,
  userId: string,
  r2Url: string,
): Promise<AutozoomJobRow> {
  const { data, error } = await supabase
    .from("autozoom_jobs")
    .insert({ user_id: userId, r2_url: r2Url, status: "queued", stage: "queued", progress: 0 })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AutozoomJobRow;
}

export async function getLatestActiveAutozoomJob(
  supabase: SupabaseClient,
): Promise<AutozoomJobRow | null> {
  const { data, error } = await supabase
    .from("autozoom_jobs")
    .select("*")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as AutozoomJobRow | null;
}

export async function getCompletedAutozoomVideos(
  supabase: SupabaseClient,
): Promise<AutozoomLibraryVideo[]> {
  const { data, error } = await supabase
    .from("autozoom_jobs")
    .select("*")
    .eq("status", "completed")
    .not("output_url", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data || []) as AutozoomJobRow[])
    .filter((row) => !!row.output_url)
    .map((row) => ({
      id: row.id,
      outputUrl: row.output_url!,
      fileName: filenameFromUrl(row.output_url!),
      duration: row.duration_s || 0,
      width: row.width,
      height: row.height,
      job: jobFromRow(row),
    }));
}

export async function getCompletedAutozoomVideoById(
  supabase: SupabaseClient,
  id: string,
): Promise<AutozoomLibraryVideo | null> {
  const { data, error } = await supabase
    .from("autozoom_jobs")
    .select("*")
    .eq("id", id)
    .eq("status", "completed")
    .not("output_url", "is", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as AutozoomJobRow;
  if (!row.output_url) return null;
  return {
    id: row.id,
    outputUrl: row.output_url,
    fileName: filenameFromUrl(row.output_url),
    duration: row.duration_s || 0,
    width: row.width,
    height: row.height,
    job: jobFromRow(row),
  };
}

export function jobFromRow(row: AutozoomJobRow): AutozoomJob {
  return {
    job_id: row.id,
    status: row.status,
    progress: row.progress || 0,
    stage: row.stage,
    error: row.error_code ? { code: row.error_code, message: row.error_message || row.error_code } : null,
    video_meta: { duration: row.duration_s, fps: row.fps, width: row.width, height: row.height },
    fragments: row.fragments,
    output_url: row.output_url,
    converted: row.converted,
  };
}
