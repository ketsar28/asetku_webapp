import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { loanIncomeTx } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { due } from "@/lib/pricing";
import { checkPin, walletMove } from "@/lib/wallet";
/** Bayar tagihan (satu pesanan/grup) memakai Saldo Dompet, wajib PIN. */
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const { loanId, pin } = await req.json();
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(loanId) } });
  if (!loan || loan.userId !== s!.id) throw new ApiError(404, "Pesanan tidak ditemukan");
  const loans = await prisma.loanRequest.findMany({ where: { userId: s!.id, status: { in: ["pending", "approved"] }, paymentStatus: "unpaid", rentalFee: { gt: 0 }, ...(loan.groupNo ? { groupNo: loan.groupNo } : { id: loan.id }) }, include: { asset: true } });
  if (!loans.length) throw new ApiError(409, "Tidak ada tagihan yang perlu dibayar");
  await checkPin(s!.id, pin);
  const total = loans.reduce((t, l) => t + due(l), 0), now = new Date();
  await prisma.$transaction(async (tx) => {
    await walletMove(tx, s!.id, -total, { type: "payment", description: `Pembayaran sewa ${loans.length} aset`, refNo: loans[0].requestNumber });
    for (const l of loans) {
      await tx.loanRequest.update({ where: { id: l.id }, data: { paymentStatus: "paid", paidAt: now, paymentMethod: "wallet", bankName: "Saldo Dompet", accountName: s!.name, accountNo: null } });
      await tx.transaction.createMany({ data: loanIncomeTx(l, l.asset.name, { paymentMethod: "wallet", bankName: "Saldo Dompet Penyewa", accountName: s!.name, accountNo: null }, now, { id: s!.id, name: "Pembayaran saldo dompet" }) });
    }
  });
  await notify(s!.id, "Pembayaran diterima", `Pembayaran sewa ${loans.length} aset dari Saldo Dompet berhasil.`, { link: "/loans" });
  return { ok: true };
});
