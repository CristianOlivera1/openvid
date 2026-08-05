import { AspectRatio } from "@/types/editor.types";
import { ZoomStateCanvas, ZoomFragment, calculateZoomPhaseState, easeZoomTransition, isOrbitalZoomFragment, zoomLevelToFactor, speedToTransitionMs } from "@/types/zoom.types";

export function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

export function drawRoundedRectBottomOnly(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.closePath();
}

export function calculateScaledPadding(
    containerSize: number,
    paddingPercent: number
): number {
    return paddingPercent * containerSize;
}

export function getAspectRatioStyle(ratio: AspectRatio, customDimensions?: { width: number; height: number }): string {
    if ((ratio === "custom" || ratio === "auto") && customDimensions) {
        return `${customDimensions.width}/${customDimensions.height}`;
    }

    switch (ratio) {
        case "16:9": return "16/9";
        case "9:16": return "9/16";
        case "1:1": return "1/1";
        case "4:3": return "4/3";
        case "3:4": return "3/4";
        default: return "16/9";
    }
}

// Numeric aspect ratio (width / height) for a given AspectRatio setting
export function getAspectRatioNumber(ratio: AspectRatio, customDimensions?: { width: number; height: number }): number {
    if ((ratio === "custom" || ratio === "auto") && customDimensions) {
        return customDimensions.width / customDimensions.height;
    }
    switch (ratio) {
        case "16:9": return 16 / 9;
        case "9:16": return 9 / 16;
        case "1:1": return 1;
        case "4:3": return 4 / 3;
        case "3:4": return 3 / 4;
        default: return 16 / 9;
    }
}

export function applyCanvasBackground(
    ctx: CanvasRenderingContext2D,
    cssBackground: string,
    width: number,
    height: number
): void {
    if (cssBackground.startsWith('#') || cssBackground.startsWith('rgb')) {
        ctx.fillStyle = cssBackground;
        ctx.fillRect(0, 0, width, height);
        return;
    }

    if (cssBackground.includes('linear-gradient')) {
        const angleMatch = cssBackground.match(/(\d+)deg/);
        const angle = angleMatch ? parseInt(angleMatch[1]) : 135;

        const colorMatches = cssBackground.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]+\))\s+(\d+)%/g);
        const stops: { color: string; position: number }[] = [];

        for (const match of colorMatches) {
            stops.push({
                color: match[1],
                position: parseInt(match[2]) / 100
            });
        }

        if (stops.length >= 2) {
            const angleRad = (angle - 90) * Math.PI / 180;
            const x0 = width / 2 - Math.cos(angleRad) * width / 2;
            const y0 = height / 2 - Math.sin(angleRad) * height / 2;
            const x1 = width / 2 + Math.cos(angleRad) * width / 2;
            const y1 = height / 2 + Math.sin(angleRad) * height / 2;

            const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
            stops.forEach(stop => gradient.addColorStop(stop.position, stop.color));

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
    }

    if (cssBackground.includes('radial-gradient')) {
        const colorMatches = cssBackground.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]+\))\s+(\d+)%/g);
        const stops: { color: string; position: number }[] = [];

        for (const match of colorMatches) {
            stops.push({
                color: match[1],
                position: parseInt(match[2]) / 100
            });
        }

        if (stops.length >= 2) {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.max(width, height) / 2;

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            stops.forEach(stop => gradient.addColorStop(stop.position, stop.color));

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
    }

    if (cssBackground.includes('conic-gradient')) {
        // Parsear: conic-gradient(from {angle}deg at {x}% {y}%, {stops})
        const angleMatch = cssBackground.match(/from\s+(\d+)deg/);
        const positionMatch = cssBackground.match(/at\s+(\d+)%\s+(\d+)%/);

        const angle = angleMatch ? parseInt(angleMatch[1]) : 0;
        const originX = positionMatch ? parseInt(positionMatch[1]) / 100 : 0.5;
        const originY = positionMatch ? parseInt(positionMatch[2]) / 100 : 0.5;

        const colorMatches = cssBackground.matchAll(/(#[0-9a-fA-F]{6}|rgb\([^)]+\))\s+(\d+)%/g);
        const stops: { color: string; position: number }[] = [];

        for (const match of colorMatches) {
            stops.push({
                color: match[1],
                position: parseInt(match[2]) / 100
            });
        }

        if (stops.length >= 2) {
            const centerX = width * originX;
            const centerY = height * originY;
            const startAngle = (angle - 90) * Math.PI / 180;

            const gradient = ctx.createConicGradient(startAngle, centerX, centerY);
            stops.forEach(stop => gradient.addColorStop(stop.position, stop.color));

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
    }

    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, width, height);
}

// Extended zoom state for canvas export including 3D effects
export interface ZoomStateCanvasExport extends ZoomStateCanvas {
    rotateX: number;
    rotateY: number;
    perspective: number;
}
/**
 * Calculate smooth zoom for canvas export.
 *
 * IMPORTANT: scale now uses the SAME "entry inside fragment, exit AFTER
 * fragment ends" behavior for BOTH simple and advanced (3D/movement) zoom,
 * mirroring exactly what the preview does via CSS transitions:
 *   - entry ramp:  [start, start+T]      (T = speedToTransitionMs)
 *   - hold:        [start+T, end]        (flat at targetScale)
 *   - exit ramp:   [end, end+T]          (AFTER the fragment, not before)
 *
 * rotateX/rotateY/focus for advanced zoom keep using the existing
 * within-fragment 3-phase system (calculateZoomPhaseState), since those
 * already match preview and already settle to their end-state (0 rotation,
 * movement-end focus) by the time frameTime reaches endTime.
 */
export function calculateSmoothZoom(
    frameTime: number,
    zoomFragments: ZoomFragment[]
): ZoomStateCanvasExport {
    const DEFAULT_STATE: ZoomStateCanvasExport = {
        scale: 1,
        focusX: 50,
        focusY: 50,
        rotateX: 0,
        rotateY: 0,
        perspective: 0,
    };

    if (!zoomFragments.length) return DEFAULT_STATE;

    const sortedFragments = [...zoomFragments].sort((a, b) => a.startTime - b.startTime);

    const activeFragment = sortedFragments.find(
        f => frameTime >= f.startTime && frameTime <= f.endTime
    );

    const previousFragment = sortedFragments
        .filter(f => f.endTime < frameTime)
        .sort((a, b) => b.endTime - a.endTime)[0];

    // `movementEnabled` is for manual A → B motion. Autozoom orbital paths
    // are advanced too, even when a legacy backend fragment sets it to false.
    const isAdvancedZoom = (f: ZoomFragment) => f.enable3D || f.movementEnabled || isOrbitalZoomFragment(f);

    // Shared scale curve: entry ramps INSIDE the fragment, then holds flat.
    // Used for BOTH simple and advanced zoom while the fragment is active.
    const computeHeldScale = (fragment: ZoomFragment, time: number): number => {
        const transitionSec = speedToTransitionMs(fragment.speed) / 1000;
        const targetScale = zoomLevelToFactor(fragment.zoomLevel);
        const timeIntoFragment = time - fragment.startTime;
        if (transitionSec > 0 && timeIntoFragment < transitionSec) {
            const progress = Math.min(1, Math.max(0, timeIntoFragment / transitionSec));
            return 1 + (targetScale - 1) * easeZoomTransition(progress);
        }
        return targetScale;
    };

    // Shared exit curve: decays AFTER the fragment ends. Returns null once
    // the exit transition has fully finished (caller falls through to default).
    const computeExitScale = (fragment: ZoomFragment, time: number): number | null => {
        const transitionSec = speedToTransitionMs(fragment.speed) / 1000;
        if (transitionSec <= 0) return null;
        const timeSinceEnd = time - fragment.endTime;
        if (timeSinceEnd >= transitionSec) return null;
        const targetScale = zoomLevelToFactor(fragment.zoomLevel);
        const progress = Math.min(1, Math.max(0, timeSinceEnd / transitionSec));
        const easedProgress = easeZoomTransition(progress);
        return targetScale - (targetScale - 1) * easedProgress;
    };

    if (activeFragment) {
        const scale = computeHeldScale(activeFragment, frameTime);

        if (isAdvancedZoom(activeFragment)) {
            // Rotation + focus/movement still use the existing 3-phase system —
            // that part already matches preview, we only override `scale`.
            const phaseState = calculateZoomPhaseState(activeFragment, frameTime, true);
            return {
                scale,
                focusX: phaseState.focusX,
                focusY: phaseState.focusY,
                rotateX: phaseState.rotateX,
                rotateY: phaseState.rotateY,
                perspective: phaseState.perspective,
            };
        }

        return {
            scale,
            focusX: activeFragment.focusX,
            focusY: activeFragment.focusY,
            rotateX: 0,
            rotateY: 0,
            perspective: 0,
        };
    }

    if (previousFragment) {
        const exitScale = computeExitScale(previousFragment, frameTime);
        if (exitScale !== null) {
            if (isAdvancedZoom(previousFragment)) {
                const phaseState = calculateZoomPhaseState(previousFragment, frameTime, true);
                return {
                    scale: exitScale,
                    focusX: phaseState.focusX,
                    focusY: phaseState.focusY,
                    rotateX: phaseState.rotateX,
                    rotateY: phaseState.rotateY,
                    perspective: phaseState.perspective,
                };
            }
            return {
                scale: exitScale,
                focusX: previousFragment.focusX,
                focusY: previousFragment.focusY,
                rotateX: 0,
                rotateY: 0,
                perspective: 0,
            };
        }
    }

    return DEFAULT_STATE;
}

// Functions to determine nearest corner and corner styles for rotating elements
export type Corner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

export function getNearestCorner(e: React.MouseEvent<HTMLElement>, rotationDeg = 0): Corner {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    const rad = (-rotationDeg * Math.PI) / 180;
    const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

    const isRight = localX > 0;
    const isBottom = localY > 0;
    if (!isRight && !isBottom) return "top-left";
    if (isRight && !isBottom) return "top-right";
    if (isRight && isBottom) return "bottom-right";
    return "bottom-left";
}

export function getCornerStyle(corner: Corner, offset = -10): React.CSSProperties {
    const base: React.CSSProperties = { position: "absolute", zIndex: 20, cursor: "grab" };
    switch (corner) {
        case "top-left":
            return { ...base, top: offset, left: offset };
        case "top-right":
            return { ...base, top: offset, right: offset };
        case "bottom-right":
            return { ...base, bottom: offset, right: offset };
        case "bottom-left":
            return { ...base, bottom: offset, left: offset };
    }
}

export const CORNER_ICON_ROTATION: Record<Corner, number> = {
    "top-right": 0,    // natural SVG position
    "bottom-right": 90,   // rotate 90° clockwise
    "bottom-left": 180,  // rotate 180°
    "top-left": 270,  // rotate 270°
};

export function getResizeHandleStyle(corner: Corner, size = 9): React.CSSProperties {
    const half = size / 2;
    const base: React.CSSProperties = { position: "absolute", zIndex: 25 };
    switch (corner) {
        case "top-left":
            return { ...base, top: -half, left: -half };
        case "top-right":
            return { ...base, top: -half, right: -half };
        case "bottom-right":
            return { ...base, bottom: -half, right: -half };
        case "bottom-left":
            return { ...base, bottom: -half, left: -half };
    }
}

export const CORNER_RESIZE_CURSOR: Record<Corner, string> = {
    "top-left": "nwse-resize",
    "bottom-right": "nwse-resize",
    "top-right": "nesw-resize",
    "bottom-left": "nesw-resize",
};

export const CORNER_SIGNS: Record<Corner, [number, number]> = {
    "top-left": [-1, -1],
    "top-right": [1, -1],
    "bottom-right": [1, 1],
    "bottom-left": [-1, 1],
};

export interface RotationSnapResult {
    angle: number;
    snapped: boolean;
}

const ROTATION_SNAP_STEP = 45;
const ROTATION_SNAP_THRESHOLD = 4;

const MOCKUP_OUTER_RADIUS_MULTIPLIER: Record<string, number> = {
    "iphone-slim": 2.5,
    "glass-curve": 2.5,
    "glass-full": 2.5,
    "hard-shell": 1.5,
    "s24-ultra": 1.2,
    outline: 2.5,
};

const MOCKUP_OUTER_RADIUS_OFFSET: Record<string, number> = {
    outline: 8,
};

export function getMockupOuterRadius(mockupId: string, roundedCorners: number): number {
    const multiplier = MOCKUP_OUTER_RADIUS_MULTIPLIER[mockupId] ?? 1;
    const offset = MOCKUP_OUTER_RADIUS_OFFSET[mockupId] ?? 0;
    return roundedCorners * multiplier + offset;
}

export function snapRotation(
    angle: number,
    step: number = ROTATION_SNAP_STEP,
    threshold: number = ROTATION_SNAP_THRESHOLD
): RotationSnapResult {
    const nearestSnap = Math.round(angle / step) * step;
    if (Math.abs(angle - nearestSnap) <= threshold) {
        return { angle: nearestSnap, snapped: true };
    }
    return { angle, snapped: false };
}

export function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number, dy: number, dWidth: number, dHeight: number
) {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (!imgW || !imgH || dWidth <= 0 || dHeight <= 0) return;

    const imgAspect = imgW / imgH;
    const destAspect = dWidth / dHeight;

    let sx: number, sy: number, sWidth: number, sHeight: number;

    if (imgAspect > destAspect) {
        sHeight = imgH;
        sWidth = imgH * destAspect;
        sx = (imgW - sWidth) / 2;
        sy = 0;
    } else {
        sWidth = imgW;
        sHeight = imgW / destAspect;
        sx = 0;
        sy = (imgH - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}
