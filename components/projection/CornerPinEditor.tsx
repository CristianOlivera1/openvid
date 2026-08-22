"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { CornerPins, Point } from "@/lib/projection/types";

type Props = {
  pins: CornerPins;
  onChange: (pins: CornerPins) => void;
  onReset: () => void;
  aspectLabel?: string;
};

const HANDLE_LABELS = ["TL", "TR", "BR", "BL"];

export function CornerPinEditor({ pins, onChange, onReset, aspectLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const getPoint = useCallback((e: PointerEvent | React.PointerEvent, idx: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return pins[idx];
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }, [pins]);

  const handlePointerDown = (idx: number) => (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(idx);
  };

  useEffect(() => {
    if (dragging === null) return;
    const onMove = (e: PointerEvent) => {
      const p = getPoint(e, dragging);
      const next = pins.map((pt, i) => (i === dragging ? p : pt)) as CornerPins;
      onChange(next);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, getPoint, onChange, pins]);

  const nudge = (idx: number, dx: number, dy: number) => {
    const p = pins[idx];
    const next = pins.map((pt, i) => i === idx ? {
      x: Math.max(0, Math.min(1, p.x + dx)),
      y: Math.max(0, Math.min(1, p.y + dy)),
    } : pt) as CornerPins;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10 select-none touch-none"
        style={{ backgroundImage: "linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px" }}
      >
        {/* warped quad outline */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points={pins.map(p => `${p.x * 100},${p.y * 100}`).join(" ")}
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
          {/* diagonals for alignment */}
          <line x1={pins[0].x * 100} y1={pins[0].y * 100} x2={pins[2].x * 100} y2={pins[2].y * 100} stroke="rgba(255,255,255,0.15)" strokeWidth={0.3} />
          <line x1={pins[1].x * 100} y1={pins[1].y * 100} x2={pins[3].x * 100} y2={pins[3].y * 100} stroke="rgba(255,255,255,0.15)" strokeWidth={0.3} />
        </svg>

        {/* handles */}
        {pins.map((p, i) => (
          <button
            key={i}
            onPointerDown={handlePointerDown(i)}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold cursor-grab active:cursor-grabbing touch-none select-none"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              background: dragging === i ? "#fff" : hovered === i ? "#e5e5e5" : "rgba(0,0,0,0.85)",
              color: dragging === i ? "#000" : hovered === i ? "#000" : "#fff",
              borderColor: dragging === i ? "#fff" : "#fff",
              boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
              zIndex: dragging === i ? 10 : 1,
            }}
            aria-label={`Corner ${HANDLE_LABELS[i]}`}
          >
            {HANDLE_LABELS[i]}
          </button>
        ))}

        {/* center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="px-2 py-1 rounded bg-black/60 text-white text-[10px] font-mono tracking-widest">
            DRAG CORNERS TO MAP SURFACE {aspectLabel ? `• ${aspectLabel}` : ""}
          </span>
        </div>
      </div>

      {/* nudges + reset */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {pins.map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono text-white/50">{HANDLE_LABELS[i]}</span>
              <div className="grid grid-cols-3 gap-0.5">
                <span />
                <button onClick={() => nudge(i, 0, -0.01)} className="w-6 h-6 grid place-items-center bg-white/10 hover:bg-white/20 rounded text-white text-xs">↑</button>
                <span />
                <button onClick={() => nudge(i, -0.01, 0)} className="w-6 h-6 grid place-items-center bg-white/10 hover:bg-white/20 rounded text-white text-xs">←</button>
                <button onClick={() => nudge(i, 0, 0)} className="w-6 h-6 grid place-items-center bg-white/5 rounded text-white/30 text-[8px]">·</button>
                <button onClick={() => nudge(i, 0.01, 0)} className="w-6 h-6 grid place-items-center bg-white/10 hover:bg-white/20 rounded text-white text-xs">→</button>
                <span />
                <button onClick={() => nudge(i, 0, 0.01)} className="w-6 h-6 grid place-items-center bg-white/10 hover:bg-white/20 rounded text-white text-xs">↓</button>
                <span />
              </div>
            </div>
          ))}
        </div>
        <button onClick={onReset} className="self-end px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium">
          Reset quad
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-white/50">
        Tip: drag corners to match the physical surface. Use test pattern on projector to align. Nudge with arrows for pixel-perfect. Mapping is saved automatically.
      </p>
    </div>
  );
}
