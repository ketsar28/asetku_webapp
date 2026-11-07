import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { checkPin, walletMove } from "@/lib/wallet";
import { saleIncomeTx } from "@/lib/purchase";
/** Bayar pesanan pembelian (satu grup) memakai Saldo Dompet, wajib PIN. */
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const { purchaseId, pin } = await req.json();
  const p0 = await prisma.purchase.findUnique({ where: { id: Number(purchaseId) } });
  if (!p0 || p0.userId !== s!.id) throw new ApiError(404, "Pesanan tidak ditemukan");
  const list = await prisma.purchase.findMany({ where: { userId: s!.id, status: { in: ["pending", "approved"] }, paymentStatus: "unpaid", ...(p0.groupNo ? { groupNo: p0.groupNo } : { id: p0.id }) }, include: { asset: true } });
  if (!list.length) throw new ApiError(409, "Tidak ada tagihan yang perlu dibayar");
  await checkPin(s!.id, pin);
  const total = list.reduce((t, p) => t + Number(p.totalAmount), 0), now = new Date();
  await prisma.$transaction(async (tx) => {
    await walletMove(tx, s!.id, -total, { type: "payment", description: `Pembayaran pembelian ${list.length} aset`, refNo: list[0].orderNumber });
    for (const p of list) {
      await tx.purchase.update({ where: { id: p.id }, data: { paymentStatus: "paid", paidAt: now, paymentMethod: "wallet", bankName: "Saldo Dompet", accountName: s!.name, accountNo: null } });
      await tx.transaction.createMany({ data: saleIncomeTx(p, p.asset.name, { paymentMethod: "wallet", bankName: "Saldo Dompet Pembeli", accountName: s!.name, accountNo: null }, now, { id: s!.id, name: "Pembayaran saldo dompet" }) });
    }
  });
  await notify(s!.id, "Pembayaran diterima", `Pembayaran pembelian ${list.length} aset dari Saldo Dompet berhasil.`, { link: "/purchases" });
  return { ok: true };
});
