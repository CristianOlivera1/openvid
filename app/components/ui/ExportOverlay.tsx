"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import type { ExportProgress } from "@/types";

export type { ExportProgress };

interface ExportOverlayProps {
    exportProgress: ExportProgress;
    onCancel: () => void;
    isTransparentExport?: boolean;
}

const emptySubscribe = () => () => { };
function useIsClient() {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );
}

export function ExportOverlay({
    exportProgress,
    onCancel,
    isTransparentExport,
}: ExportOverlayProps) {
    const t = useTranslations("exportOverlay");
    const isClient = useIsClient();

    const isExporting =
        exportProgress.status !== "idle" &&
        exportProgress.status !== "complete" &&
        exportProgress.status !== "error";

    if (!isExporting || !isClient) return null;

    const getStatusMessage = () => {
        if (exportProgress.step) {
            switch (exportProgress.step) {
                case "capturing":
                    return t("status.capturing");
                case "encoding":
                    return t("status.encoding");
                case "encodingWebM":
                    return t("status.encodingWebM");
                case "preparing":
                    return t("status.preparing");
                case "finalizing":
                    return t("status.finalizing");
            }
        }

        switch (exportProgress.status) {
            case "preparing":
                return t("status.preparing");
            case "encoding":
                return exportProgress.message.startsWith("[1/2]")
                    ? t("status.capturing")
                    : t("status.encoding");
            case "finalizing":
                return exportProgress.message.startsWith("[2/2]")
                    ? t("status.encodingWebM")
                    : t("status.finalizing");
            default:
                return "";
        }
    };

    const cleanMessage = exportProgress.message.replace(/^\[\d\/\d\]\s*/, "");

    const modalContent = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-overlay-title"
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/20 backdrop-blur-md transition-all duration-500"
        >
            <div className="p-10 bg-popover dark:bg-black border border-border squircle-element-camera shadow-[0_0_80px_-15px_rgba(0,0,0,1)] w-full max-w-lg mx-4">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2.5 px-3 py-1 bg-muted border border-border rounded-full">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                            {t("processing")}
                        </span>
                    </div>
                </div>

                <div
                    className="text-center mb-8"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    <h2
                        id="export-overlay-title"
                        className="text-7xl font-bold tracking-tighter text-foreground tabular-nums"
                    >
                        {exportProgress.progress}
                        <span className="text-2xl text-muted-foreground ml-1">%</span>
                    </h2>
                </div>

                <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden mb-8">
                    <div
                        className="absolute inset-0 bg-foreground origin-left transition-transform duration-300 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{
                            transform: `scaleX(${Math.min(Math.max(exportProgress.progress, 0), 100) / 100})`,
                        }}
                    />
                </div>

                {(exportProgress.speedMultiplier || exportProgress.fpsCurrent || exportProgress.etaSeconds !== undefined) && (
                    <div className="flex items-center justify-between gap-2 p-3 mb-8 bg-muted/70 dark:bg-muted/40 border border-border/80 rounded-2xl text-[12px] font-mono">
                        {exportProgress.speedMultiplier ? (
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                                <Icon icon="lucide:zap" width="14" />
                                <span>{exportProgress.speedMultiplier}x ({exportProgress.fpsCurrent} FPS)</span>
                            </div>
                        ) : null}

                        {exportProgress.currentFrame && exportProgress.totalFrames ? (
                            <div className="flex items-center gap-1 text-muted-foreground/80">
                                <Icon icon="lucide:film" width="13" />
                                <span>{exportProgress.currentFrame}/{exportProgress.totalFrames}</span>
                            </div>
                        ) : null}

                        {exportProgress.etaSeconds !== undefined && exportProgress.etaSeconds >= 0 ? (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Icon icon="lucide:clock" width="13" />
                                <span>ETA: {exportProgress.etaSeconds}s</span>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="space-y-4 mb-10">
                    <div className="flex flex-col gap-2 border-l-2 border-border pl-5 py-1">
                        <p className="text-lg font-medium tracking-tight leading-none shimmer-text">
                            {getStatusMessage()}
                        </p>
                        {cleanMessage && (
                            <p className="text-sm text-muted-foreground/60 font-mono italic mt-0.5 tracking-wide">
                                {cleanMessage}
                            </p>
                        )}
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-muted border border-border squircle-element-camera">
                        <Icon
                            icon="lucide:alert-circle"
                            className="text-blue-600 dark:text-blue-500 shrink-0 mt-0.5"
                            width="18"
                        />
                        <p className="text-md text-muted-foreground leading-relaxed">
                            {t.rich("warnings.performance", {
                                highlight: (chunks) => (
                                    <span className="relative inline-block whitespace-nowrap font-bold text-foreground px-1">
                                        {chunks}
                                        <svg
                                            className="absolute -bottom-1 left-0 w-full h-2 text-blue-600 dark:text-blue-500/90"
                                            viewBox="0 0 100 10"
                                            preserveAspectRatio="none"
                                        >
                                            <path
                                                d="M0 5 Q 25 0, 50 5 T 100 5"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                fill="transparent"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </span>
                                ),
                            })}
                        </p>
                    </div>

                    {isTransparentExport && (
                        <div className="flex items-start gap-3 p-4 bg-cyan-500/5 border border-cyan-500/20 squircle-element-camera">
                            <Icon
                                icon="lucide:clock"
                                className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5"
                                width="18"
                            />
                            <p className="text-md text-cyan-600 dark:text-cyan-400/80 leading-relaxed">
                                {t.rich("warnings.transparency", {
                                    highlight: (chunks) => (
                                        <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                            {chunks}
                                        </span>
                                    ),
                                })}
                            </p>
                        </div>
                    )}
                </div>

                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="w-full h-12 bg-transparent hover:bg-red-500/5 border border-border hover:border-red-500/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 text-sm font-medium transition-all duration-300 squircle-element-camera"
                >
                    <Icon icon="iconoir:cancel" width="16" className="mr-2" />
                    {t("actions.cancel")}
                </Button>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}