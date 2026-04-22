"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchPhotosWithCache, fetchDiscoveryPhotos, type UnifiedPhoto } from "@/lib/photo-providers";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { useTranslations } from "next-intl";

const SUGGESTION_BADGES = [
    { id: "blur gradient", key: "blur_gradient" },
    { id: "dark wallpaper", key: "dark_wallpaper" },
    { id: "minimal abstract", key: "minimal_abstract" },
    { id: "neon city", key: "neon_city" },
    { id: "nature landscape", key: "nature_landscape" },
    { id: "aurora borealis", key: "aurora_borealis" },
    { id: "gradient wallpaper", key: "gradient_wallpaper" }
];

interface PhotoPickerPopoverProps {
    onSelect: (imageUrl: string) => void;
}

function ProgressiveImage({ photo }: { photo: UnifiedPhoto }) {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
        <div
            className="w-full relative overflow-hidden squircle-element group"
            style={{
                aspectRatio: `${photo.width} / ${photo.height}`,
                backgroundColor: photo.color || "#1a1a1a",
            }}
        >
            <img
                src={photo.urls.small}
                alt={photo.alt}
                decoding="async"
                loading="lazy"
                crossOrigin="anonymous"
                onLoad={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${isLoaded ? "opacity-100 blur-none" : "opacity-0 blur-sm"
                    }`}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 pointer-events-none">
                <span className="text-[10px] text-white truncate font-medium drop-shadow-md">
                    {photo.photographer}
                </span>
            </div>
        </div>
    );
}

function MasonryGrid({
    photos,
    onSelect,
    loading,
    emptyText,
}: {
    photos: UnifiedPhoto[];
    onSelect: (url: string) => void;
    loading: boolean;
    emptyText: string;
}) {
    function toColumns<T>(items: T[], n: number): T[][] {
        const cols: T[][] = Array.from({ length: n }, () => []);
        items.forEach((item, i) => cols[i % n].push(item));
        return cols;
    }

    if (loading) {
        const heights = [120, 160, 140, 180, 130, 150, 170, 110, 190];
        return (
            <div className="flex gap-2 p-3 w-full">
                {toColumns(heights, 3).map((col, ci) => (
                    <div key={ci} className="flex flex-col gap-2 flex-1">
                        {col.map((h, i) => (
                            <div
                                key={i}
                                className="w-full rounded-lg bg-white/3 border border-white/5 animate-pulse"
                                style={{ height: h }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (!photos.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-3">
                <Icon icon="ph:image-broken-duotone" width="48" className="opacity-50" />
                <span className="text-xs font-medium tracking-wide">{emptyText}</span>
            </div>
        );
    }

    return (
        <div className="flex gap-2 p-3 w-full">
            {toColumns(photos, 3).map((col, ci) => (
                <div key={ci} className="flex flex-col gap-2 flex-1">
                    {col.map((photo) => (
                        <button
                            key={photo.id}
                            onClick={() => onSelect(photo.urls.regular)}
                            className="w-full relative text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 rounded-lg block"
                        >
                            <ProgressiveImage photo={photo} />
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
}

export function PhotoPickerPopover({ onSelect }: PhotoPickerPopoverProps) {
    const t = useTranslations("photoPicker");
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [photos, setPhotos] = useState<UnifiedPhoto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isSearchMode, setIsSearchMode] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevOpenRef = useRef(false);

    useEffect(() => {
        const wasOpen = prevOpenRef.current;
        prevOpenRef.current = open;
        if (!open || wasOpen) return;

        const t = setTimeout(() => {
            setInputValue("");
            setActiveQuery("");
            setIsSearchMode(false);
            setPage(1);
            setHasMore(true);
            setLoading(true);

            fetchDiscoveryPhotos().then((results) => {
                setPhotos(results);
                setLoading(false);
            });
        }, 0);

        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!activeQuery) return;

        const t = setTimeout(() => {
            setIsSearchMode(true);
            setPage(1);
            setLoading(true);

            fetchPhotosWithCache(activeQuery, 1, 20).then((results) => {
                setPhotos(results);
                setHasMore(results.length === 20);
                setLoading(false);
            });
        }, 0);

        return () => clearTimeout(t);
    }, [activeQuery]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || !hasMore || loading || !isSearchMode) return;

        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
            const nextPage = page + 1;
            setPage(nextPage);
            setLoading(true);

            fetchPhotosWithCache(activeQuery, nextPage, 20).then((results) => {
                setPhotos((prev) => {
                    const seen = new Set(prev.map((p) => p.id));
                    return [...prev, ...results.filter((p) => !seen.has(p.id))];
                });
                setHasMore(results.length === 20);
                setLoading(false);
            });
        }
    }, [hasMore, loading, isSearchMode, page, activeQuery]);

    const handleBadgeClick = (badge: string) => {
        setInputValue(badge);
        setActiveQuery(badge);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (val.trim().length >= 2) {
            debounceRef.current = setTimeout(() => setActiveQuery(val.trim()), 600);
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue.trim()) setActiveQuery(inputValue.trim());
    };

    const handleClear = () => {
        setInputValue("");
        setActiveQuery("");
        setIsSearchMode(false);
        setLoading(true);

        fetchDiscoveryPhotos().then((results) => {
            setPhotos(results);
            setLoading(false);
        });
    };

    const handleSelect = (url: string) => {
        onSelect(url);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <TooltipAction label={t("tooltip")}>
                <PopoverTrigger asChild>
                    <button className="aspect-square squircle-element bg-gray-100 border border-white/10 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 bg-[url('/svg/ppu.svg')] bg-cover bg-center flex items-center justify-center hover:opacity-80 transition group relative overflow-hidden" />
                </PopoverTrigger>
            </TooltipAction>
            <PopoverContent side="right" align="start" sideOffset={12} className="w-115 p-0 border-0 shadow-2xl">
                <div className="flex flex-col bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-150">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <Icon icon="ph:images-bold" width="13" className="text-white/50" />
                            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">
                                {t("title")}
                            </span>
                            <span className="ml-auto text-[10px] text-white/30">
                                {isSearchMode ? `"${activeQuery}"` : t("statusDiscovering")}
                            </span>
                        </div>
                    </div>
                    <div className="px-4 pt-3 pb-2 shrink-0">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/6 border border-white/10 focus-within:border-white/20 transition-colors">
                            <Icon icon="ph:magnifying-glass-bold" width="13" className="text-white/30 shrink-0" />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown}
                                placeholder={t("searchPlaceholder")}
                                className="flex-1 bg-transparent text-[12px] text-white/80 placeholder:text-white/30 outline-none"
                            />
                            {inputValue && (
                                <button onClick={handleClear} className="text-white/30 hover:text-white/60 transition-colors">
                                    <Icon icon="mdi:close" width="13" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="px-4 pb-3 shrink-0">
                        <div className="flex flex-wrap gap-1.5">
                            {SUGGESTION_BADGES.map((badge) => (
                                <button
                                    key={badge.id}
                                    onClick={() => handleBadgeClick(badge.id)}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all border ${activeQuery === badge.id
                                            ? "bg-white/15 border-white/30 text-white/90"
                                            : "bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:border-white/20"
                                        }`}
                                >
                                    {t(`badges.${badge.key}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-white/10 shrink-0" />
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="overflow-y-auto custom-scrollbar flex-1"
                        style={{ minHeight: 0 }}
                    >
                        <MasonryGrid photos={photos} onSelect={handleSelect} loading={loading && photos.length === 0} emptyText={t("noResults")} />
                        {loading && photos.length > 0 && (
                            <div className="flex justify-center py-3">
                                <Icon icon="mdi:loading" className="text-white/30 animate-spin" width="20" />
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/10 bg-white/5 shrink-0">
                        <span className="text-[10px] text-white/30">
                            {t("footerPhotosBy")}{" "}
                            <a
                                href="https://unsplash.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-white/50 transition-colors"
                            >
                                Unsplash
                            </a>
                            {", "}
                            <a
                                href="https://www.pexels.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-white/50 transition-colors"
                            >
                                Pexels
                            </a>
                            {t("footerAnd")}
                            <a
                                href="https://pixabay.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-white/50 transition-colors"
                            >
                                Pixabay
                            </a>
                        </span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}