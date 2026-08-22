export type Point = { x: number; y: number };

export type CornerPins = [Point, Point, Point, Point]; // TL, TR, BR, BL - normalized 0..1

export type BlendEdge = { size: number; gamma: number; enabled: boolean };

export type ProjectionSurface = {
  id: string;
  name: string;
  pins: CornerPins;
  blend: {
    top: BlendEdge;
    bottom: BlendEdge;
    left: BlendEdge;
    right: BlendEdge;
  };
  opacity: number;
  blackLevel: number;
  enabled: boolean;
};

export type ProjectorState = {
  surfaces: ProjectionSurface[];
  activeSurfaceId: string | null;
  showTestPattern: boolean;
  testPattern: "grid" | "checker" | "bars" | "white";
  projectorDisplayId: number | null;
};

export type BroadcastFrame = {
  type: "frame";
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
};

export type BroadcastCommand =
  | { type: "ping" }
  | { type: "pong"; hasWindow: boolean }
  | { type: "calibration"; pins: CornerPins; showTestPattern: boolean; testPattern: string }
  | { type: "clear" };

export const DEFAULT_PINS: CornerPins = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

export function createDefaultSurface(id = crypto.randomUUID()): ProjectionSurface {
  return {
    id,
    name: "Surface 1",
    pins: [...DEFAULT_PINS] as CornerPins,
    blend: {
      top: { size: 0, gamma: 1, enabled: false },
      bottom: { size: 0, gamma: 1, enabled: false },
      left: { size: 0, gamma: 1, enabled: false },
      right: { size: 0, gamma: 1, enabled: false },
    },
    opacity: 1,
    blackLevel: 0,
    enabled: true,
  };
}

export const STORAGE_KEY = "openvid_projection_surfaces_v1";
