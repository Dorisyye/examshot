import { TASK_ORDER, type Candidate, type Session, type TaskType } from "@/types";

/** 在候选人任务数组中查找指定病例+任务类型的记录，不存在则返回 undefined */
export function findTask(
  candidate: Candidate,
  caseIndex: number,
  taskType: TaskType,
) {
  return candidate.tasks.find(
    (t) => t.caseIndex === caseIndex && t.taskType === taskType,
  );
}

export function isTaskDone(
  candidate: Candidate,
  caseIndex: number,
  taskType: TaskType,
): boolean {
  return findTask(candidate, caseIndex, taskType)?.status === "done";
}

/** 考生某病种位是否已选（caseNames[i] 非空才算"该做"） */
export function isCaseSelected(candidate: Candidate, caseIndex: number): boolean {
  return !!candidate.caseNames?.[caseIndex];
}

/** 单场考试总任务数（仅统计已选病种位） */
export function totalTasks(session: Session): number {
  let n = 0;
  for (const c of session.candidates) {
    for (let i = 0; i < session.caseCount; i++) {
      if (!isCaseSelected(c, i)) continue;
      n += TASK_ORDER.length;
    }
  }
  return n;
}

/** 单场考试已完成任务数（仅统计已选病种位的任务） */
export function doneTasks(session: Session): number {
  let n = 0;
  for (const c of session.candidates) {
    for (const t of c.tasks) {
      if (t.status !== "done") continue;
      if (!isCaseSelected(c, t.caseIndex)) continue;
      n++;
    }
  }
  return n;
}

/**
 * 漏拍检测：若某考生某病例的 usb_copy 已完成
 * 但其 face_screen 或 result 未完成，则计为 1 个漏拍
 */
export function missingCount(session: Session): number {
  let n = 0;
  for (const c of session.candidates) {
    for (let i = 0; i < session.caseCount; i++) {
      if (!isCaseSelected(c, i)) continue;
      const usbDone = isTaskDone(c, i, "usb_copy");
      if (!usbDone) continue;
      if (!isTaskDone(c, i, "face_screen")) n++;
      if (!isTaskDone(c, i, "result")) n++;
    }
  }
  return n;
}

/** 某考生某病例是否处于"漏拍"状态（usb已done但前面缺） */
export function isCaseMissing(
  candidate: Candidate,
  caseIndex: number,
): boolean {
  if (!isTaskDone(candidate, caseIndex, "usb_copy")) return false;
  return (
    !isTaskDone(candidate, caseIndex, "face_screen") ||
    !isTaskDone(candidate, caseIndex, "result")
  );
}

/** 某考生是否全部完成所有病例所有任务 */
export function isCandidateComplete(
  candidate: Candidate,
  caseCount: number,
): boolean {
  for (let i = 0; i < caseCount; i++) {
    for (const t of TASK_ORDER) {
      if (!isTaskDone(candidate, i, t)) return false;
    }
  }
  return true;
}

/** 时间戳格式化为 HH:MM */
export function fmtTime(ts?: number): string {
  if (!ts) return "--:--";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** 时间戳格式化为 MM-DD HH:MM */
export function fmtDateTime(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}-${da} ${hh}:${mm}`;
}

/** 今日日期 YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/** 字节数格式化为 KB/MB */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

/** 完成率百分比 0-100 */
export function progressPct(session: Session): number {
  const total = totalTasks(session);
  if (total === 0) return 0;
  return Math.round((doneTasks(session) / total) * 100);
}
