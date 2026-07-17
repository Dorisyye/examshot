import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  /** 顶部固定区域（状态条/导航） */
  topBar?: ReactNode;
  /** 底部固定区域（操作栏） */
  bottomBar?: ReactNode;
  /** 是否显示背景网格纹理 */
  gridBg?: boolean;
  className?: string;
}

/**
 * 移动端布局壳：最大宽度 480px 居中，桌面端两侧留深色背景。
 * 顶部/底部固定，中间内容滚动。
 */
export function AppShell({ children, topBar, bottomBar, gridBg, className }: AppShellProps) {
  return (
    <div className="relative min-h-dvh w-full bg-ink-base text-type-primary">
      {/* 桌面端两侧装饰 */}
      <div className="pointer-events-none fixed inset-y-0 left-0 hidden w-1/2 bg-ink-base md:block">
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>
      <div className="pointer-events-none fixed inset-y-0 right-0 hidden w-1/2 bg-ink-base md:block">
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-ink-base noise">
        {topBar && (
          <header className="sticky top-0 z-30 border-b border-ink-border bg-ink-base/95 backdrop-blur-md safe-top">
            {topBar}
          </header>
        )}
        <main className={cn("flex-1", className)}>{children}</main>
        {bottomBar && (
          <footer className="sticky bottom-0 z-30 border-t border-ink-border bg-ink-base/95 backdrop-blur-md safe-bottom">
            {bottomBar}
          </footer>
        )}
      </div>
    </div>
  );
}

interface TopBarProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backFallbackTo?: string;
  right?: ReactNode;
  /** 顶栏下方附加内容（如状态条） */
  below?: ReactNode;
}

export function TopBar({ title, subtitle, onBack, backFallbackTo, right, below }: TopBarProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) return onBack();
    if (backFallbackTo) navigate(backFallbackTo);
    else navigate(-1);
  };
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3">
        {onBack !== null && (onBack || backFallbackTo) && (
          <button
            onClick={handleBack}
            aria-label="返回"
            className="touchable -ml-1 flex items-center justify-center rounded-lg text-type-secondary hover:bg-ink-hover hover:text-type-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-type-primary">{title}</div>
          {subtitle && (
            <div className="truncate text-2xs text-type-secondary">{subtitle}</div>
          )}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
      {below}
    </div>
  );
}
