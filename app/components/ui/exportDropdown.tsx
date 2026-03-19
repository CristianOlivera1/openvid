import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportDropdown() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="primary" className="px-3 py-2 text-sm gap-2" size="sm">
                    <Icon icon="icon-park-outline:export" width="18" />
                    Exportar
                    <Icon icon="mdi:chevron-down" width="16" className="opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1C1C1F] border-white/10 text-white shadow-2xl">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-white/40 pb-2">
                    Calidad de exportación
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />

                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer focus:bg-white/5 focus:text-white">
                    <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">1080p Full HD</span>
                        <span className="bg-indigo-500/20 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded font-bold">RECOMENDADO</span>
                    </div>
                    <span className="text-[10px] text-white/50">1920 x 1080 • Estándar web</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer focus:bg-white/5 focus:text-white">
                    <span className="font-medium text-sm">720p HD</span>
                    <span className="text-[10px] text-white/50">1280 x 720 • Archivo ligero</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer focus:bg-white/5 focus:text-white">
                    <span className="font-medium text-sm">480p SD</span>
                    <span className="text-[10px] text-white/50">854 x 480 • Calidad estándar</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/5" />

                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 focus:bg-orange-600/20 focus:text-orange-400 cursor-pointer text-orange-400/80">
                    <span className="font-medium text-sm">GIF Animado</span>
                    <span className="text-[10px] opacity-60">Ideal para redes sociales</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
