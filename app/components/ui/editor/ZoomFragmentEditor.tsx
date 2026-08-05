"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { SliderControl } from "../../../../components/ui/SliderControl";
import type { ZoomFragmentEditorProps } from "@/types/zoom.types";
import { formatZoomTime, zoomLevelToFactor, speedToTransitionMs, calculateHoldDuration, getOrbitalFocusAtTimelineTime, getOrbitalTrailForFragmentRange, isOrbitalZoomFragment } from "@/types/zoom.types";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { DetailPageHeader } from "@/components/ui/DetailHeaderMenu";
import { Toggle } from "@/components/ui/toggle";

export function ZoomFragmentEditor({
    fragment, videoUrl, videoThumbnail, currentTime = 0,
    getThumbnailForTime, videoDimensions, onBack, onDelete, onUpdate, is3DModelActive = false,
}: ZoomFragmentEditorProps) {
    const t = useTranslations("zoomFragmentEditor");
    const tCommon = useTranslations("editor");
    const focusPreviewRef = useRef<HTMLDivElement>(null);
    const [editingPoint, setEditingPoint] = useState<'start' | 'end'>('start');

    useEffect(() => {
        if (is3DModelActive && fragment.enable3D) {
            onUpdate({ enable3D: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is3DModelActive]);

    const dynamicThumbnail = useMemo(() => {
        if (!getThumbnailForTime) return videoThumbnail || null;
        const thumb = getThumbnailForTime(currentTime);
        return thumb?.dataUrl || videoThumbnail || null;
    }, [getThumbnailForTime, currentTime, videoThumbnail]);

    const movementEndX = fragment.movementEndX ?? fragment.focusX;
    const movementEndY = fragment.movementEndY ?? fragment.focusY;
    const movementEnabled = fragment.movementEnabled ?? false;
    const isOrbital = isOrbitalZoomFragment(fragment);
    const hasLinearMovement = movementEnabled && !isOrbital;
    const orbitalFocus = isOrbital ? getOrbitalFocusAtTimelineTime(fragment, currentTime) : null;
    const previewFocus = orbitalFocus ?? { x: fragment.focusX, y: fragment.focusY };
    const orbitalPath = useMemo(() => getOrbitalTrailForFragmentRange(fragment)
        .map((point) => `${point.x},${point.y}`)
        .join(" "), [fragment]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, point: 'start' | 'end') => {
        if (isOrbital) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setEditingPoint(point);
        const move = (ev: PointerEvent) => {
            if (!focusPreviewRef.current) return;
            const rect = focusPreviewRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
            if (point === 'start') { onUpdate({ focusX: x, focusY: y }); }
            else { onUpdate({ movementEndX: x, movementEndY: y }); }
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isOrbital) return;
        if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
        if (!focusPreviewRef.current) return;
        const rect = focusPreviewRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        if (hasLinearMovement && editingPoint === 'end') { onUpdate({ movementEndX: x, movementEndY: y }); }
        else { onUpdate({ focusX: x, focusY: y }); }
    };

    const handleToggleMovement = () => {
        if (isOrbital) return;
        if (!movementEnabled) {
            const holdDuration = calculateHoldDuration(fragment);
            const endX = Math.min(85, Math.max(15, fragment.focusX + 25));
            const endY = Math.min(85, Math.max(15, fragment.focusY + 25));
            onUpdate({ movementEnabled: true, movementEndX: endX, movementEndY: endY, movementStartOffset: 0, movementEndOffset: holdDuration });
        } else {
            onUpdate({ movementEnabled: false });
        }
    };

    const handleToggle3D = () => {
        onUpdate({ enable3D: !(fragment.enable3D ?? false) });
    };

    return (
        <div className="flex flex-col h-full text-white">
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-white/6 shrink-0">
                <DetailPageHeader
                    label={t("title")}
                    icon="ph:arrow-left-bold"
                    onBack={onBack}
                />
                <TooltipAction label={t("deleteTooltip")}>
                    <button onClick={onDelete} className="ml-auto flex items-center gap-1.5 text-[11px] text-red-400/70 hover:text-red-400 px-2 py-1 rounded-md transition-colors shrink-0">
                        <Icon icon="ph:trash-bold" width="12" />
                        {t("actions.delete")}
                    </button>
                </TooltipAction>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">

                {/* Focus point preview */}
                <div>
                    <div className="flex items-center gap-2 text-xs mb-2 text-white/70">
                        <Icon icon="material-symbols:center-focus-strong-outline" width="16" />
                        <span>{(hasLinearMovement || isOrbital) ? t("focusPoints.multiple") : t("focusPoints.single")}</span>
                        {hasLinearMovement && (
                            <div className="ml-auto flex gap-1">
                                <button
                                    onClick={() => setEditingPoint('start')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${editingPoint === 'start' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                    {t("focusPoints.start")}
                                </button>
                                <button
                                    onClick={() => setEditingPoint('end')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${editingPoint === 'end' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                    {t("focusPoints.end")}
                                </button>
                            </div>
                        )}
                    </div>
                    <div
                        ref={focusPreviewRef}
                        className="relative w-full squircle-element overflow-hidden bg-[#0a0a0e] border border-white/10 select-none"
                        style={{ aspectRatio: videoDimensions ? `${videoDimensions.width}/${videoDimensions.height}` : "16/9" }}
                        onClick={isOrbital ? undefined : handlePreviewClick}
                    >
                        {dynamicThumbnail ? (
                            <img src={dynamicThumbnail} alt={t("preview.alt")} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" />
                        ) : videoUrl ? (
                            <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" muted />
                        ) : null}

                        <div
                            className="absolute border border-dashed border-blue-500/50 bg-linear-to-b from-blue-500/20 to-transparent squircle-element pointer-events-none transition-opacity duration-200"
                            style={{ width: `${100 / zoomLevelToFactor(fragment.zoomLevel)}%`, height: `${100 / zoomLevelToFactor(fragment.zoomLevel)}%`, left: `${previewFocus.x}%`, top: `${previewFocus.y}%`, transform: 'translate(-50%, -50%)', opacity: hasLinearMovement && editingPoint === 'end' ? 0.4 : 1, willChange: "left, top" }}
                        />

                        {isOrbital && orbitalPath && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                                <polyline points={orbitalPath} fill="none" stroke="rgba(168, 85, 247, 0.8)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                <circle cx={previewFocus.x} cy={previewFocus.y} r="1.8" fill="rgb(216, 180, 254)" stroke="white" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                            </svg>
                        )}

                        {hasLinearMovement && (() => {
                            const dx = movementEndX - fragment.focusX;
                            const dy = movementEndY - fragment.focusY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const radius = dist > 0 ? 5.5 : 0;
                            const ratio = dist > 0 ? (dist - radius) / dist : 0;
                            const x2 = fragment.focusX + dx * ratio;
                            const y2 = fragment.focusY + dy * ratio;
                            return (
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5, willChange: "contents" }}>
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(16, 185, 129, 0.7)" />
                                        </marker>
                                    </defs>
                                    <line x1={`${fragment.focusX}%`} y1={`${fragment.focusY}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="rgba(16, 185, 129, 0.5)" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrowhead)" />
                                </svg>
                            );
                        })()}

                        {hasLinearMovement && (
                            <div
                                className="absolute border border-dashed border-emerald-500/50 bg-linear-to-b from-emerald-500/20 to-transparent squircle-element pointer-events-none transition-opacity duration-200"
                                style={{ width: `${100 / zoomLevelToFactor(fragment.zoomLevel)}%`, height: `${100 / zoomLevelToFactor(fragment.zoomLevel)}%`, left: `${movementEndX}%`, top: `${movementEndY}%`, transform: 'translate(-50%, -50%)', opacity: editingPoint === 'start' ? 0.4 : 1, willChange: "left, top" }}
                            />
                        )}

                        {!isOrbital && <div data-drag-handle className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none transition-[opacity,transform] duration-150 ${hasLinearMovement && editingPoint === 'end' ? 'opacity-60 scale-90' : ''}`} style={{ left: `${fragment.focusX}%`, top: `${fragment.focusY}%`, transform: "translate(-50%, -50%)", willChange: "left, top" }} onPointerDown={(e) => handlePointerDown(e, 'start')}>
                            <div className="size-8 rounded-full bg-blue-500 shadow-lg border-2 border-white/80 hover:scale-110 transition-transform flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white">A</span>
                            </div>
                        </div>}

                        {hasLinearMovement && (
                            <div data-drag-handle className={`absolute z-10 cursor-grab active:cursor-grabbing touch-none transition-[opacity,transform] duration-150 ${editingPoint === 'start' ? 'opacity-60 scale-90' : ''}`} style={{ left: `${movementEndX}%`, top: `${movementEndY}%`, transform: "translate(-50%, -50%)", willChange: "left, top" }} onPointerDown={(e) => handlePointerDown(e, 'end')}>
                                <div className="size-8 rounded-full bg-emerald-500 shadow-lg border-2 border-white/80 hover:scale-110 transition-transform flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white">B</span>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                            <span className="text-[7px] text-white/20 font-mono uppercase tracking-[0.3em]">
                                {isOrbital ? t("preview.orbitalPath") : hasLinearMovement ? t("preview.dragAB") : t("preview.dragOrClick")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Camera movement */}
                <div className="space-y-3 p-3 bg-white/3 border border-white/8 squircle-element">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icon icon="mdi:vector-line" width="16" className="text-white/60" />
                            <div>
                                <p className="text-xs font-medium text-white/80">{t("movement.title")}</p>
                                <p className="text-[11px] text-white/40">{t("movement.subtitle")}</p>
                            </div>
                        </div>
                        <Toggle
                            checked={isOrbital || movementEnabled}
                            onChange={handleToggleMovement}
                            activeColor={isOrbital ? "bg-violet-500" : "bg-emerald-500"}
                            disabled={isOrbital}
                        />
                    </div>

                    {isOrbital && (
                        <p className="text-[11px] text-violet-200/60 leading-relaxed">{t("movement.orbitalDescription")}</p>
                    )}

                    {hasLinearMovement && (() => {
                        const holdDuration = calculateHoldDuration(fragment);
                        const startOffset = fragment.movementStartOffset ?? 0;
                        const endOffset = fragment.movementEndOffset ?? holdDuration;
                        const transitionSec = speedToTransitionMs(fragment.speed) / 1000;
                        const totalDuration = fragment.endTime - fragment.startTime;
                        const entryPct = (transitionSec / totalDuration) * 100;
                        const exitPct = (transitionSec / totalDuration) * 100;
                        const holdPct = Math.max(0, 100 - entryPct - exitPct);
                        const moveStartPct = holdDuration > 0 ? (startOffset / holdDuration) * 100 : 0;
                        const moveEndPct = holdDuration > 0 ? (endOffset / holdDuration) * 100 : 100;

                        const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>, type: 'start' | 'end' | 'range') => {
                            const timeline = e.currentTarget.closest('[data-hold-timeline]') as HTMLElement;
                            if (!timeline) return;
                            const rect = timeline.getBoundingClientRect();
                            const initialX = e.clientX;
                            const initialStartOffset = startOffset;
                            const initialEndOffset = endOffset;
                            const minTimeGap = Math.max(0.1, (24 / (rect.width || 1)) * holdDuration);
                            const handleMove = (ev: MouseEvent) => {
                                const deltaX = ev.clientX - initialX;
                                const deltaPct = (deltaX / rect.width) * 100;
                                const deltaTime = (deltaPct / 100) * holdDuration;
                                if (type === 'start') {
                                    const newStart = Math.max(0, Math.min(initialEndOffset - minTimeGap, initialStartOffset + deltaTime));
                                    onUpdate({ movementStartOffset: Math.round(newStart * 10) / 10 });
                                } else if (type === 'end') {
                                    const newEnd = Math.max(initialStartOffset + minTimeGap, Math.min(holdDuration, initialEndOffset + deltaTime));
                                    onUpdate({ movementEndOffset: Math.round(newEnd * 10) / 10 });
                                } else if (type === 'range') {
                                    const duration = initialEndOffset - initialStartOffset;
                                    const newStart = Math.max(0, Math.min(holdDuration - duration, initialStartOffset + deltaTime));
                                    onUpdate({ movementStartOffset: Math.round(newStart * 10) / 10, movementEndOffset: Math.round((newStart + duration) * 10) / 10 });
                                }
                            };
                            const handleUp = () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
                            window.addEventListener('mousemove', handleMove);
                            window.addEventListener('mouseup', handleUp);
                        };

                        return holdDuration > 0.1 ? (
                            <div className="space-y-3 p-3 bg-[#0A0A0A] border border-[#262626] rounded-xl group transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-white/60">
                                        <span>{t("movement.timeline.title")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                            {t("movement.timeline.active", { seconds: (endOffset - startOffset).toFixed(1) })}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative h-9 flex rounded-md overflow-hidden bg-[#141414] border border-[#1F1F1F]">
                                        <div className="h-full bg-white/3 border-r border-white/5 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity" style={{ width: `${entryPct}%` }}>
                                            <Icon icon="iconamoon:zoom-in-fill" width="12" className="text-white/40" />
                                        </div>
                                        <div className="h-full relative flex-1 bg-transparent" style={{ width: `${holdPct}%` }} data-hold-timeline>
                                            <div className="absolute top-1.5 bottom-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-sm cursor-grab active:cursor-grabbing hover:bg-emerald-500/30 transition-all" style={{ left: `min(${moveStartPct}%, calc(100% - 28px))`, width: `${moveEndPct - moveStartPct}%`, minWidth: '28px' }} onMouseDown={(e) => handleTimelineDrag(e, 'range')}>
                                                <div className="absolute -left-1.5 top-0 bottom-0 w-4 cursor-ew-resize group/left flex items-center justify-center z-20" onMouseDown={(e) => { e.stopPropagation(); handleTimelineDrag(e, 'start'); }}>
                                                    <div className="w-0.5 h-3 bg-emerald-400/50 group-hover/left:bg-emerald-300 rounded-full transition-colors" />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                                    <div className="w-1 h-1 bg-emerald-400 rounded-full mx-0.5" />
                                                </div>
                                                <div className="absolute -right-1.5 top-0 bottom-0 w-4 cursor-ew-resize group/right flex items-center justify-center z-20" onMouseDown={(e) => { e.stopPropagation(); handleTimelineDrag(e, 'end'); }}>
                                                    <div className="w-0.5 h-3 bg-emerald-400/50 group-hover/right:bg-emerald-300 rounded-full transition-colors" />
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-25">
                                                {[...Array(6)].map((_, i) => (<div key={i} className="w-px h-full bg-white" />))}
                                            </div>
                                        </div>
                                        <div className="h-full bg-white/3 border-l border-white/5 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity" style={{ width: `${exitPct}%` }}>
                                            <Icon icon="iconamoon:zoom-out-fill" width="12" className="text-white/40" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-0.5">
                                        <div className="flex gap-4 text-[9px] font-mono text-white/30">
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-emerald-500/50">{t("movement.timeline.startLabel")}</span>
                                                <span className="text-white/70">{startOffset.toFixed(1)}s</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-emerald-500/50">{t("movement.timeline.endLabel")}</span>
                                                <span className="text-white/70">{endOffset.toFixed(1)}s</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 squircle-element">
                                <div className="flex items-center gap-2 text-xs text-amber-400/80">
                                    <span>{t("movement.tooShort")}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* 3D effect */}
                {!is3DModelActive && (
                    <div className="space-y-3 p-3 bg-white/3 border border-white/8 squircle-element">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon icon="mdi:cube-outline" width="16" className="text-white/60" />
                                <div>
                                    <p className="text-xs font-medium text-white/80">{tCommon("effect3d.title")}</p>
                                    <p className="text-[11px] text-white/40">{tCommon("effect3d.subtitle")}</p>
                                </div>
                            </div>
                            <Toggle
                                checked={fragment.enable3D ?? false}
                                onChange={handleToggle3D}
                                activeColor="bg-gray-400"
                            />
                        </div>

                        {fragment.enable3D && (
                            <div className="space-y-3 pt-3 border-t border-gray-500/20">
                                <SliderControl icon="mdi:brightness-6" label={tCommon("effect3d.intensity")} value={fragment.perspective3DIntensity ?? 50} min={0} max={100} step={5} onChange={(value) => onUpdate({ perspective3DIntensity: value })} suffix="%" />
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <span>{tCommon("effect3d.direction")}</span>
                                    </div>
                                    <div
                                        className="relative w-full aspect-square mx-auto bg-[#0A0A0A] squircle-element border border-[#262626] hover:border-[#404040] transition-colors cursor-crosshair overflow-hidden group"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                                            const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                                            onUpdate({ perspective3DAngleX: Math.round(y * 45), perspective3DAngleY: Math.round(-x * 45) });
                                        }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-full h-px bg-[#1F1F1F]" />
                                            <div className="h-full w-px bg-[#1F1F1F] absolute" />
                                        </div>

                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div
                                                className="w-40 h-28 border border-gray-500/40 bg-gray-500/10 rounded-md transition-transform duration-300 ease-out shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                                                style={{ transform: `perspective(120px) rotateX(${fragment.perspective3DAngleX ?? 0}deg) rotateY(${fragment.perspective3DAngleY ?? 0}deg)` }}
                                            />
                                        </div>

                                        <div
                                            className="absolute w-2.5 h-2.5 bg-gray-300 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all duration-300 ease-out z-10"
                                            style={{
                                                left: `${50 + (-(fragment.perspective3DAngleY ?? (-(fragment.focusX - 50) / 50 * 15)) / 45) * 50}%`,
                                                top: `${50 + ((fragment.perspective3DAngleX ?? ((fragment.focusY - 50) / 50 * 15)) / 45) * 50}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        />
                                    </div>

                                    <p className="text-[11px] text-white/30 text-center">{tCommon("effect3d.directionHint")}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <SliderControl icon="mdi:magnify-plus-outline" label={t("sliders.zoomLevel")} value={fragment.zoomLevel} min={1} max={10} step={0.1} onChange={(value) => onUpdate({ zoomLevel: value })} />
                <SliderControl icon="mdi:speedometer" label={t("sliders.transitionSpeed")} value={fragment.speed} min={1} max={10} step={0.1} onChange={(value) => onUpdate({ speed: value })} />

                <div className="h-px bg-white/10" />

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/35">{t("info.fragmentDuration")}</span>
                        <span className="font-mono text-white/55 bg-white/10 px-2 py-0.5 rounded">
                            {formatZoomTime(fragment.startTime)} - {formatZoomTime(fragment.endTime)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/35">{t("info.zoomFactor")}</span>
                        <span className="font-mono text-white/55 bg-white/10 px-2 py-0.5 rounded">
                            {zoomLevelToFactor(fragment.zoomLevel).toFixed(1)}×
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/35">{t("info.transitionDuration")}</span>
                        <span className="font-mono text-white/55 bg-white/10 px-2 py-0.5 rounded">
                            {(speedToTransitionMs(fragment.speed) / 1000).toFixed(1)}s
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
