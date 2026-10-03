import { QualitySettings } from '@/types';

export const EXPORT_WIDTH = 1920;
export const EXPORT_HEIGHT = 1080;

export const QUALITY_SETTINGS: Record<string, QualitySettings> = {
    "4k": { width: 3840, height: 2160, bitrate: 45_000_000, fps: 60 },
    "2k": { width: 2560, height: 1440, bitrate: 20_000_000, fps: 60 },
    "1080p": { width: 1920, height: 1080, bitrate: 12_000_000, fps: 60 },
    "720p": { width: 1280, height: 720, bitrate: 6_000_000, fps: 60 },
    "480p": { width: 854, height: 480, bitrate: 2_500_000, fps: 30 },
    "gif": { width: 1280, height: 720, bitrate: 2_500_000, fps: 24 },
    "webm-alpha": { width: 1280, height: 720, bitrate: 4_000_000, fps: 60 },
};

/**
 * FPS por defecto para exportación (fallback)
 */
export const DEFAULT_EXPORT_FPS = 60;

/**
 * Ancho de referencia del contenedor de preview (max-w-4xl en Tailwind)
 */
export const PREVIEW_CONTAINER_WIDTH = 896;

/**
 * Ancho del sidebar de etiquetas en el timeline (px)
 */
export const TIMELINE_LABEL_WIDTH = 56;

/**
 * Duración mínima entre trim handles (segundos)
 */
export const MIN_TRIM_DURATION = 0.5;

/**
 * Tabla de multiplicadores de zoom para el timeline
 * zoom 1× → 1.0 (sin estiramiento), zoom 10× → 2.5 (estiramiento moderado)
 */
export const TIMELINE_ZOOM_SCALE: Record<number, number> = {
    1: 1.0,
    2: 1.2,
    3: 1.4,
    4: 1.6,
    5: 1.8,
    6: 2.0,
    7: 2.1,
    8: 2.2,
    9: 2.35,
    10: 2.5,
};

// Mockups con header → solo esquinas INFERIORES del video redondeadas
export const BOTTOM_ONLY_RADIUS_MOCKUPS = ["macos", "macos-glass", "macos-ghost", "macos-ghost-glass", "vscode", "macos-dark-ide", "macos-ghost-ide", "brave", "brave-glass", "browser-tab-glass", "chrome", "chrome-glass", "s24-ultra", "glass-curve", "glass-full", "iphone-slim", "hard-shell"];

// Glass mockups → handle their own shadow, do not need the solid rect underneath
export const SELF_SHADOWING_MOCKUPS = ["macos-glass", "outline", "macos-ghost-glass", "glass-ui-container", "macos-container-glass", "brave-glass", "browser-tab-glass", "chrome-glass", "iphone-slim", "glass-curve", "glass-full", "s24-ultra", "hard-shell", "macbook-photo"];

export const PHOTO_MOCKUPS = ["macbook-photo"];

// Video z-index: elements with zIndex < VIDEO_Z_INDEX render behind the video
export const VIDEO_Z_INDEX = 1000;
