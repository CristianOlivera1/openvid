"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { BROADCAST_CHANNEL } from "@/lib/projection/display";
import type { CornerPins } from "@/lib/projection/types";

export function useProjectorSync() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const winRef = useRef<Window | null>(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);

  useEffect(() => {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current = ch;

    ch.onmessage = (e) => {
      if (e.data?.type === "pong") setIsProjectorOpen(true);
      if (e.data?.type === "projector_closed") setIsProjectorOpen(false);
    };

    // ping to see if projector already open
    ch.postMessage({ type: "ping" });

    const interval = setInterval(() => {
      if (winRef.current?.closed) {
        setIsProjectorOpen(false);
        winRef.current = null;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      ch.close();
    };
  }, []);

  const setProjectorWindow = useCallback((w: Window | null) => {
    winRef.current = w;
    setIsProjectorOpen(!!w && !w.closed);
  }, []);

  const sendFrame = useCallback((dataUrl: string, width: number, height: number) => {
    channelRef.current?.postMessage({ type: "frame", dataUrl, width, height, timestamp: Date.now() });
  }, []);

  const sendCalibration = useCallback((pins: CornerPins, showTestPattern: boolean, testPattern: string) => {
    channelRef.current?.postMessage({ type: "calibration", pins, showTestPattern, testPattern });
  }, []);

  const sendClear = useCallback(() => {
    channelRef.current?.postMessage({ type: "clear" });
  }, []);

  return { isProjectorOpen, setProjectorWindow, sendFrame, sendCalibration, sendClear, channelRef };
}
