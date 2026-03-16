import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface RateByClientChartProps {
  data: { name: string; rate: number; hours: number; revenue: number }[];
  loading?: boolean;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-md">
      <p className="text-xs font-semibold text-foreground mb-1">{d.name}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Stundensatz:</span>
        <span className="font-medium tabular-nums text-foreground">{formatCurrency(d.rate)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Stunden:</span>
        <span className="font-medium tabular-nums text-foreground">{Math.round(d.hours)} h</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Umsatz:</span>
        <span className="font-medium tabular-nums text-foreground">{formatCurrency(d.revenue)}</span>
      </div>
    </div>
  );
}

export function RateByClientChart({ data, loading }: RateByClientChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-rate-by-client-skeleton">
        <Skeleton className="h-4 w-36 mb-6" />
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-rate-by-client">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Stundensatz pro Kunde</h3>
      <p className="text-xs text-muted-foreground mb-4">Effektiver Stundensatz sortiert nach Höhe</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v} €`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="rate" name="Stundensatz" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
