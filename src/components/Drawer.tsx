import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** 底部抽屉：从底部滑入，带遮罩，点击遮罩关闭 */
export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-[480px] max-h-[88vh] flex flex-col",
          "rounded-t-2xl border-t border-ink-border bg-ink-surface shadow-2xl",
          "animate-slide-up safe-bottom",
        )}
      >
        {/* 拖拽指示条 */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink-border" />
        </div>

        {(title || subtitle) && (
          <div className="flex items-start justify-between px-5 pb-3 pt-1">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-type-primary">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-type-secondary">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="关闭"
              className="touchable -mr-1 -mt-1 flex items-center justify-center rounded-lg text-type-secondary hover:bg-ink-hover hover:text-type-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer && (
          <div className="border-t border-ink-border bg-ink-surface px-5 pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
