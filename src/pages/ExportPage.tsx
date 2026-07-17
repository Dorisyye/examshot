import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Download, FileDown, FolderArchive, Image as ImageIcon, Loader2, Share2, X } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { AppShell, TopBar } from "@/components/AppShell";
import { Button, EmptyState } from "@/components/ui";
import { TASK_META, TASK_ORDER, type Candidate, type TaskType } from "@/types";
import { findTask, fmtDateTime, isCaseMissing, missingCount } from "@/lib/progress";
import { getPhoto } from "@/lib/photoDb";
import { buildPhotoZip, downloadBlob } from "@/lib/photoZip";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const toast = useToast();
  const confirm = useConfirm();
  const [photoViewer, setPhotoViewer] = useState<{ url: string; title: string } | null>(null);
  const [zipping, setZipping] = useState(false);
  // 最近一次生成的照片包，用于「分享」按钮（Web Share API 可调起微信等系统分享）
  const [lastZip, setLastZip] = useState<{ blob: Blob; fileName: string } | null>(null);

  const rows = useMemo(() => {
    if (!session) return [];
    const list: Array<{
      candidate: Candidate;
      caseIndex: number;
      caseName: string;
      tasks: Array<{ type: TaskType; done: boolean; time?: number; hasPhoto: boolean; missing: boolean }>;
      caseMissing: boolean;
    }> = [];
    for (const c of session.candidates) {
      for (let i = 0; i < session.caseCount; i++) {
        const caseName = c.caseNames?.[i] ?? "";
        // 病种未选的位在明细表里标记为"未选"
        const caseMissing = caseName ? isCaseMissing(c, i) : false;
        list.push({
          candidate: c,
          caseIndex: i,
          caseName: caseName || "（未选）",
          caseMissing,
          tasks: TASK_ORDER.map((tt) => {
            const t = findTask(c, i, tt);
            return {
              type: tt,
              done: t?.status === "done",
              time: t?.completedAt,
              hasPhoto: !!t?.photoId,
              missing: caseMissing && t?.status !== "done",
            };
          }),
        });
      }
    }
    return list;
  }, [session]);

  if (!session) {
    return (
      <AppShell topBar={<TopBar title="场次不存在" backFallbackTo="/" />}>
        <EmptyState
          title="找不到这场考试"
          action={<Button onClick={() => navigate("/")}>返回首页</Button>}
        />
      </AppShell>
    );
  }

  const missing = missingCount(session);

  // 生成 CSV
  const buildCSV = (): string => {
    const headers = [
      "场次",
      "日期",
      "地点",
      "姓名",
      "考号",
      "机位号",
      "病例",
      ...TASK_ORDER.map((t) => TASK_META[t].label + "_状态"),
      ...TASK_ORDER.map((t) => TASK_META[t].label + "_时间"),
      ...TASK_ORDER.map((t) => TASK_META[t].label + "_有照片"),
      "该病例漏拍",
    ];
    const lines: string[] = [headers.join(",")];
    for (const r of rows) {
      const cells: string[] = [
        session.name,
        session.date,
        session.location ?? "",
        r.candidate.name,
        r.candidate.examNumber ?? "",
        r.candidate.seatNumber != null ? String(r.candidate.seatNumber) : "",
        r.caseName,
      ];
      for (const t of r.tasks) cells.push(t.done ? "已完成" : "未完成");
      for (const t of r.tasks) cells.push(t.done && t.time ? fmtDateTime(t.time) : "");
      for (const t of r.tasks) cells.push(t.hasPhoto ? "是" : "否");
      cells.push(r.caseMissing ? "是" : "否");
      lines.push(cells.map(escapeCSV).join(","));
    }
    // BOM for Excel 中文兼容
    return "\uFEFF" + lines.join("\r\n");
  };

  const handleExport = () => {
    const csv = buildCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `监考记录_${session.date}_${session.name.replace(/[\\/:*?"<>|]/g, "_")}.csv`);
    toast("CSV 已下载", "ok");
  };

  const handleExportZip = async () => {
    setZipping(true);
    try {
      const result = await buildPhotoZip(session);
      if (result.photoCount === 0) {
        toast("没有可导出的照片", "warn");
        return;
      }
      // 缓存最近一次结果，供「分享」按钮使用
      setLastZip({ blob: result.blob, fileName: result.fileName });
      downloadBlob(result.blob, result.fileName);
      if (result.missing.length > 0) {
        const sample = result.missing.slice(0, 3).map((m) => `${m.candidate}/${m.caseName}/${m.taskLabel}`).join("、");
        confirm({
          title: "照片包已下载，但有缺失",
          message: `共导出 ${result.photoCount} 张照片，但有 ${result.missing.length} 项缺失（如 ${sample}…）。缺失项需补拍后重新导出。`,
          okText: "知道了",
          cancelText: "关闭",
          onOk: () => {},
        });
      } else {
        toast(`照片包已下载（${result.photoCount} 张）`, "ok");
      }
    } catch {
      toast("照片包生成失败", "bad");
    } finally {
      setZipping(false);
    }
  };

  // 调起系统分享面板（微信/文件管理/邮件等）。Web Share API 在手机浏览器支持较好。
  const handleShareZip = async () => {
    if (!lastZip) {
      toast("请先点「导出照片包」生成", "warn");
      return;
    }
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    // 分享文件需要 Web Share API Level 2（files 字段）
    if (!navigator.share || !nav.canShare) {
      toast("当前浏览器不支持分享文件，请用「下载」后手动发送", "warn");
      return;
    }
    try {
      const file = new File([lastZip.blob], lastZip.fileName, { type: "application/zip" });
      const shareData = { files: [file], title: lastZip.fileName, text: `监考照片包 ${lastZip.fileName}` };
      if (!nav.canShare(shareData)) {
        toast("当前浏览器不支持分享此文件，请用「下载」", "warn");
        return;
      }
      await navigator.share(shareData);
    } catch (e) {
      // 用户取消分享会抛 AbortError，不必提示
      if ((e as DOMException)?.name !== "AbortError") {
        toast("分享失败，请用「下载」", "bad");
      }
    }
  };

  const viewPhoto = async (candidate: Candidate, caseIndex: number, taskType: TaskType) => {
    const t = findTask(candidate, caseIndex, taskType);
    if (!t?.photoId) return;
    const rec = await getPhoto(t.photoId);
    if (rec) {
      setPhotoViewer({
        url: URL.createObjectURL(rec.blob),
        title: `${candidate.name} · ${candidate.caseNames?.[caseIndex] ?? "未选"} · ${TASK_META[taskType].label}`,
      });
    }
  };

  const closeViewer = () => {
    if (photoViewer) URL.revokeObjectURL(photoViewer.url);
    setPhotoViewer(null);
  };

  return (
    <AppShell
      topBar={
        <TopBar
          title="完成情况"
          subtitle={session.name}
          backFallbackTo={`/sessions/${session.id}/board`}
        />
      }
      bottomBar={
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex gap-2">
            <Button
              variant="ok"
              size="lg"
              block
              icon={zipping ? <Loader2 className="h-5 w-5 animate-spin" /> : <FolderArchive className="h-5 w-5" />}
              onClick={handleExportZip}
              disabled={rows.length === 0 || zipping}
            >
              {zipping ? "打包中…" : "导出照片包"}
            </Button>
            <Button
              variant="primary"
              size="lg"
              block
              icon={<Share2 className="h-5 w-5" />}
              onClick={handleShareZip}
              disabled={!lastZip}
            >
              分享到微信
            </Button>
          </div>
          <Button
            variant="outline"
            size="md"
            block
            icon={<FileDown className="h-4 w-4" />}
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            导出完成情况 CSV
          </Button>
          {!lastZip && (
            <p className="text-center text-2xs text-type-muted">
              先点「导出照片包」生成后，「分享到微信」才可用
            </p>
          )}
        </div>
      }
    >
      <div className="px-4 py-4">
        {/* 概览卡 */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatCard label="考生" value={session.candidates.length} tone="info" />
          <StatCard
            label="总任务"
            value={rows.length * TASK_ORDER.length}
            tone="info"
          />
          <StatCard
            label="漏拍"
            value={missing}
            tone={missing > 0 ? "bad" : "ok"}
          />
        </div>

        {missing > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-bad/30 bg-bad-soft/30 px-3 py-2.5">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
            <p className="text-xs text-bad">
              仍有 {missing} 项漏拍（USB拷贝已完成但前面的拍摄任务未完成）。建议回看板补拍。
            </p>
          </div>
        )}

        {/* 照片包结构说明 */}
        <div className="mb-4 rounded-lg border border-ink-border bg-ink-surface px-3.5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <FolderArchive className="h-4 w-4 text-ok" />
            <span className="text-sm font-semibold text-type-primary">照片包结构</span>
          </div>
          <pre className="overflow-x-auto rounded bg-ink-base px-3 py-2 font-mono text-2xs leading-relaxed text-type-secondary">
{`照片包.zip
├─ 张三/
│  ├─ AAFL/
│  │  ├─ 过程.jpg
│  │  └─ 结果.jpg
│  └─ PVC/
│     ├─ 过程.jpg
│     └─ 结果.jpg
└─ 李四/
   └─ …（录屏自行拷入对应病种文件夹）`}
          </pre>
          <p className="mt-2 text-2xs text-type-muted">
            病种文件夹名取自每位考生进场时所选病种。未选病种的病例不会导出。录屏文件需你手动拷入对应病种文件夹。
          </p>
        </div>

        {/* 明细表 */}
        {rows.length === 0 ? (
          <EmptyState
            icon={<Download className="h-6 w-6" />}
            title="暂无明细"
            description="录入考生并标记任务后，这里会显示完成情况。"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink-border">
            {/* 表头 */}
            <div className="grid grid-cols-[1.4fr_0.6fr_repeat(3,1fr)] bg-ink-raised px-3 py-2 font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-secondary">
              <span>考生</span>
              <span className="text-center">机位</span>
              {TASK_ORDER.map((tt) => (
                <span key={tt} className="text-center">{TASK_META[tt].shortLabel}</span>
              ))}
            </div>
            {rows.map((r, idx) => (
              <div
                key={`${r.candidate.id}-${r.caseIndex}`}
                className={cn(
                  "grid grid-cols-[1.4fr_0.6fr_repeat(3,1fr)] items-center px-3 py-2.5 text-xs",
                  idx % 2 === 0 ? "bg-ink-surface" : "bg-ink-base",
                  r.caseMissing && "bg-bad-soft/20",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-type-primary">
                      {r.candidate.name || "未命名"}
                    </span>
                    <span className="shrink-0 font-mono text-2xs text-type-muted">
                      {r.caseName}
                    </span>
                  </div>
                  {r.candidate.examNumber && (
                    <span className="font-mono text-2xs text-type-muted">
                      #{r.candidate.examNumber}
                    </span>
                  )}
                </div>
                <span className="text-center font-mono text-type-secondary">
                  {r.candidate.seatNumber ?? "—"}
                </span>
                {r.tasks.map((t) => (
                  <div key={t.type} className="flex flex-col items-center gap-0.5">
                    {t.done ? (
                      <button
                        onClick={() => t.hasPhoto && viewPhoto(r.candidate, r.caseIndex, t.type)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                          t.hasPhoto ? "text-ok hover:bg-ok-soft" : "text-type-secondary",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                        {t.hasPhoto && <ImageIcon className="h-2.5 w-2.5" />}
                      </button>
                    ) : t.missing ? (
                      <span className="inline-flex items-center rounded bg-bad-soft px-1.5 py-0.5 text-2xs font-bold text-bad">
                        漏
                      </span>
                    ) : (
                      <span className="text-type-muted">—</span>
                    )}
                    <span className="tnum font-mono text-2xs text-type-muted">
                      {t.done && t.time ? fmtDateTime(t.time).slice(6) : ""}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-center text-2xs text-type-muted">
          点击带照片图标的 ✓ 可查看该任务的照片
        </p>
      </div>

      {/* 照片查看器 */}
      {photoViewer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={closeViewer}
        >
          <button
            className="absolute right-4 top-4 text-white"
            onClick={closeViewer}
            aria-label="关闭"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={photoViewer.url}
            alt={photoViewer.title}
            className="max-h-[88vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-center text-xs text-white">
            {photoViewer.title}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "bad" | "info";
}) {
  return (
    <div className="rounded-lg border border-ink-border bg-ink-surface px-3 py-2.5 text-center">
      <div
        className={cn(
          "tnum text-xl font-bold leading-none",
          tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-info",
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-2xs uppercase tracking-wide2 text-type-muted">
        {label}
      </div>
    </div>
  );
}

function escapeCSV(v: string): string {
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
