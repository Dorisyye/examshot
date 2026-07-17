import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Download,
  Eye,
  ImageOff,
  RotateCcw,
  Usb,
  UserSquare2,
  MonitorUp,
  Upload,
  X,
} from "lucide-react";
import type { Candidate, TaskType } from "@/types";
import { TASK_META } from "@/types";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { useConfirm } from "@/components/ConfirmDialog";
import { Drawer } from "@/components/Drawer";
import { Button, Badge } from "@/components/ui";
import CameraCapture from "@/components/CameraCapture";
import { FullScreenModal } from "@/components/FullScreenModal";
import { getPhoto, savePhoto, deletePhoto } from "@/lib/photoDb";
import { findTask, fmtTime, isCaseMissing } from "@/lib/progress";
import { compressImageBlob } from "@/lib/imageCompress";
import { v4 as uuid } from "uuid";
import { cn } from "@/lib/utils";

export interface TaskContext {
  sessionId: string;
  candidate: Candidate;
  caseIndex: number;
  caseName: string;
  taskType: TaskType;
}

interface Props {
  ctx: TaskContext | null;
  onClose: () => void;
}

const TASK_ICON: Record<TaskType, typeof Camera> = {
  face_screen: UserSquare2,
  result: MonitorUp,
  usb_copy: Usb,
};

export default function TaskActionDrawer({ ctx, onClose }: Props) {
  const setTaskStatus = useSessionStore((s) => s.setTaskStatus);
  const setTaskSavedToAlbum = useSessionStore((s) => s.setTaskSavedToAlbum);
  const toast = useToast();
  const confirm = useConfirm();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const open = !!ctx;
  const candidate = ctx?.candidate;
  const taskType = ctx?.taskType;
  const caseIndex = ctx?.caseIndex;

  // 加载已有照片
  useEffect(() => {
    let revoked = false;
    let urlToRevoke: string | null = null;
    setPhotoUrl(null);
    if (ctx && candidate && taskType !== undefined && caseIndex !== undefined) {
      const t = findTask(candidate, caseIndex, taskType);
      if (t?.photoId) {
        setPhotoLoading(true);
        getPhoto(t.photoId).then((rec) => {
          if (revoked) return;
          if (rec) {
            const url = URL.createObjectURL(rec.blob);
            urlToRevoke = url;
            setPhotoUrl(url);
          }
          setPhotoLoading(false);
        });
      }
    }
    return () => {
      revoked = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [ctx, candidate, taskType, caseIndex]);

  if (!ctx || !candidate || taskType === undefined || caseIndex === undefined) {
    return null;
  }

  const meta = TASK_META[taskType];
  const Icon = TASK_ICON[taskType];
  const task = findTask(candidate, caseIndex, taskType);
  const isDone = task?.status === "done";
  const caseMissing = isCaseMissing(candidate, caseIndex);

  // 拍照保存
  const handleCapture = async (blob: Blob) => {
    setCameraOpen(false);
    await saveAndMark(blob);
  };

  // 从相册上传：用户之前用手机拍的也能补进来
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 input，确保选同一张文件也能再次触发 change
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("请选择图片文件", "warn");
      return;
    }
    // 压缩：避免相册原图过大导致存储/下载慢
    const compressed = await compressImageBlob(file);
    await saveAndMark(compressed ?? file);
  };

  // 共用：保存照片 blob 并标记任务完成，同时自动保存到系统相册
  const saveAndMark = async (blob: Blob) => {
    const photoId = uuid();
    try {
      // 生成文件名，用于保存到相册
      const safeName = (candidate.name || "未命名").replace(/[\\/:*?"<>|]/g, "_");
      const safeCase = (ctx.caseName || "未选").replace(/[\\/:*?"<>|]/g, "_");
      const fileName = `${safeName}_${safeCase}_${meta.exportName}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      // 自动保存到系统相册（利用用户手势上下文，先触发分享再存 IndexedDB）
      if (navigator.canShare?.({ files: [file] })) {
        navigator
          .share({ files: [file], title: fileName })
          .then(() => {
            setTaskSavedToAlbum(ctx.sessionId, candidate.id, caseIndex, taskType, true);
          })
          .catch(() => {
            // 用户取消或失败，不影响保存到 IndexedDB
          });
      }

      await savePhoto({
        id: photoId,
        blob,
        takenAt: Date.now(),
        meta: {
          sessionId: ctx.sessionId,
          candidateId: candidate.id,
          caseIndex,
          taskType,
        },
      });
      // 若之前有旧照片，删掉
      if (task?.photoId && task.photoId !== photoId) {
        deletePhoto(task.photoId).catch(() => {});
      }
      setTaskStatus(ctx.sessionId, candidate.id, caseIndex, taskType, "done", photoId);
      toast(`${meta.label}已保存`, "ok");
      onClose();
    } catch {
      toast("照片保存失败", "bad");
    }
  };

  const handleManualMark = () => {
    setTaskStatus(ctx.sessionId, candidate.id, caseIndex, taskType, "done");
    toast(`已标记「${meta.label}」完成`, "ok");
    onClose();
  };

  const handleUnmark = () => {
    confirm({
      title: "取消标记",
      message: `将清除「${meta.label}」的完成状态${task?.photoId ? "及已拍照片" : ""}。`,
      okText: "取消标记",
      danger: true,
      onOk: () => {
        if (task?.photoId) {
          deletePhoto(task.photoId).catch(() => {});
        }
        setTaskStatus(ctx.sessionId, candidate.id, caseIndex, taskType, "pending");
        toast("已取消标记", "info");
        onClose();
      },
    });
  };

  // 保存到手机相册：优先用 Web Share API（系统分享面板能正确处理中文文件名，可直接存到相册/微信）
  // 不支持时降级到 <a download>（部分手机浏览器会忽略中文文件名）
  // 文件名格式：人名_病种_过程或结果.jpg（避免非法字符）
  const handleSaveToAlbum = async () => {
    if (!task?.photoId) return;
    const rec = await getPhoto(task.photoId);
    if (!rec) {
      toast("照片加载失败，无法保存", "bad");
      return;
    }
    const safeName = (candidate.name || "未命名").replace(/[\\/:*?"<>|]/g, "_");
    const safeCase = (ctx.caseName || "未选").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${safeName}_${safeCase}_${meta.exportName}.jpg`;
    const file = new File([rec.blob], fileName, { type: "image/jpeg" });

    // 优先 Web Share API Level 2
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        setTaskSavedToAlbum(ctx.sessionId, candidate.id, caseIndex, taskType, true);
        toast("已保存到相册", "ok");
      } catch (e) {
        // 用户取消或失败，不报错
      }
      return;
    }

    // 降级：<a download>
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setTaskSavedToAlbum(ctx.sessionId, candidate.id, caseIndex, taskType, true);
    toast(`已保存：${fileName}`, "ok");
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-raised">
              <Icon className="h-4 w-4 text-info" />
            </span>
            {meta.label}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-type-primary">{candidate.name || "未命名"}</span>
            {candidate.examNumber && <span className="text-type-muted">#{candidate.examNumber}</span>}
            <span className="text-type-muted">·</span>
            <span>{ctx.caseName}</span>
          </span>
        }
        footer={
          isDone ? (
            <div className="flex flex-col gap-2 pb-1">
              {meta.hasPhoto && task?.photoId && (
                <Button
                  variant={task.savedToAlbum ? "ok" : "primary"}
                  size="lg"
                  block
                  icon={
                    task.savedToAlbum ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )
                  }
                  onClick={handleSaveToAlbum}
                >
                  {task.savedToAlbum ? "已保存到相册 · 再次保存" : "保存到相册"}
                </Button>
              )}
              <div className="flex gap-2">
                {meta.hasPhoto && photoUrl && (
                  <Button variant="outline" block icon={<Eye className="h-4 w-4" />} onClick={() => setViewerOpen(true)}>
                    查看照片
                  </Button>
                )}
                <Button variant="ghost" block icon={<RotateCcw className="h-4 w-4" />} onClick={handleUnmark}>
                  取消标记
                </Button>
              </div>
            </div>
          ) : (
            <div className="pb-1">
              {meta.hasPhoto ? (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    icon={<Camera className="h-5 w-5" />}
                    onClick={() => setCameraOpen(true)}
                  >
                    拍照
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    block
                    icon={<Upload className="h-5 w-5" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    从相册
                  </Button>
                </div>
              ) : (
                <Button variant="ok" size="lg" block icon={<Check className="h-5 w-5" />} onClick={handleManualMark}>
                  标记已完成
                </Button>
              )}
              {meta.hasPhoto && (
                <button
                  onClick={handleManualMark}
                  className="mt-2 w-full py-1.5 text-center text-2xs text-type-secondary hover:text-type-primary"
                >
                  没用 App 拍？手动标记完成
                </button>
              )}
            </div>
          )}
      >
        <div className="py-2">
          {/* 当前状态 */}
          <div className="mb-3 flex items-center justify-between rounded-lg border border-ink-border bg-ink-base px-3 py-2.5">
            <span className="font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
              当前状态
            </span>
            {isDone ? (
              <Badge tone="ok">已完成 · {fmtTime(task?.completedAt)}</Badge>
            ) : caseMissing ? (
              <Badge tone="warn">还有照片未拍</Badge>
            ) : (
              <Badge tone="warn">待完成</Badge>
            )}
          </div>

          {/* 照片预览 */}
          {meta.hasPhoto && (
            <div className="rounded-lg border border-ink-border bg-ink-base p-2">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
                  照片
                </span>
                {photoUrl && !isDone && (
                  <span className="text-2xs text-warn">已拍但未标记</span>
                )}
                {photoUrl && isDone && task?.savedToAlbum && (
                  <span className="inline-flex items-center gap-0.5 text-2xs text-ok">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    已存到相册
                  </span>
                )}
              </div>
              {photoLoading ? (
                <div className="flex h-40 items-center justify-center rounded bg-ink-raised">
                  <span className="font-mono text-2xs text-type-muted">LOADING…</span>
                </div>
              ) : photoUrl ? (
                <button
                  onClick={() => setViewerOpen(true)}
                  className="block w-full overflow-hidden rounded"
                >
                  <img src={photoUrl} alt="任务照片" className="max-h-56 w-full object-cover" />
                </button>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded bg-ink-raised text-type-muted">
                  <ImageOff className="mb-2 h-8 w-8" />
                  <span className="text-2xs">暂无照片</span>
                </div>
              )}
              {photoUrl && (
                <button
                  onClick={() => setCameraOpen(true)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-ink-hover py-2 text-2xs text-info hover:bg-ink-raised"
                >
                  <Camera className="h-3.5 w-3.5" /> 重新拍摄
                </button>
              )}
            </div>
          )}

          {/* USB 拷贝特殊提示 */}
          {taskType === "usb_copy" && (
            <div className={cn(
              "mt-3 rounded-lg border px-3 py-2.5 text-xs",
              caseMissing
                ? "border-warn/40 bg-warn-soft/40 text-warn"
                : "border-ink-border bg-ink-base text-type-secondary",
            )}>
              {caseMissing
                ? "⚠ 该病例的「人脸+屏幕照」或「结果照」尚未完成，建议先补拍再拷录屏。"
                : "拷完录屏后点击下方「标记已完成」。"}
            </div>
          )}
        </div>
      </Drawer>

      {/* 拍照模态 */}
      <CameraCapture
        open={cameraOpen}
        hint={`拍摄：${meta.label}`}
        subHint={`${candidate.name || "未命名"} · ${ctx.caseName}`}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCapture}
      />

      {/* 从相册上传：隐藏 file input，通过按钮触发 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {/* 全屏看图 */}
      <FullScreenModal open={viewerOpen} dismissible onClose={() => setViewerOpen(false)}>
        {photoUrl && (
          <div className="relative h-full w-full" onClick={() => setViewerOpen(false)}>
            <img src={photoUrl} alt="照片" className="h-full w-full object-contain" />
            <button
              onClick={(e) => { e.stopPropagation(); setViewerOpen(false); }}
              className="touchable absolute right-4 top-4 flex items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-center text-2xs text-white">
              {candidate.name} · {ctx.caseName} · {meta.label}
            </div>
          </div>
        )}
      </FullScreenModal>
    </>
  );
}
