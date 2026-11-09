"use client";

import { Button } from "@/components/ui/button";
import { TabButton } from "@/components/ui/TabButton";
import { Icon } from "@iconify/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ExportQuality } from "@/types";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

interface ExportProgress {
  status: "idle" | "preparing" | "encoding" | "finalizing" | "complete" | "error";
  progress: number;
  message: string;
}

interface ExportDropdownProps {
  onExport: (quality: ExportQuality, fps?: number, bitrate?: number) => void;
  exportProgress: ExportProgress;
  hasTransparentBackground?: boolean;
}

type VideoFormat = "mp4" | "webm" | "gif";
type BitratePreset = "balanced" | "youtube" | "custom";

interface QualityOption {
  id: ExportQuality;
  resolution: string;
  recommended?: boolean;
  tag?: "recommended" | "maxClarity";
}

const QUALITY_OPTIONS: QualityOption[] = [
  { id: "1080p", resolution: "1920 × 1080", recommended: true, tag: "recommended" },
  { id: "4k", resolution: "3840 × 2160", tag: "maxClarity" },
  { id: "2k", resolution: "2560 × 1440" },
  { id: "720p", resolution: "1280 × 720" },
  { id: "480p", resolution: "854 × 480" },
];

const FPS_PRESETS = [
  { value: 30, desc: "standard" },
  { value: 60, desc: "ultraSmooth", recommended: true },
  { value: 120, desc: "highRefresh" },
];

export function ExportDropdown({ onExport, exportProgress, hasTransparentBackground }: ExportDropdownProps) {
  const t = useTranslations("editor.export");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat>("mp4");
  const [selectedQuality, setSelectedQuality] = useState<ExportQuality>("1080p");
  const [selectedFps, setSelectedFps] = useState<number>(60);
  const [bitrateMode, setBitrateMode] = useState<BitratePreset>("youtube");
  const [customBitrateMbps, setCustomBitrateMbps] = useState<number>(12);

  const isExporting = exportProgress.status !== "idle" &&
    exportProgress.status !== "complete" &&
    exportProgress.status !== "error";

  const isTransparent = !!hasTransparentBackground;

  // Calculate effective bitrate in bits/sec based on preset or resolution
  const effectiveBitrateBps = useMemo(() => {
    switch (bitrateMode) {
      case "balanced":
        return selectedQuality === "4k" ? 25_000_000 : selectedQuality === "2k" ? 16_000_000 : 10_000_000;
      case "youtube":
        return selectedQuality === "4k" ? 45_000_000 : selectedQuality === "2k" ? 24_000_000 : 18_000_000;
      case "custom":
        return customBitrateMbps * 1_000_000;
      default:
        return 10_000_000;
    }
  }, [bitrateMode, selectedQuality, customBitrateMbps]);

  const estimatedMbPerMin = useMemo(() => {
    return Math.round((effectiveBitrateBps / 8 / 1_000_000) * 60);
  }, [effectiveBitrateBps]);

  const handleStartExport = () => {
    setIsOpen(false);
    if (selectedFormat === "gif") {
      onExport("gif", 24);
    } else if (selectedFormat === "webm" || isTransparent) {
      onExport("webm-alpha", selectedFps, effectiveBitrateBps);
    } else {
      onExport(selectedQuality, selectedFps, effectiveBitrateBps);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="primary"
          className="px-3.5 py-2 text-sm gap-2 min-w-28 font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
          size="sm"
          disabled={isExporting}
          aria-label={t("button")}
        >
          <Icon icon="lucide:download" width="16" className="text-white" aria-hidden="true" />
          {t("button")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[390px] p-0 bg-background/95 backdrop-blur-xl border border-border/80 text-foreground shadow-2xl rounded-xl overflow-hidden z-999999 max-h-[90vh] flex flex-col"
      >
        <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {t("videoTitle")}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("format")}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50">
              <TabButton
                label={t("formats.mp4")}
                isActive={selectedFormat === "mp4"}
                onClick={() => setSelectedFormat("mp4")}
                className="flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5"
                activeClassName="bg-background text-foreground shadow-sm font-semibold border border-border/40"
              >
                <Icon icon="mdi:video" width="14" className={selectedFormat === "mp4" ? "text-blue-500" : ""} />
                {t("formats.mp4")}
              </TabButton>
              <TabButton
                label={t("formats.webm")}
                isActive={selectedFormat === "webm"}
                onClick={() => setSelectedFormat("webm")}
                className="flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5"
                activeClassName="bg-background text-foreground shadow-sm font-semibold border border-border/40"
              >
                <Icon icon="mdi:web" width="14" className={selectedFormat === "webm" ? "text-cyan-500" : ""} />
                {t("formats.webm")}
              </TabButton>
              <TabButton
                label={t("formats.gif")}
                isActive={selectedFormat === "gif"}
                onClick={() => setSelectedFormat("gif")}
                className="flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5"
                activeClassName="bg-background text-foreground shadow-sm font-semibold border border-border/40"
              >
                <Icon icon="mdi:file-gif-box" width="14" className={selectedFormat === "gif" ? "text-orange-500" : ""} />
                {t("formats.gif")}
              </TabButton>
            </div>
          </div>

          {selectedFormat !== "gif" && (
            <div>
              <div className="flex items-center mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("targetBitrate")}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-lg border border-border/50">
                <TabButton
                  label={t("social")}
                  isActive={bitrateMode === "balanced"}
                  onClick={() => setBitrateMode("balanced")}
                  className="flex-1 py-1.5 px-1 text-[11px] font-medium rounded-lg transition-all flex flex-col items-center gap-0.5"
                  activeClassName="bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold"
                >
                  <Icon icon="lucide:share-2" width="14" className="text-blue-500" />
                  <span>{t("social")}</span>
                  <span className="text-[9px] opacity-75 font-mono">{t("balanced")}</span>
                </TabButton>

                <TabButton
                  label={t("youtube")}
                  isActive={bitrateMode === "youtube"}
                  onClick={() => setBitrateMode("youtube")}
                  className="flex-1 py-1.5 px-1 text-[11px] font-medium rounded transition-all flex flex-col items-center gap-0.5"
                  activeClassName="bg-red-500/15 text-red-400 border border-red-500/30 font-semibold"
                >
                  <Icon icon="mdi:youtube" width="14" className="text-red-500" />
                  <span>{t("youtube")}</span>
                  <span className="text-[9px] opacity-75 font-mono">{t("maxHq")}</span>
                </TabButton>

                <TabButton
                  label={t("custom")}
                  isActive={bitrateMode === "custom"}
                  onClick={() => setBitrateMode("custom")}
                  className="flex-1 py-1.5 px-1 text-[11px] font-medium rounded transition-all flex flex-col items-center gap-0.5"
                  activeClassName="bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold"
                >
                  <Icon icon="lucide:sliders" width="14" className="text-purple-500" />
                  <span>{t("custom")}</span>
                  <span className="text-[9px] opacity-75 font-mono">{t("slider")}</span>
                </TabButton>
              </div>

              {bitrateMode === "custom" && (
                <div className="mt-2.5 p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium">{t("customBitrate")}</span>
                    <span className="font-mono text-xs font-bold text-purple-400">{customBitrateMbps} Mbps</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={customBitrateMbps}
                    onChange={(e) => setCustomBitrateMbps(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                    <span>1 Mbps ({t("bitrateRange.tiny")})</span>
                    <span>25 Mbps ({t("bitrateRange.highQuality")})</span>
                    <span>50 Mbps ({t("bitrateRange.master")})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedFormat !== "gif" && (
            <div>
              <div className="flex items-center mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("frameRate")}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {FPS_PRESETS.map((preset) => {
                  const isSelected = selectedFps === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setSelectedFps(preset.value)}
                      className={`p-2 rounded-lg border text-left transition-all relative ${isSelected
                        ? "border-blue-500/60 bg-blue-500/10 text-foreground shadow-sm ring-1 ring-blue-500/30"
                        : "border-border/60 bg-card/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? "text-blue-500 dark:text-blue-400" : ""}`}>
                          {preset.value} FPS
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5 leading-tight">
                        {t(`frameRates.${preset.desc}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedFormat !== "gif" ? (
            <div>
              <div className="flex items-center mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("resolution")}</span>
              </div>
              <div className="space-y-1.5 max-h-75 overflow-y-auto custom-scrollbar pr-1">
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = selectedQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuality(opt.id);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${isSelected
                        ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/20"
                        : "border-border/40 hover:border-border/80 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold ${isSelected ? "text-foreground" : ""}`}>
                              {t(`qualities.${opt.id}.label`)}
                            </span>
                            {opt.tag && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-muted text-muted-foreground border border-border/40">
                                {t(`qualityTags.${opt.tag}`)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/80 block">
                            {opt.resolution}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/40">
                        {selectedFps} fps
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 text-orange-400 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
                <Icon icon="mdi:information-outline" width="16" />
                {t("gifTitle")}
              </div>
              <p className="text-[11px] text-orange-400/80 leading-relaxed">
                {t("gifDescription")}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border/60 bg-muted/30 flex items-center gap-2 shrink-0">
          <Button
            onClick={handleStartExport}
            variant="primary"
            className="w-full py-2.5 text-xs font-semibold gap-2 shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
          >
            {t("exportFormat", { format: selectedFormat.toUpperCase() })}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}