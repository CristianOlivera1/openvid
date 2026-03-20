/**
 * Renderizado del mockup de Chrome Glass en Canvas
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

export function drawChromeGlassMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "https://openvid.dev";
    const headerOpacity = config.headerOpacity ?? 100;
    const headerScale = (config.headerScale || 100) / 100;

    const glassPadding = 7;
    const glassCornerRadius = cornerRadius;
    const innerCornerRadius = Math.max(0, glassCornerRadius + 4);

    // ── Dimensiones — idénticas a ChromeGlassMockup.tsx ──
    const tabBarH = 32 * headerScale;
    const tabH = 26 * headerScale;
    const tabW = 180 * headerScale;
    const tabPadX = 10 * headerScale;
    const tabFontSz = 10.5 * headerScale;
    const tabIconSz = 12 * headerScale;
    const tabCloseS = 8 * headerScale;
    const tabML = 8 * headerScale;
    const tabMT = 3 * headerScale;
    const tabRadius = 6 * headerScale;
    const plusSize = 10 * headerScale;
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

    // ── Colores — idénticos a ChromeGlassMockup.tsx ──
    const bgColor = isDark ? "#1e1e1e" : "#ffffff";
    const tabBarBg = frameColor;
    const addressBg = frameColor;
    const tabActiveBg = deriveSearchBg(frameColor);
    const urlBarBgBase = deriveSearchBg(frameColor);
    const addrBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
    const textColor = isDark ? "#9ca3af" : "#374151";
    const iconColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(55,65,81,0.7)";
    const tabBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";

    // 0. Sombra exterior
    drawMockupShadow(ctx, x, y, width, height, glassCornerRadius, shadowBlur);

    // 1. Área interior
    const innerX = x + glassPadding;
    const innerY = y + glassPadding;
    const innerWidth = width - glassPadding * 2;
    const innerHeight = height - glassPadding * 2;

    // 2. Cáscara glass
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

    // ── FILA 1: Tab bar ──
    ctx.fillStyle = hexToRgba(tabBarBg, headerOpacity);
    ctx.fillRect(innerX, innerY, innerWidth, tabBarH);

    // Tab activa
    const tabX = innerX + tabML;
    const tabY = innerY + tabMT;
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

    // Favicon
    const favX = tabX + tabPadX + tabIconSz / 2;
    const favY = tabY + tabH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(favX, favY, tabIconSz / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.restore();

    // Título tab
    const titleX = favX + tabIconSz / 2 + 6 * headerScale;
    const titleMaxW = tabW - tabPadX * 2 - tabIconSz - tabCloseS - 16 * headerScale;
    ctx.save();
    ctx.font = `${tabFontSz}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.beginPath();
    ctx.rect(titleX, tabY, titleMaxW, tabH);
    ctx.clip();
    ctx.fillText(url.replace(/^https?:\/\//, "").substring(0, 28), titleX, favY);
    ctx.restore();
    ctx.restore();

    // Close X (tabCloseS — más pequeño que favicon)
    const cX = tabX + tabW - tabPadX - tabCloseS;
    const cY = tabY + (tabH - tabCloseS) / 2;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.5 * headerScale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cX, cY); ctx.lineTo(cX + tabCloseS, cY + tabCloseS);
    ctx.moveTo(cX + tabCloseS, cY); ctx.lineTo(cX, cY + tabCloseS);
    ctx.stroke();
    ctx.restore();

    // New tab + (pequeño, centrado verticalmente)
    const plusCX = tabX + tabW + plusML + plusSize;
    const plusCY = innerY + tabBarH / 2;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2 * headerScale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(plusCX - plusSize / 2, plusCY);
    ctx.lineTo(plusCX + plusSize / 2, plusCY);
    ctx.moveTo(plusCX, plusCY - plusSize / 2);
    ctx.lineTo(plusCX, plusCY + plusSize / 2);
    ctx.stroke();
    ctx.restore();

    // Windows buttons — centrados en tabBarH
    const wBaseX = innerX + innerWidth - winBtnW * 3;
    ctx.save();
    ctx.fillStyle = iconColor;
    ctx.fillRect(wBaseX + (winBtnW - 10 * headerScale) / 2, innerY + tabBarH / 2 - 0.5 * headerScale, 10 * headerScale, 1 * headerScale);
    ctx.restore();
    const mSz = 9 * headerScale;
    ctx.save();
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 1 * headerScale;
    ctx.strokeRect(wBaseX + winBtnW + (winBtnW - mSz) / 2, innerY + (tabBarH - mSz) / 2, mSz, mSz);
    ctx.restore();
    const wcSz = 10 * headerScale;
    const wcX = wBaseX + winBtnW * 2 + (winBtnW - wcSz) / 2;
    const wcY = innerY + (tabBarH - wcSz) / 2;
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
    const addrY = innerY + tabBarH;
    ctx.fillStyle = hexToRgba(addressBg, headerOpacity);
    ctx.fillRect(innerX, addrY, innerWidth, addrH);

    ctx.save();
    ctx.strokeStyle = addrBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, addrY + addrH);
    ctx.lineTo(innerX + innerWidth, addrY + addrH);
    ctx.stroke();
    ctx.restore();

    // Nav: back, forward (dimmed), refresh
    const navY = addrY + (addrH - navBtnSz) / 2;
    let curX = innerX + addrPadX;
    drawBackIcon(ctx, curX, navY, navBtnSz, iconColor);
    curX += navBtnSz + 8 * headerScale;

    drawForwardIcon(ctx, curX, navY, navBtnSz, iconColor, true);
    curX += navBtnSz + 8 * headerScale;

    drawRefreshIcon(ctx, curX, navY, navBtnSz, iconColor);
    curX += navBtnSz + 12 * headerScale;

    // URL bar (pill)
    const rightIconsW = iconSz * 0.85 * 2 + 28 * headerScale;
    const urlBarW = innerX + innerWidth - curX - rightIconsW - 8 * headerScale;
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
    ctx.fillRect(innerX, innerY + totalHeaderH, innerWidth, innerHeight - totalHeaderH);

    ctx.restore(); // fin clip

    return {
        contentX: innerX,
        contentY: innerY + totalHeaderH,
        contentWidth: innerWidth,
        contentHeight: innerHeight - totalHeaderH,
    };
}