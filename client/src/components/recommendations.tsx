import {
  DollarSign, Zap, ShieldAlert, TrendingUp, Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnhancedDashboardData } from "@shared/schema";

type Recommendation = EnhancedDashboardData["recommendations"][number];

interface RecommendationsProps {
  data: Recommendation[];
  loading?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  revenue: DollarSign,
  efficiency: Zap,
  risk: ShieldAlert,
  growth: TrendingUp,
  health: Heart,
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: "text-emerald-500",
  efficiency: "text-amber-500",
  risk: "text-red-500",
  growth: "text-blue-500",
  health: "text-pink-500",
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-500/10", text: "text-red-500", label: "Hoch" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Mittel" },
  low: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Niedrig" },
};

export function Recommendations({ data, loading }: RecommendationsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="recommendations-skeleton">
        <Skeleton className="h-4 w-52 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="recommendations-panel">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">CFO/COO Empfehlungen</h3>
      <p className="text-xs text-muted-foreground mb-4">Handlungsempfehlungen basierend auf deinen Daten</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((rec) => {
          const Icon = CATEGORY_ICONS[rec.category] || Zap;
          const iconColor = CATEGORY_COLORS[rec.category] || "text-muted-foreground";
          const priority = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.low;

          return (
            <div
              key={rec.id}
              className="rounded-md border border-card-border/60 p-3 space-y-2 hover:border-border transition-colors"
              data-testid={`recommendation-${rec.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-muted/50">
                    <Icon size={14} className={iconColor} />
                  </div>
                  <span className="text-xs font-semibold text-card-foreground leading-tight">{rec.title}</span>
                </div>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${priority.bg} ${priority.text} border-transparent`}>
                  {priority.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
              {rec.metric && (
                <p className="text-[10px] font-medium text-muted-foreground tabular-nums">{rec.metric}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
