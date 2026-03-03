import { loadDashboardAnalytics } from "./analyticsData";
import { Card } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { MonthlyProfitChart } from "@/components/charts/MonthlyProfitChart";
import { ShipmentProfitBar } from "@/components/charts/ShipmentProfitBar";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";

export const revalidate = 60;

export default async function DashboardPage() {
  let data;
  let loadError: string | null = null;

  try {
    data = await loadDashboardAnalytics();
  } catch {
    loadError =
      "We could not load analytics data right now. Please try again in a moment.";
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Analytics dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Monitor shipments, profit, and balances at a glance. Use the charts,
            KPIs, and alerts below to spot risks early and adjust pricing or
            follow-ups.
          </p>
        </div>

        <form
          action={`/api/report/monthly?year=${year}&month=${month}`}
          method="GET"
          className="flex flex-col items-start gap-1 text-xs text-slate-600 md:items-end"
        >
          <p>Download a PDF snapshot of this month&apos;s performance.</p>
          <Button type="submit" size="sm" variant="secondary">
            Download monthly PDF report
          </Button>
        </form>
      </div>

      {data && data.errorMessage && (
        <AlertBanner variant="warning" title="Analytics are partially unavailable">
          <p>
            {data.errorMessage} You can continue using the dashboard, but some
            charts or figures may be incomplete.
          </p>
        </AlertBanner>
      )}

      {loadError ? (
        <AlertBanner variant="error" title="Dashboard unavailable">
          {loadError}
        </AlertBanner>
      ) : null}

      {data && (
        <>
      <div className="grid gap-3 md:grid-cols-4">
        <Card title="Total shipments">
          <p className="text-2xl font-semibold tracking-tight">
            {data.totalShipments.toLocaleString()}
          </p>
        </Card>
        <Card title="Total profit">
          <p className="text-2xl font-semibold tracking-tight text-emerald-600">
            {formatCurrency(data.totalProfitLkr, "LKR")}
          </p>
        </Card>
        <Card title="Supplier outstanding">
          <p className="text-2xl font-semibold tracking-tight text-red-600">
            {formatCurrency(data.supplierOutstandingLkr, "LKR")}
          </p>
        </Card>
        <Card title="Consignee outstanding">
          <p className="text-2xl font-semibold tracking-tight text-sky-700">
            {formatCurrency(data.consigneeOutstandingLkr, "LKR")}
          </p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card
          title="Key performance indicators"
          description="High-level health of revenue, costs, and collections."
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Profit margin</dt>
              <dd className="font-semibold text-slate-900">
                {data.kpis.profitMarginPct.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cost efficiency</dt>
              <dd className="font-semibold text-slate-900">
                {data.kpis.costEfficiencyRatio.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Revenue per kg</dt>
              <dd className="font-semibold text-slate-900">
                {data.kpis.revenuePerKg.toFixed(0)} LKR
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Expense per kg</dt>
              <dd className="font-semibold text-slate-900">
                {data.kpis.expensePerKg.toFixed(0)} LKR
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment recovery</dt>
              <dd className="font-semibold text-slate-900">
                {data.kpis.paymentRecoveryRate.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Outstanding ratio</dt>
              <dd className="font-semibold text-slate-900">
                {data.kpis.outstandingRatio.toFixed(1)}%
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Monthly profit trend"
          description="Net profit over time. Use this to see whether things are improving."
        >
          <MonthlyProfitChart data={data.monthlyProfit} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
            <div>
              <p className="font-medium text-slate-700">
                3‑month moving average
              </p>
              <p>{formatCurrency(data.forecast.movingAverageNext, "LKR")}</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Next month (trend)</p>
              <p>{formatCurrency(data.forecast.regressionNext1, "LKR")}</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Next 3 months avg</p>
              <p>{formatCurrency(data.forecast.regressionNext3, "LKR")}</p>
            </div>
          </div>
        </Card>

        <Card
          title="Recent shipment profit"
          description="Per-shipment profit for the latest AWBs."
        >
          <ShipmentProfitBar data={data.recentShipments} />
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card
          title="Smart alerts"
          description="Automatic warnings about low margins, losses, overweight, and high balances."
        >
          {data.alerts.length === 0 ? (
            <p className="text-xs text-slate-500">
              No active alerts. All shipments and balances look healthy.
            </p>
          ) : (
            <div className="space-y-2">
              {data.alerts.map((alert) => (
                <AlertBanner
                  key={alert.id}
                  variant={
                    alert.severity === "error"
                      ? "error"
                      : alert.severity === "warning"
                        ? "warning"
                        : "info"
                  }
                >
                  {alert.message}
                </AlertBanner>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recommendations"
          description="Suggestions based on recent performance and customer / supplier behaviour."
        >
          {data.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500">
              No specific recommendations right now. Keep monitoring the trend
              and payment speeds.
            </p>
          ) : (
            <ul className="space-y-1 text-xs text-slate-800">
              {data.recommendations.map((rec) => (
                <li key={rec.id} className="flex gap-2">
                  <span className="mt-1 h-1 w-1 rounded-full bg-slate-400" />
                  <span>{rec.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
        </>
      )}
    </div>
  );
}

