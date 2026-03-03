import { z } from "zod";

export const shipmentSchema = z.object({
  awb_no: z.string().min(1, "AWB is required"),
  date: z.string().optional(),
  invoice_no: z.string().optional(),
  commercial_invoice_value: z.coerce.number().nonnegative(),
  currency: z.enum(["GBP", "USD"]),
  requested_weight: z.coerce.number().nonnegative(),
  boxes: z.coerce.number().int().nonnegative(),
  con_id: z.coerce.number().int(),
});

export const billSchema = z.object({
  bill_id: z.string().min(1, "Bill ID is required"),
  date: z.string().optional(),
  weight: z.coerce.number().nonnegative(),
  amount: z.coerce.number().nonnegative(),
  supp_id: z.coerce.number().int(),
  awb_no: z.string().min(1),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  opening_balance: z.coerce.number().nonnegative().default(0),
});

export const consigneeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().optional(),
  opening_balance: z.coerce.number().nonnegative().default(0),
  currency: z.enum(["GBP", "USD"]),
});

export const additionalChargesSchema = z.object({
  processing_cost: z.coerce.number().nonnegative(),
  freight_cost: z.coerce.number().nonnegative(),
  awb_no: z.string().min(1),
});

export const paymentSchema = z.object({
  date: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  supp_id: z.coerce.number().int(),
});

export const receiptSchema = z.object({
  date: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  con_id: z.coerce.number().int(),
});

export const settingsSchema = z.object({
  gbp_rate: z.coerce.number().nonnegative(),
  usd_rate: z.coerce.number().nonnegative(),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  logo_url: z.string().optional(),
});

