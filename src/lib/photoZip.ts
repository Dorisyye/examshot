import JSZip from "jszip";
import type { Session, TaskType } from "@/types";
import { TASK_META } from "@/types";
import { findTask } from "@/lib/progress";
import { getPhoto } from "@/lib/photoDb";

/** 文件名非法字符替换（Windows / macOS / Linux 通用） */
function sanitize(name: string, fallback: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, "_");
  return cleaned || fallback;
}

export interface ZipExportResult {
  blob: Blob;
  fileName: string;
  photoCount: number;
  /** 缺失照片的清单（用于提示用户） */
  missing: Array<{ candidate: string; caseName: string; taskLabel: string }>;
}

/**
 * 按文件夹结构打包照片：
 *   考生名/病种名/过程.jpg
 *   考生名/病种名/结果.jpg
 * （录屏由用户自行拷入，此处不生成）
 */
export async function buildPhotoZip(session: Session): Promise<ZipExportResult> {
  const zip = new JSZip();
  let photoCount = 0;
  const missing: ZipExportResult["missing"] = [];

  const photoTasks: TaskType[] = ["face_screen", "result"];
  // 已用文件夹名（避免 JSZip 的 folder() 副作用：它会创建文件夹，不能用来检测）
  const usedFolderNames = new Set<string>();

  for (const c of session.candidates) {
    const candName = sanitize(c.name, `未命名_${c.id.slice(0, 6)}`);
    // 同名考生去重：用 Set 检测，追加考号或 id 后缀
    let candFolderName = candName;
    if (usedFolderNames.has(candFolderName)) {
      const suffix = c.examNumber ? `_${c.examNumber}` : `_${c.id.slice(0, 6)}`;
      candFolderName = `${candName}${suffix}`;
    }
    usedFolderNames.add(candFolderName);
    const candFolder = zip.folder(candFolderName);
    if (!candFolder) continue;

    for (let i = 0; i < session.caseCount; i++) {
      const rawCaseName = c.caseNames?.[i] ?? "";
      // 病种未选的位跳过（不导出该病例）
      if (!rawCaseName) continue;
      const caseName = sanitize(rawCaseName, `病例${i + 1}`);
      const caseFolder = candFolder.folder(caseName);
      if (!caseFolder) continue;

      for (const tt of photoTasks) {
        const meta = TASK_META[tt];
        const task = findTask(c, i, tt);
        if (!task?.photoId) {
          // 仅在该考生该病例有任何活动时记录缺失
          if (task?.status === "done" || c.tasks.some((t) => t.caseIndex === i)) {
            missing.push({
              candidate: candFolderName,
              caseName,
              taskLabel: meta.exportName,
            });
          }
          continue;
        }
        const rec = await getPhoto(task.photoId);
        if (!rec) {
          missing.push({
            candidate: candFolderName,
            caseName,
            taskLabel: meta.exportName,
          });
          continue;
        }
        caseFolder.file(`${meta.exportName}.jpg`, rec.blob);
        photoCount++;
      }
    }
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "STORE", // 照片已压缩，不再 zip 压缩，速度更快
  });

  // 文件名：纯英文+数字，避免手机浏览器把中文文件名替换成随机字母串
  // 格式：examshot_YYYY-MM-DD_HHMM.zip，简洁易识别，不会出现乱码字母
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const fileName = `examshot_${session.date}_${hh}${mm}.zip`;

  return { blob, fileName, photoCount, missing };
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
