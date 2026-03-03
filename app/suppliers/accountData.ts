import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getSupplierBalance,
  type AccountCurrency,
} from "@/lib/calculations";

export interface SupplierAccountRow {
  date: string | null;
  type: "opening" | "bill" | "payment";
  description: string;
  awb_no?: string | null;
  weight?: number | null;
  bill_amount?: number;
  payment_amount?: number;
  balance_after: number;
  pay_id?: number;
}

export interface SupplierAccountData {
  supp_id: number;
  name: string;
  currency: AccountCurrency;
  opening_balance: number;
  total_bills: number;
  total_payments: number;
  current_balance: number;
  total_weight: number;
  avg_cost_per_kg: number | null;
  associated_profit_lkr: number;
  rows: SupplierAccountRow[];
}

export async function loadSupplierAccount(
  suppId: number,
): Promise<SupplierAccountData | null> {
  const supabase = createServerSupabaseClient();

  const [
    { data: supplier },
    { data: bills },
    { data: payments },
    { data: summary },
  ] = await Promise.all([
    supabase
      .from("supplier")
      .select("supp_id, name, opening_balance, currency")
      .eq("supp_id", suppId)
      .maybeSingle(),
    supabase
      .from("bill")
      .select("bill_id, date, weight, amount, awb_no")
      .eq("supp_id", suppId)
      .order("date", { ascending: true }),
    supabase
      .from("pay")
      .select("pay_id, date, amount, currency")
      .eq("supp_id", suppId)
      .order("date", { ascending: true }),
    supabase
      .from("supplier_summary_view")
      .select(
        "supp_id, total_bills_lkr, total_weight, avg_cost_per_kg, associated_profit_lkr",
      )
      .eq("supp_id", suppId)
      .maybeSingle(),
  ]);

  if (!supplier) {
    return null;
  }

  const openingBalance = Number(supplier.opening_balance ?? 0);
  const accountCurrency: AccountCurrency = "LKR";

  const billRows =
    (bills as { bill_id: string; date: string | null; weight: number | null; amount: number | null; awb_no: string | null }[]) ??
    [];
  const paymentRows =
    (payments as {
      pay_id: number;
      date: string | null;
      amount: number | null;
      currency?: never;
    }[]) ?? [];

  const totalBills = billRows.reduce(
    (sum, b) => sum + Number(b.amount ?? 0),
    0,
  );
  const totalPayments = paymentRows.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0,
  );

  const currentBalance = getSupplierBalance({
    openingBalance,
    billTotal: totalBills,
    payTotal: totalPayments,
  });

  const totalWeight = summary ? Number(summary.total_weight ?? 0) : billRows.reduce(
    (sum, b) => sum + Number(b.weight ?? 0),
    0,
  );

  const avgCostPerKg =
    summary && summary.avg_cost_per_kg != null
      ? Number(summary.avg_cost_per_kg)
      : totalWeight > 0
        ? totalBills / totalWeight
        : null;

  const associatedProfit =
    summary && summary.associated_profit_lkr != null
      ? Number(summary.associated_profit_lkr)
      : 0;

  const rows: SupplierAccountRow[] = [];

  // Opening balance row
  let runningBalance = openingBalance;
  rows.push({
    date: null,
    type: "opening",
    description: "Opening balance",
    balance_after: runningBalance,
  });

  type Event =
    | {
        kind: "bill";
        date: string | null;
        bill_id: string;
        awb_no: string | null;
        weight: number | null;
        amount: number;
      }
    | {
        kind: "payment";
        date: string | null;
        pay_id: number;
        amount: number;
      };

  const events: Event[] = [
    ...billRows.map((b) => ({
      kind: "bill" as const,
      date: b.date,
      bill_id: b.bill_id,
      awb_no: b.awb_no,
      weight: b.weight,
      amount: Number(b.amount ?? 0),
    })),
    ...paymentRows.map((p) => ({
      kind: "payment" as const,
      date: p.date,
      pay_id: p.pay_id,
      amount: Number(p.amount ?? 0),
    })),
  ];

  events.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da === db) {
      return 0;
    }
    return da - db;
  });

  for (const ev of events) {
    if (ev.kind === "bill") {
      runningBalance += ev.amount;
      rows.push({
        date: ev.date,
        type: "bill",
        description: `Bill ${ev.bill_id}`,
        awb_no: ev.awb_no,
        weight: ev.weight,
        bill_amount: ev.amount,
        balance_after: runningBalance,
      });
    } else {
      runningBalance -= ev.amount;
      rows.push({
        date: ev.date,
        type: "payment",
        description: "Payment",
        pay_id: ev.pay_id,
        payment_amount: ev.amount,
        balance_after: runningBalance,
      });
    }
  }

  return {
    supp_id: supplier.supp_id as number,
    name: supplier.name as string,
    currency: accountCurrency,
    opening_balance: openingBalance,
    total_bills: totalBills,
    total_payments: totalPayments,
    current_balance: currentBalance,
    total_weight: totalWeight,
    avg_cost_per_kg: avgCostPerKg,
    associated_profit_lkr: associatedProfit,
    rows,
  };
}

