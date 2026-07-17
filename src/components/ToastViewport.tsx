import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastTone } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const TONE_STYLE: Record<ToastTone, { icon: typeof Info; color: string; bg: string }> = {
  ok: { icon: CheckCircle2, color: "text-ok", bg: "border-ok/40 bg-ok-soft/60" },
  warn: { icon: AlertTriangle, color: "text-warn", bg: "border-warn/40 bg-warn-soft/60" },
  bad: { icon: XCircle, color: "text-bad", bg: "border-bad/40 bg-bad-soft/60" },
  info: { icon: Info, color: "text-info", bg: "border-info/40 bg-info-soft/60" },
};

export default function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-3 safe-top">
      {toasts.map((t) => {
        const cfg = TONE_STYLE[t.tone];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-card backdrop-blur-md animate-slide-up",
              cfg.bg,
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} strokeWidth={2.5} />
            <span className="flex-1 text-sm text-type-primary">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="touchable -mr-1 flex items-center justify-center rounded text-type-secondary hover:text-type-primary"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
