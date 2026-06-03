import type { BackgroundTab, BackgroundColorConfig, AspectRatio, CropArea } from "@/types";
import type { MockupConfig } from "@/types/mockup.types";
import { CanvasElement } from "./canvas-elements.types";
import type { Preview3DConfig, ImageMaskConfig } from "./photo.types";

export interface ImageProject {
    id: string;
    imageBlob: Blob;
    imageDataUrl: string;
    sourceImageDataUrl?: string;
    imageName: string;
    imageWidth: number;
    imageHeight: number;
    thumbnailDataUrl: string;

    backgroundTab: BackgroundTab;
    selectedWallpaper: number;
    backgroundBlur: number;
    selectedImageUrl: string;
    backgroundColorConfig: BackgroundColorConfig | null;

    padding: number;
    roundedCorners: number;
    shadows: number;

    aspectRatio: AspectRatio;
    customDimensions: { width: number; height: number } | null;
    cropArea: CropArea | undefined;

    mockupId: string;
    mockupConfig: MockupConfig;

    canvasElements: CanvasElement[];

    imageTransform: {
        rotation: number;
        translateX: number;
        translateY: number;
    };

    imagePreview3D: Preview3DConfig;
    apply3DToBackground: boolean;
    imageMaskConfig: ImageMaskConfig;

    createdAt: number;
}

export interface ImageProjectPreview {
    id: string;
    imageName: string;
    thumbnailDataUrl: string;
    createdAt: number;
}

export type ImageExportFormat = "png" | "jpeg" | "webp" | "avif";

export interface ImageExportSettings {
    format: ImageExportFormat;
    quality: number;
    width: number;
    height: number;
    label: string;
    description: string;
}

export const IMAGE_EXPORT_PRESETS: Record<string, ImageExportSettings> = {
    "png-max": {
        format: "png",
        quality: 1,
        width: 0,
        height: 0,
        label: "PNG Original",
        description: "Lossless, best quality"
    },
    "png-4k": {
        format: "png",
        quality: 1,
        width: 3840,
        height: 2160,
        label: "PNG 4K",
        description: "3840 × 2160"
    },
    "png-2k": {
        format: "png",
        quality: 1,
        width: 2560,
        height: 1440,
        label: "PNG 2K",
        description: "2560 × 1440"
    },
    "png-1080p": {
        format: "png",
        quality: 1,
        width: 1920,
        height: 1080,
        label: "PNG 1080p",
        description: "1920 × 1080"
    },
    "jpeg-max": {
        format: "jpeg",
        quality: 0.95,
        width: 0,
        height: 0,
        label: "JPEG High",
        description: "95% quality, smaller file"
    },
    "jpeg-medium": {
        format: "jpeg",
        quality: 0.8,
        width: 1920,
        height: 1080,
        label: "JPEG Medium",
        description: "80% quality, optimized"
    },
    "webp-max": {
        format: "webp",
        quality: 0.95,
        width: 0,
        height: 0,
        label: "WebP High",
        description: "Best compression ratio"
    },
    "webp-medium": {
        format: "webp",
        quality: 0.8,
        width: 1920,
        height: 1080,
        label: "WebP Medium",
        description: "Optimized for web"
    }
};
