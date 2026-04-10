"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense, useMemo } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { loadVideoFromIndexedDB } from "@/hooks/useScreenRecording";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useVideoExport } from "@/hooks/useVideoExport";
import { useVideoThumbnails } from "@/hooks/useVideoThumbnails";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { clearAllThumbnailCache } from "@/lib/thumbnail-cache";
import type { ExportQuality, Tool, BackgroundTab, VideoCanvasHandle, BackgroundColorConfig, AspectRatio, CropArea, ZoomFragment, AudioTrack } from "@/types";
import type { TrimRange } from "@/types/timeline.types";
import type { MockupConfig } from "@/types/mockup.types";
import type { EditorState } from "@/types/editor-state.types";
//import type { CursorConfig, CursorRecordingData } from "@/types/cursor.types";
// import { DEFAULT_CURSOR_CONFIG, EMPTY_CURSOR_DATA } from "@/types/cursor.types";
import { createInitialEditorState } from "@/types/editor-state.types";
import { DEFAULT_MOCKUP_CONFIG, getMockupDefaultConfig } from "@/types/mockup.types";
import type { CanvasElement } from "@/types/canvas-elements.types";
import { MOCKUPS } from "@/lib/mockup-data";
import { gradientToCss, generateDefaultZoomFragments, createZoomFragment } from "@/types";
import "../../globals.css";
import { ToolsSidebar } from "@/app/components/ui/editor/ToolsSidebar";
import { MobileToolsMenu } from "@/app/components/ui/editor/MobileToolsMenu";
import { MobileControlPanel } from "@/app/components/ui/editor/MobileControlPanel";
import { EditorTopBar } from "@/app/components/ui/editor/EditorTopBar";
import { VideoCanvas } from "@/app/components/ui/editor/VideoCanvas";
import { PlayerControls } from "@/app/components/ui/editor/PlayerControls";
import { findValidFragmentPosition } from "@/app/components/ui/editor/ZoomFragmentTrackItem";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { TimelineSkeleton } from "@/app/components/ui/Skeleton";
import { AudioTrimModal } from "@/app/components/ui/editor/AudioTrimModal";
import { VIDEO_Z_INDEX } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { TooltipAction } from "@/components/ui/tooltip-action";

// Lazy load heavy components
const ControlPanel = lazy(() => import("@/app/components/ui/editor/ControlPanel").then(mod => ({ default: mod.ControlPanel })));
const Timeline = lazy(() => import("@/app/components/ui/editor/Timeline").then(mod => ({ default: mod.Timeline })));
const ExportOverlay = lazy(() => import("@/app/components/ui/ExportOverlay").then(mod => ({ default: mod.ExportOverlay })));
const VideoCropperModal = lazy(() => import("@/app/components/ui/editor/VideoCropperModal").then(mod => ({ default: mod.VideoCropperModal })));

async function detectVideoHasAudio(blob: Blob): Promise<boolean> {
    try {
        const url = URL.createObjectURL(blob);

        return new Promise<boolean>((resolve) => {
            const audioCtx = new AudioContext();
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                    let hasSignal = false;
                    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
                        const data = audioBuffer.getChannelData(ch);
                        for (let i = 0; i < Math.min(data.length, 10000); i++) {
                            if (Math.abs(data[i]) > 0.001) {
                                hasSignal = true;
                                break;
                            }
                        }
                        if (hasSignal) break;
                    }

                    await audioCtx.close();
                    URL.revokeObjectURL(url);
                    resolve(hasSignal);
                } catch {
                    await audioCtx.close();
                    URL.revokeObjectURL(url);
                    resolve(false);
                }
            };

            reader.onerror = () => {
                audioCtx.close();
                URL.revokeObjectURL(url);
                resolve(false);
            };

            reader.readAsArrayBuffer(blob);
        });
    } catch {
        return true; // en caso de error, asumir que tiene audio
    }
}

export default function Editor() {
    // Undo/Redo system - centralized state management
    const {
        state: editorState,
        setState: setEditorState,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
    } = useUndoRedo<EditorState>(createInitialEditorState());

    const [activeTool, setActiveTool] = useState<Tool>("screenshot");
    const [backgroundTab, setBackgroundTab] = useState<BackgroundTab>("wallpaper");
    const [selectedWallpaper, setSelectedWallpaper] = useState(0);
    const [backgroundBlur, setBackgroundBlur] = useState(0);
    const [padding, setPadding] = useState(10);
    const [roundedCorners, setRoundedCorners] = useState(10);
    const [shadows, setShadows] = useState(10);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobileControlPanelOpen, setIsMobileControlPanelOpen] = useState(false);

    // Video transform state (rotation and position)
    const [videoTransform, setVideoTransform] = useState<{ rotation: number; translateX: number; translateY: number }>({
        rotation: 0,
        translateX: 0,
        translateY: 0,
    });

    // Custom background images
    const [uploadedImages, setUploadedImages] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem("openvid-uploaded-images");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                } catch (error) {
                    console.error("Error loading uploaded images:", error);
                }
            }
        }
        return [];
    });
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
    const [unsplashBgUrl, setUnsplashBgUrl] = useState<string>("");

    // Background color/gradient state
    const [backgroundColorConfig, setBackgroundColorConfig] = useState<BackgroundColorConfig | null>(null);

    // Aspect ratio, fullscreen, and cropper state
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("auto");
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
    const [customDimensions, setCustomDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropArea, setCropArea] = useState<CropArea | undefined>(undefined);

    // Computed: which dimensions to use for the canvas
    const customAspectRatio = aspectRatio === "auto" ? videoDimensions : (aspectRatio === "custom" ? customDimensions : null);

    // Refs for fullscreen
    const editorAreaRef = useRef<HTMLDivElement>(null);

    // Video state
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<VideoCanvasHandle>(null);

    // Timeline state
    const [timelineZoom, setTimelineZoom] = useState<number>(1);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
    const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 0 });
    const animationFrameRef = useRef<number | null>(null);
    const justEndedRef = useRef<boolean>(false);
    const wasPlayingBeforeDragRef = useRef<boolean>(false);
    const isExportingRef = useRef(false);
    const [scrubTime, setScrubTime] = useState<number>(0);

    // Zoom fragments state
    const [zoomFragments, setZoomFragments] = useState<ZoomFragment[]>([]);
    const [selectedZoomFragmentId, setSelectedZoomFragmentId] = useState<string | null>(null);

    // Ref to always have the latest zoomFragments value (prevents stale closures)
    const zoomFragmentsRef = useRef<ZoomFragment[]>([]);
    useEffect(() => {
        zoomFragmentsRef.current = zoomFragments;
    }, [zoomFragments]);

    // Mockup state
    const [mockupId, setMockupId] = useState<string>("none");
    const [mockupConfig, setMockupConfig] = useState<MockupConfig>(DEFAULT_MOCKUP_CONFIG);

    // Canvas elements state
    const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    // Audio state
    const [uploadedAudios, setUploadedAudios] = useState<import("@/types/audio.types").UploadedAudio[]>([]);
    const [audioTracks, setAudioTracks] = useState<import("@/types/audio.types").AudioTrack[]>([]);
    const [muteOriginalAudio, setMuteOriginalAudio] = useState<boolean>(false);
    const [masterVolume, setMasterVolume] = useState<number>(1);
    const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null);

    // Cursor state
    // Cursor state
    // const [cursorConfig, setCursorConfig] = useState<CursorConfig>(DEFAULT_CURSOR_CONFIG);
    // const [cursorData, setCursorData] = useState<CursorRecordingData>(EMPTY_CURSOR_DATA);
    const [isRecordedVideo, setIsRecordedVideo] = useState<boolean>(false);

    // Audio trim modal state
    const [autoTrimModalOpen, setAutoTrimModalOpen] = useState(false);
    const [pendingAudioUpload, setPendingAudioUpload] = useState<{
        audio: import("@/types/audio.types").UploadedAudio;
        trackId: string;
    } | null>(null);

    // Audio playback refs - store HTML Audio elements for each track
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Initialize audio elements when tracks change
    useEffect(() => {
        const currentElements = audioElementsRef.current;
        const currentTrackIds = new Set(audioTracks.map(t => t.id));

        // Remove audio elements for deleted tracks
        for (const [trackId, audioEl] of currentElements.entries()) {
            if (!currentTrackIds.has(trackId)) {
                audioEl.pause();
                audioEl.src = '';
                currentElements.delete(trackId);
            }
        }

        // Create audio elements for new tracks
        for (const track of audioTracks) {
            if (!currentElements.has(track.id)) {
                const audio = uploadedAudios.find(a => a.id === track.audioId);
                if (audio) {
                    const audioEl = new Audio(audio.url);
                    audioEl.preload = 'auto';
                    audioEl.volume = track.volume * masterVolume;
                    currentElements.set(track.id, audioEl);
                }
            }
        }
    }, [audioTracks, uploadedAudios, masterVolume]);

    // Update audio volumes when master volume or track volumes change
    useEffect(() => {
        const currentElements = audioElementsRef.current;
        for (const track of audioTracks) {
            const audioEl = currentElements.get(track.id);
            if (audioEl) {
                audioEl.volume = track.volume * masterVolume;
            }
        }
    }, [audioTracks, masterVolume]);

    // Sync audio playback with video current time
    const syncAudioPlayback = useCallback((videoTime: number, playing: boolean) => {
        if (isExportingRef.current) return;
        const currentElements = audioElementsRef.current;

        for (const track of audioTracks) {
            const audioEl = currentElements.get(track.id);
            if (!audioEl) continue;

            const trackStart = track.startTime;
            const trackEnd = track.startTime + track.duration;
            const trimStart = track.trimStart ?? 0; // ← añadir esto

            if (videoTime >= trackStart && videoTime < trackEnd) {
                // El tiempo dentro del archivo de audio = trimStart + offset desde el inicio del track
                const audioTime = trimStart + (videoTime - trackStart); // ← antes era solo (videoTime - trackStart)

                if (Math.abs(audioEl.currentTime - audioTime) > 0.1) {
                    audioEl.currentTime = audioTime;
                }

                if (playing && audioEl.paused) {
                    audioEl.play().catch(() => { });
                } else if (!playing && !audioEl.paused) {
                    audioEl.pause();
                }
            } else {
                if (!audioEl.paused) {
                    audioEl.pause();
                }
            }
        }
    }, [audioTracks]);

    useEffect(() => {
        const elementsRef = audioElementsRef.current;
        return () => {
            for (const audioEl of elementsRef.values()) {
                audioEl.pause();
                audioEl.src = '';
            }
            elementsRef.clear();
        };
    }, []);

    const updateEditorStateDebounced = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (updateEditorStateDebounced.current) {
            clearTimeout(updateEditorStateDebounced.current);
        }
        updateEditorStateDebounced.current = setTimeout(() => {
            setEditorState({
                backgroundTab,
                selectedWallpaper,
                backgroundBlur,
                padding,
                roundedCorners,
                shadows,
                selectedImageUrl,
                backgroundColorConfig,
                aspectRatio,
                customDimensions,
                cropArea,
                trimRange,
                zoomFragments,
                mockupId,
                mockupConfig,
                canvasElements,
                audioTracks,
                muteOriginalAudio,
                masterVolume,
            });
        }, 300);
        return () => {
            if (updateEditorStateDebounced.current) {
                clearTimeout(updateEditorStateDebounced.current);
            }
        };
    }, [
        backgroundTab, selectedWallpaper, backgroundBlur, padding,
        roundedCorners, shadows, selectedImageUrl, backgroundColorConfig,
        aspectRatio, customDimensions, cropArea, trimRange,
        zoomFragments, mockupId, mockupConfig, canvasElements,
        audioTracks, muteOriginalAudio, masterVolume,
        setEditorState
    ]);

    // Sync editorState → individual states (from undo/redo)
    useEffect(() => {
        setBackgroundTab(editorState.backgroundTab);
        setSelectedWallpaper(editorState.selectedWallpaper);
        setBackgroundBlur(editorState.backgroundBlur);
        setPadding(editorState.padding);
        setRoundedCorners(editorState.roundedCorners);
        setShadows(editorState.shadows);
        setSelectedImageUrl(editorState.selectedImageUrl);
        setBackgroundColorConfig(editorState.backgroundColorConfig);
        setAspectRatio(editorState.aspectRatio);
        setCustomDimensions(editorState.customDimensions);
        setCropArea(editorState.cropArea);
        setTrimRange(editorState.trimRange);
        setZoomFragments(editorState.zoomFragments);
        setMockupId(editorState.mockupId);
        setMockupConfig(editorState.mockupConfig);
        setCanvasElements(editorState.canvasElements);
        setAudioTracks(editorState.audioTracks);
        setMuteOriginalAudio(editorState.muteOriginalAudio);
        setMasterVolume(editorState.masterVolume);
    }, [editorState]);

    // Handler para cambiar el mockup
    const handleMockupChange = useCallback((newMockupId: string) => {
        setMockupId(newMockupId);
        // Establecer la config por defecto del nuevo mockup
        const newMockup = MOCKUPS.find(m => m.id === newMockupId);
        setMockupConfig(getMockupDefaultConfig(newMockup));
    }, []);

    // Handler para cambiar la configuración del mockup
    const handleMockupConfigChange = useCallback((updates: Partial<MockupConfig>) => {
        setMockupConfig(prev => ({ ...prev, ...updates }));
    }, []);

    // Handler para cambiar las esquinas redondeadas (sincroniza ambos valores)
    const handleRoundedCornersChange = useCallback((value: number) => {
        setRoundedCorners(value); // Para NoneMockup y canvas general
        setMockupConfig(prev => ({ ...prev, cornerRadius: value })); // Para mockups que usan config
    }, []);

    // Canvas elements handlers
    const addCanvasElement = useCallback((element: CanvasElement) => {
        setCanvasElements(prev => [...prev, element]);
        setSelectedElementId(element.id);
    }, []);

    const updateCanvasElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
        setCanvasElements(prev => prev.map(el =>
            el.id === id ? { ...el, ...updates } as CanvasElement : el
        ));
    }, []);

    const deleteCanvasElement = useCallback((id: string) => {
        setCanvasElements(prev => prev.filter(el => el.id !== id));
        setSelectedElementId(prev => prev === id ? null : prev);
    }, []);

    const selectCanvasElement = useCallback((id: string | null) => {
        setSelectedElementId(id);
        // Auto-open elements menu when selecting an element
        if (id) {
            setActiveTool("elements");
        }
    }, []);


    // Copy/paste handlers
    const [copiedElement, setCopiedElement] = useState<CanvasElement | null>(null);

    const copySelectedElement = useCallback(() => {
        if (!selectedElementId) return;
        const element = canvasElements.find(el => el.id === selectedElementId);
        if (element) {
            setCopiedElement(element);
        }
    }, [selectedElementId, canvasElements]);

    const pasteElement = useCallback(() => {
        if (!copiedElement) return;

        const newElement = {
            ...copiedElement,
            id: `${copiedElement.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: copiedElement.x + 5, // Offset slightly from original
            y: copiedElement.y + 5,
            zIndex: Date.now(),
        } as CanvasElement;

        setCanvasElements(prev => [...prev, newElement]);
        setSelectedElementId(newElement.id);
        setActiveTool("elements");
    }, [copiedElement]);

    const bringToFront = useCallback((id: string) => {
        // Get elements that are above the video (zIndex >= VIDEO_Z_INDEX)
        const aboveVideoElements = canvasElements.filter(el => el.zIndex >= VIDEO_Z_INDEX);
        const maxAboveVideo = aboveVideoElements.length > 0
            ? Math.max(...aboveVideoElements.map(el => el.zIndex))
            : VIDEO_Z_INDEX - 1;
        // Ensure the element goes above video and all other above-video elements
        updateCanvasElement(id, { zIndex: Math.max(maxAboveVideo + 1, VIDEO_Z_INDEX) });
    }, [canvasElements, updateCanvasElement]);

    const sendToBack = useCallback((id: string) => {
        const element = canvasElements.find(el => el.id === id);
        if (!element) return;

        // If element is above video (zIndex >= VIDEO_Z_INDEX), send it just behind video
        if (element.zIndex >= VIDEO_Z_INDEX) {
            const behindVideoElements = canvasElements.filter(el => el.zIndex < VIDEO_Z_INDEX);
            const minBehindVideo = behindVideoElements.length > 0
                ? Math.min(...behindVideoElements.map(el => el.zIndex))
                : VIDEO_Z_INDEX - 100;
            updateCanvasElement(id, { zIndex: Math.min(minBehindVideo - 1, VIDEO_Z_INDEX - 1) });
        } else {
            // If already behind video, send further back
            const behindVideoElements = canvasElements.filter(el => el.zIndex < VIDEO_Z_INDEX && el.id !== id);
            const minBehindVideo = behindVideoElements.length > 0
                ? Math.min(...behindVideoElements.map(el => el.zIndex))
                : element.zIndex;
            updateCanvasElement(id, { zIndex: minBehindVideo - 1 });
        }
    }, [canvasElements, updateCanvasElement]);

    // Audio handlers
    const handleAudioUpload = useCallback(async (file: File) => {
        try {
            // Check max tracks limit first
            const MAX_AUDIO_TRACKS = 5;
            if (audioTracks.length >= MAX_AUDIO_TRACKS) {
                alert(`Máximo ${MAX_AUDIO_TRACKS} pistas de audio permitidas.`);
                return;
            }

            // Create blob URL
            const url = URL.createObjectURL(file);

            // Load audio to get duration
            const audio = new Audio(url);
            await new Promise<void>((resolve, reject) => {
                audio.addEventListener('loadedmetadata', () => resolve());
                audio.addEventListener('error', () => reject(new Error('Failed to load audio')));
            });

            const newAudio: import("@/types/audio.types").UploadedAudio = {
                id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: file.name,
                url,
                duration: audio.duration,
                fileSize: file.size,
                mimeType: file.type,
            };

            setUploadedAudios(prev => [...prev, newAudio]);

            // Automatically add to timeline
            const lastTrackEnd = audioTracks.reduce((max, track) =>
                Math.max(max, track.startTime + track.duration), 0);

            const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Check if audio exceeds video duration
            if (audio.duration > videoDuration) {
                // Show trim modal automatically
                setPendingAudioUpload({ audio: newAudio, trackId });
                setAutoTrimModalOpen(true);
            } else {
                // Add track normally
                const newTrack: import("@/types/audio.types").AudioTrack = {
                    id: trackId,
                    audioId: newAudio.id,
                    name: newAudio.name,
                    startTime: lastTrackEnd,
                    duration: newAudio.duration,
                    volume: 1,
                    loop: false,
                };

                setAudioTracks(prev => [...prev, newTrack]);

                // Auto-mute original audio when first track is added
                if (audioTracks.length === 0) {
                    setMuteOriginalAudio(true);
                }
            }
        } catch (error) {
            console.error('Error uploading audio:', error);
            alert('Error al subir el audio. Por favor intenta de nuevo.');
        }
    }, [audioTracks, videoDuration]);

    const handleAudioDelete = useCallback((audioId: string) => {
        // Remove from uploaded audios
        setUploadedAudios(prev => {
            const audio = prev.find(a => a.id === audioId);
            if (audio) {
                URL.revokeObjectURL(audio.url); // Clean up blob URL
            }
            return prev.filter(a => a.id !== audioId);
        });

        // Remove all tracks using this audio
        setAudioTracks(prev => prev.filter(track => track.audioId !== audioId));
    }, []);

    const handleAddAudioTrack = useCallback((audioId: string) => {
        const audio = uploadedAudios.find(a => a.id === audioId);
        if (!audio) return;

        // Check max tracks limit
        const MAX_AUDIO_TRACKS = 5;
        if (audioTracks.length >= MAX_AUDIO_TRACKS) {
            alert(`Máximo ${MAX_AUDIO_TRACKS} pistas de audio permitidas.`);
            return;
        }

        // Check if already in timeline
        if (audioTracks.some(track => track.audioId === audioId)) {
            return;
        }

        // Calculate startTime as end of last track to prevent overlapping
        const lastTrackEnd = audioTracks.reduce((max, track) =>
            Math.max(max, track.startTime + track.duration), 0);

        const newTrack: import("@/types/audio.types").AudioTrack = {
            id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            audioId,
            name: audio.name,
            startTime: lastTrackEnd,
            duration: audio.duration,
            volume: 1,
            loop: false,
        };

        setAudioTracks(prev => [...prev, newTrack]);
        if (audioTracks.length === 0) {
            setMuteOriginalAudio(true);
        }
    }, [uploadedAudios, audioTracks]);

    const handleUpdateAudioTrack = useCallback((trackId: string, updates: Partial<import("@/types/audio.types").AudioTrack>) => {
        setAudioTracks(prev => prev.map(track =>
            track.id === trackId ? { ...track, ...updates } : track
        ));
    }, []);

    const handleDeleteAudioTrack = useCallback((trackId: string) => {
        setAudioTracks(prev => {
            const remaining = prev.filter(track => track.id !== trackId);
            if (remaining.length === 0) {
                setMuteOriginalAudio(false);
            }
            return remaining;
        });
    }, []);

    const handleToggleMuteOriginalAudio = useCallback(() => {
        setMuteOriginalAudio(prev => !prev);
    }, []);

    const handleMasterVolumeChange = useCallback((volume: number) => {
        setMasterVolume(volume);
    }, []);

    // Cursor config change handler
    /* const handleCursorConfigChange = useCallback((config: Partial<CursorConfig>) => {
        setCursorConfig(prev => ({ ...prev, ...config }));
    }, []);*/

    const handleSelectAudioTrack = useCallback((trackId: string | null) => {
        setSelectedAudioTrackId(trackId);
        // Clear zoom fragment selection when selecting audio track
        if (trackId) {
            setSelectedZoomFragmentId(null);
            // Activate audio tool in sidebar
            setActiveTool("audio");
        }
    }, []);

    // Genere Thumbnails de alta calidad y su generacion de intervalo corto para que el scrubbing se sienta instantáneo
    const { getThumbnailForTime } = useVideoThumbnails(
        videoUrl,
        videoDuration,
        {
            interval: 0.1,
            quality: "high",
            videoId: videoId || undefined,
        }
    );

    const { exportVideo, cancelExport, exportProgress } = useVideoExport(videoRef, canvasRef);
    const { uploadVideo, loadUploadedVideo, clearUploadedVideo, isUploading } = useVideoUpload();
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

    const handleExport = (quality: ExportQuality) => {
        isExportingRef.current = true;
        for (const audioEl of audioElementsRef.current.values()) {
            audioEl.pause();
        }

        exportVideo({
            quality,
            videoBlob: videoBlob ?? undefined,
            transparentBackground: selectedWallpaper === -1,
            trim: trimRange.end > trimRange.start ? { start: trimRange.start, end: trimRange.end } : undefined,
            muteOriginalAudio,
            audioTracks: audioTracks.map(track => {
                const audio = uploadedAudios.find(a => a.id === track.audioId);
                return {
                    audioUrl: audio?.url || '',
                    startTime: track.startTime,
                    duration: track.duration,
                    trimStart: track.trimStart ?? 0,
                    volume: track.volume,
                    loop: track.loop,
                };
            }),
            masterVolume,
        }).finally(() => {
        });
    };
    const [videoHasAudioTrack, setVideoHasAudioTrack] = useState<boolean>(true);

    // Handler para subir video
    const handleVideoUpload = useCallback(async (file: File) => {
        setVideoBlob(file);
        detectVideoHasAudio(file).then(hasAudio => {
            setVideoHasAudioTrack(hasAudio);
            if (!hasAudio) setMuteOriginalAudio(true);
        });
        try {
            // Clear thumbnail cache only (don't delete recorded videos to avoid DB corruption)
            await clearAllThumbnailCache();
        } catch (error) {
            console.warn("Failed to clear thumbnails:", error);
        }

        const uploadedData = await uploadVideo(file);
        if (uploadedData) {
            // Update ref to track this as the current video
            lastLoadedVideoIdRef.current = uploadedData.videoId;

            setVideoUrl(uploadedData.url);
            setVideoId(uploadedData.videoId);
            setVideoDuration(uploadedData.duration);
            setTrimRange({ start: 0, end: uploadedData.duration });
            setAspectRatio(uploadedData.aspectRatio);

            // Always store the actual video dimensions
            setVideoDimensions({ width: uploadedData.width, height: uploadedData.height });

            const defaultFragments = generateDefaultZoomFragments(uploadedData.duration);
            setZoomFragments(defaultFragments);

            // Reset playback state
            setCurrentTime(0);
            setIsPlaying(false);

            // Clear undo/redo history when uploading a new video (longer timeout to ensure all states sync)
            setTimeout(() => clearHistory(), 200);
        }
    }, [uploadVideo, clearHistory]);

    // Handler para eliminar el video cargado
    const handleDeleteVideo = useCallback(async () => {
        const confirmed = window.confirm("¿Estás seguro de que quieres eliminar el video cargado? Esta acción no se puede deshacer.");
        if (!confirmed) return;

        try {
            // Liberar el ObjectURL anterior si existe
            if (videoUrl) {
                try { URL.revokeObjectURL(videoUrl); } catch { /* noop */ }
            }

            // Borrar de IndexedDB
            await clearUploadedVideo();

            // Limpiar cache de thumbnails
            try { await clearAllThumbnailCache(); } catch { /* noop */ }

            // Resetear estado del editor
            lastLoadedVideoIdRef.current = null;
            setVideoBlob(null);
            setVideoUrl(null);
            setVideoId(null);
            setVideoDuration(0);
            setTrimRange({ start: 0, end: 0 });
            setCurrentTime(0);
            setIsPlaying(false);
            setZoomFragments([]);
            setVideoDimensions({ width: 0, height: 0 });

            setTimeout(() => clearHistory(), 200);
        } catch (error) {
            console.error("Error deleting video:", error);
        }
    }, [videoUrl, clearUploadedVideo, clearHistory]);

    // Track last loaded video to detect changes
    const lastLoadedVideoIdRef = useRef<string | null>(null);

    useEffect(() => {
        const loadVideo = async () => {
            try {
                // Load both videos and compare timestamps to get the most recent
                const [uploadedData, recordedData] = await Promise.all([
                    loadUploadedVideo(),
                    loadVideoFromIndexedDB()
                ]);

                // Determine which video is more recent
                let videoToLoad: typeof uploadedData | typeof recordedData = null;

                if (uploadedData && recordedData) {
                    // Both exist - load the most recent one based on timestamp
                    videoToLoad = uploadedData.timestamp > recordedData.timestamp ? uploadedData : recordedData;
                } else if (uploadedData) {
                    videoToLoad = uploadedData;
                } else if (recordedData) {
                    videoToLoad = recordedData;
                }

                // Load the selected video
                if (videoToLoad) {
                    // Only reload if this is a different video
                    if (lastLoadedVideoIdRef.current !== videoToLoad.videoId) {
                        lastLoadedVideoIdRef.current = videoToLoad.videoId;

                        setVideoUrl(videoToLoad.url);
                        setVideoId(videoToLoad.videoId);
                        setVideoDuration(videoToLoad.duration);
                        setTrimRange({ start: 0, end: videoToLoad.duration });
                        const defaultFragments = generateDefaultZoomFragments(videoToLoad.duration);
                        setZoomFragments(defaultFragments);

                        // Set aspect ratio and dimensions for uploaded videos
                        if ('aspectRatio' in videoToLoad) {
                            setAspectRatio(videoToLoad.aspectRatio || "auto");
                            if (videoToLoad.width && videoToLoad.height) {
                                setVideoDimensions({ width: videoToLoad.width, height: videoToLoad.height });
                            }
                        }

                        // Set blob for recorded videos
                        if ('blob' in videoToLoad && videoToLoad.blob && videoToLoad.blob.size > 0) {
                            setVideoBlob(videoToLoad.blob);
                            detectVideoHasAudio(videoToLoad.blob).then(hasAudio => {
                                setVideoHasAudioTrack(hasAudio);
                                if (!hasAudio) setMuteOriginalAudio(true);
                            });
                        }

                        // Load cursor data if available (only for recorded videos)
                        if ('isRecordedVideo' in videoToLoad && videoToLoad.isRecordedVideo) {
                            setIsRecordedVideo(true);
                            /*if ('cursorData' in videoToLoad && videoToLoad.cursorData) {
                                setCursorData(videoToLoad.cursorData);
                            } else {
                                setCursorData(EMPTY_CURSOR_DATA);
                            }*/
                        } else {
                            // Uploaded video - no cursor data
                            setIsRecordedVideo(false);
                            //setCursorData(EMPTY_CURSOR_DATA);
                        }

                        // Clear undo/redo history when loading a new video
                        // Use longer timeout to ensure all state updates complete first
                        setTimeout(() => {
                            clearHistory();
                        }, 200);
                    }
                }

            } catch (error) {
                console.error("Error loading video:", error);
            }
        };

        loadVideo();

        // Re-check when page becomes visible (user navigates back or uploads new video)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadVideo();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [loadUploadedVideo, clearHistory]);

    useEffect(() => {
        if (uploadedImages.length > 0) {
            localStorage.setItem("openvid-uploaded-images", JSON.stringify(uploadedImages));
        }
    }, [uploadedImages]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = muteOriginalAudio;
        }
    }, [muteOriginalAudio]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if any input field is focused
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Don't trigger shortcuts if typing in an input
            if (isInputFocused) return;

            // Ctrl+Z or Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) {
                    undo();
                }
            }

            // Ctrl+Y or Cmd+Y for redo (Windows)
            // Ctrl+Shift+Z or Cmd+Shift+Z for redo (Mac)
            if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                if (canRedo) {
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    const togglePlayPause = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                // Pause all audio tracks
                syncAudioPlayback(videoRef.current.currentTime, false);
            } else {
                // When playing, ensure we start from within trim range
                if (trimRange.end > 0) {
                    const currentVideoTime = videoRef.current.currentTime;
                    // If outside trim range or at the end, jump to trim start
                    if (currentVideoTime < trimRange.start || currentVideoTime >= trimRange.end) {
                        videoRef.current.currentTime = trimRange.start;
                        setCurrentTime(trimRange.start);
                    }
                }
                videoRef.current.play();
                // Start audio playback synced with video
                syncAudioPlayback(videoRef.current.currentTime, true);
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying, trimRange.start, trimRange.end, syncAudioPlayback]);

    // Smooth time update using requestAnimationFrame
    const updateTimeSmoothRef = useRef<() => void>(() => { });

    useEffect(() => {
        updateTimeSmoothRef.current = () => {
            // Skip update if video just ended (prevents jump to 0)
            if (justEndedRef.current) return;

            if (videoRef.current && !isDraggingPlayhead) {
                const currentVideoTime = videoRef.current.currentTime;

                // Check if we've reached the trim end point
                if (trimRange.end > 0 && currentVideoTime >= trimRange.end) {
                    videoRef.current.pause();
                    // Stop all audio tracks
                    syncAudioPlayback(currentVideoTime, false);
                    setIsPlaying(false);
                    justEndedRef.current = true;
                    setCurrentTime(trimRange.end);
                    // Don't modify videoRef.currentTime to avoid visual jump
                    setTimeout(() => { justEndedRef.current = false; }, 300);
                    return;
                }

                setCurrentTime(currentVideoTime);
                // Sync audio playback with current video time
                syncAudioPlayback(currentVideoTime, true);
            }
            if (isPlaying && !isDraggingPlayhead) {
                animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
            }
        };
    }, [isPlaying, isDraggingPlayhead, trimRange.end, syncAudioPlayback]);

    // Start/stop animation frame loop based on playing state
    useEffect(() => {
        if (isPlaying && !isDraggingPlayhead) {
            animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, isDraggingPlayhead]);

    const handleTimeUpdate = () => {
        // Only update if not using animation frame (fallback for paused state)
        // Ignore updates right after video ended to prevent reset to 0
        if (videoRef.current && !isPlaying && !justEndedRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handlePlayheadDragStart = useCallback(() => {
        setIsDraggingPlayhead(true);
        // Pause video during scrubbing for smoother experience
        if (videoRef.current && !videoRef.current.paused) {
            wasPlayingBeforeDragRef.current = true;
            videoRef.current.pause();
        } else {
            wasPlayingBeforeDragRef.current = false;
        }
    }, []);

    const handlePlayheadDragEnd = useCallback(() => {
        setIsDraggingPlayhead(false);

        if (videoRef.current) {
            videoRef.current.currentTime = scrubTime;
        }

        if (wasPlayingBeforeDragRef.current && videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
            // Resume audio playback after drag ends
            syncAudioPlayback(scrubTime, true);
        } else {
            // Sync audio to new position (paused)
            syncAudioPlayback(scrubTime, false);
        }
    }, [scrubTime, syncAudioPlayback]);

    const handleZoomChange = useCallback((zoom: number) => {
        setTimelineZoom(zoom);
    }, []);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;
            if (isFinite(duration) && duration > 0) {
                setVideoDuration(duration);
                setTrimRange(prev => prev.end === 0 ? { start: 0, end: duration } : prev);
            }
        }
    };

    const skipBackward = useCallback(() => {
        if (videoRef.current) {
            const newTime = Math.max(trimRange.start, videoRef.current.currentTime - 5);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            syncAudioPlayback(newTime, isPlaying);
        }
    }, [trimRange.start, isPlaying, syncAudioPlayback]);

    const skipForward = useCallback(() => {
        if (videoRef.current) {
            const newTime = Math.min(trimRange.end, videoRef.current.currentTime + 5);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            syncAudioPlayback(newTime, isPlaying);

            if (newTime >= trimRange.end) {
                videoRef.current.pause();
                setIsPlaying(false);
                syncAudioPlayback(newTime, false);
            }
        }
    }, [trimRange.end, isPlaying, syncAudioPlayback]);

    const handleSeek = useCallback((time: number) => {
        setScrubTime(time);
        setCurrentTime(time);

        if (videoRef.current && !isDraggingPlayhead) {
            if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
                videoRef.current.fastSeek(time);
            } else {
                videoRef.current.currentTime = time;
            }
            // Sync audio to new seek position
            syncAudioPlayback(time, isPlaying);
        }
    }, [isDraggingPlayhead, isPlaying, syncAudioPlayback]);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setUploadedImages(prev => [dataUrl, ...prev]);
                setSelectedImageUrl(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageSelect = (url: string) => {
        if (backgroundTab === "wallpaper") {
            // Unsplash image selected from wallpaper tab — show without switching tabs
            setUnsplashBgUrl(url);
        } else {
            setSelectedImageUrl(url);
        }
    };

    const handleWallpaperSelect = (index: number) => {
        setSelectedWallpaper(index);
        setUnsplashBgUrl(""); // Clear Unsplash override when selecting a regular wallpaper
    };

    const handleImageRemove = (url: string) => {
        setUploadedImages(prev => prev.filter(img => img !== url));
        if (selectedImageUrl === url) {
            setSelectedImageUrl("");
        }
    };

    // Background tab change handler
    const handleBackgroundTabChange = (tab: BackgroundTab) => {
        setBackgroundTab(tab);
    };

    // Handler para cambio de color/gradiente
    const handleBackgroundColorChange = (config: BackgroundColorConfig) => {
        setBackgroundColorConfig(config);
    };

    // Zoom fragment handlers
    const handleSelectZoomFragment = useCallback((fragmentId: string | null) => {
        setSelectedZoomFragmentId(fragmentId);
        // Clear audio track selection when selecting zoom fragment
        if (fragmentId) {
            setSelectedAudioTrackId(null);
        }
    }, []);

    const handleActivateZoomTool = useCallback(() => {
        setActiveTool("zoom");
    }, []);

    // Default duration for new zoom fragments
    const DEFAULT_ZOOM_FRAGMENT_DURATION = 2;

    const handleAddZoomFragment = useCallback((startTime: number) => {
        // Find valid position avoiding overlaps - use ref to get latest fragments
        const validPosition = findValidFragmentPosition(
            startTime,
            DEFAULT_ZOOM_FRAGMENT_DURATION,
            zoomFragmentsRef.current,
            videoDuration
        );

        if (!validPosition) {
            // No space available - could show a toast/notification
            console.warn("No space available for new zoom fragment");
            return;
        }

        const newFragment = createZoomFragment(validPosition.startTime, validPosition.endTime);
        setZoomFragments(prev => [...prev, newFragment].sort((a, b) => a.startTime - b.startTime));
        setSelectedZoomFragmentId(newFragment.id);
        setActiveTool("zoom"); // Switch to zoom tool when adding
    }, [videoDuration]);

    const handleUpdateZoomFragment = useCallback((fragmentId: string, updates: Partial<ZoomFragment>) => {
        setZoomFragments(prev => prev.map(f =>
            f.id === fragmentId ? { ...f, ...updates } : f
        ).sort((a, b) => a.startTime - b.startTime));
    }, []);

    const handleDeleteZoomFragment = useCallback((fragmentId: string) => {
        setZoomFragments(prev => prev.filter(f => f.id !== fragmentId));
        if (selectedZoomFragmentId === fragmentId) {
            setSelectedZoomFragmentId(null);
        }
    }, [selectedZoomFragmentId]);

    // Get currently selected zoom fragment - memoized
    const selectedZoomFragment = useMemo(() =>
        zoomFragments.find(f => f.id === selectedZoomFragmentId) || null,
        [zoomFragments, selectedZoomFragmentId]
    );

    // Calcular el CSS del background actual - memoized
    const backgroundColorCss = useMemo((): string | undefined => {
        if (backgroundTab === "color" && backgroundColorConfig) {
            if (backgroundColorConfig.type === "solid") {
                return backgroundColorConfig.config.color;
            } else {
                return gradientToCss(backgroundColorConfig.config);
            }
        }
        return undefined;
    }, [backgroundTab, backgroundColorConfig]);

    // Fullscreen toggle handler
    const toggleFullscreen = useCallback(async () => {
        if (!editorAreaRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await editorAreaRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error("Error toggling fullscreen:", error);
        }
    }, []);

    // Listen for fullscreen changes (e.g., pressing Escape)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Keyboard shortcuts for zoom fragments
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Copy element (Ctrl+C or Cmd+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementId) {
                e.preventDefault();
                copySelectedElement();
                return;
            }

            // Paste element (Ctrl+V or Cmd+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                pasteElement();
                return;
            }

            // Delete selected canvas element with Delete or Backspace
            if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
                e.preventDefault();
                deleteCanvasElement(selectedElementId);
                return; // Prevent zoom fragment deletion if element is selected
            }

            // Delete selected audio track with Delete or Backspace
            if ((e.key === "Delete" || e.key === "Backspace") && selectedAudioTrackId) {
                e.preventDefault();
                handleDeleteAudioTrack(selectedAudioTrackId);
                setSelectedAudioTrackId(null);
                return;
            }

            // Delete selected zoom fragment with Delete or Backspace
            if ((e.key === "Delete" || e.key === "Backspace") && selectedZoomFragmentId) {
                e.preventDefault();
                handleDeleteZoomFragment(selectedZoomFragmentId);
            }

            // Escape to deselect canvas element or zoom fragment
            if (e.key === "Escape") {
                e.preventDefault();
                if (selectedElementId) {
                    setSelectedElementId(null);
                } else if (selectedAudioTrackId) {
                    setSelectedAudioTrackId(null);
                } else if (selectedZoomFragmentId) {
                    setSelectedZoomFragmentId(null);
                }
            }

            // Don't handle spacebar here - let PlayerControls handle it to avoid conflicts
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedElementId, selectedZoomFragmentId, selectedAudioTrackId, deleteCanvasElement, handleDeleteZoomFragment, handleDeleteAudioTrack, copySelectedElement, pasteElement]);

    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768) {
                setIsControlPanelOpen(false);
            }
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleAspectRatioChange = useCallback((ratio: AspectRatio) => {
        setAspectRatio(ratio);
    }, []);

    const handleCustomDimensionsChange = useCallback((dimensions: { width: number; height: number }) => {
        setCustomDimensions(dimensions);
    }, []);

    const handleOpenCropper = useCallback(() => {
        setIsCropperOpen(true);
    }, []);

    const handleCloseCropper = useCallback(() => {
        setIsCropperOpen(false);
    }, []);

    const handleCropApply = useCallback((crop: CropArea) => {
        setCropArea(crop);
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-[#0E0E12] text-white/60 font-sans overflow-hidden select-none">
            <div className="flex flex-1 overflow-hidden">
                <div className="hidden lg:flex">
                    <ToolsSidebar
                        activeTool={activeTool}
                        onToolChange={setActiveTool}
                        onVideoUpload={handleVideoUpload}
                        isUploading={isUploading}
                        selectedZoomFragmentId={selectedZoomFragmentId}
                        selectedAudioTrackId={selectedAudioTrackId}
                    />
                </div>

                <div className="hidden lg:block">
                    <AnimatePresence mode="wait">
                        {isControlPanelOpen && (
                            <motion.div
                                key="control-panel"
                                initial={{ x: -320, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -320, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <Suspense fallback={
                                    <div className="w-[320px] h-screen bg-[#141417] border-r border-white/10 flex items-center justify-center">
                                        <LoadingSpinner message="Cargando panel..." />
                                    </div>
                                }>
                                    <ControlPanel
                                        activeTool={activeTool}
                                        backgroundTab={backgroundTab}
                                        onBackgroundTabChange={handleBackgroundTabChange}
                                        selectedWallpaper={selectedWallpaper}
                                        onWallpaperSelect={handleWallpaperSelect}
                                        backgroundBlur={backgroundBlur}
                                        onBackgroundBlurChange={setBackgroundBlur}
                                        padding={padding}
                                        onPaddingChange={setPadding}
                                        roundedCorners={roundedCorners}
                                        onRoundedCornersChange={handleRoundedCornersChange}
                                        shadows={shadows}
                                        onShadowsChange={setShadows}
                                        uploadedImages={uploadedImages}
                                        selectedImageUrl={selectedImageUrl}
                                        onImageUpload={handleImageUpload}
                                        onImageSelect={handleImageSelect}
                                        onImageRemove={handleImageRemove}
                                        backgroundColorConfig={backgroundColorConfig}
                                        onBackgroundColorChange={handleBackgroundColorChange}
                                        onTogglePanel={() => setIsControlPanelOpen(!isControlPanelOpen)}
                                        isOpen={isControlPanelOpen}
                                        // Zoom props
                                        zoomFragments={zoomFragments}
                                        selectedZoomFragment={selectedZoomFragment}
                                        onSelectZoomFragment={handleSelectZoomFragment}
                                        onAddZoomFragment={() => handleAddZoomFragment(currentTime)}
                                        onUpdateZoomFragment={handleUpdateZoomFragment}
                                        onDeleteZoomFragment={handleDeleteZoomFragment}
                                        videoUrl={videoUrl}
                                        videoThumbnail={selectedZoomFragment ? getThumbnailForTime(selectedZoomFragment.startTime)?.dataUrl ?? null : null}
                                        currentTime={currentTime}
                                        getThumbnailForTime={getThumbnailForTime}
                                        videoDimensions={customAspectRatio}
                                        // Mockup props
                                        mockupId={mockupId}
                                        mockupConfig={mockupConfig}
                                        onMockupChange={handleMockupChange}
                                        onMockupConfigChange={handleMockupConfigChange}
                                        // Canvas elements props
                                        onAddCanvasElement={addCanvasElement}
                                        selectedCanvasElement={canvasElements.find(el => el.id === selectedElementId) || null}
                                        onUpdateCanvasElement={updateCanvasElement}
                                        onDeleteCanvasElement={deleteCanvasElement}
                                        onBringToFront={bringToFront}
                                        onSendToBack={sendToBack}
                                        // Audio props
                                        uploadedAudios={uploadedAudios}
                                        audioTracks={audioTracks}
                                        muteOriginalAudio={muteOriginalAudio}
                                        masterVolume={masterVolume}
                                        onAudioUpload={handleAudioUpload}
                                        onAudioDelete={handleAudioDelete}
                                        onAddAudioTrack={handleAddAudioTrack}
                                        onUpdateAudioTrack={handleUpdateAudioTrack}
                                        onDeleteAudioTrack={handleDeleteAudioTrack}
                                        onToggleMuteOriginalAudio={handleToggleMuteOriginalAudio}
                                        onMasterVolumeChange={handleMasterVolumeChange}
                                        videoDuration={videoDuration}
                                        videoHasAudioTrack={videoHasAudioTrack}
                                        // Cursor props
                                        /*cursorConfig={cursorConfig}
                                        cursorData={cursorData}
                                        isRecordedVideo={isRecordedVideo}
                                        onCursorConfigChange={handleCursorConfigChange}*/
                                    />
                                </Suspense>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    ref={editorAreaRef}
                    className="flex-1 bg-[#09090B] flex flex-col relative overflow-hidden min-w-0"
                >
                    <AnimatePresence>
                        {!isControlPanelOpen && (
                            <TooltipAction label="Abrir panel de control" side="right">
                                <motion.button
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut", delay: 0.15 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsControlPanelOpen(true)}
                                    className="absolute top-2 left-4 z-50 p-2 flex items-center gap-2 squircle-element bg-[#18181b] border border-white/10 text-white hover:bg-[#252529] transition-all duration-200 shadow-lg"
                                >
                                    <Link href="/" className="block sm:hidden"><Image src="/svg/logo-openvid.svg" alt="Logo" width={24} height={24} className="hover:opacity-80 transition-opacity" /></Link>
                                    <Icon icon="lucide:sidebar-open" width="20" className="hidden sm:block"
                                    />
                                </motion.button>
                            </TooltipAction>
                        )}
                    </AnimatePresence>

                    <EditorTopBar
                        onExport={handleExport}
                        exportProgress={exportProgress}
                        hasTransparentBackground={selectedWallpaper === -1}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                    />

                    <VideoCanvas
                        ref={canvasRef}
                        videoUrl={videoUrl}
                        videoRef={videoRef}
                        padding={padding}
                        roundedCorners={roundedCorners}
                        shadows={shadows}
                        aspectRatio={aspectRatio}
                        customAspectRatio={customAspectRatio}
                        cropArea={cropArea}
                        backgroundTab={backgroundTab}
                        selectedWallpaper={selectedWallpaper}
                        backgroundBlur={backgroundBlur}
                        selectedImageUrl={selectedImageUrl}
                        unsplashOverrideUrl={unsplashBgUrl}
                        backgroundColorCss={backgroundColorCss}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        // Scrubbing props for instant thumbnail preview
                        isScrubbing={isDraggingPlayhead}
                        scrubTime={scrubTime}
                        getThumbnailForTime={getThumbnailForTime}
                        // Zoom props
                        zoomFragments={zoomFragments}
                        currentTime={currentTime}
                        // Mockup props
                        mockupId={mockupId}
                        mockupConfig={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                        // Video upload props
                        onVideoUpload={handleVideoUpload}
                        onVideoDelete={handleDeleteVideo}
                        isUploading={isUploading}
                        // Transform props
                        videoTransform={videoTransform}
                        onVideoTransformChange={setVideoTransform}
                        // Canvas elements props
                        canvasElements={canvasElements}
                        selectedElementId={selectedElementId}
                        onElementUpdate={updateCanvasElement}
                        onElementSelect={selectCanvasElement}
                        // Cursor overlay props
                        /*cursorConfig={cursorConfig}
                        cursorData={cursorData}*/
                        onEnded={() => {
                            setIsPlaying(false);
                            justEndedRef.current = true;
                            const endTime = trimRange.end > 0 ? trimRange.end : videoDuration;
                            setCurrentTime(endTime);
                            setTimeout(() => {
                                justEndedRef.current = false;
                            }, 300);
                        }}
                    />

                    <PlayerControls
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        videoDuration={videoDuration}
                        aspectRatio={aspectRatio}
                        customAspectRatio={aspectRatio === "custom" ? customDimensions : videoDimensions}
                        isFullscreen={isFullscreen}
                        zoomLevel={timelineZoom}
                        onTogglePlayPause={togglePlayPause}
                        onSkipBackward={skipBackward}
                        onSkipForward={skipForward}
                        onToggleFullscreen={toggleFullscreen}
                        onAspectRatioChange={handleAspectRatioChange}
                        onCustomAspectRatioChange={handleCustomDimensionsChange}
                        onOpenCropper={handleOpenCropper}
                        onZoomChange={handleZoomChange}
                    />

                    <Suspense fallback={<TimelineSkeleton />}>
                        <Timeline
                            videoDuration={videoDuration}
                            currentTime={currentTime}
                            onSeek={handleSeek}
                            videoUrl={videoUrl}
                            zoomLevel={timelineZoom}
                            isDraggingPlayhead={isDraggingPlayhead}
                            onDragStart={handlePlayheadDragStart}
                            onDragEnd={handlePlayheadDragEnd}
                            trimRange={trimRange}
                            onTrimChange={setTrimRange}
                            // Zoom props
                            zoomFragments={zoomFragments}
                            selectedZoomFragmentId={selectedZoomFragmentId}
                            onSelectZoomFragment={handleSelectZoomFragment}
                            onAddZoomFragment={handleAddZoomFragment}
                            onUpdateZoomFragment={handleUpdateZoomFragment}
                            onActivateZoomTool={handleActivateZoomTool}
                            // Audio props
                            audioTracks={audioTracks}
                            uploadedAudios={uploadedAudios}
                            selectedAudioTrackId={selectedAudioTrackId}
                            onSelectAudioTrack={handleSelectAudioTrack}
                            onUpdateAudioTrack={handleUpdateAudioTrack}
                        />
                    </Suspense>

                </div>

            </div>

            <MobileToolsMenu
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onVideoUpload={handleVideoUpload}
                isUploading={isUploading}
                onOpenToolPanel={() => setIsMobileControlPanelOpen(true)}
            />

            <MobileControlPanel
                isOpen={isMobileControlPanelOpen}
                onClose={() => setIsMobileControlPanelOpen(false)}
                activeTool={activeTool}
                backgroundTab={backgroundTab}
                onBackgroundTabChange={handleBackgroundTabChange}
                selectedWallpaper={selectedWallpaper}
                onWallpaperSelect={handleWallpaperSelect}
                backgroundBlur={backgroundBlur}
                onBackgroundBlurChange={setBackgroundBlur}
                padding={padding}
                onPaddingChange={setPadding}
                roundedCorners={roundedCorners}
                onRoundedCornersChange={handleRoundedCornersChange}
                shadows={shadows}
                onShadowsChange={setShadows}
                uploadedImages={uploadedImages}
                selectedImageUrl={selectedImageUrl}
                onImageUpload={handleImageUpload}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                backgroundColorConfig={backgroundColorConfig}
                onBackgroundColorChange={handleBackgroundColorChange}
                zoomFragments={zoomFragments}
                selectedZoomFragment={selectedZoomFragment}
                onSelectZoomFragment={handleSelectZoomFragment}
                onAddZoomFragment={() => handleAddZoomFragment(currentTime)}
                onUpdateZoomFragment={handleUpdateZoomFragment}
                onDeleteZoomFragment={handleDeleteZoomFragment}
                videoUrl={videoUrl}
                videoThumbnail={selectedZoomFragment ? getThumbnailForTime(selectedZoomFragment.startTime)?.dataUrl ?? null : null}
                currentTime={currentTime}
                getThumbnailForTime={getThumbnailForTime}
                videoDimensions={videoDimensions}
                mockupId={mockupId}
                mockupConfig={mockupConfig}
                onMockupChange={handleMockupChange}
                onMockupConfigChange={handleMockupConfigChange}
                onAddCanvasElement={addCanvasElement}
                selectedCanvasElement={canvasElements.find(el => el.id === selectedElementId) || null}
                onUpdateCanvasElement={updateCanvasElement}
                onDeleteCanvasElement={deleteCanvasElement}
                onBringToFront={bringToFront}
                onSendToBack={sendToBack}
                uploadedAudios={uploadedAudios}
                audioTracks={audioTracks}
                muteOriginalAudio={muteOriginalAudio}
                masterVolume={masterVolume}
                onAudioUpload={handleAudioUpload}
                onAudioDelete={handleAudioDelete}
                onAddAudioTrack={handleAddAudioTrack}
                onUpdateAudioTrack={handleUpdateAudioTrack}
                onDeleteAudioTrack={handleDeleteAudioTrack}
                onToggleMuteOriginalAudio={handleToggleMuteOriginalAudio}
                onMasterVolumeChange={handleMasterVolumeChange}
                videoDuration={videoDuration}
                videoHasAudioTrack={videoHasAudioTrack}
                // Cursor props
               /*cursorConfig={cursorConfig}
                cursorData={cursorData}
                isRecordedVideo={isRecordedVideo}
                onCursorConfigChange={handleCursorConfigChange}*/
            />

            <Suspense fallback={null}>
                <ExportOverlay
                    exportProgress={exportProgress}
                    onCancel={cancelExport}
                    isTransparentExport={selectedWallpaper === -1}
                />
            </Suspense>
            <Suspense fallback={null}>
                <VideoCropperModal
                    isOpen={isCropperOpen}
                    onClose={handleCloseCropper}
                    videoUrl={videoUrl}
                    onCropApply={handleCropApply}
                    initialCrop={cropArea}
                />
            </Suspense>

            {autoTrimModalOpen && pendingAudioUpload && (
                <AudioTrimModal
                    key={pendingAudioUpload.audio.id}
                    isOpen={autoTrimModalOpen}
                    audioName={pendingAudioUpload.audio.name}
                    audioUrl={pendingAudioUpload.audio.url}
                    audioDuration={pendingAudioUpload.audio.duration}
                    initialTrimStart={0}
                    initialTrimEnd={Math.min(pendingAudioUpload.audio.duration, videoDuration)}
                    onConfirm={(trimStart, trimEnd) => {
                        if (pendingAudioUpload) {
                            const lastTrackEnd = audioTracks.reduce((max, track) =>
                                Math.max(max, track.startTime + track.duration), 0);

                            const newTrack: AudioTrack = {
                                id: pendingAudioUpload.trackId,
                                audioId: pendingAudioUpload.audio.id,
                                name: pendingAudioUpload.audio.name,
                                startTime: lastTrackEnd,
                                duration: trimEnd - trimStart,
                                trimStart: trimStart,  // ← NUEVO
                                volume: 1,
                                loop: false,
                            };

                            setAudioTracks(prev => [...prev, newTrack]);

                            // Auto-mute original audio when first track is added
                            if (audioTracks.length === 0) {
                                setMuteOriginalAudio(true);
                            }
                        }
                        setAutoTrimModalOpen(false);
                        setPendingAudioUpload(null);
                    }}
                    onCancel={() => {
                        // Remove the uploaded audio if user cancels
                        if (pendingAudioUpload) {
                            setUploadedAudios(prev => prev.filter(a => a.id !== pendingAudioUpload.audio.id));
                            URL.revokeObjectURL(pendingAudioUpload.audio.url);
                        }
                        setAutoTrimModalOpen(false);
                        setPendingAudioUpload(null);
                    }}
                />
            )}
        </div>
    );
}