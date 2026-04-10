import type { ZoomFragment } from "./zoom.types";
import type { CanvasElement } from "./canvas-elements.types";
import type { CursorConfig, CursorRecordingData } from "./cursor.types";

export type Tool = "screenshot" | "elements" | "audio" | "zoom" | "mockup" | "cursor";

export type BackgroundTab = "wallpaper" | "image" | "color";

export type AspectRatio = "auto" | "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "custom";

export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface VideoTransform {
    rotation: number; // in degrees
    translateX: number; // in percentage (-100 to 100)
    translateY: number; // in percentage (-100 to 100)
}

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
    drawFrame: () => Promise<void>;
}

/** Thumbnail data for scrubbing preview */
export interface VideoThumbnail {
    time: number;
    dataUrl: string;
    quality?: "low" | "high";
}

export interface VideoCanvasProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    videoUrl: string | null;
    padding: number;
    roundedCorners: number;
    shadows: number;
    aspectRatio?: AspectRatio;
    customAspectRatio?: { width: number; height: number } | null;
    cropArea?: CropArea;
    backgroundTab?: BackgroundTab; // Tab activo para determinar qué background mostrar
    selectedWallpaper?: number;
    backgroundBlur?: number;
    selectedImageUrl?: string;
    unsplashOverrideUrl?: string; // URL de imagen Unsplash seleccionada desde el tab wallpaper
    backgroundColorCss?: string; // CSS string para color/gradiente personalizado
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
    // Scrubbing props for thumbnail preview
    isScrubbing?: boolean;
    scrubTime?: number;
    getThumbnailForTime?: (time: number) => VideoThumbnail | null;
    // Zoom props
    zoomFragments?: ZoomFragment[];
    currentTime?: number;
    // Mockup props
    mockupId?: string;
    mockupConfig?: import("./mockup.types").MockupConfig;
    // Video upload props
    onVideoUpload?: (file: File) => void;
    onVideoDelete?: () => void;
    isUploading?: boolean;
    // Transform props
    videoTransform?: VideoTransform;
    onVideoTransformChange?: (transform: VideoTransform) => void;
    // Canvas elements props
    canvasElements?: CanvasElement[];
    selectedElementId?: string | null;
    onElementUpdate?: (id: string, updates: Partial<CanvasElement>) => void;
    onElementSelect?: (id: string | null) => void;
    // Cursor overlay props
    cursorConfig?: CursorConfig;
    cursorData?: CursorRecordingData;
}
