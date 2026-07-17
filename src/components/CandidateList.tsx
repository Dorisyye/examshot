import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload, UserPlus, ListPlus } from "lucide-react";
import type { Candidate, Session } from "@/types";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
  session: Session;
}

export default function CandidateList({ session }: Props) {
  const candidates = session.candidates;
  const addCandidate = useSessionStore((s) => s.addCandidate);
  const updateCandidate = useSessionStore((s) => s.updateCandidate);
  const removeCandidate = useSessionStore((s) => s.removeCandidate);
  const bulkImport = useSessionStore((s) => s.bulkImportCandidates);
  const toast = useToast();
  const confirm = useConfirm();

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const handleAdd = () => {
    const id = addCandidate(session.id, { name: "" });
    if (!id) return;
    // 新增后自动聚焦最后一行姓名输入（靠 autofocus 在新行实现）
  };

  const handleRemove = (c: Candidate) => {
    confirm({
      title: "移除考生",
      message: `${c.name || "未命名考生"}${c.tasks.some((t) => t.status === "done") ? "（已有拍摄记录，将一并删除）" : ""}`,
      okText: "移除",
      danger: true,
      onOk: () => {
        removeCandidate(session.id, c.id);
        toast("已移除", "info");
      },
    });
  };

  const handleBulkImport = () => {
    const n = bulkImport(session.id, bulkText);
    if (n > 0) {
      toast(`已导入 ${n} 名考生`, "ok");
      setBulkText("");
      setBulkOpen(false);
    } else {
      toast("未识别到有效行", "warn");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-secondary">
            考生名单
          </h2>
          <span className="tnum rounded bg-ink-hover px-1.5 py-0.5 text-2xs text-type-secondary">
            {candidates.length}
          </span>
        </div>
        <button
          onClick={() => setBulkOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-info hover:bg-info-soft"
        >
          <ListPlus className="h-3.5 w-3.5" />
          批量录入
          {bulkOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {bulkOpen && (
        <div className="rounded-lg border border-info/30 bg-info-soft/40 p-3 animate-fade-in">
          <p className="mb-2 text-2xs text-type-secondary">
            每行一位考生，可用空格或逗号分隔：
            <span className="ml-1 text-type-primary">姓名 考号 机位号</span>
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"张三 001 1\n李四 002 2\n王五 003"}
            rows={5}
            className="w-full resize-y rounded-md border border-ink-border bg-ink-base px-3 py-2 font-mono text-sm text-type-primary placeholder:text-type-muted focus:border-info focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={handleBulkImport}>
              导入
            </Button>
          </div>
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-border px-4 py-8 text-center">
          <UserPlus className="mx-auto h-6 w-6 text-type-muted" />
          <p className="mt-2 text-sm text-type-secondary">还没有考生，点击下方添加</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {candidates.map((c, idx) => (
            <CandidateRow
              key={c.id}
              index={idx + 1}
              candidate={c}
              hasTasks={c.tasks.some((t) => t.status === "done")}
              onChange={(patch) => updateCandidate(session.id, c.id, patch)}
              onRemove={() => handleRemove(c)}
            />
          ))}
        </div>
      )}

      <Button variant="outline" block icon={<Plus className="h-4 w-4" />} onClick={handleAdd}>
        添加一位考生
      </Button>
    </div>
  );
}

interface RowProps {
  index: number;
  candidate: Candidate;
  hasTasks: boolean;
  onChange: (patch: Partial<Candidate>) => void;
  onRemove: () => void;
}
function CandidateRow({ index, candidate, hasTasks, onChange, onRemove }: RowProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-border bg-ink-surface px-2.5 py-2">
      <span className="tnum w-6 shrink-0 text-center text-2xs font-bold text-type-muted">
        {String(index).padStart(2, "0")}
      </span>
      <input
        type="text"
        value={candidate.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="姓名"
        className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm text-type-primary placeholder:text-type-muted focus:bg-ink-base focus:outline-none"
      />
      <input
        type="text"
        value={candidate.examNumber ?? ""}
        onChange={(e) => onChange({ examNumber: e.target.value })}
        placeholder="考号"
        className="w-16 shrink-0 rounded-md bg-transparent px-1.5 py-1 text-center font-mono text-xs text-type-secondary placeholder:text-type-muted focus:bg-ink-base focus:outline-none"
      />
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={99}
        value={candidate.seatNumber ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ seatNumber: v ? Number(v) : undefined });
        }}
        placeholder="机位"
        className={cn(
          "w-12 shrink-0 rounded-md bg-transparent px-1.5 py-1 text-center font-mono text-xs placeholder:text-type-muted focus:bg-ink-base focus:outline-none",
          candidate.seatNumber ? "text-info" : "text-type-muted",
        )}
      />
      <button
        onClick={onRemove}
        aria-label="移除"
        className={cn(
          "touchable flex shrink-0 items-center justify-center rounded-md text-type-muted hover:bg-bad-soft hover:text-bad",
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {hasTasks && (
        <span className="absolute" title="该考生已有拍摄记录" />
      )}
    </div>
  );
}
