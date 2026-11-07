import { prisma } from "./prisma";
import { due } from "./pricing";
export const per = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const OK = { voidedAt: null, approval: "approved" };
/** Klasifikasi transaksi: pendapatan, PPN keluaran, refund (pengurang pendapatan), setoran PPN (bukan beban), pembelian aset (investasi), beban operasional. */
export const kind = (t: { type: string; source: string }) =>
  t.type === "income" ? (t.source === "rental_vat" ? "vatIn" : "revenue") : t.source === "refund" ? "refund" : t.source === "tax_vat" ? "vatOut" : t.source === "purchase" ? "capex" : "opex";
export async function monthly(months: number) {
  const now = new Date(), from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const txs = await prisma.transaction.findMany({ where: { ...OK, txDate: { gte: from, lte: now } } });
  const m: Record<string, any> = {};
  for (let i = 0; i < months; i++) m[per(new Date(from.getFullYear(), from.getMonth() + i, 1))] = { revenue: 0, refund: 0, opex: 0, capex: 0, vatIn: 0, vatOut: 0, cashIn: 0, cashOut: 0 };
  for (const t of txs) { const x = m[per(t.txDate)]; if (!x) continue; const a = Number(t.amount); x[kind(t)] += a; t.type === "income" ? (x.cashIn += a) : (x.cashOut += a); }
  const out: any[] = Object.entries(m).map(([month, x]) => ({ month, ...x, recognized: x.revenue, profit: 0 }));
  // Pengakuan pendapatan bertahap: sewa bulanan diakui per bulan masa sewa, bukan sekaligus saat dibayar.
  const rental = txs.filter((t) => t.source === "rental" && t.refNo);
  if (rental.length) {
    const loans = await prisma.loanRequest.findMany({ where: { requestNumber: { in: rental.map((t) => t.refNo!) }, asset: { rentalUnit: "month" } }, select: { requestNumber: true, startDate: true, expectedReturnDate: true } });
    const lm = new Map(loans.map((l) => [l.requestNumber, l])), idx = new Map(out.map((o) => [o.month, o]));
    for (const t of rental) {
      const l = lm.get(t.refNo!); if (!l) continue; const a = Number(t.amount), o0 = idx.get(per(t.txDate)); if (o0) o0.recognized -= a;
      const n = Math.ceil(Math.max(1, Math.round((+l.expectedReturnDate - +l.startDate) / 86400000) + 1) / 30);
      for (let i = 0; i < n; i++) { const o = idx.get(per(new Date(l.startDate.getFullYear(), l.startDate.getMonth() + i, 1))); if (o) o.recognized += a / n; }
    }
  }
  for (const o of out) { o.recognized = Math.round(o.recognized); o.profit = Math.round(o.recognized - o.refund - o.opex); }
  return out;
}
export async function assetRoi() {
  const [assets, txs] = await Promise.all([prisma.asset.findMany({ include: { category: true } }),
    prisma.transaction.findMany({ where: { ...OK, assetId: { not: null }, source: { in: ["rental", "rental_ins", "fine", "refund", "maintenance"] } }, select: { assetId: true, source: true, amount: true } })]);
  const g = new Map<number, { rev: number; refund: number; maint: number }>();
  for (const t of txs) { const x = g.get(t.assetId!) ?? { rev: 0, refund: 0, maint: 0 }, a = Number(t.amount); if (t.source === "refund") x.refund += a; else if (t.source === "maintenance") x.maint += a; else x.rev += a; g.set(t.assetId!, x); }
  return assets.map((a) => {
    const x = g.get(a.id) ?? { rev: 0, refund: 0, maint: 0 }, cost = Number(a.purchaseCost ?? 0), net = x.rev - x.refund - x.maint;
    const age = Math.max(1, (Date.now() - +(a.purchaseDate ?? a.createdAt)) / (30 * 86400000)), mNet = net / age;
    return { id: a.id, code: a.assetCode, name: a.name, category: a.category.name, cost, revenue: x.rev, refund: x.refund, maintenance: x.maint, net, roi: cost ? net / cost : null, paybackMonths: cost > 0 && net >= cost ? 0 : mNet > 0 ? Math.ceil((cost - net) / mNet) : null };
  });
}
export async function receivables() {
  const l = await prisma.loanRequest.findMany({ where: { status: { in: ["pending", "approved"] }, paymentStatus: { in: ["unpaid", "verifying"] }, rentalFee: { gt: 0 } }, include: { asset: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  const b = [{ label: "0–1 hari", max: 1, total: 0, n: 0 }, { label: "2–3 hari", max: 3, total: 0, n: 0 }, { label: "4–7 hari", max: 7, total: 0, n: 0 }, { label: "> 7 hari", max: 99999, total: 0, n: 0 }];
  const rows = l.map((r) => { const age = Math.floor((Date.now() - +r.createdAt) / 86400000), t = due(r), k = b.find((x) => age <= x.max)!; k.total += t; k.n++; return { id: r.id, no: r.requestNumber, user: r.user.name, asset: r.asset.name, total: t, age, status: r.paymentStatus }; });
  return { buckets: b.map(({ label, total, n }) => ({ label, total, n })), rows: rows.slice(-15).reverse(), total: rows.reduce((t, r) => t + r.total, 0) };
}
export async function topTenants() {
  const l = await prisma.loanRequest.findMany({ where: { paymentStatus: "paid" }, select: { userId: true, rentalFee: true, totalAmount: true, user: { select: { name: true } } }, take: 5000 });
  const m = new Map<number, { name: string; total: number; n: number }>();
  for (const r of l) { const x = m.get(r.userId) ?? { name: r.user.name, total: 0, n: 0 }; x.total += due(r); x.n++; m.set(r.userId, x); }
  return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 5);
}
/** Proyeksi sederhana: rata-rata 3 bulan terakhir dan tren linear (regresi) dari deret pendapatan. */
export function projection(s: number[]) {
  const n = s.length; if (n < 2) return { avg3: s[0] ?? 0, trend: s[0] ?? 0 };
  const avg3 = Math.round(s.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, n)), my = s.reduce((a, b) => a + b, 0) / n, mx = (n - 1) / 2;
  const slope = s.reduce((t, y, i) => t + (i - mx) * (y - my), 0) / s.reduce((t, _y, i) => t + (i - mx) ** 2, 0);
  return { avg3, trend: Math.max(0, Math.round(my + slope * (n - mx))) };
}
export async function bookBalances(asOf: Date) {
  const rows = await prisma.transaction.groupBy({ by: ["paymentMethod", "bankName", "type"], where: { ...OK, txDate: { lte: asOf } }, _sum: { amount: true } });
  const m = new Map<string, { channel: string; bank: string; book: number }>();
  for (const r of rows) { const k = `${r.paymentMethod}|${r.bankName ?? ""}`, x = m.get(k) ?? { channel: r.paymentMethod, bank: r.bankName ?? "", book: 0 }; x.book += (r.type === "income" ? 1 : -1) * Number(r._sum.amount ?? 0); m.set(k, x); }
  return Array.from(m.values()).sort((a, b) => a.channel.localeCompare(b.channel) || a.bank.localeCompare(b.bank));
}
