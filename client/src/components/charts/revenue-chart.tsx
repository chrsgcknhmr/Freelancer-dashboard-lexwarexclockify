import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Area,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueChartProps {
  data: { month: string; amount: number; paid: number }[];
  prevYearData?: { month: string; amount: number }[];
  showYoY?: boolean;
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

export function RevenueChart({ data, prevYearData, showYoY, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-revenue-skeleton">
        <Skeleton className="h-4 w-36 mb-6" />
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
    );
  }

  // Merge prevYear data for YoY comparison
  const chartData = data.map((d) => {
    const prev = prevYearData?.find((p) => p.month === d.month);
    return { ...d, prevYear: prev?.amount || 0 };
  });

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-revenue">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Umsatz nach Monat</h3>
      <p className="text-xs text-muted-foreground mb-4">Monatliche Rechnungsbeträge (brutto)</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" name="Umsatz" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="paid" name="Bezahlt" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={24} />
            {showYoY && prevYearData && (
              <Line
                dataKey="prevYear"
                name="Vorjahr"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                type="monotone"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
