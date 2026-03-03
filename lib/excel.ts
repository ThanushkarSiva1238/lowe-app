import * as XLSX from "xlsx";

/**
 * Build a simple Excel workbook from a map of table name → rows.
 * Each key becomes a worksheet; values are exported using json_to_sheet.
 */
export function buildWorkbookFromTables(
  tables: Record<string, any[]>,
): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const [rawName, rows] of Object.entries(tables)) {
    const safeName =
      rawName.length > 31 ? rawName.slice(0, 31) : rawName || "Sheet";

    const data = Array.isArray(rows) ? rows : [];
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return buffer;
}

