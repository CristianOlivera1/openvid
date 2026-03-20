"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { WALLPAPER_CATEGORIES, type WallpaperCategory, type WallpaperItem } from "@/lib/wallpaper.catalog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PREVIEW_LIMIT = 11;

interface WallpaperGridProps {
    selectedIndex?: number;
    onSelect?: (index: number) => void;
}

export function OptionsGrid({ selectedIndex = -1, onSelect }: WallpaperGridProps) {
    return (
        <div className="grid grid-cols-6 gap-2">
            <button
                onClick={() => onSelect?.(-1)}
                title="Sin fondo"
                className={`aspect-square squircle-element cursor-pointer transition-all flex items-center justify-center relative overflow-hidden ${selectedIndex === -1
                        ? "ring-2 ring-white/90 shadow-lg shadow-black/40"
                        : "hover:ring-2 ring-white/60"
                    }`}
                style={{
                    backgroundImage:
                        "linear-gradient(45deg,#444 25%,transparent 25%),linear-gradient(-45deg,#444 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#444 75%),linear-gradient(-45deg,transparent 75%,#444 75%)",
                    backgroundSize: "12px 12px",
                    backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
                    backgroundColor: "#888",
                }}
            >
                <div className="absolute w-[140%] h-0.5 bg-red-400/80 rotate-45" />
            </button>

            <button
                title="Buscar en Unsplash"
                className="aspect-square squircle-element  border border-white/10 bg-white flex items-center justify-center hover:bg-white/80 transition group"
                onClick={() => { /* TODO: abrir buscador Unsplash */ }}
            >
                <Icon icon="ri:unsplash-fill" className="text-black" width="18" />
            </button>
        </div>
    );
}

function WallpaperThumb({
    item,
    isSelected,
    onSelect,
}: {
    item: WallpaperItem;
    isSelected: boolean;
    onSelect?: (index: number) => void;
}) {
    return (
        <button
            onClick={() => onSelect?.(item.index)}
            className={`aspect-square squircle-element cursor-pointer transition-all bg-cover bg-center border border-white/10  ${isSelected
                    ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50"
                    : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"
                }`}
            style={{ backgroundImage: `url('${item.previewUrl}')` }}
        />
    );
}

function CategoryPopover({
    category,
    selectedIndex,
    onSelect,
}: {
    category: WallpaperCategory;
    selectedIndex: number;
    onSelect?: (index: number) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="aspect-square rounded-lg border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                    title={`Ver más de ${category.label}`}
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
                className="w-72 p-0 border-0 shadow-2xl"
            >
                <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2">
                        <Icon icon={category.icon} width="14" className="text-white/50" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">
                            {category.label}
                        </span>
                        <span className="ml-auto text-[10px] text-white/60">
                            +{category.items.length - PREVIEW_LIMIT} más
                        </span>
                    </div>

                    <div className="p-3 grid grid-cols-4 gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {category.items.slice(PREVIEW_LIMIT).map((item) => (
                            <button
                                key={item.index}
                                onClick={() => { onSelect?.(item.index); setOpen(false); }}
                                title={item.filename}
                                className={`aspect-square rounded-lg cursor-pointer transition-all bg-cover bg-center border ${selectedIndex === item.index
                                        ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50"
                                        : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"
                                    }`}
                                style={{ backgroundImage: `url('${item.previewUrl}')` }}
                            />
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function PrimaryCategoryGrid({
    category, selectedIndex, onSelect,
}: { category: WallpaperCategory; selectedIndex: number; onSelect?: (index: number) => void; }) {
    const visible = category.items.slice(0, PREVIEW_LIMIT);
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widesttext-white/60 font-bold">
                <Icon icon={category.icon} width="12" />
                <span>{category.label}</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
                {visible.map((item) => (
                    <WallpaperThumb key={item.index} item={item} isSelected={selectedIndex === item.index} onSelect={onSelect} />
                ))}
                <CategoryPopover category={category} selectedIndex={selectedIndex} onSelect={onSelect} />
            </div>
        </div>
    );
}

function SecondaryCategoryGrid({
    category, selectedIndex, onSelect,
}: { category: WallpaperCategory; selectedIndex: number; onSelect?: (index: number) => void; }) {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col gap-2 overflow-hidden"
        >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widesttext-white/60 font-bold">
                <Icon icon={category.icon} width="12" />
                <span>{category.label}</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
                {category.items.map((item) => (
                    <WallpaperThumb key={item.index} item={item} isSelected={selectedIndex === item.index} onSelect={onSelect} />
                ))}
            </div>
        </motion.div>
    );
}

export function WallpaperCatalogGrid({ selectedIndex = -1, onSelect }: WallpaperGridProps) {
    const [showAll, setShowAll] = useState(false);
    const primary = WALLPAPER_CATEGORIES.filter((c) => c.primary);
    const secondary = WALLPAPER_CATEGORIES.filter((c) => !c.primary);

    return (
        <div className="flex flex-col gap-5">
            {primary.map((cat) => (
                <PrimaryCategoryGrid key={cat.id} category={cat} selectedIndex={selectedIndex} onSelect={onSelect} />
            ))}

            {secondary.length > 0 && (
                <motion.button
                    onClick={() => setShowAll((v) => !v)}
                    className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60 hover:text-white font-bold transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.div
                        animate={{ rotate: showAll ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <Icon icon="lucide:chevron-down" width="12" />
                    </motion.div>
                    <span>{showAll ? "Mostrar menos" : `Mostrar más`}</span>
                </motion.button>
            )}

            <AnimatePresence mode="sync">
                {showAll && secondary.map((cat) => (
                    <SecondaryCategoryGrid key={cat.id} category={cat} selectedIndex={selectedIndex} onSelect={onSelect} />
                ))}
            </AnimatePresence>
        </div>
    );
}

export { WallpaperCatalogGrid as DesktopGrid };

