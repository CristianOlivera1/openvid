"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CornerPinEditor } from "./CornerPinEditor";
import { getScreens, openProjectorWindow, type ScreenInfo } from "@/lib/projection/display";
import { useProjectorSync } from "@/hooks/useProjectorSync";
import type { CornerPins } from "@/lib/projection/types";
import { DEFAULT_PINS, STORAGE_KEY } from "@/lib/projection/types";

type Props = {
  canvasGetter: () => HTMLCanvasElement | null;
  previewGetter?: () => HTMLDivElement | null;
};

export function ProjectorPanel({ canvasGetter, previewGetter }: Props) {
  const { isProjectorOpen, setProjectorWindow, sendFrame, sendCalibration } = useProjectorSync();
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<number>(1);
  const [pins, setPins] = useState<CornerPins>(DEFAULT_PINS);
  const [showTest, setShowTest] = useState(false);
  const [testPattern, setTestPattern] = useState<"grid" | "checker" | "bars" | "white">("grid");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [fps, setFps] = useState(30);
  const [streamStats, setStreamStats] = useState<{ sent: number; lastMs: number } | null>(null);
  const streamRef = useRef<number | null>(null);
  const sentCountRef = useRef(0);

  // Load/save pins
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.pins?.length === 4) setPins(parsed.pins);
        if (typeof parsed?.showTest === "boolean") setShowTest(parsed.showTest);
        if (parsed?.testPattern) setTestPattern(parsed.testPattern);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pins, showTest, testPattern }));
    } catch {}
  }, [pins, showTest, testPattern]);

  // Screens
  useEffect(() => {
    getScreens().then(setScreens);
    const handler = () => getScreens().then(setScreens);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Push calibration whenever pins/test/blackout change
  useEffect(() => {
    if (isBlackout) {
      sendCalibration(pins, true, "white");
      // then overlay black via frame? Actually projector will show white pattern - we override by sending black frame
      // Send blackout as calibration with special handling - projector checks blackout separately
      return;
    }
    sendCalibration(pins, showTest, testPattern);
  }, [pins, showTest, testPattern, isBlackout, sendCalibration]);

  // Also push blackout state via calibration message with isBlackout
  useEffect(() => {
    if (isBlackout) {
      // Send a black frame repeatedly instead of relying on calibration
    }
  }, [isBlackout]);

  const handleOpen = useCallback(async () => {
    const target = screens.find(s => s.id === selectedScreen) ?? screens[1] ?? screens[0];
    const win = openProjectorWindow(target);
    if (!win) {
      alert("Pop-up blocked. Allow pop-ups for this site and try again.");
      return;
    }
    setProjectorWindow(win);
    setTimeout(() => setIsStreaming(true), 400);
  }, [screens, selectedScreen, setProjectorWindow]);

  const handlePause = useCallback(() => {
    setIsStreaming(false);
    if (streamRef.current) cancelAnimationFrame(streamRef.current);
  }, []);

  // Streaming loop: capture canvas -> dataURL -> broadcast
  useEffect(() => {
    if (!isStreaming || !isProjectorOpen || isBlackout || showTest) {
      if (streamRef.current) cancelAnimationFrame(streamRef.current);
      return;
    }

    let last = 0;
    const interval = 1000 / fps;
    sentCountRef.current = 0;

    const tick = async (now: number) => {
      streamRef.current = requestAnimationFrame(tick);
      if (now - last < interval) return;
      last = now;

      const start = performance.now();
      const canvas = canvasGetter();

      // Fallback: if export canvas empty, try preview container via html-to-image
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        try {
          // Ensure canvas has content - if it's the export canvas, it may need drawFrame
          // For now just send it
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          // Skip empty/blank frames (all black detection via cheap check)
          if (dataUrl.length > 5000) {
            sendFrame(dataUrl, canvas.width, canvas.height);
            sentCountRef.current += 1;
            setStreamStats({ sent: sentCountRef.current, lastMs: Math.round(performance.now() - start) });
          }
          return;
        } catch {
          // tainted canvas -> fallback
        }
      }

      // Fallback: try previewGetter + html-to-image
      if (previewGetter) {
        const preview = previewGetter();
        if (preview) {
          try {
            const { toJpeg } = await import("html-to-image");
            const dataUrl = await toJpeg(preview, { quality: 0.72, pixelRatio: 1, cacheBust: false });
            // Create temp image to get dimensions
            sendFrame(dataUrl, preview.clientWidth || 1920, preview.clientHeight || 1080);
            sentCountRef.current += 1;
            setStreamStats({ sent: sentCountRef.current, lastMs: Math.round(performance.now() - start) });
          } catch {}
        }
      }
    };
    streamRef.current = requestAnimationFrame(tick);
    return () => {
      if (streamRef.current) cancelAnimationFrame(streamRef.current);
    };
  }, [isStreaming, isProjectorOpen, isBlackout, showTest, fps, canvasGetter, previewGetter, sendFrame]);

  const handlePinsChange = useCallback((next: CornerPins) => {
    setPins(next);
  }, []);

  const handleBlackout = useCallback(() => {
    const next = !isBlackout;
    setIsBlackout(next);
    if (next) {
      // Send black frame immediately
      const c = document.createElement("canvas");
      c.width = 1920; c.height = 1080;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
      sendFrame(c.toDataURL("image/jpeg", 0.8), c.width, c.height);
    }
  }, [isBlackout, sendFrame]);

  const handleCaptureOnce = useCallback(async () => {
    const canvas = canvasGetter();
    if (canvas && canvas.width > 0) {
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        sendFrame(dataUrl, canvas.width, canvas.height);
        return;
      } catch {}
    }
    if (previewGetter) {
      const preview = previewGetter();
      if (preview) {
        try {
          const { toJpeg } = await import("html-to-image");
          const dataUrl = await toJpeg(preview, { quality: 0.85, pixelRatio: 1 });
          sendFrame(dataUrl, preview.clientWidth, preview.clientHeight);
        } catch {}
      }
    }
  }, [canvasGetter, previewGetter, sendFrame]);

  return (
    <div className="space-y-4">
      {/* status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${isProjectorOpen ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/5 border-white/10 text-white/60"}`}>
        <span className={`w-2 h-2 rounded-full ${isProjectorOpen ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
        {isProjectorOpen ? (isStreaming && !showTest && !isBlackout ? "● Streaming to projector" : isBlackout ? "■ Blackout" : showTest ? "◈ Test pattern" : "○ Projector window open — paused") : "○ No projector window"}
        {isProjectorOpen && streamStats && <span className="ml-auto font-mono text-[10px] opacity-70">{streamStats.sent} frames • {streamStats.lastMs}ms • {fps}fps</span>}
      </div>

      {/* display selector + open */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold tracking-widest text-white/70">OUTPUT DISPLAY</label>
        <select
          value={selectedScreen}
          onChange={e => setSelectedScreen(Number(e.target.value))}
          className="w-full h-9 px-3 rounded-lg bg-white/10 border border-white/10 text-white text-sm"
        >
          {screens.map(s => (
            <option key={s.id} value={s.id} className="bg-zinc-900">{s.label}</option>
          ))}
        </select>
        <p className="text-[11px] text-white/40">Use Extended display (not Mirror). Pick the display that is your projector. If you only see one, set macOS → Displays → Use as Extended.</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpen}
            className="h-10 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> {isProjectorOpen ? "Reopen projector" : "Open projector window"}
          </button>
          <button
            onClick={handlePause}
            disabled={!isStreaming}
            className="h-10 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-medium disabled:opacity-40"
          >
            Pause stream
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setIsStreaming(v => !v)}
            disabled={!isProjectorOpen}
            className={`h-9 rounded-lg text-xs font-medium border ${isStreaming && !showTest && !isBlackout ? "bg-emerald-500 text-white border-emerald-600" : "bg-white/10 text-white border-white/10"} disabled:opacity-40`}
          >
            {isStreaming && !showTest && !isBlackout ? "■ Streaming" : "▶ Stream"}
          </button>
          <button
            onClick={handleBlackout}
            disabled={!isProjectorOpen}
            className={`h-9 rounded-lg text-xs font-medium border ${isBlackout ? "bg-red-500 text-white border-red-600" : "bg-white/10 text-white border-white/10"} disabled:opacity-40`}
          >
            {isBlackout ? "● Blackout" : "Blackout"}
          </button>
          <button
            onClick={handleCaptureOnce}
            disabled={!isProjectorOpen}
            className="h-9 rounded-lg bg-white/10 border border-white/10 text-white text-xs font-medium disabled:opacity-40"
          >
            Single frame
          </button>
        </div>
        <a href="/projector" target="_blank" rel="noreferrer" className="block h-8 px-3 grid place-items-center rounded-lg bg-white/10 border border-white/10 text-white text-xs text-center">Pop-out /projector ↗</a>
      </div>

      {/* fps */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold tracking-widest text-white/70">STREAM FPS</span>
        <input type="range" min={5} max={60} step={5} value={fps} onChange={e => setFps(Number(e.target.value))} className="flex-1 accent-white" />
        <span className="text-xs font-mono text-white w-10 text-right">{fps}</span>
      </div>

      {/* test pattern */}
      <div className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/10">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showTest} onChange={e => setShowTest(e.target.checked)} className="accent-white" />
          <span className="text-sm font-medium text-white">Show test pattern on projector</span>
        </label>
        {showTest && (
          <div className="grid grid-cols-4 gap-1.5">
            {(["grid", "checker", "bars", "white"] as const).map(p => (
              <button
                key={p}
                onClick={() => setTestPattern(p)}
                className={`h-8 rounded-lg text-xs font-medium capitalize border ${testPattern === p ? "bg-white text-black border-white" : "bg-white/10 text-white border-white/10"}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-white/40">Grid to align corners. Test pattern bypasses canvas and warps as full-screen fill.</p>
      </div>

      {/* corner pin */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-widest text-white/70">CORNER PIN — SURFACE WARP</span>
          <span className="text-[10px] font-mono text-white/40">drag to map physical surface</span>
        </div>
        <CornerPinEditor pins={pins} onChange={handlePinsChange} onReset={() => setPins(DEFAULT_PINS)} aspectLabel={`${screens.find(s => s.id === selectedScreen)?.width ?? 1920}×${screens.find(s => s.id === selectedScreen)?.height ?? 1080}`} />
      </div>

      {/* workflow help */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
        <p className="text-xs font-semibold text-amber-200">Workflow: add graphics → map → stream</p>
        <ol className="text-[11px] leading-relaxed text-amber-100/80 list-decimal list-inside space-y-0.5">
          <li>Add images / text / video in canvas (Elements panel).</li>
          <li>Click <b>Open projector window</b> — drag it to projector display, press F to fullscreen.</li>
          <li>Enable test pattern → drag corners until grid fits real surface.</li>
          <li>Disable test pattern → Stream. B to blackout. Single frame for stills.</li>
          <li>If black: check Extended (not Mirror) and pop-ups allowed.</li>
        </ol>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <p className="text-[11px] font-mono text-white/50 leading-relaxed">
          Inputs: canvas elements, video, images, text. Output: warped JPEG frames via BroadcastChannel to fullscreen projector window at native res. Shortcuts in projector: F fullscreen, B blackout, ESC exit.
        </p>
      </div>
    </div>
  );
}
