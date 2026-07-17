import { useEffect, useState } from "react";
import { Tag, Check, X } from "lucide-react";
import type { Candidate } from "@/types";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { Drawer } from "@/components/Drawer";
import { Button } from "@/components/ui";
import { CASE_PRESETS } from "@/constants";
import { cn } from "@/lib/utils";

export interface CaseSelectContext {
  sessionId: string;
  candidate: Candidate;
  caseIndex: number;
}

interface Props {
  ctx: CaseSelectContext | null;
  onClose: () => void;
}

/**
 * 病种选择抽屉：进场时为每位考生选择本次跑的病种。
 * 支持从 6 个预设里选，也支持手动输入自定义。
 */
export default function CaseSelectDrawer({ ctx, onClose }: Props) {
  const setCandidateCaseName = useSessionStore((s) => s.setCandidateCaseName);
  const toast = useToast();

  const [value, setValue] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const candidate = ctx?.candidate;
  const caseIndex = ctx?.caseIndex;
  const open = !!ctx;

  // 每次打开时，根据当前已选值初始化
  useEffect(() => {
    if (ctx && candidate && caseIndex !== undefined) {
      const current = candidate.caseNames?.[caseIndex] ?? "";
      setValue(current);
      setIsCustom(!!current && !(CASE_PRESETS as readonly string[]).includes(current));
    }
  }, [ctx, candidate, caseIndex]);

  if (!ctx || !candidate || caseIndex === undefined) {
    return null;
  }

  const handleConfirm = () => {
    const v = value.trim();
    if (!v) {
      toast("请选择或输入病种", "warn");
      return;
    }
    setCandidateCaseName(ctx.sessionId, candidate.id, caseIndex, v);
    toast(`已设置病种：${v}`, "ok");
    onClose();
  };

  const handleClear = () => {
    setCandidateCaseName(ctx.sessionId, candidate.id, caseIndex, "");
    toast("已清除病种，需重新选择", "info");
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warn-soft">
            <Tag className="h-4 w-4 text-warn" />
          </span>
          选择病种 {caseIndex + 1}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-type-primary">{candidate.name || "未命名"}</span>
          {candidate.examNumber && <span className="text-type-muted">#{candidate.examNumber}</span>}
          {candidate.seatNumber && <span className="text-type-muted">· 机位{candidate.seatNumber}</span>}
        </span>
      }
      footer={
        <div className="flex gap-2 pb-1">
          {candidate.caseNames?.[caseIndex] && (
            <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={handleClear}>
              清除
            </Button>
          )}
          <Button variant="primary" block icon={<Check className="h-4 w-4" />} onClick={handleConfirm}>
            确定
          </Button>
        </div>
      }
    >
      <div className="py-2">
        {/* 预设按钮网格 */}
        <div className="mb-3">
          <div className="mb-2 font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-secondary">
            常见病种
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CASE_PRESETS.map((p) => {
              const active = value === p && !isCustom;
              return (
                <button
                  key={p}
                  onClick={() => {
                    setValue(p);
                    setIsCustom(false);
                  }}
                  className={cn(
                    "touchable rounded-lg border px-3 py-3 font-mono text-sm font-bold transition-all active:scale-[0.97]",
                    active
                      ? "border-info bg-info-soft text-info"
                      : "border-ink-border bg-ink-base text-type-secondary hover:border-type-muted",
                  )}
                >
                  {p}
                  {active && <Check className="ml-1 inline h-3 w-3" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 自定义输入 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-secondary">
              自定义输入
            </span>
            <button
              onClick={() => {
                setIsCustom(true);
                if ((CASE_PRESETS as readonly string[]).includes(value)) setValue("");
              }}
              className={cn(
                "text-2xs",
                isCustom ? "text-info" : "text-type-muted hover:text-type-primary",
              )}
            >
              {isCustom ? "自定义模式" : "切到自定义"}
            </button>
          </div>
          <input
            type="text"
            value={isCustom ? value : ""}
            onFocus={() => {
              setIsCustom(true);
              if ((CASE_PRESETS as readonly string[]).includes(value)) setValue("");
            }}
            onChange={(e) => setValue(e.target.value)}
            placeholder="输入其他病种名"
            className="w-full rounded-lg border border-ink-border bg-ink-base px-3 py-2.5 text-sm text-type-primary placeholder:text-type-muted focus:border-info focus:outline-none"
          />
        </div>

        <p className="mt-3 rounded-lg bg-ink-base px-3 py-2 text-2xs text-type-muted">
          每位考生各自跑的病种可能不同，进场时为每个人选好本次跑哪 2 个。病种名将作为导出照片包的子文件夹名。
        </p>
      </div>
    </Drawer>
  );
}
