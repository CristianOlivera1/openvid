"use client";

import { Icon } from "@iconify/react";
import { useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ImageProjectPreview } from "@/types/image-project.types";
import { TooltipAction } from "@/components/ui/tooltip-action";

interface HistoryMenuProps {
    projects: ImageProjectPreview[];
    currentProjectId?: string | null;
    isLoading?: boolean;
    onSelectProject: (projectId: string) => void;
    onAddToCanvas: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onUploadToHistory: (file: File) => void;
}

export function HistoryMenu({
    projects,
    currentProjectId,
    isLoading = false,
    onSelectProject,
    onAddToCanvas,
    onDeleteProject,
    onUploadToHistory,
}: HistoryMenuProps) {
    const t = useTranslations("historyMenu");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            onUploadToHistory(file);
        }
        e.target.value = "";
    }, [onUploadToHistory]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            onUploadToHistory(file);
        }
    }, [onUploadToHistory]);

    const handleDelete = useCallback((projectId: string) => {
        setDeletingId(projectId);
        setTimeout(() => {
            onDeleteProject(projectId);
            setDeletingId(null);
        }, 150);
    }, [onDeleteProject]);

    return (
        <div className="p-4 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-medium">
                    <Icon icon="material-symbols:history" width="20" />
                    <span>{t("title")}</span>
                </div>
                <span className="text-xs text-white/40">
                    {projects.length} {t("items")}
                </span>
            </div>

            <div
                className={`relative squircle-element border-2 border-dashed transition-all cursor-pointer ${isDragging
                    ? "border-gray-500 bg-gray-500/10"
                    : "border-white/20 hover:border-gray-500/50 hover:bg-gray-500/5"
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <div className="p-4 flex flex-col items-center gap-2 text-center">
                    <div className={`p-2 rounded-full transition-colors ${isDragging ? "bg-gray-500/20 text-gray-400" : "bg-white/5 text-white/60"
                        }`}>
                        <Icon icon="solar:upload-minimalistic-outline" width="24" className="text-white/40 group-hover:text-white/70 transition-colors" />
                    </div>
                    <div>
                        <p className="text-sm text-white/70">
                            {isDragging ? t("upload.drop") : t("upload.dragOrClick")}
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                            PNG, JPG ...
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 pt-2">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3 animate-pulse">
                        {[...Array(2)].map((_, i) => (
                            <div
                                key={i}
                                className="relative aspect-video squircle-element bg-white/5 border border-white/10 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-linear-to-t from-white/5 to-transparent" />

                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Icon icon="solar:image-linear" width="24" className="text-white/10" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-2.5">
                                    <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40 animate-in fade-in">
                        <div className="w-16 h-16 squircle-element bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                            <Icon icon="solar:gallery-linear" width="32" className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-white/70">{t("empty.title")}</p>
                        <p className="text-xs mt-1 text-center max-w-50 leading-relaxed">{t("empty.description")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => onSelectProject(project.id)}
                                className={`group relative aspect-video squircle-element overflow-hidden cursor-pointer transition-all duration-300 ${currentProjectId === project.id
                                    ? "ring-2 ring-gray-400 ring-offset-2 ring-offset-[#0A0A0A] shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                    : "border border-white/10 hover:border-white/30 hover:shadow-xl"
                                    } ${deletingId === project.id ? "opacity-50 scale-95" : "scale-100"}`}
                            >
                                {project.thumbnailDataUrl ? (
                                    <img
                                        src={project.thumbnailDataUrl}
                                        alt={project.imageName}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#171717]">
                                        <Icon icon="solar:image-linear" width="24" className="text-white/20" />
                                    </div>
                                )}

                                {currentProjectId === project.id && (
                                    <div className="absolute top-2 left-2 z-10 bg-black border border-white/30 rounded-full p-0.5 shadow-lg animate-in zoom-in">
                                        <Icon icon="mdi:check" width="14" className="text-white" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-linear-to-t from-[#0A0A0A]/95 via-[#0A0A0A]/50 to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-2.5">

                                    <div className="flex justify-end gap-1.5 -translate-y-2.5 group-hover:translate-y-0 transition-transform duration-300">
                                        <TooltipAction label={t("actions.addToCanvas")}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAddToCanvas(project.id);
                                                }}
                                                className="size-6 flex items-center justify-center squircle-element bg-[#0A0A0A]/80 backdrop-blur-md border border-white/20 text-white/70 hover:text-white hover:bg-gray-500 hover:border-gray-500 transition-all"
                                            >
                                                <Icon icon="material-symbols:add-rounded" width="16" />
                                            </button>
                                        </TooltipAction>

                                        <TooltipAction label={t("actions.delete")}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(project.id);
                                                }}
                                                className="size-6 flex items-center justify-center squircle-element bg-[#0A0A0A]/80 backdrop-blur-md border border-white/20 text-white/70 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all"
                                            >
                                                <Icon icon="solar:trash-bin-trash-linear" width="16" />
                                            </button>
                                        </TooltipAction>
                                    </div>

                                    <div className="translate-y-2.5 group-hover:translate-y-0 transition-transform duration-300">
                                        <p className="text-[9px] text-white font-medium truncate drop-shadow-md tracking-tight">
                                            {project.imageName}
                                        </p>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}