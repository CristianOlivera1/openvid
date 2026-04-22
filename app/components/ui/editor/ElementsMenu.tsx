"use client";

import { Icon } from "@iconify/react";
import { useState, useEffect, useRef, startTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { SliderControl } from "../SliderControl";
import { SVG_CATEGORIES, IMAGE_CATEGORIES, PINNED_SVG_ITEMS, PINNED_IMAGE_ITEMS, getImagePreviewPath } from "@/lib/canvas-elements.config";
import { SvgElement, TextElement, ImageElement, ElementsMenuProps, PRESET_COLORS, TEXT_PRESETS, FONT_FAMILIES, FONT_WEIGHTS, UploadedImage, STORAGE_KEY, ACCEPTED_FORMATS, MAX_FILE_SIZE } from "@/types/canvas-elements.types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SVG_COMPONENTS } from "@/components/canvas-svg";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { ProgressiveImg } from "@/components/ui/ProgressiveImg";

export function ElementsMenu({
    onAddElement,
    selectedElement,
    onUpdateElement,
    onDeleteElement,
    onBringToFront,
    onSendToBack
}: ElementsMenuProps) {
    const t = useTranslations("elementsMenu");

    const [mode, setMode] = useState<"text" | "elements" | "uploads">("elements");
    const [shapeSize, setShapeSize] = useState(20);
    const [shapeColor, setShapeColor] = useState("#FFFFFF");
    const [shapeOpacity, setShapeOpacity] = useState(100);
    const [textContent, setTextContent] = useState("Texto");
    const [textFontSize, setTextFontSize] = useState(48);
    const [textColor, setTextColor] = useState("#FFFFFF");
    const [textOpacity, setTextOpacity] = useState(100);
    const [textFontFamily, setTextFontFamily] = useState("Inter");
    const [textFontWeight, setTextFontWeight] = useState<"normal" | "medium" | "bold">("bold");
    const [imageOpacity, setImageOpacity] = useState(100);
    const [imageSize, setImageSize] = useState(30);
    const [selectedSvgCategory, setSelectedSvgCategory] = useState<string>("all");
    const [selectedImageCategory, setSelectedImageCategory] = useState<string>("all");
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored) as UploadedImage[];
        } catch (error) {
            console.error("Error loading uploaded images:", error);
        }
        return [];
    });
    const [isUploading, setIsUploading] = useState(false);

    const isSyncing = useRef(false);
    const lastSelectedId = useRef<string | null>(null);

    useEffect(() => {
        const currentId = selectedElement?.id || null;
        if (lastSelectedId.current === currentId) return;
        lastSelectedId.current = currentId;
        isSyncing.current = true;
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
                setShapeSize(20); setShapeColor("#FFFFFF"); setShapeOpacity(100);
                setImageSize(30); setImageOpacity(100);
                setTextContent("Texto"); setTextFontSize(48); setTextColor("#FFFFFF");
                setTextOpacity(100); setTextFontFamily("Inter"); setTextFontWeight("bold");
            }
            setTimeout(() => { isSyncing.current = false; }, 0);
        });
    }, [selectedElement]);

    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "svg" && onUpdateElement) {
            onUpdateElement(selectedElement.id, { width: shapeSize, height: shapeSize, color: shapeColor, opacity: shapeOpacity / 100 });
        }
    }, [shapeSize, shapeColor, shapeOpacity, selectedElement?.id, selectedElement?.type, onUpdateElement]);

    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "image" && onUpdateElement) {
            onUpdateElement(selectedElement.id, { width: imageSize, height: imageSize, opacity: imageOpacity / 100 });
        }
    }, [imageSize, imageOpacity, selectedElement?.id, selectedElement?.type, onUpdateElement]);

    useEffect(() => {
        if (!isSyncing.current && selectedElement?.type === "text" && onUpdateElement) {
            onUpdateElement(selectedElement.id, { content: textContent, fontSize: textFontSize, color: textColor, opacity: textOpacity / 100, fontFamily: textFontFamily, fontWeight: textFontWeight });
        }
    }, [textContent, textFontSize, textColor, textOpacity, textFontFamily, textFontWeight, selectedElement?.id, selectedElement?.type, onUpdateElement]);

    useEffect(() => {
        if (uploadedImages.length > 0) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedImages)); }
            catch (error) { console.error("Error saving uploaded images:", error); }
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [uploadedImages]);

    const handleImageUpload = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        const newImages: UploadedImage[] = [];
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
                const uploadedImage: UploadedImage = {
                    id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    name: file.name, dataUrl, uploadedAt: Date.now(),
                };
                newImages.push(uploadedImage);
                const timestamp = Date.now() + i;
                const newElement: ImageElement = {
                    id: `image-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
                    type: "image", category: "uploads", x: 50, y: 50,
                    width: imageSize, height: imageSize, rotation: 0,
                    opacity: imageOpacity / 100, zIndex: timestamp, imagePath: dataUrl,
                };
                onAddElement(newElement);
            } catch (error) { console.error(`Error uploading ${file.name}:`, error); }
        }
        if (newImages.length > 0) setUploadedImages(prev => [...prev, ...newImages]);
        setIsUploading(false);
    }, [imageSize, imageOpacity, onAddElement]);

    const handleDeleteUploadedImage = useCallback((id: string) => {
        setUploadedImages(prev => {
            const filtered = prev.filter(img => img.id !== id);
            if (filtered.length === 0) localStorage.removeItem(STORAGE_KEY);
            return filtered;
        });
    }, []);

    const handleAddUploadedImage = useCallback((image: UploadedImage) => {
        const timestamp = Date.now();
        const newElement: ImageElement = {
            id: `image-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            type: "image", category: "uploads", x: 50, y: 50,
            width: imageSize, height: imageSize, rotation: 0,
            opacity: imageOpacity / 100, zIndex: timestamp, imagePath: image.dataUrl,
        };
        onAddElement(newElement);
    }, [imageSize, imageOpacity, onAddElement]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); e.stopPropagation();
        handleImageUpload(e.dataTransfer.files);
    }, [handleImageUpload]);

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
            width: shapeSize, height: shapeSize, rotation: 0,
            opacity: shapeOpacity / 100, zIndex: timestamp, svgId: item.id, color: shapeColor,
        };
        onAddElement(newElement);
    }, [shapeSize, shapeOpacity, shapeColor, onAddElement]);

    const handleAddImage = useCallback((item: { id: string; name: string; imagePath: string }, categoryId?: string) => {
        const timestamp = Date.now();
        const newElement: ImageElement = {
            id: `image-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
            type: "image", category: categoryId || "overlays", x: 50, y: 50,
            width: imageSize, height: imageSize, rotation: 0,
            opacity: imageOpacity / 100, zIndex: timestamp, imagePath: item.imagePath,
        };
        onAddElement(newElement);
    }, [imageSize, imageOpacity, onAddElement]);

    return (
        <div className="p-4 flex flex-col gap-5">

            <div className="flex items-center gap-2 text-white font-medium">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-colors duration-200">
                    <path d="M11 13.5V21.5H3V13.5H11ZM9 15.5H5V19.5H9V15.5ZM12 2L17.5 11H6.5L12 2ZM12 5.86L10.08 9H13.92L12 5.86Z" fill="currentColor" stroke="currentColor" strokeWidth="0.2" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.7667 13.8246C13.7667 13.6323 13.8431 13.4479 13.9791 13.312C14.115 13.176 14.2994 13.0996 14.4917 13.0996H20.2917C20.484 13.0996 20.6684 13.176 20.8044 13.312C20.9403 13.4479 21.0167 13.6323 21.0167 13.8246V14.7913C21.0167 14.9836 20.9403 15.168 20.8044 15.3039C20.6684 15.4399 20.484 15.5163 20.2917 15.5163C20.0994 15.5163 19.915 15.4399 19.7791 15.3039C19.6431 15.168 19.5667 14.9836 19.5667 14.7913V14.5496H18.1167V20.3496H18.3584C18.5507 20.3496 18.7351 20.426 18.871 20.562C19.007 20.6979 19.0834 20.8823 19.0834 21.0746C19.0834 21.2669 19.007 21.4513 18.871 21.5873C18.7351 21.7232 18.5507 21.7996 18.3584 21.7996H16.4251C16.2328 21.7996 16.0484 21.7232 15.9124 21.5873C15.7764 21.4513 15.7001 21.2669 15.7001 21.0746C15.7001 20.8823 15.7764 20.6979 15.9124 20.562C16.0484 20.426 16.2328 20.3496 16.4251 20.3496H16.6667V14.5496H15.2167V14.7913C15.2167 14.9836 15.1403 15.168 15.0044 15.3039C14.8684 15.4399 14.684 15.5163 14.4917 15.5163C14.2994 15.5163 14.115 15.4399 13.9791 15.3039C13.8431 15.168 13.7667 14.9836 13.7667 14.7913V13.8246Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
                </svg>
                <span>{t("title")}</span>
            </div>

            <div className="grid grid-cols-3 bg-[#09090B] squircle-element p-1 text-xs font-medium border border-white/5">
                <button className={`flex justify-center items-center gap-1.5 py-1.5 rounded transition ${mode === "elements" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`} onClick={() => setMode("elements")}>
                    <Icon icon="iconoir:hexagon" width="14" />
                    {t("tabs.elements")}
                </button>
                <button className={`flex justify-center items-center gap-1.5 py-1.5 rounded transition ${mode === "text" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`} onClick={() => setMode("text")}>
                    <Icon icon="iconoir:text-size" width="14" />
                    {t("tabs.text")}
                </button>
                <button className={`flex justify-center items-center gap-1.5 py-1.5 rounded transition ${mode === "uploads" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`} onClick={() => setMode("uploads")}>
                    <Icon icon="ph:upload-simple-bold" width="14" />
                    {t("tabs.uploads")}
                </button>
            </div>

            {mode === "elements" && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-150">

                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("sections.shapes")}</div>
                        <div className="grid grid-cols-6 gap-2">
                            {PINNED_SVG_ITEMS.map((item) => (
                                <TooltipAction label={item.name} key={item.id}>
                                    <button onClick={() => handleAddSvg(item)} className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 group">
                                        {item.icon ? (
                                            <Icon icon={item.icon} width="18" className="text-white/50 group-hover:text-white transition-colors" />
                                        ) : (() => {
                                            const SvgComponent = SVG_COMPONENTS[item.id];
                                            return SvgComponent
                                                ? <SvgComponent color="currentColor" className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                                                : <span className="text-[9px] text-white/40">{item.name}</span>;
                                        })()}
                                    </button>
                                </TooltipAction>
                            ))}

                            <Popover>
                                <TooltipAction label={t("tooltips.allShapes")}>
                                    <PopoverTrigger asChild>
                                        <button className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group">
                                            <Icon icon="ph:plus-bold" width="16" className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                                        </button>
                                    </PopoverTrigger>
                                </TooltipAction>
                                <PopoverContent side="right" align="start" sideOffset={12} className="w-120 p-0 border-0 shadow-2xl">
                                    <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-125">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2 flex-wrap">
                                            <button onClick={() => setSelectedSvgCategory("all")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedSvgCategory === "all" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"}`}>
                                                <Icon icon="ph:grid-four-bold" width="12" />
                                                <span>{t("filters.all")}</span>
                                            </button>
                                            {SVG_CATEGORIES.map((cat) => (
                                                <button key={cat.id} onClick={() => setSelectedSvgCategory(cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedSvgCategory === cat.id ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"}`}>
                                                    <span>{cat.title}</span>
                                                </button>
                                            ))}
                                            <span className="ml-auto text-[10px] text-white/60">{t("counts.shapes", { count: filteredSvgItems.length })}</span>
                                        </div>
                                        <div className="p-3 grid grid-cols-6 gap-2 overflow-y-auto custom-scrollbar">
                                            {filteredSvgItems.map((item) => (
                                                <TooltipAction label={item.name} key={`${item.category}-${item.id}`}>
                                                    <button onClick={() => handleAddSvg(item, item.category)} className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 group">
                                                        {item.icon ? (
                                                            <Icon icon={item.icon} width="18" className="text-white/50 group-hover:text-white transition-colors" />
                                                        ) : (() => {
                                                            const SvgComponent = SVG_COMPONENTS[item.id];
                                                            return SvgComponent
                                                                ? <SvgComponent color="currentColor" className="w-4 h-4 text-white/50 scale-200 group-hover:text-white transition-colors" />
                                                                : <span className="text-[9px] text-white/40">{item.name}</span>;
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
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("sections.images")}</div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {PINNED_IMAGE_ITEMS.map((item) => (
                                <button key={item.id} onClick={() => handleAddImage(item)} className="aspect-square bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element flex items-center justify-center transition-all active:scale-90 overflow-hidden group">
                                    <ProgressiveImg src={getImagePreviewPath(item)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110" />
                                </button>
                            ))}
                            {Array.from({ length: Math.max(0, 11 - PINNED_IMAGE_ITEMS.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}

                            <Popover>
                                <TooltipAction label={t("tooltips.allImages")}>
                                    <PopoverTrigger asChild>
                                        <button className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group">
                                            <Icon icon="ph:plus-bold" width="16" className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                                        </button>
                                    </PopoverTrigger>
                                </TooltipAction>
                                <PopoverContent side="right" align="start" sideOffset={12} className="w-130 p-0 border-0 shadow-2xl">
                                    <div className="flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-125">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2 flex-wrap">
                                            <button onClick={() => setSelectedImageCategory("all")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedImageCategory === "all" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"}`}>
                                                <Icon icon="ph:grid-four-bold" width="12" />
                                                <span>{t("filters.all")}</span>
                                            </button>
                                            {IMAGE_CATEGORIES.map((cat) => (
                                                <button key={cat.id} onClick={() => setSelectedImageCategory(cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${selectedImageCategory === cat.id ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "bg-white/5 text-white/50 hover:text-white/70 border border-transparent hover:border-white/10"}`}>
                                                    <span>{cat.title}</span>
                                                </button>
                                            ))}
                                            <span className="ml-auto text-[10px] text-white/60">{t("counts.images", { count: filteredImageItems.length })}</span>
                                        </div>
                                        <div className="p-3 grid grid-cols-8 gap-2 overflow-y-auto custom-scrollbar">
                                            {filteredImageItems.map((item) => (
                                                <div key={`${item.category}-${item.id}`} className="w-full" style={{ paddingBottom: "100%", position: "relative" }}>
                                                    <TooltipAction label={item.name}>
                                                        <button title={item.name} onClick={() => handleAddImage(item, item.category)} className="absolute inset-0 bg-white/3 hover:bg-white/8 border border-white/[0.07] hover:border-white/20 squircle-element transition-all active:scale-90 overflow-hidden group">
                                                            <ProgressiveImg src={getImagePreviewPath(item)} alt={item.name} className="w-full h-full object-contain group-hover:scale-110" />
                                                        </button>
                                                    </TooltipAction>
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
                                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("properties.color")}</div>
                                    <div className="flex gap-2">
                                        <div className="grid grid-cols-5 gap-2 flex-1">
                                            {PRESET_COLORS.map((color) => (
                                                <TooltipAction label={color} key={color}>
                                                    <button onClick={() => setShapeColor(color)} className={`aspect-square squircle-element cursor-pointer transition-all border border-white/20 ${shapeColor === color ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50" : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"}`} style={{ backgroundColor: color }} />
                                                </TooltipAction>
                                            ))}
                                        </div>
                                        <label className="relative cursor-pointer">
                                            <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className="w-10 h-10 aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group" style={{ backgroundColor: shapeColor }}>
                                                <Icon icon="mdi:eyedropper" width="18" className="text-white mix-blend-difference" />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <SliderControl icon="mdi:resize" label={t("properties.size")} value={selectedElement.type === "svg" ? shapeSize : imageSize} onChange={selectedElement.type === "svg" ? setShapeSize : setImageSize} min={5} max={200} />
                                <SliderControl icon="mdi:opacity" label={t("properties.opacity")} value={selectedElement.type === "svg" ? shapeOpacity : imageOpacity} onChange={selectedElement.type === "svg" ? setShapeOpacity : setImageOpacity} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("sections.hierarchy")}</div>
                                    <TooltipAction label={t("actions.delete")}>
                                        <button onClick={() => onDeleteElement?.(selectedElement.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md text-red-400 hover:text-red-300 transition-all active:scale-95">
                                            <Icon icon="ph:trash-bold" width="14" />
                                        </button>
                                    </TooltipAction>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => onBringToFront?.(selectedElement.id)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-all">
                                        <Icon icon="ph:bring-to-front-bold" width="16" />
                                        {t("actions.bringToFront")}
                                    </button>
                                    <button onClick={() => onSendToBack?.(selectedElement.id)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-all">
                                        <Icon icon="ph:send-to-back-bold" width="16" />
                                        {t("actions.sendToBack")}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {mode === "text" && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("text.content")}</div>
                        <input type="text" value={textContent} onChange={(e) => setTextContent(e.target.value)} className="w-full bg-white/4 hover:bg-white/[0.07] transition border border-white/8 squircle-element px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20" placeholder={t("text.placeholder")} />
                    </div>

                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("text.presets")}</div>
                        <div className="grid grid-cols-2 gap-2">
                            {TEXT_PRESETS.map((p) => (
                                <button key={p.label} onClick={() => { setTextFontSize(p.fontSize); setTextFontWeight(p.weight); }} className="bg-white/3 hover:bg-white/[0.07] border border-white/[0.07] squircle-element px-3 py-2.5 text-left transition-all active:scale-[.98]">
                                    <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider mb-1.5">{p.label}</div>
                                    <div className="text-white leading-none truncate" style={{ fontSize: `${p.fontSize / 3}px`, fontWeight: p.weight }}>{p.sample}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-row justify-between gap-2 space-y-2">
                        <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("text.size")}</div>
                            <div className="flex items-center gap-2">
                                <input type="number" value={textFontSize || ""} onChange={(e) => { const val = e.target.value; if (val === "") { setTextFontSize(0); return; } const num = parseInt(val, 10); if (!isNaN(num)) setTextFontSize(Math.min(200, num)); }} onBlur={() => setTextFontSize((prev) => Math.max(8, Math.min(200, prev || 32)))} className="flex-1 bg-white/4 hover:bg-white/[0.07] transition border border-white/8 squircle-element px-3 py-2 text-sm text-white outline-none focus:border-white/20" min={8} max={200} />
                                <span className="text-xs text-white/50 w-6">px</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("text.font")}</div>
                            <Select value={textFontFamily} onValueChange={setTextFontFamily}>
                                <SelectTrigger className="w-full bg-white/4 hover:bg-white/[0.07] transition border-white/8 squircle-element text-white/80" style={{ fontFamily: textFontFamily }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1e] border-white/10">
                                    {FONT_FAMILIES.map((f) => (
                                        <SelectItem key={f} value={f} className="text-white/80 hover:bg-white/10 cursor-pointer" style={{ fontFamily: f }}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("properties.color")}</div>
                        <div className="flex gap-2">
                            <div className="grid grid-cols-5 gap-2 flex-1">
                                {PRESET_COLORS.map((color) => (
                                    <TooltipAction label={color} key={color}>
                                        <button onClick={() => setTextColor(color)} className={`aspect-square squircle-element cursor-pointer transition-all border border-white/20 ${textColor === color ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50" : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"}`} style={{ backgroundColor: color }} />
                                    </TooltipAction>
                                ))}
                            </div>
                            <label className="relative cursor-pointer">
                                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="w-10 h-10 aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group" style={{ backgroundColor: textColor }}>
                                    <Icon icon="mdi:eyedropper" width="18" className="text-white mix-blend-difference" />
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("text.weight")}</div>
                        <div className="grid grid-cols-3 gap-2">
                            {FONT_WEIGHTS.map((w) => (
                                <button key={w.key} onClick={() => setTextFontWeight(w.key)} className={`px-3 py-2 rounded-lg text-xs transition-all squircle-element ${textFontWeight === w.key ? "bg-white/10 text-white border border-white/15" : "bg-white/3 text-white/35 hover:text-white/70 border border-white/6"}`}>
                                    {w.label}
                                </button>
                            ))}
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
                            content: textContent, fontSize: textFontSize, color: textColor,
                            fontFamily: textFontFamily, fontWeight: textFontWeight,
                        };
                        onAddElement(newElement);
                    }} variant="outline" className="w-full text-xs">
                        <Icon icon="ph:plus-bold" width="16" />
                        {t("text.addButton")}
                    </Button>

                    {selectedElement && selectedElement.type === "text" && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("sections.hierarchy")}</div>
                                <TooltipAction label={t("actions.delete")}>
                                    <button onClick={() => onDeleteElement?.(selectedElement.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md text-red-400 hover:text-red-300 transition-all active:scale-95">
                                        <Icon icon="ph:trash-bold" width="14" />
                                    </button>
                                </TooltipAction>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="text-xs" onClick={() => onBringToFront?.(selectedElement.id)}>
                                    <Icon icon="ph:bring-to-front-bold" width="16" />
                                    {t("actions.bringToFront")}
                                </Button>
                                <Button variant="outline" className="text-xs" onClick={() => onSendToBack?.(selectedElement.id)}>
                                    <Icon icon="ph:send-to-back-bold" width="16" />
                                    {t("actions.sendToBack")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {mode === "uploads" && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                    <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t("uploads.title")}</div>
                        <label className={`group flex flex-col items-center justify-center w-full bg-[#09090B] border border-dashed border-white/10 hover:border-white/30 hover:bg-white/3 squircle-element p-8 text-center cursor-pointer transition-all ${isUploading ? "opacity-50 pointer-events-none" : ""}`} onDragOver={handleDragOver} onDrop={handleDrop}>
                            {isUploading ? (
                                <div className="flex flex-col items-center justify-center w-full">
                                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 transition-transform">
                                        <Icon icon="svg-spinners:180-ring-with-bg" width="24" className="text-white/50" />
                                    </div>
                                    <p className="text-sm font-medium text-white/70 mb-1">{t("uploads.uploading")}</p>
                                    <p className="text-xs text-white/40">{t("uploads.processing")}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full">
                                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                                        <Icon icon="solar:upload-minimalistic-outline" width="24" className="text-white/40 group-hover:text-white/70 transition-colors" />
                                    </div>
                                    <p className="text-sm font-medium text-white/70 mb-1">{t("uploads.title")}</p>
                                    <p className="text-xs text-white/40 mb-5">{t("uploads.instruction")}</p>
                                    <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap squircle-element font-medium transition-all border border-white/10 bg-transparent hover:bg-white/10 h-9 px-4 py-2 w-full text-xs text-white/70 group-hover:text-white shadow-xs">
                                        <span>{t("uploads.selectFile")}</span>
                                    </div>
                                </div>
                            )}
                            <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" multiple onChange={(e) => handleImageUpload(e.target.files)} disabled={isUploading} />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                                {t("uploads.gallery", { count: uploadedImages.length })}
                            </div>
                            {uploadedImages.length > 0 && (
                                <button onClick={() => { setUploadedImages([]); localStorage.removeItem(STORAGE_KEY); }} className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors">
                                    {t("uploads.clearAll")}
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {uploadedImages.length === 0 ? (
                                <div className="col-span-3 py-10 flex flex-col items-center justify-center text-center bg-[#09090B] border border-dashed border-white/10 squircle-element">
                                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                                        <Icon icon="mynaui:image" width="20" className="text-white/40" />
                                    </div>
                                    <span className="text-xs font-medium text-white/60 mb-0.5">{t("uploads.emptyTitle")}</span>
                                    <span className="text-[10px] text-white/40">{t("uploads.emptySubtitle")}</span>
                                </div>
                            ) : (
                                uploadedImages.map((image) => (
                                    <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:border-white/30 transition-all cursor-pointer" onClick={() => handleAddUploadedImage(image)} title={image.name}>
                                        <img src={image.dataUrl} alt={image.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Icon icon="ph:plus-circle-bold" width="24" className="text-white" />
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteUploadedImage(image.id); }} className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10">
                                            <Icon icon="ph:trash-bold" width="12" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}