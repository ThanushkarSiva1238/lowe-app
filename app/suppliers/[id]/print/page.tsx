import { redirect } from "next/navigation";
import { loadSupplierAccount } from "@/app/suppliers/accountData";
import { PrintLayout } from "@/components/print/PrintLayout";
import { PrintButton } from "@/components/print/PrintButton";
import { formatCurrency, formatDateDdMmYyyy } from "@/lib/format";

export default async function SupplierPrintPage({
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

  return (
    <div className="bg-slate-100 print:bg-white">
      <PrintButton />
      <PrintLayout title={`Supplier statement – ${account.name} (LKR)`}>
        <section className="mb-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Summary
          </h2>
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="pr-2 text-slate-500">Supplier</td>
                <td className="font-medium text-slate-900">{account.name}</td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Opening balance</td>
                <td>
                  {formatCurrency(account.opening_balance, "LKR")}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Total bills</td>
                <td>
                  {formatCurrency(account.total_bills, "LKR")}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-500">Total payments</td>
                <td>
                  {formatCurrency(account.total_payments, "LKR")}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-slate-700">Current balance</td>
                <td>
                  {formatCurrency(account.current_balance, "LKR")}
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
                <th className="px-1 py-1 text-right">Bill (LKR)</th>
                <th className="px-1 py-1 text-right">Payment (LKR)</th>
                <th className="px-1 py-1 text-right">Balance (LKR)</th>
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
                      : row.type === "bill"
                        ? "Bill"
                        : "Payment"}
                  </td>
                  <td className="px-1 py-1">
                    {row.type === "bill" && row.awb_no
                      ? `${row.description} – AWB ${row.awb_no}`
                      : row.description}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {row.bill_amount
                      ? formatCurrency(row.bill_amount, "LKR")
                      : "—"}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {row.payment_amount
                      ? formatCurrency(row.payment_amount, "LKR")
                      : "—"}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {formatCurrency(row.balance_after, "LKR")}
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

