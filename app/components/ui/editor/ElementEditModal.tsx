"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CanvasElement, ElementClip, ElementFill, ImageElement } from "@/types/canvas-elements.types";

interface ElementEditModalProps {
    isOpen: boolean;
    element: CanvasElement | null;
    onClose: () => void;
    onUpdate: (updates: Partial<CanvasElement>) => void;
    onDelete: () => void;
    onRemoveBackground?: () => void;
}

export function ElementEditModal({
    isOpen,
    element,
    onClose,
    onUpdate,
    onDelete,
    onRemoveBackground,
}: ElementEditModalProps) {
    if (!isOpen || !element) return null;

    const canSetColor = element.type === "svg" || element.type === "text";
    const imageElement = element.type === "image" ? element as ImageElement : null;
    const clip: ElementClip = imageElement?.clip ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const fill: ElementFill = imageElement?.fill ?? { mode: "none", color: "#ffffff", gradientFrom: "#00c2ff", gradientTo: "#7eff5f", gradientAngle: 45, opacity: 0.35 };

    const updateClip = (key: keyof ElementClip, value: number) => {
        if (!imageElement) return;
        const next = { ...clip, [key]: Math.max(0, Math.min(90, value)) };
        onUpdate({ clip: next } as Partial<CanvasElement>);
    };

    const updateFill = (updates: Partial<ElementFill>) => {
        if (!imageElement) return;
        onUpdate({ fill: { ...fill, ...updates } } as Partial<CanvasElement>);
    };

    return (
        <div
            className="fixed left-3 top-3 z-[120] w-[360px] max-w-[calc(100vw-24px)]"
            role="dialog"
            aria-modal="true"
            aria-label="Chỉnh sửa phần tử"
        >
            <div
                className="w-full rounded-2xl border border-white/15 bg-[#111217]/95 shadow-2xl backdrop-blur-md"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white">
                        <Icon icon="mdi:tune-variant" width={18} aria-hidden="true" />
                        <h2 className="text-sm font-semibold">Chỉnh sửa phần tử</h2>
                    </div>
                    <button
                        className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <Icon icon="mdi:close" width={18} className="text-white/70" aria-hidden="true" />
                    </button>
                </div>

                <div className="p-4 space-y-4 max-h-[calc(100vh-110px)] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                            <span className="text-xs text-white/60">Vị trí X (%)</span>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(element.x)}
                                onChange={(e) => onUpdate({ x: Math.max(0, Math.min(100, Number(e.target.value) || element.x)) })}
                                className="h-8 text-sm"
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs text-white/60">Vị trí Y (%)</span>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(element.y)}
                                onChange={(e) => onUpdate({ y: Math.max(0, Math.min(100, Number(e.target.value) || element.y)) })}
                                className="h-8 text-sm"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                            <span className="text-xs text-white/60">Kích thước W (%)</span>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={Math.round(element.width)}
                                onChange={(e) => onUpdate({ width: Number(e.target.value) || element.width })}
                                className="h-8 text-sm"
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs text-white/60">Kích thước H (%)</span>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={Math.round(element.height)}
                                onChange={(e) => onUpdate({ height: Number(e.target.value) || element.height })}
                                className="h-8 text-sm"
                            />
                        </label>
                    </div>

                    <label className="space-y-1 block">
                        <span className="text-xs text-white/60">Xoay ({Math.round(element.rotation)}°)</span>
                        <input
                            type="range"
                            min={-180}
                            max={180}
                            value={Math.round(element.rotation)}
                            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
                            className="w-full"
                        />
                    </label>

                    <label className="space-y-1 block">
                        <span className="text-xs text-white/60">Độ mờ ({Math.round(element.opacity * 100)}%)</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(element.opacity * 100)}
                            onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })}
                            className="w-full"
                        />
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={element.visible === false ? "border-white/15 text-white/70" : "border-cyan-400/30 text-cyan-300"}
                            onClick={() => onUpdate({ visible: element.visible === false })}
                        >
                            <Icon icon={element.visible === false ? "mdi:eye-off-outline" : "mdi:eye-outline"} width={14} aria-hidden="true" />
                            {element.visible === false ? "Đang ẩn" : "Đang hiện"}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className={element.locked ? "border-amber-400/30 text-amber-300" : "border-white/15 text-white/70"}
                            onClick={() => onUpdate({ locked: !element.locked })}
                        >
                            <Icon icon={element.locked ? "mdi:lock" : "mdi:lock-open-variant-outline"} width={14} aria-hidden="true" />
                            {element.locked ? "Đã khóa" : "Chưa khóa"}
                        </Button>
                    </div>

                    {canSetColor && (
                        <label className="space-y-1 block">
                            <span className="text-xs text-white/60">Màu fill</span>
                            <Input
                                type="color"
                                value={element.type === "svg" ? (element.color || "#FFFFFF") : element.color}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (element.type === "svg") {
                                        onUpdate({ color: value } as Partial<CanvasElement>);
                                    } else if (element.type === "text") {
                                        onUpdate({ color: value } as Partial<CanvasElement>);
                                    }
                                }}
                                className="h-10 p-1"
                            />
                        </label>
                    )}

                    {imageElement && (
                        <div className="space-y-3 rounded-xl border border-white/10 p-3 bg-white/[0.02]">
                            <p className="text-xs font-medium text-white/80">Cắt chi tiết thừa</p>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1 block">
                                    <span className="text-[11px] text-white/55">Trên ({Math.round(clip.top)}%)</span>
                                    <input type="range" min={0} max={90} value={Math.round(clip.top)} onChange={(e) => updateClip("top", Number(e.target.value))} className="w-full" />
                                </label>
                                <label className="space-y-1 block">
                                    <span className="text-[11px] text-white/55">Dưới ({Math.round(clip.bottom)}%)</span>
                                    <input type="range" min={0} max={90} value={Math.round(clip.bottom)} onChange={(e) => updateClip("bottom", Number(e.target.value))} className="w-full" />
                                </label>
                                <label className="space-y-1 block">
                                    <span className="text-[11px] text-white/55">Trái ({Math.round(clip.left)}%)</span>
                                    <input type="range" min={0} max={90} value={Math.round(clip.left)} onChange={(e) => updateClip("left", Number(e.target.value))} className="w-full" />
                                </label>
                                <label className="space-y-1 block">
                                    <span className="text-[11px] text-white/55">Phải ({Math.round(clip.right)}%)</span>
                                    <input type="range" min={0} max={90} value={Math.round(clip.right)} onChange={(e) => updateClip("right", Number(e.target.value))} className="w-full" />
                                </label>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-white/10 text-white/70"
                                onClick={() => onUpdate({ clip: { top: 0, right: 0, bottom: 0, left: 0 } } as Partial<CanvasElement>)}
                            >
                                <Icon icon="material-symbols:reset-settings-rounded" width={14} aria-hidden="true" />
                                Reset cắt ảnh
                            </Button>

                            <div className="space-y-2 pt-1">
                                <p className="text-xs font-medium text-white/80">Fill màu ảnh</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className={fill.mode === "none" ? "border-cyan-400/30 text-cyan-300" : "border-white/10 text-white/65"} onClick={() => updateFill({ mode: "none" })}>Không fill</Button>
                                    <Button variant="outline" size="sm" className={fill.mode === "solid" ? "border-cyan-400/30 text-cyan-300" : "border-white/10 text-white/65"} onClick={() => updateFill({ mode: "solid" })}>Màu đơn sắc</Button>
                                    <Button variant="outline" size="sm" className={fill.mode === "gradient" ? "border-cyan-400/30 text-cyan-300" : "border-white/10 text-white/65"} onClick={() => updateFill({ mode: "gradient" })}>Gradient</Button>
                                </div>

                                {fill.mode === "solid" && (
                                    <label className="space-y-1 block">
                                        <span className="text-[11px] text-white/55">Màu phủ</span>
                                        <Input type="color" value={fill.color || "#ffffff"} onChange={(e) => updateFill({ color: e.target.value })} className="h-10 p-1" />
                                    </label>
                                )}

                                {fill.mode === "gradient" && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="space-y-1 block">
                                            <span className="text-[11px] text-white/55">Màu 1</span>
                                            <Input type="color" value={fill.gradientFrom || "#00c2ff"} onChange={(e) => updateFill({ gradientFrom: e.target.value })} className="h-10 p-1" />
                                        </label>
                                        <label className="space-y-1 block">
                                            <span className="text-[11px] text-white/55">Màu 2</span>
                                            <Input type="color" value={fill.gradientTo || "#7eff5f"} onChange={(e) => updateFill({ gradientTo: e.target.value })} className="h-10 p-1" />
                                        </label>
                                        <label className="space-y-1 block col-span-2">
                                            <span className="text-[11px] text-white/55">Góc gradient ({Math.round(fill.gradientAngle ?? 45)}°)</span>
                                            <input type="range" min={0} max={360} value={Math.round(fill.gradientAngle ?? 45)} onChange={(e) => updateFill({ gradientAngle: Number(e.target.value) })} className="w-full" />
                                        </label>
                                    </div>
                                )}

                                {fill.mode !== "none" && (
                                    <label className="space-y-1 block">
                                        <span className="text-[11px] text-white/55">Độ mạnh fill ({Math.round((fill.opacity ?? 0.35) * 100)}%)</span>
                                        <input type="range" min={0} max={100} value={Math.round((fill.opacity ?? 0.35) * 100)} onChange={(e) => updateFill({ opacity: Number(e.target.value) / 100 })} className="w-full" />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        {element.type === "image" && onRemoveBackground && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/10"
                                onClick={onRemoveBackground}
                            >
                                <Icon icon="mdi:image-off-outline" width={14} aria-hidden="true" />
                                Tách nền ảnh
                            </Button>
                        )}

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onDelete}
                        >
                            <Icon icon="solar:trash-bin-trash-bold" width={14} aria-hidden="true" />
                            Xóa phần tử
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
