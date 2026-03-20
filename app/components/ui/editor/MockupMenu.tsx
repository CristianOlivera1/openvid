"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { SliderControl } from "../SliderControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MOCKUPS, MOCKUP_CATEGORIES } from "@/lib/mockup-data";
import type { MockupCategory, MockupConfig, MockupFeatures } from "@/types/mockup.types";
import { getMockupFeatures } from "@/types/mockup.types";

const FRAME_COLORS_DARK = ["#1e1e1e", "#181818", "#252526", "#0d1117", "#1a1b26", "#282a36"];
const FRAME_COLORS_LIGHT = ["#ffffff", "#f3f3f3", "#f6f8fa", "#fafafa", "#e8e8e8"];
const FRAME_COLORS = [...FRAME_COLORS_DARK, ...FRAME_COLORS_LIGHT];

interface MockupMenuProps {
    mockupId?: string;
    mockupConfig?: MockupConfig;
    onMockupChange?: (mockupId: string) => void;
    onMockupConfigChange?: (config: Partial<MockupConfig>) => void;
}

export function MockupMenu({
    mockupId = "none",
    mockupConfig,
    onMockupChange,
    onMockupConfigChange,
}: MockupMenuProps) {
    const [selectedCategory, setSelectedCategory] = useState<MockupCategory>("all");

    const filteredMockups = selectedCategory === "all"
        ? MOCKUPS
        : MOCKUPS.filter(m => m.category === selectedCategory);

    // Obtener el mockup actual y sus features
    const currentMockup = MOCKUPS.find(m => m.id === mockupId);
    const features: MockupFeatures = getMockupFeatures(currentMockup);

    const handleMockupSelect = (id: string) => {
        onMockupChange?.(id);
        
        // Reset opacity to default when changing mockup to ensure slider works immediately
        if (id !== mockupId) {
            setTimeout(() => {
                onMockupConfigChange?.({ headerOpacity: 100 });
            }, 0);
        }
    };

    const handleDarkModeChange = (isDark: boolean) => {
        // Determinar si el color actual es claro u oscuro
        const currentFrameColor = (mockupConfig?.frameColor || "#f6f6f6").toLowerCase();
        const isCurrentColorDark = FRAME_COLORS_DARK.includes(currentFrameColor);
        
        // Si el modo cambia, actualizar el frameColor a uno apropiado
        let newFrameColor = currentFrameColor;
        if (isDark && !isCurrentColorDark) {
            // Cambiar a dark mode pero el color es claro -> usar color oscuro
            newFrameColor = "#1e1e1e";
        } else if (!isDark && isCurrentColorDark) {
            // Cambiar a light mode pero el color es oscuro -> usar color claro
            newFrameColor = "#f6f6f6";
        }
        
        onMockupConfigChange?.({ darkMode: isDark, frameColor: newFrameColor });
    };

    const handleFrameColorChange = (color: string) => {
        onMockupConfigChange?.({ frameColor: color.toLowerCase() });
    };

    const handleUrlChange = (url: string) => {
        onMockupConfigChange?.({ url });
    };

    const handleHeaderScaleChange = (headerScale: number) => {
        onMockupConfigChange?.({ headerScale });
    };

    const handleHeaderOpacityChange = (headerOpacity: number) => {
        onMockupConfigChange?.({ headerOpacity });
    };

    return (
        <div className="p-4 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-white font-medium">
                <Icon icon="hugeicons:browser" width="20" />
                <span>Mockup</span>
            </div>

            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Tipo de ventana</p>
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="group relative flex items-center gap-3 p-2 squircle-element border transition-all w-full h-[140px] bg-blue-500/10 border-blue-500/40 text-blue-300"
                        >
                            <div className="flex-1 flex flex-col gap-2 h-full justify-center overflow-hidden">
                                <div className="w-full squircle-element overflow-hidden bg-neutral-900 relative h-full">
                                    {(() => {
                                        const categoryConfig = MOCKUP_CATEGORIES.find(c => c.id === currentMockup?.category);
                                        const bgUrl = categoryConfig?.bgUrl || "https://i.ibb.co/r2JQ3Gcy/minimal-02.jpg";

                                        return (
                                            <div
                                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                                                style={{ backgroundImage: `url('${bgUrl}')` }}
                                            />
                                        );
                                    })()}

                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-95">
                                        {currentMockup?.preview}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold tracking-wider">
                                        {currentMockup?.name || "None"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center px-2 border-l border-white/5 h-full group-hover:text-white transition-colors">
                                <Icon icon="uil:sort" />
                            </div>
                        </button>
                    </PopoverTrigger>

                    <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="w-[500px] p-0 border-0 shadow-2xl"
                    >
                        <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-[600px]">
                            {/* Header con categorías */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2 flex-wrap">
                                {MOCKUP_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedCategory === cat.id
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                            : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"
                                            }`}
                                    >
                                        <Icon icon={cat.icon} width="12" />
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                                <span className="ml-auto text-[10px] text-white/60">
                                    {filteredMockups.length} mockups
                                </span>
                            </div>

                            {/* Grid de mockups */}
                            <div className="p-3 grid grid-cols-3 gap-2 overflow-y-auto custom-scrollbar">
                                {filteredMockups.map((mockup) => {
                                    const categoryConfig = MOCKUP_CATEGORIES.find(c => c.id === mockup.category);
                                    const isActive = mockupId === mockup.id;

                                    return (
                                        <button
                                            key={mockup.id}
                                            onClick={() => handleMockupSelect(mockup.id)}
                                            className={`group relative w-full h-28 squircle-element border-2 overflow-hidden shadow-lg transition-all active:scale-95 ${isActive
                                                ? "border-blue-500 ring-2 ring-blue-500/50"
                                                : "border-neutral-800 hover:border-white/20"
                                                }`}
                                        >
                                            <div
                                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                                                style={{
                                                    backgroundImage: `url('${categoryConfig?.bgUrl || "https://i.ibb.co/r2JQ3Gcy/minimal-02.jpg"}')`
                                                }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    {mockup.preview}
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 group-hover:bg-black/5 transition-colors pointer-events-none" />

                                            <div className="absolute bottom-0 left-0 bg-black/60 backdrop-blur-md border-t border-r border-white/10 px-2 py-1 text-[9px] text-white/80 font-bold tracking-tighter rounded-tr-md rounded-bl-lg z-30">
                                                {mockup.name}
                                            </div>

                                            {isActive && (
                                                <div className="absolute top-2 right-2 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)] z-30">
                                                    <Icon icon="icon-park-solid:check-one" width="20" className="text-blue-500" />
                                                </div>

                                            )}
                                        </button>

                                    );
                                })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Controles condicionales basados en features del mockup */}
            {features.hasDarkMode && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-white/55">
                        <Icon icon="ph:moon-bold" width="14" />
                        <span>Modo oscuro</span>
                    </div>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.06] border border-white/[0.07]">
                        <button
                            onClick={() => handleDarkModeChange(true)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${mockupConfig?.darkMode
                                    ? "bg-[#09090B] border border-white/10 text-white/70"
                                    : "text-white/30 hover:text-white/50"
                                }`}
                        >
                            <Icon icon="ph:moon-bold" width="10" />
                            Dark
                        </button>
                        <button
                            onClick={() => handleDarkModeChange(false)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${!mockupConfig?.darkMode
                                    ? "bg-[#09090B] border border-white/10 text-white/70"
                                    : "text-white/30 hover:text-white/50"
                                }`}
                        >
                            <Icon icon="ph:sun-bold" width="10" />
                            Light
                        </button>
                    </div>
                </div>
            )}

            {/* Color del marco */}
            {features.hasFrameColor && (
                <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                        Color del marco
                    </p>

                    <div className="grid grid-cols-6 gap-2">
                        {FRAME_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleFrameColorChange(color)}
                                className={`aspect-square squircle-element cursor-pointer hover:ring-2 transition shadow-sm ring-white/60 border border-white/10 ${mockupConfig?.frameColor?.toLowerCase() === color.toLowerCase()
                                        ? "ring-2 ring-white/90 shadow-lg shadow-white"
                                        : "border-white/10 border-transparent hover:border-white/30"
                                    }`}
                                style={{ backgroundColor: color }}
                                aria-label={`Seleccionar color ${color}`}
                            />
                        ))}

                        <label className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group cursor-pointer relative">
                            <Icon icon="mingcute:color-picker-fill" width="20" className="text-white/30" />
                            <input
                                type="color"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={(e) => handleFrameColorChange(e.target.value)}
                                value={mockupConfig?.frameColor || "#ffffff"}
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* URL de página */}
            {features.hasUrl && (
                <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">URL de página</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#09090B] border border-white/[0.07] focus-within:border-blue-500/40 transition-colors">
                        <Icon icon="ph:globe-bold" width="13" className="text-white/25 shrink-0" />
                        <input
                            type="text"
                            value={mockupConfig?.url || ""}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            placeholder="https://openvid.dev"
                            className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 outline-none font-mono"
                        />
                    </div>
                </div>
            )}

            {/* Sliders */}
            {(features.hasHeaderScale || features.hasHeaderOpacity) && (
                <div className="space-y-3">
                    {features.hasHeaderScale && (
                        <SliderControl
                            label="Escala del encabezado"
                            value={mockupConfig?.headerScale ?? 70}
                            min={50}
                            max={100}
                            onChange={handleHeaderScaleChange}
                        />
                    )}
                    {features.hasHeaderOpacity && (
                        <SliderControl
                            label="Transparencia del encabezado"
                            value={mockupConfig?.headerOpacity ?? 100}
                            min={0}
                            max={100}
                            onChange={handleHeaderOpacityChange}
                        />
                    )}
                </div>
            )}

            {/* Quitar mockup - solo mostrar si no es "none" */}
            {mockupId !== "none" && (
                <button
                    onClick={() => handleMockupSelect("none")}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 text-white/40 hover:text-red-400 text-[11px] transition-all"
                >
                    <Icon icon="ph:trash-bold" width="13" />
                    Quitar mockup
                </button>
            )}
        </div>
    );
}