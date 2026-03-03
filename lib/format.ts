export function formatCurrency(amount: number, currencyCode: string): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  const formatted = safeAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} ${currencyCode}`;
}

export function formatDateDdMmYyyy(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB");
}

