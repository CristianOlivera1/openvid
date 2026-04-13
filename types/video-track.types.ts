export interface VideoTrackClip {
    id: string;
    libraryVideoId: string;
    name: string;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
    thumbnailUrl?: string;
}

export function calculateTotalDuration(clips: VideoTrackClip[]): number {
    if (clips.length === 0) return 0;
    const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);
    const lastClip = sorted[sorted.length - 1];
    return lastClip.startTime + (lastClip.trimEnd - lastClip.trimStart);
}

export function findNextClipPosition(clips: VideoTrackClip[]): number {
    if (clips.length === 0) return 0;
    const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);
    const lastClip = sorted[sorted.length - 1];
    return lastClip.startTime + (lastClip.trimEnd - lastClip.trimStart);
}

export function doClipsOverlap(clip1: VideoTrackClip, clip2: VideoTrackClip): boolean {
    const clip1End = clip1.startTime + (clip1.trimEnd - clip1.trimStart);
    const clip2End = clip2.startTime + (clip2.trimEnd - clip2.trimStart);
    return clip1.startTime < clip2End && clip2.startTime < clip1End;
}

export function getClipAtTime(clips: VideoTrackClip[], time: number): VideoTrackClip | null {
    return clips.find(clip => {
        const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);
        return time >= clip.startTime && time < clipEnd;
    }) || null;
}

export function getActiveClipAtTime(
    clips: VideoTrackClip[], 
    time: number
): { clip: VideoTrackClip; localTime: number } | null {
    const clip = getClipAtTime(clips, time);
    if (!clip) return null;
    
    const timeInClip = time - clip.startTime;
    const localTime = clip.trimStart + timeInClip;
    
    return { clip, localTime };
}

export function sortClipsByTime(clips: VideoTrackClip[]): VideoTrackClip[] {
    return [...clips].sort((a, b) => a.startTime - b.startTime);
}
