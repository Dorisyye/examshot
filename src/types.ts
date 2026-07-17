// 监考拍摄进度看板 - 核心数据类型

/** 任务类型：人脸+屏幕照 / 结果照 / USB拷贝录屏 */
export type TaskType = "face_screen" | "result" | "usb_copy";

/** 任务状态 */
export type TaskStatus = "pending" | "done";

/** 单个任务记录（属于某考生某病例） */
export interface TaskRecord {
  caseIndex: number; // 0-based
  taskType: TaskType;
  status: TaskStatus;
  completedAt?: number; // timestamp
  photoId?: string; // 指向 IndexedDB 中的照片（仅 face_screen / result 可有）
  /** 该照片是否已保存到手机相册（监考员点击「保存到相册」后置 true） */
  savedToAlbum?: boolean;
}

/** 考生 */
export interface Candidate {
  id: string;
  name: string;
  examNumber?: string; // 考号
  seatNumber?: number; // 机位号 1-8，可空
  addedAt: number;
  tasks: TaskRecord[];
  /**
   * 每位考生各自跑的病种名（长度 = 场次 caseCount）。
   * 空字符串表示该病种位"未选"（进场时监考员逐人选择）。
   * 仅当对应 caseNames[i] 非空时，该病种的任务才算"该做"。
   */
  caseNames: string[];
}

/** 一场考试 */
export interface Session {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  location?: string;
  note?: string;
  caseCount: number;
  caseNames: string[];
  candidates: Candidate[];
  createdAt: number;
  archived: boolean;
}

/** 新建场次输入 */
export interface SessionInput {
  name: string;
  date: string;
  location?: string;
  note?: string;
  caseCount: number;
  /** 已弃用：场次级病种名仅作兜底，实际病种以每位考生 caseNames 为准 */
  caseNames?: string[];
}

/** 新增考生输入 */
export interface CandidateInput {
  name: string;
  examNumber?: string;
  seatNumber?: number;
}

/** IndexedDB 照片记录 */
export interface PhotoRecord {
  id: string;
  blob: Blob;
  takenAt: number;
  meta: {
    sessionId: string;
    candidateId: string;
    caseIndex: number;
    taskType: TaskType;
  };
}

/** 任务元信息（用于渲染） */
export interface TaskMeta {
  type: TaskType;
  label: string;
  shortLabel: string;
  hasPhoto: boolean; // 该类型任务是否会关联照片
  exportName: string; // 导出照片包时的文件名（不含扩展名）
}

export const TASK_META: Record<TaskType, TaskMeta> = {
  face_screen: {
    type: "face_screen",
    label: "人脸+屏幕照",
    shortLabel: "过程",
    hasPhoto: true,
    exportName: "过程",
  },
  result: {
    type: "result",
    label: "结果照",
    shortLabel: "结果",
    hasPhoto: true,
    exportName: "结果",
  },
  usb_copy: {
    type: "usb_copy",
    label: "USB拷录屏",
    shortLabel: "录屏",
    hasPhoto: false,
    exportName: "录屏",
  },
};

/** 单场考试内每病例的三类任务固定顺序 */
export const TASK_ORDER: TaskType[] = ["face_screen", "result", "usb_copy"];
