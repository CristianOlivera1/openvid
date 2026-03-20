"use client";

import { Icon } from "@iconify/react";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import type {
    BackgroundColorConfig,
    GradientConfig,
    ColorStop,
    GradientType
} from "@/types";
import { gradientToCss, PRESET_SOLID_COLORS, PRESET_LINEAR_GRADIENTS, PRESET_RADIAL_GRADIENTS, PRESET_CONIC_GRADIENTS } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BackgroundColorEditorProps {
    value: BackgroundColorConfig | null;
    onChange: (config: BackgroundColorConfig) => void;
}

let stopIdCounter = 0;
function generateStopId() {
    return `stop-${Date.now()}-${stopIdCounter++}`;
}

function ensureStopIds(stops: ColorStop[]): ColorStop[] {
    return stops.map(stop => ({
        ...stop,
        id: stop.id || generateStopId()
    }));
}

// ── Native Drag & Drop — zero re-renders, original-position hit testing ──

interface SortableStopListProps {
    stops: ColorStop[];
    onReorder: (newStops: ColorStop[]) => void;
    onColorChange: (index: number, color: string) => void;
    onPositionChange: (index: number, position: number) => void;
    onRemove: (index: number) => void;
}

function SortableStopList({ stops, onReorder, onColorChange, onPositionChange, onRemove }: SortableStopListProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const indicatorRef = useRef<HTMLDivElement | null>(null);
    const dragIdxRef = useRef<number>(-1);
    const overIdxRef = useRef<number>(-1);
    // Snapshot of each item's original top/bottom in the viewport, taken at drag start
    // before any transforms are applied. Used for hit-testing throughout the drag.
    const originalRectsRef = useRef<{ top: number; bottom: number; mid: number }[]>([]);
    const offsetRef = useRef({ x: 0, y: 0 });
    const itemHeightRef = useRef(0); // height + gap, measured once

    const stopsRef = useRef(stops);
    useEffect(() => { stopsRef.current = stops; }, [stops]);
    const onReorderRef = useRef(onReorder);
    useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

    const getItemEls = () =>
        listRef.current
            ? Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-drag-row]"))
            : [];

    /** Apply CSS transforms directly to DOM — no React state touched */
    const applyVisuals = (dragIdx: number, overIdx: number) => {
        const items = getItemEls();
        const h = itemHeightRef.current;

        items.forEach((el, i) => {
            if (i === dragIdx) {
                el.style.opacity = "0.2";
                el.style.transform = "none";
                return;
            }
            // Which items need to slide to make room for the dragged item?
            let shift = 0;
            if (dragIdx < overIdx) {
                // moving down → items between [dragIdx+1 .. overIdx] slide UP by h
                if (i > dragIdx && i <= overIdx) shift = -h;
            } else if (dragIdx > overIdx) {
                // moving up → items between [overIdx .. dragIdx-1] slide DOWN by h
                if (i >= overIdx && i < dragIdx) shift = h;
            }
            el.style.transform = shift !== 0 ? `translateY(${shift}px)` : "none";
            el.style.opacity = "1";
        });

        // Indicator line — positioned using original rects (untransformed)
        if (indicatorRef.current && originalRectsRef.current[overIdx]) {
            const orig = originalRectsRef.current[overIdx];
            const listTop = listRef.current!.getBoundingClientRect().top;
            // Line goes BELOW target when dragging down, ABOVE when dragging up
            const lineY = dragIdx <= overIdx
                ? orig.bottom - listTop
                : orig.top - listTop;
            indicatorRef.current.style.top = `${lineY}px`;
            indicatorRef.current.style.opacity = "1";
        }
    };

    const resetVisuals = () => {
        getItemEls().forEach(el => {
            el.style.transform = "";
            el.style.opacity = "";
            el.style.transition = "";
        });
        if (indicatorRef.current) indicatorRef.current.style.opacity = "0";
    };

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>, index: number) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();

        const rowEl = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-drag-row]");
        if (!rowEl) return;

        // ── Snapshot original positions BEFORE any transforms ──────────────
        const items = getItemEls();
        originalRectsRef.current = items.map(el => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 };
        });

        const rect = rowEl.getBoundingClientRect();
        // height + the actual gap between rows (space-y-1 = 4px)
        itemHeightRef.current = rect.height + 4;
        offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        dragIdxRef.current = index;
        overIdxRef.current = index;

        // ── Ghost element ────────────────────────────────────────────────────
        const ghost = rowEl.cloneNode(true) as HTMLDivElement;
        Object.assign(ghost.style, {
            position: "fixed",
            pointerEvents: "none",
            zIndex: "9999",
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            opacity: "0.93",
            transform: "scale(1.02) rotate(0.5deg)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
            borderRadius: "8px",
            background: "#1c1c1f",
            border: "1px solid rgba(255,255,255,0.13)",
            willChange: "left,top",
        });
        document.body.appendChild(ghost);
        ghostRef.current = ghost;

        // ── Indicator line ───────────────────────────────────────────────────
        const indicator = document.createElement("div");
        Object.assign(indicator.style, {
            position: "absolute",
            left: "0",
            right: "0",
            height: "2px",
            background: "linear-gradient(90deg,transparent 0%,#6366f1 20%,#818cf8 80%,transparent 100%)",
            borderRadius: "2px",
            opacity: "0",
            transition: "top 80ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 60ms ease",
            zIndex: "10",
            pointerEvents: "none",
            marginTop: "-1px",
        });
        if (listRef.current) {
            listRef.current.style.position = "relative";
            listRef.current.appendChild(indicator);
        }
        indicatorRef.current = indicator;

        // Enable transitions on all rows now that drag has started
        items.forEach(el => {
            el.style.transition =
                "transform 160ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 120ms ease";
        });

        applyVisuals(index, index);

        // ── Pointer move ─────────────────────────────────────────────────────
        const onMove = (mv: PointerEvent) => {
            ghost.style.left = `${mv.clientX - offsetRef.current.x}px`;
            ghost.style.top = `${mv.clientY - offsetRef.current.y}px`;

            // Hit-test against ORIGINAL (pre-transform) midpoints — no jitter
            const origs = originalRectsRef.current;
            let newOver = 0;
            for (let i = 0; i < origs.length; i++) {
                if (mv.clientY > origs[i].mid) newOver = i;
            }
            newOver = Math.max(0, Math.min(stopsRef.current.length - 1, newOver));

            if (newOver !== overIdxRef.current) {
                overIdxRef.current = newOver;
                applyVisuals(dragIdxRef.current, newOver);
            }
        };

        // ── Pointer up ───────────────────────────────────────────────────────
        const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);

            ghost.remove();
            ghostRef.current = null;
            indicator.remove();
            indicatorRef.current = null;

            const from = dragIdxRef.current;
            const to = overIdxRef.current;

            // Snap items to final positions instantly before React re-renders
            // so there's no visual jump when state updates
            if (from !== to) {
                const items2 = getItemEls();
                items2.forEach(el => {
                    el.style.transition = "none";
                    el.style.transform = "";
                    el.style.opacity = "";
                });
            } else {
                resetVisuals();
            }

            if (from !== to) {
                const cur = stopsRef.current;
                const next = [...cur];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);

                const sortedPositions = [...cur].map(s => s.position).sort((a, b) => a - b);
                const reordered = next.map((stop, i) => ({ ...stop, position: sortedPositions[i] }));
                onReorderRef.current(reordered);
            }

            dragIdxRef.current = -1;
            overIdxRef.current = -1;
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <style>{`
                [data-drag-row] { will-change: transform; }
            `}</style>
            <div ref={listRef} className="space-y-1">
                {stops.map((stop, index) => (
                    <div key={stop.id} data-drag-row>
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] group/row" style={{ transition: "background 150ms" }}>
                            {/* Drag handle */}
                            <div
                                onPointerDown={(e) => handlePointerDown(e, index)}
                                className="cursor-grab active:cursor-grabbing p-1 text-white/25 hover:text-white/60 transition-colors touch-none select-none flex-shrink-0"
                            >
                                <Icon icon="icon-park-outline:drag" width="14" />
                            </div>

                            {/* Color swatch */}
                            <div className="group/sw w-7 h-7 rounded-md border border-white/20 shrink-0 relative overflow-hidden">
                                <div className="w-full h-full" style={{ backgroundColor: stop.color }} />
                                <input
                                    type="color"
                                    value={stop.color}
                                    onChange={(e) => onColorChange(index, e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/0 group-hover/sw:bg-black/20 transition-colors">
                                    <Icon icon="mdi:eyedropper" className="text-white opacity-0 group-hover/sw:opacity-70 transition-opacity" width="11" />
                                </div>
                            </div>

                            {/* Slider + hex */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="text-[9px] font-mono text-white/35 uppercase">{stop.color}</div>
                                <input
                                    type="range" min="0" max="100" value={stop.position}
                                    onChange={(e) => onPositionChange(index, parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/70"
                                />
                            </div>

                            <div className="text-[9px] font-mono text-white/35 w-7 text-right flex-shrink-0">{stop.position}%</div>

                            {stops.length > 2 && (
                                <button
                                    onClick={() => onRemove(index)}
                                    className="text-white/20 hover:text-red-400/80 transition-colors flex-shrink-0 p-0.5 rounded"
                                >
                                    <Icon icon="mdi:close" width="13" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────

export function BackgroundColorEditor({ value, onChange }: BackgroundColorEditorProps) {
    const [mode, setMode] = useState<"solid" | "gradient">(
        value?.type === "solid" ? "solid" : "gradient"
    );
    const [copied, setCopied] = useState(false);

    const currentSolidColor = value?.type === "solid"
        ? value.config.color
        : PRESET_SOLID_COLORS[0];

    const currentGradient: GradientConfig = useMemo(() => {
        if (value?.type === "gradient") {
            return { ...value.config, stops: ensureStopIds(value.config.stops) };
        }
        return { ...PRESET_LINEAR_GRADIENTS[0], stops: ensureStopIds(PRESET_LINEAR_GRADIENTS[0].stops) };
    }, [value]);

    const currentPresetGradients = useMemo(() => {
        switch (currentGradient.type) {
            case "radial": return PRESET_RADIAL_GRADIENTS;
            case "conic": return PRESET_CONIC_GRADIENTS;
            default: return PRESET_LINEAR_GRADIENTS;
        }
    }, [currentGradient.type]);

    useEffect(() => {
        if (!value) onChange({ type: "gradient", config: PRESET_LINEAR_GRADIENTS[0] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSolidColorSelect = (color: string) => onChange({ type: "solid", config: { color } });
    const handleSolidColorChange = (color: string) => onChange({ type: "solid", config: { color } });

    const handleCopy = () => {
        navigator.clipboard.writeText(currentSolidColor);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGradientSelect = (gradient: GradientConfig) => {
        onChange({
            type: "gradient",
            config: {
                ...gradient,
                type: currentGradient.type,
                angle: currentGradient.type === "linear" ? (gradient.angle ?? 135) :
                    currentGradient.type === "conic" ? (gradient.angle ?? 0) : undefined,
                stops: ensureStopIds(gradient.stops),
            },
        });
    };

    const handleGradientTypeChange = (type: GradientType) => {
        const newConfig = { ...currentGradient, type };
        if (type === "linear") newConfig.angle = currentGradient.angle ?? 135;
        else if (type === "conic") {
            newConfig.angle = currentGradient.angle ?? 180;
            newConfig.originX = currentGradient.originX ?? 0;
            newConfig.originY = currentGradient.originY ?? 53;
        } else {
            delete newConfig.angle;
            delete newConfig.originX;
            delete newConfig.originY;
        }
        onChange({ type: "gradient", config: newConfig });
    };

    const handleStopColorChange = (index: number, color: string) => {
        const newStops = [...currentGradient.stops];
        newStops[index] = { ...newStops[index], color };
        onChange({ type: "gradient", config: { ...currentGradient, stops: newStops } });
    };

    const handleStopPositionChange = (index: number, position: number) => {
        const newStops = [...currentGradient.stops];
        newStops[index] = { ...newStops[index], position };
        onChange({ type: "gradient", config: { ...currentGradient, stops: newStops } });
    };

    const handleAddStop = () => {
        if (currentGradient.stops.length >= 5) return;
        const newStop: ColorStop = { id: generateStopId(), color: "#ffffff", position: 50 };
        const newStops = [...currentGradient.stops, newStop].sort((a, b) => a.position - b.position);
        onChange({ type: "gradient", config: { ...currentGradient, stops: newStops } });
    };

    const handleRemoveStop = (index: number) => {
        if (currentGradient.stops.length <= 2) return;
        const newStops = currentGradient.stops.filter((_, i) => i !== index);
        onChange({ type: "gradient", config: { ...currentGradient, stops: newStops } });
    };

    const handleReorder = (newStops: ColorStop[]) => {
        onChange({ type: "gradient", config: { ...currentGradient, stops: newStops } });
    };

    return (
        <div className="space-y-6">
            {/* Mode toggle */}
            <div className="flex bg-[#09090B] squircle-element p-1 text-xs font-medium">
                <button
                    className={`flex-1 py-1.5 rounded transition ${mode === "gradient" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
                    onClick={() => { setMode("gradient"); onChange({ type: "gradient", config: currentGradient }); }}
                >
                    Gradiente
                </button>
                <button
                    className={`flex-1 py-1.5 rounded transition ${mode === "solid" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
                    onClick={() => { setMode("solid"); onChange({ type: "solid", config: { color: currentSolidColor } }); }}
                >
                    Sólido
                </button>
            </div>

            {/* ── Solid mode ── */}
            {mode === "solid" && (
                <div className="space-y-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-3">Predefinidos</div>
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_SOLID_COLORS.slice(0, 23).map((color) => (
                                <button
                                    key={color}
                                    className={`aspect-square squircle-element cursor-pointer hover:ring-2 transition border shadow-sm ${value?.type === "solid" && value.config.color === color ? "ring-2 ring-white/90 shadow-lg shadow-white" : "border-white/10 ring-white/60"}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleSolidColorSelect(color)}
                                />
                            ))}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                        title="Ver más colores"
                                    >
                                        <Icon
                                            icon="ph:plus-bold"
                                            width="16"
                                            className="text-blue-400 group-hover:text-blue-300 transition-colors"
                                        />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="right" align="start" sideOffset={12} className="w-72 p-0 border-0 shadow-2xl">
                                    <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2">
                                            <Icon icon="mdi:palette" width="14" className="text-white/50" />
                                            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">Más colores</span>
                                            <span className="ml-auto text-[10px] text-white/60">{PRESET_SOLID_COLORS.length} total</span>
                                        </div>
                                        <div className="p-3 grid grid-cols-5 gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                                            {PRESET_SOLID_COLORS.slice(23).map((color, idx) => (
                                                <button
                                                    key={`extra-${idx}-${color}`}
                                                    className={`aspect-square rounded-lg cursor-pointer hover:ring-2 transition border shadow-sm ${value?.type === "solid" && value.config.color === color ? "ring-2 ring-white/90 shadow-lg shadow-white" : "border-white/10 ring-white/60"}`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => handleSolidColorSelect(color)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="bg-[#09090B] rounded-xl border border-white/10 p-3 space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Personalizar</div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 squircle-element border border-white/20 shadow-lg shrink-0 relative overflow-hidden group">
                                <div className="w-full h-full" style={{ backgroundColor: currentSolidColor }} />
                                <input type="color" value={currentSolidColor} onChange={(e) => handleSolidColorChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                                <Icon icon="mdi:eyedropper" className="absolute inset-0 m-auto text-white/0 group-hover:text-white/60 transition-opacity pointer-events-none" width="20" />
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/10 squircle-element px-3 py-2.5 flex items-center justify-between transition-colors hover:border-white/20">
                                <span className="text-sm font-mono text-white/80 uppercase tracking-tight">{currentSolidColor}</span>
                                <button onClick={handleCopy} className={`transition-all duration-200 ${copied ? "text-green-400" : "text-white/20 hover:text-white/50"}`}>
                                    {copied ? <Icon icon="line-md:check-all" width="14" /> : <Icon icon="mdi:content-copy" width="14" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Gradient mode ── */}
            {mode === "gradient" && (
                <div className="space-y-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-3">Predefinidos</div>
                        <div className="grid grid-cols-6 gap-2">
                            {currentPresetGradients.slice(0, 23).map((gradient, i) => {
                                const gradientCss = gradientToCss(gradient);
                                const isSelected = value?.type === "gradient" && gradientCss === gradientToCss(value.config);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleGradientSelect(gradient)}
                                        style={{ background: gradientCss }}
                                        className={`aspect-square squircle-element cursor-pointer transition-all duration-200 border shadow-sm hover:scale-105 active:scale-95 ${isSelected ? "ring-2 ring-white/90 shadow-lg shadow-white" : "border-white/10 ring-white/60"}`}
                                    />
                                );
                            })}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                        title="Ver más gradientes"
                                    >
                                        <Icon
                                            icon="ph:plus-bold"
                                            width="16"
                                            className="text-blue-400 group-hover:text-blue-300 transition-colors"
                                        />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="right" align="start" sideOffset={12} className="w-72 p-0 border-0 shadow-2xl">
                                    <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2">
                                            <Icon icon="mdi:gradient-horizontal" width="14" className="text-white/50" />
                                            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">Más gradientes {currentGradient.type}</span>
                                            <span className="ml-auto text-[10px] text-white/60">{currentPresetGradients.length} total</span>
                                        </div>
                                        <div className="p-3 grid grid-cols-4 gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                                            {currentPresetGradients.slice(23).map((gradient, i) => {
                                                const gradientCss = gradientToCss(gradient);
                                                const isSelected = value?.type === "gradient" && gradientCss === gradientToCss(value.config);
                                                return (
                                                    <button
                                                        key={`extra-gradient-${i}`}
                                                        onClick={() => handleGradientSelect(gradient)}
                                                        style={{ background: gradientCss }}
                                                        className={`aspect-square rounded-lg cursor-pointer transition-all duration-200 border shadow-sm hover:scale-105 active:scale-95 ${isSelected ? "ring-2 ring-white/90 shadow-lg shadow-white" : "border-white/10 ring-white/60"}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Personalizar</div>

                        {/* Gradient type */}
                        <div className="space-y-2">
                            <div className="text-[10px] text-white/60 font-medium">Tipo</div>
                            <div className="flex gap-2">
                                {(["linear", "radial", "conic"] as GradientType[]).map((type) => (
                                    <button
                                        key={type}
                                        className={`flex-1 py-2 flex items-center justify-center gap-1.5 squircle-element text-xs font-medium transition ${currentGradient.type === type ? "bg-white/10 text-white border border-white/20" : "bg-white/10 text-white/60 hover:bg-white/10"}`}
                                        onClick={() => handleGradientTypeChange(type)}
                                    >
                                        <Icon icon={type === "linear" ? "mdi:gradient-horizontal" : type === "radial" ? "mdi:blur-radial" : "solar:pie-chart-bold"} width="16" />
                                        <span className="capitalize">{type}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Angle */}
                        {(currentGradient.type === "linear" || currentGradient.type === "conic") && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-white/60 font-medium">
                                    <div className="flex items-center gap-1.5"><Icon icon="mdi:rotate-right" width="14" /><span>Ángulo</span></div>
                                    <span className="font-mono text-white/50 px-2 py-0.5 rounded">{currentGradient.angle ?? (currentGradient.type === "conic" ? 0 : 135)}°</span>
                                </div>
                                <input type="range" min="0" max="360" value={currentGradient.angle ?? (currentGradient.type === "conic" ? 0 : 135)}
                                    onChange={(e) => onChange({ type: "gradient", config: { ...currentGradient, angle: parseInt(e.target.value) } })}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[linear-gradient(90deg,#00A3EE,#003780)]"
                                />
                            </div>
                        )}

                        {/* Conic origin */}
                        {currentGradient.type === "conic" && (
                            <div className="space-y-3">
                                {(["X", "Y"] as const).map((axis) => {
                                    const key = axis === "X" ? "originX" : "originY";
                                    const val = currentGradient[key] ?? 50;
                                    return (
                                        <div key={axis} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] text-white/60 font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <Icon icon={axis === "X" ? "mdi:arrow-left-right" : "mdi:arrow-up-down"} width="14" />
                                                    <span>Origen {axis}</span>
                                                </div>
                                                <span className="font-mono text-white/50 px-2 py-0.5 rounded">{val}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={val}
                                                onChange={(e) => onChange({ type: "gradient", config: { ...currentGradient, [key]: parseInt(e.target.value) } })}
                                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[linear-gradient(90deg,#00A3EE,#003780)]"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Color stops */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] text-white/60 font-medium">Colores ({currentGradient.stops.length})</div>
                                {currentGradient.stops.length < 5 && (
                                    <button onClick={handleAddStop} className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                                        <Icon icon="mdi:plus" width="12" />Agregar
                                    </button>
                                )}
                            </div>

                            <SortableStopList
                                stops={currentGradient.stops}
                                onReorder={handleReorder}
                                onColorChange={handleStopColorChange}
                                onPositionChange={handleStopPositionChange}
                                onRemove={handleRemoveStop}
                            />
                        </div>

                        {/* Preview */}
                        <div className="pt-2">
                            <div className="w-full h-20 squircle-element border border-white/10" style={{ background: gradientToCss(currentGradient) }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}