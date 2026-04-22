"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import type { VideoTrackClip } from "@/types/video-track.types";
import { Icon } from "@iconify/react";
import type { MotionValue } from "framer-motion";

const MIN_CLIP_DURATION = 0.1;

interface VideoClipTrackItemProps {
    clip: VideoTrackClip;
    isSelected: boolean;
    contentWidth: number;
    totalDuration: number;
    otherClips: VideoTrackClip[];
    currentTime?: number;
    onSelect: () => void;
    onUpdate: (updates: Partial<VideoTrackClip>) => void;
    onDelete?: () => void;
    onDragStateChange?: (isDragging: boolean) => void;
    zoomLevel: number;
    playheadX: MotionValue<number>;
}

export function VideoClipTrackItem({
    clip,
    isSelected,
    contentWidth,
    totalDuration,
    otherClips,
    currentTime = 0,
    onSelect,
    onUpdate,
    onDelete,
    onDragStateChange,
    zoomLevel,
    playheadX,
}: VideoClipTrackItemProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const clipX = useMotionValue(0);
    const clipWidth = useMotionValue(0);

    const timeToPixels = useCallback((time: number) => {
        if (totalDuration === 0) return 0;
        return (time / totalDuration) * contentWidth;
    }, [totalDuration, contentWidth]);

    const clipDuration = clip.trimEnd - clip.trimStart;

    const pixelsToTime = useCallback((pixels: number) => {
        if (contentWidth === 0) return 0;
        return (pixels / contentWidth) * totalDuration;
    }, [contentWidth, totalDuration]);

    const initialLeft = timeToPixels(clip.startTime);
    const initialWidth = timeToPixels(clipDuration);

    const clipEndTime = clip.startTime + clipDuration;

    // Calculate progress within this clip (0 to clipWidth)
    const progressWidth = useTransform(
        playheadX,
        (px) => {
            const clipStartPx = timeToPixels(clip.startTime);
            const clipEndPx = timeToPixels(clip.startTime + clipDuration);
            if (px <= clipStartPx) return 0;
            if (px >= clipEndPx) return timeToPixels(clipDuration);
            return px - clipStartPx;
        }
    );

    useEffect(() => {
        if (!isDragging && !isResizing) {
            clipX.set(initialLeft);
            clipWidth.set(initialWidth);
        }
    }, [initialLeft, initialWidth, isDragging, isResizing, clipX, clipWidth]);

    // Calculate boundaries based on other clips
    const boundaries = useMemo(() => {
        const sorted = [...otherClips]
            .filter(c => c.id !== clip.id)
            .sort((a, b) => a.startTime - b.startTime);

        let minStart = 0;
        let maxEnd = Infinity;

        for (const other of sorted) {
            const otherEnd = other.startTime + (other.trimEnd - other.trimStart);
            const clipEnd = clip.startTime + clipDuration;

            if (otherEnd <= clip.startTime) {
                minStart = Math.max(minStart, otherEnd);
            }
            if (other.startTime >= clipEnd) {
                maxEnd = Math.min(maxEnd, other.startTime);
                break;
            }
        }

        return { minStart, maxEnd };
    }, [otherClips, clip.id, clip.startTime, clipDuration]);

    // Drag handler
    const handleDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || totalDuration === 0) return;

        const currentX = clipX.get();
        let newX = currentX + info.delta.x;

        const minX = timeToPixels(boundaries.minStart);
        const maxX = timeToPixels(boundaries.maxEnd - clipDuration);
        newX = Math.max(minX, Math.min(maxX, newX));

        clipX.set(newX);
    }, [contentWidth, totalDuration, clipX, clipDuration, boundaries, timeToPixels]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(clipX.get());
        onUpdate({
            startTime: Math.max(0, newStartTime),
        });
    }, [clipX, pixelsToTime, onUpdate, onDragStateChange]);

    // Resize handlers
    const handleResizeStartDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || totalDuration === 0) return;

        const currentX = clipX.get();
        const currentWidth = clipWidth.get();

        let newX = currentX + info.delta.x;
        let newWidth = currentWidth - info.delta.x;

        const minWidth = timeToPixels(MIN_CLIP_DURATION);
        if (newWidth < minWidth) {
            newWidth = minWidth;
            newX = currentX + currentWidth - minWidth;
        }

        const minX = timeToPixels(boundaries.minStart);
        if (newX < minX) {
            newWidth = newWidth - (minX - newX);
            newX = minX;
        }

        clipX.set(newX);
        clipWidth.set(newWidth);
    }, [contentWidth, totalDuration, clipX, clipWidth, boundaries, timeToPixels]);

    const handleResizeEndDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || totalDuration === 0) return;

        const currentX = clipX.get();
        const currentWidth = clipWidth.get();
        let newWidth = currentWidth + info.delta.x;

        const minWidth = timeToPixels(MIN_CLIP_DURATION);
        newWidth = Math.max(minWidth, newWidth);

        // Limit by boundary with other clips (if there's a next clip)
        if (Number.isFinite(boundaries.maxEnd)) {
            const maxWidthByBoundary = timeToPixels(boundaries.maxEnd) - currentX;
            newWidth = Math.min(newWidth, maxWidthByBoundary);
        }

        const maxAvailableDuration = clip.duration - clip.trimStart;
        const maxWidthBySource = timeToPixels(maxAvailableDuration);
        newWidth = Math.min(newWidth, maxWidthBySource);

        clipWidth.set(newWidth);
    }, [contentWidth, totalDuration, clipWidth, clipX, boundaries, timeToPixels, clip.duration, clip.trimStart]);

    const handleResizeStart = useCallback((handle: 'start' | 'end') => {
        setIsResizing(handle);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(null);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(clipX.get());
        const newDuration = pixelsToTime(clipWidth.get());

        // Calculate new trim values
        const trimDelta = newStartTime - clip.startTime;
        const newTrimStart = Math.max(0, clip.trimStart + trimDelta);
        const newTrimEnd = Math.min(clip.duration, newTrimStart + newDuration);

        onUpdate({
            startTime: Math.max(0, newStartTime),
            trimStart: newTrimStart,
            trimEnd: newTrimEnd,
        });
    }, [clipX, clipWidth, pixelsToTime, clip, onUpdate, onDragStateChange]);

    const isInteracting = isDragging || isResizing !== null;

    // Format duration for display
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    };

    return (
        <motion.div
            ref={containerRef}
            className={`absolute top-0 bottom-0 rounded-md cursor-grab active:cursor-grabbing overflow-hidden group ${isSelected
                ? 'ring-[1.5px] ring-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.3)] z-10'
                : ''
                } ${isInteracting ? 'z-10' : 'z-0'}`}
            style={{
                x: clipX,
                width: clipWidth,
                border: '1px solid rgba(52, 168, 83, 0.4)',
                background: '#182e20',
            }}
            drag="x"
            dragConstraints={{ left: 0, right: contentWidth }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 flex items-center overflow-hidden">
                <div className="flex h-full w-full">
                    {Array.from({ length: Math.max(1, Math.ceil(zoomLevel * 3)) }).map((_, i) => (
                        <div
                            key={i}
                            className="h-full flex-1 border-r border-[#34A853]/10 last:border-r-0"
                            style={{
                                background: 'linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(20, 80, 40, 0.1) 50%, rgba(52, 168, 83, 0.1) 100%)',
                                boxShadow: 'inset 0px 1px 0px rgba(255, 255, 255, 0.05)'
                            }}
                        />
                    ))}
                </div>
            </div>

            <motion.div
                className="absolute top-0 bottom-0 left-0 border-r-2 border-[#4ade80] pointer-events-none z-5"
                style={{
                    width: progressWidth,
                    background: `linear-gradient(to bottom, rgba(52, 168, 83, 0.9) 0%, rgba(34, 139, 34, 1) 50%, rgba(20, 80, 40, 1) 100%)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="flex items-center gap-2 text-emerald-400 text-[11px] font-medium drop-shadow-sm">
                    <Icon icon="solar:videocamera-record-bold" width="12" className="opacity-70" />
                    <span className="truncate max-w-30">{clip.name}</span>
                    <span className="text-emerald-400/60 font-mono text-[10px]">
                        {formatDuration(clipDuration)}
                    </span>
                </span>
            </div>

            <motion.div
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeStartDrag}
                onDragStart={() => handleResizeStart('start')}
                onDragEnd={handleResizeEnd}
            >
                <div className={`w-1.5 h-8 rounded-full transition-all ${isResizing === 'start' ? 'bg-[#4ade80] scale-110' : 'bg-[#34A853] group-hover/trim:bg-[#4ade80]'
                    }`} />
            </motion.div>

            <motion.div
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-end"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeEndDrag}
                onDragStart={() => handleResizeStart('end')}
                onDragEnd={handleResizeEnd}
            >
                <div className={`w-1.5 h-8 rounded-full transition-all ${isResizing === 'end' ? 'bg-[#4ade80] scale-110' : 'bg-[#34A853] group-hover/trim:bg-[#4ade80]'
                    }`} />
            </motion.div>
        </motion.div>
    );
}