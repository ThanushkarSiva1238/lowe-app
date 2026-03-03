import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getSupplierBalance,
  getSupplierBalanceColor,
  type AccountCurrency,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

export const revalidate = 10;

interface SupplierRow {
  supp_id: number;
  name: string;
  opening_balance: number;
  current_balance: number;
  currency: AccountCurrency;
}

async function loadSuppliers(): Promise<{
  suppliers: SupplierRow[];
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("supplier")
    .select(
      `
      supp_id,
      name,
      opening_balance,
      currency,
      bill:bill(amount),
      pay:pay(amount, currency)
    `,
    )
    .order("name", { ascending: true });

  if (error || !data) {
    return {
      suppliers: [],
      error:
        "We could not load supplier balances from the database. Please try again shortly.",
    };
  }

  const suppliers: SupplierRow[] = data.map((row: any) => {
    const accountCurrency: AccountCurrency = "LKR";
    const bills = (row.bill ?? []) as { amount: number | null }[];
    const pays = (row.pay ?? []) as { amount: number | null }[];

    const billTotal = bills.reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
    const payTotal = pays.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0,
    );

    const opening = Number(row.opening_balance ?? 0);
    const current = getSupplierBalance({
      openingBalance: opening,
      billTotal,
      payTotal,
    });

    return {
      supp_id: row.supp_id,
      name: row.name,
      opening_balance: opening,
      current_balance: current,
      currency: accountCurrency,
    };
  });

  return { suppliers };
}

export default async function SuppliersPage() {
  const { suppliers, error } = await loadSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Accounts
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Suppliers
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            See each supplier&apos;s current outstanding balance and open their
            detailed account.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/suppliers/new">
            <Button size="sm">New supplier</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <AlertBanner variant="error" title="Could not load suppliers">
          {error}
        </AlertBanner>
      ) : null}

      <Card
        title="Supplier balances"
        description="Opening balance plus all bills and payments for each supplier."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Supplier</th>
                <th className="px-2 py-2 text-right">Opening balance</th>
                <th className="px-2 py-2 text-right">Current balance</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const balanceClass = getSupplierBalanceColor(s.current_balance);
                return (
                  <tr
                    key={s.supp_id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-1.5 font-medium text-slate-900">
                      {s.name}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {s.opening_balance
                        ? formatCurrency(s.opening_balance, "LKR")
                        : "—"}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${balanceClass}`}>
                      {formatCurrency(s.current_balance, "LKR")}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Link href={`/suppliers/${s.supp_id}`}>
                        <Button size="sm" variant="secondary">
                          View account
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {suppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-6 text-center text-xs text-slate-500"
                  >
                    No suppliers yet. Use &quot;New supplier&quot; to add your first
                    record.
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

