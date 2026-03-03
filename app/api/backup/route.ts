import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { buildWorkbookFromTables } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createServerSupabaseClient();

  const tableNames = [
    "shipment",
    "bill",
    "supplier",
    "consignee",
    "pay",
    "receive",
    "additional_charges",
    "settings",
  ];

  const tables: Record<string, any[]> = {};

  const results = await Promise.all(
    tableNames.map((name) =>
      supabase.from(name).select("*").then((res) => ({ name, ...res })),
    ),
  );

  for (const result of results) {
    if (result.error) {
      return NextResponse.json(
        { error: `Failed to load table ${result.name}` },
        { status: 500 },
      );
    }
    tables[result.name] = result.data ?? [];
  }

  const workbookBuffer = buildWorkbookFromTables(tables);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const filename = `Lowe_Holdings_Backup_${yyyy}_${mm}_${dd}.xlsx`;

  return new Response(new Uint8Array(workbookBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });

}

