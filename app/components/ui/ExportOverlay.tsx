"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

interface ExportProgress {
    status: "idle" | "preparing" | "encoding" | "finalizing" | "complete" | "error";
    progress: number;
    message: string;
}

interface ExportOverlayProps {
    exportProgress: ExportProgress;
    onCancel: () => void;
    isTransparentExport?: boolean;
}

export function ExportOverlay({ exportProgress, onCancel, isTransparentExport }: ExportOverlayProps) {
    const t = useTranslations("exportOverlay");

    const isExporting = exportProgress.status !== "idle" &&
        exportProgress.status !== "complete" &&
        exportProgress.status !== "error";

    if (!isExporting) return null;

    const getStatusMessage = () => {
        switch (exportProgress.status) {
            case "preparing":
                return t("status.preparing");
            case "encoding":
                return exportProgress.message.startsWith("[Paso 1/2]")
                    ? t("status.capturing")
                    : t("status.encoding");
            case "finalizing":
                return exportProgress.message.startsWith("[Paso 2/2]")
                    ? t("status.encodingWebM")
                    : t("status.finalizing");
            default:
                return "";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md transition-all duration-500">
            <div className="p-10 bg-black border border-white/10 rounded-2xl shadow-[0_0_80px_-15px_rgba(0,0,0,1)] w-full max-w-lg mx-4">

                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2.5 px-3 py-1 bg-white/3 border border-white/10 rounded-full">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
                            {t("processing")}
                        </span>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-7xl font-bold tracking-tighter text-white tabular-nums">
                        {exportProgress.progress}<span className="text-2xl text-white/60 ml-1">%</span>
                    </h2>
                </div>

                <div className="relative w-full h-1.5 bg-white/15 rounded-full overflow-hidden mb-10">
                    <div
                        className="absolute left-0 top-0 h-full bg-white transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{ width: `${exportProgress.progress}%` }}
                    />
                </div>

                <div className="space-y-4 mb-10">
                    <div className="flex flex-col gap-2 border-l-2 border-white/10 pl-5 py-1">
                        <p className="text-lg font-medium tracking-tight leading-none shimmer-text">
                            {getStatusMessage()}
                        </p>
                        <p className="text-sm text-white/40 font-mono italic mt-0.5 tracking-wide">
                            {exportProgress.message.replace(/^\[Paso \d\/\d\] /, "")}
                        </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                        <Icon icon="lucide:alert-circle" className="text-blue-500 shrink-0 mt-0.5" width="18" />
                        <p className="text-md text-white/60 leading-relaxed">
                            {t.rich("warnings.performance", {
                                highlight: (chunks) => (
                                    <span className="relative font-bold text-white px-1">
                                        {chunks}
                                        <svg className="absolute -bottom-1 left-0 w-full h-2 text-blue-500/90" viewBox="0 0 100 10" preserveAspectRatio="none">
                                            <path d="M0 5 Q 25 0, 50 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="transparent" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                )
                            })}
                        </p>
                    </div>

                    {isTransparentExport && (
                        <div className="flex items-start gap-3 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                            <Icon icon="lucide:clock" className="text-cyan-400 shrink-0 mt-0.5" width="18" />
                            <p className="text-md text-cyan-400/80 leading-relaxed">
                                {t.rich("warnings.transparency", {
                                    highlight: (chunks) => <span className="font-semibold text-cyan-300">{chunks}</span>
                                })}
                            </p>
                        </div>
                    )}
                </div>

                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="w-full h-12 bg-transparent hover:bg-red-500/5 border border-white/10 hover:border-red-500/20 text-white/60 hover:text-red-400 text-sm font-medium transition-all duration-300 rounded-xl"
                >
                    <Icon icon="iconoir:cancel" width="16" className="mr-2" />
                    {t("actions.cancel")}
                </Button>
            </div>
        </div>
    );
}