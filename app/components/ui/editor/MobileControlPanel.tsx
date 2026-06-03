"use client";

import { Suspense } from "react";
import { Icon } from "@iconify/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ControlPanelProps } from "@/types/control-panel.types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface MobileControlPanelProps extends ControlPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

import dynamic from "next/dynamic";

const ControlPanel = dynamic(
    () => import("./ControlPanel").then(mod => ({ default: mod.ControlPanel })),
    {
        loading: () => (
            <div className="w-full h-full flex items-center justify-center">
                <LoadingSpinner message="Cargando..." />
            </div>
        ),
        ssr: false
    }
);

export function MobileControlPanel({
    isOpen,
    onClose,
    ...controlPanelProps
}: MobileControlPanelProps) {
    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 animate-in fade-in duration-200 lg:hidden" />
                <Dialog.Content className="fixed inset-x-0 bottom-0 top-16 bg-[#141417] z-101 animate-in slide-in-from-bottom duration-300 overflow-y-auto lg:hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-[#141417] border-b border-white/10 px-4 py-3 flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
                            <Icon 
                                icon={
                                    controlPanelProps.activeTool === "screenshot" ? "solar:gallery-wide-linear" :
                                    controlPanelProps.activeTool === "elements" ? "mdi:shape-outline" :
                                    controlPanelProps.activeTool === "audio" ? "mdi:volume-high" :
                                    controlPanelProps.activeTool === "zoom" ? "iconamoon:zoom-in-bold" :
                                    controlPanelProps.activeTool === "cursor" ? "ph:cursor-fill" :
                                    "hugeicons:ai-browser"
                                } 
                                width="20" 
                                aria-hidden="true"
                            />
                            {controlPanelProps.activeTool === "screenshot" && "Fondo"}
                            {controlPanelProps.activeTool === "elements" && "Elementos"}
                            {controlPanelProps.activeTool === "audio" && "Audio"}
                            {controlPanelProps.activeTool === "zoom" && "Zoom"}
                            {controlPanelProps.activeTool === "mockup" && "Mockup"}
                            {controlPanelProps.activeTool === "cursor" && "Cursor"}
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Bảng điều khiển công cụ trên thiết bị di động.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button
                                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                                aria-label="Cerrar"
                            >
                                <Icon icon="mdi:close" width="20" className="text-white/70" aria-hidden="true" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center py-20">
                                    <LoadingSpinner message="Cargando panel..." />
                                </div>
                            }
                        >
                            <ControlPanel
                                {...controlPanelProps}
                                onTogglePanel={onClose}
                                isOpen={true}
                            />
                        </Suspense>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
