import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfitTrendChartProps {
  data: { month: string; revenue: number; estimatedExpenses: number; netProfit: number }[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-md">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums text-foreground">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ProfitTrendChart({ data, loading }: ProfitTrendChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-profit-trend-skeleton">
        <Skeleton className="h-4 w-36 mb-6" />
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-profit-trend">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Gewinn-Trend</h3>
      <p className="text-xs text-muted-foreground mb-4">Umsatz vs. Netto-Gewinn pro Monat</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(180, 60%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(180, 60%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 60%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 60%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Umsatz"
              stroke="hsl(180, 60%, 50%)"
              fill="url(#colorRevenue)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="netProfit"
              name="Netto-Gewinn"
              stroke="hsl(142, 60%, 50%)"
              fill="url(#colorProfit)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
