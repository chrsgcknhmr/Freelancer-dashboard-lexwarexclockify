import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { KpiCard } from "@/components/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { HoursChart } from "@/components/charts/hours-chart";
import { ClientBreakdown } from "@/components/charts/client-breakdown";
import { ProfitTrendChart } from "@/components/charts/profit-trend-chart";
import { RateByClientChart } from "@/components/charts/rate-by-client-chart";
import { Recommendations } from "@/components/recommendations";
import { formatCurrency, formatDecimal, formatPercent, formatHours } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DollarSign, Clock, TrendingUp, AlertTriangle, Users, BarChart3, ArrowUpRight,
  FileText, CalendarDays, ToggleLeft, ToggleRight, Settings, Heart, ShieldAlert,
  Wallet, PiggyBank,
} from "lucide-react";
import type { EnhancedDashboardData } from "@shared/schema";

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [showYoY, setShowYoY] = useState(false);
  const [period, setPeriod] = useState("all");

  const { data, isLoading, error } = useQuery<EnhancedDashboardData & { isDemo?: boolean }>({
    queryKey: ["/api/dashboard", `?year=${year}`],
    refetchOnMount: true,
    staleTime: 60000,
  });

  const isDemo = (data as any)?.isDemo;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1440px] mx-auto" data-testid="dashboard-page">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Dashboard</h1>
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
            {!isDemo && !isLoading && "Live-Daten aus Lexware & Clockify"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[90px] h-8 text-xs" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[80px] h-8 text-xs" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
              <SelectItem value="qtd">QTD</SelectItem>
              <SelectItem value="mtd">MTD</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setShowYoY(!showYoY)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors
              ${showYoY
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-card-border text-muted-foreground hover:text-foreground"
              }`}
            data-testid="button-yoy-toggle"
          >
            {showYoY ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            YoY
          </button>
        </div>
      </div>

      {/* Row 1: Primary KPI Cards (5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="kpi-row-primary">
        <KpiCard
          label="Umsatz"
          value={data ? formatCurrency(data.revenue.total) : "–"}
          icon={DollarSign}
          variant="default"
          delta={showYoY && data?.previousYear ? ((data.revenue.total - data.previousYear.revenue.total) / data.previousYear.revenue.total * 100) : undefined}
          deltaLabel={showYoY ? `vs. ${parseInt(year) - 1}` : undefined}
          loading={isLoading}
        />
        <KpiCard
          label="Netto-Gewinn"
          value={data?.profitTrend ? formatCurrency(data.profitTrend.avgMonthlyProfit * data.profitTrend.monthlyTrend.length) : "–"}
          subtitle={data?.profitTrend ? `${formatPercent(data.profitTrend.profitMargin)} Marge` : undefined}
          icon={PiggyBank}
          variant="success"
          loading={isLoading}
        />
        <KpiCard
          label="Stundensatz"
          value={data ? formatCurrency(data.kpis.effectiveHourlyRate) : "–"}
          icon={TrendingUp}
          variant="success"
          delta={showYoY && data?.previousYear ? ((data.kpis.effectiveHourlyRate - data.previousYear.kpis.effectiveHourlyRate) / data.previousYear.kpis.effectiveHourlyRate * 100) : undefined}
          deltaLabel={showYoY ? `vs. ${parseInt(year) - 1}` : undefined}
          loading={isLoading}
        />
        <KpiCard
          label="Offen"
          value={data ? formatCurrency(data.revenue.open) : "–"}
          subtitle={data ? `${data.kpis.invoicesOpen} Rechnungen` : undefined}
          icon={FileText}
          variant="warning"
          loading={isLoading}
        />
        <KpiCard
          label="Überfällig"
          value={data ? formatCurrency(data.revenue.overdue) : "–"}
          subtitle={data ? `${data.kpis.invoicesOverdue} Rechnungen` : undefined}
          icon={AlertTriangle}
          variant={data && data.kpis.invoicesOverdue > 0 ? "danger" : "default"}
          loading={isLoading}
        />
      </div>

      {/* Row 2: Secondary KPI Cards (4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-row-secondary">
        <KpiCard
          label="Steuer-Vorauszahlung"
          value={data?.taxEstimate ? formatCurrency(data.taxEstimate.quarterlyPrepayment) : "–"}
          subtitle={data?.taxEstimate ? `${formatPercent(data.taxEstimate.effectiveTaxRate)} eff. Steuersatz` : undefined}
          icon={Wallet}
          variant="warning"
          loading={isLoading}
        />
        <KpiCard
          label="Ø Woche"
          value={data ? formatHours(data.time.weeklyAverage) : "–"}
          subtitle={data?.workLifeBalance ? `Ziel: ${data.workLifeBalance.targetWeeklyHours}h` : undefined}
          icon={Clock}
          loading={isLoading}
        />
        <KpiCard
          label="Kundenrisiko"
          value={data?.clientHealth ? (
            data.clientHealth.concentrationRisk === "healthy" ? "Gesund" :
            data.clientHealth.concentrationRisk === "moderate" ? "Moderat" : "Gefährlich"
          ) : "–"}
          subtitle={data?.clientHealth ? `Top-Kunde: ${formatPercent(data.clientHealth.topClientPercent)}` : undefined}
          icon={ShieldAlert}
          variant={data?.clientHealth?.concentrationRisk === "dangerous" ? "danger" : data?.clientHealth?.concentrationRisk === "moderate" ? "warning" : "success"}
          loading={isLoading}
        />
        <KpiCard
          label="Burnout-Risiko"
          value={data?.workLifeBalance ? (
            data.workLifeBalance.burnoutRisk === "low" ? "Niedrig" :
            data.workLifeBalance.burnoutRisk === "medium" ? "Mittel" : "Hoch"
          ) : "–"}
          subtitle={data?.workLifeBalance ? `${formatDecimal(data.workLifeBalance.avgDailyHours)}h/Tag` : undefined}
          icon={Heart}
          variant={data?.workLifeBalance?.burnoutRisk === "high" ? "danger" : data?.workLifeBalance?.burnoutRisk === "medium" ? "warning" : "success"}
          loading={isLoading}
        />
      </div>

      {/* Row 3: Charts Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="charts-grid">
        <ProfitTrendChart
          data={data?.profitTrend?.monthlyTrend || []}
          loading={isLoading}
        />
        <RevenueChart
          data={data?.revenue.byMonth || []}
          prevYearData={data?.previousYear?.revenue.byMonth}
          showYoY={showYoY}
          loading={isLoading}
        />
        <HoursChart data={data?.time.byWeek || []} loading={isLoading} />
        <RateByClientChart
          data={data?.clientHealth?.clientsByRate || []}
          loading={isLoading}
        />
      </div>

      {/* Row 4: Recommendations */}
      <Recommendations
        data={data?.recommendations || []}
        loading={isLoading}
      />

      {/* Row 5: Enhanced Client Table */}
      {data && data.clients.list.length > 0 && (
        <div className="rounded-lg border border-card-border bg-card overflow-hidden" data-testid="table-clients">
          <div className="px-5 py-3 border-b border-card-border">
            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Users size={14} /> Kunden-Übersicht
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-card-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kunde</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Umsatz</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Stunden</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Eff. Rate</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">% Umsatz</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.list.map((client, i) => {
                  const rateColor = client.effectiveRate >= 100
                    ? "text-emerald-500"
                    : client.effectiveRate >= 70
                    ? "text-amber-500"
                    : "text-red-500";
                  return (
                    <tr key={i} className="border-b border-card-border/50 last:border-0 hover:bg-muted/20 transition-colors" data-testid={`row-client-${i}`}>
                      <td className="px-4 py-2.5 font-medium text-card-foreground">{client.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-card-foreground">{formatCurrency(client.revenue)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatDecimal(client.hours)} h</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${rateColor}`}>{formatCurrency(client.effectiveRate)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(client.revenue / data.revenue.total) * 100}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-muted-foreground w-8">
                            {formatPercent((client.revenue / data.revenue.total) * 100)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state for no data */}
      {!isLoading && !data && !error && (
        <div className="rounded-lg border border-card-border bg-card p-12 text-center" data-testid="empty-state">
          <Settings size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold text-card-foreground mb-2">Keine Daten verfügbar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Verbinde deine Accounts, um deine Geschäftsdaten zu sehen.
          </p>
          <Link href="/settings">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              <ArrowUpRight size={14} />
              Einstellungen öffnen
            </div>
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center" data-testid="error-state">
          <AlertTriangle size={32} className="mx-auto text-destructive mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Fehler beim Laden</h3>
          <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        </div>
      )}
    </div>
  );
}
