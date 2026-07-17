import { create } from "zustand";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Drawer } from "@/components/Drawer";
import { Button } from "@/components/ui";

interface ConfirmOptions {
  title: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  onOk: () => void | Promise<void>;
}

interface ConfirmStore {
  open: boolean;
  opts: ConfirmOptions | null;
  confirm: (opts: ConfirmOptions) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  opts: null,
  confirm: (opts) => set({ open: true, opts }),
  close: () => set({ open: false, opts: null }),
}));

/** 便捷 hook */
export function useConfirm() {
  return useConfirmStore((s) => s.confirm);
}

export function ConfirmDialog() {
  const { open, opts, close } = useConfirmStore();
  if (!opts) return null;

  const handleOk = async () => {
    await opts!.onOk();
    close();
  };

  return createPortal(
    <Drawer
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          {opts.danger && (
            <AlertTriangle className="h-4 w-4 text-bad" strokeWidth={2.5} />
          )}
          {opts.title}
        </span>
      }
      subtitle={opts.message}
      footer={
        <div className="flex gap-2 pb-1">
          <Button variant="ghost" block onClick={close}>
            {opts.cancelText ?? "取消"}
          </Button>
          <Button
            variant={opts.danger ? "bad" : "primary"}
            block
            onClick={handleOk}
          >
            {opts.okText ?? "确认"}
          </Button>
        </div>
      }
    >
      <div className="py-2 text-sm text-type-secondary">
        此操作不可撤销，请确认。
      </div>
    </Drawer>,
    document.body,
  );
}
