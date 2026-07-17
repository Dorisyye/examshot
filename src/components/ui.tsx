import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */
type Variant = "primary" | "ok" | "warn" | "bad" | "ghost" | "outline" | "info";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary:
    "bg-info text-ink-base hover:brightness-110 active:brightness-95 font-semibold",
  ok: "bg-ok text-ink-base hover:brightness-110 active:brightness-95 font-semibold",
  warn: "bg-warn text-ink-base hover:brightness-110 active:brightness-95 font-semibold",
  bad: "bg-bad text-ink-base hover:brightness-110 active:brightness-95 font-semibold",
  info: "bg-info-soft text-info border border-info/30 hover:bg-info/10",
  ghost: "bg-transparent text-type-secondary hover:bg-ink-hover hover:text-type-primary",
  outline:
    "bg-transparent text-type-primary border border-ink-border hover:bg-ink-hover hover:border-type-muted",
};

const SIZE_CLS: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-5 text-base rounded-lg gap-2",
  xl: "h-14 px-6 text-base rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", block, icon, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ---------------- IconButton ---------------- */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  label: string;
}
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", label, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "touchable inline-flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40",
        VARIANT_CLS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = "IconButton";

/* ---------------- Badge ---------------- */
type BadgeTone = "ok" | "warn" | "bad" | "info" | "neutral";
interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}
const BADGE_TONE: Record<BadgeTone, string> = {
  ok: "bg-ok-soft text-ok border-ok/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  bad: "bg-bad-soft text-bad border-bad/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-ink-hover text-type-secondary border-ink-border",
};
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide2",
        BADGE_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- ProgressBar ---------------- */
interface ProgressBarProps {
  value: number; // 0-100
  tone?: BadgeTone;
  className?: string;
  showGlow?: boolean;
}
export function ProgressBar({ value, tone = "ok", className, showGlow }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const fillColor =
    tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : tone === "bad" ? "bg-bad" : "bg-info";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-hover", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", fillColor, showGlow && "shadow-[0_0_8px_currentColor]")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------------- EmptyState ---------------- */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-border bg-ink-surface text-type-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-type-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-type-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------- Card ---------------- */
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}
export function Card({ children, className, onClick, active }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-ink-surface shadow-card transition-all",
        active ? "border-info/50" : "border-ink-border",
        onClick && "cursor-pointer hover:border-type-muted hover:bg-ink-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- TextInput ---------------- */
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, hint, className, ...rest }, ref) => (
    <label className="block">
      {label && (
        <span className="mb-1.5 block font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
          {label}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-ink-border bg-ink-base px-3.5 py-2.5 text-sm text-type-primary placeholder:text-type-muted transition-colors",
          "focus:border-info focus:outline-none focus:ring-1 focus:ring-info/40",
          className,
        )}
        {...rest}
      />
      {hint && <span className="mt-1 block text-2xs text-type-muted">{hint}</span>}
    </label>
  ),
);
TextInput.displayName = "TextInput";

/* ---------------- TextArea ---------------- */
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, className, ...rest }, ref) => (
    <label className="block">
      {label && (
        <span className="mb-1.5 block font-mono text-2xs uppercase tracking-wide2 text-type-secondary">
          {label}
        </span>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-ink-border bg-ink-base px-3.5 py-2.5 text-sm text-type-primary placeholder:text-type-muted transition-colors",
          "focus:border-info focus:outline-none focus:ring-1 focus:ring-info/40",
          "resize-y min-h-[80px]",
          className,
        )}
        {...rest}
      />
      {hint && <span className="mt-1 block text-2xs text-type-muted">{hint}</span>}
    </label>
  ),
);
TextArea.displayName = "TextArea";
