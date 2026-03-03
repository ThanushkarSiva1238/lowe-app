import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getConsigneeBalance, getConsigneeBalanceColor } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

export const revalidate = 10;

interface ConsigneeRow {
  con_id: number;
  name: string;
  opening_balance: number;
  current_balance: number;
  currency: "GBP" | "USD";
}

async function loadConsignees(): Promise<{
  consignees: ConsigneeRow[];
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("consignee")
    .select(
      `
      con_id,
      name,
      opening_balance,
      currency,
      shipment:shipment(commercial_invoice_value, currency),
      receive:receive(amount, currency)
    `,
    )
    .order("name", { ascending: true });

  if (error || !data) {
    return {
      consignees: [],
      error:
        "We could not load consignee balances from the database. Please try again shortly.",
    };
  }

  const consignees: ConsigneeRow[] = data.map((row: any) => {
    const accountCurrency = (row.currency ?? "GBP") as "GBP" | "USD";
    const shipments =
      (row.shipment ?? []) as {
        commercial_invoice_value: number | null;
        currency: "GBP" | "USD" | null;
      }[];
    const receipts =
      (row.receive ?? []) as {
        amount: number | null;
        currency: "GBP" | "USD" | null;
      }[];

    const totalInvoice = shipments.reduce((sum, s) => {
      if (s.currency && s.currency !== accountCurrency) return sum;
      return sum + Number(s.commercial_invoice_value ?? 0);
    }, 0);

    const totalReceipts = receipts.reduce((sum, r) => {
      if (r.currency && r.currency !== accountCurrency) return sum;
      return sum + Number(r.amount ?? 0);
    }, 0);

    const opening = Number(row.opening_balance ?? 0);
    const current = getConsigneeBalance({
      openingBalance: opening,
      invoiceTotal: totalInvoice,
      receiveTotal: totalReceipts,
    });

    return {
      con_id: row.con_id,
      name: row.name,
      opening_balance: opening,
      current_balance: current,
      currency: accountCurrency,
    };
  });

  return { consignees };
}

export default async function ConsigneesPage() {
  const { consignees, error } = await loadConsignees();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Accounts
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Consignees
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Track how much each consignee owes and open full statements.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/consignees/new">
            <Button size="sm">New consignee</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <AlertBanner variant="error" title="Could not load consignees">
          {error}
        </AlertBanner>
      ) : null}

      <Card
        title="Consignee balances"
        description="Opening balance plus all invoices and receipts for each consignee."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Consignee</th>
                <th className="px-2 py-2 text-right">Opening balance</th>
                <th className="px-2 py-2 text-right">Current balance</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {consignees.map((c) => {
                const balanceClass = getConsigneeBalanceColor(c.current_balance);
                return (
                  <tr
                    key={c.con_id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-1.5 font-medium text-slate-900">
                      {c.name}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {c.opening_balance
                        ? formatCurrency(c.opening_balance, c.currency)
                        : "—"}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${balanceClass}`}>
                      {formatCurrency(c.current_balance, c.currency)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Link href={`/consignees/${c.con_id}`}>
                        <Button size="sm" variant="secondary">
                          View account
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {consignees.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-6 text-center text-xs text-slate-500"
                  >
                    No consignees yet. Use &quot;New consignee&quot; to add your
                    first record.
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

