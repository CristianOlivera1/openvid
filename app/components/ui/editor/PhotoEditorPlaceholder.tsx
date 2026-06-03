"use client";

import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import { SliderControl } from "../SliderControl";
import { Button } from "@/components/ui/button";
import { AspectRatioSelect } from "@/app/components/ui/AspectRatioSelect";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { ImageMaskEditor } from "./ImageMaskEditor";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
} from "@/components/ui/popover";
import { PhotoEditorPlaceholderProps, Preview3DConfig, PREVIEW_CONFIGS } from "@/types/photo.types";

export function PhotoEditorPlaceholder({
    className = "",
    canvasImageUrl,
    staticImageUrl,
    isBackgroundRemoving = false,
    hasBackgroundRemoved = false,
    onRemoveBackground,
    onRestoreOriginalImage,
    onSelectPreview,
    selectedPreviewId = "front",
    aspectRatio = "auto",
    onAspectRatioChange,
    customAspectRatio = null,
    onCustomAspectRatioChange,
    onOpenCropper,
    apply3DToBackground = false,
    onToggle3DBackground,
    imageMaskConfig,
    onImageMaskConfigChange,
    imageTransform,
    onReset,
}: PhotoEditorPlaceholderProps) {
    const previewImageUrl = staticImageUrl ?? canvasImageUrl;
    const t = useTranslations("editor");
    const [customConfig, setCustomConfig] = useState<Preview3DConfig>({
        id: "custom",
        label: "Custom",
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        translateY: 0,
        scale: 0.9,
        perspective: 600,
    });
    const [isCustomPopoverOpen, setIsCustomPopoverOpen] = useState(false);

    const isCustomUntouched =
        customConfig.rotateX === 0 &&
        customConfig.rotateY === 0 &&
        customConfig.rotateZ === 0 &&
        customConfig.translateY === 0 &&
        customConfig.scale === 0.9 &&
        customConfig.perspective === 600;

    const updateCustomConfig = useCallback(
        (updates: Partial<Preview3DConfig>) => {
            const newConfig = { ...customConfig, ...updates };
            setCustomConfig(newConfig);
            if (selectedPreviewId === "custom") {
                onSelectPreview?.(newConfig);
            }
        },
        [customConfig, onSelectPreview, selectedPreviewId]
    );

    const allPreviews: Preview3DConfig[] = [
        { ...customConfig, label: t("photoPreview.custom.label") },
        ...PREVIEW_CONFIGS.map(config => ({
            ...config,
            label: t(`photoPreview.configs.${config.id}`)
        })),
    ];

    if (!previewImageUrl) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-black border-t border-white/10 ${className}`}
                style={{ height: "180px" }}
            >
                <div className="flex flex-col items-center gap-3 text-white/40">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <Icon icon="lucide:image" width={28} height={28} aria-hidden="true" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-white/60">
                            {t("photoMode.title") || "No Image"}
                        </p>
                        <p className="text-xs text-white/40 mt-1 max-w-xs">
                            {t("photoMode.description") || "Upload or capture an image to get started"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const renderPreviewCard = (config: Preview3DConfig) => {
        const isSelected = selectedPreviewId === config.id;
        const isCustom = config.id === "custom";
        const ButtonCard = (
            <button
                onClick={() => {
                    onSelectPreview?.(config);
                    if (isCustom) setIsCustomPopoverOpen(true);
                }}
                className={`group relative shrink-0 w-32 sm:w-62 aspect-video squircle-element p-px transition-all duration-300 ease-out outline-none ${isSelected
                        ? `shadow-[0_0_20px_rgba(0,163,255,0.15)]`
                        : isCustom && isCustomUntouched
                            ? "bg-gradient-radial-primary border border-dashed border-white/20 hover:border-white/40"
                            : "bg-white/10 hover:bg-white/20"
                    }`}
                aria-label={config.label}
                aria-pressed={isSelected}
            >
                <div
                    className={`relative w-full h-full rounded-[10px] overflow-hidden transition-colors ${isCustom && isCustomUntouched ? "bg-transparent" : "bg-black/90"
                        }`}
                >
                    {(!isCustom || !isCustomUntouched) && (
                        <div
                            className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-[0.3] transition-opacity duration-300"
                            style={{
                                backgroundImage: `radial-gradient(circle, #ffffff 0.8px, transparent 0.8px)`,
                                backgroundSize: '10px 10px',
                            }}
                        />
                    )}
                    {isCustom && isCustomUntouched ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/3 group-hover:bg-white/5 border border-white/10 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                                <Icon icon="mdi:tune-variant" width={14} className="text-white/60 group-hover:text-[#00A3EE] transition-colors" />
                            </div>
                            <span className="text-[10px] font-medium text-white/50 group-hover:text-white/80 transition-colors">
                                {t("photoPreview.custom.customize")}
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-linear-to-br from-white/3 to-transparent" />
                            {isCustom && (
                                <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold text-white/90 uppercase tracking-wider pointer-events-none shadow-lg">
                                    <Icon icon="mdi:tune" width={10} className="text-[#00A3EE]" aria-hidden="true" />
                                    {t("photoPreview.custom.customize")}
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center p-2 z-10">
                                <div
                                    style={{
                                        perspective: `${config.perspective || 600}px`,
                                        perspectiveOrigin: 'center center'
                                    }}
                                    className="w-full h-full flex items-center justify-center"
                                >
                                    <div
                                        className="relative w-full h-full rounded-md overflow-hidden border border-white/5 shadow-2xl"
                                        style={{
                                            transform: `rotateX(${config.rotateX}deg) rotateY(${config.rotateY}deg) rotateZ(${config.rotateZ}deg) scale(${config.scale}) translateY(${config.translateY}%)`,
                                            transformStyle: "preserve-3d",
                                            transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                                        }}
                                    >
                                        <img
                                            src={previewImageUrl!}
                                            alt={config.label}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />
                            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 pointer-events-none flex items-center gap-1.5 z-20">
                                {!isCustom && <Icon icon="mdi:eye-outline" width={12} className="text-white/70" aria-hidden="true" />}
                                <span className="text-[11px] font-medium text-white/90 tracking-wide">
                                    {config.label}
                                </span>
                            </div>
                        </>
                    )}
                    {isSelected && (
                        <div className={`absolute top-2 right-2 z-30 size-5 rounded-full bg-gradient-primary flex items-center justify-center shadow-xl`} aria-hidden="true">
                            <Icon icon="mdi:check-bold" width={12} className="text-white" aria-hidden="true" />
                        </div>
                    )}
                </div>
            </button>
        );

        if (isCustom) {
            return (
                <Popover open={isCustomPopoverOpen} onOpenChange={setIsCustomPopoverOpen} key={config.id}>
                    <PopoverTrigger asChild>
                        {ButtonCard}
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        sideOffset={12}
                        className="w-64 bg-[#0A0A0A] border-white/10 shadow-2xl p-4 space-y-4 rounded-xl z-50"
                    >
                        <PopoverHeader className="mb-2">
                            <PopoverTitle className="text-xs font-semibold text-white/80 tracking-wide uppercase flex items-center gap-2">
                                <Icon icon="mdi:tune" width={14} className="text-[#00A3EE]" />
                                {t("photoPreview.custom.title")}
                            </PopoverTitle>
                        </PopoverHeader>

                        <div className="space-y-4">
                            <SliderControl
                                icon="mdi:cube-outline"
                                label={t("photoPreview.custom.perspective")}
                                value={customConfig.perspective || 600}
                                min={200}
                                max={1000}
                                step={50}
                                onChange={(value) => updateCustomConfig({ perspective: value })}
                                suffix="px"
                            />

                            <SliderControl
                                icon="mdi:resize"
                                label={t("photoPreview.custom.scale")}
                                value={Math.round(customConfig.scale * 100)}
                                min={50}
                                max={150}
                                step={5}
                                onChange={(value) => updateCustomConfig({ scale: value / 100 })}
                                suffix="%"
                            />

                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                                    <Icon icon="mdi:rotate-3d-variant" width={12} />
                                    <span>{t("photoPreview.custom.rotationXY")}</span>
                                </div>
                                <div
                                    className="relative w-full aspect-square bg-white/3 rounded-lg border border-white/10 cursor-crosshair overflow-hidden hover:bg-white/4 transition-colors"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                                        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

                                        updateCustomConfig({
                                            rotateY: Math.round(-x * 45),
                                            rotateX: Math.round(y * 45)
                                        });
                                    }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-full h-px bg-white/5" />
                                        <div className="h-full w-px bg-white/5 absolute" />
                                    </div>
                                    <div
                                        className={`absolute w-2.5 h-2.5 rounded-full bg-gradient-primary shadow-[0_0_10px_rgba(0,163,255,0.5)]`}
                                        style={{
                                            left: `${50 + (-customConfig.rotateY / 45) * 50}%`,
                                            top: `${50 + (customConfig.rotateX / 45) * 50}%`,
                                            transform: "translate(-50%, -50%)",
                                            transition: "all 0.1s ease-out"
                                        }}
                                    />
                                </div>
                            </div>

                            <SliderControl
                                icon="mdi:axis-z-rotate-clockwise"
                                label={t("photoPreview.custom.rotationZ")}
                                value={customConfig.rotateZ}
                                min={-45}
                                max={45}
                                step={5}
                                onChange={(value) => updateCustomConfig({ rotateZ: value })}
                                suffix="°"
                            />

                            <SliderControl
                                icon="mdi:arrow-up-down"
                                label={t("photoPreview.custom.vertical")}
                                value={customConfig.translateY}
                                min={-10}
                                max={10}
                                step={1}
                                onChange={(value) => updateCustomConfig({ translateY: value })}
                                suffix="%"
                            />
                        </div>

                        <button
                            onClick={() => {
                                const resetConfig: Preview3DConfig = {
                                    id: "custom",
                                    label: t("photoPreview.custom.label"),
                                    rotateX: 0,
                                    rotateY: 0,
                                    rotateZ: 0,
                                    translateY: 0,
                                    scale: 0.9,
                                    perspective: 600
                                };
                                setCustomConfig(resetConfig);
                                if (selectedPreviewId === "custom") onSelectPreview?.(resetConfig);
                            }}
                            className="w-full mt-4 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-white/60 hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5"
                        >
                            <Icon icon="mdi:restore" width={14} />
                            {t("photoPreview.custom.reset")}
                        </button>
                    </PopoverContent>
                </Popover>
            );
        }

        return <div key={config.id} className="contents">{ButtonCard}</div>;
    };

    return (
        <div className={`flex flex-col bg-black border-t border-white/10 ${className}`}>
            <div className="h-13 shrink-0 border-t border-white/10 flex items-center justify-between px-5 bg-[#0D0D11]">
                <div className="flex items-center gap-2 text-white/60 whitespace-nowrap">
                    <Icon icon="mdi:tune-vertical" width={16} aria-hidden="true" />
                    <span className="text-xs font-semibold tracking-wide uppercase">
                        {t("photoPreview.settings")}
                    </span>

                    {imageMaskConfig && onImageMaskConfigChange && (
                        <ImageMaskEditor
                            maskConfig={imageMaskConfig}
                            onMaskConfigChange={onImageMaskConfigChange}
                            canvasImageUrl={staticImageUrl ?? canvasImageUrl}
                        />
                    )}

                    {onToggle3DBackground && (
                        <TooltipAction label={t("photoPreview.apply3D")}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onToggle3DBackground(!apply3DToBackground)}
                                className={`px-2.5 py-2 text-xs font-medium squircle-element transition-all ${apply3DToBackground
                                        ? "bg-gradient-radial-primary text-cyan-500 border border-cyan-500/50!"
                                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                                    }`}
                                aria-label={t("photoPreview.apply3D")}
                                aria-pressed={apply3DToBackground}
                            >
                                <Icon icon="mdi:layers" width={12} className="inline" aria-hidden="true" />
                                {t("photoPreview.mockup3D")}
                            </Button>
                        </TooltipAction>
                    )}

                    <TooltipAction label={t("photoPreview.resetDefaults")}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                                const defaultCustom: Preview3DConfig = {
                                    id: "custom",
                                    label: t("photoPreview.custom.label"),
                                    rotateX: 0,
                                    rotateY: 0,
                                    rotateZ: 0,
                                    translateY: 0,
                                    scale: 0.9,
                                    perspective: 600
                                };
                                setCustomConfig(defaultCustom);
                                onReset?.();
                            }}
                        >
                            <Icon icon="material-symbols:refresh-rounded" width={12} aria-hidden="true" />
                            {t("photoPreview.reset")}
                        </Button>
                    </TooltipAction>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {onRemoveBackground && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 px-3 py-1.5 text-xs bg-cyan-400/10 border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/20 hover:border-cyan-200/50"
                            onClick={onRemoveBackground}
                            disabled={isBackgroundRemoving}
                            aria-label={t("photoPreview.backgroundRemoval.remove")}
                        >
                            <Icon icon={isBackgroundRemoving ? "svg-spinners:ring-resize" : "mdi:image-off-outline"} width={14} aria-hidden="true" />
                            {isBackgroundRemoving ? t("photoPreview.backgroundRemoval.processing") : t("photoPreview.backgroundRemoval.remove")}
                        </Button>
                    )}

                    {hasBackgroundRemoved && onRestoreOriginalImage && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 px-3 py-1.5 text-xs bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={onRestoreOriginalImage}
                            aria-label={t("photoPreview.backgroundRemoval.restore")}
                        >
                            <Icon icon="material-symbols:restore-rounded" width={14} aria-hidden="true" />
                            {t("photoPreview.backgroundRemoval.restore")}
                        </Button>
                    )}

                    {onOpenCropper && (
                        <TooltipAction label={t("cropper.tooltip")}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 px-3 py-1.5 text-xs bg-transparent border-white/10 hover:bg-white/5"
                                onClick={onOpenCropper}
                                aria-label={t("cropper.tooltip")}
                            >
                                <Icon icon="mdi:crop" width={14} aria-hidden="true" />
                                {t("cropper.button")}
                            </Button>
                        </TooltipAction>
                    )}

                    {onAspectRatioChange && (
                        <AspectRatioSelect
                            value={aspectRatio}
                            onChange={onAspectRatioChange}
                            customDimensions={customAspectRatio}
                            onCustomDimensionsChange={onCustomAspectRatioChange}
                        />
                    )}
                </div>
            </div>

            <div className="flex gap-3 px-5 overflow-x-auto custom-scrollbar mask-r-from-90% ">
                {allPreviews.map(renderPreviewCard)}
            </div>
        </div>
    );
}