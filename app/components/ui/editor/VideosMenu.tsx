"use client";

import { Icon } from "@iconify/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TooltipAction } from "@/components/ui/tooltip-action";
import {
  type LibraryVideoInfo,
  getLibraryVideoInfoList,
  deleteLibraryVideo,
  getLibraryVideo,
  updateVideoAudioState,
  formatFileSize,
  formatVideoDuration,
} from "@/lib/videos-library";

interface VideosMenuProps {
  onAddToTrack?: (videoId: string, blob: Blob, duration: number) => void;
  onRemoveFromTrack?: (videoId: string) => void;
  onVideoUpload?: (file: File) => void;
  onVideoDeleteFromTrack?: (videoId: string) => void;
  videosInTrackIds?: string[];
  refreshTrigger?: number;
  isUploading?: boolean;
  onVideoAudioToggle?: (videoId: string, hasAudio: boolean) => void;
}

export function VideosMenu({
  onAddToTrack,
  onRemoveFromTrack,
  onVideoUpload,
  onVideoDeleteFromTrack,
  videosInTrackIds = [],
  refreshTrigger,
  isUploading = false,
  onVideoAudioToggle
}: VideosMenuProps) {
  const [videos, setVideos] = useState<LibraryVideoInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVideos = useCallback(async () => {
    try {
      const videoList = await getLibraryVideoInfoList();
      setVideos(videoList);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);

    try {
      await deleteLibraryVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      onVideoDeleteFromTrack?.(id);
    } catch (error) {
      console.error("Error deleting video:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddToTrack = async (id: string) => {
    if (addingId || !onAddToTrack) return;
    setAddingId(id);

    try {
      const video = await getLibraryVideo(id);
      if (video) {
        onAddToTrack(video.id, video.blob, video.duration);
      }
    } catch (error) {
      console.error("Error adding video to track:", error);
    } finally {
      setAddingId(null);
    }
  };

  const handleToggleAudio = async (id: string, currentHasAudio: boolean | undefined) => {
    try {
      const newHasAudio = !(currentHasAudio ?? true);
      await updateVideoAudioState(id, newHasAudio);
      setVideos(prev => prev.map(v => v.id === id ? { ...v, hasAudio: newHasAudio } : v));
      onVideoAudioToggle?.(id, newHasAudio);
    } catch (error) {
      console.error("Error toggling audio state:", error);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onVideoUpload) {
      onVideoUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onVideoUpload]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/") && onVideoUpload) {
      onVideoUpload(file);
    }
  };

  return (
    <div
      className="p-4 flex flex-col gap-5 h-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B]/90 backdrop-blur-sm border-2 border-blue-500 border-dashed rounded-xl m-2"
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/20 border flex items-center justify-center border-blue-500/50 text-blue-400 mb-4 scale-110">
              <Icon icon="solar:upload-minimalistic-bold" className="text-2xl" />
            </div>
            <p className="text-blue-400 font-medium text-sm">¡Suelta tu video aquí!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center gap-2 text-white font-medium">
        <Icon icon="solar:video-library-outline" width="20" />
        <span>Videos</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon icon="svg-spinners:ring-resize" width="24" className="text-white/40" />
          </div>
        ) : videos.length === 0 ? (
          <div
            onClick={triggerFileUpload}
            className="group bg-[#09090B] border border-dashed border-white/10 hover:border-white/30 hover:bg-white/3 squircle-element p-8 text-center cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <Icon icon="solar:upload-minimalistic-outline" width="24" className="text-white/40 group-hover:text-white/70 transition-colors" />
            </div>
            <p className="text-sm font-medium text-white/70 mb-1">Subir video</p>
            <p className="text-xs text-white/40 mb-5">Haz clic o arrastra un archivo aquí</p>

            <Button
              disabled={isUploading}
              variant="outline"
              className="w-full text-xs"
            >
              {isUploading ? (
                <>
                  <Icon icon="svg-spinners:ring-resize" width="16" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <span>Seleccionar archivo</span>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              onClick={triggerFileUpload}
              disabled={isUploading}
              variant="outline"
              className="w-full text-xs mb-4 group"
            >
              {isUploading ? (
                <>
                  <Icon icon="svg-spinners:ring-resize" width="16" />
                  <span className="text-sm">Subiendo...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:upload-minimalistic-outline" width="16" className="group-hover:-translate-y-0.5 transition-transform" />
                  <span className="text-sm">Subir video</span>
                </>
              )}
            </Button>

            <AnimatePresence mode="popLayout">
              {videos.map((video) => (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  className={`group bg-[#09090B] border squircle-element overflow-hidden transition-colors ${videosInTrackIds.includes(video.id)
                    ? "border-blue-500/50 bg-blue-500/5"
                    : "border-white/5 hover:border-white/10"
                    }`}
                >
                  <div className="flex gap-3 p-2.5 items-center">
                    <div
                      className="relative w-20 h-12 rounded-md overflow-hidden bg-black/50 shrink-0 cursor-pointer"
                      onClick={() => {
                        if (!addingId) {
                          videosInTrackIds.includes(video.id) ? onRemoveFromTrack?.(video.id) : handleAddToTrack(video.id);
                        }
                      }}
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.fileName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon icon="solar:play-bold" width="20" className="text-white/30" />
                        </div>
                      )}

                      <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/70 rounded text-[9px] font-mono text-white/80">
                        {formatVideoDuration(video.duration)}
                      </div>

                      <div className={`absolute inset-0 flex items-center justify-center transition-all ${videosInTrackIds.includes(video.id)
                        ? "bg-blue-500/10 opacity-100"
                        : "bg-black/60 opacity-0 group-hover:opacity-100"
                        }`}>
                        {addingId === video.id ? (
                          <Icon icon="svg-spinners:ring-resize" width="20" className="text-white" />
                        ) : videosInTrackIds.includes(video.id) ? (
                          <Icon icon="solar:check-circle-bold" width="20" className="text-blue-400" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`
                                flex items-center gap-0.5 px-2 py-1 
                                bg-white/10 backdrop-blur-md border border-white/20 rounded-full 
                                shadow-2xl transition-all duration-300
                                group-hover:bg-white/20 group-hover:scale-105
                              `}>
                              <Icon
                                icon="material-symbols:add-rounded"
                                width="16"
                                className="text-white drop-shadow-md"
                              />
                              <span className="text-[9px] font-bold text-white tracking-wider">
                                Añadir
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-xs text-white/80 truncate" title={video.fileName}>
                        {video.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/40">{formatFileSize(video.fileSize)}</span>
                        <span className="text-[10px] text-white/30">•</span>
                        <span className="text-[10px] text-white/40">{video.width}×{video.height}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipAction label={video.hasAudio === false ? "Activar audio" : "Silenciar"}>
                        <button
                          onClick={() => handleToggleAudio(video.id, video.hasAudio)}
                          disabled={video.originalHasAudio === false}
                          className={`p-1.5 rounded-md transition-colors ${video.originalHasAudio === false
                            ? "text-white/10 cursor-not-allowed"
                            : video.hasAudio === false
                              ? "text-red-400 bg-red-500/10"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                            }`}
                        >
                          <Icon icon={video.hasAudio === false ? "solar:volume-cross-outline" : "solar:volume-loud-outline"} width="16" />
                        </button>
                      </TooltipAction>

                      <TooltipAction label="Eliminar video">
                        <button
                          onClick={() => handleDelete(video.id)}
                          disabled={deletingId === video.id}
                          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {deletingId === video.id ? (
                            <Icon icon="svg-spinners:ring-resize" width="16" />
                          ) : (
                            <Icon icon="solar:trash-bin-trash-outline" width="16" />
                          )}
                        </button>
                      </TooltipAction>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="text-[10px] text-white/25 text-center pt-2 border-t border-white/5 shrink-0">
        Los videos se almacenan localmente en tu navegador
      </div>
    </div>
  );
}