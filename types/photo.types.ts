import { AspectRatio } from "./editor.types";

export interface Preview3DConfig {
  id: string;
  label: string;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateY: number;
  scale: number;
  perspective?: number;
}

export const PREVIEW_CONFIGS: readonly Preview3DConfig[] = Object.freeze([
  Object.freeze({ id: "front", label: "Front", rotateX: 0, rotateY: 0, rotateZ: 0, translateY: 0, scale: 0.9, perspective: 600 }),
  Object.freeze({ id: "top-left-angle", label: "Top Left Angle", rotateX: 18, rotateY: 25, rotateZ: -15, translateY: -10, scale: 0.95, perspective: 500 }),
  Object.freeze({ id: "top-right-angle", label: "Top Right Angle", rotateX: 18, rotateY: -22, rotateZ: 15, translateY: 5, scale: 0.95, perspective: 500 }),
  Object.freeze({ id: "bottom-left-angle", label: "Bottom Left Angle", rotateX: -18, rotateY: 25, rotateZ: 15, translateY: -5, scale: 0.95, perspective: 500 }),
  Object.freeze({ id: "bottom-right-angle", label: "Bottom Right Angle", rotateX: -18, rotateY: -22, rotateZ: -15, translateY: -5, scale: 0.95, perspective: 500 }),
  Object.freeze({ id: "isometric", label: "Isometric", rotateX: 35, rotateY: -45, rotateZ: 10, translateY: 0, scale: 0.85, perspective: 1000 }), Object.freeze({ id: "tilt-up", label: "Tilt Up", rotateX: 15, rotateY: 0, rotateZ: 0, translateY: -2, scale: 0.88, perspective: 500 }),
  Object.freeze({ id: "tilt-down", label: "Tilt Down", rotateX: -15, rotateY: 0, rotateZ: 0, translateY: 2, scale: 0.88, perspective: 500 }),
]);

export interface ImageMaskConfig {
  enabled: boolean;
  top?: { from: number; to?: number };
  right?: { from: number; to?: number };
  bottom?: { from: number; to?: number };
  left?: { from: number; to?: number };
  angle?: number;
  angleFrom?: number;
  angleTo?: number;
}

export const DEFAULT_MASK_CONFIG: ImageMaskConfig = {
  enabled: false,
};

export interface PhotoEditorPlaceholderProps {
  className?: string;
  canvasImageUrl?: string | null;
  staticImageUrl?: string | null;
  isBackgroundRemoving?: boolean;
  hasBackgroundRemoved?: boolean;
  onRemoveBackground?: () => void;
  onRestoreOriginalImage?: () => void;
  onSelectPreview?: (config: Preview3DConfig) => void;
  selectedPreviewId?: string;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  customAspectRatio?: { width: number; height: number } | null;
  onCustomAspectRatioChange?: (dimensions: { width: number; height: number }) => void;
  onOpenCropper?: () => void;
  apply3DToBackground?: boolean;
  onToggle3DBackground?: (value: boolean) => void;
  imageMaskConfig?: ImageMaskConfig;
  onImageMaskConfigChange?: (config: ImageMaskConfig) => void;
  imageTransform?: Preview3DConfig;
  onReset?: () => void;
}