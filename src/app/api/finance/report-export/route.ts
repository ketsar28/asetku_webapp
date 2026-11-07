import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assetRoi } from "@/lib/reports";
import { vatRecap } from "@/lib/tax";
import { D, RP, wib, xlsxResponse } from "@/lib/xlsx";
export async function GET(req: Request) {
  const s = await getSession(); const sp = new URL(req.url).searchParams, type = sp.get("type"), year = Number(sp.get("year")) || new Date().getFullYear();
  if (!s || !["admin", "finance"].includes(s.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  if (type === "tax") {
    const v = await vatRecap(year);
    return xlsxResponse(`rekap-ppn-${year}`, `PPN ${year}`, [
      { header: "Masa", key: "m", width: 10 }, { header: "Harga Jual (Sewa)", key: "sales", width: 18, fmt: RP }, { header: "DPP Nilai Lain (11/12)", key: "dpp", width: 20, fmt: RP }, { header: "PPN Keluaran", key: "ppn", width: 16, fmt: RP },
      { header: "Retur (Refund)", key: "retur", width: 16, fmt: RP }, { header: "PPN Neto", key: "net", width: 16, fmt: RP }, { header: "Sudah Disetor", key: "paid", width: 16, fmt: RP }, { header: "Sisa", key: "left", width: 16, fmt: RP },
      { header: "Jatuh Tempo", key: "dl", width: 14, fmt: D }, { header: "Status", key: "st", width: 14 },
    ], v.map((r) => ({ m: r.period, sales: r.sales, dpp: r.dpp, ppn: r.ppn, retur: r.retur, net: r.net, paid: r.paid, left: r.left, dl: wib(r.deadline), st: r.status })), { sum: ["sales", "dpp", "ppn", "retur", "net", "paid", "left"] });
  }
  if (type === "depreciation") {
    const { DEFAULT_LIFE, LIFE_MONTHS, depr } = await import("@/lib/depreciation"), { prisma } = await import("@/lib/prisma");
    const a = await prisma.asset.findMany({ where: { status: { notIn: ["disposed", "sold"] }, purchaseCost: { gt: 0 } }, include: { category: true }, orderBy: { assetCode: "asc" } });
    return xlsxResponse(`penyusutan-aset-${new Date().toISOString().slice(0, 10)}`, "Penyusutan", [
      { header: "Kode", key: "code", width: 12 }, { header: "Aset", key: "name", width: 32 }, { header: "Kategori", key: "cat", width: 24 }, { header: "Tgl Perolehan", key: "tgl", width: 14, fmt: D }, { header: "Harga Perolehan", key: "cost", width: 18, fmt: RP },
      { header: "Umur (bulan)", key: "life", width: 12 }, { header: "Penyusutan/Bulan", key: "mon", width: 18, fmt: RP }, { header: "Akumulasi", key: "acc", width: 18, fmt: RP }, { header: "Nilai Buku", key: "book", width: 18, fmt: RP },
    ], a.map((x) => { const life = LIFE_MONTHS[x.category.name] ?? DEFAULT_LIFE, d = depr(Number(x.purchaseCost), x.purchaseDate ?? x.createdAt, life); return { code: x.assetCode, name: x.name, cat: x.category.name, tgl: wib(x.purchaseDate ?? x.createdAt), cost: Number(x.purchaseCost), life, mon: Math.round(d.monthly), acc: Math.round(d.acc), book: Math.round(d.book) }; }), { sum: ["cost", "mon", "acc", "book"] });
  }
  const r = await assetRoi();
  return xlsxResponse(`laporan-per-aset-${new Date().toISOString().slice(0, 10)}`, "Per Aset", [
    { header: "Kode", key: "code", width: 12 }, { header: "Aset", key: "name", width: 32 }, { header: "Kategori", key: "cat", width: 24 }, { header: "Harga Beli", key: "cost", width: 18, fmt: RP }, { header: "Pendapatan", key: "rev", width: 18, fmt: RP },
    { header: "Refund", key: "ref", width: 16, fmt: RP }, { header: "Biaya Perawatan", key: "mt", width: 18, fmt: RP }, { header: "Laba Bersih", key: "net", width: 18, fmt: RP }, { header: "ROI", key: "roi", width: 10, fmt: "0.0%" }, { header: "Balik Modal (bulan)", key: "pb", width: 18 },
  ], r.sort((a, b) => b.net - a.net).map((a) => ({ code: a.code, name: a.name, cat: a.category, cost: a.cost, rev: a.revenue, ref: a.refund, mt: a.maintenance, net: a.net, roi: a.roi, pb: a.paybackMonths === 0 ? "Sudah" : a.paybackMonths ?? "-" })), { sum: ["cost", "rev", "ref", "mt", "net"] });
}
