"use client";

import { Icon } from "@iconify/react";
import { useState, useEffect, useRef, startTransition, useCallback } from "react";
import { SliderControl } from "../SliderControl";
import { SVG_CATEGORIES, IMAGE_CATEGORIES, PINNED_SVG_ITEMS, PINNED_IMAGE_ITEMS } from "@/lib/canvas-elements.config";
import type { SvgElement, TextElement, ImageElement, CanvasElement } from "@/types/canvas-elements.types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ElementsMenuProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement | null;
    onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void;
    onDeleteElement?: (id: string) => void;
    onBringToFront?: (id: string) => void;
    onSendToBack?: (id: string) => void;
}

const PRESET_COLORS = [
    "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF",
];

const TEXT_PRESETS: Array<{ label: string; fontSize: number; weight: "normal" | "medium" | "bold"; sample: string }> = [
    { label: "Título", fontSize: 48, weight: "bold", sample: "Título" },
    { label: "Subtítulo", fontSize: 32, weight: "medium", sample: "Subtítulo" },
    { label: "Cuerpo", fontSize: 24, weight: "normal", sample: "Texto de cuerpo" },
    { label: "Caption", fontSize: 18, weight: "normal", sample: "Caption" },
];

const FONT_FAMILIES = [
    "Inter", "Roboto", "Arial", "Georgia", "Courier New", "Comic Sans MS"
];

const FONT_WEIGHTS: Array<{ key: "normal" | "medium" | "bold"; label: string }> = [
    { key: "normal", label: "Regular" },
    { key: "medium", label: "Medium" },
    { key: "bold", label: "Bold" },
];

export function ElementsMenu({
    onAddElement,
    selectedElement,
    onUpdateElement,
    onDeleteElement,
    onBringToFront,
    onSendToBack
}: ElementsMenuProps) {
    const [mode, setMode] = useState<"text" | "elements">("elements");

    // SVG/Shape settings
    const [shapeSize, setShapeSize] = useState(15);
    const [shapeColor, setShapeColor] = useState("#FFFFFF");
    const [shapeOpacity, setShapeOpacity] = useState(100);

    // Text settings
    const [textContent, setTextContent] = useState("Texto");
    const [textFontSize, setTextFontSize] = useState(32);
    const [textColor, setTextColor] = useState("#FFFFFF");
    const [textOpacity, setTextOpacity] = useState(100);
    const [textFontFamily, setTextFontFamily] = useState("Inter");
    const [textFontWeight, setTextFontWeight] = useState<"normal" | "medium" | "bold">("normal");

    // Image settings
    const [imageOpacity, setImageOpacity] = useState(100);
    const [imageSize, setImageSize] = useState(25);

    // Popover states
    const [selectedSvgCategory, setSelectedSvgCategory] = useState<string>("all");
    const [selectedImageCategory, setSelectedImageCategory] = useState<string>("all");

    // Track if we're syncing to avoid infinite loops
    const isSyncing = useRef(false);
    const lastSelectedId = useRef<string | null>(null);

    // Sync form FROM selected element (auto-fill when clicking element)
    useEffect(() => {
        // Only sync if the selected element ID has changed
        const currentId = selectedElement?.id || null;
        if (lastSelectedId.current === currentId) return;

        lastSelectedId.current = currentId;
        isSyncing.current = true;

        // Use startTransition to batch state updates
        startTransition(() => {
            if (selectedElement) {
                if (selectedElement.type === "svg") {
                    setShapeSize(selectedElement.width);
                    setShapeColor(selectedElement.color || "#FFFFFF");
                    setShapeOpacity(Math.round(selectedElement.opacity * 100));
                    setMode("elements");
                } else if (selectedElement.type === "image") {
                    setImageSize(selectedElement.width);
                    setImageOpacity(Math.round(selectedElement.opacity * 100));
                    setMode("elements");
                } else if (selectedElement.type === "text") {
                    setTextContent(selectedElement.content);
                    setTextFontSize(selectedElement.fontSize);
                    setTextColor(selectedElement.color);
                    setTextOpacity(Math.round(selectedElement.opacity * 100));
                    setTextFontFamily(selectedElement.fontFamily);
                    setTextFontWeight(selectedElement.fontWeight);
                    setMode("text");
                }
            } else {
                // Reset to defaults when no selection
                setShapeSize(15);
                setShapeColor("#FFFFFF");
                setShapeOpacity(100);
                setImageSize(25);
                setImageOpacity(100);
                setTextContent("Texto");
                setTextFontSize(32);
                setTextColor("#FFFFFF");
                setTextOpacity(100);
                setTextFontFamily("Inter");
                setTextFontWeight("normal");
            }

            setTimeout(() => { isSyncing.current = false; }, 0);
        });
    }, [selectedElement]);

    // Sync element FROM form changes (real-time preview for SVG)
    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "svg" && onUpdateElement) {
            onUpdateElement(selectedElement.id, {
                width: shapeSize,
                height: shapeSize,
                color: shapeColor,
                opacity: shapeOpacity / 100,
            });
        }
    }, [shapeSize, shapeColor, shapeOpacity, selectedElement?.id, selectedElement?.type, onUpdateElement]);

    // Sync element FROM form changes (real-time preview for image)
    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "image" && onUpdateElement) {
            onUpdateElement(selectedElement.id, {
                width: imageSize,
                height: imageSize,
                opacity: imageOpacity / 100,
            });
        }
    }, [imageSize, imageOpacity, selectedElement?.id, selectedElement?.type, onUpdateElement]);

    // Sync element FROM form changes (real-time preview for text)
    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "text" && onUpdateElement) {
            onUpdateElement(selectedElement.id, {
                content: textContent,
                fontSize: textFontSize,
                color: textColor,
                opacity: textOpacity / 100,
                fontFamily: textFontFamily,
                fontWeight: textFontWeight,
            });
        }
    }, [textContent, textFontSize, textColor, textOpacity, textFontFamily, textFontWeight, selectedElement?.id, selectedElement?.type, onUpdateElement]);

    // Filter SVG items by category
    const filteredSvgItems = selectedSvgCategory === "all"
        ? SVG_CATEGORIES.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.id })))
        : SVG_CATEGORIES.find(cat => cat.id === selectedSvgCategory)?.items.map(item => ({ ...item, category: selectedSvgCategory })) || [];

    // Filter image items by category
    const filteredImageItems = selectedImageCategory === "all"
        ? IMAGE_CATEGORIES.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.id })))
        : IMAGE_CATEGORIES.find(cat => cat.id === selectedImageCategory)?.items.map(item => ({ ...item, category: selectedImageCategory })) || [];

    // Handler to add SVG element
    const handleAddSvg = useCallback((item: { id: string; name: string; icon: string }, categoryId?: string) => {
        const timestamp = Date.now();
        const newElement: SvgElement = {
            id: `svg-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            type: "svg",
            category: categoryId || "shapes",
            x: 50,
            y: 50,
            width: shapeSize,
            height: shapeSize,
            rotation: 0,
            opacity: shapeOpacity / 100,
            zIndex: timestamp,
            svgId: item.id,
            color: shapeColor,
        };
        onAddElement(newElement);
    }, [shapeSize, shapeOpacity, shapeColor, onAddElement]);

    const handleAddImage = useCallback((item: { id: string; name: string; imagePath: string }, categoryId?: string) => {
        const timestamp = Date.now();
        const newElement: ImageElement = {
            id: `image-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            type: "image",
            category: categoryId || "overlays",
            x: 50,
            y: 50,
            width: imageSize,
            height: imageSize,
            rotation: 0,
            opacity: imageOpacity / 100,
            zIndex: timestamp,
            imagePath: item.imagePath,
        };
        onAddElement(newElement);
    }, [imageSize, imageOpacity, onAddElement]);

    return (
        <div className="p-4 flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center gap-2 text-white font-medium">
                <Icon icon="iconoir:shapes" width="18" />
                <span className="text-sm">Elementos</span>
            </div>

            {/* Toggle: Elementos / Texto */}
            <div className="grid grid-cols-2 bg-[#09090B] squircle-element p-1 text-xs font-medium border border-white/5">
                <button
                    className={`flex justify-center items-center gap-1.5 py-1.5 rounded transition ${mode === "elements" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                    onClick={() => setMode("elements")}
                >
                    <Icon icon="iconoir:hexagon" width="14" />
                    Elementos
                </button>
                <button
                    className={`flex justify-center items-center gap-1.5 py-1.5 rounded transition ${mode === "text" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                    onClick={() => setMode("text")}
                >
                    <Icon icon="iconoir:text-size" width="14" />
                    Texto
                </button>
            </div>

            {/* ── ELEMENTOS (FIGURAS + IMÁGENES) ── */}
            {mode === "elements" && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-150">

                    {/* Figuras destacadas (11 + botón "+") */}
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                            Figuras
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                            {/* 11 elementos destacados */}
                            {PINNED_SVG_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    title={item.name}
                                    onClick={() => handleAddSvg(item)}
                                    className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 group"
                                >
                                    <Icon
                                        icon={item.icon}
                                        width="18"
                                        className="text-white/50 group-hover:text-white transition-colors"
                                    />
                                </button>
                            ))}

                            {/* Botón "+" para abrir popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                        title="Ver todas las figuras"
                                    >
                                        <Icon
                                            icon="ph:plus-bold"
                                            width="16"
                                            className="text-blue-400 group-hover:text-blue-300 transition-colors"
                                        />
                                    </button>
                                </PopoverTrigger>

                                <PopoverContent
                                    side="right"
                                    align="start"
                                    sideOffset={12}
                                    className="w-100 p-0 border-0 shadow-2xl"
                                >
                                    <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-125">
                                        {/* Header con categorías */}
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2 flex-wrap">
                                            <button
                                                onClick={() => setSelectedSvgCategory("all")}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedSvgCategory === "all"
                                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                                    : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"
                                                    }`}
                                            >
                                                <Icon icon="ph:grid-four-bold" width="12" />
                                                <span>Todos</span>
                                            </button>
                                            {SVG_CATEGORIES.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedSvgCategory(cat.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedSvgCategory === cat.id
                                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                                        : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"
                                                        }`}
                                                >
                                                    <span>{cat.title}</span>
                                                </button>
                                            ))}
                                            <span className="ml-auto text-[10px] text-white/60">
                                                {filteredSvgItems.length} figuras
                                            </span>
                                        </div>

                                        {/* Grid de figuras */}
                                        <div className="p-3 grid grid-cols-6 gap-2 overflow-y-auto custom-scrollbar">
                                            {filteredSvgItems.map((item) => (
                                                <button
                                                    key={`${item.category}-${item.id}`}
                                                    title={item.name}
                                                    onClick={() => handleAddSvg(item, item.category)}
                                                    className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 group"
                                                >
                                                    <Icon
                                                        icon={item.icon}
                                                        width="18"
                                                        className="text-white/50 group-hover:text-white transition-colors"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Imágenes destacadas (11 + botón "+") */}
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                            Imágenes
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {/* Elementos de imagen destacados */}
                            {PINNED_IMAGE_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    title={item.name}
                                    onClick={() => handleAddImage(item)}
                                    className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 overflow-hidden group"
                                >
                                    <img
                                        src={item.imagePath}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                </button>
                            ))}

                            {/* Relleno vacío para mantener grid de 6 columnas */}
                            {Array.from({ length: Math.max(0, 11 - PINNED_IMAGE_ITEMS.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}

                            {/* Botón "+" para abrir popover de imágenes */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                        title="Ver todas las imágenes"
                                    >
                                        <Icon
                                            icon="ph:plus-bold"
                                            width="16"
                                            className="text-blue-400 group-hover:text-blue-300 transition-colors"
                                        />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="right"
                                    align="start"
                                    sideOffset={12}
                                    className="w-100 p-0 border-0 shadow-2xl"
                                >
                                    <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-125">
                                        {/* Header con categorías */}
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2 flex-wrap">
                                            <button
                                                onClick={() => setSelectedImageCategory("all")}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedImageCategory === "all"
                                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                                    : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"
                                                    }`}
                                            >
                                                <Icon icon="ph:grid-four-bold" width="12" />
                                                <span>Todos</span>
                                            </button>
                                            {IMAGE_CATEGORIES.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedImageCategory(cat.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedImageCategory === cat.id
                                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                                        : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"
                                                        }`}
                                                >
                                                    <span>{cat.title}</span>
                                                </button>
                                            ))}
                                            <span className="ml-auto text-[10px] text-white/60">
                                                {filteredImageItems.length} imágenes
                                            </span>
                                        </div>

                                        {/* Grid de imágenes */}
                                        <div className="p-3 grid grid-cols-4 gap-2 overflow-y-auto custom-scrollbar">
                                            {filteredImageItems.length === 0 ? (
                                                <div className="col-span-4 text-xs text-white/30 italic py-8 text-center">
                                                    No hay imágenes disponibles
                                                </div>
                                            ) : (
                                                filteredImageItems.map((item) => (
                                                    <button
                                                        key={`${item.category}-${item.id}`}
                                                        title={item.name}
                                                        onClick={() => handleAddImage(item, item.category)}
                                                        className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 overflow-hidden group"
                                                    >
                                                        <img
                                                            src={item.imagePath}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                        />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Controles para elementos seleccionados */}
                    {selectedElement && (selectedElement.type === "svg" || selectedElement.type === "image") && (
                        <>
                            {/* Color Picker (solo para SVG) */}
                            {selectedElement.type === "svg" && (
                                <div className="space-y-2">
                                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Color</div>
                                    <div className="flex gap-2">
                                        <div className="grid grid-cols-5 gap-2 flex-1">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setShapeColor(color)}
                                                    className={`aspect-square squircle-element cursor-pointer transition-all border border-white/20 ${shapeColor === color ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50" : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                        <label className="relative cursor-pointer">
                                            <input
                                                type="color"
                                                value={shapeColor}
                                                onChange={(e) => setShapeColor(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <div
                                                className="w-10 h-10 aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                                style={{ backgroundColor: shapeColor }}
                                            >
                                                <Icon icon="mdi:eyedropper" width="18" className="text-white mix-blend-difference" />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <SliderControl
                                    icon="mdi:resize"
                                    label="Tamaño"
                                    value={selectedElement.type === "svg" ? shapeSize : imageSize}
                                    onChange={selectedElement.type === "svg" ? setShapeSize : setImageSize}
                                    min={5}
                                    max={60}
                                />
                                <SliderControl
                                    icon="mdi:opacity"
                                    label="Opacidad"
                                    value={selectedElement.type === "svg" ? shapeOpacity : imageOpacity}
                                    onChange={selectedElement.type === "svg" ? setShapeOpacity : setImageOpacity}
                                />
                            </div>

                            {/* Controles de jerarquía */}
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Jerarquía</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onBringToFront?.(selectedElement.id)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-all"
                                    >
                                        <Icon icon="ph:bring-to-front-bold" width="16" />
                                        Traer al frente
                                    </button>
                                    <button
                                        onClick={() => onSendToBack?.(selectedElement.id)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-all"
                                    >
                                        <Icon icon="ph:send-to-back-bold" width="16" />
                                        Enviar atrás
                                    </button>
                                </div>
                            </div>

                            {/* Acciones del elemento */}
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Acciones</div>
                                <button
                                    onClick={() => onDeleteElement?.(selectedElement.id)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all"
                                >
                                    <Icon icon="ph:trash-bold" width="16" />
                                    Eliminar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── TEXTO ── */}
            {mode === "text" && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                    {/* Texto content */}
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Contenido</div>
                        <input
                            type="text"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            className="w-full bg-white/4 hover:bg-white/[0.07] transition border border-white/8 squircle-element px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
                            placeholder="Escribe tu texto..."
                        />
                    </div>

                    {/* Presets para texto */}
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Presets</div>
                        <div className="grid grid-cols-2 gap-2">
                            {TEXT_PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    onClick={() => {
                                        setTextFontSize(p.fontSize);
                                        setTextFontWeight(p.weight);
                                    }}
                                    className="bg-white/3 hover:bg-white/[0.07] border border-white/[0.07] squircle-element px-3 py-2.5 text-left transition-all active:scale-[.98]"
                                >
                                    <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider mb-1.5">
                                        {p.label}
                                    </div>
                                    <div className={`text-white leading-none truncate`} style={{ fontSize: `${p.fontSize / 3}px`, fontWeight: p.weight }}>
                                        {p.sample}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tamaño */}
                    <div className="flex flex-row justify-between gap-2 space-y-2">
                        <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Tamaño</div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={textFontSize || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                            setTextFontSize(0);
                                            return;
                                        }
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num)) {
                                            setTextFontSize(Math.min(200, num));
                                        }
                                    }}
                                    onBlur={() => {
                                        setTextFontSize((prev) => Math.max(8, Math.min(200, prev || 32)));
                                    }}
                                    className="flex-1 bg-white/4 hover:bg-white/[0.07] transition border border-white/8 squircle-element px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                                    min={8}
                                    max={200}
                                />
                                <span className="text-xs text-white/50 w-6">px</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Fuente</div>
                            <Select value={textFontFamily} onValueChange={setTextFontFamily}>
                                <SelectTrigger
                                    className="w-full bg-white/4 hover:bg-white/[0.07] transition border-white/8 squircle-element text-white/80"
                                    style={{ fontFamily: textFontFamily }}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1e] border-white/10">
                                    {FONT_FAMILIES.map((f) => (
                                        <SelectItem
                                            key={f}
                                            value={f}
                                            className="text-white/80 hover:bg-white/10 cursor-pointer"
                                            style={{ fontFamily: f }}
                                        >
                                            {f}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Color</div>
                        <div className="flex gap-2">
                            <div className="grid grid-cols-5 gap-2 flex-1">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setTextColor(color)}
                                        className={`aspect-square squircle-element cursor-pointer transition-all border border-white/20 ${textColor === color ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50" : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"
                                            }`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <label className="relative cursor-pointer">
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div
                                    className="w-10 h-10 aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                    style={{ backgroundColor: textColor }}
                                >
                                    <Icon icon="mdi:eyedropper" width="18" className="text-white mix-blend-difference" />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Peso */}
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Peso</div>
                        <div className="grid grid-cols-3 gap-2">
                            {FONT_WEIGHTS.map((w) => (
                                <button
                                    key={w.key}
                                    onClick={() => setTextFontWeight(w.key)}
                                    className={`px-3 py-2 rounded-lg text-xs transition-all squircle-element ${textFontWeight === w.key ? "bg-white/10 text-white border border-white/15" : "bg-white/3 text-white/35 hover:text-white/70 border border-white/6"
                                        }`}
                                >
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Opacidad */}
                    <div className="space-y-3">
                        <SliderControl icon="mdi:opacity" label="Opacidad" value={textOpacity} onChange={setTextOpacity} />
                    </div>

                    {/* Botón para agregar texto */}
                    <Button
                        onClick={() => {
                            const timestamp = Date.now();
                            const newElement: TextElement = {
                                id: `text-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
                                type: "text",
                                x: 50,
                                y: 50,
                                width: 0, // Auto-width for text
                                height: 0, // Auto-height for text
                                rotation: 0,
                                opacity: textOpacity / 100,
                                zIndex: timestamp,
                                content: textContent,
                                fontSize: textFontSize,
                                color: textColor,
                                fontFamily: textFontFamily,
                                fontWeight: textFontWeight,
                            };
                            onAddElement(newElement);
                        }}
                        variant="outline"
                        className="w-full text-xs"
                    >
                        <Icon icon="ph:plus-bold" width="16" />
                        Agregar texto
                    </Button>

                    {/* Controles para texto seleccionado */}
                    {selectedElement && selectedElement.type === "text" && (
                        <>
                            {/* Controles de jerarquía */}
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Jerarquía</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="text-xs"
                                        onClick={() => onBringToFront?.(selectedElement.id)}

                                    >
                                        <Icon icon="ph:bring-to-front-bold" width="16" />
                                        Traer al frente
                                    </Button>
                                    <Button variant="outline" className="text-xs"
                                        onClick={() => onSendToBack?.(selectedElement.id)}

                                    >
                                        <Icon icon="ph:send-to-back-bold" width="16" />
                                        Enviar atrás
                                    </Button>
                                </div>
                            </div>

                            {/* Acciones del elemento */}
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Acciones</div>
                                <button
                                    onClick={() => onDeleteElement?.(selectedElement.id)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all"
                                >
                                    <Icon icon="ph:trash-bold" width="16" />
                                    Eliminar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
