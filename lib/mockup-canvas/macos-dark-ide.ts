/**
 * Renderizado del mockup de MacosDarkIde en Canvas
 */

import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";
import { drawMagnifyIcon } from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawMacosDarkIdeMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark        = config.darkMode;
    const frameColor    = config.frameColor;
    const url           = config.url || "openvid";
    const headerOpacity = config.headerOpacity ?? 100;
    const headerScale   = (config.headerScale || 100) / 100;

    // ── Dimensiones — idénticas a MacosDarkIdeMockup.tsx ──
    const headerHeight   = 35 * headerScale;
    const menuFontSize   = 12 * headerScale;
    const menuPaddingX   = 8  * headerScale;
    const menuPaddingY   = 4  * headerScale;
    const headerPaddingX = 12 * headerScale;
    const searchHeight   = 22 * headerScale;
    const searchIconSize = 10 * headerScale;
    const searchFontSize = 11 * headerScale;
    const searchPaddingX = 8  * headerScale;
    const searchGap      = 6  * headerScale;
    const dotSize        = 10 * headerScale;
    const dotGap         = 6  * headerScale;

    // ── Colores ──
    const bgColor      = isDark ? "#1e1e1e" : "#f3f3f3";
    const borderColor  = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
    const textColor    = isDark ? "#cccccc" : "#333333";
    const menuColor    = isDark ? "#999999" : "#555555";
    const searchBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";
    const searchBgBase = deriveSearchBg(frameColor);
    const hamburgerColor = isDark ? "rgba(163,163,163,0.8)" : "rgba(100,100,100,0.8)";

    // 0. Sombra
    drawMockupShadow(ctx, x, y, width, height, cornerRadius, shadowBlur);

    // 1. Fondo contenido
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.lineTo(x + width, y + height - cornerRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.restore();

    // 2. Header
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + width - cornerRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.lineTo(x, y + headerHeight);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(frameColor, headerOpacity);
    ctx.fill();
    ctx.restore();

    // 3. Borde inferior header
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.stroke();
    ctx.restore();

    const midY = y + headerHeight / 2;

    // ── LEFT: macOS dots ──
    const dotsStartX = x + headerPaddingX;
    const dotColors = [
        { fill: "#ff5f57", stroke: "#e0443e" },
        { fill: "#febc2e", stroke: "#d89f24" },
        { fill: "#28c840", stroke: "#1aab29" },
    ];
    dotColors.forEach(({ fill, stroke }, i) => {
        const cx = dotsStartX + i * (dotSize + dotGap) + dotSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, midY, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    });

    // ── Menu items ──
    const menuItems = ["File", "Edit", "Selection", "View", "Go"];
    const dotsEndX  = dotsStartX + 3 * dotSize + 2 * dotGap + menuPaddingX * 2;
    let menuX = dotsEndX;

    ctx.save();
    ctx.font = `${menuFontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = menuColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    menuItems.forEach((item) => {
        ctx.fillText(item, menuX + menuPaddingX, midY);
        menuX += ctx.measureText(item).width + menuPaddingX * 2;
    });
    ctx.restore();

    // ── CENTER: Search bar ──
    const searchWidth = Math.min(width * 0.4, 400 * headerScale);
    const searchX     = x + (width - searchWidth) / 2;
    const searchY     = y + (headerHeight - searchHeight) / 2;

    ctx.save();
    drawRoundedRectPath(ctx, searchX, searchY, searchWidth, searchHeight, 4 * headerScale);
    ctx.fillStyle = hexToRgba(searchBgBase, headerOpacity);
    ctx.fill();
    ctx.strokeStyle = searchBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Medir texto para centrar el grupo [icono + gap + texto]
    ctx.save();
    ctx.font = `${searchFontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    const displayUrl   = url.substring(0, 30);
    const textW        = ctx.measureText(displayUrl).width;
    const groupW       = searchIconSize + searchGap + textW;
    const groupStartX  = searchX + (searchWidth - groupW) / 2;

    // Lupa
    drawMagnifyIcon(ctx, groupStartX, searchY + (searchHeight - searchIconSize) / 2, searchIconSize, textColor + "80");

    // Texto
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(displayUrl, groupStartX + searchIconSize + searchGap, searchY + searchHeight / 2);
    ctx.restore();

    // ── RIGHT: hamburger ──
    const hamW   = 14 * headerScale;
    const hamH   = 1.5 * headerScale;
    const hamGap = 3.5 * headerScale;
    const hamX   = x + width - headerPaddingX - hamW;
    const hamY0  = midY - hamGap - hamH / 2;

    ctx.save();
    ctx.fillStyle = hamburgerColor;
    ctx.beginPath();
    ctx.roundRect(hamX, hamY0,             hamW, hamH, hamH / 2);
    ctx.roundRect(hamX, hamY0 + hamGap,    hamW, hamH, hamH / 2);
    ctx.roundRect(hamX, hamY0 + hamGap * 2, hamW, hamH, hamH / 2);
    ctx.fill();
    ctx.restore();

    return {
        contentX:      x,
        contentY:      y + headerHeight,
        contentWidth:  width,
        contentHeight: height - headerHeight,
    };
}