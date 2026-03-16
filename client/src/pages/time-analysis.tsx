import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDecimal, formatHours, formatPercent } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from "recharts";
import { Clock, Calendar, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight, Settings, Heart, Sun, Activity } from "lucide-react";
import type { EnhancedDashboardData } from "@shared/schema";

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

const DAY_COLORS: Record<string, string> = {
  Mo: "hsl(var(--chart-1))",
  Di: "hsl(var(--chart-1))",
  Mi: "hsl(var(--chart-2))",
  Do: "hsl(var(--chart-2))",
  Fr: "hsl(var(--chart-3))",
  Sa: "hsl(var(--chart-5))",
  So: "hsl(var(--chart-5))",
};

export default function TimeAnalysisPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const { data, isLoading, error } = useQuery<EnhancedDashboardData & { isDemo?: boolean }>({
    queryKey: ["/api/dashboard", `?year=${year}`],
    refetchOnMount: true,
    staleTime: 60000,
  });

  const isDemo = (data as any)?.isDemo;
  const wlb = data?.workLifeBalance;

  const burnoutLabel = wlb?.burnoutRisk === "low" ? "Niedrig" : wlb?.burnoutRisk === "medium" ? "Mittel" : "Hoch";
  const burnoutVariant = wlb?.burnoutRisk === "high" ? "destructive" : wlb?.burnoutRisk === "medium" ? "secondary" : "default";
  const trendLabel = wlb?.weeklyTrend === "improving" ? "Besser werdend" : wlb?.weeklyTrend === "stable" ? "Stabil" : "Verschlechternd";
  const TrendIcon = wlb?.weeklyTrend === "improving" ? TrendingUp : wlb?.weeklyTrend === "declining" ? TrendingDown : Activity;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1440px] mx-auto" data-testid="time-analysis-page">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Zeitanalyse</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isDemo && (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <AlertTriangle size={12} />
                Demo-Daten —{" "}
                <Link href="/settings" className="underline underline-offset-2 hover:text-amber-400">
                  API-Keys konfigurieren
                </Link>
              </span>
            )}
            {!isDemo && !isLoading && "Detaillierte Zeitauswertung"}
          </p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[90px] h-8 text-xs" data-testid="select-year-time">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Work-Life Balance Card */}
      <div className="rounded-lg border border-card-border bg-card p-5" data-testid="work-life-balance-card">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={14} className="text-pink-500" />
          <h3 className="text-sm font-semibold text-card-foreground">Work-Life-Balance</h3>
          {wlb && (
            <Badge variant={burnoutVariant as any} className="text-[10px] ml-auto" data-testid="burnout-risk-badge">
              Burnout-Risiko: {burnoutLabel}
            </Badge>
          )}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : wlb ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> Ø Tagesstunden</p>
              <p className="text-lg font-bold tabular-nums text-card-foreground">{formatDecimal(wlb.avgDailyHours)} h</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Sun size={10} /> Wochenend-Anteil</p>
              <p className="text-lg font-bold tabular-nums text-card-foreground">{formatPercent(wlb.weekendHoursPercent)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Calendar size={10} /> Längster Streak</p>
              <p className="text-lg font-bold tabular-nums text-card-foreground">{wlb.longestStreak} Tage</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendIcon size={10} /> Wochen-Trend</p>
              <p className="text-lg font-bold tabular-nums text-card-foreground">{trendLabel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Activity size={10} /> Ist vs. Ziel</p>
              <p className={`text-lg font-bold tabular-nums ${wlb.actualVsTarget > 110 ? "text-red-500" : wlb.actualVsTarget > 100 ? "text-amber-500" : "text-emerald-500"}`}>
                {formatPercent(wlb.actualVsTarget)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock size={12} /> Gesamtstunden
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="text-lg font-bold tabular-nums text-card-foreground">
              {formatHours(data?.time.totalHours || 0)}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Calendar size={12} /> Ø Woche
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="text-lg font-bold tabular-nums text-card-foreground">
              {formatHours(data?.time.weeklyAverage || 0)}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <TrendingUp size={12} /> Projekte
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="text-lg font-bold tabular-nums text-card-foreground">
              {data?.time.byProject.length || 0}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-card-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock size={12} /> Ø Tag
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="text-lg font-bold tabular-nums text-card-foreground">
              {formatHours(data?.time.weeklyAverage ? data.time.weeklyAverage / 5 : 0)}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hours by Day of Week */}
        <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-day-of-week">
          <h3 className="text-sm font-semibold text-card-foreground mb-1">Stunden nach Wochentag</h3>
          <p className="text-xs text-muted-foreground mb-4">Durchschnittliche Arbeitszeit pro Wochentag</p>
          {isLoading ? (
            <Skeleton className="h-[240px] w-full rounded-md" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.time.byDay || []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" name="Stunden" radius={[4, 4, 0, 0]} barSize={28}>
                    {(data?.time.byDay || []).map((entry, index) => (
                      <Cell key={index} fill={DAY_COLORS[entry.day] || "hsl(var(--chart-1))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Hours Trend */}
        <div className="rounded-lg border border-card-border bg-card p-5" data-testid="chart-hours-trend">
          <h3 className="text-sm font-semibold text-card-foreground mb-1">Stunden-Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Wöchentliche Arbeitszeit im Zeitverlauf</p>
          {isLoading ? (
            <Skeleton className="h-[240px] w-full rounded-md" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.time.byWeek || []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    dataKey="hours"
                    name="Stunden"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-1))", r: 3 }}
                    activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Projects Table */}
      {data && data.time.byProject.length > 0 && (
        <div className="rounded-lg border border-card-border bg-card overflow-hidden" data-testid="table-top-projects">
          <div className="px-5 py-3 border-b border-card-border">
            <h3 className="text-sm font-semibold text-card-foreground">Top Projekte nach Stunden</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-card-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Projekt</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Stunden</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Anteil</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">Verteilung</th>
                </tr>
              </thead>
              <tbody>
                {data.time.byProject.map((project, i) => (
                  <tr key={i} className="border-b border-card-border/50 last:border-0 hover:bg-muted/20 transition-colors" data-testid={`row-project-${i}`}>
                    <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <span className="font-medium text-card-foreground">{project.project}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-card-foreground">{formatDecimal(project.hours)} h</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {data.time.totalHours > 0 ? formatDecimal((project.hours / data.time.totalHours) * 100) : "0"}%
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${data.time.totalHours > 0 ? (project.hours / data.time.totalHours) * 100 : 0}%`,
                            backgroundColor: project.color,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !data && !error && (
        <div className="rounded-lg border border-card-border bg-card p-12 text-center" data-testid="time-empty-state">
          <Settings size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold text-card-foreground mb-2">Keine Zeitdaten verfügbar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Verbinde Clockify, um deine Zeiterfassung zu analysieren.
          </p>
          <Link href="/settings">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              <ArrowUpRight size={14} />
              Einstellungen öffnen
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
