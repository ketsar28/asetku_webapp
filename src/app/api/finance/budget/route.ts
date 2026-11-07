import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { audit } from "@/lib/audit";
const okP = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
export const GET = route(["admin", "finance"], async (_s, req: Request) => {
  const period = new URL(req.url).searchParams.get("period") ?? ""; need(okP(period), "Periode tidak valid");
  const from = new Date(Number(period.slice(0, 4)), Number(period.slice(5)) - 1, 1), to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const [bud, act] = await Promise.all([prisma.budget.findMany({ where: { period } }), prisma.transaction.groupBy({ by: ["category"], where: { type: "expense", voidedAt: null, approval: "approved", source: { not: "tax_vat" }, txDate: { gte: from, lt: to } }, _sum: { amount: true } })]);
  const m = new Map<string, { category: string; budget: number; actual: number }>();
  for (const b of bud) m.set(b.category, { category: b.category, budget: Number(b.amount), actual: 0 });
  for (const a of act) { const x = m.get(a.category) ?? { category: a.category, budget: 0, actual: 0 }; x.actual = Number(a._sum.amount ?? 0); m.set(a.category, x); }
  return Array.from(m.values()).sort((a, b) => b.actual + b.budget - (a.actual + a.budget));
});
export const POST = route(["admin", "finance"], async (s, req: Request) => {
  const b = await req.json(); need(okP(b.period) && Array.isArray(b.items), "Data anggaran tidak valid");
  for (const it of b.items) { const amount = Math.max(0, Math.round(Number(it.amount) || 0)); if (!String(it.category ?? "").trim()) continue;
    await prisma.budget.upsert({ where: { period_category: { period: b.period, category: it.category.trim() } }, update: { amount }, create: { period: b.period, category: it.category.trim(), amount } }); }
  await audit({ id: s!.id, name: s!.name }, "set_budget", "budget", `Anggaran ${b.period} diperbarui (${b.items.length} kategori)`, b.period);
  return { ok: true };
});
