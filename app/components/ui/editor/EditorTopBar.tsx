"use client";

import { Icon } from "@iconify/react";
import { ExportDropdown } from "../ExportDropdown";
import { ExportImageDropdown } from "../ExportImageDropdown";
import type { ExportQuality, ExportProgress } from "@/types";
import type { EditorMode } from "@/types/editor-mode.types";
import type { ImageExportFormat } from "@/types/image-project.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { TooltipAction } from "@/components/ui/tooltip-action";

interface ImageExportProgress {
    status: "idle" | "preparing" | "rendering" | "complete" | "error";
    progress: number;
    message: string;
}

interface EditorTopBarProps {
    onExport: (quality: ExportQuality) => void;
    exportProgress: ExportProgress;
    hasTransparentBackground?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    // Photo mode props
    editorMode?: EditorMode;
    onImageExport?: (format: ImageExportFormat, quality: number, scale: number) => void;
    imageExportProgress?: ImageExportProgress;
    canvasWidth?: number;
    canvasHeight?: number;
}

export function EditorTopBar({
    onExport,
    exportProgress,
    hasTransparentBackground,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    editorMode = "video",
    onImageExport,
    imageExportProgress,
    canvasWidth = 1920,
    canvasHeight = 1080,
}: EditorTopBarProps) {
    const isPhotoMode = editorMode === "photo";
    const t = useTranslations("editor.topBar");
    const [showAlert, setShowAlert] = useState(false);
    const [prevStatus, setPrevStatus] = useState<string>(exportProgress.status);
    const { user, profile, signOut, loading } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleSignOut = async () => {
        setIsLoggingOut(true);
        try {
            await signOut();
            window.location.href = "/";
        } catch (error) {
            console.error("Error signing out:", error);
            setIsLoggingOut(false);
        }
    };

    const meta = user?.user_metadata || {};
    const displayName =
        profile?.first_name ||
        profile?.full_name ||
        meta.full_name ||
        meta.name ||
        user?.email?.split("@")[0] ||
        t("auth.defaultUser");

    const avatarUrl =
        profile?.avatar_url ||
        meta.avatar_url ||
        meta.picture ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

    const provider = profile?.provider || meta.provider || "email";

    if (exportProgress.status !== prevStatus) {
        setPrevStatus(exportProgress.status);
        if (exportProgress.status === "error") {
            setShowAlert(true);
        } else {
            setShowAlert(false);
        }
    }

    useEffect(() => {
        if (showAlert) {
            const timer = setTimeout(() => {
                setShowAlert(false);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [showAlert]);

    return (
        <div className="h-13 border-b border-white/10 flex items-center justify-between px-4 shrink-0 relative">
            {showAlert && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-md z-200 px-4 animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
                    <Alert variant="info" className="relative border-red-500/50 bg-red-950/95 backdrop-blur-lg shadow-2xl overflow-hidden">
                        <button
                            onClick={() => setShowAlert(false)}
                            className="absolute top-3 right-3 p-1 rounded-md text-white hover:text-red-100 hover:bg-white/10 transition-all duration-200 group"
                            aria-label={t("exportError.close")}
                        >
                            <Icon icon="lucide:x" className="h-4 w-4" />
                        </button>
                        <Icon icon="lucide:alert-circle" className="h-4 w-4 text-red-400" />
                        <div className="pr-6">
                            <AlertTitle className="text-red-100 font-medium">{t("exportError.title")}</AlertTitle>
                            <AlertDescription className="flex flex-col gap-2 mt-1">
                                <span className="text-red-200/90 text-xs">{exportProgress.message}</span>
                                <span className="text-xs leading-tight text-white/90">
                                    {t("exportError.tip")}
                                </span>
                            </AlertDescription>
                        </div>
                    </Alert>
                </div>
            )}

            <div className="flex-1"></div>

            <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                    <TooltipAction label={canUndo ? t("history.undo") : t("history.noUndo")}>
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`transition-colors ${canUndo ? "hover:text-white text-white/70" : "opacity-30 cursor-not-allowed text-white/30"
                                }`}
                        >
                            <Icon icon="mdi:undo" width="20" />
                        </button>
                    </TooltipAction>
                    <TooltipAction label={canRedo ? t("history.redo") : t("history.noRedo")}>
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`transition-colors ${canRedo ? "hover:text-white text-white/70" : "opacity-30 cursor-not-allowed text-white/60"
                                }`}
                        >
                            <Icon icon="mdi:redo" width="20" />
                        </button>
                    </TooltipAction>
                </div>

                {isPhotoMode && onImageExport && imageExportProgress ? (
                    <ExportImageDropdown
                        onExport={onImageExport}
                        exportProgress={imageExportProgress}
                        hasTransparentBackground={hasTransparentBackground}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                    />
                ) : (
                    <ExportDropdown
                        onExport={onExport}
                        exportProgress={exportProgress}
                        hasTransparentBackground={hasTransparentBackground}
                    />
                )}

                {loading ? (
                    <div className="flex items-center gap-2 pl-3 border-l border-white/10 ml-1">
                        <div className="hidden sm:flex flex-col items-end gap-1.5">
                            <div className="w-16 h-2.5 bg-white/10 rounded-sm animate-pulse"></div>
                            <div className="w-24 h-2 bg-white/10 rounded-sm animate-pulse"></div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse border border-white/10 shrink-0"></div>
                    </div>
                ) : !user ? (
                    <div className="pl-3 border-l border-white/10 ml-1 flex items-center h-8">
                        <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                            {t("auth.signIn")}
                        </Link>
                    </div>
                ) : (
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button
                                className="flex items-center gap-2 pl-3 border-l border-white/10 ml-1 hover:opacity-80 transition-opacity focus:outline-none"
                                aria-label={t("auth.userMenu")}
                            >
                                <div className="hidden sm:flex flex-col items-end leading-none">
                                    <span className="text-[11px] font-medium text-white max-w-25 truncate">{displayName}</span>
                                    <span className="text-[10px] text-neutral-500 max-w-30 truncate">{user.email}</span>
                                </div>
                                <div className="h-8 w-8 rounded-full border border-white/10 bg-neutral-900 overflow-hidden shrink-0 relative">
                                    <Image src={avatarUrl} alt={displayName} fill sizes="32px" className="object-cover" unoptimized />
                                </div>
                            </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="min-w-55 bg-black border border-white/25 rounded-lg shadow-xl p-1 z-9999"
                                sideOffset={5}
                                align="end"
                            >
                                <div className="px-3 py-2 border-b border-white/10">
                                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                                    <p className="text-xs text-neutral-500 mt-1 capitalize">
                                        {t("auth.connectedWith", { provider })}
                                    </p>
                                </div>
                                <DropdownMenu.Item asChild>
                                    <Link
                                        href="/"
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer outline-none"
                                    >
                                        <Icon icon="hugeicons:home-11" className="size-4" />
                                        {t("auth.home")}
                                    </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item asChild>
                                    <Link
                                        href="/editor"
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer outline-none"
                                    >
                                        <Icon icon="solar:video-frame-cut-2-linear" className="size-4" />
                                        {t("auth.editor")}
                                    </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
                                <DropdownMenu.Item asChild>
                                    <button
                                        onClick={handleSignOut}
                                        disabled={isLoggingOut}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Icon icon="solar:logout-2-linear" className="size-4" />
                                        {isLoggingOut ? t("auth.signingOut") : t("auth.signOut")}
                                    </button>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                )}
            </div>
        </div>
    );
}