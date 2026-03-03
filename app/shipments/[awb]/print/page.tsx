import { redirect } from "next/navigation";
import { loadShipmentSummary } from "@/app/shipments/summaryData";
import { PrintLayout } from "@/components/print/PrintLayout";
import { PrintButton } from "@/components/print/PrintButton";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

export default async function ShipmentPrintPage({
  params,
}: {
  params: { awb: string } | Promise<{ awb: string }>;
}) {
  const { awb } = await Promise.resolve(params);
  const { summary, error } = await loadShipmentSummary(awb);

  if (!summary && !error) {
    redirect("/shipments");
  }

  return (
    <div className="bg-slate-100 print:bg-white">
      <PrintButton />
      {error ? (
        <div className="mx-auto max-w-[800px] px-6 pt-6 print:hidden">
          <AlertBanner variant="error" title="Could not load print view">
            {error}
          </AlertBanner>
        </div>
      ) : null}

      {summary ? (
        <PrintLayout title={`Shipment summary – AWB ${summary.awb_no}`}>
        <section className="mb-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Shipment details
          </h2>
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="pr-2 text-slate-500">AWB</td>
                <td className="font-medium text-slate-900">{summary.awb_no}</td>
                <td className="pr-2 text-slate-500">Date</td>
                <td>{formatDateDdMmYyyy(summary.date)}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Invoice no.</td>
                <td>{summary.invoice_no ?? "—"}</td>
                <td className="pr-2 text-slate-500">Consignee</td>
                <td>{summary.consignee_name ?? "—"}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Requested kg</td>
                <td>{summary.requested_weight ?? "—"}</td>
                <td className="pr-2 text-slate-500">Boxes</td>
                <td>{summary.boxes ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Financials
          </h2>
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="pr-2 text-slate-500">Invoice value (LKR)</td>
                <td className="font-semibold">
                  {formatCurrency(
                    summary.commercial_invoice_value_lkr,
                    "LKR",
                  )}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Bills total</td>
                <td>{formatCurrency(summary.bills_total, "LKR")}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Processing cost</td>
                <td>{formatCurrency(summary.processing_cost, "LKR")}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Freight cost</td>
                <td>{formatCurrency(summary.freight_cost, "LKR")}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-700">Profit (LKR)</td>
                <td className="font-semibold">
                  {formatCurrency(summary.profit, "LKR")}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Weight summary
          </h2>
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="pr-2 text-slate-500">Requested kg</td>
                <td>{summary.requested_weight ?? "—"}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Billed kg</td>
                <td>{summary.billed_weight_total.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-700">Difference</td>
                <td>{summary.weight_difference.toFixed(2)} kg</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Supplier bills
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="px-1 py-1 text-left">Date</th>
                <th className="px-1 py-1 text-left">Bill ID</th>
                <th className="px-1 py-1 text-left">Supplier</th>
                <th className="px-1 py-1 text-right">Weight (kg)</th>
                <th className="px-1 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.bills.map((b) => (
                <tr key={b.bill_id} className="border-b border-slate-100">
                <td className="px-1 py-1">
                  {formatDateDdMmYyyy(b.date)}
                </td>
                  <td className="px-1 py-1">{b.bill_id}</td>
                  <td className="px-1 py-1">{b.supplier_name ?? "—"}</td>
                  <td className="px-1 py-1 text-right">
                    {b.weight.toFixed(2)}
                  </td>
                <td className="px-1 py-1 text-right">
                  {formatCurrency(b.amount, "LKR")}
                </td>
                </tr>
              ))}
              {summary.bills.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-1 py-3 text-center text-[11px] text-slate-500"
                  >
                    No bills attached.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </PrintLayout>
      ) : null}
    </div>
  );
}

