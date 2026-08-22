"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tool } from "@/types/editor.types";

const VALID_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
    "screenshot",
    "elements",
    "audio",
    "zoom",
    "mockup",
    "cursor",
    "video",
    "camera",
    "history",
    "motion",
    "projector",
]);

function parseTool(value: string | null): Tool {
    if (value && VALID_TOOLS.has(value as Tool)) {
        return value as Tool;
    }
    return "screenshot";
}

export function useActiveTool(): [Tool, (next: Tool) => void] {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const tool = parseTool(searchParams.get("menu"));

    const setTool = useCallback((next: Tool) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("menu", next);
        router.replace(`${pathname}?${params.toString()}`);
    }, [router, pathname, searchParams]);

    return [tool, setTool];
}
