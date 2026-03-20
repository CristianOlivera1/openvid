/**
 * Renderizado del mockup de Chrome en Canvas
 */

import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";
import {
    drawLockIcon,
    drawRefreshIcon,
    drawStarIcon,
    drawThreeDotsIcon,
} from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";
import { drawBackIcon, drawForwardIcon } from "../canvas-icons/action-icons";

export function drawChromeMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "https://openvid.dev";
    const headerOpacity = config.headerOpacity ?? 100;
    const headerScale = (config.headerScale || 100) / 100;

    // ── Dimensiones (deben coincidir con ChromeMockup.tsx) ──
    const tabBarH = 32 * headerScale;
    const tabH = 26 * headerScale;
    const tabW = 180 * headerScale;
    const tabPadX = 10 * headerScale;
    const tabFontSz = 10.5 * headerScale;
    const tabIconSz = 12 * headerScale;
    const tabCloseS = 8 * headerScale;  // close X — smaller
    const tabML = 8 * headerScale;
    const tabMT = 3 * headerScale;  // top margin
    const tabRadius = 6 * headerScale;
    const plusSize = 10 * headerScale;  // + icon — smaller
    const plusML = 6 * headerScale;
    const winBtnW = 42 * headerScale;

    const addrH = 32 * headerScale;
    const addrPadX = 8 * headerScale;
    const navBtnSz = 14 * headerScale;
    const urlH = 26 * headerScale;
    const urlFontSz = 11 * headerScale;
    const urlPadX = 12 * headerScale;
    const iconSz = 14 * headerScale;

    const totalHeaderH = tabBarH + addrH;

    // ── Colores — todos derivan de frameColor igual que ChromeMockup.tsx ──
    const bgColor = isDark ? "#1e1e1e" : "#ffffff";
    const tabBarBg = frameColor;
    const addressBg = frameColor;
    const tabActiveBg = deriveSearchBg(frameColor);
    const urlBarBgBase = deriveSearchBg(frameColor);
    const addrBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
    const textColor = isDark ? "#9ca3af" : "#374151";
    const iconColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(55,65,81,0.7)";
    const tabBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";

    // 0. Sombra
    drawMockupShadow(ctx, x, y, width, height, cornerRadius, shadowBlur);

    // 1. Clip global con esquinas redondeadas
    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, cornerRadius);
    ctx.clip();

    // ── FILA 1: Tab bar ──
    ctx.fillStyle = hexToRgba(tabBarBg, headerOpacity);
    ctx.fillRect(x, y, width, tabBarH);

    // Tab activa (bottom-aligned)
    const tabX = x + tabML;
    const tabY = y + tabMT;
    ctx.save();
    drawRoundedRectPath(ctx, tabX, tabY, tabW, tabH, tabRadius);
    ctx.fillStyle = hexToRgba(tabActiveBg, headerOpacity);
    ctx.fill();
    ctx.strokeStyle = tabBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tabX + tabRadius, tabY);
    ctx.lineTo(tabX + tabW - tabRadius, tabY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tabX, tabY + tabRadius);
    ctx.lineTo(tabX, tabY + tabH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tabX + tabW, tabY + tabRadius);
    ctx.lineTo(tabX + tabW, tabY + tabH);
    ctx.stroke();
    ctx.restore();

    // Favicon (círculo azul)
    const favX = tabX + tabPadX + tabIconSz / 2;
    const favY = tabY + tabH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(favX, favY, tabIconSz / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.restore();

    // Título tab
    ctx.save();
    ctx.font = `${tabFontSz}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const titleX = favX + tabIconSz / 2 + 8 * headerScale;
    const titleMaxW = tabW - tabPadX * 2 - tabIconSz - 24 * headerScale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(titleX, tabY, titleMaxW, tabH);
    ctx.clip();
    ctx.fillText(url.replace(/^https?:\/\//, "").substring(0, 28), titleX, favY);
    ctx.restore();
    ctx.restore();

    // Close X
    const cSz = tabCloseS;
    const cX = tabX + tabW - tabPadX - cSz;
    const cY = tabY + (tabH - cSz) / 2;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 2.5 * headerScale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cX, cY); ctx.lineTo(cX + cSz, cY + cSz);
    ctx.moveTo(cX + cSz, cY); ctx.lineTo(cX, cY + cSz);
    ctx.stroke();
    ctx.restore();

    // New tab +
    const plusCX = tabX + tabW + plusML + plusSize * 0.9;
    const plusCY = y + tabBarH / 2;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 3 * headerScale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(plusCX - plusSize / 2, plusCY);
    ctx.lineTo(plusCX + plusSize / 2, plusCY);
    ctx.moveTo(plusCX, plusCY - plusSize / 2);
    ctx.lineTo(plusCX, plusCY + plusSize / 2);
    ctx.stroke();
    ctx.restore();

    // Windows buttons — centrados verticalmente en tabBarH
    const wBaseX = x + width - winBtnW * 3;
    // Minimize
    ctx.save();
    ctx.fillStyle = iconColor;
    ctx.fillRect(wBaseX + (winBtnW - 10 * headerScale) / 2, y + tabBarH / 2 - 0.5 * headerScale, 10 * headerScale, 1 * headerScale);
    ctx.restore();
    // Maximize
    const mSz = 9 * headerScale;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 1 * headerScale;
    ctx.strokeRect(wBaseX + winBtnW + (winBtnW - mSz) / 2, y + (tabBarH - mSz) / 2, mSz, mSz);
    ctx.restore();
    // Close X
    const wcSz = 10 * headerScale;
    const wcX = wBaseX + winBtnW * 2 + (winBtnW - wcSz) / 2;
    const wcY = y + (tabBarH - wcSz) / 2;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 1.2 * headerScale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(wcX, wcY); ctx.lineTo(wcX + wcSz, wcY + wcSz);
    ctx.moveTo(wcX + wcSz, wcY); ctx.lineTo(wcX, wcY + wcSz);
    ctx.stroke();
    ctx.restore();

    // ── FILA 2: Address bar ──
    const addrY = y + tabBarH;
    ctx.fillStyle = hexToRgba(addressBg, headerOpacity);
    ctx.fillRect(x, addrY, width, addrH);

    // Separador inferior
    ctx.save();
    ctx.strokeStyle = addrBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, addrY + addrH);
    ctx.lineTo(x + width, addrY + addrH);
    ctx.stroke();
    ctx.restore();

    // Nav: back, forward (dimmed), refresh
    const navY = addrY + (addrH - navBtnSz) / 2;
    let curX = x + addrPadX;

    drawBackIcon(ctx, curX, navY, navBtnSz, iconColor);
    curX += navBtnSz + 8 * headerScale;

    drawForwardIcon(ctx, curX, navY, navBtnSz, iconColor, true);
    curX += navBtnSz + 8 * headerScale;

    // Refresh
    drawRefreshIcon(ctx, curX, navY, navBtnSz, iconColor);
    curX += navBtnSz + 12 * headerScale;

    // URL bar (pill)
    const rightIconsW = iconSz * 0.85 * 2 + 28 * headerScale;
    const urlBarW = x + width - curX - rightIconsW - 8 * headerScale;
    const urlBarX = curX;
    const urlBarY = addrY + (addrH - urlH) / 2;

    ctx.save();
    drawRoundedRectPath(ctx, urlBarX, urlBarY, urlBarW, urlH, urlH / 2);
    ctx.fillStyle = hexToRgba(urlBarBgBase, headerOpacity);
    ctx.fill();
    ctx.restore();

    const lockSz = iconSz * 0.75;
    drawLockIcon(ctx, urlBarX + urlPadX, urlBarY + (urlH - lockSz) / 2, lockSz, iconColor + "99");

    ctx.save();
    ctx.font = `${urlFontSz}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.beginPath();
    ctx.rect(urlBarX + urlPadX + lockSz + 8 * headerScale, urlBarY, urlBarW - urlPadX * 2 - lockSz, urlH);
    ctx.clip();
    ctx.fillText(url.replace(/^https?:\/\//, "").substring(0, 50), urlBarX + urlPadX + lockSz + 8 * headerScale, urlBarY + urlH / 2);
    ctx.restore();
    ctx.restore();

    // Star + dots
    const rX = urlBarX + urlBarW + 8 * headerScale;
    const rY = addrY + (addrH - iconSz * 0.85) / 2;
    drawStarIcon(ctx, rX, rY, iconSz * 0.85, iconColor);
    drawThreeDotsIcon(ctx, rX + iconSz * 0.85 + 8 * headerScale, rY, iconSz * 0.85, iconColor);

    // ── Fondo contenido ──
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y + totalHeaderH, width, height - totalHeaderH);

    ctx.restore(); // fin clip global

    return {
        contentX: x,
        contentY: y + totalHeaderH,
        contentWidth: width,
        contentHeight: height - totalHeaderH,
    };
}