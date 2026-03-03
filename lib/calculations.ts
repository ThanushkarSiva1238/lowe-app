import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type Currency = "GBP" | "USD";
export type AccountCurrency = "GBP" | "USD" | "LKR";

export interface ExchangeRates {
  gbp_rate: number;
  usd_rate: number;
}

export const getInvoiceValueLkr = (
  commercialValue: number,
  currency: Currency,
  rates: ExchangeRates,
) => {
  if (currency === "GBP") return commercialValue * rates.gbp_rate;
  return commercialValue * rates.usd_rate;
};

export const convertToLkr = (
  amount: number,
  currency: AccountCurrency,
  rates: ExchangeRates,
) => {
  if (currency === "LKR") return amount;
  return getInvoiceValueLkr(amount, currency, rates);
};

export const getDailyExchangeRates = async (
  date: string | null,
): Promise<ExchangeRates> => {
  const supabase = createServerSupabaseClient();

  const baseDate =
    date && date.length >= 10 ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const [{ data: settings }, { data: daily }] = await Promise.all([
    supabase.from("settings").select("gbp_rate, usd_rate").eq("id", 1).maybeSingle(),
    supabase
      .from("exchange_rate_daily")
      .select("rate_date, gbp_rate, usd_rate")
      .lte("rate_date", baseDate)
      .order("rate_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const fallbackGbp = Number(settings?.gbp_rate ?? 400);
  const fallbackUsd = Number(settings?.usd_rate ?? 300);

  return {
    gbp_rate: Number(daily?.gbp_rate ?? fallbackGbp),
    usd_rate: Number(daily?.usd_rate ?? fallbackUsd),
  };
};

export const getShipmentProfit = (params: {
  invoiceLkr: number;
  billsTotal: number;
  processingCost: number;
  freightCost: number;
}) => {
  const { invoiceLkr, billsTotal, processingCost, freightCost } = params;
  return invoiceLkr - (billsTotal + processingCost + freightCost);
};

export const getSupplierBalance = (params: {
  openingBalance: number;
  billTotal: number;
  payTotal: number;
}) => {
  const { openingBalance, billTotal, payTotal } = params;
  // Balance is maintained in the supplier's original account currency.
  return openingBalance + billTotal - payTotal;
};

export const getConsigneeBalance = (params: {
  openingBalance: number;
  invoiceTotal: number;
  receiveTotal: number;
}) => {
  const { openingBalance, invoiceTotal, receiveTotal } = params;
  // Balance is maintained in the consignee's original account currency.
  return openingBalance + invoiceTotal - receiveTotal;
};

export const getWeightDifference = (params: {
  requestedWeight: number;
  billedWeightTotal: number;
}) => {
  const { requestedWeight, billedWeightTotal } = params;
  return requestedWeight - billedWeightTotal;
};

export interface KpiInput {
  totalRevenue: number;
  totalExpense: number;
  totalWeight: number;
  totalReceived: number;
  totalOutstanding: number;
}

export interface Kpis {
  profitMarginPct: number;
  costEfficiencyRatio: number;
  revenuePerKg: number;
  expensePerKg: number;
  paymentRecoveryRate: number;
  outstandingRatio: number;
}

export const getKpis = (input: KpiInput): Kpis => {
  const {
    totalRevenue,
    totalExpense,
    totalWeight,
    totalReceived,
    totalOutstanding,
  } = input;

  const profit = totalRevenue - totalExpense;

  return {
    profitMarginPct: totalRevenue ? (profit / totalRevenue) * 100 : 0,
    costEfficiencyRatio: totalExpense ? totalRevenue / totalExpense : 0,
    revenuePerKg: totalWeight ? totalRevenue / totalWeight : 0,
    expensePerKg: totalWeight ? totalExpense / totalWeight : 0,
    paymentRecoveryRate: totalRevenue ? (totalReceived / totalRevenue) * 100 : 0,
    outstandingRatio: totalRevenue
      ? (totalOutstanding / totalRevenue) * 100
      : 0,
  };
};

export interface MonthlyPoint {
  month: string; // YYYY-MM
  net_profit: number;
}

export interface ForecastResult {
  movingAverageNext: number;
  regressionNext1: number;
  regressionNext3: number;
}

export const getProfitForecast = (points: MonthlyPoint[]): ForecastResult => {
  if (!points.length) {
    return { movingAverageNext: 0, regressionNext1: 0, regressionNext3: 0 };
  }

  const lastPoints = points.slice(-3);
  const movingAverageNext =
    lastPoints.reduce((sum, p) => sum + p.net_profit, 0) /
    lastPoints.length;

  const n = points.length;
  const xs = points.map((_, idx) => idx + 1);
  const ys = points.map((p) => p.net_profit);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i]!, 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = n ? sumY / n - (slope * sumX) / n : 0;

  const nextIndex = n + 1;
  const regressionNext1 = intercept + slope * nextIndex;
  const regressionNext3 =
    (intercept + slope * nextIndex +
      intercept + slope * (nextIndex + 1) +
      intercept + slope * (nextIndex + 2)) /
    3;

  return { movingAverageNext, regressionNext1, regressionNext3 };
};

export const getProfitColor = (profit: number) =>
  profit >= 0 ? "text-emerald-600" : "text-red-600";

export const getSupplierBalanceColor = (balance: number) =>
  balance > 0 ? "text-red-600" : "text-emerald-600";

export const getConsigneeBalanceColor = (balance: number) =>
  balance > 0 ? "text-emerald-600" : "text-red-600";

export const getWeightDiffColor = (diff: number) => {
  if (diff === 0) return "text-emerald-600";
  if (diff > 0) return "text-sky-600";
  return "text-red-600";
};

