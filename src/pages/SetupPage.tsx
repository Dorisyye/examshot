import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Play, Settings2, Tag } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { AppShell, TopBar } from "@/components/AppShell";
import { Button, TextInput, TextArea } from "@/components/ui";
import CandidateList from "@/components/CandidateList";
import { EmptyState } from "@/components/ui";
import { totalTasks } from "@/lib/progress";
import { CASE_PRESETS } from "@/constants";
import { cn } from "@/lib/utils";

export default function SetupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const updateSession = useSessionStore((s) => s.updateSession);
  const toast = useToast();

  const [metaOpen, setMetaOpen] = useState(false);

  if (!session) {
    return (
      <AppShell topBar={<TopBar title="场次不存在" backFallbackTo="/" />}>
        <EmptyState
          title="找不到这场考试"
          description="它可能已被删除。"
          action={<Button onClick={() => navigate("/")}>返回首页</Button>}
        />
      </AppShell>
    );
  }

  const total = totalTasks(session);
  const validCandidates = session.candidates.filter((c) => c.name.trim());

  const handleStart = () => {
    if (validCandidates.length === 0) {
      toast("请至少添加一位考生", "warn");
      return;
    }
    navigate(`/sessions/${session.id}/board`);
  };

  return (
    <AppShell
      topBar={
        <TopBar
          title="场次准备"
          subtitle={`${session.name} · ${session.date}`}
          backFallbackTo="/"
          right={
            <button
              onClick={() => setMetaOpen((v) => !v)}
              aria-label="场次设置"
              className={cn(
                "touchable flex items-center justify-center rounded-lg",
                metaOpen ? "text-info" : "text-type-secondary hover:text-type-primary",
              )}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          }
        />
      }
      bottomBar={
        <div className="px-4 py-3">
          <Button
            variant="primary"
            size="lg"
            block
            onClick={handleStart}
            icon={<Play className="h-5 w-5" />}
            disabled={validCandidates.length === 0}
          >
            开始监考 · {total} 项任务
          </Button>
          {validCandidates.length === 0 && (
            <p className="mt-1.5 text-center text-2xs text-type-muted">
              请先添加至少一位考生
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* 场次信息概要卡（始终显示） */}
        <div className="rounded-xl border border-ink-border bg-ink-surface p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-type-primary">
                {session.name}
              </h2>
              <p className="mt-0.5 text-2xs text-type-secondary">
                {session.date}
                {session.location ? ` · ${session.location}` : ""}
                {session.note ? ` · ${session.note}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded bg-info-soft px-2 py-1 font-mono text-2xs text-info">
              {session.caseCount} 病例
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="考生" value={session.candidates.length} />
            <Stat label="每人任务" value={session.caseCount * 3} />
            <Stat label="总任务" value={total} />
          </div>
          {metaOpen && (
            <div className="mt-4 flex flex-col gap-3 border-t border-ink-border pt-4 animate-fade-in">
              <TextInput
                label="场次名称"
                value={session.name}
                onChange={(e) => updateSession(session.id, { name: e.target.value })}
              />
              <TextInput
                label="日期"
                type="date"
                value={session.date}
                onChange={(e) => updateSession(session.id, { date: e.target.value })}
              />
              <TextInput
                label="地点"
                value={session.location ?? ""}
                onChange={(e) => updateSession(session.id, { location: e.target.value })}
                placeholder="如：模拟医学中心 3 楼"
              />
              <TextArea
                label="备注"
                value={session.note ?? ""}
                onChange={(e) => updateSession(session.id, { note: e.target.value })}
                rows={2}
                placeholder="考官、特殊安排等"
              />
              <button
                onClick={() => setMetaOpen(false)}
                className="inline-flex items-center justify-center gap-1 self-center text-2xs text-type-secondary hover:text-type-primary"
              >
                收起 <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          )}
          {!metaOpen && (
            <button
              onClick={() => setMetaOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-2xs text-info hover:underline"
            >
              <ChevronDown className="h-3 w-3" /> 展开编辑场次信息
            </button>
          )}
        </div>

        {/* 病种选择说明：每位考生进场时在看板逐人选择 */}
        <div className="rounded-xl border border-ink-border bg-ink-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-secondary">
              病种选择
            </h3>
            <span className="rounded bg-warn-soft px-1.5 py-0.5 font-mono text-2xs text-warn">
              进场时在看板逐人选择
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <div className="text-2xs text-type-secondary">
              每位考生各自跑的病种可能不同。本场次每位考生跑 <span className="font-mono font-bold text-type-primary">{session.caseCount}</span> 个病种，
              可选预设：<span className="font-mono text-type-primary">{CASE_PRESETS.join(" / ")}</span>，也支持自定义。
              <div className="mt-1 text-type-muted">
                监考看板里每个考生卡的病种位初始为"未选"，进场签到后点「点选病种」为他选好本次跑哪几个。
                病种名将作为导出照片包中每位考生下的子文件夹名。
              </div>
            </div>
          </div>
        </div>

        <CandidateList session={session} />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-base py-2">
      <div className="tnum text-lg font-bold text-type-primary">{value}</div>
      <div className="font-mono text-2xs uppercase tracking-wide2 text-type-muted">
        {label}
      </div>
    </div>
  );
}
