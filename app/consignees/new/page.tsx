import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { consigneeSchema } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

async function createConsignee(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    name: formData.get("name"),
    country: formData.get("country"),
    opening_balance: formData.get("opening_balance"),
    currency: formData.get("currency"),
  };

  const parsed = consigneeSchema.safeParse(raw);

  if (!parsed.success) {
    redirect("/consignees/new");
  }

  const payload = parsed.data;

  await supabase.from("consignee").insert({
    name: payload.name,
    country: payload.country || null,
    opening_balance: payload.opening_balance,
    currency: payload.currency,
  });

  redirect("/consignees");
}

export default function NewConsigneePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          Consignees
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          New consignee
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Add a new customer or consignee. Opening balance captures any amount
          already owed or overpaid when you start using the system.
        </p>
      </div>

      <form action={createConsignee} className="space-y-4">
        <Input
          name="name"
          label="Consignee name"
          required
          placeholder="Enter consignee name"
        />
        <Input
          name="country"
          label="Country"
          placeholder="Optional"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            name="opening_balance"
            label="Opening balance"
            type="number"
            step="0.01"
            defaultValue={0}
            hint="Enter the opening balance in the consignee's account currency."
          />
          <Select
            name="currency"
            label="Account currency"
            defaultValue="GBP"
            options={[
              { value: "GBP", label: "GBP" },
              { value: "USD", label: "USD" },
            ]}
            hint="This currency will be used for all balances and receipts for this consignee."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit">Save consignee</Button>
        </div>
      </form>
    </div>
  );
}

