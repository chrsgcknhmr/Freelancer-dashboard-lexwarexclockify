import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientBreakdownProps {
  data: { client: string; amount: number; percentage: number }[];
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
      <p className="text-xs font-semibold text-foreground mb-1">{d.client}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Umsatz:</span>
        <span className="font-medium tabular-nums text-foreground">{formatCurrency(d.amount)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Anteil:</span>
        <span className="font-medium tabular-nums text-foreground">{formatPercent(d.percentage)}</span>
      </div>
    </div>
  );
}

export function ClientBreakdown({ data, loading }: ClientBreakdownProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-clients-skeleton">
        <Skeleton className="h-4 w-36 mb-6" />
        <Skeleton className="h-[240px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-clients">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Umsatz nach Kunde</h3>
      <p className="text-xs text-muted-foreground mb-4">Horizontale Aufschlüsselung nach Kunden</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="client" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={110} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={18}>
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
