import { ZoomFragment, ZoomMovement, speedToTransitionMs } from "@/types";
import { WALLPAPER_CATEGORIES } from "./wallpaper.catalog";
import { useTranslations } from "next-intl";

export const ACCENT = "#009CF2";
export const PANEL_BORDER = "border-black/8";

export type SidebarTool = { id: string; icon?: string; badge?: "new" };

export const SIDEBAR_TOOLS: SidebarTool[] = [
  { id: "background", icon: "solar:gallery-wide-linear" },
  { id: "mockup", icon: "hugeicons:ai-browser", badge: "new" },
  { id: "motion", icon: "mage:box-3d", badge: "new" },
  { id: "zoom", icon: "iconamoon:zoom-in-bold" },
  { id: "videos", icon: "solar:video-library-outline" },
  { id: "elements" },
  { id: "audio", icon: "mdi:volume-high" },
];

export const HERO_WALLPAPER_CATEGORY =
  WALLPAPER_CATEGORIES.find((c) => c.id === "desktop" && c.items.length > 0) ??
  WALLPAPER_CATEGORIES.find((c) => c.items.length > 0);

export const HERO_WALLPAPERS = (HERO_WALLPAPER_CATEGORY?.items ?? []).slice(0, 12);

export const HERO_GRADIENT_CATEGORY = WALLPAPER_CATEGORIES.find(
  (c) => c.id === "gradient" && c.items.length > 0
);

export const HERO_GRADIENTS = (HERO_GRADIENT_CATEGORY?.items ?? []).slice(0, 12);

export const THUMB = 36;
export const THUMB_GAP = 8;
export const THUMB_STEP = THUMB + THUMB_GAP;
export const THUMB_COLS = 6;

export const ZOOM_MIN_DURATION = 0.6;
export const CLIP_MIN_DURATION = 1.5;
export const SLIDER_MAX = 30;

export function getInitialZoomFragments(
  duration: number,
  durations: { z1: number; z2: number; zMid?: number }
): ZoomFragment[] {
  if (duration <= 0) return [];
  const dur1 = Math.min(durations.z1, duration * 0.4);
  const dur2 = Math.min(durations.z2, duration * 0.3);
  const durMid = Math.min(durations.zMid ?? 2.6, duration * 0.28);

  if (duration < dur1 + durMid + dur2 + 0.6) {
    const f1Start = Math.min(duration * 0.1, Math.max(0, duration - dur1));
    const f2Start = Math.min(
      Math.max(f1Start + dur1, duration * 0.8),
      Math.max(0, duration - dur2)
    );
    return [
      {
        id: "z1",
        startTime: f1Start,
        endTime: Math.min(duration, f1Start + dur1),
        zoomLevel: 4,
        speed: 5,
        focusX: 15,
        focusY: 15,
      },
      {
        id: "z2",
        startTime: f2Start,
        endTime: Math.min(duration, f2Start + dur2),
        zoomLevel: 4.5,
        speed: 5,
        focusX: 90,
        focusY: 90,
      },
    ];
  }

  const f1Start = Math.min(duration * 0.08, Math.max(0, duration - dur1 - durMid - dur2 - 0.8));
  const f1End = Math.min(duration, f1Start + dur1);
  const f2End = Math.min(duration, Math.max(f1End + durMid + 0.4, duration * 0.92));
  const f2Start = Math.max(f1End + 0.2, f2End - dur2);
  const gapStart = f1End + 0.15;
  const gapEnd = f2Start - 0.15;
  const availableGap = Math.max(0, gapEnd - gapStart);
  const midDur = Math.min(durMid, availableGap > 0 ? availableGap : durMid);
  const centeredStart = gapStart + Math.max(0, (availableGap - midDur) / 2);
  const midStart = Math.max(gapStart, centeredStart - 0.75);
  const midEnd = midStart + midDur;

  return [
    {
      id: "z1",
      startTime: f1Start,
      endTime: f1End,
      zoomLevel: 4,
      speed: 5,
      focusX: 15,
      focusY: 15,
    },
    {
      id: "zMid",
      startTime: Math.max(f1End + 0.1, midStart),
      endTime: Math.min(f2Start - 0.1, midEnd),
      zoomLevel: 5,
      speed: 5,
      focusX: 90,
      focusY: 60,
      movementEnabled: true,
    },
    {
      id: "z2",
      startTime: f2Start,
      endTime: Math.min(duration, f2End),
      zoomLevel: 4.5,
      speed: 5,
      focusX: 90,
      focusY: 90,
    },
  ];
}

export function getInitialZoomMovements(fragments: ZoomFragment[]): ZoomMovement[] {
  const mid = fragments.find((f) => f.id === "zMid");
  if (!mid) return [];
  const totalDuration = mid.endTime - mid.startTime;
  if (totalDuration <= 0.5) return [];
  const transitionSec = Math.min(speedToTransitionMs(mid.speed) / 1000, totalDuration / 2);
  const holdStart = mid.startTime + transitionSec;
  const holdEnd = mid.endTime - transitionSec;
  if (holdEnd <= holdStart + 0.2) return [];
  const inset = Math.min(0.35, (holdEnd - holdStart) * 0.18);
  return [
    {
      id: "zm-mid-1",
      zoomFragmentId: "zMid",
      name: "Pan",
      startTime: holdStart + inset,
      endTime: holdEnd - inset * 0.5,
      focusX: 85,
      focusY: 80,
    },
  ];
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const DRIFT_AMPLITUDE_X = 3.2;
export const DRIFT_AMPLITUDE_Y = 2.4;
export const TILT_MAX_DEG = 1.6;

export function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 1000) / 1000) * Math.PI * 2;
}

export function organicDrift(t: number, seed: number): { x: number; y: number } {
  const x = Math.sin(t * 0.55 + seed) * 0.65 + Math.sin(t * 0.21 + seed * 2.3) * 0.35;
  const y = Math.cos(t * 0.47 + seed * 1.6) * 0.65 + Math.cos(t * 0.19 + seed * 0.8) * 0.35;
  return { x, y };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type DragMode = "move" | "resize-left" | "resize-right";

export type BackgroundCategory = "wallpaper" | "gradient";
export type TFunc = ReturnType<typeof useTranslations>;

export const DRAG_CLAMP_PCT = 16;
export const DRAG_EASE_FACTOR = 0.86;
export const ZOOM_FRAGMENT_DURATIONS = { z1: 3.2, zMid: 3.0, z2: 1.6 };