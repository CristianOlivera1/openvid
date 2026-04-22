"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CROP_ASPECT_RATIOS, type CropArea } from "@/types";

interface ImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    onCropApply: (cropArea: CropArea) => void;
    initialCrop?: CropArea | null;
}

export function ImageCropperModal({
    isOpen,
    onClose,
    imageUrl,
    onCropApply,
    initialCrop,
}: ImageCropperModalProps) {
    const t = useTranslations("videoCropper");
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [cropArea, setCropArea] = useState<CropArea>(initialCrop ?? { x: 0, y: 0, width: 100, height: 100 });
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<"move" | "resize" | null>(null);
    const [dragHandle, setDragHandle] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [wasOpen, setWasOpen] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const initialCropRef = useRef<CropArea>({ x: 0, y: 0, width: 100, height: 100 });

    if (isOpen && !wasOpen) {
        setCropArea(initialCrop ?? { x: 0, y: 0, width: 100, height: 100 });
        setSelectedAspectRatio(null);
        setWasOpen(true);
    } else if (!isOpen && wasOpen) {
        setWasOpen(false);
    }

    const handleImageLoad = useCallback(() => {
        if (imageRef.current) {
            setImageDimensions({
                width: imageRef.current.naturalWidth,
                height: imageRef.current.naturalHeight,
            });
        }
    }, []);

    const handleAspectRatioSelect = useCallback((ratio: number | null) => {
        setSelectedAspectRatio(ratio);
        if (ratio === null || imageDimensions.width === 0) return;

        const imageAspect = imageDimensions.width / imageDimensions.height;
        const targetAspect = ratio;

        let newWidth: number;
        let newHeight: number;

        if (targetAspect > imageAspect) {
            newWidth = 100;
            newHeight = (100 * imageAspect) / targetAspect;
        } else {
            newHeight = 100;
            newWidth = (100 * targetAspect) / imageAspect;
        }

        const newX = (100 - newWidth) / 2;
        const newY = (100 - newHeight) / 2;

        setCropArea({
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: Math.min(100, newWidth),
            height: Math.min(100, newHeight),
        });
    }, [imageDimensions]);

    const handleMouseDown = (e: React.MouseEvent, type: "move" | "resize", handle?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragType(type);
        setDragHandle(handle ?? null);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        initialCropRef.current = { ...cropArea };
    };

    useEffect(() => {
        if (!isDragging || !containerRef.current) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const deltaX = ((e.clientX - dragStartPos.current.x) / rect.width) * 100;
            const deltaY = ((e.clientY - dragStartPos.current.y) / rect.height) * 100;

            if (dragType === "move") {
                const newX = Math.max(0, Math.min(100 - cropArea.width, initialCropRef.current.x + deltaX));
                const newY = Math.max(0, Math.min(100 - cropArea.height, initialCropRef.current.y + deltaY));
                setCropArea(prev => ({ ...prev, x: newX, y: newY }));
            } else if (dragType === "resize" && dragHandle) {
                const newCrop = { ...initialCropRef.current };
                const minSize = 10;

                switch (dragHandle) {
                    case "nw": {
                        const maxDx = initialCropRef.current.width - minSize;
                        const maxDy = initialCropRef.current.height - minSize;
                        const clampedDx = Math.max(-initialCropRef.current.x, Math.min(maxDx, deltaX));
                        const clampedDy = Math.max(-initialCropRef.current.y, Math.min(maxDy, deltaY));
                        newCrop.x = initialCropRef.current.x + clampedDx;
                        newCrop.y = initialCropRef.current.y + clampedDy;
                        newCrop.width = initialCropRef.current.width - clampedDx;
                        newCrop.height = initialCropRef.current.height - clampedDy;
                        break;
                    }
                    case "ne": {
                        const maxDx = 100 - initialCropRef.current.x - initialCropRef.current.width;
                        const maxDy = initialCropRef.current.height - minSize;
                        const clampedDx = Math.max(-(initialCropRef.current.width - minSize), Math.min(maxDx, deltaX));
                        const clampedDy = Math.max(-initialCropRef.current.y, Math.min(maxDy, deltaY));
                        newCrop.y = initialCropRef.current.y + clampedDy;
                        newCrop.width = initialCropRef.current.width + clampedDx;
                        newCrop.height = initialCropRef.current.height - clampedDy;
                        break;
                    }
                    case "sw": {
                        const maxDx = initialCropRef.current.width - minSize;
                        const maxDy = 100 - initialCropRef.current.y - initialCropRef.current.height;
                        const clampedDx = Math.max(-initialCropRef.current.x, Math.min(maxDx, deltaX));
                        const clampedDy = Math.max(-(initialCropRef.current.height - minSize), Math.min(maxDy, deltaY));
                        newCrop.x = initialCropRef.current.x + clampedDx;
                        newCrop.width = initialCropRef.current.width - clampedDx;
                        newCrop.height = initialCropRef.current.height + clampedDy;
                        break;
                    }
                    case "se": {
                        const maxDx = 100 - initialCropRef.current.x - initialCropRef.current.width;
                        const maxDy = 100 - initialCropRef.current.y - initialCropRef.current.height;
                        const clampedDx = Math.max(-(initialCropRef.current.width - minSize), Math.min(maxDx, deltaX));
                        const clampedDy = Math.max(-(initialCropRef.current.height - minSize), Math.min(maxDy, deltaY));
                        newCrop.width = initialCropRef.current.width + clampedDx;
                        newCrop.height = initialCropRef.current.height + clampedDy;
                        break;
                    }
                    case "n": {
                        const maxDy = initialCropRef.current.height - minSize;
                        const clampedDy = Math.max(-initialCropRef.current.y, Math.min(maxDy, deltaY));
                        newCrop.y = initialCropRef.current.y + clampedDy;
                        newCrop.height = initialCropRef.current.height - clampedDy;
                        break;
                    }
                    case "s": {
                        const maxDy = 100 - initialCropRef.current.y - initialCropRef.current.height;
                        const clampedDy = Math.max(-(initialCropRef.current.height - minSize), Math.min(maxDy, deltaY));
                        newCrop.height = initialCropRef.current.height + clampedDy;
                        break;
                    }
                    case "w": {
                        const maxDx = initialCropRef.current.width - minSize;
                        const clampedDx = Math.max(-initialCropRef.current.x, Math.min(maxDx, deltaX));
                        newCrop.x = initialCropRef.current.x + clampedDx;
                        newCrop.width = initialCropRef.current.width - clampedDx;
                        break;
                    }
                    case "e": {
                        const maxDx = 100 - initialCropRef.current.x - initialCropRef.current.width;
                        const clampedDx = Math.max(-(initialCropRef.current.width - minSize), Math.min(maxDx, deltaX));
                        newCrop.width = initialCropRef.current.width + clampedDx;
                        break;
                    }
                }

                newCrop.x = Math.max(0, Math.min(100 - minSize, newCrop.x));
                newCrop.y = Math.max(0, Math.min(100 - minSize, newCrop.y));
                newCrop.width = Math.max(minSize, Math.min(100 - newCrop.x, newCrop.width));
                newCrop.height = Math.max(minSize, Math.min(100 - newCrop.y, newCrop.height));
                setCropArea(newCrop);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragType(null);
            setDragHandle(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragType, dragHandle, cropArea.width, cropArea.height]);

    const handleReset = () => {
        setCropArea({ x: 0, y: 0, width: 100, height: 100 });
        setSelectedAspectRatio(null);
    };

    const handleApply = () => {
        onCropApply(cropArea);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-[#0a0a0b] rounded-2xl border border-white/10 w-[92vw] max-w-5xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                                <Icon icon="mdi:crop" className="text-sm text-white/70" />
                            </div>
                            <span className="text-sm font-medium text-white">Recortar Imagen</span>
                            {imageDimensions.width > 0 && (
                                <span className="text-[11px] font-mono text-white/60 bg-white/4 px-2 py-0.5 rounded-md border border-white/10">
                                    {imageDimensions.width} × {imageDimensions.height}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
                        >
                            <Icon icon="mdi:close" className="text-base" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        {/* Preview Area */}
                        <div className="flex-1 p-6 flex items-center justify-center bg-black/50 overflow-hidden">
                            <div
                                ref={containerRef}
                                className="relative w-full h-full max-w-full max-h-full flex items-center justify-center"
                            >
                                <div
                                    className="relative"
                                    style={{
                                        width: imageDimensions.width > imageDimensions.height ? '100%' : 'auto',
                                        height: imageDimensions.width > imageDimensions.height ? 'auto' : '100%',
                                        aspectRatio: `${imageDimensions.width}/${imageDimensions.height}`,
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                    }}
                                >
                                    {/* Imagen */}
                                    <img
                                        ref={imageRef}
                                        src={imageUrl || ''}
                                        alt="Crop preview"
                                        onLoad={handleImageLoad}
                                        className="w-full h-full object-contain select-none pointer-events-none"
                                        draggable={false}
                                    />

                                    {/* Overlay oscuro fuera del área de recorte */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <svg width="100%" height="100%" className="absolute inset-0">
                                            <defs>
                                                <mask id="cropMask">
                                                    <rect width="100%" height="100%" fill="white" />
                                                    <rect
                                                        x={`${cropArea.x}%`}
                                                        y={`${cropArea.y}%`}
                                                        width={`${cropArea.width}%`}
                                                        height={`${cropArea.height}%`}
                                                        fill="black"
                                                    />
                                                </mask>
                                            </defs>
                                            <rect width="100%" height="100%" fill="black" fillOpacity="0.5" mask="url(#cropMask)" />
                                        </svg>
                                    </div>

                                    {/* Área de recorte */}
                                    <div
                                        className="absolute border-2 border-white shadow-lg cursor-move"
                                        style={{
                                            left: `${cropArea.x}%`,
                                            top: `${cropArea.y}%`,
                                            width: `${cropArea.width}%`,
                                            height: `${cropArea.height}%`,
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, "move")}
                                    >
                                        {/* Regla de tercios */}
                                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} className="border border-white/20" />
                                            ))}
                                        </div>

                                        {/* Handles de resize */}
                                        {["nw", "ne", "sw", "se", "n", "s", "w", "e"].map((handle) => (
                                            <div
                                                key={handle}
                                                className={`absolute w-3 h-3 bg-white border border-gray-800 rounded-sm cursor-${
                                                    handle.includes("n") || handle.includes("s") ? "ns" : handle.includes("w") || handle.includes("e") ? "ew" : "nwse"
                                                }-resize hover:scale-125 transition-transform`}
                                                style={{
                                                    ...(handle.includes("n") && { top: -1.5 }),
                                                    ...(handle.includes("s") && { bottom: -1.5 }),
                                                    ...(handle.includes("w") && { left: -1.5 }),
                                                    ...(handle.includes("e") && { right: -1.5 }),
                                                    ...(!handle.includes("n") && !handle.includes("s") && { top: "50%", transform: "translateY(-50%)" }),
                                                    ...(!handle.includes("w") && !handle.includes("e") && { left: "50%", transform: "translateX(-50%)" }),
                                                }}
                                                onMouseDown={(e) => handleMouseDown(e, "resize", handle)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="w-64 bg-[#0a0a0b] border-l border-white/10 flex flex-col">
                            {/* Aspect Ratios */}
                            <div className="p-4 border-b border-white/10">
                                <p className="text-[10px] uppercase tracking-widest font-semibold text-white/60 mb-3">
                                    {t("sections.ratio")}
                                </p>
                                <div className="grid grid-cols-3 gap-1">
                                    {CROP_ASPECT_RATIOS.map((ratio) => (
                                        <div key={ratio.label} className="relative">
                                            <button
                                                onClick={() => handleAspectRatioSelect(ratio.value)}
                                                className={`w-full py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                                                    selectedAspectRatio === ratio.value
                                                        ? "text-white border-transparent"
                                                        : "bg-white/4 text-white/40 hover:bg-white/8 hover:text-white/70 border border-white/10"
                                                }`}
                                                style={
                                                    selectedAspectRatio === ratio.value
                                                        ? {
                                                              background: "radial-gradient(circle at 50% 0%, #555555 0%, #252525 64%)",
                                                              boxShadow: "0 0 0 1px #fff3, 0 4px 4px 0 #0004, 0 0 0 1px #333",
                                                          }
                                                        : {}
                                                }
                                            >
                                                {ratio.label}
                                            </button>
                                            {selectedAspectRatio === ratio.value && (
                                                <div className="absolute left-1 top-1/5 -translate-y-1/2 size-3 bg-white rounded-full blur-[5px]" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Crop Area Info */}
                            <div className="p-4 border-b border-white/10">
                                <p className="text-[10px] uppercase tracking-widest font-semibold text-white/60 mb-3">
                                    {t("sections.area")}
                                </p>
                                <div className="space-y-2">
                                    {[
                                        { label: t("labels.x"), value: cropArea.x },
                                        { label: t("labels.y"), value: cropArea.y },
                                        { label: t("labels.width"), value: cropArea.width },
                                        { label: t("labels.height"), value: cropArea.height },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span className="text-[11px] text-white/25 font-mono w-4">{label}</span>
                                            <div className="flex-1 mx-3 h-px bg-white/4" />
                                            <span className="text-[11px] font-mono text-white/50">{value.toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1" />

                            {/* Actions */}
                            <div className="p-4 flex flex-col gap-2">
                                <Button variant="outline" onClick={handleReset}>
                                    {t("buttons.reset")}
                                </Button>
                                <Button variant="primary" onClick={handleApply}>
                                    {t("buttons.apply")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
