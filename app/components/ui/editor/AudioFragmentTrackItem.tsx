"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import { AudioFragmentTrackItemProps, MIN_FRAGMENT_DURATION, MIN_VISUAL_WIDTH_PX } from "@/types/audio.types";

export function AudioFragmentTrackItem({
    track,
    audio,
    isSelected,
    contentWidth,
    videoDuration,
    otherTracks,
    onSelect,
    onUpdate,
    onDragStateChange,
    onMouseEnter,
    onMouseLeave,
}: AudioFragmentTrackItemProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fragmentX = useMotionValue(0);
    const fragmentWidth = useMotionValue(0);

    const timeToPixels = useCallback((time: number) => {
        return (time / videoDuration) * contentWidth;
    }, [videoDuration, contentWidth]);

    const pixelsToTime = useCallback((pixels: number) => {
        return (pixels / contentWidth) * videoDuration;
    }, [contentWidth, videoDuration]);

    const initialLeft = timeToPixels(track.startTime);
    const initialWidth = timeToPixels(track.duration);
    
    const visualWidth = Math.max(initialWidth, MIN_VISUAL_WIDTH_PX);

    useEffect(() => {
        if (!isDragging && !isResizing) {
            fragmentX.set(initialLeft);
            fragmentWidth.set(visualWidth);
        }
    }, [initialLeft, visualWidth, isDragging, isResizing, fragmentX, fragmentWidth]);

    const boundaries = useMemo(() => {
        const sorted = [...otherTracks]
            .filter(t => t.id !== track.id)
            .sort((a, b) => a.startTime - b.startTime);

        let minStart = 0;
        let maxEnd = videoDuration;

        for (const other of sorted) {
            const otherEnd = other.startTime + other.duration;
            const trackEnd = track.startTime + track.duration;

            if (otherEnd <= track.startTime) {
                minStart = Math.max(minStart, otherEnd);
            }
            if (other.startTime >= trackEnd) {
                maxEnd = Math.min(maxEnd, other.startTime);
                break;
            }
        }

        return { minStart, maxEnd };
    }, [otherTracks, track.id, track.startTime, track.duration, videoDuration]);

    // ── Drag (mover fragmento completo) ──────────────────────────────
    const handleDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || videoDuration === 0) return;

        const currentX = fragmentX.get();
        let newX = currentX + info.delta.x;

        const minX = timeToPixels(boundaries.minStart);
        const maxX = timeToPixels(boundaries.maxEnd - track.duration);
        newX = Math.max(minX, Math.min(maxX, newX));

        fragmentX.set(newX);
    }, [contentWidth, videoDuration, fragmentX, track.duration, boundaries, timeToPixels]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(fragmentX.get());
        onUpdate({
            startTime: Math.max(0, Math.min(videoDuration - track.duration, newStartTime)),
        });
    }, [fragmentX, pixelsToTime, track.duration, videoDuration, onUpdate, onDragStateChange]);

    const handleResizeStartDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || videoDuration === 0) return;

        const currentX = fragmentX.get();
        const currentWidth = fragmentWidth.get();

        let newX = currentX + info.delta.x;
        let newWidth = currentWidth - info.delta.x;

        const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);
        if (newWidth < minWidth) {
            newWidth = minWidth;
            newX = currentX + currentWidth - minWidth;
        }

        const minX = timeToPixels(boundaries.minStart);
        if (newX < minX) {
            newWidth = newWidth - (minX - newX);
            newX = minX;
        }

        if (audio) {
            const maxWidth = timeToPixels(audio.duration);
            if (newWidth > maxWidth) {
                const diff = newWidth - maxWidth;
                newX = newX + diff;
                newWidth = maxWidth;
            }
        }

        fragmentX.set(newX);
        fragmentWidth.set(newWidth);
    }, [contentWidth, videoDuration, fragmentX, fragmentWidth, boundaries, timeToPixels, audio]);

    const handleResizeEndDrag = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || videoDuration === 0) return;

        const currentX = fragmentX.get();
        const currentWidth = fragmentWidth.get();
        let newWidth = currentWidth + info.delta.x;

        const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);
        newWidth = Math.max(minWidth, newWidth);

        const maxWidth = timeToPixels(boundaries.maxEnd) - currentX;
        newWidth = Math.min(newWidth, maxWidth);

        if (audio) {
            newWidth = Math.min(newWidth, timeToPixels(audio.duration));
        }

        fragmentWidth.set(newWidth);
    }, [contentWidth, videoDuration, fragmentWidth, fragmentX, boundaries, timeToPixels, audio]);

    const handleResizeStart = useCallback((handle: 'start' | 'end') => {
        setIsResizing(handle);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(null);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(fragmentX.get());
        const newDuration = pixelsToTime(fragmentWidth.get());

        onUpdate({
            startTime: Math.max(0, newStartTime),
            duration: Math.min(audio?.duration ?? videoDuration, newDuration),
        });
    }, [fragmentX, fragmentWidth, pixelsToTime, audio, videoDuration, onUpdate, onDragStateChange]);

    const isInteracting = isDragging || isResizing !== null;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            ref={containerRef}
            className={`absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full cursor-grab active:cursor-grabbing transition-colors ${isSelected
                ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10'
                : 'bg-white/20 backdrop-blur-sm border border-white/10 hover:bg-white/30'
                } ${isInteracting ? 'z-10' : 'z-0'}`}
            style={{ x: fragmentX, width: fragmentWidth }}
            drag="x"
            dragConstraints={{ left: 0, right: contentWidth }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`flex items-center gap-[1.5px] px-1.5 h-full ${isSelected ? 'bg-white' : ''}`}>
                    <div className={`w-[1.5px] h-2 rounded-full ${isSelected ? 'bg-sky-400' : 'bg-white/60'}`} />
                    <div className={`w-[1.5px] h-3 rounded-full ${isSelected ? 'bg-sky-400' : 'bg-white/60'}`} />
                    <div className={`w-[1.5px] h-1.5 rounded-full ${isSelected ? 'bg-sky-400' : 'bg-white/60'}`} />
                </div>
            </div>

            <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-3 cursor-ew-resize z-20 flex items-center justify-center"
                animate={{ opacity: isHovered || isResizing === 'start' ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeStartDrag}
                onDragStart={(e) => { e.stopPropagation(); handleResizeStart('start'); }}
                onDragEnd={handleResizeEnd}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-1 h-4 bg-white rounded-full shadow-sm border border-gray-200" />
            </motion.div>

            <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-3 cursor-ew-resize z-20 flex items-center justify-center"
                animate={{ opacity: isHovered || isResizing === 'end' ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeEndDrag}
                onDragStart={(e) => { e.stopPropagation(); handleResizeStart('end'); }}
                onDragEnd={handleResizeEnd}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-1 h-4 bg-white rounded-full shadow-sm border border-gray-200" />
            </motion.div>
        </motion.div>

    );
}