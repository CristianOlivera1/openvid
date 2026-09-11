"use client";

// Suprime el falso positivo de Next 16.3 / React 19 para <script> inline
// en Server Components (theme + JSON-LD). Solo en dev, no afecta a prod.
if (typeof window !== "undefined") {
  const origError = console.error.bind(console);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";
    if (first.includes("Encountered a script tag") || first.includes("Scripts inside React components")) {
      return;
    }
    origError(...args);
  };
}

export function SuppressScriptWarning() {
  return null;
}
