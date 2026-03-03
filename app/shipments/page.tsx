import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { Currency } from "@/lib/calculations";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

export const revalidate = 10;

interface ShipmentRow {
  awb_no: string;
  date: string | null;
  invoice_no: string | null;
  commercial_invoice_value: number | null;
  currency: Currency | null;
  requested_weight: number | null;
  boxes: number | null;
  consignee_name: string | null;
  bills_total: number;
  billed_weight_total: number;
  processing_cost: number;
  freight_cost: number;
}

async function loadShipments(
  month?: string,
): Promise<{
  shipments: ShipmentRow[];
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("shipment_financials_view")
    .select(
      `
      awb_no,
      date,
      invoice_no,
      commercial_invoice_value,
      currency,
      requested_weight,
      boxes,
      consignee_name,
      bills_total,
      billed_weight_total,
      processing_cost,
      freight_cost
    `,
    )
    .order("date", { ascending: false })
    .limit(100);

  if (month) {
    query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      shipments: [],
      error:
        "We could not load shipments from the database. Please try again shortly.",
    };
  }

  const shipments: ShipmentRow[] = data.map((row: any) => ({
    awb_no: row.awb_no,
    date: row.date,
    invoice_no: row.invoice_no,
    commercial_invoice_value: Number(row.invoice_lkr ?? 0),
    currency: "LKR" as Currency,
    requested_weight: row.requested_weight,
    boxes: row.boxes,
    consignee_name: row.consignee_name ?? null,
    bills_total: Number(row.bills_total ?? 0),
    billed_weight_total: Number(row.billed_weight_total ?? 0),
    processing_cost: Number(row.processing_cost ?? 0),
    freight_cost: Number(row.freight_cost ?? 0),
  }));

  return { shipments };
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: { month?: string } | Promise<{ month?: string }>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const month = resolved.month;
  const { shipments, error } = await loadShipments(month);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Operations
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Shipments
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Track each air shipment, supplier bills, and profit in LKR.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/shipments/new">
            <Button size="sm">New shipment</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <AlertBanner variant="error" title="Could not load shipments">
          {error}
        </AlertBanner>
      ) : null}

      <Card
        title="Shipment list"
        description="Recent shipments with invoice values and supplier bill totals."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <form className="flex items-center gap-2">
            <label className="text-slate-600">Filter by month</label>
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <Button type="submit" size="sm" variant="secondary">
              Apply
            </Button>
          </form>
          <p className="text-slate-500">
            Showing {shipments.length} shipment{shipments.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">AWB</th>
                <th className="px-2 py-2">Consignee</th>
                <th className="px-2 py-2 text-right">Invoice (LKR)</th>
                <th className="px-2 py-2 text-right">Bills total</th>
                <th className="px-2 py-2 text-right">Req kg</th>
                <th className="px-2 py-2 text-right">Billed kg</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr
                  key={s.awb_no}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-2 py-1.5">
                    {formatDateDdMmYyyy(s.date)}
                  </td>
                  <td className="px-2 py-1.5 font-medium text-slate-900">
                    {s.awb_no}
                  </td>
                  <td className="px-2 py-1.5">
                    {s.consignee_name ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {s.commercial_invoice_value
                      ? formatCurrency(s.commercial_invoice_value, "LKR")
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {s.bills_total
                      ? formatCurrency(s.bills_total, "LKR")
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {s.requested_weight ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {s.billed_weight_total ? s.billed_weight_total.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="inline-flex gap-1">
                      <Link href={`/shipments/${encodeURIComponent(s.awb_no)}/summary`}>
                        <Button size="sm" variant="secondary">
                          Summary
                        </Button>
                      </Link>
                      <Link href={`/shipments/${encodeURIComponent(s.awb_no)}/edit`}>
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-6 text-center text-xs text-slate-500"
                  >
                    No shipments yet. Use “New shipment” to add your first record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

