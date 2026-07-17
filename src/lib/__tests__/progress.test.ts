import { describe, it, expect } from "vitest";
import type { Candidate, Session } from "@/types";
import {
  doneTasks,
  findTask,
  isCandidateComplete,
  isCaseMissing,
  isCaseSelected,
  missingCount,
  progressPct,
  totalTasks,
} from "@/lib/progress";

/** 默认所有病种位都已选（模拟进场后已选好病种的常见场景） */
function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "c1",
    name: "测试考生",
    addedAt: 0,
    tasks: [],
    caseNames: ["AF", "AAFL"],
    ...overrides,
  };
}

function makeSession(
  candidates: Candidate[],
  caseCount = 2,
  caseNames?: string[],
): Session {
  return {
    id: "s1",
    name: "测试场次",
    date: "2026-07-17",
    caseCount,
    caseNames: caseNames ?? Array.from({ length: caseCount }, () => ""),
    candidates,
    createdAt: 0,
    archived: false,
  };
}

/** 标记某考生某病例某任务完成 */
function markDone(
  c: Candidate,
  caseIndex: number,
  taskType: "face_screen" | "result",
) {
  c.tasks = [
    ...c.tasks.filter(
      (t) => !(t.caseIndex === caseIndex && t.taskType === taskType),
    ),
    { caseIndex, taskType, status: "done", completedAt: 1000 },
  ];
}

describe("progress 基础计算", () => {
  it("空场次总任务为 0，完成率为 0", () => {
    const s = makeSession([]);
    expect(totalTasks(s)).toBe(0);
    expect(doneTasks(s)).toBe(0);
    expect(progressPct(s)).toBe(0);
  });

  it("1 考生 2 病例（都已选）→ 总任务 4（1×2×2）", () => {
    const s = makeSession([makeCandidate()], 2);
    expect(totalTasks(s)).toBe(4);
  });

  it("1 考生 3 病例（都已选）→ 总任务 6（1×3×2）", () => {
    const s = makeSession(
      [makeCandidate({ caseNames: ["AF", "AAFL", "AFL"] })],
      3,
    );
    expect(totalTasks(s)).toBe(6);
  });

  it("2 考生 2 病例（都已选）→ 总任务 8（2×2×2）", () => {
    const s = makeSession(
      [makeCandidate({ id: "a" }), makeCandidate({ id: "b" })],
      2,
    );
    expect(totalTasks(s)).toBe(8);
  });

  it("完成率 = 完成/总 取整", () => {
    const c = makeCandidate();
    markDone(c, 0, "face_screen");
    const s = makeSession([c], 2);
    // 1/4 = 25
    expect(doneTasks(s)).toBe(1);
    expect(progressPct(s)).toBe(25);
  });
});

describe("isCaseSelected 病种未选不计入", () => {
  it("caseNames 为空数组时，所有位都未选 → 总任务 0", () => {
    const c = makeCandidate({ caseNames: ["", ""] });
    const s = makeSession([c], 2);
    expect(isCaseSelected(c, 0)).toBe(false);
    expect(isCaseSelected(c, 1)).toBe(false);
    expect(totalTasks(s)).toBe(0);
    expect(doneTasks(s)).toBe(0);
    expect(progressPct(s)).toBe(0);
  });

  it("只选了 1 个病种 → 总任务 2（1×2）", () => {
    const c = makeCandidate({ caseNames: ["AF", ""] });
    const s = makeSession([c], 2);
    expect(isCaseSelected(c, 0)).toBe(true);
    expect(isCaseSelected(c, 1)).toBe(false);
    expect(totalTasks(s)).toBe(2);
  });

  it("不同考生可选不同数量病种", () => {
    const c1 = makeCandidate({ id: "a", caseNames: ["AF", "AAFL"] }); // 4
    const c2 = makeCandidate({ id: "b", caseNames: ["PVC", ""] }); // 2
    const s = makeSession([c1, c2], 2);
    expect(totalTasks(s)).toBe(6);
  });

  it("未选病种位上即便标记了 done，doneTasks 也不计", () => {
    const c = makeCandidate({ caseNames: ["", ""] });
    markDone(c, 0, "face_screen");
    markDone(c, 0, "result");
    const s = makeSession([c], 2);
    expect(doneTasks(s)).toBe(0);
  });

  it("未选病种位不参与未拍统计", () => {
    const c = makeCandidate({ caseNames: ["", ""] });
    const s = makeSession([c], 2);
    expect(missingCount(s)).toBe(0);
  });
});

describe("findTask", () => {
  it("找不到时返回 undefined", () => {
    const c = makeCandidate();
    expect(findTask(c, 0, "face_screen")).toBeUndefined();
  });

  it("能找到已标记任务", () => {
    const c = makeCandidate();
    markDone(c, 1, "result");
    const t = findTask(c, 1, "result");
    expect(t?.status).toBe("done");
    expect(t?.completedAt).toBe(1000);
  });
});

describe("未拍照片数 missingCount / isCaseMissing", () => {
  it("face_screen 已拍、result 未拍 → 未拍 3", () => {
    const c = makeCandidate();
    markDone(c, 0, "face_screen");
    const s = makeSession([c]);
    expect(missingCount(s)).toBe(3); // 病例0缺result(1) + 病例1缺face+result(2) = 3
    expect(isCaseMissing(c, 0)).toBe(true);
  });

  it("face_screen 和 result 都未拍 → 未拍 4", () => {
    const c = makeCandidate();
    const s = makeSession([c]);
    expect(missingCount(s)).toBe(4); // 2病例 × 2照片 = 4
    expect(isCaseMissing(c, 0)).toBe(true);
  });

  it("face_screen 和 result 都已拍 → 未拍 0", () => {
    const c = makeCandidate();
    markDone(c, 0, "face_screen");
    markDone(c, 0, "result");
    markDone(c, 1, "face_screen");
    markDone(c, 1, "result");
    const s = makeSession([c]);
    expect(missingCount(s)).toBe(0);
    expect(isCaseMissing(c, 0)).toBe(false);
  });

  it("多考生多病例累加未拍照片数", () => {
    const c1 = makeCandidate({ id: "c1" });
    markDone(c1, 0, "face_screen");
    markDone(c1, 0, "result");
    // c1 病例1 缺 face+result → 2
    const c2 = makeCandidate({ id: "c2" });
    markDone(c2, 1, "face_screen");
    // c2 病例0 缺 face+result(2) + 病例1 缺 result(1) → 3
    const s = makeSession([c1, c2], 2);
    expect(missingCount(s)).toBe(5); // 2 + 3 = 5
  });
});

describe("isCandidateComplete", () => {
  it("所有病例所有任务完成 → true", () => {
    const c = makeCandidate();
    for (let i = 0; i < 2; i++) {
      markDone(c, i, "face_screen");
      markDone(c, i, "result");
    }
    expect(isCandidateComplete(c, 2)).toBe(true);
  });

  it("缺任一任务 → false", () => {
    const c = makeCandidate();
    markDone(c, 0, "face_screen");
    markDone(c, 0, "result");
    // 病例1 全缺
    expect(isCandidateComplete(c, 2)).toBe(false);
  });
});
