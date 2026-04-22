"use client";

interface EditorHoverTooltipProps {
    show: boolean;
}

export function EditorHoverTooltip({ show }: EditorHoverTooltipProps) {
    if (!show) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 px-4 py-2 bg-[#0A0A0A]/90 backdrop-blur-md rounded-full border border-white/30 shadow-2xl">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/70 font-medium tracking-tight">Zoom</span>
                    <div className="flex items-center gap-1">
                        <kbd className="h-5 px-1.5 flex items-center justify-center bg-[#171717] rounded border border-white/30 text-[9px] text-white font-mono">
                            Ctrl
                        </kbd>
                        <span className="text-white/70 text-[10px]">+</span>
                        <kbd className="h-5 px-1.5 flex items-center justify-center bg-[#171717] rounded border border-white/30 text-[9px] text-white font-mono">
                            Scroll
                        </kbd>
                    </div>
                </div>

                <div className="w-px h-4 bg-white/30" />

                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/70 font-medium tracking-tight">Pegar</span>
                    <div className="flex items-center gap-1">
                        <kbd className="h-5 px-1.5 flex items-center justify-center bg-[#171717] rounded border border-white/30 text-[9px] text-white font-mono">
                            Ctrl
                        </kbd>
                        <span className="text-white/70 text-[10px]">+</span>
                        <kbd className="w-5 h-5 flex items-center justify-center bg-[#171717] rounded border border-white/30 text-[9px] text-white font-mono">
                            V
                        </kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}
