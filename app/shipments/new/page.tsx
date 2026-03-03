import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { shipmentSchema } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

async function loadConsignees() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("consignee")
    .select("con_id, name")
    .order("name", { ascending: true });
  return data ?? [];
}

async function createShipment(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    awb_no: formData.get("awb_no"),
    date: formData.get("date"),
    invoice_no: formData.get("invoice_no"),
    commercial_invoice_value: formData.get("commercial_invoice_value"),
    currency: formData.get("currency"),
    requested_weight: formData.get("requested_weight"),
    boxes: formData.get("boxes"),
    con_id: formData.get("con_id"),
  };

  const parsed = shipmentSchema.safeParse(raw);

  if (!parsed.success) {
    // For now, redirect back to list; a more advanced version can surface field-level errors.
    redirect("/shipments");
  }

  const payload = parsed.data;

  await supabase.from("shipment").insert({
    awb_no: payload.awb_no,
    date: payload.date || null,
    invoice_no: payload.invoice_no || null,
    commercial_invoice_value: payload.commercial_invoice_value,
    currency: payload.currency,
    requested_weight: payload.requested_weight,
    boxes: payload.boxes,
    con_id: payload.con_id,
  });

  redirect("/shipments");
}

export default async function NewShipmentPage() {
  const consignees = await loadConsignees();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          Shipments
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          New shipment
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Capture the basic shipment details. You can attach bills and charges
          later from the summary page.
        </p>
      </div>

      <form action={createShipment} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="awb_no"
            label="AWB number"
            required
            placeholder="Enter AWB"
          />
          <DateInput name="date" label="Shipment date" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="invoice_no"
            label="Invoice number"
            placeholder="Optional"
          />
          <Input
            name="commercial_invoice_value"
            label="Commercial invoice value"
            type="number"
            step="0.01"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            name="currency"
            label="Currency"
            required
            placeholder="Select currency"
            options={[
              { value: "GBP", label: "GBP" },
              { value: "USD", label: "USD" },
            ]}
          />
          <Input
            name="requested_weight"
            label="Requested weight (kg)"
            type="number"
            step="0.01"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="boxes"
            label="Number of boxes"
            type="number"
            step="1"
            required
          />
          <Select
            name="con_id"
            label="Consignee"
            required
            placeholder="Select consignee"
            options={consignees.map((c: any) => ({
              value: c.con_id,
              label: c.name,
            }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit">Save shipment</Button>
        </div>
      </form>
    </div>
  );
}

