import { z } from "zod";

export const apiSettingsSchema = z.object({
  lexwareApiKey: z.string().default(""),
  clockifyApiKey: z.string().default(""),
  clockifyWorkspaceId: z.string().default(""),
  clockifyUserId: z.string().default(""),
  clockifyRegion: z.enum(["global", "euc1", "euw2", "use2", "apse2"]).default("global"),
  // Business settings
  monthlyExpenses: z.number().default(0),
  taxClass: z.enum(["I", "II", "III", "IV", "V"]).default("I"),
  targetWeeklyHours: z.number().default(40),
  churchTax: z.boolean().default(false),
});

export type ApiSettings = z.infer<typeof apiSettingsSchema>;

// Types for Lexware data
export interface LexwareInvoice {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  dueDate?: string;
  totalGrossAmount: number;
  totalNetAmount: number;
  totalTaxAmount: number;
  currency: string;
  voucherStatus: string;
  contactId?: string;
  contactName?: string;
}

export interface LexwareContact {
  id: string;
  company?: { name: string };
  person?: { firstName: string; lastName: string };
  emailAddresses?: { business?: string[] };
}

// Types for Clockify data
export interface ClockifyTimeEntry {
  id: string;
  description: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
  projectId?: string;
  userId: string;
}

export interface ClockifyProject {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  color: string;
  archived: boolean;
  duration: string;
  estimate?: { estimate: string };
  hourlyRate?: { amount: number; currency: string };
  budgetEstimate?: { estimate: number };
}

export interface ClockifyClient {
  id: string;
  name: string;
  workspaceId: string;
}

// Dashboard aggregated data types
export interface DashboardData {
  revenue: {
    total: number;
    paid: number;
    open: number;
    overdue: number;
    byMonth: { month: string; amount: number; paid: number }[];
    byClient: { client: string; amount: number; percentage: number }[];
  };
  time: {
    totalHours: number;
    weeklyAverage: number;
    byProject: { project: string; hours: number; color: string }[];
    byWeek: { week: string; hours: number }[];
    byDay: { day: string; hours: number }[];
  };
  clients: {
    total: number;
    active: number;
    list: { name: string; revenue: number; hours: number; effectiveRate: number }[];
  };
  kpis: {
    effectiveHourlyRate: number;
    avgProjectValue: number;
    revenuePerMonth: number;
    utilizationRate: number;
    invoicesPaid: number;
    invoicesOpen: number;
    invoicesOverdue: number;
  };
  previousYear?: {
    revenue: { total: number; byMonth: { month: string; amount: number }[] };
    time: { totalHours: number };
    kpis: { effectiveHourlyRate: number; revenuePerMonth: number };
  };
}

export interface EnhancedDashboardData extends DashboardData {
  taxEstimate: {
    grossIncome: number;
    estimatedNetIncome: number;
    effectiveTaxRate: number;
    taxBracket: string;
    quarterlyPrepayment: number;
  };
  workLifeBalance: {
    avgDailyHours: number;
    weekendHoursPercent: number;
    longestStreak: number;
    burnoutRisk: "low" | "medium" | "high";
    weeklyTrend: "improving" | "stable" | "declining";
    targetWeeklyHours: number;
    actualVsTarget: number;
  };
  clientHealth: {
    uniqueClients: number;
    clientConcentration: number;
    concentrationRisk: "healthy" | "moderate" | "dangerous";
    topClientPercent: number;
    avgClientRevenue: number;
    clientsByRate: { name: string; rate: number; hours: number; revenue: number }[];
  };
  profitTrend: {
    monthlyTrend: { month: string; revenue: number; estimatedExpenses: number; netProfit: number }[];
    avgMonthlyProfit: number;
    bestMonth: { month: string; profit: number };
    worstMonth: { month: string; profit: number };
    profitMargin: number;
  };
  recommendations: {
    id: string;
    category: "revenue" | "efficiency" | "risk" | "growth" | "health";
    priority: "high" | "medium" | "low";
    icon: string;
    title: string;
    description: string;
    metric?: string;
    action?: string;
  }[];
}

export interface ConnectionStatus {
  lexware: { connected: boolean; error?: string; profile?: string };
  clockify: { connected: boolean; error?: string; user?: string; workspace?: string };
}
