import type { MutableRefObject } from "react";
import type { VideoCanvasProps } from "@/types";
import {
  drawRoundedRect,
  drawRoundedRectBottomOnly,
} from "@/lib/canvas.utils";
import { drawMockupToCanvas } from "@/lib/mockup-canvas.utils";
import { DEFAULT_MOCKUP_CONFIG } from "@/types/mockup.types";
import { BOTTOM_ONLY_RADIUS_MOCKUPS, PHOTO_MOCKUPS, SELF_SHADOWING_MOCKUPS } from "@/lib/constants";
import { MockupMotionTransform } from "./mockup-motion";

const DEG_TO_RAD = Math.PI / 180;

export type ShadowCache = {
  key: string;
  canvas: HTMLCanvasElement;
  offsetX: number;
  offsetY: number;
};

export interface MockupDrawContext {
  videoTransform: NonNullable<VideoCanvasProps["videoTransform"]>;
  imageTransform: VideoCanvasProps["imageTransform"];
  apply3DToBackground: boolean;
  imageZoomScale: number;
  shadows: VideoCanvasProps["shadows"];
  mockupId: NonNullable<VideoCanvasProps["mockupId"]>;
  mockupConfig: VideoCanvasProps["mockupConfig"];
  mediaType: NonNullable<VideoCanvasProps["mediaType"]>;
  cropArea: VideoCanvasProps["cropArea"];
  sourceWidth: number;
  sourceHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scaledRadius: number;
  scaledShadowBlur: number;
  shadowCacheRef: MutableRefObject<ShadowCache | null>;
  mockupMotion?: MockupMotionTransform;
}

function applyPseudo3DTilt(c: CanvasRenderingContext2D, rotateXDeg: number, rotateYDeg: number) {
  if (rotateXDeg === 0 && rotateYDeg === 0) return;
  const rotXR = rotateXDeg * DEG_TO_RAD;
  const rotYR = rotateYDeg * DEG_TO_RAD;
  const tanY = Math.tan(rotYR);
  const tanX = Math.tan(rotXR);
  const sX = 1 / Math.sqrt(1 + tanY * tanY);
  const sY = 1 / Math.sqrt(1 + tanX * tanX);
  c.transform(sX, tanX * sY, tanY * sX, sY, 0, 0);
}

export function drawMockupAndMedia(
  c: CanvasRenderingContext2D,
  containerX: number,
  containerY: number,
  containerWidth: number,
  containerHeight: number,
  source: CanvasImageSource | VideoFrame | HTMLVideoElement | HTMLImageElement,
  applyImageXform: boolean,
  is3DActive: boolean,
  ctx2: MockupDrawContext,
  deferRotateZ: boolean = false,
): { rotateZPivot: { x: number; y: number } } | undefined {
  const { videoTransform, imageTransform, apply3DToBackground, imageZoomScale, shadows, mockupId, mockupConfig, mediaType, cropArea, sourceWidth, sourceHeight, canvasWidth, canvasHeight, scaledRadius, scaledShadowBlur, shadowCacheRef, mockupMotion } = ctx2;
  const vCX = containerX + containerWidth / 2;
  const vCY = containerY + containerHeight / 2;
  const txPx = (videoTransform.translateX / 100) * containerWidth;
  const tyPx = (videoTransform.translateY / 100) * containerHeight;
  const hasMockupLocal = mockupId && mockupId !== "none";
  let rotateZPivot: { x: number; y: number } | undefined;
  c.save();
  c.translate(vCX + txPx, vCY + tyPx);
  c.rotate(videoTransform.rotation * DEG_TO_RAD);
  if (mockupMotion) {
    const mTxPx = (mockupMotion.translateXPct / 100) * containerWidth;
    const mTyPx = (mockupMotion.translateYPct / 100) * containerHeight;
    c.translate(mTxPx, mTyPx);
    c.scale(mockupMotion.scale, mockupMotion.scale);
    c.rotate(mockupMotion.rotateZ * DEG_TO_RAD);
    if (!is3DActive) applyPseudo3DTilt(c, mockupMotion.rotateX, mockupMotion.rotateY);
  }

  if (applyImageXform && imageTransform && !apply3DToBackground && !hasMockupLocal) {
    if (imageTransform.perspective && imageTransform.perspective > 0 && (imageTransform.rotateX !== 0 || imageTransform.rotateY !== 0)) {
      const rotXR = imageTransform.rotateX * DEG_TO_RAD;
      const rotYR = imageTransform.rotateY * DEG_TO_RAD;
      const tanY2 = Math.tan(rotYR);
      const tanX2 = Math.tan(rotXR);
      const sX2 = 1 / Math.sqrt(1 + tanY2 * tanY2);
      const sY2 = 1 / Math.sqrt(1 + tanX2 * tanX2);
      c.transform(sX2, tanX2 * sY2, tanY2 * sX2, sY2, 0, 0);
    }
    c.rotate(imageTransform.rotateZ * DEG_TO_RAD);
    c.scale(imageTransform.scale * imageZoomScale, imageTransform.scale * imageZoomScale);
    const iTY = (imageTransform.translateY / 100) * containerHeight;
    c.translate(0, iTY / (imageTransform.scale * imageZoomScale));
  }
  c.translate(-vCX, -vCY);
  if (mockupMotion) c.globalAlpha *= mockupMotion.opacity;

  if (shadows > 0 && !SELF_SHADOWING_MOCKUPS.includes(mockupId)) {
    const shadowKey = `${containerWidth.toFixed(1)}x${containerHeight.toFixed(1)}|${scaledRadius.toFixed(1)}|${scaledShadowBlur.toFixed(1)}`;
    let cached = shadowCacheRef.current;
    if (!cached || cached.key !== shadowKey) {
      const margin = Math.ceil(scaledShadowBlur * 3 + scaledShadowBlur * 0.3 + 8);
      const buf = document.createElement('canvas');
      buf.width = Math.ceil(containerWidth) + margin * 2;
      buf.height = Math.ceil(containerHeight) + margin * 2;
      const bctx = buf.getContext('2d');
      if (bctx) {
        bctx.shadowColor = 'rgba(0, 0, 0, 1)';
        bctx.shadowBlur = scaledShadowBlur;
        bctx.shadowOffsetY = scaledShadowBlur * 0.3;
        bctx.fillStyle = 'black';
        drawRoundedRect(bctx, margin, margin, containerWidth, containerHeight, scaledRadius);
        bctx.fill();
      }
      cached = { key: shadowKey, canvas: buf, offsetX: margin, offsetY: margin };
      shadowCacheRef.current = cached;
    }
    c.save();
    c.drawImage(cached.canvas, containerX - cached.offsetX, containerY - cached.offsetY);
    c.restore();
  }

  const mockupCfg = mockupConfig || DEFAULT_MOCKUP_CONFIG;
  let vX = containerX, vY = containerY, vW = containerWidth, vH = containerHeight, vR = scaledRadius;
  if (hasMockupLocal) {
    const mBlur = SELF_SHADOWING_MOCKUPS.includes(mockupId) ? scaledShadowBlur : 0;
    const mr = drawMockupToCanvas(
      c, mockupId, mockupCfg,
      containerX, containerY, containerWidth, containerHeight,
      scaledRadius, mBlur, canvasWidth, canvasHeight
    );
    vX = mr.contentX;
    vY = mr.contentY;
    vW = mr.contentWidth;
    vH = mr.contentHeight;
    vR = mr.contentRadius !== undefined
      ? mr.contentRadius
      : mockupId === "outline" ? scaledRadius * 1.6
        : (mockupId === "iphone-slim" || mockupId === "glass-curve" || mockupId === "glass-full") ? scaledRadius * 2.5
          : scaledRadius;
  }

  c.save();
  const bottomOnly = hasMockupLocal && BOTTOM_ONLY_RADIUS_MOCKUPS.includes(mockupId);
  if (vR > 0) {
    if (bottomOnly) {
      drawRoundedRectBottomOnly(c, vX, vY, vW, vH, vR);
    } else {
      drawRoundedRect(c, vX, vY, vW, vH, vR);
    }
    c.clip();
  } else {
    c.beginPath();
    c.rect(vX, vY, vW, vH);
    c.clip();
  }
  if (mediaType === "video") {
    const baseFilter = is3DActive
      ? 'saturate(125%) contrast(110%) brightness(105%)'
      : 'saturate(130%) contrast(104%) brightness(103%)';
    const motionBlur = mockupMotion && mockupMotion.blurPx > 0.4 ? ` blur(${mockupMotion.blurPx}px)` : '';
    c.filter = baseFilter + motionBlur;
  }

  let baseSX = 0, baseSY = 0, baseSW = sourceWidth, baseSH = sourceHeight;
  if (cropArea && (cropArea.width < 100 || cropArea.height < 100 || cropArea.x > 0 || cropArea.y > 0)) {
    baseSX = (cropArea.x / 100) * sourceWidth;
    baseSY = (cropArea.y / 100) * sourceHeight;
    baseSW = (cropArea.width / 100) * sourceWidth;
    baseSH = (cropArea.height / 100) * sourceHeight;
  }

  if (PHOTO_MOCKUPS.includes(mockupId)) {


    const destAspect = vW / vH;
    const baseAspect = baseSW / baseSH;
    let coverW = baseSW, coverH = baseSH;
    if (baseAspect > destAspect) {
      coverW = baseSH * destAspect;
    } else {
      coverH = baseSW / destAspect;
    }
    const coverX = baseSX + (baseSW - coverW) / 2;
    const coverY = baseSY + (baseSH - coverH) / 2;
    c.drawImage(source, coverX, coverY, coverW, coverH, vX, vY, vW, vH);
  } else {

    c.drawImage(source, baseSX, baseSY, baseSW, baseSH, vX, vY, vW, vH);
  }
  c.restore();
  c.restore();
  return deferRotateZ ? { rotateZPivot: rotateZPivot! } : undefined;
}