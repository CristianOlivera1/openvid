/**
 * Renderizado del mockup de VS Code en Canvas
 */

import { hexToRgba } from "@/lib/utils";
import { deriveSearchBg } from "@/lib/color.utils";
import {
    drawMagnifyIcon,
    drawMinusIcon,
    drawSquareIcon,
    drawCloseIcon,
    drawVSCodeLogo,
} from "@/lib/canvas-icons";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

/**
 * Dibuja el mockup de VS Code en canvas
 */
export function drawVSCodeMockup(context: MockupCanvasContext): MockupDrawResult {
    const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;
    const isDark = config.darkMode;
    const frameColor = config.frameColor;
    const url = config.url || "openvid";
    const headerOpacity = config.headerOpacity ?? 100;

    // Escalado proporcional del header
    const headerScale = (config.headerScale || 100) / 100;

    // Valores base escalados
    const headerHeight = 35 * headerScale;
    const logoSize = 16 * headerScale;
    const menuFontSize = 14 * headerScale;
    const headerPaddingX = 12 * headerScale;
    const searchHeight = 22 * headerScale;
    const searchFontSize = 14 * headerScale;
    const controlIconSize = 12 * headerScale;
    const controlPaddingX = 12 * headerScale;

    // Colores
    const bgColor = isDark ? "#1e1e1e" : "#f3f3f3";
    const borderColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
    const textColor = isDark ? "#cccccc" : "#333333";
    const searchBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";

    // 0. Dibujar sombra exterior del mockup (sin bloquear el fondo)
    drawMockupShadow(ctx, x, y, width, height, cornerRadius, shadowBlur);

    // 1. Dibujar borde del frame
    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, cornerRadius);
    ctx.strokeStyle = isDark ? '#404040' : '#d4d4d4';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Dibujar fondo solo en área de contenido con esquinas redondeadas
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

    // 2. Dibujar header
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

    // 3. Dibujar borde inferior del header
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + width, y + headerHeight);
    ctx.stroke();
    ctx.restore();

    // 4. Dibujar logo de VS Code real
    const logoY = y + (headerHeight - logoSize) / 2;
    drawVSCodeLogo(ctx, x + headerPaddingX, logoY, logoSize);

    // 5. Dibujar items de menú
    const menuItems = ["File", "Edit", "Selection", "View", "Go", "Terminal", "Help"];
    let menuX = x + headerPaddingX + logoSize + 8 * headerScale;
    const menuY = y + headerHeight / 2;

    ctx.save();
    ctx.font = `${menuFontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = "middle";

    menuItems.forEach(item => {
        const itemWidth = ctx.measureText(item).width + 16 * headerScale;
        ctx.fillText(item, menuX + 8 * headerScale, menuY);
        menuX += itemWidth;
    });
    ctx.restore();

    // 6. Dibujar search bar centrada con icono de lupa
    const maxSearchWidth = 576 * headerScale; // Equivale a max-w-xl
    const searchWidth = Math.min(width * 0.5, maxSearchWidth);
    const searchX = x + (width - searchWidth) / 2;
    const searchY = y + (headerHeight - searchHeight) / 2;

    // Usar la misma lógica que el componente React: derivar el color del search bar
    const searchBgBase = deriveSearchBg(frameColor);

    ctx.save();
    drawRoundedRectPath(ctx, searchX, searchY, searchWidth, searchHeight, 4 * headerScale);
    ctx.fillStyle = hexToRgba(searchBgBase, headerOpacity);
    ctx.fill();
    ctx.strokeStyle = searchBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Icono de lupa en el search bar
    const searchIconSize = searchHeight * 0.6;
    const searchIconPadding = 8 * headerScale;
    drawMagnifyIcon(ctx, searchX + searchIconPadding, searchY + (searchHeight - searchIconSize) / 2, searchIconSize, textColor + "80");

    // Texto del search
    ctx.save();
    ctx.font = `${searchFontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(url, searchX + searchWidth / 2 + searchIconSize / 2, searchY + searchHeight / 2);
    ctx.restore();

    const controlY = y + (headerHeight - controlIconSize) / 2;
    const iconGap = controlPaddingX * 2;

    const minX = x + width - 3 * (controlIconSize + iconGap);
    drawMinusIcon(ctx, minX, controlY, controlIconSize, textColor);

    const maxX = x + width - 2 * (controlIconSize + iconGap);
    drawSquareIcon(ctx, maxX, controlY, controlIconSize, textColor);

    const closeX = x + width - 1 * (controlIconSize + iconGap);
    drawCloseIcon(ctx, closeX, controlY, controlIconSize, textColor);

    return {
        contentX: x,
        contentY: y + headerHeight,
        contentWidth: width,
        contentHeight: height - headerHeight,
    };
}
