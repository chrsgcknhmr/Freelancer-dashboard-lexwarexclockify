import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  variant?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  subtitle,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor,
  variant = "default",
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-4 space-y-3" data-testid="kpi-skeleton">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  const variantBg = {
    default: "bg-primary/8",
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    danger: "bg-red-500/10",
  }[variant];

  const variantIcon = {
    default: "text-primary",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  }[variant];

  return (
    <div
      className="rounded-lg border border-card-border bg-card p-4 transition-colors hover:border-border"
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <div className={`p-1.5 rounded-md ${variantBg}`}>
            <Icon size={14} className={iconColor || variantIcon} strokeWidth={2} />
          </div>
        )}
      </div>

      <div className="tabular-nums text-xl font-bold text-card-foreground leading-tight">
        {value}
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        {delta !== undefined && delta !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums
              ${delta > 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
          </span>
        )}
        {delta === 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            <Minus size={12} /> 0,0%
          </span>
        )}
        {(subtitle || deltaLabel) && (
          <span className="text-xs text-muted-foreground">{deltaLabel || subtitle}</span>
        )}
      </div>
    </div>
  );
}
