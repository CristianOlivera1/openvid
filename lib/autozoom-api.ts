import type { ZoomFragment } from "@/types/zoom.types";

export type AutozoomStatus = "queued" | "processing" | "completed" | "failed" | "expired";
export type AutozoomStage =
  | "queued"
  | "download"
  | "probe"
  | "convert"
  | "sample"
  | "detect_cursor"
  | "segment"
  | "fragments"
  | "done";

export interface AutozoomVideoMeta {
  duration: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
}

export interface AutozoomJob {
  job_id: string;
  status: AutozoomStatus;
  progress: number;
  stage: AutozoomStage | null;
  error: { code: string; message: string } | null;
  video_meta: AutozoomVideoMeta;
  fragments: ZoomFragment[] | null;
  output_url: string | null;
  converted: boolean | null;
}

function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_AUTOZOOM_API_URL;
  if (!url) throw new Error("autozoom_api_not_configured");
  return url.replace(/\/+$/, "");
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || `autozoom_api_status_${response.status}`);
  }
  return payload as T;
}

export function startAutozoomJob(jobId: string, r2Url: string, token: string): Promise<AutozoomJob> {
  return request<AutozoomJob>("/jobs", token, {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, r2_url: r2Url }),
  });
}

export function getAutozoomJob(jobId: string, token: string): Promise<AutozoomJob> {
  return request<AutozoomJob>(`/jobs/${encodeURIComponent(jobId)}`, token);
}

export function expireAutozoomJob(jobId: string, token: string): Promise<void> {
  return request<void>(`/jobs/${encodeURIComponent(jobId)}`, token, { method: "DELETE" });
}

export function toEditorZoomFragments(job: AutozoomJob): ZoomFragment[] {
  return (job.fragments || []).map((fragment) => ({
    id: fragment.id,
    startTime: fragment.startTime,
    endTime: fragment.endTime,
    zoomLevel: fragment.zoomLevel,
    speed: fragment.speed,
    focusX: fragment.focusX,
    focusY: fragment.focusY,
    movementEnabled: fragment.movementEnabled,
    movementEndX: fragment.movementEndX,
    movementEndY: fragment.movementEndY,
    movementStartOffset: fragment.movementStartOffset,
    movementEndOffset: fragment.movementEndOffset,
    movementMode: fragment.movementMode,
    trail: fragment.trail as ZoomFragment["trail"],
    trailSourceStartTime: fragment.movementMode === "orbital" ? fragment.startTime : undefined,
  }));
}
