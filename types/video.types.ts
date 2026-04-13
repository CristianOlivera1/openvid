import type { VideoTrackClip } from "./video-track.types";

export type ExportQuality = "4k" | "2k" | "1080p" | "720p" | "480p" | "gif" | "webm-alpha";

export interface TrimSettings {
    start: number;
    end: number;
}

export interface ExportSettings {
    quality: ExportQuality;
    fps?: number;
    trim?: TrimSettings;
    transparentBackground?: boolean;
    // Audio settings
    muteOriginalAudio?: boolean;
    audioTracks?: Array<{
        audioUrl: string;
        startTime: number;
        trimStart: number;
        duration: number;
        volume: number;
        loop: boolean;
    }>;
    masterVolume?: number;
    videoBlob?: Blob;
    // Multi-video clips (for concatenated videos)
    videoClips?: VideoTrackClip[];
    // Video blobs map for multi-clip export (libraryVideoId -> Blob)
    videoClipBlobs?: Map<string, Blob>;
}

export interface ExportProgress {
    status: "idle" | "preparing" | "encoding" | "finalizing" | "complete" | "error";
    progress: number;
    message: string;
}

export interface QualitySettings {
    width: number;
    height: number;
    bitrate: number;
    fps?: number;
}

export interface VideoData {
    blob: Blob;
    duration: number;
    timestamp: number;
}

export interface VideoLoadResult {
    blob: Blob;
    duration: number;
    url: string;
}
