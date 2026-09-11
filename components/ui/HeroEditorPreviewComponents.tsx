"use client";

import { memo, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { zoomLevelToFactor, type ZoomFragment } from "@/types/zoom.types";
import { ElementsIcon } from "@/components/ui/ElementsIcon";
import { formatTime } from "@/lib";
import {
  ACCENT,
  BackgroundCategory,
  DragMode,
  HERO_GRADIENTS,
  HERO_WALLPAPERS,
  PANEL_BORDER,
  SIDEBAR_TOOLS,
  SLIDER_MAX,
  TFunc,
  THUMB,
  ZOOM_MIN_DURATION,
  clamp,
} from "@/lib/editor-preview-hero.utils";

export const DraggableRange = memo(function DraggableRange({
  start,
  end,
  duration,
  trackRef,
  minDuration = 0.3,
  onChange,
  onClick,
  className,
  handleClassName,
  children,
}: {
  start: number;
  end: number;
  duration: number;
  trackRef: React.RefObject<HTMLDivElement | null>;
  minDuration?: number;
  onChange: (next: { start: number; end: number }) => void;
  onClick?: () => void;
  className?: string;
  handleClassName?: string;
  children?: React.ReactNode;
}) {
  const dragState = useRef<{
    mode: DragMode;
    startX: number;
    initialStart: number;
    initialEnd: number;
    hasMoved: boolean;
  } | null>(null);

  const startDrag = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      e.stopPropagation();
      dragState.current = {
        mode,
        startX: e.clientX,
        initialStart: start,
        initialEnd: end,
        hasMoved: false,
      };

      const handleMove = (ev: PointerEvent) => {
        const drag = dragState.current;
        const track = trackRef.current;
        if (!drag || !track || duration <= 0) return;

        const width = track.getBoundingClientRect().width;
        if (width <= 0) return;

        const deltaPx = ev.clientX - drag.startX;
        if (Math.abs(deltaPx) > 3) drag.hasMoved = true;

        const deltaSec = (deltaPx / width) * duration;
        let nextStart = drag.initialStart;
        let nextEnd = drag.initialEnd;

        if (drag.mode === "move") {
          const span = drag.initialEnd - drag.initialStart;
          nextStart = Math.max(0, Math.min(duration - span, drag.initialStart + deltaSec));
          nextEnd = nextStart + span;
        } else if (drag.mode === "resize-left") {
          nextStart = Math.max(0, Math.min(drag.initialEnd - minDuration, drag.initialStart + deltaSec));
        } else {
          nextEnd = Math.min(duration, Math.max(drag.initialStart + minDuration, drag.initialEnd + deltaSec));
        }

        onChange({ start: nextStart, end: nextEnd });
      };

      const handleUp = () => {
        if (dragState.current && !dragState.current.hasMoved && onClick) {
          onClick();
        }
        dragState.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [start, end, duration, minDuration, onChange, onClick, trackRef]
  );

  if (duration <= 0) return null;

  const left = (start / duration) * 100;
  const width = ((end - start) / duration) * 100;

  return (
    <div
      className={`group/trim absolute top-0 bottom-0 cursor-grab active:cursor-grabbing select-none touch-none ${className ?? ""}`}
      style={{ left: `${left}%`, width: `${width}%` }}
      onPointerDown={startDrag("move")}
    >
      {children}
      <div
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-center"
        onPointerDown={startDrag("resize-left")}
      >
        <div
          className={`w-1.5 h-8 rounded-full transition-all ${handleClassName ?? "bg-[#34A853] group-hover/trim:bg-[#4ade80]"
            }`}
        />
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-end"
        onPointerDown={startDrag("resize-right")}
      >
        <div
          className={`w-1.5 h-8 rounded-full transition-all ${handleClassName ?? "bg-[#34A853] group-hover/trim:bg-[#4ade80]"
            }`}
        />
      </div>
    </div>
  );
});

export const TimelineClipContent = memo(function TimelineClipContent({
  label,
  duration,
  progress,
  isSelected,
}: {
  label: string;
  duration: number;
  progress: number;
  isSelected?: boolean;
}) {
  return (
    <div
      className={`relative h-full w-full rounded-md overflow-hidden transition-colors duration-200 z-0 bg-emerald-100 ${isSelected
          ? "border-2 border-[#34A853] shadow-[0_0_12px_rgba(52,168,83,0.3)]"
          : ""
        }`}
      style={{
        border: isSelected ? undefined : "1px solid rgba(52, 168, 83, 0.4)",
      }}
    >
      <div className="absolute inset-0 flex items-center overflow-hidden">
        <div className="flex h-full w-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-full flex-1 border-r border-[#34A853]/10 last:border-r-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(20, 80, 40, 0.1) 50%, rgba(52, 168, 83, 0.1) 100%)",
                boxShadow: "rgba(255, 255, 255, 0.05) 0px 1px 0px inset",
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 left-0 border-r-2 border-[#4ade80] pointer-events-none z-5"
        style={{
          width: `${progress * 100}%`,
          background:
            "linear-gradient(rgba(52, 168, 83, 0.9) 0%, rgb(34, 139, 34) 50%, rgb(20, 80, 40) 100%)",
          boxShadow: "rgba(255, 255, 255, 0.2) 0px 1px 0px inset",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-2">
        <span className="flex items-center gap-2 text-[11px] font-medium drop-shadow-sm transition-colors duration-200 text-emerald-700">
          <Icon
            icon="solar:videocamera-record-bold"
            width={12}
            height={12}
            className="opacity-70 shrink-0 text-emerald-700"
          />
          <span className="truncate max-w-[120px]">{label}</span>
          <span className="font-mono text-[11px] transition-colors duration-200 text-emerald-700/60">
            {formatTime(duration)}
          </span>
        </span>
      </div>
    </div>
  );
});

export const TimelineZoomContent = memo(function TimelineZoomContent({
  zoomLevel,
  duration,
  isSelected,
  zoomLabel,
  hasMovement,
}: {
  zoomLevel: number;
  duration: number;
  isSelected?: boolean;
  zoomLabel: string;
  hasMovement?: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-0 rounded-md transition-all duration-200 pointer-events-none ${isSelected
          ? "border-2 border-blue-600 ring-1 ring-blue-600/20 shadow-[0_0_12px_rgba(59,130,246,0.25)] bg-blue-100"
          : "border border-blue-300 hover:border-blue-500 bg-blue-50/90"
        }`}
    >
      <span
        className={`flex items-center gap-1 text-[9px] leading-tight font-semibold ${isSelected ? "text-blue-950" : "text-blue-900"
          }`}
      >
        <Icon
          icon="iconamoon:zoom-in-bold"
          width={9}
          className={isSelected ? "text-blue-700" : "text-blue-600"}
        />
        {zoomLabel}
      </span>
      <span
        className={`font-mono text-[8px] leading-tight ${isSelected ? "text-blue-800" : "text-blue-700/80"
          }`}
      >
        {zoomLevelToFactor(zoomLevel).toFixed(1)}× · {duration.toFixed(1)}s
      </span>
    </div>
  );
});

export const ZoomFragmentRangeItem = memo(function ZoomFragmentRangeItem({
  fragment,
  duration,
  trackRef,
  zoomLabel,
  isSelected,
  onChange,
  onToggle,
}: {
  fragment: ZoomFragment;
  duration: number;
  trackRef: React.RefObject<HTMLDivElement | null>;
  zoomLabel: string;
  isSelected: boolean;
  onChange: (id: string, next: { start: number; end: number }) => void;
  onToggle: (id: string) => void;
}) {
  const handleChange = useCallback(
    (next: { start: number; end: number }) => onChange(fragment.id, next),
    [onChange, fragment.id]
  );
  const handleClick = useCallback(() => onToggle(fragment.id), [onToggle, fragment.id]);

  return (
    <DraggableRange
      start={fragment.startTime}
      end={fragment.endTime}
      duration={duration}
      trackRef={trackRef}
      minDuration={ZOOM_MIN_DURATION}
      onChange={handleChange}
      onClick={handleClick}
      handleClassName="bg-blue-500/70 group-hover/trim:bg-blue-600"
    >
      <TimelineZoomContent
        zoomLevel={fragment.zoomLevel}
        duration={fragment.endTime - fragment.startTime}
        isSelected={isSelected}
        zoomLabel={zoomLabel}
        hasMovement={!!fragment.movementEnabled}
      />
    </DraggableRange>
  );
});

export const MiniSidebar = memo(function MiniSidebar({ t }: { t: TFunc }) {
  return (
    <aside
      className={`hidden sm:flex flex-col items-center gap-1.5 w-[72px] shrink-0 border-r ${PANEL_BORDER} bg-white py-4`}
      aria-hidden="true"
    >
      {SIDEBAR_TOOLS.map((tool, i) => {
        const active = i === 0;
        return (
          <div key={tool.id} className="relative">
            <div
              className={`w-11 h-11 squircle-element flex items-center justify-center transition-all duration-200 relative ${active ? "text-white" : "hover:bg-black/[0.04]"
                }`}
              style={
                active
                  ? {
                    background: "radial-gradient(circle at 50% 0%, #555555 0%, #454545 64%)",
                    boxShadow: "inset 0 1.01rem 0.2rem -1rem #fff, 0 0 0 1px #fff4, 0 4px 4px 0 #0004, 0 0 0 1px #333",
                  }
                  : {}
              }
            >
              <div className={`transition-transform duration-300 ${active ? "scale-110" : "hover:scale-105"}`}>
                {tool.icon ? (
                  <Icon icon={tool.icon} width={19} style={{ color: active ? "#ffffff" : "rgba(0,0,0,0.4)" }} />
                ) : (
                  <ElementsIcon className={`w-[19px] h-[19px] ${active ? "text-white" : "text-gray-400"}`} />
                )}
              </div>

              {active && (
                <div className="absolute -top-3 -left-1 size-8 bg-white rounded-full blur-[5px] rotate-45 opacity-50 pointer-events-none" />
              )}
            </div>

            {tool.badge === "new" && (
              <span className="absolute -top-0.5 -right-0.5 px-[3px] py-[1px] rounded-full bg-amber-700 text-[6px] font-semibold text-white leading-tight uppercase">
                {t("sidebar.new")}
              </span>
            )}
          </div>
        );
      })}
      <div className="flex-1" />
      <div className={`w-full px-2 pt-3 border-t ${PANEL_BORDER} flex flex-col gap-1.5`}>
        <div className="w-full flex flex-col items-center gap-1 py-2 rounded-xl text-black/40">
          <Icon icon="fluent:screenshot-record-16-regular" width={20} />
          <span className="text-[9px] font-medium">{t("sidebar.record")}</span>
        </div>
        <div className="w-full flex flex-col items-center gap-1 py-2 rounded-xl border border-dashed border-black/10 text-black/40">
          <Icon icon="mage:video-upload" width={20} />
          <span className="text-[9px] font-medium">{t("sidebar.upload")}</span>
        </div>
      </div>
    </aside>
  );
});

export const MiniSlider = memo(function MiniSlider({
  icon,
  label,
  value,
  max = SLIDER_MAX,
  onChange,
}: {
  icon: string;
  label: string;
  value: number;
  max?: number;
  onChange?: (value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const fillPercent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      onChange?.(clamp(((clientX - rect.left) / rect.width) * max, 0, max));
    },
    [onChange, max]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onChange) return;
      e.preventDefault();
      isDraggingRef.current = true;
      updateFromClientX(e.clientX);

      const handleMove = (ev: PointerEvent) => {
        if (isDraggingRef.current) updateFromClientX(ev.clientX);
      };

      const handleUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onChange, updateFromClientX]
  );

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      className={`relative flex h-[28px] w-full items-center overflow-hidden rounded-lg border border-black/6 bg-black/[0.035] ${onChange ? "cursor-pointer touch-none select-none" : ""
        }`}
    >
      <div
        className="absolute bottom-0 left-0 top-0 bg-black/10 transition-[width] duration-150 ease-out"
        style={{ width: `${fillPercent}%` }}
      />
      <div
        className="absolute top-[5px] bottom-[5px] z-20 w-[2px] rounded-full shadow-sm transition-[left] duration-150 ease-out"
        style={{ left: `calc(${fillPercent}% - 1px)`, background: ACCENT }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-black/55">
          <Icon icon={icon} width={12} />
          <span>{label}</span>
        </div>
        <span className="text-[9px] font-mono text-black/40">{Math.round(value)}</span>
      </div>
    </div>
  );
});

export const SwatchGrid = memo(function SwatchGrid({
  label,
  items,
  activeIndex,
  isActiveCategory,
  cursorTarget,
  onSelect,
}: {
  label: string;
  items: { index: number | string; previewUrl: string }[];
  activeIndex: number;
  isActiveCategory: boolean;
  cursorTarget?: { x: number; y: number };
  onSelect: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/35 font-bold mb-2">
        <Icon icon="solar:gallery-wide-linear" width={11} />
        <span>{label}</span>
      </div>
      <div className="relative grid grid-cols-5 lg:grid-cols-6 gap-2 w-max">
        {items.map((item, i) => (
          <div
            key={item.index}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(i);
            }}
            className="rounded-lg overflow-hidden bg-cover bg-center transition-shadow cursor-pointer"
            style={{
              width: THUMB,
              height: THUMB,
              backgroundImage: `url('${item.previewUrl}')`,
              boxShadow:
                isActiveCategory && i === activeIndex
                  ? `0 0 0 2px white, 0 0 0 3.5px ${ACCENT}`
                  : "0 0 0 2px rgba(0,0,0,0.05)",
            }}
          />
        ))}
        {cursorTarget && (
          <motion.div
            className="absolute pointer-events-none z-10 w-[60px] h-[60px] min-w-[60px] min-h-[60px]"
            initial={false}
            animate={{ left: cursorTarget.x, top: cursorTarget.y + 10 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            style={{ translateX: "-50%", translateY: "-50%" }}
          >
            <Image
              src="/svg/pointinghand.svg"
              alt="Pointer"
              width={60}
              height={60}
              className="drop-shadow-md max-w-none"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
});

export const BackgroundPanel = memo(function BackgroundPanel({
  t,
  category,
  activeSwatch,
  cursorTarget,
  onSelectWallpaper,
  activeGradient,
  onSelectGradient,
  blurPercent,
  onBlurChange,
  paddingPercent,
  onPaddingChange,
  roundedPercent,
  onRoundedChange,
  shadowPercent,
  onShadowChange,
}: {
  t: TFunc;
  category: BackgroundCategory;
  activeSwatch: number;
  cursorTarget: { x: number; y: number };
  onSelectWallpaper: (index: number) => void;
  activeGradient: number;
  onSelectGradient: (index: number) => void;
  blurPercent: number;
  onBlurChange: (p: number) => void;
  paddingPercent: number;
  onPaddingChange: (p: number) => void;
  roundedPercent: number;
  onRoundedChange: (p: number) => void;
  shadowPercent: number;
  onShadowChange: (p: number) => void;
}) {
  return (
    <div className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-white overflow-hidden">
      <header className="relative flex items-center justify-between h-12 px-3 shrink-0 bg-transparent isolation-isolate">
        <div
          className="absolute inset-0 z-0 bg-[url('/images/pages/header-gradient-light.png')] bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            maskImage: `
              linear-gradient(to bottom, black 55%, transparent 99%),
              linear-gradient(to right, transparent 0%, black 50%),
              linear-gradient(to left, transparent 10%, black 50%)
            `,
            WebkitMaskImage: `
              linear-gradient(to bottom, black 55%, transparent 99%),
              linear-gradient(to right, transparent 0%, black 50%),
              linear-gradient(to left, transparent 10%, black 50%)
            `,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
        <div className="relative flex items-center gap-1.5 z-10">
          <Image src="/svg/openvid-complete-light.svg" alt="Openvid" width={100} height={80} />
        </div>
        <Icon icon="lucide:sidebar-close" width={16} className="relative text-black/30 z-10" />
      </header>
      <div className="flex-1 overflow-y-none custom-scrollbar">
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2 text-black/80 font-medium text-[13px] mb-3">
            <Icon icon="solar:gallery-wide-linear" width={16} />
            <span>{t("background.title")}</span>
          </div>
          <div className="flex bg-black/[0.04] rounded-lg p-0.5 text-[11px] font-medium">
            <div className="flex-1 text-center py-1.5 rounded-md bg-white shadow-sm text-black">
              {t("background.tabWallpaper")}
            </div>
            <div className="flex-1 text-center py-1.5 text-black/40">
              {t("background.tabColor")}
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 flex flex-col gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/35 font-bold mb-2">
              {t("background.options")}
            </div>
            <div className="flex flex-wrap gap-2">
              <div
                className="size-9 rounded-lg border border-black/10 shrink-0 hover:cursor-pointer bg-zinc-100 hover:bg-black/5 transition-colors"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)",
                  backgroundSize: "14px 14px",
                  backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
                }}
              />
              <div className="size-9 rounded-lg border border-dashed border-black/15 flex items-center justify-center bg-black/2 cursor-pointer hover:bg-black/5 transition-colors shrink-0">
                <Icon icon="material-symbols:upload-rounded" width={18} className="text-black/40" />
              </div>
              <div className="size-9 rounded-lg border border-black/10 flex items-center justify-center bg-black/2 cursor-pointer hover:bg-black/5 transition-colors shrink-0">
                <Icon icon="ri:unsplash-fill" width={18} className="text-black/40" />
              </div>
            </div>
          </div>
          <SwatchGrid
            label={t("background.desktopLabel")}
            items={HERO_WALLPAPERS}
            activeIndex={activeSwatch}
            isActiveCategory={category === "wallpaper"}
            cursorTarget={category === "wallpaper" ? cursorTarget : undefined}
            onSelect={onSelectWallpaper}
          />
          <SwatchGrid
            label={t("background.gradientsLabel")}
            items={HERO_GRADIENTS}
            activeIndex={activeGradient}
            isActiveCategory={category === "gradient"}
            cursorTarget={category === "gradient" ? cursorTarget : undefined}
            onSelect={onSelectGradient}
          />
          <div className="text-[10px] text-black/35 flex items-center justify-center gap-1">
            <Icon icon="lucide:chevron-down" width={10} />
            <span>{t("background.showMore")}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/35 font-bold mb-2">
              {t("background.settings")}
            </div>
            <div className="flex flex-col gap-2">
              <MiniSlider icon="mdi:blur" label={t("background.blur")} value={blurPercent} onChange={onBlurChange} />
              <MiniSlider icon="mdi:arrow-expand-all" label={t("background.padding")} value={paddingPercent} onChange={onPaddingChange} />
              <MiniSlider icon="mdi:border-radius" label={t("background.rounded")} value={roundedPercent} onChange={onRoundedChange} />
              <MiniSlider icon="material-symbols:shadow" label={t("background.shadow")} value={shadowPercent} onChange={onShadowChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});