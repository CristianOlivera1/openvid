"use client";

import { Icon } from "@iconify/react";
import { useState, useEffect, useRef, startTransition, useCallback, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import { SliderControl } from "../../../../components/ui/SliderControl";
import { SVG_CATEGORIES, IMAGE_CATEGORIES, PINNED_SVG_ITEMS, PINNED_IMAGE_ITEMS, getImagePreviewPath } from "@/lib/canvas-elements.config";
import { SvgElement, TextElement, TextAnimation, TextCase, ImageElement, ElementsMenuProps, FONT_FAMILIES, ACCEPTED_FORMATS, MAX_FILE_SIZE } from "@/types/canvas-elements.types";
import { applyTextCase, getTextAnimationStyle } from "@/lib/text-animation.utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SVG_COMPONENTS } from "@/components/canvas-svg";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { ProgressiveImg } from "@/components/ui/ProgressiveImg";
import { ElementsIcon } from "@/components/ui/ElementsIcon";

interface ExtendedElementsMenuProps extends ElementsMenuProps {
    textTabTrigger?: number;
}

const DEFAULT_SHAPE_SIZE = 20;
const DEFAULT_IMAGE_SIZE = 30;

export function ElementsMenu({
    onAddElement,
    selectedElement,
    onUpdateElement,
    onDeleteElement,
    textTabTrigger = 0,
}: ExtendedElementsMenuProps) {
    const t = useTranslations("elementsMenu");

    const [mode, setMode] = useState<"text" | "elements">("elements");
    const [shapeColor, setShapeColor] = useState("#FFFFFF");
    const [shapeOpacity, setShapeOpacity] = useState(100);
    const [textContent, setTextContent] = useState("Texto");
    const [textCase, setTextCase] = useState<TextCase>("none");
    const [textFontSize, setTextFontSize] = useState(48);
    const [textColor, setTextColor] = useState("#FFFFFF");
    const [textColorEnd, setTextColorEnd] = useState("#60A5FA");
    const [textUseGradient, setTextUseGradient] = useState(false);
    const [textStrokeWidth, setTextStrokeWidth] = useState(0);
    const [textStrokeEnabled, setTextStrokeEnabled] = useState(false);
    const [textStrokeColor, setTextStrokeColor] = useState("#000000");
    const [textStrokeColorEnd, setTextStrokeColorEnd] = useState("#7C3AED");
    const [textStrokeGradient, setTextStrokeGradient] = useState(false);
    const [textOpacity, setTextOpacity] = useState(100);
    const [textFontFamily, setTextFontFamily] = useState("Inter");
    const [textFontWeight, setTextFontWeight] = useState<"normal" | "medium" | "bold">("bold");
    const fontWeightValue = textFontWeight === "normal" ? 400 : textFontWeight === "medium" ? 500 : 700;
    const [textAnimationIn, setTextAnimationIn] = useState<TextAnimation>("none");
    const [textAnimationOut, setTextAnimationOut] = useState<TextAnimation>("none");
    const [textAnimationInDuration, setTextAnimationInDuration] = useState(0.6);
    const [textAnimationOutDuration, setTextAnimationOutDuration] = useState(0.6);
    const [animationPreviewProgress, setAnimationPreviewProgress] = useState(0.35);
    const [imageOpacity, setImageOpacity] = useState(100);
    const [selectedSvgCategory, setSelectedSvgCategory] = useState<string>("all");
    const [selectedImageCategory, setSelectedImageCategory] = useState<string>("all");
    const onUpdateElementRef = useRef(onUpdateElement);
    useLayoutEffect(() => {
        onUpdateElementRef.current = onUpdateElement;
    });

    const [isUploading, setIsUploading] = useState(false);
    const isSyncing = useRef(false);
    const lastSelectedId = useRef<string | null>(null);

    useEffect(() => {
        if (textTabTrigger > 0) {
            startTransition(() => {
                setMode("text");
            });
        }
    }, [textTabTrigger]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setAnimationPreviewProgress((progress) => progress >= 1 ? 0 : progress + 0.035);
        }, 45);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const currentId = selectedElement?.id || null;
        if (lastSelectedId.current === currentId) return;
        lastSelectedId.current = currentId;
        isSyncing.current = true;
        startTransition(() => {
            if (selectedElement) {
                if (selectedElement.type === "svg") {
                    setShapeColor(selectedElement.color || "#FFFFFF");
                    setShapeOpacity(Math.round(selectedElement.opacity * 100));
                    setMode("elements");
                } else if (selectedElement.type === "image") {
                    setImageOpacity(Math.round(selectedElement.opacity * 100));
                    setMode("elements");
                } else if (selectedElement.type === "text") {
                    setTextContent(selectedElement.content);
                    setTextCase(selectedElement.textCase ?? "none");
                    setTextFontSize(selectedElement.fontSize);
                    setTextColor(selectedElement.color);
                    setTextColorEnd(selectedElement.colorEnd ?? "#60A5FA");
                    setTextUseGradient(selectedElement.useGradient ?? false);
                    setTextStrokeWidth(selectedElement.strokeWidth ?? 0);
                    setTextStrokeEnabled(selectedElement.strokeEnabled ?? (selectedElement.strokeWidth ?? 0) > 0);
                    setTextStrokeColor(selectedElement.strokeColor ?? "#000000");
                    setTextStrokeColorEnd(selectedElement.strokeColorEnd ?? "#7C3AED");
                    setTextStrokeGradient(selectedElement.strokeGradient ?? false);
                    setTextOpacity(Math.round(selectedElement.opacity * 100));
                    setTextFontFamily(selectedElement.fontFamily);
                    setTextFontWeight(selectedElement.fontWeight);
                    setTextAnimationIn(selectedElement.animationIn ?? "none");
                    setTextAnimationOut(selectedElement.animationOut ?? "none");
                    setTextAnimationInDuration(selectedElement.animationInDuration ?? 0.6);
                    setTextAnimationOutDuration(selectedElement.animationOutDuration ?? 0.6);
                    setMode("text");
                }
            } else {
                setShapeColor("#FFFFFF"); setShapeOpacity(100);
                setImageOpacity(100);
                setTextContent("Texto"); setTextFontSize(48); setTextColor("#FFFFFF");
                setTextCase("none");
                setTextColorEnd("#60A5FA"); setTextUseGradient(false); setTextStrokeWidth(0);
                setTextStrokeEnabled(false);
                setTextStrokeColor("#000000"); setTextStrokeColorEnd("#7C3AED"); setTextStrokeGradient(false);
                setTextOpacity(100); setTextFontFamily("Inter"); setTextFontWeight("bold");
                setTextAnimationIn("none"); setTextAnimationOut("none");
                setTextAnimationInDuration(0.6); setTextAnimationOutDuration(0.6);
            }
            setTimeout(() => { isSyncing.current = false; }, 0);
        });
    }, [selectedElement]);

    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "svg") {
            onUpdateElementRef.current?.(selectedElement.id, {
                color: shapeColor, opacity: shapeOpacity / 100
            });
        }
    }, [shapeColor, shapeOpacity, selectedElement?.id, selectedElement?.type]);

    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "image") {
            onUpdateElementRef.current?.(selectedElement.id, {
                opacity: imageOpacity / 100
            });
        }
    }, [imageOpacity, selectedElement?.id, selectedElement?.type]);

    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "text") {
            onUpdateElementRef.current?.(selectedElement.id, {
                content: textContent, textCase, fontSize: textFontSize, color: textColor, colorEnd: textColorEnd,
                useGradient: textUseGradient, strokeEnabled: textStrokeEnabled, strokeWidth: textStrokeWidth, strokeColor: textStrokeColor,
                strokeColorEnd: textStrokeColorEnd, strokeGradient: textStrokeGradient,
                opacity: textOpacity / 100, fontFamily: textFontFamily, fontWeight: textFontWeight
                , animationIn: textAnimationIn, animationOut: textAnimationOut,
                animationInDuration: textAnimationInDuration, animationOutDuration: textAnimationOutDuration
            });
        }
    }, [textContent, textCase, textFontSize, textColor, textColorEnd, textUseGradient, textStrokeEnabled, textStrokeWidth, textStrokeColor, textStrokeColorEnd, textStrokeGradient, textOpacity, textFontFamily,
        textFontWeight, textAnimationIn, textAnimationOut, textAnimationInDuration,
        textAnimationOutDuration, selectedElement?.id, selectedElement?.type]);

    const handleImageUpload = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!ACCEPTED_FORMATS.includes(file.type)) continue;
            if (file.size > MAX_FILE_SIZE) continue;
            try {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                let width = DEFAULT_IMAGE_SIZE;
                let height = DEFAULT_IMAGE_SIZE;
                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        if (img.naturalWidth && img.naturalHeight) {
                            const ar = img.naturalWidth / img.naturalHeight;
                            if (ar >= 1) { height = DEFAULT_IMAGE_SIZE / ar; } else { width = DEFAULT_IMAGE_SIZE * ar; }
                        }
                        resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = dataUrl;
                });

                const timestamp = Date.now() + i;
                const newElement: ImageElement = {
                    id: `image-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
                    type: "image",
                    category: "uploads",
                    x: 50,
                    y: 50,
                    width,
                    height,
                    rotation: 0,
                    opacity: imageOpacity / 100,
                    zIndex: timestamp,
                    imagePath: dataUrl,
                };
                onAddElement(newElement);
            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error);
            }
        }
        setIsUploading(false);
    }, [imageOpacity, onAddElement]);

    const filteredSvgItems = selectedSvgCategory === "all"
        ? SVG_CATEGORIES.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.id })))
        : SVG_CATEGORIES.find(cat => cat.id === selectedSvgCategory)?.items.map(item => ({ ...item, category: selectedSvgCategory })) || [];

    const filteredImageItems = selectedImageCategory === "all"
        ? IMAGE_CATEGORIES.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.id })))
        : IMAGE_CATEGORIES.find(cat => cat.id === selectedImageCategory)?.items.map(item => ({ ...item, category: selectedImageCategory })) || [];

    const handleAddSvg = useCallback((item: { id: string; name: string; icon?: string }, categoryId?: string) => {
        const timestamp = Date.now();
        const newElement: SvgElement = {
            id: `svg-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            type: "svg", category: categoryId || "shapes", x: 50, y: 50,
            width: DEFAULT_SHAPE_SIZE, height: DEFAULT_SHAPE_SIZE, rotation: 0,
            opacity: shapeOpacity / 100, zIndex: timestamp, svgId: item.id, color: shapeColor,
        };
        onAddElement(newElement);
    }, [shapeOpacity, shapeColor, onAddElement]);

    const handleAddImage = useCallback(async (item: { id: string; name: string; imagePath: string }, categoryId?: string) => {
        const timestamp = Date.now();
        let width = DEFAULT_IMAGE_SIZE;
        let height = DEFAULT_IMAGE_SIZE;
        await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (img.naturalWidth && img.naturalHeight) {
                    const ar = img.naturalWidth / img.naturalHeight;
                    if (ar >= 1) { height = DEFAULT_IMAGE_SIZE / ar; }
                    else { width = DEFAULT_IMAGE_SIZE * ar; }
                }
                resolve();
            };
            img.onerror = () => resolve();
            img.src = item.imagePath;
        });
        const newElement: ImageElement = {
            id: `image-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            type: "image", category: categoryId || "overlays", x: 50, y: 50,
            width, height, rotation: 0,
            opacity: imageOpacity / 100, zIndex: timestamp, imagePath: item.imagePath,
        };
        onAddElement(newElement);
    }, [imageOpacity, onAddElement]);

    return (
        <div className="p-4 flex flex-col gap-5">

            <div className="flex items-center gap-2 text-foreground font-medium">
                <ElementsIcon
                    width={20}
                    height={20}
                    className="transition-colors duration-200"
                    aria-hidden="true"
                />
                <span>{t("title")}</span>
            </div>

            <div className="grid grid-cols-2 bg-muted squircle-element p-1 text-xs font-medium border border-border" role="tablist" aria-label={t("title")}>
                <button className={`flex justify-center items-center gap-1.5 py-1.5 squircle-element transition ${mode === "elements" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground/80"}`} onClick={() => setMode("elements")} role="tab" aria-selected={mode === "elements"} aria-controls="elements-panel">
                    <Icon icon="iconoir:hexagon" width="14" aria-hidden="true" />
                    {t("tabs.elements")}
                </button>
                <button className={`flex justify-center items-center gap-1.5 py-1.5 squircle-element transition ${mode === "text" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground/80"}`} onClick={() => setMode("text")} role="tab" aria-selected={mode === "text"} aria-controls="text-panel">
                    <Icon icon="iconoir:text-size" width="14" aria-hidden="true" />
                    {t("tabs.text")}
                </button>
            </div>

            {mode === "elements" && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-150" role="tabpanel" id="elements-panel">

                    <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{t("sections.shapes")}</div>
                        <div className="grid grid-cols-6 gap-2">
                            {PINNED_SVG_ITEMS.map((item) => (
                                <TooltipAction label={item.name} key={item.id}>
                                    <button onClick={() => handleAddSvg(item)} className="aspect-square bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/50 squircle-element flex items-center justify-center transition-all active:scale-90 group" aria-label={`Add ${item.name}`}>
                                        {item.icon ? (
                                            <Icon icon={item.icon} width="18" className="text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                                        ) : (() => {
                                            const SvgComponent = SVG_COMPONENTS[item.id];
                                            return SvgComponent
                                                ? <SvgComponent color="currentColor" className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                : <span className="text-[9px] text-muted-foreground/60">{item.name}</span>;
                                        })()}
                                    </button>
                                </TooltipAction>
                            ))}

                            <Popover>
                                <TooltipAction label={t("tooltips.allShapes")}>
                                    <PopoverTrigger asChild>
                                        <button className="aspect-square squircle-element border border-dashed border-border bg-muted flex items-center justify-center hover:bg-muted transition group">
                                            <Icon icon="ph:plus-bold" width="16" className="text-blue-600 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                                        </button>
                                    </PopoverTrigger>
                                </TooltipAction>
                                <PopoverContent side="right" align="start" sideOffset={12} className="w-120 p-0 border-0 shadow-2xl">
                                    <div className="flex flex-col bg-popover dark:bg-black border border-border squircle-element-camera overflow-hidden shadow-2xl max-h-125">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40 flex-wrap">
                                            <button onClick={() => setSelectedSvgCategory("all")} className={`flex items-center gap-1.5 px-3 py-1.5 squircle-element text-[11px] font-medium uppercase tracking-wider transition-all ${selectedSvgCategory === "all" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40" : "bg-muted text-muted-foreground hover:text-muted-foreground border border-transparent hover:border-border"}`}>
                                                <Icon icon="ph:grid-four-bold" width="12" />
                                                <span>{t("filters.all")}</span>
                                            </button>
                                            {SVG_CATEGORIES.map((cat) => (
                                                <button key={cat.id} onClick={() => setSelectedSvgCategory(cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 squircle-element text-[11px] font-medium uppercase tracking-wider transition-all ${selectedSvgCategory === cat.id ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40" : "bg-muted text-muted-foreground hover:text-muted-foreground border border-transparent hover:border-border"}`}>
                                                    <span>{cat.title}</span>
                                                </button>
                                            ))}
                                            <span className="ml-auto text-[11px] text-muted-foreground">{t("counts.shapes", { count: filteredSvgItems.length })}</span>
                                        </div>
                                        <div className="p-3 grid grid-cols-6 gap-2 overflow-y-auto custom-scrollbar">
                                            {filteredSvgItems.map((item) => (
                                                <TooltipAction label={item.name} key={`${item.category}-${item.id}`}>
                                                    <button onClick={() => handleAddSvg(item, item.category)} className="aspect-square bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/50 squircle-element flex items-center justify-center transition-all active:scale-90 group">
                                                        {item.icon ? (
                                                            <Icon icon={item.icon} width="18" className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                                        ) : (() => {
                                                            const SvgComponent = SVG_COMPONENTS[item.id];
                                                            return SvgComponent
                                                                ? <SvgComponent color="currentColor" className="w-4 h-4 text-muted-foreground scale-200 group-hover:text-foreground transition-colors" />
                                                                : <span className="text-[9px] text-muted-foreground/60">{item.name}</span>;
                                                        })()}
                                                    </button>
                                                </TooltipAction>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{t("sections.images")}</div>
                        <div className="grid grid-cols-6 gap-1.5">
                            <UploadImageButton onUpload={handleImageUpload} isUploading={isUploading} />
                            {PINNED_IMAGE_ITEMS.map((item) => (
                                <button key={item.id} onClick={() => handleAddImage(item)} className="aspect-square bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/50 squircle-element flex items-center justify-center transition-all active:scale-90 overflow-hidden group">
                                    <ProgressiveImg src={getImagePreviewPath(item)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110" />
                                </button>
                            ))}
                            {Array.from({ length: Math.max(0, 10 - PINNED_IMAGE_ITEMS.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            <Popover>
                                <TooltipAction label={t("tooltips.allImages")}>
                                    <PopoverTrigger asChild>
                                        <button className="aspect-square squircle-element border border-dashed border-border bg-muted flex items-center justify-center hover:bg-muted transition group">
                                            <Icon icon="ph:plus-bold" width="16" className="text-blue-600 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                                        </button>
                                    </PopoverTrigger>
                                </TooltipAction>
                                <PopoverContent side="right" align="start" sideOffset={12} className="w-130 p-0 border-0 shadow-2xl">
                                    <div className="flex flex-col bg-popover dark:bg-black border border-border squircle-element-camera overflow-hidden shadow-2xl max-h-125">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40 flex-wrap">
                                            <button onClick={() => setSelectedImageCategory("all")} className={`flex items-center gap-1.5 px-3 py-1.5 squircle-element text-[11px] font-medium uppercase tracking-wider transition-all ${selectedImageCategory === "all" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40" : "bg-muted text-muted-foreground hover:text-muted-foreground border border-transparent hover:border-border"}`}>
                                                <Icon icon="ph:grid-four-bold" width="12" />
                                                <span>{t("filters.all")}</span>
                                            </button>
                                            {IMAGE_CATEGORIES.map((cat) => (
                                                <button key={cat.id} onClick={() => setSelectedImageCategory(cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 squircle-element text-[11px] font-medium uppercase tracking-wider transition-all ${selectedImageCategory === cat.id ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40" : "bg-muted text-muted-foreground hover:text-muted-foreground border border-transparent hover:border-border"}`}>
                                                    <span>{cat.title}</span>
                                                </button>
                                            ))}
                                            <span className="ml-auto text-[11px] text-muted-foreground">{t("counts.images", { count: filteredImageItems.length })}</span>
                                        </div>
                                        <div className="p-3 grid grid-cols-8 gap-2 overflow-y-auto custom-scrollbar">
                                            {filteredImageItems.map((item) => (
                                                <div key={`${item.category}-${item.id}`} className="w-full" style={{ paddingBottom: "100%", position: "relative" }}>
                                                    <button
                                                        onClick={() => handleAddImage(item, item.category)}
                                                        className="absolute inset-0 bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/50 squircle-element transition-all active:scale-90 overflow-hidden group"
                                                    >
                                                        <ProgressiveImg
                                                            src={getImagePreviewPath(item)}
                                                            alt={item.name}
                                                            className="w-full h-full object-contain group-hover:scale-110"
                                                        />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {selectedElement && (selectedElement.type === "svg" || selectedElement.type === "image") && (
                        <>
                            {selectedElement.type === "svg" && (
                                <div className="space-y-2">
                                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{t("properties.color")}</div>
                                    <div className="flex gap-2">
                                        <label className="relative cursor-pointer">
                                            <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className="w-10 h-10 aspect-square squircle-element border border-dashed border-border bg-muted flex items-center justify-center hover:bg-muted transition group" style={{ backgroundColor: shapeColor }}>
                                                <Icon icon="mdi:eyedropper" width="18" className="text-white mix-blend-difference" />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <SliderControl icon="mdi:opacity" label={t("properties.opacity")} value={selectedElement.type === "svg" ? shapeOpacity : imageOpacity} onChange={selectedElement.type === "svg" ? setShapeOpacity : setImageOpacity} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {mode === "text" && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{t("text.content")}</div>
                        <input type="text" value={textContent} onChange={(e) => setTextContent(e.target.value)} className="w-full bg-muted/60 hover:bg-muted/50 transition border border-border squircle-element px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border" placeholder={t("text.placeholder")} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5 min-w-0 rounded-md border border-border bg-muted/20 p-2">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground font-semibold"><span className="flex items-center gap-1.5"><Icon icon="solar:maximize-square-3-linear" width="14" />{t("text.size")}</span><span className="normal-case tracking-normal text-foreground">{textFontSize || 32}px</span></div>
                            <input type="range" value={textFontSize || 32} onChange={(e) => setTextFontSize(Number(e.target.value))} className="h-3 w-full accent-blue-500" min={8} max={200} step={1} aria-label={t("text.size")} />
                            <div className="flex justify-between text-[8px] text-muted-foreground"><span>8</span><span>200</span></div>
                        </div>

                        <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-2">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                            <span className="flex items-center gap-1.5"><Icon icon="solar:text-bold-linear" width="14" />{t("text.weight")}</span>
                            <span className="normal-case tracking-normal text-foreground">{fontWeightValue}</span>
                        </div>
                        <input type="range" min={300} max={900} step={100} value={fontWeightValue} onChange={(e) => {
                            const value = Number(e.target.value);
                            setTextFontWeight(value <= 400 ? "normal" : value <= 600 ? "medium" : "bold");
                        }} className="h-3 w-full accent-blue-500" aria-label={t("text.weight")} />
                        <div className="flex justify-between text-[8px] text-muted-foreground"><span>300</span><span>400</span><span>500</span><span>700</span><span>900</span></div>
                        </div>

                        <div className="col-span-2 flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted/20 p-2">
                            <div className="flex shrink-0 items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold"><Icon icon="solar:text-field-linear" width="14" />{t("text.font")}</div>
                            <Select value={textFontFamily} onValueChange={setTextFontFamily}>
                                <SelectTrigger className="h-8 min-w-0 flex-1 bg-muted/60 transition border-border squircle-element text-xs text-foreground/80" style={{ fontFamily: textFontFamily }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover dark:bg-black border-border">
                                    {FONT_FAMILIES.map((f) => <SelectItem key={f} value={f} className="text-foreground/80 hover:bg-muted cursor-pointer" style={{ fontFamily: f }}>{f}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <button type="button" onClick={() => setTextStrokeEnabled(!textStrokeEnabled)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${textStrokeEnabled ? "border-blue-400/60 bg-blue-500/15 text-blue-400" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"}`} aria-label={t("text.toggleOutline")} aria-pressed={textStrokeEnabled} title={t("text.toggleOutline")}><Icon icon="solar:pen-new-square-linear" width="15" /></button>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{t("text.fill")}</div>
                            <ToggleChip active={textUseGradient} onClick={() => setTextUseGradient(!textUseGradient)} icon="solar:palette-round-linear" label={t("text.useGradient")} />
                        </div>
                        <div className="flex gap-2">
                            <ColorField label={t("text.color")} value={textColor} onChange={setTextColor} />
                            <ColorField label={t("text.gradientEnd")} value={textColorEnd} onChange={setTextColorEnd} />
                        </div>
                        <div className="h-2 rounded-full border border-white/10" style={{ background: textUseGradient ? `linear-gradient(90deg, ${textColor}, ${textColorEnd})` : textColor }} aria-hidden="true" />
                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2">
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold"><Icon icon="solar:pen-new-square-linear" width="14" />{t("text.outline")}</div>
                        </div>
                        {textStrokeEnabled && <>
                            <div className="flex gap-2">
                                <ColorField label={t("text.outlineColor")} value={textStrokeColor} onChange={setTextStrokeColor} />
                                {textStrokeGradient && <ColorField label={t("text.outlineEnd")} value={textStrokeColorEnd} onChange={setTextStrokeColorEnd} />}
                            </div>
                            <div className="flex items-center gap-2"><Icon icon="solar:line-width-linear" width="14" className="text-muted-foreground" /><input type="range" min={1} max={12} step={1} value={textStrokeWidth || 1} onChange={(e) => setTextStrokeWidth(Number(e.target.value))} className="w-full accent-blue-500" aria-label={t("text.outlineWidth")} /><span className="w-7 text-right text-[10px] text-muted-foreground">{textStrokeWidth || 1}px</span></div>
                            <ToggleChip active={textStrokeGradient} onClick={() => setTextStrokeGradient(!textStrokeGradient)} icon="solar:palette-round-linear" label={t("text.useOutlineGradient")} />
                        </>}
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{t("text.animation.title")}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <TextAnimationPreview label={t("text.animation.entry")} content={textContent || "Texto"} textCase={textCase} color={textColor} colorEnd={textColorEnd} useGradient={textUseGradient} animation={textAnimationIn} fontFamily={textFontFamily} fontWeight={textFontWeight} progress={animationPreviewProgress} entering />
                            <TextAnimationPreview label={t("text.animation.exit")} content={textContent || "Texto"} textCase={textCase} color={textColor} colorEnd={textColorEnd} useGradient={textUseGradient} animation={textAnimationOut} fontFamily={textFontFamily} fontWeight={textFontWeight} progress={1 - animationPreviewProgress} entering={false} />
                        </div>
                        <AnimationPresetGrid label={t("text.animation.entry")} value={textAnimationIn} onChange={setTextAnimationIn} previewProgress={animationPreviewProgress} entering />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t("text.animation.duration")}</span>
                            <input type="range" min={0.1} max={3} step={0.1} value={textAnimationInDuration} onChange={(e) => setTextAnimationInDuration(Number(e.target.value))} className="flex-1 accent-blue-500" aria-label={t("text.animation.entryDuration")} />
                            <span className="text-[11px] text-muted-foreground w-8 text-right">{textAnimationInDuration.toFixed(1)}s</span>
                        </div>
                        <AnimationPresetGrid label={t("text.animation.exit")} value={textAnimationOut} onChange={setTextAnimationOut} previewProgress={animationPreviewProgress} entering={false} />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t("text.animation.duration")}</span>
                            <input type="range" min={0.1} max={3} step={0.1} value={textAnimationOutDuration} onChange={(e) => setTextAnimationOutDuration(Number(e.target.value))} className="flex-1 accent-blue-500" aria-label={t("text.animation.exitDuration")} />
                            <span className="text-[11px] text-muted-foreground w-8 text-right">{textAnimationOutDuration.toFixed(1)}s</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <SliderControl icon="mdi:opacity" label={t("properties.opacity")} value={textOpacity} onChange={setTextOpacity} />
                    </div>

                    <Button onClick={() => {
                        const timestamp = Date.now();
                        const newElement: TextElement = {
                            id: `text-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
                            type: "text", x: 50, y: 50, width: 0, height: 0, rotation: 0,
                            opacity: textOpacity / 100, zIndex: timestamp,
                            content: textContent, textCase, fontSize: textFontSize, color: textColor,
                            strokeEnabled: textStrokeEnabled, strokeWidth: textStrokeWidth, strokeColor: textStrokeColor,
                            strokeColorEnd: textStrokeColorEnd, strokeGradient: textStrokeGradient,
                            fontFamily: textFontFamily, fontWeight: textFontWeight,
                            animationIn: textAnimationIn, animationOut: textAnimationOut,
                            animationInDuration: textAnimationInDuration, animationOutDuration: textAnimationOutDuration,
                        };
                        onAddElement(newElement);
                    }} variant="outline" className="w-full text-xs">
                        <Icon icon="ph:plus-bold" width="16" />
                        {t("text.addButton")}
                    </Button>
                </div>
            )}

        </div>
    );
}

function TextAnimationPreview({ label, content, textCase, color, colorEnd, useGradient, animation, fontFamily, fontWeight, progress, entering }: { label: string; content: string; textCase: TextCase; color: string; colorEnd: string; useGradient: boolean; animation: TextAnimation; fontFamily: string; fontWeight: "normal" | "medium" | "bold"; progress: number; entering: boolean }) {
    content = applyTextCase(content, textCase);
    const animationStyle = getTextAnimationStyle(animation, progress, entering);
    const previewContent = animation === "typewriter"
        ? content.slice(0, Math.ceil(content.length * progress))
        : animation === "word-by-word"
            ? content.split(" ").slice(0, Math.ceil(content.split(" ").length * progress)).join(" ")
            : content;
    const textStyle: React.CSSProperties = {
        backgroundImage: useGradient ? `linear-gradient(90deg, ${color}, ${colorEnd})` : undefined,
        backgroundClip: useGradient ? "text" : undefined,
        WebkitBackgroundClip: useGradient ? "text" : undefined,
        WebkitTextFillColor: useGradient ? "transparent" : color,
        fontFamily,
        fontWeight: fontWeight === "normal" ? 400 : fontWeight === "medium" ? 500 : 700,
    };
    return <div className="relative min-w-0 overflow-hidden rounded-md border border-border bg-[#080b12] px-2 py-2 text-center shadow-inner">
        <div className="mb-2 flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground"><Icon icon={entering ? "solar:login-2-linear" : "solar:logout-2-linear"} width="11" />{label}</div>
        <div className="relative mx-auto flex min-h-8 max-w-full items-center justify-center overflow-hidden text-sm font-bold" style={textStyle}>
            <span className="relative inline-block max-w-full break-words text-center" style={{ ...textStyle, ...animationStyle }}>{previewContent || " "}</span>
        </div>
    </div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-1.5 cursor-pointer">
            <span className="h-5 w-5 rounded border border-white/20 shrink-0" style={{ backgroundColor: value }} />
            <Icon icon="solar:palette-round-linear" width="13" className="text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">{label}</span>
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
        </label>
    );
}

function ToggleChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
    return <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${active ? "border-blue-400/60 bg-blue-500/15 text-blue-400" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"}`} aria-pressed={active}><Icon icon={icon} width="15" /><span>{label}</span><span className="ml-auto h-3 w-3 rounded-full border" style={{ backgroundColor: active ? "#60A5FA" : "transparent" }} /></button>;
}

function AnimationPresetGrid({ label, value, onChange, previewProgress, entering }: { label: string; value: TextAnimation; onChange: (value: TextAnimation) => void; previewProgress: number; entering: boolean }) {
    const options: Array<[TextAnimation, string, string]> = [
        ["none", "Ninguna", "solar:close-circle-linear"], ["fade", "Fade", "solar:eye-linear"], ["slide-up", "Subir", "solar:alt-arrow-up-linear"],
        ["slide-left", "Izquierda", "solar:alt-arrow-left-linear"], ["slide-right", "Derecha", "solar:alt-arrow-right-linear"], ["scale", "Escala", "solar:maximize-linear"],
        ["typewriter", "Escritura", "solar:text-field-linear"], ["word-by-word", "Palabra", "solar:text-selection-linear"], ["blur", "Blur", "solar:blur-linear"],
        ["rotate", "Giro", "solar:refresh-linear"], ["bounce", "Rebote", "solar:restart-linear"], ["wipe", "Barrido", "solar:magic-stick-3-linear"],
        ["pop", "Pop", "solar:star-fall-linear"], ["elastic", "Elástico", "solar:asteroid-linear"], ["zoom-blur", "Zoom blur", "solar:zoom-in-linear"],
    ];
    return (
        <div className="space-y-2 rounded-lg border border-border/80 bg-background/30 p-2.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                    <Icon icon={entering ? "solar:login-2-linear" : "solar:logout-2-linear"} width="14" className={entering ? "text-emerald-400" : "text-orange-400"} />
                    {label}
                </div>
                <span className="max-w-24 truncate rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground">{options.find(([animation]) => animation === value)?.[1]}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                {options.map(([animation, animationLabel, icon]) => {
                    const style = getTextAnimationStyle(animation, previewProgress, entering);
                    return <button key={animation} type="button" onClick={() => onChange(animation)} className={`group relative min-h-12 overflow-hidden rounded-md border p-1 text-left transition-all ${value === animation ? "border-blue-400 bg-blue-500/15 ring-1 ring-blue-400/30" : "border-border/70 bg-muted/20 hover:border-muted-foreground/60"}`} aria-pressed={value === animation}>
                        <span className="absolute right-1 top-1 text-muted-foreground/70"><Icon icon={icon} width="11" /></span>
                        {value === animation && <Icon icon="solar:check-circle-bold" width="11" className="absolute bottom-1 right-1 text-blue-400" />}
                        <span className="block pt-2 text-[9px] font-medium text-foreground/80 truncate" style={{ opacity: style.opacity, transform: style.transform, filter: style.filter }}>{"Texto"}</span>
                        <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">{animationLabel}</span>
                    </button>;
                })}
            </div>
        </div>
    );
}


function UploadImageButton({ onUpload, isUploading }: { onUpload: (files: FileList | null) => void; isUploading: boolean }) {
    const t = useTranslations("elementsMenu");
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                    onUpload(e.target.files);
                    e.target.value = "";
                }}
                aria-label={t("uploads.selectFile")}
            />
            <TooltipAction label={t("uploads.selectFile")}>
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square bg-muted/50 hover:bg-muted border border-dashed border-border squircle-element flex items-center justify-center transition-all active:scale-90 group disabled:opacity-50"
                    aria-label={t("uploads.selectFile")}
                >
                    {isUploading ? (
                        <Icon icon="svg-spinners:180-ring-with-bg" width="16" className="text-muted-foreground" aria-hidden="true" />
                    ) : (
                        <Icon icon="material-symbols:upload-rounded" width="24" className="text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                    )}
                </button>
            </TooltipAction>
        </>
    );
}