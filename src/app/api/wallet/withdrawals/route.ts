import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { rpS, walletMove } from "@/lib/wallet";
export const GET = route(["admin", "staff"], async () => {
  const txs = await prisma.walletTx.findMany({ where: { type: "withdraw" }, orderBy: { createdAt: "desc" }, take: 200 });
  const us = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(txs.map((t) => t.userId))) } }, select: { id: true, name: true, phone: true } });
  const m = new Map(us.map((u) => [u.id, u]));
  return txs.map((t) => ({ ...t, amount: Math.abs(Number(t.amount)), user: m.get(t.userId) }));
});
export const POST = route(["admin", "staff"], async (_s, req: Request) => {
  const b = await req.json(); const t = await prisma.walletTx.findUnique({ where: { id: Number(b.id) } });
  if (!t || t.type !== "withdraw") throw new ApiError(404, "Permintaan tidak ditemukan");
  const amt = Math.abs(Number(t.amount));
  if (b.approve) {
    const r = await prisma.walletTx.updateMany({ where: { id: t.id, status: "pending" }, data: { status: "done", processedAt: new Date(), note: b.note || null } });
    if (!r.count) throw new ApiError(409, "Permintaan sudah diproses");
    await notify(t.userId, "Penarikan saldo berhasil", `${rpS(amt)} sudah ditransfer ke ${t.bankName} ${t.accountNo}.`, { link: "/wallet" });
  } else {
    need(b.note?.trim(), "Alasan penolakan wajib diisi");
    await prisma.$transaction(async (tx) => {
      const r = await tx.walletTx.updateMany({ where: { id: t.id, status: "pending" }, data: { status: "rejected", processedAt: new Date(), note: b.note } });
      if (!r.count) throw new ApiError(409, "Permintaan sudah diproses");
      await walletMove(tx, t.userId, amt, { type: "withdraw_back", description: `Penarikan ditolak: ${b.note}`, refNo: String(t.id) });
    });
    await notify(t.userId, "Penarikan saldo ditolak", `${rpS(amt)} dikembalikan ke Saldo Dompet. Alasan: ${b.note}`, { link: "/wallet" });
  }
  return { ok: true };
});
