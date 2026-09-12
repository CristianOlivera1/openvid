import type { SvgElement, CanvasElement } from "@/types/canvas-elements.types";
import { getSvgDataUrl } from "@/components/canvas-svg";
import { VIDEO_Z_INDEX } from "@/lib/constants";
import { getTextAnimationState } from "@/lib/text-animation.utils";

export async function renderCanvasElements(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number,
  behindVideo: boolean,
  svgImageCache: Map<string, HTMLImageElement>,
  elementImageCache: Map<string, HTMLImageElement>,
  frameTime = 0,
  defaultEndTime = 0,
): Promise<void> {
  const filteredElements = elements.filter(el =>
    behindVideo ? el.zIndex < VIDEO_Z_INDEX : el.zIndex >= VIDEO_Z_INDEX
  );
  const sortedElements = [...filteredElements].sort((a, b) => a.zIndex - b.zIndex);
  const referenceSize = Math.min(canvasWidth, canvasHeight);

  for (const element of sortedElements) {
    if (element.type === "svg") {
      const svgElement = element as SvgElement;
      const svgDataUrl = getSvgDataUrl(svgElement.svgId, svgElement.color || "#FFFFFF");
      if (!svgDataUrl) continue;

      const cacheKey = `${svgElement.svgId}-${svgElement.color || "#FFFFFF"}`;
      let svgImage = svgImageCache.get(cacheKey);

      if (!svgImage || svgImage.src !== svgDataUrl) {
        svgImage = new Image();
        svgImageCache.set(cacheKey, svgImage);
        svgImage.src = svgDataUrl;
        await new Promise<void>((resolve) => {
          if (svgImage!.complete) resolve();
          else {
            svgImage!.onload = () => resolve();
            svgImage!.onerror = () => resolve();
          }
        });
      } else if (!svgImage.complete) {
        await new Promise<void>((resolve) => {
          svgImage!.onload = () => resolve();
          svgImage!.onerror = () => resolve();
          setTimeout(resolve, 500);
        });
      }

      ctx.save();
      const elemX = (svgElement.x / 100) * canvasWidth;
      const elemY = (svgElement.y / 100) * canvasHeight;
      const elemWidth = (svgElement.width / 100) * referenceSize;
      const elemHeight = (svgElement.height / 100) * referenceSize;

      ctx.translate(elemX, elemY);
      ctx.rotate((svgElement.rotation * Math.PI) / 180);
      ctx.globalAlpha = svgElement.opacity;
      ctx.drawImage(
        svgImage,
        -elemWidth / 2,
        -elemHeight / 2,
        elemWidth,
        elemHeight
      );
      ctx.restore();
    } else if (element.type === "image") {
      const img = elementImageCache.get(element.imagePath);
      if (!img) continue;

      ctx.save();
      const elemX = (element.x / 100) * canvasWidth;
      const elemY = (element.y / 100) * canvasHeight;

      const elemWidth = (element.width / 100) * referenceSize;
      const elemHeight = (element.height / 100) * referenceSize;

      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      let finalWidth = elemWidth;
      let finalHeight = elemHeight;

      const elementAspectRatio = elemWidth / elemHeight;
      if (imgAspectRatio > elementAspectRatio) {
        finalHeight = elemWidth / imgAspectRatio;
      } else {
        finalWidth = elemHeight * imgAspectRatio;
      }

      ctx.translate(elemX, elemY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.globalAlpha = element.opacity;
      ctx.drawImage(
        img,
        -finalWidth / 2,
        -finalHeight / 2,
        finalWidth,
        finalHeight
      );
      ctx.restore();
    } else if (element.type === "text") {
      const animation = getTextAnimationState(element, frameTime, defaultEndTime);
      ctx.save();
      const elemX = (element.x / 100) * canvasWidth;
      const elemY = (element.y / 100) * canvasHeight;
      ctx.translate(elemX, elemY);
      ctx.translate(animation.translateX, animation.translateY);
      ctx.rotate(((element.rotation + animation.rotation) * Math.PI) / 180);
      ctx.scale(animation.scale, animation.scale);
      if (animation.blur > 0) ctx.filter = `blur(${animation.blur}px)`;
      ctx.globalAlpha = element.opacity * animation.opacity;
      const scaledFontSize = element.fontSize * (referenceSize / 1080);
      const fontWeight = element.fontWeight === 'normal' ? '400' : element.fontWeight === 'medium' ? '500' : '700';
      ctx.font = `${fontWeight} ${scaledFontSize}px ${element.fontFamily}`;
      ctx.fillStyle = element.color;
      if (element.useGradient) {
        const gradient = ctx.createLinearGradient(-scaledFontSize, 0, scaledFontSize, 0);
        gradient.addColorStop(0, element.color);
        gradient.addColorStop(1, element.colorEnd ?? element.color);
        ctx.fillStyle = gradient;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (element.strokeEnabled && element.strokeWidth) {
        ctx.lineWidth = element.strokeWidth;
        if (element.strokeGradient) {
          const strokeGradient = ctx.createLinearGradient(-scaledFontSize, 0, scaledFontSize, 0);
          strokeGradient.addColorStop(0, element.strokeColor ?? '#000000');
          strokeGradient.addColorStop(1, element.strokeColorEnd ?? element.strokeColor ?? '#000000');
          ctx.strokeStyle = strokeGradient;
        } else {
          ctx.strokeStyle = element.strokeColor ?? '#000000';
        }
        ctx.strokeText(animation.content, 0, 0);
      }
      ctx.fillText(animation.content, 0, 0);
      ctx.restore();
    }
  }
}