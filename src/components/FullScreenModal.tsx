import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FullScreenModalProps {
  open: boolean;
  children: ReactNode;
  /** 点击背景是否关闭 */
  dismissible?: boolean;
  onClose?: () => void;
}

/** 全屏黑色模态，用于拍照取景等需要沉浸式场景 */
export function FullScreenModal({ open, children, dismissible = false, onClose }: FullScreenModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black">
      {dismissible && onClose && (
        <div className="absolute inset-0" onClick={onClose} aria-hidden />
      )}
      {children}
    </div>,
    document.body,
  );
}
