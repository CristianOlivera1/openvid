import * as THREE from "three";
import { applyTextureCover, type CropAreaLike } from "@/lib/phone3d.utils";
import { Mockup3DMotionTransform } from "./mockup-motion";

export type ExportFrameSource = CanvasImageSource | VideoFrame;
export type ExportFrameFn = (src: ExportFrameSource | null) => void;

type MapSlot = "map" | "emissiveMap";
type MapMaterial = THREE.Material & Partial<Record<MapSlot, THREE.Texture | null>>;
const MAP_SLOTS: readonly MapSlot[] = ["map", "emissiveMap"];

interface MapBinding {
    kind: "map";
    material: MapMaterial;
    slot: MapSlot;
    original: THREE.VideoTexture;
}

interface UniformBinding {
    kind: "uniform";
    material: THREE.ShaderMaterial;
    original: THREE.VideoTexture;
    saved: {
        transform: THREE.Matrix3 | null;
        isVideo: number | null;
        resolution: THREE.Vector2 | null;
    };
}

type Binding = MapBinding | UniformBinding;

interface ExportEntry {
    canvas: HTMLCanvasElement;
    tex: THREE.CanvasTexture;
    matrix: THREE.Matrix3 | null;
}


function readMatrix3(u: THREE.IUniform | undefined): THREE.Matrix3 | null {
    const v: unknown = u?.value;
    return v instanceof THREE.Matrix3 ? v : null;
}
function readVector2(u: THREE.IUniform | undefined): THREE.Vector2 | null {
    const v: unknown = u?.value;
    return v instanceof THREE.Vector2 ? v : null;
}
function readNumber(u: THREE.IUniform | undefined): number | null {
    const v: unknown = u?.value;
    return typeof v === "number" ? v : null;
}
function readVideoTexture(u: THREE.IUniform | undefined): THREE.VideoTexture | null {
    const v: unknown = u?.value;
    return v instanceof THREE.VideoTexture ? v : null;
}

function frameSize(src: ExportFrameSource): { w: number; h: number } {
    if ("displayWidth" in src) return { w: src.displayWidth, h: src.displayHeight };
    if ("videoWidth" in src) return { w: src.videoWidth, h: src.videoHeight };
    if ("naturalWidth" in src) return { w: src.naturalWidth, h: src.naturalHeight };
    if (typeof src.width === "number" && typeof src.height === "number") {
        return { w: src.width, h: src.height };
    }
    return { w: 0, h: 0 };
}

function inferTargetAspect(
    repeatX: number,
    repeatY: number,
    videoW: number,
    videoH: number,
    crop: CropAreaLike | null | undefined,
): number | null {
    let cropW = 1;
    let cropH = 1;
    if (crop) {
        const x = Math.max(0, Math.min(100, crop.x));
        const y = Math.max(0, Math.min(100, crop.y));
        cropW = Math.max(1, Math.min(100 - x, crop.width)) / 100;
        cropH = Math.max(1, Math.min(100 - y, crop.height)) / 100;
    }
    const croppedAspect = (videoW * cropW) / (videoH * cropH);
    const aspect = (croppedAspect * (repeatX / cropW)) / (repeatY / cropH);
    return Number.isFinite(aspect) && aspect > 0 ? aspect : null;
}

export type RenderAtWithMotion = (w: number, h: number, motion?: Mockup3DMotionTransform) => void;

export class ExportScreenSwapper {
    private bindings: Binding[] = [];
    private entries = new Map<THREE.Texture, ExportEntry>();
    private aspects = new WeakMap<THREE.Texture, number>();
    private warned = false;

    constructor(
        private scene: THREE.Scene,
        private getCrop: () => CropAreaLike | null | undefined,
        private getVideo: () => HTMLVideoElement | null | undefined,
        private anisotropy: number,
    ) { }

    setFrame(src: ExportFrameSource | null): void {
        if (!src) {
            this.restore();
            return;
        }
        const { w, h } = frameSize(src);
        if (!w || !h) return;

        if (this.bindings.length === 0) this.collect();
        if (this.bindings.length === 0) {
            if (!this.warned) {
                this.warned = true;
                console.warn("[export] No se encontró ninguna VideoTexture en la escena 3D; la pantalla no se actualizará.");
            }
            return;
        }

        const drawn = new Set<THREE.Texture>();
        for (const b of this.bindings) {
            const entry = this.ensureEntry(b, w, h);
            if (!drawn.has(b.original)) {
                drawn.add(b.original);
                entry.canvas.getContext("2d")?.drawImage(src, 0, 0, w, h);
                entry.tex.needsUpdate = true;
            }

            if (b.kind === "map") {
                b.material[b.slot] = entry.tex;
                continue;
            }
            const u = b.material.uniforms;
            u.screenMap.value = entry.tex;
            const transform = readMatrix3(u.screenTransform);
            if (transform && entry.matrix) transform.copy(entry.matrix);
            if (u.isVideo) u.isVideo.value = 0;
            readVector2(u.resolution)?.set(w, h);
        }
    }

    dispose(): void {
        this.restore();
        for (const e of this.entries.values()) e.tex.dispose();
        this.entries.clear();
    }

    private collect(): void {
        const seen = new Set<string>();
        this.scene.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const mats: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];

            for (const m of mats) {
                if (m instanceof THREE.ShaderMaterial) {
                    const original = readVideoTexture(m.uniforms.screenMap);
                    const key = `${m.uuid}:screenMap`;
                    if (!original || seen.has(key)) continue;
                    seen.add(key);
                    this.bindings.push({
                        kind: "uniform",
                        material: m,
                        original,
                        saved: {
                            transform: readMatrix3(m.uniforms.screenTransform)?.clone() ?? null,
                            isVideo: readNumber(m.uniforms.isVideo),
                            resolution: readVector2(m.uniforms.resolution)?.clone() ?? null,
                        },
                    });
                    continue;
                }

                const mm = m as MapMaterial;
                for (const slot of MAP_SLOTS) {
                    const t = mm[slot];
                    const key = `${m.uuid}:${slot}`;
                    if (!(t instanceof THREE.VideoTexture) || seen.has(key)) continue;
                    seen.add(key);
                    this.bindings.push({ kind: "map", material: mm, slot, original: t });
                }
            }
        });
    }

    private ensureEntry(b: Binding, w: number, h: number): ExportEntry {
        const vt = b.original;
        const existing = this.entries.get(vt);
        if (existing && existing.canvas.width === w && existing.canvas.height === h) return existing;

        existing?.tex.dispose();
        const canvas = existing?.canvas ?? document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const tex = new THREE.CanvasTexture(canvas);
        tex.flipY = vt.flipY;
        tex.colorSpace = vt.colorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = this.anisotropy;

        const crop = this.getCrop();
        let aspect = this.aspects.get(vt);
        if (aspect === undefined) {
            const video = this.getVideo();
            const sx = b.kind === "map" ? vt.repeat.x : (b.saved.transform?.elements[0] ?? 0);
            const sy = b.kind === "map" ? vt.repeat.y : (b.saved.transform?.elements[4] ?? 0);
            const inferred =
                video && video.videoWidth > 0 && video.videoHeight > 0 && sx > 0 && sy > 0
                    ? inferTargetAspect(sx, sy, video.videoWidth, video.videoHeight, crop)
                    : null;
            if (inferred !== null) {
                this.aspects.set(vt, inferred);
                aspect = inferred;
            }
        }

        let matrix: THREE.Matrix3 | null = null;
        if (b.kind === "map") {
            tex.center.copy(vt.center);
            tex.rotation = vt.rotation;
            if (aspect !== undefined) {
                applyTextureCover(tex, w, h, aspect * 1000, 1000, crop);
            } else {
                tex.repeat.copy(vt.repeat);
                tex.offset.copy(vt.offset);
            }
        } else if (aspect !== undefined) {
            const tmp = new THREE.Texture();
            tmp.flipY = vt.flipY;
            applyTextureCover(tmp, w, h, aspect * 1000, 1000, crop);
            tmp.updateMatrix();
            matrix = tmp.matrix.clone();
            tmp.dispose();
        } else {
            matrix = b.saved.transform?.clone() ?? null;
        }

        const entry: ExportEntry = { canvas, tex, matrix };
        this.entries.set(vt, entry);
        return entry;
    }

    private restore(): void {
        for (const b of this.bindings) {
            const entry = this.entries.get(b.original);
            if (!entry) continue;

            if (b.kind === "map") {
                if (b.material[b.slot] === entry.tex) b.material[b.slot] = b.original;
                continue;
            }

            const u = b.material.uniforms;
            if (u.screenMap.value !== entry.tex) continue;
            u.screenMap.value = b.original;
            const transform = readMatrix3(u.screenTransform);
            if (transform && b.saved.transform) transform.copy(b.saved.transform);
            if (u.isVideo && b.saved.isVideo !== null) u.isVideo.value = b.saved.isVideo;
            const resolution = readVector2(u.resolution);
            if (resolution && b.saved.resolution) resolution.copy(b.saved.resolution);
        }
        this.bindings = [];
    }
}