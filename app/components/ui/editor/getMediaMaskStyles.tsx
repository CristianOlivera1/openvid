import type { ImageMaskConfig } from "@/types/photo.types";

export function getMediaMaskStyles(maskConfig?: ImageMaskConfig | null): React.CSSProperties {
  if (!maskConfig || !maskConfig.enabled) return {};

  const masks: string[] = [];
  
  if (maskConfig.top) {
    masks.push(`linear-gradient(180deg, transparent ${maskConfig.top.from}%, black ${maskConfig.top.to ?? 100}%)`);
  }
  if (maskConfig.bottom) {
    masks.push(`linear-gradient(0deg, transparent ${maskConfig.bottom.from}%, black ${maskConfig.bottom.to ?? 100}%)`);
  }
  if (maskConfig.left) {
    masks.push(`linear-gradient(90deg, transparent ${maskConfig.left.from}%, black ${maskConfig.left.to ?? 100}%)`);
  }
  if (maskConfig.right) {
    masks.push(`linear-gradient(270deg, transparent ${maskConfig.right.from}%, black ${maskConfig.right.to ?? 100}%)`);
  }
  if (maskConfig.angle !== undefined) {
    masks.push(`linear-gradient(${maskConfig.angle}deg, transparent ${maskConfig.angleFrom ?? 0}%, black ${maskConfig.angleTo ?? 100}%)`);
  }

  if (masks.length === 0) return {};

  return {
    WebkitMaskImage: masks.join(', '),
    WebkitMaskComposite: 'source-in',
    maskImage: masks.join(', '),
    maskComposite: 'intersect',
  };
}