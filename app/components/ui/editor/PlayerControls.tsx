"use client";

import { useCallback, useMemo, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AspectRatioSelect } from "../AspectRatioSelect";
import { formatTime } from "@/lib/video.utils";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, type PlayerControlsProps } from "@/types/player-control.types";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { ImageMaskEditor } from "./ImageMaskEditor";

export function PlayerControls({
    isPlaying,
    currentTime,
    videoDuration,
    aspectRatio,
    isFullscreen,
    zoomLevel,
    customAspectRatio,
    onTogglePlayPause,
    onSkipBackward,
    onSkipForward,
    onToggleFullscreen,
    onAspectRatioChange,
    onCustomAspectRatioChange,
    onOpenCropper,
    onZoomChange,
    videoMaskConfig = { enabled: false },
    onVideoMaskConfigChange,
    videoPreviewImageUrl,
    onSplitClip,
    canSplitClip = false,
}: PlayerControlsProps) {
    const t = useTranslations("playerControls");

    const zoomPercentage = useMemo(() => {
        return ((zoomLevel - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
    }, [zoomLevel]);

    const handleZoomIn = useCallback(() => {
        onZoomChange(Math.min(MAX_ZOOM, Math.round(zoomLevel) + ZOOM_STEP));
    }, [zoomLevel, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        onZoomChange(Math.max(MIN_ZOOM, Math.round(zoomLevel) - ZOOM_STEP));
    }, [zoomLevel, onZoomChange]);

    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onZoomChange(Math.round(parseFloat(e.target.value)));
    }, [onZoomChange]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if ((e.target as HTMLElement).isContentEditable) return;

            switch (e.key) {
                case " ":
                case "k":
                case "K":
                    e.preventDefault();
                    onTogglePlayPause();
                    break;
                case "ArrowLeft":
                case "j":
                case "J":
                    e.preventDefault();
                    onSkipBackward();
                    break;
                case "ArrowRight":
                case "l":
                case "L":
                    e.preventDefault();
                    onSkipForward();
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    handleZoomIn();
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    handleZoomOut();
                    break;
                case "f":
                case "F":
                    e.preventDefault();
                    onToggleFullscreen();
                    break;
                case "s":
                case "S":
                    e.preventDefault();
                    if (canSplitClip) onSplitClip?.();
                    break;
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;

            const target = e.target instanceof Element ? e.target : null;
            if (
                (target instanceof HTMLElement && target.isContentEditable) ||
                target?.closest("button, input, textarea, select")
            ) return;

            e.preventDefault();
            if (e.deltaY < 0) {
                handleZoomIn();
            } else if (e.deltaY > 0) {
                handleZoomOut();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("wheel", handleWheel);
        };
    }, [onTogglePlayPause, onSkipBackward, onSkipForward, onToggleFullscreen, handleZoomIn, handleZoomOut, onSplitClip, canSplitClip]);

    const fullscreenLabel = isFullscreen ? t("fullscreen.exit") : t("fullscreen.enter");
    const playPauseLabel = isPlaying ? t("transport.pause") : t("transport.play");

    return (
        <div
            className="h-12 shrink-0 border-t border-border flex items-center justify-between px-3 bg-background"
            role="toolbar"
            aria-label={t("toolbar")}
        >
            {/* Left Section: Fullscreen & Zoom */}
            <div className="flex items-center gap-3 text-xs">
                <TooltipAction label={t("split.clip")}>
                    <button
                        onClick={() => onSplitClip?.()}
                        disabled={!canSplitClip}
                        className="text-muted-foreground/70 hover:text-foreground active:scale-95 transition-all p-1 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground/70 disabled:active:scale-100"
                        aria-label={t("split.clip")}
                    >
                        <Icon icon="mingcute:scissors-fill" width="15" aria-hidden="true" />
                    </button>
                </TooltipAction>

                <div className="h-4 w-px bg-border" />

                <div className="flex items-center gap-2" role="group" aria-label={t("zoom.group")} title={t("zoom.wheel")}>
                    <TooltipAction label={t("zoom.out")}>
                        <button
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= MIN_ZOOM}
                            className="min-h-8 min-w-8 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t("zoom.out")}
                        >
                            <Icon icon="mdi:magnify-minus-outline" width="16" aria-hidden="true" />
                        </button>
                    </TooltipAction>

                    <div className="w-16 h-0.75 bg-muted rounded-full relative group cursor-pointer">
                        <div
                            className="absolute top-0 left-0 h-full bg-muted-foreground rounded-full transition-[width] duration-75"
                            style={{ width: `${zoomPercentage}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-foreground rounded-full shadow-md transition-[left] duration-75 group-hover:scale-110"
                            style={{ left: `calc(${zoomPercentage}% - 5px)` }}
                        />
                        <input
                            type="range"
                            min={MIN_ZOOM}
                            max={MAX_ZOOM}
                            step={1}
                            value={Math.round(zoomLevel)}
                            onChange={handleSliderChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                            aria-label={t("zoom.label", { level: Math.round(zoomLevel) })}
                            aria-valuemin={MIN_ZOOM}
                            aria-valuemax={MAX_ZOOM}
                            aria-valuenow={Math.round(zoomLevel)}
                        />
                    </div>

                    <TooltipAction label={t("zoom.in")}>
                        <button
                            onClick={handleZoomIn}
                            disabled={zoomLevel >= MAX_ZOOM}
                            className="min-h-8 min-w-8 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t("zoom.in")}
                        >
                            <Icon icon="mdi:magnify-plus-outline" width="16" aria-hidden="true" />
                        </button>
                    </TooltipAction>

                    <span className="text-[11px] font-mono text-muted-foreground/70 min-w-5" aria-live="polite" aria-atomic="true">
                        {Math.round(zoomLevel)}×
                    </span>
                </div>

                <div className="h-4 w-px bg-border" />
                <TooltipAction label={fullscreenLabel}>
                    <button
                        onClick={onToggleFullscreen}
                        className="text-muted-foreground/70 hover:text-foreground transition-colors"
                        aria-label={fullscreenLabel}
                        aria-pressed={isFullscreen}
                    >
                        <Icon icon={isFullscreen ? "typcn:arrow-minimise" : "octicon:screen-full-16"} width="17" aria-hidden="true" />
                    </button>
                </TooltipAction>
            </div>

            <div className="flex items-center gap-4" role="group" aria-label={t("transport.group")}>
                <span
                    className="text-[11px] font-mono text-muted-foreground/70"
                    aria-label={t("transport.currentTime", { time: formatTime(currentTime) })}
                >
                    {formatTime(currentTime)}
                </span>

                <div className="flex items-center gap-2.5">
                    <TooltipAction label={t("transport.backward")}>
                        <button
                            className="text-muted-foreground/70 hover:text-foreground transition-colors"
                            onClick={onSkipBackward}
                            aria-label={t("transport.backward")}
                        >
                            <Icon icon="mdi:rewind-5" width="20" aria-hidden="true" />
                        </button>
                    </TooltipAction>

                    <TooltipAction label={playPauseLabel}>
                        <button
                            onClick={onTogglePlayPause}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted text-foreground transition border border-border"
                            aria-label={playPauseLabel}
                            aria-pressed={isPlaying}
                        >
                            <Icon icon={isPlaying ? "mdi:pause" : "mdi:play"} width="20" aria-hidden="true" />
                        </button>
                    </TooltipAction>

                    <TooltipAction label={t("transport.forward")}>
                        <button
                            className="text-muted-foreground/70 hover:text-foreground transition-colors"
                            onClick={onSkipForward}
                            aria-label={t("transport.forward")}
                        >
                            <Icon icon="mdi:fast-forward-5" width="20" aria-hidden="true" />
                        </button>
                    </TooltipAction>
                </div>

                <span
                    className="text-[11px] font-mono text-muted-foreground/70"
                    aria-label={t("transport.totalTime", { time: formatTime(videoDuration) })}
                >
                    {formatTime(videoDuration)}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <ImageMaskEditor
                    maskConfig={videoMaskConfig}
                    onMaskConfigChange={onVideoMaskConfigChange}
                    canvasImageUrl={videoPreviewImageUrl}
                />
                <TooltipAction label={t("cropper.tooltip")}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 px-3 py-1.5 text-xs"
                        onClick={onOpenCropper}
                        aria-label={t("cropper.tooltip")}
                    >
                        <Icon icon="mdi:crop" width="14" aria-hidden="true" />
                        {t("cropper.button")}
                    </Button>
                </TooltipAction>

                <AspectRatioSelect
                    value={aspectRatio}
                    onChange={onAspectRatioChange}
                    customDimensions={customAspectRatio}
                    onCustomDimensionsChange={onCustomAspectRatioChange}
                />
            </div>
        </div>
    );
}