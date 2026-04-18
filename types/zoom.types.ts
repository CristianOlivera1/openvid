import { VideoThumbnail } from "./editor.types";

export interface ZoomFragment {
    id: string;
    startTime: number;      // Tiempo de inicio del fragmento (segundos)
    endTime: number;        // Tiempo de fin del fragmento (segundos)
    zoomLevel: number;      // Nivel de zoom (1-10, donde 5 = 2x)
    speed: number;          // Velocidad de animación entrada/salida (1-10)
    focusX: number;         // Punto de enfoque inicial X (0-100%)
    focusY: number;         // Punto de enfoque inicial Y (0-100%)

    // 3-Phase System: Entry → Hold with Pan Movement → Exit
    // When movementEnabled is false, it's simple zoom in/out (CSS handles transitions)
    movementEnabled?: boolean;    // Enable dynamic hold phase with panning
    movementEndX?: number;        // Destination X after panning (0-100%)
    movementEndY?: number;        // Destination Y after panning (0-100%)
    // Movement timing within hold period (0 = hold start, holdDuration = hold end)
    movementStartOffset?: number; // When movement starts (seconds from hold start)
    movementEndOffset?: number;   // When movement ends (seconds from hold start)

    // 3D perspective effect during zoom
    enable3D?: boolean;           // Enable 3D perspective effect
    perspective3DIntensity?: number; // 0-100: intensity of 3D effect (default 50)
    perspective3DAngleX?: number;    // -45 to 45: tilt angle X direction (default: auto from focus)
    perspective3DAngleY?: number;    // -45 to 45: tilt angle Y direction (default: auto from focus)
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
}

// Smoother easing for professional zoom feel (quart curves)
export function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
}

export function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// Calculate 3-phase zoom state based on current time within fragment
export interface ZoomPhaseState {
    phase: 'entry' | 'hold' | 'exit';
    scale: number;
    focusX: number;
    focusY: number;
    progress: number; // 0-1 progress within current phase
    // 3D effect values
    rotateX: number;  // degrees
    rotateY: number;  // degrees
    perspective: number; // px (0 = no perspective)
}

/**
 * Calculate zoom phase state for both preview and export
 * @param fragment - The zoom fragment configuration
 * @param currentTime - Current playback time in seconds
 * @param forExport - If true, calculates animated scale (for canvas export). If false, returns target scale (CSS handles animation)
 */
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

    // Calculate transition timing
    const transitionSeconds = speedToTransitionMs(fragment.speed) / 1000;
    const entryEndTime = fragment.startTime + transitionSeconds;
    const exitStartTime = fragment.endTime - transitionSeconds;
    const holdDuration = Math.max(0, exitStartTime - entryEndTime);

    // Initialize state
    let rotateX = 0;
    let rotateY = 0;
    let perspective = 0;
    let scale = forExport ? 1 : targetScale; // For preview, CSS handles animation
    let focusX = fragment.focusX;
    let focusY = fragment.focusY;
    let phase: 'entry' | 'hold' | 'exit' = 'hold';
    let progress = normalizedTime;

    // Movement end points
    const movementEndX = fragment.movementEndX ?? fragment.focusX;
    const movementEndY = fragment.movementEndY ?? fragment.focusY;

    // Determine phase and calculate ZOOM values (independent of 3D)
    if (currentTime < entryEndTime && transitionSeconds > 0) {
        // ENTRY PHASE: Zoom in
        phase = 'entry';
        const entryProgress = (currentTime - fragment.startTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, entryProgress));
        const easedProgress = easeOutQuart(progress);

        if (forExport) {
            scale = 1 + (targetScale - 1) * easedProgress;
        }

    } else if (currentTime >= exitStartTime && transitionSeconds > 0) {
        // EXIT PHASE: Zoom out
        phase = 'exit';
        const exitProgress = (currentTime - exitStartTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, exitProgress));
        const easedProgress = easeOutQuart(progress);

        if (forExport) {
            scale = targetScale - (targetScale - 1) * easedProgress;
        }

        // Focus should be at movement end if movement was enabled
        if (fragment.movementEnabled) {
            focusX = movementEndX;
            focusY = movementEndY;
        }

    } else {
        // HOLD PHASE: Maintain zoom, handle movement
        phase = 'hold';

        if (forExport) {
            scale = targetScale;
        }

        // Handle camera movement during hold
        if (fragment.movementEnabled && holdDuration > 0) {
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
    // Professional approach: subtle static perspective that fades in/out smoothly
    if (enable3D) {
        const intensity = (fragment.perspective3DIntensity ?? 50) / 100; // 0-1 range

        // Get user-configured angles (default to 0 for neutral, user picks direction)
        const baseAngleX = fragment.perspective3DAngleX ?? 0;
        const baseAngleY = fragment.perspective3DAngleY ?? 0;

        // Calculate 3D opacity based on phase for smooth transitions
        let effect3DOpacity = 0;

        if (phase === 'entry') {
            const entryProgress = (currentTime - fragment.startTime) / transitionSeconds;
            // El 3D arranca desde el inicio de la entry, sin umbral
            effect3DOpacity = Math.min(1, entryProgress * 1.2); // llega a 1 antes del final de entry
        } else if (phase === 'exit') {
            const exitProgress = (currentTime - exitStartTime) / transitionSeconds;
            // El 3D se va durante toda la exit
            effect3DOpacity = Math.max(0, 1 - exitProgress * 1.8);
        } else {
            effect3DOpacity = 1;
        }

        // Apply 3D with smooth easing
        const smoothOpacity = easeInOutQuart(effect3DOpacity);
        perspective = 500; // Distancia de perspectiva fija para un efecto sutil y profesional

        // Intensidad de rotacion
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
// Hold time = fragment duration - entry transition - exit transition
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

const DEFAULT_ZOOM_LEVEL = 1.5;   // 2x zoom
const DEFAULT_ZOOM_SPEED = 4;   // Medium speed

// Helper para crear un nuevo fragmento con valores por defecto
// By default, creates a simple zoom in/out fragment without camera movement
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
        // 3-phase movement disabled by default (simple zoom in/out)
        movementEnabled: false,
    };
}

// Helper para generar fragmentos por defecto cuando carga un video
export function generateDefaultZoomFragments(
    videoDuration: number
): ZoomFragment[] {
    if (videoDuration <= 0) return [];

    const fragmentDuration = 2;
    const spacing = videoDuration / 3;

    const fragments: ZoomFragment[] = [];

    // Primer fragmento en el primer tercio
    const start1 = Math.max(0, spacing * 0.5);
    fragments.push(createZoomFragment(
        start1,
        Math.min(start1 + fragmentDuration, videoDuration)
    ));

    // Segundo fragmento en el segundo tercio
    const start2 = Math.max(0, spacing * 2);
    fragments.push(createZoomFragment(
        start2,
        Math.min(start2 + fragmentDuration, videoDuration)
    ));

    return fragments;
}

// Convertir zoomLevel (1-10) a factor de zoom real
export function zoomLevelToFactor(level: number): number {
    const minZoom = 1.2;
    const maxZoom = 4.0;
    const normalized = (level - 1) / 9; // 0 to 1
    return minZoom + (maxZoom - minZoom) * normalized;
}

// Convertir speed (1-10) a duración de transición en milisegundos
export function speedToTransitionMs(speed: number): number {
    const minMs = 150;   // Speed 10
    const maxMs = 2000;  // Speed 1
    const normalized = (speed - 1) / 9; // 0 to 1
    return Math.round(maxMs - (maxMs - minMs) * normalized);
}

// Easing suave para animaciones de zoom (cubic-bezier)
export const ZOOM_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Formatear tiempo para mostrar en UI (MM:SS)
export function formatZoomTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
