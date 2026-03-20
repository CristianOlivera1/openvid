import { BackgroundTab, Tool, VideoThumbnail } from "./editor.types";
import { BackgroundColorConfig } from "./background.types";
import { ZoomFragment } from "./zoom.types";
import { MockupConfig } from "./mockup.types";
import type { CanvasElement } from "./canvas-elements.types";

export interface ControlPanelProps {
    activeTool: Tool;
    backgroundTab: BackgroundTab;
    selectedWallpaper: number;
    backgroundBlur: number;
    padding: number;
    roundedCorners: number;
    shadows: number;
    uploadedImages: string[];
    selectedImageUrl: string;
    backgroundColorConfig: BackgroundColorConfig | null;
    onBackgroundTabChange: (tab: BackgroundTab) => void;
    onWallpaperSelect: (index: number) => void;
    onBackgroundBlurChange: (value: number) => void;
    onPaddingChange: (value: number) => void;
    onRoundedCornersChange: (value: number) => void;
    onShadowsChange: (value: number) => void;
    onImageUpload: (file: File) => void;
    onImageSelect: (url: string) => void;
    onImageRemove: (url: string) => void;
    onBackgroundColorChange: (config: BackgroundColorConfig) => void;
    // Zoom props
    zoomFragments?: ZoomFragment[];
    selectedZoomFragment?: ZoomFragment | null;
    onSelectZoomFragment?: (fragmentId: string | null) => void;
    onAddZoomFragment?: () => void;
    onUpdateZoomFragment?: (fragmentId: string, updates: Partial<ZoomFragment>) => void;
    onDeleteZoomFragment?: (fragmentId: string) => void;
    videoUrl?: string | null;
    videoThumbnail?: string | null;
    currentTime?: number;
    getThumbnailForTime?: (time: number) => VideoThumbnail | null;
    videoDimensions?: { width: number; height: number } | null;
    // Mockup props
    mockupId?: string;
    mockupConfig?: MockupConfig;
    onMockupChange?: (mockupId: string) => void;
    onMockupConfigChange?: (config: Partial<MockupConfig>) => void;
    // Canvas elements props
    onAddCanvasElement?: (element: CanvasElement) => void;
    selectedCanvasElement?: CanvasElement | null;
    onUpdateCanvasElement?: (id: string, updates: Partial<CanvasElement>) => void;
    onDeleteCanvasElement?: (id: string) => void;
    onBringToFront?: (id: string) => void;
    onSendToBack?: (id: string) => void;
}
