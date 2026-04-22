"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ImageExportFormat } from "@/types/image-project.types";

interface ImageExportProgress {
    status: "idle" | "preparing" | "rendering" | "complete" | "error";
    progress: number;
    message: string;
}

interface ExportImageDropdownProps {
    onExport: (format: ImageExportFormat, quality: number, scale: number) => void;
    exportProgress: ImageExportProgress;
    hasTransparentBackground?: boolean;
    canvasWidth?: number;
    canvasHeight?: number;
}

interface FormatOption {
    format: ImageExportFormat;
    label: string;
    description: string;
    icon: string;
    supportsTransparency: boolean;
}

interface ExportPreset {
    scale: number;
    quality: number;
    label: string;
    description: string;
    icon: string;
    recommended?: boolean;
}

const FORMAT_OPTIONS: FormatOption[] = [
    {
        format: "png",
        label: "PNG",
        description: "Sin pérdida, soporta transparencia",
        icon: "mdi:file-png-box",
        supportsTransparency: true,
    },
    {
        format: "avif",
        label: "AVIF",
        description: "Mejor compresión moderna",
        icon: "mdi:image-multiple",
        supportsTransparency: true,
    },
    {
        format: "webp",
        label: "WebP",
        description: "Compresión eficiente",
        icon: "mdi:web",
        supportsTransparency: true,
    },
    {
        format: "jpeg",
        label: "JPEG",
        description: "Compatible universal",
        icon: "mdi:file-jpg-box",
        supportsTransparency: false,
    },
];

export function ExportImageDropdown({
    onExport,
    exportProgress,
    hasTransparentBackground,
    canvasWidth = 1920,
    canvasHeight = 1080,
}: ExportImageDropdownProps) {
    const t = useTranslations("editor.exportImage");
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<ImageExportFormat>("png");

    const isExporting =
        exportProgress.status !== "idle" &&
        exportProgress.status !== "complete" &&
        exportProgress.status !== "error";

    const isTransparent = !!hasTransparentBackground;

    const qualityPresets = useMemo((): ExportPreset[] => {
        const isPng = selectedFormat === "png";
        const isLossy = selectedFormat === "jpeg" || selectedFormat === "webp" || selectedFormat === "avif";

        if (isPng) {
            return [
                {
                    scale: 4,
                    quality: 1,
                    label: "4K Ultra (4x)",
                    description: `${canvasWidth * 4} × ${canvasHeight * 4}`,
                    icon: "mdi:image-size-select-large",
                },
                {
                    scale: 2,
                    quality: 1,
                    label: "HD Retina (2x)",
                    description: `${canvasWidth * 2} × ${canvasHeight * 2}`,
                    icon: "mdi:image-multiple-outline",
                    recommended: true,
                },
                {
                    scale: 1,
                    quality: 1,
                    label: "Original (1x)",
                    description: `${canvasWidth} × ${canvasHeight}`,
                    icon: "mdi:image-outline",
                },
            ];
        }

        if (isLossy) {
            return [
                {
                    scale: 4,
                    quality: 0.95,
                    label: "4K Alta Calidad (4x)",
                    description: `${canvasWidth * 4} × ${canvasHeight * 4} · 95%`,
                    icon: "mdi:image-size-select-large",
                },
                {
                    scale: 2,
                    quality: 0.95,
                    label: "HD Alta Calidad (2x)",
                    description: `${canvasWidth * 2} × ${canvasHeight * 2} · 95%`,
                    icon: "mdi:image-multiple-outline",
                    recommended: true,
                },
                {
                    scale: 1,
                    quality: 0.95,
                    label: "Original Alta (1x)",
                    description: `${canvasWidth} × ${canvasHeight} · 95%`,
                    icon: "mdi:image-outline",
                },
                {
                    scale: 1,
                    quality: 0.8,
                    label: "Original Media (1x)",
                    description: `${canvasWidth} × ${canvasHeight} · 80%`,
                    icon: "mdi:image-outline",
                },
                {
                    scale: 1,
                    quality: 0.6,
                    label: "Original Comprimida (1x)",
                    description: `${canvasWidth} × ${canvasHeight} · 60%`,
                    icon: "mdi:image-outline",
                },
            ];
        }

        return [];
    }, [selectedFormat, canvasWidth, canvasHeight]);

    const handleExport = useCallback(
        (preset: ExportPreset) => {
            setIsOpen(false);
            onExport(selectedFormat, preset.quality, preset.scale);
        },
        [onExport, selectedFormat]
    );

    const showTransparencyWarning = isTransparent && selectedFormat === "jpeg";

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="primary"
                    className="px-3 py-2 text-sm gap-2 min-w-27.5"
                    size="sm"
                    disabled={isExporting}
                >
                    <Icon icon="icon-park-outline:export" width="18" />
                    {t("button")}
                    <Icon icon="icon-park-outline:chevron-down" width="16" className="opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-80 bg-black border-white/15 text-white shadow-2xl p-0 rounded-xl overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">
                        {t("title") || "Formato"}
                    </span>
                    {isTransparent && (
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md">
                            <div className="size-1 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

                            <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400/90">
                                Transparente
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 grid grid-cols-4 gap-3">
                    {FORMAT_OPTIONS.map((opt) => {
                        const isSelected = selectedFormat === opt.format;
                        const disabled = isTransparent && !opt.supportsTransparency;

                        return (
                            <button
                                key={opt.format}
                                onClick={() => !disabled && setSelectedFormat(opt.format)}
                                disabled={disabled}
                                className={`relative flex flex-col items-center gap-2 transition-all duration-300 group ${disabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer"
                                    }`}
                            >
                                <div
                                    className={`relative size-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${isSelected
                                            ? "border-white/30 scale-105"
                                            : "border-white/10 hover:border-white/20"
                                        }`}
                                    style={{
                                        background: isSelected
                                            ? "radial-gradient(circle at 50% 0%, rgb(85, 85, 85) 0%, rgb(40, 40, 40) 80%)"
                                            : "transparent",
                                        boxShadow: isSelected
                                            ? "rgb(255, 255, 255) 0px 0.5rem 0.2rem -0.5rem inset, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px"
                                            : "none",
                                    }}
                                >
                                    <Icon
                                        icon={opt.icon}
                                        width="22"
                                        className={`${isSelected ? "text-white" : "text-white/40 group-hover:text-white/60"}`}
                                    />

                                    {isSelected && (
                                        <div className="absolute left-1.5 top-1.5 size-4 bg-white rounded-full blur-[6px] opacity-30 rotate-45" />
                                    )}
                                </div>
                                <span
                                    className={`text-[9px] font-bold tracking-tighter ${isSelected ? "text-white" : "text-white/40"
                                        }`}
                                >
                                    {opt.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="px-2 pb-2">
                    <div className="bg-white/3 rounded-2xl border border-white/10 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                        {qualityPresets.map((preset, i) => (
                            <button
                                key={i}
                                onClick={() => handleExport(preset)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10 last:border-0 group"
                            >
                                <div className="flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-white/90 group-hover:text-white">
                                            {preset.label}
                                        </span>
                                        {preset.recommended && (
                                            <span className="border border-blue-500/30 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-   ">
                                                {t("recommended") || "Rec"}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-mono text-white/30">
                                        {preset.description}
                                    </span>
                                </div>

                            </button>
                        ))}
                    </div>
                </div>

                {showTransparencyWarning && (
                    <div className="p-3 bg-red-500/10 text-center">
                        <p className="text-[9px] uppercase tracking-widest text-red-400 font-bold">
                            {t("noTransparency") || "Sin Transparencia"}
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}