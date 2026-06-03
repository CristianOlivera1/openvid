export type CanvasElementType = "svg" | "image" | "text";

export interface CanvasElementBase {
    id: string;
    type: CanvasElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    zIndex: number;
    visible?: boolean;
    locked?: boolean;
    groupId?: string;
}

export interface SvgElement extends CanvasElementBase {
    type: "svg";
    category: string;
    svgId: string;
    color?: string;
}

export interface ElementClip {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ElementFill {
    mode: "none" | "solid" | "gradient";
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientAngle?: number;
    opacity?: number;
}
    
export interface ImageElement extends CanvasElementBase {
    type: "image";
    category: string;
    imagePath: string;
    clip?: ElementClip;
    fill?: ElementFill;
}

export interface TextElement extends CanvasElementBase {
    type: "text";
    content: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: "normal" | "medium" | "bold";
    color: string;
}

export type CanvasElement = SvgElement | ImageElement | TextElement;

export interface SvgCategory {
    id: string;
    title: string;
    items: SvgItem[];
}

export interface SvgItem {
    id: string;
    name: string;
    icon?: string;
}

export interface ImageCategory {
    id: string;
    title: string;
    items: ImageItem[];
}

export interface ImageItem {
    id: string;
    name: string;
    imagePath: string;
    previewPath?: string;
}

export interface ElementsMenuProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement | null;
    onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void;
    onDeleteElement?: (id: string) => void;
    onBringToFront?: (id: string) => void;
    onSendToBack?: (id: string) => void;
}

export const PRESET_COLORS = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF"];

export const TEXT_PRESETS = [
    { label: "Título", fontSize: 48, weight: "bold", sample: "Título" },
    { label: "Subtítulo", fontSize: 32, weight: "medium", sample: "Subtítulo" },
    { label: "Cuerpo", fontSize: 24, weight: "normal", sample: "Texto de cuerpo" },
    { label: "Caption", fontSize: 18, weight: "normal", sample: "Caption" },
] as const;

export const FONT_FAMILIES = ["Inter", "Roboto", "Arial", "Georgia", "Courier New", "Comic Sans MS"];

export const FONT_WEIGHTS = [
    { key: "normal", label: "Regular" },
    { key: "medium", label: "Medium" },
    { key: "bold", label: "Bold" },
] as const;

export interface UploadedImage {
    id: string;
    name: string;
    dataUrl: string;
    uploadedAt: number;
}

export const STORAGE_KEY = "openvid-uploaded-images";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_FORMATS = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];