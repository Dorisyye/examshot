import { create } from "zustand";

export type ToastTone = "ok" | "warn" | "bad" | "info";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  show: (message: string, tone?: ToastTone, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, tone = "info", durationMs = 1800) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    if (durationMs > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, durationMs);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 便捷 hook：返回 show 函数 */
export function useToast() {
  return useToastStore((s) => s.show);
}
