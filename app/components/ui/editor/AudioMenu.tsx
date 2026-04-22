"use client";

import { Icon } from "@iconify/react";
import { useCallback, useRef, useState, useEffect } from "react";
import type { AudioMenuProps, AudioTrack } from "@/types/audio.types";
import { SliderControl } from "../SliderControl";
import { AudioTrimModal } from "./AudioTrimModal";
import { Button } from "@/components/ui/button";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { TrackVolumeSlider } from "@/components/ui/TrackVolumeSlider";
import { useTranslations } from "next-intl";

export function AudioMenu({
    audioTracks,
    uploadedAudios,
    muteOriginalAudio,
    masterVolume,
    videoDuration,
    onAudioUpload,
    onUpdateAudioTrack,
    onDeleteAudioTrack,
    onToggleMuteOriginalAudio,
    onMasterVolumeChange,
}: AudioMenuProps) {
    const t = useTranslations("audioMenu");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [trimModalOpen, setTrimModalOpen] = useState(false);
    const [trimModalTrack, setTrimModalTrack] = useState<AudioTrack | null>(null);
    const [internalMasterVolume, setInternalMasterVolume] = useState(masterVolume * 100);

    useEffect(() => {
        const externalValue = masterVolume * 100;
        if (Math.abs(internalMasterVolume - externalValue) > 1) {
            setInternalMasterVolume(externalValue);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [masterVolume]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const SUPPORTED_AUDIO_FORMATS = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
            'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'
        ];

        if (!SUPPORTED_AUDIO_FORMATS.includes(file.type) &&
            !['.mp3', '.wav', '.ogg', '.aac', '.m4a'].some(ext => file.name.toLowerCase().endsWith(ext))) {
            alert("Formato de audio no soportado. Por favor usa MP3, WAV, OGG, AAC o M4A.");
            return;
        }

        const MAX_AUDIO_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_AUDIO_FILE_SIZE) {
            alert("El archivo es demasiado grande. El tamaño máximo es 10MB.");
            return;
        }

        onAudioUpload(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [onAudioUpload]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const SUPPORTED_AUDIO_FORMATS = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
            'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'
        ];
        if (!SUPPORTED_AUDIO_FORMATS.includes(file.type) &&
            !['.mp3', '.wav', '.ogg', '.aac', '.m4a'].some(ext => file.name.toLowerCase().endsWith(ext))) {
            alert("Formato de audio no soportado. Por favor usa MP3, WAV, OGG, AAC o M4A.");
            return;
        }
        const MAX_AUDIO_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_AUDIO_FILE_SIZE) {
            alert("El archivo es demasiado grande. El tamaño máximo es 10MB.");
            return;
        }
        onAudioUpload(file);
    }, [onAudioUpload]);

    return (
        <div className="p-4 flex flex-col gap-5">
            <div className="flex items-center gap-2 text-white font-medium">
                <Icon icon="mdi:volume-high" width="20" />
                <span>{t("title")}</span>
            </div>

            <div className="bg-[#09090B] border border-white/5 squircle-element p-3">
                <button
                    onClick={onToggleMuteOriginalAudio}
                    className="w-full flex items-center justify-between text-sm transition-colors text-white/80 hover:text-white">
                    <div className="flex items-center gap-2">
                        <Icon
                            icon={muteOriginalAudio ? "mdi:volume-off" : "mdi:volume-high"}
                            width="18"
                            className={muteOriginalAudio ? "text-red-400" : "text-blue-400"}
                        />
                        <span>{t("originalAudio")}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${muteOriginalAudio
                        ? "bg-red-500/20 text-red-400"
                        : "bg-blue-500/20 text-blue-400"
                        }`}>
                        {muteOriginalAudio ? t("muted") : t("active")}
                    </div>
                </button>
            </div>

            <SliderControl
                icon="mdi:volume-medium"
                label={t("masterVolume")}
                value={internalMasterVolume}
                min={0}
                max={100}
                onChange={(value: number) => {
                    setInternalMasterVolume(value);
                    onMasterVolumeChange(value / 100);
                }}
            />

            <div
                className={`flex flex-col items-center justify-center w-full rounded-lg transition-colors ${isDragOver ? "bg-blue-500/10 ring-1 ring-blue-500/40" : ""
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,.ogg,.aac,.m4a,audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Icon icon="mdi:upload" width="14" />
                    <span>{t("uploadButton")}</span>
                </Button>
                <p className="text-xs text-white/40 mt-2 text-center">
                    {t("uploadHint")}
                </p>
            </div>

            {audioTracks.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-white/60 flex items-center gap-2">
                        <Icon icon="mdi:timeline-clock" width="14" />
                        <span>{t("timelineTracks", { count: audioTracks.length })}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {audioTracks.map((track) => {
                            const isSelected = selectedTrackId === track.id;
                            const exceedsVideoDuration = (track.startTime + track.duration) > videoDuration;

                            return (
                                <div
                                    key={track.id}
                                    className={`bg-[#09090B] border squircle-element p-3 transition-all ${isSelected
                                        ? "border-blue-500/50 bg-blue-500/5"
                                        : "border-white/5 hover:border-white/10"
                                        }`}
                                    onClick={() => setSelectedTrackId(isSelected ? null : track.id)}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-white font-medium truncate">
                                                {track.name}
                                            </div>
                                            <div className="text-xs text-white/40 mt-0.5">
                                                {t("start")}: {formatDuration(track.startTime)} • {t("duration")}: {formatDuration(track.duration)}
                                            </div>
                                            {exceedsVideoDuration && (
                                                <div className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                                                    <Icon icon="mdi:alert" width="12" />
                                                    {t("exceedsDuration")}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <TooltipAction label={t("trimAction")}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTrimModalTrack(track);
                                                        setTrimModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                                >
                                                    <Icon icon="mdi:content-cut" width="16" />
                                                </button>
                                            </TooltipAction>
                                            <TooltipAction label={t("deleteAction")}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteAudioTrack(track.id);
                                                        if (selectedTrackId === track.id) {
                                                            setSelectedTrackId(null);
                                                        }
                                                    }}
                                                    className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Icon icon="material-symbols:delete-outline-rounded" width="16" />
                                                </button>
                                            </TooltipAction>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="flex flex-col gap-3 pt-2 border-t border-white/5 animate-in fade-in duration-150">
                                            <TrackVolumeSlider
                                                track={track}
                                                onUpdateAudioTrack={onUpdateAudioTrack}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {audioTracks.length === 0 && (
                <div className="text-center py-8 px-4 text-white/40">
                    <Icon icon="mdi:music-note-off" width="48" className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{t("noTracks")}</p>
                    <p className="text-xs mt-1">{t("noTracksHint")}</p>
                </div>
            )}

            {trimModalOpen && trimModalTrack && (() => {
                const originalAudio = uploadedAudios.find(a => a.id === trimModalTrack.audioId);
                if (!originalAudio) return null;

                return (
                    <AudioTrimModal
                        key={trimModalTrack.id}
                        isOpen={trimModalOpen}
                        audioName={trimModalTrack.name}
                        audioUrl={originalAudio.url}
                        audioDuration={originalAudio.duration}
                        initialTrimStart={trimModalTrack.trimStart ?? 0}
                        initialTrimEnd={(trimModalTrack.trimStart ?? 0) + trimModalTrack.duration}
                        onConfirm={(trimStart, trimEnd) => {
                            onUpdateAudioTrack(trimModalTrack.id, {
                                duration: trimEnd - trimStart,
                                trimStart: trimStart,
                            });
                            setTrimModalOpen(false);
                            setTrimModalTrack(null);
                        }}
                        onCancel={() => {
                            setTrimModalOpen(false);
                            setTrimModalTrack(null);
                        }}
                    />
                );
            })()}
        </div>
    );
}