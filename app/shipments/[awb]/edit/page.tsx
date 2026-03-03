import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { shipmentSchema } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

async function loadShipment(awb: string) {
  const supabase = createServerSupabaseClient();

  const [{ data: shipment }, { data: consignees }] = await Promise.all([
    supabase
      .from("shipment")
      .select(
        "awb_no, date, invoice_no, commercial_invoice_value, currency, requested_weight, boxes, con_id",
      )
      .eq("awb_no", awb)
      .maybeSingle(),
    supabase
      .from("consignee")
      .select("con_id, name")
      .order("name", { ascending: true }),
  ]);

  if (!shipment) {
    redirect("/shipments");
  }

  return {
    shipment,
    consignees: consignees ?? [],
  };
}

async function updateShipment(formData: FormData) {
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
    redirect("/shipments");
  }

  const payload = parsed.data;

  await supabase
    .from("shipment")
    .update({
      date: payload.date || null,
      invoice_no: payload.invoice_no || null,
      commercial_invoice_value: payload.commercial_invoice_value,
      currency: payload.currency,
      requested_weight: payload.requested_weight,
      boxes: payload.boxes,
      con_id: payload.con_id,
    })
    .eq("awb_no", payload.awb_no);

  redirect(`/shipments/${encodeURIComponent(payload.awb_no)}/summary`);
}

export default async function EditShipmentPage({
  params,
}: {
  params: { awb: string } | Promise<{ awb: string }>;
}) {
  const { awb } = await Promise.resolve(params);
  const { shipment, consignees } = await loadShipment(awb);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          Shipments
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          Edit shipment
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Update the basic shipment details. Bills and charges stay attached to
          this AWB.
        </p>
      </div>

      <form action={updateShipment} className="space-y-4">
        <input type="hidden" name="awb_no" defaultValue={shipment.awb_no} />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="awb_no_display"
            label="AWB number"
            defaultValue={shipment.awb_no}
            disabled
          />
          <DateInput
            name="date"
            label="Shipment date"
            defaultValue={shipment.date ?? undefined}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="invoice_no"
            label="Invoice number"
            defaultValue={shipment.invoice_no ?? undefined}
          />
          <Input
            name="commercial_invoice_value"
            label="Commercial invoice value"
            type="number"
            step="0.01"
            defaultValue={shipment.commercial_invoice_value ?? undefined}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            name="currency"
            label="Currency"
            required
            placeholder="Select currency"
            defaultValue={shipment.currency ?? undefined}
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
            defaultValue={shipment.requested_weight ?? undefined}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="boxes"
            label="Number of boxes"
            type="number"
            step="1"
            defaultValue={shipment.boxes ?? undefined}
          />
          <Select
            name="con_id"
            label="Consignee"
            required
            placeholder="Select consignee"
            defaultValue={shipment.con_id ?? undefined}
            options={consignees.map((c: any) => ({
              value: c.con_id,
              label: c.name,
            }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </div>
  );
}

