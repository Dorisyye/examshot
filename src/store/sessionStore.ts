import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type {
  Candidate,
  CandidateInput,
  Session,
  SessionInput,
  TaskRecord,
  TaskStatus,
  TaskType,
} from "@/types";
import { TASK_ORDER } from "@/types";
import { today } from "@/lib/progress";

interface SessionStore {
  sessions: Session[];
  /** 首次启动标记 */
  initialized: boolean;

  createSession: (input: SessionInput) => string;
  updateSession: (id: string, patch: Partial<Omit<Session, "id">>) => void;
  deleteSession: (id: string) => void;
  archiveSession: (id: string, archived: boolean) => void;
  getSession: (id: string) => Session | undefined;

  addCandidate: (sessionId: string, c: CandidateInput) => string | null;
  updateCandidate: (
    sessionId: string,
    cid: string,
    patch: Partial<Omit<Candidate, "id">>,
  ) => void;
  removeCandidate: (sessionId: string, cid: string) => void;
  reorderCandidate?: (sessionId: string, cid: string, dir: -1 | 1) => void;

  setTaskStatus: (
    sessionId: string,
    candidateId: string,
    caseIndex: number,
    taskType: TaskType,
    status: TaskStatus,
    photoId?: string,
  ) => void;

  /** 标记某任务的照片已保存到手机相册（或取消标记） */
  setTaskSavedToAlbum: (
    sessionId: string,
    candidateId: string,
    caseIndex: number,
    taskType: TaskType,
    saved: boolean,
  ) => void;

  /** 设置某考生某病种位的名称（进场时逐人选择） */
  setCandidateCaseName: (
    sessionId: string,
    candidateId: string,
    caseIndex: number,
    name: string,
  ) => void;

  /** 批量从文本导入考生（每行一个，"姓名,考号,机位号"） */
  bulkImportCandidates: (sessionId: string, text: string) => number;
}

function makeDefaultCaseNames(n: number): string[] {
  return Array.from({ length: n }, () => "");
}

function newCandidate(input: CandidateInput, caseCount: number): Candidate {
  return {
    id: uuid(),
    name: input.name.trim(),
    examNumber: input.examNumber?.trim() || undefined,
    seatNumber:
      typeof input.seatNumber === "number" && input.seatNumber > 0
        ? input.seatNumber
        : undefined,
    addedAt: Date.now(),
    tasks: [],
    caseNames: makeDefaultCaseNames(caseCount),
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      initialized: false,

      createSession: (input) => {
        const id = uuid();
        const session: Session = {
          id,
          name: input.name.trim() || "未命名场次",
          date: input.date || today(),
          location: input.location?.trim() || undefined,
          note: input.note?.trim() || undefined,
          caseCount: Math.max(1, input.caseCount || 2),
          caseNames:
            input.caseNames && input.caseNames.length > 0
              ? input.caseNames
              : makeDefaultCaseNames(input.caseCount || 2), // 场次级保留为默认提示，实际以考生 caseNames 为准
          candidates: [],
          createdAt: Date.now(),
          archived: false,
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        return id;
      },

      updateSession: (id, patch) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, ...patch } : sess,
          ),
        }));
      },

      deleteSession: (id) => {
        set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) }));
      },

      archiveSession: (id, archived) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, archived } : sess,
          ),
        }));
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),

      addCandidate: (sessionId, c) => {
        const sess = get().sessions.find((s) => s.id === sessionId);
        const caseCount = sess?.caseCount ?? 2;
        const cand = newCandidate(c, caseCount);
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, candidates: [...sess.candidates, cand] }
              : sess,
          ),
        }));
        return cand.id;
      },

      updateCandidate: (sessionId, cid, patch) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  candidates: sess.candidates.map((c) =>
                    c.id === cid ? { ...c, ...patch } : c,
                  ),
                }
              : sess,
          ),
        }));
      },

      removeCandidate: (sessionId, cid) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  candidates: sess.candidates.filter((c) => c.id !== cid),
                }
              : sess,
          ),
        }));
      },

      setTaskStatus: (sessionId, candidateId, caseIndex, taskType, status, photoId) => {
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            return {
              ...sess,
              candidates: sess.candidates.map((c) => {
                if (c.id !== candidateId) return c;
                const idx = c.tasks.findIndex(
                  (t) => t.caseIndex === caseIndex && t.taskType === taskType,
                );
                const prev = idx >= 0 ? c.tasks[idx] : undefined;
                const next: TaskRecord = {
                  caseIndex,
                  taskType,
                  status,
                  completedAt: status === "done" ? Date.now() : undefined,
                  photoId: photoId ?? prev?.photoId,
                };
                // 取消标记时清掉 photoId 和 savedToAlbum
                if (status === "pending") {
                  next.photoId = undefined;
                  next.savedToAlbum = undefined;
                } else if (photoId && photoId !== prev?.photoId) {
                  // 新拍了照片（photoId 变了），重置相册标记
                  next.savedToAlbum = undefined;
                } else {
                  next.savedToAlbum = prev?.savedToAlbum;
                }
                if (idx >= 0) {
                  const tasks = [...c.tasks];
                  tasks[idx] = next;
                  return { ...c, tasks };
                }
                return { ...c, tasks: [...c.tasks, next] };
              }),
            };
          }),
        }));
      },

      setTaskSavedToAlbum: (sessionId, candidateId, caseIndex, taskType, saved) => {
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            return {
              ...sess,
              candidates: sess.candidates.map((c) => {
                if (c.id !== candidateId) return c;
                const idx = c.tasks.findIndex(
                  (t) => t.caseIndex === caseIndex && t.taskType === taskType,
                );
                if (idx < 0) return c;
                const tasks = [...c.tasks];
                tasks[idx] = {
                  ...tasks[idx],
                  savedToAlbum: saved ? true : undefined,
                };
                return { ...c, tasks };
              }),
            };
          }),
        }));
      },

      setCandidateCaseName: (sessionId, candidateId, caseIndex, name) => {
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            return {
              ...sess,
              candidates: sess.candidates.map((c) => {
                if (c.id !== candidateId) return c;
                const caseNames = [...c.caseNames];
                while (caseNames.length <= caseIndex) caseNames.push("");
                caseNames[caseIndex] = name.trim();
                return { ...c, caseNames };
              }),
            };
          }),
        }));
      },

      bulkImportCandidates: (sessionId, text) => {
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) return 0;
        const sess = get().sessions.find((s) => s.id === sessionId);
        const caseCount = sess?.caseCount ?? 2;
        const newCands: Candidate[] = lines.map((line) => {
          // 支持 "姓名,考号,机位号" 或 "姓名 考号 机位号" 或纯姓名
          const parts = line.split(/[,，\s]+/).filter(Boolean);
          const name = parts[0] || line;
          const examNumber = parts[1];
          const seatRaw = parts[2];
          const seatNumber = seatRaw ? Number(seatRaw) : undefined;
          return newCandidate(
            {
              name,
              examNumber,
              seatNumber:
                typeof seatNumber === "number" && !Number.isNaN(seatNumber)
                  ? seatNumber
                  : undefined,
            },
            caseCount,
          );
        });
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, candidates: [...sess.candidates, ...newCands] }
              : sess,
          ),
        }));
        return newCands.length;
      },
    }),
    {
      name: "examshot:sessions",
      version: 3,
      partialize: (s) => ({ sessions: s.sessions, initialized: s.initialized }),
      migrate: (persisted: any, fromVersion: number) => {
        // v1 -> v2: 给每位考生补 caseNames 字段（用场次级 caseNames 兜底）
        if (fromVersion < 2 && persisted?.sessions) {
          persisted.sessions = persisted.sessions.map((sess: any) => ({
            ...sess,
            candidates: (sess.candidates || []).map((c: any) => ({
              ...c,
              caseNames:
                c.caseNames ||
                Array.from({ length: sess.caseCount || 2 }, () => ""),
            })),
          }));
        }
        // v2 -> v3: 无需结构变更，savedToAlbum 为新增 optional 字段
        return persisted;
      },
    },
  ),
);

export { TASK_ORDER };
