"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SliderControl } from "../SliderControl";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
} from "@/components/ui/popover";
import type { ImageMaskConfig } from "@/types/photo.types";
import { getMediaMaskStyles } from "./getMediaMaskStyles";
import { ImageMaskEditorProps, MaskPreset, MASK_PRESETS } from "@/types/ImageMask.types";

export function ImageMaskEditor({ 
    maskConfig, 
    onMaskConfigChange, 
    canvasImageUrl
}: ImageMaskEditorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

    const isPresetActive = (preset: MaskPreset) => {
        if (preset.id === "none") {
            return !maskConfig.enabled || (!maskConfig.top && !maskConfig.bottom && !maskConfig.left && !maskConfig.right && !maskConfig.angle);
        }

        if (!maskConfig.enabled) return false;

        const isEqual = (a: unknown, b: unknown) => JSON.stringify(a || null) === JSON.stringify(b || null);

        return (
            isEqual(maskConfig.top, preset.config.top) &&
            isEqual(maskConfig.bottom, preset.config.bottom) &&
            isEqual(maskConfig.left, preset.config.left) &&
            isEqual(maskConfig.right, preset.config.right) &&
            maskConfig.angle === preset.config.angle
        );
    };

    const handlePresetClick = (preset: MaskPreset) => {
        if (preset.id === "none") {
            onMaskConfigChange({ enabled: false });
            return;
        }

        onMaskConfigChange({
            enabled: preset.config.enabled ?? true,
            top: undefined,
            bottom: undefined,
            left: undefined,
            right: undefined,
            angle: undefined,
            angleFrom: undefined,
            angleTo: undefined,
            ...preset.config,
        });
    };

    const getPreviewMaskStyles = (presetConfig: Partial<ImageMaskConfig>) => {
        if (!presetConfig.enabled) return {};
        return getMediaMaskStyles({
            enabled: true,
            top: presetConfig.top,
            bottom: presetConfig.bottom,
            left: presetConfig.left,
            right: presetConfig.right,
            angle: presetConfig.angle,
            angleFrom: presetConfig.angleFrom,
            angleTo: presetConfig.angleTo,
        });
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`gap-2 text-xs transition-all duration-200 ${maskConfig.enabled
                        ? "bg-gradient-radial-primary text-cyan-500 border border-cyan-500/50!"
                        : ""
                        }`}
                    size="sm"
                >
                    <Icon icon="material-symbols:gradient-outline" width="16" />
                    Mask
                </Button>

            </PopoverTrigger>

            <PopoverContent align="end" className="w-100 bg-[#0A0A0A] border-white/10 shadow-2xl p-0 rounded-xl overflow-hidden">
                <div className="flex flex-col">
                    <PopoverHeader className="px-4 py-3 border-b border-white/10 bg-white/5">
                        <div className="flex items-center justify-between">
                            <PopoverTitle className="text-xs font-semibold text-white/80 tracking-wide uppercase flex items-center gap-2">
                                <Icon icon="material-symbols:gradient-outline" width="14" className="text-blue-400" />
                                Efectos de Máscara
                            </PopoverTitle>
                        </div>
                    </PopoverHeader>

                    <div className="flex border-b border-white/10 bg-black/20">
                        <button
                            onClick={() => setActiveTab("presets")}
                            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "presets"
                                ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                }`}
                        >
                            <Icon icon="mdi:palette-outline" width="14" className="inline mr-1.5" />
                            Preestablecido
                        </button>
                        <button
                            onClick={() => setActiveTab("custom")}
                            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "custom"
                                ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                }`}
                        >
                            <Icon icon="mdi:tune" width="14" className="inline mr-1.5" />
                            Personalizado
                        </button>
                    </div>

                    <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                        {activeTab === "presets" ? (
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {MASK_PRESETS.map((preset) => {
                                    const active = isPresetActive(preset);
                                    const previewStyles = getPreviewMaskStyles(preset.config);

                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetClick(preset)}
                                            className={`group relative flex flex-col rounded-lg border transition-all overflow-hidden ${
                                                active
                                                    ? "border-blue-500 bg-blue-500/10"
                                                    : "border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10"
                                            }`}
                                        >
                                            <div className="relative w-full aspect-video bg-zinc-900">
                                                {canvasImageUrl ? (
                                                    <div className="absolute inset-0 flex items-center justify-center p-1">
                                                        <img
                                                            src={canvasImageUrl}
                                                            alt={preset.label}
                                                            className="w-full h-full object-cover"
                                                            style={previewStyles}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Icon
                                                            icon={preset.icon}
                                                            width="28"
                                                            className={`transition-colors ${active ? "text-blue-400" : "text-white/40 group-hover:text-blue-400"}`}
                                                        />
                                                    </div>
                                                )}

                                                <div className="absolute inset-x-0 bottom-0 h-full flex items-end p-2 pointer-events-none">
                                                    <span className={`text-[10px] font-bold text-shadow-lg transition-colors leading-tight ${active ? "text-blue-400" : "text-white/90"}`}>
                                                        {preset.label}
                                                    </span>
                                                </div>

                                                {active && (
                                                    <div className="absolute top-2 right-2 z-30 size-4 rounded-full bg-gradient-primary flex items-center justify-center shadow-xl">
                                                        <Icon icon="mdi:check" width="10" className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-white/70">Top</label>
                                        <button
                                            onClick={() => onMaskConfigChange({
                                                ...maskConfig,
                                                top: maskConfig.top ? undefined : { from: 0, to: 30 },
                                            })}
                                            className="text-[10px] text-blue-400 hover:text-blue-300"
                                        >
                                            {maskConfig.top ? "Quitar" : "Añadir"}
                                        </button>
                                    </div>
                                    {maskConfig.top && (
                                        <>
                                            <SliderControl
                                                label="From"
                                                value={maskConfig.top.from}
                                                onChange={(value) => onMaskConfigChange({
                                                    ...maskConfig,
                                                    top: { ...maskConfig.top!, from: value },
                                                })}
                                                min={0}
                                                max={100}
                                                step={1}
                                                suffix="%"
                                            />
                                            <SliderControl
                                                label="To"
                                                value={maskConfig.top.to ?? 100}
                                                onChange={(value) => onMaskConfigChange({
                                                    ...maskConfig,
                                                    top: { ...maskConfig.top!, to: value },
                                                })}
                                                min={0}
                                                max={100}
                                                step={1}
                                                suffix="%"
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <hr />
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-white/70">Bottom</label>
                                        <button
                                            onClick={() => onMaskConfigChange({
                                                ...maskConfig,
                                                bottom: maskConfig.bottom ? undefined : { from: 0, to: 30 },
                                            })}
                                            className="text-[10px] text-blue-400 hover:text-blue-300"
                                        >
                                            {maskConfig.bottom ? "Quitar" : "Añadir"}
                                        </button>
                                    </div>
                                    {maskConfig.bottom && (
                                        <>
                                            <SliderControl
                                                label="From"
                                                value={maskConfig.bottom.from}
                                                onChange={(value) => onMaskConfigChange({
                                                    ...maskConfig,
                                                    bottom: { ...maskConfig.bottom!, from: value },
                                                })}
                                                min={0}
                                                max={100}
                                                step={1}
                                                suffix="%"
                                            />
                                            <SliderControl
                                                label="To"
                                                value={maskConfig.bottom.to ?? 100}
                                                onChange={(value) => onMaskConfigChange({
                                                    ...maskConfig,
                                                    bottom: { ...maskConfig.bottom!, to: value },
                                                })}
                                                min={0}
                                                max={100}
                                                step={1}
                                                suffix="%"
                                            />
                                        </>
                                    )}
                                </div>
                                <hr />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-white/70">Left</label>
                                            <button
                                                onClick={() => onMaskConfigChange({
                                                    ...maskConfig,
                                                    left: maskConfig.left ? undefined : { from: 0, to: 20 },
                                                })}
                                                className="text-sm text-blue-400 hover:text-blue-300"
                                            >
                                                {maskConfig.left ? "x" : "+"}
                                            </button>
                                        </div>
                                        {maskConfig.left && (
                                            <SliderControl
                                                label="From"
                                                value={maskConfig.left.from}
                                                onChange={(value) => onMaskConfigChange({
                                                    ...maskConfig,
                                                    left: { ...maskConfig.left!, from: value },
                                                })}
                                                min={0}
                                                max={100}
                                                step={1}
                                                suffix="%"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-white/70">Right</label>
                                            <button
                                                onClick={() => onMaskConfigChange({
                                                    ...maskConfig,
                                                    right: maskConfig.right ? undefined : { from: 0, to: 20 },
                                                })}
                                                className="text-sm text-blue-400 hover:text-blue-300"
                                            >
                                                {maskConfig.right ? "x" : "+"}
                                            </button>
                                        </div>
                                        {maskConfig.right && (
                                            <SliderControl
                                                label="From"
                                                value={maskConfig.right.from}
                                                onChange={(value) => onMaskConfigChange({
                                                    ...maskConfig,
                                                    right: { ...maskConfig.right!, from: value },
                                                })}
                                                min={0}
                                                max={100}
                                                step={1}
                                                suffix="%"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}