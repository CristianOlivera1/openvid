"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState } from "react";
import type { VideoCanvasHandle, VideoCanvasProps, VideoThumbnail } from "@/types";
import type { ImageElement, SvgElement } from "@/types/canvas-elements.types";
import { ASPECT_RATIO_DIMENSIONS } from "@/types";
import { getWallpaperUrl } from "@/lib/wallpaper.utils";
import { drawRoundedRect, drawRoundedRectBottomOnly, calculateScaledPadding, applyCanvasBackground, getAspectRatioStyle, getMaxWidth } from "@/lib/canvas.utils";
import { drawMockupToCanvas } from "@/lib/mockup-canvas.utils";
import { zoomLevelToFactor, speedToTransitionMs, ZOOM_EASING } from "@/types/zoom.types";
import type { ZoomFragment } from "@/types/zoom.types";
import PlaceholderEditor from "../PlaceholderEditor";
import { MockupWrapper } from "./mockups/MockupWrapper";
import { DEFAULT_MOCKUP_CONFIG } from "@/types/mockup.types";
import { calculateSmoothZoom } from "@/lib/canvas.utils";
import { SVG_COMPONENTS, getSvgDataUrl } from "@/components/canvas-svg";
export type { VideoCanvasHandle, VideoCanvasProps };

// Mockups con header → solo esquinas INFERIORES del video redondeadas
const BOTTOM_ONLY_RADIUS_MOCKUPS = ["macos", "macos-glass", "macos-ghost", "macos-ghost-glass", "vscode", "macos-dark-ide", "macos-ghost-ide", "brave", "brave-glass", "browser-tab-glass", "chrome", "chrome-glass"];

// Mockups glass → manejan su propia sombra, no necesitan el rect sólido previo
const SELF_SHADOWING_MOCKUPS = ["macos-glass", "macos-ghost-glass", "glass-ui-container", "macos-container-glass", "brave-glass", "browser-tab-glass", "chrome-glass"];

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

    // Calculate zoom transform for visual preview
    // Uses fragment's speed for entry, and a smooth default for exit
    const zoomTransform = useMemo(() => {
        // Default smooth exit transition (speed 3 = ~1.4s for nice smooth exit)
        if (!activeZoomFragment) {
            // Usar la velocidad del último fragmento que terminó
            const lastFragment = zoomFragments
                .filter(f => f.endTime < currentTime)
                .sort((a, b) => b.endTime - a.endTime)[0];
            const exitMs = lastFragment ? speedToTransitionMs(lastFragment.speed) : speedToTransitionMs(3);
            return { scale: 1, translateX: 0, translateY: 0, transitionMs: exitMs };
        }

        const scale = zoomLevelToFactor(activeZoomFragment.zoomLevel);
        // Calculate translation to keep focus point centered
        const translateX = (50 - activeZoomFragment.focusX) * (scale - 1) * 2;
        const translateY = (50 - activeZoomFragment.focusY) * (scale - 1) * 2;
        const transitionMs = speedToTransitionMs(activeZoomFragment.speed);

        return { scale, translateX, translateY, transitionMs };
    }, [activeZoomFragment, zoomFragments, currentTime]);

    // Determinar qué background mostrar basado en el tab activo
    const shouldShowWallpaper = backgroundTab === "wallpaper" && selectedWallpaper >= 0;
    const shouldShowCustomImage = backgroundTab === "image" && selectedImageUrl !== "";
    const shouldShowCustomColor = backgroundTab === "color" && !!backgroundColorCss;

    // Canvas para exportación (no visible, solo para renderizado)
    const exportCanvasRef = useRef<HTMLCanvasElement>(null);
    const wallpaperImageRef = useRef<HTMLImageElement | null>(null);
    const customImageRef = useRef<HTMLImageElement | null>(null);

    // Calcular dimensiones de exportación según aspect ratio
    const exportDimensions = useMemo(() => {
        // For auto and custom, use the actual video dimensions if available
        if ((aspectRatio === "auto" || aspectRatio === "custom") && customAspectRatio) {
            return { width: customAspectRatio.width, height: customAspectRatio.height };
        }
        // Otherwise use standard dimensions
        const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
        return dims || { width: 1920, height: 1080 };
    }, [aspectRatio, customAspectRatio]);

    // On-canvas controls state
    const [isVideoHovered, setIsVideoHovered] = useState(false);
    const [isDraggingVideo, setIsDraggingVideo] = useState(false);
    const [isDraggingRotation, setIsDraggingRotation] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0, initialRotation: 0, initialTranslateX: 0, initialTranslateY: 0 });
    const lastAngleRef = useRef<number | null>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    // Canvas elements controls state
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [isDraggingElementRotation, setIsDraggingElementRotation] = useState(false);
    const elementDragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0, initialRotation: 0 });
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Canvas element images cache (only for actual images, not SVGs)
    const elementImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

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

    // Precargar imagen custom para el canvas
    useEffect(() => {
        if (shouldShowCustomImage && selectedImageUrl) {
            const img = new Image();
            img.src = selectedImageUrl;
            img.onload = () => {
                customImageRef.current = img;
            };
        } else {
            customImageRef.current = null;
        }
    }, [shouldShowCustomImage, selectedImageUrl]);

    // Preload canvas element images (only for image elements, not SVGs)
    useEffect(() => {
        const cache = elementImagesRef.current;
        const loadedPaths = new Set(cache.keys());
        const currentPaths = new Set(
            canvasElements
                .filter((el): el is ImageElement => el.type === "image")
                .map(el => el.imagePath)
        );

        // Remove images not in use anymore
        for (const path of loadedPaths) {
            if (!currentPaths.has(path)) {
                cache.delete(path);
            }
        }

        // Load new images
        for (const element of canvasElements) {
            if (element.type === "image") {
                const imageElement = element as ImageElement;
                if (!cache.has(imageElement.imagePath)) {
                    const img = new Image();
                    img.src = imageElement.imagePath;
                    img.onload = () => cache.set(imageElement.imagePath, img);
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

                if (lastAngleRef.current === null) {
                    lastAngleRef.current = rawAngle;
                }
                let delta = rawAngle - lastAngleRef.current;
                if (delta > 180) delta -= 360;
                if (delta < -180) delta += 360;
                lastAngleRef.current = rawAngle;

                onVideoTransformChange({
                    ...videoTransform,
                    rotation: videoTransform.rotation + delta,
                });
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

                const deltaAngle = currentAngle - startAngle;
                const newRotation = elementDragStart.current.initialRotation + deltaAngle;

                onElementUpdate(selectedElementId, { rotation: newRotation });
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

    // Función para dibujar un frame en el canvas de exportación
    const drawFrame = async () => {
        const canvas = exportCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        const video = videoRef.current;

        if (!canvas || !ctx || !video) return;

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
        if (zoomState.scale !== 1) {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;

            // Calculate focus point offset (relative to entire canvas)
            const focusOffsetX = (50 - zoomState.focusX) / 100 * canvasWidth * (zoomState.scale - 1) * 2;
            const focusOffsetY = (50 - zoomState.focusY) / 100 * canvasHeight * (zoomState.scale - 1) * 2;

            ctx.translate(centerX + focusOffsetX, centerY + focusOffsetY);
            ctx.scale(zoomState.scale, zoomState.scale);
            ctx.translate(-centerX, -centerY);
        }

        const backgroundImage = shouldShowCustomImage ? customImageRef.current : (shouldShowWallpaper ? wallpaperImageRef.current : null);

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

        // 2. Calcular área disponible para el mockup/video
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

        ctx.save();

        // Determinar el centro real del contenedor para rotar sobre su propio eje
        const centerX = containerX + containerWidth / 2;
        const centerY = containerY + containerHeight / 2;

        // Calcular traslación en píxeles basada en el tamaño del contenedor
        const translateXPx = (videoTransform.translateX / 100) * containerWidth;
        const translateYPx = (videoTransform.translateY / 100) * containerHeight;

        // Mover el origen al centro, trasladar, rotar, y devolver el origen a la esquina
        ctx.translate(centerX + translateXPx, centerY + translateYPx);
        ctx.rotate((videoTransform.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);

        // 3. Dibujar sombra del contenedor (ahora rotará y se moverá con todo lo demás)
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

        // 4. Determinar si hay mockup activo y dibujarlo
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
                mockupShadowBlur
            );

            videoX = mockupResult.contentX;
            videoY = mockupResult.contentY;
            videoWidth = mockupResult.contentWidth;
            videoHeight = mockupResult.contentHeight;
            videoRadius = mockupId === "iphone-slim" ? scaledRadius * 1.8 : scaledRadius;
        }

        // 5. Dibujar video con esquinas redondeadas
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

        // 6. Render canvas elements (SVG, images, text)
        // Elements are rendered after video but before zoom restore, so they're affected by zoom
        const sortedElements = [...canvasElements].sort((a, b) => a.zIndex - b.zIndex);
        const SVG_SCALE_FACTOR = 0.45;

        for (const element of sortedElements) {
            if (element.type === "svg") {
                const svgElement = element as SvgElement;
                // Get SVG as data URL  
                const svgDataUrl = getSvgDataUrl(svgElement.svgId, svgElement.color || "#FFFFFF");
                if (!svgDataUrl) continue;

                // Create image from SVG data URL
                const svgImage = new Image();
                svgImage.src = svgDataUrl;

                // Wait for image to load
                await new Promise<void>((resolve) => {
                    if (svgImage.complete) {
                        resolve();
                    } else {
                        svgImage.onload = () => resolve();
                        svgImage.onerror = () => resolve(); // Continue even if load fails
                    }
                });

                ctx.save();

                // Calculate element position and size in pixels (width and height are stored as percentage of canvas width for aspect ratio)
                const elemX = (svgElement.x / 100) * canvasWidth;
                const elemY = (svgElement.y / 100) * canvasHeight;
                const elemWidth = (svgElement.width / 100) * canvasWidth * SVG_SCALE_FACTOR;
                const elemHeight = (svgElement.height / 100) * canvasWidth * SVG_SCALE_FACTOR;

                // Apply transform: translate to center, rotate, translate back
                ctx.translate(elemX, elemY);
                ctx.rotate((svgElement.rotation * Math.PI) / 180);
                ctx.globalAlpha = svgElement.opacity;

                // Draw the SVG
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

                // Calculate element position and size in pixels (width and height are stored as percentage of canvas width for aspect ratio)
                const elemX = (element.x / 100) * canvasWidth;
                const elemY = (element.y / 100) * canvasHeight;
                const elemWidth = (element.width / 100) * canvasWidth;
                const elemHeight = (element.height / 100) * canvasWidth; // Use canvasWidth for square aspect ratio

                ctx.translate(elemX, elemY);
                ctx.rotate((element.rotation * Math.PI) / 180);
                ctx.globalAlpha = element.opacity;

                ctx.drawImage(
                    img,
                    -elemWidth / 2,
                    -elemHeight / 2,
                    elemWidth,
                    elemHeight
                );

                ctx.restore();
            } else if (element.type === "text") {
                ctx.save();

                const elemX = (element.x / 100) * canvasWidth;
                const elemY = (element.y / 100) * canvasHeight;

                ctx.translate(elemX, elemY);
                ctx.rotate((element.rotation * Math.PI) / 180);
                ctx.globalAlpha = element.opacity;

                // Configure text style with scaled fontSize
                // Scale fontSize proportionally to canvas width (reference: 1080px)
                const scaledFontSize = element.fontSize * (canvasWidth / 1080);
                const fontWeight = element.fontWeight === 'normal' ? '400' : element.fontWeight === 'medium' ? '500' : '700';
                ctx.font = `${fontWeight} ${scaledFontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw text
                ctx.fillText(element.content, 0, 0);

                ctx.restore();
            }
        }

        ctx.restore();
    };

    // Exponer métodos para exportación
    useImperativeHandle(ref, () => ({
        getExportCanvas: () => exportCanvasRef.current,
        drawFrame,
    }));

    return (
        <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden bg-[#09090B] p-4 sm:p-1">
            {/* Canvas oculto para exportación */}
            <canvas
                ref={exportCanvasRef}
                width={exportDimensions.width}
                height={exportDimensions.height}
                className="hidden"
            />

            {/* Preview visual - contenedor con tamaño dinámico según aspect ratio */}
            <div
                className="relative h-full max-h-full max-w-full shrink-0 overflow-hidden border border-white/20 rounded-xl transition-all duration-300"
                style={{
                    aspectRatio: getAspectRatioStyle(aspectRatio, customAspectRatio ?? undefined),
                    maxWidth: getMaxWidth(aspectRatio, customAspectRatio ?? undefined),
                }}
            >
                {/* Zoom container - applies zoom to entire composition (background + video) */}
                <div
                    className="absolute inset-0 origin-center"
                    style={{
                        transform: `scale(${zoomTransform.scale}) translate(${zoomTransform.translateX}%, ${zoomTransform.translateY}%)`,
                        transition: `transform ${zoomTransform.transitionMs}ms ${ZOOM_EASING}`,
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
                                    : shouldShowCustomImage
                                        ? // Imagen personalizada
                                        {
                                            backgroundImage: `url('${selectedImageUrl}')`,
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

                    {/* Capa 2: Video con padding, esquinas redondeadas y sombras */}
                    <div
                        className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                        style={{ padding: `${padding * 0.5}%` }}
                    >
                        <div
                            ref={videoContainerRef}
                            className="relative flex w-full h-full items-center justify-center max-w-full max-h-full"
                            style={{
                                transform: `translate(${videoTransform.translateX}%, ${videoTransform.translateY}%) rotate(${videoTransform.rotation}deg)`,
                                cursor: isDraggingVideo ? 'move' : (isVideoHovered && videoUrl ? 'move' : 'default'),
                                transition: isDraggingVideo || isDraggingRotation ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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
                        >
                            <div className="relative">
                                {/* Rotation handle */}
                                {isVideoHovered && videoUrl && onVideoTransformChange && (
                                    <div
                                        data-rotation-handle
                                        className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 cursor-default active:cursor-default"
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
                                        <div className="p-0.5 border border-white hover:border-white/80 rounded shadow-sm bg-[#111]">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="text-gray-200">
                                                <path fill="currentColor" d="M17.707 3.293a1 1 0 1 0-1.414 1.414l2.294 2.294H11.5a4.5 4.5 0 0 0-4.5 4.5v7.086l-2.293-2.293a1 1 0 1 0-1.414 1.415l4 4a1 1 0 0 0 1.415 0l4-4a1 1 0 0 0-1.415-1.415L9 18.587v-7.086a2.5 2.5 0 0 1 2.5-2.5h7.086l-2.293 2.293a1 1 0 1 0 1.414 1.414l4-4a1 1 0 0 0 0-1.414z" />
                                            </svg>
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center">
                                            <div className="w-px h-1 bg-white" />
                                            <div className="w-1 h-1 rounded-full bg-white" />
                                        </div>
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
                                        <div className="relative flex items-center justify-center overflow-hidden max-w-full max-h-full rounded-[inherit]">                                    {/* Video element */}
                                            <video
                                                ref={videoRef}
                                                src={videoUrl}
                                                preload="auto"
                                                playsInline
                                                className="max-w-full max-h-full object-contain"
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
                                                    className="absolute inset-0 w-full h-full object-contain"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full aspect-video min-w-75 bg-[#1E1E1E] border border-white/10 flex flex-col overflow-hidden">                                    <PlaceholderEditor
                                            onVideoUpload={onVideoUpload}
                                            isUploading={isUploading}
                                        />
                                        </div>
                                    )}
                                </MockupWrapper>
                            </div>
                        </div>

                        {/* Capa 3: Canvas elements overlay */}
                        <div
                            ref={canvasContainerRef}
                            className="absolute inset-0 pointer-events-none"
                            onClick={(e) => {
                                // Deselect element if clicking on background (not on an element)
                                if (e.target === e.currentTarget && onElementSelect) {
                                    onElementSelect(null);
                                }
                            }}
                            style={{ pointerEvents: 'auto' }}
                        >
                            {/* Sort elements by zIndex for proper layering */}
                            {[...canvasElements].sort((a, b) => a.zIndex - b.zIndex).map((element) => {
                                const isSelected = selectedElementId === element.id;
                                const isHovered = hoveredElementId === element.id;

                                if (element.type === "svg") {
                                    return (
                                        <div
                                            key={element.id}
                                            className="absolute pointer-events-auto cursor-move"
                                            style={{
                                                left: `${element.x}%`,
                                                top: `${element.y}%`,
                                                width: `${element.width}%`,
                                                height: `${element.height}%`,
                                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                                                opacity: element.opacity,
                                                zIndex: element.zIndex,
                                                transition: isDraggingElement ? 'none' : 'transform 0.1s ease-out',
                                            }}
                                            onMouseEnter={() => setHoveredElementId(element.id)}
                                            onMouseLeave={() => setHoveredElementId(null)}
                                            onMouseDown={(e) => {
                                                if (!onElementSelect) return;
                                                // Only start dragging if not clicking on rotation handle
                                                if ((e.target as HTMLElement).closest('[data-element-rotation]')) return;

                                                e.preventDefault();
                                                e.stopPropagation();
                                                onElementSelect(element.id);
                                                setIsDraggingElement(true);
                                                elementDragStart.current = {
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    initialX: element.x,
                                                    initialY: element.y,
                                                    initialRotation: element.rotation,
                                                };
                                            }}
                                        >
                                            {/* SVG element - render inline with color */}
                                            {(() => {
                                                const SvgComponent = SVG_COMPONENTS[element.svgId];
                                                if (!SvgComponent) return null;
                                                return <SvgComponent color={element.color} className="w-full h-full" />;
                                            })()}

                                            {/* Selection border and rotation handle */}
                                            {(isSelected || isHovered) && (
                                                <>
                                                    <div
                                                        className={`absolute -inset-px border pointer-events-none ${isSelected ? 'border-blue-500' : 'border-white/50'}`}
                                                        style={{ borderRadius: '2px' }}
                                                    />
                                                    {isSelected && onElementUpdate && (
                                                        <div
                                                            data-element-rotation
                                                            className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 cursor-default"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setIsDraggingElementRotation(true);
                                                                elementDragStart.current = {
                                                                    x: e.clientX,
                                                                    y: e.clientY,
                                                                    initialX: element.x,
                                                                    initialY: element.y,
                                                                    initialRotation: element.rotation,
                                                                };
                                                            }}
                                                        >
                                                            <div className="p-0.5 border border-blue-500 hover:border-blue-400 rounded shadow-sm bg-[#111]">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" className="text-blue-500">
                                                                    <path fill="currentColor" d="M17.707 3.293a1 1 0 1 0-1.414 1.414l2.294 2.294H11.5a4.5 4.5 0 0 0-4.5 4.5v7.086l-2.293-2.293a1 1 0 1 0-1.414 1.415l4 4a1 1 0 0 0 1.415 0l4-4a1 1 0 0 0-1.415-1.415L9 18.587v-7.086a2.5 2.5 0 0 1 2.5-2.5h7.086l-2.293 2.293a1 1 0 1 0 1.414 1.414l4-4a1 1 0 0 0 0-1.414z" />
                                                                </svg>
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                                <div className="w-px h-1 bg-blue-500" />
                                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                if (element.type === "image") {
                                    return (
                                        <div
                                            key={element.id}
                                            className="absolute pointer-events-auto cursor-move"
                                            style={{
                                                left: `${element.x}%`,
                                                top: `${element.y}%`,
                                                width: `${element.width}%`,
                                                height: `${element.height}%`,
                                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                                                opacity: element.opacity,
                                                zIndex: element.zIndex,
                                                transition: isDraggingElement ? 'none' : 'transform 0.1s ease-out',
                                            }}
                                            onMouseEnter={() => setHoveredElementId(element.id)}
                                            onMouseLeave={() => setHoveredElementId(null)}
                                            onMouseDown={(e) => {
                                                if (!onElementSelect) return;
                                                if ((e.target as HTMLElement).closest('[data-element-rotation]')) return;

                                                e.preventDefault();
                                                e.stopPropagation();
                                                onElementSelect(element.id);
                                                setIsDraggingElement(true);
                                                elementDragStart.current = {
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    initialX: element.x,
                                                    initialY: element.y,
                                                    initialRotation: element.rotation,
                                                };
                                            }}
                                        >
                                            <img
                                                src={element.imagePath}
                                                alt="Image element"
                                                className="w-full h-full object-cover rounded"
                                                style={{ pointerEvents: 'none' }}
                                            />

                                            {(isSelected || isHovered) && (
                                                <>
                                                    <div
                                                        className={`absolute -inset-px border pointer-events-none ${isSelected ? 'border-blue-500' : 'border-white/50'}`}
                                                        style={{ borderRadius: '2px' }}
                                                    />
                                                    {isSelected && onElementUpdate && (
                                                        <div
                                                            data-element-rotation
                                                            className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 cursor-default"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setIsDraggingElementRotation(true);
                                                                elementDragStart.current = {
                                                                    x: e.clientX,
                                                                    y: e.clientY,
                                                                    initialX: element.x,
                                                                    initialY: element.y,
                                                                    initialRotation: element.rotation,
                                                                };
                                                            }}
                                                        >
                                                            <div className="p-0.5 border border-blue-500 hover:border-blue-400 rounded shadow-sm bg-[#111]">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" className="text-blue-500">
                                                                    <path fill="currentColor" d="M17.707 3.293a1 1 0 1 0-1.414 1.414l2.294 2.294H11.5a4.5 4.5 0 0 0-4.5 4.5v7.086l-2.293-2.293a1 1 0 1 0-1.414 1.415l4 4a1 1 0 0 0 1.415 0l4-4a1 1 0 0 0-1.415-1.415L9 18.587v-7.086a2.5 2.5 0 0 1 2.5-2.5h7.086l-2.293 2.293a1 1 0 1 0 1.414 1.414l4-4a1 1 0 0 0 0-1.414z" />
                                                                </svg>
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                                <div className="w-px h-1 bg-blue-500" />
                                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                if (element.type === "text") {
                                    return (
                                        <div
                                            key={element.id}
                                            className="absolute pointer-events-auto cursor-move select-none"
                                            style={{
                                                left: `${element.x}%`,
                                                top: `${element.y}%`,
                                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                                                opacity: element.opacity,
                                                zIndex: element.zIndex,
                                                transition: isDraggingElement ? 'none' : 'transform 0.1s ease-out',
                                            }}
                                            onMouseEnter={() => setHoveredElementId(element.id)}
                                            onMouseLeave={() => setHoveredElementId(null)}
                                            onMouseDown={(e) => {
                                                if (!onElementSelect) return;
                                                if ((e.target as HTMLElement).closest('[data-element-rotation]')) return;

                                                e.preventDefault();
                                                e.stopPropagation();
                                                onElementSelect(element.id);
                                                setIsDraggingElement(true);
                                                elementDragStart.current = {
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    initialX: element.x,
                                                    initialY: element.y,
                                                    initialRotation: element.rotation,
                                                };
                                            }}
                                        >
                                            <div
                                                className="whitespace-nowrap"
                                                style={{
                                                    fontSize: `${element.fontSize}px`,
                                                    fontFamily: element.fontFamily,
                                                    fontWeight: element.fontWeight === 'normal' ? 400 : element.fontWeight === 'medium' ? 500 : 700,
                                                    textAlign: 'center',
                                                    color: element.color,
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                {element.content}
                                            </div>

                                            {(isSelected || isHovered) && (
                                                <>
                                                    <div
                                                        className={`absolute -inset-x-2 -inset-y-1 border pointer-events-none ${isSelected ? 'border-blue-500' : 'border-white/50'}`}
                                                        style={{ borderRadius: '2px' }}
                                                    />
                                                    {isSelected && onElementUpdate && (
                                                        <div
                                                            data-element-rotation
                                                            className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 cursor-default"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setIsDraggingElementRotation(true);
                                                                elementDragStart.current = {
                                                                    x: e.clientX,
                                                                    y: e.clientY,
                                                                    initialX: element.x,
                                                                    initialY: element.y,
                                                                    initialRotation: element.rotation,
                                                                };
                                                            }}
                                                        >
                                                            <div className="p-0.5 border border-blue-500 hover:border-blue-400 rounded shadow-sm bg-[#111]">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" className="text-blue-500">
                                                                    <path fill="currentColor" d="M17.707 3.293a1 1 0 1 0-1.414 1.414l2.294 2.294H11.5a4.5 4.5 0 0 0-4.5 4.5v7.086l-2.293-2.293a1 1 0 1 0-1.414 1.415l4 4a1 1 0 0 0 1.415 0l4-4a1 1 0 0 0-1.415-1.415L9 18.587v-7.086a2.5 2.5 0 0 1 2.5-2.5h7.086l-2.293 2.293a1 1 0 1 0 1.414 1.414l4-4a1 1 0 0 0 0-1.414z" />
                                                                </svg>
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                                <div className="w-px h-1 bg-blue-500" />
                                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                return null;
                                return null;
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
