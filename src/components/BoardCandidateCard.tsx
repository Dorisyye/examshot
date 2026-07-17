import { memo, useEffect, useState } from "react";
import { Check, Circle, MonitorUp, Usb, UserSquare2, AlertTriangle, Image as ImageIcon, Tag } from "lucide-react";
import type { Candidate, Session, TaskType } from "@/types";
import { TASK_META, TASK_ORDER } from "@/types";
import type { TaskContext } from "@/components/TaskActionDrawer";
import type { CaseSelectContext } from "@/components/CaseSelectDrawer";
import {
  findTask,
  fmtTime,
  isCandidateComplete,
  isCaseMissing,
  isCaseSelected,
} from "@/lib/progress";
import { useSessionStore } from "@/store/sessionStore";
import TaskThumbnail from "@/components/TaskThumbnail";
import { cn } from "@/lib/utils";

const TASK_ICON: Record<TaskType, typeof Check> = {
  face_screen: UserSquare2,
  result: MonitorUp,
  usb_copy: Usb,
};

interface Props {
  candidate: Candidate;
  session: Session;
  onTaskClick: (ctx: TaskContext) => void;
  onCaseSelectClick: (ctx: CaseSelectContext) => void;
}

function BoardCandidateCardImpl({ candidate, session, onTaskClick, onCaseSelectClick }: Props) {
  const caseCount = session.caseCount;
  const allDone = isCandidateComplete(candidate, caseCount);
  // 计算该考生"已选病种位"的完成数 / 总数
  let doneCount = 0;
  let selectedTotal = 0;
  for (let i = 0; i < caseCount; i++) {
    if (!isCaseSelected(candidate, i)) continue;
    selectedTotal += TASK_ORDER.length;
    for (const t of TASK_ORDER) {
      if (findTask(candidate, i, t)?.status === "done") doneCount++;
    }
  }
  const allCasesSelected = candidate.caseNames?.every((cn) => cn) ?? false;

  // 病例数 ≤2 时双列，否则单列
  const gridCols = caseCount <= 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div
      className={cn(
        "rounded-xl border bg-ink-surface shadow-card transition-all",
        allDone ? "border-ok/40" : "border-ink-border",
      )}
    >
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-ink-border px-3.5 py-2.5">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            allDone ? "bg-ok" : doneCount > 0 ? "bg-info" : allCasesSelected ? "bg-warn" : "bg-type-muted",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-type-primary">
              {candidate.name || "未命名"}
            </span>
            {candidate.examNumber && (
              <span className="shrink-0 font-mono text-2xs text-type-secondary">
                #{candidate.examNumber}
              </span>
            )}
            <SeatInput
              sessionId={session.id}
              candidateId={candidate.id}
              seatNumber={candidate.seatNumber}
            />
          </div>
        </div>
        <span
          className={cn(
            "tnum shrink-0 font-mono text-xs font-bold",
            allDone ? "text-ok" : "text-type-secondary",
          )}
        >
          {doneCount}/{selectedTotal > 0 ? selectedTotal : caseCount * TASK_ORDER.length}
        </span>
      </div>

      {/* 病例网格 */}
      <div className={cn("grid gap-px bg-ink-border", gridCols)}>
        {Array.from({ length: caseCount }).map((_, caseIdx) => {
          const selected = isCaseSelected(candidate, caseIdx);
          const caseName = candidate.caseNames?.[caseIdx] || "";
          const missing = selected && isCaseMissing(candidate, caseIdx);

          // 病种未选：显示"点选病种"按钮
          if (!selected) {
            return (
              <div key={caseIdx} className="bg-ink-surface p-2">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <span className="font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-muted">
                    病种 {caseIdx + 1}
                  </span>
                </div>
                <button
                  onClick={() =>
                    onCaseSelectClick({ sessionId: session.id, candidate, caseIndex: caseIdx })
                  }
                  className="touchable flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-warn/50 bg-warn-soft/20 px-2 py-2.5 text-xs text-warn transition-all hover:border-warn active:scale-[0.98]"
                >
                  <Tag className="h-3.5 w-3.5" />
                  点选病种
                </button>
              </div>
            );
          }

          return (
            <div key={caseIdx} className="bg-ink-surface p-2">
              <div className="mb-1.5 flex items-center justify-between gap-1 px-1">
                <button
                  onClick={() =>
                    onCaseSelectClick({ sessionId: session.id, candidate, caseIndex: caseIdx })
                  }
                  className="touchable flex min-w-0 items-center gap-1 font-mono text-2xs font-semibold uppercase tracking-wide2 text-info hover:underline"
                  title="点击修改病种"
                >
                  <span className="truncate">{caseName}</span>
                  <Tag className="h-3 w-3 shrink-0" />
                </button>
                {missing && (
                  <AlertTriangle className="h-3 w-3 shrink-0 text-bad" strokeWidth={2.5} />
                )}
              </div>
              <div className="flex flex-col gap-1">
                {TASK_ORDER.map((tt) => {
                  const task = findTask(candidate, caseIdx, tt);
                  const done = task?.status === "done";
                  const isMissing = missing && !done;
                  return (
                    <TaskButton
                      key={tt}
                      taskType={tt}
                      done={done}
                      missing={isMissing}
                      time={task?.completedAt}
                      hasPhoto={!!task?.photoId}
                      onClick={() =>
                        onTaskClick({
                          sessionId: session.id,
                          candidate,
                          caseIndex: caseIdx,
                          caseName,
                          taskType: tt,
                        })
                      }
                    />
                  );
                })}
              </div>

              {/* 照片缩略图行：过程 / 结果，点击全屏核对 */}
              <PhotoRow
                candidate={candidate}
                caseIndex={caseIdx}
                caseName={caseName}
                caseMissing={missing}
              />
            </div>
          );
        })}
      </div>

      {/* 未选全部病种时的提示 */}
      {!allCasesSelected && (
        <div className="border-t border-warn/20 bg-warn-soft/10 px-3 py-1.5 text-center text-2xs text-warn">
          还有 {caseCount - (candidate.caseNames?.filter((cn) => cn).length ?? 0)} 个病种未选
        </div>
      )}
    </div>
  );
}

const BoardCandidateCard = memo(BoardCandidateCardImpl);
export default BoardCandidateCard;

interface TaskButtonProps {
  taskType: TaskType;
  done: boolean;
  missing: boolean;
  time?: number;
  hasPhoto?: boolean;
  onClick: () => void;
}
function TaskButton({ taskType, done, missing, time, hasPhoto, onClick }: TaskButtonProps) {
  const Icon = TASK_ICON[taskType];
  const meta = TASK_META[taskType];
  return (
    <button
      onClick={onClick}
      className={cn(
        "touchable flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-all active:scale-[0.98]",
        done
          ? "border-ok/30 bg-ok-soft/40"
          : missing
            ? "border-bad/50 bg-bad-soft/30 animate-pulse-fast"
            : "border-ink-border bg-ink-base hover:border-type-muted",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded",
          done ? "bg-ok text-ink-base" : "bg-ink-raised text-type-muted",
        )}
      >
        {done ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </span>
      <span
        className={cn(
          "flex-1 truncate text-xs",
          done ? "text-type-primary" : "text-type-secondary",
        )}
      >
        {meta.shortLabel}
      </span>
      {hasPhoto && (
        <ImageIcon className="h-3 w-3 shrink-0 text-info" aria-label="有照片" />
      )}
      <span
        className={cn(
          "tnum shrink-0 font-mono text-2xs",
          done ? "text-ok" : "text-type-muted",
        )}
      >
        {done ? fmtTime(time) : "--:--"}
      </span>
      {!done && (
        <Circle className="h-2.5 w-2.5 shrink-0 text-type-muted" />
      )}
    </button>
  );
}

/** 病例块下方的照片缩略图行：显示「过程」「结果」照片，点击全屏核对 */
interface PhotoRowProps {
  candidate: Candidate;
  caseIndex: number;
  caseName: string;
  caseMissing: boolean;
}
function PhotoRow({ candidate, caseIndex, caseName, caseMissing }: PhotoRowProps) {
  const caption = `${candidate.name || "未命名"} · ${caseName}`;
  const faceTask = findTask(candidate, caseIndex, "face_screen");
  const resultTask = findTask(candidate, caseIndex, "result");

  // 仅当任一照片存在或该病例处于漏拍状态时才渲染（漏拍时显示占位提示补拍）
  const hasAnyPhoto = !!faceTask?.photoId || !!resultTask?.photoId;
  if (!hasAnyPhoto && !caseMissing) return null;

  return (
    <div className="mt-1.5 flex items-center gap-1.5 border-t border-ink-border/50 pt-1.5">
      {faceTask?.photoId ? (
        <TaskThumbnail
          photoId={faceTask.photoId}
          label="过程"
          caption={caption}
          size="sm"
        />
      ) : (
        <MissingPhotoPlaceholder label="过程" missing={caseMissing} />
      )}
      {resultTask?.photoId ? (
        <TaskThumbnail
          photoId={resultTask.photoId}
          label="结果"
          caption={caption}
          size="sm"
        />
      ) : (
        <MissingPhotoPlaceholder label="结果" missing={caseMissing} />
      )}
    </div>
  );
}

function MissingPhotoPlaceholder({ label, missing }: { label: string; missing: boolean }) {
  return (
    <div
      className={cn(
        "flex h-9 w-12 shrink-0 items-center justify-center rounded border text-2xs",
        missing
          ? "border-bad/40 bg-bad-soft/20 text-bad"
          : "border-ink-border bg-ink-base text-type-muted",
      )}
    >
      {label}
    </div>
  );
}

/** 考生卡头部的小机位号输入框：随时可补填，避免找不到人 */
interface SeatInputProps {
  sessionId: string;
  candidateId: string;
  seatNumber?: number;
}
function SeatInput({ sessionId, candidateId, seatNumber }: SeatInputProps) {
  const updateCandidate = useSessionStore((s) => s.updateCandidate);
  const [value, setValue] = useState(seatNumber?.toString() ?? "");

  // 外部变化时同步（例如从准备页修改、或刚从 store 加载）
  useEffect(() => {
    setValue(seatNumber?.toString() ?? "");
  }, [seatNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (v === "") {
      updateCandidate(sessionId, candidateId, { seatNumber: undefined });
      return;
    }
    const num = Number(v);
    if (!Number.isNaN(num) && num > 0) {
      updateCandidate(sessionId, candidateId, { seatNumber: num });
    }
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      value={value}
      onChange={handleChange}
      placeholder="机位"
      aria-label="机位号"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "tnum w-11 shrink-0 rounded border bg-ink-base px-1 py-0.5 text-center font-mono text-2xs text-type-secondary placeholder:font-sans placeholder:text-type-muted",
        "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        "focus:border-info focus:outline-none focus:ring-1 focus:ring-info/30 focus:text-type-primary",
        seatNumber ? "border-info/40 bg-info-soft/20 text-info" : "border-ink-border",
      )}
    />
  );
}
