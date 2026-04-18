export type GradientType = "linear" | "radial" | "conic";
export type GradientDirection =
    | "to-t" | "to-tr" | "to-r" | "to-br"
    | "to-b" | "to-bl" | "to-l" | "to-tl";

export interface ColorStop {
    id?: string;
    color: string;
    position: number;
}

export interface GradientConfig {
    type: GradientType;
    direction: GradientDirection;
    angle?: number;
    originX?: number;
    originY?: number;
    stops: ColorStop[];
}

export interface SolidColor {
    color: string;
}

export type BackgroundColorConfig = { type: "gradient"; config: GradientConfig }
    | { type: "solid"; config: SolidColor }

export const PRESET_SOLID_COLORS = [
    "#8D8D8D", "#ef4444", "#f59e0b", "#10b981",
    "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
    "#6366f1", "#14b8a6", "#f97316", "#64748b",
    "#00A3F0", "#d946ef", "#84cc16", "#06b6d4",
    "#fbbf24", "#4ade80", "#ffff24", "#F472B6",
    "#2DD4BF", "#A78BFA", "#FB7185", "#22C55E",
    "#facc15", "#a855f7", "#0ea5e9", "#f43f5e",
    "#22d3ee", "#fb923c", "#34d399", "#818cf8",
    "#fde047", "#c084fc", "#38bdf8", "#f87171",
    "#2dd4bf", "#a3e635", "#e879f9", "#60a5fa",
    "#fcd34d", "#c026d3", "#0891b2", "#dc2626",
    "#059669", "#7c3aed", "#ea580c", "#db2777",
];

const SHARED_PALETTES: ColorStop[][] = [
    [{ color: "#FFFBFD", position: 0 }, { color: "#FFE5F5", position: 33 }, { color: "#F769EA", position: 66 }, { color: "#4A1C9B", position: 100 }],
    [{ color: "#1D0127", position: 0 }, { color: "#6602C6", position: 33 }, { color: "#AD24E2", position: 66 }, { color: "#FDFBFF", position: 100 }],
    [{ color: "#0D0B2E", position: 0 }, { color: "#1A1B63", position: 25 }, { color: "#2E5BFF", position: 50 }, { color: "#00D4FF", position: 75 }, { color: "#E0FFFF", position: 100 }],
    [{ color: "#400A14", position: 0 }, { color: "#9B1B30", position: 25 }, { color: "#FF4D6D", position: 50 }, { color: "#FFB5A7", position: 75 }, { color: "#FFF5F5", position: 100 }],
    [{ color: "#2B0F54", position: 0 }, { color: "#7F00FF", position: 25 }, { color: "#E100FF", position: 50 }, { color: "#FF8C94", position: 75 }, { color: "#FFE0B2", position: 100 }],
    [{ color: "#1B262C", position: 0 }, { color: "#0F4C75", position: 25 }, { color: "#3282B8", position: 50 }, { color: "#BBE1FA", position: 75 }, { color: "#FFFFFF", position: 100 }],
    [{ color: "#D9F4FF", position: 0 }, { color: "#FF8FA7", position: 50 }, { color: "#5D68FF", position: 100 }],
    [{ color: "#1F005C", position: 0 }, { color: "#940D60", position: 33 }, { color: "#DA5F5C", position: 66 }, { color: "#FFB56B", position: 100 }],
    [{ color: "#110B2A", position: 0 }, { color: "#6465F1", position: 33 }, { color: "#92DAFF", position: 66 }, { color: "#F9F7F8", position: 100 }],
    [{ color: "#E3592E", position: 0 }, { color: "#EF7021", position: 25 }, { color: "#F9BE6C", position: 50 }, { color: "#D9D9D9", position: 75 }, { color: "#DCD7D6", position: 100 }],
    [{ color: "#000428", position: 0 }, { color: "#004E92", position: 33 }, { color: "#00B4DB", position: 66 }, { color: "#A8E063", position: 100 }],
    [{ color: "#F093FB", position: 0 }, { color: "#F5576C", position: 33 }, { color: "#F6D365", position: 66 }, { color: "#FDA085", position: 100 }],
    [{ color: "#fee2e2", position: 0 }, { color: "#fca5a5", position: 50 }, { color: "#f87171", position: 100 }],
    [{ color: "#f8fafc", position: 0 }, { color: "#e2e8f0", position: 50 }, { color: "#cbd5e1", position: 100 }],
    [{ color: "#00c6ff", position: 0 }, { color: "#0072ff", position: 50 }, { color: "#00c6ff", position: 100 }],
    [{ color: "#12c2e9", position: 0 }, { color: "#c471ed", position: 50 }, { color: "#f64f59", position: 100 }],
    [{ color: "#0f172a", position: 0 }, { color: "#1e293b", position: 25 }, { color: "#334155", position: 50 }, { color: "#475569", position: 75 }, { color: "#64748b", position: 100 }],
    [{ color: "#ffd700", position: 0 }, { color: "#fdbb2d", position: 50 }, { color: "#b21f1f", position: 100 }],
    [{ color: "#e0e7ff", position: 0 }, { color: "#c7d2fe", position: 33 }, { color: "#818cf8", position: 66 }, { color: "#4f46e5", position: 100 }],
    [{ color: "#FFF9AE", position: 0 }, { color: "#F8ED62", position: 50 }, { color: "#E9D700", position: 100 }],
    [{ color: "#8f8f8f", position: 0 }, { color: "#444444", position: 50 }, { color: "#111111", position: 100 }],
    [{ color: "#f093fb", position: 0 }, { color: "#d66efd", position: 50 }, { color: "#f5576c", position: 100 }],
    [{ color: "#43e97b", position: 0 }, { color: "#3af2b0", position: 50 }, { color: "#38f9d7", position: 100 }],
    [{ color: "#fa709a", position: 0 }, { color: "#fb9067", position: 40 }, { color: "#fec440", position: 80 }, { color: "#fee140", position: 100 }],
    [{ color: "#ff7e5f", position: 0 }, { color: "#feb47b", position: 100 }],
    [{ color: "#FF4E50", position: 0 }, { color: "#F9D423", position: 100 }],
    [{ color: "#f12711", position: 0 }, { color: "#f5af19", position: 100 }],
    [{ color: "#ff9966", position: 0 }, { color: "#ff5e62", position: 100 }],

    [{ color: "#2b5876", position: 0 }, { color: "#4e4376", position: 100 }],
    [{ color: "#1CB5E0", position: 0 }, { color: "#000851", position: 100 }],
    [{ color: "#36D1DC", position: 0 }, { color: "#5B86E5", position: 100 }],
    [{ color: "#134E5E", position: 0 }, { color: "#71B280", position: 100 }],

    [{ color: "#00b09b", position: 0 }, { color: "#96c93d", position: 100 }],
    [{ color: "#11998e", position: 0 }, { color: "#38ef7d", position: 100 }],
    [{ color: "#348F50", position: 0 }, { color: "#56B4D3", position: 100 }],
    [{ color: "#DCE35B", position: 0 }, { color: "#45B649", position: 100 }],

    [{ color: "#0f0c29", position: 0 }, { color: "#302b63", position: 50 }, { color: "#24243e", position: 100 }],
    [{ color: "#232526", position: 0 }, { color: "#414345", position: 100 }],
    [{ color: "#141E30", position: 0 }, { color: "#243B55", position: 100 }],
    [{ color: "#4B79A1", position: 0 }, { color: "#283E51", position: 100 }],

    [{ color: "#ffafbd", position: 0 }, { color: "#ffc3a0", position: 100 }],
    [{ color: "#e0c3fc", position: 0 }, { color: "#8ec5fc", position: 100 }],
    [{ color: "#a1c4fd", position: 0 }, { color: "#c2e9fb", position: 100 }],
    [{ color: "#fdcbf1", position: 0 }, { color: "#fdcbf1", position: 1 }, { color: "#e6dee9", position: 100 }],

    [{ color: "#ff00cc", position: 0 }, { color: "#333399", position: 100 }],
    [{ color: "#ff9a9e", position: 0 }, { color: "#fecfef", position: 99 }, { color: "#fecfef", position: 100 }],
    [{ color: "#F00000", position: 0 }, { color: "#DC281E", position: 50 }, { color: "#000000", position: 100 }],
    [{ color: "#00F2FE", position: 0 }, { color: "#4FACFE", position: 100 }],

    [{ color: "#ff0844", position: 0 }, { color: "#ffb199", position: 100 }],
    [{ color: "#c31432", position: 0 }, { color: "#240b36", position: 100 }],
    [{ color: "#f857a6", position: 0 }, { color: "#ff5858", position: 100 }],
    [{ color: "#654ea3", position: 0 }, { color: "#eaafc8", position: 100 }],
    [{ color: "#F8FAFC", position: 0 }, { color: "#F1F5F9", position: 50 }, { color: "#36383A", position: 100 }]
];

export const PRESET_LINEAR_GRADIENTS: GradientConfig[] = SHARED_PALETTES.map(stops => ({
    type: "linear", direction: "to-br", stops
}));

export const PRESET_RADIAL_GRADIENTS: GradientConfig[] = SHARED_PALETTES.map(stops => ({
    type: "radial", direction: "to-br", stops
}));

const CONIC_METADATA = [
    { angle: 180, originX: 0, originY: 53 }, { angle: 180, originX: 0, originY: 55 },
    { angle: 180, originX: 0, originY: 55 }, { angle: 45, originX: 0, originY: 100 },
    { angle: 270, originX: 100, originY: 50 }, { angle: 180, originX: 50, originY: 0 },
    { angle: 160, originX: 110, originY: 110 }, { angle: 320, originX: 50, originY: -10 },
    { angle: 180, originX: 100, originY: 40 }, { angle: 135, originX: 10, originY: 10 },
    { angle: 0, originX: 50, originY: 90 }, { angle: 15, originX: 85, originY: 85 },
    { angle: 180, originX: 60, originY: 60 }, { angle: 0, originX: 50, originY: 50 },
    { angle: 0, originX: 25, originY: 25 }, { angle: 0, originX: 75, originY: 25 },
    { angle: 0, originX: 25, originY: 75 }, { angle: 0, originX: 75, originY: 75 },
    { angle: 0, originX: 50, originY: 35 }, { angle: 0, originX: 50, originY: 65 },
    { angle: 0, originX: 35, originY: 50 }, { angle: 0, originX: 65, originY: 50 },
    { angle: 0, originX: 50, originY: 50 }, { angle: 0, originX: 50, originY: 50 },
    { angle: 90, originX: 50, originY: 100 }, { angle: 135, originX: 0, originY: 0 },
    { angle: 45, originX: 100, originY: 100 }, { angle: 180, originX: 50, originY: 50 },
    { angle: 180, originX: 50, originY: 0 }, { angle: 225, originX: 100, originY: 0 },
    { angle: 0, originX: 0, originY: 50 }, { angle: 90, originX: 50, originY: 50 },
    { angle: 120, originX: 20, originY: 80 }, { angle: 60, originX: 80, originY: 20 },
    { angle: 0, originX: 50, originY: 50 }, { angle: 300, originX: 10, originY: 10 },
    { angle: 270, originX: 50, originY: 50 }, { angle: 180, originX: 0, originY: 100 },
    { angle: 0, originX: 100, originY: 0 }, { angle: 45, originX: 50, originY: 50 },
    { angle: 90, originX: 50, originY: 50 }, { angle: 135, originX: 25, originY: 75 },
    { angle: 315, originX: 75, originY: 25 }, { angle: 0, originX: 50, originY: 50 },
    { angle: 180, originX: 50, originY: 110 }, { angle: 45, originX: -10, originY: -10 },
    { angle: 90, originX: 100, originY: 50 }, { angle: 270, originX: 0, originY: 50 },
    { angle: 45, originX: 50, originY: 50 }, { angle: 135, originX: 50, originY: 50 },
    { angle: 225, originX: 50, originY: 50 }, { angle: 315, originX: 50, originY: 50 },
    { angle: 0, originX: 50, originY: 50 }
];

export const PRESET_CONIC_GRADIENTS: GradientConfig[] = CONIC_METADATA.map((meta, i) => ({
    type: "conic",
    direction: "to-br",
    ...meta,
    stops: SHARED_PALETTES[i]
}));

export const PRESET_GRADIENTS: GradientConfig[] = PRESET_LINEAR_GRADIENTS;
export type { Swapy, SwapEvent, SlotItemMap } from 'swapy';

export function gradientToCss(config: GradientConfig): string {
    const stopsStr = config.stops
        .sort((a, b) => a.position - b.position)
        .map(stop => `${stop.color} ${stop.position}%`)
        .join(", ");

    if (config.type === "radial") {
        return `radial-gradient(circle, ${stopsStr})`;
    }

    if (config.type === "conic") {
        const angle = config.angle ?? 0;
        const originX = config.originX ?? 50;
        const originY = config.originY ?? 50;
        return `conic-gradient(from ${angle}deg at ${originX}% ${originY}%, ${stopsStr})`;
    }

    const angleMap: Record<GradientDirection, number> = {
        "to-t": 0,
        "to-tr": 45,
        "to-r": 90,
        "to-br": 135,
        "to-b": 180,
        "to-bl": 225,
        "to-l": 270,
        "to-tl": 315,
    };

    const angle = config.angle ?? angleMap[config.direction];
    return `linear-gradient(${angle}deg, ${stopsStr})`;
}
