import { SVG_COMPONENTS } from "@/components/canvas-svg";
import { RotationHandleIcon } from "@/components/ui/RotationHandleIcon";
import { Corner, VIDEO_Z_INDEX, getNearestCorner, getCornerStyle } from "@/lib";
import { CanvasElement, SvgElement, ImageElement, TextElement } from "@/types/canvas-elements.types";
import { useRef, useState, useEffect, useCallback } from "react";

function InlineTextEditor({
    element,
    refSize,
    onEnd,
}: {
    element: TextElement;
    refSize: number;
    onEnd: (content: string) => void;
}) {
    const divRef = useRef<HTMLDivElement>(null);
    const committed = useRef(false);

    const commit = useCallback((node: HTMLElement) => {
        if (committed.current) return;
        committed.current = true;
        onEnd(node.textContent ?? "");
    }, [onEnd]);

    useEffect(() => {
        const node = divRef.current;
        if (!node) return;
        node.textContent = element.content;
        node.focus();
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fontSize = refSize > 0 ? element.fontSize * (refSize / 1080) : element.fontSize;

    return (
        <div
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            style={{
                fontSize: `${fontSize}px`,
                fontFamily: element.fontFamily,
                fontWeight: element.fontWeight === "normal" ? 400 : element.fontWeight === "medium" ? 500 : 700,
                color: element.color,
                opacity: element.opacity,
                outline: "none",
                border: "1.5px solid #3b82f6",
                borderRadius: "3px",
                padding: "2px 6px",
                whiteSpace: "pre",
                minWidth: "20px",
                cursor: "text",
                pointerEvents: "auto",
                background: "transparent",
                lineHeight: 1.2,
                letterSpacing: "normal",
                userSelect: "text",
            }}
            onBlur={(e) => commit(e.currentTarget)}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") { e.preventDefault(); commit(e.currentTarget); }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(e.currentTarget); }
            }}
            onPointerDown={(e) => e.stopPropagation()}
        />
    );
}

export function CanvasElementsLayer({
    canvasContainerRef,
    canvasElements,
    selectedElementId,
    selectedElementIds,
    hoveredElementId,
    isDraggingElement,
    behindVideo,
    onElementSelect,
    onMultiSelect,
    onElementUpdate,
    setHoveredElementId,
    setIsDraggingElement,
    setIsDraggingElementRotation,
    elementDragStart,
    layerZIndex,
    hitTestOnly = false,
    elementCorners: elementCornersProp,
    setElementCorners: setElementCornersProp,
    editingTextId = null,
    onDoubleClickText,
    onTextEditEnd,
}: {
    canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
    canvasElements: CanvasElement[];
    selectedElementId: string | null;
    selectedElementIds?: string[];
    hoveredElementId: string | null;
    isDraggingElement: boolean;
    behindVideo: boolean;
    onElementSelect?: (id: string | null) => void;
    onMultiSelect?: (ids: string[]) => void;
    onElementUpdate?: (id: string, updates: Partial<CanvasElement>) => void;
    setHoveredElementId: (id: string | null) => void;
    setIsDraggingElement: (dragging: boolean) => void;
    setIsDraggingElementRotation: (dragging: boolean) => void;
    elementDragStart: React.MutableRefObject<{ x: number; y: number; initialX: number; initialY: number; initialRotation: number }>;
    layerZIndex: number;
    hitTestOnly?: boolean;
    elementCorners?: Record<string, Corner | null>;
    setElementCorners?: React.Dispatch<React.SetStateAction<Record<string, Corner | null>>>;
    editingTextId?: string | null;
    onDoubleClickText?: (id: string) => void;
    onTextEditEnd?: (id: string, content: string) => void;
}) {
    const layerRef = useRef<HTMLDivElement>(null);
    const [refSize, setRefSize] = useState(0);

    const [localElementCorners, setLocalElementCorners] = useState<Record<string, Corner | null>>({});
    const elementCorners = elementCornersProp ?? localElementCorners;
    const setElementCorners = setElementCornersProp ?? setLocalElementCorners;

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
        ? canvasElements
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
                if (e.target === e.currentTarget && onElementSelect) {
                    onElementSelect(null);
                }
            }}
            style={{ zIndex: layerZIndex, pointerEvents: 'none' }}
        >
            {[...filteredElements].sort((a, b) => {
                if (hitTestOnly) {
                    if (a.id === selectedElementId) return 1;
                    if (b.id === selectedElementId) return -1;
                }
                return a.zIndex - b.zIndex;
            }).map((element) => {
                const isSelected = selectedElementId === element.id || (selectedElementIds?.includes(element.id) ?? false);
                const isHovered = hoveredElementId === element.id;
                const activeCorner: Corner | null = elementCorners[element.id] ?? null;

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
                };

                const handleMouseEnter = () => setHoveredElementId(element.id);
                const handleMouseLeave = () => {
                    setHoveredElementId(null);
                    setElementCorners(prev => ({ ...prev, [element.id]: null }));
                };
                const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
                    const corner = getNearestCorner(e, element.rotation);
                    setElementCorners(prev => ({ ...prev, [element.id]: corner }));
                };
                const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
                    if (!onElementSelect) return;
                    if (element.locked) return;
                    if (e.button === 2) return;
                    if ((e.target as HTMLElement).closest('[data-element-rotation]')) {
                        e.stopPropagation();
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    const current = selectedElementIds ?? (selectedElementId ? [selectedElementId] : []);
                    if (e.shiftKey && onMultiSelect) {
                        const next = current.includes(element.id)
                            ? current.filter(id => id !== element.id)
                            : [...current, element.id];
                        onMultiSelect(next);
                    } else if (current.includes(element.id) && current.length > 1) {
                        onElementSelect(element.id);
                    } else {
                        onElementSelect(element.id);
                        if (onMultiSelect) onMultiSelect([element.id]);
                    }
                    setIsDraggingElement(true);
                    elementDragStart.current = {
                        x: e.clientX,
                        y: e.clientY,
                        initialX: element.x,
                        initialY: element.y,
                        initialRotation: element.rotation,
                    };
                };

                const rotationHandle = (isSelected) && activeCorner && onElementUpdate ? (
                    <div
                        data-element-rotation
                        className="pointer-events-auto cursor-grab"
                        style={{ ...getCornerStyle(activeCorner, -14), padding: '1px', margin: '-1px' }}
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

                if (hitTestOnly) {
                    if (element.visible === false) return null;
                    if (editingTextId === element.id) return null;

                    const TOP_Z_INDEX = 2147483647;

                    const expandedHitArea = isSelected ? (
                        <div
                            className="absolute"
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.002)',
                                pointerEvents: 'auto'
                            }}
                        />
                    ) : null;

                    if (element.type === "text") {
                        return (
                            <div
                                key={element.id}
                                data-canvas-element
                                className={`absolute pointer-events-auto select-none ${element.locked ? "cursor-not-allowed" : "cursor-move"}`}
                                style={{
                                    left: `${element.x}%`,
                                    top: `${element.y}%`,
                                    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                                    zIndex: isSelected ? TOP_Z_INDEX : element.zIndex,
                                    backgroundColor: isSelected ? 'rgba(0,0,0,0.002)' : 'transparent'
                                }}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                onMouseMove={handleMouseMove}
                                onMouseDown={handleMouseDown}
                                onDoubleClick={(e) => {
                                    if (element.locked) return;
                                    e.stopPropagation();
                                    if (onDoubleClickText) onDoubleClickText(element.id);
                                }}
                            >
                                {expandedHitArea}

                                <div
                                    className="whitespace-nowrap pointer-events-none"
                                    style={{
                                        fontSize: refSize > 0 ? `${element.fontSize * (refSize / 1080)}px` : `${element.fontSize}px`,
                                        fontFamily: element.fontFamily,
                                        opacity: 0
                                    }}
                                >
                                    {element.content}
                                </div>

                                {selectionBorder}
                                {rotationHandle}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={element.id}
                            data-canvas-element
                            className={`absolute pointer-events-auto ${element.locked ? "cursor-not-allowed" : "cursor-move"}`}
                            style={{
                                ...commonStyle,
                                zIndex: isSelected ? TOP_Z_INDEX : element.zIndex,
                                backgroundColor: isSelected ? 'rgba(0,0,0,0.002)' : 'transparent'
                            }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onMouseMove={handleMouseMove}
                            onMouseDown={handleMouseDown}
                        >
                            {expandedHitArea}

                            {selectionBorder}
                            {rotationHandle}
                        </div>
                    );
                }
                if (element.visible === false) return null;

                if (element.type === "svg") {
                    const SvgComponent = SVG_COMPONENTS[(element as SvgElement).svgId];
                    return (
                        <div
                            key={element.id}
                            className="absolute pointer-events-none"
                            style={commonStyle}
                        >
                            {SvgComponent && (
                                <div className="w-full h-full" style={{ opacity: element.opacity }}>
                                    <SvgComponent color={(element as SvgElement).color} className="w-full h-full" />
                                </div>
                            )}
                        </div>
                    );
                }

                if (element.type === "image") {
                    return (
                        <div
                            key={element.id}
                            className="absolute pointer-events-none"
                            style={commonStyle}
                        >
                            <img
                                src={(element as ImageElement).imagePath}
                                alt="Image element"
                                crossOrigin="anonymous"
                                className="w-full h-full object-contain rounded"
                                style={{ pointerEvents: 'none', opacity: element.opacity }}
                            />
                        </div>
                    );
                }

                if (element.type === "text") {
                    const isEditing = editingTextId === element.id;
                    return (
                        <div
                            key={element.id}
                            className="absolute"
                            style={{
                                left: `${element.x}%`,
                                top: `${element.y}%`,
                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
                                zIndex: isEditing ? 9999 : element.zIndex,
                                transition: isDraggingElement ? 'none' : 'transform 0.1s ease-out',
                                pointerEvents: isEditing ? 'auto' : 'none',
                            }}
                        >
                            {isEditing ? (
                                <InlineTextEditor
                                    element={element as TextElement}
                                    refSize={refSize}
                                    onEnd={(content) => {
                                        if (onTextEditEnd) onTextEditEnd(element.id, content);
                                    }}
                                />
                            ) : (
                                <div
                                    className="whitespace-nowrap"
                                    style={{
                                        fontSize: refSize > 0 ? `${element.fontSize * (refSize / 1080)}px` : `${element.fontSize}px`,
                                        fontFamily: element.fontFamily,
                                        fontWeight: element.fontWeight === 'normal' ? 400 : element.fontWeight === 'medium' ? 500 : 700,
                                        textAlign: 'left',
                                        color: element.color,
                                        pointerEvents: 'none',
                                        opacity: element.opacity,
                                        lineHeight: 1.2,
                                        padding: '2px 6px',
                                    }}
                                >
                                    {element.content}
                                </div>
                            )}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}