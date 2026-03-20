"use client";

import type { MockupRenderProps } from "@/types/mockup.types";
import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";

interface MacosGhostIdeMockupProps extends MockupRenderProps {
    shadows?: number;
    roundedCorners?: number;
}

export function MacosGhostIdeMockup({
    children,
    config,
    className = "",
    shadows = 20,
    roundedCorners
}: MacosGhostIdeMockupProps) {
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url;
    const cornerRadius = roundedCorners ?? config.cornerRadius;
    const headerOpacity = config.headerOpacity ?? 100;
    const headerScale = (config.headerScale || 100) / 100;

    const headerHeight = 35 * headerScale;
    const menuFontSize = 12 * headerScale;
    const menuPaddingX = 8 * headerScale;
    const menuPaddingY = 4 * headerScale;
    const menuGap = 4 * headerScale;
    const headerPaddingX = 12 * headerScale;
    const searchHeight = 22 * headerScale;
    const searchIconSize = 10 * headerScale;
    const searchFontSize = 11 * headerScale;
    const searchPaddingX = 8 * headerScale;
    const searchGap = 6 * headerScale;

    const bgColor = isDark ? "#1e1e1e" : "#f3f3f3";
    const borderColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
    const textColor = isDark ? "#cccccc" : "#333333";
    const searchBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";
    const searchBgBase = deriveSearchBg(frameColor);

    return (
        <div
            className={`relative w-full flex flex-col overflow-hidden ${className}`}
            style={{
                borderRadius: `${cornerRadius}px`,
                boxShadow: shadows > 0
                    ? `0 ${shadows * 0.3}px ${shadows}px rgba(0,0,0,0.5)`
                    : "none",
            }}
        >
            {/* Title Bar */}
            <div
                className="flex items-center justify-between select-none shrink-0"
                style={{
                    height: `${headerHeight}px`,
                    paddingLeft: `${headerPaddingX}px`,
                    paddingRight: `${headerPaddingX}px`,
                    backgroundColor: hexToRgba(frameColor, headerOpacity),
                    borderBottom: `1px solid ${borderColor}`,
                    borderTopLeftRadius: `${cornerRadius}px`,
                    borderTopRightRadius: `${cornerRadius}px`,
                    color: textColor,
                }}
            >
                {/* Left: ghost dots + menu items */}
                <div className="flex items-center" style={{ gap: `${menuGap * 2}px` }}>
                    {/* Ghost dots */}
                    <div className="flex items-center" style={{ gap: `${6 * headerScale}px` }}>
                        <div style={{ width: `${12 * headerScale}px`, height: `${12 * headerScale}px`, borderRadius: "50%", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)" }} />
                        <div style={{ width: `${12 * headerScale}px`, height: `${12 * headerScale}px`, borderRadius: "50%", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)" }} />
                        <div style={{ width: `${12 * headerScale}px`, height: `${12 * headerScale}px`, borderRadius: "50%", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)" }} />
                    </div>

                    {/* Menu items */}
                    <div className="flex items-center" style={{ fontSize: `${menuFontSize}px`, color: isDark ? "#999999" : "#555555" }}>
                        {["File", "Edit", "Selection", "View", "Go"].map((item, i) => (
                            <span
                                key={item}
                                className={`cursor-default ${i >= 3 ? "hidden md:block" : ""}`}
                                style={{ padding: `${menuPaddingY}px ${menuPaddingX}px` }}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Center: Search bar */}
                <div
                    className="flex-1 flex justify-center"
                    style={{ padding: `0 ${headerPaddingX}px`, maxWidth: `${400 * headerScale}px` }}
                >
                    <div
                        className="flex items-center justify-center w-full rounded-md cursor-text"
                        style={{
                            height: `${searchHeight}px`,
                            gap: `${searchGap}px`,
                            padding: `0 ${searchPaddingX}px`,
                            backgroundColor: hexToRgba(searchBgBase, headerOpacity),
                            border: `1px solid ${searchBorder}`,
                        }}
                    >
                        <svg style={{ width: `${searchIconSize}px`, height: `${searchIconSize}px`, opacity: 0.5, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="truncate" style={{ fontSize: `${searchFontSize}px`, color: textColor }}>
                            {url || "openvid"}
                        </span>
                    </div>
                </div>

                {/* Right: hamburger */}
                <div className="flex items-center justify-end" style={{ width: `${80 * headerScale}px`, color: isDark ? "rgba(163,163,163,0.8)" : "rgba(100,100,100,0.8)" }}>
                    <svg style={{ width: `${14 * headerScale}px`, height: `${14 * headerScale}px` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div
                className="flex-1 relative overflow-hidden"
                style={{ backgroundColor: bgColor }}
            >
                {children}
            </div>
        </div>
    );
}