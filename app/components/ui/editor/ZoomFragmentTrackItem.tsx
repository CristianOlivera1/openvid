"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import type { ZoomFragment } from "@/types/zoom.types";
import { isOrbitalZoomFragment, zoomLevelToFactor } from "@/types/zoom.types";

const MIN_FRAGMENT_DURATION = 0.5;

interface ZoomFragmentTrackItemProps {
    fragment: ZoomFragment;
    isSelected: boolean;
    contentWidth: number;
    videoDuration: number;
    contentDuration?: number;
    otherFragments: ZoomFragment[];
    onSelect: () => void;
    onUpdate: (updates: Partial<ZoomFragment>) => void;
    onDragStateChange?: (isDragging: boolean) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    speed?: number;
}

export function ZoomFragmentTrackItem({
    fragment,
    isSelected,
    contentWidth,
    videoDuration,
    contentDuration,
    otherFragments,
    onSelect,
    onUpdate,
    onDragStateChange,
    onMouseEnter,
    onMouseLeave,
    speed = 1,
}: ZoomFragmentTrackItemProps) {
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

    const initialLeft = timeToPixels(fragment.startTime);
    const initialWidth = timeToPixels(fragment.endTime - fragment.startTime);

    useEffect(() => {
        if (!isDragging && !isResizing) {
            fragmentX.set(initialLeft);
            fragmentWidth.set(initialWidth);
        }
    }, [initialLeft, initialWidth, isDragging, isResizing, fragmentX, fragmentWidth]);

    const boundaries = useMemo(() => {
        const sorted = [...otherFragments].sort((a, b) => a.startTime - b.startTime);

        let minStart = 0;
        let maxEnd = contentDuration ?? videoDuration;

        for (const other of sorted) {
            if (other.endTime <= fragment.startTime) {
                minStart = Math.max(minStart, other.endTime);
            }
            if (other.startTime >= fragment.endTime) {
                maxEnd = Math.min(maxEnd, other.startTime);
                break;
            }
        }

        return { minStart, maxEnd };
    }, [otherFragments, fragment.startTime, fragment.endTime, videoDuration, contentDuration]);


    const handleDrag = useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || videoDuration === 0) return;

        const currentX = fragmentX.get();
        const duration = fragment.endTime - fragment.startTime;

        let newX = currentX + info.delta.x;

        const minX = timeToPixels(boundaries.minStart);
        const maxX = timeToPixels(boundaries.maxEnd - duration);
        newX = Math.max(minX, Math.min(maxX, newX));

        fragmentX.set(newX);
    }, [contentWidth, videoDuration, fragmentX, fragment, boundaries, timeToPixels]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(fragmentX.get());
        const duration = fragment.endTime - fragment.startTime;
        const nextStartTime = Math.max(0, newStartTime);
        const nextEndTime = Math.min(contentDuration ?? videoDuration, newStartTime + duration);
        const timelineShift = nextStartTime - fragment.startTime;

        onUpdate({
            startTime: nextStartTime,
            endTime: nextEndTime,
            // Moving the full fragment preserves the same source-time offset.
            // Resizing intentionally does not change this anchor: it trims the
            // backend trajectory instead of restarting or stretching it.
            ...(isOrbitalZoomFragment(fragment) ? {
                trailSourceStartTime: (fragment.trailSourceStartTime ?? fragment.startTime) + timelineShift,
            } : {}),
        });
    }, [fragmentX, pixelsToTime, fragment, videoDuration, contentDuration, onUpdate, onDragStateChange]);

    const handleResizeStartDrag = useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
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
            const diff = minX - newX;
            newX = minX;
            newWidth = currentWidth - diff;
        }

        fragmentX.set(newX);
        fragmentWidth.set(newWidth);
    }, [contentWidth, videoDuration, fragmentX, fragmentWidth, boundaries, timeToPixels]);

    const handleResizeEndDrag = useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: { delta: { x: number } }) => {
        if (contentWidth === 0 || videoDuration === 0) return;

        const currentWidth = fragmentWidth.get();

        let newWidth = currentWidth + info.delta.x;

        const minWidth = timeToPixels(MIN_FRAGMENT_DURATION);
        newWidth = Math.max(minWidth, newWidth);

        const currentX = fragmentX.get();
        const maxWidth = timeToPixels(boundaries.maxEnd) - currentX;
        newWidth = Math.min(newWidth, maxWidth);

        fragmentWidth.set(newWidth);
    }, [contentWidth, videoDuration, fragmentWidth, fragmentX, boundaries, timeToPixels]);

    const handleResizeStart = useCallback((handle: 'start' | 'end') => {
        setIsResizing(handle);
        onDragStateChange?.(true);
    }, [onDragStateChange]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(null);
        onDragStateChange?.(false);

        const newStartTime = pixelsToTime(fragmentX.get());
        const newEndTime = pixelsToTime(fragmentX.get() + fragmentWidth.get());

        onUpdate({
            startTime: Math.max(0, newStartTime),
            endTime: Math.min(contentDuration ?? videoDuration, newEndTime),
            // Persist the original timeline anchor for Autozoom fragments
            // created before `trailSourceStartTime` was introduced.
            ...(isOrbitalZoomFragment(fragment) ? {
                trailSourceStartTime: fragment.trailSourceStartTime ?? fragment.startTime,
            } : {}),
        });
    }, [fragmentX, fragmentWidth, pixelsToTime, videoDuration, contentDuration, onUpdate, onDragStateChange]);

    const duration = fragment.endTime - fragment.startTime;
    const isInteracting = isDragging || isResizing !== null;

    return (
        <motion.div
            ref={containerRef}
            className={`absolute h-[90%] top-[5%] rounded-md flex items-center border transition-shadow select-none focus:outline-none ${isSelected || isInteracting
                ? 'bg-blue-500/30 border-blue-400/70 shadow-[0_0_10px_rgba(59,130,246,0.3)] z-10'
                : 'bg-blue-600/20 border-blue-500/35 hover:border-blue-500/60'
                } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
                x: fragmentX,
                width: fragmentWidth,
                background: isSelected || isInteracting
                    ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.5) 0%, rgba(29, 78, 216, 0.4) 100%)'
                    : 'linear-gradient(180deg, rgba(37, 99, 235, 0.2) 0%, rgba(30, 58, 138, 0.15) 100%)',
                boxShadow: isSelected || isInteracting
                    ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 10px rgba(59,130,246,0.3)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
            drag="x"
            dragConstraints={{ left: 0, right: contentWidth / speed }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            whileTap={{ scale: 0.98 }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={contentDuration ?? videoDuration}
            aria-valuenow={fragment.startTime}
            aria-label={`Zoom fragment ${zoomLevelToFactor(fragment.zoomLevel).toFixed(1)}x, ${(duration / speed).toFixed(1)}s`}
            tabIndex={0}
        >
            {/* Resize handle - Start */}
            <motion.div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 group/resize flex items-center justify-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeStartDrag}
                onDragStart={() => handleResizeStart('start')}
                onDragEnd={handleResizeEnd}
                onClick={(e) => e.stopPropagation()}
                role="slider"
                aria-label="Resize start"
                aria-valuemin={0}
                aria-valuemax={contentDuration ?? videoDuration}
                aria-valuenow={fragment.startTime}
                tabIndex={0}
            >
                <div className={`w-1 h-6 rounded-full transition-all ${isResizing === 'start'
                    ? 'bg-blue-300 scale-110'
                    : 'bg-blue-400/60 group-hover/resize:bg-blue-300'
                    }`} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center pointer-events-none overflow-hidden px-2">
                <span className={`text-[11px] truncate ${isSelected || isInteracting ? 'text-blue-200' : 'text-blue-300/70'}`}>
                    Zoom
                </span>
                <span className={`text-[9px] truncate ${isSelected || isInteracting ? 'text-blue-300/70' : 'text-blue-400/45'}`}>
                    {zoomLevelToFactor(fragment.zoomLevel).toFixed(1)}× · {(duration / speed).toFixed(1)}s
                </span>
            </div>

            {/* Resize handle - End */}
            <motion.div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 group/resize flex items-center justify-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleResizeEndDrag}
                onDragStart={() => handleResizeStart('end')}
                onDragEnd={handleResizeEnd}
                onClick={(e) => e.stopPropagation()}
                role="slider"
                aria-label="Resize end"
                aria-valuemin={0}
                aria-valuemax={contentDuration ?? videoDuration}
                aria-valuenow={fragment.endTime}
                tabIndex={0}
            >
                <div className={`w-1 h-6 rounded-full transition-all ${isResizing === 'end'
                    ? 'bg-blue-300 scale-110'
                    : 'bg-blue-400/60 group-hover/resize:bg-blue-300'
                    }`} />
            </motion.div>
        </motion.div>
    );
}

export function canAddFragmentAt(
    startTime: number,
    endTime: number,
    existingFragments: ZoomFragment[],
    excludeFragmentId?: string
): boolean {
    for (const fragment of existingFragments) {
        if (excludeFragmentId && fragment.id === excludeFragmentId) continue;

        const overlaps = startTime < fragment.endTime && endTime > fragment.startTime;
        if (overlaps) return false;
    }
    return true;
}

function findAllGaps(
    existingFragments: ZoomFragment[],
    videoDuration: number,
    minDuration: number
): Array<{ start: number; end: number }> {
    const gaps: Array<{ start: number; end: number }> = [];
    const sorted = [...existingFragments].sort((a, b) => a.startTime - b.startTime);

    if (sorted.length === 0) {
        if (videoDuration >= minDuration) {
            gaps.push({ start: 0, end: videoDuration });
        }
        return gaps;
    }

    if (sorted[0].startTime >= minDuration) {
        gaps.push({ start: 0, end: sorted[0].startTime });
    }

    for (let i = 0; i < sorted.length - 1; i++) {
        const gapStart = sorted[i].endTime;
        const gapEnd = sorted[i + 1].startTime;
        if (gapEnd - gapStart >= minDuration) {
            gaps.push({ start: gapStart, end: gapEnd });
        }
    }

    const lastEnd = sorted[sorted.length - 1].endTime;
    if (videoDuration - lastEnd >= minDuration) {
        gaps.push({ start: lastEnd, end: videoDuration });
    }

    return gaps;
}

export function findValidFragmentPosition(
    clickTime: number,
    defaultDuration: number,
    existingFragments: ZoomFragment[],
    videoDuration: number
): { startTime: number; endTime: number } | null {
    const gaps = findAllGaps(existingFragments, videoDuration, defaultDuration);

    if (gaps.length === 0) {
        return null;
    }

    for (const gap of gaps) {
        if (clickTime >= gap.start && clickTime <= gap.end) {
            const halfDuration = defaultDuration / 2;
            let startTime = clickTime - halfDuration;
            let endTime = clickTime + halfDuration;

            if (startTime < gap.start) {
                startTime = gap.start;
                endTime = startTime + defaultDuration;
            }
            if (endTime > gap.end) {
                endTime = gap.end;
                startTime = endTime - defaultDuration;
            }

            return { startTime, endTime };
        }
    }

    let closestGap = gaps[0];
    let closestDistance = Infinity;

    for (const gap of gaps) {
        const distToStart = Math.abs(clickTime - gap.start);
        const distToEnd = Math.abs(clickTime - gap.end);
        const gapCenter = (gap.start + gap.end) / 2;
        const distToCenter = Math.abs(clickTime - gapCenter);

        const minDist = Math.min(distToStart, distToEnd, distToCenter);

        if (minDist < closestDistance) {
            closestDistance = minDist;
            closestGap = gap;
        }
    }

    if (clickTime <= closestGap.start) {
        return {
            startTime: closestGap.start,
            endTime: closestGap.start + defaultDuration,
        };
    } else if (clickTime >= closestGap.end) {
        return {
            startTime: closestGap.end - defaultDuration,
            endTime: closestGap.end,
        };
    } else {
        return {
            startTime: closestGap.start,
            endTime: closestGap.start + defaultDuration,
        };
    }
}

