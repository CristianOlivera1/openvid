"use client";

import { Icon } from "@iconify/react";
import { SidebarTool } from "../../../../components/ui/SidebarTool";
import type { ToolsSidebarProps } from "@/types/tool-sidebar.types";
import type { EditorMode } from "@/types/editor-mode.types";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { useRecording } from "@/app/contexts/RecordingContext";
import RecordingSetupDialog from "../RecordingSetupDialog";
import { ElementsIcon } from "@/components/ui/ElementsIcon";

interface ExtendedToolsSidebarProps extends ToolsSidebarProps {
    onVideoUpload?: (file: File) => void;
    isUploading?: boolean;
    isCursorEnabled?: boolean;
    selectedZoomFragmentId?: string | null;
    selectedAudioTrackId?: string | null;
    selectedVideoClipId?: string | null;
    selectedElementId?: string | null;
    newVideosCount?: number;
    editorMode?: EditorMode;
    onImageUpload?: (file: File) => void;
    onScreenCapture?: () => void;
    isCapturing?: boolean;
    hasCamera?: boolean;
}

export function ToolsSidebar({
    activeTool,
    onToolChange,
    onVideoUpload,
    isUploading = false,
    selectedZoomFragmentId,
    selectedAudioTrackId,
    selectedVideoClipId,
    selectedElementId,
    newVideosCount = 0,
    editorMode = "video",
    onImageUpload,
    onScreenCapture,
    isCapturing = false,
    hasCamera = false,
}: ExtendedToolsSidebarProps) {
    const t = useTranslations("toolsSidebar");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const zoomToolRef = useRef<HTMLButtonElement>(null);
    const audioToolRef = useRef<HTMLButtonElement>(null);
    const videosToolRef = useRef<HTMLButtonElement>(null);
    const cameraToolRef = useRef<HTMLButtonElement>(null);
    const elementsToolRef = useRef<HTMLButtonElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isImageDragging, setIsImageDragging] = useState(false);

    const { startCountdown, isIdle, isRecording, isCountdown, isProcessing } = useRecording();
    const [showMobileAlert, setShowMobileAlert] = useState(false);
    const [setupDialogOpen, setSetupDialogOpen] = useState(false);

    const isPhotoMode = editorMode === "photo";

    useEffect(() => {
        if (newVideosCount > 0 && videosToolRef.current && activeTool !== "video") {
            videosToolRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [newVideosCount, activeTool]);

    useEffect(() => {
        if (selectedZoomFragmentId && zoomToolRef.current) {
            zoomToolRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedZoomFragmentId]);

    useEffect(() => {
        if (selectedAudioTrackId && audioToolRef.current) {
            audioToolRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedAudioTrackId]);

    useEffect(() => {
        if (selectedVideoClipId && videosToolRef.current) {
            videosToolRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedVideoClipId]);

    useEffect(() => {
        if (activeTool === "camera" && cameraToolRef.current) {
            cameraToolRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeTool]);

    useEffect(() => {
        if (selectedElementId && elementsToolRef.current) {
            elementsToolRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedElementId]);

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

    const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            onImageUpload(file);
            e.target.value = '';
        }
    }, [onImageUpload]);

    const handleImageUploadClick = useCallback(() => {
        imageInputRef.current?.click();
    }, []);

    const handleImageDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isImageDragging) setIsImageDragging(true);
    }, [isImageDragging]);

    const handleImageDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsImageDragging(false);
    }, []);

    const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsImageDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/") && onImageUpload) {
            onImageUpload(file);
        }
    }, [onImageUpload]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isUploading) return;
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("video/") && onVideoUpload) {
            onVideoUpload(file);
        }
    };

    const handleStartRecording = () => {
        const isMobile = typeof window !== "undefined" && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
        if (isMobile) {
            setShowMobileAlert(true);
            setTimeout(() => setShowMobileAlert(false), 5000);
        } else {
            setSetupDialogOpen(true);
        }
    };

    const getRecordButtonContent = () => {
        if (isCountdown) {
            return { icon: "svg-spinners:ring-resize", text: t("recording.preparing"), className: "text-orange-500 dark:text-orange-400" };
        }
        if (isRecording) {
            return { icon: "fluent:record-20-filled", text: t("recording.recording"), className: "text-red-500 dark:text-red-400 animate-pulse" };
        }
        if (isProcessing) {
            return { icon: "svg-spinners:ring-resize", text: t("recording.processing"), className: "text-blue-600 dark:text-blue-400" };
        }
        return { icon: "fluent:screenshot-record-16-regular", text: t("recording.start"), className: "group-hover:text-red-500 dark:group-hover:text-red-400" };
    };

    const recordButtonContent = getRecordButtonContent();

    const sidebarWrapperRef = useRef<HTMLDivElement>(null);
    const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);

    useEffect(() => {
        const wrapper = sidebarWrapperRef.current;
        if (!wrapper) return;

        const compute = (containerHeight: number) => {
            if (containerHeight <= 0) return;
            const margin = 5;
            const availableHeight = containerHeight - margin;
            const heightMultiplier = containerHeight > 1200 ? 0.99 : containerHeight > 900 ? 0.96 : 0.95;
            const calculatedHeight = availableHeight * heightMultiplier;
            setSidebarHeight(calculatedHeight);
        };

        const observer = new ResizeObserver(([entry]) => {
            const { height } = entry.contentRect;
            compute(height);
        });

        observer.observe(wrapper);
        const rect = wrapper.getBoundingClientRect();
        compute(rect.height);

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={sidebarWrapperRef} className="relative shrink-0 bg-background" style={{ width: '90px' }} role="complementary" aria-label={t("tools.toolbar")}>
            <aside
                className="absolute top-1/2 left-12 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-4 squircle-element-xl border border-border dark:border-white/10 z-40 bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,#ececec_64%)] dark:bg-[radial-gradient(circle_at_50%_30%,#2a2a2a_0%,#131313_64%)] shadow-[2px_5px_10px_0px_rgba(0,0,0,0.12)] dark:shadow-[2px_5px_10px_0px_rgba(255,255,255,0.22)]"
                style={{
                    height: sidebarHeight ? `${sidebarHeight}px` : 'calc(100% - 1rem)',
                    maxHeight: sidebarHeight ? `${sidebarHeight}px` : '800px',
                    minWidth: '70px',
                }}
                role="toolbar"
                aria-orientation="vertical"
                aria-label={t("tools.toolbar")}
            >

                <div className="flex flex-col gap-4 w-full overflow-y-auto px-2 custom-scrollbar mask-y-from-85% mask-y-to-99%">
                    <div className="shrink-0 h-12" aria-hidden="true" />
                    <SidebarTool
                        icon="solar:gallery-wide-linear"
                        label={t("tools.background")}
                        isActive={activeTool === "screenshot"}
                        onClick={() => onToolChange("screenshot")}
                        popover={{
                            title: t("popovers.background.title"),
                            description: t("popovers.background.description"),
                            videoSrc: "/videos/preview-menu/background.mp4"
                        }}
                    />
                    <SidebarTool
                        icon="hugeicons:ai-browser"
                        label={t("tools.mockup")}
                        isActive={activeTool === "mockup"}
                        onClick={() => onToolChange("mockup")}
                        popover={{
                            title: t("popovers.mockup.title"),
                            description: t("popovers.mockup.description"),
                            videoSrc: "/videos/preview-menu/mockup.mp4"
                        }}
                    />

                    {!isPhotoMode && (
                        <>
                            <SidebarTool
                                icon="mage:box-3d"
                                label={t("tools.motion")}
                                isActive={activeTool === "motion"}
                                onClick={() => onToolChange("motion")}
                                popover={{
                                    title: t("popovers.motion.title"),
                                    description: t("popovers.motion.description"),
                                    videoSrc: "/videos/preview-menu/motion.mp4"
                                }}
                                badge={t("tools.newTool")}
                                badgeStyle="premium"
                            />
                            <SidebarTool
                                icon="iconamoon:zoom-in-bold"
                                label={t("tools.zoom")}
                                isActive={activeTool === "zoom"}
                                onClick={() => onToolChange("zoom")}
                                ref={zoomToolRef}
                                popover={{
                                    title: t("popovers.zoom.title"),
                                    description: t("popovers.zoom.description"),
                                    videoSrc: "/videos/preview-menu/zoom.mp4"
                                }}
                            />
                            <SidebarTool
                                icon="solar:video-library-outline"
                                label={t("tools.videos")}
                                isActive={activeTool === "video"}
                                onClick={() => onToolChange("video")}
                                ref={videosToolRef}
                                badgeCount={newVideosCount}
                                popover={{
                                    title: t("popovers.videos.title"),
                                    description: t("popovers.videos.description"),
                                    videoSrc: "/videos/preview-menu/videos.mp4"
                                }}
                            />
                        </>
                    )}

                    <SidebarTool
                        label={t("tools.elements")}
                        isActive={activeTool === "elements"}
                        onClick={() => onToolChange("elements")}
                        ref={elementsToolRef}
                        popover={{
                            title: t("popovers.elements.title"),
                            description: t("popovers.elements.description"),
                            videoSrc: "/videos/preview-menu/elements.mp4",
                        }}
                        icon={
                            <ElementsIcon
                                width={24}
                                height={24}
                                className="transition-colors duration-200"
                            />
                        }
                    />

                    <SidebarTool
                        icon="solar:projector-linear"
                        label="Projector"
                        isActive={activeTool === "projector"}
                        onClick={() => onToolChange("projector")}
                        popover={{
                            title: "Projector Mapping",
                            description: "Send canvas to projector display with corner-pin warp",
                            videoSrc: "/videos/preview-menu/background.mp4"
                        }}
                        badge="NEW"
                        badgeStyle="premium"
                    />

                    {isPhotoMode && (
                        <SidebarTool
                            icon="material-symbols:history"
                            label={t("photo.library")}
                            isActive={activeTool === "history"}
                            onClick={() => onToolChange("history")}
                            popover={{
                                title: t("popovers.history.title"),
                                description: t("popovers.history.description"),
                                videoSrc: "/videos/preview-menu/history.mp4"
                            }}
                        />
                    )}

                    {!isPhotoMode && (
                        <>
                            <SidebarTool
                                icon="mdi:volume-high"
                                label={t("tools.audio")}
                                isActive={activeTool === "audio"}
                                onClick={() => onToolChange("audio")}
                                ref={audioToolRef}
                                popover={{
                                    title: t("popovers.audio.title"),
                                    description: t("popovers.audio.description"),
                                    videoSrc: "/videos/preview-menu/audio.mp4"
                                }}
                            />
                            {hasCamera && (
                                <SidebarTool
                                    icon="solar:videocamera-record-bold-duotone"
                                    label={t("tools.camera")}
                                    isActive={activeTool === "camera"}
                                    onClick={() => onToolChange("camera")}
                                    ref={cameraToolRef}
                                    popover={{
                                        title: t("popovers.camera.title"),
                                        description: t("popovers.camera.description"),
                                        videoSrc: "/videos/preview-menu/camera.mp4"
                                    }}
                                />
                            )}
                        </>
                    )}
                    <div className="shrink-0 h-12" aria-hidden="true" />
                </div>

                {!isPhotoMode && (
                    <div
                        className="w-full p-2 relative flex flex-col items-center gap-1 shrink-0"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="absolute -top-0.5 left-0 w-full border-t border-border" />

                        {showMobileAlert && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive z-50">
                                {t("alerts.mobile")}
                            </div>
                        )}

                        <TooltipAction label={isIdle ? t("recording.idle") : t("recording.inProgress")}>
                            <button
                                onClick={handleStartRecording}
                                disabled={!isIdle}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 squircle-element-camera cursor-pointer transition-all group border-2 border-transparent disabled:cursor-not-allowed ${!isIdle ? "opacity-70" : "hover:bg-red-500/10"
                                    }`}
                            >
                                <Icon icon={recordButtonContent.icon} width="24" height="24" className={`transition-colors ${recordButtonContent.className}`} />
                                <span className={`text-xs font-medium transition-colors ${!isIdle ? recordButtonContent.className : "text-muted-foreground group-hover:text-red-500"
                                    }`}>
                                    {recordButtonContent.text}
                                </span>
                            </button>
                        </TooltipAction>

                        <TooltipAction label={isUploading ? t("upload.tooltipUploading") : t("upload.tooltip")}>
                            <button
                                onClick={handleUploadClick}
                                disabled={isUploading}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 squircle-element-camera cursor-pointer transition-all group disabled:opacity-50 disabled:cursor-not-allowed border-2 ${isDragging
                                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-dashed border-blue-400/50 scale-105"
                                    : "border-transparent text-muted-foreground hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400"
                                    }`}
                                aria-label={isUploading ? t("upload.buttonUploading") : t("upload.button")}
                            >
                                {isUploading ? (
                                    <>
                                        <Icon icon="svg-spinners:ring-resize" className="transition-transform duration-300" width="24" height="24" aria-hidden="true" />
                                        <span className="text-xs font-medium">{t("upload.buttonUploading")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="mage:video-upload" className={`transition-transform duration-300 ${!isDragging && "group-hover:scale-105"}`} width="24" height="24" aria-hidden="true" />
                                        <span className="text-xs font-medium">
                                            {isDragging ? t("upload.dropHere") : t("upload.button")}
                                        </span>
                                    </>
                                )}
                            </button>
                        </TooltipAction>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                )}

                {isPhotoMode && (
                    <div
                        className="w-full p-2 relative flex flex-col items-center gap-1 shrink-0"
                        onDragOver={handleImageDragOver}
                        onDragLeave={handleImageDragLeave}
                        onDrop={handleImageDrop}
                    >
                        <div className="absolute -top-0.5 left-0 w-full border-t border-border" />

                        <TooltipAction label={t("photo.captureTooltip")}>
                            <button
                                onClick={onScreenCapture}
                                disabled={isCapturing}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 squircle-element-camera cursor-pointer transition-all group border-2 border-transparent disabled:cursor-not-allowed ${isCapturing ? "opacity-70" : "hover:bg-cyan-500/10"
                                    }`}
                                aria-label={isCapturing ? t("photo.capturing") : t("photo.capture")}
                            >
                                <Icon
                                    icon={isCapturing ? "svg-spinners:ring-resize" : "fluent:screenshot-20-regular"}
                                    width="24"
                                    aria-hidden="true"
                                    height="24"
                                    className={`transition-colors ${isCapturing ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400"}`}
                                />
                                <span className={`text-xs font-medium transition-colors ${isCapturing ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400"
                                    }`}>
                                    {isCapturing ? t("photo.capturing") : t("photo.capture")}
                                </span>
                            </button>
                        </TooltipAction>

                        <TooltipAction label={t("photo.uploadTooltip")}>
                            <button
                                onClick={handleImageUploadClick}
                                disabled={isUploading}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 squircle-element-camera cursor-pointer transition-all group disabled:opacity-50 disabled:cursor-not-allowed border-2 ${isImageDragging
                                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-dashed border-blue-400/50 scale-105"
                                    : "border-transparent text-muted-foreground hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400"
                                    }`}
                            >
                                {isUploading ? (
                                    <>
                                        <Icon icon="svg-spinners:ring-resize" className="transition-transform duration-300" width="24" height="24" />
                                        <span className="text-xs font-medium">{t("photo.uploading")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="mage:image-upload" className={`transition-transform duration-300 ${!isImageDragging && "group-hover:scale-105"}`} width="24" height="24" />
                                        <span className="text-xs font-medium">
                                            {isImageDragging ? t("photo.dropHere") : t("photo.upload")}
                                        </span>
                                    </>
                                )}
                            </button>
                        </TooltipAction>

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={handleImageFileChange}
                        />
                    </div>
                )}
            </aside>

            {!isPhotoMode && (
                <RecordingSetupDialog
                    open={setupDialogOpen}
                    onClose={() => setSetupDialogOpen(false)}
                    onStart={(config) => startCountdown(config)}
                />
            )}
        </div>
    );
}