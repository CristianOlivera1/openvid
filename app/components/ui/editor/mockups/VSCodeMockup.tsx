"use client";

import { Icon } from "@iconify/react";
import type { MockupRenderProps } from "@/types/mockup.types";
import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";

interface VSCodeMockupProps extends MockupRenderProps {
    shadows?: number;
    roundedCorners?: number;
}

export function VSCodeMockup({
    children,
    config,
    className = "",
    shadows = 20,
    roundedCorners
}: VSCodeMockupProps) {
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url;
    const cornerRadius = roundedCorners ?? config.cornerRadius;
    const headerOpacity = config.headerOpacity ?? 100;

    const headerScale = (config.headerScale || 100) / 100;

    const headerHeight = 35 * headerScale;
    const logoSize = 16 * headerScale;
    const menuFontSize = 12 * headerScale;
    const menuPaddingX = 8 * headerScale;
    const menuPaddingY = 4 * headerScale;
    const menuGap = 4 * headerScale;
    const headerPaddingX = 12 * headerScale;
    const searchHeight = 22 * headerScale;
    const searchIconSize = 12 * headerScale;
    const searchFontSize = 11 * headerScale;
    const searchPaddingX = 8 * headerScale;
    const searchGap = 8 * headerScale;
    const controlIconSize = 12 * headerScale;
    const controlPaddingX = 12 * headerScale;

    const bgColor = isDark ? "#1e1e1e" : "#f3f3f3";
    const borderColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
    const textColor = isDark ? "#cccccc" : "#333333";
    const searchBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";

    // Search bar bg always derived from the current frameColor
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
                    paddingRight: 0,
                    backgroundColor: hexToRgba(frameColor, headerOpacity),
                    borderBottom: `1px solid ${borderColor}`,
                    borderTopLeftRadius: `${cornerRadius}px`,
                    borderTopRightRadius: `${cornerRadius}px`,
                    color: textColor,
                }}
            >
                {/* Left: Logo + Menu */}
                <div className="flex items-center" style={{ gap: `${menuGap}px` }}>
                    <Icon
                        icon="vscode-icons:file-type-vscode"
                        style={{ width: `${logoSize}px`, height: `${logoSize}px`, marginRight: `${menuGap}px` }}
                    />
                    <div className="flex items-center" style={{ fontSize: `${menuFontSize}px` }}>
                        {["File", "Edit", "Selection", "View", "Go", "Terminal", "Help"].map((item, i) => (
                            <span
                                key={item}
                                className={`rounded hover:bg-white/5 cursor-default ${i === 2 ? "hidden sm:block" :
                                        i === 4 ? "hidden md:block" :
                                            i === 5 ? "hidden lg:block" : ""
                                    }`}
                                style={{ padding: `${menuPaddingY}px ${menuPaddingX}px` }}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Center: Search bar — bg tracks frameColor */}
                <div
                    className="flex-1 flex justify-center max-w-[400px]"
                    style={{ padding: `0 ${headerPaddingX}px` }}
                >
                    <div
                        className="flex items-center justify-center w-full rounded-md transition-colors cursor-text"
                        style={{
                            height: `${searchHeight}px`,
                            gap: `${searchGap}px`,
                            padding: `0 ${searchPaddingX}px`,
                            // Use derived color instead of hardcoded dark/light values
                            backgroundColor: hexToRgba(searchBgBase, headerOpacity),
                            border: `1px solid ${searchBorder}`,
                        }}
                    >
                        <Icon
                            icon="mdi:magnify"
                            className="opacity-50"
                            style={{ width: `${searchIconSize}px`, height: `${searchIconSize}px` }}
                        />
                        <span
                            className="truncate"
                            style={{ fontSize: `${searchFontSize}px`, color: textColor }}
                        >
                            {url || "openvid"}
                        </span>
                    </div>
                </div>

                {/* Right: Window controls */}
                <div className="flex items-center h-full">
                    {[
                        { icon: "mdi:minus", extra: "" },
                        { icon: "mdi:checkbox-blank-outline", extra: "" },
                        { icon: "mdi:close", extra: "hover:bg-red-500/80 rounded-tr-lg" },
                    ].map(({ icon, extra }) => (
                        <button
                            key={icon}
                            className={`h-full hover:bg-white/5 transition-colors flex items-center justify-center ${extra}`}
                            style={{ padding: `0 ${controlPaddingX}px` }}
                        >
                            <Icon icon={icon} style={{ width: `${controlIconSize}px`, height: `${controlIconSize}px` }} />
                        </button>
                    ))}
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