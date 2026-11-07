import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { queryTx, payInfo, stamp } from "@/lib/finance";
import { audit } from "@/lib/audit";
import { notifyRoles } from "@/lib/notify";
const LIMIT = Number(process.env.APPROVAL_LIMIT ?? 5000000);
const rpS = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const GET = route(["admin", "finance"], async (_s, req: Request) => {
  const rows = (await queryTx(new URL(req.url).searchParams)).map((r) => ({ ...r, amount: Number(r.amount) }));
  let income = 0, expense = 0;
  const pay: Record<string, any> = {}, cat: Record<string, { type: string; total: number }> = {}, mon: Record<string, { month: string; income: number; expense: number }> = {};
  for (const r of rows) {
    const pk = `${r.paymentMethod}|${r.bankName ?? ""}`; pay[pk] ??= { method: r.paymentMethod, bank: r.bankName ?? "", income: 0, expense: 0 }; pay[pk][r.type] += r.amount;
    const m = r.txDate.toISOString().slice(0, 7); mon[m] ??= { month: m, income: 0, expense: 0 }; mon[m][r.type] += r.amount;
    cat[`${r.type}|${r.category}`] ??= { type: r.type, total: 0 }; cat[`${r.type}|${r.category}`].total += r.amount;
    r.type === "income" ? (income += r.amount) : (expense += r.amount);
  }
  return {
    rows, summary: { income, expense, balance: income - expense },
    payments: Object.values(pay).sort((a: any, b: any) => b.income + b.expense - (a.income + a.expense)),
    monthly: Object.values(mon).sort((a, b) => a.month.localeCompare(b.month)),
    categories: Object.entries(cat).map(([k, v]) => ({ name: k.split("|")[1], ...v })).sort((a, b) => b.total - a.total),
  };
});

export const POST = route(["admin", "finance"], async (s, req: Request) => {
  const b = await req.json(); const amount = Number(b.amount);
  need(["income", "expense"].includes(b.type) && b.category?.trim() && b.description?.trim() && b.txDate, "Jenis, kategori, tanggal, dan keterangan wajib diisi");
  need(amount > 0, "Nominal harus lebih dari 0");
  need(!b.attachmentUrl || String(b.attachmentUrl).startsWith("/api/files/receipts/"), "Lampiran tidak valid");
  const pending = s!.role === "finance" && b.type === "expense" && amount >= LIMIT;
  const t = await prisma.transaction.create({ data: { type: b.type, category: b.category.trim(), amount, ...payInfo(b), description: b.description, txDate: stamp(b.txDate), attachmentUrl: b.attachmentUrl || null, approval: pending ? "pending" : "approved", createdBy: s!.id, createdByName: s!.name } });
  await audit({ id: s!.id, name: s!.name }, "create_transaction", "transaction", `${b.type === "income" ? "Masuk" : "Keluar"} ${rpS(amount)} • ${b.category} • ${b.description}${pending ? " (menunggu persetujuan)" : ""}`, t.id);
  if (pending) await notifyRoles(["admin"], "Pengeluaran menunggu persetujuan", `${s!.name} mencatat pengeluaran ${rpS(amount)} (${b.category}).`, "/finance");
  return { ...t, pending };
});

/** Transaksi tidak dihapus: ditandai batal (void) beserta alasan, dan tercatat di jejak audit. */
export const DELETE = route(["admin", "finance"], async (s, req: Request) => {
  const { id, reason } = await req.json(); need(String(reason ?? "").trim(), "Alasan pembatalan wajib diisi");
  const t = await prisma.transaction.findUnique({ where: { id } });
  if (!t) throw new ApiError(404, "Transaksi tidak ditemukan");
  if (t.source !== "manual") throw new ApiError(409, "Transaksi otomatis dari sistem tidak bisa dibatalkan manual");
  if (t.voidedAt) throw new ApiError(409, "Transaksi sudah dibatalkan");
  await prisma.transaction.update({ where: { id }, data: { voidedAt: new Date(), voidReason: String(reason).trim().slice(0, 250) } });
  await audit({ id: s!.id, name: s!.name }, "void_transaction", "transaction", `${t.category} ${rpS(Number(t.amount))} dibatalkan: ${reason}`, id);
  return { ok: true };
});

export const PATCH = route(["admin"], async (s, req: Request) => {
  const { id, approve, note } = await req.json(); const t = await prisma.transaction.findUnique({ where: { id } });
  if (!t || t.approval !== "pending") throw new ApiError(409, "Tidak ada pengeluaran yang menunggu persetujuan");
  await prisma.transaction.update({ where: { id }, data: approve ? { approval: "approved" } : { approval: "rejected", voidedAt: new Date(), voidReason: note || "Ditolak admin" } });
  await audit({ id: s!.id, name: s!.name }, approve ? "approve_expense" : "reject_expense", "transaction", `${t.category} ${rpS(Number(t.amount))}${note ? `: ${note}` : ""}`, id);
  return { ok: true };
});
