import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  ChevronRight,
  Download,
  MoreVertical,
  Pencil,
  Play,
  Trash2,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { Session } from "@/types";
import { useSessionStore } from "@/store/sessionStore";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/store/toastStore";
import {
  doneTasks,
  fmtTime,
  missingCount,
  progressPct,
  totalTasks,
} from "@/lib/progress";
import { Card, ProgressBar, Badge } from "@/components/ui";
import { Drawer } from "@/components/Drawer";
import { cn } from "@/lib/utils";

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const archiveSession = useSessionStore((s) => s.archiveSession);
  const confirm = useConfirm();
  const toast = useToast();

  const total = totalTasks(session);
  const done = doneTasks(session);
  const pct = progressPct(session);
  const missing = missingCount(session);
  const isDone = total > 0 && done === total;

  const goBoard = () => navigate(`/sessions/${session.id}/board`);
  const goSetup = () => navigate(`/sessions/${session.id}/setup`);
  const goExport = () => navigate(`/sessions/${session.id}/export`);

  const handleDelete = () => {
    setMenuOpen(false);
    confirm({
      title: "删除场次",
      message: `「${session.name}」及其全部考生与照片记录将被清除。`,
      okText: "删除",
      danger: true,
      onOk: () => {
        deleteSession(session.id);
        toast("场次已删除", "bad");
      },
    });
  };

  const handleArchive = () => {
    setMenuOpen(false);
    archiveSession(session.id, !session.archived);
    toast(session.archived ? "已恢复" : "已归档", "info");
  };

  return (
    <>
      <Card
        onClick={goBoard}
        className={cn(
          "relative overflow-hidden p-4",
          session.archived && "opacity-60",
        )}
      >
        {/* 左侧状态色条 */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            isDone ? "bg-ok" : missing > 0 ? "bg-warn" : "bg-info",
          )}
        />

        <div className="flex items-start justify-between gap-3 pl-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-type-primary">
                {session.name}
              </h3>
              {session.archived && <Badge tone="neutral">归档</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-type-secondary">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {session.date}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {session.candidates.length} 人
              </span>
              {session.location && (
                <span className="truncate">@ {session.location}</span>
              )}
            </div>
          </div>

          {/* 完成率大数字 */}
          <div className="shrink-0 text-right">
            <div
              className={cn(
                "tnum text-2xl font-bold leading-none",
                isDone ? "text-ok" : missing > 0 ? "text-warn" : "text-info",
              )}
            >
              {pct}
              <span className="text-sm text-type-secondary">%</span>
            </div>
            <div className="tnum mt-0.5 text-2xs text-type-secondary">
              {done}/{total}
            </div>
          </div>
        </div>

        <div className="mt-3 pl-2">
          <ProgressBar
            value={pct}
            tone={isDone ? "ok" : missing > 0 ? "warn" : "info"}
            showGlow={isDone}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {missing > 0 ? (
                <Badge tone="warn">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {missing} 张未拍
                </Badge>
              ) : isDone ? (
                <Badge tone="ok">完成</Badge>
              ) : (
                <Badge tone="info">进行中</Badge>
              )}
              {session.candidates.length > 0 && (
                <span className="text-2xs text-type-muted">
                  创建于 {fmtTime(session.createdAt)}
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
              aria-label="更多操作"
              className="touchable -mr-1 flex items-center justify-center rounded-lg text-type-secondary hover:bg-ink-hover hover:text-type-primary"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={session.name}
        subtitle={`${session.date} · ${session.candidates.length} 人 · ${done}/${total} 完成`}
      >
        <div className="flex flex-col gap-1 pb-2">
          <MenuItem icon={<Play className="h-4 w-4" />} label="进入监考看板" onClick={() => { setMenuOpen(false); goBoard(); }} primary />
          <MenuItem icon={<Pencil className="h-4 w-4" />} label="编辑名单与配置" onClick={() => { setMenuOpen(false); goSetup(); }} />
          <MenuItem icon={<Download className="h-4 w-4" />} label="查看与导出 CSV" onClick={() => { setMenuOpen(false); goExport(); }} />
          <MenuItem
            icon={session.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            label={session.archived ? "取消归档" : "归档场次"}
            onClick={handleArchive}
          />
          <MenuItem icon={<Trash2 className="h-4 w-4" />} label="删除场次" danger onClick={handleDelete} />
        </div>
      </Drawer>
    </>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}
function MenuItem({ icon, label, onClick, primary, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "touchable flex w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors",
        "hover:bg-ink-hover",
        primary ? "text-info" : danger ? "text-bad" : "text-type-primary",
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-raised">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {!danger && <ChevronRight className="h-4 w-4 text-type-muted" />}
    </button>
  );
}
