import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { audit } from "@/lib/audit";
import { bookBalances } from "@/lib/reports";
export const GET = route(["admin", "finance"], async (_s, req: Request) => {
  const a = new URL(req.url).searchParams.get("asOf"), asOf = a ? new Date(a) : new Date();
  const [balances, history] = await Promise.all([bookBalances(asOf), prisma.reconciliation.findMany({ orderBy: { createdAt: "desc" }, take: 30 })]);
  return { asOf, balances, history: history.map((h) => ({ ...h, bookBalance: Number(h.bookBalance), actualBalance: Number(h.actualBalance), diff: Number(h.diff) })), gateway: process.env.PAYMENT_MODE === "midtrans" };
});
/** Menyimpan hasil rekonsiliasi: saldo buku dihitung ulang di server, selisih = saldo aktual - saldo buku. */
export const POST = route(["admin", "finance"], async (s, req: Request) => {
  const b = await req.json(); const asOf = b.asOf ? new Date(b.asOf) : new Date(), actual = Number(b.actual);
  need(b.channel && Number.isFinite(actual), "Channel dan saldo aktual wajib diisi");
  const book = (await bookBalances(asOf)).find((x) => x.channel === b.channel && x.bank === (b.bank ?? ""))?.book ?? 0, diff = actual - book;
  await prisma.reconciliation.create({ data: { channel: b.channel, bank: b.bank ?? "", asOf, bookBalance: book, actualBalance: actual, diff, note: b.note || null, createdByName: s!.name } });
  await audit({ id: s!.id, name: s!.name }, "reconcile", "reconciliation", `${b.channel} ${b.bank ?? ""}: buku ${Math.round(book)}, aktual ${Math.round(actual)}, selisih ${Math.round(diff)}`);
  return { diff };
});
