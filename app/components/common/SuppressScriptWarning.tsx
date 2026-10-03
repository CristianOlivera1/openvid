"use client";

if (typeof window !== "undefined") {
  const origError = console.error.bind(console);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    const first = args[0];
    const msg = typeof first === "string" ? first : String(first ?? "");
    const fullText = args.map((a) => (typeof a === "string" ? a : String(a ?? ""))).join(" ");
    if (
      msg.includes("Encountered a script tag while rendering React component") ||
      msg.includes("Cannot render a sync or defer") ||
      msg.includes("Scripts inside React components are never executed") ||
      fullText.includes("fdprocessedid") ||
      (fullText.includes("hydration-mismatch") && fullText.includes("fdprocessedid"))
    ) {
      return;
    }
    origError(...args);
  };
}

export function SuppressScriptWarning() {
  return null;
}
