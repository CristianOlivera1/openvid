"use client";

import { EDITOR_WITHOUT_AUTH } from "@/app/config/editor";
import { useState, useRef, useEffect, useCallback, lazy, Suspense, useMemo } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { loadVideoFromIndexedDB, deleteRecordedVideo } from "@/hooks/useScreenRecording";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useImageProjects } from "@/hooks/useImageProjects";
import { getUploadedVideo, deleteUploadedVideo, getVideoTrack, clearVideoTrack } from "@/lib/video-upload-cache";
import { saveVideoProject, cleanupOrphanAudios, getVideoProject, saveCameraBlob, getCameraBlob, clearVideoProjectAndAudios } from "@/lib/video-project-cache";
import { getUploadedImage, deleteUploadedImage } from "@/lib/image-upload-cache";
import { useEditorMode } from "@/hooks/useEditorMode";
import { useActiveTool } from "@/hooks/useActiveTool";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useVideoExport } from "@/hooks/useVideoExport";
import { useVideoThumbnails, type VideoThumbnail } from "@/hooks/useVideoThumbnails";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { clearAllThumbnailCache } from "@/lib/thumbnail-cache";
import { addVideoToLibrary, addVideoToLibraryWithMetadata, getLibraryVideoCount, getLibraryVideo, findExistingVideo } from "@/lib/videos-library";
import { calculateTotalDuration, clampClipToRealDuration, findNextClipPosition, getClipAtTime, probeMediaDuration, resequenceClips, reorderVideoClipAt, splitClipAtTime, type VideoTrackClip, probeMediaDimensions, restoreClipTrim, rippleTrimClip, TrimEdge } from "@/types/video-track.types";
import { remapOverlaysAfterClipChange } from "@/lib/timeline-overlay-remap";
import type { ExportQuality, BackgroundTab, VideoCanvasHandle, BackgroundColorConfig, AspectRatio, CropArea } from "@/types";
import type { TrimRange } from "@/types/timeline.types";
import type { MockupConfig, MenuPage } from "@/types/mockup.types";
import type { EditorState } from "@/types/editor-state.types";
import { createInitialEditorState } from "@/types/editor-state.types";
import { DEFAULT_MOCKUP_CONFIG, getMockupDefaultConfig } from "@/types/mockup.types";
import type { CameraConfig } from "@/types/camera.types";
import { DEFAULT_CAMERA_CONFIG } from "@/types/camera.types";
import type { Preview3DConfig, ImageMaskConfig } from "@/types/photo.types";
import { DEFAULT_MASK_CONFIG, PREVIEW_CONFIGS } from "@/types/photo.types";
import { MOCKUPS } from "@/lib/mockup-data";
import { gradientToCss, generateDefaultZoomFragments } from "@/types";
import { ToolsSidebar } from "@/app/components/ui/editor/ToolsSidebar";
import { MobileToolsMenu } from "@/app/components/ui/editor/MobileToolsMenu";
import { MobileControlPanel } from "@/app/components/ui/editor/MobileControlPanel";
import { EditorTopBar } from "@/app/components/ui/editor/EditorTopBar";
import { VideoCanvas } from "@/app/components/ui/editor/VideoCanvas";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TimelineSkeleton } from "@/app/components/ui/Skeleton";
import { AudioTrimModal } from "@/app/components/ui/editor/AudioTrimModal";
import { useMockup3dContext } from "@/app/contexts/Mockup3dContext";
import { useAuth } from "@/app/contexts/useAuth";
import { usePathname, useRouter } from "@/navigation";
import { savePendingExport, readPendingExport, clearPendingExport } from "@/lib/pending-export";
import Image from "next/image";
import Link from "next/link";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { useLocale, useTranslations } from "next-intl";
import { useCanvasElements } from "@/hooks/useCanvasElements";
import { useEditorSelection } from "@/hooks/useEditorSelection";
import { useImageExport } from "@/hooks/useImageExport";
import { useAudioTracks } from "@/hooks/useAudioTracks";
import { useMockupMotionFragments } from "@/hooks/useMockupMotionFragments";
import { useZoomFragments } from "@/hooks/useZoomFragments";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { ExportSuccessModal } from "@/app/components/ui/Exportsuccessmodal";

const ControlPanel = lazy(() => import("@/app/components/ui/editor/ControlPanel").then(mod => ({ default: mod.ControlPanel })));
const Timeline = lazy(() => import("@/app/components/ui/editor/Timeline").then(mod => ({ default: mod.Timeline })));
const ExportOverlay = lazy(() => import("@/app/components/ui/ExportOverlay").then(mod => ({ default: mod.ExportOverlay })));
const VideoCropperModal = lazy(() => import("@/app/components/ui/editor/VideoCropperModal").then(mod => ({ default: mod.VideoCropperModal })));
const ImageCropperModal = lazy(() => import("@/app/components/ui/editor/ImageCropperModal").then(mod => ({ default: mod.ImageCropperModal })));
const PhotoEditorPlaceholder = lazy(() => import("@/app/components/ui/editor/PhotoEditorPlaceholder").then(mod => ({ default: mod.PhotoEditorPlaceholder })));
const PlayerControls = lazy(() => import("@/app/components/ui/editor/PlayerControls").then(mod => ({ default: mod.PlayerControls })));

export default function Editor() {
    // Editor mode (video/photo) from URL params
    const { mode: editorMode, isVideoMode, isPhotoMode } = useEditorMode();
    const tZoom = useTranslations("zoomFragmentEditor");

    const {
        imagePhoneActive, setImagePhoneActive,
        imagePhoneX, setImagePhoneX,
        imagePhoneY, setImagePhoneY,
        imagePhoneScale, setImagePhoneScale,
        imagePhoneRotX, setImagePhoneRotX,
        imagePhoneRotY, setImagePhoneRotY,
        imagePhoneRotZ, setImagePhoneRotZ,
        imagePhonePerspective, setImagePhonePerspective,
        imagePhoneDevice, setImagePhoneDevice,
        imagePhonePresetId, setImagePhonePresetId,
        imagePhoneOpening, setImagePhoneOpening,
        imagePhoneShadow, setImagePhoneShadow,
        imagePhoneShadowColor, setImagePhoneShadowColor,
        imagePhoneRefWidth, setImagePhoneRefWidth,
    } = useMockup3dContext();

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

    const [undoRedoVersion, setUndoRedoVersion] = useState(-1);
    const [wallpaperShowAll, setWallpaperShowAll] = useState(false);

    const handleUndo = useCallback(() => {
        undo();
        setUndoRedoVersion(v => v + 1);
    }, [undo]);

    const handleRedo = useCallback(() => {
        redo();
        setUndoRedoVersion(v => v + 1);
    }, [redo]);

    // Image state for photo mode
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Screen capture hook
    const { captureScreen, isCapturing } = useScreenCapture();

    // Image projects system (IndexedDB persistence for photo mode)
    const {
        projects: imageProjects,
        currentProject,
        isLoading: isLoadingProjects,
        isSaving: isSavingProject,
        createProject,
        saveCurrentProject,
        switchToProject,
        removeProject,
    } = useImageProjects();

    // Photo mode 3D preview state
    const [selectedPreviewId, setSelectedPreviewId] = useState<string>("front");
    const [canvasImageUrl, setCanvasImageUrl] = useState<string | null>(null);
    const [imageZoomScale, setImageZoomScale] = useState<number>(1);
    const [imageTransform, setImageTransform] = useState<Preview3DConfig>(PREVIEW_CONFIGS[0]);

    const [apply3DToBackground, setApply3DToBackground] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [imageMaskConfig, setImageMaskConfig] = useState<ImageMaskConfig>(DEFAULT_MASK_CONFIG);
    const [videoMaskConfig, setVideoMaskConfig] = useState<ImageMaskConfig>(DEFAULT_MASK_CONFIG);

    const [elementsTextTabTrigger] = useState(0);
    const [backgroundTab, setBackgroundTab] = useState<BackgroundTab>("wallpaper");
    const [selectedWallpaper, setSelectedWallpaper] = useState(1);
    const [backgroundBlur, setBackgroundBlur] = useState(0);
    const [padding, setPadding] = useState(10);
    const [roundedCorners, setRoundedCorners] = useState(15);
    const [shadows, setShadows] = useState(10);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobileControlPanelOpen, setIsMobileControlPanelOpen] = useState(false);
    // Initial page for the MockupMenu when the user clicks a mockup already
    // the menu is collapsed/expanded).
    const [initialMockupMenuPage, setInitialMockupMenuPage] = useState<MenuPage>("home");
    // Increments on every handleMockupClick so the MockupMenu re-navigates
    // MockupMenu would not fire).
    const [mockupMenuNavigationToken, setMockupMenuNavigationToken] = useState(0);

    // Video transform state (rotation and position)
    const [videoTransform, setVideoTransform] = useState<{ rotation: number; translateX: number; translateY: number }>({
        rotation: 0,
        translateX: 0,
        translateY: 0,
    });

    const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
    const [unsplashBgUrl, setUnsplashBgUrl] = useState<string>("");

    // Background color/gradient state
    const [backgroundColorConfig, setBackgroundColorConfig] = useState<BackgroundColorConfig | null>(null);
    const [textToolActive, setTextToolActive] = useState(false);
    // Aspect ratio, fullscreen, and cropper state
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("auto");
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
    const [customDimensions, setCustomDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropArea, setCropArea] = useState<CropArea | undefined>(undefined);

    // Multi-video playback: store video blobs and URLs indexed by libraryVideoId
    const videoBlobsRef = useRef<Map<string, Blob>>(new Map());
    const videoUrlsRef = useRef<Map<string, string>>(new Map());
    const [videoUrlsMap, setVideoUrlsMap] = useState<Map<string, string>>(new Map());
    const setClipUrl = useCallback((id: string, url: string) => {
        videoUrlsRef.current.set(id, url);
        setVideoUrlsMap(prev => {
            const next = new Map(prev);
            next.set(id, url);
            return next;
        });
    }, []);
    const deleteClipUrl = useCallback((id: string) => {
        const url = videoUrlsRef.current.get(id);
        if (url) URL.revokeObjectURL(url);
        videoUrlsRef.current.delete(id);
        setVideoUrlsMap(prev => {
            if (!prev.has(id)) return prev;
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);
    const clearClipUrls = useCallback(() => {
        for (const url of videoUrlsRef.current.values()) {
            URL.revokeObjectURL(url);
        }
        videoUrlsRef.current.clear();
        setVideoUrlsMap(new Map());
    }, []);
    const activeClipIdRef = useRef<string | null>(null);
    const activeClipDataRef = useRef<VideoTrackClip | null>(null);
    const clipAudioStateRef = useRef<Map<string, boolean>>(new Map());
    const muteOriginalAudioRef = useRef<boolean>(false);

    const lastTimeUpdateRef = useRef(0);
    const REACT_TIME_UPDATE_INTERVAL_MS = 50;

    // Computed: which dimensions to use for the canvas
    const customAspectRatio = useMemo(() => {
        return aspectRatio === "auto"
            ? (isPhotoMode ? imageDimensions : videoDimensions)
            : (aspectRatio === "custom" ? customDimensions : null);
    }, [aspectRatio, isPhotoMode, imageDimensions, videoDimensions, customDimensions]);

    // Refs for fullscreen
    const editorAreaRef = useRef<HTMLDivElement>(null);
    const clipSwitchTimeRef = useRef<number | null>(null);
    const isSeekingToClipRef = useRef<boolean>(false);

    // Video state
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<VideoCanvasHandle>(null);
    const isSwitchingClipRef = useRef<boolean>(false);

    // Timeline state
    const [timelineZoom, setTimelineZoom] = useState<number>(1);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
    const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 0 });
    const animationFrameRef = useRef<number | null>(null);
    const justEndedRef = useRef<boolean>(false);
    const wasPlayingBeforeDragRef = useRef<boolean>(false);
    const isExportingRef = useRef(false);
    const [scrubTime, setScrubTime] = useState<number>(0);
    // Ref that is always in sync with scrubTime — avoids stale closure in handlePlayheadDragEnd
    const scrubTimeRef = useRef<number>(0);

    // Mockup state
    const [mockupId, setMockupId] = useState<string>("none");
    const [mockupConfig, setMockupConfig] = useState<MockupConfig>(DEFAULT_MOCKUP_CONFIG);

    // Whether the currently loaded source video file contains an audio stream
    const [videoHasAudioTrack, setVideoHasAudioTrack] = useState<boolean>(true);

    const [isRecordedVideo, setIsRecordedVideo] = useState<boolean>(false);

    // Camera overlay state (from recorded video's camera track, or post-record adjustments)
    const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);
    const [cameraUrl, setCameraUrl] = useState<string | null>(null);

    const [activeTool, setActiveTool] = useActiveTool();
    const lastCopyActionRef = useRef<'element' | 'zoom' | 'motion' | 'audio' | null>(null);
    useEffect(() => {
        const handleWindowFocus = () => { lastCopyActionRef.current = null; };
        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, []);

    const {
        selectedElementId, setSelectedElementId,
        multiSelectedElementIds, setMultiSelectedElementIds,
        selectedZoomFragmentId, setSelectedZoomFragmentId,
        selectedZoomMovementId, setSelectedZoomMovementId,
        selectedAudioTrackId, setSelectedAudioTrackId,
        selectedVideoClipId, setSelectedVideoClipId,
        selectedMockupMotionFragmentId, setSelectedMockupMotionFragmentId,
        selectCanvasElement,
        selectZoomFragment: handleSelectZoomFragment,
        selectZoomMovement: handleSelectZoomMovement,
        selectAudioTrack: handleSelectAudioTrack,
        selectVideoClip: handleSelectVideoClip,
        selectMockupMotionFragment: handleSelectMockupMotionFragment,
    } = useEditorSelection({ setActiveTool });

    const {
        canvasElements, setCanvasElements, selectedCanvasElement, copiedElements,
        addCanvasElement, updateCanvasElement, deleteCanvasElement,
        bringToFront, sendToBack, copySelectedElement, pasteElement,
    } = useCanvasElements({
        selectedElementId, multiSelectedElementIds,
        setSelectedElementId, setMultiSelectedElementIds,
        setActiveTool, lastCopyActionRef,
    });

    const { imageExportProgress, handleImageExport } = useImageExport({
        canvasRef, imageUrl, customAspectRatio, aspectRatio,
        selectedWallpaper, selectedElementId, selectCanvasElement,
    });

    const {
        mockupMotionFragments, setMockupMotionFragments, mockupMotionFragmentsRef,
        selectedMockupMotionFragment,
        handleUpdateMockupMotionFragment, handleDeleteMockupMotionFragment,
        handleAddOrReplaceMotionPreset, handleActivateMotionTool,
        copySelectedMockupMotionFragment, pasteMockupMotionFragment, copiedMockupMotionFragment
    } = useMockupMotionFragments({
        currentTime, videoDuration, setActiveTool, lastCopyActionRef,
        selectedMockupMotionFragmentId, setSelectedMockupMotionFragmentId,
        motionMode: imagePhoneActive ? "3d" : (isVideoMode ? "2d" : null),
    });

    const {
        zoomFragments, setZoomFragments, zoomFragmentsRef, zoomMovements, setZoomMovements,
        selectedZoomFragment, handleActivateZoomTool, handleAddZoomFragment, handleAddZoomFragmentAtRange,
        handleUpdateZoomFragment, handleToggleZoomMovement, handleAddZoomMovement,
        handleAddZoomMovementAtRange, handleUpdateZoomMovement, handleDeleteZoomMovement,
        handleDeleteZoomFragment, copySelectedZoomFragment, pasteZoomFragment, copiedZoomFragment
    } = useZoomFragments({
        currentTime, videoDuration, setActiveTool, lastCopyActionRef,
        selectedZoomFragmentId, setSelectedZoomFragmentId,
        selectedZoomMovementId, setSelectedZoomMovementId,
        tZoom,
    });

    const {
        uploadedAudios, setUploadedAudios, audioTracks, setAudioTracks,
        muteOriginalAudio, setMuteOriginalAudio, masterVolume, setMasterVolume,
        audioElementsRef, syncAudioPlayback,
        handleAudioUpload, handleAudioDelete, handleAddAudioTrack,
        handleUpdateAudioTrack, handleDeleteAudioTrack,
        copySelectedAudioTrack, pasteAudioTrack, copiedAudioTrack,
        handleToggleMuteOriginalAudio, handleMasterVolumeChange,
        autoTrimModalOpen, pendingAudioUpload, confirmAudioTrim, cancelAudioTrim,
        restoreAudios,
    } = useAudioTracks({ videoDuration, isExportingRef, selectedAudioTrackId, setSelectedAudioTrackId, lastCopyActionRef });

    const handleCameraConfigChange = useCallback((partial: Partial<CameraConfig>) => {
        setCameraConfig((prev) => (prev ? { ...prev, ...partial } : prev));
    }, []);

    const handleCameraClick = useCallback(() => {
        setActiveTool("camera");
    }, []);

    // Auto-save current image project when configurations change
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isRestoringProjectRef = useRef(false);
    const isLoadingFromCacheRef = useRef(false);
    const lastRestoredProjectIdRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    const buildPhotoProjectSnapshot = useCallback(() => ({
        backgroundTab, selectedWallpaper, backgroundBlur, selectedImageUrl,
        backgroundColorConfig, padding, roundedCorners, shadows, aspectRatio,
        customDimensions, cropArea, mockupId, mockupConfig, canvasElements,
        imageTransform: {
            rotation: videoTransform.rotation,
            translateX: videoTransform.translateX,
            translateY: videoTransform.translateY,
        },
        imagePreview3D: imageTransform,
        apply3DToBackground,
        imageMaskConfig,
    }), [
        backgroundTab, selectedWallpaper, backgroundBlur, selectedImageUrl,
        backgroundColorConfig, padding, roundedCorners, shadows, aspectRatio,
        customDimensions, cropArea, mockupId, mockupConfig, canvasElements,
        videoTransform, imageTransform, apply3DToBackground, imageMaskConfig,
    ]);

    const autoSaveCurrentProject = useCallback(async () => {
        if (!isPhotoMode || !imageUrl || !currentProject) return;
        if (isRestoringProjectRef.current) return;
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveCurrentProject({ ...buildPhotoProjectSnapshot(), imageZoomScale, imagePhoneActive });
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }, 3000);
    }, [isPhotoMode, imageUrl, currentProject, saveCurrentProject, buildPhotoProjectSnapshot, imageZoomScale, imagePhoneActive]);

    const currentProjectId = currentProject?.id ?? null;
    const autoSaveRef = useRef(autoSaveCurrentProject);
    useEffect(() => {
        autoSaveRef.current = autoSaveCurrentProject;
    });

    useEffect(() => {
        if (!currentProjectId || !isPhotoMode || isRestoringProjectRef.current) return;
        const timeoutId = setTimeout(() => {
            autoSaveRef.current();
        }, 300);
        return () => {
            clearTimeout(timeoutId);
        };
    }, [autoSaveCurrentProject, currentProjectId, isPhotoMode]);

    // Restore current project when project ID changes (not on every currentProject update)
    useEffect(() => {
        if (!isPhotoMode || !currentProject) return;
        if (lastRestoredProjectIdRef.current === currentProject.id) return;

        const imageDataUrl = currentProject.imageDataUrl;
        if (!imageDataUrl) {
            console.error("Project missing imageDataUrl");
            return;
        }

        isRestoringProjectRef.current = true;
        lastRestoredProjectIdRef.current = currentProject.id;

        queueMicrotask(() => {
            setImageUrl(imageDataUrl);
            setBackgroundTab(currentProject.backgroundTab);
            setSelectedWallpaper(currentProject.selectedWallpaper);
            setBackgroundBlur(currentProject.backgroundBlur);
            setSelectedImageUrl(currentProject.selectedImageUrl);
            setBackgroundColorConfig(currentProject.backgroundColorConfig);
            setPadding(currentProject.padding);
            setRoundedCorners(currentProject.roundedCorners);
            setShadows(currentProject.shadows);
            setAspectRatio(currentProject.aspectRatio);
            setCustomDimensions(currentProject.customDimensions);
            setCropArea(currentProject.cropArea);
            setMockupId(currentProject.mockupId);
            setMockupConfig(currentProject.mockupConfig);
            setCanvasElements(currentProject.canvasElements);
            setVideoTransform(currentProject.imageTransform);
            setImageTransform(currentProject.imagePreview3D);
            setApply3DToBackground(currentProject.apply3DToBackground);
            setImageMaskConfig(currentProject.imageMaskConfig);
            setImageZoomScale(currentProject.imageZoomScale ?? 1);
            setImageDimensions({
                width: currentProject.imageWidth,
                height: currentProject.imageHeight,
            });

            setTimeout(() => {
                isRestoringProjectRef.current = false;
            }, 500);
        });
    }, [currentProject, isPhotoMode]);

    // Image project handlers
    const handleSelectImageProject = useCallback(async (projectId: string) => {
        if (!isPhotoMode) return;

        // Save current project before switching
        if (currentProject && imageUrl) {
            await autoSaveCurrentProject();
        }

        // Load the selected project
        await switchToProject(projectId);
    }, [isPhotoMode, currentProject, imageUrl, autoSaveCurrentProject, switchToProject]);

    const handleAddImageToCanvas = useCallback(async (projectId: string) => {
        await handleSelectImageProject(projectId);
    }, [handleSelectImageProject]);

    const handleDeleteImageProject = useCallback(async (projectId: string) => {
        // If deleting the current project, cancel auto-save and clear state immediately
        const isDeletingCurrent = currentProject?.id === projectId;

        if (isDeletingCurrent) {
            // Cancel any pending auto-save to prevent race condition
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
                autoSaveTimeoutRef.current = null;
            }
        }

        await removeProject(projectId);

        // Clear canvas if we deleted the current project
        if (isDeletingCurrent) {
            setImageUrl(null);
            setCanvasImageUrl(null);
            setImageDimensions(null);
            // Reset to default state
            setBackgroundTab("wallpaper");
            setSelectedWallpaper(8);
            setBackgroundBlur(0);
            setPadding(10);
            setRoundedCorners(15);
            setShadows(10);
            setAspectRatio("auto");
            setCustomDimensions(null);
            setCropArea(undefined);
            setMockupId("none");
            setMockupConfig(DEFAULT_MOCKUP_CONFIG);
            setCanvasElements([]);
            setApply3DToBackground(false);
            setImageMaskConfig(DEFAULT_MASK_CONFIG);
            setImageZoomScale(1);
            setImageTransform(PREVIEW_CONFIGS[0]);
        }
    }, [currentProject, removeProject]);

    const createImageProjectFromFile = useCallback(async (file: File, errorLabel: string) => {
        try {
            const img = await createImageBitmap(file);
            const project = await createProject(file, file.name, img.width, img.height, buildPhotoProjectSnapshot());
            if (project) {
                setImageUrl(project.imageDataUrl);
                setImageDimensions({ width: img.width, height: img.height });
            }
        } catch (error) {
            console.error(`Failed to ${errorLabel}:`, error);
        }
    }, [createProject, buildPhotoProjectSnapshot]);

    const handleImageUploadToCanvas = useCallback(
        (file: File) => createImageProjectFromFile(file, "upload image"),
        [createImageProjectFromFile]
    );
    const handleUploadImageToHistory = handleImageUploadToCanvas;

    const handleScreenCapture = useCallback(async () => {
        const blob = await captureScreen();
        if (!blob) return;
        const file = new File([blob], `Screenshot ${new Date().toLocaleString()}.png`, { type: "image/png" });
        await createImageProjectFromFile(file, "create project from screenshot");
    }, [captureScreen, createImageProjectFromFile]);

    // Handler for drag & drop images on canvas (photo mode only)
    const handleImageDrop = useCallback(async (files: FileList | File[]) => {
        if (!isPhotoMode) return;

        const fileArray = Array.from(files);
        const imageFile = fileArray.find(f => f.type.startsWith('image/'));

        if (imageFile) {
            await handleImageUploadToCanvas(imageFile);
        }
    }, [isPhotoMode, handleImageUploadToCanvas]);

    useEffect(() => {
        if (!isPhotoMode || !imageUrl || !canvasRef.current) {
            setCanvasImageUrl(null);
            return;
        }

        const generateSnapshot = async () => {
            try {
                await canvasRef.current?.drawFrame(false);
                const exportCanvas = canvasRef.current?.getExportCanvas();
                if (exportCanvas) {
                    const dataUrl = exportCanvas.toDataURL("image/png", 0.8);
                    setCanvasImageUrl(dataUrl);
                }
            } catch (error) {
                console.error("Error generating canvas snapshot:", error);
            }
        };

        const initialTimeout = setTimeout(generateSnapshot, 300);

        return () => {
            clearTimeout(initialTimeout);
        };
    }, [isPhotoMode, imageUrl, backgroundTab, selectedWallpaper, backgroundBlur, padding, roundedCorners, shadows, selectedImageUrl, backgroundColorConfig]);

    // Handle 3D preview selection
    const handleSelectPreview = useCallback((config: Preview3DConfig) => {
        setSelectedPreviewId(config.id);
        setImageTransform(config);
    }, []);

    // Handle 3D background toggle
    const handleToggle3DBackground = useCallback((value: boolean) => {
        setApply3DToBackground(value);
    }, [setApply3DToBackground]);

    // Reset all photo editor visual settings to defaults
    const handleResetPhotoEditor = useCallback(() => {
        const frontConfig = PREVIEW_CONFIGS[0];
        setSelectedPreviewId(frontConfig.id);
        setImageTransform(frontConfig);
        setApply3DToBackground(false);
        setImageMaskConfig(DEFAULT_MASK_CONFIG);
        setVideoTransform({ rotation: 0, translateX: 0, translateY: 0 });
        setImageZoomScale(1);
    }, []);

    // Videos library state
    const [newVideosCount, setNewVideosCount] = useState<number>(0);
    const [videosLibraryRefresh, setVideosLibraryRefresh] = useState<number>(0);
    const newVideosBadgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Video track clips state (multi-video support)
    const [videoClips, setVideoClips] = useState<VideoTrackClip[]>([]);
    const videosInTrackIds = useMemo(() =>
        videoClips.map(clip => clip.libraryVideoId),
        [videoClips]);
    const videoClipsRef = useRef<VideoTrackClip[]>([]);
    useEffect(() => {
        videoClipsRef.current = videoClips;
        const activeId = activeClipIdRef.current;
        if (activeId) {
            const fresh = videoClips.find(c => c.id === activeId);
            if (fresh) activeClipDataRef.current = fresh;
        }
    }, [videoClips]);

    const setCurrentTimeThrottled = useCallback((time: number) => {
        const now = performance.now();
        if (now - lastTimeUpdateRef.current >= REACT_TIME_UPDATE_INTERVAL_MS) {
            lastTimeUpdateRef.current = now;
            setCurrentTime(prev => (prev === time ? prev : time));
        }
    }, []);

    useEffect(() => {
        muteOriginalAudioRef.current = muteOriginalAudio;
    }, [muteOriginalAudio]);

    const [globalSpeed, setGlobalSpeed] = useState<number>(1);
    const globalSpeedRef = useRef<number>(1);
    useEffect(() => { globalSpeedRef.current = globalSpeed; }, [globalSpeed]);

    const updateEditorStateDebounced = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (updateEditorStateDebounced.current) clearTimeout(updateEditorStateDebounced.current);
        updateEditorStateDebounced.current = setTimeout(() => {
            setEditorState({
                backgroundTab,
                selectedWallpaper,
                backgroundBlur,
                padding,
                roundedCorners,
                shadows,
                selectedImageUrl,
                unsplashBgUrl,
                backgroundColorConfig,
                aspectRatio,
                customDimensions,
                cropArea,
                trimRange,
                zoomFragments,
                zoomMovements,
                mockupId,
                mockupConfig,
                canvasElements,
                audioTracks,
                muteOriginalAudio,
                masterVolume,
                cameraConfig,
                videoTransform,
                imageTransform,
                apply3DToBackground,
                imageMaskConfig,
                videoMaskConfig,
                imageZoomScale,
                imagePhoneActive,
                imagePhoneX,
                imagePhoneY,
                imagePhoneScale,
                imagePhoneRotX,
                imagePhoneRotY,
                imagePhoneRotZ,
                imagePhonePerspective,
                imagePhoneDevice,
                imagePhonePresetId,
                imagePhoneOpening,
                imagePhoneShadow,
                imagePhoneShadowColor,
                imagePhoneRefWidth,
                mockupMotionFragments,
                videoClips,
                globalSpeed,
            });
        }, 300);
        return () => {
            if (updateEditorStateDebounced.current) clearTimeout(updateEditorStateDebounced.current);
        };
    }, [
        backgroundTab, selectedWallpaper, backgroundBlur, padding, roundedCorners, shadows,
        selectedImageUrl, unsplashBgUrl, backgroundColorConfig, aspectRatio, customDimensions,
        cropArea, trimRange, zoomFragments, zoomMovements, mockupId, mockupConfig, canvasElements,
        audioTracks, muteOriginalAudio, masterVolume, cameraConfig, videoTransform, imageTransform,
        apply3DToBackground, imageMaskConfig, videoMaskConfig, imageZoomScale,
        imagePhoneActive, imagePhoneX, imagePhoneY, imagePhoneScale, imagePhoneRotX, imagePhoneRotY,
        imagePhoneRotZ, imagePhonePerspective, imagePhoneDevice, imagePhonePresetId, imagePhoneOpening,
        imagePhoneShadow, imagePhoneShadowColor, imagePhoneRefWidth, mockupMotionFragments,
        setEditorState, videoClips, globalSpeed
    ]);

    const prevUndoRedoVersionRef = useRef(undoRedoVersion);
    useEffect(() => {
        if (prevUndoRedoVersionRef.current === undoRedoVersion) return;
        prevUndoRedoVersionRef.current = undoRedoVersion;
        isRestoringProjectRef.current = true;

        queueMicrotask(() => {
            setBackgroundTab(editorState.backgroundTab);
            setSelectedWallpaper(editorState.selectedWallpaper);
            setBackgroundBlur(editorState.backgroundBlur);
            setPadding(editorState.padding);
            setRoundedCorners(editorState.roundedCorners);
            setShadows(editorState.shadows);
            setSelectedImageUrl(editorState.selectedImageUrl);
            setUnsplashBgUrl(editorState.unsplashBgUrl ?? "");
            setBackgroundColorConfig(editorState.backgroundColorConfig);
            setAspectRatio(editorState.aspectRatio);
            setCustomDimensions(editorState.customDimensions);
            setCropArea(editorState.cropArea);
            setTrimRange(editorState.trimRange);
            setZoomFragments(editorState.zoomFragments);
            setZoomMovements(editorState.zoomMovements ?? []);
            setMockupId(editorState.mockupId);
            setMockupConfig(editorState.mockupConfig);
            setCanvasElements(editorState.canvasElements);
            setAudioTracks(editorState.audioTracks);
            setMuteOriginalAudio(editorState.muteOriginalAudio);
            setMasterVolume(editorState.masterVolume);
            setCameraConfig(editorState.cameraConfig);
            setVideoTransform(editorState.videoTransform);
            setImageTransform(editorState.imageTransform);
            setApply3DToBackground(editorState.apply3DToBackground);
            setImageMaskConfig(editorState.imageMaskConfig);
            setImageZoomScale(editorState.imageZoomScale ?? 1);
            setVideoMaskConfig(editorState.videoMaskConfig);
            setImagePhoneActive(editorState.imagePhoneActive);
            setImagePhoneX(editorState.imagePhoneX);
            setImagePhoneY(editorState.imagePhoneY);
            setImagePhoneScale(editorState.imagePhoneScale);
            setImagePhoneRotX(editorState.imagePhoneRotX);
            setImagePhoneRotY(editorState.imagePhoneRotY);
            setImagePhoneRotZ(editorState.imagePhoneRotZ);
            setImagePhonePerspective(editorState.imagePhonePerspective);
            setImagePhoneDevice(editorState.imagePhoneDevice);
            setImagePhonePresetId(editorState.imagePhonePresetId);
            setImagePhoneOpening(editorState.imagePhoneOpening);
            setImagePhoneShadow(editorState.imagePhoneShadow);
            setImagePhoneShadowColor(editorState.imagePhoneShadowColor);
            setImagePhoneRefWidth(editorState.imagePhoneRefWidth ?? 0);
            setMockupMotionFragments(editorState.mockupMotionFragments ?? []);
            setGlobalSpeed(editorState.globalSpeed ?? 1);

            const restoredClips = editorState.videoClips ?? [];
            const clipsUnchanged = restoredClips === videoClipsRef.current;
            setVideoClips(restoredClips);

            if (!clipsUnchanged) {
                if (restoredClips.length > 0) {
                    const newDuration = calculateTotalDuration(restoredClips);
                    setVideoDuration(newDuration);
                    const stillActiveClip = activeClipIdRef.current
                        ? restoredClips.find(c => c.id === activeClipIdRef.current)
                        : null;
                    const clipAtTime = stillActiveClip ?? getClipAtTime(restoredClips, currentTime) ?? restoredClips[0];
                    activeClipIdRef.current = clipAtTime.id;
                    activeClipDataRef.current = clipAtTime;
                    const url = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                    if (url && videoRef.current && videoRef.current.src !== url) {
                        setVideoUrl(url);
                        setVideoId(clipAtTime.libraryVideoId);
                        videoRef.current.src = url;
                        videoRef.current.currentTime = clipAtTime.trimStart;
                    }
                } else {
                    setVideoUrl(null);
                    setVideoId(null);
                    setVideoDuration(0);
                    activeClipIdRef.current = null;
                    activeClipDataRef.current = null;
                }
            }

            setTimeout(() => {
                isRestoringProjectRef.current = false;
            }, 500);
        });
    }, [undoRedoVersion]);

    // Handler para cambiar el mockup
    const handleMockupChange = useCallback((newMockupId: string) => {
        setMockupId(newMockupId);
        const newMockup = MOCKUPS.find(m => m.id === newMockupId);
        setMockupConfig(getMockupDefaultConfig(newMockup));
    }, []);

    // Handler to update mockup configuration
    const handleMockupConfigChange = useCallback((updates: Partial<MockupConfig>) => {
        setMockupConfig(prev => ({ ...prev, ...updates }));
    }, []);

    // Click on a mockup that's already applied on the canvas: open the mockup
    // menu directly on the config page of that frame. Called by VideoCanvas
    // (see onMockupClick in VideoCanvasProps).
    const handleMockupClick = useCallback((kind: "2d" | "3d") => {
        setInitialMockupMenuPage(kind === "2d" ? "detail-2d" : "detail-3d");
        setMockupMenuNavigationToken((t) => t + 1);
        setActiveTool("mockup");
        setIsControlPanelOpen(true);
    }, [setActiveTool]);

    const handleRoundedCornersChange = useCallback((value: number) => {
        setRoundedCorners(value);
        setMockupConfig(prev => ({ ...prev, cornerRadius: value }));
    }, []);

    const thumbnailsCacheRef = useRef<Map<string, VideoThumbnail[]>>(new Map());
    const currentDisplayTime = isDraggingPlayhead ? scrubTime : currentTime;
    const thumbnailClipId = useMemo(() => {
        if (videoClips.length <= 1) return null;
        const clipAtTime = getClipAtTime(videoClips, currentDisplayTime);
        return clipAtTime?.libraryVideoId ?? null;
    }, [videoClips, currentDisplayTime]);

    const thumbnailUrl = useMemo(() => {
        if (videoClips.length <= 1 || !thumbnailClipId) return videoUrl;
        return videoUrlsMap.get(thumbnailClipId) || videoUrl;
    }, [videoUrl, videoClips.length, thumbnailClipId, videoUrlsMap]);

    const thumbnailVideoId = useMemo(() => {
        if (videoClips.length <= 1 || !thumbnailClipId) return videoId;
        return thumbnailClipId;
    }, [videoId, videoClips.length, thumbnailClipId]);

    const thumbnailDuration = useMemo(() => {
        if (videoClips.length <= 1 || !thumbnailClipId) return videoDuration;
        const clip = videoClips.find(c => c.libraryVideoId === thumbnailClipId);
        return clip?.duration || videoDuration;
    }, [videoDuration, videoClips, thumbnailClipId]);

    const { getThumbnailForTime: getRawThumbnailForTime, thumbnails: currentThumbnails } = useVideoThumbnails(
        thumbnailUrl,
        thumbnailDuration,
        {
            interval: 0.1,
            quality: "high",
            videoId: thumbnailVideoId || undefined,
        }
    );

    useEffect(() => {
        if (thumbnailVideoId && currentThumbnails.length > 0) {
            thumbnailsCacheRef.current.set(thumbnailVideoId, currentThumbnails);
        }
    }, [thumbnailVideoId, currentThumbnails]);

    const findNearestThumbnail = useCallback((thumbs: VideoThumbnail[], time: number): VideoThumbnail | null => {
        if (thumbs.length === 0) return null;
        let left = 0;
        let right = thumbs.length - 1;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (thumbs[mid].time < time) left = mid + 1;
            else right = mid;
        }
        if (left > 0) {
            const prevDiff = Math.abs(thumbs[left - 1].time - time);
            const currDiff = Math.abs(thumbs[left].time - time);
            if (prevDiff < currDiff) return thumbs[left - 1];
        }
        return thumbs[left];
    }, []);

    // Clip-aware getThumbnailForTime: looks up any clip's thumbnails from cache
    const getThumbnailForTime = useCallback((timelineTime: number) => {
        const clips = videoClipsRef.current;
        if (clips.length <= 1) {
            return getRawThumbnailForTime(timelineTime);
        }

        const clipAtTime = getClipAtTime(clips, timelineTime);
        if (!clipAtTime) return null;

        const localTime = clipAtTime.trimStart + (timelineTime - clipAtTime.startTime);

        // If this is the currently generating clip, use the hook directly (most up-to-date)
        if (clipAtTime.libraryVideoId === thumbnailVideoId) {
            return getRawThumbnailForTime(localTime);
        }

        // Otherwise, check the persistent cache
        const cached = thumbnailsCacheRef.current.get(clipAtTime.libraryVideoId);
        if (cached && cached.length > 0) {
            return findNearestThumbnail(cached, localTime);
        }

        return null;
    }, [getRawThumbnailForTime, thumbnailVideoId, findNearestThumbnail]);


    // Find which clip is active at a given timeline time - using standardized function
    const findActiveClipAtTime = useCallback((timelineTime: number): VideoTrackClip | null => {
        const clips = videoClipsRef.current;
        return getClipAtTime(clips, timelineTime);
    }, []);

    // Convert timeline time to clip-local time
    const timelineToClipTime = useCallback((timelineTime: number, clip: VideoTrackClip): number => {
        const offsetInClip = timelineTime - clip.startTime;
        return clip.trimStart + offsetInClip;
    }, []);

    // Pre-load video blobs when clips change
    useEffect(() => {
        const loadClipBlobs = async () => {
            const currentBlobs = videoBlobsRef.current;
            const currentUrls = videoUrlsRef.current;
            const neededIds = new Set(videoClips.map(c => c.libraryVideoId));

            for (const [id] of currentUrls.entries()) {
                if (!neededIds.has(id)) {
                    deleteClipUrl(id);
                    currentBlobs.delete(id);
                }
            }
            for (const clip of videoClips) {
                if (!currentBlobs.has(clip.libraryVideoId)) {
                    try {
                        const libraryVideo = await getLibraryVideo(clip.libraryVideoId);
                        if (libraryVideo) {
                            currentBlobs.set(clip.libraryVideoId, libraryVideo.blob);
                            const url = URL.createObjectURL(libraryVideo.blob);
                            setClipUrl(clip.libraryVideoId, url);
                        }
                    } catch (e) {
                        console.warn("Failed to load video blob for clip:", clip.id, e);
                    }
                }
            }
        };

        if (videoClips.length > 0) {
            loadClipBlobs();
        }
    }, [videoClips, setClipUrl, deleteClipUrl]);

    const { exportVideo, cancelExport, exportProgress } = useVideoExport(videoRef, canvasRef);
    const { uploadVideo, loadUploadedVideo, isUploading } = useVideoUpload();
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

    const isPlayingRef = useRef(isPlaying);
    const isDraggingPlayheadRef = useRef(isDraggingPlayhead);
    const trimRangeRef = useRef(trimRange);
    const syncAudioPlaybackRef = useRef(syncAudioPlayback);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { isDraggingPlayheadRef.current = isDraggingPlayhead; }, [isDraggingPlayhead]);
    useEffect(() => { trimRangeRef.current = trimRange; }, [trimRange]);
    useEffect(() => { syncAudioPlaybackRef.current = syncAudioPlayback; }, [syncAudioPlayback]);

    const currentTimeRef = useRef<number>(0);
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    const buildVideoProjectSnapshot = useCallback(() => ({
        videoClips,
        trimRange,
        globalSpeed,
        zoomFragments,
        zoomMovements,
        audioTracks,
        uploadedAudioIds: uploadedAudios.map(a => a.id),
        muteOriginalAudio,
        masterVolume,
        canvasElements,
        mockupId,
        mockupConfig,
        mockupMotionFragments,
        backgroundTab,
        selectedWallpaper,
        backgroundBlur,
        selectedImageUrl,
        unsplashBgUrl,
        backgroundColorConfig,
        padding,
        roundedCorners,
        shadows,
        aspectRatio,
        customDimensions,
        cropArea,
        videoTransform,
        imageTransform,
        apply3DToBackground,
        imageMaskConfig,
        videoMaskConfig,
        imageZoomScale,
        cameraConfig,
        cameraVideoId: cameraUrl
            ? (videoClips.find(c => c.hasCamera)?.libraryVideoId ?? null)
            : null,
    }), [
        videoClips, trimRange, globalSpeed,
        zoomFragments, zoomMovements,
        audioTracks, uploadedAudios, muteOriginalAudio, masterVolume,
        canvasElements,
        mockupId, mockupConfig,
        mockupMotionFragments,
        backgroundTab, selectedWallpaper, backgroundBlur, selectedImageUrl,
        unsplashBgUrl, backgroundColorConfig,
        padding, roundedCorners, shadows, aspectRatio, customDimensions, cropArea,
        videoTransform, imageTransform, apply3DToBackground,
        imageMaskConfig, videoMaskConfig, imageZoomScale,
        cameraConfig, cameraUrl,
    ]);

    const [showExportSuccess, setShowExportSuccess] = useState(false);
    const [exportSuccessMediaType, setExportSuccessMediaType] = useState<"video" | "photo">("video");

    const prevVideoExportStatusRef = useRef(exportProgress.status);
    useEffect(() => {
        if (prevVideoExportStatusRef.current !== "complete" && exportProgress.status === "complete") {
            setExportSuccessMediaType("video");
            setShowExportSuccess(true);
        }
        prevVideoExportStatusRef.current = exportProgress.status;
    }, [exportProgress.status]);

    const prevImageExportStatusRef = useRef(imageExportProgress.status);
    useEffect(() => {
        if (prevImageExportStatusRef.current !== "complete" && imageExportProgress.status === "complete") {
            setExportSuccessMediaType("photo");
            setShowExportSuccess(true);
        }
        prevImageExportStatusRef.current = imageExportProgress.status;
    }, [imageExportProgress.status]);

    const { user: authUser, loading: authLoading } = useAuth();
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    const handleExport = useCallback((quality: ExportQuality, fps?: number, bitrate?: number) => {
        if (!EDITOR_WITHOUT_AUTH && !authUser) {
            savePendingExport(quality);
            router.replace({
                pathname: "/login",
                query: { redirectedFrom: `/${locale}${pathname}` },
            });
            return;
        }
        isExportingRef.current = true;
        for (const audioEl of audioElementsRef.current.values()) {
            audioEl.pause();
        }

        justEndedRef.current = false;
        clipSwitchTimeRef.current = null;
        isSwitchingClipRef.current = false;
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setIsPlaying(false);
        exportVideo({
            quality,
            fps,
            bitrate,
            videoBlob: videoBlob ?? undefined,
            transparentBackground: selectedWallpaper === -1,
            trim: trimRange.end > trimRange.start ? { start: trimRange.start, end: trimRange.end } : undefined,
            muteOriginalAudio,
            videoHasAudioTrack,
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
            videoClips: videoClips.length > 0 ? videoClips : undefined,
            videoClipBlobs: videoClips.length > 1 ? videoBlobsRef.current : undefined,
            clipAudioStates: Object.fromEntries(clipAudioStateRef.current),
            speed: globalSpeed,
        }).finally(() => {
            isExportingRef.current = false;
        });
    }, [videoBlob, selectedWallpaper, trimRange, muteOriginalAudio, videoHasAudioTrack, audioTracks, uploadedAudios, masterVolume, videoClips, globalSpeed, exportVideo, setIsPlaying, authUser, router, locale, pathname]);

    const handleExportRef = useRef(handleExport);
    useEffect(() => {
        handleExportRef.current = handleExport;
    }, [handleExport]);

    useEffect(() => {
        if (!isVideoMode || authLoading || !authUser) return;

        let timer: ReturnType<typeof setInterval> | null = null;
        let attempts = 0;

        const tick = () => {
            const pendingQuality = readPendingExport();
            if (!pendingQuality) {
                if (timer) clearInterval(timer);
                return;
            }
            if (isRestoringProjectRef.current) return;

            const hasContent = videoClipsRef.current.length > 0 || !!videoBlob;
            if (!hasContent) {
                attempts++;
                if (attempts > 120) {
                    clearPendingExport();
                    if (timer) clearInterval(timer);
                }
                return;
            }

            clearPendingExport();
            if (timer) clearInterval(timer);
            handleExportRef.current(pendingQuality);
        };

        tick();
        timer = setInterval(tick, 250);
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isVideoMode, authLoading, authUser]);

    const showNewVideosBadge = useCallback((count: number) => {
        if (newVideosBadgeTimeoutRef.current) {
            clearTimeout(newVideosBadgeTimeoutRef.current);
            newVideosBadgeTimeoutRef.current = null;
        }
        setNewVideosCount(count);
        if (count > 0) {
            newVideosBadgeTimeoutRef.current = setTimeout(() => {
                setNewVideosCount(0);
                newVideosBadgeTimeoutRef.current = null;
            }, 5000);
        }
    }, []);

    const handleVideoUpload = useCallback(async (file: File, options?: { forceReplace?: boolean }) => {
        const forceReplace = options?.forceReplace ?? false;
        const hasExistingClips = videoClipsRef.current.length > 0 && !forceReplace;

        let libraryVideo: Awaited<ReturnType<typeof addVideoToLibrary>> | null = null;
        try {
            libraryVideo = await addVideoToLibrary(file);
            const count = await getLibraryVideoCount();
            showNewVideosBadge(hasExistingClips ? count : 0);
            setVideosLibraryRefresh(prev => prev + 1);
        } catch (error) {
            console.warn("Failed to add video to library:", error);
            return;
        }

        if (hasExistingClips) {
            setActiveTool("video");
            return;
        }

        clearClipUrls();
        videoBlobsRef.current.clear();
        videoUrlsRef.current.clear();
        activeClipIdRef.current = null;
        activeClipDataRef.current = null;
        setVideoBlob(file);
        if (libraryVideo) {
            const originalHasAudio = libraryVideo.originalHasAudio !== false;
            setVideoHasAudioTrack(originalHasAudio);
            if (!originalHasAudio) setMuteOriginalAudio(true);
            clipAudioStateRef.current.set(libraryVideo.id, libraryVideo.hasAudio !== false);
        }
        try {
            await clearAllThumbnailCache();
        } catch (error) {
            console.warn("Failed to clear thumbnails:", error);
        }
        const uploadedData = await uploadVideo(file);
        if (uploadedData && libraryVideo) {
            lastLoadedVideoIdRef.current = uploadedData.videoId;
            setVideoUrl(uploadedData.url);
            setVideoId(uploadedData.videoId);
            setVideoDuration(uploadedData.duration);
            setTrimRange({ start: 0, end: uploadedData.duration });
            setAspectRatio(uploadedData.aspectRatio);
            setVideoDimensions({ width: uploadedData.width, height: uploadedData.height });
            const newClip: VideoTrackClip = {
                id: crypto.randomUUID(),
                libraryVideoId: libraryVideo.id,
                name: file.name,
                startTime: 0,
                duration: uploadedData.duration,
                trimStart: 0,
                trimEnd: uploadedData.duration,
                thumbnailUrl: libraryVideo.thumbnailUrl,
                width: uploadedData.width,
                height: uploadedData.height,
            };
            clipAudioStateRef.current.set(libraryVideo.id, libraryVideo.hasAudio !== false);
            activeClipIdRef.current = newClip.id;
            activeClipDataRef.current = newClip;
            setVideoClips([newClip]);
            setSelectedVideoClipId(newClip.id);
            const defaultFragments = generateDefaultZoomFragments(uploadedData.duration);
            setZoomFragments(defaultFragments);
            setCurrentTime(0);
            setIsPlaying(false);
            setTimeout(() => clearHistory(), 200);
        }
    }, [uploadVideo, clearHistory, showNewVideosBadge, clearClipUrls]);

    const handleVideoDrop = useCallback(async (files: FileList | File[]) => {
        if (isPhotoMode) return;
        const fileArray = Array.from(files);
        const videoFile = fileArray.find(f => f.type.startsWith('video/'));
        if (videoFile) {
            await handleVideoUpload(videoFile, { forceReplace: true });
        }
    }, [isPhotoMode, handleVideoUpload]);

    const handleVideoUploadToLibrary = useCallback(async (file: File) => {
        try {
            await addVideoToLibrary(file);
            const count = await getLibraryVideoCount();
            showNewVideosBadge(count);
            setVideosLibraryRefresh(prev => prev + 1);
        } catch (error) {
            console.warn("Failed to add video to library:", error);
        }
    }, [showNewVideosBadge]);

    useEffect(() => {
        return () => {
            if (newVideosBadgeTimeoutRef.current) clearTimeout(newVideosBadgeTimeoutRef.current);
        };
    }, []);

    const handleGlobalSpeedChange = useCallback((speed: number) => {
        setGlobalSpeed(speed);
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    }, [setGlobalSpeed]);

    // Handler to add video from library to the track (concatenate)
    const handleAddVideoToTrack = useCallback(async (videoId: string, blob: Blob, duration: number) => {
        const libraryVideo = await getLibraryVideo(videoId);
        if (!libraryVideo) return;

        clipAudioStateRef.current.set(videoId, libraryVideo.hasAudio !== false);

        if (!videoBlobsRef.current.has(videoId)) { videoBlobsRef.current.set(videoId, blob); const blobUrl = URL.createObjectURL(blob); setClipUrl(videoId, blobUrl); }

        const { width: clipWidth, height: clipHeight, duration: realDuration } = await new Promise<{ width: number; height: number; duration: number }>((resolve) => {
            const probe = document.createElement('video');
            probe.preload = 'metadata';
            const probeUrl = videoUrlsRef.current.get(videoId)!;
            probe.onloadedmetadata = () => resolve({ width: probe.videoWidth, height: probe.videoHeight, duration: probe.duration });
            probe.onerror = () => resolve({ width: 0, height: 0, duration: 0 });
            probe.src = probeUrl;
        });

        const safeDuration =
            Number.isFinite(realDuration) && realDuration > 0
                ? Math.min(duration, realDuration)
                : duration;

        const persistedCamera = await getCameraBlob(videoId).catch((err) => {
            console.error("Failed to restore camera blob from library:", err);
            return null;
        });

        setVideoClips(prevClips => {
            const startTime = findNextClipPosition(prevClips);
            const newClip: VideoTrackClip = {
                id: crypto.randomUUID(),
                libraryVideoId: videoId,
                name: libraryVideo.fileName,
                startTime,
                duration: safeDuration,
                trimStart: 0,
                trimEnd: safeDuration,
                thumbnailUrl: libraryVideo.thumbnailUrl,
                hasCamera: !!persistedCamera,
                width: clipWidth || undefined,
                height: clipHeight || undefined,
            };
            const updatedClips = [...prevClips, newClip];

            setTimeout(() => {
                const newTotalDuration = calculateTotalDuration(updatedClips);
                setVideoDuration(newTotalDuration);
                setTrimRange({ start: 0, end: newTotalDuration });

                if (prevClips.length === 0) {
                    activeClipIdRef.current = newClip.id;
                    activeClipDataRef.current = newClip;
                    const url = videoUrlsRef.current.get(videoId) || URL.createObjectURL(blob);
                    setVideoBlob(blob);
                    setVideoUrl(url);
                    setVideoId(videoId);

                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    const metadataUrl = URL.createObjectURL(blob);
                    video.onloadedmetadata = () => {
                        setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
                        setAspectRatio("auto");
                        URL.revokeObjectURL(metadataUrl);
                    };
                    video.src = metadataUrl;

                    const defaultFragments = generateDefaultZoomFragments(duration);
                    setZoomFragments(defaultFragments);

                    setCurrentTime(0);
                    setIsPlaying(false);
                }

                if (persistedCamera && !prevClips.some(c => c.hasCamera)) {
                    const restoredCameraUrl = URL.createObjectURL(persistedCamera.blob);
                    setCameraUrl(restoredCameraUrl);
                    setCameraConfig(
                        persistedCamera.cameraConfig
                        ?? { ...DEFAULT_CAMERA_CONFIG, enabled: true }
                    );
                }

                showNewVideosBadge(0);
                clearHistory();
            }, 0);

            return updatedClips;
        });
    }, [clearHistory, showNewVideosBadge, setClipUrl]);

    const activeClipAtPlayhead = useMemo(
        () => getClipAtTime(videoClips, currentTime),
        [videoClips, currentTime]
    );

    const activeMediaAspect = useMemo(() => {
        if (!activeClipAtPlayhead?.width || !activeClipAtPlayhead?.height) return null;
        return activeClipAtPlayhead.width / activeClipAtPlayhead.height;
    }, [activeClipAtPlayhead]);

    const activeClipUrl = useMemo(() => {
        if (videoClips.length > 0) {
            if (activeClipAtPlayhead) {
                return videoUrlsMap.get(activeClipAtPlayhead.libraryVideoId) ?? videoUrl;
            }
            if (currentTime > 0) {

                const sorted = [...videoClips].sort((a, b) => a.startTime - b.startTime);
                const previous = sorted.reverse().find(c => c.startTime <= currentTime);
                if (previous) {
                    return videoUrlsMap.get(previous.libraryVideoId) ?? videoUrl;
                }
            }
        }
        return videoUrl;
    }, [activeClipAtPlayhead, videoUrl, videoUrlsMap, videoClips, currentTime]);

    // URL of the clip that contains the selected zoom fragment's start time.
    // Used by ZoomFragmentEditor so its preview shows the correct clip, not
    // just the one at the playhead.
    const zoomFragmentClipUrl = useMemo(() => {
        if (!selectedZoomFragment) return videoUrl;
        const clip = getClipAtTime(videoClips, selectedZoomFragment.startTime);
        return clip ? (videoUrlsMap.get(clip.libraryVideoId) ?? videoUrl) : videoUrl;
    }, [selectedZoomFragment, videoClips, videoUrlsMap, videoUrl]);

    // Dimensions of the clip that contains the selected zoom fragment, so the
    // preview aspect ratio matches the fragment's source video (not the
    // playhead clip which may differ in multi-clip projects).
    const zoomFragmentDimensions = useMemo(() => {
        if (!selectedZoomFragment) return videoDimensions;
        const clip = getClipAtTime(videoClips, selectedZoomFragment.startTime);
        if (clip && clip.width && clip.height) {
            return { width: clip.width, height: clip.height };
        }
        return videoDimensions;
    }, [selectedZoomFragment, videoClips, videoDimensions]);

    const commitClipLayout = useCallback((oldClips: VideoTrackClip[], newClips: VideoTrackClip[]) => {
        videoClipsRef.current = newClips;
        setVideoClips(newClips);

        const newDuration = calculateTotalDuration(newClips);
        setVideoDuration(newDuration);
        setTrimRange({ start: 0, end: newDuration });
        if (currentTimeRef.current > newDuration) setCurrentTime(newDuration);

        const remapped = remapOverlaysAfterClipChange({
            oldClips,
            newClips,
            zoomFragments: zoomFragmentsRef.current,
            zoomMovements,
            audioTracks,
            canvasElements,
            motionFragments: mockupMotionFragments,
        });
        setZoomFragments(remapped.zoomFragments);
        setZoomMovements(remapped.zoomMovements);
        setAudioTracks(remapped.audioTracks);
        setCanvasElements(remapped.canvasElements);
        setMockupMotionFragments(remapped.motionFragments);
    }, [zoomMovements, audioTracks, canvasElements, mockupMotionFragments, setZoomFragments, setZoomMovements, setAudioTracks, setCanvasElements, setMockupMotionFragments]);

    const handleUpdateVideoClip = useCallback((clipId: string, updates: Partial<VideoTrackClip>) => {
        const oldClips = videoClipsRef.current;
        const isTrim = updates.trimStart !== undefined || updates.trimEnd !== undefined;

        if (isTrim) {
            const newClips = rippleTrimClip(oldClips, clipId, {
                trimStart: updates.trimStart,
                trimEnd: updates.trimEnd,
            });
            commitClipLayout(oldClips, newClips);
            return;
        }

        let newClips = oldClips.map(c => (c.id === clipId ? { ...c, ...updates } : c));
        if (updates.startTime !== undefined) {
            newClips = resequenceClips([...newClips].sort((a, b) => a.startTime - b.startTime)).clips;
            commitClipLayout(oldClips, newClips);
        } else {
            videoClipsRef.current = newClips;
            setVideoClips(newClips);
        }
    }, [commitClipLayout]);

    const handleRestoreVideoClipTrim = useCallback((clipId: string | null, edge: TrimEdge = "both") => {
        const oldClips = videoClipsRef.current;
        const newClips = restoreClipTrim(oldClips, clipId, edge);
        if (newClips === oldClips) return;
        commitClipLayout(oldClips, newClips);
    }, [commitClipLayout]);

    const handleDeleteVideoClip = useCallback((clipId: string) => {
        const deletedClip = videoClipsRef.current.find(c => c.id === clipId);
        setVideoClips(prev => {
            // Re-sequence remaining clips to be contiguous (no gaps after deletion).
            const { clips: newClips } = resequenceClips(prev.filter(clip => clip.id !== clipId));
            if (newClips.length > 0) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });

                if (activeClipIdRef.current === clipId) {
                    const firstClip = [...newClips].sort((a, b) => a.startTime - b.startTime)[0];
                    activeClipIdRef.current = firstClip.id;
                    activeClipDataRef.current = firstClip;
                    const url = videoUrlsRef.current.get(firstClip.libraryVideoId);
                    if (url && videoRef.current) {
                        videoRef.current.src = url;
                        videoRef.current.currentTime = firstClip.trimStart;
                    }
                    if (url) {
                        setVideoUrl(url);
                        setVideoId(firstClip.libraryVideoId);
                    }
                    setCurrentTime(firstClip.startTime);
                }
            } else {
                setVideoUrl(null);
                setVideoId(null);
                setVideoDuration(0);
                setTrimRange({ start: 0, end: 0 });
                activeClipIdRef.current = null;
                activeClipDataRef.current = null;
                if (videoRef.current) {
                    videoRef.current.removeAttribute('src');
                }
            }
            return newClips;
        });

        // Remap all overlays (zoom, audio, elements, motion) to the new clip layout.
        if (deletedClip) {
            const oldClips = videoClipsRef.current;
            const newClips = resequenceClips(oldClips.filter(c => c.id !== clipId)).clips;
            const remapped = remapOverlaysAfterClipChange({
                oldClips, newClips,
                zoomFragments: zoomFragmentsRef.current,
                zoomMovements,
                audioTracks,
                canvasElements,
                motionFragments: mockupMotionFragments,
            });
            setZoomFragments(remapped.zoomFragments);
            setZoomMovements(remapped.zoomMovements);
            setAudioTracks(remapped.audioTracks);
            setCanvasElements(remapped.canvasElements);
            setMockupMotionFragments(remapped.motionFragments);
        }

        if (selectedVideoClipId === clipId) {
            setSelectedVideoClipId(null);
        }
    }, [selectedVideoClipId, zoomMovements, audioTracks, canvasElements, mockupMotionFragments, setZoomFragments, setZoomMovements, setAudioTracks, setCanvasElements, setMockupMotionFragments]);

    // Reorder clips: swap or insert dragged clip before/after target, then re-sequence.
    const handleReorderVideoClip = useCallback((draggedId: string, targetId: string, placeAfter: boolean) => {
        const oldClips = videoClipsRef.current;
        const { clips: newClips, offsetMap } = reorderVideoClipAt(oldClips, draggedId, targetId, placeAfter);
        if (offsetMap.size === 0) return;

        setVideoClips(newClips);
        const newDuration = calculateTotalDuration(newClips);
        setVideoDuration(newDuration);
        setTrimRange({ start: 0, end: newDuration });

        // Remap all overlays to the new clip layout.
        const remapped = remapOverlaysAfterClipChange({
            oldClips, newClips,
            zoomFragments: zoomFragmentsRef.current,
            zoomMovements,
            audioTracks,
            canvasElements,
            motionFragments: mockupMotionFragments,
        });
        setZoomFragments(remapped.zoomFragments);
        setZoomMovements(remapped.zoomMovements);
        setAudioTracks(remapped.audioTracks);
        setCanvasElements(remapped.canvasElements);
        setMockupMotionFragments(remapped.motionFragments);
    }, [zoomMovements, audioTracks, canvasElements, mockupMotionFragments, setZoomFragments, setZoomMovements, setAudioTracks, setCanvasElements, setMockupMotionFragments]);

    const handleSplitVideoClip = useCallback(() => {
        const clips = videoClipsRef.current;
        const clipAtPlayhead = getClipAtTime(clips, currentTimeRef.current);
        if (!clipAtPlayhead) return;
        const result = splitClipAtTime(clipAtPlayhead, currentTimeRef.current);
        if (!result) return;

        const { updatedClip, newClip } = result;

        setVideoClips(prev => {
            const next = prev.map(c => (c.id === updatedClip.id ? updatedClip : c));
            next.push(newClip);
            return next.sort((a, b) => a.startTime - b.startTime);
        });

        if (activeClipIdRef.current === updatedClip.id) {
            activeClipIdRef.current = newClip.id;
            activeClipDataRef.current = newClip;
        }

        setSelectedVideoClipId(newClip.id);
        setSelectedZoomFragmentId(null);
        setSelectedAudioTrackId(null);
        setSelectedElementId(null);
        setActiveTool("video");
    }, []);

    const canSplitClip =
        !!activeClipAtPlayhead && splitClipAtTime(activeClipAtPlayhead, currentTime) !== null;

    // Handler to remove video from track when deleted from library (cascade delete)
    const handleDeleteVideoFromLibrary = useCallback((libraryVideoId: string) => {
        setVideoClips(prev => {
            const filtered = prev.filter(clip => clip.libraryVideoId !== libraryVideoId);
            const newClips = filtered.length > 0 ? resequenceClips(filtered).clips : filtered;
            if (newClips.length > 0) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });

                const activeClip = prev.find(c => c.id === activeClipIdRef.current);
                if (activeClip && activeClip.libraryVideoId === libraryVideoId) {
                    const firstClip = [...newClips].sort((a, b) => a.startTime - b.startTime)[0];
                    activeClipIdRef.current = firstClip.id;
                    activeClipDataRef.current = firstClip;
                    const url = videoUrlsRef.current.get(firstClip.libraryVideoId);
                    if (url && videoRef.current) {
                        videoRef.current.src = url;
                        videoRef.current.currentTime = firstClip.trimStart;
                    }
                    if (url) {
                        setVideoUrl(url);
                        setVideoId(firstClip.libraryVideoId);
                    }
                    setCurrentTime(firstClip.startTime);
                }
            } else {
                setVideoUrl(null);
                setVideoId(null);
                setVideoDuration(0);
                setTrimRange({ start: 0, end: 0 });
                activeClipIdRef.current = null;
                activeClipDataRef.current = null;
                if (videoRef.current) {
                    videoRef.current.removeAttribute('src');
                    videoRef.current.load();
                }
                lastLoadedVideoIdRef.current = null;
                deleteRecordedVideo().catch(() => { });
                deleteUploadedVideo().catch(() => { });
            }
            return newClips;
        });
        // Clean up blob/URL refs
        videoBlobsRef.current.delete(libraryVideoId);
        deleteClipUrl(libraryVideoId);
    }, [deleteClipUrl]);

    // Handler for per-clip audio toggle from VideosMenu
    const handleVideoAudioToggle = useCallback((videoId: string, hasAudio: boolean) => {
        clipAudioStateRef.current.set(videoId, hasAudio);

        const activeClip = activeClipDataRef.current;
        if (activeClip && activeClip.libraryVideoId === videoId && videoRef.current) {
            videoRef.current.muted = muteOriginalAudioRef.current || !hasAudio;
        }
    }, []);

    // Handler to remove video from track (toggle) - removes clip only, not from library
    const handleRemoveVideoFromTrack = useCallback((libraryVideoId: string) => {
        setVideoClips(prev => {
            const newClips = prev.filter(clip => clip.libraryVideoId !== libraryVideoId);
            if (newClips.length > 0) {
                const newDuration = calculateTotalDuration(newClips);
                setVideoDuration(newDuration);
                setTrimRange({ start: 0, end: newDuration });
                const currentActiveId = activeClipIdRef.current;
                if (currentActiveId && !newClips.find(c => c.id === currentActiveId)) {
                    activeClipIdRef.current = newClips[0].id;
                }
            } else {
                setVideoUrl(null);
                setVideoId(null);
                setVideoDuration(0);
                setTrimRange({ start: 0, end: 0 });
                activeClipIdRef.current = null;
                activeClipDataRef.current = null;
            }
            return newClips;
        });
    }, []);

    const lastLoadedVideoIdRef = useRef<string | null>(null);

    // Load image from cache when in photo mode and create project if not exists
    useEffect(() => {
        if (!isPhotoMode) return;
        if (currentProject) return;
        if (isLoadingFromCacheRef.current) return;
        isLoadingFromCacheRef.current = true;

        const loadImage = async () => {
            try {
                const cachedImage = await getUploadedImage();
                if (cachedImage) {
                    await deleteUploadedImage();

                    const blob = cachedImage.blob;
                    const img = await createImageBitmap(blob);

                    const project = await createProject(
                        blob,
                        cachedImage.fileName || "Uploaded Image",
                        img.width,
                        img.height
                    );

                    if (project) {
                        setImageUrl(project.imageDataUrl);
                        setImageDimensions({ width: img.width, height: img.height });
                    }
                }
            } catch (error) {
                console.error("Error loading image from cache:", error);
            } finally {
                isLoadingFromCacheRef.current = false;
            }
        };

        loadImage();
    }, [isPhotoMode, currentProject, createProject]);

    useEffect(() => {
        if (isPhotoMode) return;
        const loadVideo = async () => {
            try {

                const savedProject = await getVideoProject();
                if (savedProject && savedProject.videoClips?.length > 0 && videoClipsRef.current.length === 0) {
                    isRestoringProjectRef.current = true;

                    const validClips: VideoTrackClip[] = [];
                    for (const clip of savedProject.videoClips) {
                        const libVideo = await getLibraryVideo(clip.libraryVideoId);
                        if (!libVideo) continue;
                        if (!videoBlobsRef.current.has(clip.libraryVideoId)) {
                            videoBlobsRef.current.set(clip.libraryVideoId, libVideo.blob);
                            const url = URL.createObjectURL(libVideo.blob);
                            setClipUrl(clip.libraryVideoId, url);
                        }
                        clipAudioStateRef.current.set(clip.libraryVideoId, libVideo.hasAudio !== false);
                        const clipUrl = videoUrlsRef.current.get(clip.libraryVideoId);
                        const realDuration = clipUrl ? await probeMediaDuration(clipUrl) : 0;
                        validClips.push(clampClipToRealDuration(clip, realDuration));
                    }

                    if (validClips.length > 0) {
                        const sorted = [...validClips].sort((a, b) => a.startTime - b.startTime);
                        const totalDuration = calculateTotalDuration(sorted);

                        setVideoClips(sorted);
                        setVideoDuration(totalDuration);

                        const persistedTrim = savedProject.trimRange ?? { start: 0, end: totalDuration };
                        const clampedStart = Math.max(0, Math.min(persistedTrim.start, totalDuration));
                        const clampedEnd = Math.max(clampedStart, Math.min(persistedTrim.end, totalDuration));
                        setTrimRange({ start: clampedStart, end: clampedEnd });

                        const firstClip = sorted[0];
                        activeClipIdRef.current = firstClip.id;
                        activeClipDataRef.current = firstClip;
                        const firstUrl = videoUrlsRef.current.get(firstClip.libraryVideoId);
                        if (firstUrl) {
                            setVideoUrl(firstUrl);
                            setVideoId(firstClip.libraryVideoId);
                            lastLoadedVideoIdRef.current = firstClip.libraryVideoId;
                            if (videoRef.current) {
                                videoRef.current.src = firstUrl;
                            }
                        }

                        // Restore full editor state from project snapshot
                        setBackgroundTab(savedProject.backgroundTab);
                        setSelectedWallpaper(savedProject.selectedWallpaper);
                        setBackgroundBlur(savedProject.backgroundBlur);
                        setSelectedImageUrl(savedProject.selectedImageUrl);
                        setUnsplashBgUrl(savedProject.unsplashBgUrl ?? "");
                        setBackgroundColorConfig(savedProject.backgroundColorConfig);
                        setPadding(savedProject.padding);
                        setRoundedCorners(savedProject.roundedCorners);
                        setShadows(savedProject.shadows);

                        // ── Bloque I.6: aspectRatio / customDimensions consistency ──
                        // Guard against stale or corrupt data: only accept
                        // customDimensions when aspectRatio === "custom", and
                        // require positive finite width/height. Otherwise fall
                        // back to the ratio's own dimensions (or null for
                        // non-custom ratios).
                        const persistedRatio = (savedProject.aspectRatio ?? "auto") as AspectRatio;
                        const persistedDims = savedProject.customDimensions;
                        const validCustom =
                            persistedRatio === "custom" &&
                            persistedDims != null &&
                            Number.isFinite(persistedDims.width) && persistedDims.width > 0 &&
                            Number.isFinite(persistedDims.height) && persistedDims.height > 0;
                        setAspectRatio(persistedRatio);
                        setCustomDimensions(validCustom ? persistedDims : null);

                        setCropArea(savedProject.cropArea);
                        setZoomFragments(savedProject.zoomFragments ?? []);
                        setZoomMovements(savedProject.zoomMovements ?? []);
                        setMockupId(savedProject.mockupId);
                        setMockupConfig(savedProject.mockupConfig);
                        setCanvasElements(savedProject.canvasElements ?? []);
                        setAudioTracks(savedProject.audioTracks ?? []);
                        setMuteOriginalAudio(savedProject.muteOriginalAudio ?? false);
                        setMasterVolume(savedProject.masterVolume ?? 1);
                        setCameraConfig(savedProject.cameraConfig ?? null);

                        if (savedProject.cameraVideoId) {
                            try {
                                const cameraBlob = await getCameraBlob(savedProject.cameraVideoId);
                                if (cameraBlob) {
                                    const restoredCameraUrl = URL.createObjectURL(cameraBlob.blob);
                                    setCameraUrl(restoredCameraUrl);
                                } else {
                                    setCameraUrl(null);
                                    setCameraConfig(null);
                                }
                            } catch (err) {
                                console.error("Failed to restore camera blob:", err);
                                setCameraUrl(null);
                            }
                        } else {
                            setCameraUrl(null);
                        }
                        setVideoTransform(savedProject.videoTransform);
                        setImageTransform(savedProject.imageTransform);
                        setApply3DToBackground(savedProject.apply3DToBackground);
                        setImageMaskConfig(savedProject.imageMaskConfig);
                        setVideoMaskConfig(savedProject.videoMaskConfig);
                        setImageZoomScale(savedProject.imageZoomScale ?? 1);
                        setMockupMotionFragments(savedProject.mockupMotionFragments ?? []);
                        setGlobalSpeed(savedProject.globalSpeed ?? 1);

                        // ── Bloque F: restore audio blobs from IndexedDB ────────
                        // Recreates UploadedAudio objects with fresh blob: URLs.
                        // Overwrites audioTracks/mute/volume with saved values
                        // if any audios were persisted.
                        if (savedProject.uploadedAudioIds?.length > 0) {
                            restoreAudios(
                                savedProject.uploadedAudioIds,
                                savedProject.audioTracks ?? [],
                                savedProject.muteOriginalAudio ?? false,
                                savedProject.masterVolume ?? 1,
                            );
                        }

                        setVideosLibraryRefresh(prev => prev + 1);
                        setTimeout(() => {
                            clearHistory();
                            isRestoringProjectRef.current = false;
                        }, 500);
                    } else {
                        isRestoringProjectRef.current = false;
                    }
                    return;
                }

                const persistedClips = await getVideoTrack();
                if (persistedClips !== null) {
                    if (persistedClips.length > 0 && videoClipsRef.current.length === 0) {
                        pendingLegacyMigrationRef.current = true;
                        const validClips: VideoTrackClip[] = [];
                        for (const clip of persistedClips) {
                            const libVideo = await getLibraryVideo(clip.libraryVideoId);
                            if (!libVideo) continue;
                            if (!videoBlobsRef.current.has(clip.libraryVideoId)) {
                                videoBlobsRef.current.set(clip.libraryVideoId, libVideo.blob);
                                const url = URL.createObjectURL(libVideo.blob);
                                setClipUrl(clip.libraryVideoId, url);
                            }
                            clipAudioStateRef.current.set(clip.libraryVideoId, libVideo.hasAudio !== false);
                            const clipUrl = videoUrlsRef.current.get(clip.libraryVideoId);
                            const realDuration = clipUrl ? await probeMediaDuration(clipUrl) : 0;
                            validClips.push(clampClipToRealDuration(clip, realDuration));
                        }

                        if (validClips.length > 0) {
                            const sorted = [...validClips].sort((a, b) => a.startTime - b.startTime);
                            setVideoClips(sorted);
                            const totalDuration = calculateTotalDuration(sorted);
                            setVideoDuration(totalDuration);
                            setTrimRange({ start: 0, end: totalDuration });

                            const firstClip = sorted[0];
                            activeClipIdRef.current = firstClip.id;
                            activeClipDataRef.current = firstClip;
                            const firstUrl = videoUrlsRef.current.get(firstClip.libraryVideoId);
                            if (firstUrl) {
                                setVideoUrl(firstUrl);
                                setVideoId(firstClip.libraryVideoId);
                                lastLoadedVideoIdRef.current = firstClip.libraryVideoId;
                                if (videoRef.current) {
                                    videoRef.current.src = firstUrl;
                                }
                            }
                            setZoomFragments(generateDefaultZoomFragments(totalDuration));
                            setVideosLibraryRefresh(prev => prev + 1);
                            setTimeout(() => clearHistory(), 200);
                        }
                    }
                    return;
                }

                const [uploadedData, recordedData, cachedUpload] = await Promise.all([
                    loadUploadedVideo(),
                    loadVideoFromIndexedDB(),
                    getUploadedVideo(),
                ]);
                let videoToLoad: typeof uploadedData | typeof recordedData = null;
                let resolvedBlob: Blob | null = null;

                if (uploadedData && recordedData) {
                    videoToLoad = uploadedData.timestamp > recordedData.timestamp ? uploadedData : recordedData;
                    if (uploadedData.timestamp > recordedData.timestamp && cachedUpload) {
                        resolvedBlob = cachedUpload.blob;
                    } else if ('blob' in recordedData && recordedData.blob) {
                        resolvedBlob = recordedData.blob;
                    }
                } else if (uploadedData) {
                    videoToLoad = uploadedData;
                    if (cachedUpload) {
                        resolvedBlob = cachedUpload.blob;
                    }
                } else if (recordedData) {
                    videoToLoad = recordedData;
                    if ('blob' in recordedData && recordedData.blob) {
                        resolvedBlob = recordedData.blob;
                    }
                }

                if (videoToLoad) {
                    if (lastLoadedVideoIdRef.current !== videoToLoad.videoId && videoClipsRef.current.length === 0) {
                        lastLoadedVideoIdRef.current = videoToLoad.videoId;

                        setVideoUrl(videoToLoad.url);
                        setVideoId(videoToLoad.videoId);
                        if (videoRef.current) {
                            videoRef.current.src = videoToLoad.url;
                        }
                        const probedDuration = await probeMediaDuration(videoToLoad.url);
                        const safeLoadDuration = probedDuration > 0 ? Math.min(videoToLoad.duration, probedDuration) : videoToLoad.duration;
                        setVideoDuration(safeLoadDuration);
                        setTrimRange({ start: 0, end: safeLoadDuration });
                        const defaultFragments = generateDefaultZoomFragments(safeLoadDuration);
                        setZoomFragments(defaultFragments);

                        if ('cameraUrl' in videoToLoad && videoToLoad.cameraUrl) {
                            setCameraUrl(videoToLoad.cameraUrl);
                        } else {
                            setCameraUrl(null);
                        }
                        if ('cameraConfig' in videoToLoad && videoToLoad.cameraConfig) {
                            setCameraConfig(videoToLoad.cameraConfig);
                        } else {
                            setCameraConfig(null);
                        }

                        if ('aspectRatio' in videoToLoad) {
                            setAspectRatio(videoToLoad.aspectRatio || "auto");
                        }

                        let resolvedWidth: number | undefined = 'width' in videoToLoad && videoToLoad.width ? (videoToLoad.width as number) : undefined;
                        let resolvedHeight: number | undefined = 'height' in videoToLoad && videoToLoad.height ? (videoToLoad.height as number) : undefined;
                        if (!resolvedWidth || !resolvedHeight) {
                            const probed = await probeMediaDimensions(videoToLoad.url);
                            resolvedWidth = probed?.width ?? resolvedWidth;
                            resolvedHeight = probed?.height ?? resolvedHeight;
                        }
                        if (resolvedWidth && resolvedHeight) {
                            setVideoDimensions({ width: resolvedWidth, height: resolvedHeight });
                        }

                        if (resolvedBlob && resolvedBlob.size > 0) {
                            setVideoBlob(resolvedBlob);

                            const fileName = 'fileName' in videoToLoad ? (videoToLoad.fileName as string) : `Recording-${videoToLoad.videoId}.webm`;
                            const width = resolvedWidth || 1920;
                            const height = resolvedHeight || 1080;

                            try {
                                let libraryVideo = await findExistingVideo(fileName, resolvedBlob.size);

                                if (!libraryVideo) {
                                    libraryVideo = await addVideoToLibraryWithMetadata({
                                        blob: resolvedBlob,
                                        fileName,
                                        duration: videoToLoad.duration,
                                        width,
                                        height,
                                    });
                                }

                                videoBlobsRef.current.set(libraryVideo.id, resolvedBlob);
                                setClipUrl(libraryVideo.id, videoToLoad.url);
                                const originalHasAudio = libraryVideo.originalHasAudio !== false;
                                clipAudioStateRef.current.set(libraryVideo.id, libraryVideo.hasAudio !== false);
                                setVideoHasAudioTrack(originalHasAudio);
                                if (!originalHasAudio) setMuteOriginalAudio(true);

                                const newClip: VideoTrackClip = {
                                    id: crypto.randomUUID(),
                                    libraryVideoId: libraryVideo.id,
                                    name: libraryVideo.fileName,
                                    startTime: 0,
                                    duration: safeLoadDuration,
                                    trimStart: 0,
                                    trimEnd: safeLoadDuration,
                                    thumbnailUrl: libraryVideo.thumbnailUrl,
                                    hasCamera: 'cameraUrl' in videoToLoad && !!videoToLoad.cameraUrl,
                                    width,
                                    height,
                                };

                                activeClipIdRef.current = newClip.id;
                                activeClipDataRef.current = newClip;

                                setVideoClips([newClip]);
                                setVideosLibraryRefresh(prev => prev + 1);
                            } catch (e) {
                                console.warn("Failed to add video to library:", e);
                            }
                        }

                        if ('isRecordedVideo' in videoToLoad && videoToLoad.isRecordedVideo) {
                            setIsRecordedVideo(true);
                        } else {
                            setIsRecordedVideo(false);
                        }

                        if ('cameraUrl' in videoToLoad && videoToLoad.cameraUrl) {
                            setCameraUrl(videoToLoad.cameraUrl);
                            const owningClipId = videoClipsRef.current.find(c => c.hasCamera)?.libraryVideoId
                                ?? activeClipDataRef.current?.libraryVideoId
                                ?? null;
                            if (owningClipId && 'cameraBlob' in videoToLoad && videoToLoad.cameraBlob) {
                                saveCameraBlob(
                                    owningClipId,
                                    videoToLoad.cameraBlob as Blob,
                                    "video/webm",
                                    'cameraConfig' in videoToLoad ? videoToLoad.cameraConfig : null,
                                )
                                    .catch(err => console.error("Failed to persist camera blob:", err));
                            }
                        } else {
                            setCameraUrl(null);
                        }
                        if ('cameraConfig' in videoToLoad && videoToLoad.cameraConfig) {
                            setCameraConfig(videoToLoad.cameraConfig);
                        } else {
                            setCameraConfig(null);
                        }

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
            if (!document.hidden && !isPhotoMode) {
                loadVideo();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [loadUploadedVideo, clearHistory, isPhotoMode, setClipUrl]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = muteOriginalAudio;
        }
    }, [muteOriginalAudio]);

    const togglePlayPause = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                const clips = videoClipsRef.current;
                if (clips.length > 0 && activeClipDataRef.current) {
                    const activeClip = activeClipDataRef.current;
                    const offsetInClip = videoRef.current.currentTime - activeClip.trimStart;
                    const timelineTime = activeClip.startTime + offsetInClip;
                    setCurrentTime(timelineTime);
                    syncAudioPlayback(timelineTime, false);
                } else {
                    syncAudioPlayback(currentTimeRef.current, false);
                }
            } else {
                const clips = videoClipsRef.current;
                let startTime = currentTimeRef.current;
                if (trimRange.end > 0) {
                    if (startTime < trimRange.start || startTime >= trimRange.end) {
                        startTime = trimRange.start;
                        setCurrentTime(startTime);
                    }
                }

                if (clips.length > 0) {
                    const clipAtTime = findActiveClipAtTime(startTime);
                    if (clipAtTime) {
                        if (clipAtTime.id !== activeClipIdRef.current) {
                            const url = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                            if (url && videoRef.current) {
                                activeClipIdRef.current = clipAtTime.id;
                                activeClipDataRef.current = clipAtTime;
                                videoRef.current.src = url;

                                const clipTime = timelineToClipTime(startTime, clipAtTime);
                                const onCanPlay = () => {
                                    if (videoRef.current) {
                                        videoRef.current.playbackRate = globalSpeedRef.current;
                                        videoRef.current.currentTime = clipTime;
                                        const clipHasAudio = clipAudioStateRef.current.get(clipAtTime.libraryVideoId);
                                        videoRef.current.muted = muteOriginalAudioRef.current || clipHasAudio === false;
                                        videoRef.current.play().catch(() => { });
                                        syncAudioPlayback(startTime, true);
                                    }
                                    videoRef.current?.removeEventListener('canplay', onCanPlay);
                                };
                                videoRef.current.addEventListener('canplay', onCanPlay);
                                setIsPlaying(true);
                                return;
                            }
                        } else {
                            activeClipIdRef.current = clipAtTime.id;
                            activeClipDataRef.current = clipAtTime;
                            const clipTime = timelineToClipTime(startTime, clipAtTime);
                            videoRef.current.currentTime = clipTime;
                        }
                    } else if (clips.length === 1) {
                        const clip = clips[0];
                        activeClipIdRef.current = clip.id;
                        activeClipDataRef.current = clip;
                        videoRef.current.currentTime = clip.trimStart;
                        setCurrentTime(clip.startTime);
                    }
                } else {
                    videoRef.current.currentTime = startTime;
                }

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (error.name !== 'AbortError') {
                            console.warn('Play interrupted:', error);
                        }
                    });
                }
                syncAudioPlayback(startTime, true);
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying, trimRange.start, trimRange.end, syncAudioPlayback, findActiveClipAtTime, timelineToClipTime]);

    const updateTimeSmoothRef = useRef<() => void>(() => { });
    const scheduleUpdateFrame = useCallback(() => {
        if (animationFrameRef.current !== null) {
            return;
        }
        animationFrameRef.current = requestAnimationFrame(() => {
            animationFrameRef.current = null;
            updateTimeSmoothRef.current();
        });
    }, []);

    useEffect(() => {
        updateTimeSmoothRef.current = () => {
            if (justEndedRef.current) return;
            if (isSwitchingClipRef.current) {
                if (isPlayingRef.current && !isDraggingPlayheadRef.current) {
                    scheduleUpdateFrame();
                }
                return;
            }

            if (videoRef.current && !isDraggingPlayheadRef.current) {
                const clips = videoClipsRef.current;

                if (clips.length > 0) {
                    const currentVideoTime = videoRef.current.currentTime;

                    let activeClip: VideoTrackClip | null = null;

                    if (activeClipDataRef.current && activeClipDataRef.current.id === activeClipIdRef.current) {
                        activeClip = activeClipDataRef.current;
                    } else {
                        const foundByIdActiveClip = clips.find(c => c.id === activeClipIdRef.current);

                        if (foundByIdActiveClip) {
                            activeClip = foundByIdActiveClip;
                        } else if (clips.length === 1) {
                            activeClip = clips[0];
                        } else {
                            activeClip = clips[0];
                        }
                    }

                    if (!activeClip) {
                        if (isPlayingRef.current && !isDraggingPlayheadRef.current) {
                            scheduleUpdateFrame();
                        }
                        return;
                    }

                    if (!isSwitchingClipRef.current && activeClipIdRef.current !== activeClip.id) {
                        activeClipIdRef.current = activeClip.id;
                        activeClipDataRef.current = activeClip;
                    }

                    if (clipSwitchTimeRef.current !== null) {
                        setCurrentTime(clipSwitchTimeRef.current);
                        if (isPlayingRef.current && !isDraggingPlayheadRef.current) {
                            scheduleUpdateFrame();
                        }
                        return;
                    }

                    if (activeClip) {
                        const offsetInClip = currentVideoTime - activeClip.trimStart;
                        const timelineTime = activeClip.startTime + offsetInClip;
                        const clipDuration = activeClip.trimEnd - activeClip.trimStart;
                        const clipEndOnTimeline = activeClip.startTime + clipDuration;

                        const reachedEndByTime = currentVideoTime >= activeClip.trimEnd;
                        const reachedEndByTimeline = timelineTime >= clipEndOnTimeline;

                        if (reachedEndByTime || reachedEndByTimeline) {
                            const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
                            const currentIndex = sortedClips.findIndex(c => c.id === activeClip!.id);
                            const nextClip = sortedClips[currentIndex + 1];

                            if (nextClip) {
                                let nextUrl = videoUrlsRef.current.get(nextClip.libraryVideoId);
                                const nextBlob = videoBlobsRef.current.get(nextClip.libraryVideoId);

                                // If the URL isn't preloaded yet but we have the blob, create one on the fly.
                                if (!nextUrl && nextBlob) {
                                    nextUrl = URL.createObjectURL(nextBlob);
                                    setClipUrl(nextClip.libraryVideoId, nextUrl);
                                }

                                if (nextUrl && videoRef.current) {
                                    const nextClipSnapshot = { ...nextClip };

                                    activeClipIdRef.current = nextClipSnapshot.id;
                                    activeClipDataRef.current = nextClipSnapshot;
                                    clipSwitchTimeRef.current = nextClipSnapshot.startTime;
                                    isSwitchingClipRef.current = true;

                                    const currentVideo = videoRef.current;
                                    currentVideo.pause();
                                    currentVideo.src = nextUrl;

                                    let switchTimeoutId: ReturnType<typeof setTimeout> | null = null;
                                    let pendingSeekedHandler: (() => void) | null = null;

                                    const cleanupSwitchListeners = () => {
                                        currentVideo.removeEventListener('canplay', onCanPlay);
                                        if (pendingSeekedHandler) {
                                            currentVideo.removeEventListener('seeked', pendingSeekedHandler);
                                            pendingSeekedHandler = null;
                                        }
                                        if (switchTimeoutId) {
                                            clearTimeout(switchTimeoutId);
                                            switchTimeoutId = null;
                                        }
                                    };

                                    const startPlayback = () => {
                                        cleanupSwitchListeners();
                                        clipSwitchTimeRef.current = null;
                                        isSwitchingClipRef.current = false;
                                        justEndedRef.current = false;
                                        currentVideo.playbackRate = globalSpeedRef.current;
                                        const nextClipHasAudio = clipAudioStateRef.current.get(nextClipSnapshot.libraryVideoId);
                                        currentVideo.muted = muteOriginalAudioRef.current || nextClipHasAudio === false;
                                        currentVideo.play().catch(e => {
                                            if (e.name !== 'AbortError') console.warn('Play interrupted:', e);
                                        });
                                        setIsPlaying(true);
                                        animationFrameRef.current = requestAnimationFrame(updateTimeSmoothRef.current);
                                    };

                                    const onCanPlay = () => {
                                        if (currentVideo) {
                                            const targetTime = nextClipSnapshot.trimStart;
                                            if (targetTime < 0.01) {
                                                currentVideo.currentTime = 0;
                                                startPlayback();
                                            } else {
                                                const onSeeked = () => {
                                                    pendingSeekedHandler = null;
                                                    startPlayback();
                                                };
                                                pendingSeekedHandler = onSeeked;
                                                currentVideo.addEventListener('seeked', onSeeked);
                                                currentVideo.currentTime = targetTime;
                                            }
                                        }
                                    };

                                    switchTimeoutId = setTimeout(() => {
                                        cleanupSwitchListeners();
                                        clipSwitchTimeRef.current = null;
                                        isSwitchingClipRef.current = false;
                                        // If enough data is available, try to play anyway; otherwise stop gracefully.
                                        if (currentVideo.readyState >= 2) {
                                            try {
                                                currentVideo.currentTime = Math.max(0, nextClipSnapshot.trimStart);
                                            } catch { /* ignore seek errors */ }
                                            startPlayback();
                                        } else {
                                            justEndedRef.current = true;
                                            setIsPlaying(false);
                                            setCurrentTime(nextClipSnapshot.startTime);
                                            setTimeout(() => { justEndedRef.current = false; }, 300);
                                        }
                                    }, 4000);

                                    currentVideo.addEventListener('canplay', onCanPlay);
                                    setCurrentTime(nextClipSnapshot.startTime);
                                    scheduleUpdateFrame();
                                    return;
                                } else {
                                    videoRef.current.pause();
                                    syncAudioPlaybackRef.current(clipEndOnTimeline, false);
                                    setIsPlaying(false);
                                    justEndedRef.current = true;
                                    setCurrentTime(clipEndOnTimeline);
                                    setTimeout(() => { justEndedRef.current = false; }, 300);
                                    return;
                                }
                            } else {
                                videoRef.current.pause();
                                syncAudioPlaybackRef.current(clipEndOnTimeline, false);
                                setIsPlaying(false);
                                justEndedRef.current = true;
                                setCurrentTime(clipEndOnTimeline);
                                setTimeout(() => { justEndedRef.current = false; }, 300);
                                return;
                            }
                        }

                        if (trimRangeRef.current.end > 0 && timelineTime >= trimRangeRef.current.end) {
                            videoRef.current.pause();
                            syncAudioPlaybackRef.current(timelineTime, false);
                            setIsPlaying(false);
                            justEndedRef.current = true;
                            setCurrentTime(trimRangeRef.current.end);
                            setTimeout(() => { justEndedRef.current = false; }, 300);
                            return;
                        }

                        setCurrentTimeThrottled(timelineTime);
                        syncAudioPlaybackRef.current(timelineTime, true);
                    }
                } else {
                    const currentVideoTime = videoRef.current.currentTime;

                    if (trimRangeRef.current.end > 0 && currentVideoTime >= trimRangeRef.current.end) {
                        videoRef.current.pause();
                        syncAudioPlaybackRef.current(currentVideoTime, false);
                        setIsPlaying(false);
                        justEndedRef.current = true;
                        setCurrentTime(trimRangeRef.current.end);
                        setTimeout(() => { justEndedRef.current = false; }, 300);
                        return;
                    }

                    setCurrentTimeThrottled(currentVideoTime);
                    syncAudioPlaybackRef.current(currentVideoTime, true);
                }
            }
            if (isPlayingRef.current && !isDraggingPlayheadRef.current) {
                scheduleUpdateFrame();
            }
        };
    }, [])

    // Start/stop animation frame loop based on playing state
    useEffect(() => {
        if (isPlaying && !isDraggingPlayhead) {
            scheduleUpdateFrame();
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

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current && !isPlaying && !justEndedRef.current && !isSeekingToClipRef.current) {
            const clips = videoClipsRef.current;
            if (clips.length > 0 && activeClipDataRef.current) {
                const activeClip = activeClipDataRef.current;
                const offsetInClip = videoRef.current.currentTime - activeClip.trimStart;
                const timelineTime = activeClip.startTime + offsetInClip;
                setCurrentTime(timelineTime);
            } else {
                setCurrentTime(videoRef.current.currentTime);
            }
        }
    }, [isPlaying]);

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

        // Always read from ref — scrubTime state may still be stale at this point
        const finalTime = scrubTimeRef.current;

        // Set playhead position immediately (prevents visual jump)
        setCurrentTime(finalTime);

        if (videoRef.current) {
            const clips = videoClipsRef.current;

            if (clips.length > 0) {
                const clipAtTime = findActiveClipAtTime(finalTime);

                if (clipAtTime) {
                    const clipTime = timelineToClipTime(finalTime, clipAtTime);

                    if (clipAtTime.id !== activeClipIdRef.current) {
                        const url = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                        const isSameSource = !!url && videoRef.current.src === url;
                        activeClipIdRef.current = clipAtTime.id;
                        activeClipDataRef.current = clipAtTime;

                        if (url && !isSameSource) {
                            activeClipIdRef.current = clipAtTime.id;
                            activeClipDataRef.current = clipAtTime;
                            isSeekingToClipRef.current = true;
                            const currentVideo = videoRef.current;
                            currentVideo.src = url;

                            const shouldPlay = wasPlayingBeforeDragRef.current;
                            const onCanPlay = () => {
                                if (currentVideo) {
                                    currentVideo.playbackRate = globalSpeedRef.current;
                                    currentVideo.currentTime = clipTime;
                                    const clipHasAudio = clipAudioStateRef.current.get(clipAtTime.libraryVideoId);
                                    currentVideo.muted = muteOriginalAudioRef.current || clipHasAudio === false;
                                    isSeekingToClipRef.current = false;
                                    if (shouldPlay) {
                                        currentVideo.play().catch(e => {
                                            if (e.name !== 'AbortError') console.warn('Play interrupted:', e);
                                        });
                                        setIsPlaying(true);
                                        syncAudioPlayback(finalTime, true);
                                    } else {
                                        syncAudioPlayback(finalTime, false);
                                    }
                                }
                                currentVideo?.removeEventListener('canplay', onCanPlay);
                            };
                            currentVideo.addEventListener('canplay', onCanPlay);
                            return;
                        }
                    } else {
                        videoRef.current.currentTime = clipTime;
                    }
                }
            } else {
                videoRef.current.currentTime = finalTime;
            }
        }

        if (wasPlayingBeforeDragRef.current && videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                        console.warn('Play interrupted:', error);
                    }
                });
            }
            setIsPlaying(true);
            syncAudioPlayback(finalTime, true);
        } else {
            syncAudioPlayback(finalTime, false);
        }
    }, [syncAudioPlayback, findActiveClipAtTime, timelineToClipTime]);

    const handleZoomChange = useCallback((zoom: number) => {
        setTimelineZoom(zoom);
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = globalSpeedRef.current;

            if (isExportingRef.current) return;

            const duration = videoRef.current.duration;
            const currentClips = videoClipsRef.current;
            const isMultiClip = currentClips.length > 1;

            if (isFinite(duration) && duration > 0 && !isMultiClip) {
                setVideoDuration(duration);
                setTrimRange(prev => prev.end === 0 ? { start: 0, end: duration } : prev);
            }

            const vw = videoRef.current.videoWidth;
            const vh = videoRef.current.videoHeight;
            if (vw > 0 && vh > 0 && !isMultiClip) {
                setVideoDimensions({ width: vw, height: vh });
            }
        }
    }, []);

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

    const pendingSeekCanPlayRef = useRef<{ video: HTMLVideoElement; handler: () => void } | null>(null);

    const handleSeek = useCallback((time: number) => {
        scrubTimeRef.current = time;
        setScrubTime(time);
        setCurrentTime(time);

        if (videoRef.current && !isDraggingPlayhead) {
            const clips = videoClipsRef.current;

            if (clips.length > 0) {
                const clipAtTime = findActiveClipAtTime(time);

                if (clipAtTime) {
                    const clipTime = timelineToClipTime(time, clipAtTime);
                    const currentUrl = videoRef.current.src;
                    const targetUrl = videoUrlsRef.current.get(clipAtTime.libraryVideoId);
                    const isDifferentSource = !!targetUrl && currentUrl !== targetUrl;

                    if (clipAtTime.id !== activeClipIdRef.current) {
                        activeClipIdRef.current = clipAtTime.id;
                        activeClipDataRef.current = clipAtTime;
                    }

                    if (isDifferentSource && targetUrl) {
                        const wasPlaying = isPlaying;
                        if (videoRef.current && !videoRef.current.paused) {
                            videoRef.current.pause();
                        }
                        if (animationFrameRef.current) {
                            cancelAnimationFrame(animationFrameRef.current);
                            animationFrameRef.current = null;
                        }
                        if (pendingSeekCanPlayRef.current) {
                            pendingSeekCanPlayRef.current.video.removeEventListener('canplay', pendingSeekCanPlayRef.current.handler);
                            pendingSeekCanPlayRef.current = null;
                        }
                        activeClipIdRef.current = clipAtTime.id;
                        activeClipDataRef.current = clipAtTime;
                        isSeekingToClipRef.current = true;
                        isSwitchingClipRef.current = true;
                        const currentVideo = videoRef.current;
                        currentVideo.src = targetUrl;
                        const onCanPlay = () => {
                            if (currentVideo) {
                                currentVideo.playbackRate = globalSpeedRef.current;
                                currentVideo.currentTime = clipTime;
                                const clipHasAudio = clipAudioStateRef.current.get(clipAtTime.libraryVideoId);
                                currentVideo.muted = muteOriginalAudioRef.current || clipHasAudio === false;
                                isSeekingToClipRef.current = false;
                                isSwitchingClipRef.current = false;
                                clipSwitchTimeRef.current = null;
                                if (wasPlaying) {
                                    currentVideo.play().catch(e => {
                                        if (e.name !== 'AbortError') console.warn('Play interrupted:', e);
                                    });
                                    scheduleUpdateFrame();
                                }
                            }
                            currentVideo?.removeEventListener('canplay', onCanPlay);
                            if (pendingSeekCanPlayRef.current?.handler === onCanPlay) {
                                pendingSeekCanPlayRef.current = null;
                            }
                        };
                        currentVideo.addEventListener('canplay', onCanPlay);
                        pendingSeekCanPlayRef.current = { video: currentVideo, handler: onCanPlay };
                        syncAudioPlayback(time, false);
                        return;
                    } else {
                        if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
                            videoRef.current.fastSeek(clipTime);
                        } else {
                            videoRef.current.currentTime = clipTime;
                        }
                    }
                }
            } else {
                if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
                    videoRef.current.fastSeek(time);
                } else {
                    videoRef.current.currentTime = time;
                }
            }
            syncAudioPlayback(time, isPlaying);
        }
    }, [isDraggingPlayhead, isPlaying, syncAudioPlayback, findActiveClipAtTime, timelineToClipTime, scheduleUpdateFrame]);

    const handleImageSelect = useCallback((url: string) => {
        if (backgroundTab === "wallpaper") setUnsplashBgUrl(url);
        else setSelectedImageUrl(url);
    }, [backgroundTab]);

    const handleWallpaperSelect = useCallback((index: number) => {
        setSelectedWallpaper(index);
        setUnsplashBgUrl("");
    }, []);

    // Background tab change handler
    const handleBackgroundTabChange = useCallback((tab: BackgroundTab) => setBackgroundTab(tab), []);

    // Handler para cambio de color/gradiente
    const handleBackgroundColorChange = useCallback((config: BackgroundColorConfig) => setBackgroundColorConfig(config), []);

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

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEditorShortcuts({
        handleUndo, handleRedo, canUndo, canRedo,
        activeTool, isPhotoMode,
        textToolActive, setTextToolActive,
        selectedElementId, setSelectedElementId, multiSelectedElementIds,
        deleteCanvasElement, copySelectedElement, copiedElements, pasteElement,
        selectedVideoClipId, setSelectedVideoClipId, handleDeleteVideoClip,
        selectedAudioTrackId, setSelectedAudioTrackId, handleDeleteAudioTrack,
        copySelectedAudioTrack, copiedAudioTrack, pasteAudioTrack,
        selectedZoomFragmentId, setSelectedZoomFragmentId, handleDeleteZoomFragment,
        copySelectedZoomFragment, copiedZoomFragment, pasteZoomFragment,
        selectedZoomMovementId, setSelectedZoomMovementId, handleDeleteZoomMovement,
        selectedMockupMotionFragmentId, setSelectedMockupMotionFragmentId, handleDeleteMockupMotionFragment,
        copySelectedMockupMotionFragment, copiedMockupMotionFragment, pasteMockupMotionFragment,
        lastCopyActionRef,
        handleImageUploadToCanvas, handleVideoUpload,
    });

    const wasMobileRef = useRef<boolean | null>(null);
    const otherSelectionActive = !!(selectedZoomFragmentId || selectedAudioTrackId || selectedVideoClipId || selectedMockupMotionFragmentId);

    useEffect(() => {
        const checkMobile = () => {
            const isMobile = window.innerWidth < 768;
            if (wasMobileRef.current === null) {
                wasMobileRef.current = isMobile;
                if (isMobile) setIsControlPanelOpen(false);
                return;
            }
            if (isMobile !== wasMobileRef.current) {
                wasMobileRef.current = isMobile;
                setIsControlPanelOpen(!isMobile);
            }
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const [currentPreviewThumbnail, setCurrentPreviewThumbnail] = useState<string | null>(null);
    const [zoomFragmentThumbnail, setZoomFragmentThumbnail] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            const thumbnail = getThumbnailForTime(currentDisplayTime)?.dataUrl ?? null;
            setCurrentPreviewThumbnail(thumbnail);
        }, 0);

        return () => clearTimeout(timer);
    }, [currentDisplayTime, getThumbnailForTime]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!selectedZoomFragment) {
                setZoomFragmentThumbnail(null);
                return;
            }
            const thumbnail = getThumbnailForTime(selectedZoomFragment.startTime)?.dataUrl ?? null;
            setZoomFragmentThumbnail(thumbnail);
        }, 0);

        return () => clearTimeout(timer);
    }, [selectedZoomFragment, getThumbnailForTime]);

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

    const handleVideoEnded = useCallback(() => {
        const clips = videoClipsRef.current;
        if (clips.length > 1) {
            const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
            const currentIndex = sortedClips.findIndex(c => c.id === activeClipIdRef.current);
            if (currentIndex >= 0 && currentIndex < sortedClips.length - 1) {
                return;
            }
        }
        setIsPlaying(false);
        justEndedRef.current = true;
        const endTime = trimRange.end > 0 ? trimRange.end : videoDuration;
        syncAudioPlayback(endTime, false);
        setCurrentTime(endTime);
        setTimeout(() => {
            justEndedRef.current = false;
        }, 300);
    }, [trimRange.end, videoDuration, syncAudioPlayback]);

    const autoSaveVideoProjectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const pendingLegacyMigrationRef = useRef<boolean>(false);
    const autoSaveVideoProject = useCallback(async () => {
        if (isPhotoMode) return;
        if (videoClips.length === 0) return;
        if (isRestoringProjectRef.current) return;

        if (autoSaveVideoProjectTimeoutRef.current) {
            clearTimeout(autoSaveVideoProjectTimeoutRef.current);
        }
        autoSaveVideoProjectTimeoutRef.current = setTimeout(async () => {
            try {
                const snapshot = buildVideoProjectSnapshot();
                await cleanupOrphanAudios(snapshot.uploadedAudioIds);
                await saveVideoProject(snapshot);

                if (pendingLegacyMigrationRef.current) {
                    pendingLegacyMigrationRef.current = false;
                    clearVideoTrack().catch(err =>
                        console.warn("Failed to clear legacy video-track after migration:", err)
                    );
                }
            } catch (error) {
                console.error("Video project auto-save failed:", error);
            }
        }, 1500);
    }, [isPhotoMode, videoClips, isRestoringProjectRef, buildVideoProjectSnapshot]);

    useEffect(() => {
        autoSaveVideoProject();
        return () => {
            if (autoSaveVideoProjectTimeoutRef.current) {
                clearTimeout(autoSaveVideoProjectTimeoutRef.current);
            }
        };
    }, [autoSaveVideoProject]);

    useEffect(() => {
        if (isPhotoMode) return;
        if (isRestoringProjectRef.current) return;
        if (videoClips.length > 0) return;

        const timer = setTimeout(() => {
            if (isRestoringProjectRef.current) return;
            if (videoClipsRef.current.length > 0) return;
            clearVideoProjectAndAudios().catch(err =>
                console.warn("Failed to clear video project on empty editor:", err)
            );
        }, 800);

        return () => clearTimeout(timer);
    }, [isPhotoMode, videoClips.length]);

    const layersPanelToolbar = useMemo(() => (
        <EditorTopBar
            onExport={handleExport}
            exportProgress={exportProgress}
            hasTransparentBackground={selectedWallpaper === -1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            editorMode={editorMode}
            onImageExport={handleImageExport}
            imageExportProgress={imageExportProgress}
            canvasWidth={customAspectRatio?.width || 1920}
            canvasHeight={customAspectRatio?.height || 1080}
        />
    ), [
        handleExport, exportProgress, selectedWallpaper, handleUndo, handleRedo,
        canUndo, canRedo, editorMode, handleImageExport, imageExportProgress,
        customAspectRatio?.width, customAspectRatio?.height,
    ]);

    // Only show camera if the active clip has camera support
    const shouldShowCamera = activeClipAtPlayhead
        ? activeClipAtPlayhead.hasCamera === true
        : !!cameraUrl;
    const effectiveCameraUrl = shouldShowCamera ? cameraUrl : null;

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground font-sans overflow-hidden select-none">
            <div className="flex flex-1 overflow-hidden">
                <div className="hidden lg:flex">
                    <ToolsSidebar
                        activeTool={activeTool}
                        onToolChange={setActiveTool}
                        onVideoUpload={handleVideoUpload}
                        isUploading={isUploading}
                        selectedZoomFragmentId={selectedZoomFragmentId}
                        selectedAudioTrackId={selectedAudioTrackId}
                        selectedVideoClipId={selectedVideoClipId}
                        selectedElementId={selectedElementId}
                        newVideosCount={newVideosCount}
                        editorMode={editorMode}
                        onImageUpload={handleImageUploadToCanvas}
                        onScreenCapture={handleScreenCapture}
                        isCapturing={isCapturing}
                        hasCamera={!!effectiveCameraUrl}
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
                                    <div className="w-[320px] h-screen bg-background border-r border-border flex items-center justify-center">
                                        <LoadingSpinner message="Cargando panel..." />
                                    </div>
                                }>
                                    <ControlPanel
                                        activeTool={activeTool}
                                        backgroundTab={backgroundTab}
                                        onVideoAudioToggle={handleVideoAudioToggle}
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
                                        selectedImageUrl={selectedImageUrl}
                                        unsplashBgUrl={unsplashBgUrl}
                                        onImageSelect={handleImageSelect}
                                        backgroundColorConfig={backgroundColorConfig}
                                        backgroundColorCss={backgroundColorCss}
                                        onBackgroundColorChange={handleBackgroundColorChange}
                                        onTogglePanel={() => setIsControlPanelOpen(!isControlPanelOpen)}
                                        isOpen={isControlPanelOpen}
                                        zoomFragments={zoomFragments}
                                        selectedZoomFragment={selectedZoomFragment}
                                        onSelectZoomFragment={handleSelectZoomFragment}
                                        onAddZoomFragment={() => handleAddZoomFragment(currentTime)}
                                        onUpdateZoomFragment={handleUpdateZoomFragment}
                                        onDeleteZoomFragment={handleDeleteZoomFragment}
                                        zoomMovements={zoomMovements}
                                        selectedZoomMovementId={selectedZoomMovementId}
                                        onSelectZoomMovement={handleSelectZoomMovement}
                                        onToggleZoomMovement={handleToggleZoomMovement}
                                        onAddZoomMovement={handleAddZoomMovement}
                                        onDeleteZoomMovement={handleDeleteZoomMovement}
                                        onUpdateZoomMovementPoint={(id, x, y) => handleUpdateZoomMovement(id, { focusX: x, focusY: y })}
                                        videoUrl={zoomFragmentClipUrl}
                                        videoThumbnail={zoomFragmentThumbnail}
                                        getThumbnailForTime={getThumbnailForTime}
                                        videoDimensions={zoomFragmentDimensions}
                                        mockupId={mockupId}
                                        mockupConfig={mockupConfig}
                                        onMockupChange={handleMockupChange}
                                        onMockupConfigChange={handleMockupConfigChange}
                                        initialMockupMenuPage={initialMockupMenuPage}
                                        mockupMenuNavigationToken={mockupMenuNavigationToken}
                                        onAddCanvasElement={addCanvasElement}
                                        selectedCanvasElement={selectedCanvasElement}
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
                                        onAddVideoToTrack={handleAddVideoToTrack}
                                        onRemoveVideoFromTrack={handleRemoveVideoFromTrack}
                                        onVideoUploadToLibrary={handleVideoUploadToLibrary}
                                        onVideoDeleteFromTrack={handleDeleteVideoFromLibrary}
                                        videosInTrackIds={videosInTrackIds}
                                        videosLibraryRefresh={videosLibraryRefresh}
                                        isVideoUploading={isUploading}
                                        cameraUrl={cameraUrl}
                                        cameraConfig={cameraConfig}
                                        onCameraConfigChange={handleCameraConfigChange}
                                        imageProjects={imageProjects}
                                        currentImageProjectId={currentProject?.id || null}
                                        isLoadingProjects={isLoadingProjects}
                                        onSelectImageProject={handleSelectImageProject}
                                        onAddImageToCanvas={handleAddImageToCanvas}
                                        onDeleteImageProject={handleDeleteImageProject}
                                        onUploadImageToHistory={handleUploadImageToHistory}
                                        elementsTextTabTrigger={elementsTextTabTrigger}
                                        mediaType={isPhotoMode ? "image" : "video"}
                                        wallpaperShowAll={wallpaperShowAll}
                                        onWallpaperShowAllChange={setWallpaperShowAll}
                                        globalSpeed={globalSpeed}
                                        onGlobalSpeedChange={handleGlobalSpeedChange}
                                        mockupMotionFragments={mockupMotionFragments}
                                        selectedMockupMotionFragment={selectedMockupMotionFragment}
                                        selectedMockupMotionFragmentId={selectedMockupMotionFragmentId}
                                        onAddOrReplaceMotionPreset={handleAddOrReplaceMotionPreset}
                                        onUpdateMockupMotionFragment={handleUpdateMockupMotionFragment}
                                        onSelectMockupMotionFragment={handleSelectMockupMotionFragment}
                                        onDeleteMockupMotionFragment={handleDeleteMockupMotionFragment}
                                        selectedAudioTrackId={selectedAudioTrackId}
                                        setSelectedAudioTrackId={handleSelectAudioTrack}
                                    />
                                </Suspense>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    ref={editorAreaRef}
                    className="flex-1 bg-background flex flex-col relative overflow-hidden min-w-0"
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
                                    className="absolute top-2 left-4 z-50 p-2 flex items-center gap-2 squircle-element bg-muted text-foreground border border-border hover:bg-accent transition-all duration-200 shadow-lg"
                                >
                                    <Link href="/" className="block sm:hidden"><Image src="/svg/logo-openvid.svg" alt="Logo" width={24} height={24} className="hover:opacity-80 transition-opacity" /></Link>
                                    <Icon icon="lucide:sidebar-open" width="20" className="hidden sm:block"
                                    />
                                </motion.button>
                            </TooltipAction>
                        )}
                    </AnimatePresence>

                    <VideoCanvas
                        activeTool={activeTool}
                        isPlaying={isPlaying}
                        onMockupClick={handleMockupClick}
                        isRestoringProjectRef={isRestoringProjectRef}
                        layersPanelToolbar={layersPanelToolbar}
                        ref={canvasRef}
                        videoUrl={videoUrl}
                        videoRef={videoRef}
                        mediaType={isPhotoMode ? "image" : "video"}
                        imageUrl={imageUrl}
                        imageRef={imageRef}
                        imageTransform={imageTransform}
                        apply3DToBackground={apply3DToBackground}
                        imageMaskConfig={imageMaskConfig}
                        videoMaskConfig={videoMaskConfig}
                        onVideoMaskConfigChange={setVideoMaskConfig}
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
                        isScrubbing={isDraggingPlayhead}
                        scrubTime={scrubTime}
                        getThumbnailForTime={getThumbnailForTime}
                        zoomFragments={zoomFragments}
                        currentTime={currentTime}
                        mockupId={mockupId}
                        mockupConfig={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                        onVideoUpload={handleVideoUpload}
                        onImageUpload={handleImageUploadToCanvas}
                        onImageDrop={handleImageDrop}
                        onVideoDrop={handleVideoDrop}
                        isUploading={isUploading}
                        videoTransform={videoTransform}
                        onVideoTransformChange={setVideoTransform}
                        canvasElements={canvasElements}
                        selectedElementId={selectedElementId}
                        onElementUpdate={updateCanvasElement}
                        onElementSelect={selectCanvasElement}
                        onElementDelete={deleteCanvasElement}
                        onSelectedElementIdsChange={setMultiSelectedElementIds}
                        onAddElement={addCanvasElement}
                        textToolActive={textToolActive}
                        onTextToolDeactivate={() => setTextToolActive(false)}
                        cameraUrl={effectiveCameraUrl}
                        cameraSourceUrl={cameraUrl}
                        cameraConfig={cameraConfig}
                        onCameraConfigChange={handleCameraConfigChange}
                        onCameraClick={handleCameraClick}
                        onEnded={handleVideoEnded}
                        activeMediaAspect={activeMediaAspect}
                        activeClipUrl={activeClipUrl}
                        onPaddingChange={setPadding}
                        imageZoomScale={imageZoomScale}
                        onImageZoomScaleChange={setImageZoomScale}
                        otherSelectionActive={otherSelectionActive}
                        mockupMotionFragments={mockupMotionFragments}
                        videoDuration={videoDuration}
                        onMockupConfigChange={handleMockupConfigChange}
                        selectedZoomFragment={selectedZoomFragment}
                        onUpdateZoomFragment={handleUpdateZoomFragment}
                        zoomMovements={zoomMovements}
                        selectedZoomMovementId={selectedZoomMovementId}
                        onSelectZoomMovement={handleSelectZoomMovement}
                        onUpdateZoomMovement={handleUpdateZoomMovement}
                        videoClips={videoClips}
                    />

                    {/* Video mode: Show player controls and timeline */}
                    {isVideoMode && (
                        <>
                            <Suspense fallback={<div className="h-13 border-b border-border" />}>
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
                                    videoMaskConfig={videoMaskConfig}
                                    onVideoMaskConfigChange={setVideoMaskConfig}
                                    videoPreviewImageUrl={currentPreviewThumbnail}
                                    onSplitClip={handleSplitVideoClip}
                                    canSplitClip={canSplitClip}
                                />

                            </Suspense>

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
                                    videoClips={videoClips}
                                    selectedVideoClipId={selectedVideoClipId}
                                    onSelectVideoClip={handleSelectVideoClip}
                                    onUpdateVideoClip={handleUpdateVideoClip}
                                    onDeleteVideoClip={handleDeleteVideoClip}
                                    onReorderVideoClip={handleReorderVideoClip}
                                    onRestoreVideoClipTrim={handleRestoreVideoClipTrim}
                                    zoomFragments={zoomFragments}
                                    selectedZoomFragmentId={selectedZoomFragmentId}
                                    onSelectZoomFragment={handleSelectZoomFragment}
                                    onAddZoomFragment={handleAddZoomFragmentAtRange}
                                    onUpdateZoomFragment={handleUpdateZoomFragment}
                                    onActivateZoomTool={handleActivateZoomTool}
                                    zoomMovements={zoomMovements}
                                    selectedZoomMovementId={selectedZoomMovementId}
                                    onSelectZoomMovement={handleSelectZoomMovement}
                                    onUpdateZoomMovement={handleUpdateZoomMovement}
                                    onDeleteZoomMovement={handleDeleteZoomMovement}
                                    onActivateMotionTool={handleActivateMotionTool}
                                    audioTracks={audioTracks}
                                    uploadedAudios={uploadedAudios}
                                    selectedAudioTrackId={selectedAudioTrackId}
                                    onSelectAudioTrack={handleSelectAudioTrack}
                                    onUpdateAudioTrack={handleUpdateAudioTrack}
                                    globalSpeed={globalSpeed}
                                    isPlaying={isPlaying}
                                    onZoomChange={handleZoomChange}
                                    mockupMotionFragments={mockupMotionFragments}
                                    selectedMockupMotionFragmentId={selectedMockupMotionFragmentId}
                                    onSelectMockupMotionFragment={handleSelectMockupMotionFragment}
                                    onUpdateMockupMotionFragment={handleUpdateMockupMotionFragment}
                                    onDeleteMockupMotionFragment={handleDeleteMockupMotionFragment}
                                    canvasElements={canvasElements}
                                    selectedElementId={selectedElementId}
                                    onSelectElement={selectCanvasElement}
                                    onUpdateElement={updateCanvasElement}
                                    onDeleteElement={deleteCanvasElement}
                                    onAddZoomMovementAtRange={(start, end) =>
                                        selectedZoomFragmentId && handleAddZoomMovementAtRange(selectedZoomFragmentId, start, end)
                                    }
                                />
                            </Suspense>
                        </>
                    )}

                    {/* Photo mode: Show placeholder instead of timeline */}
                    {isPhotoMode && (
                        <Suspense fallback={<TimelineSkeleton />}>
                            <PhotoEditorPlaceholder
                                canvasImageUrl={canvasImageUrl}
                                staticImageUrl={imageUrl}
                                onSelectPreview={handleSelectPreview}
                                selectedPreviewId={selectedPreviewId}
                                aspectRatio={aspectRatio}
                                onAspectRatioChange={handleAspectRatioChange}
                                customAspectRatio={customDimensions}
                                onCustomAspectRatioChange={handleCustomDimensionsChange}
                                onOpenCropper={handleOpenCropper}
                                apply3DToBackground={apply3DToBackground}
                                onToggle3DBackground={handleToggle3DBackground}
                                imageMaskConfig={imageMaskConfig}
                                onImageMaskConfigChange={setImageMaskConfig}
                                imageTransform={imageTransform}
                                onReset={handleResetPhotoEditor}
                            />
                        </Suspense>
                    )}

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
                selectedImageUrl={selectedImageUrl}
                unsplashBgUrl={unsplashBgUrl}
                onImageSelect={handleImageSelect}
                backgroundColorConfig={backgroundColorConfig}
                onBackgroundColorChange={handleBackgroundColorChange}
                zoomFragments={zoomFragments}
                selectedZoomFragment={selectedZoomFragment}
                onSelectZoomFragment={handleSelectZoomFragment}
                onAddZoomFragment={() => handleAddZoomFragment(currentTime)}
                onUpdateZoomFragment={handleUpdateZoomFragment}
                onDeleteZoomFragment={handleDeleteZoomFragment}
                videoUrl={zoomFragmentClipUrl}
                videoThumbnail={zoomFragmentThumbnail}
                getThumbnailForTime={getThumbnailForTime}
                videoDimensions={zoomFragmentDimensions}
                mockupId={mockupId}
                mockupConfig={mockupConfig}
                onMockupChange={handleMockupChange}
                onMockupConfigChange={handleMockupConfigChange}
                onAddCanvasElement={addCanvasElement}
                selectedCanvasElement={selectedCanvasElement}
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
                wallpaperShowAll={wallpaperShowAll}
                onWallpaperShowAllChange={setWallpaperShowAll}
            />

            <Suspense fallback={null}>
                <ExportOverlay
                    exportProgress={exportProgress}
                    onCancel={cancelExport}
                    isTransparentExport={selectedWallpaper === -1}
                />
            </Suspense>
            <ExportSuccessModal
                isOpen={showExportSuccess}
                onClose={() => setShowExportSuccess(false)}
                mediaType={exportSuccessMediaType}
            />
            <Suspense fallback={null}>
                {isVideoMode ? (
                    <VideoCropperModal
                        isOpen={isCropperOpen}
                        onClose={handleCloseCropper}
                        videoUrl={activeClipUrl}
                        onCropApply={handleCropApply}
                        initialCrop={cropArea}
                    />
                ) : (
                    <ImageCropperModal
                        isOpen={isCropperOpen}
                        onClose={handleCloseCropper}
                        imageUrl={imageUrl}
                        onCropApply={handleCropApply}
                        initialCrop={cropArea}
                    />
                )}
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
                    onConfirm={confirmAudioTrim}
                    onCancel={cancelAudioTrim}
                />
            )}
        </div>
    );
}