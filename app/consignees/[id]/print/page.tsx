import { redirect } from "next/navigation";
import { loadConsigneeAccount } from "@/app/consignees/accountData";
import { PrintLayout } from "@/components/print/PrintLayout";
import { PrintButton } from "@/components/print/PrintButton";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

export default async function ConsigneePrintPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
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

  return (
    <div className="bg-slate-100 print:bg-white">
      <PrintButton />
      <PrintLayout
        title={`Consignee statement – ${account.name} (${account.currency})`}
      >
        <section className="mb-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Summary
          </h2>
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="pr-2 text-slate-500">Consignee</td>
                <td className="font-medium text-slate-900">{account.name}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Opening balance</td>
                <td>
                  {formatCurrency(account.opening_balance, account.currency)}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">
                  Total invoice ({account.currency})
                </td>
                <td>
                  {formatCurrency(account.total_invoice, account.currency)}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Total receipts</td>
                <td>
                  {formatCurrency(account.total_receipts, account.currency)}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Total shipments</td>
                <td>{account.total_shipments}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Avg. profit / shipment</td>
                <td>
                  {account.avg_profit_per_shipment_lkr != null
                    ? formatCurrency(
                        account.avg_profit_per_shipment_lkr,
                        "LKR",
                      )
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Avg. payment delay</td>
                <td>
                  {account.avg_payment_delay_days != null
                    ? `${account.avg_payment_delay_days.toFixed(1)} days`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-700">Current balance</td>
                <td>
                  {formatCurrency(account.current_balance, account.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Account statement
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="px-1 py-1 text-left">Date</th>
                <th className="px-1 py-1 text-left">Type</th>
                <th className="px-1 py-1 text-left">Details</th>
                <th className="px-1 py-1 text-right">
                  Invoice ({account.currency})
                </th>
                <th className="px-1 py-1 text-right">
                  Receipt ({account.currency})
                </th>
                <th className="px-1 py-1 text-right">
                  Balance ({account.currency})
                </th>
              </tr>
            </thead>
            <tbody>
              {account.rows.map((row, idx) => (
                <tr key={`${row.type}-${idx}`} className="border-b border-slate-100">
                  <td className="px-1 py-1">
                    {formatDateDdMmYyyy(row.date)}
                  </td>
                  <td className="px-1 py-1">
                    {row.type === "opening"
                      ? "Opening"
                      : row.type === "shipment"
                        ? "Shipment"
                        : "Receipt"}
                  </td>
                  <td className="px-1 py-1">
                    {row.type === "shipment" && row.awb_no
                      ? `${row.description}`
                      : row.description}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {row.invoice_lkr
                      ? formatCurrency(row.invoice_lkr, account.currency)
                      : "—"}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {row.receipt_amount
                      ? formatCurrency(row.receipt_amount, account.currency)
                      : "—"}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {formatCurrency(row.balance_after, account.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </PrintLayout>
    </div>
  );
}

