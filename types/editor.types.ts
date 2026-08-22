"use client";
import type { ZoomFragment } from "./zoom.types";
import type { CanvasElement } from "./canvas-elements.types";
import type { ImageMaskConfig } from "@/types/photo.types";
import type { MockupConfig } from "./mockup.types";
import type { CameraConfig } from "./camera.types";
import { MockupMotionFragment } from "@/lib/mockup-motion";

export type Tool = "screenshot" | "elements" | "audio" | "zoom" | "mockup" | "cursor" | "video" | "camera" | "history" | "motion" | "projector";
export type BackgroundTab = "wallpaper" | "image" | "color";
export type AspectRatio = "auto" | "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "custom";

export interface CropArea { x: number; y: number; width: number; height: number; }
export interface VideoTransform { rotation: number; translateX: number; translateY: number; }

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number } | null> = {
  "auto": null,
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1440, height: 1080 },
  "3:4": { width: 1080, height: 1440 },
  "custom": null,
};

export interface EditorState {
  activeTool: Tool;
  backgroundTab: BackgroundTab;
  selectedWallpaper: number;
  backgroundBlur: number;
  padding: number;
  roundedCorners: number;
  shadows: number;
}

export interface VideoCanvasHandle {
  getExportCanvas: () => HTMLCanvasElement | null;
  drawFrame: (highQuality?: boolean, explicitTimelineTime?: number, frameOverride?: VideoFrame) => Promise<void>;
  getPreviewContainer: () => HTMLDivElement | null;
  clearAllSelection: () => { multiIds: string[]; videoSelected: boolean };
  restoreSelectionState: (state: { multiIds: string[]; videoSelected: boolean }) => void;
}

export interface VideoThumbnail { time: number; dataUrl: string; quality?: "low" | "high"; }
export type MediaType = "video" | "image";

export interface VideoCanvasProps {
  activeTool?: string;
  mediaType?: MediaType;
  imageUrl?: string | null;
  imageRef?: React.RefObject<HTMLImageElement | null>;
  imageTransform?: { id: string; label: string; rotateX: number; rotateY: number; rotateZ: number; translateY: number; scale: number; perspective?: number; };
  apply3DToBackground?: boolean;


  imageMaskConfig?: ImageMaskConfig;
  videoMaskConfig?: ImageMaskConfig;
  onVideoMaskConfigChange?: (config: ImageMaskConfig) => void;

  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  padding: number;
  roundedCorners: number;
  shadows: number;
  aspectRatio?: AspectRatio;
  customAspectRatio?: { width: number; height: number } | null;
  cropArea?: CropArea;
  backgroundTab?: BackgroundTab;
  selectedWallpaper?: number;
  backgroundBlur?: number;
  selectedImageUrl?: string;
  unsplashOverrideUrl?: string;
  backgroundColorCss?: string;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  isScrubbing?: boolean;
  scrubTime?: number;
  getThumbnailForTime?: (time: number) => VideoThumbnail | null;
  zoomFragments?: ZoomFragment[];
  currentTime?: number;
  mockupId?: string;

  mockupConfig?: MockupConfig;

  onVideoUpload?: (file: File) => void;
  onImageUpload?: (file: File) => void;
  onImageDrop?: (files: FileList | File[]) => void;
  onVideoDrop?: (files: FileList) => void;
  isUploading?: boolean;
  videoTransform?: VideoTransform;
  onVideoTransformChange?: (transform: VideoTransform) => void;
  canvasElements?: CanvasElement[];
  selectedElementId?: string | null;
  onElementUpdate?: (id: string, updates: Partial<CanvasElement>) => void;
  onElementSelect?: (id: string | null) => void;
  onElementDelete?: (id: string | string[]) => void;
  cameraUrl?: string | null;

  cameraConfig?: CameraConfig | null;
  onCameraConfigChange?: (partial: Partial<CameraConfig>) => void;

  onCameraClick?: () => void;
  layersPanelToolbar?: React.ReactNode;
  textToolActive?: boolean;
  onTextToolDeactivate?: () => void;
  onAddElement?: (element: CanvasElement) => void;
  isPlaying?: boolean;
  onMockupClick?: (kind: "2d" | "3d") => void;
  isRestoringProjectRef?: React.MutableRefObject<boolean>;
  activeMediaAspect?: number | null;
  activeClipUrl?: string | null;
  onPaddingChange?: (value: number) => void;
  imageZoomScale?: number;
  onImageZoomScaleChange?: (scale: number) => void;
  otherSelectionActive?: boolean;
  mockupMotionFragments?: MockupMotionFragment[];
  videoDuration?: number;
  onMockupConfigChange?: (config: Partial<MockupConfig>) => void;
}
