"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import type { AspectRatio } from "@/types";
import { TooltipAction } from "@/components/ui/tooltip-action";

interface AspectRatioSelectProps {
    value: AspectRatio;
    onChange: (value: AspectRatio) => void;
    customDimensions?: { width: number; height: number } | null;
    onCustomDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

export function AspectRatioSelect({
    value,
    onChange,
    customDimensions,
    onCustomDimensionsChange,
}: AspectRatioSelectProps) {
    const t = useTranslations("aspectRatioSelect");
    const [isOpen, setIsOpen] = useState(false);
    const [tempWidth, setTempWidth] = useState("");
    const [tempHeight, setTempHeight] = useState("");

    const STANDARD_RATIOS: Array<{ id: AspectRatio; label: string; subLabel?: string }> = [
        { id: "auto", label: t("labels.auto") },
        { id: "16:9", label: t("labels.youtube"), subLabel: "16:9" },
        { id: "9:16", label: t("labels.tiktok"), subLabel: "9:16" },
        { id: "1:1", label: t("labels.instagram"), subLabel: "1:1" },
        { id: "4:3", label: "Estándar", subLabel: "4:3" },
        { id: "3:4", label: "Retrato", subLabel: "3:4" },
    ];

    const handleOpenChange = (open: boolean) => {
        if (open) {
            setTempWidth(customDimensions?.width?.toString() || "1920");
            setTempHeight(customDimensions?.height?.toString() || "1080");
        }
        setIsOpen(open);
    };

    const handleStandardRatioClick = (ratio: AspectRatio) => {
        onChange(ratio);
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        const width = parseInt(tempWidth);
        const height = parseInt(tempHeight);
        if (width > 0 && height > 0 && onCustomDimensionsChange) {
            onCustomDimensionsChange({ width, height });
            onChange("custom");
            setIsOpen(false);
        }
    };

    const displayLabel = (() => {
        if (value === "custom" && customDimensions) {
            return `${customDimensions.width}x${customDimensions.height}`;
        }
        const standard = STANDARD_RATIOS.find((r) => r.id === value);
        return standard ? standard.label : t("labels.custom");
    })();

    // Componente interno para dibujar las figuritas de los rectángulos/cuadrados
    const RatioShape = ({ ratio, isSelected }: { ratio: AspectRatio; isSelected: boolean }) => {
        if (ratio === "auto") {
            return <Icon icon="lucide:maximize" width="24" className={isSelected ? "text-primary" : "opacity-60"} />;
        }

        const aspectClasses: Record<string, string> = {
            "16:9": "aspect-video w-9",
            "9:16": "aspect-[9/16] h-9",
            "1:1": "aspect-square h-8",
            "4:3": "aspect-[4/3] w-9",
            "3:4": "aspect-[3/4] h-9",
        };

        return (
            <div
                className={`border-2 squircle-element transition-colors ${aspectClasses[ratio] || "aspect-square w-6"} ${isSelected ? "border-primary" : "border-foreground/40 group-hover:border-foreground/70"
                    }`}
            />
        );
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <TooltipAction label={t("tooltip")}>
                <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 h-8 px-3 text-xs font-medium border border-white/20 bg-black squircle-element hover:bg-accent hover:text-accent-foreground transition-colors w-full sm:w-auto">
                        <Icon icon="mynaui:layout" width="16" className="shrink-0" />
                        <span className="truncate">{displayLabel}</span>
                        <Icon icon="lucide:chevron-down" width="14" className="ml-auto opacity-50 shrink-0" />
                    </button>
                </PopoverTrigger>
            </TooltipAction>

            <PopoverContent className="w-72 p-3" align="start">
                <div className="flex flex-col gap-4">

                    <div className="grid grid-cols-3 gap-2">
                        {STANDARD_RATIOS.map((item) => {
                            const isSelected = value === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleStandardRatioClick(item.id)}
                                    className={`group flex flex-col items-center justify-center gap-2 p-2.5 squircle-element border transition-all ${isSelected
                                            ? "border-primary bg-gradient-radial-primary text-primary"
                                            : "border-white/20 bg-transparent hover:border-border hover:bg-accent text-muted-foreground"
                                        }`}
                                >
                                    <div className="h-10 flex items-center justify-center">
                                        <RatioShape ratio={item.id} isSelected={isSelected} />
                                    </div>
                                    <div className="text-[10px] font-medium text-center leading-tight">
                                        <span className={`block ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>
                                            {item.label}
                                        </span>
                                        {item.subLabel && (
                                            <span className="block opacity-70 mt-0.5 tracking-wider font-mono text-[10px]">
                                                {item.subLabel}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-px bg-border/60 mx-1" />

                    <div className="px-1 pb-1">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-foreground">
                                {t("customSection.title")}
                            </span>
                            {value === "custom" && (
                                <span className="text-[10px] font-medium bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                    Activo
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
                                    W
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    max="7680"
                                    value={tempWidth}
                                    onChange={(e) => setTempWidth(e.target.value)}
                                    className="w-full h-8 pl-7 pr-2 text-xs border border-input bg-background squircle-element focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-shadow"
                                />
                            </div>
                            <Icon icon="lucide:x" width="12" className="text-muted-foreground" />
                            <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
                                    H
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    max="4320"
                                    value={tempHeight}
                                    onChange={(e) => setTempHeight(e.target.value)}
                                    className="w-full h-8 pl-7 pr-2 text-xs border border-input bg-background squircle-element focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-shadow"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCustomApply}
                            className="w-full h-8 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border squircle-element transition-colors"
                        >
                            {t("customSection.apply")}
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}