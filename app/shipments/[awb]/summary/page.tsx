import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { additionalChargesSchema, billSchema } from "@/lib/validation";
import { getProfitColor, getWeightDiffColor } from "@/lib/calculations";
import { loadShipmentSummary } from "@/app/shipments/summaryData";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

async function loadSuppliers() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("supplier")
    .select("supp_id, name")
    .order("name", { ascending: true });
  return data ?? [];
}

async function upsertAdditionalCharges(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    processing_cost: formData.get("processing_cost"),
    freight_cost: formData.get("freight_cost"),
    awb_no: formData.get("awb_no"),
  };

  const parsed = additionalChargesSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/shipments/${encodeURIComponent(String(raw.awb_no))}/summary`);
  }

  const payload = parsed.data;

  await supabase
    .from("additional_charges")
    .upsert(
      {
        processing_cost: payload.processing_cost,
        freight_cost: payload.freight_cost,
        awb_no: payload.awb_no,
      },
      { onConflict: "awb_no" },
    );

  redirect(`/shipments/${encodeURIComponent(payload.awb_no)}/summary`);
}

async function createBill(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    bill_id: formData.get("bill_id"),
    date: formData.get("date"),
    weight: formData.get("weight"),
    amount: formData.get("amount"),
    supp_id: formData.get("supp_id"),
    awb_no: formData.get("awb_no"),
  };

  const parsed = billSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/shipments/${encodeURIComponent(String(raw.awb_no))}/summary`);
  }

  const payload = parsed.data;

  await supabase.from("bill").insert({
    bill_id: payload.bill_id,
    date: payload.date || null,
    weight: payload.weight,
    amount: payload.amount,
    supp_id: payload.supp_id,
    awb_no: payload.awb_no,
  });

  redirect(`/shipments/${encodeURIComponent(payload.awb_no)}/summary`);
}

async function deleteBill(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();
  const bill_id = String(formData.get("bill_id") ?? "");
  const awb_no = String(formData.get("awb_no") ?? "");

  if (!bill_id) {
    redirect(`/shipments/${encodeURIComponent(awb_no)}/summary`);
  }

  await supabase.from("bill").delete().eq("bill_id", bill_id);

  redirect(`/shipments/${encodeURIComponent(awb_no)}/summary`);
}

export default async function ShipmentSummaryPage({
  params,
}: {
  params: { awb: string } | Promise<{ awb: string }>;
}) {
  const { awb } = await Promise.resolve(params);
  const [summary, suppliers] = await Promise.all([
    loadShipmentSummary(awb),
    loadSuppliers(),
  ]);

  if (!summary.summary) {
    if (!summary.error) {
      redirect("/shipments");
    }

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
              Shipments
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Shipment summary
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Could not load summary for AWB {awb}.
            </p>
          </div>
          <Link href="/shipments">
            <Button size="sm" variant="secondary">
              Back to shipments
            </Button>
          </Link>
        </div>
        <AlertBanner variant="error" title="Summary unavailable">
          {summary.error}
        </AlertBanner>
      </div>
    );
  }

  const shipmentSummary = summary.summary;

  const profitClass = getProfitColor(shipmentSummary.profit);
  const weightDiffClass = getWeightDiffColor(shipmentSummary.weight_difference);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Shipments
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Shipment summary
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Full financial view for AWB {shipmentSummary.awb_no}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/shipments/${encodeURIComponent(shipmentSummary.awb_no)}/print`}
          >
            <Button size="sm" variant="secondary">
              Print
            </Button>
          </Link>
          <Link
            href={`/shipments/${encodeURIComponent(shipmentSummary.awb_no)}/edit`}
          >
            <Button size="sm" variant="ghost">
              Edit shipment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Shipment details">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-slate-500">AWB</dt>
            <dd className="font-medium text-slate-900">
              {shipmentSummary.awb_no}
            </dd>

            <dt className="text-slate-500">Date</dt>
            <dd>{formatDateDdMmYyyy(shipmentSummary.date)}</dd>

            <dt className="text-slate-500">Invoice no.</dt>
            <dd>{shipmentSummary.invoice_no ?? "—"}</dd>

            <dt className="text-slate-500">Consignee</dt>
            <dd>{shipmentSummary.consignee_name ?? "—"}</dd>

            <dt className="text-slate-500">Requested kg</dt>
            <dd>{shipmentSummary.requested_weight ?? "—"}</dd>

            <dt className="text-slate-500">Boxes</dt>
            <dd>{shipmentSummary.boxes ?? "—"}</dd>
          </dl>
        </Card>

        <Card title="Financials">
          <dl className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Invoice value (LKR)</dt>
              <dd className="font-semibold">
                {shipmentSummary.commercial_invoice_value_lkr
                  ? formatCurrency(
                      shipmentSummary.commercial_invoice_value_lkr,
                      "LKR",
                    )
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Bills total</dt>
              <dd>
                {shipmentSummary.bills_total
                  ? formatCurrency(shipmentSummary.bills_total, "LKR")
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Processing cost</dt>
              <dd>
                {shipmentSummary.processing_cost
                  ? formatCurrency(shipmentSummary.processing_cost, "LKR")
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Freight cost</dt>
              <dd>
                {shipmentSummary.freight_cost
                  ? formatCurrency(shipmentSummary.freight_cost, "LKR")
                  : "—"}
              </dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
              <dt className="text-slate-700">Profit (LKR)</dt>
              <dd className={`text-sm font-semibold ${profitClass}`}>
                {formatCurrency(shipmentSummary.profit, "LKR")}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Weight summary">
          <dl className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Requested kg</dt>
              <dd>{shipmentSummary.requested_weight ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Billed kg</dt>
              <dd>{shipmentSummary.billed_weight_total.toFixed(2)}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
              <dt className="text-slate-700">Difference</dt>
              <dd className={`text-sm font-semibold ${weightDiffClass}`}>
                {shipmentSummary.weight_difference.toFixed(2)} kg
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card
          title="Supplier bills"
          description="Attach supplier invoices to this shipment."
        >
          <div className="mb-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">Bill ID</th>
                  <th className="px-2 py-1.5">Supplier</th>
                  <th className="px-2 py-1.5 text-right">Weight (kg)</th>
                  <th className="px-2 py-1.5 text-right">Amount</th>
                  <th className="px-2 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
              {shipmentSummary.bills.map((b) => (
                  <tr
                    key={b.bill_id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-1.5">
                      {formatDateDdMmYyyy(b.date)}
                    </td>
                    <td className="px-2 py-1.5 font-medium text-slate-900">
                      {b.bill_id}
                    </td>
                    <td className="px-2 py-1.5">
                      {b.supplier_name ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {b.weight.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatCurrency(b.amount, "LKR")}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <form action={deleteBill}>
                        <input type="hidden" name="bill_id" value={b.bill_id} />
                        <input
                          type="hidden"
                          name="awb_no"
                          value={shipmentSummary.awb_no}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="text-[11px] text-red-600"
                        >
                          Delete
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
                {shipmentSummary.bills.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-2 py-4 text-center text-xs text-slate-500"
                    >
                      No bills attached yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form
            action={createBill}
            className="mt-4 grid gap-3 rounded-md border border-dashed border-slate-200 p-3 text-xs md:grid-cols-6"
          >
            <input type="hidden" name="awb_no" value={shipmentSummary.awb_no} />
            <DateInput name="date" label="Date" />
            <Input name="bill_id" label="Bill ID" required />
            <Select
              name="supp_id"
              label="Supplier"
              placeholder="Select"
              required
              options={suppliers.map((s: any) => ({
                value: s.supp_id,
                label: s.name,
              }))}
            />
            <Input
              name="weight"
              label="Weight (kg)"
              type="number"
              step="0.01"
              required
            />
            <Input
              name="amount"
              label="Amount"
              type="number"
              step="0.01"
              required
            />
            <div className="flex items-end justify-end">
              <Button type="submit" size="sm">
                Add bill
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Additional charges"
          description="Processing and freight costs for this shipment."
        >
          <form action={upsertAdditionalCharges} className="space-y-3 text-xs">
            <input type="hidden" name="awb_no" value={shipmentSummary.awb_no} />
            <Input
              name="processing_cost"
              label="Processing cost"
              type="number"
              step="0.01"
              defaultValue={shipmentSummary.processing_cost || undefined}
            />
            <Input
              name="freight_cost"
              label="Freight cost"
              type="number"
              step="0.01"
              defaultValue={shipmentSummary.freight_cost || undefined}
            />
            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" variant="secondary">
                Save charges
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

