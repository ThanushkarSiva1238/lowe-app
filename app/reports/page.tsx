import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PrintLayout } from "@/components/print/PrintLayout";
import { PrintButton } from "@/components/print/PrintButton";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

type Mode = "monthly" | "annual";

interface ShipmentProfitRow {
  awb_no: string;
  date: string | null;
  consignee_name: string | null;
  revenue_lkr: number;
  expense_lkr: number;
  profit_lkr: number;
}

interface ProfitReport {
  mode: Mode;
  year: number;
  month?: number;
  shipments: ShipmentProfitRow[];
  total_revenue_lkr: number;
  total_expense_lkr: number;
  net_profit_lkr: number;
}

async function loadProfitReport(params: {
  mode: Mode;
  year: number;
  month?: number;
}): Promise<ProfitReport> {
  const { mode, year, month } = params;
  const supabase = createServerSupabaseClient();

  let from: string;
  let to: string;

  if (mode === "monthly") {
    const monthStr = String(month ?? 1).padStart(2, "0");
    from = `${year}-${monthStr}-01`;
    const nextMonth =
      (month ?? 1) === 12
        ? `${year + 1}-01-01`
        : `${year}-${String((month ?? 1) + 1).padStart(2, "0")}-01`;
    to = nextMonth;
  } else {
    from = `${year}-01-01`;
    to = `${year + 1}-01-01`;
  }

  const { data, error } = await supabase
    .from("shipment_financials_view")
    .select(
      "awb_no, date, consignee_name, invoice_lkr, bills_total, processing_cost, freight_cost, profit_lkr",
    )
    .gte("date", from)
    .lt("date", to)
    .order("date", { ascending: true });

  if (error || !data) {
    return {
      mode,
      year,
      month,
      shipments: [],
      total_revenue_lkr: 0,
      total_expense_lkr: 0,
      net_profit_lkr: 0,
    };
  }

  const shipments: ShipmentProfitRow[] = data.map((row: any) => {
    const revenue = Number(row.invoice_lkr ?? 0);
    const expenses =
      Number(row.bills_total ?? 0) +
      Number(row.processing_cost ?? 0) +
      Number(row.freight_cost ?? 0);
    const profit = Number(row.profit_lkr ?? revenue - expenses);

    return {
      awb_no: row.awb_no,
      date: row.date,
      consignee_name: row.consignee_name ?? null,
      revenue_lkr: revenue,
      expense_lkr: expenses,
      profit_lkr: profit,
    };
  });

  const total_revenue_lkr = shipments.reduce(
    (sum, s) => sum + s.revenue_lkr,
    0,
  );
  const total_expense_lkr = shipments.reduce(
    (sum, s) => sum + s.expense_lkr,
    0,
  );
  const net_profit_lkr = shipments.reduce(
    (sum, s) => sum + s.profit_lkr,
    0,
  );

  return {
    mode,
    year,
    month,
    shipments,
    total_revenue_lkr,
    total_expense_lkr,
    net_profit_lkr,
  };
}

async function getYearBounds(): Promise<{ minYear: number; maxYear: number }> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("shipment")
    .select("date")
    .not("date", "is", null)
    .order("date", { ascending: true })
    .limit(1);

  const firstDate =
    (data && data[0] && data[0].date && new Date(data[0].date)) || null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const minYear = firstDate && !Number.isNaN(firstDate.getTime())
    ? firstDate.getFullYear()
    : currentYear;

  return { minYear, maxYear: currentYear };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: {
    mode?: string;
    year?: string;
    month?: string;
  };
}) {
  const resolved = await Promise.resolve(searchParams ?? {});

  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  const mode: Mode =
    resolved.mode === "annual" || resolved.mode === "monthly"
      ? (resolved.mode as Mode)
      : "monthly";
  const year = Number(resolved.year ?? defaultYear);
  const month =
    mode === "monthly"
      ? Number(resolved.month ?? defaultMonth)
      : undefined;

  const [bounds, report] = await Promise.all([
    getYearBounds(),
    loadProfitReport({
      mode,
      year: Number.isFinite(year) ? year : defaultYear,
      month:
        mode === "monthly" && Number.isFinite(month)
          ? month
          : defaultMonth,
    }),
  ]);

  const safeYear = Number.isFinite(year) ? year : defaultYear;
  const safeMonth =
    mode === "monthly" && Number.isFinite(month) ? month : defaultMonth;

  const monthLabel = new Date(safeYear, (safeMonth ?? defaultMonth) - 1,
  1).toLocaleString(
    "en-GB",
    { month: "long" },
  );

  const periodLabel =
    mode === "monthly"
      ? `${monthLabel} ${safeYear}`
      : `${safeYear}`;

  const profitMargin =
    report.total_revenue_lkr !== 0
      ? (report.net_profit_lkr / report.total_revenue_lkr) * 100
      : 0;

  return (
    <div className="bg-slate-100 print:bg-white">
      <div className="mb-4 print:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Profit &amp; Loss reports
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          View shipment-level profit and loss in LKR with monthly and annual
          breakdowns. Use the filters to change the reporting period.
        </p>
      </div>

      <PrintButton />

      <PrintLayout title={`Profit & Loss report – ${periodLabel}`}>
        <section className="mb-3 print:hidden">
          <form className="flex flex-wrap items-end gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-slate-600">Mode</label>
              <select
                name="mode"
                defaultValue={mode}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-600">Year</label>
              <select
                name="year"
                defaultValue={String(safeYear)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                {Array.from(
                  { length: bounds.maxYear - bounds.minYear + 1 },
                  (_, idx) => bounds.minYear + idx,
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {mode === "monthly" && (
              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Month</label>
                <select
                  name="month"
                  defaultValue={String(safeMonth)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map(
                    (m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString("en-GB", {
                          month: "long",
                        })}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" variant="secondary">
                Apply filters
              </Button>
            </div>
          </form>
        </section>

        <section className="mb-3">
          <Card
            title="Summary (LKR)"
            description={`Converted from GBP/USD using per-day exchange rates (fallback to current settings where daily rates are missing).`}
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <dt className="text-slate-500">Total revenue</dt>
                <dd className="font-semibold text-slate-900">
                  {formatCurrency(report.total_revenue_lkr, "LKR")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Total expenses</dt>
                <dd className="font-semibold text-slate-900">
                  {formatCurrency(report.total_expense_lkr, "LKR")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Net profit</dt>
                <dd className="font-semibold text-emerald-700">
                  {formatCurrency(report.net_profit_lkr, "LKR")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Profit margin</dt>
                <dd className="font-semibold text-slate-900">
                  {profitMargin.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Shipment count</dt>
                <dd className="font-semibold text-slate-900">
                  {report.shipments.length.toLocaleString("en-LK")}
                </dd>
              </div>
            </dl>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Shipment-level breakdown (LKR)
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50">
                <th className="px-1 py-1 text-left">Date</th>
                <th className="px-1 py-1 text-left">AWB</th>
                <th className="px-1 py-1 text-left">Consignee</th>
                <th className="px-1 py-1 text-right">Revenue (LKR)</th>
                <th className="px-1 py-1 text-right">Expenses (LKR)</th>
                <th className="px-1 py-1 text-right">Profit (LKR)</th>
                <th className="px-1 py-1 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {report.shipments.map((s) => {
                const margin =
                  s.revenue_lkr !== 0
                    ? (s.profit_lkr / s.revenue_lkr) * 100
                    : 0;
                return (
                  <tr
                    key={s.awb_no + (s.date ?? "")}
                    className="border-b border-slate-100"
                  >
                    <td className="px-1 py-1">
                      {formatDateDdMmYyyy(s.date)}
                    </td>
                    <td className="px-1 py-1">{s.awb_no}</td>
                    <td className="px-1 py-1">
                      {s.consignee_name ?? "—"}
                    </td>
                    <td className="px-1 py-1 text-right">
                      {formatCurrency(s.revenue_lkr, "LKR")}
                    </td>
                    <td className="px-1 py-1 text-right">
                      {formatCurrency(s.expense_lkr, "LKR")}
                    </td>
                    <td className="px-1 py-1 text-right">
                      {formatCurrency(s.profit_lkr, "LKR")}
                    </td>
                    <td className="px-1 py-1 text-right">
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {report.shipments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-1 py-3 text-center text-[11px] text-slate-500"
                  >
                    No shipments found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="mt-2 text-[10px] text-slate-500">
            All amounts in LKR. Converted from GBP/USD at daily exchange rates
            from Settings and the daily overrides table, falling back to the
            latest configured rates when a specific date is missing.
          </p>
        </section>
      </PrintLayout>
    </div>
  );
}

