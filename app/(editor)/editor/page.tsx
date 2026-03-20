"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense, useMemo } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { loadVideoFromIndexedDB, deleteRecordedVideo } from "@/hooks/useScreenRecording";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useVideoExport } from "@/hooks/useVideoExport";
import { useVideoThumbnails } from "@/hooks/useVideoThumbnails";
import { clearAllThumbnailCache } from "@/lib/thumbnail-cache";
import type { ExportQuality, Tool, BackgroundTab, VideoCanvasHandle, BackgroundColorConfig, AspectRatio, CropArea, ZoomFragment } from "@/types";
import type { TrimRange } from "@/types/timeline.types";
import type { MockupConfig } from "@/types/mockup.types";
import { DEFAULT_MOCKUP_CONFIG, getMockupDefaultConfig } from "@/types/mockup.types";
import type { CanvasElement } from "@/types/canvas-elements.types";
import { MOCKUPS } from "@/lib/mockup-data";
import { gradientToCss, generateDefaultZoomFragments, createZoomFragment } from "@/types";
import "../../globals.css";
import { ToolsSidebar } from "@/app/components/ui/editor/ToolsSidebar";
import { EditorTopBar } from "@/app/components/ui/editor/EditorTopBar";
import { VideoCanvas } from "@/app/components/ui/editor/VideoCanvas";
import { PlayerControls } from "@/app/components/ui/editor/PlayerControls";
import { findValidFragmentPosition } from "@/app/components/ui/editor/ZoomFragmentTrackItem";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

// Lazy load heavy components
const ControlPanel = lazy(() => import("@/app/components/ui/editor/ControlPanel").then(mod => ({ default: mod.ControlPanel })));
const Timeline = lazy(() => import("@/app/components/ui/editor/Timeline").then(mod => ({ default: mod.Timeline })));
const ExportOverlay = lazy(() => import("@/app/components/ui/ExportOverlay").then(mod => ({ default: mod.ExportOverlay })));
const VideoCropperModal = lazy(() => import("@/app/components/ui/editor/VideoCropperModal").then(mod => ({ default: mod.VideoCropperModal })));

export default function Editor() {
    const [activeTool, setActiveTool] = useState<Tool>("screenshot");
    const [backgroundTab, setBackgroundTab] = useState<BackgroundTab>("wallpaper");
    const [selectedWallpaper, setSelectedWallpaper] = useState(0);
    const [backgroundBlur, setBackgroundBlur] = useState(0);
    const [padding, setPadding] = useState(10);
    const [roundedCorners, setRoundedCorners] = useState(10);
    const [shadows, setShadows] = useState(10);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);

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
        const maxZIndex = Math.max(...canvasElements.map(el => el.zIndex), 0);
        updateCanvasElement(id, { zIndex: maxZIndex + 1 });
    }, [canvasElements, updateCanvasElement]);

    const sendToBack = useCallback((id: string) => {
        const minZIndex = Math.min(...canvasElements.map(el => el.zIndex), Date.now());
        updateCanvasElement(id, { zIndex: minZIndex - 1 });
    }, [canvasElements, updateCanvasElement]);

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
    const { uploadVideo, loadUploadedVideo, isUploading } = useVideoUpload();

    const handleExport = (quality: ExportQuality) => {
        exportVideo({
            quality,
            trim: trimRange.end > trimRange.start ? { start: trimRange.start, end: trimRange.end } : undefined
        });
    };

    // Handler para subir video
    const handleVideoUpload = useCallback(async (file: File) => {
        try {
            // Clear any existing recorded video and thumbnails
            await deleteRecordedVideo();
            await clearAllThumbnailCache();
        } catch (error) {
            console.warn("Failed to clear previous video:", error);
        }

        const uploadedData = await uploadVideo(file);
        if (uploadedData) {
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
        }
    }, [uploadVideo]);

    useEffect(() => {
        const loadVideo = async () => {
            try {
                // Try loading recorded video first
                let videoData = await loadVideoFromIndexedDB();

                // If no recorded video, try loading uploaded video
                if (!videoData) {
                    const uploadedData = await loadUploadedVideo();
                    if (uploadedData) {
                        videoData = {
                            url: uploadedData.url,
                            videoId: uploadedData.videoId,
                            duration: uploadedData.duration,
                            blob: new Blob(), // Not needed for display
                        };
                        setAspectRatio(uploadedData.aspectRatio);

                        // Always store the actual video dimensions
                        setVideoDimensions({ width: uploadedData.width, height: uploadedData.height });
                    }
                }

                if (videoData) {
                    setVideoUrl(videoData.url);
                    setVideoId(videoData.videoId);
                    setVideoDuration(videoData.duration);
                    setTrimRange({ start: 0, end: videoData.duration });
                    const defaultFragments = generateDefaultZoomFragments(videoData.duration);
                    setZoomFragments(defaultFragments);
                }
            } catch (error) {
                console.error("Error loading video:", error);
            }
        };

        loadVideo();
    }, [loadUploadedVideo]);

    useEffect(() => {
        if (uploadedImages.length > 0) {
            localStorage.setItem("openvid-uploaded-images", JSON.stringify(uploadedImages));
        }
    }, [uploadedImages]);

    const togglePlayPause = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
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
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying, trimRange.start, trimRange.end]);

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
                    setIsPlaying(false);
                    justEndedRef.current = true;
                    setCurrentTime(trimRange.end);
                    // Don't modify videoRef.currentTime to avoid visual jump
                    setTimeout(() => { justEndedRef.current = false; }, 300);
                    return;
                }

                setCurrentTime(currentVideoTime);
            }
            if (isPlaying && !isDraggingPlayhead) {
                animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
            }
        };
    }, [isPlaying, isDraggingPlayhead, trimRange.end]);

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
        }
    }, [scrubTime]);

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

    const skipBackward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
    };

    const skipForward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoDuration, videoRef.current.currentTime + 5);
        }
    };

    const handleSeek = useCallback((time: number) => {
        setScrubTime(time);
        setCurrentTime(time);

        if (videoRef.current && !isDraggingPlayhead) {
            if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
                videoRef.current.fastSeek(time);
            } else {
                videoRef.current.currentTime = time;
            }
        }
    }, [isDraggingPlayhead]);

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
        setSelectedImageUrl(url);
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
                } else if (selectedZoomFragmentId) {
                    setSelectedZoomFragmentId(null);
                }
            }

            // Don't handle spacebar here - let PlayerControls handle it to avoid conflicts
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedElementId, selectedZoomFragmentId, deleteCanvasElement, handleDeleteZoomFragment, copySelectedElement, pasteElement]);

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
                {/* Tools Sidebar */}
                <ToolsSidebar
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    onVideoUpload={handleVideoUpload}
                    isUploading={isUploading}
                />

                {/* Control Panel */}
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
                                    onWallpaperSelect={setSelectedWallpaper}
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
                                />
                            </Suspense>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Editor Area */}
                <div
                    ref={editorAreaRef}
                    className="flex-1 bg-[#09090B] flex flex-col relative overflow-hidden"
                >
                    <AnimatePresence>
                        {!isControlPanelOpen && (
                            <motion.button
                                initial={{ x: -100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -100, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.15 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsControlPanelOpen(true)}
                                className="absolute top-2 left-4 z-50 p-2 squircle-element bg-[#18181b] border border-white/10 text-white hover:bg-[#252529] transition-all duration-200 shadow-lg"
                                title="Abrir panel de control"
                            >
                                <Icon icon="lucide:sidebar-open" width="20" />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <EditorTopBar
                        onExport={handleExport}
                        exportProgress={exportProgress}
                    />

                    {/* Video Canvas */}
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
                        isUploading={isUploading}
                        // Transform props
                        videoTransform={videoTransform}
                        onVideoTransformChange={setVideoTransform}
                        // Canvas elements props
                        canvasElements={canvasElements}
                        selectedElementId={selectedElementId}
                        onElementUpdate={updateCanvasElement}
                        onElementSelect={selectCanvasElement}
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

                    {/* Player Controls */}
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

                    <Suspense fallback={
                        <div className="h-[160px] bg-[#141417] border-t border-white/10 flex items-center justify-center">
                            <LoadingSpinner size="sm" message="Cargando timeline..." />
                        </div>
                    }>
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
                        />
                    </Suspense>

                </div>

            </div>
            <Suspense fallback={null}>
                <ExportOverlay
                    exportProgress={exportProgress}
                    onCancel={cancelExport}
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
        </div>
    );
}