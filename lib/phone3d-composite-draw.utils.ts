import type { MutableRefObject } from "react";
import * as THREE from "three";
import { drawMaskedImage } from "@/lib/masked-image-draw.utils";
import { PHONE_H, PHONE_W, DEVICE_3D_DIMENSIONS, type ImageMaskConfigLike } from "@/lib/phone3d.utils";
import { REST_MOCKUP_3D_MOTION, type Mockup3DMotionTransform } from "@/lib/mockup-motion-3d";
import type { MockupCameraPose } from "@/lib/viewer-controls3d";

export interface Phone3DApi {
  renderAt: (w: number, h: number, motion?: Mockup3DMotionTransform, cameraPose?: MockupCameraPose) => void;
  restorePreview: () => void;
  setExportFrame?: (src: CanvasImageSource | null) => void;
  hasBuiltInShadow?: boolean;
  getVisualSize?: () => { width: number; height: number; offsetY?: number } | null;
}

export interface Phone3DCompositeContext {
  imagePhoneCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  imagePhoneApiRef: MutableRefObject<Phone3DApi | null>;
  canvasDimensions: { width: number; height: number } | null;
  imagePhoneDevice: string;
  imagePhoneScale: number;
  imagePhoneX: number;
  imagePhoneY: number;
  imagePhoneShadow: number;
  imagePhoneShadowColor: string;
  effectivePhoneMaskConfig: ImageMaskConfigLike | null | undefined;
  maskCompositeCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  imagePhoneRootRef?: MutableRefObject<THREE.Group | null>;
  motion3DForFrame?: Mockup3DMotionTransform;
  previewMotion3D?: Mockup3DMotionTransform;
  cameraPoseForFrame?: MockupCameraPose;
}

interface RootPose {
  rx: number; ry: number; rz: number;
  sx: number; sy: number; sz: number;
  px: number; py: number; pz: number;
}

const readPose = (g: THREE.Group): RootPose => ({
  rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z,
  sx: g.scale.x, sy: g.scale.y, sz: g.scale.z,
  px: g.position.x, py: g.position.y, pz: g.position.z,
});

const writePose = (g: THREE.Group, p: RootPose): void => {
  g.rotation.set(p.rx, p.ry, p.rz);
  g.scale.set(p.sx, p.sy, p.sz);
  g.position.set(p.px, p.py, p.pz);
};

export function drawPhone3DCompositeWithZoom(
  c: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  _frameTime: number,
  zs: { scale: number; focusX: number; focusY: number },
  highQuality: boolean,
  pivotX: number,
  pivotY: number,
  ctx2: Phone3DCompositeContext,
): void {
  const {
    imagePhoneCanvasRef, imagePhoneApiRef, canvasDimensions, imagePhoneDevice,
    imagePhoneScale, imagePhoneX, imagePhoneY, imagePhoneShadow, imagePhoneShadowColor,
    effectivePhoneMaskConfig, maskCompositeCanvasRef,
    imagePhoneRootRef, motion3DForFrame, previewMotion3D, cameraPoseForFrame,
  } = ctx2;

  const phoneGL = imagePhoneCanvasRef.current;
  if (!phoneGL) return;

  const domW = canvasDimensions?.width ?? canvasWidth;
  const pxScale = canvasWidth / domW;
  const zScale = zs.scale;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const measuredDims = imagePhoneApiRef.current?.getVisualSize?.();
  const deviceDims = measuredDims ?? DEVICE_3D_DIMENSIONS[imagePhoneDevice] ?? { width: PHONE_W, height: PHONE_H };
  const visualOffsetY = (measuredDims?.offsetY ?? 0) * imagePhoneScale * pxScale;
  const baseCx = centerX + imagePhoneX * pxScale;
  const baseCy = centerY + imagePhoneY * pxScale + visualOffsetY;
  const baseW = deviceDims.width * imagePhoneScale * pxScale;
  const baseH = deviceDims.height * imagePhoneScale * pxScale;

  const motion = motion3DForFrame ?? REST_MOCKUP_3D_MOTION;
  const preview = previewMotion3D ?? REST_MOCKUP_3D_MOTION;
  const shouldRender3DFrame = highQuality || cameraPoseForFrame !== undefined;



  const root = imagePhoneRootRef?.current ?? null;
  const saved = root ? readPose(root) : null;
  if (root && saved) {
    const ps = preview.scale !== 0 ? preview.scale : 1;
    writePose(root, {
      rx: saved.rx - preview.rotX + motion.rotX,
      ry: saved.ry - preview.rotY + motion.rotY,
      rz: saved.rz - preview.rotZ + motion.rotZ,
      sx: (saved.sx / ps) * motion.scale,
      sy: (saved.sy / ps) * motion.scale,
      sz: (saved.sz / ps) * motion.scale,
      px: saved.px - preview.posX + motion.posX,
      py: saved.py - preview.posY + motion.posY,
      pz: saved.pz - preview.posZ + motion.posZ,
    });
  }

  c.save();
  try {
    if (shouldRender3DFrame) {
      imagePhoneApiRef.current?.renderAt(baseW, baseH, motion, cameraPoseForFrame);
    }

    if (zScale !== 1) {
      c.translate(pivotX, pivotY);
      c.scale(zScale, zScale);
      c.translate(-pivotX, -pivotY);
    }

    const hasBuiltInShadow = imagePhoneApiRef.current?.hasBuiltInShadow ?? false;
    if (imagePhoneShadow > 0.01 && !hasBuiltInShadow) {
      const sT = imagePhoneShadow * imagePhoneShadow;
      const sBlur = sT * 60;
      c.save();
      c.globalAlpha = sT * 0.7;
      c.filter = `blur(${Math.max(2, sBlur * 0.6) * pxScale}px)`;
      c.beginPath();
      c.ellipse(
        baseCx,
        baseCy + baseH / 2 + sBlur * 0.2 * pxScale,
        (baseW * (0.6 - sT * 0.1)) / 2,
        (Math.max(4, sBlur * 0.55) * pxScale) / 2,
        0, 0, Math.PI * 2,
      );
      c.fillStyle = imagePhoneShadowColor;
      c.fill();
      c.restore();
    }

    if (imagePhoneShadow > 0.01) {
      c.shadowColor = imagePhoneShadowColor;
      c.shadowBlur = 28 * imagePhoneShadow * pxScale;
      c.shadowOffsetX = 0;
      c.shadowOffsetY = 18 * imagePhoneShadow * pxScale;
    }

    drawMaskedImage(c, phoneGL, baseCx - baseW / 2, baseCy - baseH / 2, baseW, baseH, effectivePhoneMaskConfig, maskCompositeCanvasRef);
  } finally {
    c.restore();
    if (shouldRender3DFrame) imagePhoneApiRef.current?.restorePreview();
    if (root && saved) writePose(root, saved);
  }
}