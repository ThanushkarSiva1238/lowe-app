import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { paymentSchema } from "@/lib/validation";
import { getSupplierBalanceColor } from "@/lib/calculations";
import { loadSupplierAccount } from "@/app/suppliers/accountData";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";

async function createPayment(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    date: formData.get("date"),
    amount: formData.get("amount"),
    supp_id: formData.get("supp_id"),
  };

  const parsed = paymentSchema.safeParse(raw);

  if (!parsed.success) {
    const fallbackId = String(formData.get("supp_id") ?? "");
    redirect(`/suppliers/${encodeURIComponent(fallbackId)}`);
  }

  const payload = parsed.data;

  await supabase.from("pay").insert({
    date: payload.date || null,
    amount: payload.amount,
    supp_id: payload.supp_id,
  });

  redirect(`/suppliers/${encodeURIComponent(payload.supp_id)}`);
}

async function deletePayment(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const payIdRaw = formData.get("pay_id");
  const suppIdRaw = formData.get("supp_id");
  const payId = Number(payIdRaw ?? 0);
  const suppId = Number(suppIdRaw ?? 0);

  if (!Number.isFinite(payId) || !Number.isFinite(suppId)) {
    redirect("/suppliers");
  }

  await supabase.from("pay").delete().eq("pay_id", payId);

  redirect(`/suppliers/${encodeURIComponent(suppId)}`);
}

async function updateOpeningBalance(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const suppIdRaw = formData.get("supp_id");
  const openingRaw = formData.get("opening_balance");

  const suppId = Number(suppIdRaw ?? 0);
  const openingBalance = Number(openingRaw ?? 0);

  if (!Number.isFinite(suppId)) {
    redirect("/suppliers");
  }

  await supabase
    .from("supplier")
    .update({ opening_balance: openingBalance })
    .eq("supp_id", suppId);

  redirect(`/suppliers/${encodeURIComponent(suppId)}`);
}

async function updatePayment(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    date: formData.get("date"),
    amount: formData.get("amount"),
    supp_id: formData.get("supp_id"),
  };

  const payIdRaw = formData.get("pay_id");
  const parsed = paymentSchema.safeParse(raw);

  if (!parsed.success) {
    const fallbackId = String(formData.get("supp_id") ?? "");
    redirect(`/suppliers/${encodeURIComponent(fallbackId)}`);
  }

  const payload = parsed.data;
  const payId = Number(payIdRaw ?? 0);

  if (!Number.isFinite(payId)) {
    redirect(`/suppliers/${encodeURIComponent(payload.supp_id)}`);
  }

  await supabase
    .from("pay")
    .update({
      date: payload.date || null,
      amount: payload.amount,
    })
    .eq("pay_id", payId);

  redirect(`/suppliers/${encodeURIComponent(payload.supp_id)}`);
}

export default async function SupplierAccountPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const suppId = Number(resolved.id);
  if (!Number.isFinite(suppId)) {
    redirect("/suppliers");
  }

  const account = await loadSupplierAccount(suppId);

  if (!account) {
    redirect("/suppliers");
  }

  const balanceClass = getSupplierBalanceColor(account.current_balance);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Suppliers
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Supplier account
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Running statement of bills and payments for {account.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/suppliers/${account.supp_id}/print`}>
            <Button size="sm" variant="secondary">
              Print statement
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Current position">
          <dl className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Supplier</dt>
              <dd className="font-semibold text-slate-900">
                {account.name}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Opening balance</dt>
              <dd>
                {formatCurrency(account.opening_balance, "LKR")}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Total bills</dt>
              <dd>
                {formatCurrency(account.total_bills, "LKR")}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Total payments</dt>
              <dd>
                {formatCurrency(account.total_payments, "LKR")}
              </dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
              <dt className="text-slate-700">Current balance</dt>
              <dd className={`text-sm font-semibold ${balanceClass}`}>
                {formatCurrency(account.current_balance, "LKR")}
              </dd>
            </div>
          </dl>

          <form
            action={updateOpeningBalance}
            className="mt-4 border-t border-slate-200 pt-3 text-xs"
          >
            <input type="hidden" name="supp_id" value={account.supp_id} />
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Edit opening balance
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  name="opening_balance"
                  label="Opening balance (LKR)"
                  type="number"
                  step="0.01"
                  defaultValue={account.opening_balance}
                  required
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Save
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Performance">
          <dl className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Total weight</dt>
              <dd>{account.total_weight.toFixed(2)} kg</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Avg. cost / kg</dt>
              <dd>
                {account.avg_cost_per_kg != null
                  ? account.avg_cost_per_kg.toFixed(2)
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Associated profit impact</dt>
              <dd>
                {formatCurrency(account.associated_profit_lkr, "LKR")}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Record payment"
          description="Log a payment made to this supplier in LKR to keep the balance up to date."
        >
          <form action={createPayment} className="space-y-3 text-xs">
            <input type="hidden" name="supp_id" value={account.supp_id} />
            <DateInput name="date" label="Payment date" />
            <Input
              name="amount"
              label="Amount (LKR)"
              type="number"
              step="0.01"
              required
            />
            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm">
                Add payment
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card
        title="Account statement"
          description="Chronological view of opening balance, bills, and payments with running balance. All amounts in LKR."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Details</th>
                  <th className="px-2 py-2 text-right">Bill amount (LKR)</th>
                  <th className="px-2 py-2 text-right">Payment (LKR)</th>
                  <th className="px-2 py-2 text-right">Balance (LKR)</th>
                  <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {account.rows.map((row, idx) => (
                <tr
                  key={`${row.type}-${idx}`}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-2 py-1.5">
                    {formatDateDdMmYyyy(row.date)}
                  </td>
                  <td className="px-2 py-1.5 capitalize">
                    {row.type === "opening"
                      ? "Opening"
                      : row.type === "bill"
                        ? "Bill"
                        : "Payment"}
                  </td>
                  <td className="px-2 py-1.5">
                    {row.type === "bill" && row.awb_no
                      ? `${row.description} – AWB ${row.awb_no}`
                      : row.description}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.bill_amount
                      ? formatCurrency(row.bill_amount, "LKR")
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.payment_amount
                      ? formatCurrency(row.payment_amount, "LKR")
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(row.balance_after, "LKR")}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.type === "payment" && row.pay_id ? (
                      <div className="flex justify-end gap-2">
                        <form
                          action={updatePayment}
                          className="inline-flex items-center gap-1"
                        >
                          <input
                            type="hidden"
                            name="supp_id"
                            value={account.supp_id}
                          />
                          <input
                            type="hidden"
                            name="pay_id"
                            value={row.pay_id}
                          />
                          <DateInput
                            name="date"
                            className="h-7 w-28"
                            aria-label="Payment date"
                            defaultValue={
                              row.date ? row.date.slice(0, 10) : undefined
                            }
                          />
                          <Input
                            name="amount"
                            aria-label="Payment amount"
                            className="h-7 w-24"
                            type="number"
                            step="0.01"
                            defaultValue={row.payment_amount ?? 0}
                            required
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            Save
                          </Button>
                        </form>
                        <form action={deletePayment} className="inline-block">
                          <input
                            type="hidden"
                            name="pay_id"
                            value={row.pay_id}
                          />
                          <input
                            type="hidden"
                            name="supp_id"
                            value={account.supp_id}
                          />
                          <ConfirmDeleteButton
                            type="submit"
                            size="sm"
                            variant="ghost"
                          >
                            Delete
                          </ConfirmDeleteButton>
                        </form>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

