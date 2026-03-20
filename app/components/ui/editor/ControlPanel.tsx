"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { SliderControl } from "../SliderControl";
import { TabButton } from "../TabButton";
import type { ControlPanelProps } from "@/types/control-panel.types";
import Link from "next/link";
import Image from "next/image";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "../LoadingSpinner";
import { ElementsMenu } from "./ElementsMenu";

// Lazy load heavy components - only load when needed
const ImageRecentBackgroundGrid = lazy(() => import("../ImageRecentBackgroundGrid").then(mod => ({ default: mod.ImageRecentBackgroundGrid })));
const BackgroundColorEditor = lazy(() => import("../BackgroundColorEditor").then(mod => ({ default: mod.BackgroundColorEditor })));
const ZoomFragmentEditor = lazy(() => import("./ZoomFragmentEditor").then(mod => ({ default: mod.ZoomFragmentEditor })));
const ZoomGlobalConfig = lazy(() => import("./ZoomGlobalConfig").then(mod => ({ default: mod.ZoomGlobalConfig })));
const OptionsGrid = lazy(() => import("../WalpaperSections").then(mod => ({ default: mod.OptionsGrid })));
const WallpaperCatalogGrid = lazy(() => import("../WalpaperSections").then(mod => ({ default: mod.WallpaperCatalogGrid })));
const MockupMenu = lazy(() => import("./MockupMenu").then(mod => ({ default: mod.MockupMenu })));

interface ExtendedControlPanelProps extends ControlPanelProps {
    onTogglePanel?: () => void;
    isOpen?: boolean;
}

export function ControlPanel({
    activeTool,
    backgroundTab,
    selectedWallpaper,
    backgroundBlur,
    padding,
    roundedCorners,
    shadows,
    uploadedImages,
    selectedImageUrl,
    backgroundColorConfig,
    onBackgroundTabChange,
    onWallpaperSelect,
    onBackgroundBlurChange,
    onPaddingChange,
    onRoundedCornersChange,
    onShadowsChange,
    onImageUpload,
    onImageSelect,
    onImageRemove,
    onBackgroundColorChange,
    onTogglePanel,
    isOpen = true,
    // Zoom props
    zoomFragments = [],
    selectedZoomFragment,
    onSelectZoomFragment,
    onAddZoomFragment,
    onUpdateZoomFragment,
    onDeleteZoomFragment,
    videoUrl,
    videoThumbnail,
    currentTime = 0,
    getThumbnailForTime, videoDimensions,    // Mockup props
    mockupId,
    mockupConfig,
    onMockupChange,
    onMockupConfigChange,
    // Canvas elements props
    onAddCanvasElement,
    selectedCanvasElement,
    onUpdateCanvasElement,
    onDeleteCanvasElement,
    onBringToFront,
    onSendToBack,
}: ExtendedControlPanelProps) {
    return (
        <div className="relative w-[320px] h-screen bg-[#141417] border-r border-white/10 flex flex-col shrink-0">
            <header className="flex items-center justify-between h-13 p-2 border-b border-white/10 shrink-0">
                <Link href="/" className="flex items-center gap-2 group">
                    <Image src="/svg/logo-openvid.svg" alt="Logo" width={30} height={30} />
                    <span className="hidden sm:flex text-white font-semibold text-sm transition-colors group-hover:text-neutral-200">
                        Free
                        <span className="relative inline-block px-1 ml-0.5">
                            <span className="absolute inset-0 bg-blue-500/20 border border-dashed border-blue-400/50 rounded-sm -rotate-1" />

                            <span className="relative">Shot</span>

                            <div className="absolute -bottom-1 -right-1 size-2 bg-sky-500 border border-white rounded-full shadow-lg" />
                        </span>
                    </span>
                </Link>
                <motion.button
                    onClick={onTogglePanel}
                    className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200" title="Cerrar panel de control"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <motion.div
                        animate={{ rotate: isOpen ? 0 : 180 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <Icon icon="lucide:sidebar-close" width="20" />
                    </motion.div>
                </motion.button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTool === "screenshot" && (
                    <>
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-2 text-white font-medium mb-4">
                                <Icon icon="gravity-ui:picture" width="20" />
                                <span>Fondo</span>
                            </div>

                            <div className="flex bg-[#09090B] rounded-lg p-1 text-xs font-medium">
                                <TabButton
                                    label="Wallpaper"
                                    isActive={backgroundTab === "wallpaper"}
                                    onClick={() => onBackgroundTabChange("wallpaper")}
                                />
                                <TabButton
                                    label="Color"
                                    isActive={backgroundTab === "color"}
                                    onClick={() => onBackgroundTabChange("color")}
                                />
                                <TabButton
                                    label="Imagen"
                                    isActive={backgroundTab === "image"}
                                    onClick={() => onBackgroundTabChange("image")}
                                />
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-6 pb-12">
                            {backgroundTab === "wallpaper" && (
                                <Suspense fallback={<LoadingSpinner message="Cargando wallpapers..." />}>
                                    <div className="flex flex-col gap-5">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-widesttext-white/60 font-bold mb-2 flex items-center gap-1.5">
                                                <span>Opciones</span>
                                            </div>
                                            <OptionsGrid
                                                selectedIndex={selectedWallpaper}
                                                onSelect={onWallpaperSelect}
                                            />
                                        </div>

                                        <WallpaperCatalogGrid
                                            selectedIndex={selectedWallpaper}
                                            onSelect={onWallpaperSelect}
                                        />
                                    </div>
                                </Suspense>
                            )}

                            {backgroundTab === "image" && (
                                <Suspense fallback={<LoadingSpinner message="Cargando editor de imágenes..." />}>
                                    <ImageRecentBackgroundGrid
                                        images={uploadedImages}
                                        selectedUrl={selectedImageUrl}
                                        onSelect={onImageSelect}
                                        onRemove={onImageRemove}
                                        onUpload={onImageUpload}
                                    />
                                </Suspense>
                            )}

                            {backgroundTab === "color" && (
                                <Suspense fallback={<LoadingSpinner message="Cargando editor de color..." />}>
                                    <BackgroundColorEditor
                                        value={backgroundColorConfig}
                                        onChange={onBackgroundColorChange}
                                    />
                                </Suspense>
                            )}

                            <SliderControl
                                icon="mdi:blur"
                                label="Desenfoque del fondo"
                                value={backgroundBlur}
                                min={0}
                                max={20}
                                onChange={onBackgroundBlurChange}
                            />

                            <SliderControl
                                icon="mdi:arrow-expand-all"
                                label="Padding"
                                value={padding}
                                min={0}
                                max={20}
                                onChange={onPaddingChange}
                            />

                            <SliderControl
                                icon="mdi:border-radius"
                                label="Esquinas redondeadas"
                                value={roundedCorners}
                                min={0}
                                max={20}
                                onChange={onRoundedCornersChange}
                            />

                            <SliderControl
                                icon="material-symbols:shadow"
                                label="Sombras"
                                value={shadows}
                                min={0}
                                max={20}
                                onChange={onShadowsChange}
                            />
                        </div>
                    </>
                )}

                {activeTool === "elements" && (
                    <ElementsMenu 
                        onAddElement={onAddCanvasElement || (() => {})} 
                        selectedElement={selectedCanvasElement}
                        onUpdateElement={onUpdateCanvasElement}
                        onDeleteElement={onDeleteCanvasElement}
                        onBringToFront={onBringToFront}
                        onSendToBack={onSendToBack}
                    />
                )}

                {activeTool === "audio" && (
                    <div className="p-4 flex flex-col gap-6">
                        <div className="flex items-center gap-2 text-white font-medium">
                            <Icon icon="mdi:volume-high" width="20" />
                            <span>Audio</span>
                        </div>
                        <SliderControl icon="mdi:volume-medium" label="Volumen" value={80} />
                        <SliderControl icon="mdi:tune" label="Amplificación de graves" value={30} />
                    </div>
                )}

                {activeTool === "zoom" && (
                    <Suspense fallback={<LoadingSpinner message="Cargando editor de zoom..." />}>
                        {selectedZoomFragment ? (
                            <ZoomFragmentEditor
                                fragment={selectedZoomFragment}
                                videoUrl={videoUrl ?? null}
                                videoThumbnail={videoThumbnail}
                                currentTime={currentTime}
                                getThumbnailForTime={getThumbnailForTime}
                                videoDimensions={videoDimensions}
                                onBack={() => onSelectZoomFragment?.(null)}
                                onDelete={() => onDeleteZoomFragment?.(selectedZoomFragment.id)}
                                onUpdate={(updates) => onUpdateZoomFragment?.(selectedZoomFragment.id, updates)}
                            />
                        ) : (
                            <ZoomGlobalConfig
                                fragments={zoomFragments}
                                onSelectFragment={(id) => onSelectZoomFragment?.(id)}
                                onAddFragment={() => onAddZoomFragment?.()}
                            />
                        )}
                    </Suspense>
                )}

                {activeTool === "mockup" && (
                    <Suspense fallback={<LoadingSpinner message="Cargando mockups..." />}>
                        <MockupMenu
                            mockupId={mockupId}
                            mockupConfig={mockupConfig}
                            onMockupChange={onMockupChange}
                            onMockupConfigChange={onMockupConfigChange}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
