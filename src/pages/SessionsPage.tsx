import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, HardDrive, Plus, ScanLine } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { AppShell } from "@/components/AppShell";
import { Button, EmptyState } from "@/components/ui";
import SessionCard from "@/components/SessionCard";
import { estimateUsageBytes } from "@/lib/photoDb";
import { fmtBytes } from "@/lib/progress";
import { cn } from "@/lib/utils";

export default function SessionsPage() {
  const navigate = useNavigate();
  const sessions = useSessionStore((s) => s.sessions);
  const [usage, setUsage] = useState(0);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    estimateUsageBytes().then(setUsage);
  }, [sessions]);

  const activeSessions = useMemo(
    () => sessions.filter((s) => !s.archived),
    [sessions],
  );
  const archivedSessions = useMemo(
    () => sessions.filter((s) => s.archived),
    [sessions],
  );

  const todaysCount = useMemo(() => {
    const t = new Date();
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    return sessions.filter((s) => s.date === todayStr).length;
  }, [sessions]);

  return (
    <AppShell
      topBar={
        <div className="px-4 pb-3 pt-2 safe-top">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-2xs font-bold uppercase tracking-wide2 text-info">
                EXAMSHOT
              </div>
              <h1 className="mt-0.5 text-xl font-bold text-type-primary">
                监考拍摄看板
              </h1>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-2xs text-type-secondary">
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                <span className="tnum">{fmtBytes(usage)}</span>
              </span>
              <span className="tnum">今日 {todaysCount} 场</span>
            </div>
          </div>
          {/* 装饰扫描线 */}
          <div className="mt-2 flex items-center gap-1.5 text-type-muted">
            <ScanLine className="h-3 w-3" />
            <div className="h-px flex-1 bg-gradient-to-r from-info/40 via-ink-border to-transparent" />
            <span className="font-mono text-2xs">SYSTEM READY</span>
          </div>
        </div>
      }
    >
      <div className="px-4 py-4">
        {sessions.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="还没有考试场次"
            description="新建一场考试，录入考生名单后即可开始监考拍摄记录。"
            action={
              <Button
                variant="primary"
                size="lg"
                icon={<Plus className="h-5 w-5" />}
                onClick={() => navigate("/sessions/new")}
              >
                新建第一场
              </Button>
            }
          />
        ) : (
          <>
            <SectionHeader
              title="进行中"
              count={activeSessions.length}
            />
            <div className="mt-3 flex flex-col gap-3">
              {activeSessions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ink-border px-4 py-6 text-center text-sm text-type-muted">
                  没有进行中的场次
                </p>
              ) : (
                activeSessions.map((s) => <SessionCard key={s.id} session={s} />)
              )}
            </div>

            {archivedSessions.length > 0 && (
              <>
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className="mt-6 flex w-full items-center gap-2 text-left"
                >
                  <SectionHeader
                    title="归档"
                    count={archivedSessions.length}
                    className="flex-1"
                  />
                  <span className="text-2xs text-type-secondary">
                    {showArchived ? "收起" : "展开"}
                  </span>
                </button>
                {showArchived && (
                  <div className="mt-3 flex flex-col gap-3">
                    {archivedSessions.map((s) => (
                      <SessionCard key={s.id} session={s} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB 新建 */}
      {sessions.length > 0 && (
        <button
          onClick={() => navigate("/sessions/new")}
          aria-label="新建场次"
          className="fixed bottom-6 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-info text-ink-base shadow-[0_8px_24px_rgba(88,166,255,0.4)] transition-transform active:scale-95 safe-bottom"
          style={{ right: "max(1rem, calc((100vw - 480px) / 2 + 1rem))" }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      )}
    </AppShell>
  );
}

function SectionHeader({
  title,
  count,
  className,
}: {
  title: string;
  count: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h2 className="font-mono text-2xs font-semibold uppercase tracking-wide2 text-type-secondary">
        {title}
      </h2>
      <span className="tnum rounded bg-ink-hover px-1.5 py-0.5 text-2xs text-type-secondary">
        {count}
      </span>
    </div>
  );
}
