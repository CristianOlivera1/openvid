"use client";

import { useRef, useEffect, useImperativeHandle, useMemo, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import type { VideoCanvasHandle, VideoCanvasProps, VideoThumbnail } from "@/types";
import type { ImageElement } from "@/types/canvas-elements.types";
import { ASPECT_RATIO_DIMENSIONS } from "@/types";
import { getWallpaperUrl } from "@/lib/wallpaper.utils";
import { calculateScaledPadding, applyCanvasBackground, getAspectRatioStyle, getAspectRatioNumber, Corner, getCornerStyle, getNearestCorner, snapRotation, drawImageCover, getMockupOuterRadius, CORNER_SIGNS } from "@/lib/canvas.utils";
import { speedToTransitionMs, ZOOM_EASING, calculateZoomPhaseState, isOrbitalZoomFragment, zoomLevelToFactor } from "@/types/zoom.types";
import type { ZoomFragment } from "@/types/zoom.types";
import PlaceholderEditor from "../PlaceholderEditor";
import { MockupWrapper } from "./mockups/MockupWrapper";
import { DEFAULT_MOCKUP_CONFIG, type ImageDeviceId } from "@/types/mockup.types";
import { calculateSmoothZoom } from "@/lib/canvas.utils";
import { VIDEO_Z_INDEX } from "@/lib/constants";
import { applyPerspective3D, disposePerspective3D } from "@/lib/perspective3d";
import { RotationHandleIcon } from "@/components/ui/RotationHandleIcon";
import { CanvasElementsLayer, ElementResizeStart } from "./CanvasElementsLayer";
import { EditorHoverTooltip } from "./EditorHoverTooltip";
import { LayersPanel } from "./LayersPanel";
import { useMockup3dContext } from "@/app/contexts/Mockup3dContext";
import { PHONE_H, PHONE_W, DEVICE_3D_DIMENSIONS, DEVICE_VIEWER_DEFAULTS, PHONE_DEVICE_URLS } from "@/lib/phone3d.utils";
import { Viewer3DControls } from "@/lib/viewer-controls3d";
import { ControlsPopup } from "@/components/ui/ControlsPopup";
import { CanvasContextMenu } from "@/components/ui/CanvasContextMenu";
import { Viewer3DControlsBridge } from "@/components/ui/Viewer3DControlsBridge";
import { GetMediaMaskStyles } from "@/lib/media-mask.utils";
import { MediaContent } from "@/components/ui/MediaContent";
import { RotationGuideLine } from "@/components/ui/RotationGuideLine";
import { drawCameraOverlayToCtx } from "@/lib/camera-overlay.utils";
import DropMedia from "@/components/ui/DropMedia";
import { renderCanvasElements } from "@/lib/canvas-elements-render.utils";
import { drawMaskedImage } from "@/lib/masked-image-draw.utils";
import { drawMockupAndMedia, type MockupDrawContext } from "@/lib/mockup-media-draw.utils";
import { drawPhone3DCompositeWithZoom, type Phone3DCompositeContext } from "@/lib/phone3d-composite-draw.utils";
import { buildMockupMotionCss, MockupMotionTransform, REST_MOCKUP_MOTION, sampleCombinedMockupMotion } from "@/lib/mockup-motion";
import { Mockup3DFrame } from "./mockups-3d/Mockup3DFrame";

export type { VideoCanvasHandle, VideoCanvasProps };

const Phone3DViewer = dynamic(
    () => import("./mockups-3d/Phone3DViewer").then((m) => ({ default: m.Phone3DViewer })),
    { ssr: false }
);

const Laptop3DViewer = dynamic(
    () => import("./mockups-3d/Laptop3DViewer").then((m) => ({ default: m.Laptop3DViewer })),
    { ssr: false }
);

const IPhone13ProMax3DViewer = dynamic(
    () => import("./mockups-3d/IPhone13ProMax3DViewer").then((m) => ({ default: m.IPhone13ProMax3DViewer })),
    { ssr: false }
);

const DoubleIPhone3DViewer = dynamic(
    () => import("./mockups-3d/DoubleIPhone3DViewer").then((m) => ({ default: m.DoubleIPhone3DViewer })),
    { ssr: false }
);

const IPhone17ProMax3DViewer = dynamic(
    () => import("./mockups-3d/IPhone17ProMax3DViewer").then((m) => ({ default: m.IPhone17ProMax3DViewer })),
    { ssr: false }
);

const IPadMini63DViewer = dynamic(
    () => import("./mockups-3d/IPadMini63DViewer").then((m) => ({ default: m.IPadMini63DViewer })),
    { ssr: false }
);

function VideoCanvasInner({
    activeTool: _activeTool,
    mediaType = "video",
    isPlaying = false,
    imageUrl = null,
    imageRef,
    imageTransform,
    apply3DToBackground = false,
    imageMaskConfig,
    videoRef,
    videoUrl,
    padding,
    roundedCorners,
    shadows,
    aspectRatio = "auto",
    customAspectRatio,
    cropArea,
    backgroundTab = "wallpaper",
    selectedWallpaper = -1,
    backgroundBlur = 0,
    selectedImageUrl = "",
    unsplashOverrideUrl = "",
    backgroundColorCss,
    onTimeUpdate,
    onLoadedMetadata,
    onEnded,
    isScrubbing = false,
    scrubTime = 0,
    getThumbnailForTime,
    zoomFragments = [],
    currentTime = 0,
    mockupId = "none",
    mockupConfig,
    onVideoUpload,
    onImageUpload,
    onImageDrop,
    onVideoDrop,
    isUploading = false,
    videoTransform = { rotation: 0, translateX: 0, translateY: 0 },
    onVideoTransformChange,
    canvasElements = [],
    selectedElementId = null,
    onElementUpdate,
    onElementSelect,
    onElementDelete,
    cameraUrl = null,
    cameraConfig = null,
    onCameraConfigChange,
    onCameraClick,
    videoMaskConfig,
    layersPanelToolbar,
    textToolActive = false,
    onTextToolDeactivate,
    onAddElement,
    onMockupClick,
    isRestoringProjectRef,
    ref,
    activeMediaAspect = null,
    activeClipUrl = null,
    onPaddingChange,
    imageZoomScale = 1,
    onImageZoomScaleChange,
    otherSelectionActive = false,
    mockupMotionFragments = [],
    videoDuration = 0,
}: VideoCanvasProps & { ref?: React.Ref<VideoCanvasHandle> }) {
    const wallpaperUrl = getWallpaperUrl(selectedWallpaper);

    const hasMedia = mediaType === "video" ? !!videoUrl : !!imageUrl;

    // Motion 3D phone overlay state (reads from shared MotionContext)
    const {
        imagePhoneActive, imagePhoneX, imagePhoneY,
        imagePhoneScale, setImagePhoneScale,
        setImagePhoneX, setImagePhoneY,
        imagePhoneRotX, setImagePhoneRotX, imagePhoneRotY, setImagePhoneRotY,
        imagePhoneRotZ,
        imagePhoneDevice,
        imagePhoneOpening,
        imagePhoneShadow, imagePhoneShadowColor,
        imagePhoneRefWidth, setImagePhoneRefWidth
    } = useMockup3dContext();

    // 3D phone overlay is active in both video and image mode
    const handlePhoneMount = useCallback((canvas: HTMLCanvasElement) => {
        imagePhoneCanvasRef.current = canvas;
    }, []);

    const handlePhoneApi = useCallback((api: typeof imagePhoneApiRef.current) => {
        imagePhoneApiRef.current = api;
    }, []);

    const handlePhoneRotationChange = useCallback((rx: number, ry: number) => {
        setImagePhoneRotX(rx);
        setImagePhoneRotY(ry);
    }, [setImagePhoneRotX, setImagePhoneRotY]);
    // Ctrl+scroll zoom badge state for image phone overlay
    const [imagePhoneZoomVisible, setImagePhoneZoomVisible] = useState(false);
    const imagePhoneZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const paddingWheelRafRef = useRef<number | null>(null);
    const pendingPaddingRef = useRef<number | null>(null);
    const zoomWheelRafRef = useRef<number | null>(null);
    const pendingZoomRef = useRef<number | null>(null);
    useEffect(() => {
        return () => {
            if (paddingWheelRafRef.current !== null) {
                cancelAnimationFrame(paddingWheelRafRef.current);
            }
            if (zoomWheelRafRef.current !== null) {
                cancelAnimationFrame(zoomWheelRafRef.current);
            }
        };
    }, []);

    const ctrlScrollWheelRef = useRef<((e: WheelEvent) => void) | null>(null);
    const imagePhoneActiveRef = useRef(imagePhoneActive);
    useEffect(() => { imagePhoneActiveRef.current = imagePhoneActive; }, [imagePhoneActive]);
    const paddingRef = useRef(padding);
    useEffect(() => { paddingRef.current = padding; }, [padding]);
    // WebGL canvas from image phone Phone3DViewer, captured via onMount prop for export
    const imagePhoneCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const imagePhoneApiRef = useRef<{
        renderAt: (w: number, h: number) => void;
        restorePreview: () => void;
        hasBuiltInShadow?: boolean;
        getVisualSize?: () => { width: number; height: number; offsetY?: number } | null; // ← offsetY
    } | null>(null);
    const [activePhoneDevice, setActivePhoneDevice] = useState<ImageDeviceId | null>(null);
    const [phoneTransitioning, setPhoneTransitioning] = useState(false);
    const rafDragRef = useRef<number | null>(null);
    const pendingUpdateRef = useRef<{ id: string; x: number; y: number } | null>(null);
    const pendingMultiUpdatesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const imagePhoneModelUrl = PHONE_DEVICE_URLS[imagePhoneDevice];

    // Get current thumbnail for scrubbing preview
    const currentThumbnail = useMemo<VideoThumbnail | null>(() => {
        if (!isScrubbing || !getThumbnailForTime) return null;
        return getThumbnailForTime(scrubTime);
    }, [isScrubbing, scrubTime, getThumbnailForTime]);

    // Find active zoom fragment based on current time
    const activeZoomFragment = useMemo<ZoomFragment | null>(() => {
        if (!zoomFragments.length) return null;
        return zoomFragments.find(f => currentTime >= f.startTime && currentTime <= f.endTime) || null;
    }, [zoomFragments, currentTime]);

    // Calculate zoom transform for visual preview using 3-phase system
    const zoomTransform = useMemo(() => {
        // No active fragment - smooth exit to base scale
        if (!activeZoomFragment) {
            const lastFragment = zoomFragments
                .filter(f => f.endTime < currentTime)
                .sort((a, b) => b.endTime - a.endTime)[0];
            const exitMs = lastFragment ? speedToTransitionMs(lastFragment.speed) : speedToTransitionMs(3);
            return {
                scale: 1,
                translateX: 0,
                translateY: 0,
                transitionMs: exitMs,
                rotateX: 0,
                rotateY: 0,
                perspective: lastFragment?.enable3D ? 600 : 0,
                isMoving: false,
            };
        }

        const isOrbital = isOrbitalZoomFragment(activeZoomFragment);
        // Orbital focus is sampled directly from the backend trail. Its scale
        // must be sampled with the same curve as export; otherwise the 0 ms
        // focus transition makes the zoom-in snap to its final scale.
        const phaseState = calculateZoomPhaseState(activeZoomFragment, currentTime, isOrbital);
        const translateX = 50 - phaseState.focusX;
        const translateY = 50 - phaseState.focusY;

        // Backend orbital trails are sampled at the current video time. CSS
        // interpolation would lag behind the cursor and bend the trajectory,
        // so apply those frames directly. Manual A → B movement keeps its
        // lightweight linear transition during the hold phase.
        const isMoving = isOrbital || (activeZoomFragment.movementEnabled && phaseState.phase === 'hold');
        const transitionMs = isOrbital ? 0 : isMoving ? 50 : speedToTransitionMs(activeZoomFragment.speed);

        return {
            scale: phaseState.scale,
            translateX,
            translateY,
            transitionMs,
            rotateX: phaseState.rotateX,
            rotateY: phaseState.rotateY,
            perspective: phaseState.perspective,
            isMoving,
        };
    }, [activeZoomFragment, zoomFragments, currentTime]);

    const shouldShowUnsplashOverride = backgroundTab === "wallpaper" && unsplashOverrideUrl !== "";
    const shouldShowWallpaper = backgroundTab === "wallpaper" && selectedWallpaper >= 0 && !shouldShowUnsplashOverride;
    const shouldShowCustomImage = backgroundTab === "image" && selectedImageUrl !== "";
    const shouldShowCustomColor = backgroundTab === "color" && !!backgroundColorCss;

    const exportCanvasRef = useRef<HTMLCanvasElement>(null);
    // Foreground canvas — used to render the mockup in isolation so that the
    // WebGL 3D perspective is applied only to the mockup, not to the background.
    const foregroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskCompositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const wallpaperImageRef = useRef<HTMLImageElement | null>(null);
    const customImageRef = useRef<HTMLImageElement | null>(null);
    const videoMaskContentCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoMaskAlphaCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
    const shadowCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement; offsetX: number; offsetY: number } | null>(null);

    const exportDimensions = useMemo(() => {
        if ((aspectRatio === "auto" || aspectRatio === "custom") && customAspectRatio) {
            return { width: customAspectRatio.width, height: customAspectRatio.height };
        }
        // Otherwise use standard dimensions
        const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
        return dims || { width: 1920, height: 1080 };
    }, [aspectRatio, customAspectRatio]);

    // On-canvas controls state
    const [isVideoHovered, setIsVideoHovered] = useState(false);
    const [isVideoSelected, setIsVideoSelected] = useState(false);

    // Intrinsic aspect ratio of the actual media (video/image), used to size
    // the "none" mockup container to the real letterboxed contain-box instead
    // of the full available area.
    const [mediaAspect, setMediaAspect] = useState<number | null>(null);
    const lastSetVideoUrlRef = useRef<string | null>(null);
    const lastLogicalUrlRef = useRef<string | null>(null);

    const currentTimePropRef = useRef(currentTime);
    useEffect(() => { currentTimePropRef.current = currentTime; }, [currentTime]);

    const isPlayingPropRef = useRef(isPlaying);
    useEffect(() => { isPlayingPropRef.current = isPlaying; }, [isPlaying]);
    const imagePhoneRescaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cameraDragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        rect: DOMRect;
    } | null>(null);
    const [isDraggingCamera, setIsDraggingCamera] = useState(false);

    // Canvas elements controls state
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [isDraggingElementRotation, setIsDraggingElementRotation] = useState(false);
    const [isDraggingElementResize, setIsDraggingElementResize] = useState(false);
    const elementResizeStart = useRef<ElementResizeStart | null>(null);
    const elementDragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0, initialRotation: 0 });
    // Positions of ALL selected elements captured once at drag-start (stable ref, never updated during drag)
    const multiDragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    // When clicking a multi-selected element, track potential collapse to single (cleared on actual drag)
    const pendingCollapseRef = useRef<string | null>(null);
    const wasDragRef = useRef(false);
    const pendingVideoCollapseRef = useRef(false);
    const pendingElementsCollapseRef = useRef(false);

    // Drag & drop state for images (photo mode only)
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Inline text editing (Figma-style)
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    // Multi-select and canvas right-click context menu
    const [canvasSelectedIds, setCanvasSelectedIds] = useState<string[]>([]);
    const [canvasCtxMenu, setCanvasCtxMenu] = useState<{ x: number; y: number; isVideo?: boolean } | null>(null);
    const [videoContainerSize, setVideoContainerSize] = useState({ width: 0, height: 0 });

    // Reset lastSetVideoUrlRef when mockupId changes to force src re-assignment on remount
    useEffect(() => {
        lastSetVideoUrlRef.current = null;
    }, [mockupId]);

    const [prevOtherSelectionActive, setPrevOtherSelectionActive] = useState(otherSelectionActive);
    if (otherSelectionActive !== prevOtherSelectionActive) {
        setPrevOtherSelectionActive(otherSelectionActive);
        if (otherSelectionActive) {
            setIsVideoSelected(false);
            setCanvasSelectedIds([]);
        }
    }
    useEffect(() => {
        const targetUrl = activeClipUrl ?? videoUrl;
        if (videoRef.current && targetUrl) {
            const videoEl = videoRef.current;
            const videoSrc = videoEl.src;
            const needsSrc = !videoSrc || videoSrc === '' || videoSrc === window.location.href;
            const isNewAssignment = targetUrl !== lastSetVideoUrlRef.current;

            if (needsSrc || isNewAssignment) {
                const isSameLogicalContent = targetUrl === lastLogicalUrlRef.current;

                videoEl.src = targetUrl;
                lastSetVideoUrlRef.current = targetUrl;

                if (isSameLogicalContent) {
                    videoEl.currentTime = currentTimePropRef.current;
                    if (isPlayingPropRef.current) {
                        videoEl.play().catch(() => {
                        });
                    }
                }

                lastLogicalUrlRef.current = targetUrl;
            }
        }
        if (!videoUrl && !activeClipUrl) {
            lastSetVideoUrlRef.current = null;
            lastLogicalUrlRef.current = null;
        }
    }, [videoUrl, activeClipUrl, videoRef, mockupId]);

    // Track the real intrinsic aspect ratio of the video so the "none"
    useEffect(() => {
        if (mediaType !== "video" || activeMediaAspect) return;
        const video = videoRef.current;
        if (!video) return;
        const updateAspect = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                setMediaAspect(video.videoWidth / video.videoHeight);
            }
        };
        updateAspect();
        video.addEventListener("loadedmetadata", updateAspect);
        return () => video.removeEventListener("loadedmetadata", updateAspect);
    }, [mediaType, videoRef, videoUrl, activeMediaAspect]);

    // Same, for image mode.
    useEffect(() => {
        if (mediaType !== "image") return;
        const img = imageRef?.current;
        if (!img) return;
        const updateAspect = () => {
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setMediaAspect(img.naturalWidth / img.naturalHeight);
            }
        };
        updateAspect();
        img.addEventListener("load", updateAspect);
        return () => img.removeEventListener("load", updateAspect);
    }, [mediaType, imageRef, imageUrl]);

    // Dispose Three.js WebGL resources when component unmounts
    useEffect(() => {
        return () => {
            disposePerspective3D();
        };
    }, []);

    const [isDraggingVideo, setIsDraggingVideo] = useState(false);
    const [isDraggingRotation, setIsDraggingRotation] = useState(false);
    const [videoHoverCorner, setVideoHoverCorner] = useState<Corner | null>("top-right");
    const dragStartPos = useRef({ x: 0, y: 0, initialRotation: 0, initialTranslateX: 0, initialTranslateY: 0 });
    const rotationCenterRef = useRef<{ x: number; y: number } | null>(null);
    const rotationStartAngleRef = useRef<number>(0);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const clickStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const CLICK_THRESHOLD = 5;
    const [elementCorners, setElementCorners] = useState<Record<string, Corner | null>>({});

    const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);

    const mockupBoxRef = useRef<HTMLDivElement>(null);
    const mockupContentRef = useRef<HTMLDivElement>(null);
    const [contentInsets, setContentInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

    useEffect(() => {
        ctrlScrollWheelRef.current = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            if (imagePhoneActiveRef.current) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setImagePhoneScale(prev => Math.max(0.3, Math.min(3, prev * (e.deltaY < 0 ? 1.05 : 0.95))));
                setImagePhoneZoomVisible(true);
                if (imagePhoneZoomTimerRef.current) clearTimeout(imagePhoneZoomTimerRef.current);
                imagePhoneZoomTimerRef.current = setTimeout(() => setImagePhoneZoomVisible(false), 1200);
                return;
            }
            if (mediaType === "video" && onPaddingChange) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const PADDING_MIN = 0;
                const PADDING_MAX = 30;
                const base = pendingPaddingRef.current ?? paddingRef.current;
                const step = Math.min(1.5, Math.max(0.15, Math.abs(e.deltaY) * 0.015));
                const next = Math.max(PADDING_MIN, Math.min(PADDING_MAX, base + (e.deltaY < 0 ? -step : step)));
                pendingPaddingRef.current = next;
                if (paddingWheelRafRef.current === null) {
                    paddingWheelRafRef.current = requestAnimationFrame(() => {
                        if (pendingPaddingRef.current !== null) {
                            onPaddingChange(pendingPaddingRef.current);
                        }
                        paddingWheelRafRef.current = null;
                    });
                }
            }
        };
    }, [mediaType, onPaddingChange, setImagePhoneScale]);

    useEffect(() => {
        const el = previewContainerRef.current;
        if (!el) return;
        // Stable wrapper delegates to the always-fresh ref
        const handler = (e: WheelEvent) => ctrlScrollWheelRef.current?.(e);
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // attach once — ctrlScrollWheelRef.current updated each render

    const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        const arNumber = getAspectRatioNumber(aspectRatio, customAspectRatio ?? undefined);

        const computeDims = (containerWidth: number, containerHeight: number) => {
            if (containerWidth <= 0 || containerHeight <= 0) return null;
            const byHeight = { width: containerHeight * arNumber, height: containerHeight };
            if (byHeight.width <= containerWidth) return byHeight;
            return { width: containerWidth, height: containerWidth / arNumber };
        };

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            const dims = computeDims(width, height);
            if (dims) setCanvasDimensions(dims);
        });
        observer.observe(wrapper);

        const rect = wrapper.getBoundingClientRect();
        const initialDims = computeDims(rect.width, rect.height);
        if (initialDims) setCanvasDimensions(initialDims);

        return () => observer.disconnect();
    }, [aspectRatio, customAspectRatio]);

    const deviceDefaults = DEVICE_VIEWER_DEFAULTS[imagePhoneDevice] ?? { environment: "studio", glow: 1.0 };

    const [viewer3D, setViewer3D] = useState<Viewer3DControls>({
        autoRotate: false,
        rotationSpeed: 3.5,
        glow: deviceDefaults.glow,
        environment: deviceDefaults.environment,
    });

    const prevAspectKeyRef = useRef<string | null>(null);
    const pendingAspectRescaleRef = useRef(false);

    useEffect(() => {
        const key = `${aspectRatio}:${customAspectRatio?.width ?? ""}x${customAspectRatio?.height ?? ""}`;
        if (prevAspectKeyRef.current !== null && prevAspectKeyRef.current !== key) {
            pendingAspectRescaleRef.current = true;
        }
        prevAspectKeyRef.current = key;
    }, [aspectRatio, customAspectRatio]);

    useEffect(() => {
        if (!canvasDimensions) return;
        if (isRestoringProjectRef?.current) return;

        if (imagePhoneRescaleTimerRef.current) {
            clearTimeout(imagePhoneRescaleTimerRef.current);
        }

        imagePhoneRescaleTimerRef.current = setTimeout(() => {
            if (isRestoringProjectRef?.current) return;

            if (!pendingAspectRescaleRef.current) {
                if (imagePhoneRefWidth === 0 || Math.abs(canvasDimensions.width - imagePhoneRefWidth) > 0.5) {
                    setImagePhoneRefWidth(canvasDimensions.width);
                }
                return;
            }

            pendingAspectRescaleRef.current = false;
            if (imagePhoneRefWidth > 0 && Math.abs(canvasDimensions.width - imagePhoneRefWidth) > 0.5) {
                const ratio = canvasDimensions.width / imagePhoneRefWidth;
                setImagePhoneX(prev => prev * ratio);
                setImagePhoneY(prev => prev * ratio);
                setImagePhoneScale(prev => prev * ratio);
            }
            setImagePhoneRefWidth(canvasDimensions.width);
        }, 300);

        return () => {
            if (imagePhoneRescaleTimerRef.current) {
                clearTimeout(imagePhoneRescaleTimerRef.current);
            }
        };
    }, [canvasDimensions, imagePhoneRefWidth, isRestoringProjectRef, setImagePhoneX, setImagePhoneY, setImagePhoneScale, setImagePhoneRefWidth]);

    useEffect(() => {
        const container = videoContainerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(([entry]) => {
            setVideoContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);
    // Smart guides state for element alignment
    const [alignmentGuides, setAlignmentGuides] = useState<{
        vertical: number[];
        horizontal: number[];
    }>({ vertical: [], horizontal: [] });

    // Smart guides state for mockup/video alignment
    const [mockupAlignmentGuides, setMockupAlignmentGuides] = useState<{
        vertical: number[];
        horizontal: number[];
    }>({ vertical: [], horizontal: [] });

    const [rotationGuide, setRotationGuide] = useState<{
        centerX: number;
        centerY: number;
        angle: number;
        snapped: boolean;
    } | null>(null);

    // Wrapper for onElementSelect that also deselects the mockup/video
    const handleElementSelect = useCallback((id: string | null, preserveVideoSelection: boolean = false) => {
        if (id !== null && !preserveVideoSelection) {
            setIsVideoSelected(false);
        }
        if (onElementSelect) onElementSelect(id);
    }, [onElementSelect]);

    const handleLayersSelect = useCallback((id: string | null) => {
        handleElementSelect(id);
    }, [handleElementSelect]);

    const handleLayersMultiSelect = useCallback((ids: string[]) => {
        setCanvasSelectedIds(ids);
        if (ids.length >= 1) handleElementSelect(ids[0]);
        else handleElementSelect(null);
    }, [handleElementSelect]);

    const handleLayersDelete = useCallback((idOrIds: string | string[]) => {
        if (onElementDelete) onElementDelete(idOrIds);
    }, [onElementDelete]);

    const handleLayersReorder = useCallback((frontIds: string[], backIds: string[]) => {
        frontIds.forEach((id, pos) => {
            if (onElementUpdate) onElementUpdate(id, { zIndex: VIDEO_Z_INDEX + frontIds.length - pos });
        });
        backIds.forEach((id, pos) => {
            if (onElementUpdate) onElementUpdate(id, { zIndex: Math.max(1, VIDEO_Z_INDEX - 1 - pos) });
        });
    }, [onElementUpdate]);

    const handleLayersSetGroupId = useCallback((id: string, groupId: string | undefined) => {
        if (onElementUpdate) onElementUpdate(id, { groupId });
    }, [onElementUpdate]);

    const handleLayersToggleVisible = useCallback((id: string, visible: boolean) => {
        if (onElementUpdate) onElementUpdate(id, { visible });
    }, [onElementUpdate]);

    const handleLayersToggleLock = useCallback((id: string, locked: boolean) => {
        if (onElementUpdate) onElementUpdate(id, { locked });
    }, [onElementUpdate]);

    const handleLayersBringToFront = useCallback((id: string) => {
        const maxZ = Math.max(...canvasElements.map(e => e.zIndex), VIDEO_Z_INDEX);
        if (onElementUpdate) onElementUpdate(id, { zIndex: maxZ + 1 });
    }, [canvasElements, onElementUpdate]);

    const handleLayersSendToBack = useCallback((id: string) => {
        const el = canvasElements.find(e => e.id === id);
        if (!el || !onElementUpdate) return;
        if (el.zIndex >= VIDEO_Z_INDEX) {
            onElementUpdate(id, { zIndex: VIDEO_Z_INDEX - 1 });
        } else {
            const minZ = Math.min(...canvasElements.map(e => e.zIndex));
            onElementUpdate(id, { zIndex: Math.max(1, minZ - 1) });
        }
    }, [canvasElements, onElementUpdate]);

    const handleLayersGroup = useCallback((ids: string[]) => {
        const newGroupId = crypto.randomUUID();
        ids.forEach(id => { if (onElementUpdate) onElementUpdate(id, { groupId: newGroupId }); });
    }, [onElementUpdate]);

    const handleLayersUngroup = useCallback((ids: string[]) => {
        const groupIds = new Set(
            ids.map(id => canvasElements.find(e => e.id === id)?.groupId).filter(Boolean)
        );
        canvasElements
            .filter(e => e.groupId && groupIds.has(e.groupId))
            .forEach(e => { if (onElementUpdate) onElementUpdate(e.id, { groupId: undefined }); });
    }, [canvasElements, onElementUpdate]);

    const handleVideoLayerSelect = useCallback(() => {
        handleElementSelect(null);
        setCanvasSelectedIds([]);
        setIsVideoSelected(true);
    }, [handleElementSelect]);

    useEffect(() => {
        if (!canvasCtxMenu) return;
        const close = (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest("[data-canvas-ctx-menu]")) return;
            setCanvasCtxMenu(null);
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [!!canvasCtxMenu]); // eslint-disable-line react-hooks/exhaustive-deps

    const maskStyles = useMemo(() => {
        const config = mediaType === "video" ? videoMaskConfig : imageMaskConfig;
        return GetMediaMaskStyles(config);
    }, [mediaType, videoMaskConfig, imageMaskConfig]);

    const hasMask = Object.keys(maskStyles).length > 0;
    const hasMockup = mockupId && mockupId !== "none";

    const hasMockup2DMotion = mediaType === "video" && !imagePhoneActive && mockupMotionFragments.length > 0;

    const mockupMotionPreview = useMemo<MockupMotionTransform>(
        () => hasMockup2DMotion ? sampleCombinedMockupMotion(mockupMotionFragments, currentTime) : REST_MOCKUP_MOTION,
        [hasMockup2DMotion, mockupMotionFragments, currentTime]
    );

    // Effective aspect ratio for the "none" mockup contain-box, adjusted for
    // any active crop — mirrors the same math used in drawFrame's computeContainer.
    const effectiveMediaAspect = mediaType === "video" ? (activeMediaAspect ?? mediaAspect) : mediaAspect;

    const mediaContainAspect = useMemo(() => {
        if (!effectiveMediaAspect) return null;
        if (cropArea && (cropArea.width < 100 || cropArea.height < 100)) {
            return effectiveMediaAspect * (cropArea.width / cropArea.height);
        }
        return effectiveMediaAspect;
    }, [effectiveMediaAspect, cropArea]);

    const effectivePhoneMaskConfig = useMemo(() => {
        return mediaType === "video" ? videoMaskConfig : imageMaskConfig;
    }, [mediaType, videoMaskConfig, imageMaskConfig]);

    const elementImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const svgImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

    useEffect(() => {
        const canvas = exportCanvasRef.current;
        if (canvas) {
            canvas.width = exportDimensions.width;
            canvas.height = exportDimensions.height;
        }
    }, [exportDimensions]);

    useEffect(() => {
        if (shouldShowWallpaper && wallpaperUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = wallpaperUrl;
            img.onload = () => {
                wallpaperImageRef.current = img;
            };
        } else {
            wallpaperImageRef.current = null;
        }
    }, [shouldShowWallpaper, wallpaperUrl]);

    const imageUrlToLoad = shouldShowCustomImage ? selectedImageUrl : shouldShowUnsplashOverride ? unsplashOverrideUrl : null;
    useEffect(() => {
        if (imageUrlToLoad) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrlToLoad;
            img.onload = () => {
                customImageRef.current = img;
            };
        } else {
            customImageRef.current = null;
        }
    }, [imageUrlToLoad]);

    const [prevImagePhoneActive, setPrevImagePhoneActive] = useState(imagePhoneActive);
    if (imagePhoneActive !== prevImagePhoneActive) {
        setPrevImagePhoneActive(imagePhoneActive);
        if (!imagePhoneActive) setActivePhoneDevice(null);
    }

    useEffect(() => {
        if (!imagePhoneActive) return;
        if (imagePhoneDevice === activePhoneDevice) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- inicia una transición temporizada real (setTimeout), no es sincronización directa de prop
        setPhoneTransitioning(true);
        setActivePhoneDevice(null);
        const id = setTimeout(() => {
            setActivePhoneDevice(imagePhoneDevice);
            setPhoneTransitioning(false);
        }, 50);
        return () => clearTimeout(id);
    }, [imagePhoneDevice, imagePhoneActive]);

    useEffect(() => {
        const cache = elementImagesRef.current;
        const loadedPaths = new Set(cache.keys());
        const currentPaths = new Set(
            canvasElements
                .filter((el): el is ImageElement => el.type === "image")
                .map(el => el.imagePath)
        );

        for (const path of loadedPaths) {
            if (!currentPaths.has(path)) {
                cache.delete(path);
            }
        }

        for (const element of canvasElements) {
            if (element.type === "image") {
                const imageElement = element as ImageElement;
                if (!cache.has(imageElement.imagePath)) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";

                    img.onload = () => {
                        cache.set(imageElement.imagePath, img);
                    };

                    img.onerror = () => {
                        console.error(`Failed to load canvas element image: ${imageElement.imagePath}`);
                    };

                    img.src = imageElement.imagePath;
                }
            }
        }
    }, [canvasElements]);

    useEffect(() => {
        if (!isDraggingVideo && !isDraggingRotation) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!onVideoTransformChange) return;

            if (isDraggingRotation) {
                const center = rotationCenterRef.current;
                if (!center) return;

                const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
                let deltaAngle = currentAngle - rotationStartAngleRef.current;
                if (deltaAngle > 180) deltaAngle -= 360;
                if (deltaAngle < -180) deltaAngle += 360;

                const rawRotation = dragStartPos.current.initialRotation + deltaAngle;
                const { angle: finalRotation, snapped } = snapRotation(rawRotation);

                onVideoTransformChange({ ...videoTransform, rotation: finalRotation });
                setRotationGuide({ centerX: center.x, centerY: center.y, angle: finalRotation, snapped });
            } else if (isDraggingVideo) {
                const deltaX = e.clientX - dragStartPos.current.x;
                const deltaY = e.clientY - dragStartPos.current.y;
                const container = videoContainerRef.current;
                if (!container) return;

                const width = container.offsetWidth;
                const height = container.offsetHeight;
                if (width <= 0 || height <= 0) return;

                const percentX = (deltaX / width) * 100;
                const percentY = (deltaY / height) * 100;

                let newTranslateX = dragStartPos.current.initialTranslateX + percentX;
                let newTranslateY = dragStartPos.current.initialTranslateY + percentY;

                const SNAP_THRESHOLD = 2;
                const centerX = 0;
                const centerY = 0;
                const guides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

                if (Math.abs(newTranslateX - centerX) < SNAP_THRESHOLD) {
                    newTranslateX = centerX;
                    guides.vertical.push(50);
                }

                if (Math.abs(newTranslateY - centerY) < SNAP_THRESHOLD) {
                    newTranslateY = centerY;
                    guides.horizontal.push(50);
                }

                if (
                    guides.vertical.length !== alignmentGuides.vertical.length ||
                    guides.horizontal.length !== alignmentGuides.horizontal.length
                ) {
                    setMockupAlignmentGuides(guides);

                }

                onVideoTransformChange({
                    ...videoTransform,
                    translateX: newTranslateX,
                    translateY: newTranslateY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingVideo(false);
            setIsDraggingRotation(false);
            setMockupAlignmentGuides({ vertical: [], horizontal: [] });
            setRotationGuide(null);
            rotationCenterRef.current = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingVideo, isDraggingRotation, videoTransform, onVideoTransformChange]);

    // Camera overlay: load src when cameraUrl changes
    useEffect(() => {
        const el = cameraVideoRef.current;
        if (!el) return;
        if (!cameraUrl) {
            if (el.src) {
                el.pause();
                el.removeAttribute("src");
                el.load();
            }
            return;
        }
        if (el.src !== cameraUrl) {
            el.src = cameraUrl;
            el.load();
        }
    }, [cameraUrl]);

    // Camera overlay: sync playback with main video (time, play/pause, seek)
    useEffect(() => {
        const mainVideo = videoRef.current;
        const camVideo = cameraVideoRef.current;
        if (!mainVideo || !camVideo || !cameraUrl) return;

        const syncTime = () => {
            if (!camVideo.seeking && Math.abs(camVideo.currentTime - mainVideo.currentTime) > 0.15) {
                try {
                    camVideo.currentTime = mainVideo.currentTime;
                } catch {
                    // ignore seek errors on not-yet-ready video
                }
            }
        };
        const syncPlay = () => {
            camVideo.play().catch(() => undefined);
        };
        const syncPause = () => {
            if (!camVideo.paused) camVideo.pause();
        };

        mainVideo.addEventListener("play", syncPlay);
        mainVideo.addEventListener("pause", syncPause);
        mainVideo.addEventListener("seeked", syncTime);
        mainVideo.addEventListener("timeupdate", syncTime);

        return () => {
            mainVideo.removeEventListener("play", syncPlay);
            mainVideo.removeEventListener("pause", syncPause);
            mainVideo.removeEventListener("seeked", syncTime);
            mainVideo.removeEventListener("timeupdate", syncTime);
        };
    }, [videoRef, cameraUrl]);

    // Capture start positions of all selected elements ONCE when drag begins
    useEffect(() => {
        if (!isDraggingElement) return;
        const snapshot = new Map<string, { x: number; y: number }>();
        canvasSelectedIds.forEach((id) => {
            const el = canvasElements.find((e) => e.id === id);
            if (el) snapshot.set(id, { x: el.x, y: el.y });
        });
        multiDragStartRef.current = snapshot;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDraggingElement]); // intentionally only fires when drag state changes

    // Canvas elements drag & drop handlers
    useEffect(() => {
        if (!isDraggingElement && !isDraggingElementRotation) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!onElementUpdate) return;

            if (isDraggingElementRotation) {
                if (!selectedElementId) return;
                const selectedElement = canvasElements.find(el => el.id === selectedElementId);
                if (!selectedElement) return;
                const container = canvasContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width * (selectedElement.x / 100);
                const centerY = rect.top + rect.height * (selectedElement.y / 100);
                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
                const startAngle = Math.atan2(
                    elementDragStart.current.y - centerY,
                    elementDragStart.current.x - centerX
                ) * (180 / Math.PI);
                let deltaAngle = currentAngle - startAngle;
                if (deltaAngle > 180) deltaAngle -= 360;
                if (deltaAngle < -180) deltaAngle += 360;

                const rawRotation = elementDragStart.current.initialRotation + deltaAngle;
                const { angle: finalRotation, snapped } = snapRotation(rawRotation);

                onElementUpdate(selectedElementId, { rotation: finalRotation });
                setRotationGuide({ centerX, centerY, angle: finalRotation, snapped });
            } else if (isDraggingElement) {
                const container = canvasContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const deltaX = e.clientX - elementDragStart.current.x;
                const deltaY = e.clientY - elementDragStart.current.y;

                if (!wasDragRef.current && Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;
                wasDragRef.current = true;
                pendingCollapseRef.current = null;
                pendingVideoCollapseRef.current = false;

                const percentX = (deltaX / rect.width) * 100;
                const percentY = (deltaY / rect.height) * 100;

                const combinedWithVideo = isVideoSelected && canvasSelectedIds.length >= 1;

                if (canvasSelectedIds.length > 1 || combinedWithVideo) {
                    multiDragStartRef.current.forEach((startPos, id) => {
                        const el = canvasElements.find(e => e.id === id);
                        if (!el || el.locked) return;
                        const newX = Math.max(0, Math.min(100, startPos.x + percentX));
                        const newY = Math.max(0, Math.min(100, startPos.y + percentY));
                        pendingMultiUpdatesRef.current.set(id, { x: newX, y: newY });
                    });
                    if (!rafDragRef.current) {
                        rafDragRef.current = requestAnimationFrame(() => {
                            if (onElementUpdate) {
                                pendingMultiUpdatesRef.current.forEach((pos, elId) => onElementUpdate(elId, pos));
                            }
                            pendingMultiUpdatesRef.current.clear();
                            rafDragRef.current = null;
                        });
                    }
                } else if (selectedElementId) {
                    let newX = Math.max(0, Math.min(100, elementDragStart.current.initialX + percentX));
                    let newY = Math.max(0, Math.min(100, elementDragStart.current.initialY + percentY));

                    const SNAP_THRESHOLD = 2;
                    const centerX = 50;
                    const centerY = 50;
                    const guides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

                    if (Math.abs(newX - centerX) < SNAP_THRESHOLD) {
                        newX = centerX;
                        guides.vertical.push(centerX);
                    }

                    if (Math.abs(newY - centerY) < SNAP_THRESHOLD) {
                        newY = centerY;
                        guides.horizontal.push(centerY);
                    }

                    if (
                        guides.vertical.length !== alignmentGuides.vertical.length ||
                        guides.horizontal.length !== alignmentGuides.horizontal.length
                    ) {
                        setAlignmentGuides(guides);
                    }

                    pendingUpdateRef.current = { id: selectedElementId, x: newX, y: newY };
                    if (!rafDragRef.current) {
                        rafDragRef.current = requestAnimationFrame(() => {
                            const pending = pendingUpdateRef.current;
                            if (pending && onElementUpdate) {
                                onElementUpdate(pending.id, { x: pending.x, y: pending.y });
                            }
                            rafDragRef.current = null;
                        });
                    }
                }
            }
        };

        const handleMouseUp = () => {
            if (pendingCollapseRef.current && !wasDragRef.current) {
                const id = pendingCollapseRef.current;
                setCanvasSelectedIds([id]);
                if (pendingVideoCollapseRef.current) setIsVideoSelected(false);
            }
            if (pendingElementsCollapseRef.current && !wasDragRef.current) {
                setCanvasSelectedIds([]);
                if (onElementSelect) onElementSelect(null);
            }
            pendingCollapseRef.current = null;
            pendingVideoCollapseRef.current = false;
            pendingElementsCollapseRef.current = false;
            wasDragRef.current = false;

            if (rafDragRef.current) {
                cancelAnimationFrame(rafDragRef.current);
                rafDragRef.current = null;
                if (pendingUpdateRef.current && onElementUpdate) {
                    const { id, x, y } = pendingUpdateRef.current;
                    onElementUpdate(id, { x, y });
                }
                pendingUpdateRef.current = null;
                if (onElementUpdate) {
                    pendingMultiUpdatesRef.current.forEach((pos, elId) => onElementUpdate(elId, pos));
                }
                pendingMultiUpdatesRef.current.clear();
            }

            setIsDraggingElement(false);
            setIsDraggingElementRotation(false);
            setAlignmentGuides({ vertical: [], horizontal: [] });
            setRotationGuide(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingElement, isDraggingElementRotation, selectedElementId, canvasElements, canvasSelectedIds, isVideoSelected, onElementUpdate,]);

    useEffect(() => {
        if (!isDraggingElementResize) return;

        const handleMouseMove = (e: MouseEvent) => {
            const start = elementResizeStart.current;
            const container = canvasContainerRef.current;
            if (!start || !container || !onElementUpdate) return;

            const rect = container.getBoundingClientRect();
            const refSize = Math.min(rect.width, rect.height);
            if (refSize <= 0) return;

            const rad = (start.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const [dragSignX, dragSignY] = CORNER_SIGNS[start.corner];
            const anchorSignX = -dragSignX;
            const anchorSignY = -dragSignY;

            const centerX0 = (start.centerXPercent / 100) * rect.width;
            const centerY0 = (start.centerYPercent / 100) * rect.height;

            const anchorLocalX0 = anchorSignX * (start.width / 2);
            const anchorLocalY0 = anchorSignY * (start.height / 2);
            const anchorWorldX = centerX0 + (anchorLocalX0 * cos - anchorLocalY0 * sin);
            const anchorWorldY = centerY0 + (anchorLocalX0 * sin + anchorLocalY0 * cos);

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldDeltaX = mouseX - anchorWorldX;
            const worldDeltaY = mouseY - anchorWorldY;

            const localDeltaX = worldDeltaX * cos + worldDeltaY * sin;
            const localDeltaY = -worldDeltaX * sin + worldDeltaY * cos;

            const scaleX = Math.abs(localDeltaX) / start.width;
            const scaleY = Math.abs(localDeltaY) / start.height;
            const scale = Math.max(0.05, Math.max(scaleX, scaleY));

            const newWidth = start.width * scale;
            const newHeight = start.height * scale;

            const newAnchorLocalX = anchorSignX * (newWidth / 2);
            const newAnchorLocalY = anchorSignY * (newHeight / 2);

            const newCenterX = anchorWorldX - (newAnchorLocalX * cos - newAnchorLocalY * sin);
            const newCenterY = anchorWorldY - (newAnchorLocalX * sin + newAnchorLocalY * cos);

            const newXPercent = (newCenterX / rect.width) * 100;
            const newYPercent = (newCenterY / rect.height) * 100;

            if (start.isText) {
                onElementUpdate(start.id, {
                    x: newXPercent,
                    y: newYPercent,
                    fontSize: Math.max(6, start.fontSize * scale),
                    width: (newWidth / refSize) * 100,
                    height: (newHeight / refSize) * 100,
                });
            } else {
                onElementUpdate(start.id, {
                    x: newXPercent,
                    y: newYPercent,
                    width: (newWidth / refSize) * 100,
                    height: (newHeight / refSize) * 100,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingElementResize(false);
            elementResizeStart.current = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingElementResize, onElementUpdate]);

    // Image zoom with mouse wheel (photo mode only) — controlado desde el padre
    useEffect(() => {
        if (mediaType !== "image" || !imageUrl || imagePhoneActive || !onImageZoomScaleChange) return;
        const handleWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const delta = -e.deltaY;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;
            const base = pendingZoomRef.current ?? imageZoomScale;
            const next = Math.max(0.5, Math.min(3, base * zoomFactor));
            pendingZoomRef.current = next;
            if (zoomWheelRafRef.current === null) {
                zoomWheelRafRef.current = requestAnimationFrame(() => {
                    if (pendingZoomRef.current !== null) {
                        onImageZoomScaleChange(pendingZoomRef.current);
                    }
                    zoomWheelRafRef.current = null;
                });
            }
        };
        const container = previewContainerRef.current;
        if (!container) return;
        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
            pendingZoomRef.current = null;
        };
    }, [mediaType, imageUrl, imagePhoneActive, onImageZoomScaleChange, imageZoomScale]);

    // Drag & drop handlers for images
    const handleDragOver = (e: React.DragEvent) => {
        const dropHandler = mediaType === "video" ? onVideoDrop : onImageDrop;
        if (!dropHandler) return;
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        const dropHandler = mediaType === "video" ? onVideoDrop : onImageDrop;
        if (!dropHandler) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        const dropHandler = mediaType === "video" ? onVideoDrop : onImageDrop;
        if (!dropHandler) return;
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            dropHandler(files);
        }
    };

    // Function to draw a frame on the export canvas
    const drawFrame = async (highQuality: boolean = true, explicitTimelineTime?: number) => {
        const canvas = exportCanvasRef.current;
        const canvasCtxOptions: CanvasRenderingContext2DSettings = { alpha: true, colorSpace: 'srgb', desynchronized: false, willReadFrequently: false };
        const ctx = canvas?.getContext('2d', canvasCtxOptions);
        const video = videoRef.current;
        const image = imageRef?.current;
        const mediaSource = mediaType === "image" ? image : video;

        if (!canvas || !ctx || !mediaSource) return;

        const sourceWidth = mediaType === "image" ? (image?.naturalWidth ?? 0) : (video?.videoWidth ?? 0);
        const sourceHeight = mediaType === "image" ? (image?.naturalHeight ?? 0) : (video?.videoHeight ?? 0);
        if (sourceWidth === 0 || sourceHeight === 0) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const paddingPercent = padding * 0.5 / 100;

        const scaledPaddingX = calculateScaledPadding(canvasWidth, paddingPercent);
        const scaledPaddingY = calculateScaledPadding(canvasWidth, paddingPercent);
        const canvasLongSide = Math.max(canvasWidth, canvasHeight);
        const scaledRadius = roundedCorners * (canvasLongSide / 896);
        const scaledShadowBlur = shadows * (canvasLongSide / 896) * 0.8;

        const frameTime = mediaType === "video" ? (explicitTimelineTime ?? (video ? video.currentTime : 0)) : 0;

        const mockupMotionForFrame: MockupMotionTransform | undefined = hasMockup2DMotion
            ? sampleCombinedMockupMotion(mockupMotionFragments, frameTime)
            : undefined;

        const mockupDrawCtx: MockupDrawContext = {
            videoTransform, imageTransform, apply3DToBackground, imageZoomScale, shadows,
            mockupId, mockupConfig, mediaType, cropArea, sourceWidth, sourceHeight,
            canvasWidth, canvasHeight, scaledRadius, scaledShadowBlur, shadowCacheRef,
            mockupMotion: mockupMotionForFrame,
        };

        const phone3dCtx: Phone3DCompositeContext = {
            imagePhoneCanvasRef, imagePhoneApiRef, canvasDimensions, imagePhoneDevice,
            imagePhoneScale, imagePhoneX, imagePhoneY, imagePhoneShadow, imagePhoneShadowColor,
            effectivePhoneMaskConfig, maskCompositeCanvasRef,
        };

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const zoomState = calculateSmoothZoom(frameTime, zoomFragments);
        const zoomCenterX = canvasWidth / 2;
        const zoomCenterY = canvasHeight / 2;
        const backgroundImage = (shouldShowCustomImage || shouldShowUnsplashOverride) ? customImageRef.current : (shouldShowWallpaper ? wallpaperImageRef.current : null);

        // Shared helper: draw background into any 2D context
        const drawBg = (c: CanvasRenderingContext2D) => {
            if (shouldShowCustomColor && backgroundColorCss) {
                applyCanvasBackground(c, backgroundColorCss, canvasWidth, canvasHeight);
            } else if (backgroundImage) {
                c.save();
                if (backgroundBlur > 0) {
                    c.filter = `blur(${backgroundBlur * 0.8}px)`;
                    const overflow = backgroundBlur * 2;
                    drawImageCover(c, backgroundImage, -overflow, -overflow, canvasWidth + overflow * 2, canvasHeight + overflow * 2);
                } else {
                    drawImageCover(c, backgroundImage, 0, 0, canvasWidth, canvasHeight);
                }
                c.restore();
            }
        };

        // Shared helper: compute container dimensions
        const computeContainer = () => {
            const availableWidth = canvasWidth - scaledPaddingX * 2;
            const availableHeight = canvasHeight - scaledPaddingY * 2;
            let mSrcW = sourceWidth;
            let mSrcH = sourceHeight;

            if (cropArea && (cropArea.width < 100 || cropArea.height < 100)) {
                mSrcW = (cropArea.width / 100) * sourceWidth;
                mSrcH = (cropArea.height / 100) * sourceHeight;
            }
            const mAR = mSrcW / mSrcH;
            const aAR = availableWidth / availableHeight;
            let cW: number, cH: number;
            if (mAR > aAR) {
                cW = availableWidth;
                cH = availableWidth / mAR;
            } else {
                cH = availableHeight;
                cW = availableHeight * mAR;
            }
            const cX = scaledPaddingX + (availableWidth - cW) / 2;
            const cY = scaledPaddingY + (availableHeight - cH) / 2;
            return { containerX: cX, containerY: cY, containerWidth: cW, containerHeight: cH };
        };

        if (mediaType === "image") {
            ctx.save();
            if (imageTransform && apply3DToBackground) {
                ctx.translate(zoomCenterX, zoomCenterY);
                if (imageTransform.perspective && imageTransform.perspective > 0 &&
                    (imageTransform.rotateX !== 0 || imageTransform.rotateY !== 0)) {
                    const rXR = (imageTransform.rotateX * Math.PI) / 180;
                    const rYR = (imageTransform.rotateY * Math.PI) / 180;
                    const tY2 = Math.tan(rYR);
                    const tX2 = Math.tan(rXR);
                    const sX2 = 1 / Math.sqrt(1 + tY2 * tY2);
                    const sY2 = 1 / Math.sqrt(1 + tX2 * tX2);
                    ctx.transform(sX2, tX2 * sY2, tY2 * sX2, sY2, 0, 0);
                }
                ctx.rotate((imageTransform.rotateZ * Math.PI) / 180);
                ctx.scale(imageTransform.scale * imageZoomScale, imageTransform.scale * imageZoomScale);
                const iTY = (imageTransform.translateY / 100) * canvasHeight;
                ctx.translate(-zoomCenterX, -zoomCenterY + iTY);
            }
            drawBg(ctx);
            await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true, svgImageCacheRef.current, elementImagesRef.current);
            const { containerX: cX, containerY: cY, containerWidth: cW, containerHeight: cH } = computeContainer();
            // Only draw the 2D mockup + media when the 3D phone overlay is NOT active.
            // In the preview, CSS opacity:0 hides the video layer; here we skip drawing it.
            if (!imagePhoneActive) {
                drawMockupAndMedia(ctx, cX, cY, cW, cH, image!, true, false, mockupDrawCtx);
            }
            await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, false, svgImageCacheRef.current, elementImagesRef.current);
            // ── Composite image phone mockup (WebGL snapshot) onto export canvas ──
            if (imagePhoneActive && imagePhoneCanvasRef.current) {
                const phoneGL = imagePhoneCanvasRef.current;
                const domW = canvasDimensions?.width ?? canvasWidth;
                const pxScale = canvasWidth / domW;
                const measuredDims = imagePhoneApiRef.current?.getVisualSize?.();
                const deviceDims = measuredDims ?? DEVICE_3D_DIMENSIONS[imagePhoneDevice] ?? { width: PHONE_W, height: PHONE_H };
                const visualOffsetY = (measuredDims?.offsetY ?? 0) * imagePhoneScale * pxScale;
                const phoneCx = canvasWidth / 2 + imagePhoneX * pxScale;
                const phoneCy = canvasHeight / 2 + imagePhoneY * pxScale + visualOffsetY; // ← offset incluido
                const drawW = deviceDims.width * imagePhoneScale * pxScale;
                const drawH = deviceDims.height * imagePhoneScale * pxScale;
                // Paint CSS-shadow replica as a 2D radial gradient underneath the model,
                // but only for devices whose 3D viewer doesn't already render ContactShadows.
                const hasBuiltInShadow = imagePhoneApiRef.current?.hasBuiltInShadow ?? false;
                if (imagePhoneShadow > 0.01 && !hasBuiltInShadow) {
                    const sT = imagePhoneShadow * imagePhoneShadow;
                    const sBlur = sT * 60;
                    const sOpacity = sT * 0.7;
                    const shadowEllipseW = drawW * (0.6 - sT * 0.1);
                    const shadowEllipseH = Math.max(4, sBlur * 0.55) * pxScale;
                    const shadowCenterY = phoneCy + drawH / 2 + sBlur * 0.2 * pxScale;
                    ctx.save();
                    ctx.globalAlpha = sOpacity;
                    ctx.filter = `blur(${Math.max(2, sBlur * 0.6) * pxScale}px)`;
                    ctx.beginPath();
                    ctx.ellipse(phoneCx, shadowCenterY, shadowEllipseW / 2, shadowEllipseH / 2, 0, 0, Math.PI * 2);
                    ctx.fillStyle = imagePhoneShadowColor;
                    ctx.fill();
                    ctx.restore();
                }
                if (highQuality) {
                    imagePhoneApiRef.current?.renderAt(drawW, drawH);
                    drawMaskedImage(ctx, phoneGL, phoneCx - drawW / 2, phoneCy - drawH / 2, drawW, drawH, effectivePhoneMaskConfig, maskCompositeCanvasRef);
                    imagePhoneApiRef.current?.restorePreview();
                } else {
                    drawMaskedImage(ctx, phoneGL, phoneCx - drawW / 2, phoneCy - drawH / 2, drawW, drawH, effectivePhoneMaskConfig, maskCompositeCanvasRef);
                }

            }
            ctx.restore();
            return;
        }

        const motionHasTilt = !!mockupMotionForFrame && (mockupMotionForFrame.rotateX !== 0 || mockupMotionForFrame.rotateY !== 0);
        const has3DEffect =
            (zoomState.perspective > 0 && (zoomState.rotateX !== 0 || zoomState.rotateY !== 0)) || motionHasTilt;
        const hasZoom = zoomState.scale !== 1;

        let focusPxX = 0, focusPxY = 0;
        if (hasZoom) {
            focusPxX = (zoomState.focusX / 100) * canvasWidth;
            focusPxY = (zoomState.focusY / 100) * canvasHeight;
        }

        const activeFragment = zoomFragments.find(
            f => frameTime >= f.startTime && frameTime <= f.endTime
        ) ?? zoomFragments
            .filter(f => f.endTime < frameTime)
            .sort((a, b) => b.endTime - a.endTime)[0];
        const targetScale = activeFragment ? zoomLevelToFactor(activeFragment.zoomLevel) : zoomState.scale;

        let pivotX = zoomCenterX, pivotY = zoomCenterY;
        if (hasZoom && targetScale > 1) {
            pivotX = (targetScale * focusPxX - zoomCenterX) / (targetScale - 1);
            pivotY = (targetScale * focusPxY - zoomCenterY) / (targetScale - 1);
        }

        const applyVideoZoom = (c: CanvasRenderingContext2D) => {
            if (hasZoom) {
                c.translate(pivotX, pivotY);
                c.scale(zoomState.scale, zoomState.scale);
                c.translate(-pivotX, -pivotY);
            }
        };

        let fgCanvas: HTMLCanvasElement | null = null;
        let fgCtx: CanvasRenderingContext2D | null = null;

        const BLEED_FACTOR = 1.5;
        const fgWidth = canvasWidth * BLEED_FACTOR;
        const fgHeight = canvasHeight * BLEED_FACTOR;
        const fgOffsetX = (fgWidth - canvasWidth) / 2;
        const fgOffsetY = (fgHeight - canvasHeight) / 2;

        if (has3DEffect) {
            if (!foregroundCanvasRef.current) {
                foregroundCanvasRef.current = document.createElement('canvas');
            }
            fgCanvas = foregroundCanvasRef.current;

            if (fgCanvas.width !== fgWidth || fgCanvas.height !== fgHeight) {
                fgCanvas.width = fgWidth;
                fgCanvas.height = fgHeight;
            }

            fgCtx = fgCanvas.getContext('2d', canvasCtxOptions);
            if (fgCtx) {
                fgCtx.setTransform(1, 0, 0, 1, 0, 0);
                fgCtx.clearRect(0, 0, fgWidth, fgHeight);
                fgCtx.imageSmoothingEnabled = true;
                fgCtx.imageSmoothingQuality = 'high';
            }
        }

        ctx.save();
        drawBg(ctx);
        ctx.restore();

        ctx.save();
        applyVideoZoom(ctx);
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true, svgImageCacheRef.current, elementImagesRef.current);
        ctx.restore();

        await drawCameraOverlayToCtx(ctx, canvasWidth, canvasHeight, cameraVideoRef.current, videoRef.current, cameraConfig);

        const { containerX, containerY, containerWidth, containerHeight } = computeContainer();

        if (has3DEffect && fgCanvas && fgCtx) {
            fgCtx.save();
            fgCtx.translate(fgOffsetX, fgOffsetY);
            if (!imagePhoneActive) {
                drawMockupAndMedia(fgCtx, containerX, containerY, containerWidth, containerHeight, video!, false, true, mockupDrawCtx);
            }
            fgCtx.restore();
            applyPerspective3D(
                fgCanvas,
                zoomState.rotateX + (mockupMotionForFrame?.rotateX ?? 0),
                zoomState.rotateY + (mockupMotionForFrame?.rotateY ?? 0),
                (zoomState.perspective || mockupMotionForFrame?.perspectivePx || 900) / BLEED_FACTOR,
            );
            ctx.save();
            applyVideoZoom(ctx);
            ctx.drawImage(fgCanvas, -fgOffsetX, -fgOffsetY, fgWidth, fgHeight);
            ctx.restore();
            if (imagePhoneActive && imagePhoneCanvasRef.current) {
                drawPhone3DCompositeWithZoom(ctx, canvasWidth, canvasHeight, frameTime, zoomState, highQuality, pivotX, pivotY, phone3dCtx);
            }
        } else {
            const hasVideoMask = !!(videoMaskConfig?.enabled && (
                videoMaskConfig.top || videoMaskConfig.bottom ||
                videoMaskConfig.left || videoMaskConfig.right ||
                videoMaskConfig.angle !== undefined
            ));

            if (hasVideoMask) {
                let videoLayer = videoMaskContentCanvasRef.current;
                if (!videoLayer) {
                    videoLayer = document.createElement('canvas');
                    videoMaskContentCanvasRef.current = videoLayer;
                }
                if (videoLayer.width !== canvasWidth || videoLayer.height !== canvasHeight) {
                    videoLayer.width = canvasWidth;
                    videoLayer.height = canvasHeight;
                }
                const vlCtx = videoLayer.getContext('2d', canvasCtxOptions);
                if (vlCtx) {
                    vlCtx.setTransform(1, 0, 0, 1, 0, 0);
                    vlCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                    vlCtx.globalCompositeOperation = 'source-over';
                    vlCtx.imageSmoothingEnabled = true;
                    vlCtx.imageSmoothingQuality = 'high';
                    if (!imagePhoneActive) {
                        drawMockupAndMedia(vlCtx, containerX, containerY, containerWidth, containerHeight, video!, false, false, mockupDrawCtx);
                    }

                    const vm = videoMaskConfig!;
                    const [cX, cY, cW, cH] = [containerX, containerY, containerWidth, containerHeight];
                    const maskKey = [
                        canvasWidth, canvasHeight, cX.toFixed(1), cY.toFixed(1), cW.toFixed(1), cH.toFixed(1),
                        vm.top ? `t${vm.top.from}-${vm.top.to ?? 100}` : '',
                        vm.bottom ? `b${vm.bottom.from}-${vm.bottom.to ?? 100}` : '',
                        vm.left ? `l${vm.left.from}-${vm.left.to ?? 100}` : '',
                        vm.right ? `r${vm.right.from}-${vm.right.to ?? 100}` : '',
                        vm.angle !== undefined ? `a${vm.angle}-${vm.angleFrom ?? 0}-${vm.angleTo ?? 100}` : '',
                    ].join('|');

                    let alphaCache = videoMaskAlphaCacheRef.current;
                    if (!alphaCache || alphaCache.key !== maskKey) {
                        const alphaCanvas = document.createElement('canvas');
                        alphaCanvas.width = canvasWidth;
                        alphaCanvas.height = canvasHeight;
                        const aCtx = alphaCanvas.getContext('2d');
                        if (aCtx) {
                            aCtx.fillStyle = 'black';
                            aCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                            aCtx.globalCompositeOperation = 'destination-in';
                            if (vm.top) {
                                const g = aCtx.createLinearGradient(cX, cY, cX, cY + cH);
                                g.addColorStop(0, 'transparent');
                                g.addColorStop(vm.top.from / 100, 'transparent');
                                g.addColorStop((vm.top.to ?? 100) / 100, 'black');
                                aCtx.fillStyle = g;
                                aCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                            }
                            if (vm.bottom) {
                                const g = aCtx.createLinearGradient(cX, cY + cH, cX, cY);
                                g.addColorStop(0, 'transparent');
                                g.addColorStop(vm.bottom.from / 100, 'transparent');
                                g.addColorStop((vm.bottom.to ?? 100) / 100, 'black');
                                aCtx.fillStyle = g;
                                aCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                            }
                            if (vm.left) {
                                const g = aCtx.createLinearGradient(cX, cY, cX + cW, cY);
                                g.addColorStop(0, 'transparent');
                                g.addColorStop(vm.left.from / 100, 'transparent');
                                g.addColorStop((vm.left.to ?? 100) / 100, 'black');
                                aCtx.fillStyle = g;
                                aCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                            }
                            if (vm.right) {
                                const g = aCtx.createLinearGradient(cX + cW, cY, cX, cY);
                                g.addColorStop(0, 'transparent');
                                g.addColorStop(vm.right.from / 100, 'transparent');
                                g.addColorStop((vm.right.to ?? 100) / 100, 'black');
                                aCtx.fillStyle = g;
                                aCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                            }
                            if (vm.angle !== undefined) {
                                const angleRad = (vm.angle * Math.PI) / 180;
                                const cx2 = cX + cW / 2;
                                const cy2 = cY + cH / 2;
                                const diag = Math.sqrt(cW * cW + cH * cH) / 2;
                                const g = aCtx.createLinearGradient(
                                    cx2 - Math.cos(angleRad) * diag, cy2 - Math.sin(angleRad) * diag,
                                    cx2 + Math.cos(angleRad) * diag, cy2 + Math.sin(angleRad) * diag
                                );
                                g.addColorStop(0, 'transparent');
                                g.addColorStop((vm.angleFrom ?? 0) / 100, 'transparent');
                                g.addColorStop((vm.angleTo ?? 100) / 100, 'black');
                                aCtx.fillStyle = g;
                                aCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                            }
                        }
                        alphaCache = { key: maskKey, canvas: alphaCanvas };
                        videoMaskAlphaCacheRef.current = alphaCache;
                    }

                    vlCtx.globalCompositeOperation = 'destination-in';
                    vlCtx.drawImage(alphaCache.canvas, 0, 0);
                    vlCtx.globalCompositeOperation = 'source-over';

                    ctx.save();
                    applyVideoZoom(ctx);
                    ctx.drawImage(videoLayer, 0, 0);
                    ctx.restore();
                }
                if (imagePhoneActive && imagePhoneCanvasRef.current) {
                    drawPhone3DCompositeWithZoom(ctx, canvasWidth, canvasHeight, frameTime, zoomState, highQuality, pivotX, pivotY, phone3dCtx);

                }

            } else {
                ctx.save();
                applyVideoZoom(ctx);
                if (!imagePhoneActive) {
                    drawMockupAndMedia(ctx, containerX, containerY, containerWidth, containerHeight, video!, false, false, mockupDrawCtx);
                }
                ctx.restore();

                if (imagePhoneActive && imagePhoneCanvasRef.current) {
                    drawPhone3DCompositeWithZoom(ctx, canvasWidth, canvasHeight, frameTime, zoomState, highQuality, pivotX, pivotY, phone3dCtx);

                }
            }
        }

        ctx.save();
        applyVideoZoom(ctx);
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, false, svgImageCacheRef.current, elementImagesRef.current);
        ctx.restore();

        await drawCameraOverlayToCtx(ctx, canvasWidth, canvasHeight, cameraVideoRef.current, videoRef.current, cameraConfig);
    };

    const [activeVideoElement, setActiveVideoElement] = useState<HTMLVideoElement | null>(null);
    useEffect(() => {
        setActiveVideoElement(mediaType === "video" ? videoRef.current : null);
    }, [mediaType, videoRef, videoUrl, mockupId, activeClipUrl, imagePhoneActive]);

    useImperativeHandle(ref, () => ({
        getExportCanvas: () => exportCanvasRef.current,
        drawFrame,
        getPreviewContainer: () => previewContainerRef.current,
        clearAllSelection: () => {
            const prev = { multiIds: [...canvasSelectedIds], videoSelected: isVideoSelected };
            setCanvasSelectedIds([]);
            setIsVideoSelected(false);
            return prev;
        },
        restoreSelectionState: (state: { multiIds: string[]; videoSelected: boolean }) => {
            setCanvasSelectedIds(state.multiIds);
            setIsVideoSelected(state.videoSelected);
        },
    }));

    const handleTextEditEnd = useCallback((id: string, content: string) => {
        if (!content.trim()) {
            if (onElementDelete) onElementDelete(id);
        } else {
            if (onElementUpdate) onElementUpdate(id, { content });
        }
        setEditingTextId(null);
    }, [onElementDelete, onElementUpdate]);

    useEffect(() => {
        const box = mockupBoxRef.current;
        const content = mockupContentRef.current;
        if (!box || !content) return;

        const measure = () => {
            let top = 0;
            let left = 0;
            let node: HTMLElement | null = content;
            let guard = 0;

            while (node && node !== box && guard < 50) {
                top += node.offsetTop;
                left += node.offsetLeft;
                node = node.offsetParent as HTMLElement | null;
                guard++;
            }

            if (node !== box) {
                setContentInsets({ top: 0, bottom: 0, left: 0, right: 0 });
                return;
            }

            setContentInsets({
                top,
                left,
                bottom: box.offsetHeight - content.offsetHeight - top,
                right: box.offsetWidth - content.offsetWidth - left,
            });
        };

        const observer = new ResizeObserver(measure);
        observer.observe(box);
        observer.observe(content);
        measure();

        return () => observer.disconnect();
    }, [hasMockup, mockupId, mockupConfig]);

    const mockupBoxSize = useMemo(() => {
        if (!mediaContainAspect) return null;
        const { width: Wp, height: Hp } = videoContainerSize;
        if (Wp <= 0 || Hp <= 0) return null;

        const hI = contentInsets.left + contentInsets.right;
        const vI = contentInsets.top + contentInsets.bottom;

        if (hI <= 0 && vI <= 0) {
            if (Wp / Hp > mediaContainAspect) {
                const H = Hp;
                return { width: H * mediaContainAspect, height: H };
            }
            return { width: Wp, height: Wp / mediaContainAspect };
        }

        const widthBoundHeight = vI + (Wp - hI) / mediaContainAspect;
        if (widthBoundHeight <= Hp) {
            return { width: Wp, height: widthBoundHeight };
        }
        const heightBoundWidth = hI + mediaContainAspect * (Hp - vI);
        return { width: heightBoundWidth, height: Hp };
    }, [mediaContainAspect, videoContainerSize, contentInsets]);

    const mockupChildren = useMemo(() => (
        hasMedia ? (
            <div ref={mockupContentRef} className="relative flex items-center justify-center overflow-hidden w-full h-full rounded-[inherit]">
                <MediaContent
                    mediaType={mediaType}
                    videoUrl={videoUrl}
                    videoRef={videoRef}
                    imageUrl={imageUrl}
                    imageRef={imageRef}
                    cropArea={cropArea}
                    hasMask={hasMask}
                    hasMockup={!!hasMockup}
                    maskStyles={maskStyles}
                    currentThumbnail={currentThumbnail}
                    isVideoHovered={isVideoHovered}
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onLoadedMetadata}
                    onEnded={onEnded}
                />
            </div>
        ) : (
            <div ref={mockupContentRef} className="w-full h-full aspect-video min-w-75 border border-white/25 flex flex-col overflow-hidden">
                <PlaceholderEditor
                    onVideoUpload={mediaType === "video" ? onVideoUpload : onImageUpload}
                    isUploading={isUploading}
                    mediaType={mediaType}
                />
            </div>
        )
    ), [
        hasMedia, mediaType, videoUrl, videoRef, imageUrl, imageRef,
        cropArea, hasMask, hasMockup, maskStyles, currentThumbnail, isVideoHovered,
        onTimeUpdate, onLoadedMetadata, onEnded, onVideoUpload, onImageUpload, isUploading,
    ]);

    const handleHitTestElementSelect = useCallback((id: string | null) => {
        wasDragRef.current = false;
        if (id) {
            const isGroupMember = canvasSelectedIds.includes(id) && (canvasSelectedIds.length > 1 || isVideoSelected);
            handleElementSelect(id, isGroupMember);
            if (!canvasSelectedIds.includes(id)) {
                setCanvasSelectedIds([id]);
                pendingCollapseRef.current = null;
                pendingVideoCollapseRef.current = false;
            } else if (isGroupMember) {
                pendingCollapseRef.current = id;
            }
        } else {
            handleElementSelect(null);
            setCanvasSelectedIds([]);
            pendingCollapseRef.current = null;
            pendingVideoCollapseRef.current = false;
        }
    }, [canvasSelectedIds, isVideoSelected, handleElementSelect]);

    const handleGroupDragStart = useCallback((e: React.MouseEvent) => {
        wasDragRef.current = false;
        setIsDraggingVideo(true);
        dragStartPos.current = {
            x: e.clientX, y: e.clientY,
            initialRotation: videoTransform.rotation,
            initialTranslateX: videoTransform.translateX,
            initialTranslateY: videoTransform.translateY,
        };
        pendingVideoCollapseRef.current = true;
    }, [videoTransform]);

    const handleDoubleClickText = useCallback((id: string) => {
        setEditingTextId(id);
    }, []);

    return (
        <div
            className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden bg-[#09090B] p-2 sm:p-4 lg:p-1 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                const isElementTarget = !!target.closest('[data-canvas-element]');
                const isVideoTarget = !isElementTarget && (
                    !!target.closest('[data-video-container]') || !!target.closest('[data-image-phone-overlay]')
                );
                if (isElementTarget && canvasElements.length === 0) return;
                if (!isElementTarget && !isVideoTarget) return;

                e.preventDefault();
                if (isVideoTarget) {
                    setIsVideoSelected(true);
                    if (onElementSelect) onElementSelect(null);
                    setCanvasSelectedIds([]);
                }
                setCanvasCtxMenu({ x: e.clientX, y: e.clientY, isVideo: isVideoTarget });
            }}
        >
            {isDraggingOver && (
                <DropMedia mediaType={mediaType} />
            )}

            {canvasCtxMenu && (
                <CanvasContextMenu
                    canvasCtxMenu={canvasCtxMenu}
                    canvasSelectedIds={canvasSelectedIds}
                    selectedElementId={selectedElementId}
                    canvasElements={canvasElements}
                    VIDEO_Z_INDEX={VIDEO_Z_INDEX}
                    onElementUpdate={onElementUpdate}
                    onElementDelete={onElementDelete}
                    setCanvasCtxMenu={setCanvasCtxMenu}
                    setCanvasSelectedIds={setCanvasSelectedIds}
                    isVideoTarget={canvasCtxMenu?.isVideo}
                    onVideoBringToFront={() => {
                        canvasElements.forEach((el, i) => {
                            if (onElementUpdate) onElementUpdate(el.id, { zIndex: Math.max(1, VIDEO_Z_INDEX - 1 - i) });
                        });
                    }}
                    onVideoSendToBack={() => {
                        canvasElements.forEach((el, i) => {
                            if (onElementUpdate) onElementUpdate(el.id, { zIndex: VIDEO_Z_INDEX + canvasElements.length - i });
                        });
                    }}
                />
            )}

            <RotationGuideLine rotationGuide={rotationGuide} />

            <div className="absolute inset-0 pointer-events-none z-0"
                style={{ backgroundImage: 'radial-gradient(rgb(39, 39, 42) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            </div>
            <canvas
                ref={exportCanvasRef}
                className="hidden"
            />

            {/* ── Canvas + Layers panel side-by-side ── */}
            <div className="flex items-stretch min-h-0 min-w-0 w-full h-full justify-center gap-0">

                <div ref={canvasWrapperRef} className="flex-1 flex items-center justify-center min-h-0 min-w-0 mr-1">
                    <div className="relative shrink-0 rounded-xl border border-white/20 overflow-hidden">
                        <div
                            ref={previewContainerRef}
                            className="relative shrink-0 transition-all duration-300 overflow-hidden"
                            style={{
                                aspectRatio: getAspectRatioStyle(aspectRatio, customAspectRatio ?? undefined),
                                ...(canvasDimensions
                                    ? { width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px` }
                                    : { width: '100%', height: 'auto', maxHeight: '100%' }
                                ),
                                containerType: 'size',

                            }}
                            onClick={(e) => {
                                if (
                                    !(e.target as HTMLElement).closest('[data-canvas-element]') &&
                                    !(e.target as HTMLElement).closest('[data-camera-overlay]') &&
                                    !(e.target as HTMLElement).closest('[data-video-container]') &&
                                    !(e.target as HTMLElement).closest('[data-phone-overlay]') &&
                                    !(e.target as HTMLElement).closest('[data-image-phone-overlay]')
                                ) {
                                    if (onElementSelect) onElementSelect(null);
                                    setIsVideoSelected(false);
                                    setCanvasSelectedIds([]);
                                }
                            }}
                        >
                            {/* Zoom container - applies zoom to entire composition (background + video) */}
                            <div className="absolute inset-0"
                                style={{
                                    perspective: mediaType === "image" && imageTransform && apply3DToBackground ? `${imageTransform.perspective || 600}px` : 'none',
                                    perspectiveOrigin: 'center center',
                                    // Propagate overflow:visible so the 3D phone overlay in image mode
                                    // is never clipped when the user rotates or drags it outside bounds.
                                    overflow: 'hidden',
                                }}
                            >
                                {!(mediaType === "image" && apply3DToBackground) && (
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                                        <div className="absolute transition-all duration-200" style={{ inset: backgroundBlur > 0 ? `-${backgroundBlur}px` : '0', ...(shouldShowCustomColor && backgroundColorCss ? backgroundColorCss.startsWith('#') || backgroundColorCss.startsWith('rgb') ? { backgroundColor: backgroundColorCss } : { backgroundImage: backgroundColorCss } : (shouldShowCustomImage || shouldShowUnsplashOverride) ? { backgroundImage: `url('${shouldShowCustomImage ? selectedImageUrl : unsplashOverrideUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', } : shouldShowWallpaper ? { backgroundImage: `url('${wallpaperUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', } : { backgroundColor: 'transparent' }), filter: backgroundBlur > 0 ? `blur(${backgroundBlur * 0.4}px)` : 'none', }} />
                                    </div>
                                )}

                                {/* Zoom + translate layer (+ 3D transform for image mode when apply3DToBackground is true) */}
                                <div className="absolute inset-0 origin-center"
                                    style={{
                                        transform: mediaType === "image" && imageTransform && apply3DToBackground
                                            ? `rotateX(${imageTransform.rotateX}deg) rotateY(${imageTransform.rotateY}deg) rotateZ(${imageTransform.rotateZ}deg) scale(${imageTransform.scale * imageZoomScale}) translateY(${imageTransform.translateY}%)`
                                            : `scale(${zoomTransform.scale}) translate(${zoomTransform.translateX}%, ${zoomTransform.translateY}%)`,
                                        perspective: !(mediaType === "image" && apply3DToBackground) && zoomTransform.perspective > 0
                                            ? `${(zoomTransform.perspective / 10.8).toFixed(1)}cqh` : 'none',
                                        transformStyle: mediaType === "image" && apply3DToBackground ? 'preserve-3d' : undefined,
                                        transition: mediaType === "image" && apply3DToBackground
                                            ? 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                            : zoomTransform.isMoving ? `transform ${zoomTransform.transitionMs}ms linear` : `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                                        // Allow the 3D phone to overflow this layer when in image-phone mode
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* FONDO 3D: Solo se renderiza aquí adentro cuando el modo imagen 3D está activo */}
                                    {(mediaType === "image" && apply3DToBackground) && (
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, transform: 'translateZ(-1px)' }}>
                                            <div className="absolute transition-all duration-200" style={{ inset: '-50%', ...(shouldShowCustomColor && backgroundColorCss ? backgroundColorCss.startsWith('#') || backgroundColorCss.startsWith('rgb') ? { backgroundColor: backgroundColorCss } : { backgroundImage: backgroundColorCss } : (shouldShowCustomImage || shouldShowUnsplashOverride) ? { backgroundImage: `url('${shouldShowCustomImage ? selectedImageUrl : unsplashOverrideUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', } : shouldShowWallpaper ? { backgroundImage: `url('${wallpaperUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', } : { backgroundColor: 'transparent' }), filter: backgroundBlur > 0 ? `blur(${backgroundBlur * 0.4}px)` : 'none', }} />
                                        </div>
                                    )}
                                    {/* Capa 2A: Canvas elements BEHIND video — sin rotación 3D */}
                                    <CanvasElementsLayer
                                        canvasContainerRef={canvasContainerRef}
                                        canvasElements={canvasElements}
                                        selectedElementId={selectedElementId}
                                        selectedElementIds={canvasSelectedIds}
                                        hoveredElementId={hoveredElementId}
                                        isDraggingElement={isDraggingElement}
                                        behindVideo={true}
                                        onElementSelect={handleElementSelect}
                                        onElementUpdate={onElementUpdate}
                                        setHoveredElementId={setHoveredElementId}
                                        setIsDraggingElement={setIsDraggingElement}
                                        setIsDraggingElementRotation={setIsDraggingElementRotation}
                                        elementDragStart={elementDragStart}
                                        layerZIndex={1}
                                        elementCorners={elementCorners}
                                        setElementCorners={setElementCorners}
                                        editingTextId={editingTextId}
                                        onTextEditEnd={handleTextEditEnd}
                                        isDraggingElementRotation={isDraggingElementRotation}
                                        isDraggingElementResize={isDraggingElementResize}
                                        setIsDraggingElementResize={setIsDraggingElementResize}
                                        elementResizeStart={elementResizeStart}
                                    />

                                    {/* 3D rotation layer — solo envuelve el mockup, el fondo queda plano */}
                                    <div
                                        className="absolute inset-0 origin-center"
                                        style={{
                                            transform: zoomTransform.perspective > 0 ? `rotateX(${zoomTransform.rotateX}deg) rotateY(${zoomTransform.rotateY}deg)` : 'none',
                                            transition: `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                                            willChange: zoomTransform.perspective > 0 ? 'transform' : 'auto',
                                            transformStyle: 'preserve-3d',
                                            zIndex: 2,
                                            pointerEvents: 'none',
                                            // Allow the 3D phone overlay to overflow when in image-phone mode
                                            overflow: 'hidden',

                                        }}
                                    >
                                        {/* Capa 2B: Video con padding, esquinas redondeadas y sombras */}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                                            style={{
                                                padding: `${padding * 0.5}%`,
                                                zIndex: 2,
                                                pointerEvents: 'none',
                                                // Hide the video layer while a motion template is active;
                                                // the video element stays in the DOM so playback/timing continues.
                                                // In image mode, also hide when the phone overlay is active.
                                                opacity: imagePhoneActive ? 0 : 1,
                                                transition: 'opacity 0.25s ease, padding 0.2s',
                                                ...(mediaType === "image" && imageTransform && !apply3DToBackground ? {
                                                    perspective: `${imageTransform.perspective || 600}px`,
                                                    perspectiveOrigin: 'center center',
                                                } : {}),
                                                // Allow the 3D phone overlay to overflow this padding layer
                                                overflow: imagePhoneActive ? 'visible' : 'hidden',
                                            }}
                                        >
                                            <div
                                                ref={videoContainerRef}
                                                data-video-container
                                                className="relative flex w-full h-full items-center justify-center max-w-full max-h-full"
                                                style={{
                                                    transform: mediaType === "image" && imageTransform && !apply3DToBackground
                                                        ? `
                                                        translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) 
                                                        rotate(${videoTransform.rotation}deg)
                                                        rotateX(${imageTransform.rotateX}deg)
                                                        rotateY(${imageTransform.rotateY}deg)
                                                        rotateZ(${imageTransform.rotateZ}deg)
                                                        scale(${imageTransform.scale * imageZoomScale})
                                                        translateY(${imageTransform.translateY}%)
                                                      `
                                                        : `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg)`,
                                                    cursor: isDraggingVideo ? 'move' : (isVideoHovered && hasMedia ? 'move' : 'default'),
                                                    transition: (isDraggingVideo || isDraggingRotation)
                                                        ? 'none' : (mediaType === "image" && imageTransform && !apply3DToBackground)
                                                            ? 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                                            : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                                    pointerEvents: 'none',
                                                    transformStyle: mediaType === "image" && !apply3DToBackground ? 'preserve-3d' : undefined,
                                                }}
                                                onMouseEnter={() => hasMedia && setIsVideoHovered(true)}
                                                onMouseLeave={() => {
                                                    setIsVideoHovered(false);
                                                    if (isDraggingRotation) return;
                                                    setVideoHoverCorner(null);
                                                }}
                                                onMouseDown={(e) => {
                                                    if (!hasMedia || !onVideoTransformChange) return;
                                                    if ((e.target as HTMLElement).closest('[data-rotation-handle]')) return;
                                                    e.preventDefault();
                                                    wasDragRef.current = false;

                                                    const isGroupMember = isVideoSelected && canvasSelectedIds.length > 0;

                                                    if (e.shiftKey) {
                                                        setIsVideoSelected((prev) => !prev);
                                                    } else if (isGroupMember) {
                                                        pendingElementsCollapseRef.current = true;
                                                    } else {
                                                        setIsVideoSelected(true);
                                                        if (onElementSelect) onElementSelect(null);
                                                        setCanvasSelectedIds([]);
                                                    }

                                                    setVideoHoverCorner(getNearestCorner(e, videoTransform.rotation));
                                                    setIsDraggingVideo(true);
                                                    dragStartPos.current = {
                                                        x: e.clientX, y: e.clientY,
                                                        initialRotation: videoTransform.rotation,
                                                        initialTranslateX: videoTransform.translateX,
                                                        initialTranslateY: videoTransform.translateY,
                                                    };
                                                    clickStartPosRef.current = { x: e.clientX, y: e.clientY };

                                                    if (canvasSelectedIds.length > 0) {
                                                        setIsDraggingElement(true);
                                                        elementDragStart.current = { x: e.clientX, y: e.clientY, initialX: 0, initialY: 0, initialRotation: 0 };
                                                    }
                                                }}
                                                onMouseMove={(e) => {
                                                    if (hasMedia && !isDraggingRotation && !isDraggingVideo) {
                                                        setVideoHoverCorner(getNearestCorner(e, videoTransform.rotation));
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if ((e.target as HTMLElement).closest('[data-rotation-handle]')) return;
                                                    if (!onMockupClick) return;
                                                    if (mockupId === "none" || mockupId === undefined) return;
                                                    // Only fire if pointer stayed within CLICK_THRESHOLD (i.e. a click, not a drag)
                                                    const start = clickStartPosRef.current;
                                                    clickStartPosRef.current = null;
                                                    if (!start) return;
                                                    const dx = e.clientX - start.x;
                                                    const dy = e.clientY - start.y;
                                                    if (dx * dx + dy * dy > CLICK_THRESHOLD * CLICK_THRESHOLD) return;
                                                    onMockupClick("2d");
                                                }}
                                            >
                                                <div
                                                    ref={mockupBoxRef}
                                                    className="relative"
                                                    style={{
                                                        pointerEvents: imagePhoneActive ? 'none' : 'auto',
                                                        ...(mockupBoxSize
                                                            ? { width: `${mockupBoxSize.width}px`, height: `${mockupBoxSize.height}px` }
                                                            : { width: '100%', height: '100%' }),
                                                        perspective:
                                                            hasMockup2DMotion && mockupMotionPreview.perspectivePx > 0
                                                                ? `${mockupMotionPreview.perspectivePx}px`
                                                                : undefined,
                                                    }}
                                                >
                                                    <div
                                                        className="w-full h-full"
                                                        style={
                                                            hasMockup2DMotion
                                                                ? {
                                                                    transform: buildMockupMotionCss(mockupMotionPreview),
                                                                    transformStyle: "preserve-3d",
                                                                    transformOrigin: "center center",
                                                                    opacity: mockupMotionPreview.opacity,
                                                                    filter:
                                                                        mockupMotionPreview.blurPx > 0.4
                                                                            ? `blur(${mockupMotionPreview.blurPx}px)`
                                                                            : undefined,
                                                                }
                                                                : undefined
                                                        }
                                                    >
                                                        <MockupWrapper
                                                            mockupId={mockupId}
                                                            config={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                                                            roundedCorners={roundedCorners}
                                                            shadows={shadows}
                                                            maskStyles={hasMask ? maskStyles : undefined}
                                                        >
                                                            {mockupChildren}
                                                        </MockupWrapper>

                                                        {(isVideoSelected || isVideoHovered) && hasMedia && !isDraggingRotation && !imagePhoneActive && (
                                                            <div
                                                                className={`absolute -inset-px border pointer-events-none z-10 opacity-80 ${isVideoSelected ? "border-blue-500" : "border-white"
                                                                    }`}
                                                                style={{ borderRadius: `${getMockupOuterRadius(mockupId, roundedCorners) + 1}px` }}
                                                            />
                                                        )}

                                                        {isVideoSelected && videoHoverCorner && hasMedia && onVideoTransformChange && !isDraggingVideo && (
                                                            <div
                                                                data-rotation-handle
                                                                style={getCornerStyle(videoHoverCorner, -20)}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const container = videoContainerRef.current;
                                                                    if (!container) return;
                                                                    const rect = container.getBoundingClientRect();
                                                                    const centerX = rect.left + rect.width / 2;
                                                                    const centerY = rect.top + rect.height / 2;
                                                                    rotationCenterRef.current = { x: centerX, y: centerY };
                                                                    rotationStartAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
                                                                    setIsDraggingRotation(true);
                                                                    dragStartPos.current = {
                                                                        x: e.clientX,
                                                                        y: e.clientY,
                                                                        initialRotation: videoTransform.rotation,
                                                                        initialTranslateX: videoTransform.translateX,
                                                                        initialTranslateY: videoTransform.translateY,
                                                                    };
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        transform: [
                                                                            `scale(${(mediaType === "image" && imageTransform && !apply3DToBackground
                                                                                ? 1 / (imageTransform.scale * imageZoomScale)
                                                                                : 1) * (hasMockup2DMotion && mockupMotionPreview.scale > 0 ? 1 / mockupMotionPreview.scale : 1)
                                                                            })`,
                                                                            hasMockup2DMotion
                                                                                ? `rotateZ(${-mockupMotionPreview.rotateZ}deg) rotateY(${-mockupMotionPreview.rotateY}deg) rotateX(${-mockupMotionPreview.rotateX}deg)`
                                                                                : "",
                                                                        ].filter(Boolean).join(" "),
                                                                        transformOrigin: "center center",
                                                                    }}
                                                                >
                                                                    <RotationHandleIcon corner={videoHoverCorner} color="#e5e7eb" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 transition-transform"
                                                style={{
                                                    transform: mediaType === "image" && imageTransform && !apply3DToBackground
                                                        ? `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg) rotateX(${imageTransform.rotateX}deg) rotateY(${imageTransform.rotateY}deg) rotateZ(${imageTransform.rotateZ}deg) translateY(${imageTransform.translateY}%)`
                                                        : `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg)`,
                                                    transformStyle: mediaType === "image" && !apply3DToBackground ? 'preserve-3d' : undefined,
                                                }}
                                            >
                                                <EditorHoverTooltip show={isVideoHovered && !imagePhoneActive} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Capa 3: Canvas elements ABOVE video (zIndex >= VIDEO_Z_INDEX) */}
                                    <CanvasElementsLayer
                                        canvasContainerRef={undefined}
                                        canvasElements={canvasElements}
                                        selectedElementId={selectedElementId}
                                        selectedElementIds={canvasSelectedIds}
                                        hoveredElementId={hoveredElementId}
                                        isDraggingElement={isDraggingElement}
                                        behindVideo={false}
                                        onElementSelect={handleElementSelect}
                                        onElementUpdate={onElementUpdate}
                                        setHoveredElementId={setHoveredElementId}
                                        setIsDraggingElement={setIsDraggingElement}
                                        setIsDraggingElementRotation={setIsDraggingElementRotation}
                                        elementDragStart={elementDragStart}
                                        layerZIndex={200}
                                        elementCorners={elementCorners}
                                        setElementCorners={setElementCorners}
                                        editingTextId={editingTextId}
                                        onTextEditEnd={handleTextEditEnd}
                                        isDraggingElementRotation={isDraggingElementRotation}
                                        isDraggingElementResize={isDraggingElementResize}
                                        setIsDraggingElementResize={setIsDraggingElementResize}
                                        elementResizeStart={elementResizeStart}
                                    />

                                    {/* Capa HIT: invisible, todos los elementos, para recibir eventos */}
                                    <CanvasElementsLayer
                                        canvasContainerRef={undefined}
                                        canvasElements={canvasElements}
                                        selectedElementId={selectedElementId}
                                        selectedElementIds={canvasSelectedIds}
                                        hoveredElementId={hoveredElementId}
                                        isDraggingElement={isDraggingElement}
                                        behindVideo={true}
                                        onElementSelect={handleHitTestElementSelect}
                                        onMultiSelect={setCanvasSelectedIds}
                                        videoIncludedInSelection={isVideoSelected}
                                        onGroupDragStart={handleGroupDragStart}
                                        onElementUpdate={onElementUpdate}
                                        setHoveredElementId={setHoveredElementId}
                                        setIsDraggingElement={setIsDraggingElement}
                                        setIsDraggingElementRotation={setIsDraggingElementRotation}
                                        isDraggingElementRotation={isDraggingElementRotation}
                                        isDraggingElementResize={isDraggingElementResize}
                                        setIsDraggingElementResize={setIsDraggingElementResize}
                                        elementResizeStart={elementResizeStart}
                                        elementDragStart={elementDragStart}
                                        layerZIndex={200}
                                        hitTestOnly={true}
                                        elementCorners={elementCorners}
                                        setElementCorners={setElementCorners}
                                        editingTextId={editingTextId}
                                        onDoubleClickText={handleDoubleClickText}
                                        onTextEditEnd={handleTextEditEnd}
                                    />

                                    {/* ── 3D phone overlay (video & image mode) ── */}
                                    {imagePhoneActive && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 155, overflow: "visible" }}>
                                            <Viewer3DControlsBridge
                                                environment={deviceDefaults.environment}
                                                glow={deviceDefaults.glow}
                                                onChange={setViewer3D}
                                            />
                                            <ControlsPopup />
                                            <div
                                                className="absolute animate-in fade-in zoom-in-95 duration-300"
                                                style={{
                                                    left: "50%",
                                                    top: "50%",
                                                    transform: `translate(calc(-50% + ${imagePhoneX}px), calc(-50% + ${imagePhoneY}px))`,
                                                    transformOrigin: "center center",
                                                    pointerEvents: "none",
                                                    userSelect: "none",
                                                    zIndex: 9999,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        left: "50%",
                                                        transform: "translateX(-50%)",
                                                        pointerEvents: "none",
                                                    }}
                                                >
                                                    <EditorHoverTooltip show={isVideoHovered} />
                                                </div>
                                            </div>

                                            <div
                                                className="absolute animate-in fade-in zoom-in-95 duration-300"
                                                data-image-phone-overlay
                                                onMouseEnter={() => setIsVideoHovered(true)}
                                                onMouseLeave={() => setIsVideoHovered(false)}
                                                onPointerDown={(e) => {
                                                    if (!imagePhoneActive) return;
                                                    setIsVideoSelected(true);
                                                    if (onElementSelect) onElementSelect(null);
                                                    setCanvasSelectedIds([]);
                                                    if (!onMockupClick) return;
                                                    clickStartPosRef.current = { x: e.clientX, y: e.clientY };
                                                }}
                                                onClick={(e) => {
                                                    if (!onMockupClick) return;
                                                    if (!imagePhoneActive) return;
                                                    const start = clickStartPosRef.current;
                                                    clickStartPosRef.current = null;
                                                    if (!start) return;
                                                    const dx = e.clientX - start.x;
                                                    const dy = e.clientY - start.y;
                                                    if (dx * dx + dy * dy > CLICK_THRESHOLD * CLICK_THRESHOLD) return;
                                                    e.stopPropagation();
                                                    onMockupClick("3d");
                                                }}
                                                style={{
                                                    left: "50%",
                                                    top: "50%",
                                                    transform: `translate(calc(-50% + ${imagePhoneX}px), calc(-50% + ${imagePhoneY}px)) scale(${imagePhoneScale})`,
                                                    transformOrigin: "center center",
                                                    pointerEvents: "auto",
                                                    userSelect: "none",
                                                    filter: imagePhoneShadow > 0
                                                        ? `drop-shadow(0px ${18 * imagePhoneShadow}px ${28 * imagePhoneShadow}px ${imagePhoneShadowColor})`
                                                        : "none",
                                                }}
                                            >
                                                {!imagePhoneActive || !imagePhoneDevice ? (
                                                    <div
                                                        style={{ width: PHONE_W, height: PHONE_H }}
                                                        className="flex items-center justify-center"
                                                    >
                                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <Mockup3DFrame
                                                        device={imagePhoneDevice}
                                                        imageUrl={imageUrl}
                                                        videoElement={activeVideoElement ?? undefined}
                                                        openingProgress={imagePhoneDevice === "laptop" ? imagePhoneOpening : undefined}
                                                        modelUrl={imagePhoneDevice === "phone" || imagePhoneDevice === "iphone" ? imagePhoneModelUrl : undefined}
                                                        imageMaskConfig={effectivePhoneMaskConfig}
                                                        cropArea={cropArea}
                                                        initialRotationX={imagePhoneRotX}
                                                        initialRotationY={imagePhoneRotY}
                                                        initialRotationZ={imagePhoneRotZ}
                                                        onRotationChange={handlePhoneRotationChange}
                                                        onMount={handlePhoneMount}
                                                        onApi={handlePhoneApi}
                                                        zoom={1}
                                                        shadowIntensity={imagePhoneShadow}
                                                        shadowColor={imagePhoneShadowColor}
                                                        autoRotate={viewer3D.autoRotate}
                                                        rotationSpeed={viewer3D.rotationSpeed}
                                                        glow={viewer3D.glow}
                                                        environment={viewer3D.environment}
                                                        isSelected={isVideoSelected}
                                                        isHovered={isVideoHovered}
                                                        onSelectChange={(value) => setIsVideoSelected(value)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* End perspective wrapper div */}
                                {(isDraggingElement && (alignmentGuides.vertical.length > 0 || alignmentGuides.horizontal.length > 0)) && (
                                    <>
                                        {alignmentGuides.vertical.map((x, index) => (
                                            <div
                                                key={`v-${index}`}
                                                className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none"
                                                style={{ left: `${x}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                            />
                                        ))}
                                        {alignmentGuides.horizontal.map((y, index) => (
                                            <div
                                                key={`h-${index}`}
                                                className="absolute left-0 right-0 h-0.5 bg-white/30 pointer-events-none"
                                                style={{ top: `${y}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                            />
                                        ))}
                                    </>
                                )}

                                {(isDraggingVideo && (mockupAlignmentGuides.vertical.length > 0 || mockupAlignmentGuides.horizontal.length > 0)) && (
                                    <>
                                        {mockupAlignmentGuides.vertical.map((x, index) => (
                                            <div
                                                key={`mockup-v-${index}`}
                                                className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none"
                                                style={{ left: `${x}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                            />
                                        ))}
                                        {mockupAlignmentGuides.horizontal.map((y, index) => (
                                            <div
                                                key={`mockup-h-${index}`}
                                                className="absolute left-0 right-0 h-0.5 bg-white/30 pointer-events-none"
                                                style={{ top: `${y}%`, zIndex: VIDEO_Z_INDEX + 100 }}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* Capa 4: Camera overlay for preview — only in video mode */}
                                {mediaType !== "image" && cameraUrl && cameraConfig?.enabled && (
                                    <div data-camera-overlay className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
                                        <div
                                            tabIndex={0}
                                            onClick={() => { if (onCameraClick) onCameraClick(); }}
                                            onPointerDown={(e) => {
                                                if (!onCameraConfigChange || !cameraConfig) return;
                                                if (e.button !== 0) return;
                                                const container = previewContainerRef.current;
                                                if (!container) return;
                                                const rect = container.getBoundingClientRect();
                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                cameraDragRef.current = {
                                                    pointerId: e.pointerId,
                                                    startX: e.clientX,
                                                    startY: e.clientY,
                                                    initialX: cameraConfig.position.x,
                                                    initialY: cameraConfig.position.y,
                                                    rect,
                                                };
                                                setIsDraggingCamera(true);
                                            }}
                                            onPointerMove={(e) => {
                                                const drag = cameraDragRef.current;
                                                if (!drag || drag.pointerId !== e.pointerId || !onCameraConfigChange) return;
                                                const dx = (e.clientX - drag.startX) / drag.rect.width;
                                                const dy = (e.clientY - drag.startY) / drag.rect.height;
                                                const nextX = Math.min(1, Math.max(0, drag.initialX + dx));
                                                const nextY = Math.min(1, Math.max(0, drag.initialY + dy));
                                                onCameraConfigChange({ position: { x: nextX, y: nextY }, corner: "custom" });
                                            }}
                                            onPointerUp={(e) => {
                                                const drag = cameraDragRef.current;
                                                if (!drag || drag.pointerId !== e.pointerId) return;
                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                                cameraDragRef.current = null;
                                                setIsDraggingCamera(false);
                                            }}
                                            onPointerCancel={(e) => {
                                                const drag = cameraDragRef.current;
                                                if (!drag || drag.pointerId !== e.pointerId) return;
                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                                cameraDragRef.current = null;
                                                setIsDraggingCamera(false);
                                            }}
                                            className={`absolute pointer-events-auto select-none outline-none group ${onCameraConfigChange ? (isDraggingCamera ? "cursor-grabbing" : "cursor-grab") : ""}`}
                                            style={{
                                                width: `${cameraConfig.size * 100}cqmin`,
                                                aspectRatio: "1 / 1",
                                                left: `clamp(0px, calc(${cameraConfig.position.x * 100}% - ${cameraConfig.size * 50}cqmin), calc(100% - ${cameraConfig.size * 100}cqmin))`,
                                                top: `clamp(0px, calc(${cameraConfig.position.y * 100}% - ${cameraConfig.size * 50}cqmin), calc(100% - ${cameraConfig.size * 100}cqmin))`,
                                                transition: isDraggingCamera ? "none" : "left 120ms ease, top 120ms ease",
                                                touchAction: "none",
                                            }}
                                        >
                                            <video
                                                ref={cameraVideoRef}
                                                muted
                                                playsInline
                                                preload="auto"
                                                className={`size-full object-cover shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-shadow duration-200 ring-1 ring-white/15 group-hover:ring-1 group-hover:ring-white group-focus:ring-1 group-focus:ring-white ${cameraConfig.shape === "squircle" ? "squircle-element-camera" : ""}`}
                                                style={{
                                                    borderRadius: cameraConfig.shape === "circle" ? "50%" : cameraConfig.shape === "squircle" ? `${Math.round(20 * (0.5 + (cameraConfig.size * 100 - 20) / 40))}px` : `${Math.round(6 * (0.5 + (cameraConfig.size * 100 - 20) / 40))}px`,
                                                    transform: cameraConfig.mirror ? "scaleX(-1)" : undefined,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Text tool crosshair overlay — captures clicks to place text */}
                                {textToolActive && (
                                    <div
                                        className="absolute inset-0 cursor-crosshair"
                                        style={{ zIndex: 99999 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!onAddElement) return;
                                            const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                                            const maxZ = canvasElements.length > 0 ? Math.max(...canvasElements.map(el => el.zIndex)) : 1000;
                                            const newId = `text-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                                            const newEl = {
                                                id: newId, type: "text" as const, x, y, width: 30, height: 5, rotation: 0, opacity: 1,
                                                zIndex: maxZ + 1, content: "", fontSize: 48, fontFamily: "Inter, sans-serif",
                                                fontWeight: "bold" as const, color: "#ffffff",
                                            };
                                            onAddElement(newEl);
                                            setEditingTextId(newId);
                                            if (onTextToolDeactivate) onTextToolDeactivate();
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 self-stretch flex items-stretch z-10">
                    <LayersPanel
                        elements={canvasElements}
                        selectedId={selectedElementId}
                        selectedMultiIds={canvasSelectedIds}
                        onSelect={handleLayersSelect}
                        onMultiSelect={handleLayersMultiSelect}
                        onDelete={handleLayersDelete}
                        onReorder={handleLayersReorder}
                        onSetGroupId={handleLayersSetGroupId}
                        onToggleVisible={handleLayersToggleVisible}
                        onToggleLock={handleLayersToggleLock}
                        onBringToFront={handleLayersBringToFront}
                        onSendToBack={handleLayersSendToBack}
                        onGroup={handleLayersGroup}
                        onUngroup={handleLayersUngroup}
                        toolbar={layersPanelToolbar}
                        videoLayerVisible={!!(videoUrl || imageUrl)}
                        isVideoLayerSelected={isVideoSelected}
                        onVideoLayerSelect={handleVideoLayerSelect}
                        mediaType={mediaType}
                        hoveredElementId={hoveredElementId}
                        onHoverElement={setHoveredElementId}
                    />
                </div>

            </div>
        </div>
    );
}
export const VideoCanvas = memo(VideoCanvasInner);
