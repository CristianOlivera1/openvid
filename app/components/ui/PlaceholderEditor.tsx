import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { MediaType } from "@/types/editor.types";

interface PlaceholderEditorProps {
    onVideoUpload?: (file: File) => void;
    isUploading?: boolean;
    mediaType?: MediaType;
}

export default function PlaceholderEditor({ onVideoUpload, isUploading = false, mediaType = "video" }: PlaceholderEditorProps) {
    const t = useTranslations('placeholder');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const isImageMode = mediaType === "image";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onVideoUpload) {
            onVideoUpload(file);
            e.target.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        const isValidFile = isImageMode 
            ? file?.type.startsWith("image/")
            : file?.type.startsWith("video/");
        
        if (file && isValidFile && onVideoUpload) {
            onVideoUpload(file);
        }
    };

    const acceptedFormats = isImageMode 
        ? "image/jpeg,image/png,image/webp,image/gif"
        : "video/mp4,video/webm,video/quicktime,video/x-matroska";

    return (
        <>
            <div className="bg-[#2D2D2D] flex flex-col justify-center items-center px-6 shrink-0 w-3xl h-9 rounded-t-2xl border-b border-white/5">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-6">
                        <div className="flex gap-2">
                            <div className="size-2 rounded-full border border-gray-400"></div>
                            <div className="size-2 rounded-full border border-gray-400"></div>
                            <div className="size-2 rounded-full border border-gray-400"></div>
                        </div>

                        <div className="flex items-center gap-3 text-neutral-400">
                            <Icon
                                icon="lucide:chevron-left"
                                className="size-3 hover:text-neutral-200 transition-colors cursor-pointer"
                            />
                            <Icon
                                icon="lucide:chevron-right"
                                className="size-3 text-neutral-600"
                            />
                            <Icon
                                icon="solar:restart-linear"
                                className="size-3 hover:text-neutral-200 transition-colors cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex-1 max-w-xl mx-4">
                        <div className="bg-[#1C1C1C] rounded-md h-7 w-full flex items-center justify-between px-3 border border-white/5 shadow-inner">
                            <Icon
                                icon="material-symbols:lock-outline"
                                className="size-3 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
                            />
                            <span className="flex-1 text-center text-xs tracking-wide truncate px-3 text-neutral-300">
                                {t('browserBar.newTab')}
                            </span>
                            <Icon
                                icon="material-symbols:star-rounded"
                                className="size-3 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-neutral-400">
                        <Icon
                            icon="solar:upload-linear"
                            className="size-3 hover:text-neutral-200 transition-colors cursor-pointer"
                        />
                        <Icon
                            icon="ic:round-plus"
                            className="size-3 hover:text-neutral-200 transition-colors cursor-pointer"
                        />
                        <Icon
                            icon="solar:copy-linear"
                            className="size-3 hover:text-neutral-200 transition-colors cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Contenedor Principal con el color de fondo del diseño base */}
            <div
                className="flex-1 flex items-center justify-center bg-[#0a0a0a] p-12"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div onClick={handleUploadClick}
                    className={`relative group w-full max-w-2xl border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors duration-200 ease-in-out
                        ${isDragging
                            ? "border-blue-500 bg-blue-500/5"
                            : "border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-900/50 bg-transparent"
                        }
                    `}
                >
                    {isDragging && (
                        <div
                            className="absolute inset-0 z-50"
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        />
                    )}

                    <div className={`w-14 h-14 rounded-full border flex items-center justify-center mb-5 transition-transform duration-200 
                        ${isDragging
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400 scale-110"
                            : "bg-zinc-900 border-zinc-800 text-zinc-300 group-hover:scale-105"
                        }
                    `}>
                        <Icon
                            icon={isDragging ? "solar:upload-minimalistic-bold" : "solar:upload-minimalistic-linear"}
                            className="text-2xl"
                            strokeWidth="1.5"
                        />
                    </div>
                    <div className="space-y-1 mb-6 pointer-events-none">
                        <p className="text-base font-medium text-zinc-200">
                            {isDragging 
                                ? (isImageMode ? t('upload.draggingImage') : t('upload.dragging'))
                                : (isImageMode ? t('upload.titleImage') : t('upload.title'))}
                            <span className="font-normal text-zinc-400">
                                {!isDragging && ` ${isImageMode ? t('upload.subtitleImage') : t('upload.subtitle')}`}
                            </span>
                        </p>
                        <p className="text-sm text-zinc-500">
                            {isImageMode ? t('upload.formatsImage') : t('upload.formats')}
                        </p>
                    </div>
                    <div className="relative z-10">
                        {onVideoUpload && (
                            <Button
                                variant="outline"
                                disabled={isUploading}
                                className="border-zinc-700 hover:bg-zinc-800 hover:text-white"
                            >
                                {isUploading ? (
                                    <>
                                        <Icon icon="svg-spinners:ring-resize" width="18" height="18" className="mr-2" />
                                        <span>{t('upload.uploading')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{t('upload.button')}</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedFormats}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        </>
    );
}