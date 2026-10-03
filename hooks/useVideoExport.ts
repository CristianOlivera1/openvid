"use client";

import { useState, useCallback, RefObject, useRef } from "react";
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, StreamTarget, AudioBufferSource, Input, BlobSource, VideoSampleSink, type VideoSample, ALL_FORMATS } from "mediabunny";
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

function playExportCompleteChime() {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.1);
        gain2.gain.setValueAtTime(0.15, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.5);
    } catch { }
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

        let wakeLockSentinel: any = null;
        if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
            try {
                wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
            } catch { }
        }

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
            if (wakeLockSentinel) {
                await wakeLockSentinel.release().catch(() => { });
            }
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

async function mixAudioTracksToBuffer(
    duration: number,
    trimStart: number,
    speed: number,
    settings: ExportSettings,
    clips: VideoTrackClip[],
    clipBlobs?: Map<string, Blob>,
    clipAudioStates?: Record<string, boolean>,
): Promise<AudioBuffer | null> {
    try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return null;
        const decodeCtx = new AudioCtxClass();
        const sampleRate = 44100;
        const outputDuration = duration / speed;
        const totalSamples = Math.ceil(outputDuration * sampleRate);
        if (totalSamples <= 0) return null;

        const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
        let hasAnyAudio = false;

        const masterVolume = settings.masterVolume ?? 1;
        const hasMultipleClips = clips && clips.length > 1 && clipBlobs;
        const hasOriginalAudio = !settings.muteOriginalAudio && settings.videoHasAudioTrack !== false;

        // 1. Process Video Clip / Source Audio
        if (hasOriginalAudio) {
            if (hasMultipleClips && clipBlobs) {
                for (const clip of clips) {
                    if (clipAudioStates && clipAudioStates[clip.libraryVideoId] === false) continue;
                    const blob = clipBlobs.get(clip.libraryVideoId);
                    if (!blob) continue;
                    try {
                        const arrayBuffer = await blob.arrayBuffer();
                        const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
                        const sourceNode = offlineCtx.createBufferSource();
                        sourceNode.buffer = audioBuffer;
                        sourceNode.playbackRate.value = speed;

                        const gainNode = offlineCtx.createGain();
                        gainNode.gain.value = masterVolume;

                        sourceNode.connect(gainNode);
                        gainNode.connect(offlineCtx.destination);

                        const clipStartTimeline = (clip.startTime / speed);
                        const clipTrimStart = clip.trimStart || 0;
                        const clipDuration = (clip.trimEnd - clip.trimStart) / speed;

                        sourceNode.start(clipStartTimeline, clipTrimStart, clipDuration * speed);
                        hasAnyAudio = true;
                    } catch (e) {
                        console.warn("Could not decode clip audio via Web Audio API:", e);
                    }
                }
            } else if (settings.videoBlob && settings.videoBlob.size > 0) {
                try {
                    const arrayBuffer = await settings.videoBlob.arrayBuffer();
                    const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
                    const sourceNode = offlineCtx.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.playbackRate.value = speed;

                    const gainNode = offlineCtx.createGain();
                    gainNode.gain.value = masterVolume;

                    sourceNode.connect(gainNode);
                    gainNode.connect(offlineCtx.destination);

                    const sourceTrimStart = trimStart || 0;
                    sourceNode.start(0, sourceTrimStart, duration);
                    hasAnyAudio = true;
                } catch (e) {
                    console.warn("Could not decode source video audio via Web Audio API:", e);
                }
            }
        }

        // 2. Extra Timeline Audio Tracks
        if (settings.audioTracks && settings.audioTracks.length > 0) {
            for (const track of settings.audioTracks) {
                if (!track.audioUrl) continue;
                try {
                    const response = await fetch(track.audioUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
                    const sourceNode = offlineCtx.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.playbackRate.value = speed;

                    const gainNode = offlineCtx.createGain();
                    gainNode.gain.value = (track.volume ?? 1) * masterVolume;

                    sourceNode.connect(gainNode);
                    gainNode.connect(offlineCtx.destination);

                    const trackStartTimeline = (track.startTime / speed);
                    const trackTrimStart = track.trimStart ?? 0;
                    const trackDuration = track.duration;

                    sourceNode.start(trackStartTimeline, trackTrimStart, trackDuration);
                    hasAnyAudio = true;
                } catch (e) {
                    console.warn("Could not decode audio track:", e);
                }
            }
        }

        await decodeCtx.close().catch(() => {});

        if (!hasAnyAudio) return null;

        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
    } catch (e) {
        console.warn("Audio mixing with Web Audio API failed:", e);
        return null;
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
    if (cancellation.cancelled) throw new Error("Export cancelled");

    const speed = settings.speed && settings.speed > 0 ? settings.speed : 1;
    const outputDuration = duration / speed;
    const totalFrames = Math.ceil(outputDuration * fps);
    const frameDuration = 1 / fps;
    const clips = settings.videoClips || [];
    const clipBlobs = settings.videoClipBlobs;
    const hasMultipleClips = clips.length > 1 && !!clipBlobs;
    const sourceTrimStart = resolveClipTrimStart(clips, trimStart);

    setProgress({
        status: "encoding",
        progress: 2,
        message: "Initializing GPU hardware pipelines...",
    });

    // 1. Audio mixing directly in Web Audio (rendered in <50ms)
    let mixedAudioBuffer: AudioBuffer | null = null;
    try {
        mixedAudioBuffer = await mixAudioTracksToBuffer(
            duration,
            trimStart,
            speed,
            settings,
            clips,
            clipBlobs,
            settings.clipAudioStates
        );
    } catch (e) {
        console.warn("Audio mixing error:", e);
    }

    if (cancellation.cancelled) throw new Error("Export cancelled");

    // 2. Hardware Video Demuxer & Decoder Sinks (WebCodecs GPU zero-copy)
    let sourceBlob = settings.videoBlob;
    if (!sourceBlob && video.src && !hasMultipleClips) {
        try {
            const res = await fetch(video.src);
            sourceBlob = await res.blob();
        } catch (e) {
            console.warn("Could not fetch blob from video.src:", e);
        }
    }

    const sinks = new Map<string, { sink: VideoSampleSink; input: Input }>();
    if (!hasMultipleClips && sourceBlob && sourceBlob.size > 0) {
        try {
            const input = new Input({ source: new BlobSource(sourceBlob), formats: ALL_FORMATS });
            const tracks = await input.getVideoTracks();
            if (tracks.length > 0 && (await tracks[0].canDecode())) {
                const sink = new VideoSampleSink(tracks[0]);
                sinks.set("source", { sink, input });
            }
        } catch (e) {
            console.warn("WebCodecs VideoSampleSink initialization failed, falling back to video element:", e);
        }
    } else if (hasMultipleClips && clipBlobs) {
        for (const [id, blob] of clipBlobs.entries()) {
            try {
                const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
                const tracks = await input.getVideoTracks();
                if (tracks.length > 0 && (await tracks[0].canDecode())) {
                    const sink = new VideoSampleSink(tracks[0]);
                    sinks.set(id, { sink, input });
                }
            } catch (e) {
                console.warn(`WebCodecs sink init failed for clip ${id}:`, e);
            }
        }
    }

    // 3. Choose Target (Direct to disk or RAM buffer)
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
            latencyMode: "quality",
            keyFrameInterval: fps * 2,
            fullCodecString: "avc1.640033",
            hardwareAcceleration: acceleration,
        });
        passOutput.addVideoTrack(videoSource, { frameRate: fps });

        if (mixedAudioBuffer) {
            const audioSource = new AudioBufferSource({
                codec: "aac",
                bitrate: 192000,
            });
            passOutput.addAudioTrack(audioSource);
            await passOutput.start();
            await audioSource.add(mixedAudioBuffer);
        } else {
            await passOutput.start();
        }

        video.pause();
        let currentClipId: string | null = null;
        let currentClipBlobUrl: string | null = null;

        const loadClipBlob = async (blob: Blob): Promise<void> => {
            if (currentClipBlobUrl) URL.revokeObjectURL(currentClipBlobUrl);
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
            if (sinks.size === 0) {
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
            }

            const lockedWidth = canvas.width;
            const lockedHeight = canvas.height;

            // Stream generator for single source video with double-buffered GPU prefetching
            const sourceSinkObj = sinks.get("source");
            let singleSampleStream: AsyncGenerator<VideoSample | null, void, unknown> | null = null;
            let nextSamplePromise: Promise<IteratorResult<VideoSample | null, void>> | null = null;

            if (sourceSinkObj && !hasMultipleClips) {
                const timestamps = Array.from({ length: totalFrames }, (_, i) => {
                    const offset = Math.min((i / fps) * speed, duration - 0.001);
                    return sourceTrimStart + offset;
                });
                singleSampleStream = sourceSinkObj.sink.samplesAtTimestamps(timestamps);
                nextSamplePromise = singleSampleStream.next();
            }

            const startTime = performance.now();
            let lastProgressTime = 0;
            let smoothedFps = fps;

            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                if (cancellation.cancelled) {
                    await passOutput.cancel();
                    throw new Error("Export cancelled");
                }

                const outputTime = frameIndex / fps;
                const contentOffset = Math.min(outputTime * speed, duration - 0.001);
                const timelineTime = trimStart + contentOffset;

                let sample: VideoSample | null = null;
                let frameOverride: VideoFrame | undefined = undefined;

                if (nextSamplePromise) {
                    const nextItem = await nextSamplePromise;
                    sample = nextItem.done ? null : nextItem.value;
                    if (sample) {
                        frameOverride = sample.toVideoFrame();
                    }
                    if (singleSampleStream && frameIndex + 1 < totalFrames) {
                        nextSamplePromise = singleSampleStream.next();
                    } else {
                        nextSamplePromise = null;
                    }
                } else if (hasMultipleClips && clipBlobs) {
                    const activeClipInfo = getActiveClipAtTime(clips, timelineTime);
                    if (activeClipInfo) {
                        const { clip, clipTime } = activeClipInfo;
                        const clipSinkObj = sinks.get(clip.libraryVideoId);
                        if (clipSinkObj) {
                            sample = await clipSinkObj.sink.getSample(clipTime);
                            if (sample) {
                                frameOverride = sample.toVideoFrame();
                            }
                        } else {
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
                } else {
                    video.currentTime = sourceTrimStart + contentOffset;
                    await waitForVideoFrame(video);
                }

                if (canvas.width !== lockedWidth || canvas.height !== lockedHeight) {
                    canvas.width = lockedWidth;
                    canvas.height = lockedHeight;
                }

                await canvasHandle.drawFrame(true, timelineTime, frameOverride);

                if (frameOverride) {
                    frameOverride.close();
                }
                if (sample) {
                    sample.close();
                }

                await videoSource.add(outputTime, frameDuration);

                const now = performance.now();
                const elapsedSec = (now - startTime) / 1000;
                const framesDone = frameIndex + 1;
                const instantFps = elapsedSec > 0 ? framesDone / elapsedSec : fps;
                smoothedFps = smoothedFps * 0.85 + instantFps * 0.15;
                const speedMultiplier = Number((smoothedFps / fps).toFixed(1));
                const remainingFrames = totalFrames - framesDone;
                const etaSeconds = Math.max(0, Math.ceil(remainingFrames / Math.max(1, smoothedFps)));

                if (now - lastProgressTime > 120 || frameIndex === totalFrames - 1) {
                    lastProgressTime = now;
                    const progress = 5 + Math.round((frameIndex / totalFrames) * 90);
                    setProgress({
                        status: "encoding",
                        progress,
                        message: `Encoding frame ${framesDone}/${totalFrames} (${fps}fps)...`,
                        fpsCurrent: Math.round(smoothedFps),
                        speedMultiplier,
                        etaSeconds,
                        currentFrame: framesDone,
                        totalFrames,
                    });
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
    let usedDirectToDisk = isDirectToDisk;
    try {
        output = await runEncodingPass("prefer-hardware", target);
    } catch (error) {
        if (cancellation.cancelled) throw error;
        console.warn("Hardware encoding failed. Retrying with software encoding...", error);
        const retryTarget = new BufferTarget();
        usedDirectToDisk = false;
        output = await runEncodingPass("prefer-software", retryTarget);
    }

    if (cancellation.cancelled) throw new Error("Export cancelled");

    setProgress({
        status: "finalizing",
        progress: 96,
        message: "Finalizing MP4 file...",
    });
    await output.finalize();

    playExportCompleteChime();

    if (usedDirectToDisk) {
        setProgress({
            status: "complete",
            progress: 100,
            message: "Direct to disk export completed!",
        });
    } else {
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
            canvas.toBlob(b => b ? resolve(b) : reject(), "image/webp", 0.95)
        );
        const data = new Uint8Array(await blob.arrayBuffer());
        await ffmpeg.writeFile(`frame${String(i).padStart(5, "0")}.webp`, data);

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
            "-i", "frame%05d.webp",
            "-c:v", "libvpx",
            "-auto-alt-ref", "0",
            "-b:v", "2M",
            "-vf", "format=yuva420p",
            "output.webm",
        ]);
    } finally {
        try {
            for (let i = 0; i < totalFrames; i++) {
                await ffmpeg.deleteFile(`frame${String(i).padStart(5, "0")}.webp`);
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
