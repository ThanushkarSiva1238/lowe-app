import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { supplierSchema } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

async function createSupplier(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    name: formData.get("name"),
    opening_balance: formData.get("opening_balance"),
  };

  const parsed = supplierSchema.safeParse(raw);

  if (!parsed.success) {
    redirect("/suppliers/new");
  }

  const payload = parsed.data;

  await supabase.from("supplier").insert({
    name: payload.name,
    opening_balance: payload.opening_balance,
    currency: "LKR",
  });

  redirect("/suppliers");
}

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          Suppliers
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          New supplier
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Add a new airline or handling agent. Opening balance lets you capture
          any existing overpaid or outstanding amount.
        </p>
      </div>

      <form action={createSupplier} className="space-y-4">
        <Input
          name="name"
          label="Supplier name"
          required
          placeholder="Enter supplier name"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            name="opening_balance"
            label="Opening balance (LKR)"
            type="number"
            step="0.01"
            defaultValue={0}
            hint="Any overpaid or balance amount available with this supplier when you start using the system."
          />
          <div className="text-[11px] text-slate-600">
            All supplier accounts are maintained in <span className="font-semibold">LKR</span>.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit">Save supplier</Button>
        </div>
      </form>
    </div>
  );
}

