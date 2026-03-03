import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getConsigneeBalance,
  type AccountCurrency,
  type Currency,
} from "@/lib/calculations";

export interface ConsigneeAccountRow {
  date: string | null;
  type: "opening" | "shipment" | "receipt";
  description: string;
  awb_no?: string | null;
  receive_id?: number;
  invoice_lkr?: number;
  receipt_amount?: number;
  balance_after: number;
}

export interface ConsigneeAccountData {
  con_id: number;
  name: string;
  currency: AccountCurrency;
  opening_balance: number;
  total_invoice: number;
  total_receipts: number;
  total_revenue_lkr: number;
  current_balance: number;
  total_shipments: number;
  avg_profit_per_shipment_lkr: number | null;
  avg_payment_delay_days: number | null;
  rows: ConsigneeAccountRow[];
}

export async function loadConsigneeAccount(
  conId: number,
): Promise<ConsigneeAccountData | null> {
  const supabase = createServerSupabaseClient();

  const [
    { data: consignee },
    { data: shipments },
    { data: receipts },
    { data: summary },
  ] = await Promise.all([
    supabase
      .from("consignee")
      .select("con_id, name, opening_balance, currency")
      .eq("con_id", conId)
      .maybeSingle(),
    supabase
      .from("shipment")
      .select("awb_no, date, commercial_invoice_value, currency")
      .eq("con_id", conId)
      .order("date", { ascending: true }),
    supabase
      .from("receive")
      .select("receive_id, date, amount, currency")
      .eq("con_id", conId)
      .order("date", { ascending: true }),
    supabase
      .from("consignee_summary_view")
      .select(
        "con_id, total_shipments, total_revenue_lkr, avg_profit_per_shipment_lkr, avg_payment_delay_days",
      )
      .eq("con_id", conId)
      .maybeSingle(),
  ]);

  if (!consignee) {
    return null;
  }

  const openingBalance = Number(consignee.opening_balance ?? 0);
  const accountCurrency = (consignee.currency ?? "GBP") as AccountCurrency;

  const shipmentRows =
    (shipments as {
      awb_no: string;
      date: string | null;
      commercial_invoice_value: number | null;
      currency: Currency | null;
    }[]) ?? [];

  const receiptRows =
    (receipts as {
      receive_id: number;
      date: string | null;
      amount: number | null;
      currency: Currency | null;
    }[]) ?? [];

  const totalInvoice = shipmentRows.reduce((sum, s) => {
    if (s.currency && s.currency !== accountCurrency) return sum;
    return sum + Number(s.commercial_invoice_value ?? 0);
  }, 0);
  const totalReceipts = receiptRows.reduce((sum, r) => {
    if (r.currency && r.currency !== accountCurrency) return sum;
    return sum + Number(r.amount ?? 0);
  }, 0);

  const currentBalance = getConsigneeBalance({
    openingBalance,
    invoiceTotal: totalInvoice,
    receiveTotal: totalReceipts,
  });

  const totalShipments =
    summary && summary.total_shipments != null
      ? Number(summary.total_shipments)
      : shipmentRows.length;

  const avgProfitPerShipment =
    summary && summary.avg_profit_per_shipment_lkr != null
      ? Number(summary.avg_profit_per_shipment_lkr)
      : null;

  const avgDelay =
    summary && summary.avg_payment_delay_days != null
      ? Number(summary.avg_payment_delay_days)
      : null;

  const rows: ConsigneeAccountRow[] = [];

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
        kind: "shipment";
        date: string | null;
        awb_no: string;
        invoice_amount: number;
      }
    | {
        kind: "receipt";
        date: string | null;
        receive_id: number;
        amount: number;
      };

  const events: Event[] = [
    ...shipmentRows.map((s) => ({
      kind: "shipment" as const,
      date: s.date,
      awb_no: s.awb_no,
      invoice_amount:
        s.currency && s.currency !== accountCurrency
          ? 0
          : Number(s.commercial_invoice_value ?? 0),
    })),
    ...receiptRows.map((r) => ({
      kind: "receipt" as const,
      date: r.date,
      receive_id: r.receive_id,
      amount: Number(r.amount ?? 0),
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
    if (ev.kind === "shipment") {
      runningBalance += ev.invoice_amount;
      rows.push({
        date: ev.date,
        type: "shipment",
        description: `Shipment AWB ${ev.awb_no}`,
        awb_no: ev.awb_no,
        invoice_lkr: ev.invoice_amount,
        balance_after: runningBalance,
      });
    } else {
      runningBalance -= ev.amount;
      rows.push({
        date: ev.date,
        type: "receipt",
        description: "Receipt",
        receive_id: ev.receive_id,
        receipt_amount: ev.amount,
        balance_after: runningBalance,
      });
    }
  }

  return {
    con_id: consignee.con_id as number,
    name: consignee.name as string,
    currency: accountCurrency,
    opening_balance: openingBalance,
    total_invoice: totalInvoice,
    total_receipts: totalReceipts,
    total_revenue_lkr:
      summary && summary.total_revenue_lkr != null
        ? Number(summary.total_revenue_lkr)
        : 0,
    current_balance: currentBalance,
    total_shipments: totalShipments,
    avg_profit_per_shipment_lkr: avgProfitPerShipment,
    avg_payment_delay_days: avgDelay,
    rows,
  };
}

