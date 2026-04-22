"use client";

import { Icon } from "@iconify/react";
import { SidebarTool } from "../SidebarTool";
import type { ToolsSidebarProps } from "@/types/tool-sidebar.types";
import type { EditorMode } from "@/types/editor-mode.types";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { useRecording } from "@/hooks/RecordingContext";
import RecordingSetupDialog from "../RecordingSetupDialog";

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
    // Photo mode props
    onImageUpload?: (file: File) => void;
    onScreenCapture?: () => void;
    isCapturing?: boolean;
}

export function ToolsSidebar({
    activeTool,
    onToolChange,
    onVideoUpload,
    isUploading = false,
    isCursorEnabled = false,
    selectedZoomFragmentId,
    selectedAudioTrackId,
    selectedVideoClipId,
    selectedElementId,
    newVideosCount = 0,
    editorMode = "video",
    // Photo mode props
    onImageUpload,
    onScreenCapture,
    isCapturing = false,
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

    // Determine if we're in photo mode to hide video-specific tools
    const isPhotoMode = editorMode === "photo";

    useEffect(() => {
        if (newVideosCount > 0 && videosToolRef.current && activeTool !== "videos") {
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

    // Photo mode handlers
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
            return { icon: "svg-spinners:ring-resize", text: t("recording.preparing"), className: "text-orange-400" };
        }
        if (isRecording) {
            return { icon: "fluent:record-20-filled", text: t("recording.recording"), className: "text-red-400 animate-pulse" };
        }
        if (isProcessing) {
            return { icon: "svg-spinners:ring-resize", text: t("recording.processing"), className: "text-blue-400" };
        }
        return { icon: "fluent:screenshot-record-16-regular", text: t("recording.start"), className: "group-hover:text-red-400" };
    };

    const recordButtonContent = getRecordButtonContent();

    return (
        <div className="relative shrink-0 bg-[#141417]" style={{ width: '90px' }}>
            <div className="h-13 border-b border-white/10 w-full" />
            <aside
                className="h-full absolute top-1/2 left-12 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-4 squircle-element border shadow-md shadow-white/20 border-white/10 z-40 max-h-154 3xl:max-h-[800px]"
                style={{
                    height: 'calc(100% - 2rem)',
                    minWidth: '70px',
                    background: 'radial-gradient(circle at 50% 30%, #2a2a2a 0%, #131313 64%)',
                }}
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
                            videoSrc: "/videos/preview-background.mp4"
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
                            videoSrc: "/videos/preview-mockup.mp4"
                        }}
                    />

                    {/* Video-specific tools - hidden in photo mode */}
                    {!isPhotoMode && (
                        <SidebarTool
                            icon="solar:video-library-outline"
                            label={t("tools.videos")}
                            isActive={activeTool === "videos"}
                            onClick={() => onToolChange("videos")}
                            ref={videosToolRef}
                            badgeCount={activeTool !== "videos" ? newVideosCount : undefined}
                            popover={{
                                title: t("popovers.videos.title"),
                                description: t("popovers.videos.description"),
                                videoSrc: "/videos/preview-videos.mp4"
                            }}
                        />
                    )}

                    <SidebarTool
                        label={t("tools.elements")}
                        isActive={activeTool === "elements"}
                        onClick={() => onToolChange("elements")}
                        ref={elementsToolRef}
                        popover={{
                            title: t("popovers.elements.title"),
                            description: t("popovers.elements.description"),
                            videoSrc: "/videos/preview-elements.mp4"
                        }}
                        icon={
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-colors duration-200" >
                                <path d="M11 13.5V21.5H3V13.5H11ZM9 15.5H5V19.5H9V15.5ZM12 2L17.5 11H6.5L12 2ZM12 5.86L10.08 9H13.92L12 5.86Z" fill="currentColor" stroke="currentColor" strokeWidth="0.2" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M13.7667 13.8246C13.7667 13.6323 13.8431 13.4479 13.9791 13.312C14.115 13.176 14.2994 13.0996 14.4917 13.0996H20.2917C20.484 13.0996 20.6684 13.176 20.8044 13.312C20.9403 13.4479 21.0167 13.6323 21.0167 13.8246V14.7913C21.0167 14.9836 20.9403 15.168 20.8044 15.3039C20.6684 15.4399 20.484 15.5163 20.2917 15.5163C20.0994 15.5163 19.915 15.4399 19.7791 15.3039C19.6431 15.168 19.5667 14.9836 19.5667 14.7913V14.5496H18.1167V20.3496H18.3584C18.5507 20.3496 18.7351 20.426 18.871 20.562C19.007 20.6979 19.0834 20.8823 19.0834 21.0746C19.0834 21.2669 19.007 21.4513 18.871 21.5873C18.7351 21.7232 18.5507 21.7996 18.3584 21.7996H16.4251C16.2328 21.7996 16.0484 21.7232 15.9124 21.5873C15.7764 21.4513 15.7001 21.2669 15.7001 21.0746C15.7001 20.8823 15.7764 20.6979 15.9124 20.562C16.0484 20.426 16.2328 20.3496 16.4251 20.3496H16.6667V14.5496H15.2167V14.7913C15.2167 14.9836 15.1403 15.168 15.0044 15.3039C14.8684 15.4399 14.684 15.5163 14.4917 15.5163C14.2994 15.5163 14.115 15.4399 13.9791 15.3039C13.8431 15.168 13.7667 14.9836 13.7667 14.7913V13.8246Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
                            </svg>
                        }
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
                                videoSrc: "/videos/preview-history.mp4"
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
                                    videoSrc: "/videos/preview-audio.mp4"
                                }}
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
                                    videoSrc: "/videos/preview-zoom.mp4"
                                }}
                            />

                            <SidebarTool
                                icon="solar:videocamera-record-bold-duotone"
                                label={t("tools.camera")}
                                isActive={activeTool === "camera"}
                                onClick={() => onToolChange("camera")}
                                ref={cameraToolRef}
                                popover={{
                                    title: t("popovers.camera.title"),
                                    description: t("popovers.camera.description"),
                                    videoSrc: "/videos/preview-camera.mp4"
                                }}
                            />

                            <SidebarTool
                                icon="solar:cursor-bold-duotone"
                                label={t("tools.cursor")}
                                isActive={activeTool === "cursor"}
                                onClick={() => onToolChange("cursor")}
                                badge={!isCursorEnabled ? t("tools.soon") : undefined}
                                disabled={!isCursorEnabled}
                            />
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
                        <div className="absolute -top-0.5 left-0 w-full border-t border-white/10" />

                        {showMobileAlert && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 z-50">
                                {t("alerts.mobile")}
                            </div>
                        )}

                        <TooltipAction label={isIdle ? t("recording.idle") : t("recording.inProgress")}>
                            <button
                                onClick={handleStartRecording}
                                disabled={!isIdle}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all group border-2 border-transparent disabled:cursor-not-allowed ${!isIdle ? "opacity-70" : "hover:bg-red-500/10"}`}
                            >
                                <Icon icon={recordButtonContent.icon} width="24" height="24" className={`transition-colors ${recordButtonContent.className}`} />
                                <span className={`text-xs font-medium transition-colors ${!isIdle ? recordButtonContent.className : "text-white/60 group-hover:text-red-400"}`}>
                                    {recordButtonContent.text}
                                </span>
                            </button>
                        </TooltipAction>

                        <TooltipAction label={isUploading ? t("upload.tooltipUploading") : t("upload.tooltip")}>
                            <button
                                onClick={handleUploadClick}
                                disabled={isUploading}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all group disabled:opacity-50 disabled:cursor-not-allowed border-2 ${isDragging ? "bg-blue-500/20 text-blue-400 border-dashed border-blue-400/50 scale-105" : "border-transparent text-white/60 hover:bg-blue-500/20 hover:text-blue-400"}`}
                            >
                                {isUploading ? (
                                    <>
                                        <Icon icon="svg-spinners:ring-resize" className="transition-transform duration-300" width="24" height="24" />
                                        <span className="text-xs font-medium">{t("upload.buttonUploading")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="mage:video-upload" className={`transition-transform duration-300 ${!isDragging && "group-hover:scale-105"}`} width="24" height="24" />
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
                        <div className="absolute -top-0.5 left-0 w-full border-t border-white/10" />

                        <TooltipAction label={t("photo.captureTooltip")}>
                            <button
                                onClick={onScreenCapture}
                                disabled={isCapturing}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all group border-2 border-transparent disabled:cursor-not-allowed ${isCapturing ? "opacity-70" : "hover:bg-cyan-500/10"}`}
                            >
                                <Icon
                                    icon={isCapturing ? "svg-spinners:ring-resize" : "fluent:screenshot-20-regular"}
                                    width="24"
                                    height="24"
                                    className={`transition-colors ${isCapturing ? "text-cyan-400" : "text-white/60 group-hover:text-cyan-400"}`}
                                />
                                <span className={`text-xs font-medium transition-colors ${isCapturing ? "text-cyan-400" : "text-white/60 group-hover:text-cyan-400"}`}>
                                    {isCapturing ? t("photo.capturing") : t("photo.capture")}
                                </span>
                            </button>
                        </TooltipAction>

                        <TooltipAction label={t("photo.uploadTooltip")}>
                            <button
                                onClick={handleImageUploadClick}
                                disabled={isUploading}
                                className={`w-full flex flex-col items-center text-center justify-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all group disabled:opacity-50 disabled:cursor-not-allowed border-2 ${isImageDragging ? "bg-blue-500/20 text-blue-400 border-dashed border-blue-400/50 scale-105" : "border-transparent text-white/60 hover:bg-blue-500/20 hover:text-blue-400"}`}
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