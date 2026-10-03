import type { CanvasElement } from "@/types/canvas-elements.types";

interface LaneBox {
  startPx: number;
  endPx: number;
}

function getElementTimeRange(element: CanvasElement, defaultEndTime: number) {
  const startTime = element.startTime ?? 0;
  const endTime = element.endTime ?? defaultEndTime;
  return { startTime, endTime };
}

function computeBox(
  element: CanvasElement,
  defaultEndTime: number,
  timeToPixels: (time: number) => number,
  minVisualWidthPx: number,
): LaneBox {
  const { startTime, endTime } = getElementTimeRange(element, defaultEndTime);
  const startPx = timeToPixels(startTime);
  const rawWidthPx = timeToPixels(endTime) - startPx;
  return { startPx, endPx: startPx + Math.max(rawWidthPx, minVisualWidthPx) };
}

export function assignElementLanes(
  elements: CanvasElement[],
  defaultEndTime: number,
  timeToPixels: (time: number) => number,
  minVisualWidthPx: number,
): Map<string, number> {
  const laneEndPx = new Map<number, number>();
  const laneOf = new Map<string, number>();

  const sorted = [...elements].sort((a, b) => {
    const aStart = getElementTimeRange(a, defaultEndTime).startTime;
    const bStart = getElementTimeRange(b, defaultEndTime).startTime;
    if (aStart !== bStart) return aStart - bStart;
    return b.zIndex - a.zIndex;
  });

  for (const element of sorted) {
    const { startPx, endPx } = computeBox(element, defaultEndTime, timeToPixels, minVisualWidthPx);
    let lane = 0;
    while ((laneEndPx.get(lane) ?? 0) > startPx) lane++;
    laneEndPx.set(lane, endPx);
    laneOf.set(element.id, lane);
  }

  return laneOf;
}

import { IntervalTree } from "./dsa/interval-tree";

export function isElementVisibleAtTime(
  element: CanvasElement,
  time: number,
  defaultEndTime: number,
): boolean {
  const { startTime, endTime } = getElementTimeRange(element, defaultEndTime);
  return time >= startTime && time <= endTime;
}

export function createElementsIntervalTree(
  elements: CanvasElement[],
  defaultEndTime: number
): IntervalTree<CanvasElement> {
  const items = elements.map((el) => {
    const { startTime, endTime } = getElementTimeRange(el, defaultEndTime);
    return {
      start: startTime,
      end: endTime,
      data: el,
    };
  });
  return new IntervalTree<CanvasElement>(items);
}

export function filterVisibleElements(
  elements: CanvasElement[],
  time: number,
  defaultEndTime: number,
): CanvasElement[] {
  if (elements.length < 8) {
    return elements.filter((el) => isElementVisibleAtTime(el, time, defaultEndTime));
  }
  const tree = createElementsIntervalTree(elements, defaultEndTime);
  return tree.queryPoint(time).sort((a, b) => a.zIndex - b.zIndex);
}

export const MIN_FRAGMENT_DURATION = 0.3;

export const ELEMENT_TYPE_STYLES: Record<CanvasElement["type"], {
  icon: string;
  activeBorder: string;
  activeBg: string;
  idleBorder: string;
  idleBg: string;
  activeText: string;
  idleText: string;
  glow: string;
}> = {
  text: {
    icon: "lucide:type",
    activeBorder: "border-violet-400/70",
    activeBg: "linear-gradient(180deg, rgba(167,139,250,0.5) 0%, rgba(109,40,217,0.4) 100%)",
    idleBorder: "border-violet-500/35",
    idleBg: "linear-gradient(180deg, rgba(167,139,250,0.2) 0%, rgba(76,29,149,0.15) 100%)",
    activeText: "text-violet-700 dark:text-violet-200",
    idleText: "text-violet-700/70 dark:text-violet-300/70",
    glow: "shadow-[0_0_10px_rgba(167,139,250,0.35)]",
  },
  image: {
    icon: "lucide:image",
    activeBorder: "border-pink-400/70",
    activeBg: "linear-gradient(180deg, rgba(244,114,182,0.5) 0%, rgba(190,24,93,0.4) 100%)",
    idleBorder: "border-pink-500/35",
    idleBg: "linear-gradient(180deg, rgba(244,114,182,0.2) 0%, rgba(131,24,67,0.15) 100%)",
    activeText: "text-pink-700 dark:text-pink-200",
    idleText: "text-pink-700/70 dark:text-pink-300/70",
    glow: "shadow-[0_0_10px_rgba(244,114,182,0.35)]",
  },
  svg: {
    icon: "lucide:shapes",
    activeBorder: "border-cyan-400/70",
    activeBg: "linear-gradient(180deg, rgba(34,211,238,0.5) 0%, rgba(14,116,144,0.4) 100%)",
    idleBorder: "border-cyan-500/35",
    idleBg: "linear-gradient(180deg, rgba(34,211,238,0.2) 0%, rgba(22,78,99,0.15) 100%)",
    activeText: "text-cyan-700 dark:text-cyan-200",
    idleText: "text-cyan-700/70 dark:text-cyan-300/70",
    glow: "shadow-[0_0_10px_rgba(34,211,238,0.35)]",
  },
};

export function getElementLabel(element: CanvasElement): string {
  if (element.type === "text") {
    const content = element.content?.trim();
    return content || "Empty text";
  }
  if (element.type === "image") return "Imagen";
  return "Forma";
}