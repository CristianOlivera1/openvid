"use client";
import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { formatTime, getZoomMultiplier } from "@/lib/video.utils";
import { TIMELINE_LABEL_WIDTH, MIN_TRIM_DURATION } from "@/lib/constants";
import { DEFAULT_MOVEMENT_DURATION, DEFAULT_ZOOM_FRAGMENT_DURATION, ELEMENT_ROW_HEIGHT, VIDEO_ROW_MAX_HEIGHT, VIDEO_ROW_MIN_HEIGHT, type TimelineProps } from "@/types/timeline.types";
import LabelSidebar from "./LabelSidebar";
import { ZoomFragmentTrackItem } from "./ZoomFragmentTrackItem";
import { AudioFragmentTrackItem } from "./AudioFragmentTrackItem";
import { VideoClipTrackItem } from "./VideoClipTrackItem";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { MockupMotionTrackItem } from "./MockupMotionTrackItem";
import { assignAudioLanes } from "@/lib/audio.utils";
import { MIN_VISUAL_WIDTH_PX } from "@/types";
import { assignElementLanes } from "@/lib/canvas-elements-timeline.utils";
import { ElementFragmentTrackItem } from "./ElementFragmentTrackItem";
import { findValidFragmentPosition, findValidMovementPosition, getFragmentHoldBounds } from "@/types/zoom.types";
import { ZoomMovementTrackItem, MIN_MOVEMENT_TRACK_DURATION } from "./ZoomMovementTrackItem";
import { collectSnapPoints, findSnap } from "@/lib/timeline-snapping";

export function Timeline({
    videoDuration,
    currentTime,
    onSeek,
    videoUrl = null,
    zoomLevel,
    isDraggingPlayhead = false,
    onDragStart,
    onDragEnd,
    trimRange,
    onTrimChange,
    videoClips = [],
    selectedVideoClipId,
    onSelectVideoClip,
    onUpdateVideoClip,
    onDeleteVideoClip,
    onReorderVideoClip,
    zoomFragments = [],
    selectedZoomFragmentId,
    onSelectZoomFragment,
    onAddZoomFragment,
    onUpdateZoomFragment,
    onActivateZoomTool,
    audioTracks = [],
    uploadedAudios = [],
    selectedAudioTrackId,
    onSelectAudioTrack,
    onUpdateAudioTrack,
    mockupMotionFragments = [],
    selectedMockupMotionFragmentId,
    onSelectMockupMotionFragment,
    onUpdateMockupMotionFragment,
    onDeleteMockupMotionFragment,
    onActivateMotionTool,
    canvasElements = [],
    selectedElementId = null,
    onSelectElement,
    onUpdateElement,
    onDeleteElement,
    globalSpeed = 1,
    isPlaying = false,
    onZoomChange,
    zoomMovements = [],
    selectedZoomMovementId = null,
    onSelectZoomMovement,
    onUpdateZoomMovement,
    onAddZoomMovementAtRange
}: TimelineProps) {
    const t = useTranslations("timeline");
    const trackRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);
    const [draggingFragmentId, setDraggingFragmentId] = useState<string | null>(null);
    const [hoveredFragmentId, setHoveredFragmentId] = useState<string | null>(null);
    const [isDraggingVideoClip, setIsDraggingVideoClip] = useState(false);
    const pendingSeekRef = useRef<number | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const isSeekingRef = useRef<boolean>(false);
    const [isHoveringZoomRow, setIsHoveringZoomRow] = useState(false);
    const isPointerInsideTimelineRef = useRef(false);
    const [ghostX, setGhostX] = useState(0);
    const ghostRafRef = useRef<number | null>(null);
    const pendingGhostXRef = useRef<number | null>(null);
    const lastValidPositionRef = useRef<{ startTime: number; endTime: number } | null>(null);

    const [draggingMovementId, setDraggingMovementId] = useState<string | null>(null);
    const [hoveredMovementId, setHoveredMovementId] = useState<string | null>(null);
    const [isHoveringMovementRow, setIsHoveringMovementRow] = useState(false);
    const [movementGhostX, setMovementGhostX] = useState(0);
    const movementGhostRafRef = useRef<number | null>(null);
    const pendingMovementGhostXRef = useRef<number | null>(null);
    const lastValidMovementPositionRef = useRef<{ startTime: number; endTime: number } | null>(null);

    const isOverFragment = useMemo(() => {
        return hoveredFragmentId ? zoomFragments.some(f => f.id === hoveredFragmentId) : false;
    }, [hoveredFragmentId, zoomFragments]);

    const isDraggingZoomFragment = useMemo(() => {
        return draggingFragmentId ? zoomFragments.some(f => f.id === draggingFragmentId) : false;
    }, [draggingFragmentId, zoomFragments]);

    const validDuration = useMemo(() => {
        if (videoClips.length > 0) {
            const lastClipEnd = Math.max(...videoClips.map(c => c.startTime + (c.trimEnd - c.trimStart)));
            return Number.isFinite(lastClipEnd) && lastClipEnd > 0 ? lastClipEnd : 0;
        }
        return Number.isFinite(videoDuration) && videoDuration > 0 ? videoDuration : 0;
    }, [videoDuration, videoClips]);

    const speed = globalSpeed && globalSpeed > 0 ? globalSpeed : 1;
    const scaledDuration = validDuration * speed;
    const outputDuration = validDuration / speed;
    const pendingTrimRef = useRef<{ start: number; end: number } | null>(null);
    const TRACK_PADDING = 0;

    const contentWidth = useMemo(() => {
        if (trackWidth === 0) return 0;
        const availableWidth = trackWidth - TRACK_PADDING;
        return availableWidth * getZoomMultiplier(zoomLevel);
    }, [trackWidth, zoomLevel]);

    const timelineWidth = useMemo(() => {
        return speed > 0 ? contentWidth / speed : contentWidth;
    }, [contentWidth, speed]);

    const playheadX = useMotionValue(0);
    const trimStartX = useMotionValue(0);
    const trimEndX = useMotionValue(0);
    const contentWidthMotion = useMotionValue(0);
    const timelineWidthMotion = useMotionValue(0);
    const validDurationMotion = useMotionValue(0);
    const activeClipLeftX = useMotionValue(0);
    const activeClipRightX = useMotionValue(0);
    const autoScrollDeltaX = useMotionValue(0);

    useEffect(() => {
        contentWidthMotion.set(contentWidth);
    }, [contentWidth, contentWidthMotion]);

    useEffect(() => {
        timelineWidthMotion.set(timelineWidth);
    }, [timelineWidth, timelineWidthMotion]);

    useEffect(() => {
        validDurationMotion.set(validDuration);
    }, [validDuration, validDurationMotion]);

    const trimmedDurationLabel = useTransform(
        [trimStartX, trimEndX, contentWidthMotion, validDurationMotion] as const,
        ([start, end, cw, vd]: number[]) => {
            const prefix = videoUrl ? 'Media Clip' : 'No Media';
            if (cw === 0 || vd === 0) return `${prefix} · 0:00`;
            const secs = ((end - start) / cw) * vd;
            return `${prefix} · ${formatTime(secs)}`;
        }
    );

    const trimStartPosition = useMemo(() => {
        if (scaledDuration === 0 || contentWidth === 0) return 0;
        return (trimRange.start / scaledDuration) * contentWidth;
    }, [trimRange.start, scaledDuration, contentWidth]);

    const trimEndPosition = useMemo(() => {
        if (scaledDuration === 0 || contentWidth === 0) return contentWidth;
        return (trimRange.end / scaledDuration) * contentWidth;
    }, [trimRange.end, scaledDuration, contentWidth]);

    const audioLanes = useMemo(() => {
        if (audioTracks.length === 0 || contentWidth === 0 || scaledDuration === 0) {
            return new Map<string, number>();
        }
        const timeToPx = (time: number) => (time / scaledDuration) * contentWidth;
        return assignAudioLanes(audioTracks, timeToPx, MIN_VISUAL_WIDTH_PX);
    }, [audioTracks, contentWidth, scaledDuration]);

    const audioLaneCount = useMemo(
        () => (audioLanes.size > 0 ? Math.max(...audioLanes.values()) + 1 : 1),
        [audioLanes],
    );

    const elementLanes = useMemo(() => {
        if (canvasElements.length === 0 || contentWidth === 0 || scaledDuration === 0) {
            return new Map<string, number>();
        }
        const timeToPx = (time: number) => (time / scaledDuration) * contentWidth;
        return assignElementLanes(canvasElements, validDuration, timeToPx, MIN_VISUAL_WIDTH_PX);
    }, [canvasElements, contentWidth, scaledDuration, validDuration]);

    const elementLaneCount = useMemo(
        () => (elementLanes.size > 0 ? Math.max(...elementLanes.values()) + 1 : 1),
        [elementLanes],
    );

    const selectedFragmentForMovement = useMemo(
        () => zoomFragments.find(f => f.id === selectedZoomFragmentId) ?? null,
        [zoomFragments, selectedZoomFragmentId]
    );

    const showMovementRow = !!selectedFragmentForMovement?.movementEnabled;
    const totalLanesCount = useMemo(() => {
        let count = 0;
        if (showMovementRow) count += 1;
        if (canvasElements.length > 0) count += elementLaneCount;
        if (audioTracks.length > 0) count += audioLaneCount;
        if (mockupMotionFragments.length > 0) count += 1;
        return count;
    }, [showMovementRow, canvasElements.length, elementLaneCount, audioTracks.length, audioLaneCount, mockupMotionFragments.length]);

    useEffect(() => {
        if (!isDraggingTrim) {
            trimStartX.set(trimStartPosition);
            trimEndX.set(trimEndPosition);
        }
    }, [trimStartPosition, trimEndPosition, isDraggingTrim, trimStartX, trimEndX]);

    const playheadPosition = useMemo(() => {
        if (scaledDuration === 0 || contentWidth === 0) return 0;
        return (currentTime / scaledDuration) * contentWidth;
    }, [currentTime, scaledDuration, contentWidth]);

    useEffect(() => {
        const updateTrackWidth = () => {
            if (containerRef.current) {
                setTrackWidth(containerRef.current.clientWidth - 12 - TIMELINE_LABEL_WIDTH - 5);
            }
        };
        updateTrackWidth();
        window.addEventListener("resize", updateTrackWidth);
        return () => window.removeEventListener("resize", updateTrackWidth);
    }, []);

    useEffect(() => {
        if (!isDragging && !isDraggingPlayhead) {
            animate(playheadX, playheadPosition, { type: "tween", duration: 0.05, ease: "linear" });
        }
    }, [playheadPosition, isDragging, isDraggingPlayhead, playheadX]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    const timeMarkers = useMemo(() => {
        if (outputDuration === 0 || validDuration === 0) return [];
        const baseInterval = outputDuration / 6;
        const adjustedInterval = baseInterval / Math.sqrt(getZoomMultiplier(zoomLevel));
        const markerCount = Math.ceil(outputDuration / adjustedInterval) + 1;
        return Array.from({ length: Math.min(markerCount, 50) }, (_, i) => ({
            time: adjustedInterval * i,
            position: (adjustedInterval * i / validDuration) * contentWidth
        })).filter(m => m.time <= outputDuration);
    }, [outputDuration, validDuration, zoomLevel, contentWidth]);

    const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging || isDraggingTrim) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollLeft = e.currentTarget.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        if (clickX >= 0 && contentWidth > 0 && scaledDuration > 0) {
            const rawTime = (clickX / contentWidth) * scaledDuration;
            const boundedTime = Math.max(0, Math.min(validDuration, rawTime));
            const clampedTime = Math.max(trimRange.start, Math.min(trimRange.end, boundedTime));
            onSeek(clampedTime);
        }
    }, [contentWidth, scaledDuration, validDuration, onSeek, isDragging, isDraggingTrim, trimRange]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const handleWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;

            e.preventDefault();
            e.stopPropagation();
            const direction = e.deltaY < 0 ? 1 : -1;
            onZoomChange?.(Math.max(1, Math.min(10, Math.round(zoomLevel) + direction)));
        };

        track.addEventListener("wheel", handleWheel, { passive: false });
        return () => track.removeEventListener("wheel", handleWheel);
    }, [onZoomChange, zoomLevel]);

    useEffect(() => {
        const handleTimelineZoomKeyDown = (e: KeyboardEvent) => {
            if (!isPointerInsideTimelineRef.current || (!e.ctrlKey && !e.metaKey)) return;

            const zoomIn = e.key === "+" || e.key === "=";
            const zoomOut = e.key === "-" || e.key === "_";
            if (!zoomIn && !zoomOut) return;

            e.preventDefault();
            e.stopPropagation();
            const direction = zoomIn ? 1 : -1;
            onZoomChange?.(Math.max(1, Math.min(10, Math.round(zoomLevel) + direction)));
        };

        window.addEventListener("keydown", handleTimelineZoomKeyDown, true);
        return () => window.removeEventListener("keydown", handleTimelineZoomKeyDown, true);
    }, [onZoomChange, zoomLevel]);

    const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (contentWidth === 0 || scaledDuration === 0) return;
        const maxX = videoClips.length > 0 ? timelineWidth : trimEndPosition;
        const minX = videoClips.length > 0 ? 0 : trimStartPosition;
        let newX = Math.max(minX, Math.min(maxX, playheadX.get() + info.delta.x));

        // Magnetic snapping: snap playhead to clip edges, fragment edges, and zero.
        const timeToPx = (t: number) => (t / scaledDuration) * contentWidth;
        const pxToTime = (px: number) => (px / contentWidth) * scaledDuration;
        const clipEdges = videoClips.map(c => ({
            start: c.startTime,
            end: c.startTime + (c.trimEnd - c.trimStart),
        }));
        const fragmentEdges = zoomFragments.map(f => ({
            start: f.startTime,
            end: f.endTime,
        }));
        const audioEdges = audioTracks.map(t => ({
            start: t.startTime,
            end: t.startTime + t.duration,
        }));
        const snapPoints = collectSnapPoints({
            clipEdges,
            fragmentEdges,
            audioEdges,
        });
        const rawTime = pxToTime(newX);
        const snap = findSnap(rawTime, snapPoints, timeToPx, 8);
        if (snap.offsetPx !== 0) {
            newX = timeToPx(snap.time);
        }

        playheadX.set(newX);
        const newTime = (newX / contentWidth) * scaledDuration;
        pendingSeekRef.current = newTime;
        if (!isSeekingRef.current) {
            isSeekingRef.current = true;
            rafIdRef.current = requestAnimationFrame(() => {
                if (pendingSeekRef.current !== null) {
                    onSeek(pendingSeekRef.current);
                }
                isSeekingRef.current = false;
            });
        }
    }, [contentWidth, scaledDuration, timelineWidth, onSeek, playheadX, trimStartPosition, trimEndPosition, videoClips, zoomFragments, audioTracks]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        pendingSeekRef.current = null;
        isSeekingRef.current = false;
        onDragStart?.();
    }, [onDragStart]);

    const handleDragEnd = useCallback(() => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (pendingSeekRef.current !== null) {
            onSeek(pendingSeekRef.current);
            pendingSeekRef.current = null;
        }
        isSeekingRef.current = false;
        setIsDragging(false);
        onDragEnd?.();
    }, [onDragEnd, onSeek]);

    const handleTrimStartDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (contentWidth === 0 || scaledDuration === 0) return;
        const newX = Math.max(0, Math.min(
            trimEndX.get() - (MIN_TRIM_DURATION / scaledDuration) * contentWidth,
            trimStartX.get() + info.delta.x
        ));
        trimStartX.set(newX);
        const newStartTime = (newX / contentWidth) * scaledDuration;
        pendingTrimRef.current = { start: Math.max(0, newStartTime), end: trimRange.end };
    }, [contentWidth, scaledDuration, trimStartX, trimEndX, trimRange.end]);

    const handleTrimEndDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (contentWidth === 0 || scaledDuration === 0) return;
        const newX = Math.min(
            timelineWidth,
            Math.max(
                trimStartX.get() + (MIN_TRIM_DURATION / scaledDuration) * contentWidth,
                trimEndX.get() + info.delta.x
            )
        );
        trimEndX.set(newX);
        const newEndTime = (newX / contentWidth) * scaledDuration;
        pendingTrimRef.current = { start: trimRange.start, end: Math.min(validDuration, newEndTime) };
    }, [contentWidth, scaledDuration, timelineWidth, validDuration, trimStartX, trimEndX, trimRange.start]);

    const handleTrimDragStart = useCallback((handle: 'start' | 'end') => {
        setIsDraggingTrim(handle);
        pendingTrimRef.current = null;
    }, []);

    const handleTrimDragEnd = useCallback(() => {
        setIsDraggingTrim(null);
        if (pendingTrimRef.current) {
            onTrimChange(pendingTrimRef.current);
            if (currentTime < pendingTrimRef.current.start) {
                onSeek(pendingTrimRef.current.start);
            } else if (currentTime > pendingTrimRef.current.end) {
                onSeek(pendingTrimRef.current.end);
            }
            pendingTrimRef.current = null;
        }
    }, [onTrimChange, currentTime, onSeek]);

    useEffect(() => {
        const scrollEl = trackRef.current;
        if (!scrollEl) return;
        if (isDragging || isDraggingTrim || isDraggingPlayhead) return;
        const visibleWidth = scrollEl.clientWidth;
        const scrollLeft = scrollEl.scrollLeft;
        const margin = 120;
        if (playheadPosition < scrollLeft + margin) {
            scrollEl.scrollTo({ left: Math.max(0, playheadPosition - margin), behavior: isPlaying ? 'auto' : 'smooth' });
        } else if (playheadPosition > scrollLeft + visibleWidth - margin) {
            scrollEl.scrollTo({ left: playheadPosition - visibleWidth + margin, behavior: isPlaying ? 'auto' : 'smooth' });
        }
    }, [playheadPosition, isDragging, isDraggingTrim, isDraggingPlayhead, isPlaying]);

    useEffect(() => {
        const scrollEl = trackRef.current;
        const isEdgeDragActive = isDragging || isDraggingTrim !== null || isDraggingVideoClip;
        if (!scrollEl || !isEdgeDragActive) return;
        const EDGE_ZONE = 60;
        const MAX_PAN_SPEED = 16;
        let rafId: number;
        const tick = () => {
            const activeXs = isDraggingVideoClip
                ? [activeClipLeftX.get(), activeClipRightX.get()]
                : [isDraggingTrim === 'start' ? trimStartX.get() : isDraggingTrim === 'end' ? trimEndX.get() : playheadX.get()];
            const visibleWidth = scrollEl.clientWidth;
            for (const activeX of activeXs) {
                const scrollLeft = scrollEl.scrollLeft;
                let newScrollLeft = scrollLeft;
                if (activeX < scrollLeft + EDGE_ZONE) {
                    const intensity = Math.min(1, (scrollLeft + EDGE_ZONE - activeX) / EDGE_ZONE);
                    newScrollLeft = Math.max(0, scrollLeft - MAX_PAN_SPEED * intensity);
                } else if (activeX > scrollLeft + visibleWidth - EDGE_ZONE) {
                    const intensity = Math.min(1, (activeX - (scrollLeft + visibleWidth - EDGE_ZONE)) / EDGE_ZONE);
                    newScrollLeft = scrollLeft + MAX_PAN_SPEED * intensity;
                }
                if (newScrollLeft !== scrollLeft) {
                    const applied = newScrollLeft - scrollLeft;
                    scrollEl.scrollLeft = newScrollLeft;
                    if (isDraggingVideoClip) {
                        autoScrollDeltaX.set(autoScrollDeltaX.get() + applied);
                    }
                }
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isDragging, isDraggingTrim, isDraggingVideoClip, playheadX, trimStartX, trimEndX, activeClipLeftX, activeClipRightX, autoScrollDeltaX]);

    const calculateProgressWidth = useCallback(([px, start, end]: number[]) => {
        const width = end - start;
        if (width <= 0) return 0;
        const clampedX = Math.max(start, Math.min(px, end));
        return Math.max(0, clampedX - start);
    }, []);

    const progressWidth = useTransform(
        [playheadX, trimStartX, trimEndX] as const,
        calculateProgressWidth
    );

    const clipLeftMotion = useTransform(trimStartX, (x) => x);
    const clipWidthMotion = useTransform(
        [trimStartX, trimEndX] as const,
        ([start, end]: number[]) => Math.max(end - start, 20)
    );

    const trimOverlayLeftWidth = useTransform(trimStartX, (x) => x);
    const trimOverlayRightLeft = useTransform(trimEndX, (x) => x);
    const trimOverlayRightWidth = useTransform(
        [trimEndX, timelineWidthMotion] as const,
        ([end, tw]: number[]) => tw - end
    );

    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (ghostRafRef.current) cancelAnimationFrame(ghostRafRef.current);
        };
    }, []);

    const ghostState = useMemo(() => {
        if (!isHoveringZoomRow || isDraggingZoomFragment || isOverFragment) return null;
        if (contentWidth === 0 || scaledDuration === 0) return null;
        const hoverTime = (ghostX / contentWidth) * scaledDuration;
        const validPosition = findValidFragmentPosition(
            hoverTime,
            DEFAULT_ZOOM_FRAGMENT_DURATION,
            zoomFragments,
            validDuration
        );
        return { validPosition };
    }, [isHoveringZoomRow, isDraggingZoomFragment, isOverFragment, ghostX, contentWidth, scaledDuration, validDuration, zoomFragments]);

    useEffect(() => {
        lastValidPositionRef.current = ghostState?.validPosition ?? null;
    }, [ghostState]);

    const fragmentMovements = useMemo(
        () => selectedFragmentForMovement
            ? zoomMovements.filter(m => m.zoomFragmentId === selectedFragmentForMovement.id)
            : [],
        [zoomMovements, selectedFragmentForMovement]
    );

    const movementHoldBounds = useMemo(
        () => selectedFragmentForMovement ? getFragmentHoldBounds(selectedFragmentForMovement) : null,
        [selectedFragmentForMovement]
    );

    const isOverMovement = useMemo(
        () => hoveredMovementId ? fragmentMovements.some(m => m.id === hoveredMovementId) : false,
        [hoveredMovementId, fragmentMovements]
    );

    const isDraggingMovementItem = useMemo(
        () => draggingMovementId ? fragmentMovements.some(m => m.id === draggingMovementId) : false,
        [draggingMovementId, fragmentMovements]
    );

    const movementGhostState = useMemo(() => {
        if (!isHoveringMovementRow || isDraggingMovementItem || isOverMovement) return null;
        if (contentWidth === 0 || scaledDuration === 0 || !movementHoldBounds) return null;
        const holdSpan = movementHoldBounds.end - movementHoldBounds.start;
        if (holdSpan < MIN_MOVEMENT_TRACK_DURATION) return null;
        const hoverTime = (movementGhostX / contentWidth) * scaledDuration;
        const validPosition = findValidMovementPosition(
            hoverTime,
            Math.min(DEFAULT_MOVEMENT_DURATION, holdSpan),
            fragmentMovements,
            movementHoldBounds.start,
            movementHoldBounds.end
        );
        return { validPosition };
    }, [isHoveringMovementRow, isDraggingMovementItem, isOverMovement, movementGhostX, contentWidth, scaledDuration, movementHoldBounds, fragmentMovements]);

    useEffect(() => {
        lastValidMovementPositionRef.current = movementGhostState?.validPosition ?? null;
    }, [movementGhostState]);

    return (
        <div ref={containerRef} className="flex flex-col w-full pr-2">
            <div
                className={`${totalLanesCount >= 4
                    ? 'h-96'
                    : totalLanesCount === 3
                        ? 'h-80'
                        : totalLanesCount === 2
                            ? 'h-64'
                            : totalLanesCount === 1
                                ? 'h-50'
                                : 'h-38'
                    } shrink-0 bg-background border-t border-border flex flex-col font-mono text-[11px] transition-all duration-200`}
            >
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <div
                        ref={trackRef}
                        onMouseEnter={() => { isPointerInsideTimelineRef.current = true; }}
                        onMouseLeave={() => { isPointerInsideTimelineRef.current = false; }}
                        className={`flex-1 overflow-x-auto custom-scrollbar pr-2 ${audioTracks.length > 0 || elementLaneCount > 1 || canvasElements.length > 0 || showMovementRow
                            ? "overflow-y-auto no-scrollbar"
                            : "overflow-y-hidden"
                            }`}
                    >
                        <div
                            className="relative grid min-h-full"
                            style={{
                                gridTemplateColumns: `${TIMELINE_LABEL_WIDTH}px ${timelineWidth > 0 ? `${timelineWidth}px` : '100%'}`,
                                width: timelineWidth > 0 ? timelineWidth + TIMELINE_LABEL_WIDTH : '100%',
                                minWidth: '100%',
                            }}
                        >
                            <LabelSidebar
                                elementLaneCount={canvasElements.length > 0 ? elementLaneCount : 0}
                                audioLaneCount={audioTracks.length > 0 ? audioLaneCount : 0}
                                motionTracksCount={mockupMotionFragments.length}
                                showMovementRow={showMovementRow}
                            />
                            <div className="relative flex flex-col pb-1 min-w-0">
                                <motion.div
                                    className="absolute top-0 bottom-0 z-20 flex flex-col items-center cursor-ew-resize group select-none focus:outline-none"
                                    style={{ x: playheadX, translateX: "-50%" }}
                                    role="slider"
                                    aria-label={`Playhead at ${formatTime(currentTime)}`}
                                    aria-valuemin={videoClips.length > 0 ? 0 : trimRange.start}
                                    aria-valuemax={videoClips.length > 0 ? validDuration : trimRange.end}
                                    aria-valuenow={currentTime}
                                    tabIndex={0}
                                    drag="x"
                                    dragConstraints={{
                                        left: videoClips.length > 0 ? 0 : trimStartPosition,
                                        right: videoClips.length > 0 ? timelineWidth : trimEndPosition
                                    }}
                                    dragElastic={0}
                                    dragMomentum={false}
                                    onDrag={handleDrag}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div
                                        className={`w-3.5 h-3.5 mt-0.75 shrink-0 transition-all duration-150 origin-top ${isDragging
                                            ? 'bg-blue-200 scale-135 shadow-[0_0_15px_rgba(147,197,253,0.9)] ease-out'
                                            : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)] group-hover:bg-blue-300 group-hover:scale-110 ease-in-out'
                                            }`}
                                        style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)' }}
                                    />
                                    <div
                                        className={`w-px h-full transition-all duration-150 ${isDragging
                                            ? 'bg-blue-200 w-[2px] shadow-[0_0_8px_rgba(147,197,253,0.5)] ease-out'
                                            : 'bg-blue-400 group-hover:bg-blue-300'
                                            }`}
                                    />
                                </motion.div>

                                <div
                                    className="h-5.5 border-b border-border relative shrink-0 cursor-pointer bg-muted/40 select-none overflow-hidden"
                                    onClick={handleTrackClick}
                                >
                                    <div
                                        className="absolute inset-0 opacity-20 pointer-events-none"
                                        style={{
                                            backgroundImage: `linear-gradient(to right, #ccc 1px, transparent 1px)`,
                                            backgroundSize: `${10 * zoomLevel}px 6px`,
                                            backgroundPosition: `0px 6px`,
                                            backgroundRepeat: 'repeat-x'
                                        }}
                                    />
                                    <div className="absolute inset-0 pointer-events-none">
                                        {validDuration > 0 && timeMarkers.map((marker, i) => (
                                            <span
                                                key={i}
                                                className="absolute top-1 select-none text-[11px] leading-none text-muted-foreground/70 font-mono"
                                                style={{
                                                    left: marker.position,
                                                    transform: i === 0 ? 'translateX(0)' : i === timeMarkers.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                                                    textShadow: '0 0 2px var(--color-background), 0 0 4px var(--color-background)'
                                                }}
                                            >
                                                {formatTime(marker.time)}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-max" onClick={handleTrackClick}>

                                    <div
                                        className="flex-1 shrink-0 flex items-center py-0.5 relative"
                                        style={{ minHeight: VIDEO_ROW_MIN_HEIGHT, maxHeight: VIDEO_ROW_MAX_HEIGHT }}
                                    >
                                        <div className="h-full w-full rounded-md flex items-center relative bg-muted/40 dark:bg-[#0a1510] border border-border">
                                            {videoClips.length > 0 ? (
                                                <>
                                                    {videoClips.map((clip) => (
                                                        <VideoClipTrackItem
                                                            key={clip.id}
                                                            clip={clip}
                                                            isSelected={selectedVideoClipId === clip.id}
                                                            contentWidth={contentWidth}
                                                            totalDuration={scaledDuration}
                                                            speed={speed}
                                                            otherClips={videoClips.filter(c => c.id !== clip.id)}
                                                            currentTime={currentTime}
                                                            playheadX={playheadX}
                                                            onSelect={() => onSelectVideoClip?.(clip.id)}
                                                            onUpdate={(updates) => onUpdateVideoClip?.(clip.id, updates)}
                                                            onDelete={() => onDeleteVideoClip?.(clip.id)}
                                                            onReorder={(draggedId, targetId, placeAfter) => onReorderVideoClip?.(draggedId, targetId, placeAfter)}
                                                            onDragStateChange={setIsDraggingVideoClip}
                                                            zoomLevel={zoomLevel}
                                                            activeClipLeftX={activeClipLeftX}
                                                            activeClipRightX={activeClipRightX}
                                                            autoScrollDeltaX={autoScrollDeltaX}
                                                        />
                                                    ))}
                                                </>
                                            ) : (
                                                <>
                                                    {trimRange.start > 0 && (
                                                        <motion.div className="absolute left-0 top-0 bottom-0 bg-black/60 rounded-l-md z-10" style={{ width: trimOverlayLeftWidth }} />
                                                    )}
                                                    {trimRange.end < validDuration && (
                                                        <motion.div className="absolute right-0 top-0 bottom-0 bg-black/60 rounded-r-md z-10" style={{ left: trimOverlayRightLeft, width: trimOverlayRightWidth }} />
                                                    )}
                                                    <motion.div
                                                        className="absolute top-0 bottom-0 rounded-md border border-[#34A853]/40 bg-emerald-100 dark:bg-[#182e20] overflow-hidden"
                                                        style={{ left: clipLeftMotion, width: clipWidthMotion }}
                                                    >
                                                        <div className="absolute inset-0 flex items-center overflow-hidden">
                                                            <div className="flex h-full w-full">
                                                                {videoUrl && Array.from({ length: Math.max(1, Math.ceil(getZoomMultiplier(zoomLevel) * 3)) }).map((_, i) => (
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
                                                            className="absolute top-0 bottom-0 -left-px border-r-2 border-[#4ade80]"
                                                            style={{
                                                                width: progressWidth,
                                                                background: `linear-gradient(to bottom, rgba(52, 168, 83, 0.9) 0%, rgba(34, 139, 34, 1) 50%, rgba(20, 80, 40, 1) 100%)`,
                                                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
                                                            }}
                                                        />
                                                        <motion.span
                                                            className="flex items-center justify-center gap-2 text-emerald-400 text-[11px] font-medium ml-3 relative z-10 drop-shadow-sm h-full"
                                                        >
                                                            {trimmedDurationLabel}
                                                        </motion.span>
                                                    </motion.div>
                                                    <motion.div
                                                        className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-center"
                                                        style={{ x: trimStartX, translateX: "-50%" }}
                                                        role="slider"
                                                        aria-label={`Trim start at ${formatTime(trimRange.start)}`}
                                                        aria-valuemin={0}
                                                        aria-valuemax={trimRange.end}
                                                        aria-valuenow={trimRange.start}
                                                        tabIndex={0}
                                                        drag="x"
                                                        dragConstraints={{ left: 0, right: timelineWidth }}
                                                        dragElastic={0}
                                                        dragMomentum={false}
                                                        onDrag={handleTrimStartDrag}
                                                        onDragStart={() => handleTrimDragStart('start')}
                                                        onDragEnd={handleTrimDragEnd}
                                                    >
                                                        <div className={`w-1.5 h-8 rounded-full transition-all ${isDraggingTrim === 'start' ? 'bg-[#4ade80] scale-110' : 'bg-[#34A853] group-hover/trim:bg-[#4ade80]'}`} aria-hidden="true" />
                                                    </motion.div>
                                                    <motion.div
                                                        className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-center"
                                                        style={{ x: trimEndX, translateX: "-50%" }}
                                                        role="slider"
                                                        aria-label={`Trim end at ${formatTime(trimRange.end)}`}
                                                        aria-valuemin={trimRange.start}
                                                        aria-valuemax={validDuration}
                                                        aria-valuenow={trimRange.end}
                                                        tabIndex={0}
                                                        drag="x"
                                                        dragConstraints={{ left: 0, right: timelineWidth }}
                                                        dragElastic={0}
                                                        dragMomentum={false}
                                                        onDrag={handleTrimEndDrag}
                                                        onDragStart={() => handleTrimDragStart('end')}
                                                        onDragEnd={handleTrimDragEnd}
                                                    >
                                                        <div className={`w-1.5 h-8 rounded-full transition-all ${isDraggingTrim === 'end' ? 'bg-[#4ade80] scale-110' : 'bg-[#34A853] group-hover/trim:bg-[#4ade80]'}`} aria-hidden="true" />
                                                    </motion.div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className="shrink-0 w-full flex items-center relative"
                                        style={{ minHeight: ELEMENT_ROW_HEIGHT }}
                                        onMouseMove={(e) => {
                                            if (isDraggingZoomFragment) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            pendingGhostXRef.current = e.clientX - rect.left;
                                            if (ghostRafRef.current === null) {
                                                ghostRafRef.current = requestAnimationFrame(() => {
                                                    if (pendingGhostXRef.current !== null) setGhostX(pendingGhostXRef.current);
                                                    ghostRafRef.current = null;
                                                });
                                            }
                                            setIsHoveringZoomRow(true);
                                        }}
                                        onMouseLeave={() => setIsHoveringZoomRow(false)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isOverFragment || isDraggingZoomFragment || !onAddZoomFragment) return;
                                            const validPosition = lastValidPositionRef.current;
                                            if (validPosition) {
                                                onAddZoomFragment(validPosition.startTime, validPosition.endTime);
                                            }
                                        }}
                                    >
                                        <div className="h-full w-full flex items-center relative">
                                            {zoomFragments.map((fragment) => (
                                                <ZoomFragmentTrackItem
                                                    key={fragment.id}
                                                    fragment={fragment}
                                                    isSelected={fragment.id === selectedZoomFragmentId}
                                                    contentWidth={contentWidth}
                                                    videoDuration={scaledDuration}
                                                    contentDuration={validDuration}
                                                    speed={speed}
                                                    currentTime={currentTime}
                                                    clipEdges={videoClips.map(c => ({ start: c.startTime, end: c.startTime + (c.trimEnd - c.trimStart) }))}
                                                    otherFragments={zoomFragments.filter(f => f.id !== fragment.id)}
                                                    onSelect={() => {
                                                        onSelectZoomFragment?.(fragment.id);
                                                        onActivateZoomTool?.();
                                                    }}
                                                    onUpdate={(updates) => onUpdateZoomFragment?.(fragment.id, updates)}
                                                    onDragStateChange={(dragging) => {
                                                        if (dragging) {
                                                            setDraggingFragmentId(fragment.id);
                                                            setHoveredFragmentId(fragment.id);
                                                            setIsHoveringZoomRow(false);
                                                        } else {
                                                            setDraggingFragmentId(prev => prev === fragment.id ? null : prev);
                                                        }
                                                    }}
                                                    onMouseEnter={() => setHoveredFragmentId(fragment.id)}
                                                    onMouseLeave={() => setHoveredFragmentId(prev => prev === fragment.id ? null : prev)}
                                                />
                                            ))}
                                            {ghostState?.validPosition && (
                                                <motion.div
                                                    className="absolute top-[5%] h-[90%] pointer-events-none"
                                                    initial={false}
                                                    animate={{
                                                        left: (ghostState.validPosition.startTime / scaledDuration) * contentWidth,
                                                        width: ((ghostState.validPosition.endTime - ghostState.validPosition.startTime) / scaledDuration) * contentWidth,
                                                    }}
                                                    transition={{ duration: 0 }}
                                                >
                                                    <div className="w-full h-full rounded border border-dashed border-blue-400/50 bg-blue-500/10 flex flex-col items-center justify-center gap-0.5">
                                                        <Icon icon="qlementine-icons:zoom-12" width="12" height="12" className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                                        <span className="text-[8px] font-mono text-blue-600/60 dark:text-blue-400/60">+ Zoom</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                            {isHoveringZoomRow && !isDraggingZoomFragment && !isOverFragment && ghostState && !ghostState.validPosition && (
                                                <div
                                                    className="absolute top-[10%] h-[80%] w-32 pointer-events-none"
                                                    style={{ left: ghostX - 64 }}
                                                >
                                                    <div className="w-full h-full rounded border border-dashed border-red-400/50 bg-red-500/10 flex flex-col items-center justify-center gap-0.5">
                                                        <span className="text-[8px] font-mono text-red-600/60 dark:text-red-400/60"> {t("noSpace")}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {(() => {
                                        if (!selectedFragmentForMovement?.movementEnabled || !movementHoldBounds) return null;
                                        const { start: holdStart, end: holdEnd } = movementHoldBounds;
                                        const leftPx = (holdStart / scaledDuration) * contentWidth;
                                        const rightPx = (holdEnd / scaledDuration) * contentWidth;

                                        return (
                                            <div
                                                className="shrink-0 w-full flex items-center relative bg-black/10 dark:bg-white/10"
                                                style={{ minHeight: ELEMENT_ROW_HEIGHT }}
                                                onMouseMove={(e) => {
                                                    if (isDraggingMovementItem) return;
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    pendingMovementGhostXRef.current = e.clientX - rect.left;
                                                    if (movementGhostRafRef.current === null) {
                                                        movementGhostRafRef.current = requestAnimationFrame(() => {
                                                            if (pendingMovementGhostXRef.current !== null) setMovementGhostX(pendingMovementGhostXRef.current);
                                                            movementGhostRafRef.current = null;
                                                        });
                                                    }
                                                    setIsHoveringMovementRow(true);
                                                }}
                                                onMouseLeave={() => setIsHoveringMovementRow(false)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isOverMovement || isDraggingMovementItem || !onAddZoomMovementAtRange) return;
                                                    const validPosition = lastValidMovementPositionRef.current;
                                                    if (validPosition) {
                                                        onAddZoomMovementAtRange(validPosition.startTime, validPosition.endTime);
                                                    }
                                                }}
                                            >
                                                <div className="h-full w-full relative">
                                                    <div className="absolute top-0 bottom-0 left-0 bg-white dark:bg-black pointer-events-none" style={{ width: leftPx }} />
                                                    <div className="absolute top-0 bottom-0 bg-white dark:bg-black pointer-events-none" style={{ left: rightPx, right: 0 }} />

                                                    {fragmentMovements
                                                        .slice()
                                                        .sort((a, b) => a.startTime - b.startTime)
                                                        .map((movement, i) => (
                                                            <ZoomMovementTrackItem
                                                                key={movement.id}
                                                                movement={movement}
                                                                index={i + 1}
                                                                isSelected={movement.id === selectedZoomMovementId}
                                                                contentWidth={contentWidth}
                                                                videoDuration={scaledDuration}
                                                                holdStart={holdStart}
                                                                holdEnd={holdEnd}
                                                                otherMovements={fragmentMovements.filter(m => m.id !== movement.id)}
                                                                onSelect={() => onSelectZoomMovement?.(movement.id)}
                                                                onUpdate={(updates) => onUpdateZoomMovement?.(movement.id, updates)}
                                                                onDragStateChange={(dragging) => {
                                                                    if (dragging) {
                                                                        setDraggingMovementId(movement.id);
                                                                        setHoveredMovementId(movement.id);
                                                                        setIsHoveringMovementRow(false);
                                                                    } else {
                                                                        setDraggingMovementId(prev => (prev === movement.id ? null : prev));
                                                                    }
                                                                }}
                                                                onMouseEnter={() => setHoveredMovementId(movement.id)}
                                                                onMouseLeave={() => setHoveredMovementId(prev => (prev === movement.id ? null : prev))}
                                                            />
                                                        ))}

                                                    {movementGhostState?.validPosition && (
                                                        <motion.div
                                                            className="absolute top-1/2 -translate-y-1/2 h-[80%] pointer-events-none"
                                                            initial={false}
                                                            animate={{
                                                                left: (movementGhostState.validPosition.startTime / scaledDuration) * contentWidth,
                                                                width: ((movementGhostState.validPosition.endTime - movementGhostState.validPosition.startTime) / scaledDuration) * contentWidth,
                                                            }}
                                                            transition={{ duration: 0 }}
                                                        >
                                                            <div className="w-full h-full rounded border border-dashed border-emerald-400/50 bg-emerald-500/10 flex flex-col items-center justify-center gap-0.5">
                                                                <Icon icon="qlementine-icons:zoom-12" width="12" height="12" className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                                                <span className="text-[8px] font-mono text-emerald-600/60 dark:text-emerald-400/60">+ Movement</span>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {isHoveringMovementRow && !isDraggingMovementItem && !isOverMovement && movementGhostState && !movementGhostState.validPosition && (
                                                        <div className="absolute top-[10%] h-[80%] w-32 pointer-events-none" style={{ left: movementGhostX - 64 }}>
                                                            <div className="w-full h-full rounded border border-dashed border-red-400/50 bg-red-500/10 flex flex-col items-center justify-center gap-0.5">
                                                                <span className="text-[8px] font-mono text-red-600/60 dark:text-red-400/60">{t("noSpace")}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {canvasElements.length > 0 && (
                                        <div
                                            className="shrink-0 w-full relative overflow-hidden"
                                            style={{ height: elementLaneCount * ELEMENT_ROW_HEIGHT }}
                                        >
                                            <div
                                                className="h-full w-full relative"
                                                onClick={(e) => {
                                                    if (e.target !== e.currentTarget) return;
                                                    e.stopPropagation();
                                                    onSelectElement?.(null);
                                                }}
                                            >
                                                {canvasElements.map((element) => (
                                                    <ElementFragmentTrackItem
                                                        key={element.id}
                                                        element={element}
                                                        isSelected={element.id === selectedElementId}
                                                        contentWidth={contentWidth}
                                                        videoDuration={scaledDuration}
                                                        contentDuration={validDuration}
                                                        lane={elementLanes.get(element.id) ?? 0}
                                                        laneHeight={ELEMENT_ROW_HEIGHT}
                                                        onSelect={() => onSelectElement?.(element.id)}
                                                        onUpdate={(updates) => onUpdateElement?.(element.id, updates)}
                                                        onDelete={() => onDeleteElement?.(element.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {audioTracks.length > 0 && (
                                        <div
                                            className="shrink-0 w-full relative overflow-hidden"
                                            style={{ height: audioLaneCount * ELEMENT_ROW_HEIGHT }}
                                        >
                                            <div className="h-full w-full relative">
                                                {audioTracks.map((track) => {
                                                    const audio = uploadedAudios?.find(a => a.id === track.audioId);
                                                    const trackLane = audioLanes.get(track.id) ?? 0;
                                                    const sameLaneOtherTracks = audioTracks.filter(
                                                        (t) => t.id !== track.id && (audioLanes.get(t.id) ?? 0) === trackLane
                                                    );
                                                    return (
                                                        <AudioFragmentTrackItem
                                                            key={track.id}
                                                            track={track}
                                                            audio={audio}
                                                            isSelected={track.id === selectedAudioTrackId}
                                                            contentWidth={contentWidth}
                                                            videoDuration={scaledDuration}
                                                            contentDuration={validDuration}
                                                            speed={speed}
                                                            lane={trackLane}
                                                            laneHeight={ELEMENT_ROW_HEIGHT}
                                                            laneCount={audioLaneCount}
                                                            currentTime={currentTime}
                                                            clipEdges={videoClips.map(c => ({ start: c.startTime, end: c.startTime + (c.trimEnd - c.trimStart) }))}
                                                            otherTracks={sameLaneOtherTracks}
                                                            onSelect={() => onSelectAudioTrack?.(track.id)}
                                                            onUpdate={(updates) => onUpdateAudioTrack?.(track.id, updates)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {mockupMotionFragments.length > 0 && (
                                        <div className="shrink-0 w-full flex items-center relative"
                                            style={{ minHeight: ELEMENT_ROW_HEIGHT }}
                                            onClick={(e) => { e.stopPropagation(); onSelectMockupMotionFragment?.(null); }}
                                        >
                                            <div className="h-full w-full relative">
                                                {mockupMotionFragments.map((fragment) => (
                                                    <MockupMotionTrackItem
                                                        key={fragment.id}
                                                        fragment={fragment}
                                                        isSelected={fragment.id === selectedMockupMotionFragmentId}
                                                        contentWidth={contentWidth}
                                                        videoDuration={scaledDuration}
                                                        contentDuration={validDuration}
                                                        otherFragments={mockupMotionFragments.filter((f) => f.id !== fragment.id)}
                                                        onSelect={() => {
                                                            onSelectMockupMotionFragment?.(fragment.id);
                                                            onActivateMotionTool?.();
                                                        }}
                                                        onUpdate={(updates) => onUpdateMockupMotionFragment?.(fragment.id, updates)}
                                                        onDelete={() => onDeleteMockupMotionFragment?.(fragment.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}