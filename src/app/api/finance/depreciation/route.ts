import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { DEFAULT_LIFE, LIFE_MONTHS, depr } from "@/lib/depreciation";
/** Penyusutan garis lurus per aset + neraca sederhana (aset, kewajiban, ekuitas). */
export const GET = route(["admin", "finance"], async () => {
  const [assets, ledger, wallets, vatIn, vatPaid, refunded] = await Promise.all([
    prisma.asset.findMany({ where: { status: { notIn: ["disposed", "sold"] }, purchaseCost: { gt: 0 } }, include: { category: true } }),
    prisma.transaction.groupBy({ by: ["type"], where: { voidedAt: null, approval: "approved" }, _sum: { amount: true } }),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.transaction.aggregate({ where: { source: "rental_vat", voidedAt: null, approval: "approved" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { source: "tax_vat", voidedAt: null, approval: "approved" }, _sum: { amount: true } }),
    prisma.loanRequest.aggregate({ where: { paymentStatus: "refunded" }, _sum: { vatAmount: true } }),
  ]);
  const rows = assets.map((a) => { const cost = Number(a.purchaseCost), life = LIFE_MONTHS[a.category.name] ?? DEFAULT_LIFE, d = depr(cost, a.purchaseDate ?? a.createdAt, life); return { id: a.id, code: a.assetCode, name: a.name, category: a.category.name, cost, lifeMonths: life, ageMonths: d.months, monthly: Math.round(d.monthly), accumulated: Math.round(d.acc), book: Math.round(d.book) }; });
  const sum = (k: "cost" | "monthly" | "accumulated" | "book") => rows.reduce((t, r) => t + r[k], 0), cat = new Map<string, any>();
  for (const r of rows) { const c = cat.get(r.category) ?? { name: r.category, n: 0, cost: 0, monthly: 0, accumulated: 0, book: 0 }; c.n++; c.cost += r.cost; c.monthly += r.monthly; c.accumulated += r.accumulated; c.book += r.book; cat.set(r.category, c); }
  const inc = Number(ledger.find((l) => l.type === "income")?._sum.amount ?? 0), exp = Number(ledger.find((l) => l.type === "expense")?._sum.amount ?? 0);
  const kas = inc - exp, aset = sum("book"), wallet = Number(wallets._sum.walletBalance ?? 0), ppn = Math.max(0, Number(vatIn._sum.amount ?? 0) - Number(refunded._sum.vatAmount ?? 0) - Number(vatPaid._sum.amount ?? 0));
  return { rows: rows.sort((a, b) => b.book - a.book), categories: Array.from(cat.values()), totals: { cost: sum("cost"), monthly: sum("monthly"), accumulated: sum("accumulated"), book: aset },
    balance: { kas, aset, totalAset: kas + aset, wallet, ppn, kewajiban: wallet + ppn, ekuitas: kas + aset - wallet - ppn } };
});
