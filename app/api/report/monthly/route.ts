import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getKpis } from "@/lib/calculations";
import { loadDashboardAnalytics } from "@/app/dashboard/analyticsData";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

export const runtime = "nodejs";

function parseYearMonth(search: URLSearchParams) {
  const yearParam = search.get("year");
  const monthParam = search.get("month");

  if (!yearParam || !monthParam) {
    return { error: "Missing year or month query parameter." } as const;
  }

  const year = Number(yearParam);
  const month = Number(monthParam);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return { error: "Invalid year or month value." } as const;
  }

  const monthStr = String(month).padStart(2, "0");
  return { year, month, monthStr } as const;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = parseYearMonth(searchParams);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { year, month, monthStr } = parsed;
  // monthly_profit_view.month is a DATE (first day of month)
  const monthKey = `${year}-${monthStr}-01`;

  let supabase: ReturnType<typeof createServerSupabaseClient>;
  try {
    supabase = createServerSupabaseClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.",
      },
      { status: 500 },
    );
  }

  const [
    { data: settings, error: settingsError },
    { data: monthlyRow, error: monthlyError },
    { data: shipments, error: shipmentsError },
    { data: receipts, error: receiptsError },
    dashboard,
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("company_name, company_address")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("monthly_profit_view")
      .select(
        "month, shipment_count, total_revenue_lkr, total_expense_lkr, net_profit_lkr",
      )
      .eq("month", monthKey)
      .maybeSingle(),
    (async () => {
      const firstDay = `${year}-${monthStr}-01`;
      const nextMonth =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      return supabase
        .from("shipment_financials_view")
        .select(
          "awb_no, date, consignee_name, invoice_lkr, profit_lkr, billed_weight_total, weight_difference",
        )
        .gte("date", firstDay)
        .lt("date", nextMonth)
        .order("profit_lkr", { ascending: false });
    })(),
    (async () => {
      const firstDay = `${year}-${monthStr}-01`;
      const nextMonth =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      return supabase
        .from("receive")
        .select("amount, date")
        .gte("date", firstDay)
        .lt("date", nextMonth);
    })(),
    loadDashboardAnalytics(),
  ]);

  if (settingsError) {
    return NextResponse.json(
      { error: "Failed to load company settings." },
      { status: 500 },
    );
  }

  if (monthlyError) {
    return NextResponse.json(
      { error: "Failed to load monthly summary." },
      { status: 500 },
    );
  }

  if (shipmentsError || receiptsError) {
    return NextResponse.json(
      { error: "Failed to load detailed data for the month." },
      { status: 500 },
    );
  }

  const shipmentRows =
    (shipments as {
      awb_no: string;
      date: string | null;
      consignee_name: string | null;
      invoice_lkr: number | null;
      profit_lkr: number | null;
      billed_weight_total: number | null;
      weight_difference: number | null;
    }[]) ?? [];

  const receiptRows =
    (receipts as { amount: number | null; date: string | null }[]) ?? [];

  const totalWeight = shipmentRows.reduce(
    (sum, s) => sum + Number(s.billed_weight_total ?? 0),
    0,
  );
  const totalReceived = receiptRows.reduce(
    (sum, r) => sum + Number(r.amount ?? 0),
    0,
  );

  const computedRevenue = shipmentRows.reduce(
    (sum, s) => sum + Number(s.invoice_lkr ?? 0),
    0,
  );
  const computedProfit = shipmentRows.reduce(
    (sum, s) => sum + Number(s.profit_lkr ?? 0),
    0,
  );
  const computedExpense = computedRevenue - computedProfit;

  const totalRevenue =
    monthlyRow?.total_revenue_lkr != null
      ? Number(monthlyRow.total_revenue_lkr)
      : computedRevenue;
  const totalExpense =
    monthlyRow?.total_expense_lkr != null
      ? Number(monthlyRow.total_expense_lkr)
      : computedExpense;
  const shipmentCount =
    monthlyRow?.shipment_count != null
      ? Number(monthlyRow.shipment_count)
      : shipmentRows.length;
  const netProfit =
    monthlyRow?.net_profit_lkr != null
      ? Number(monthlyRow.net_profit_lkr)
      : computedProfit;

  const totalOutstanding =
    dashboard.supplierOutstandingLkr + dashboard.consigneeOutstandingLkr;

  const kpis = getKpis({
    totalRevenue,
    totalExpense,
    totalWeight,
    totalReceived,
    totalOutstanding,
  });

  const topShipments = shipmentRows.slice(0, 5);

  const alerts: string[] = [];
  for (const s of shipmentRows) {
    const invoice = Number(s.invoice_lkr ?? 0);
    const profit = Number(s.profit_lkr ?? 0);
    const diff = Number(s.weight_difference ?? 0);
    const margin = invoice ? profit / invoice : 0;

    if (invoice > 0 && margin < 0.05 && profit >= 0) {
      alerts.push(
        `Low margin on AWB ${s.awb_no}: ${(margin * 100).toFixed(1)}% margin.`,
      );
    }

    if (profit < 0) {
      alerts.push(
        `Loss on AWB ${s.awb_no}: ${profit.toFixed(0)} LKR loss.`,
      );
    }

    if (diff < 0) {
      alerts.push(
        `Overweight on AWB ${s.awb_no}: ${diff.toFixed(2)} kg overweight billed vs requested.`,
      );
    }
  }

  const pdfBytes = await buildMonthlyReportPdf({
    year,
    month,
    monthStr,
    settings: settings ?? null,
    summary: {
      shipmentCount,
      totalRevenue,
      totalExpense,
      netProfit,
      totalWeight,
      totalReceived,
      totalOutstanding,
      kpis,
    },
    topShipments,
    alerts,
  });

  const filename = `Lowe_Holdings_Monthly_Report_${year}_${monthStr}.pdf`;

  return new Response(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

interface MonthlyReportSummary {
  shipmentCount: number;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  totalWeight: number;
  totalReceived: number;
  totalOutstanding: number;
  kpis: ReturnType<typeof getKpis>;
}

interface MonthlyReportPdfInput {
  year: number;
  month: number;
  monthStr: string;
  settings: { company_name: string | null; company_address: string | null } | null;
  summary: MonthlyReportSummary;
  topShipments: {
    awb_no: string;
    date: string | null;
    consignee_name: string | null;
    invoice_lkr: number | null;
    profit_lkr: number | null;
    billed_weight_total: number | null;
    weight_difference: number | null;
  }[];
  alerts: string[];
}

async function buildMonthlyReportPdf(input: MonthlyReportPdfInput) {
  const { year, month, monthStr, settings, summary, topShipments, alerts } =
    input;

  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] = [595.28, 841.89]; // A4 size in points
  let page = pdfDoc.addPage(pageSize);
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 60;
  const leftMargin = 50;
  const lineHeight = 14;

  const drawText = (
    text: string,
    options?: { x?: number; y?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
  ) => {
    const size = options?.size ?? 10;
    const x = options?.x ?? leftMargin;
    const yy = options?.y ?? y;
    const selectedFont = options?.bold ? boldFont : font;
    page.drawText(text, {
      x,
      y: yy,
      size,
      font: selectedFont,
      color: options?.color ?? rgb(0, 0, 0),
    });
  };

  const moveDown = (lines = 1) => {
    y -= lineHeight * lines;
  };

  // Header
  drawText(settings?.company_name || "Lowe Holdings", {
    size: 16,
    bold: true,
    color: rgb(0.1, 0.1, 0.3),
  });
  moveDown(1.5);

  if (settings?.company_address) {
    drawText(settings.company_address, { size: 9 });
    moveDown(1.5);
  }

  drawText(`Monthly Financial Report`, {
    size: 13,
    bold: true,
  });
  moveDown();
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  drawText(
    `Period: ${formatDateDdMmYyyy(periodStart)} – ${formatDateDdMmYyyy(
      periodEnd,
    )}`,
    { size: 10 },
  );
  moveDown();
  drawText(
    "All amounts in LKR. Converted from GBP/USD using daily exchange rates (fallback to current settings when missing).",
    { size: 9, color: rgb(0.25, 0.25, 0.25) },
  );
  moveDown(2);

  // Summary section
  drawText("Summary", { size: 12, bold: true });
  moveDown(1.5);

  drawText(`Shipments: ${summary.shipmentCount.toLocaleString("en-LK")}`);
  moveDown();
  drawText(
    `Total revenue (LKR): ${formatCurrency(summary.totalRevenue, "LKR")}`,
  );
  moveDown();
  drawText(
    `Total expense (LKR): ${formatCurrency(summary.totalExpense, "LKR")}`,
  );
  moveDown();
  drawText(
    `Net profit (LKR): ${formatCurrency(summary.netProfit, "LKR")}`,
  );
  moveDown();
  drawText(
    `Total billed weight: ${summary.totalWeight.toFixed(2)} kg`,
  );
  moveDown();
  drawText(
    `Receipts this month (LKR): ${formatCurrency(
      summary.totalReceived,
      "LKR",
    )}`,
  );
  moveDown();
  drawText(
    `Outstanding balances (overall, LKR): ${formatCurrency(
      summary.totalOutstanding,
      "LKR",
    )}`,
  );
  moveDown(2);

  // KPI section
  drawText("Key performance indicators", { size: 12, bold: true });
  moveDown(1.5);
  drawText(`Profit margin: ${summary.kpis.profitMarginPct.toFixed(1)}%`);
  moveDown();
  drawText(
    `Cost efficiency (revenue / expense): ${summary.kpis.costEfficiencyRatio.toFixed(2)}`,
  );
  moveDown();
  drawText(
    `Revenue per kg: ${summary.kpis.revenuePerKg.toFixed(0)} LKR/kg`,
  );
  moveDown();
  drawText(
    `Expense per kg: ${summary.kpis.expensePerKg.toFixed(0)} LKR/kg`,
  );
  moveDown();
  drawText(
    `Payment recovery: ${summary.kpis.paymentRecoveryRate.toFixed(1)}%`,
  );
  moveDown();
  drawText(
    `Outstanding ratio: ${summary.kpis.outstandingRatio.toFixed(1)}%`,
  );
  moveDown(2);

  // Top shipments
  drawText("Top 5 shipments by profit", { size: 12, bold: true });
  moveDown(1.5);

  if (topShipments.length === 0) {
    drawText("No shipments for this month.");
    moveDown(2);
  } else {
    for (const s of topShipments) {
      if (y < 100) {
        // start a new page if running out of space
        page = pdfDoc.addPage(pageSize);
        y = height - 60;
      }

      const profit = Number(s.profit_lkr ?? 0);
      const invoice = Number(s.invoice_lkr ?? 0);
      const margin = invoice ? (profit / invoice) * 100 : 0;
      const line = [
        `AWB ${s.awb_no}`,
        s.consignee_name ? ` - ${s.consignee_name}` : "",
        ` | Profit: ${profit.toFixed(0)} LKR`,
        ` | Margin: ${margin.toFixed(1)}%`,
      ].join("");
      drawText(line, { size: 9 });
      moveDown();
    }
    moveDown();
  }

  // Alerts
  drawText("Risk alerts", { size: 12, bold: true });
  moveDown(1.5);

  if (alerts.length === 0) {
    drawText("No active alerts for this month.");
  } else {
    for (const alert of alerts) {
      if (y < 80) {
        page = pdfDoc.addPage(pageSize);
        y = height - 60;
      }
      drawText(`• ${alert}`, { size: 9 });
      moveDown();
    }
  }

  return pdfDoc.save();
}

