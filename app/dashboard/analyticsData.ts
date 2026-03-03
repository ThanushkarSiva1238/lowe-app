import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getKpis,
  getProfitForecast,
  type Kpis,
  type MonthlyPoint,
} from "@/lib/calculations";

export type AlertSeverity = "info" | "warning" | "error";

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
  relatedType?: "shipment" | "supplier" | "consignee";
  relatedId?: string | number;
}

export interface DashboardRecommendation {
  id: string;
  message: string;
  relatedType?: "supplier" | "consignee" | "global";
  relatedId?: string | number;
}

export interface MonthlyProfitRow extends MonthlyPoint {
  shipment_count: number;
  total_revenue_lkr: number;
  total_expense_lkr: number;
}

export interface RecentShipmentRow {
  awb_no: string;
  date: string | null;
  consignee_name: string | null;
  invoice_lkr: number;
  profit_lkr: number;
  weight_difference: number;
}

export interface SupplierSummaryRow {
  supp_id: number;
  supplier_name: string;
  total_bills_lkr: number;
  total_weight: number;
  avg_cost_per_kg: number | null;
}

export interface ConsigneeSummaryRow {
  con_id: number;
  consignee_name: string;
  total_shipments: number;
  total_revenue_lkr: number;
  avg_profit_per_shipment_lkr: number | null;
  avg_payment_delay_days: number | null;
}

export interface DashboardAnalytics {
  kpis: Kpis;
  totalShipments: number;
  totalProfitLkr: number;
  supplierOutstandingLkr: number;
  consigneeOutstandingLkr: number;
  monthlyProfit: MonthlyProfitRow[];
  forecast: ReturnType<typeof getProfitForecast>;
  alerts: DashboardAlert[];
  recommendations: DashboardRecommendation[];
  recentShipments: RecentShipmentRow[];
  errorMessage?: string | null;
}

export async function loadDashboardAnalytics(): Promise<DashboardAnalytics> {
  const supabase = createServerSupabaseClient();

  const [
    { data: monthly, error: monthlyError },
    { data: allShipments, error: shipmentsError },
    { data: supplierSummary, error: supplierSummaryError },
    { data: consigneeSummary, error: consigneeSummaryError },
    { data: supplierRows, error: supplierRowsError },
    { data: supplierBills, error: supplierBillsError },
    { data: supplierPays, error: supplierPaysError },
    { data: consigneeRows, error: consigneeRowsError },
    { data: shipmentAgg, error: shipmentAggError },
    { data: receiptRows, error: receiptRowsError },
  ] = await Promise.all([
    supabase
      .from("monthly_profit_view")
      .select(
        "month, shipment_count, total_revenue_lkr, total_expense_lkr, net_profit_lkr",
      )
      .order("month", { ascending: true }),
    supabase
      .from("shipment_financials_view")
      .select(
        "awb_no, date, consignee_name, invoice_lkr, profit_lkr, weight_difference",
      )
      .order("date", { ascending: false }),
    supabase
      .from("supplier_summary_view")
      .select(
        "supp_id, supplier_name, total_bills_lkr, total_weight, avg_cost_per_kg",
      )
      .order("supplier_name", { ascending: true }),
    supabase
      .from("consignee_summary_view")
      .select(
        "con_id, consignee_name, total_shipments, total_revenue_lkr, avg_profit_per_shipment_lkr, avg_payment_delay_days",
      )
      .order("consignee_name", { ascending: true }),
    supabase.from("supplier").select("supp_id, opening_balance"),
    supabase.from("bill").select("supp_id, amount"),
    supabase.from("pay").select("supp_id, amount"),
    supabase.from("consignee").select("con_id, opening_balance"),
    supabase
      .from("shipment_financials_view")
      .select("sum(billed_weight_total)")
      .maybeSingle(),
    supabase.from("receive").select("con_id, amount"),
  ]);

  const loadErrors = [
    monthlyError,
    shipmentsError,
    supplierSummaryError,
    consigneeSummaryError,
    supplierRowsError,
    supplierBillsError,
    supplierPaysError,
    consigneeRowsError,
    shipmentAggError,
    receiptRowsError,
  ].filter(Boolean);

  const errorMessage = loadErrors.length
    ? "Some analytics data could not be loaded. Please try again later."
    : null;

  const monthlyRows =
    (monthly as {
      month: string;
      shipment_count: number;
      total_revenue_lkr: number;
      total_expense_lkr: number;
      net_profit_lkr: number;
    }[]) ?? [];

  const allShipmentRows =
    (allShipments as {
      awb_no: string;
      date: string | null;
      consignee_name: string | null;
      invoice_lkr: number | null;
      profit_lkr: number | null;
      weight_difference: number | null;
    }[]) ?? [];

  const supplierSummaryRows =
    (supplierSummary as {
      supp_id: number;
      supplier_name: string;
      total_bills_lkr: number | null;
      total_weight: number | null;
      avg_cost_per_kg: number | null;
    }[]) ?? [];

  const consigneeSummaryRows =
    (consigneeSummary as {
      con_id: number;
      consignee_name: string;
      total_shipments: number | null;
      total_revenue_lkr: number | null;
      avg_profit_per_shipment_lkr: number | null;
      avg_payment_delay_days: number | null;
    }[]) ?? [];

  const supplierOpening =
    (supplierRows as { supp_id: number; opening_balance: number | null }[]) ??
    [];
  const billRows =
    (supplierBills as { supp_id: number | null; amount: number | null }[]) ??
    [];
  const payRows =
    (supplierPays as { supp_id: number | null; amount: number | null }[]) ??
    [];

  const consigneeOpening =
    (consigneeRows as { con_id: number; opening_balance: number | null }[]) ??
    [];

  const receiveRows =
    (receiptRows as { con_id: number | null; amount: number | null }[]) ?? [];

  const totalWeight =
    shipmentAgg && "sum" in shipmentAgg && shipmentAgg.sum != null
      ? Number(shipmentAgg.sum)
      : 0;

  const totalReceived = receiveRows.reduce(
    (sum, r) => sum + Number(r.amount ?? 0),
    0,
  );

  const totalRevenue = monthlyRows.reduce(
    (sum, m) => sum + Number(m.total_revenue_lkr ?? 0),
    0,
  );
  const totalExpense = monthlyRows.reduce(
    (sum, m) => sum + Number(m.total_expense_lkr ?? 0),
    0,
  );
  const totalProfitLkr = monthlyRows.reduce(
    (sum, m) => sum + Number(m.net_profit_lkr ?? 0),
    0,
  );
  const totalShipments = monthlyRows.reduce(
    (sum, m) => sum + Number(m.shipment_count ?? 0),
    0,
  );

  const supplierBalanceById = new Map<number, number>();
  for (const s of supplierOpening) {
    supplierBalanceById.set(s.supp_id, Number(s.opening_balance ?? 0));
  }
  for (const b of billRows) {
    if (b.supp_id == null) continue;
    const prev = supplierBalanceById.get(b.supp_id) ?? 0;
    supplierBalanceById.set(b.supp_id, prev + Number(b.amount ?? 0));
  }
  for (const p of payRows) {
    if (p.supp_id == null) continue;
    const prev = supplierBalanceById.get(p.supp_id) ?? 0;
    supplierBalanceById.set(p.supp_id, prev - Number(p.amount ?? 0));
  }

  let supplierOutstandingLkr = 0;
  for (const balance of supplierBalanceById.values()) {
    if (balance > 0) {
      supplierOutstandingLkr += balance;
    }
  }

  const consigneeBalanceById = new Map<number, number>();
  for (const c of consigneeOpening) {
    consigneeBalanceById.set(c.con_id, Number(c.opening_balance ?? 0));
  }
  for (const s of allShipmentRows) {
    const match = consigneeSummaryRows.find(
      (cs) => cs.consignee_name === s.consignee_name,
    );
    if (!match) continue;
    const prev = consigneeBalanceById.get(match.con_id) ?? 0;
    consigneeBalanceById.set(
      match.con_id,
      prev + Number(s.invoice_lkr ?? 0),
    );
  }
  for (const r of receiveRows) {
    if (r.con_id == null) continue;
    const prev = consigneeBalanceById.get(r.con_id) ?? 0;
    consigneeBalanceById.set(
      r.con_id,
      prev - Number(r.amount ?? 0),
    );
  }

  let consigneeOutstandingLkr = 0;
  for (const balance of consigneeBalanceById.values()) {
    if (balance > 0) {
      consigneeOutstandingLkr += balance;
    }
  }

  const kpis = getKpis({
    totalRevenue,
    totalExpense,
    totalWeight,
    totalReceived,
    totalOutstanding: supplierOutstandingLkr + consigneeOutstandingLkr,
  });

  const monthlyPoints: MonthlyPoint[] = monthlyRows.map((m) => ({
    month: m.month,
    net_profit: Number(m.net_profit_lkr ?? 0),
  }));
  const forecast = getProfitForecast(monthlyPoints);

  const alerts: DashboardAlert[] = [];

  for (const s of allShipmentRows) {
    const invoice = Number(s.invoice_lkr ?? 0);
    const profit = Number(s.profit_lkr ?? 0);
    const diff = Number(s.weight_difference ?? 0);
    const margin = invoice ? profit / invoice : 0;

    if (invoice > 0 && margin < 0.05 && profit >= 0) {
      alerts.push({
        id: `low-margin-${s.awb_no}`,
        severity: "warning",
        message: `Shipment AWB ${s.awb_no} has low margin (${(margin * 100).toFixed(1)}%).`,
        relatedType: "shipment",
        relatedId: s.awb_no,
      });
    }

    if (profit < 0) {
      alerts.push({
        id: `loss-${s.awb_no}`,
        severity: "error",
        message: `Shipment AWB ${s.awb_no} is in loss (${profit.toFixed(0)} LKR).`,
        relatedType: "shipment",
        relatedId: s.awb_no,
      });
    }

    if (diff < 0) {
      alerts.push({
        id: `overweight-${s.awb_no}`,
        severity: "warning",
        message: `Shipment AWB ${s.awb_no} has overweight billed vs requested (${diff.toFixed(2)} kg).`,
        relatedType: "shipment",
        relatedId: s.awb_no,
      });
    }
  }

  for (const [suppId, balance] of supplierBalanceById.entries()) {
    if (balance > 500_000) {
      const supplierName =
        supplierSummaryRows.find((s) => s.supp_id === suppId)
          ?.supplier_name ?? `Supplier #${suppId}`;
      alerts.push({
        id: `supplier-high-${suppId}`,
        severity: "warning",
        message: `Outstanding balance to ${supplierName} is high (${balance.toFixed(0)} LKR).`,
        relatedType: "supplier",
        relatedId: suppId,
      });
    }
  }

  const recommendations: DashboardRecommendation[] = [];

  const lastThree = monthlyPoints.slice(-3);
  if (
    lastThree.length === 3 &&
    lastThree[0] &&
    lastThree[1] &&
    lastThree[2] &&
    lastThree[0].net_profit > lastThree[1].net_profit &&
    lastThree[1].net_profit > lastThree[2].net_profit
  ) {
    recommendations.push({
      id: "profit-trend-down",
      message:
        "Profit margin has decreased for the last three months. Review pricing and cost structure.",
      relatedType: "global",
    });
  }

  const slowConsignees = consigneeSummaryRows.filter(
    (c) => (c.avg_payment_delay_days ?? 0) > 30,
  );
  for (const c of slowConsignees) {
    recommendations.push({
      id: `consignee-delay-${c.con_id}`,
      message: `Consignee ${c.consignee_name} has slow payments (average ${(c.avg_payment_delay_days ?? 0).toFixed(1)} days). Consider follow-up reminders.`,
      relatedType: "consignee",
      relatedId: c.con_id,
    });
  }

  const sortedSuppliers = [...supplierSummaryRows].sort(
    (a, b) => (b.avg_cost_per_kg ?? 0) - (a.avg_cost_per_kg ?? 0),
  );
  const topSuppliers = sortedSuppliers.slice(0, 3).filter(
    (s) => (s.avg_cost_per_kg ?? 0) > 0,
  );
  for (const s of topSuppliers) {
    recommendations.push({
      id: `supplier-cost-${s.supp_id}`,
      message: `Review rates with ${s.supplier_name}; average cost/kg is ${(s.avg_cost_per_kg ?? 0).toFixed(2)} LKR.`,
      relatedType: "supplier",
      relatedId: s.supp_id,
    });
  }

  const recentShipments: RecentShipmentRow[] = allShipmentRows
    .slice(0, 10)
    .map((s) => ({
      awb_no: s.awb_no,
      date: s.date,
      consignee_name: s.consignee_name,
      invoice_lkr: Number(s.invoice_lkr ?? 0),
      profit_lkr: Number(s.profit_lkr ?? 0),
      weight_difference: Number(s.weight_difference ?? 0),
    }));

  return {
    kpis,
    totalShipments,
    totalProfitLkr,
    supplierOutstandingLkr,
    consigneeOutstandingLkr,
    monthlyProfit: monthlyRows.map((m) => ({
      month: m.month,
      net_profit: Number(m.net_profit_lkr ?? 0),
      shipment_count: Number(m.shipment_count ?? 0),
      total_revenue_lkr: Number(m.total_revenue_lkr ?? 0),
      total_expense_lkr: Number(m.total_expense_lkr ?? 0),
    })),
    forecast,
    alerts,
    recommendations,
    recentShipments,
  };
}

