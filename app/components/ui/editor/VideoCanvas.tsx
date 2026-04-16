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
import { RotationHandleIcon } from "@/components/ui/RotationHandleIcon";
import { CanvasElementsLayer } from "./CanvasElementsLayer";
export type { VideoCanvasHandle, VideoCanvasProps };

export const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(function VideoCanvas({
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

    // Determinar qué background mostrar basado en el tab activo
    const shouldShowUnsplashOverride = backgroundTab === "wallpaper" && unsplashOverrideUrl !== "";
    const shouldShowWallpaper = backgroundTab === "wallpaper" && selectedWallpaper >= 0 && !shouldShowUnsplashOverride;
    const shouldShowCustomImage = backgroundTab === "image" && selectedImageUrl !== "";
    const shouldShowCustomColor = backgroundTab === "color" && !!backgroundColorCss;

    // Canvas para exportación (no visible, solo para renderizado)
    const exportCanvasRef = useRef<HTMLCanvasElement>(null);
    const wallpaperImageRef = useRef<HTMLImageElement | null>(null);
    const customImageRef = useRef<HTMLImageElement | null>(null);

    // Calcular dimensiones de exportación según aspect ratio
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

                // Restore preserved state after src is set
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
            // On unmount, save video state to restore on remount
            if (videoRef.current && videoUrl) {
                preservedVideoStateRef.current = {
                    time: videoRef.current.currentTime,
                    playing: !videoRef.current.paused,
                };
            }
        };
    }, [mockupId, videoUrl, videoRef]);
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
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Canvas element images cache (only for actual images, not SVGs)
    const elementImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
    // SVG element image cache keyed by "svgId-color" — avoids new Image() per frame
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
                onVideoTransformChange({
                    ...videoTransform,
                    translateX: dragStartPos.current.initialTranslateX + percentX,
                    translateY: dragStartPos.current.initialTranslateY + percentY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingVideo(false);
            setIsDraggingRotation(false);
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
                onElementUpdate(selectedElementId, {
                    x: Math.max(0, Math.min(100, elementDragStart.current.initialX + percentX)),
                    y: Math.max(0, Math.min(100, elementDragStart.current.initialY + percentY)),
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingElement(false);
            setIsDraggingElementRotation(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingElement, isDraggingElementRotation, selectedElementId, canvasElements, onElementUpdate]);

    // Helper function to render canvas elements (SVG, images, text)
    // If behindVideo is true, only render elements with zIndex < VIDEO_Z_INDEX
    // If behindVideo is false, only render elements with zIndex >= VIDEO_Z_INDEX
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
                // Use reference size for both width and height to maintain square aspect ratio for SVGs
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

                // Apply object-contain logic: scale to fit within element bounds while maintaining aspect ratio
                const elementAspectRatio = elemWidth / elemHeight;
                if (imgAspectRatio > elementAspectRatio) {
                    // Image is wider - fit to width
                    finalHeight = elemWidth / imgAspectRatio;
                } else {
                    // Image is taller - fit to height
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

                // Scale font size proportionally to canvas size using reference dimension
                // Base reference is 1080px (typical preview height)
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
        const ctx = canvas?.getContext('2d', {
            alpha: true,
            desynchronized: false,
            willReadFrequently: false
        });
        const video = videoRef.current;

        if (!canvas || !ctx || !video) return;

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calcular propiedades escaladas
        const paddingPercent = padding * 0.5 / 100;
        const scaledPaddingX = calculateScaledPadding(canvasWidth, paddingPercent);
        const scaledPaddingY = calculateScaledPadding(canvasHeight, paddingPercent);
        const scaledRadius = roundedCorners * (canvasWidth / 896);
        const scaledShadowBlur = shadows * (canvasWidth / 896) * 0.8;

        // Reset canvas transformation matrix and clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const frameTime = video.currentTime;
        const zoomState = calculateSmoothZoom(frameTime, zoomFragments);

        ctx.save();

        // Apply zoom transform to entire canvas (affects everything including background)
        const zoomCenterX = canvasWidth / 2;
        const zoomCenterY = canvasHeight / 2;

        if (zoomState.scale !== 1 || zoomState.rotateX !== 0 || zoomState.rotateY !== 0) {

            // Punto de enfoque en píxeles
            const focusPxX = (zoomState.focusX / 100) * canvasWidth;
            const focusPxY = (zoomState.focusY / 100) * canvasHeight;

            // 1. Trasladar al punto de enfoque (centro de toda la transformación)
            ctx.translate(focusPxX, focusPxY);

            // 2. Aplicar 3D centrado en el punto de enfoque
            if (zoomState.perspective > 0 && (zoomState.rotateX !== 0 || zoomState.rotateY !== 0)) {
                const rotateXRad = (zoomState.rotateX * Math.PI) / 180;
                const rotateYRad = (zoomState.rotateY * Math.PI) / 180;

                const tanY = Math.tan(rotateYRad);
                const tanX = Math.tan(rotateXRad);
                const scaleX = 1 / Math.sqrt(1 + tanY * tanY);
                const scaleY = 1 / Math.sqrt(1 + tanX * tanX);
                const skewX = tanY * scaleX;
                const skewY = tanX * scaleY;

                ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0);
            }

            // 3. Aplicar zoom: escalar desde el punto de enfoque
            // El offset mueve el contenido para que focusX/Y quede centrado en pantalla
            const offsetX = (zoomCenterX - focusPxX) * (zoomState.scale - 1);
            const offsetY = (zoomCenterY - focusPxY) * (zoomState.scale - 1);
            ctx.scale(zoomState.scale, zoomState.scale);

            // 4. Volver al sistema de coordenadas del canvas, ajustando por zoom y offset de enfoque
            ctx.translate(
                -focusPxX + offsetX / zoomState.scale,
                -focusPxY + offsetY / zoomState.scale
            );
        }

        const backgroundImage = (shouldShowCustomImage || shouldShowUnsplashOverride) ? customImageRef.current : (shouldShowWallpaper ? wallpaperImageRef.current : null);

        // 1. Dibujar fondo
        if (shouldShowCustomColor && backgroundColorCss) {
            applyCanvasBackground(ctx, backgroundColorCss, canvasWidth, canvasHeight);
        } else if (backgroundImage) {
            ctx.save();

            if (backgroundBlur > 0) {
                ctx.filter = `blur(${backgroundBlur * 0.8}px)`;
                const overflow = backgroundBlur * 2;
                ctx.drawImage(
                    backgroundImage,
                    -overflow,
                    -overflow,
                    canvasWidth + overflow * 2,
                    canvasHeight + overflow * 2
                );
            } else {
                ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
            }

            ctx.restore();
        }

        // 2. Render elements BEHIND video (zIndex < VIDEO_Z_INDEX) - before video transform
        await renderCanvasElements(ctx, canvasElements, canvasWidth, canvasHeight, true);

        // 3. Calcular área disponible para el mockup/video
        const availableWidth = canvasWidth - scaledPaddingX * 2;
        const availableHeight = canvasHeight - scaledPaddingY * 2;

        // Obtener las dimensiones reales del video (considerando crop si existe)
        let videoSourceWidth = video.videoWidth;
        let videoSourceHeight = video.videoHeight;

        if (cropArea && (cropArea.width < 100 || cropArea.height < 100)) {
            videoSourceWidth = (cropArea.width / 100) * video.videoWidth;
            videoSourceHeight = (cropArea.height / 100) * video.videoHeight;
        }

        // Calcular aspect ratio del video fuente
        const videoAspectRatio = videoSourceWidth / videoSourceHeight;
        const availableAspectRatio = availableWidth / availableHeight;

        // Calcular dimensiones del contenedor (mockup o video directo)
        let containerWidth: number;
        let containerHeight: number;

        if (videoAspectRatio > availableAspectRatio) {
            containerWidth = availableWidth;
            containerHeight = availableWidth / videoAspectRatio;
        } else {
            containerHeight = availableHeight;
            containerWidth = availableHeight * videoAspectRatio;
        }

        // Centrar el contenedor en el área disponible
        const containerX = scaledPaddingX + (availableWidth - containerWidth) / 2;
        const containerY = scaledPaddingY + (availableHeight - containerHeight) / 2;

        // 4. Aplicar transformaciones del video (rotación y traslación)
        ctx.save();

        // Determinar el centro real del contenedor para rotar sobre su propio eje
        const videoCenterX = containerX + containerWidth / 2;
        const videoCenterY = containerY + containerHeight / 2;

        // Calcular traslación en píxeles basada en el tamaño del contenedor
        const translateXPx = (videoTransform.translateX / 100) * containerWidth;
        const translateYPx = (videoTransform.translateY / 100) * containerHeight;

        // Mover el origen al centro, trasladar, rotar, y devolver el origen a la esquina
        ctx.translate(videoCenterX + translateXPx, videoCenterY + translateYPx);
        ctx.rotate((videoTransform.rotation * Math.PI) / 180);
        ctx.translate(-videoCenterX, -videoCenterY);

        // 5. Dibujar sombra del contenedor (ahora rotará y se moverá con todo lo demás)
        if (shadows > 0 && !SELF_SHADOWING_MOCKUPS.includes(mockupId)) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = scaledShadowBlur;
            ctx.shadowOffsetY = scaledShadowBlur * 0.3;

            ctx.fillStyle = 'black';
            drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, scaledRadius);
            ctx.fill();
            ctx.restore();
        }

        // 6. Determinar si hay mockup activo y dibujarlo
        const hasMockup = mockupId && mockupId !== "none";
        const currentMockupConfig = mockupConfig || DEFAULT_MOCKUP_CONFIG;

        let videoX = containerX;
        let videoY = containerY;
        let videoWidth = containerWidth;
        let videoHeight = containerHeight;
        let videoRadius = scaledRadius;

        if (hasMockup) {
            const mockupShadowBlur = SELF_SHADOWING_MOCKUPS.includes(mockupId) ? scaledShadowBlur : 0;
            const mockupResult = drawMockupToCanvas(
                ctx,
                mockupId,
                currentMockupConfig,
                containerX,
                containerY,
                containerWidth,
                containerHeight,
                scaledRadius,
                mockupShadowBlur,
                canvasWidth
            );

            videoX = mockupResult.contentX;
            videoY = mockupResult.contentY;
            videoWidth = mockupResult.contentWidth;
            videoHeight = mockupResult.contentHeight;
            videoRadius = mockupId === "iphone-slim" || mockupId === "glass-curve" || mockupId === "glass-full" ? scaledRadius * 6 : scaledRadius;
        }

        // 7. Dibujar video con esquinas redondeadas
        ctx.save();
        const needsBottomOnlyRadius = hasMockup && BOTTOM_ONLY_RADIUS_MOCKUPS.includes(mockupId);

        if (videoRadius > 0) {
            if (needsBottomOnlyRadius) {
                drawRoundedRectBottomOnly(ctx, videoX, videoY, videoWidth, videoHeight, videoRadius);
            } else {
                drawRoundedRect(ctx, videoX, videoY, videoWidth, videoHeight, videoRadius);
            }
            ctx.clip();
        } else {
            ctx.beginPath();
            ctx.rect(videoX, videoY, videoWidth, videoHeight);
            ctx.clip();
        }

        // Aplicar crop si existe
        if (cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)) {
            const sourceX = (cropArea.x / 100) * video.videoWidth;
            const sourceY = (cropArea.y / 100) * video.videoHeight;
            const sourceWidth = (cropArea.width / 100) * video.videoWidth;
            const sourceHeight = (cropArea.height / 100) * video.videoHeight;

            ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, videoX, videoY, videoWidth, videoHeight);
        } else {
            ctx.drawImage(video, videoX, videoY, videoWidth, videoHeight);
        }

        ctx.restore();
        ctx.restore();

        // 8. Render elements ABOVE video (zIndex >= VIDEO_Z_INDEX)
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

        try {
            if (cameraConfig.mirror) {
                ctx.translate(drawX + size, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(camVideo, sx, sy, srcShort, srcShort, 0, 0, size, size);
            } else {
                ctx.drawImage(camVideo, sx, sy, srcShort, srcShort, drawX, drawY, size, size);
            }
        } catch (e) {
        }

        ctx.restore();
    };

    useImperativeHandle(ref, () => ({
        getExportCanvas: () => exportCanvasRef.current,
        drawFrame,
    }));

    return (
        <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden bg-[#09090B] p-2 sm:p-4 lg:p-1">
            {/* Canvas oculto para exportación */}
            <canvas
                ref={exportCanvasRef}
                width={exportDimensions.width}
                height={exportDimensions.height}
                className="hidden"
            />

            {/* Preview visual - contenedor con tamaño dinámico según aspect ratio */}
            <div
                ref={previewContainerRef}
                className="relative shrink-0 overflow-hidden border border-white/20 rounded-xl transition-all duration-300"
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
                <div
                    className="absolute inset-0"
                    style={{
                        perspective: zoomTransform.perspective > 0 ? `${zoomTransform.perspective}px` : 'none',
                        perspectiveOrigin: 'center center',
                    }}
                >
                    {/* Zoom + translate layer */}
                    <div
                        className="absolute inset-0 origin-center"
                        style={{
                            transform: `scale(${zoomTransform.scale}) translate(${zoomTransform.translateX}%, ${zoomTransform.translateY}%)`,
                            transition: zoomTransform.isMoving
                                ? `transform ${zoomTransform.transitionMs}ms linear`
                                : `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                            transformStyle: 'preserve-3d', // ← mover aquí desde el div hijo
                        }}
                    >
                        {/* 3D rotation layer */}
                        <div
                            className="absolute inset-0 origin-center"
                            style={{
                                transform: zoomTransform.perspective > 0
                                    ? `rotateX(${zoomTransform.rotateX}deg) rotateY(${zoomTransform.rotateY}deg)`
                                    : 'none',
                                transition: `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
                                // ← quitar transformStyle de aquí
                            }}
                        >
                            {/* Capa 1: Fondo (siempre llena todo el contenedor) */}
                            <div
                                className="absolute inset-0 overflow-hidden"
                            >
                                <div
                                    className="absolute transition-all duration-200"
                                    style={{
                                        inset: backgroundBlur > 0 ? `-${backgroundBlur}px` : '0',
                                        ...(shouldShowCustomColor && backgroundColorCss
                                            ? // Color sólido o gradiente CSS
                                            backgroundColorCss.startsWith('#') || backgroundColorCss.startsWith('rgb')
                                                ? { backgroundColor: backgroundColorCss }
                                                : { backgroundImage: backgroundColorCss }
                                            : (shouldShowCustomImage || shouldShowUnsplashOverride)
                                                ? // Imagen personalizada o Unsplash override
                                                {
                                                    backgroundImage: `url('${shouldShowCustomImage ? selectedImageUrl : unsplashOverrideUrl}')`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                }
                                                : shouldShowWallpaper
                                                    ? // Wallpaper
                                                    {
                                                        backgroundImage: `url('${wallpaperUrl}')`,
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                    }
                                                    :
                                                    { backgroundColor: 'transparent' }
                                        ),
                                        filter: backgroundBlur > 0 ? `blur(${backgroundBlur * 0.4}px)` : 'none',
                                    }}
                                />
                            </div>

                            {/* Capa 2A: Canvas elements BEHIND video (zIndex < VIDEO_Z_INDEX) */}
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

                            {/* Capa 2B: Video con padding, esquinas redondeadas y sombras */}
                            <div
                                className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                                style={{ padding: `${padding * 0.5}%`, zIndex: 2, pointerEvents: 'none' }}
                            >
                                <div
                                    ref={videoContainerRef}
                                    className="relative flex w-full h-full items-center justify-center max-w-full max-h-full"
                                    style={{
                                        transform: `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg)`,
                                        cursor: isDraggingVideo ? 'move' : (isVideoHovered && videoUrl ? 'move' : 'default'),
                                        transition: isDraggingVideo || isDraggingRotation ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                        pointerEvents: 'auto',
                                    }}
                                    onMouseEnter={() => videoUrl && setIsVideoHovered(true)}
                                    onMouseLeave={() => setIsVideoHovered(false)}
                                    onMouseDown={(e) => {
                                        if (!videoUrl || !onVideoTransformChange) return;
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
                                    onMouseMove={(e) => { if (videoUrl) setVideoHoverCorner(getNearestCorner(e, videoTransform.rotation)); }}
                                >
                                    <div className="relative">
                                        {/* Rotation handle */}
                                        {isVideoHovered && videoUrl && onVideoTransformChange && (
                                            <div
                                                data-rotation-handle style={getCornerStyle(videoHoverCorner, -14)}
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
                                                <RotationHandleIcon corner={videoHoverCorner} color="#e5e7eb" />
                                            </div>
                                        )}
                                        {isVideoHovered && videoUrl && !isDraggingVideo && !isDraggingRotation && (
                                            <div
                                                className="absolute -inset-px border border-white pointer-events-none z-10 opacity-80"
                                                style={{ borderRadius: `${roundedCorners + 1}px` }}
                                            />
                                        )}
                                        <MockupWrapper
                                            mockupId={mockupId}
                                            config={mockupConfig ?? DEFAULT_MOCKUP_CONFIG}
                                            roundedCorners={roundedCorners}
                                            shadows={shadows}
                                        >
                                            {videoUrl ? (
                                                <div className="relative flex items-center justify-center overflow-hidden w-full h-full rounded-[inherit]"
                                                >                                    {/* Video element - src managed imperatively via videoRef, NOT as React prop */}
                                                    <video
                                                        key={videoUrl}
                                                        ref={videoRef}
                                                        preload="auto"
                                                        playsInline
                                                        className="w-full h-full object-contain"
                                                        style={{
                                                            // Aplicar crop usando object-view-box (CSS nativo)
                                                            ...(cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0) ? {
                                                                objectViewBox: `inset(${cropArea.y}% ${100 - cropArea.x - cropArea.width}% ${100 - cropArea.y - cropArea.height}% ${cropArea.x}%)`,
                                                            } : {}),
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
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full h-full aspect-video min-w-75 bg-[#1E1E1E] border border-white/10 flex flex-col overflow-hidden">
                                                    <PlaceholderEditor
                                                        onVideoUpload={onVideoUpload}
                                                        isUploading={isUploading}
                                                    />
                                                </div>
                                            )}
                                        </MockupWrapper>
                                    </div>
                                </div>
                            </div>
                            {/* End zoom transform div */}
                        </div>
                    </div>
                    {/* End perspective wrapper div */}
                    {/* Capa 3: Canvas elements ABOVE video (zIndex >= VIDEO_Z_INDEX) */}
                    <CanvasElementsLayer
                        canvasContainerRef={canvasContainerRef}
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
                    {/* Capa 4: Camera overlay for preview — outside zoom transform, stays fixed */}
                    {cameraUrl && cameraConfig?.enabled && (
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
