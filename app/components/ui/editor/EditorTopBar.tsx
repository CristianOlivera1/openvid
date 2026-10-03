"use client";

import { EDITOR_WITHOUT_AUTH } from "@/app/config/editor";
import { Icon } from "@iconify/react";
import { ExportDropdown } from "../ExportDropdown";
import { ExportImageDropdown } from "../ExportImageDropdown";
import type { ExportQuality, ExportProgress } from "@/types";
import type { EditorMode } from "@/types/editor-mode.types";
import type { ImageExportFormat } from "@/types/image-project.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/useAuth";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { UserMenuDropdown } from "@/app/components/common/UserMenuDropdown";

interface ImageExportProgress {
    status: "idle" | "preparing" | "rendering" | "complete" | "error";
    progress: number;
    message: string;
}

interface EditorTopBarProps {
    onExport: (quality: ExportQuality, fps?: number, bitrate?: number) => void;
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
    const { user, profile, loading } = useAuth();

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
        <div className="h-13 border-b border-border flex items-center justify-between px-3 shrink-0 relative">
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

            <div className="flex items-center ml-auto">
                <div className="flex items-center gap-2 border-r border-border pr-3">
                    <TooltipAction label={canUndo ? t("history.undo") : t("history.noUndo")}>
                        <button
                            onClick={() => onUndo?.()}
                            disabled={!canUndo}
                            className={`transition-colors ${canUndo ? "hover:text-foreground text-muted-foreground" : "opacity-40 cursor-not-allowed text-muted-foreground/50"
                                }`}
                        >
                            <Icon icon="mdi:undo" width="20" />
                        </button>
                    </TooltipAction>
                    <TooltipAction label={canRedo ? t("history.redo") : t("history.noRedo")}>
                        <button
                            onClick={() => onRedo?.()}
                            disabled={!canRedo}
                            className={`transition-colors ${canRedo ? "hover:text-foreground text-muted-foreground" : "opacity-40 cursor-not-allowed text-muted-foreground/50"
                                }`}
                        >
                            <Icon icon="mdi:redo" width="20" />
                        </button>
                    </TooltipAction>
                </div>

                {EDITOR_WITHOUT_AUTH ? null : loading ? (
                    <div className="flex items-center gap-2 pl-3 border-l border-border ml-1">
                        <div className="hidden sm:flex flex-col items-end gap-1.5">
                            <div className="w-16 h-2.5 bg-muted rounded-sm animate-pulse"></div>
                            <div className="w-24 h-2 bg-muted rounded-sm animate-pulse"></div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse border border-border shrink-0"></div>
                    </div>
                ) : !user ? (
                    <div className="pr-2 flex items-center h-8">
                        <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                            {t("auth.access")}
                        </Link>
                    </div>
                ) : (
                    <UserMenuDropdown
                        showTheme
                        editorMode={editorMode}
                        trigger={
                            <button
                                className="flex items-center gap-1.5 px-2 border-border hover:opacity-80 transition-opacity focus:outline-none"
                                aria-label={t("auth.userMenu")}
                            >
                                <div className="h-8 w-8 rounded-full border border-border bg-muted overflow-hidden shrink-0 relative">
                                    <Image src={avatarUrl} alt={displayName} fill sizes="32px" className="object-cover" unoptimized />
                                </div>
                                <Icon icon="mdi:chevron-down" width="16" className="text-muted-foreground" />
                            </button>
                        }
                    />
                )}

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
            </div>
        </div>
    );
}