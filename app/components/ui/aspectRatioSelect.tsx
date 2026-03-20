import { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Icon } from "@iconify/react";
import type { AspectRatio } from "@/types";

interface AspectRatioSelectProps {
    value: AspectRatio;
    onChange: (value: AspectRatio) => void;
    customDimensions?: { width: number; height: number } | null;
    onCustomDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

// Separé "custom" de la lista principal para manejarlo en su propia sección
const STANDARD_RATIOS: Partial<Record<AspectRatio, string>> = {
    "auto": "Auto",
    "16:9": "16:9 YouTube",
    "9:16": "9:16 TikTok",
    "1:1": "1:1 Instagram",
    "4:3": "4:3",
    "3:4": "3:4",
};

export function AspectRatioSelect({ value, onChange, customDimensions, onCustomDimensionsChange }: AspectRatioSelectProps) {
    const [isOpen, setIsOpen] = useState(false);

    const [tempWidth, setTempWidth] = useState("");
    const [tempHeight, setTempHeight] = useState("");

    const handleOpenChange = (open: boolean) => {
        if (open) {
            setTempWidth(customDimensions?.width?.toString() || "1920");
            setTempHeight(customDimensions?.height?.toString() || "1080");
        }
        setIsOpen(open);
    };

    const handleStandardRatioClick = (ratio: AspectRatio) => {
        onChange(ratio);
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        const width = parseInt(tempWidth);
        const height = parseInt(tempHeight);

        if (width > 0 && height > 0 && onCustomDimensionsChange) {
            onCustomDimensionsChange({ width, height });
            onChange("custom");
            setIsOpen(false);
        }
    };

    const displayLabel = (() => {
        if (value === "custom" && customDimensions) {
            return `${customDimensions.width}x${customDimensions.height}`;
        }
        if (value === "auto") {
            return "Auto";
        }
        return STANDARD_RATIOS[value as keyof typeof STANDARD_RATIOS] || "Personalizado";
    })();

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    className="flex items-center gap-2 h-8 px-3 text-xs font-medium border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground transition-colors w-full sm:w-auto"
                    title="Seleccionar proporción de aspecto"
                >
                    <Icon icon="mynaui:layout" width="16" className="shrink-0" />
                    <span className="truncate">{displayLabel}</span>
                    <Icon icon="lucide:chevron-down" width="14" className="ml-auto opacity-50 shrink-0" />
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-2" align="start">
                <div className="flex flex-col gap-1">

                    <div className="flex flex-col">
                        {(Object.keys(STANDARD_RATIOS) as AspectRatio[]).map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => handleStandardRatioClick(ratio)}
                                className={`flex items-center w-full px-2 py-1.5 text-sm rounded-sm transition-colors
                                    ${value === ratio
                                        ? "bg-accent text-accent-foreground font-medium"
                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                    }
                                `}
                            >
                                <span className="flex-1 text-left">{STANDARD_RATIOS[ratio]}</span>
                                {value === ratio && (
                                    <Icon icon="lucide:check" width="16" className="shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="h-px bg-border my-2 mx-1" />

                    <div className="px-2 pb-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-foreground">Personalizado</span>
                            {value === "custom" && (
                                <Icon icon="lucide:check" width="14" className="text-accent-foreground" />
                            )}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    min="1"
                                    max="7680"
                                    value={tempWidth}
                                    onChange={(e) => setTempWidth(e.target.value)}
                                    placeholder="Ancho"
                                    className="w-full h-8 px-2 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <span className="text-muted-foreground text-xs">x</span>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    min="1"
                                    max="4320"
                                    value={tempHeight}
                                    onChange={(e) => setTempHeight(e.target.value)}
                                    placeholder="Alto"
                                    className="w-full h-8 px-2 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCustomApply}
                            className="w-full h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                        >
                            Aplicar medidas
                        </button>
                    </div>

                </div>
            </PopoverContent>
        </Popover>
    );
}