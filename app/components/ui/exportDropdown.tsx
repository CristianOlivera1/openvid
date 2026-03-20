import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ExportQuality } from "@/hooks/useVideoExport";
import { useState } from "react";

interface ExportProgress {
    status: "idle" | "preparing" | "encoding" | "finalizing" | "complete" | "error";
    progress: number;
    message: string;
}

interface ExportDropdownProps {
    onExport: (quality: ExportQuality) => void;
    exportProgress: ExportProgress;
}

export function ExportDropdown({ onExport, exportProgress }: ExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isExporting = exportProgress.status !== "idle" &&
        exportProgress.status !== "complete" &&
        exportProgress.status !== "error";

    const handleExport = (quality: ExportQuality) => {
        setIsOpen(false);
        onExport(quality);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="primary"
                    className="px-3 py-2 text-sm gap-2 min-w-27.5"
                    size="sm"
                    disabled={isExporting}
                >
                    <Icon icon="icon-park-outline:export" width="18" />
                    Exportar
                    <Icon icon="mdi:chevron-down" width="16" className="opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-64 bg-[#1C1C1F] border-white/10 text-white shadow-2xl p-0 overflow-hidden"
            >
                <div className="flex flex-col bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">
                            Calidad de exportación
                        </span>
                    </div>

                    <div className="flex flex-col max-h-95 overflow-y-auto custom-scrollbar">
                        <button
                            className="group flex flex-col items-start gap-1.5 p-4 hover:bg-white/5 transition-all text-left border-b border-white/10"
                            onClick={() => handleExport("4k")}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">4K Ultra HD</span>
                                <span className="border border-blue-500/30 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-tight">
                                    RECOMENDADO
                                </span>
                            </div>
                            <span className="text-[11px] text-white/50 font-mono">3840 × 2160 • Máxima fidelidad</span>
                        </button>

                        <button
                            className="group flex flex-col items-start gap-1.5 p-4 hover:bg-white/5 transition-all text-left border-b border-white/10"
                            onClick={() => handleExport("2k")}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">2K Quad HD</span>
                                <span className="border border-white/10 text-white/50 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                    PREMIUM
                                </span>
                            </div>
                            <span className="text-[11px] text-white/50 font-mono">2560 × 1440 • Balance ideal</span>
                        </button>

                        <button
                            className="group flex flex-col items-start gap-1.5 p-4 hover:bg-white/5 transition-all text-left border-b border-white/10"
                            onClick={() => handleExport("1080p")}
                        >
                            <span className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">1080p Full HD</span>
                            <span className="text-[11px] text-white/50 font-mono">1920 × 1080 • Estándar web</span>
                        </button>

                        <button
                            className="group flex flex-col items-start gap-1.5 p-4 hover:bg-white/5 transition-all text-left border-b border-white/10"
                            onClick={() => handleExport("720p")}
                        >
                            <span className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">720p HD</span>
                            <span className="text-[11px] text-white/50 font-mono">1280 × 720 • Archivo ligero</span>
                        </button>

                        <button
                            className="group flex flex-col items-start gap-1.5 p-4 hover:bg-white/5 transition-all text-left border-b border-white/10"
                            onClick={() => handleExport("480p")}
                        >
                            <span className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">480p SD</span>
                            <span className="text-[11px] text-white/50 font-mono">854 × 480 • Calidad borrador</span>
                        </button>

                        <button
                            className="group flex flex-col items-start gap-1.5 p-4 hover:bg-orange-500/5 transition-all text-left"
                            onClick={() => handleExport("gif")}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-orange-400 group-hover:text-orange-300 transition-colors">GIF Animado</span>
                                <div className="h-1 w-1 rounded-full bg-orange-500/50"></div>
                            </div>
                            <span className="text-[11px] text-orange-400/70 font-mono">Loop sin audio • Redes sociales</span>
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}