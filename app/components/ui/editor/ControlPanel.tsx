"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { SliderControl } from "../../../../components/ui/SliderControl";
import { TabButton } from "../../../../components/ui/TabButton";
import type { ControlPanelProps } from "@/types/control-panel.types";
import Link from "next/link";
import Image from "next/image";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ElementsMenuSkeleton, ZoomGlobalConfigSkeleton, MockupMenuSkeleton, WallpaperSkeleton, BackgroundColorSkeleton, ZoomFragmentEditorSkeleton, AudioMenuSkeleton, VideosMenuSkeleton, HistoryMenuSkeleton, MotionGlobalConfigSkeleton, MotionFragmentEditorSkeleton } from "../Skeleton";

import { ElementsMenu } from "./ElementsMenu";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { CameraMenu } from "./CameraMenu";
import { useMockup3dContext } from "@/app/contexts/Mockup3dContext";
import { ProjectorPanel } from "@/components/projection/ProjectorPanel";

const BackgroundColorEditor = lazy(() => import("../BackgroundColorEditor").then(mod => ({ default: mod.BackgroundColorEditor })));
const ZoomFragmentEditor = lazy(() => import("./ZoomFragmentEditor").then(mod => ({ default: mod.ZoomFragmentEditor })));
const ZoomGlobalConfig = lazy(() => import("./ZoomGlobalConfig").then(mod => ({ default: mod.ZoomGlobalConfig })));
const OptionsGrid = lazy(() => import("../WallpaperSections").then(mod => ({ default: mod.OptionsGrid })));
const WallpaperCatalogGrid = lazy(() => import("../WallpaperSections").then(mod => ({ default: mod.WallpaperCatalogGrid })));
const MockupMenu = lazy(() => import("./MockupMenu").then(mod => ({ default: mod.MockupMenu })));
const AudioMenu = lazy(() => import("./AudioMenu").then(mod => ({ default: mod.AudioMenu })));
const VideosMenu = lazy(() => import("./VideosMenu").then(mod => ({ default: mod.VideosMenu })));
const HistoryMenu = lazy(() => import("./HistoryMenu").then(mod => ({ default: mod.HistoryMenu })));
const MotionGlobalConfig = lazy(() => import("./MotionGlobalConfig").then(mod => ({ default: mod.MotionGlobalConfig })));
const MotionFragmentEditor = lazy(() => import("./MotionFragmentEditor").then(mod => ({ default: mod.MotionFragmentEditor })));

interface ExtendedControlPanelProps extends ControlPanelProps {
    onTogglePanel?: () => void;
    isOpen?: boolean;
    elementsTextTabTrigger?: number;
}

export function ControlPanel({
    activeTool,
    backgroundTab,
    selectedWallpaper,
    backgroundBlur,
    padding,
    roundedCorners,
    shadows,
    selectedImageUrl,
    backgroundColorConfig,
    backgroundColorCss,
    onBackgroundTabChange,
    onWallpaperSelect,
    wallpaperShowAll = false,
    onWallpaperShowAllChange,
    onBackgroundBlurChange,
    onPaddingChange,
    onRoundedCornersChange,
    onShadowsChange,
    onImageSelect,
    onBackgroundColorChange,
    onTogglePanel,
    elementsTextTabTrigger = 0,
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
    initialMockupMenuPage,
    mockupMenuNavigationToken = 0,
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
    onAudioUpload,
    onUpdateAudioTrack,
    onDeleteAudioTrack,
    selectedAudioTrackId,
    setSelectedAudioTrackId,
    videoDuration = 0,
    isRecordedVideo = false,
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
    mediaType = "video",
    globalSpeed = 1,
    onGlobalSpeedChange,
    mockupMotionFragments = [],
    selectedMockupMotionFragment = null,
    selectedMockupMotionFragmentId = null,
    onAddOrReplaceMotionPreset,
    onUpdateMockupMotionFragment,
    onSelectMockupMotionFragment,
    onDeleteMockupMotionFragment,
    canvasRef,
}: ExtendedControlPanelProps & { canvasRef?: React.RefObject<{ getExportCanvas: () => HTMLCanvasElement | null; getPreviewContainer: () => HTMLDivElement | null } | null> }) {

    const t = useTranslations("controlPanel");
    const { imagePhoneActive } = useMockup3dContext();
    const [isGlobalMotionEnabled, setIsGlobalMotionEnabled] = useState(true);
    const hasMockup2D = mediaType === "video" && !imagePhoneActive;

    const [isDark, setIsDark] = useState(
      () => typeof window !== "undefined" && document.documentElement.classList.contains("dark")
    );

    useEffect(() => {
      const html = document.documentElement;
      const update = () => setIsDark(html.classList.contains("dark"));
      update();
      const observer = new MutationObserver(update);
      observer.observe(html, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

    return (
        <div className="relative w-full sm:w-[320px] h-screen bg-background flex flex-col shrink-0" role="complementary" aria-label="Control panel">
            <header className="relative flex items-center justify-between h-13 p-2 border-r shrink-0 bg-transparent isolation-isolate" role="banner">
                <div
                    className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-90 ${isDark
                        ? "bg-[url('/images/pages/header-gradient.avif')]"
                        : "bg-[url('/images/pages/header-gradient-light.png')]"
                        }`}
                    style={{
                        maskImage: `
                            linear-gradient(to bottom, black 55%, transparent 99%),
                            linear-gradient(to right, transparent 0%, black 15%),
                            linear-gradient(to left, transparent 0%, black 10%)
                        `,
                        WebkitMaskImage: `
                            linear-gradient(to bottom, black 55%, transparent 99%),
                            linear-gradient(to right, transparent 0%, black 15%),
                            linear-gradient(to left, transparent 0%, black 10%)
                        `,
                        maskComposite: "intersect",
                        WebkitMaskComposite: "source-in"
                    }}
                />

                <Link
                    href="/"
                    onClick={() => { window.location.href = "/"; }}
                    className="relative flex items-center gap-2 group pl-2 z-10"
                    aria-label="Openvid home"
                >
                    <Image
                        src={isDark ? "/svg/openvid-complete-static.svg" : "/svg/openvid-complete-light.svg"}
                        alt="Openvid"
                        width={100}
                        height={80}
                    />
                </Link>

                <TooltipAction label={t("header.close")} side="right">
                    <motion.button
                        onClick={onTogglePanel}
                        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 z-10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={t("header.close")}
                    >
                        <motion.div
                            animate={{ rotate: isOpen ? 0 : 180 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <Icon icon="lucide:sidebar-close" width="20" aria-hidden="true" />
                        </motion.div>
                    </motion.button>
                </TooltipAction>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar border-r">
                {activeTool === "screenshot" && (
                    <>
                        <div className="p-4">
                            <div className="flex items-center gap-2 text-foreground font-medium mb-4">
                                <Icon icon="solar:gallery-wide-linear" width="20" />
                                <span>{t("screenshot.background")}</span>
                            </div>
                            <div className="flex bg-muted rounded-lg p-1 text-xs font-medium">
                                <TabButton label={t("screenshot.tabs.wallpaper")} isActive={backgroundTab === "wallpaper"} onClick={() => onBackgroundTabChange("wallpaper")} />
                                <TabButton label={t("screenshot.tabs.color")} isActive={backgroundTab === "color"} onClick={() => onBackgroundTabChange("color")} />
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-6 pb-12">
                            {backgroundTab === "wallpaper" && (
                                <Suspense fallback={<WallpaperSkeleton />}>
                                    <div className="flex flex-col gap-5">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
                                                <span>{t("screenshot.options")}</span>
                                            </div>
                                            <OptionsGrid
                                                selectedIndex={selectedWallpaper}
                                                onSelect={onWallpaperSelect}
                                                onUnsplashSelect={(url) => {
                                                    onWallpaperSelect?.(-2);
                                                    onImageSelect?.(url);
                                                }}
                                                onCustomImageSelect={(url) => {
                                                    onWallpaperSelect?.(-2);
                                                    onImageSelect?.(url);
                                                }}
                                            />
                                        </div>
                                        <WallpaperCatalogGrid
                                            selectedIndex={selectedWallpaper}
                                            onSelect={onWallpaperSelect}
                                            showAll={wallpaperShowAll}
                                            onShowAllChange={onWallpaperShowAllChange}
                                            onUnsplashSelect={(url) => {
                                                onWallpaperSelect?.(-2);
                                                onImageSelect?.(url);
                                            }}
                                        />
                                    </div>
                                </Suspense>
                            )}

                            {backgroundTab === "color" && (
                                <Suspense fallback={<BackgroundColorSkeleton />}>
                                    <BackgroundColorEditor value={backgroundColorConfig} onChange={onBackgroundColorChange} />
                                </Suspense>
                            )}

                            <div className="flex flex-col gap-4 mt-2">
                                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                                    <span>{t("screenshot.settings")}</span>
                                </div>

                                <SliderControl
                                    icon="mdi:blur"
                                    label={t("screenshot.sliders.blur")}
                                    value={backgroundBlur}
                                    min={0}
                                    max={30}
                                    onChange={onBackgroundBlurChange}
                                />
                                <SliderControl
                                    icon="mdi:arrow-expand-all"
                                    label={t("screenshot.sliders.padding")}
                                    value={padding}
                                    min={0}
                                    max={30}
                                    onChange={onPaddingChange}
                                />
                                <SliderControl
                                    icon="mdi:border-radius"
                                    label={t("screenshot.sliders.rounded")}
                                    value={roundedCorners}
                                    min={0}
                                    max={30}
                                    onChange={onRoundedCornersChange}
                                />
                                <SliderControl
                                    icon="material-symbols:shadow"
                                    label={t("screenshot.sliders.shadows")}
                                    value={shadows}
                                    min={0}
                                    max={30}
                                    onChange={onShadowsChange}
                                />
                            </div>
                        </div>
                    </>
                )}

                {activeTool === "mockup" && (
                    <Suspense fallback={<MockupMenuSkeleton />}>
                        <MockupMenu
                            key={mockupMenuNavigationToken}
                            mockupId={mockupId}
                            mockupConfig={mockupConfig}
                            onMockupChange={onMockupChange}
                            onMockupConfigChange={onMockupConfigChange}
                            backgroundTab={backgroundTab}
                            selectedWallpaper={selectedWallpaper}
                            selectedImageUrl={selectedImageUrl}
                            backgroundColorCss={backgroundColorCss}
                            initialPage={initialMockupMenuPage}
                            mediaType={mediaType}
                        />
                    </Suspense>
                )}
                {activeTool === "motion" && (
                    <>
                        {selectedMockupMotionFragment && hasMockup2D ? (
                            <Suspense fallback={<MotionFragmentEditorSkeleton />}>
                                <MotionFragmentEditor
                                    fragment={selectedMockupMotionFragment}
                                    isGlobalMotionEnabled={isGlobalMotionEnabled}
                                    onUpdate={(updates) =>
                                        selectedMockupMotionFragmentId &&
                                        onUpdateMockupMotionFragment?.(selectedMockupMotionFragmentId, updates)
                                    }
                                    onDelete={() => {
                                        if (selectedMockupMotionFragmentId) {
                                            onDeleteMockupMotionFragment?.(selectedMockupMotionFragmentId);
                                        }
                                        onSelectMockupMotionFragment?.(null);
                                    }}
                                    onClose={() => onSelectMockupMotionFragment?.(null)}
                                />
                            </Suspense>
                        ) : (
                            <Suspense fallback={<MotionGlobalConfigSkeleton />}>
                                <MotionGlobalConfig
                                    fragments={mockupMotionFragments}
                                    onAddOrReplacePreset={(presetId) => onAddOrReplaceMotionPreset?.(presetId)}
                                    hasMockup2D={hasMockup2D}
                                    isGlobalMotionEnabled={isGlobalMotionEnabled}
                                    onToggleGlobalMotion={setIsGlobalMotionEnabled}
                                />
                            </Suspense>
                        )}
                    </>
                )}

                {activeTool === "video" && (
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
                            globalSpeed={globalSpeed}
                            onGlobalSpeedChange={onGlobalSpeedChange}
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
                            textTabTrigger={elementsTextTabTrigger}
                        />
                    </Suspense>
                )}

                {activeTool === "audio" && (
                    <Suspense fallback={<AudioMenuSkeleton />}>
                        <AudioMenu
                            audioTracks={audioTracks}
                            uploadedAudios={uploadedAudios || []}
                            videoDuration={videoDuration}
                            onAudioUpload={onAudioUpload || (() => { })}
                            onUpdateAudioTrack={onUpdateAudioTrack || (() => { })}
                            onDeleteAudioTrack={onDeleteAudioTrack || (() => { })}
                            selectedAudioTrackId={selectedAudioTrackId ?? null}
                            onSelectAudioTrack={setSelectedAudioTrackId || (() => { })}
                        />
                    </Suspense>
                )}

                {activeTool === "zoom" && (
                    <>
                        {selectedZoomFragment ? (
                            <Suspense fallback={<ZoomFragmentEditorSkeleton />}>
                                <ZoomFragmentEditor
                                    key={selectedZoomFragment.id}
                                    fragment={selectedZoomFragment}
                                    videoUrl={videoUrl ?? null}
                                    videoThumbnail={videoThumbnail}
                                    currentTime={currentTime}
                                    getThumbnailForTime={getThumbnailForTime}
                                    videoDimensions={videoDimensions}
                                    onBack={() => onSelectZoomFragment?.(null)}
                                    onDelete={() => onDeleteZoomFragment?.(selectedZoomFragment.id)}
                                    onUpdate={(updates) => onUpdateZoomFragment?.(selectedZoomFragment.id, updates)}
                                    is3DModelActive={imagePhoneActive}
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

                {activeTool === "projector" && (
                    <div className="p-4">
                        <div className="flex items-center gap-2 text-foreground font-medium mb-4">
                            <Icon icon="solar:projector-linear" width="20" />
                            <span>Projector Mapping</span>
                        </div>
                        <ProjectorPanel
                          canvasGetter={() => canvasRef?.current?.getExportCanvas() ?? null}
                          previewGetter={() => canvasRef?.current?.getPreviewContainer() ?? null}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}