"use client";

import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { TickSliderControl } from "@/components/ui/TickSliderControl";
import { getCompletedAutozoomVideos, type AutozoomLibraryVideo } from "@/lib/autozoom-jobs-repo";
import { createClient } from "@/utils/supabase/client";

interface VideosMenuProps {
  onAddToTrack?: (video: AutozoomLibraryVideo) => void | Promise<void>;
  onRemoveFromTrack?: (videoId: string) => void;
  onVideoUpload?: (file: File) => void;
  videosInTrackIds?: string[];
  refreshTrigger?: number;
  isUploading?: boolean;
  onGlobalSpeedChange?: (speed: number) => void;
  globalSpeed?: number;
}

function formatVideoDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function VideosMenu({
  onAddToTrack,
  onRemoveFromTrack,
  onVideoUpload,
  videosInTrackIds = [],
  refreshTrigger,
  isUploading = false,
  onGlobalSpeedChange,
  globalSpeed = 1,
}: VideosMenuProps) {
  const t = useTranslations("videosMenu");
  const supabase = useMemo(() => createClient(), []);
  const [videos, setVideos] = useState<AutozoomLibraryVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const items = await getCompletedAutozoomVideos(supabase);
        if (!cancelled) setVideos(items);
      } catch (error) {
        console.error("Unable to load Autozoom video library:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    queueMicrotask(() => {
      if (!cancelled) void load();
    });

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, supabase]);

  const addToTrack = async (video: AutozoomLibraryVideo) => {
    if (addingId || !onAddToTrack) return;
    setAddingId(video.id);
    try {
      await onAddToTrack(video);
    } catch (error) {
      console.error("Unable to add Autozoom video to track:", error);
    } finally {
      setAddingId(null);
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file?.type.startsWith("video/") && onVideoUpload) onVideoUpload(file);
    event.target.value = "";
  }, [onVideoUpload]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!isUploading && file?.type.startsWith("video/") && onVideoUpload) onVideoUpload(file);
  };

  return (
    <div className="p-4 flex flex-col gap-5 h-full relative" onDragEnter={(event) => { event.preventDefault(); if (!isUploading) setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B]/90 backdrop-blur-sm border-2 border-blue-500 border-dashed rounded-xl m-2" onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
            <Icon icon="solar:upload-minimalistic-bold" className="text-3xl text-blue-400 mb-3" />
            <p className="text-blue-400 font-medium text-sm">{t("dropzone")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
      <div className="flex items-center gap-2 text-white font-medium">
        <Icon icon="solar:video-library-outline" width="20" aria-hidden="true" />
        <span>{t("title")}</span>
      </div>

      <div className="bg-[#09090B] border border-white/5 squircle-element p-3 shrink-0 mb-1">
        <TickSliderControl label={t("speed")} value={globalSpeed} min={0.5} max={3} step={0.1} tickStep={0.5} suffix="x" onChange={(value) => onGlobalSpeedChange?.(value)} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline" className="w-full text-xs mb-4 group">
          <Icon icon={isUploading ? "svg-spinners:ring-resize" : "solar:upload-minimalistic-outline"} width="16" />
          <span className="text-sm">{isUploading ? t("upload.status") : t("upload.button")}</span>
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-8"><Icon icon="svg-spinners:ring-resize" width="24" className="text-white/40" /></div>
        ) : videos.length === 0 ? (
          <div className="border border-dashed border-white/10 squircle-element p-8 text-center text-sm text-white/50">{t("emptyState.instruction")}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videos.map((video) => {
              const isInTrack = videosInTrackIds.includes(video.id);
              return (
                <motion.button key={video.id} type="button" layout onClick={() => { if (!addingId) isInTrack ? onRemoveFromTrack?.(video.id) : void addToTrack(video); }} className={`group overflow-hidden rounded-lg border text-left transition-all bg-neutral-950 ${isInTrack ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "border-neutral-800 hover:border-neutral-700"}`}>
                  <div className="relative aspect-video overflow-hidden bg-black">
                    <video src={video.outputUrl} muted preload="metadata" className="size-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 grid place-items-center bg-black/15">
                      <div className="rounded-full border border-white/20 bg-black/50 p-2 text-white">
                        <Icon icon={addingId === video.id ? "svg-spinners:ring-resize" : isInTrack ? "solar:check-circle-bold" : "solar:play-bold"} width="18" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-[11px] font-medium text-white/80">{video.fileName}</p>
                    <p className="mt-1 text-[10px] font-mono text-neutral-500">{formatVideoDuration(video.duration)} · {video.job.fragments?.length || 0} zooms</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
