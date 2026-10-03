/**
 * Layer Memoization & LRU Cache for Canvas Rendering
 * Prevents redundant multi-megapixel blur & background re-draws during high-framerate export.
 */

interface CacheEntry {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  key: string;
  width: number;
  height: number;
  lastUsed: number;
}

export class LayerMemoizationCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries: number = 8) {
    this.maxEntries = maxEntries;
  }

  public getOrCreate(
    key: string,
    width: number,
    height: number,
    renderFn: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void
  ): HTMLCanvasElement | OffscreenCanvas {
    const existing = this.cache.get(key);
    if (existing && existing.width === width && existing.height === height) {
      existing.lastUsed = Date.now();
      return existing.canvas;
    }

    // Allocate offscreen canvas
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext("2d");
    } else {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext("2d");
    }

    if (!ctx) {
      throw new Error("Failed to create offscreen layer cache context");
    }

    // Execute render callback
    renderFn(ctx);

    // Evict oldest if limit reached
    if (this.cache.size >= this.maxEntries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      canvas,
      ctx,
      key,
      width,
      height,
      lastUsed: Date.now(),
    });

    return canvas;
  }

  public invalidate(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const globalLayerCache = new LayerMemoizationCache(12);
