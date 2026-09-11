"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { calculateSmoothZoom } from "@/lib/canvas.utils";
import { zoomLevelToFactor, type ZoomFragment, type ZoomMovement } from "@/types/zoom.types";
import { formatTime } from "@/lib";
import {
  ACCENT,
  BackgroundCategory,
  CLIP_MIN_DURATION,
  DRAG_CLAMP_PCT,
  DRAG_EASE_FACTOR,
  DRIFT_AMPLITUDE_X,
  DRIFT_AMPLITUDE_Y,
  HERO_GRADIENTS,
  HERO_WALLPAPERS,
  PANEL_BORDER,
  SLIDER_MAX,
  TFunc,
  THUMB,
  THUMB_COLS,
  THUMB_STEP,
  TILT_MAX_DEG,
  ZOOM_FRAGMENT_DURATIONS,
  clamp,
  getInitialZoomFragments,
  getInitialZoomMovements,
  hashSeed,
  organicDrift,
} from "@/lib/editor-preview-hero.utils";
import { BackgroundPanel, DraggableRange, MiniSidebar, TimelineClipContent, ZoomFragmentRangeItem } from "@/components/ui/HeroEditorPreviewComponents";

const RENDER_HEADROOM = 3;

function EditorCanvas({
  videoRef,
  videoTransform,
  transformOrigin,
  onLoadedMetadata,
  backgroundUrl,
  zoomScale,
  focusPoint,
  pulseKey,
  roundedPx,
  paddingPct,
  backgroundBlurPx,
  dynamicShadow,
  dragOffset,
  onDragOffsetChange,
  onDragRelease,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoTransform: string;
  transformOrigin: string;
  onLoadedMetadata: () => void;
  backgroundUrl: string | undefined;
  zoomScale: number;
  focusPoint: { x: number; y: number };
  pulseKey: string | null;
  roundedPx: number;
  paddingPct: number;
  backgroundBlurPx: number;
  dynamicShadow: string;
  dragOffset: { x: number; y: number };
  onDragOffsetChange: (next: { x: number; y: number }) => void;
  onDragRelease: () => void;
}) {
  const isZoomActive = zoomScale > 1.03;
  const inverseScale = 1 / zoomScale;

  const frameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFramePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      const frame = frameRef.current;
      if (!frame) return;
      e.preventDefault();

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: dragOffset.x,
        originY: dragOffset.y,
      };
      setIsDragging(true);

      const handleMove = (ev: PointerEvent) => {
        const drag = dragStateRef.current;
        const rect = frame.getBoundingClientRect();
        if (!drag || rect.width <= 0 || rect.height <= 0) return;

        const deltaXPct = ((ev.clientX - drag.startX) / rect.width) * 100;
        const deltaYPct = ((ev.clientY - drag.startY) / rect.height) * 100;

        onDragOffsetChange({
          x: clamp(drag.originX + deltaXPct, -DRAG_CLAMP_PCT, DRAG_CLAMP_PCT),
          y: clamp(drag.originY + deltaYPct, -DRAG_CLAMP_PCT, DRAG_CLAMP_PCT),
        });
      };

      const handleUp = () => {
        dragStateRef.current = null;
        setIsDragging(false);
        onDragRelease();
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [dragOffset, onDragOffsetChange, onDragRelease]
  );

  return (
    <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#0B0B0D] squircle-element-camera">
      <AnimatePresence mode="sync">
        {backgroundUrl && (
          <motion.div
            key={backgroundUrl}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${backgroundUrl}')`,
              filter: `blur(${backgroundBlurPx}px)`,
              transform: "scale(1.15)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/10" />
      <div
        ref={frameRef}
        onPointerDown={handleFramePointerDown}
        className={`relative w-[78%] sm:w-[80%] aspect-video cursor-move touch-none select-none transition-opacity ${isDragging ? "opacity-95" : ""
          }`}
        style={{ perspective: "900px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: videoTransform,
            transformOrigin: transformOrigin,
          }}
        >
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              width: `${RENDER_HEADROOM * 100}%`,
              height: `${RENDER_HEADROOM * 100}%`,
              transform: `translate(-50%, -50%) scale(${1 / RENDER_HEADROOM})`,
              transformOrigin: "center center",
            }}
          >
            <div
              className="absolute overflow-hidden bg-black squircle-element sm:squircle-corner"
              style={{
                inset: `${paddingPct}%`,
                borderRadius: `${roundedPx}px`,
                boxShadow: dynamicShadow,
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster="/images/pages/preview-editor-poster.webp"
                onLoadedMetadata={onLoadedMetadata}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="block w-full h-full object-cover pointer-events-none"
              >
                <source src="/videos/hero/demo-preview-editor.mp4" type="video/mp4" />
              </video>
              <AnimatePresence>
                {isZoomActive && focusPoint && (
                  <motion.div
                    key="focus-cursor"
                    className="absolute z-10 pointer-events-none"
                    style={{
                      left: `${focusPoint.x}%`,
                      top: `${focusPoint.y}%`,
                      translateX: "-50%",
                      translateY: "-50%",
                      transition: "left 90ms ease-out, top 90ms ease-out",
                    }}
                    initial={{ opacity: 0, scale: 1.4 * inverseScale * RENDER_HEADROOM }}
                    animate={{ opacity: 0.9, scale: inverseScale * RENDER_HEADROOM }}
                    exit={{ opacity: 0, scale: 1.4 * inverseScale * RENDER_HEADROOM }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="w-6 h-6 rounded-full border border-white/70" />
                    <div className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-white" />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {pulseKey && focusPoint && (
                  <motion.div
                    key={pulseKey}
                    className="absolute z-[9] pointer-events-none rounded-full border border-white/50"
                    style={{
                      left: `${focusPoint.x}%`,
                      top: `${focusPoint.y}%`,
                      translateX: "-50%",
                      translateY: "-50%",
                      width: 24,
                      height: 24,
                    }}
                    initial={{ opacity: 0.55, scale: 0.4 * inverseScale * RENDER_HEADROOM }}
                    animate={{ opacity: 0, scale: 2.4 * inverseScale * RENDER_HEADROOM }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {isZoomActive && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-2.5 right-2.5 z-50 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm shadow-sm"
            >
              <Icon icon="iconamoon:zoom-in-bold" width={11} className="text-white" />
              <span className="text-[10px] font-mono text-white">{zoomScale.toFixed(2)}×</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EditorTimeline({
  t,
  duration,
  currentTime,
  fragments,
  onFragmentChange,
  clipRange,
  onClipChange,
  trackRef,
  onSeek,
}: {
  t: TFunc;
  duration: number;
  currentTime: number;
  fragments: ZoomFragment[];
  onFragmentChange: (id: string, next: { start: number; end: number }) => void;
  clipRange: { start: number; end: number };
  onClipChange: (next: { start: number; end: number }) => void;
  trackRef: React.RefObject<HTMLDivElement | null>;
  onSeek: (time: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const videoLabel = t("timeline.video");
  const zoomLabel = t("timeline.zoom");

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const clipProgress =
    clipRange.end > clipRange.start
      ? clamp((currentTime - clipRange.start) / (clipRange.end - clipRange.start), 0, 1)
      : 0;

  const handleSeekPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return;
      e.preventDefault();

      const seekFromClientX = (clientX: number) => {
        const rect = track.getBoundingClientRect();
        if (rect.width <= 0) return;
        onSeek(clamp((clientX - rect.left) / rect.width, 0, 1) * duration);
      };

      seekFromClientX(e.clientX);
      const handleMove = (ev: PointerEvent) => seekFromClientX(ev.clientX);
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [duration, trackRef, onSeek]
  );

  return (
    <div className={`hidden sm:flex h-[140px] shrink-0 border-t ${PANEL_BORDER} bg-white`}>
      <div className={`w-10 shrink-0 border-r ${PANEL_BORDER} flex flex-col bg-zinc-50/50`}>
        <div className="h-4 border-b border-black/5" />
        <div className="flex-1 flex items-center px-2 border-b border-black/3">
          <span className="text-[7px] uppercase font-semibold tracking-wider text-zinc-400">{videoLabel}</span>
        </div>
        <div className="flex-1 flex items-center px-2">
          <span className="text-[7px] uppercase font-semibold tracking-wider text-zinc-400">{zoomLabel}</span>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="relative h-full w-full bg-black/2 overflow-visible">
          <div ref={trackRef} onPointerDown={handleSeekPointerDown} className="absolute left-1 right-1 inset-y-0 cursor-ew-resize flex flex-col" >
            <div className="relative h-4 border-b border-black/6 shrink-0">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <span
                  key={f}
                  className="absolute top-0 flex items-center h-full text-[8px] font-mono text-black/30"
                  style={{
                    left: `${f * 100}%`,
                    transform: f === 0 ? "none" : f === 1 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {formatTime(f * duration)}
                </span>
              ))}
            </div>

            <div className="flex-1 relative border-b border-black/3">
              <div className="absolute inset-x-0 inset-y-2">
                <DraggableRange
                  start={clipRange.start}
                  end={clipRange.end}
                  duration={duration}
                  trackRef={trackRef}
                  minDuration={CLIP_MIN_DURATION}
                  onChange={onClipChange}
                  onClick={() => setSelectedId((prev) => (prev === "main-clip" ? null : "main-clip"))}
                  handleClassName="bg-emerald-500 group-hover/range:bg-emerald-600/80"
                >
                  <TimelineClipContent
                    label="demo-hero.mp4"
                    duration={clipRange.end - clipRange.start}
                    progress={clipProgress}
                    isSelected={selectedId === "main-clip"}
                  />
                </DraggableRange>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="absolute inset-x-0 inset-y-2">
                {duration > 0 &&
                  fragments.map((f) => (
                    <ZoomFragmentRangeItem
                      key={f.id}
                      fragment={f}
                      duration={duration}
                      trackRef={trackRef}
                      zoomLabel={zoomLabel}
                      isSelected={selectedId === f.id}
                      onChange={onFragmentChange}
                      onToggle={handleToggleSelect}
                    />
                  ))}
              </div>
            </div>

            <div
              className="absolute top-0 bottom-0 w-px z-30 pointer-events-none"
              style={{ left: `${playheadPct}%`, background: ACCENT }}
            >
              <div
                className="absolute -top-px -translate-x-1/2 w-2.5 h-2.5"
                style={{
                  background: ACCENT,
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransportBar({
  t,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSkip,
}: {
  t: TFunc;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSkip: (delta: number) => void;
}) {
  return (
    <div className={`hidden sm:flex h-11 shrink-0 border-t ${PANEL_BORDER} bg-white items-center justify-between px-3`}>
      <div className="hidden sm:flex items-center gap-2.5" aria-hidden="true">
        <Icon icon="mingcute:scissors-fill" width={13} className="text-black/30 cursor-pointer hover:text-black/50 transition-colors" />
        <div className="h-3.5 w-px bg-black/8" />

        <div className="flex items-center gap-1.5">
          <Icon icon="mdi:magnify-minus-outline" width={14} className="text-black/30 cursor-pointer hover:text-black/50 transition-colors" />
          <div className="w-12 h-0.5 bg-black/8 rounded-full relative group cursor-pointer flex items-center">
            <div className="absolute inset-y-0 left-0 rounded-full bg-black/30" style={{ width: "55%" }} />
            <div
              className="absolute w-2 h-2 bg-white rounded-full border border-black/10 shadow-sm transition-transform group-hover:scale-110 pointer-events-none"
              style={{ left: "calc(55% - 4px)" }}
            />
          </div>
          <Icon icon="mdi:magnify-plus-outline" width={14} className="text-black/30 cursor-pointer hover:text-black/50 transition-colors" />
          <span className="text-[10px] font-mono text-black/40 min-w-[16px] text-left select-none ml-0.5">
            1×
          </span>
        </div>

        <div className="h-3.5 w-px bg-black/8" />
        <Icon icon="lucide:maximize" width={13} className="text-black/30 cursor-pointer hover:text-black/50 transition-colors" />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-black/40 tabular-nums">{formatTime(currentTime)}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => onSkip(-5)} aria-label={t("transport.rewind")} className="text-black/40 hover:text-black transition-colors">
            <Icon icon="mdi:rewind-5" width={17} />
          </button>
          <button
            onClick={onTogglePlay}
            aria-label={t(isPlaying ? "transport.pause" : "transport.play")}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black transition-colors"
          >
            <Icon icon={isPlaying ? "mdi:pause" : "mdi:play"} width={15} />
          </button>
          <button onClick={() => onSkip(5)} aria-label={t("transport.forward")} className="text-black/40 hover:text-black transition-colors">
            <Icon icon="mdi:fast-forward-5" width={17} />
          </button>
        </div>
        <span className="text-[10px] font-mono text-black/40 tabular-nums">{formatTime(duration)}</span>
      </div>
      <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
        <div className="flex items-center justify-between px-2 py-1 w-22 rounded-md border border-black/10 text-[10px] text-black/60 cursor-pointer hover:bg-black/3 active:bg-black/6 transition-colors select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon icon="material-symbols:gradient-outline" width={11} className="shrink-0" />
            <span className="truncate font-medium">{t("transport.mask")}</span>
          </div>
          <Icon icon="lucide:chevron-down" width={11} className="shrink-0 text-black/35 group-hover:text-black/50" />
        </div>
        <div className="flex items-center justify-between px-2 py-1 w-22 rounded-md border border-black/10 text-[10px] text-black/60 cursor-pointer hover:bg-black/3 active:bg-black/6 transition-colors select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon icon="mdi:crop" width={11} className="shrink-0" />
            <span className="truncate font-medium">{t("transport.crop")}</span>
          </div>
          <Icon icon="lucide:chevron-down" width={11} className="shrink-0 text-black/35 group-hover:text-black/50" />
        </div>

        <div className="flex items-center justify-between px-2 py-1 w-22 rounded-md border border-black/10 text-[10px] text-black/60 cursor-pointer hover:bg-black/3 active:bg-black/6 transition-colors select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon icon="mynaui:layout" width={11} className="shrink-0" />
            <span className="truncate font-medium">{t("transport.auto")}</span>
          </div>
          <Icon icon="lucide:chevron-down" width={11} className="shrink-0 text-black/35 group-hover:text-black/50" />
        </div>
      </div>
    </div>
  );
}

export default function HeroEditorPreview() {
  const t = useTranslations("heroPreview");

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragEaseRafRef = useRef<number | null>(null);
  const initializedTimelineRef = useRef(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const [backgroundCategory, setBackgroundCategory] = useState<BackgroundCategory>("wallpaper");
  const [activeSwatch, setActiveSwatch] = useState(0);
  const [activeGradient, setActiveGradient] = useState(0);

  const [clipRange, setClipRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [fragments, setFragments] = useState<ZoomFragment[]>([]);
  const [zoomMovements, setZoomMovements] = useState<ZoomMovement[]>([]);

  const [blurPercent, setBlurPercent] = useState(0);
  const [paddingPercent, setPaddingPercent] = useState(0);
  const [roundedPercent, setRoundedPercent] = useState(25);
  const [shadowPercent, setShadowPercent] = useState(30);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const userSelectedBackgroundRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v) setCurrentTime(v.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cancelDragEase = useCallback(() => {
    if (dragEaseRafRef.current !== null) {
      cancelAnimationFrame(dragEaseRafRef.current);
      dragEaseRafRef.current = null;
    }
  }, []);

  const handleDragOffsetChange = useCallback(
    (next: { x: number; y: number }) => {
      cancelDragEase();
      setDragOffset(next);
    },
    [cancelDragEase]
  );

  const handleDragRelease = useCallback(() => {
    cancelDragEase();
    const step = () => {
      setDragOffset((prev) => {
        const nx = prev.x * DRAG_EASE_FACTOR;
        const ny = prev.y * DRAG_EASE_FACTOR;
        if (Math.abs(nx) < 0.05 && Math.abs(ny) < 0.05) {
          dragEaseRafRef.current = null;
          return { x: 0, y: 0 };
        }
        dragEaseRafRef.current = requestAnimationFrame(step);
        return { x: nx, y: ny };
      });
    };
    dragEaseRafRef.current = requestAnimationFrame(step);
  }, [cancelDragEase]);

  useEffect(() => cancelDragEase, [cancelDragEase]);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) setDuration(v.duration);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 1 && Number.isFinite(v.duration)) {
      setDuration(v.duration);
    }
  }, []);

  useEffect(() => {
    if (duration <= 0 || initializedTimelineRef.current) return;
    initializedTimelineRef.current = true;

    setClipRange({ start: 0, end: Math.max(CLIP_MIN_DURATION, duration) });

    const initialFragments = getInitialZoomFragments(duration, ZOOM_FRAGMENT_DURATIONS);
    setFragments(initialFragments);
    setZoomMovements(getInitialZoomMovements(initialFragments));
  }, [duration]);

  const handleFragmentChange = useCallback((id: string, next: { start: number; end: number }) => {
    setFragments((prev) => prev.map((f) => (f.id === id ? { ...f, startTime: next.start, endTime: next.end } : f)));
    if (id === "zMid") {
      setZoomMovements((prev) => {
        const deltaStart = next.start - (fragments.find((f) => f.id === id)?.startTime ?? next.start);
        return prev.map((m) =>
          m.zoomFragmentId === id ? { ...m, startTime: m.startTime + deltaStart, endTime: m.endTime + deltaStart } : m
        );
      });
    }
  }, [fragments]);

  useEffect(() => {
    if (HERO_WALLPAPERS.length === 0) return;
    const id = setInterval(() => {
      if (userSelectedBackgroundRef.current) return;
      setActiveSwatch((prev) => (prev + 1) % HERO_WALLPAPERS.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const handleSelectWallpaper = useCallback((index: number) => {
    userSelectedBackgroundRef.current = true;
    setBackgroundCategory("wallpaper");
    setActiveSwatch(index);
  }, []);

  const handleSelectGradient = useCallback((index: number) => {
    userSelectedBackgroundRef.current = true;
    setBackgroundCategory("gradient");
    setActiveGradient(index);
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = clamp(time, 0, duration || 0);
      if (videoRef.current) videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const clamped = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const smoothZoom = useMemo(() => calculateSmoothZoom(currentTime, fragments, zoomMovements), [currentTime, fragments, zoomMovements]);

  const activeFragment = useMemo(
    () => fragments.find((f) => currentTime >= f.startTime && currentTime <= f.endTime) ?? null,
    [fragments, currentTime]
  );

  const lastEndedFragment = useMemo(
    () => fragments.filter((f) => f.endTime < currentTime).sort((a, b) => b.endTime - a.endTime)[0] ?? null,
    [fragments, currentTime]
  );

  const holdStrength = useMemo(() => {
    const frag = activeFragment ?? lastEndedFragment;
    if (!frag) return 0;
    const targetScale = zoomLevelToFactor(frag.zoomLevel);
    if (targetScale <= 1) return 0;
    return clamp((smoothZoom.scale - 1) / (targetScale - 1), 0, 1);
  }, [activeFragment, lastEndedFragment, smoothZoom.scale]);

  const drift = useMemo(() => {
    const frag = activeFragment ?? lastEndedFragment;
    if (!frag || holdStrength <= 0) return { x: 0, y: 0 };
    return organicDrift(currentTime, hashSeed(frag.id));
  }, [activeFragment, lastEndedFragment, holdStrength, currentTime]);

  const effectiveFocusX = clamp(smoothZoom.focusX + drift.x * DRIFT_AMPLITUDE_X * holdStrength, 6, 94);
  const effectiveFocusY = clamp(smoothZoom.focusY + drift.y * DRIFT_AMPLITUDE_Y * holdStrength, 6, 94);

  const tiltX = -drift.y * TILT_MAX_DEG * holdStrength;
  const tiltY = drift.x * TILT_MAX_DEG * holdStrength;

  const translateX = (50 - effectiveFocusX) * holdStrength + dragOffset.x;
  const translateY = (50 - effectiveFocusY) * holdStrength + dragOffset.y;

  const videoTransform = `translate(${translateX.toFixed(3)}%, ${translateY.toFixed(3)}%) scale(${smoothZoom.scale.toFixed(
    3
  )}) rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg)`;

  const transformOrigin = `${effectiveFocusX.toFixed(2)}% ${effectiveFocusY.toFixed(2)}%`;

  const roundedPx = (roundedPercent / SLIDER_MAX) * 100;
  const paddingPct = (paddingPercent / SLIDER_MAX) * 12;
  const backgroundBlurPx = (blurPercent / SLIDER_MAX) * 40;
  const shadowT = shadowPercent / SLIDER_MAX;
  const shadowY = 5 + shadowT * 16;
  const shadowBlur = 6 + shadowT * 44;
  const shadowOpacity = 0.22 + shadowT * 0.42;
  const dynamicShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity.toFixed(2)})`;

  const cursorTarget = useMemo(() => {
    const currentIndex = backgroundCategory === "wallpaper" ? activeSwatch : activeGradient;
    const col = currentIndex % THUMB_COLS;
    const row = Math.floor(currentIndex / THUMB_COLS);
    return { x: col * THUMB_STEP + THUMB / 2, y: row * THUMB_STEP + THUMB / 2 };
  }, [backgroundCategory, activeSwatch, activeGradient]);

  const backgroundUrl =
    backgroundCategory === "wallpaper" ? HERO_WALLPAPERS[activeSwatch]?.fullUrl : HERO_GRADIENTS[activeGradient]?.fullUrl;

  return (
    <section className="relative w-full overflow-visible flex justify-center animate-fade-in-up">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-screen min-w-[140vw] md:min-w-0 max-w-480 h-full -z-10 overflow-visible flex justify-center">
        <div
          className="absolute inset-0 -top-28 bottom-64 w-full h-full mix-blend-hard-light blur-[80px] md:blur-[120px] transform-gpu will-change-transform"
          style={{
            background:
              "linear-gradient(rgba(0,0,0,0) 0%, rgba(0,138,255,0.1) 20%, rgb(255,255,255) 45%, rgb(247,164,66) 75%, rgb(233,66,247) 100%)",
          }}
        />
        <div
          className="absolute inset-0 -top-28 bottom-64 w-full h-full mix-blend-soft-light blur-[80px] md:blur-[120px] transform-gpu will-change-transform"
          style={{
            background:
              "linear-gradient(rgba(0,0,0,0) 0%, rgba(0,138,255,0.2) 35%, rgb(255,255,255) 70%, rgb(247,164,66) 80%, rgb(233,66,247) 100%)",
          }}
        />
      </div>

      <div className="relative px-4 w-full">
        <div className="relative mx-auto max-w-7xl">
          <div className="relative mt-4 h-fit w-full md:mt-12">
            <div className="relative -mx-4 flex max-w-screen justify-center py-8 sm:p-8 delay-[800ms] duration-1000 will-change-transform starting:translate-y-16 starting:opacity-0 starting:blur-xs">
              <div className="relative w-full max-w-[calc(100vw-48px)] lg:w-7xl lg:min-w-200">
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 squircle-element-xl blur-3xl -z-10 bg-linear-to-b from-cyan-500/15 via-fuchsia-500/10 to-transparent"
                />
                <div className="relative w-full p-0 sm:p-3 squircle-element-2xl sm:border sm:border-black/10 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_30px_120px_rgba(0,0,0,0.18)]">
                  <div className="relative w-full h-[400px] sm:h-[576px] lg:h-[656px] overflow-hidden squircle-element-xl border border-black/10 bg-[#FAFAFB] flex">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-black/10 to-transparent z-20 pointer-events-none" />
                    <MiniSidebar t={t} />
                    <BackgroundPanel
                      t={t}
                      category={backgroundCategory}
                      activeSwatch={activeSwatch}
                      cursorTarget={cursorTarget}
                      onSelectWallpaper={handleSelectWallpaper}
                      activeGradient={activeGradient}
                      onSelectGradient={handleSelectGradient}
                      blurPercent={blurPercent}
                      onBlurChange={setBlurPercent}
                      paddingPercent={paddingPercent}
                      onPaddingChange={setPaddingPercent}
                      roundedPercent={roundedPercent}
                      onRoundedChange={setRoundedPercent}
                      shadowPercent={shadowPercent}
                      onShadowChange={setShadowPercent}
                    />
                    <div className="flex-1 flex flex-col min-w-0">
                      <EditorCanvas
                        videoRef={videoRef}
                        videoTransform={videoTransform}
                        transformOrigin={transformOrigin}
                        onLoadedMetadata={handleLoadedMetadata}
                        backgroundUrl={backgroundUrl}
                        zoomScale={smoothZoom.scale}
                        focusPoint={{ x: effectiveFocusX, y: effectiveFocusY }}
                        pulseKey={
                          activeFragment
                            ? `${activeFragment.id}-${activeFragment.startTime}`
                            : null
                        }
                        roundedPx={roundedPx}
                        paddingPct={paddingPct}
                        backgroundBlurPx={backgroundBlurPx}
                        dynamicShadow={dynamicShadow}
                        dragOffset={dragOffset}
                        onDragOffsetChange={handleDragOffsetChange}
                        onDragRelease={handleDragRelease}
                      />
                      <TransportBar
                        t={t}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        onTogglePlay={togglePlay}
                        onSkip={skip}
                      />
                      <EditorTimeline
                        t={t}
                        duration={duration}
                        currentTime={currentTime}
                        fragments={fragments}
                        onFragmentChange={handleFragmentChange}
                        clipRange={clipRange}
                        onClipChange={setClipRange}
                        trackRef={trackRef}
                        onSeek={handleSeek}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}