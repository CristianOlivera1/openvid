import { TIMELINE_ZOOM_SCALE } from './constants';
import { forceResolveVideoDuration } from './webm-duration.utils';

export function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
    if (!video.seeking && video.readyState >= 2) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        let resolved = false;

        const done = () => {
            if (!resolved) {
                resolved = true;
                video.removeEventListener('seeked', done);
                resolve();
            }
        };

        if (video.seeking) {
            video.addEventListener('seeked', done, { once: true });
        } else {
            done();
            return;
        }

        // Ultra-fast safety timeout for memory blobs
        setTimeout(done, 100);
    });
}

/**
 * Ensures the video is ready for export
 */
export async function ensureVideoReady(video: HTMLVideoElement): Promise<void> {
    // Wait if video is not loaded yet
    if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
            const onReady = () => {
                video.removeEventListener('canplay', onReady);
                resolve();
            };
            video.addEventListener('canplay', onReady, { once: true });
            setTimeout(resolve, 3000);
        });
    }
    
    // Headerless WebM (MediaRecorder) reports Infinity; force the browser to
    // scan the stream and resolve the real duration before exporting.
    if (!Number.isFinite(video.duration)) {
        await forceResolveVideoDuration(video);
    }

    // Pausar y mover al inicio
    video.pause();
    video.currentTime = 0;

    // Wait for the first frame to be ready (event-driven, not a fixed delay)
    await waitForVideoFrame(video);
}

export function formatTime(time: number): string {
    if (isNaN(time) || !isFinite(time) || time < 0) {
        return '00:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getZoomMultiplier(zoom: number): number {
    const rounded = Math.round(Math.max(1, Math.min(10, zoom)));
    return TIMELINE_ZOOM_SCALE[rounded] ?? 1;
}
