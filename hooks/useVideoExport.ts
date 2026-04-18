"use client";

import { useState, useCallback, RefObject, useRef } from "react";
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from "mediabunny";
import type { VideoCanvasHandle } from "@/types";
import type { ExportQuality, ExportSettings, ExportProgress } from "@/types";
import type { VideoTrackClip } from "@/types/video-track.types";
import { QUALITY_SETTINGS, DEFAULT_EXPORT_FPS } from "@/lib/constants";
import { ensureVideoReady, waitForVideoFrame, downloadBlob } from "@/lib/video.utils";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export type { ExportQuality, ExportSettings, ExportProgress };

interface CancellationToken {
    cancelled: boolean;
}

// Helper: find which clip is active at a given timeline time
function getActiveClipAtTime(clips: VideoTrackClip[], timelineTime: number): { clip: VideoTrackClip; clipTime: number } | null {
    for (const clip of clips) {
        const clipDuration = clip.trimEnd - clip.trimStart;
        const clipEndTime = clip.startTime + clipDuration;
        if (timelineTime >= clip.startTime && timelineTime < clipEndTime) {
            const clipTime = clip.trimStart + (timelineTime - clip.startTime);
            return { clip, clipTime };
        }
    }
    return null;
}

export function useVideoExport(
    videoRef: RefObject<HTMLVideoElement | null>,
    canvasRef: RefObject<VideoCanvasHandle | null>,
) {
    const [exportProgress, setExportProgress] = useState<ExportProgress>({
        status: "idle",
        progress: 0,
        message: "",
    });

    const cancellationRef = useRef<CancellationToken>({ cancelled: false });
    const isExportingRef = useRef(false);

    const resetState = useCallback(() => {
        cancellationRef.current = { cancelled: false };
        isExportingRef.current = false;
        setExportProgress({
            status: "idle",
            progress: 0,
            message: "",
        });
    }, []);

    const exportVideo = useCallback(async (settings: ExportSettings): Promise<void> => {
        // Prevenir múltiples exportaciones simultáneas
        if (isExportingRef.current) {
            console.log("Export already in progress");
            return;
        }

        // Reset completo del estado antes de empezar
        cancellationRef.current = { cancelled: false };
        isExportingRef.current = true;

        const video = videoRef.current;
        const canvasHandle = canvasRef.current;

        if (!video || !canvasHandle) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "No hay video para exportar",
            });
            isExportingRef.current = false;
            return;
        }

        // Verificar que el video tenga duración válida
        if (!video.duration || video.duration === Infinity || isNaN(video.duration)) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "El video no está cargado correctamente",
            });
            isExportingRef.current = false;
            return;
        }

        const exportCanvas = canvasHandle.getExportCanvas();
        if (!exportCanvas) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "Error al obtener el canvas de exportación",
            });
            isExportingRef.current = false;
            return;
        }

        const qualitySettings = QUALITY_SETTINGS[settings.quality];
        const fps = settings.fps || qualitySettings.fps || DEFAULT_EXPORT_FPS;

        try {
            setExportProgress({
                status: "preparing",
                progress: 2,
                message: "Preparando video...",
            });

            // Asegurar que el video esté completamente listo
            await ensureVideoReady(video);

            if (cancellationRef.current.cancelled) {
                throw new Error("Exportación cancelada");
            }

            setExportProgress({
                status: "preparing",
                progress: 5,
                message: "Configurando exportación...",
            });

            // Ajustar tamaño del canvas según calidad manteniendo aspect ratio
            const originalWidth = exportCanvas.width;
            const originalHeight = exportCanvas.height;
            const originalAspectRatio = originalWidth / originalHeight;
            const qualityAspectRatio = qualitySettings.width / qualitySettings.height;

            // Escalar para mantener el aspect ratio del canvas original
            let targetWidth: number;
            let targetHeight: number;

            if (Math.abs(originalAspectRatio - qualityAspectRatio) < 0.01) {
                // Si los aspect ratios son similares, usar dimensiones directas
                targetWidth = qualitySettings.width;
                targetHeight = qualitySettings.height;
            } else if (originalAspectRatio > qualityAspectRatio) {
                // Canvas más ancho, escalar por ancho
                targetWidth = qualitySettings.width;
                targetHeight = Math.round(qualitySettings.width / originalAspectRatio);
            } else {
                // Canvas más alto, escalar por altura
                targetHeight = qualitySettings.height;
                targetWidth = Math.round(qualitySettings.height * originalAspectRatio);
            }

            // Ensure dimensions are even numbers (required by AVC codec)
            targetWidth = Math.round(targetWidth / 2) * 2;
            targetHeight = Math.round(targetHeight / 2) * 2;

            exportCanvas.width = targetWidth;
            exportCanvas.height = targetHeight;

            // Guardar posición actual del video y estado de audio
            const originalTime = video.currentTime;
            const wasPlaying = !video.paused;
            const originalMuted = video.muted;

            // Mutear el video durante la exportación para evitar audio entrecortado
            video.muted = true;

            // Determine trim range (use full video if no trim specified)
            const trimStart = settings.trim?.start ?? 0;
            const trimEnd = settings.trim?.end ?? video.duration;
            const exportDuration = trimEnd - trimStart;

            if (settings.quality === "gif") {
                await exportWithFFmpegGif(
                    video,
                    canvasHandle,
                    exportCanvas,
                    exportDuration,
                    trimStart,
                    fps,
                    targetWidth,
                    targetHeight,
                    setExportProgress,
                    cancellationRef.current
                );
            } else if (settings.quality === "webm-alpha" || settings.transparentBackground) {

                await exportWithFFmpegWebM(
                    video,
                    canvasHandle,
                    exportCanvas,
                    exportDuration,
                    trimStart,
                    fps,
                    targetWidth,
                    targetHeight,
                    setExportProgress,
                    cancellationRef.current,
                    settings
                );

            } else {
                await exportWithMediabunnyAndAudio(
                    video,
                    canvasHandle,
                    exportCanvas,
                    exportDuration,
                    trimStart,
                    fps,
                    qualitySettings.bitrate,
                    qualitySettings.width,
                    qualitySettings.height,
                    setExportProgress,
                    cancellationRef.current,
                    settings
                );
            }

            // Restaurar canvas y video
            exportCanvas.width = originalWidth;
            exportCanvas.height = originalHeight;
            video.currentTime = originalTime;
            video.muted = originalMuted;

            // Restaurar estado de reproducción
            if (wasPlaying) {
                await video.play().catch(() => { });
            }

        } catch (error) {
            // Si fue cancelado, no mostrar error
            if (cancellationRef.current.cancelled) {
                setExportProgress({
                    status: "idle",
                    progress: 0,
                    message: "",
                });
            } else {
                console.error("Error durante la exportación:", error);
                setExportProgress({
                    status: "error",
                    progress: 0,
                    message: error instanceof Error ? error.message : "Error durante la exportación",
                });
            }
        } finally {
            // Siempre resetear el flag de exportación
            isExportingRef.current = false;
        }
    }, [videoRef, canvasRef]);

    const cancelExport = useCallback(() => {
        // Marcar como cancelado
        cancellationRef.current.cancelled = true;
        // Resetear el flag de exportación inmediatamente
        isExportingRef.current = false;
        setExportProgress({
            status: "idle",
            progress: 0,
            message: "",
        });
    }, []);

    return {
        exportVideo,
        cancelExport,
        resetState,
        exportProgress,
    };
}

async function exportWithFFmpegWebM(
    video: HTMLVideoElement,
    canvasHandle: VideoCanvasHandle,
    canvas: HTMLCanvasElement,
    duration: number,
    trimStart: number,
    fps: number,
    width: number,
    height: number,
    setProgress: (p: ExportProgress) => void,
    cancellation: CancellationToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _settings?: ExportSettings // Reserved for future audio support in WebM
): Promise<void> {
    const ffmpeg = new FFmpeg();
    const totalFrames = Math.ceil(duration * fps);

    setProgress({ status: "preparing", progress: 3, message: "Cargando motor WebM..." });

    const ffmpegBase = `${window.location.origin}/ffmpeg`;
    await ffmpeg.load({
        coreURL: await toBlobURL(`${ffmpegBase}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${ffmpegBase}/ffmpeg-core.wasm`, "application/wasm"),
    });

    video.pause();
    video.currentTime = trimStart;
    await waitForVideoFrame(video);

    for (let i = 0; i < totalFrames; i++) {
        if (cancellation.cancelled) throw new Error("Exportación cancelada");

        // Video is already at the correct position (pre-seek or end of prev iteration)
        await canvasHandle.drawFrame();

        // Trigger next seek immediately after canvas capture to overlap with encode
        const nextI = i + 1;
        if (nextI < totalFrames) {
            video.currentTime = Math.min(trimStart + nextI / fps, trimStart + duration - 0.001);
        }

        // Encode current frame while next seek is in flight
        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(b => b ? resolve(b) : reject(), "image/png")
        );
        const data = new Uint8Array(await blob.arrayBuffer());
        await ffmpeg.writeFile(`frame${String(i).padStart(5, "0")}.png`, data);

        if (i % 10 === 0 || i === totalFrames - 1) {
            setProgress({
                status: "encoding",
                progress: 8 + Math.round((i / totalFrames) * 60),
                message: `[Paso 1/2] Guardando frame ${i + 1} de ${totalFrames}...`,
            });
        }

        // Await next frame — partially decoded by now
        if (nextI < totalFrames) {
            await waitForVideoFrame(video);
        }
    }

    // Actualizar progreso durante la codificación VP8
    ffmpeg.on("progress", ({ progress }) => {
        if (progress > 0) {
            const encodingProgress = 70 + Math.round(progress * 20);
            setProgress({
                status: "finalizing",
                progress: Math.min(encodingProgress, 90),
                message: `[Paso 2/2] Codificando VP8 con transparencia...`,
            });
        }
    });

    setProgress({ status: "finalizing", progress: 70, message: "[Paso 2/2] Iniciando codificación VP8..." });

    try {
        await ffmpeg.exec([
            "-f", "image2",
            "-framerate", String(fps),
            "-i", "frame%05d.png",
            "-c:v", "libvpx",
            "-auto-alt-ref", "0",
            "-b:v", "1M",
            "-vf", "format=yuva420p",
            "output.webm",
        ]);
    } finally {
        // Limpiar frames independientemente del resultado
        try {
            for (let i = 0; i < totalFrames; i++) {
                await ffmpeg.deleteFile(`frame${String(i).padStart(5, "0")}.png`);
            }
        } catch { /* ignorar errores de limpieza */ }
    }

    setProgress({ status: "finalizing", progress: 94, message: "Preparando descarga..." });

    const webmData = (await ffmpeg.readFile("output.webm")) as Uint8Array;
    const webmBlob = new Blob([new Uint8Array(webmData)], { type: "video/webm" });

    try { await ffmpeg.deleteFile("output.webm"); } catch { /* ignorar */ }

    downloadBlob(webmBlob, `video-transparent-${width}x${height}.webm`);

    setProgress({ status: "complete", progress: 100, message: "¡WebM con transparencia exportado!" });
}

async function exportWithMediabunny(
    video: HTMLVideoElement,
    canvasHandle: VideoCanvasHandle,
    canvas: HTMLCanvasElement,
    duration: number,
    trimStart: number,
    fps: number,
    bitrate: number,
    width: number,
    height: number,
    setProgress: (p: ExportProgress) => void,
    cancellation: CancellationToken
): Promise<void> {
    // Verificar cancelación
    if (cancellation.cancelled) {
        throw new Error("Exportación cancelada");
    }

    setProgress({
        status: "encoding",
        progress: 10,
        message: `Iniciando codificación a ${fps} fps...`,
    });

    const totalFrames = Math.ceil(duration * fps);
    const frameDuration = 1 / fps;

    const output = new Output({
        format: new Mp4OutputFormat({
            fastStart: "in-memory",
        }),
        target: new BufferTarget(),
    });

    const videoSource = new CanvasSource(canvas, {
        codec: "avc",
        bitrate: bitrate,
    });

    output.addVideoTrack(videoSource, {
        frameRate: fps,
    });

    await output.start();

    // Pausar el video y moverlo al inicio del trim
    video.pause();
    video.currentTime = trimStart;
    await waitForVideoFrame(video);

    // Procesar frames con seek pipelinizado (seek N+1 overlaps encode N)
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        if (cancellation.cancelled) {
            throw new Error("Exportación cancelada");
        }

        const outputTime = frameIndex / fps;

        // Video is already at the correct position (pre-seek or end of prev iteration)
        await canvasHandle.drawFrame();
        await videoSource.add(outputTime, frameDuration);

        // Trigger next seek immediately (overlaps JS overhead)
        const nextIndex = frameIndex + 1;
        if (nextIndex < totalFrames) {
            video.currentTime = Math.min(trimStart + nextIndex / fps, trimStart + duration - 0.001);
        }

        if (frameIndex % 10 === 0 || frameIndex === totalFrames - 1) {
            const progress = 10 + Math.round((frameIndex / totalFrames) * 80);
            setProgress({
                status: "encoding",
                progress,
                message: `Codificando ${frameIndex + 1}/${totalFrames} frames (${fps}fps)...`,
            });
        }

        // Await next frame — partially decoded by now
        if (nextIndex < totalFrames) {
            await waitForVideoFrame(video);
        }
    }

    // Verificar cancelación antes de finalizar
    if (cancellation.cancelled) {
        throw new Error("Exportación cancelada");
    }

    setProgress({
        status: "finalizing",
        progress: 92,
        message: "Finalizando codificación...",
    });

    await output.finalize();

    // Verificar una última vez antes de descargar
    if (cancellation.cancelled) {
        throw new Error("Exportación cancelada");
    }

    setProgress({
        status: "finalizing",
        progress: 96,
        message: "Generando archivo MP4...",
    });

    const buffer = (output.target as BufferTarget).buffer;

    if (!buffer) {
        throw new Error("No se pudo generar el archivo MP4");
    }

    const blob = new Blob([buffer], { type: "video/mp4" });
    downloadBlob(blob, `video-export-${width}x${height}.mp4`);

    setProgress({
        status: "complete",
        progress: 100,
        message: "¡Exportación completada!",
    });
}

// Export with MediaBunny for video + FFmpeg for audio mixing
async function exportWithMediabunnyAndAudio(
    video: HTMLVideoElement,
    canvasHandle: VideoCanvasHandle,
    canvas: HTMLCanvasElement,
    duration: number,
    trimStart: number,
    fps: number,
    bitrate: number,
    width: number,
    height: number,
    setProgress: (p: ExportProgress) => void,
    cancellation: CancellationToken,
    settings: ExportSettings
): Promise<void> {
    const hasAudioTracks = settings.audioTracks && settings.audioTracks.length > 0;
    // Only consider original audio if: (1) not explicitly muted AND (2) the source video actually has an audio stream.
    // videoHasAudioTrack defaults to true (safe fallback) if not provided.
    const sourceHasAudioStream = settings.videoHasAudioTrack !== false;
    const hasOriginalAudio = !settings.muteOriginalAudio && sourceHasAudioStream;
    const needsAudioMixing = hasAudioTracks || hasOriginalAudio;

    // Check if multi-clip export
    const hasMultipleClips = settings.videoClips && settings.videoClips.length > 1 && settings.videoClipBlobs;
    const clips = settings.videoClips || [];
    const clipBlobs = settings.videoClipBlobs;

    // If no audio mixing needed, use simple export (single video only)
    if (!needsAudioMixing && !hasMultipleClips) {
        return exportWithMediabunny(
            video, canvasHandle, canvas, duration, trimStart, fps,
            bitrate, width, height, setProgress, cancellation
        );
    }

    // Verificar cancelación
    if (cancellation.cancelled) {
        throw new Error("Exportación cancelada");
    }

    setProgress({
        status: "encoding",
        progress: 5,
        message: hasMultipleClips ? `Preparando exportación multi-clip...` : `Preparando exportación con audio...`,
    });

    const totalFrames = Math.ceil(duration * fps);
    const frameDuration = 1 / fps;

    // Step 1: Encode video with MediaBunny
    const output = new Output({
        format: new Mp4OutputFormat({
            fastStart: "in-memory",
        }),
        target: new BufferTarget(),
    });

    const videoSource = new CanvasSource(canvas, {
        codec: "avc",
        bitrate: bitrate,
    });

    output.addVideoTrack(videoSource, {
        frameRate: fps,
    });

    await output.start();

    video.pause();

    // For multi-clip export, track the current active clip ID
    let currentClipId: string | null = null;

    // Initial setup based on whether we have multiple clips
    if (hasMultipleClips && clips.length > 0) {
        // Sort clips by start time
        const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
        const firstClip = sortedClips[0];
        if (firstClip && clipBlobs) {
            const blob = clipBlobs.get(firstClip.libraryVideoId);
            if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                video.src = blobUrl;
                await new Promise<void>((resolve, reject) => {
                    video.onloadedmetadata = () => resolve();
                    video.onerror = () => reject(new Error("Failed to load video"));
                });
                currentClipId = firstClip.id;
            }
        }
        video.currentTime = clips[0]?.trimStart || 0;
    } else {
        video.currentTime = trimStart;
    }

    await waitForVideoFrame(video);

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        if (cancellation.cancelled) {
            throw new Error("Exportación cancelada");
        }

        const outputTime = frameIndex / fps;
        const timelineTime = trimStart + outputTime;

        // Multi-clip: determine which clip we're in and seek to correct position
        if (hasMultipleClips && clipBlobs) {
            const activeClipInfo = getActiveClipAtTime(clips, timelineTime);

            if (activeClipInfo) {
                const { clip, clipTime } = activeClipInfo;

                // Check if we need to switch video source
                if (clip.id !== currentClipId) {
                    const newBlob = clipBlobs.get(clip.libraryVideoId);
                    if (newBlob) {
                        const blobUrl = URL.createObjectURL(newBlob);
                        video.pause();
                        video.src = blobUrl;
                        await new Promise<void>((resolve, reject) => {
                            video.onloadedmetadata = () => resolve();
                            video.onerror = () => reject(new Error("Failed to load video"));
                        });
                        currentClipId = clip.id;
                    }
                }

                // Seek to correct position within the clip's video
                video.currentTime = clipTime;
                await waitForVideoFrame(video);
            }
        }

        // Video is already at the correct position (pre-seek or end of prev iteration)
        await canvasHandle.drawFrame();
        await videoSource.add(outputTime, frameDuration);

        // For single-clip, trigger next seek immediately (overlaps JS overhead)
        if (!hasMultipleClips) {
            const nextFrame = frameIndex + 1;
            if (nextFrame < totalFrames) {
                video.currentTime = Math.min(trimStart + nextFrame / fps, trimStart + duration - 0.001);
            }
        }

        if (frameIndex % 10 === 0 || frameIndex === totalFrames - 1) {
            const progress = 5 + Math.round((frameIndex / totalFrames) * 50);
            setProgress({
                status: "encoding",
                progress,
                message: hasMultipleClips
                    ? `Codificando clips ${frameIndex + 1}/${totalFrames}...`
                    : `Codificando video ${frameIndex + 1}/${totalFrames}...`,
            });
        }

        // Await next frame — for single clip only (multi-clip handled at start of loop)
        if (!hasMultipleClips) {
            const nextFrame = frameIndex + 1;
            if (nextFrame < totalFrames) {
                await waitForVideoFrame(video);
            }
        }
    }

    if (cancellation.cancelled) {
        throw new Error("Exportación cancelada");
    }

    setProgress({
        status: "finalizing",
        progress: 56,
        message: "Finalizando video...",
    });

    await output.finalize();

    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) {
        throw new Error("No se pudo generar el archivo de video");
    }

    const videoBlob = new Blob([buffer], { type: "video/mp4" });

    // If no audio mixing needed, download directly
    if (!needsAudioMixing) {
        downloadBlob(videoBlob, `video-export-${width}x${height}.mp4`);
        setProgress({ status: "complete", progress: 100, message: "¡Exportación completada!" });
        return;
    }

    // Pre-check: even if needsAudioMixing is true, verify we actually have usable audio sources
    // before loading FFmpeg (which can fail with FS errors if WASM files are missing/corrupt)
    const sourceBlob = hasOriginalAudio ? settings.videoBlob : undefined;
    const hasUsableSourceBlob = !!(sourceBlob && sourceBlob.size > 0);
    const hasUsableAudioTracks = !!(settings.audioTracks && settings.audioTracks.some(t => t.audioUrl));

    if (!hasUsableSourceBlob && !hasUsableAudioTracks) {
        // No actual audio data to mix — download video directly without loading FFmpeg
        downloadBlob(videoBlob, `video-export-${width}x${height}.mp4`);
        setProgress({ status: "complete", progress: 100, message: "¡Exportación completada!" });
        return;
    }

    // Step 2: Use FFmpeg to add audio — wrapped in try-catch to fall back on any FS/WASM error
    try {
        setProgress({
            status: "finalizing",
            progress: 60,
            message: "Cargando motor de audio...",
        });

        const ffmpeg = new FFmpeg();
        const baseURL = `${window.location.origin}/ffmpeg`;

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });

        // Write video file to FFmpeg
        const videoData = new Uint8Array(await videoBlob.arrayBuffer());
        await ffmpeg.writeFile("video.mp4", videoData);

        // Write original video for audio extraction if needed
        let hasSourceAudio = false;
        if (hasOriginalAudio) {
            if (hasUsableSourceBlob) {
                try {
                    const originalVideoData = new Uint8Array(await sourceBlob!.arrayBuffer());
                    await ffmpeg.writeFile("original.mp4", originalVideoData);

                    // Verificar si el video tiene stream de audio
                    // Probamos extrayendo audio — si falla, no tiene audio
                    try {
                        await ffmpeg.exec([
                            "-i", "original.mp4",
                            "-vn", "-t", "0.1",
                            "-f", "null", "-"
                        ]);
                        hasSourceAudio = true;
                    } catch {
                        // No tiene stream de audio
                        hasSourceAudio = false;
                        await ffmpeg.deleteFile("original.mp4").catch(() => { });
                    }
                } catch (e) {
                    console.warn("Could not read video blob for audio:", e);
                    hasSourceAudio = false;
                }
            } else {
                hasSourceAudio = false;
            }
        }

        // Write audio track files
        const audioTracks: { index: number; filename: string; track: NonNullable<typeof settings.audioTracks>[0] }[] = [];
        if (settings.audioTracks && settings.audioTracks.length > 0) {
            // Fetch all audio tracks in parallel, then write to FFmpeg WASM memory sequentially
            const fetchResults = await Promise.all(
                settings.audioTracks.map(async (track, i) => {
                    if (!track.audioUrl) return null;
                    try {
                        const response = await fetch(track.audioUrl);
                        const audioData = new Uint8Array(await response.arrayBuffer());
                        return { index: i, filename: `audio${i}.mp3`, track, audioData };
                    } catch (e) {
                        console.warn(`Could not load audio track ${i}:`, e);
                        return null;
                    }
                })
            );
            for (const result of fetchResults) {
                if (!result) continue;
                await ffmpeg.writeFile(result.filename, result.audioData);
                audioTracks.push({ index: result.index, filename: result.filename, track: result.track });
            }
        }

        setProgress({
            status: "finalizing",
            progress: 70,
            message: "Mezclando audio...",
        });

        // Build FFmpeg command for audio mixing
        const ffmpegArgs: string[] = ["-i", "video.mp4"];

        // Add original audio input if available
        if (hasSourceAudio) {
            ffmpegArgs.push("-ss", String(trimStart), "-t", String(duration), "-i", "original.mp4");
        }

        // Add audio track inputs
        for (const audioTrackFile of audioTracks) {
            ffmpegArgs.push("-i", audioTrackFile.filename);
        }

        // Build filter complex for audio mixing
        const audioInputs: string[] = [];
        let filterComplex = "";
        let inputIndex = 1; // Start at 1 because 0 is the video

        // Add original audio to mix
        if (hasSourceAudio) {
            const volume = settings.masterVolume ?? 1;
            filterComplex += `[${inputIndex}:a]volume=${volume}[a${inputIndex}];`;
            audioInputs.push(`[a${inputIndex}]`);
            inputIndex++;
        }

        // Add audio tracks to mix
        for (const audioTrackFile of audioTracks) {
            const { track } = audioTrackFile;
            const trackVolume = track.volume * (settings.masterVolume ?? 1);
            const delayMs = Math.round(track.startTime * 1000);
            const audioTrimStart = track.trimStart ?? 0;
            const audioTrimEnd = audioTrimStart + track.duration;

            filterComplex += `[${inputIndex}:a]atrim=${audioTrimStart}:${audioTrimEnd},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${trackVolume}[a${inputIndex}];`;
            audioInputs.push(`[a${inputIndex}]`);
            inputIndex++;
        }

        // Mix all audio streams
        const totalAudioInputs = (hasSourceAudio ? 1 : 0) + audioTracks.length;

        if (totalAudioInputs === 0) {
            // No usable audio after processing — download video directly
            downloadBlob(videoBlob, `video-export-${width}x${height}.mp4`);
            setProgress({ status: "complete", progress: 100, message: "¡Exportación completada!" });
            return;
        } else if (audioInputs.length > 0) {
            filterComplex += `${audioInputs.join("")}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0:normalize=0[aout]`;
            ffmpegArgs.push("-filter_complex", filterComplex);
            ffmpegArgs.push("-map", "0:v", "-map", "[aout]");
            ffmpegArgs.push("-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "output.mp4");
        } else {
            ffmpegArgs.push("-c:v", "copy", "-an", "output.mp4");
        }

        // Track FFmpeg progress
        ffmpeg.on("progress", ({ progress }) => {
            if (progress > 0) {
                const mixProgress = 70 + Math.round(progress * 25);
                setProgress({
                    status: "finalizing",
                    progress: Math.min(mixProgress, 95),
                    message: `Procesando audio... ${Math.round(progress * 100)}%`,
                });
            }
        });

        try {
            await ffmpeg.exec(ffmpegArgs);
        } catch (e) {
            console.error("FFmpeg audio mixing failed:", e);
            // Fallback: export video without audio mixing
            downloadBlob(videoBlob, `video-export-${width}x${height}.mp4`);
            setProgress({
                status: "complete",
                progress: 100,
                message: "¡Exportación completada (sin mezcla de audio)!",
            });
            return;
        }

        setProgress({
            status: "finalizing",
            progress: 96,
            message: "Preparando descarga...",
        });

        const outputData = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
        const outputBlob = new Blob([new Uint8Array(outputData)], { type: "video/mp4" });

        // Cleanup
        try {
            await ffmpeg.deleteFile("video.mp4");
            await ffmpeg.deleteFile("output.mp4");
            if (hasSourceAudio) await ffmpeg.deleteFile("original.mp4");
            for (const audioTrackFile of audioTracks) {
                await ffmpeg.deleteFile(audioTrackFile.filename);
            }
        } catch { /* ignore cleanup errors */ }

        downloadBlob(outputBlob, `video-export-${width}x${height}.mp4`);

        setProgress({
            status: "complete",
            progress: 100,
            message: "¡Exportación con audio completada!",
        });
    } catch (ffmpegError) {
        // Catch-all for any FFmpeg/WASM/FS error — fall back to video-only download
        console.warn("FFmpeg audio processing failed, exporting video only:", ffmpegError);
        downloadBlob(videoBlob, `video-export-${width}x${height}.mp4`);
        setProgress({
            status: "complete",
            progress: 100,
            message: "¡Exportación completada (sin audio)!",
        });
    }
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

function canvasToBlobFast(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Error al convertir canvas a imagen"));
            },
            "image/jpeg",
            0.95
        );
    });
}

async function exportWithFFmpegGif(
    video: HTMLVideoElement,
    canvasHandle: VideoCanvasHandle,
    canvas: HTMLCanvasElement,
    duration: number,
    trimStart: number,
    fps: number,
    width: number,
    height: number,
    setProgress: (p: ExportProgress) => void,
    cancellation: CancellationToken
): Promise<void> {
    const ffmpeg = new FFmpeg();
    const totalFrames = Math.ceil(duration * fps);

    try {
        if (cancellation.cancelled) throw new Error("Exportación cancelada");

        setProgress({ status: "preparing", progress: 3, message: "Cargando motor de exportación GIF..." });

        const baseURL = `${window.location.origin}/ffmpeg`;

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            // sin workerURL — @ffmpeg/core es single-thread
        });

        setProgress({ status: "encoding", progress: 8, message: `Capturando ${totalFrames} frames...` });

        video.pause();
        video.currentTime = trimStart;
        await waitForVideoFrame(video);

        for (let i = 0; i < totalFrames; i++) {
            if (cancellation.cancelled) throw new Error("Exportación cancelada");

            // Video is already at the correct position (pre-seek or end of prev iteration)
            await canvasHandle.drawFrame();

            // Trigger next seek immediately after canvas capture to overlap with encode
            const nextI = i + 1;
            if (nextI < totalFrames) {
                video.currentTime = Math.min(trimStart + nextI / fps, trimStart + duration - 0.001);
            }

            // Encode current frame while next seek is in flight
            const blob = await canvasToBlobFast(canvas);
            const data = await blobToUint8Array(blob);
            await ffmpeg.writeFile(`frame${String(i).padStart(5, "0")}.jpg`, data);

            if (i % 10 === 0 || i === totalFrames - 1) {
                const progress = 8 + Math.round((i / totalFrames) * 50);
                setProgress({
                    status: "encoding",
                    progress,
                    message: `Capturando frame ${i + 1}/${totalFrames}...`,
                });
            }

            // Await next frame — partially decoded by now
            if (nextI < totalFrames) {
                await waitForVideoFrame(video);
            }
        }

        setProgress({ status: "finalizing", progress: 60, message: "Generando paleta de colores óptima..." });

        await ffmpeg.exec([
            "-f", "image2",
            "-framerate", String(fps),
            "-i", "frame%05d.jpg",
            "-vf", `scale=${width}:${height}:flags=lanczos,palettegen=stats_mode=diff:max_colors=256`,
            "palette.png",
        ]);

        if (cancellation.cancelled) throw new Error("Exportación cancelada");

        setProgress({ status: "finalizing", progress: 78, message: "Sintetizando GIF animado..." });

        await ffmpeg.exec([
            "-f", "image2",
            "-framerate", String(fps),
            "-i", "frame%05d.jpg",
            "-i", "palette.png",
            "-lavfi", `scale=${width}:${height}:flags=lanczos [scaled]; [scaled][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
            "output.gif",
        ]);

        setProgress({ status: "finalizing", progress: 94, message: "Descargando GIF..." });

        const gifData = (await ffmpeg.readFile("output.gif")) as Uint8Array;
        const gifBlob = new Blob([new Uint8Array(gifData)], { type: "image/gif" });
        downloadBlob(gifBlob, `animation-${width}x${height}.gif`);

        setProgress({ status: "complete", progress: 100, message: "¡GIF exportado exitosamente!" });

    } finally {
        if (ffmpeg.loaded) {
            try {
                await ffmpeg.deleteFile("output.gif");
                await ffmpeg.deleteFile("palette.png");
                for (let i = 0; i < totalFrames; i++) {
                    await ffmpeg.deleteFile(`frame${String(i).padStart(5, "0")}.jpg`);
                }
            } catch (e) {
                console.warn("Error limpiando archivos temporales de FFmpeg", e);
            }
        }
    }
}