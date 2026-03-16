import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { DashboardData, ConnectionStatus, LexwareInvoice, EnhancedDashboardData } from "@shared/schema";

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClockifyBaseUrl(region: string): string {
  if (region === "euc1") return "https://euc1.clockify.me/api/v1";
  if (region === "euw2") return "https://euw2.clockify.me/api/v1";
  if (region === "use2") return "https://use2.clockify.me/api/v1";
  if (region === "apse2") return "https://apse2.clockify.me/api/v1";
  return "https://api.clockify.me/api/v1";
}

function getClockifyReportsUrl(region: string): string {
  if (region === "euc1") return "https://euc1.clockify.me/reports/v1";
  if (region === "euw2") return "https://euw2.clockify.me/reports/v1";
  if (region === "use2") return "https://use2.clockify.me/reports/v1";
  if (region === "apse2") return "https://apse2.clockify.me/reports/v1";
  return "https://reports.api.clockify.me/v1";
}

async function lexwareFetch(path: string, apiKey: string) {
  const res = await fetch(`https://api.lexware.io${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lexware API ${res.status}: ${text}`);
  }
  return res.json();
}

async function clockifyFetch(path: string, apiKey: string, region: string, method = "GET", body?: any) {
  const baseUrl = path.startsWith("/reports")
    ? getClockifyReportsUrl(region)
    : getClockifyBaseUrl(region);
  const url = path.startsWith("/reports")
    ? `${baseUrl}${path.replace("/reports", "")}`
    : `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clockify API ${res.status}: ${text}`);
  }
  return res.json();
}

// --- German Tax Calculation (2026 brackets) ---
function calculateGermanIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 12348) return 0;
  if (taxableIncome <= 69878) {
    const excess = taxableIncome - 12348;
    const range = 69878 - 12348;
    const avgRate = 0.14 + (0.42 - 0.14) * (excess / range) / 2;
    return excess * avgRate;
  }
  if (taxableIncome <= 277825) {
    const taxUpTo69878 = calculateGermanIncomeTax(69878);
    return taxUpTo69878 + (taxableIncome - 69878) * 0.42;
  }
  const taxUpTo277825 = calculateGermanIncomeTax(277825);
  return taxUpTo277825 + (taxableIncome - 277825) * 0.45;
}

function calculateTotalTax(grossIncome: number, expenses: number, churchTax: boolean): { incomeTax: number; soli: number; churchTaxAmount: number; total: number } {
  const taxableIncome = Math.max(0, grossIncome - expenses);
  const incomeTax = calculateGermanIncomeTax(taxableIncome);
  const soli = incomeTax > 19950 ? incomeTax * 0.055 : 0;
  const churchTaxAmount = churchTax ? incomeTax * 0.09 : 0;
  return { incomeTax, soli, churchTaxAmount, total: incomeTax + soli + churchTaxAmount };
}

function getTaxBracket(taxableIncome: number): string {
  if (taxableIncome <= 12348) return "0% (Grundfreibetrag)";
  if (taxableIncome <= 69878) return "14-42% progressiv";
  if (taxableIncome <= 277825) return "42%";
  return "45% (Reichensteuer)";
}

// --- Parse duration from Clockify ---
function parseDurationHours(dur: any): number {
  if (dur == null) return 0;
  if (typeof dur === "number") return dur / 3600;
  if (typeof dur === "string" && dur.startsWith("PT")) {
    let hours = 0;
    const hMatch = dur.match(/(\d+)H/);
    const mMatch = dur.match(/(\d+)M/);
    const sMatch = dur.match(/(\d+)S/);
    hours += hMatch ? parseInt(hMatch[1]) : 0;
    hours += mMatch ? parseInt(mMatch[1]) / 60 : 0;
    hours += sMatch ? parseInt(sMatch[1]) / 3600 : 0;
    return hours;
  }
  return 0;
}

// --- Compute enhanced metrics ---
function computeEnhancedData(
  dashboard: DashboardData & { isDemo?: boolean },
  timeEntries: any[],
  year: number,
  monthlyExpenses: number,
  churchTax: boolean,
  targetWeeklyHours: number,
): EnhancedDashboardData & { isDemo?: boolean } {
  const { revenue, time, clients, kpis } = dashboard;
  const currentMonth = new Date().getMonth() + 1;
  const monthsElapsed = year < new Date().getFullYear() ? 12 : currentMonth;

  // --- Tax Estimate ---
  const annualizedRevenue = monthsElapsed > 0 ? (revenue.total / monthsElapsed) * 12 : 0;
  const annualExpenses = monthlyExpenses > 0 ? monthlyExpenses * 12 : annualizedRevenue * 0.3;
  const taxableIncome = Math.max(0, annualizedRevenue - annualExpenses);
  const taxResult = calculateTotalTax(annualizedRevenue, annualExpenses, churchTax);
  const estimatedNetIncome = annualizedRevenue - annualExpenses - taxResult.total;
  const effectiveTaxRate = annualizedRevenue > 0 ? (taxResult.total / annualizedRevenue) * 100 : 0;

  const taxEstimate = {
    grossIncome: annualizedRevenue,
    estimatedNetIncome: Math.round(estimatedNetIncome * 100) / 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
    taxBracket: getTaxBracket(taxableIncome),
    quarterlyPrepayment: Math.round((taxResult.total / 4) * 100) / 100,
  };

  // --- Work-Life Balance ---
  const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const weekendHours = (time.byDay.find(d => d.day === "Sa")?.hours || 0) + (time.byDay.find(d => d.day === "So")?.hours || 0);
  const weekendHoursPercent = time.totalHours > 0 ? (weekendHours / time.totalHours) * 100 : 0;

  // Calculate working days and longest streak from time entries
  const workDates = new Set<string>();
  for (const entry of timeEntries) {
    const startDate = entry.timeInterval?.start || entry.start;
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        workDates.add(d.toISOString().split("T")[0]);
      }
    }
  }
  const sortedDates = Array.from(workDates).sort();
  let longestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // If no individual time entries (e.g. demo mode), estimate working days from weeks elapsed
  const weeksElapsed = Math.ceil(monthsElapsed * 4.33);
  const workingDays = workDates.size > 0 ? workDates.size : Math.max(Math.round(weeksElapsed * 5), 1);
  const avgDailyHours = time.totalHours / workingDays;
  const avgWeeklyHours = weeksElapsed > 0 ? time.totalHours / weeksElapsed : 0;

  // Burnout risk
  let burnoutRisk: "low" | "medium" | "high" = "low";
  if (avgWeeklyHours > 50) burnoutRisk = "high";
  else if (avgWeeklyHours > 42) burnoutRisk = "medium";

  // Weekly trend: compare last 4 weeks to previous 4 weeks
  const weekData = time.byWeek;
  let weeklyTrend: "improving" | "stable" | "declining" = "stable";
  if (weekData.length >= 8) {
    const recent4 = weekData.slice(-4).reduce((s, w) => s + w.hours, 0) / 4;
    const prev4 = weekData.slice(-8, -4).reduce((s, w) => s + w.hours, 0) / 4;
    if (recent4 < prev4 * 0.9) weeklyTrend = "improving";
    else if (recent4 > prev4 * 1.1) weeklyTrend = "declining";
  }

  const actualVsTarget = targetWeeklyHours > 0 ? (avgWeeklyHours / targetWeeklyHours) * 100 : 0;

  const workLifeBalance = {
    avgDailyHours: Math.round(avgDailyHours * 10) / 10,
    weekendHoursPercent: Math.round(weekendHoursPercent * 10) / 10,
    longestStreak,
    burnoutRisk,
    weeklyTrend,
    targetWeeklyHours,
    actualVsTarget: Math.round(actualVsTarget * 10) / 10,
  };

  // --- Client Health ---
  const clientList = clients.list;
  const uniqueClients = clientList.length;
  const totalRev = revenue.total || 1;
  const shares = clientList.map(c => c.revenue / totalRev);
  const hhi = shares.reduce((sum, s) => sum + s * s, 0);
  const topClientPercent = shares.length > 0 ? Math.max(...shares) * 100 : 0;
  const avgClientRevenue = uniqueClients > 0 ? totalRev / uniqueClients : 0;

  let concentrationRisk: "healthy" | "moderate" | "dangerous" = "healthy";
  if (hhi > 0.25) concentrationRisk = "dangerous";
  else if (hhi > 0.15) concentrationRisk = "moderate";

  const clientsByRate = clientList
    .map(c => ({
      name: c.name,
      rate: c.effectiveRate,
      hours: c.hours,
      revenue: c.revenue,
    }))
    .sort((a, b) => b.rate - a.rate);

  const clientHealth = {
    uniqueClients,
    clientConcentration: Math.round(hhi * 1000) / 1000,
    concentrationRisk,
    topClientPercent: Math.round(topClientPercent * 10) / 10,
    avgClientRevenue: Math.round(avgClientRevenue * 100) / 100,
    clientsByRate,
  };

  // --- Profit Trend ---
  const expensePerMonth = monthlyExpenses > 0 ? monthlyExpenses : (revenue.total > 0 ? (revenue.total * 0.3) / monthsElapsed : 0);
  const monthlyTrend = revenue.byMonth
    .filter(m => m.amount > 0 || m.paid > 0)
    .map(m => {
      const netProfit = m.amount - expensePerMonth;
      return {
        month: m.month,
        revenue: Math.round(m.amount * 100) / 100,
        estimatedExpenses: Math.round(expensePerMonth * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
      };
    });

  const profits = monthlyTrend.map(m => m.netProfit);
  const avgMonthlyProfit = profits.length > 0 ? profits.reduce((s, p) => s + p, 0) / profits.length : 0;
  const totalExpenses = expensePerMonth * monthsElapsed;
  const profitMargin = revenue.total > 0 ? ((revenue.total - totalExpenses) / revenue.total) * 100 : 0;

  let bestMonth = { month: "-", profit: 0 };
  let worstMonth = { month: "-", profit: 0 };
  if (monthlyTrend.length > 0) {
    const sorted = [...monthlyTrend].sort((a, b) => b.netProfit - a.netProfit);
    bestMonth = { month: sorted[0].month, profit: sorted[0].netProfit };
    worstMonth = { month: sorted[sorted.length - 1].month, profit: sorted[sorted.length - 1].netProfit };
  }

  const profitTrend = {
    monthlyTrend,
    avgMonthlyProfit: Math.round(avgMonthlyProfit * 100) / 100,
    bestMonth,
    worstMonth,
    profitMargin: Math.round(profitMargin * 10) / 10,
  };

  // --- Recommendations ---
  const recommendations: EnhancedDashboardData["recommendations"] = [];
  let recId = 0;

  // 1. Client concentration > 40%
  if (topClientPercent > 40) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: "risk",
      priority: "high",
      icon: "ShieldAlert",
      title: "Kundenstamm diversifizieren",
      description: `Dein Top-Kunde macht ${Math.round(topClientPercent)}% des Umsatzes aus. Diversifiziere, um Risiken zu minimieren.`,
      metric: `${Math.round(topClientPercent)}% Konzentration`,
    });
  }

  // 2. Client rate below average
  const avgRate = kpis.effectiveHourlyRate;
  for (const c of clientsByRate) {
    if (c.rate > 0 && c.rate < avgRate * 0.8) {
      recommendations.push({
        id: `rec-${recId++}`,
        category: "revenue",
        priority: "medium",
        icon: "DollarSign",
        title: `Stundensatz bei ${c.name} erhöhen`,
        description: `Effektiver Stundensatz (${Math.round(c.rate)} €/h) liegt unter dem Durchschnitt (${Math.round(avgRate)} €/h).`,
        metric: `${Math.round(c.rate)} €/h vs. Ø ${Math.round(avgRate)} €/h`,
        action: "Stundensatz anpassen",
      });
      break; // Only show for the lowest rate client
    }
  }

  // 3. Overdue invoices
  if (kpis.invoicesOverdue > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: "revenue",
      priority: "high",
      icon: "DollarSign",
      title: "Überfällige Rechnungen einfordern",
      description: `${kpis.invoicesOverdue} überfällige Rechnungen im Wert von ${Math.round(revenue.overdue)} €.`,
      metric: `${kpis.invoicesOverdue} Rechnungen`,
      action: "Mahnungen versenden",
    });
  }

  // 4. Weekly avg > 50h
  if (avgWeeklyHours > 50) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: "health",
      priority: "high",
      icon: "Heart",
      title: "Burnout-Risiko: Arbeitszeit reduzieren",
      description: `Du arbeitest durchschnittlich ${Math.round(avgWeeklyHours)} Stunden pro Woche. Reduziere auf unter 45h.`,
      metric: `Ø ${Math.round(avgWeeklyHours)}h / Woche`,
    });
  }

  // 5. < 5 unique clients
  if (uniqueClients < 5 && uniqueClients > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: "growth",
      priority: "medium",
      icon: "TrendingUp",
      title: "Neukundengewinnung priorisieren",
      description: `Nur ${uniqueClients} aktive Kunden. Mehr Kunden bedeuten weniger Abhängigkeit.`,
      metric: `${uniqueClients} Kunden`,
    });
  }

  // 6. Weekend work > 10%
  if (weekendHoursPercent > 10) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: "health",
      priority: "medium",
      icon: "Heart",
      title: "Wochenendarbeit reduzieren",
      description: `${Math.round(weekendHoursPercent)}% deiner Arbeitszeit entfällt auf Wochenenden.`,
      metric: `${Math.round(weekendHoursPercent)}% am Wochenende`,
    });
  }

  // 7. Revenue growth positive
  if (revenue.total > 0 && monthlyTrend.length >= 2) {
    const recentRevenue = monthlyTrend[monthlyTrend.length - 1].revenue;
    const firstRevenue = monthlyTrend[0].revenue;
    if (recentRevenue > firstRevenue * 1.1) {
      recommendations.push({
        id: `rec-${recId++}`,
        category: "efficiency",
        priority: "low",
        icon: "Zap",
        title: "Steuerlast optimieren",
        description: "Dein Umsatz wächst. Prüfe Möglichkeiten zur Steueroptimierung.",
        action: "Steuerberater konsultieren",
      });
    }
  }

  // 8. Profit margin declining
  if (profitMargin < 50 && revenue.total > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: "efficiency",
      priority: "medium",
      icon: "Zap",
      title: "Kosten prüfen",
      description: `Gewinnmarge liegt bei ${Math.round(profitMargin)}%. Prüfe Einsparungspotenziale.`,
      metric: `${Math.round(profitMargin)}% Marge`,
    });
  }

  return {
    ...dashboard,
    taxEstimate,
    workLifeBalance,
    clientHealth,
    profitTrend,
    recommendations,
  };
}

// --- Generate enhanced demo data ---
function generateEnhancedDemoData(year: number): EnhancedDashboardData & { isDemo: boolean } {
  const baseDemo = generateDemoData(year);
  const enhanced = computeEnhancedData(
    baseDemo,
    [], // no raw time entries for demo
    year,
    0,    // monthlyExpenses
    false, // churchTax
    40,   // targetWeeklyHours
  );
  return { ...enhanced, isDemo: true };
}

function generateDemoData(year: number): DashboardData {
  const months = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const currentMonth = new Date().getMonth();

  const byMonth = months.slice(0, Math.min(currentMonth + 1, 12)).map((month, i) => {
    const base = 4000 + Math.random() * 8000;
    return {
      month,
      amount: Math.round(base * 100) / 100,
      paid: Math.round(base * (0.7 + Math.random() * 0.3) * 100) / 100,
    };
  });

  const totalRevenue = byMonth.reduce((s, m) => s + m.amount, 0);
  const totalPaid = byMonth.reduce((s, m) => s + m.paid, 0);
  const totalOpen = totalRevenue * 0.15;
  const totalOverdue = totalRevenue * 0.05;

  const clients = [
    { client: "TechCorp GmbH", amount: totalRevenue * 0.35, percentage: 35 },
    { client: "Digital Solutions AG", amount: totalRevenue * 0.25, percentage: 25 },
    { client: "StartUp Labs", amount: totalRevenue * 0.2, percentage: 20 },
    { client: "Media House KG", amount: totalRevenue * 0.12, percentage: 12 },
    { client: "Consulting Plus", amount: totalRevenue * 0.08, percentage: 8 },
  ];

  const projects = [
    { project: "Web Platform", hours: 320, color: "hsl(210, 80%, 60%)" },
    { project: "Mobile App", hours: 180, color: "hsl(160, 60%, 50%)" },
    { project: "API Integration", hours: 140, color: "hsl(280, 55%, 65%)" },
    { project: "Dashboard UI", hours: 95, color: "hsl(35, 85%, 60%)" },
    { project: "DevOps", hours: 65, color: "hsl(350, 60%, 60%)" },
  ];

  const totalHours = projects.reduce((s, p) => s + p.hours, 0);
  const weeksElapsed = Math.ceil((currentMonth + 1) * 4.33);

  const byWeek = Array.from({ length: Math.min(weeksElapsed, 12) }, (_, i) => ({
    week: `KW ${i + 1}`,
    hours: 25 + Math.random() * 20,
  }));

  const byDay = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => ({
    day,
    hours: day === "Sa" || day === "So" ? Math.random() * 2 : 4 + Math.random() * 5,
  }));

  const prevByMonth = months.map((month) => ({
    month,
    amount: 3500 + Math.random() * 6000,
  }));
  const prevTotal = prevByMonth.reduce((s, m) => s + m.amount, 0);

  return {
    revenue: {
      total: totalRevenue,
      paid: totalPaid,
      open: totalOpen,
      overdue: totalOverdue,
      byMonth,
      byClient: clients,
    },
    time: {
      totalHours,
      weeklyAverage: totalHours / weeksElapsed,
      byProject: projects,
      byWeek,
      byDay,
    },
    clients: {
      total: 5,
      active: 4,
      list: clients.map((c) => ({
        name: c.client,
        revenue: c.amount,
        hours: Math.round(totalHours * (c.percentage / 100)),
        effectiveRate: Math.round((c.amount / (totalHours * (c.percentage / 100))) * 100) / 100,
      })),
    },
    kpis: {
      effectiveHourlyRate: Math.round((totalRevenue / totalHours) * 100) / 100,
      avgProjectValue: Math.round((totalRevenue / 5) * 100) / 100,
      revenuePerMonth: Math.round((totalRevenue / (currentMonth + 1)) * 100) / 100,
      utilizationRate: Math.round(((totalHours / weeksElapsed / 40) * 100) * 100) / 100,
      invoicesPaid: 18,
      invoicesOpen: 4,
      invoicesOverdue: 2,
    },
    previousYear: {
      revenue: { total: prevTotal, byMonth: prevByMonth },
      time: { totalHours: totalHours * 0.9 },
      kpis: {
        effectiveHourlyRate: Math.round((prevTotal / (totalHours * 0.9)) * 100) / 100,
        revenuePerMonth: Math.round((prevTotal / 12) * 100) / 100,
      },
    },
  };
}

// --- Fetch data for a given year (shared by /api/dashboard and /api/dashboard/yoy) ---
async function fetchDashboardDataForYear(
  year: number,
  settings: { lexwareApiKey: string; clockifyApiKey: string; clockifyWorkspaceId: string; clockifyUserId: string; clockifyRegion: string; monthlyExpenses: number; taxClass: string; targetWeeklyHours: number; churchTax: boolean },
): Promise<(EnhancedDashboardData & { isDemo?: boolean })> {
  const hasLexware = !!settings.lexwareApiKey;
  const hasClockify = !!settings.clockifyApiKey && !!settings.clockifyWorkspaceId;

  // If no APIs configured, return demo data
  if (!hasLexware && !hasClockify) {
    return generateEnhancedDemoData(year);
  }

  // Fetch real data from configured APIs
  let invoices: LexwareInvoice[] = [];
  let timeEntries: any[] = [];
  let projects: any[] = [];

  if (hasLexware) {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      let allVouchers: any[] = [];
      let page = 0; // Bug fix: 0-based pagination
      let hasMore = true;

      while (hasMore) {
        const data = await lexwareFetch(
          `/v1/voucherlist?voucherType=salesinvoice,salescreditnote&voucherStatus=open,paid,overdue,paidoff&startDate=${startDate}&endDate=${endDate}&page=${page}&size=100`,
          settings.lexwareApiKey
        );
        const items = data.content || data || [];
        allVouchers = allVouchers.concat(items);
        hasMore = data.last === false && items.length > 0;
        page++;
        if (hasMore) await delay(500);
      }

      // Bug fix: Use totalAmount instead of totalGrossAmount/totalNetAmount/totalTaxAmount
      invoices = allVouchers.map((v: any) => ({
        id: v.id,
        voucherNumber: v.voucherNumber || "",
        voucherDate: v.voucherDate || "",
        dueDate: v.dueDate || "",
        totalGrossAmount: v.totalAmount || 0,
        totalNetAmount: v.totalAmount || 0,
        totalTaxAmount: 0,
        currency: v.currency || "EUR",
        voucherStatus: v.voucherStatus || "unknown",
        contactId: v.contactId || "",
        contactName: v.contactName || "",
      }));

      console.log(`[Dashboard] Fetched ${invoices.length} invoices from Lexware for year ${year}`);
      if (invoices.length > 0) {
        console.log(`[Dashboard] First invoice fields:`, JSON.stringify({
          id: invoices[0].id,
          voucherNumber: invoices[0].voucherNumber,
          totalGrossAmount: invoices[0].totalGrossAmount,
          voucherStatus: invoices[0].voucherStatus,
          contactName: invoices[0].contactName,
        }));
      }
    } catch (e) {
      console.error("[Dashboard] Lexware fetch error:", e);
    }
  }

  if (hasClockify) {
    try {
      const reportData = await clockifyFetch(
        `/reports/workspaces/${settings.clockifyWorkspaceId}/reports/detailed`,
        settings.clockifyApiKey,
        settings.clockifyRegion,
        "POST",
        {
          dateRangeStart: `${year}-01-01T00:00:00.000Z`,
          dateRangeEnd: `${year}-12-31T23:59:59.999Z`,
          detailedFilter: { page: 1, pageSize: 1000 },
        }
      );
      timeEntries = reportData.timeentries || [];
      console.log(`[Dashboard] Fetched ${timeEntries.length} time entries from Clockify reports for year ${year}`);
    } catch (e) {
      console.error("[Dashboard] Clockify report error, falling back to time entries:", e);
      // Fallback to regular time entries
      try {
        timeEntries = await clockifyFetch(
          `/workspaces/${settings.clockifyWorkspaceId}/user/${settings.clockifyUserId}/time-entries?start=${year}-01-01T00:00:00Z&end=${year}-12-31T23:59:59Z&page-size=200`,
          settings.clockifyApiKey,
          settings.clockifyRegion
        );
        console.log(`[Dashboard] Fetched ${timeEntries.length} time entries from Clockify fallback for year ${year}`);
      } catch (e2) {
        console.error("[Dashboard] Clockify time entries error:", e2);
      }
    }

    try {
      projects = await clockifyFetch(
        `/workspaces/${settings.clockifyWorkspaceId}/projects?page-size=200`,
        settings.clockifyApiKey,
        settings.clockifyRegion
      );
    } catch (e) {
      console.error("[Dashboard] Clockify projects error:", e);
    }
  }

  // Aggregate invoice data
  const months = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const byMonthMap: Record<string, { amount: number; paid: number }> = {};
  months.forEach((m) => (byMonthMap[m] = { amount: 0, paid: 0 }));

  const byClientMap: Record<string, number> = {};
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalOpen = 0;
  let totalOverdue = 0;
  let paidCount = 0;
  let openCount = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    const monthIdx = new Date(inv.voucherDate).getMonth();
    const monthKey = months[monthIdx] || "Jan";
    const amount = inv.totalGrossAmount;

    totalRevenue += amount;
    byMonthMap[monthKey].amount += amount;

    const status = (inv.voucherStatus || "").toLowerCase();
    if (status === "paid" || status === "paidoff") {
      totalPaid += amount;
      byMonthMap[monthKey].paid += amount;
      paidCount++;
    } else if (status === "overdue") {
      totalOverdue += amount;
      overdueCount++;
    } else {
      totalOpen += amount;
      openCount++;
    }

    const clientName = inv.contactName || "Unbekannt";
    byClientMap[clientName] = (byClientMap[clientName] || 0) + amount;
  }

  const byClient = Object.entries(byClientMap)
    .map(([client, amount]) => ({
      client,
      amount,
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const byMonth = months.map((month) => ({
    month,
    amount: Math.round(byMonthMap[month].amount * 100) / 100,
    paid: Math.round(byMonthMap[month].paid * 100) / 100,
  }));

  // Aggregate time data
  let totalHours = 0;
  const byProjectMap: Record<string, number> = {};
  const byWeekMap: Record<string, number> = {};
  const byDayMap: Record<string, number> = { Mo: 0, Di: 0, Mi: 0, Do: 0, Fr: 0, Sa: 0, So: 0 };
  const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  for (const entry of timeEntries) {
    const dur = entry.timeInterval?.duration || entry.duration;
    const hours = parseDurationHours(dur);

    totalHours += hours;

    const projectId = entry.projectId || entry.projectName || "No Project";
    byProjectMap[projectId] = (byProjectMap[projectId] || 0) + hours;

    const startDate = new Date(entry.timeInterval?.start || entry.start || "");
    if (!isNaN(startDate.getTime())) {
      const weekNum = Math.ceil(((startDate.getTime() - new Date(`${year}-01-01`).getTime()) / 86400000 + 1) / 7);
      const weekKey = `KW ${weekNum}`;
      byWeekMap[weekKey] = (byWeekMap[weekKey] || 0) + hours;

      const dayKey = dayNames[startDate.getDay()];
      byDayMap[dayKey] = (byDayMap[dayKey] || 0) + hours;
    }
  }

  const projectColorMap: Record<string, string> = {};
  const chartColors = [
    "hsl(210, 80%, 60%)", "hsl(160, 60%, 50%)", "hsl(280, 55%, 65%)",
    "hsl(35, 85%, 60%)", "hsl(350, 60%, 60%)",
  ];
  projects.forEach((p: any, i: number) => {
    projectColorMap[p.id] = p.color || chartColors[i % chartColors.length];
    if (p.name) projectColorMap[p.name] = p.color || chartColors[i % chartColors.length];
  });

  const byProject = Object.entries(byProjectMap)
    .map(([project, hours], i) => {
      const proj = projects.find((p: any) => p.id === project || p.name === project);
      return {
        project: proj?.name || project,
        hours: Math.round(hours * 100) / 100,
        color: projectColorMap[project] || chartColors[i % chartColors.length],
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const byWeek = Object.entries(byWeekMap)
    .map(([week, hours]) => ({ week, hours: Math.round(hours * 100) / 100 }))
    .sort((a, b) => parseInt(a.week.split(" ")[1]) - parseInt(b.week.split(" ")[1]));

  const byDay = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => ({
    day,
    hours: Math.round(byDayMap[day] * 100) / 100,
  }));

  const currentMonth = new Date().getMonth() + 1;
  const weeksElapsed = Math.ceil(currentMonth * 4.33);

  // Build client list
  const clientList = byClient.map((c) => {
    const clientHours = byProject
      .filter((p) => {
        const proj = projects.find((pr: any) => pr.name === p.project);
        return proj?.clientName === c.client;
      })
      .reduce((s, p) => s + p.hours, 0) || (totalHours * (c.percentage / 100));
    return {
      name: c.client,
      revenue: c.amount,
      hours: Math.round(clientHours * 100) / 100,
      effectiveRate: clientHours > 0 ? Math.round((c.amount / clientHours) * 100) / 100 : 0,
    };
  });

  const dashboard: DashboardData & { isDemo?: boolean } = {
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      paid: Math.round(totalPaid * 100) / 100,
      open: Math.round(totalOpen * 100) / 100,
      overdue: Math.round(totalOverdue * 100) / 100,
      byMonth,
      byClient,
    },
    time: {
      totalHours: Math.round(totalHours * 100) / 100,
      weeklyAverage: weeksElapsed > 0 ? Math.round((totalHours / weeksElapsed) * 100) / 100 : 0,
      byProject,
      byWeek,
      byDay,
    },
    clients: {
      total: byClient.length,
      active: byClient.length,
      list: clientList,
    },
    kpis: {
      effectiveHourlyRate: totalHours > 0 ? Math.round((totalRevenue / totalHours) * 100) / 100 : 0,
      avgProjectValue: byProject.length > 0 ? Math.round((totalRevenue / byProject.length) * 100) / 100 : 0,
      revenuePerMonth: currentMonth > 0 ? Math.round((totalRevenue / currentMonth) * 100) / 100 : 0,
      utilizationRate: weeksElapsed > 0 ? Math.round(((totalHours / weeksElapsed / 40) * 100) * 100) / 100 : 0,
      invoicesPaid: paidCount,
      invoicesOpen: openCount,
      invoicesOverdue: overdueCount,
    },
    isDemo: false,
  };

  // Compute enhanced metrics
  return computeEnhancedData(
    dashboard,
    timeEntries,
    year,
    settings.monthlyExpenses || 0,
    settings.churchTax || false,
    settings.targetWeeklyHours || 40,
  );
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---- Settings CRUD ----
  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getSettings();
    res.json({
      ...settings,
      lexwareApiKey: maskApiKey(settings.lexwareApiKey),
      clockifyApiKey: maskApiKey(settings.clockifyApiKey),
    });
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const updated = await storage.updateSettings(req.body);
      res.json({
        ...updated,
        lexwareApiKey: maskApiKey(updated.lexwareApiKey),
        clockifyApiKey: maskApiKey(updated.clockifyApiKey),
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ---- Connection Status ----
  app.get("/api/connection-status", async (_req, res) => {
    const settings = await storage.getSettings();
    const status: ConnectionStatus = {
      lexware: { connected: false },
      clockify: { connected: false },
    };

    if (settings.lexwareApiKey) {
      try {
        const profile = await lexwareFetch("/v1/profile", settings.lexwareApiKey);
        status.lexware = { connected: true, profile: profile.companyName || "Connected" };
      } catch (e: any) {
        status.lexware = { connected: false, error: e.message };
      }
    }

    if (settings.clockifyApiKey) {
      try {
        const user = await clockifyFetch("/user", settings.clockifyApiKey, settings.clockifyRegion);
        status.clockify = {
          connected: true,
          user: user.name || user.email,
          workspace: user.activeWorkspace,
        };
        // Auto-populate workspace/user IDs if missing
        if (!settings.clockifyWorkspaceId && user.activeWorkspace) {
          await storage.updateSettings({ clockifyWorkspaceId: user.activeWorkspace });
        }
        if (!settings.clockifyUserId && user.id) {
          await storage.updateSettings({ clockifyUserId: user.id });
        }
      } catch (e: any) {
        status.clockify = { connected: false, error: e.message };
      }
    }

    res.json(status);
  });

  // ---- Lexware Proxy Routes ----
  app.get("/api/lexware/invoices", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.lexwareApiKey) {
        return res.status(400).json({ error: "Lexware API key not configured" });
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      let allVouchers: any[] = [];
      let page = 0; // Bug fix: 0-based pagination
      let hasMore = true;

      while (hasMore) {
        const data = await lexwareFetch(
          `/v1/voucherlist?voucherType=salesinvoice,salescreditnote&voucherStatus=open,paid,overdue,paidoff&startDate=${startDate}&endDate=${endDate}&page=${page}&size=100`,
          settings.lexwareApiKey
        );

        const items = data.content || data || [];
        allVouchers = allVouchers.concat(items);

        hasMore = data.last === false && items.length > 0;
        page++;

        if (hasMore) await delay(500);
      }

      // Bug fix: Map voucher list items using totalAmount
      const invoices: LexwareInvoice[] = allVouchers.map((v: any) => ({
        id: v.id,
        voucherNumber: v.voucherNumber || "",
        voucherDate: v.voucherDate || "",
        dueDate: v.dueDate || "",
        totalGrossAmount: v.totalAmount || 0,
        totalNetAmount: v.totalAmount || 0,
        totalTaxAmount: 0,
        currency: v.currency || "EUR",
        voucherStatus: v.voucherStatus || "unknown",
        contactId: v.contactId || "",
        contactName: v.contactName || "",
      }));

      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/lexware/contacts", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.lexwareApiKey) {
        return res.status(400).json({ error: "Lexware API key not configured" });
      }
      const data = await lexwareFetch("/v1/contacts?customer=true", settings.lexwareApiKey);
      res.json(data.content || data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/lexware/profile", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.lexwareApiKey) {
        return res.status(400).json({ error: "Lexware API key not configured" });
      }
      const data = await lexwareFetch("/v1/profile", settings.lexwareApiKey);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- Clockify Proxy Routes ----
  app.get("/api/clockify/user", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.clockifyApiKey) {
        return res.status(400).json({ error: "Clockify API key not configured" });
      }
      const data = await clockifyFetch("/user", settings.clockifyApiKey, settings.clockifyRegion);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/clockify/projects", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.clockifyApiKey || !settings.clockifyWorkspaceId) {
        return res.status(400).json({ error: "Clockify not fully configured" });
      }
      const data = await clockifyFetch(
        `/workspaces/${settings.clockifyWorkspaceId}/projects?page-size=200`,
        settings.clockifyApiKey,
        settings.clockifyRegion
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/clockify/clients", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.clockifyApiKey || !settings.clockifyWorkspaceId) {
        return res.status(400).json({ error: "Clockify not fully configured" });
      }
      const data = await clockifyFetch(
        `/workspaces/${settings.clockifyWorkspaceId}/clients`,
        settings.clockifyApiKey,
        settings.clockifyRegion
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/clockify/time-entries", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.clockifyApiKey || !settings.clockifyWorkspaceId || !settings.clockifyUserId) {
        return res.status(400).json({ error: "Clockify not fully configured" });
      }
      const start = req.query.start as string;
      const end = req.query.end as string;
      const data = await clockifyFetch(
        `/workspaces/${settings.clockifyWorkspaceId}/user/${settings.clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=200`,
        settings.clockifyApiKey,
        settings.clockifyRegion
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- Dashboard Aggregation ----
  app.get("/api/dashboard", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      console.log(`[Dashboard] Fetching data for year ${year}`);
      const data = await fetchDashboardDataForYear(year, settings);
      res.json(data);
    } catch (e: any) {
      console.error("[Dashboard] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ---- Dashboard YoY (fetches real data now) ----
  app.get("/api/dashboard/yoy", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      console.log(`[Dashboard YoY] Fetching data for year ${year}`);
      const data = await fetchDashboardDataForYear(year, settings);
      res.json(data);
    } catch (e: any) {
      console.error("[Dashboard YoY] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
