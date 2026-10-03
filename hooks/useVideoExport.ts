"use client";

import { useState, useCallback, RefObject, useRef } from "react";
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, StreamTarget } from "mediabunny";
import type { VideoCanvasHandle } from "@/types";
import type { ExportQuality, ExportSettings, ExportProgress } from "@/types";
import { QUALITY_SETTINGS, DEFAULT_EXPORT_FPS } from "@/lib/constants";
import { ensureVideoReady, waitForVideoFrame, downloadBlob } from "@/lib/video.utils";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { blobToUint8Array, buildAtempoChain, canvasToBlobFast, getActiveClipAtTime, resolveClipTrimStart } from "@/lib/ffmpeg.utils";
import type { VideoTrackClip } from "@/types/video-track.types";

export type { ExportQuality, ExportSettings, ExportProgress };

interface CancellationToken {
    cancelled: boolean;
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
        if (isExportingRef.current) {
            console.log("Export already in progress");
            return;
        }

        cancellationRef.current = { cancelled: false };
        isExportingRef.current = true;

        const video = videoRef.current;
        const canvasHandle = canvasRef.current;

        if (!video || !canvasHandle) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "No video available to export",
            });
            isExportingRef.current = false;
            return;
        }

        if (!video.duration || video.duration === Infinity || isNaN(video.duration)) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "Video is not loaded correctly",
            });
            isExportingRef.current = false;
            return;
        }

        const exportCanvas = canvasHandle.getExportCanvas();
        if (!exportCanvas) {
            setExportProgress({
                status: "error",
                progress: 0,
                message: "Failed to get the export canvas",
            });
            isExportingRef.current = false;
            return;
        }

        const qualitySettings = QUALITY_SETTINGS[settings.quality];
        const fps = settings.fps || qualitySettings.fps || DEFAULT_EXPORT_FPS;

        const originalTime = video.currentTime;
        const wasPlaying = !video.paused;
        const originalMuted = video.muted;
        const originalSrc = video.src;

        try {
            setExportProgress({
                status: "preparing",
                progress: 2,
                message: "Preparing video...",
            });

            await ensureVideoReady(video);

            if (cancellationRef.current.cancelled) {
                throw new Error("Export cancelled");
            }

            setExportProgress({
                status: "preparing",
                progress: 5,
                message: "Configuring export...",
            });

            const originalWidth = exportCanvas.width;
            const originalHeight = exportCanvas.height;
            const originalAspectRatio = originalWidth / originalHeight;
            const qualityAspectRatio = qualitySettings.width / qualitySettings.height;

            let targetWidth: number;
            let targetHeight: number;

            if (Math.abs(originalAspectRatio - qualityAspectRatio) < 0.01) {
                targetWidth = qualitySettings.width;
                targetHeight = qualitySettings.height;
            } else if (originalAspectRatio > qualityAspectRatio) {
                targetWidth = qualitySettings.width;
                targetHeight = Math.round(qualitySettings.width / originalAspectRatio);
            } else {
                targetHeight = qualitySettings.height;
                targetWidth = Math.round(qualitySettings.height * originalAspectRatio);
            }

            targetWidth = Math.round(targetWidth / 2) * 2;
            targetHeight = Math.round(targetHeight / 2) * 2;

            exportCanvas.width = targetWidth;
            exportCanvas.height = targetHeight;

            video.muted = true;

            const trimStart = settings.trim?.start ?? 0;
            const trimEnd = settings.trim?.end ?? video.duration;
            const exportDuration = trimEnd - trimStart;
            const speed = settings.speed && settings.speed > 0 ? settings.speed : 1;

            try {
                if (settings.quality === "gif") {
                    if (settings.videoClips && settings.videoClips.length > 1) {
                        throw new Error("La exportación a GIF con varios clips en el timeline aún no está soportada. Exporta como MP4 o une los clips primero.");
                    }
                    await exportWithFFmpegGif(
                        video, canvasHandle, exportCanvas, exportDuration, trimStart, fps,
                        targetWidth, targetHeight, setExportProgress, cancellationRef.current, speed,
                        settings.videoClips
                    );
                } else if (settings.quality === "webm-alpha" || settings.transparentBackground) {
                    if (settings.videoClips && settings.videoClips.length > 1) {
                        throw new Error("La exportación a WebM transparente con varios clips en el timeline aún no está soportada. Exporta como MP4 o une los clips primero.");
                    }
                    await exportWithFFmpegWebM(
                        video, canvasHandle, exportCanvas, exportDuration, trimStart, fps,
                        targetWidth, targetHeight, setExportProgress, cancellationRef.current, speed, settings
                    );
                } else {
                    const effectiveBitrate = settings.bitrate || qualitySettings.bitrate;
                    await exportWithMediabunnyAndAudio(
                        video,
                        canvasHandle,
                        exportCanvas,
                        exportDuration,
                        trimStart,
                        fps,
                        effectiveBitrate,
                        qualitySettings.width,
                        qualitySettings.height,
                        setExportProgress,
                        cancellationRef.current,
                        settings
                    );
                }
            } finally {
                exportCanvas.width = originalWidth;
                exportCanvas.height = originalHeight;

                if (video.src !== originalSrc) {
                    await new Promise<void>((resolve) => {
                        const onLoaded = () => {
                            video.removeEventListener("loadedmetadata", onLoaded);
                            resolve();
                        };
                        video.addEventListener("loadedmetadata", onLoaded, { once: true });
                        video.src = originalSrc;
                        setTimeout(resolve, 2000);
                    });
                }

                video.currentTime = originalTime;
                video.muted = originalMuted;

                if (wasPlaying) {
                    await video.play().catch(() => { });
                }
            }

        } catch (error) {
            if (cancellationRef.current.cancelled) {
                setExportProgress({
                    status: "idle",
                    progress: 0,
                    message: "",
                });
            } else {
                console.error("Error during export:", error);
                setExportProgress({
                    status: "error",
                    progress: 0,
                    message: error instanceof Error ? error.message : "Error during export",
                });
            }
        } finally {
            isExportingRef.current = false;
        }
    }, [videoRef, canvasRef]);

    const cancelExport = useCallback(() => {
        cancellationRef.current.cancelled = true;
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
    cancellation: CancellationToken,
    speed: number = 1,
    sourceTrimStart: number = trimStart,
): Promise<void> {
    if (cancellation.cancelled) {
        throw new Error("Export cancelled");
    }

    setProgress({
        status: "encoding",
        progress: 2,
        message: "Configuring output file...",
    });

    const outputDuration = duration / speed;
    const totalFrames = Math.ceil(outputDuration * fps);
    const frameDuration = 1 / fps;

    let target: StreamTarget | BufferTarget;
    let isDirectToDisk = false;
    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `openvid-${width}x${height}.mp4`,
            types: [{ description: 'Video MP4', accept: { 'video/mp4': ['.mp4'] } }],
        });
        const writableStream = await fileHandle.createWritable();
        target = new StreamTarget(writableStream);
        isDirectToDisk = true;
    } catch (error) {
        console.warn("Direct-to-disk canceled or not supported. Using BufferTarget (RAM).", error);
        target = new BufferTarget();
    }

    const runEncodingPass = async (
        acceleration: "prefer-hardware" | "prefer-software",
        passTarget: StreamTarget | BufferTarget,
    ): Promise<Output> => {
        const passOutput = new Output({
            format: new Mp4OutputFormat({ fastStart: "in-memory" }),
            target: passTarget,
        });
        const videoSource = new CanvasSource(canvas, {
            codec: "avc",
            bitrate: bitrate,
            bitrateMode: "variable",
            latencyMode: "realtime",
            keyFrameInterval: fps * 2,
            fullCodecString: "avc1.640033",
            hardwareAcceleration: acceleration,
        });
        passOutput.addVideoTrack(videoSource, { frameRate: fps });
        await passOutput.start();

        video.pause();
        video.currentTime = sourceTrimStart;
        await waitForVideoFrame(video);
        setProgress({ status: "encoding", progress: 10, message: `Starting encoding ${fps} fps...` });

        for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
            if (cancellation.cancelled) { await passOutput.cancel(); throw new Error("Export cancelled"); }
            const outputTime = frameIndex / fps;
            const contentOffset = Math.min(outputTime * speed, duration - 0.001);
            const timelineTime = trimStart + contentOffset;
            await canvasHandle.drawFrame(true, timelineTime);
            const nextIndex = frameIndex + 1;
            let nextFrameReady: Promise<void> | null = null;
            if (nextIndex < totalFrames) {
                const nextContentOffset = Math.min((nextIndex / fps) * speed, duration - 0.001);
                video.currentTime = sourceTrimStart + nextContentOffset;
                nextFrameReady = waitForVideoFrame(video);
            }

            await videoSource.add(outputTime, frameDuration);

            if (frameIndex % 10 === 0 || frameIndex === totalFrames - 1) {
                const progress = 10 + Math.round((frameIndex / totalFrames) * 80);
                setProgress({
                    status: "encoding",
                    progress,
                    message: `Encoding ${frameIndex + 1}/${totalFrames} frames (${fps}fps)...`,
                });
            }

            if (nextFrameReady) {
                await nextFrameReady;
            }
        }

        if (cancellation.cancelled) {
            await passOutput.cancel();
            throw new Error("Export cancelled");
        }

        return passOutput;
    };

    let output: Output;
    let usedDirectToDisk = isDirectToDisk;
    try {
        output = await runEncodingPass("prefer-hardware", target);
    } catch (error) {
        if (cancellation.cancelled) {
            throw error;
        }
        console.warn("Hardware-accelerated encoding failed. Retrying with software encoding.", error);
        const retryTarget = new BufferTarget();
        usedDirectToDisk = false;
        output = await runEncodingPass("prefer-software", retryTarget);
    }

    setProgress({
        status: "finalizing",
        progress: 92,
        message: "Finishing the coding...",
    });
    await output.finalize();

    if (usedDirectToDisk) {
        setProgress({
            status: "complete",
            progress: 100,
            message: "Direct to disk export completed!",
        });
    } else {
        setProgress({
            status: "finalizing",
            progress: 96,
            message: "Generating final file..."
        });
        const buffer = (output.target as BufferTarget).buffer;
        if (!buffer) throw new Error("Failed to generate the MP4 file");
        const blob = new Blob([buffer], { type: "video/mp4" });
        downloadBlob(blob, `openvid-${width}x${height}.mp4`);
        setProgress({
            status: "complete",
            progress: 100,
            message: "Export completed!",
        });
    }
}

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
    const sourceHasAudioStream = settings.videoHasAudioTrack !== false;
    const speed = settings.speed && settings.speed > 0 ? settings.speed : 1;
    const hasMultipleClips = settings.videoClips && settings.videoClips.length > 1 && settings.videoClipBlobs;
    const clips = settings.videoClips || [];
    const clipBlobs = settings.videoClipBlobs;
    const clipAudioStates = settings.clipAudioStates;
    const sourceTrimStart = resolveClipTrimStart(clips, trimStart);

    let hasPerClipAudio = true;
    if (clipAudioStates) {
        if (hasMultipleClips) {
            hasPerClipAudio = clips.some(clip => clipAudioStates[clip.libraryVideoId] !== false);
        } else if (clips.length > 0) {
            hasPerClipAudio = clipAudioStates[clips[0].libraryVideoId] !== false;
        }
    }

    const hasOriginalAudio = !settings.muteOriginalAudio && sourceHasAudioStream && hasPerClipAudio;
    const needsAudioMixing = hasAudioTracks || hasOriginalAudio;

    if (!needsAudioMixing && !hasMultipleClips) {
        return exportWithMediabunny(
            video, canvasHandle, canvas, duration, trimStart, fps, bitrate, width, height,
            setProgress, cancellation, speed, sourceTrimStart
        );
    }

    if (cancellation.cancelled) {
        throw new Error("Export cancelled");
    }

    let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
    if (needsAudioMixing) {
        ffmpegLoadPromise = (async () => {
            const ffmpegInstance = new FFmpeg();
            const baseURL = `${window.location.origin}/ffmpeg`;
            await ffmpegInstance.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
            return ffmpegInstance;
        })();
    }

    setProgress({
        status: "encoding",
        progress: 5,
        message: hasMultipleClips ? `Preparing multi-clip export...` : `Preparing export with audio...`,
    });

    const outputDuration = duration / speed;
    const totalFrames = Math.ceil(outputDuration * fps);
    const frameDuration = 1 / fps;

    const runEncodingPass = async (
        acceleration: "prefer-hardware" | "prefer-software",
    ): Promise<Output> => {
        const passOutput = new Output({
            format: new Mp4OutputFormat({ fastStart: "in-memory" }),
            target: new BufferTarget(),
        });
        const videoSource = new CanvasSource(canvas, {
            codec: "avc",
            bitrate: bitrate,
            bitrateMode: "variable",
            latencyMode: "realtime",
            keyFrameInterval: fps * 2,
            fullCodecString: "avc1.640033",
            hardwareAcceleration: acceleration,
        });
        passOutput.addVideoTrack(videoSource, { frameRate: fps });
        await passOutput.start();

        video.pause();
        let currentClipId: string | null = null;
        let currentClipBlobUrl: string | null = null;

        const loadClipBlob = async (blob: Blob): Promise<void> => {
            if (currentClipBlobUrl) {
                URL.revokeObjectURL(currentClipBlobUrl);
            }
            const blobUrl = URL.createObjectURL(blob);
            currentClipBlobUrl = blobUrl;
            video.pause();
            video.src = blobUrl;
            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = () => reject(new Error("Failed to load video"));
            });
        };

        try {
            if (hasMultipleClips && clips.length > 0) {
                const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
                const firstClip = sortedClips[0];
                if (firstClip && clipBlobs) {
                    const blob = clipBlobs.get(firstClip.libraryVideoId);
                    if (blob) {
                        await loadClipBlob(blob);
                        currentClipId = firstClip.id;
                    }
                }
                video.currentTime = clips[0]?.trimStart || 0;
            } else {
                video.currentTime = sourceTrimStart;
            }
            await waitForVideoFrame(video);

            const lockedWidth = canvas.width;
            const lockedHeight = canvas.height;

            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                if (cancellation.cancelled) throw new Error("Export cancelled");
                const outputTime = frameIndex / fps;
                const contentOffset = Math.min(outputTime * speed, duration - 0.001);
                const timelineTime = trimStart + contentOffset;

                if (hasMultipleClips && clipBlobs) {
                    const activeClipInfo = getActiveClipAtTime(clips, timelineTime);
                    if (activeClipInfo) {
                        const { clip, clipTime } = activeClipInfo;
                        if (clip.id !== currentClipId) {
                            const newBlob = clipBlobs.get(clip.libraryVideoId);
                            if (newBlob) {
                                await loadClipBlob(newBlob);
                                currentClipId = clip.id;
                            }
                        }
                        video.currentTime = clipTime;
                        await waitForVideoFrame(video);
                    }
                }

                if (canvas.width !== lockedWidth || canvas.height !== lockedHeight) {
                    canvas.width = lockedWidth;
                    canvas.height = lockedHeight;
                }

                await canvasHandle.drawFrame(true, timelineTime);

                let nextFrameReady: Promise<void> | null = null;
                if (!hasMultipleClips) {
                    const nextFrame = frameIndex + 1;
                    if (nextFrame < totalFrames) {
                        const nextContentOffset = Math.min((nextFrame / fps) * speed, duration - 0.001);
                        video.currentTime = sourceTrimStart + nextContentOffset;
                        nextFrameReady = waitForVideoFrame(video);
                    }
                }

                await videoSource.add(outputTime, frameDuration);

                if (frameIndex % 10 === 0 || frameIndex === totalFrames - 1) {
                    const progress = 5 + Math.round((frameIndex / totalFrames) * 50);
                    setProgress({
                        status: "encoding",
                        progress,
                        message: hasMultipleClips
                            ? `Encoding clips ${frameIndex + 1}/${totalFrames}...`
                            : `Encoding video ${frameIndex + 1}/${totalFrames}...`,
                    });
                }

                if (nextFrameReady) {
                    await nextFrameReady;
                }
            }
        } finally {
            if (currentClipBlobUrl) {
                URL.revokeObjectURL(currentClipBlobUrl);
                currentClipBlobUrl = null;
            }
        }

        return passOutput;
    };

    let output: Output;
    try {
        output = await runEncodingPass("prefer-hardware");
    } catch (error) {
        if (cancellation.cancelled) {
            throw error;
        }
        console.warn("Hardware-accelerated encoding failed mid-export. Retrying with software encoding.", error);
        output = await runEncodingPass("prefer-software");
    }

    if (cancellation.cancelled) throw new Error("Export cancelled");

    setProgress({
        status: "finalizing",
        progress: 56,
        message: "Finalizing video...",
    });
    await output.finalize();
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) throw new Error("Failed to generate the video file");
    const videoBlob = new Blob([buffer], { type: "video/mp4" });

    if (!needsAudioMixing) {
        downloadBlob(videoBlob, `openvid-${width}x${height}.mp4`);
        setProgress({ status: "complete", progress: 100, message: "Export complete!" });
        return;
    }

    const audioClips = (hasOriginalAudio && hasMultipleClips && clipBlobs)
        ? clips.filter(clip =>
            (!clipAudioStates || clipAudioStates[clip.libraryVideoId] !== false) &&
            clipBlobs.has(clip.libraryVideoId)
        )
        : [];

    const sourceBlob = (hasOriginalAudio && !hasMultipleClips) ? settings.videoBlob : undefined;
    const hasUsableSourceBlob = !!(sourceBlob && sourceBlob.size > 0);
    const hasUsableMultiClipAudio = audioClips.length > 0;
    const hasUsableAudioTracks = !!(settings.audioTracks && settings.audioTracks.some(t => t.audioUrl));

    if (!hasUsableSourceBlob && !hasUsableMultiClipAudio && !hasUsableAudioTracks) {
        downloadBlob(videoBlob, `openvid-${width}x${height}.mp4`);
        setProgress({ status: "complete", progress: 100, message: "Export complete!" });
        return;
    }

    try {
        setProgress({
            status: "finalizing",
            progress: 60,
            message: "Initializing audio engine...",
        });

        const ffmpeg = ffmpegLoadPromise ? await ffmpegLoadPromise : new FFmpeg();
        const videoData = new Uint8Array(await videoBlob.arrayBuffer());
        await ffmpeg.writeFile("video.mp4", videoData);

        let hasSourceAudio = false;
        const clipAudioFiles: { clip: (typeof clips)[0]; filename: string }[] = [];

        if (hasOriginalAudio && hasMultipleClips && audioClips.length > 0 && clipBlobs) {
            for (let i = 0; i < audioClips.length; i++) {
                const clip = audioClips[i];
                const blob = clipBlobs.get(clip.libraryVideoId);
                if (!blob) continue;
                const filename = `clip_audio_${i}.mp4`;
                try {
                    const clipData = new Uint8Array(await blob.arrayBuffer());
                    await ffmpeg.writeFile(filename, clipData);
                    try {
                        await ffmpeg.exec(["-i", filename, "-vn", "-t", "0.1", "-f", "null", "-"], 30000);
                        clipAudioFiles.push({ clip, filename });
                    } catch {
                        await ffmpeg.deleteFile(filename).catch(() => { });
                    }
                } catch (e) {
                    console.warn(`Could not load clip audio ${i}:`, e);
                }
            }
            hasSourceAudio = clipAudioFiles.length > 0;
        } else if (hasOriginalAudio && !hasMultipleClips && hasUsableSourceBlob) {
            try {
                const originalVideoData = new Uint8Array(await sourceBlob!.arrayBuffer());
                await ffmpeg.writeFile("original.mp4", originalVideoData);
                try {
                    await ffmpeg.exec(["-i", "original.mp4", "-vn", "-t", "0.1", "-f", "null", "-"], 30000);
                    hasSourceAudio = true;
                } catch {
                    hasSourceAudio = false;
                    await ffmpeg.deleteFile("original.mp4").catch(() => { });
                }
            } catch (e) {
                console.warn("Could not read video blob for audio:", e);
                hasSourceAudio = false;
            }
        }

        const audioTracks: { index: number; filename: string; track: NonNullable<typeof settings.audioTracks>[0]; audioData?: Uint8Array }[] = [];
        if (settings.audioTracks && settings.audioTracks.length > 0) {
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
                await ffmpeg.writeFile(result.filename, result.audioData!);
                audioTracks.push({ index: result.index, filename: result.filename, track: result.track });
            }
        }

        setProgress({
            status: "finalizing",
            progress: 70,
            message: "Mixing audio...",
        });

        const ffmpegArgs: string[] = ["-i", "video.mp4"];

        if (hasSourceAudio) {
            if (hasMultipleClips && clipAudioFiles.length > 0) {
                for (const { clip, filename } of clipAudioFiles) {
                    const clipTrimmedDuration = clip.trimEnd - clip.trimStart;
                    ffmpegArgs.push("-ss", String(clip.trimStart), "-t", String(clipTrimmedDuration), "-i", filename);
                }
            } else {
                ffmpegArgs.push("-ss", String(sourceTrimStart), "-t", String(duration), "-i", "original.mp4");
            }
        }

        for (const audioTrackFile of audioTracks) {
            ffmpegArgs.push("-i", audioTrackFile.filename);
        }

        const audioInputs: string[] = [];
        let filterComplex = "";
        let inputIndex = 1;
        const tempoChain = buildAtempoChain(speed);

        if (hasSourceAudio) {
            const volume = settings.masterVolume ?? 1;
            if (hasMultipleClips && clipAudioFiles.length > 0) {
                for (const { clip } of clipAudioFiles) {
                    const delayMs = Math.round((clip.startTime / speed) * 1000);
                    filterComplex += `[${inputIndex}:a]${tempoChain},adelay=${delayMs}|${delayMs},volume=${volume}[a${inputIndex}];`;
                    audioInputs.push(`[a${inputIndex}]`);
                    inputIndex++;
                }
            } else {
                filterComplex += `[${inputIndex}:a]${tempoChain},volume=${volume}[a${inputIndex}];`;
                audioInputs.push(`[a${inputIndex}]`);
                inputIndex++;
            }
        }

        for (const audioTrackFile of audioTracks) {
            const { track } = audioTrackFile;
            const trackVolume = track.volume * (settings.masterVolume ?? 1);
            const delayMs = Math.round((track.startTime / speed) * 1000);
            const audioTrimStart = track.trimStart ?? 0;
            const audioTrimEnd = audioTrimStart + track.duration;
            filterComplex += `[${inputIndex}:a]atrim=${audioTrimStart}:${audioTrimEnd},asetpts=PTS-STARTPTS,${tempoChain},adelay=${delayMs}|${delayMs},volume=${trackVolume}[a${inputIndex}];`;
            audioInputs.push(`[a${inputIndex}]`);
            inputIndex++;
        }

        const totalAudioInputs = audioInputs.length;

        if (totalAudioInputs === 0) {
            downloadBlob(videoBlob, `openvid-${width}x${height}.mp4`);
            setProgress({ status: "complete", progress: 100, message: "Export complete!" });
            return;
        } else if (audioInputs.length > 0) {
            filterComplex += `${audioInputs.join("")}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0:normalize=0,atrim=0:${outputDuration.toFixed(3)},asetpts=PTS-STARTPTS[aout]`;
            ffmpegArgs.push("-filter_complex", filterComplex);
            ffmpegArgs.push("-map", "0:v", "-map", "[aout]");
            ffmpegArgs.push(
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-threads", "0",
                "-t", outputDuration.toFixed(3),
                "output.mp4"
            );
        } else {
            ffmpegArgs.push("-c:v", "copy", "-an", "output.mp4");
        }

        let progressListener: ((e: { progress: number }) => void) | null = null;
        progressListener = ({ progress }) => {
            const p = (typeof progress === "number" && !isNaN(progress)) ? progress : 0;
            const mixProgress = 70 + Math.round(p * 25);
            setProgress({
                status: "finalizing",
                progress: Math.min(mixProgress, 95),
                message: p > 0 ? `Processing audio... ${Math.round(p * 100)}%` : "Mixing audio...",
            });
        };
        ffmpeg.on("progress", progressListener);

        const audioAbortController = new AbortController();
        const cancellationCheck = setInterval(() => {
            if (cancellation.cancelled) audioAbortController.abort();
        }, 500);

        try {
            await ffmpeg.exec(ffmpegArgs, 600000, { signal: audioAbortController.signal });
        } catch (e) {
            if (cancellation.cancelled) throw new Error("Export cancelled");
            console.error("FFmpeg audio mixing failed:", e);
            downloadBlob(videoBlob, `openvid-${width}x${height}.mp4`);
            setProgress({ status: "complete", progress: 100, message: "Export complete (without audio mixing)!" });
            return;
        } finally {
            clearInterval(cancellationCheck);
            if (progressListener) ffmpeg.off("progress", progressListener);
        }

        setProgress({ status: "finalizing", progress: 96, message: "Preparing download..." });

        const outputData = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
        const outputBlob = new Blob([new Uint8Array(outputData)], { type: "video/mp4" });

        downloadBlob(outputBlob, `openvid-${width}x${height}.mp4`);
        setProgress({ status: "complete", progress: 100, message: "Export with audio complete!" });

        (async () => {
            try {
                await ffmpeg.deleteFile("video.mp4");
                await ffmpeg.deleteFile("output.mp4");
                if (hasSourceAudio && !hasMultipleClips) await ffmpeg.deleteFile("original.mp4");
                for (const { filename } of clipAudioFiles) {
                    await ffmpeg.deleteFile(filename).catch(() => { });
                }
                for (const audioTrackFile of audioTracks) {
                    await ffmpeg.deleteFile(audioTrackFile.filename);
                }
            } catch { }
        })();
    } catch (ffmpegError) {
        if (cancellation.cancelled) throw new Error("Export cancelled");
        console.warn("FFmpeg audio processing failed, exporting video only:", ffmpegError);
        downloadBlob(videoBlob, `openvid-${width}x${height}.mp4`);
        setProgress({ status: "complete", progress: 100, message: "Export complete (without audio)!" });
    }
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
    cancellation: CancellationToken,
    speed: number = 1,
    videoClips?: VideoTrackClip[],
): Promise<void> {
    const ffmpeg = new FFmpeg();
    const outputDuration = duration / speed;
    const totalFrames = Math.ceil(outputDuration * fps);
    const sourceTrimStart = resolveClipTrimStart(videoClips, trimStart);
    try {
        if (cancellation.cancelled) throw new Error("Export cancelled");

        setProgress({ status: "preparing", progress: 3, message: "Loading GIF export engine..." });

        const baseURL = `${window.location.origin}/ffmpeg`;

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });

        setProgress({ status: "encoding", progress: 8, message: `Capturing ${totalFrames} frames...` });

        video.pause();
        video.currentTime = sourceTrimStart;
        await waitForVideoFrame(video);
        for (let i = 0; i < totalFrames; i++) {
            if (cancellation.cancelled) throw new Error("Export cancelled");
            const outputTime = i / fps;
            const contentOffset = Math.min(outputTime * speed, duration - 0.001);
            const timelineTime = trimStart + contentOffset;
            await canvasHandle.drawFrame(true, timelineTime);
            const nextI = i + 1;
            if (nextI < totalFrames) {
                const nextContentOffset = Math.min((nextI / fps) * speed, duration - 0.001);
                video.currentTime = sourceTrimStart + nextContentOffset;
            }

            const blob = await canvasToBlobFast(canvas);
            const data = await blobToUint8Array(blob);
            await ffmpeg.writeFile(`frame${String(i).padStart(5, "0")}.jpg`, data);

            if (i % 10 === 0 || i === totalFrames - 1) {
                const progress = 8 + Math.round((i / totalFrames) * 50);
                setProgress({
                    status: "encoding",
                    progress,
                    message: `Capturing frame ${i + 1}/${totalFrames}...`,
                });
            }

            if (nextI < totalFrames) {
                await waitForVideoFrame(video);
            }
        }

        setProgress({ status: "finalizing", progress: 60, message: "Generating optimal color palette..." });

        await ffmpeg.exec([
            "-f", "image2",
            "-framerate", String(fps),
            "-i", "frame%05d.jpg",
            "-vf", `scale=${width}:${height}:flags=lanczos,palettegen=stats_mode=diff:max_colors=256`,
            "palette.png",
        ]);

        if (cancellation.cancelled) throw new Error("Export cancelled");

        setProgress({ status: "finalizing", progress: 78, message: "Synthesizing animated GIF..." });

        await ffmpeg.exec([
            "-f", "image2",
            "-framerate", String(fps),
            "-i", "frame%05d.jpg",
            "-i", "palette.png",
            "-lavfi", `scale=${width}:${height}:flags=lanczos [scaled]; [scaled][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
            "output.gif",
        ]);

        setProgress({ status: "finalizing", progress: 94, message: "Downloading GIF..." });

        const gifData = (await ffmpeg.readFile("output.gif")) as Uint8Array;
        const gifBlob = new Blob([new Uint8Array(gifData)], { type: "image/gif" });
        downloadBlob(gifBlob, `openvid-${width}x${height}.gif`);

        setProgress({ status: "complete", progress: 100, message: "GIF exported successfully!" });

    } finally {
        if (ffmpeg.loaded) {
            try {
                await ffmpeg.deleteFile("output.gif");
                await ffmpeg.deleteFile("palette.png");
                for (let i = 0; i < totalFrames; i++) {
                    await ffmpeg.deleteFile(`frame${String(i).padStart(5, "0")}.jpg`);
                }
            } catch (e) {
                console.warn("Error cleaning up temporary FFmpeg files", e);
            }
        }
    }
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
    speed: number = 1,
    settings?: ExportSettings,
): Promise<void> {
    const ffmpeg = new FFmpeg();
    const outputDuration = duration / speed;
    const totalFrames = Math.ceil(outputDuration * fps);
    const sourceTrimStart = resolveClipTrimStart(settings?.videoClips, trimStart);
    setProgress({ status: "preparing", progress: 3, message: "Loading WebM engine..." });
    const ffmpegBase = `${window.location.origin}/ffmpeg`;
    await ffmpeg.load({
        coreURL: await toBlobURL(`${ffmpegBase}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${ffmpegBase}/ffmpeg-core.wasm`, "application/wasm"),
    });
    video.pause();
    video.currentTime = sourceTrimStart;
    await waitForVideoFrame(video);
    for (let i = 0; i < totalFrames; i++) {
        if (cancellation.cancelled) throw new Error("Export cancelled");
        const outputTime = i / fps;
        const contentOffset = Math.min(outputTime * speed, duration - 0.001);
        const timelineTime = trimStart + contentOffset;
        await canvasHandle.drawFrame(true, timelineTime);
        const nextI = i + 1;
        if (nextI < totalFrames) {
            const nextContentOffset = Math.min((nextI / fps) * speed, duration - 0.001);
            video.currentTime = sourceTrimStart + nextContentOffset;
        }

        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(b => b ? resolve(b) : reject(), "image/png")
        );
        const data = new Uint8Array(await blob.arrayBuffer());
        await ffmpeg.writeFile(`frame${String(i).padStart(5, "0")}.png`, data);

        if (i % 10 === 0 || i === totalFrames - 1) {
            setProgress({
                status: "encoding",
                progress: 8 + Math.round((i / totalFrames) * 60),
                message: `[Step 1/2] Saving frame ${i + 1} of ${totalFrames}...`,
            });
        }

        if (nextI < totalFrames) {
            await waitForVideoFrame(video);
        }
    }

    ffmpeg.on("progress", ({ progress }) => {
        if (progress > 0) {
            const encodingProgress = 70 + Math.round(progress * 20);
            setProgress({
                status: "finalizing",
                progress: Math.min(encodingProgress, 90),
                message: `[Step 2/2] Encoding VP8 with transparency...`,
            });
        }
    });

    setProgress({ status: "finalizing", progress: 70, message: "[Step 2/2] Starting VP8 encoding..." });

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
        try {
            for (let i = 0; i < totalFrames; i++) {
                await ffmpeg.deleteFile(`frame${String(i).padStart(5, "0")}.png`);
            }
        } catch { }
    }

    setProgress({ status: "finalizing", progress: 94, message: "Preparing download..." });

    const webmData = (await ffmpeg.readFile("output.webm")) as Uint8Array;
    const webmBlob = new Blob([new Uint8Array(webmData)], { type: "video/webm" });

    try { await ffmpeg.deleteFile("output.webm"); } catch { }

    downloadBlob(webmBlob, `openvid-${width}x${height}.webm`);

    setProgress({ status: "complete", progress: 100, message: "Transparent WebM exported!" });
}
