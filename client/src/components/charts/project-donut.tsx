import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatDecimal } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectDonutProps {
  data: { project: string; hours: number; color: string }[];
  loading?: boolean;
}

const FALLBACK_COLORS = [
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
      <p className="text-xs font-semibold text-foreground mb-1">{d.project}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Stunden:</span>
        <span className="font-medium tabular-nums text-foreground">{formatDecimal(d.hours)} h</span>
      </div>
    </div>
  );
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="truncate max-w-[100px]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ProjectDonut({ data, loading }: ProjectDonutProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-projects-skeleton">
        <Skeleton className="h-4 w-36 mb-6" />
        <Skeleton className="h-[240px] w-full rounded-full mx-auto" />
      </div>
    );
  }

  const totalHours = data.reduce((s, d) => s + d.hours, 0);

  return (
    <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-projects">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Stunden nach Projekt</h3>
      <p className="text-xs text-muted-foreground mb-4">Verteilung der Arbeitszeit auf Projekte</p>
      <div className="h-[240px] relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ marginTop: '-12px' }}>
          <div className="text-center">
            <div className="text-lg font-bold tabular-nums text-card-foreground">{formatDecimal(totalHours)}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Stunden</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="hours"
              nameKey="project"
              cx="50%"
              cy="45%"
              innerRadius="55%"
              outerRadius="80%"
              strokeWidth={2}
              stroke="hsl(var(--card))"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
