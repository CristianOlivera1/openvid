export const MAX_AUTOZOOM_VIDEO_BYTES = 65 * 1024 * 1024;
export const AUTOZOOM_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;

export interface PresignedUpload {
  uploadUrl: string;
  r2Url: string;
  headers: Record<string, string>;
  expiresIn: number;
}

export function validateAutozoomVideo(file: File): void {
  if (!AUTOZOOM_VIDEO_TYPES.includes(file.type as typeof AUTOZOOM_VIDEO_TYPES[number])) {
    throw new Error("unsupported_video_type");
  }
  if (file.size <= 0 || file.size > MAX_AUTOZOOM_VIDEO_BYTES) {
    throw new Error("video_too_large");
  }
}

export async function requestPresignedUpload(file: File): Promise<PresignedUpload> {
  const response = await fetch("/api/r2/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "presign_failed");
  }
  return payload as PresignedUpload;
}

export function uploadVideoToR2(
  file: File,
  upload: PresignedUpload,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", upload.uploadUrl);
    Object.entries(upload.headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new Error("r2_upload_network_error"));
    xhr.onabort = () => reject(new Error("r2_upload_aborted"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
        return;
      }
      reject(new Error(`r2_upload_status_${xhr.status}`));
    };
    xhr.send(file);
  });
}
