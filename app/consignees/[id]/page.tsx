import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { receiptSchema } from "@/lib/validation";
import { getConsigneeBalanceColor } from "@/lib/calculations";
import { loadConsigneeAccount } from "@/app/consignees/accountData";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";

async function createReceipt(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    date: formData.get("date"),
    amount: formData.get("amount"),
    con_id: formData.get("con_id"),
  };

  const parsed = receiptSchema.safeParse(raw);

  if (!parsed.success) {
    const fallbackId = String(formData.get("con_id") ?? "");
    redirect(`/consignees/${encodeURIComponent(fallbackId)}`);
  }

  const payload = parsed.data;

  const { data: consignee } = await supabase
    .from("consignee")
    .select("currency")
    .eq("con_id", payload.con_id)
    .maybeSingle();

  const currency = (consignee?.currency ?? "GBP") as "GBP" | "USD";

  await supabase.from("receive").insert({
    date: payload.date || null,
    amount: payload.amount,
    currency,
    con_id: payload.con_id,
  });

  redirect(`/consignees/${encodeURIComponent(payload.con_id)}`);
}

async function deleteReceipt(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const receiveIdRaw = formData.get("receive_id");
  const conIdRaw = formData.get("con_id");
  const receiveId = Number(receiveIdRaw ?? 0);
  const conId = Number(conIdRaw ?? 0);

  if (!Number.isFinite(receiveId) || !Number.isFinite(conId)) {
    redirect("/consignees");
  }

  await supabase.from("receive").delete().eq("receive_id", receiveId);

  redirect(`/consignees/${encodeURIComponent(conId)}`);
}

async function updateOpeningBalance(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const conIdRaw = formData.get("con_id");
  const openingRaw = formData.get("opening_balance");

  const conId = Number(conIdRaw ?? 0);
  const openingBalance = Number(openingRaw ?? 0);

  if (!Number.isFinite(conId)) {
    redirect("/consignees");
  }

  await supabase
    .from("consignee")
    .update({ opening_balance: openingBalance })
    .eq("con_id", conId);

  redirect(`/consignees/${encodeURIComponent(conId)}`);
}

async function updateReceipt(formData: FormData) {
  "use server";

  const supabase = createServerSupabaseClient();

  const raw = {
    date: formData.get("date"),
    amount: formData.get("amount"),
    con_id: formData.get("con_id"),
  };

  const receiveIdRaw = formData.get("receive_id");
  const parsed = receiptSchema.safeParse(raw);

  if (!parsed.success) {
    const fallbackId = String(formData.get("con_id") ?? "");
    redirect(`/consignees/${encodeURIComponent(fallbackId)}`);
  }

  const payload = parsed.data;
  const receiveId = Number(receiveIdRaw ?? 0);

  if (!Number.isFinite(receiveId)) {
    redirect(`/consignees/${encodeURIComponent(payload.con_id)}`);
  }

  await supabase
    .from("receive")
    .update({
      date: payload.date || null,
      amount: payload.amount,
    })
    .eq("receive_id", receiveId);

  redirect(`/consignees/${encodeURIComponent(payload.con_id)}`);
}

export default async function ConsigneeAccountPage({
  params,
  searchParams,
}: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { editReceipt?: string };
}) {
  const resolved = await Promise.resolve(params);
  const conId = Number(resolved.id);
  if (!Number.isFinite(conId)) {
    redirect("/consignees");
  }

  const account = await loadConsigneeAccount(conId);

  if (!account) {
    redirect("/consignees");
  }

  const balanceClass = getConsigneeBalanceColor(account.current_balance);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Consignees
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Consignee account
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Running statement of shipments and receipts for {account.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/consignees/${account.con_id}/print`}>
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
              <dt className="text-slate-500">Consignee</dt>
              <dd className="font-semibold text-slate-900">
                {account.name}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Opening balance</dt>
              <dd>{formatCurrency(account.opening_balance, account.currency)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">
                Total invoice ({account.currency})
              </dt>
              <dd>{formatCurrency(account.total_invoice, account.currency)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">
                Total receipts ({account.currency})
              </dt>
              <dd>{formatCurrency(account.total_receipts, account.currency)}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
              <dt className="text-slate-700">Current balance</dt>
              <dd className={`text-sm font-semibold ${balanceClass}`}>
                {formatCurrency(account.current_balance, account.currency)}
              </dd>
            </div>
          </dl>

          <form
            action={updateOpeningBalance}
            className="mt-4 border-t border-slate-200 pt-3 text-xs"
          >
            <input type="hidden" name="con_id" value={account.con_id} />
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Edit opening balance
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  name="opening_balance"
                  label={`Opening balance (${account.currency})`}
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
              <dt className="text-slate-500">Total shipments</dt>
              <dd>{account.total_shipments}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Avg. profit / shipment</dt>
              <dd>
                {account.avg_profit_per_shipment_lkr != null
                  ? formatCurrency(
                      account.avg_profit_per_shipment_lkr,
                      "LKR",
                    )
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Avg. payment delay</dt>
              <dd>
                {account.avg_payment_delay_days != null
                  ? `${account.avg_payment_delay_days.toFixed(1)} days`
                  : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Record receipt"
          description={`Log a payment received from this consignee in ${account.currency} to keep the balance up to date.`}
        >
          <form action={createReceipt} className="space-y-3 text-xs">
            <input type="hidden" name="con_id" value={account.con_id} />
            <DateInput name="date" label="Receipt date" />
            <Input
              name="amount"
              label={`Amount (${account.currency})`}
              type="number"
              step="0.01"
              required
            />
            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm">
                Add receipt
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card
        title="Account statement"
          description={`Chronological view of opening balance, shipments, and receipts with running balance. All amounts in ${account.currency}.`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Details</th>
                <th className="px-2 py-2 text-right">
                  Invoice ({account.currency})
                </th>
                <th className="px-2 py-2 text-right">
                  Receipt ({account.currency})
                </th>
                <th className="px-2 py-2 text-right">
                  Balance ({account.currency})
                </th>
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
                      : row.type === "shipment"
                        ? "Shipment"
                        : "Receipt"}
                  </td>
                  <td className="px-2 py-1.5">
                    {row.type === "shipment" && row.awb_no
                      ? `${row.description}`
                      : row.description}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.invoice_lkr
                      ? formatCurrency(row.invoice_lkr, account.currency)
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.receipt_amount
                      ? formatCurrency(row.receipt_amount, account.currency)
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(row.balance_after, account.currency)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.type === "receipt" && row.receive_id ? (
                      <div className="flex justify-end gap-2">
                        <form
                          action={updateReceipt}
                          className="inline-flex items-center gap-1"
                        >
                          <input
                            type="hidden"
                            name="con_id"
                            value={account.con_id}
                          />
                          <input
                            type="hidden"
                            name="receive_id"
                            value={row.receive_id}
                          />
                          <DateInput
                            name="date"
                            className="h-7 w-28"
                            aria-label="Receipt date"
                            defaultValue={
                              row.date ? row.date.slice(0, 10) : undefined
                            }
                          />
                          <Input
                            name="amount"
                            aria-label="Receipt amount"
                            className="h-7 w-24"
                            type="number"
                            step="0.01"
                            defaultValue={row.receipt_amount ?? 0}
                            required
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            Save
                          </Button>
                        </form>
                        <form action={deleteReceipt} className="inline-block">
                          <input
                            type="hidden"
                            name="receive_id"
                            value={row.receive_id}
                          />
                          <input
                            type="hidden"
                            name="con_id"
                            value={account.con_id}
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

