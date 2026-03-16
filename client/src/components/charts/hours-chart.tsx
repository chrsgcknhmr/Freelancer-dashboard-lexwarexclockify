import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDecimal } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface HoursChartProps {
  data: { week: string; hours: number }[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-md">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums text-foreground">{formatDecimal(entry.value)} h</span>
        </div>
      ))}
    </div>
  );
}

export function HoursChart({ data, loading }: HoursChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-hours-skeleton">
        <Skeleton className="h-4 w-36 mb-6" />
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-hours">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Stunden pro Woche</h3>
      <p className="text-xs text-muted-foreground mb-4">Erfasste Arbeitszeit nach Kalenderwoche</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" name="Stunden" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
