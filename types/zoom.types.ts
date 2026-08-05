import { VideoThumbnail } from "./editor.types";

export interface TrailPoint {
    t: number;
    x: number;
    y: number;
    zoomLevelLocal?: number | null;
}

type FocusPoint = Pick<TrailPoint, "x" | "y">;

const clampFocusCoordinate = (value: number, fallback: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;

/**
 * An orbital fragment is driven by the cursor trail produced by Autozoom.
 * `movementEnabled` belongs to the manual A → B movement and must not be
 * consulted for these fragments: older jobs can legitimately set it to false.
 */
export function isOrbitalZoomFragment(fragment: ZoomFragment): boolean {
    return fragment.movementMode === "orbital";
}

/**
 * Gets the camera focus for a backend-generated cursor trail.
 *
 * Catmull-Rom interpolation removes the visible velocity corners of a
 * point-by-point linear interpolation while preserving every sampled point.
 * This is shared by the editor preview and the canvas export path.
 */
export function getOrbitalFocus(fragment: ZoomFragment, timeInTrail: number): FocusPoint | null {
    if (!isOrbitalZoomFragment(fragment)) return null;

    const trail = [...(fragment.trail ?? [])]
        .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.x) && Number.isFinite(point.y))
        .sort((a, b) => a.t - b.t);
    if (trail.length === 0) return null;

    const pointAt = (point: TrailPoint): FocusPoint => ({
        x: clampFocusCoordinate(point.x, fragment.focusX),
        y: clampFocusCoordinate(point.y, fragment.focusY),
    });

    if (trail.length === 1 || timeInTrail <= trail[0].t) return pointAt(trail[0]);
    if (timeInTrail >= trail[trail.length - 1].t) return pointAt(trail[trail.length - 1]);

    let segmentIndex = 0;
    for (let index = 0; index < trail.length - 1; index += 1) {
        if (timeInTrail <= trail[index + 1].t) {
            segmentIndex = index;
            break;
        }
    }

    const p1 = pointAt(trail[segmentIndex]);
    const p2 = pointAt(trail[segmentIndex + 1]);
    const p0 = pointAt(trail[Math.max(0, segmentIndex - 1)]);
    const p3 = pointAt(trail[Math.min(trail.length - 1, segmentIndex + 2)]);
    const segmentDuration = trail[segmentIndex + 1].t - trail[segmentIndex].t;
    const t = segmentDuration > 0
        ? Math.max(0, Math.min(1, (timeInTrail - trail[segmentIndex].t) / segmentDuration))
        : 0;
    const t2 = t * t;
    const t3 = t2 * t;
    const interpolate = (a: number, b: number, c: number, d: number) =>
        0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);

    return {
        x: clampFocusCoordinate(interpolate(p0.x, p1.x, p2.x, p3.x), p1.x),
        y: clampFocusCoordinate(interpolate(p0.y, p1.y, p2.y, p3.y), p1.y),
    };
}

/**
 * Resolve an orbital point at an absolute editor time. The trail keeps the
 * source timing from Autozoom when a user trims either edge of a fragment;
 * otherwise trimming the left edge would restart the cursor at trail.t = 0.
 */
export function getOrbitalFocusAtTimelineTime(fragment: ZoomFragment, currentTime: number): FocusPoint | null {
    const sourceStartTime = fragment.trailSourceStartTime ?? fragment.startTime;
    return getOrbitalFocus(fragment, currentTime - sourceStartTime);
}

/** Returns only the part of an Autozoom trajectory that remains after a trim. */
export function getOrbitalTrailForFragmentRange(fragment: ZoomFragment): FocusPoint[] {
    if (!isOrbitalZoomFragment(fragment)) return [];

    const sourceStartTime = fragment.trailSourceStartTime ?? fragment.startTime;
    const from = fragment.startTime - sourceStartTime;
    const to = fragment.endTime - sourceStartTime;
    const start = getOrbitalFocus(fragment, from);
    const end = getOrbitalFocus(fragment, to);
    if (!start || !end) return [];

    const interior = [...(fragment.trail ?? [])]
        .filter((point) => Number.isFinite(point.t) && point.t > from && point.t < to)
        .sort((a, b) => a.t - b.t)
        .map((point) => ({
            x: clampFocusCoordinate(point.x, fragment.focusX),
            y: clampFocusCoordinate(point.y, fragment.focusY),
        }));

    return [start, ...interior, end];
}

export interface ZoomFragment {
    id: string;
    startTime: number;
    endTime: number;
    zoomLevel: number;
    speed: number;
    focusX: number;
    focusY: number;
    movementEnabled?: boolean;
    movementEndX?: number;
    movementEndY?: number;
    movementStartOffset?: number;
    movementEndOffset?: number;
    movementMode?: "linear" | "orbital";
    trail?: TrailPoint[];
    /** Absolute timeline time represented by trail[0].t (set for Autozoom fragments). */
    trailSourceStartTime?: number;
    enable3D?: boolean;
    perspective3DIntensity?: number;
    perspective3DAngleX?: number;
    perspective3DAngleY?: number;
}

export interface ZoomState {
    fragments: ZoomFragment[];
    selectedFragmentId: string | null;
}

export interface ZoomFragmentEditorProps {
    fragment: ZoomFragment;
    videoUrl: string | null;
    videoThumbnail?: string | null;
    currentTime?: number;
    getThumbnailForTime?: (time: number) => VideoThumbnail | null;
    videoDimensions?: { width: number; height: number } | null;
    onBack: () => void;
    onDelete: () => void;
    onUpdate: (updates: Partial<ZoomFragment>) => void;
    is3DModelActive?: boolean;
}

// Smoother easing for professional zoom feel (quart curves)
export function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
}

export function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

/**
 * Numeric equivalent of `ZOOM_EASING`. Manual zooms use this curve through
 * CSS, while orbital zooms are sampled per video frame. Keeping the function
 * here makes their perceived entry speed and the exported result identical.
 */
export function easeZoomTransition(progress: number): number {
    const x = Math.max(0, Math.min(1, progress));
    if (x === 0 || x === 1) return x;

    const cubic = (time: number, p1: number, p2: number) => {
        const inverse = 1 - time;
        return 3 * inverse * inverse * time * p1 + 3 * inverse * time * time * p2 + time * time * time;
    };

    // CSS easing is defined by x/y control points. Solve its x-coordinate to
    // obtain the same y-coordinate that the browser uses for manual zooms.
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 14; iteration += 1) {
        const time = (low + high) / 2;
        if (cubic(time, 0.4, 0.2) < x) low = time;
        else high = time;
    }
    return cubic((low + high) / 2, 0, 1);
}

// Calculate 3-phase zoom state based on current time within fragment
export interface ZoomPhaseState {
    phase: 'entry' | 'hold' | 'exit';
    scale: number;
    focusX: number;
    focusY: number;
    progress: number;
    rotateX: number;
    rotateY: number;
    perspective: number;
}

export function calculateZoomPhaseState(
    fragment: ZoomFragment,
    currentTime: number,
    forExport: boolean = false
): ZoomPhaseState {
    const totalDuration = fragment.endTime - fragment.startTime;
    const elapsed = currentTime - fragment.startTime;
    const normalizedTime = Math.max(0, Math.min(1, elapsed / totalDuration));

    const targetScale = zoomLevelToFactor(fragment.zoomLevel);
    const enable3D = fragment.enable3D ?? false;

    const transitionSeconds = speedToTransitionMs(fragment.speed) / 1000;
    const entryEndTime = fragment.startTime + transitionSeconds;
    const exitStartTime = fragment.endTime;
    const holdDuration = Math.max(0, exitStartTime - entryEndTime);

    let rotateX = 0;
    let rotateY = 0;
    let perspective = 0;
    let scale = forExport ? 1 : targetScale;
    let focusX = fragment.focusX;
    let focusY = fragment.focusY;
    let phase: 'entry' | 'hold' | 'exit' = 'hold';
    let progress = normalizedTime;

    const movementEndX = fragment.movementEndX ?? fragment.focusX;
    const movementEndY = fragment.movementEndY ?? fragment.focusY;

    // The backend trajectory drives the focus during every phase. Applying it
    // only in hold caused an A → B-like jump at the end of the zoom entrance.
    const isOrbital = isOrbitalZoomFragment(fragment);
    const orbitalFocus = getOrbitalFocusAtTimelineTime(fragment, currentTime);
    if (orbitalFocus) {
        focusX = orbitalFocus.x;
        focusY = orbitalFocus.y;
        progress = normalizedTime;
    }

    if (currentTime < entryEndTime && transitionSeconds > 0) {
        phase = 'entry';
        const entryProgress = (currentTime - fragment.startTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, entryProgress));
        const easedProgress = easeZoomTransition(progress);

        if (forExport) {
            scale = 1 + (targetScale - 1) * easedProgress;
        }

    } else if (currentTime >= exitStartTime && transitionSeconds > 0) {
        phase = 'exit';
        const exitProgress = (currentTime - exitStartTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, exitProgress));
        const easedProgress = easeZoomTransition(progress);

        if (forExport) {
            scale = targetScale - (targetScale - 1) * easedProgress;
        }

        if (fragment.movementEnabled && !isOrbital) {
            focusX = movementEndX;
            focusY = movementEndY;
        }

    } else {
        phase = 'hold';

        if (forExport) {
            scale = targetScale;
        }

        if (!isOrbital && fragment.movementEnabled && holdDuration > 0) {
            const movementStartOffset = fragment.movementStartOffset ?? 0;
            const movementEndOffset = fragment.movementEndOffset ?? holdDuration;

            const movementStartTime = entryEndTime + Math.max(0, Math.min(movementStartOffset, holdDuration));
            const movementEndTime = entryEndTime + Math.max(movementStartOffset, Math.min(movementEndOffset, holdDuration));
            const movementDuration = movementEndTime - movementStartTime;

            if (currentTime >= movementStartTime && currentTime <= movementEndTime && movementDuration > 0) {
                const movementProgress = (currentTime - movementStartTime) / movementDuration;
                const easedProgress = easeInOutQuart(Math.min(1, movementProgress));
                focusX = fragment.focusX + (movementEndX - fragment.focusX) * easedProgress;
                focusY = fragment.focusY + (movementEndY - fragment.focusY) * easedProgress;
                progress = movementProgress;
            } else if (currentTime > movementEndTime) {
                focusX = movementEndX;
                focusY = movementEndY;
                progress = 1;
            }
        }
    }

    // 3D EFFECT: Completely separate from zoom animation
    if (enable3D) {
        const intensity = (fragment.perspective3DIntensity ?? 50) / 100;

        const baseAngleX = fragment.perspective3DAngleX ?? 0;
        const baseAngleY = fragment.perspective3DAngleY ?? 0;

        let effect3DOpacity = 0;

        if (phase === 'entry') {
            const entryProgress = (currentTime - fragment.startTime) / transitionSeconds;
            effect3DOpacity = Math.min(1, entryProgress * 1.2);
        } else if (phase === 'exit') {
            const exitProgress = (currentTime - exitStartTime) / transitionSeconds;
            effect3DOpacity = Math.max(0, 1 - exitProgress);
        } else {
            effect3DOpacity = 1;
        }

        // Apply 3D with smooth easing
        const smoothOpacity = easeInOutQuart(effect3DOpacity);
        perspective = 500;

        const maxRotation = 32 * intensity;
        rotateX = (baseAngleX / 45) * maxRotation * smoothOpacity;
        rotateY = (baseAngleY / 45) * maxRotation * smoothOpacity;
    }

    return {
        phase,
        scale,
        focusX,
        focusY,
        progress,
        rotateX,
        rotateY,
        perspective,
    };
}

// Calculate available hold time for camera movement
export function calculateHoldDuration(fragment: ZoomFragment): number {
    const totalDuration = fragment.endTime - fragment.startTime;
    const transitionSeconds = speedToTransitionMs(fragment.speed) / 1000;
    return Math.max(0, totalDuration - 2 * transitionSeconds);
}

export interface ZoomStateCanvas {
    scale: number;
    focusX: number;
    focusY: number;
}

export interface ZoomState {
    scale: number;
    focusX: number;
    focusY: number;
}

const DEFAULT_ZOOM_LEVEL = 1.5;
const DEFAULT_ZOOM_SPEED = 5;

// Helper to create a new fragment with default values
export function createZoomFragment(
    startTime: number,
    endTime: number
): ZoomFragment {
    return {
        id: `zoom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        startTime,
        endTime,
        zoomLevel: DEFAULT_ZOOM_LEVEL,
        speed: DEFAULT_ZOOM_SPEED,
        focusX: 50,
        focusY: 50,
        movementEnabled: false,
    };
}

// Helper to generate default fragments when a video loads
export function generateDefaultZoomFragments(
    videoDuration: number
): ZoomFragment[] {
    if (videoDuration <= 0) return [];

    const fragmentDuration = 2;
    const spacing = videoDuration / 3;

    const fragments: ZoomFragment[] = [];

    const start1 = Math.max(0, spacing * 0.5);
    fragments.push(createZoomFragment(
        start1,
        Math.min(start1 + fragmentDuration, videoDuration)
    ));

    const start2 = Math.max(0, spacing * 2);
    fragments.push(createZoomFragment(
        start2,
        Math.min(start2 + fragmentDuration, videoDuration)
    ));

    return fragments;
}

// Convert zoomLevel (1-10) to actual zoom factor
export function zoomLevelToFactor(level: number): number {
    const minZoom = 1.2;
    const maxZoom = 4.0;
    const normalized = (level - 1) / 9;
    return minZoom + (maxZoom - minZoom) * normalized;
}

// Convert speed (1-10) to transition duration in milliseconds
export function speedToTransitionMs(speed: number): number {
    const minMs = 150;
    const maxMs = 2000;
    const normalized = (speed - 1) / 9;
    return Math.round(maxMs - (maxMs - minMs) * normalized);
}

export const ZOOM_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function formatZoomTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
