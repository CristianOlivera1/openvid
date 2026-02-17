"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { SliderControl } from "@/app/components/ui/slider-control";
import { SidebarTool } from "@/app/components/ui/sidebar-tool";
import { TabButton } from "@/app/components/ui/tab-button";
import { WallpaperGrid } from "@/app/components/ui/wallpaper-grid";

import "../../globals.css";

type Tool = "screenshot" | "cursor" | "record" | "text" | "audio" | "settings";
type BackgroundTab = "wallpaper" | "image" | "gradient" | "color";

export default function Editor() {
    const [activeTool, setActiveTool] = useState<Tool>("screenshot");
    const [backgroundTab, setBackgroundTab] = useState<BackgroundTab>("wallpaper");
    const [selectedWallpaper, setSelectedWallpaper] = useState(0);
    const [backgroundBlur, setBackgroundBlur] = useState(10);
    const [padding, setPadding] = useState(15);
    const [roundedCorners, setRoundedCorners] = useState(40);
    const [shadows, setShadows] = useState(25);

    return (
        <div className="flex flex-col h-screen w-full bg-[#0E0E12] text-[#A1A1AA] font-sans overflow-hidden select-none">

            {/* --- TOP / MIDDLE SECTION --- */}
            <div className="flex flex-1 overflow-hidden">

                {/* 1. Sidebar Tools (Left-most) */}
                <div className="w-[60px] flex flex-col items-center py-4 bg-[#141417] border-r border-white/5 gap-6">
                    <SidebarTool
                        icon="mdi:monitor-screenshot"
                        isActive={activeTool === "screenshot"}
                        onClick={() => setActiveTool("screenshot")}
                    />
                    <SidebarTool
                        icon="mdi:cursor-default"
                        isActive={activeTool === "cursor"}
                        onClick={() => setActiveTool("cursor")}
                    />
                    <SidebarTool
                        icon="mdi:record-circle-outline"
                        isActive={activeTool === "record"}
                        onClick={() => setActiveTool("record")}
                    />
                    <SidebarTool
                        icon="mdi:message-text-outline"
                        isActive={activeTool === "text"}
                        onClick={() => setActiveTool("text")}
                    />
                    <SidebarTool
                        icon="mdi:volume-high"
                        isActive={activeTool === "audio"}
                        onClick={() => setActiveTool("audio")}
                    />
                    <div className="mt-auto">
                        <SidebarTool
                            icon="mdi:cog-outline"
                            isActive={activeTool === "settings"}
                            onClick={() => setActiveTool("settings")}
                        />
                    </div>
                </div>

                {/* 2. Properties Panel (Left Sidebar) */}
                <div className="w-[320px] bg-[#141417] border-r border-white/5 flex flex-col overflow-y-auto custom-scrollbar">

                    {activeTool === "screenshot" && (
                        <>
                            <div className="p-4 border-b border-white/5">
                                <div className="flex items-center gap-2 text-white font-medium mb-4">
                                    <Icon icon="mdi:image-outline" width="20" />
                                    <span>Background</span>
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-[#09090B] rounded-lg p-1 text-xs font-medium">
                                    <TabButton
                                        label="Wallpaper"
                                        isActive={backgroundTab === "wallpaper"}
                                        onClick={() => setBackgroundTab("wallpaper")}
                                    />
                                    <TabButton
                                        label="Image"
                                        isActive={backgroundTab === "image"}
                                        onClick={() => setBackgroundTab("image")}
                                    />
                                    <TabButton
                                        label="Gradient"
                                        isActive={backgroundTab === "gradient"}
                                        onClick={() => setBackgroundTab("gradient")}
                                    />
                                    <TabButton
                                        label="Color"
                                        isActive={backgroundTab === "color"}
                                        onClick={() => setBackgroundTab("color")}
                                    />
                                </div>
                            </div>

                            <div className="p-4 flex flex-col gap-6">
                                {/* Wallpaper Section */}
                                {backgroundTab === "wallpaper" && (
                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Icon icon="mdi:monitor" width="16" />
                                                <span className="text-sm text-white">Wallpaper</span>
                                            </div>
                                            <div className="flex gap-2 mb-4 text-xs">
                                                <button className="px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5">
                                                    Canvid
                                                </button>
                                                <button className="px-3 py-1.5 rounded-full bg-white/10 text-white">
                                                    Windows and macOS
                                                </button>
                                            </div>

                                            {/* Wallpapers Grid */}
                                            <WallpaperGrid
                                                selectedIndex={selectedWallpaper}
                                                onSelect={setSelectedWallpaper}
                                            />

                                        </div>
                                        {/* Sliders Section */}
                                        <div className="flex flex-col gap-5">
                                            <SliderControl
                                                icon="mdi:blur"
                                                label="Background blur"
                                                value={backgroundBlur}
                                                onChange={setBackgroundBlur}
                                            />

                                            <div className="text-sm font-medium text-white mt-2">Shape</div>
                                            <SliderControl
                                                icon="mdi:border-outside"
                                                label="Padding"
                                                value={padding}
                                                onChange={setPadding}
                                            />
                                            <SliderControl
                                                icon="mdi:rounded-corner"
                                                label="Rounded Corners"
                                                value={roundedCorners}
                                                onChange={setRoundedCorners}
                                            />
                                            <SliderControl
                                                icon="mdi:weather-sunny"
                                                label="Shadows"
                                                value={shadows}
                                                onChange={setShadows}
                                            />
                                        </div>
                                    </div>
                                )}

                                {backgroundTab === "image" && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon icon="mdi:image" width="16" />
                                            <span className="text-sm text-white">Upload Image</span>
                                        </div>
                                        <button className="w-full p-8 border-2 border-dashed border-white/10 rounded-lg hover:border-white/20 transition">
                                            <Icon icon="mdi:upload" width="32" className="mx-auto mb-2" />
                                            <p className="text-sm">Click to upload or drag and drop</p>
                                        </button>
                                    </div>
                                )}

                                {backgroundTab === "gradient" && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon icon="mdi:gradient-horizontal" width="16" />
                                            <span className="text-sm text-white">Gradient Presets</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {["linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                                                "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                                                "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                                                "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                                                "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"].map((gradient, i) => (
                                                    <div
                                                        key={i}
                                                        className="aspect-square rounded-lg cursor-pointer hover:ring-2 ring-white/30"
                                                        style={{ background: gradient }}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {backgroundTab === "color" && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon icon="mdi:palette" width="16" />
                                            <span className="text-sm text-white">Solid Color</span>
                                        </div>
                                        <div className="grid grid-cols-6 gap-2">
                                            {["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F",
                                                "#BB8FCE", "#85C1E2", "#F8B739", "#52B788", "#E63946", "#457B9D"].map((color, i) => (
                                                    <div
                                                        key={i}
                                                        className="aspect-square rounded-lg cursor-pointer hover:ring-2 ring-white/30"
                                                        style={{ background: color }}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </>
                    )}

                    {activeTool === "cursor" && (
                        <div className="p-4 flex flex-col gap-6">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Icon icon="mdi:cursor-default" width="20" />
                                <span>Cursor Settings</span>
                            </div>
                            <SliderControl label="Cursor Size" value={50} />
                            <SliderControl label="Click Animation" value={75} />
                            <div>
                                <label className="text-sm text-white mb-2 block">Cursor Color</label>
                                <div className="flex gap-2">
                                    {["#FF0000", "#00FF00", "#0000FF", "#FFFF00"].map((color, i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 rounded-lg cursor-pointer hover:ring-2 ring-white/30"
                                            style={{ background: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTool === "record" && (
                        <div className="p-4 flex flex-col gap-6">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Icon icon="mdi:record-circle-outline" width="20" />
                                <span>Recording Settings</span>
                            </div>
                            <div>
                                <label className="text-sm text-white mb-2 block">Quality</label>
                                <select className="w-full bg-[#27272A] text-white p-2 rounded-md border border-white/10">
                                    <option>1080p (Full HD)</option>
                                    <option>720p (HD)</option>
                                    <option>4K (Ultra HD)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-white mb-2 block">Frame Rate</label>
                                <select className="w-full bg-[#27272A] text-white p-2 rounded-md border border-white/10">
                                    <option>30 FPS</option>
                                    <option>60 FPS</option>
                                    <option>120 FPS</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTool === "text" && (
                        <div className="p-4 flex flex-col gap-6">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Icon icon="mdi:message-text-outline" width="20" />
                                <span>Text Settings</span>
                            </div>
                            <div>
                                <label className="text-sm text-white mb-2 block">Font</label>
                                <select className="w-full bg-[#27272A] text-white p-2 rounded-md border border-white/10">
                                    <option>Inter</option>
                                    <option>Roboto</option>
                                    <option>Poppins</option>
                                    <option>Montserrat</option>
                                </select>
                            </div>
                            <SliderControl icon="mdi:format-size" label="Font Size" value={60} />
                            <SliderControl icon="mdi:opacity" label="Opacity" value={100} />
                        </div>
                    )}

                    {activeTool === "audio" && (
                        <div className="p-4 flex flex-col gap-6">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Icon icon="mdi:volume-high" width="20" />
                                <span>Audio Settings</span>
                            </div>
                            <SliderControl icon="mdi:volume-medium" label="Volume" value={80} />
                            <SliderControl icon="mdi:tune" label="Bass Boost" value={30} />
                            <div>
                                <label className="text-sm text-white mb-2 block">Input Device</label>
                                <select className="w-full bg-[#27272A] text-white p-2 rounded-md border border-white/10">
                                    <option>Default Microphone</option>
                                    <option>System Audio</option>
                                    <option>Both</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTool === "settings" && (
                        <div className="p-4 flex flex-col gap-6">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Icon icon="mdi:cog-outline" width="20" />
                                <span>General Settings</span>
                            </div>
                            <div>
                                <label className="text-sm text-white mb-2 block">Export Format</label>
                                <select className="w-full bg-[#27272A] text-white p-2 rounded-md border border-white/10">
                                    <option>MP4</option>
                                    <option>WebM</option>
                                    <option>GIF</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-white mb-2 block">Auto-Save</label>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" className="w-4 h-4" />
                                    <span className="text-sm">Enable auto-save every 5 minutes</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* 3. Main Editor Area */}
                <div className="flex-1 bg-[#09090B] flex flex-col relative">

                    {/* Top Navbar */}
                    <div className="h-14 border-b border-white/5 flex items-center justify-between px-4">
                        <button className="flex items-center gap-1 text-sm hover:text-white transition">
                            <Icon icon="mdi:magic" />
                            Presets
                            <Icon icon="mdi:chevron-down" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                                <button className="hover:text-white"><Icon icon="mdi:undo" width="20" /></button>
                                <button className="hover:text-white opacity-50"><Icon icon="mdi:redo" width="20" /></button>
                            </div>
                            <Button variant="outline" className="px-3 py-1.5 text-sm" size="sm">
                                <Icon icon="mdi:share-variant" />
                                Quick Share
                            </Button>
                            <Button variant="primary" className="px-3 py-1.5 text-sm" size="sm">
                                <Icon icon="mdi:content-save" />
                                Exportar
                            </Button>
                        </div>
                    </div>

                    {/* Canvas Wrapper */}
                    <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                        {/* The Main "Video" Canvas */}
                        <div className="w-[85%] aspect-video bg-[#b1d4ff] rounded-xl relative flex items-center justify-center overflow-hidden shadow-2xl">
                            {/* Mock Browser Window inside Canvas */}
                            <div className="w-[90%] h-[85%] bg-[#1E1E1E] rounded-lg shadow-2xl border border-white/10 flex flex-col overflow-hidden">
                                {/* Fake Browser Header */}
                                <div className="h-8 bg-[#2D2D2D] flex items-center px-3 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="mx-auto bg-[#1C1C1C] px-24 py-1 rounded text-[10px] text-gray-400">gemini.google.com</div>
                                </div>
                                {/* Fake Browser Body */}
                                <div className="flex-1 flex">
                                    <div className="flex-1 p-4">
                                        <div className="w-1/2 h-4 bg-gray-700 rounded mb-4"></div>
                                        <div className="w-full h-2 bg-gray-700 rounded mb-2"></div>
                                        <div className="w-5/6 h-2 bg-gray-700 rounded mb-2"></div>
                                        <div className="w-4/6 h-2 bg-gray-700 rounded mb-6"></div>
                                        <div className="w-full h-24 bg-gray-800 rounded border border-gray-600"></div>
                                    </div>
                                    <div className="w-64 border-l border-gray-700 bg-[#252526] p-2 flex flex-col gap-2">
                                        <div className="w-full h-3 bg-gray-600 rounded"></div>
                                        <div className="w-full h-2 bg-gray-600 rounded"></div>
                                        <div className="w-full h-2 bg-gray-600 rounded"></div>
                                        <div className="w-2/3 h-2 bg-blue-500 rounded mt-4"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Player Controls (Bottom of Stage) */}
                    <div className="h-14 border-t border-white/5 flex items-center justify-between px-6 bg-[#09090B]">
                        <div className="flex items-center gap-4 text-xs">
                            <button><Icon icon="mdi:fit-to-page-outline" width="18" /></button>
                            <div className="flex items-center gap-2">
                                <button><Icon icon="mdi:magnify-minus-outline" width="18" /></button>
                                <div className="w-24 h-1 bg-gray-800 rounded-full">
                                    <div className="w-1/2 h-full bg-gray-500 rounded-full relative">
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                                    </div>
                                </div>
                                <button><Icon icon="mdi:magnify-plus-outline" width="18" /></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-xs font-mono">00:00</span>
                            <div className="flex items-center gap-3">
                                <button className="hover:text-white"><Icon icon="mdi:rewind-5" width="22" /></button>
                                <button className="hover:text-white"><Icon icon="mdi:play" width="28" /></button>
                                <button className="hover:text-white"><Icon icon="mdi:fast-forward-5" width="22" /></button>
                            </div>
                            <span className="text-xs font-mono">00:06</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Icon icon="mdi:crop" /> Crop
                            </Button>
                            <Button variant="outline" size="sm">
                                <Icon icon="mdi:auto-fix" /> Auto
                            </Button>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- BOTTOM SECTION (TIMELINE) --- */}
            <div className="h-44 bg-[#141417] border-t border-white/5 flex flex-col font-mono text-[10px]">
                {/* Ruler */}
                <div className="h-8 border-b border-white/5 flex items-center relative overflow-hidden">
                    <div className="absolute left-0 w-full flex justify-between px-4 text-gray-500">
                        <span>00:00</span><span>00:01</span><span>00:02</span><span>00:03</span><span>00:04</span><span>00:05</span><span>00:06</span>
                    </div>
                    {/* Playhead Line */}
                    <div className="absolute left-[5%] top-0 bottom-0 w-[2px] bg-[#3B82F6] z-10">
                        <div className="w-3 h-3 bg-[#3B82F6] rounded-sm -ml-[5px]"></div>
                    </div>
                </div>

                {/* Tracks */}
                <div className="flex-1 overflow-auto p-2 relative flex flex-col gap-1">

                    {/* Main Video Track */}
                    <div className="w-[95%] flex-1 bg-[#2b7a4b] rounded flex items-center justify-center text-white text-xs relative border border-[#34A853]">
                        <div className="absolute left-0 w-1 h-full bg-[#34A853] rounded-l"></div>
                        <div className="text-center">
                            Clip <br /> 6.23s
                        </div>
                        <div className="absolute right-0 w-1 h-full bg-[#34A853] rounded-r"></div>
                    </div>

                    {/* Effect Tracks */}
                    {/* Añadimos flex-1 a este contenedor para que ocupe la otra mitad del alto disponible */}
                    <div className="flex-1 flex gap-24 ml-[15%] mt-1">

                        <div className="w-48 h-full bg-[#3B82F6]/80 rounded flex flex-col items-center justify-center text-white border border-[#60A5FA]">
                            <span>Zoom</span>
                            <span className="scale-75">Q 2.0x 1.00s</span>
                        </div>

                        <div className="w-48 h-full bg-[#3B82F6]/80 rounded flex flex-col items-center justify-center text-white border border-[#60A5FA]">
                            <span>Zoom</span>
                            <span className="scale-75">Q 2.0x 1.00s</span>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    );
}