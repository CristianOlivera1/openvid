/**
 * Renderizado del mockup de Brave en Canvas
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

export function drawBraveMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "https://openvid.dev";
    const headerOpacity = config.headerOpacity ?? 100;

    const headerScale = (config.headerScale || 100) / 100;

    const headerHeight  = 32 * headerScale;
    const iconSize      = 14 * headerScale;
    const navGap        = 12 * headerScale;
    const leftPadding   = 12 * headerScale;
    const urlBarHeight  = 26 * headerScale;
    const urlBarPadding = 10 * headerScale;
    const fontSize      = 11 * headerScale;
    const rightGap      = 10 * headerScale;
    const winBtnW       = 34 * headerScale; // px-3 * 2 + icon

    const bgColor     = isDark ? "#262626" : "#f9f9f9";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textColor   = isDark ? "#cccccc" : "#555555";
    const iconColor   = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

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

    // 3. Línea separadora
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.stroke();
    ctx.restore();

    const smallIcon = iconSize * 0.75;
    const smallIconY = y + (headerHeight - smallIcon) / 2;

    // ── LEFT: chevron-left, chevron-right (dimmed), refresh ──
    let curX = x + leftPadding;

    drawChevronLeft(ctx, curX, smallIconY, smallIcon, iconColor + "59");
    curX += smallIcon + navGap;

    drawChevronRight(ctx, curX, smallIconY, smallIcon, iconColor); // opacity ~35%
    curX += smallIcon + navGap;

    drawRefreshIcon(ctx, curX, smallIconY, smallIcon, iconColor);

    // ── CENTER: URL bar (lock + url + star) ──
    const urlBarWidth = Math.min(width * 0.45, 576 * headerScale);
    const urlBarX = x + (width - urlBarWidth) / 2;
    const urlBarY = y + (headerHeight - urlBarHeight) / 2;
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

    // Star icon (right of URL bar) — drawn manually as polygon
    const starSize = iconSize * 0.75;
    const starX = urlBarX + urlBarWidth - urlBarPadding - starSize;
    const starY = urlBarY + (urlBarHeight - starSize) / 2;
    drawStarIcon(ctx, starX, starY, starSize, "rgba(234,179,8,0.8)");

    // ── RIGHT: download + three-dots + Windows buttons ──
    // Windows buttons are rightmost — calculate from right edge
    const winBtnsWidth = winBtnW * 3;
    const dotsIconX = x + width - winBtnsWidth - rightGap - smallIcon;
    const downloadIconX = dotsIconX - rightGap - smallIcon;

    drawDownloadIcon(ctx, downloadIconX, smallIconY, smallIcon, iconColor);
    drawThreeDotsIcon(ctx, dotsIconX, smallIconY, smallIcon, iconColor);

    // Windows buttons: minimize, maximize, close
    const winY = y;
    const winBtnH = headerHeight;
    drawWinButton(ctx, x + width - winBtnW * 3, winY, winBtnW, winBtnH, "minimize", iconColor, headerScale);
    drawWinButton(ctx, x + width - winBtnW * 2, winY, winBtnW, winBtnH, "maximize", iconColor, headerScale);
    drawWinButton(ctx, x + width - winBtnW,     winY, winBtnW, winBtnH, "close",    iconColor, headerScale, cornerRadius);

    return {
        contentX:      x,
        contentY:      y + headerHeight,
        contentWidth:  width,
        contentHeight: height - headerHeight,
    };
}