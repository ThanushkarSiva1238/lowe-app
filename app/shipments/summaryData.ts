import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getDailyExchangeRates,
  getInvoiceValueLkr,
  getShipmentProfit,
  getWeightDifference,
  type Currency,
} from "@/lib/calculations";

export interface ShipmentSummaryData {
  awb_no: string;
  date: string | null;
  invoice_no: string | null;
  commercial_invoice_value_lkr: number;
  currency: Currency | null;
  requested_weight: number | null;
  boxes: number | null;
  consignee_name: string | null;
  bills: {
    bill_id: string;
    date: string | null;
    weight: number;
    amount: number;
    supplier_name: string | null;
  }[];
  processing_cost: number;
  freight_cost: number;
  bills_total: number;
  billed_weight_total: number;
  profit: number;
  weight_difference: number;
}

export type ShipmentSummaryResult = {
  summary: ShipmentSummaryData | null;
  error?: string;
};

export async function loadShipmentSummary(awb: string): Promise<ShipmentSummaryResult> {
  let supabase: ReturnType<typeof createServerSupabaseClient>;

  try {
    supabase = createServerSupabaseClient();
  } catch {
    return {
      summary: null,
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables, then restart the server.",
    };
  }

  const [{ data, error }] = await Promise.all([
    supabase
      .from("shipment")
      .select(
        `
        awb_no,
        date,
        invoice_no,
        commercial_invoice_value,
        currency,
        requested_weight,
        boxes,
        consignee:consignee(name),
        bill:bill(
          bill_id,
          date,
          weight,
          amount,
          supplier:supplier(name)
        ),
        additional_charges:additional_charges(processing_cost, freight_cost)
      `,
      )
      .eq("awb_no", awb)
      .maybeSingle(),
  ]);

  if (!data && !error) {
    return { summary: null };
  }

  if (error || !data) {
    return {
      summary: null,
      error:
        error?.message ??
        "Could not load shipment summary. Please check your database tables and permissions.",
    };
  }

  const rates = await getDailyExchangeRates(data.date as string | null);

    const bills = 
    (data.bill as {
      bill_id: string;
      date: string | null;
      weight: number;
      amount: number;
      supplier?: { name: string | null }[] | null;
    }[]) ?? [];

  const charges = data.additional_charges?.[0] ?? data.additional_charges ?? null;

  const billsTotal = bills.reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
  const billedWeightTotal = bills.reduce(
    (sum, b) => sum + Number(b.weight ?? 0),
    0,
  );

  const invoiceLkr =
    data.commercial_invoice_value && data.currency
      ? getInvoiceValueLkr(
          Number(data.commercial_invoice_value),
          data.currency as Currency,
          rates,
        )
      : 0;

  const processing_cost = Number(charges?.processing_cost ?? 0);
  const freight_cost = Number(charges?.freight_cost ?? 0);

  const profit = getShipmentProfit({
    invoiceLkr,
    billsTotal,
    processingCost: processing_cost,
    freightCost: freight_cost,
  });

  const weight_difference =
    data.requested_weight != null
      ? getWeightDifference({
          requestedWeight: Number(data.requested_weight ?? 0),
          billedWeightTotal,
        })
      : 0;

  return {
    summary: {
      awb_no: data.awb_no,
      date: data.date,
      invoice_no: data.invoice_no,
      commercial_invoice_value_lkr: invoiceLkr,
      currency: data.currency as Currency | null,
      requested_weight: data.requested_weight,
      boxes: data.boxes,
      consignee_name: (data.consignee as { name?: string | null } | null)?.name ?? null,
      bills: bills.map((b) => ({
        bill_id: b.bill_id,
        date: b.date,
        weight: Number(b.weight ?? 0),
        amount: Number(b.amount ?? 0),
        supplier_name: b.supplier?.[0]?.name ?? null,
      })),
      processing_cost,
      freight_cost,
      bills_total: billsTotal,
      billed_weight_total: billedWeightTotal,
      profit,
      weight_difference,
    },
  };
}

