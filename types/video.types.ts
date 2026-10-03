import { CropArea } from "./editor.types";
import type { VideoTrackClip } from "./video-track.types";

export type ExportQuality = "4k" | "2k" | "1080p" | "720p" | "480p" | "gif" | "webm-alpha";

export interface TrimSettings {
    start: number;
    end: number;
}

export interface ExportSettings {
    quality: ExportQuality;
    fps?: number;
    bitrate?: number;
    trim?: TrimSettings;
    transparentBackground?: boolean;
    muteOriginalAudio?: boolean;
    videoHasAudioTrack?: boolean;
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
    videoClips?: VideoTrackClip[];
    videoClipBlobs?: Map<string, Blob>;
    clipAudioStates?: Record<string, boolean>;
    speed?: number;
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

export interface VideoCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string | null;
    onCropApply: (crop: CropArea) => void;
    initialCrop?: CropArea;
}
export const CROP_ASPECT_RATIOS = [
    { label: "Libre", value: null },
    { label: "16:9", value: 16 / 9 },
    { label: "9:16", value: 9 / 16 },
    { label: "1:1", value: 1 },
    { label: "4:3", value: 4 / 3 },
    { label: "3:4", value: 3 / 4 },
] as const;

export interface LibraryVideo {
    id: string;
    blob: Blob;
    fileName: string;
    fileSize: number;
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
    uploadedAt: number;
    thumbnailUrl?: string;
    hasAudio?: boolean;
    originalHasAudio?: boolean;
}

export interface LibraryVideoInfo {
    id: string;
    fileName: string;
    fileSize: number;
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
    uploadedAt: number;
    thumbnailUrl?: string;
    hasAudio?: boolean;
    originalHasAudio?: boolean;
}

export interface ExtendedVideoForDetection extends HTMLVideoElement {
    audioTracks?: { length: number };
    mozHasAudio?: boolean;
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
}