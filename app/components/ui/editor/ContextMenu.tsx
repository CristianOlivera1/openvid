import CtxMenuItem from "@/components/ui/CtxMenuItem";
import { ContextMenuProps } from "@/types/layers.types";
import { useRef, useState, useEffect } from "react";

export default function ContextMenu({
  x,
  y,
  selectedIds,
  canGroup,
  canUngroup,
  onBringToFront,
  onSendToBack,
  onDelete,
  onDeleteSelected,
  onGroup,
  onUngroup,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const isMulti = selectedIds.length > 1;

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - width - 8),
      y: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      data-ctx-menu
      className="fixed z-9999 bg-black border border-white/15 rounded-xl shadow-2xl py-1 min-w-43 overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      {!isMulti && (
        <>
          <CtxMenuItem
            icon="qlementine-icons:bring-to-front-16"
            label="Đưa lên trước"
            onClick={() => {
              onBringToFront();
              onClose();
            }}
          />
          <CtxMenuItem
            icon="qlementine-icons:bring-to-back-16"
            label="Đưa xuống sau"
            onClick={() => {
              onSendToBack();
              onClose();
            }}
          />
          <div className="my-1 h-px bg-white/6" />
          <CtxMenuItem
            icon="solar:trash-bin-trash-bold"
            label="Xóa lớp"
            onClick={() => {
              onDelete();
              onClose();
            }}
            danger
          />
        </>
      )}

      {isMulti && (
        <>
          {canGroup && onGroup && (
            <CtxMenuItem
              icon="solar:layers-minimalistic-bold"
              label={`Nhóm (${selectedIds.length})`}
              onClick={() => {
                onGroup();
                onClose();
              }}
            />
          )}
          {canUngroup && onUngroup && (
            <CtxMenuItem
              icon="solar:layers-bold"
              label="Bỏ nhóm"
              onClick={() => {
                onUngroup();
                onClose();
              }}
            />
          )}
          {(canGroup || canUngroup) && <div className="my-1 h-px bg-white/6" />}
          <CtxMenuItem
            icon="solar:trash-bin-trash-bold"
            label={`Xóa ${selectedIds.length} lớp`}
            onClick={() => {
              onDeleteSelected();
              onClose();
            }}
            danger
          />
        </>
      )}
    </div>
  );
}