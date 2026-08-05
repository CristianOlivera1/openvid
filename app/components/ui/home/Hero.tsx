"use client";
import { Icon } from "@iconify/react";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveUploadedVideo, clearVideoTrack } from "@/lib/video-upload-cache";
import { saveUploadedImage } from "@/lib/image-upload-cache";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import GitHubBadge from "@/components/ui/GitHubStars";
import { useAuth } from "@/app/contexts/useAuth";

interface HeroProps {
    onVideoUpload?: (file: File) => void;
    onPhotoUpload?: (file: File) => void;
}

export default function Hero({ onVideoUpload, onPhotoUpload }: HeroProps) {
    const t = useTranslations("hero");
    const locale = useLocale();
    const router = useRouter();
    const { user, loading: isAuthLoading } = useAuth();

    const videoInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingVideo, setIsDraggingVideo] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);

    const handleVideoFile = useCallback(
        async (file: File) => {
            if (!file.type.startsWith("video/") || isAuthLoading) return;
            setIsUploadingVideo(true);
            try {
                await saveUploadedVideo(file);
                await clearVideoTrack();
                if (onVideoUpload) {
                    onVideoUpload(file);
                }
                const editorPath = `/${locale}/editor?mode=video`;
                if (!user) {
                    router.push(`/${locale}/login?redirectedFrom=${encodeURIComponent(editorPath)}&autoupload=1`);
                    return;
                }
                router.push(`${editorPath}&autoupload=1`);
            } catch (error) {
                console.error("Error uploading video:", error);
                setIsUploadingVideo(false);
            }
        },
        [isAuthLoading, locale, onVideoUpload, router, user]
    );

    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleVideoFile(file);
        e.target.value = "";
    };

    const handleVideoDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVideo(true);
    };

    const handleVideoDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVideo(false);
    };

    const handleVideoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVideo(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleVideoFile(file);
    };

    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const handlePhotoFile = useCallback(
        async (file: File) => {
            if (!file.type.startsWith("image/")) return;
            setIsUploadingPhoto(true);
            try {
                await saveUploadedImage(file);
                if (onPhotoUpload) {
                    onPhotoUpload(file);
                }
                router.push("/editor?mode=photo");
            } catch (error) {
                console.error("Error uploading photo:", error);
                setIsUploadingPhoto(false);
            }
        },
        [onPhotoUpload, router]
    );

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handlePhotoFile(file);
        e.target.value = "";
    };

    const handlePhotoDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPhoto(true);
    };

    const handlePhotoDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPhoto(false);
    };

    const handlePhotoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPhoto(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handlePhotoFile(file);
    };

    return (
        <>
            <h1 className="animate-reveal text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6 leading-[1.1] drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-10 sm:-translate-y-3 flex items-center justify-center gap-4 h-auto transition-all z-10 whitespace-nowrap">
                    <img
                        src="/svg/version.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-auto w-16 sm:w-18 shadow-2xl select-none align-middle translate-y-[2px]"
                    />

                    <div className="flex items-center shadow-2xl h-full mt-1">
                        <GitHubBadge />
                    </div>
                </div>
                {t.rich("title", {
                    screen: (chunks) => (
                        <span className="relative inline-flex items-center">
                            <span className="sr-only">{chunks}</span>
                            <img
                                src="/svg/mockups.svg"
                                alt=""
                                aria-hidden="true"
                                className="inline-block h-[1.6em] w-auto align-middle translate-y-[0.1em] sm:translate-y-[0.3em]"
                            />
                            <img
                                src="/svg/cursor-animate.svg"
                                className="hidden sm:flex absolute -top-18 sm:-top-25 -right-28 sm:-right-30 h-[4em] w-auto"
                                alt=""
                                aria-hidden="true"
                            />
                        </span>
                    ),
                })}
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-neutral-200 via-neutral-400 to-[#009CF2]">
                    {t("titleHighlight")}
                </span>
            </h1>
            <p className="animate-reveal [animation-delay:150ms] text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                {t("description")}
            </p>

            <div className="animate-reveal [animation-delay:300ms] flex flex-col sm:flex-row items-center justify-center gap-3 mb-2">
                <div className="flex flex-col items-center gap-2 w-full sm:w-72">
                    <div
                        onDragOver={handleVideoDragOver}
                        onDragLeave={handleVideoDragLeave}
                        onDrop={handleVideoDrop}
                        onClick={() => !isUploadingVideo && !isAuthLoading && videoInputRef.current?.click()}
                        className={`relative flex items-center justify-center px-5 squircle-element border-2 border-dashed cursor-pointer transition-all duration-200 text-sm font-medium w-full h-13 ${isDraggingVideo
                            ? "border-blue-400/70 bg-blue-500/10 text-blue-300 scale-[1.02]"
                            : isUploadingVideo || isAuthLoading
                                ? "border-white/20 bg-white/5 text-white/40 cursor-not-allowed"
                                : "border-white/20 bg-white/5 text-white/90 hover:border-white/40 hover:bg-white/10 hover:text-white/80"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-3 pointer-events-none w-full">
                            {isUploadingVideo || isAuthLoading ? (
                                <>
                                    <Icon
                                        icon="svg-spinners:ring-resize"
                                        width="18"
                                        className="text-blue-400 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{t("uploadButtonUploading")}</span>
                                </>
                            ) : isDraggingVideo ? (
                                <>
                                    <Icon
                                        icon="ph:arrow-fat-down-bold"
                                        width="18"
                                        className="text-blue-400 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{t("uploadButtonDragging")}</span>
                                </>
                            ) : (
                                <>
                                    <Icon icon="mage:video-upload" width="22" className="shrink-0" aria-hidden="true" />

                                    <div className="flex items-center gap-2">
                                        <span>{t("uploadButton")}</span>
                                        <span className="text-white/40 text-xs font-mono select-none">
                                            MP4, WebM, MOV
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {isDraggingVideo && (
                            <div className="absolute inset-0 rounded-2xl bg-blue-500/5 blur-sm pointer-events-none" />
                        )}
                    </div>
                    <Link
                        href="/editor?mode=video"
                        className="text-[15px] text-white/70 hover:text-white/80 transition-colors underline decoration-white/30 underline-offset-4"
                    >
                        {t("goToVideoEditor")}
                    </Link>
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                        className="hidden"
                        onChange={handleVideoFileChange}
                        aria-label={t("uploadButton")}
                    />
                </div>

                <div className="flex flex-col items-center gap-2 w-full sm:w-72">
                    <div
                        onDragOver={handlePhotoDragOver}
                        onDragLeave={handlePhotoDragLeave}
                        onDrop={handlePhotoDrop}
                        onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}
                        className={`relative flex items-center justify-center px-5 squircle-element border-2 border-dashed cursor-pointer transition-all duration-200 text-sm font-medium w-full h-13 ${isDraggingPhoto
                            ? "border-red-400/70 bg-red-500/10 text-red-300 scale-[1.02]"
                            : isUploadingPhoto
                                ? "border-white/20 bg-white/5 text-white/40 cursor-not-allowed"
                                : "border-white/20 bg-white/5 text-white/90 hover:border-white/40 hover:bg-white/10 hover:text-white/80"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-3 pointer-events-none w-full">
                            {isUploadingPhoto ? (
                                <>
                                    <Icon
                                        icon="svg-spinners:ring-resize"
                                        width="18"
                                        className="text-red-400 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{t("uploadPhotoUploading")}</span>
                                </>
                            ) : isDraggingPhoto ? (
                                <>
                                    <Icon
                                        icon="ph:arrow-fat-down-bold"
                                        width="18"
                                        className="text-red-400 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{t("uploadPhotoDragging")}</span>
                                </>
                            ) : (
                                <>
                                    <Icon
                                        icon="solar:gallery-wide-linear"
                                        width="20"
                                        className="shrink-0"
                                        aria-hidden="true"
                                    />

                                    <div className="flex items-center gap-2">
                                        <span>{t("uploadPhotoButton")}</span>
                                        <span className="text-white/40 text-xs font-mono select-none">
                                            JPG, PNG, WEBP
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {isDraggingPhoto && (
                            <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-sm pointer-events-none" />
                        )}
                    </div>
                    <Link
                        href="/editor?mode=photo"
                        className="text-[15px] text-white/70 hover:text-white/80 transition-colors underline decoration-white/30 underline-offset-4"
                    >
                        {t("goToPhotoEditor")}
                    </Link>
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handlePhotoFileChange}
                        aria-label={t("uploadPhotoButton")}
                    />
                </div>
            </div>
        </>
    );
}
