import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useToast } from "@/store/toastStore";
import { AppShell, TopBar } from "@/components/AppShell";
import { Button, TextInput, TextArea } from "@/components/ui";
import { today } from "@/lib/progress";
import { cn } from "@/lib/utils";

export default function NewSessionPage() {
  const navigate = useNavigate();
  const createSession = useSessionStore((s) => s.createSession);
  const toast = useToast();

  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [caseCount, setCaseCount] = useState(2);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast("请填写场次名称", "warn");
      return;
    }
    const id = createSession({
      name,
      date,
      location,
      note,
      caseCount,
    });
    toast("场次已创建，请录入考生名单", "ok");
    navigate(`/sessions/${id}/setup`);
  };

  return (
    <AppShell
      topBar={
        <TopBar
          title="新建场次"
          backFallbackTo="/"
          right={
            <span className="font-mono text-2xs text-type-muted">NEW SESSION</span>
          }
        />
      }
      bottomBar={
        <div className="px-4 py-3">
          <Button variant="primary" size="lg" block onClick={handleSubmit} icon={<Plus className="h-5 w-5" />}>
            创建并录入名单
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-4 py-5">
        <TextInput
          label="场次名称"
          placeholder="如：第三季度 OSCE 考核"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div>
          <span className="mb-1.5 block font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
            日期
          </span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-type-muted" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-ink-border bg-ink-base py-2.5 pl-9 pr-3 text-sm text-type-primary focus:border-info focus:outline-none focus:ring-1 focus:ring-info/40"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
            地点（可选）
          </span>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-type-muted" />
            <input
              type="text"
              placeholder="如：模拟医学中心 3 楼"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-ink-border bg-ink-base py-2.5 pl-9 pr-3 text-sm text-type-primary placeholder:text-type-muted focus:border-info focus:outline-none focus:ring-1 focus:ring-info/40"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
            病例数量
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCaseCount(n)}
                className={cn(
                  "tnum touchable flex-1 rounded-lg border py-2.5 text-base font-bold transition-all",
                  caseCount === n
                    ? "border-info bg-info-soft text-info"
                    : "border-ink-border bg-ink-base text-type-secondary hover:border-type-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-2xs text-type-muted">
            每位考生需跑 {caseCount} 个病例，每个病例 2 项拍照任务（人脸+屏幕照 / 结果照）。
          </p>
        </div>

        <TextArea
          label="备注（可选）"
          placeholder="考官、特殊安排等"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>
    </AppShell>
  );
}
