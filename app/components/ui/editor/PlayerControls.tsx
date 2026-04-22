"use client";

import { useCallback, useMemo, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AspectRatioSelect } from "../AspectRatioSelect";
import { formatTime } from "@/lib/video.utils";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, type PlayerControlsProps } from "@/types/player-control.types";
import { TooltipAction } from "@/components/ui/tooltip-action";

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
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onTogglePlayPause, onSkipBackward, onSkipForward, onToggleFullscreen, handleZoomIn, handleZoomOut]);

    const fullscreenLabel = isFullscreen ? t("fullscreen.exit") : t("fullscreen.enter");
    const playPauseLabel = isPlaying ? t("transport.pause") : t("transport.play");

    return (
        <div
            className="h-13 shrink-0 border-t border-white/10 flex items-center justify-between px-5 bg-[#0D0D11]"
            role="toolbar"
            aria-label={t("toolbar")}
        >
            {/* Left Section: Fullscreen & Zoom */}
            <div className="flex items-center gap-3 text-xs">
                <TooltipAction label={fullscreenLabel}>
                    <button
                        onClick={onToggleFullscreen}
                        className="text-zinc-500 hover:text-white transition-colors"
                        aria-label={fullscreenLabel}
                        aria-pressed={isFullscreen}
                    >
                        <Icon icon={isFullscreen ? "typcn:arrow-minimise" : "typcn:arrow-maximise"} width="17" />
                    </button>
                </TooltipAction>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-2" role="group" aria-label={t("zoom.group")}>
                    <TooltipAction label={t("zoom.out")}>
                        <button
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= MIN_ZOOM}
                            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t("zoom.out")}
                        >
                            <Icon icon="mdi:magnify-minus-outline" width="16" />
                        </button>
                    </TooltipAction>

                    <div className="w-16 h-0.75 bg-white/10 rounded-full relative group cursor-pointer">
                        <div
                            className="absolute top-0 left-0 h-full bg-zinc-500 rounded-full transition-[width] duration-75"
                            style={{ width: `${zoomPercentage}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md transition-[left] duration-75 group-hover:scale-110"
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
                            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t("zoom.in")}
                        >
                            <Icon icon="mdi:magnify-plus-outline" width="16" />
                        </button>
                    </TooltipAction>

                    <span className="text-[10px] font-mono text-zinc-500 min-w-5" aria-live="polite" aria-atomic="true">
                        {Math.round(zoomLevel)}×
                    </span>
                </div>
            </div>

            {/* Middle Section: Transport Controls */}
            <div className="flex items-center gap-4" role="group" aria-label={t("transport.group")}>
                <span
                    className="text-[11px] font-mono text-zinc-500"
                    aria-label={t("transport.currentTime", { time: formatTime(currentTime) })}
                >
                    {formatTime(currentTime)}
                </span>

                <div className="flex items-center gap-2.5">
                    <TooltipAction label={t("transport.backward")}>
                        <button
                            className="text-zinc-500 hover:text-white transition-colors"
                            onClick={onSkipBackward}
                            aria-label={t("transport.backward")}
                        >
                            <Icon icon="mdi:rewind-5" width="20" />
                        </button>
                    </TooltipAction>

                    <TooltipAction label={playPauseLabel}>
                        <button
                            onClick={onTogglePlayPause}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/10 text-white transition border border-white/10"
                            aria-label={playPauseLabel}
                            aria-pressed={isPlaying}
                        >
                            <Icon icon={isPlaying ? "mdi:pause" : "mdi:play"} width="20" />
                        </button>
                    </TooltipAction>

                    <TooltipAction label={t("transport.forward")}>
                        <button
                            className="text-zinc-500 hover:text-white transition-colors"
                            onClick={onSkipForward}
                            aria-label={t("transport.forward")}
                        >
                            <Icon icon="mdi:fast-forward-5" width="20" />
                        </button>
                    </TooltipAction>
                </div>

                <span
                    className="text-[11px] font-mono text-zinc-500"
                    aria-label={t("transport.totalTime", { time: formatTime(videoDuration) })}
                >
                    {formatTime(videoDuration)}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <TooltipAction label={t("cropper.tooltip")}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 px-3 py-1.5 text-xs"
                        onClick={onOpenCropper}
                        aria-label={t("cropper.tooltip")}
                    >
                        <Icon icon="mdi:crop" width="14" />
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