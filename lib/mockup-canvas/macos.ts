/**
 * Renderizado del mockup de macOS en Canvas
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

/**
 * Dibuja el mockup de macOS en canvas
 */
export function drawMacosMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "https://openvid.dev";
    const headerOpacity = config.headerOpacity ?? 100;

    // Escalado proporcional del header
    const headerScale = (config.headerScale || 100) / 100;

    // Valores base escalados
    const headerHeight = 36 * headerScale;
    const buttonSize = 10 * headerScale;
    const buttonGap = 6 * headerScale;
    const buttonLeftPadding = 12 * headerScale;
    const urlBarHeight = 18 * headerScale;
    const fontSize = 14 * headerScale;
    const iconSize = 14 * headerScale;

    // Colores
    const bgColor = isDark ? "#262626" : "#ffffff";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textColor = isDark ? "#cccccc" : "#555555";
    const iconColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

    // 0. Dibujar sombra exterior del mockup (sin bloquear el fondo)
    drawMockupShadow(ctx, x, y, width, height, cornerRadius, shadowBlur);

    // 1. Dibujar fondo solo en área de contenido (debajo del header)
    ctx.save();
    // Aplicar corner radius solo a las esquinas inferiores
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

    // 2. Dibujar header con frameColor
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

    // 3. Dibujar línea separadora
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.stroke();
    ctx.restore();

    // 4. Dibujar botones de semáforo
    const buttonY = y + (headerHeight - buttonSize) / 2;
    const buttons = [
        { color: "#FF5F56", border: "#E0443E" },
        { color: "#FFBD2E", border: "#DEA123" },
        { color: "#27C93F", border: "#1AAB29" },
    ];

    buttons.forEach((btn, i) => {
        const btnX = x + buttonLeftPadding + i * (buttonSize + buttonGap);
        ctx.save();
        ctx.beginPath();
        ctx.arc(btnX + buttonSize / 2, buttonY + buttonSize / 2, buttonSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = btn.color;
        ctx.fill();
        ctx.strokeStyle = btn.border;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
    });

    // 5. Dibujar iconos de navegación izquierda (menu + chevrons)
    const navStartX = x + buttonLeftPadding + 3 * (buttonSize + buttonGap) + buttonGap * 2;
    const iconY = y + (headerHeight - iconSize) / 2;
    const navGap = 6 * headerScale;

    // Menú hamburguesa
    drawMenuIcon(ctx, navStartX, iconY, iconSize, iconColor);

    // Chevrons de navegación
    const chevronStartX = navStartX + iconSize + navGap;
    drawChevronLeft(ctx, chevronStartX, iconY, iconSize, iconColor);
    drawChevronRight(ctx, chevronStartX + iconSize + 6 * headerScale, iconY, iconSize, iconColor);

    // 6. Dibujar barra de URL centrada (max-w-xl = 576px en Tailwind)
    const maxUrlBarWidth = 576 * headerScale;
    const urlBarWidth = Math.min(width * 0.5, maxUrlBarWidth);
    const urlBarX = x + (width - urlBarWidth) / 2;
    const urlBarY = y + (headerHeight - urlBarHeight) / 2;
    const urlBarPadding = 8 * headerScale;

    // Usar la misma lógica que el componente React: derivar el color del search bar
    const urlBarBgBase = deriveSearchBg(frameColor);

    ctx.save();
    drawRoundedRectPath(ctx, urlBarX, urlBarY, urlBarWidth, urlBarHeight, 4 * headerScale);
    ctx.fillStyle = hexToRgba(urlBarBgBase, headerOpacity);
    ctx.fill();
    ctx.restore();

    // Icono de candado (izquierda)
    const lockIconSize = buttonSize;
    const lockIconX = urlBarX + urlBarPadding;
    const lockIconY = urlBarY + (urlBarHeight - lockIconSize) / 2;
    drawLockIcon(ctx, lockIconX, lockIconY, lockIconSize, iconColor + "99");

    // Texto de URL (centro)
    ctx.save();
    ctx.font = `${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayUrl = url.replace(/^https?:\/\//, "").substring(0, 40);
    ctx.fillText(displayUrl, urlBarX + urlBarWidth / 2, urlBarY + urlBarHeight / 2);
    ctx.restore();

    // Icono de refresh (derecha)
    const refreshIconSize = buttonSize;
    const refreshIconX = urlBarX + urlBarWidth - urlBarPadding - refreshIconSize;
    const refreshIconY = urlBarY + (urlBarHeight - refreshIconSize) / 2;
    drawRefreshIcon(ctx, refreshIconX, refreshIconY, refreshIconSize, iconColor + "99");

    // 7. Dibujar iconos de la derecha (download, upload, plus, copy)
    const iconsRightPadding = 12 * headerScale;
    const iconGap = 10 * headerScale;

    // Calcular posiciones de derecha a izquierda
    const copyIconX = x + width - iconsRightPadding - iconSize;
    const plusIconX = copyIconX - iconSize - iconGap;
    const uploadIconX = plusIconX - iconSize - iconGap;
    const downloadIconX = uploadIconX - iconSize - iconGap;

    drawCopyIcon(ctx, copyIconX, iconY, iconSize, iconColor);
    drawPlusIcon(ctx, plusIconX, iconY, iconSize, iconColor);
    drawUploadIcon(ctx, uploadIconX, iconY, iconSize, iconColor);
    drawDownloadIcon(ctx, downloadIconX, iconY, iconSize, iconColor);

    return {
        contentX: x,
        contentY: y + headerHeight,
        contentWidth: width,
        contentHeight: height - headerHeight,
    };
}
