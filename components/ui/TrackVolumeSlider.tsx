import { SliderControl } from "@/app/components/ui/SliderControl";
import { AudioTrack } from "@/types/audio.types";
import { useState, useEffect } from "react";

export function TrackVolumeSlider({ track, onUpdateAudioTrack }: {
    track: AudioTrack;
    onUpdateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
}) {
    const [internalVolume, setInternalVolume] = useState(track.volume * 100);

    useEffect(() => {
        const externalValue = track.volume * 100;
        if (Math.abs(internalVolume - externalValue) > 1) {
            setInternalVolume(externalValue);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [track.volume]);

    return (
        <SliderControl
            icon="mdi:volume-medium"
            label="Volumen"
            value={internalVolume}
            min={0}
            max={100}
            onChange={(value: number) => {
                setInternalVolume(value);
                onUpdateAudioTrack(track.id, { volume: value / 100 });
            }}
        />
    );
}