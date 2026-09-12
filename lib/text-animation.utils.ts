import type { TextAnimation, TextCase, TextElement } from "@/types/canvas-elements.types";

export function applyTextCase(content: string, textCase: TextCase = "none") {
  void textCase;
  return content;
}

export interface TextAnimationState {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
  blur: number;
  clipProgress: number;
  content: string;
}

const DEFAULT_DURATION = 0.6;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function getProgress(time: number, start: number, end: number, duration: number) {
  const safeDuration = Math.max(0.1, duration || DEFAULT_DURATION);
  const entryProgress = clamp((time - start) / safeDuration, 0, 1);
  const exitProgress = clamp((end - time) / safeDuration, 0, 1);
  return { entryProgress, exitProgress };
}

function applyAnimation(animation: TextAnimation, progress: number, content: string, entering: boolean): TextAnimationState {
  const eased = easeOut(progress);
  const state: TextAnimationState = { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0, blur: 0, clipProgress: 1, content };
  if (animation === "fade") state.opacity = eased;
  if (animation === "slide-up") state.translateY = entering ? (1 - eased) * 28 : (1 - eased) * -28;
  if (animation === "slide-left") state.translateX = entering ? (1 - eased) * 36 : (1 - eased) * -36;
  if (animation === "slide-right") state.translateX = entering ? (1 - eased) * -36 : (1 - eased) * 36;
  if (animation === "scale") state.scale = entering ? 0.72 + eased * 0.28 : 0.72 + eased * 0.28;
  if (animation === "typewriter") state.content = content.slice(0, Math.ceil(content.length * eased));
  if (animation === "blur") state.opacity = eased;
  if (animation === "rotate") state.translateX = entering ? (1 - eased) * 18 : (1 - eased) * -18;
  if (animation === "rotate") state.rotation = entering ? (1 - eased) * -18 : (1 - eased) * 18;
  if (animation === "blur") state.blur = (1 - eased) * 12;
  if (animation === "bounce") state.translateY = entering ? Math.sin(eased * Math.PI) * -18 : Math.sin(eased * Math.PI) * 18;
  if (animation === "wipe") state.clipProgress = eased;
  if (animation === "pop") state.scale = entering ? 0.45 + eased * 0.55 : 0.45 + eased * 0.55;
  if (animation === "elastic") {
    state.scale = 0.72 + eased * 0.28 + Math.sin(eased * Math.PI * 2) * 0.08;
    state.translateY = Math.sin(eased * Math.PI * 2) * (entering ? -8 : 8);
  }
  if (animation === "zoom-blur") {
    state.scale = entering ? 1.2 - eased * 0.2 : 0.8 + eased * 0.2;
    state.blur = (1 - eased) * 10;
  }
  if (animation === "word-by-word") {
    const words = content.split(" ");
    state.content = words.slice(0, Math.ceil(words.length * eased)).join(" ");
  }
  if (animation !== "none") {
    state.opacity = entering ? Math.min(state.opacity, eased) : eased;
  }
  return state;
}

export function getTextAnimationStyle(animation: TextAnimation, progress: number, entering: boolean) {
  const eased = easeOut(clamp(progress, 0, 1));
  const state = applyAnimation(animation, eased, "", entering);
  return {
    opacity: state.opacity,
    transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})${animation === "rotate" ? ` rotate(${entering ? (1 - eased) * -18 : (1 - eased) * 18}deg)` : ""}`,
    filter: animation === "blur" || animation === "zoom-blur" ? `blur(${(1 - eased) * 12}px)` : "none",
    clipPath: animation === "wipe" ? `inset(0 ${Math.round((1 - eased) * 100)}% 0 0)` : "none",
  };
}

export function getTextAnimationState(element: TextElement, time: number, defaultEndTime: number): TextAnimationState {
  const start = element.startTime ?? 0;
  const end = element.endTime ?? defaultEndTime;
  const animationIn = element.animationIn ?? "none";
  const animationOut = element.animationOut ?? "none";
  const content = applyTextCase(element.content, element.textCase);
  const state: TextAnimationState = { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0, blur: 0, clipProgress: 1, content };

  if (animationIn !== "none" && time < start + (element.animationInDuration ?? DEFAULT_DURATION)) {
    return applyAnimation(animationIn, getProgress(time, start, end, element.animationInDuration ?? DEFAULT_DURATION).entryProgress, content, true);
  }

  if (animationOut !== "none" && time > end - (element.animationOutDuration ?? DEFAULT_DURATION)) {
    return applyAnimation(animationOut, getProgress(time, start, end, element.animationOutDuration ?? DEFAULT_DURATION).exitProgress, element.content, false);
  }

  return state;
}