import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryTx } from "@/lib/finance";
import { financeCols, financeRows } from "@/lib/finance-sheet";
import { xlsxResponse } from "@/lib/xlsx";
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !["admin", "finance"].includes(s.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const rows = await queryTx(new URL(req.url).searchParams);
  return xlsxResponse(`laporan-keuangan-${new Date().toISOString().slice(0, 10)}`, "Laporan Keuangan", financeCols, financeRows(rows), { sum: ["masuk", "keluar"], balance: ["masuk", "keluar"] });
}
