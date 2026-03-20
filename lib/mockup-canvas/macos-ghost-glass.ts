/**
 * Renderizado del mockup de macOS Ghost Glass en Canvas
 */

import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";
import {
    drawChevronLeft,
    drawChevronRight,
    drawMenuIcon,
    drawLockIcon,
    drawRefreshIcon,
    drawDownloadIcon,
    drawUploadIcon,
    drawCopyIcon,
    drawPlusIcon,
} from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawMacosGhostGlassMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "https://openvid.dev";
    const headerOpacity = config.headerOpacity ?? 100;

    const headerScale = (config.headerScale || 100) / 100;

    const glassPadding      = 12;
    const glassCornerRadius = cornerRadius;

    const headerHeight      = 36 * headerScale;
    const buttonSize        = 10 * headerScale;
    const buttonGap         = 6  * headerScale;
    const buttonLeftPadding = 12 * headerScale;
    const urlBarHeight      = 18 * headerScale;
    const fontSize          = 14 * headerScale;
    const iconSize          = 14 * headerScale;

    const bgColor     = isDark ? "#262626" : "#f9f9f9";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textColor   = isDark ? "#cccccc" : "#555555";
    const iconColor   = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
    // Ghost buttons: adapt opacity to dark/light
    const ghostButtonStroke = isDark ? "rgba(180,180,180,0.4)" : "rgba(150,150,150,0.6)";

    // 0. Sombra exterior
    drawMockupShadow(ctx, x, y, width, height, glassCornerRadius, shadowBlur);

    // 1. Cáscara glass — linear-gradient(45deg, 0.3→0.4) + bordes top/left
    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, glassCornerRadius);
    const grad = ctx.createLinearGradient(x, y + height, x + width, y);
    grad.addColorStop(0, "rgba(255,255,255,0.3)");
    grad.addColorStop(1, "rgba(255,255,255,0.4)");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + glassCornerRadius, y + 0.375);
    ctx.lineTo(x + width - glassCornerRadius, y + 0.375);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 0.375, y + glassCornerRadius);
    ctx.lineTo(x + 0.375, y + height - glassCornerRadius);
    ctx.stroke();
    ctx.restore();

    // 2. Área interior (padding: 12px)
    const innerX          = x + glassPadding;
    const innerY          = y + glassPadding;
    const innerWidth      = width  - glassPadding * 2;
    const innerHeight     = height - glassPadding * 2;
    const innerCornerRadius = Math.max(0, glassCornerRadius + 4 );

    // 3. Clip al área interior
    ctx.save();
    drawRoundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, innerCornerRadius);
    ctx.clip();

    // 4. Fondo del contenido
    ctx.fillStyle = bgColor;
    ctx.fillRect(innerX, innerY + headerHeight, innerWidth, innerHeight - headerHeight);

    // 5. Header con frameColor
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

    // 7. Botones ghost
    const buttonY = innerY + (headerHeight - buttonSize) / 2;
    [0, 1, 2].forEach((i) => {
        const btnX = innerX + buttonLeftPadding + i * (buttonSize + buttonGap);
        ctx.save();
        ctx.beginPath();
        ctx.arc(btnX + buttonSize / 2, buttonY + buttonSize / 2, buttonSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = ghostButtonStroke;
        ctx.lineWidth = 0.75;
        ctx.stroke();
        ctx.restore();
    });

    // 8. Iconos navegación izquierda
    const navStartX     = innerX + buttonLeftPadding + 3 * (buttonSize + buttonGap) + buttonGap * 2;
    const iconY         = innerY + (headerHeight - iconSize) / 2;
    const navGap        = 6 * headerScale;

    drawMenuIcon(ctx, navStartX, iconY, iconSize, iconColor);
    const chevronStartX = navStartX + iconSize + navGap;
    drawChevronLeft(ctx, chevronStartX, iconY, iconSize, iconColor);
    drawChevronRight(ctx, chevronStartX + iconSize + 6 * headerScale, iconY, iconSize, iconColor);

    // 9. URL bar centrada
    const maxUrlBarWidth = 576 * headerScale;
    const urlBarWidth    = Math.min(innerWidth * 0.5, maxUrlBarWidth);
    const urlBarX        = innerX + (innerWidth - urlBarWidth) / 2;
    const urlBarY        = innerY + (headerHeight - urlBarHeight) / 2;
    const urlBarPadding  = 8 * headerScale;
    const urlBarBgBase   = deriveSearchBg(frameColor);

    ctx.save();
    drawRoundedRectPath(ctx, urlBarX, urlBarY, urlBarWidth, urlBarHeight, 4 * headerScale);
    ctx.fillStyle = hexToRgba(urlBarBgBase, headerOpacity);
    ctx.fill();
    ctx.restore();

    drawLockIcon(ctx, urlBarX + urlBarPadding, urlBarY + (urlBarHeight - buttonSize) / 2, buttonSize, iconColor + "99");

    ctx.save();
    ctx.font = `${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(url.replace(/^https?:\/\//, "").substring(0, 40), urlBarX + urlBarWidth / 2, urlBarY + urlBarHeight / 2);
    ctx.restore();

    drawRefreshIcon(ctx, urlBarX + urlBarWidth - urlBarPadding - buttonSize, urlBarY + (urlBarHeight - buttonSize) / 2, buttonSize, iconColor + "99");

    // 10. Iconos derecha
    const iconsRightPadding = 12 * headerScale;
    const iconGap           = 10 * headerScale;
    const copyIconX         = innerX + innerWidth - iconsRightPadding - iconSize;
    const plusIconX         = copyIconX - iconSize - iconGap;
    const uploadIconX       = plusIconX - iconSize - iconGap;
    const downloadIconX     = uploadIconX - iconSize - iconGap;

    drawCopyIcon(ctx,     copyIconX,     iconY, iconSize, iconColor);
    drawPlusIcon(ctx,     plusIconX,     iconY, iconSize, iconColor);
    drawUploadIcon(ctx,   uploadIconX,   iconY, iconSize, iconColor);
    drawDownloadIcon(ctx, downloadIconX, iconY, iconSize, iconColor);

    // Fin clip interior
    ctx.restore();

    return {
        contentX:      innerX,
        contentY:      innerY + headerHeight,
        contentWidth:  innerWidth,
        contentHeight: innerHeight - headerHeight,
    };
}