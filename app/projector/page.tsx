"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BROADCAST_CHANNEL } from "@/lib/projection/display";
import type { CornerPins } from "@/lib/projection/types";
import { DEFAULT_PINS } from "@/lib/projection/types";
import { warpCanvas } from "@/lib/projection/homography";

export default function ProjectorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const warpCanvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"waiting" | "connected" | "no-signal">("waiting");
  const pinsRef = useRef<CornerPins>(DEFAULT_PINS);
  const showTestRef = useRef(false);
  const testPatternRef = useRef("grid");
  const blackoutRef = useRef(false);
  const lastFrameRef = useRef<HTMLImageElement | null>(null);

  const drawTestPattern = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, pattern: string) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    if (blackoutRef.current) return;
    if (pattern === "white") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); return; }
    if (pattern === "checker") {
      const size = 80;
      for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
        ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? "#fff" : "#111";
        ctx.fillRect(x, y, size, size);
      }
      return;
    }
    if (pattern === "bars") {
      const colors = ["#fff", "#ff0", "#0ff", "#0f0", "#f0f", "#f00", "#00f"];
      const bw = w / colors.length;
      colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * bw, 0, bw, h); });
      return;
    }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; const step = 80;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.strokeStyle = "#ff0000"; ctx.lineWidth = 3; ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    [[0, 0], [w, 0], [w, h], [0, h]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = "#ff0000"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    });
    ctx.fillStyle = "#fff"; ctx.font = "14px monospace"; ctx.fillText(`${w} × ${h}`, 12, h - 12);
  }, []);

  const renderCurrent = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const w = c.width, h = c.height;
    if (blackoutRef.current) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); return; }
    if (showTestRef.current) { drawTestPattern(ctx, w, h, testPatternRef.current); return; }
    if (lastFrameRef.current) {
      const isDefault = pinsRef.current.every((p, i) => p.x === DEFAULT_PINS[i].x && p.y === DEFAULT_PINS[i].y);
      if (isDefault) { ctx.clearRect(0, 0, w, h); ctx.drawImage(lastFrameRef.current, 0, 0, w, h); }
      else {
        const src = warpCanvasRef.current;
        if (src) {
          const sctx = src.getContext("2d"); if (sctx) {
            src.width = lastFrameRef.current.naturalWidth || w;
            src.height = lastFrameRef.current.naturalHeight || h;
            sctx.clearRect(0, 0, src.width, src.height);
            sctx.drawImage(lastFrameRef.current, 0, 0, src.width, src.height);
            warpCanvas(src, c, pinsRef.current);
          }
        }
      }
    } else {
      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff"; ctx.font = "18px monospace"; ctx.textAlign = "center";
      ctx.fillText("No signal — send from editor", w / 2, h / 2);
      ctx.font = "13px monospace"; ctx.fillStyle = "#888";
      ctx.fillText("Open editor → Projector → Open projector window → Start streaming", w / 2, h / 2 + 28);
    }
  }, [drawTestPattern]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; renderCurrent(); };
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [renderCurrent]);

  useEffect(() => {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL);
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "ping") { ch.postMessage({ type: "pong", hasWindow: true }); setStatus("connected"); return; }
      if (msg?.type === "frame") {
        const img = new Image();
        img.onload = () => { lastFrameRef.current = img; setStatus("connected"); renderCurrent(); };
        img.src = msg.dataUrl;
      }
      if (msg?.type === "calibration") {
        pinsRef.current = msg.pins ?? DEFAULT_PINS;
        showTestRef.current = !!msg.showTestPattern;
        testPatternRef.current = msg.testPattern ?? "grid";
        // detect blackout via white+no pins? handle via explicit
        if (msg.isBlackout !== undefined) blackoutRef.current = !!msg.isBlackout;
        renderCurrent();
      }
      if (msg?.type === "clear") { lastFrameRef.current = null; setStatus("no-signal"); renderCurrent(); }
      if (msg?.type === "blackout") { blackoutRef.current = !!msg.enabled; renderCurrent(); }
    };
    ch.postMessage({ type: "pong", hasWindow: true });
    setStatus("waiting");
    const t = setTimeout(renderCurrent, 100);
    const onUnload = () => { try { ch.postMessage({ type: "projector_closed" }); } catch {} };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => { clearTimeout(t); window.removeEventListener("beforeunload", onUnload); window.removeEventListener("pagehide", onUnload); ch.close(); };
  }, [renderCurrent]);

  useEffect(() => { const id = setInterval(renderCurrent, 100); return () => clearInterval(id); }, [renderCurrent]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") document.documentElement.requestFullscreen?.().catch(() => {});
      if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      if (e.key.toLowerCase() === "b") { blackoutRef.current = !blackoutRef.current; renderCurrent(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [renderCurrent]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-none">
      <canvas ref={canvasRef} className="block w-screen h-screen" />
      <canvas ref={warpCanvasRef} className="hidden" />
      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-mono tracking-widest opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        {status === "connected" ? "● PROJECTOR LIVE" : status === "waiting" ? "○ WAITING FOR SIGNAL" : "○ NO SIGNAL"} — F fullscreen • B blackout • ESC exit • Move window to projector
      </div>
      <button onClick={() => document.documentElement.requestFullscreen?.()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Fullscreen" title="Click to fullscreen (F)" />
    </div>
  );
}
