export type ScreenInfo = {
  id: number;
  label: string;
  width: number;
  height: number;
  availLeft: number;
  availTop: number;
  isPrimary: boolean;
};

export async function getScreens(): Promise<ScreenInfo[]> {
  try {
    // Window Management API (Chrome 126+)
    const anyWindow = window as unknown as Record<string, unknown>;
    if (anyWindow.getScreenDetails) {
      const details: any = await (anyWindow.getScreenDetails as () => Promise<any>)();
      return (details.screens as any[]).map((s: any, i: number) => ({
        id: i,
        label: s.label || `Display ${i + 1}${s.isPrimary ? " (Primary)" : ""} — ${s.width}×${s.height}`,
        width: s.width,
        height: s.height,
        availLeft: s.availLeft ?? s.left ?? 0,
        availTop: s.availTop ?? s.top ?? 0,
        isPrimary: s.isPrimary,
      }));
    }
  } catch {
    // fallback
  }
  // Fallback: single screen
  const scr = window.screen as any;
  return [
    {
      id: 0,
      label: `Primary — ${scr.width}×${scr.height}`,
      width: scr.width,
      height: scr.height,
      availLeft: scr.availLeft ?? 0,
      availTop: scr.availTop ?? 0,
      isPrimary: true,
    },
  ];
}

export function openProjectorWindow(screen?: ScreenInfo): Window | null {
  const w = screen?.width ?? window.screen.width;
  const h = screen?.height ?? window.screen.height;
  const left = screen?.availLeft ?? 0;
  const top = screen?.availTop ?? 0;

  // Must be called from user gesture
  const features = `left=${left},top=${top},width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;
  const win = window.open("/projector", "openvid_projector", features);

  if (win) {
    // Try to move/resize to target screen (may be blocked)
    try {
      win.moveTo(left, top);
      win.resizeTo(w, h);
    } catch { /* cross-origin restrictions */ }
    win.focus();
  }
  return win;
}

export const BROADCAST_CHANNEL = "openvid_projector_v1";
