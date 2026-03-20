/**
 * Renderizado del mockup de Brave Glass en Canvas
 */

import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";
import {
    drawChevronLeft,
    drawChevronRight,
    drawLockIcon,
    drawRefreshIcon,
    drawDownloadIcon,
    drawStarIcon,
    drawThreeDotsIcon,
    drawWinButton
} from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawBraveGlassMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "https://openvid.dev";
    const headerOpacity = config.headerOpacity ?? 100;

    const headerScale = (config.headerScale || 100) / 100;

    // Glass border padding (debe coincidir con el CSS: 7px)
    const glassPadding = 7;
    const glassCornerRadius = cornerRadius;

    // Valores base escalados — igual que BraveMockup.tsx
    const headerHeight  = 32 * headerScale;
    const iconSize      = 14 * headerScale;
    const smallIcon     = iconSize * 0.75;
    const navGap        = 12 * headerScale;
    const leftPadding   = 12 * headerScale;
    const urlBarHeight  = 26 * headerScale;
    const urlBarPadding = 10 * headerScale;
    const fontSize      = 11 * headerScale;
    const rightGap      = 10 * headerScale;
    const winBtnW       = 34 * headerScale;

    const bgColor     = isDark ? "#262626" : "#f9f9f9";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textColor   = isDark ? "#cccccc" : "#555555";
    const iconColor   = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

    // 0. Sombra exterior
    drawMockupShadow(ctx, x, y, width, height, glassCornerRadius, shadowBlur);

    // 1. Área interior
    const innerX           = x + glassPadding;
    const innerY           = y + glassPadding;
    const innerWidth       = width  - glassPadding * 2;
    const innerHeight      = height - glassPadding * 2;
    const innerCornerRadius = Math.max(0, glassCornerRadius + 4);

    // 2. Cáscara glass (gradiente 45deg + bordes top/left)
    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, glassCornerRadius);
    const grad = ctx.createLinearGradient(x, y + height, x + width, y);
    grad.addColorStop(0, "rgba(255,255,255,0.3)");
    grad.addColorStop(1, "rgba(255,255,255,0.4)");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(x + glassCornerRadius, y + 0.375);
    ctx.lineTo(x + width - glassCornerRadius, y + 0.375);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 0.375, y + glassCornerRadius);
    ctx.lineTo(x + 0.375, y + height - glassCornerRadius);
    ctx.stroke();
    ctx.restore();

    // 3. Clip al área interior
    ctx.save();
    drawRoundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, innerCornerRadius);
    ctx.clip();

    // 4. Fondo contenido
    ctx.fillStyle = bgColor;
    ctx.fillRect(innerX, innerY + headerHeight, innerWidth, innerHeight - headerHeight);

    // 5. Header
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(innerX + innerCornerRadius, innerY);
    ctx.lineTo(innerX + innerWidth - innerCornerRadius, innerY);
    ctx.quadraticCurveTo(innerX + innerWidth, innerY, innerX + innerWidth, innerY + innerCornerRadius);
    ctx.lineTo(innerX + innerWidth, innerY + headerHeight);
    ctx.lineTo(innerX, innerY + headerHeight);
    ctx.lineTo(innerX, innerY + innerCornerRadius);
    ctx.quadraticCurveTo(innerX, innerY, innerX + innerCornerRadius, innerY);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(frameColor, headerOpacity);
    ctx.fill();
    ctx.restore();

    // 6. Línea separadora
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, innerY + headerHeight);
    ctx.lineTo(innerX + innerWidth, innerY + headerHeight);
    ctx.stroke();
    ctx.restore();

    const smallIconY = innerY + (headerHeight - smallIcon) / 2;

    // ── LEFT: chevron-left, chevron-right (dimmed), refresh ──
    let curX = innerX + leftPadding;
    drawChevronLeft(ctx, curX, smallIconY, smallIcon, iconColor);
    curX += smallIcon + navGap;
    drawChevronRight(ctx, curX, smallIconY, smallIcon, iconColor + "59");
    curX += smallIcon + navGap;
    drawRefreshIcon(ctx, curX, smallIconY, smallIcon, iconColor);

    // ── CENTER: URL bar (lock + url + star) ──
    const urlBarWidth  = Math.min(innerWidth * 0.45, 576 * headerScale);
    const urlBarX      = innerX + (innerWidth - urlBarWidth) / 2;
    const urlBarY      = innerY + (headerHeight - urlBarHeight) / 2;
    const urlBarBgBase = deriveSearchBg(frameColor);

    ctx.save();
    drawRoundedRectPath(ctx, urlBarX, urlBarY, urlBarWidth, urlBarHeight, 4 * headerScale);
    ctx.fillStyle = hexToRgba(urlBarBgBase, headerOpacity);
    ctx.fill();
    ctx.restore();

    const lockSize = iconSize * 0.65;
    drawLockIcon(ctx, urlBarX + urlBarPadding, urlBarY + (urlBarHeight - lockSize) / 2, lockSize, iconColor + "99");

    ctx.save();
    ctx.font = `${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(url.replace(/^https?:\/\//, "").substring(0, 40), urlBarX + urlBarWidth / 2, urlBarY + urlBarHeight / 2);
    ctx.restore();

    const starSize = iconSize * 0.75;
    drawStarIcon(ctx, urlBarX + urlBarWidth - urlBarPadding - starSize, urlBarY + (urlBarHeight - starSize) / 2, starSize, "rgba(234,179,8,0.8)");

    // ── RIGHT: download + three-dots + Windows buttons ──
    const winBtnsWidth  = winBtnW * 3;
    const dotsIconX     = innerX + innerWidth - winBtnsWidth - rightGap - smallIcon;
    const downloadIconX = dotsIconX - rightGap - smallIcon;

    drawDownloadIcon(ctx, downloadIconX, smallIconY, smallIcon, iconColor);
    drawThreeDotsIcon(ctx, dotsIconX, smallIconY, smallIcon, iconColor);

    drawWinButton(ctx, innerX + innerWidth - winBtnW * 3, innerY, winBtnW, headerHeight, "minimize", iconColor, headerScale);
    drawWinButton(ctx, innerX + innerWidth - winBtnW * 2, innerY, winBtnW, headerHeight, "maximize", iconColor, headerScale);
    drawWinButton(ctx, innerX + innerWidth - winBtnW,     innerY, winBtnW, headerHeight, "close",    iconColor, headerScale);

    // Fin clip interior
    ctx.restore();

    return {
        contentX:      innerX,
        contentY:      innerY + headerHeight,
        contentWidth:  innerWidth,
        contentHeight: innerHeight - headerHeight,
    };
}