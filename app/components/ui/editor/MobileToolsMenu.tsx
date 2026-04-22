"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Tool } from "@/types";

interface MobileToolsMenuProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    onVideoUpload?: (file: File) => void;
    isUploading?: boolean;
    onOpenToolPanel?: () => void;
}

export function MobileToolsMenu({
    activeTool,
    onToolChange,
    onVideoUpload,
    isUploading = false,
    onOpenToolPanel
}: MobileToolsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleToolChange = (tool: Tool) => {
        onToolChange(tool);
        setIsOpen(false);
        // Open the control panel for this tool
        if (onOpenToolPanel) {
            setTimeout(() => onOpenToolPanel(), 100);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onVideoUpload) {
            onVideoUpload(file);
            e.target.value = '';
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild>
                <button
                    className="fixed bottom-4 left-4 z-50 size-10 rounded-full shadow-lg shadow-blue-500/50 bg-gradient-primary flex items-center justify-center hover:scale-105 transition-transform active:scale-95 lg:hidden"
                    aria-label="Abrir menú de herramientas"
                >
                    <Icon icon="solar:widget-2-bold-duotone" width="20" className="text-white" />
                </button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 animate-in fade-in duration-200" />
                <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-[#1a1a1d] border-t border-white/10 rounded-t-2xl z-101 p-6 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-lg font-semibold text-white">
                            Herramientas
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                                aria-label="Cerrar"
                            >
                                <Icon icon="mdi:close" width="20" className="text-white/70" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleToolChange("screenshot")}
                            className="flex items-center justify-center p-4 squircle-element transition-all duration-200 group relative flex-col gap-1"
                            style={activeTool === "screenshot" ? {
                                background: 'radial-gradient(circle at 50% 0%, #555555 0%, #454545 64%)',
                                boxShadow: 'inset 0 1.01rem 0.2rem -1rem #fff, 0 0 0 1px #fff4, 0 4px 4px 0 #0004, 0 0 0 1px #333',
                            } : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className={`transition-transform duration-300 ${activeTool === "screenshot" ? "scale-110" : "group-hover:scale-105"}`}>
                                <Icon
                                    icon="solar:gallery-wide-linear"
                                    width="24"
                                    className={activeTool === "screenshot" ? "text-white" : "text-white/70"}
                                />
                            </div>

                            <span className={`text-sm font-medium transition-colors ${activeTool === "screenshot" ? "text-white" : "text-white/40"}`}>
                                Fondo
                            </span>

                            {activeTool === "screenshot" && (
                                <div className="absolute left-2 w-20 h-5 top-1/4 -translate-y-1/2 size-3 bg-white rounded-full blur-[14px] rotate-45 opacity-50 pointer-events-none" />
                            )}
                        </button>

                        <button
                            onClick={() => handleToolChange("elements")}
                            className="flex items-center justify-center p-4 squircle-element transition-all duration-200 group relative flex-col gap-1 active:scale-95"
                            style={activeTool === "elements" ? {
                                background: 'radial-gradient(circle at 50% 0%, #555555 0%, #454545 64%)',
                                boxShadow: 'inset 0 1.01rem 0.2rem -1rem #fff, 0 0 0 1px #fff4, 0 4px 4px 0 #0004, 0 0 0 1px #333',
                            } : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className={`transition-transform duration-300 ${activeTool === "elements" ? "scale-110" : "group-hover:scale-105"}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={activeTool === "elements" ? "text-white" : "text-white/70"}>
                                    <path d="M11 13.5V21.5H3V13.5H11ZM9 15.5H5V19.5H9V15.5ZM12 2L17.5 11H6.5L12 2ZM12 5.86L10.08 9H13.92L12 5.86Z" fill="currentColor" stroke="currentColor" strokeWidth="0.2" />
                                    <path fillRule="evenodd" clipRule="evenodd" d="M13.7667 13.8246C13.7667 13.6323 13.8431 13.4479 13.9791 13.312C14.115 13.176 14.2994 13.0996 14.4917 13.0996H20.2917C20.484 13.0996 20.6684 13.176 20.8044 13.312C20.9403 13.4479 21.0167 13.6323 21.0167 13.8246V14.7913C21.0167 14.9836 20.9403 15.168 20.8044 15.3039C20.6684 15.4399 20.484 15.5163 20.2917 15.5163C20.0994 15.5163 19.915 15.4399 19.7791 15.3039C19.6431 15.168 19.5667 14.9836 19.5667 14.7913V14.5496H18.1167V20.3496H18.3584C18.5507 20.3496 18.7351 20.426 18.871 20.562C19.007 20.6979 19.0834 20.8823 19.0834 21.0746C19.0834 21.2669 19.007 21.4513 18.871 21.5873C18.7351 21.7232 18.5507 21.7996 18.3584 21.7996H16.4251C16.2328 21.7996 16.0484 21.7232 15.9124 21.5873C15.7764 21.4513 15.7001 21.2669 15.7001 21.0746C15.7001 20.8823 15.7764 20.6979 15.9124 20.562C16.0484 20.426 16.2328 20.3496 16.4251 20.3496H16.6667V14.5496H15.2167V14.7913C15.2167 14.9836 15.1403 15.168 15.0044 15.3039C14.8684 15.4399 14.684 15.5163 14.4917 15.5163C14.2994 15.5163 14.115 15.4399 13.9791 15.3039C13.8431 15.168 13.7667 14.9836 13.7667 14.7913V13.8246Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium transition-colors ${activeTool === "elements" ? "text-white" : "text-white/40"}`}>
                                Elementos
                            </span>
                            {activeTool === "elements" && (
                                <div className="absolute left-2 w-20 h-5 top-1/4 -translate-y-1/2 size-3 bg-white rounded-full blur-[14px] rotate-45 opacity-50 pointer-events-none" />
                            )}
                        </button>

                        <button
                            onClick={() => handleToolChange("audio")}
                            className="flex items-center justify-center p-4 squircle-element transition-all duration-200 group relative flex-col gap-1 active:scale-95"
                            style={activeTool === "audio" ? {
                                background: 'radial-gradient(circle at 50% 0%, #555555 0%, #454545 64%)',
                                boxShadow: 'inset 0 1.01rem 0.2rem -1rem #fff, 0 0 0 1px #fff4, 0 4px 4px 0 #0004, 0 0 0 1px #333',
                            } : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className={`transition-transform duration-300 ${activeTool === "audio" ? "scale-110" : "group-hover:scale-105"}`}>
                                <Icon icon="mdi:volume-high" width="24" className={activeTool === "audio" ? "text-white" : "text-white/70"} />
                            </div>
                            <span className={`text-sm font-medium transition-colors ${activeTool === "audio" ? "text-white" : "text-white/40"}`}>
                                Audio
                            </span>
                            {activeTool === "audio" && (
                                <div className="absolute left-2 w-20 h-5 top-1/4 -translate-y-1/2 size-3 bg-white rounded-full blur-[14px] rotate-45 opacity-50 pointer-events-none" />
                            )}
                        </button>

                        <button
                            onClick={() => handleToolChange("zoom")}
                            className="flex items-center justify-center p-4 squircle-element transition-all duration-200 group relative flex-col gap-1 active:scale-95"
                            style={activeTool === "zoom" ? {
                                background: 'radial-gradient(circle at 50% 0%, #555555 0%, #454545 64%)',
                                boxShadow: 'inset 0 1.01rem 0.2rem -1rem #fff, 0 0 0 1px #fff4, 0 4px 4px 0 #0004, 0 0 0 1px #333',
                            } : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className={`transition-transform duration-300 ${activeTool === "zoom" ? "scale-110" : "group-hover:scale-105"}`}>
                                <Icon icon="iconamoon:zoom-in-bold" width="24" className={activeTool === "zoom" ? "text-white" : "text-white/70"} />
                            </div>
                            <span className={`text-sm font-medium transition-colors ${activeTool === "zoom" ? "text-white" : "text-white/40"}`}>
                                Zoom
                            </span>
                            {activeTool === "zoom" && (
                                <div className="absolute left-2 w-20 h-5 top-1/4 -translate-y-1/2 size-3 bg-white rounded-full blur-[14px] rotate-45 opacity-50 pointer-events-none" />
                            )}
                        </button>

                        <button
                            onClick={() => handleToolChange("mockup")}
                            className="flex items-center justify-center p-4 squircle-element transition-all duration-200 group relative flex-col gap-1 active:scale-95"
                            style={activeTool === "mockup" ? {
                                background: 'radial-gradient(circle at 50% 0%, #555555 0%, #454545 64%)',
                                boxShadow: 'inset 0 1.01rem 0.2rem -1rem #fff, 0 0 0 1px #fff4, 0 4px 4px 0 #0004, 0 0 0 1px #333',
                            } : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className={`transition-transform duration-300 ${activeTool === "mockup" ? "scale-110" : "group-hover:scale-105"}`}>
                                <Icon icon="hugeicons:ai-browser" width="24" className={activeTool === "mockup" ? "text-white" : "text-white/70"} />
                            </div>
                            <span className={`text-sm font-medium transition-colors ${activeTool === "mockup" ? "text-white" : "text-white/40"}`}>
                                Mockup
                            </span>
                            {activeTool === "mockup" && (
                                <div className="absolute left-2 w-20 h-5 top-1/4 -translate-y-1/2 size-3 bg-white rounded-full blur-[14px] rotate-45 opacity-50 pointer-events-none" />
                            )}
                        </button>

                        <label
                            className={`flex items-center justify-center p-4 squircle-element transition-all duration-200 group relative flex-col gap-1 active:scale-95 cursor-pointer ${isUploading ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: isUploading ? 'none' : '0 4px 4px 0 #0004',
                            }}
                        >
                            <div className={`transition-transform duration-300 ${isUploading ? "animate-pulse" : "group-hover:scale-105"}`}>
                                <Icon
                                    icon={isUploading ? "svg-spinners:ring-resize" : "solar:cloud-upload-bold-duotone"}
                                    width="24"
                                    className="text-white"
                                />
                            </div>

                            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                                {isUploading ? "Subiendo..." : "Subir video"}
                            </span>

                            {!isUploading && (
                                <div className="absolute left-2 w-16 h-4 top-1/4 -translate-y-1/2 bg-white rounded-full blur-md rotate-45 opacity-20 pointer-events-none" />
                            )}

                            <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </label>

                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
