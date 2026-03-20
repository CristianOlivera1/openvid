"use client";

import { useCallback, useMemo, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { AspectRatioSelect } from "../AspectRatioSelect";
import { formatTime } from "@/lib/video.utils";
import type { PlayerControlsProps } from "@/types/player-control.types";

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 1;

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
                    onZoomChange(Math.min(MAX_ZOOM, Math.round(zoomLevel) + ZOOM_STEP));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    onZoomChange(Math.max(MIN_ZOOM, Math.round(zoomLevel) - ZOOM_STEP));
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
    }, [onTogglePlayPause, onSkipBackward, onSkipForward, onToggleFullscreen, onZoomChange, zoomLevel]);

    return (
        <div
            className="h-13 shrink-0 border-t border-white/10 flex items-center justify-between px-5 bg-[#0D0D11]"
            role="toolbar"
            aria-label="Controles de reproducción"
        >
            {/* ── Left: fullscreen + zoom ── */}
            <div className="flex items-center gap-3 text-xs">
                <button
                    onClick={onToggleFullscreen}
                    className="text-zinc-500 hover:text-white transition-colors"
                    title={`${isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} (F)`}
                    aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    aria-pressed={isFullscreen}
                >
                    <Icon icon={isFullscreen ? "typcn:arrow-minimise" : "typcn:arrow-maximise"} width="17" />
                </button>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-2" role="group" aria-label="Zoom del timeline">
                    <button
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= MIN_ZOOM}
                        className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Alejar timeline (↓)"
                        aria-label="Reducir zoom del timeline"
                    >
                        <Icon icon="mdi:magnify-minus-outline" width="16" />
                    </button>

                    <div className="w-16 h-[3px] bg-white/10 rounded-full relative group cursor-pointer">
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
                            aria-label={`Zoom del timeline: ${Math.round(zoomLevel)}×`}
                            aria-valuemin={MIN_ZOOM}
                            aria-valuemax={MAX_ZOOM}
                            aria-valuenow={Math.round(zoomLevel)}
                        />
                    </div>

                    <button
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= MAX_ZOOM}
                        className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Acercar timeline (↑)"
                        aria-label="Aumentar zoom del timeline"
                    >
                        <Icon icon="mdi:magnify-plus-outline" width="16" />
                    </button>

                    <span className="text-[10px] font-mono text-zinc-500 min-w-[20px]" aria-live="polite" aria-atomic="true">
                        {Math.round(zoomLevel)}×
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4" role="group" aria-label="Controles de transporte">
                <span
                    className="text-[11px] font-mono text-zinc-500"
                    aria-label={`Tiempo actual: ${formatTime(currentTime)}`}
                >
                    {formatTime(currentTime)}
                </span>

                <div className="flex items-center gap-2.5">
                    <button
                        className="text-zinc-500 hover:text-white transition-colors"
                        onClick={onSkipBackward}
                        title="Retroceder 5s (← o J)"
                        aria-label="Retroceder 5 segundos"
                    >
                        <Icon icon="mdi:rewind-5" width="20" />
                    </button>

                    <button
                        onClick={onTogglePlayPause}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/10 text-white transition border border-white/10"
                        title={`${isPlaying ? "Pausar" : "Reproducir"} (Espacio o K)`}
                        aria-label={isPlaying ? "Pausar" : "Reproducir"}
                        aria-pressed={isPlaying}
                    >
                        <Icon icon={isPlaying ? "mdi:pause" : "mdi:play"} width="20" />
                    </button>

                    <button
                        className="text-zinc-500 hover:text-white transition-colors"
                        onClick={onSkipForward}
                        title="Avanzar 5s (→ o L)"
                        aria-label="Avanzar 5 segundos"
                    >
                        <Icon icon="mdi:fast-forward-5" width="20" />
                    </button>
                </div>

                <span
                    className="text-[11px] font-mono text-zinc-500"
                    aria-label={`Duración total: ${formatTime(videoDuration)}`}
                >
                    {formatTime(videoDuration)}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 px-3 py-1.5 text-xs"
                    onClick={onOpenCropper}
                    aria-label="Abrir recortador de video"
                    title="Abrir recortador de video"
                >
                    <Icon icon="mdi:crop" width="14" /> Recortar
                </Button>
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