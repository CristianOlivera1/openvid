"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState } from "react";
import type { VideoCanvasHandle, VideoCanvasProps, VideoThumbnail } from "@/types";
import type { ImageElement, SvgElement } from "@/types/canvas-elements.types";
import { getCameraLayout } from "@/types/camera.types";
import { ASPECT_RATIO_DIMENSIONS } from "@/types";
import { getWallpaperUrl } from "@/lib/wallpaper.utils";
import { drawRoundedRect, drawRoundedRectBottomOnly, calculateScaledPadding, applyCanvasBackground, getAspectRatioStyle, getMaxWidth, Corner, getCornerStyle, getNearestCorner } from "@/lib/canvas.utils";
import { drawMockupToCanvas } from "@/lib/mockup-canvas.utils";
import { speedToTransitionMs, ZOOM_EASING, calculateZoomPhaseState } from "@/types/zoom.types";
import type { ZoomFragment } from "@/types/zoom.types";
import PlaceholderEditor from "../PlaceholderEditor";
import { MockupWrapper } from "./mockups/MockupWrapper";
import { DEFAULT_MOCKUP_CONFIG } from "@/types/mockup.types";
import { calculateSmoothZoom } from "@/lib/canvas.utils";
import { getSvgDataUrl } from "@/components/canvas-svg";
import { VIDEO_Z_INDEX, BOTTOM_ONLY_RADIUS_MOCKUPS, SELF_SHADOWING_MOCKUPS } from "@/lib/constants";
import { applyPerspective3D, disposePerspective3D } from "@/lib/perspective3d";
import { RotationHandleIcon } from "@/components/ui/RotationHandleIcon";
import { CanvasElementsLayer } from "./CanvasElementsLayer";
import { EditorHoverTooltip } from "./EditorHoverTooltip";
import { Icon } from "@iconify/react";
export type { VideoCanvasHandle, VideoCanvasProps };

export const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(function VideoCanvas({
    mediaType = "video",
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
    isUploading = false,
    videoTransform = { rotation: 0, translateX: 0, translateY: 0 },
    onVideoTransformChange,
    canvasElements = [],
    selectedElementId = null,
    onElementUpdate,
    onElementSelect,
    cameraUrl = null,
    cameraConfig = null,
    onCameraConfigChange,
    onCameraClick,
}, ref) {
    const wallpaperUrl = getWallpaperUrl(selectedWallpaper);

    const hasMedia = mediaType === "video" ? !!videoUrl : !!imageUrl;

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

        // Calculate 3-phase state
        const phaseState = calculateZoomPhaseState(activeZoomFragment, currentTime);

        // Calculate translation to keep focus point centered
        const translateX = (50 - phaseState.focusX) * (phaseState.scale - 1) * 2;
        const translateY = (50 - phaseState.focusY) * (phaseState.scale - 1) * 2;

        // During hold phase with movement, reduce transition to avoid jarring
        const isMoving = activeZoomFragment.movementEnabled && phaseState.phase === 'hold';
        const transitionMs = isMoving ? 50 : speedToTransitionMs(activeZoomFragment.speed);

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
    const wallpaperImageRef = useRef<HTMLImageElement | null>(null);
    const customImageRef = useRef<HTMLImageElement | null>(null);

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

    // Image zoom state (for photo mode)
    const [imageZoomScale, setImageZoomScale] = useState(1);

    // Set initial video src when videoUrl changes (initial load only — transitions manage src imperatively)
    const lastSetVideoUrlRef = useRef<string | null>(null);
    const preservedVideoStateRef = useRef<{ time: number; playing: boolean } | null>(null);

    // Reset lastSetVideoUrlRef when mockupId changes to force src re-assignment on remount
    useEffect(() => {
        lastSetVideoUrlRef.current = null;
    }, [mockupId]);

    useEffect(() => {
        if (videoRef.current && videoUrl) {
            // Always set src if video element has no src, src is empty, or we just changed mockup
            const videoSrc = videoRef.current.src;
            const needsSrc = !videoSrc || videoSrc === '' || videoSrc === window.location.href;
            const isNewUrl = videoUrl !== lastSetVideoUrlRef.current;

            if (needsSrc || isNewUrl) {
                videoRef.current.src = videoUrl;
                lastSetVideoUrlRef.current = videoUrl;

                if (preservedVideoStateRef.current) {
                    const { time, playing } = preservedVideoStateRef.current;
                    videoRef.current.currentTime = time;
                    if (playing) {
                        videoRef.current.play().catch(() => {
                            // Ignore play errors (may happen if video not ready)
                        });
                    }
                    preservedVideoStateRef.current = null;
                }
            }
        }
        if (!videoUrl) {
            lastSetVideoUrlRef.current = null;
        }
    }, [videoUrl, videoRef, mockupId]);

    // Preserve video state when mockup changes (detect unmount via cleanup)
    useEffect(() => {
        return () => {
            if (videoRef.current && videoUrl) {
                preservedVideoStateRef.current = {
                    time: videoRef.current.currentTime,
                    playing: !videoRef.current.paused,
                };
            }
        };
    }, [mockupId, videoUrl, videoRef]);

    // Dispose Three.js WebGL resources when component unmounts
    useEffect(() => {
        return () => {
            disposePerspective3D();
        };
    }, []);
    const [isDraggingVideo, setIsDraggingVideo] = useState(false);
    const [isDraggingRotation, setIsDraggingRotation] = useState(false);
    const [videoHoverCorner, setVideoHoverCorner] = useState<Corner>("top-right");
    const dragStartPos = useRef({ x: 0, y: 0, initialRotation: 0, initialTranslateX: 0, initialTranslateY: 0 });
    const lastAngleRef = useRef<number | null>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    // Camera overlay refs / state
    const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
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
    const elementDragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0, initialRotation: 0 });

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

    // Drag & drop state for images (photo mode only)
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Calculate mask styles - will be applied to mockup wrapper when mockup exists, or to image directly
    const maskStyles = useMemo(() => {
        if (!imageMaskConfig || !imageMaskConfig.enabled) return {};

        const masks = [];
        if (imageMaskConfig.top) {
            masks.push(`linear-gradient(180deg, transparent ${imageMaskConfig.top.from}%, black ${imageMaskConfig.top.to ?? 100}%)`);
        }
        if (imageMaskConfig.bottom) {
            masks.push(`linear-gradient(0deg, transparent ${imageMaskConfig.bottom.from}%, black ${imageMaskConfig.bottom.to ?? 100}%)`);
        }
        if (imageMaskConfig.left) {
            masks.push(`linear-gradient(90deg, transparent ${imageMaskConfig.left.from}%, black ${imageMaskConfig.left.to ?? 100}%)`);
        }
        if (imageMaskConfig.right) {
            masks.push(`linear-gradient(270deg, transparent ${imageMaskConfig.right.from}%, black ${imageMaskConfig.right.to ?? 100}%)`);
        }
        if (imageMaskConfig.angle !== undefined) {
            masks.push(`linear-gradient(${imageMaskConfig.angle}deg, transparent ${imageMaskConfig.angleFrom ?? 0}%, black ${imageMaskConfig.angleTo ?? 100}%)`);
        }

        if (masks.length === 0) return {};

        return {
            WebkitMaskImage: masks.join(', '),
            WebkitMaskComposite: 'source-in',
            maskImage: masks.join(', '),
            maskComposite: 'intersect'
        };
    }, [imageMaskConfig]);

    const hasMask = Object.keys(maskStyles).length > 0;
    const hasMockup = mockupId && mockupId !== "none";

    const elementImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const svgImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

    // Actualizar canvas dimensions cuando cambia el aspect ratio
    useEffect(() => {
        const canvas = exportCanvasRef.current;
        if (canvas) {
            canvas.width = exportDimensions.width;
            canvas.height = exportDimensions.height;
        }
    }, [exportDimensions]);

    // Precargar imagen de wallpaper para el canvas
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

    // Preload canvas element images (only for image elements, not SVGs)
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
                const container = videoContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const rawAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
                if (lastAngleRef.current === null) lastAngleRef.current = rawAngle;
                let delta = rawAngle - lastAngleRef.current;
                if (delta > 180) delta -= 360;
                if (delta < -180) delta += 360;
                lastAngleRef.current = rawAngle;
                onVideoTransformChange({ ...videoTransform, rotation: videoTransform.rotation + delta });
            } else if (isDraggingVideo) {
                const deltaX = e.clientX - dragStartPos.current.x;
                const deltaY = e.clientY - dragStartPos.current.y;
                const container = videoContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const percentX = (deltaX / rect.width) * 100;
                const percentY = (deltaY / rect.height) * 100;

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

                setMockupAlignmentGuides(guides);

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
            lastAngleRef.current = null;
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

    // Canvas elements drag & drop handlers
    useEffect(() => {
        if (!isDraggingElement && !isDraggingElementRotation) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!selectedElementId || !onElementUpdate) return;
            const selectedElement = canvasElements.find(el => el.id === selectedElementId);
            if (!selectedElement) return;

            if (isDraggingElementRotation) {
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
                onElementUpdate(selectedElementId, { rotation: elementDragStart.current.initialRotation + deltaAngle });
            } else if (isDraggingElement) {
                const container = canvasContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const deltaX = e.clientX - elementDragStart.current.x;
                const deltaY = e.clientY - elementDragStart.current.y;
                const percentX = (deltaX / rect.width) * 100;
                const percentY = (deltaY / rect.height) * 100;

                let newX = Math.max(0, Math.min(100, elementDragStart.current.initialX + percentX));
                let newY = Math.max(0, Math.min(100, elementDragStart.current.initialY + percentY));

                // Smart guides: snap to center (horizontal and vertical)
                const SNAP_THRESHOLD = 2;
                const centerX = 50;
                const centerY = 50;
                const guides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

                // Check horizontal center alignment
                if (Math.abs(newX - centerX) < SNAP_THRESHOLD) {
                    newX = centerX;
                    guides.vertical.push(centerX);
                }

                // Check vertical center alignment
                if (Math.abs(newY - centerY) < SNAP_THRESHOLD) {
                    newY = centerY;
                    guides.horizontal.push(centerY);
                }

                setAlignmentGuides(guides);

                onElementUpdate(selectedElementId, {
                    x: newX,
                    y: newY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingElement(false);
            setIsDraggingElementRotation(false);
            setAlignmentGuides({ vertical: [], horizontal: [] });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingElement, isDraggingElementRotation, selectedElementId, canvasElements, onElementUpdate]);

    // Image zoom with mouse wheel (photo mode only)
    useEffect(() => {
        if (mediaType !== "image" || !imageUrl) return;

        const handleWheel = (e: WheelEvent) => {
            // Only zoom if Ctrl/Cmd key is held (standard zoom gesture)
            if (!e.ctrlKey && !e.metaKey) return;

            e.preventDefault();

            const delta = -e.deltaY;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;

            setImageZoomScale(prev => {
                const newScale = Math.max(0.5, Math.min(3, prev * zoomFactor));
                return newScale;
            });
        };

        const container = previewContainerRef.current;
        if (!container) return;

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [mediaType, imageUrl]);

    // Drag & drop handlers for images
    const handleDragOver = (e: React.DragEvent) => {
        if (mediaType !== "image" || !onImageDrop) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (mediaType !== "image") return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (mediaType !== "image" || !onImageDrop) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onImageDrop(files);
        }
    };

    // Helper function to render canvas elements (SVG, images, text)
    const renderCanvasElements = async (
        ctx: CanvasRenderingContext2D,
        elements: typeof canvasElements,
        canvasWidth: number,
        canvasHeight: number,
        behindVideo: boolean
    ) => {
        const filteredElements = elements.filter(el =>
            behindVideo ? el.zIndex < VIDEO_Z_INDEX : el.zIndex >= VIDEO_Z_INDEX
        );
        const sortedElements = [...filteredElements].sort((a, b) => a.zIndex - b.zIndex);

        // Use smaller dimension as reference for consistent scaling across different aspect ratios
        const referenceSize = Math.min(canvasWidth, canvasHeight);

        for (const element of sortedElements) {
            if (element.type === "svg") {
                const svgElement = element as SvgElement;
                const svgDataUrl = getSvgDataUrl(svgElement.svgId, svgElement.color || "#FFFFFF");
                if (!svgDataUrl) continue;

                const cacheKey = `${svgElement.svgId}-${svgElement.color || "#FFFFFF"}`;
                let svgImage = svgImageCacheRef.current.get(cacheKey);
                if (!svgImage || svgImage.src !== svgDataUrl) {
                    svgImage = new Image();
                    svgImageCacheRef.current.set(cacheKey, svgImage);
                    svgImage.src = svgDataUrl;
                    await new Promise<void>((resolve) => {
                        if (svgImage!.complete) resolve();
                        else { svgImage!.onload = () => resolve(); svgImage!.onerror = () => resolve(); }
                    });
                } else if (!svgImage.complete) {
                    await new Promise<void>((resolve) => {
                        svgImage!.onload = () => resolve();
                        svgImage!.onerror = () => resolve();
                        setTimeout(resolve, 500);
                    });
                }

                ctx.save();

                const elemX = (svgElement.x / 100) * canvasWidth;
                const elemY = (svgElement.y / 100) * canvasHeight;
                const elemWidth = (svgElement.width / 100) * referenceSize;
                const elemHeight = (svgElement.height / 100) * referenceSize;

                // Translate to element position, rotate, then draw centered
                ctx.translate(elemX, elemY);
                ctx.rotate((svgElement.rotation * Math.PI) / 180);
                ctx.globalAlpha = svgElement.opacity;

                ctx.drawImage(
                    svgImage,
                    -elemWidth / 2,
                    -elemHeight / 2,
                    elemWidth,
                    elemHeight
                );

                ctx.restore();
            } else if (element.type === "image") {
                const img = elementImagesRef.current.get(element.imagePath);
                if (!img) continue;

                ctx.save();

                const elemX = (element.x / 100) * canvasWidth;
                const elemY = (element.y / 100) * canvasHeight;

                // Calculate element dimensions using reference size to maintain consistent scaling
                const elemWidth = (element.width / 100) * referenceSize;
                const elemHeight = (element.height / 100) * referenceSize;

                // For images, maintain the original aspect ratio
                const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                let finalWidth = elemWidth;
                let finalHeight = elemHeight;

                const elementAspectRatio = elemWidth / elemHeight;
                if (imgAspectRatio > elementAspectRatio) {
                    finalHeight = elemWidth / imgAspectRatio;
                } else {
                    finalWidth = elemHeight * imgAspectRatio;
                }

                ctx.translate(elemX, elemY);
                ctx.rotate((element.rotation * Math.PI) / 180);
                ctx.globalAlpha = element.opacity;

                ctx.drawImage(
                    img,
                    -finalWidth / 2,
                    -finalHeight / 2,
                    finalWidth,
                    finalHeight
                );

                ctx.restore();
            } else if (element.type === "text") {
                ctx.save();

                const elemX = (element.x / 100) * canvasWidth;
                const elemY = (element.y / 100) * canvasHeight;

                ctx.translate(elemX, elemY);
                ctx.rotate((element.rotation * Math.PI) / 180);
                ctx.globalAlpha = element.opacity;

                const scaledFontSize = element.fontSize * (referenceSize / 1080);
                const fontWeight = element.fontWeight === 'normal' ? '400' : element.fontWeight === 'medium' ? '500' : '700';
                ctx.font = `${fontWeight} ${scaledFontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText(element.content, 0, 0);

                ctx.restore();
            }
        }
    };

    // Función para dibujar un frame en el canvas de exportación
    const drawFrame = async () => {
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
        const scaledPaddingY = calculateScaledPadding(canvasHeight, paddingPercent);
        const scaledRadius = roundedCorners * (canvasWidth / 896);
        const scaledShadowBlur = shadows * (canvasWidth / 896) * 0.8;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const frameTime = mediaType === "video" && video ? video.currentTime : 0;
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
                    c.drawImage(backgroundImage, -overflow, -overflow, canvasWidth + overflow * 2, canvasHeight + overflow * 2);
                } else {
                    c.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
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

        // Shared helper: draw shadow + mockup + video into a 2D context
        const DEG_TO_RAD = Math.PI / 180;
        const drawMockupAndMedia = (
            c: CanvasRenderingContext2D,
            containerX: number, containerY: number, containerWidth: number, containerHeight: number,
            source: HTMLVideoElement | HTMLImageElement, applyImageXform: boolean
        ) => {
            const vCX = containerX + containerWidth / 2;
            const vCY = containerY + containerHeight / 2;
            const txPx = (videoTransform.translateX / 100) * containerWidth;
            const tyPx = (videoTransform.translateY / 100) * containerHeight;

            c.save();
            c.translate(vCX + txPx, vCY + tyPx);
            c.rotate(videoTransform.rotation * DEG_TO_RAD);

            if (applyImageXform && imageTransform && !apply3DToBackground) {
                if (imageTransform.perspective && imageTransform.perspective > 0 && (imageTransform.rotateX !== 0 || imageTransform.rotateY !== 0)) {
                    const rotXR = imageTransform.rotateX * DEG_TO_RAD;
                    const rotYR = imageTransform.rotateY * DEG_TO_RAD;
                    const tanY2 = Math.tan(rotYR);
                    const tanX2 = Math.tan(rotXR);
                    const sX2 = 1 / Math.sqrt(1 + tanY2 * tanY2);
                    const sY2 = 1 / Math.sqrt(1 + tanX2 * tanX2);
                    c.transform(sX2, tanX2 * sY2, tanY2 * sX2, sY2, 0, 0);
                }
                c.rotate(imageTransform.rotateZ * DEG_TO_RAD);
                c.scale(imageTransform.scale * imageZoomScale, imageTransform.scale * imageZoomScale);
                const iTY = (imageTransform.translateY / 100) * containerHeight;
                c.translate(0, iTY / (imageTransform.scale * imageZoomScale));
            }
            c.translate(-vCX, -vCY);

            // Shadow
            if (shadows > 0 && !SELF_SHADOWING_MOCKUPS.includes(mockupId)) {
                c.save();
                c.shadowColor = 'rgba(0, 0, 0, 0.5)';
                c.shadowBlur = scaledShadowBlur;
                c.shadowOffsetY = scaledShadowBlur * 0.3;
                c.fillStyle = 'black';
                drawRoundedRect(c, containerX, containerY, containerWidth, containerHeight, scaledRadius);
                c.fill();
                c.restore();
            }

            // Mockup frame
            const hasMockupLocal = mockupId && mockupId !== "none";
            const mockupCfg = mockupConfig || DEFAULT_MOCKUP_CONFIG;
            let vX = containerX, vY = containerY, vW = containerWidth, vH = containerHeight, vR = scaledRadius;

            if (hasMockupLocal) {
                const mBlur = SELF_SHADOWING_MOCKUPS.includes(mockupId) ? scaledShadowBlur : 0;
                const mr = drawMockupToCanvas(c, mockupId, mockupCfg, containerX, containerY, containerWidth, containerHeight, scaledRadius, mBlur, canvasWidth);
                vX = mr.contentX;
                vY = mr.contentY;
                vW = mr.contentWidth;
                vH = mr.contentHeight;
                vR = (mockupId === "iphone-slim" || mockupId === "glass-curve" || mockupId === "glass-full") ? scaledRadius * 6 : scaledRadius;
            }

            c.save();
            const bottomOnly = hasMockupLocal && BOTTOM_ONLY_RADIUS_MOCKUPS.includes(mockupId);
            if (vR > 0) {
                if (bottomOnly) {
                    drawRoundedRectBottomOnly(c, vX, vY, vW, vH, vR);
                } else {
                    drawRoundedRect(c, vX, vY, vW, vH, vR);
                }
                c.clip();
            } else {
                c.beginPath();
                c.rect(vX, vY, vW, vH);
                c.clip();
            }

            if (mediaType === "video") {
                c.filter = 'saturate(130%) contrast(104%) brightness(103%)';
            }

            if (cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)) {
                const sX = (cropArea.x / 100) * sourceWidth;
                const sY = (cropArea.y / 100) * sourceHeight;
                const cW2 = (cropArea.width / 100) * sourceWidth;
                const cH2 = (cropArea.height / 100) * sourceHeight;
                c.drawImage(source, sX, sY, cW2, cH2, vX, vY, vW, vH);
            } else {
                c.drawImage(source, vX, vY, vW, vH);
            }
            c.restore();
            c.restore();
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
            await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true);
            const { containerX: cX, containerY: cY, containerWidth: cW, containerHeight: cH } = computeContainer();
            drawMockupAndMedia(ctx, cX, cY, cW, cH, image!, true);
            await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, false);
            ctx.restore();
            return;
        }

        const has3DEffect = zoomState.perspective > 0 && (zoomState.rotateX !== 0 || zoomState.rotateY !== 0);
        const hasZoom = zoomState.scale !== 1;

        let focusPxX = 0, focusPxY = 0, fOffX = 0, fOffY = 0;
        if (hasZoom) {
            focusPxX = (zoomState.focusX / 100) * canvasWidth;
            focusPxY = (zoomState.focusY / 100) * canvasHeight;
            fOffX = (zoomCenterX - focusPxX) * (zoomState.scale - 1);
            fOffY = (zoomCenterY - focusPxY) * (zoomState.scale - 1);
        }

        const applyVideoZoom = (c: CanvasRenderingContext2D) => {
            if (hasZoom) {
                c.translate(focusPxX, focusPxY);
                c.scale(zoomState.scale, zoomState.scale);
                c.translate(-focusPxX + fOffX / zoomState.scale, -focusPxY + fOffY / zoomState.scale);
            }
        };

        let fgCanvas: HTMLCanvasElement | null = null;
        let fgCtx: CanvasRenderingContext2D | null = null;

        // 1. ELIMINAMOS renderScale. Usamos solo un margen fijo del 50% para el giro 3D.
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
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true);
        ctx.restore();

        const { containerX, containerY, containerWidth, containerHeight } = computeContainer();

        if (has3DEffect && fgCanvas && fgCtx) {
            fgCtx.save();
            fgCtx.translate(fgOffsetX, fgOffsetY);
            drawMockupAndMedia(fgCtx, containerX, containerY, containerWidth, containerHeight, video!, false);
            fgCtx.restore();

            applyPerspective3D(
                fgCanvas,
                zoomState.rotateX,
                zoomState.rotateY,
                zoomState.perspective * BLEED_FACTOR
            );

            ctx.save();
            applyVideoZoom(ctx);
            ctx.drawImage(fgCanvas, -fgOffsetX, -fgOffsetY, fgWidth, fgHeight);
            ctx.restore();
        } else {
            ctx.save();
            applyVideoZoom(ctx);
            drawMockupAndMedia(ctx, containerX, containerY, containerWidth, containerHeight, video!, false);
            ctx.restore();
        }

        ctx.save();
        applyVideoZoom(ctx);
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, false);
        ctx.restore();

        await drawCameraOverlay(ctx, canvasWidth, canvasHeight);
    };

    const drawCameraOverlay = async (
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ) => {
        const camVideo = cameraVideoRef.current;
        const mainVideo = videoRef.current;

        if (!camVideo || !cameraConfig || !cameraConfig.enabled) return;
        if (!camVideo.videoWidth || !camVideo.videoHeight) return;

        if (mainVideo && camVideo.duration > 0 && mainVideo.currentTime > camVideo.duration - 0.1) {
            return;
        }

        if (mainVideo && camVideo.paused && Math.abs(camVideo.currentTime - mainVideo.currentTime) > 0.05) {
            try {
                const targetTime = Math.min(mainVideo.currentTime, camVideo.duration - 0.05);
                camVideo.currentTime = targetTime;

                await new Promise<void>((resolve) => {
                    const timeoutId = setTimeout(() => {
                        camVideo.removeEventListener("seeked", onSeeked);
                        resolve();
                    }, 250);

                    const onSeeked = () => {
                        camVideo.removeEventListener("seeked", onSeeked);

                        const checkReady = setInterval(() => {
                            if (camVideo.readyState >= 3) {
                                clearInterval(checkReady);
                                clearTimeout(timeoutId);
                                resolve();
                            }
                        }, 10);
                    };

                    camVideo.addEventListener("seeked", onSeeked);
                });
            } catch {
            }
        }
        const { size, left: drawX, top: drawY } = getCameraLayout(
            cameraConfig,
            canvasWidth,
            canvasHeight
        );

        if (size <= 0) return;

        const shortSide = Math.min(canvasWidth, canvasHeight);

        const sizePercent = cameraConfig.size * 100;
        const sizeMultiplier = 0.5 + (sizePercent - 20) / 40;

        const srcShort = Math.min(camVideo.videoWidth, camVideo.videoHeight);
        const sx = (camVideo.videoWidth - srcShort) / 2;
        const sy = (camVideo.videoHeight - srcShort) / 2;

        ctx.save();

        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = shortSide * 0.02;
        ctx.shadowOffsetY = shortSide * 0.008;

        if (cameraConfig.shape === "circle") {
            const centerX = drawX + size / 2;
            const centerY = drawY + size / 2;
            const radius = size / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();
        } else {
            const radius =
                cameraConfig.shape === "squircle"
                    ? Math.round(75 * sizeMultiplier)
                    : Math.round(6 * sizeMultiplier);

            drawRoundedRect(ctx, drawX, drawY, size, size, radius);
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            drawRoundedRect(ctx, drawX, drawY, size, size, radius);
            ctx.clip();
        }

        if (camVideo && camVideo.readyState >= 2) {
            if (cameraConfig.mirror) {
                ctx.translate(drawX + size, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(camVideo, sx, sy, srcShort, srcShort, 0, 0, size, size);
            } else {
                ctx.drawImage(camVideo, sx, sy, srcShort, srcShort, drawX, drawY, size, size);
            }
        }
        ctx.restore();

    };

    useImperativeHandle(ref, () => ({
        getExportCanvas: () => exportCanvasRef.current,
        drawFrame,
        getPreviewContainer: () => previewContainerRef.current,
    }));

    return (
        <div
            className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden bg-[#09090B] p-2 sm:p-4 lg:p-1 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {mediaType === "image" && isDraggingOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                    <div className="flex flex-col items-center gap-4 text-white mask-[radial-gradient(circle,black_50%,transparent_95%)]">
                        <Icon icon="hugeicons:image-upload" width="120" />
                        <div className="text-xl font-semibold uppercase tracking-wider">
                            Suelta la imagen
                        </div>
                    </div>
                </div>

            )}

            <div className="absolute inset-0 pointer-events-none z-0"
                style={{ backgroundImage: 'radial-gradient(rgb(39, 39, 42) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            </div>
            <canvas
                ref={exportCanvasRef}
                width={exportDimensions.width}
                height={exportDimensions.height}
                className="hidden"
            />

            {/* Preview visual - contenedor con tamaño dinámico según aspect ratio */}
            <div
                ref={previewContainerRef}
                className={`relative shrink-0 overflow-hidden transition-all duration-300 ${mediaType === "image" && imageUrl
                    ? ""
                    : "border border-white/20 rounded-xl"
                    }`}
                style={{
                    aspectRatio: getAspectRatioStyle(aspectRatio, customAspectRatio ?? undefined),
                    maxWidth: getMaxWidth(aspectRatio, customAspectRatio ?? undefined),
                    width: '100%',
                    height: 'auto',
                    maxHeight: '100%',
                    containerType: 'size',
                }}
                onClick={(e) => {
                    if (!(e.target as HTMLElement).closest('[data-canvas-element]') && !(e.target as HTMLElement).closest('[data-camera-overlay]') && onElementSelect) {
                        onElementSelect(null);
                    }
                }}
            >
                {/* Zoom container - applies zoom to entire composition (background + video) */}
                <div className="absolute inset-0"
                    style={{
                        perspective: mediaType === "image" && imageTransform && apply3DToBackground ? `${imageTransform.perspective || 600}px` : 'none',
                        perspectiveOrigin: 'center center',
                    }}
                >
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute transition-all duration-200" style={{
                            inset: backgroundBlur > 0 ? `-${backgroundBlur}px` : '0',
                            ...(shouldShowCustomColor && backgroundColorCss
                                ? backgroundColorCss.startsWith('#') || backgroundColorCss.startsWith('rgb')
                                    ? { backgroundColor: backgroundColorCss }
                                    : { backgroundImage: backgroundColorCss }
                                : (shouldShowCustomImage || shouldShowUnsplashOverride)
                                    ? {
                                        backgroundImage: `url('${shouldShowCustomImage ? selectedImageUrl : unsplashOverrideUrl}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }
                                    : shouldShowWallpaper
                                        ? {
                                            backgroundImage: `url('${wallpaperUrl}')`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }
                                        : { backgroundColor: 'transparent' }),
                            filter: backgroundBlur > 0 ? `blur(${backgroundBlur * 0.4}px)` : 'none',
                        }} />
                    </div>
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
                        }}
                    >
                        {/* Capa 2A: Canvas elements BEHIND video — sin rotación 3D */}
                        <CanvasElementsLayer
                            canvasContainerRef={canvasContainerRef}
                            canvasElements={canvasElements}
                            selectedElementId={selectedElementId}
                            hoveredElementId={hoveredElementId}
                            isDraggingElement={isDraggingElement}
                            behindVideo={true}
                            onElementSelect={onElementSelect}
                            onElementUpdate={onElementUpdate}
                            setHoveredElementId={setHoveredElementId}
                            setIsDraggingElement={setIsDraggingElement}
                            setIsDraggingElementRotation={setIsDraggingElementRotation}
                            elementDragStart={elementDragStart}
                            layerZIndex={1}
                        />

                        {/* 3D rotation layer — solo envuelve el mockup, el fondo queda plano */}
                        <div
                            className="absolute inset-0 origin-center"
                            style={{
                                transform: zoomTransform.perspective > 0
                                    ? `rotateX(${zoomTransform.rotateX}deg) rotateY(${zoomTransform.rotateY}deg)`
                                    : 'none',
                                transition: `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                                willChange: zoomTransform.perspective > 0 ? 'transform' : 'auto',
                                transformStyle: 'preserve-3d',
                                zIndex: 2
                            }}
                        >
                            {/* Capa 2B: Video con padding, esquinas redondeadas y sombras */}
                            <div
                                className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                                style={{
                                    padding: `${padding * 0.5}%`,
                                    zIndex: 2,
                                    pointerEvents: 'none',
                                    ...(mediaType === "image" && imageTransform && !apply3DToBackground ? {
                                        perspective: `${imageTransform.perspective || 600}px`,
                                        perspectiveOrigin: 'center center',
                                    } : {})
                                }}
                            >
                                <div
                                    ref={videoContainerRef}
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
                                        transition: (mediaType === "image" && imageTransform && !apply3DToBackground)
                                            ? 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                            : isDraggingVideo || isDraggingRotation ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                        pointerEvents: 'auto',
                                        transformStyle: mediaType === "image" && !apply3DToBackground ? 'preserve-3d' : undefined,
                                    }}
                                    onMouseEnter={() => hasMedia && setIsVideoHovered(true)}
                                    onMouseLeave={() => setIsVideoHovered(false)}
                                    onMouseDown={(e) => {
                                        if (!hasMedia || !onVideoTransformChange) return;
                                        // Only start dragging if not clicking on rotation handle
                                        if ((e.target as HTMLElement).closest('[data-rotation-handle]')) return;

                                        e.preventDefault();
                                        setIsDraggingVideo(true);
                                        dragStartPos.current = {
                                            x: e.clientX,
                                            y: e.clientY,
                                            initialRotation: videoTransform.rotation,
                                            initialTranslateX: videoTransform.translateX,
                                            initialTranslateY: videoTransform.translateY,
                                        };
                                    }}
                                    onMouseMove={(e) => { if (hasMedia) setVideoHoverCorner(getNearestCorner(e, videoTransform.rotation)); }}
                                >
                                    <div className="relative">
                                        {isVideoHovered && hasMedia && onVideoTransformChange && (
                                            <div
                                                data-rotation-handle
                                                style={getCornerStyle(videoHoverCorner, -14)}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    lastAngleRef.current = null;
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
                                                <div style={{
                                                    transform: `scale(${mediaType === "image" && imageTransform && !apply3DToBackground
                                                        ? 1 / (imageTransform.scale * imageZoomScale)
                                                        : 1
                                                        })`,
                                                    transformOrigin: "center center"
                                                }}>
                                                    <RotationHandleIcon corner={videoHoverCorner} color="#e5e7eb" />
                                                </div>
                                            </div>
                                        )}
                                        {isVideoHovered && hasMedia && !isDraggingVideo && !isDraggingRotation && (
                                            <div
                                                className="absolute -inset-px border border-white pointer-events-none z-10 opacity-80"
                                                style={{ borderRadius: `${roundedCorners + 1}px` }}
                                            />
                                        )}

                                        {/* Wrapper for mask: applies to entire mockup if mockup exists */}
                                        <div
                                            className="w-full h-full"
                                            style={hasMask && hasMockup ? maskStyles : {}}
                                        >
                                            <MockupWrapper
                                                mockupId={mockupId}
                                                config={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                                                roundedCorners={roundedCorners}
                                                shadows={shadows}
                                            >
                                                {hasMedia ? (
                                                    <div className="relative flex items-center justify-center overflow-hidden w-full h-full rounded-[inherit]">
                                                        {mediaType === "video" && videoUrl ? (
                                                            <>
                                                                <video
                                                                    key={videoUrl}
                                                                    ref={videoRef}
                                                                    preload="auto"
                                                                    playsInline
                                                                    className="w-full h-full object-contain"
                                                                    style={{
                                                                        ...(cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)
                                                                            ? { objectViewBox: `inset(${cropArea.y}% ${100 - cropArea.x - cropArea.width}% ${100 - cropArea.y - cropArea.height}% ${cropArea.x}%)` }
                                                                            : {}),
                                                                        ...(hasMask && !hasMockup ? maskStyles : {}),
                                                                        opacity: currentThumbnail ? 0 : 1,
                                                                    }}
                                                                    onTimeUpdate={onTimeUpdate}
                                                                    onLoadedMetadata={onLoadedMetadata}
                                                                    onEnded={onEnded}
                                                                />
                                                                {currentThumbnail && (
                                                                    <img
                                                                        src={currentThumbnail.dataUrl}
                                                                        alt="Preview"
                                                                        crossOrigin="anonymous"
                                                                        className="absolute inset-0 w-full h-full object-contain"
                                                                        style={hasMask && !hasMockup ? maskStyles : {}}
                                                                    />
                                                                )}
                                                            </>
                                                        ) : mediaType === "image" && imageUrl ? (
                                                            <>
                                                                <img
                                                                    ref={imageRef as React.RefObject<HTMLImageElement>}
                                                                    src={imageUrl}
                                                                    alt="Editing image"
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-contain"
                                                                    style={{
                                                                        ...(cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0) ? {
                                                                            objectViewBox: `inset(${cropArea.y}% ${100 - cropArea.x - cropArea.width}% ${100 - cropArea.y - cropArea.height}% ${cropArea.x}%)`
                                                                        } : {}),
                                                                        ...(hasMask && !hasMockup ? maskStyles : {}),
                                                                    }}
                                                                    onLoad={onLoadedMetadata}
                                                                />
                                                                <div
                                                                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                                                                    style={{
                                                                        background: "radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.75) 100%)",
                                                                        opacity: isVideoHovered ? 1 : 0,
                                                                        zIndex: 10
                                                                    }}
                                                                />
                                                            </>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full aspect-video min-w-75 bg-[#1E1E1E] border border-white/10 flex flex-col overflow-hidden">
                                                        <PlaceholderEditor
                                                            onVideoUpload={mediaType === "video" ? onVideoUpload : onImageUpload}
                                                            isUploading={isUploading}
                                                            mediaType={mediaType}
                                                        />
                                                    </div>
                                                )}
                                            </MockupWrapper>
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
                                    <EditorHoverTooltip show={isVideoHovered && mediaType === "image"} />
                                </div>
                            </div>
                        </div>
                        {/* Capa 3: Canvas elements ABOVE video (zIndex >= VIDEO_Z_INDEX) */}
                        <CanvasElementsLayer
                            canvasContainerRef={undefined}
                            canvasElements={canvasElements}
                            selectedElementId={selectedElementId}
                            hoveredElementId={hoveredElementId}
                            isDraggingElement={isDraggingElement}
                            behindVideo={false}
                            onElementSelect={onElementSelect}
                            onElementUpdate={onElementUpdate}
                            setHoveredElementId={setHoveredElementId}
                            setIsDraggingElement={setIsDraggingElement}
                            setIsDraggingElementRotation={setIsDraggingElementRotation}
                            elementDragStart={elementDragStart}
                            layerZIndex={3}
                        />

                        {/* Capa HIT: invisible, todos los elementos, para recibir eventos */}
                        <CanvasElementsLayer
                            canvasContainerRef={undefined}
                            canvasElements={canvasElements}
                            selectedElementId={selectedElementId}
                            hoveredElementId={hoveredElementId}
                            isDraggingElement={isDraggingElement}
                            behindVideo={true}
                            onElementSelect={onElementSelect}
                            onElementUpdate={onElementUpdate}
                            setHoveredElementId={setHoveredElementId}
                            setIsDraggingElement={setIsDraggingElement}
                            setIsDraggingElementRotation={setIsDraggingElementRotation}
                            elementDragStart={elementDragStart}
                            layerZIndex={100}
                            hitTestOnly={true}
                        />

                    </div>
                    {/* End perspective wrapper div */}
                    {(isDraggingElement && (alignmentGuides.vertical.length > 0 || alignmentGuides.horizontal.length > 0)) && (
                        <>
                            {alignmentGuides.vertical.map((x, index) => (
                                <div
                                    key={`v-${index}`}
                                    className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none"
                                    style={{
                                        left: `${x}%`,
                                        zIndex: VIDEO_Z_INDEX + 100,
                                    }}
                                />
                            ))}
                            {alignmentGuides.horizontal.map((y, index) => (
                                <div
                                    key={`h-${index}`}
                                    className="absolute left-0 right-0 h-0.5 bg-white/30 pointer-events-none"
                                    style={{
                                        top: `${y}%`,
                                        zIndex: VIDEO_Z_INDEX + 100,
                                    }}
                                />
                            ))}
                        </>
                    )}

                    {/* Smart alignment guides for mockup (video/image) */}
                    {(isDraggingVideo && (mockupAlignmentGuides.vertical.length > 0 || mockupAlignmentGuides.horizontal.length > 0)) && (
                        <>
                            {/* Vertical guides */}
                            {mockupAlignmentGuides.vertical.map((x, index) => (
                                <div
                                    key={`mockup-v-${index}`}
                                    className="absolute top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none"
                                    style={{
                                        left: `${x}%`,
                                        zIndex: VIDEO_Z_INDEX + 100,
                                    }}
                                />
                            ))}
                            {/* Horizontal guides */}
                            {mockupAlignmentGuides.horizontal.map((y, index) => (
                                <div
                                    key={`mockup-h-${index}`}
                                    className="absolute left-0 right-0 h-0.5 bg-white/30 pointer-events-none"
                                    style={{
                                        top: `${y}%`,
                                        zIndex: VIDEO_Z_INDEX + 100,
                                    }}
                                />
                            ))}
                        </>
                    )}

                    {/* Capa 4: Camera overlay for preview — only in video mode */}
                    {mediaType !== "image" && cameraUrl && cameraConfig?.enabled && (
                        <div data-camera-overlay className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
                            <div
                                tabIndex={0}
                                onClick={() => {
                                    if (onCameraClick) {
                                        onCameraClick();
                                    }
                                }}
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
                                    onCameraConfigChange({
                                        position: { x: nextX, y: nextY },
                                        corner: "custom",
                                    });
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
                                className={`absolute pointer-events-auto select-none outline-none group ${onCameraConfigChange ? (isDraggingCamera ? "cursor-grabbing" : "cursor-grab") : ""
                                    }`}
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
                                        borderRadius:
                                            cameraConfig.shape === "circle"
                                                ? "50%"
                                                : cameraConfig.shape === "squircle"
                                                    ? `${Math.round(20 * (0.5 + (cameraConfig.size * 100 - 20) / 40))}px`
                                                    : `${Math.round(6 * (0.5 + (cameraConfig.size * 100 - 20) / 40))}px`,
                                        transform: cameraConfig.mirror ? "scaleX(-1)" : undefined,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
