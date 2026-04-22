"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { SliderControl } from "../SliderControl";
import { TabButton } from "../TabButton";
import type { ControlPanelProps } from "@/types/control-panel.types";
import Link from "next/link";
import Image from "next/image";
import { lazy, Suspense } from "react";
import { useTranslations } from "next-intl";

import {
    ElementsMenuSkeleton,
    ZoomGlobalConfigSkeleton,
    MockupMenuSkeleton,
    WallpaperSkeleton,
    BackgroundColorSkeleton,
    ImageBackgroundSkeleton,
    ZoomFragmentEditorSkeleton,
    AudioMenuSkeleton,
    VideosMenuSkeleton,
    HistoryMenuSkeleton
} from "../Skeleton";

import { ElementsMenu } from "./ElementsMenu";
import { TooltipAction } from "@/components/ui/tooltip-action";
import CursorMenu from "./CursorMenu";
import { DEFAULT_CURSOR_CONFIG } from "@/types/cursor.types";
import { CameraMenu } from "./CameraMenu";

// Lazy loads (se mantienen igual)
const ImageRecentBackgroundGrid = lazy(() => import("../ImageRecentBackgroundGrid").then(mod => ({ default: mod.ImageRecentBackgroundGrid })));
const BackgroundColorEditor = lazy(() => import("../BackgroundColorEditor").then(mod => ({ default: mod.BackgroundColorEditor })));
const ZoomFragmentEditor = lazy(() => import("./ZoomFragmentEditor").then(mod => ({ default: mod.ZoomFragmentEditor })));
const ZoomGlobalConfig = lazy(() => import("./ZoomGlobalConfig").then(mod => ({ default: mod.ZoomGlobalConfig })));
const OptionsGrid = lazy(() => import("../WalpaperSections").then(mod => ({ default: mod.OptionsGrid })));
const WallpaperCatalogGrid = lazy(() => import("../WalpaperSections").then(mod => ({ default: mod.WallpaperCatalogGrid })));
const MockupMenu = lazy(() => import("./MockupMenu").then(mod => ({ default: mod.MockupMenu })));
const AudioMenu = lazy(() => import("./AudioMenu").then(mod => ({ default: mod.AudioMenu })));
const VideosMenu = lazy(() => import("./VideosMenu").then(mod => ({ default: mod.VideosMenu })));
const HistoryMenu = lazy(() => import("./HistoryMenu").then(mod => ({ default: mod.HistoryMenu })));

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
    getThumbnailForTime,
    videoDimensions,
    // Mockup props
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
    // Audio props
    uploadedAudios = [],
    audioTracks = [],
    muteOriginalAudio = false,
    masterVolume = 1,
    onAudioUpload,
    onAudioDelete,
    onAddAudioTrack,
    onUpdateAudioTrack,
    onDeleteAudioTrack,
    onToggleMuteOriginalAudio,
    onMasterVolumeChange,
    videoDuration = 0,
    // Cursor props
    cursorConfig = DEFAULT_CURSOR_CONFIG,
    cursorData,
    isRecordedVideo = false,
    onCursorConfigChange,
    // Videos library props
    onAddVideoToTrack,
    onRemoveVideoFromTrack,
    onVideoUploadToLibrary,
    onVideoDeleteFromTrack,
    videosInTrackIds = [],
    videosLibraryRefresh,
    isVideoUploading = false,
    onVideoAudioToggle,
    // Camera overlay props
    cameraUrl = null,
    cameraConfig = null,
    onCameraConfigChange,
    // History/Image projects props
    imageProjects = [],
    currentImageProjectId = null,
    isLoadingProjects = false,
    onSelectImageProject,
    onAddImageToCanvas,
    onDeleteImageProject,
    onUploadImageToHistory,
}: ExtendedControlPanelProps) {

    const t = useTranslations("controlPanel");

    return (
        <div className="relative w-full sm:w-[320px] h-screen bg-[#141417] border-r border-white/10 flex flex-col shrink-0">
            <header className="flex items-center justify-between h-13 p-2 border-b border-white/10 shrink-0">
                <Link
                    href="/"
                    onClick={() => { window.location.href = "/"; }}
                    className="flex items-center gap-2 group"
                >
                    <Image src="/svg/logo-openvid.svg" alt="Logo" width={30} height={30} />
                    <Image src="/svg/openvid.svg" alt="Logo" width={70} height={50} />
                </Link>

                <TooltipAction label={t("header.close")} side="right">
                    <motion.button
                        onClick={onTogglePanel}
                        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
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
                </TooltipAction>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTool === "screenshot" && (
                    <>
                        <div className="p-4">
                            <div className="flex items-center gap-2 text-white font-medium mb-4">
                                <Icon icon="solar:gallery-wide-linear" width="20" />
                                <span>{t("screenshot.background")}</span>
                            </div>
                            <div className="flex bg-[#09090B] rounded-lg p-1 text-xs font-medium">
                                <TabButton
                                    label={t("screenshot.tabs.wallpaper")}
                                    isActive={backgroundTab === "wallpaper"}
                                    onClick={() => onBackgroundTabChange("wallpaper")}
                                />
                                <TabButton
                                    label={t("screenshot.tabs.color")}
                                    isActive={backgroundTab === "color"}
                                    onClick={() => onBackgroundTabChange("color")}
                                />
                                <TabButton
                                    label={t("screenshot.tabs.image")}
                                    isActive={backgroundTab === "image"}
                                    onClick={() => onBackgroundTabChange("image")}
                                />
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-6 pb-12">
                            {backgroundTab === "wallpaper" && (
                                <Suspense fallback={<WallpaperSkeleton />}>
                                    <div className="flex flex-col gap-5">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 flex items-center gap-1.5">
                                                <span>{t("screenshot.options")}</span>
                                            </div>
                                            <OptionsGrid
                                                selectedIndex={selectedWallpaper}
                                                onSelect={onWallpaperSelect}
                                                onUnsplashSelect={(url) => {
                                                    onWallpaperSelect?.(-2);
                                                    onImageSelect?.(url);
                                                }}
                                            />
                                        </div>
                                        <WallpaperCatalogGrid
                                            selectedIndex={selectedWallpaper}
                                            onSelect={onWallpaperSelect}
                                            onUnsplashSelect={(url) => {
                                                onWallpaperSelect?.(-2);
                                                onImageSelect?.(url);
                                            }}
                                        />
                                    </div>
                                </Suspense>
                            )}

                            {backgroundTab === "image" && (
                                <Suspense fallback={<ImageBackgroundSkeleton />}>
                                    <ImageRecentBackgroundGrid
                                        images={uploadedImages?.filter(url => typeof url === 'string' && url.trim() !== "") || []}
                                        selectedUrl={selectedImageUrl}
                                        onSelect={onImageSelect}
                                        onRemove={onImageRemove}
                                        onUpload={onImageUpload}
                                    />
                                </Suspense>
                            )}

                            {backgroundTab === "color" && (
                                <Suspense fallback={<BackgroundColorSkeleton />}>
                                    <BackgroundColorEditor value={backgroundColorConfig} onChange={onBackgroundColorChange} />
                                </Suspense>
                            )}

                            <SliderControl
                                icon="mdi:blur"
                                label={t("screenshot.sliders.blur")}
                                value={backgroundBlur}
                                min={0}
                                max={20}
                                onChange={onBackgroundBlurChange}
                            />
                            <SliderControl
                                icon="mdi:arrow-expand-all"
                                label={t("screenshot.sliders.padding")}
                                value={padding}
                                min={0}
                                max={20}
                                onChange={onPaddingChange}
                            />
                            <SliderControl
                                icon="mdi:border-radius"
                                label={t("screenshot.sliders.rounded")}
                                value={roundedCorners}
                                min={0}
                                max={20}
                                onChange={onRoundedCornersChange}
                            />
                            <SliderControl
                                icon="material-symbols:shadow"
                                label={t("screenshot.sliders.shadows")}
                                value={shadows}
                                min={0}
                                max={20}
                                onChange={onShadowsChange}
                            />
                        </div>
                    </>
                )}

                {activeTool === "mockup" && (
                    <Suspense fallback={<MockupMenuSkeleton />}>
                        <MockupMenu mockupId={mockupId} mockupConfig={mockupConfig} onMockupChange={onMockupChange} onMockupConfigChange={onMockupConfigChange} />
                    </Suspense>
                )}

                {activeTool === "videos" && (
                    <Suspense fallback={<VideosMenuSkeleton />}>
                        <VideosMenu
                            onAddToTrack={onAddVideoToTrack}
                            onRemoveFromTrack={onRemoveVideoFromTrack}
                            onVideoUpload={onVideoUploadToLibrary}
                            onVideoDeleteFromTrack={onVideoDeleteFromTrack}
                            videosInTrackIds={videosInTrackIds}
                            refreshTrigger={videosLibraryRefresh}
                            isUploading={isVideoUploading}
                            onVideoAudioToggle={onVideoAudioToggle}
                        />
                    </Suspense>
                )}

                {activeTool === "elements" && (
                    <Suspense fallback={<ElementsMenuSkeleton />}>
                        <ElementsMenu
                            onAddElement={onAddCanvasElement || (() => { })}
                            selectedElement={selectedCanvasElement}
                            onUpdateElement={onUpdateCanvasElement}
                            onDeleteElement={onDeleteCanvasElement}
                            onBringToFront={onBringToFront}
                            onSendToBack={onSendToBack}
                        />
                    </Suspense>
                )}

                {activeTool === "audio" && (
                    <Suspense fallback={<AudioMenuSkeleton />}>
                        <AudioMenu
                            audioTracks={audioTracks}
                            uploadedAudios={uploadedAudios || []}
                            muteOriginalAudio={muteOriginalAudio}
                            masterVolume={masterVolume}
                            videoDuration={videoDuration}
                            onAudioUpload={onAudioUpload || (() => { })}
                            onUpdateAudioTrack={onUpdateAudioTrack || (() => { })}
                            onDeleteAudioTrack={onDeleteAudioTrack || (() => { })}
                            onToggleMuteOriginalAudio={onToggleMuteOriginalAudio || (() => { })}
                            onMasterVolumeChange={onMasterVolumeChange || (() => { })}
                        />
                    </Suspense>
                )}

                {activeTool === "zoom" && (
                    <>
                        {selectedZoomFragment ? (
                            <Suspense fallback={<ZoomFragmentEditorSkeleton />}>
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
                            </Suspense>
                        ) : (
                            <Suspense fallback={<ZoomGlobalConfigSkeleton />}>
                                <ZoomGlobalConfig
                                    fragments={zoomFragments}
                                    onSelectFragment={(id) => onSelectZoomFragment?.(id)}
                                    onAddFragment={() => onAddZoomFragment?.()}
                                />
                            </Suspense>
                        )}
                    </>
                )}

                {activeTool === "cursor" && (
                    <Suspense>
                        <CursorMenu
                            cursorConfig={cursorConfig}
                            onCursorConfigChange={onCursorConfigChange || (() => { })}
                            cursorData={cursorData}
                            isRecordedVideo={isRecordedVideo}
                        />
                    </Suspense>
                )}

                {activeTool === "camera" && (
                    <CameraMenu
                        cameraUrl={cameraUrl}
                        cameraConfig={cameraConfig}
                        onCameraConfigChange={onCameraConfigChange || (() => { })}
                    />
                )}

                {activeTool === "history" && (
                    <Suspense fallback={<HistoryMenuSkeleton />}>
                        <HistoryMenu
                            projects={imageProjects || []}
                            currentProjectId={currentImageProjectId}
                            isLoading={isLoadingProjects}
                            onSelectProject={onSelectImageProject || (() => { })}
                            onAddToCanvas={onAddImageToCanvas || (() => { })}
                            onDeleteProject={onDeleteImageProject || (() => { })}
                            onUploadToHistory={onUploadImageToHistory || (() => { })}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}