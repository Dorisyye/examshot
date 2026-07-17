import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  FolderArchive,
  Loader2,
  Plus,
  Search,
  Share2,
} from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { AppShell, TopBar } from "@/components/AppShell";
import { Button, EmptyState, ProgressBar, TextInput } from "@/components/ui";
import { Drawer } from "@/components/Drawer";
import BoardCandidateCard from "@/components/BoardCandidateCard";
import TaskActionDrawer, { type TaskContext } from "@/components/TaskActionDrawer";
import CaseSelectDrawer, { type CaseSelectContext } from "@/components/CaseSelectDrawer";
import { buildPhotoZip } from "@/lib/photoZip";
import {
  doneTasks,
  missingCount,
  progressPct,
  totalTasks,
} from "@/lib/progress";
import { cn } from "@/lib/utils";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const addCandidate = useSessionStore((s) => s.addCandidate);
  const toast = useToast();

  const [taskCtx, setTaskCtx] = useState<TaskContext | null>(null);
  const [caseSelectCtx, setCaseSelectCtx] = useState<CaseSelectContext | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExam, setNewExam] = useState("");
  const [newSeat, setNewSeat] = useState("");
  const [query, setQuery] = useState("");
  const [zipping, setZipping] = useState(false);

  const stats = useMemo(() => {
    if (!session) return { done: 0, total: 0, pct: 0, missing: 0 };
    return {
      done: doneTasks(session),
      total: totalTasks(session),
      pct: progressPct(session),
      missing: missingCount(session),
    };
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

  const filteredCandidates = useMemo(() => {
    let arr = session.candidates;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.examNumber ?? "").toLowerCase().includes(q) ||
          String(c.seatNumber ?? "").includes(q),
      );
    }
    return arr;
  }, [session.candidates, query]);

  const handleAddCandidate = () => {
    if (!newName.trim()) {
      toast("请输入姓名", "warn");
      return;
    }
    const cid = addCandidate(session.id, {
      name: newName,
      examNumber: newExam || undefined,
      seatNumber: newSeat ? Number(newSeat) : undefined,
    });
    if (cid) {
      toast(`已添加 ${newName}`, "ok");
      setNewName("");
      setNewExam("");
      setNewSeat("");
      setAddOpen(false);
    }
  };

  const isAllDone = stats.total > 0 && stats.done === stats.total;

  // 一键导出照片包并分享（不用跳到导出页）
  const handleExportZip = async () => {
    if (!session) return;
    setZipping(true);
    try {
      const result = await buildPhotoZip(session);
      if (result.photoCount === 0) {
        toast("还没有可导出的照片", "warn");
        return;
      }
      const file = new File([result.blob], result.fileName, { type: "application/zip" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: result.fileName,
          text: `监考照片包（${result.photoCount}张）`,
        });
        toast("已分享", "ok");
      } else {
        // 降级：触发下载
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast(`照片包已下载（${result.photoCount}张）`, "ok");
      }
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") {
        toast("照片包生成失败", "bad");
      }
    } finally {
      setZipping(false);
    }
  };

  return (
    <AppShell
      topBar={
        <TopBar
          title={session.name}
          subtitle={`${session.date} · ${session.candidates.length} 人`}
          backFallbackTo="/"
          right={
            <button
              onClick={() => navigate(`/sessions/${session.id}/export`)}
              aria-label="导出"
              className="touchable flex items-center justify-center rounded-lg text-type-secondary hover:bg-ink-hover hover:text-info"
            >
              <Download className="h-4 w-4" />
            </button>
          }
          below={
            <div className="border-t border-ink-border bg-ink-surface/50 px-4 py-2.5">
              <div className="flex items-center gap-3">
                {/* 完成率大数字 */}
                <div className="shrink-0">
                  <div className="flex items-baseline gap-0.5">
                    <span
                      className={cn(
                        "tnum text-2xl font-bold leading-none",
                        isAllDone ? "text-ok" : stats.missing > 0 ? "text-warn" : "text-info",
                      )}
                    >
                      {stats.done}
                    </span>
                    <span className="tnum text-sm text-type-secondary">/{stats.total}</span>
                  </div>
                  <div className="font-mono text-2xs uppercase tracking-wide2 text-type-muted">
                    完成
                  </div>
                </div>

                {/* 进度条 + 预警 */}
                <div className="min-w-0 flex-1">
                  <ProgressBar
                    value={stats.pct}
                    tone={isAllDone ? "ok" : stats.missing > 0 ? "warn" : "info"}
                    showGlow={isAllDone}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="tnum font-mono text-2xs text-type-secondary">
                      {stats.pct}%
                    </span>
                    {stats.missing > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-warn-soft px-1.5 py-0.5 text-2xs font-semibold text-warn">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {stats.missing} 张未拍
                      </span>
                    ) : isAllDone ? (
                      <span className="text-2xs font-semibold text-ok">全部完成</span>
                    ) : (
                      <span className="text-2xs text-type-muted">监考中</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 搜索 + 添加 */}
              <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-type-muted" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索姓名 / 考号 / 机位"
                    className="w-full rounded-lg border border-ink-border bg-ink-base py-1.5 pl-8 pr-3 text-xs text-type-primary placeholder:text-type-muted focus:border-info focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setAddOpen(true)}
                  aria-label="添加考生"
                  className="touchable flex shrink-0 items-center justify-center gap-1 rounded-lg bg-info-soft px-2.5 text-info hover:bg-info/10"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">加人</span>
                </button>
              </div>
            </div>
          }
        />
      }
      bottomBar={
        session.candidates.length > 0 ? (
          <div className="flex flex-col gap-2 px-4 py-3">
            <Button
              variant={isAllDone ? "ok" : "primary"}
              size="lg"
              block
              icon={
                zipping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Share2 className="h-5 w-5" />
                )
              }
              onClick={handleExportZip}
              disabled={zipping}
            >
              {zipping ? "打包中…" : isAllDone ? "全部完成 · 导出照片包" : "导出照片包 · 分享/存文件"}
            </Button>
            <button
              onClick={() => navigate(`/sessions/${session.id}/export`)}
              className="text-center text-2xs text-type-secondary hover:text-type-primary"
            >
              查看明细 / 导出 CSV
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="px-4 py-4">
        {session.candidates.length === 0 ? (
          <EmptyState
            title="还没有考生"
            description="考前需先录入名单，或在监考中临时添加。"
            action={
              <div className="flex flex-col gap-2">
                <Button variant="primary" onClick={() => navigate(`/sessions/${session.id}/setup`)}>
                  去录入名单
                </Button>
                <Button variant="outline" onClick={() => setAddOpen(true)}>
                  临时添加一位
                </Button>
              </div>
            }
          />
        ) : filteredCandidates.length === 0 ? (
          <EmptyState title="未匹配到考生" description="试试其他关键字。" />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCandidates.map((c) => (
              <BoardCandidateCard
                key={c.id}
                candidate={c}
                session={session}
                onTaskClick={setTaskCtx}
                onCaseSelectClick={setCaseSelectCtx}
              />
            ))}
          </div>
        )}
      </div>

      {/* 任务操作抽屉 */}
      <TaskActionDrawer ctx={taskCtx} onClose={() => setTaskCtx(null)} />

      {/* 病种选择抽屉 */}
      <CaseSelectDrawer ctx={caseSelectCtx} onClose={() => setCaseSelectCtx(null)} />

      {/* 快速添加考生 */}
      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="临时添加考生"
        subtitle="名单有疏漏时可随时补加"
        footer={
          <div className="flex gap-2 pb-1">
            <Button variant="ghost" block onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button variant="primary" block icon={<Plus className="h-4 w-4" />} onClick={handleAddCandidate}>
              添加
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <TextInput
            label="姓名"
            placeholder="必填"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="考号"
              value={newExam}
              onChange={(e) => setNewExam(e.target.value)}
              placeholder="可选"
            />
            <TextInput
              label="机位号"
              type="number"
              inputMode="numeric"
              value={newSeat}
              onChange={(e) => setNewSeat(e.target.value)}
              placeholder="1-8"
            />
          </div>
        </div>
      </Drawer>
    </AppShell>
  );
}
