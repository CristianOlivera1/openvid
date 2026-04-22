import { SVG_COMPONENTS } from "@/components/canvas-svg";
import { RotationHandleIcon } from "@/components/ui/RotationHandleIcon";
import { Corner, VIDEO_Z_INDEX, getNearestCorner, getCornerStyle } from "@/lib";
import { CanvasElement, SvgElement, ImageElement } from "@/types/canvas-elements.types";
import { useRef, useState, useEffect, useCallback } from "react";

export function CanvasElementsLayer({
    canvasContainerRef,
    canvasElements,
    selectedElementId,
    hoveredElementId,
    isDraggingElement,
    behindVideo,
    onElementSelect,
    onElementUpdate,
    setHoveredElementId,
    setIsDraggingElement,
    setIsDraggingElementRotation,
    elementDragStart,
    layerZIndex,
    hitTestOnly = false,
}: {
    canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
    canvasElements: CanvasElement[];
    selectedElementId: string | null;
    hoveredElementId: string | null;
    isDraggingElement: boolean;
    behindVideo: boolean;
    onElementSelect?: (id: string | null) => void;
    onElementUpdate?: (id: string, updates: Partial<CanvasElement>) => void;
    setHoveredElementId: (id: string | null) => void;
    setIsDraggingElement: (dragging: boolean) => void;
    setIsDraggingElementRotation: (dragging: boolean) => void;
    elementDragStart: React.MutableRefObject<{ x: number; y: number; initialX: number; initialY: number; initialRotation: number }>;
    layerZIndex: number;
     hitTestOnly?: boolean;
}) {
    const layerRef = useRef<HTMLDivElement>(null);
    const [refSize, setRefSize] = useState(0);

    const [elementCorners, setElementCorners] = useState<Record<string, Corner>>({});

    useEffect(() => {
        const el = layerRef.current;
        if (!el) return;
        const measure = () => {
            const { width, height } = el.getBoundingClientRect();
            setRefSize(Math.min(width, height));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const toPx = (pct: number) => refSize > 0 ? (pct / 100) * refSize : 0;

    const setRefs = useCallback((node: HTMLDivElement | null) => {
        (layerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (canvasContainerRef) {
            const externalRef = canvasContainerRef as React.MutableRefObject<HTMLDivElement | null>;
            externalRef.current = node;
        }
    }, [canvasContainerRef]);

const filteredElements = hitTestOnly 
    ? canvasElements  // todos los elementos cuando es hit layer
    : canvasElements.filter(element =>
        behindVideo ? element.zIndex < VIDEO_Z_INDEX : element.zIndex >= VIDEO_Z_INDEX
      );

    if (filteredElements.length === 0) {
        return (
            <div
                ref={setRefs}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: layerZIndex }}
            />
        );
    }

    return (
        <div
            ref={setRefs}
            className="absolute inset-0"
            onClick={(e) => {
                if (e.target === e.currentTarget && onElementSelect) onElementSelect(null);
            }}
            style={{ zIndex: layerZIndex, pointerEvents: 'none' }}
        >
            {[...filteredElements].sort((a, b) => a.zIndex - b.zIndex).map((element) => {
                const isSelected = selectedElementId === element.id;
                const isHovered = hoveredElementId === element.id;
                const activeCorner: Corner = elementCorners[element.id] ?? "top-right";

                const wPx = toPx(element.width);
                const hPx = toPx(element.height);

                const commonStyle: React.CSSProperties = {
                    position: "absolute",
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    width: wPx > 0 ? `${wPx}px` : `${element.width}%`,
                    height: hPx > 0 ? `${hPx}px` : `${element.height}%`,
                    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                    zIndex: hitTestOnly ? element.zIndex : element.zIndex,
                    transition: isDraggingElement ? 'none' : 'transform 0.1s ease-out',
                    // Cuando es hitTestOnly: invisible pero interactivo
                    ...(hitTestOnly ? { opacity: 0, pointerEvents: 'auto' } : {}),
                };

                const handleMouseEnter = () => setHoveredElementId(element.id);
                const handleMouseLeave = () => setHoveredElementId(null);
                const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
                    const corner = getNearestCorner(e, element.rotation);
                    setElementCorners(prev => ({ ...prev, [element.id]: corner }));
                };
                const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
                    if (!onElementSelect) return;
                    if ((e.target as HTMLElement).closest('[data-element-rotation]')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onElementSelect(element.id);
                    setIsDraggingElement(true);
                    elementDragStart.current = {
                        x: e.clientX,
                        y: e.clientY,
                        initialX: element.x,
                        initialY: element.y,
                        initialRotation: element.rotation,
                    };
                };

                if (hitTestOnly) {
                    return (
                        <div
                            key={element.id}
                            data-canvas-element
                            className="pointer-events-auto cursor-move"
                            style={commonStyle}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                            onMouseDown={handleMouseDown}
                        />
                    );
                }

                const rotationHandle = isSelected && onElementUpdate ? (
                    <div
                        data-element-rotation
                        style={getCornerStyle(activeCorner, -14)}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingElementRotation(true);
                            elementDragStart.current = {
                                x: e.clientX,
                                y: e.clientY,
                                initialX: element.x,
                                initialY: element.y,
                                initialRotation: element.rotation,
                            };
                        }}
                    >
                        <RotationHandleIcon corner={activeCorner} />
                    </div>
                ) : null;

                const selectionBorder = (isSelected || isHovered) ? (
                    <div
                        className={`absolute inset-0 border pointer-events-none ${isSelected ? 'border-blue-500' : 'border-white/50'}`}
                        style={{ borderRadius: '2px' }}
                    />
                ) : null;

                if (element.type === "svg") {
                    const SvgComponent = SVG_COMPONENTS[(element as SvgElement).svgId];
                    return (
                        <div
                            key={element.id}
                            data-canvas-element
                            className="pointer-events-auto cursor-move"
                            style={commonStyle}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                            onMouseDown={handleMouseDown}
                        >
                            {SvgComponent && (
                                <div className="w-full h-full" style={{ opacity: element.opacity }}>
                                    <SvgComponent color={(element as SvgElement).color} className="w-full h-full" />
                                </div>
                            )}
                            {selectionBorder}
                            {rotationHandle}
                        </div>
                    );
                }

                if (element.type === "image") {
                    return (
                        <div
                            key={element.id}
                            data-canvas-element
                            className="pointer-events-auto cursor-move"
                            style={commonStyle}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                            onMouseDown={handleMouseDown}
                        >
                            <img
                                src={(element as ImageElement).imagePath}
                                alt="Image element"
                                crossOrigin="anonymous"
                                className="w-full h-full object-contain rounded"
                                style={{ pointerEvents: 'none', opacity: element.opacity }}
                            />
                            {selectionBorder}
                            {rotationHandle}
                        </div>
                    );
                }

                if (element.type === "text") {
                    return (
                        <div
                            key={element.id}
                            data-canvas-element
                            className="absolute pointer-events-auto cursor-move select-none"
                            style={{
                                left: `${element.x}%`,
                                top: `${element.y}%`,
                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                                zIndex: element.zIndex,
                                transition: isDraggingElement ? 'none' : 'transform 0.1s ease-out',
                            }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                            onMouseDown={handleMouseDown}
                        >
                            <div
                                className="whitespace-nowrap"
                                style={{
                                    fontSize: `${element.fontSize}px`,
                                    fontFamily: element.fontFamily,
                                    fontWeight: element.fontWeight === 'normal' ? 400 : element.fontWeight === 'medium' ? 500 : 700,
                                    textAlign: 'center',
                                    color: element.color,
                                    pointerEvents: 'none',
                                    opacity: element.opacity,
                                }}
                            >
                                {element.content}
                            </div>
                            {(isSelected || isHovered) && (
                                <div
                                    className={`absolute -inset-x-2 -inset-y-1 border pointer-events-none ${isSelected ? 'border-blue-500' : 'border-white/50'}`}
                                    style={{ borderRadius: '2px' }}
                                />
                            )}
                            {rotationHandle}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
