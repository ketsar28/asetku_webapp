import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { loanIncomeTx } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { settleOrder } from "@/lib/payments";
import { refundToWallet } from "@/lib/wallet";
/** action: "approve" = terima pembayaran | "refund" = uang SUDAH masuk tetapi pesanan ditolak (refund ke Dompet) | "reject" = bukti tidak valid, uang BELUM diterima */
export const POST = route(["admin", "staff"], async (s, req: Request, { params }: { params: { id: string } }) => {
  const b = await req.json(); const action = b.action ?? (b.approve ? "approve" : "reject");
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) } });
  const loans = loan?.paymentOrderId ? await prisma.loanRequest.findMany({ where: { paymentOrderId: loan.paymentOrderId, paymentStatus: "verifying" }, include: { asset: true } }) : [];
  if (!loan || !loans.length) throw new ApiError(409, "Tidak ada bukti transfer yang perlu diverifikasi");
  if (action === "approve") await settleOrder(loan.paymentOrderId!, { paymentMethod: loan.paymentMethod, bankName: loan.bankName, accountNo: loan.accountNo, accountName: loan.accountName });
  else if (action === "refund") {
    if (!String(b.note ?? "").trim()) throw new ApiError(400, "Alasan penolakan pesanan wajib diisi");
    const now = new Date(), by = { id: s!.id, name: s!.name };
    await prisma.$transaction(async (tx) => {
      for (const l of loans) { // uang dicatat masuk, pesanan ditolak, lalu dikembalikan ke Saldo Dompet (satu transaksi atomik)
        const paid = await tx.loanRequest.update({ where: { id: l.id }, data: { paymentStatus: "paid", paidAt: now } });
        await tx.transaction.createMany({ data: loanIncomeTx(paid, l.asset.name, { paymentMethod: l.paymentMethod, bankName: l.bankName, accountName: l.accountName, accountNo: l.accountNo }, now, by) });
        await tx.loanRequest.update({ where: { id: l.id }, data: { status: "rejected", approvedBy: s!.id, adminNote: b.note } });
        await refundToWallet(tx, paid, l.asset.name, by);
      }
    });
    await notify(loan.userId, "Pesanan ditolak, pembayaran dikembalikan", `Pesanan ${loan.requestNumber} ditolak. Alasan: ${b.note}. Pembayaran Anda sudah masuk ke Saldo Dompet.`, { link: "/wallet" });
  } else {
    await prisma.loanRequest.updateMany({ where: { id: { in: loans.map((l) => l.id) } }, data: { paymentStatus: "unpaid", paymentOrderId: null, proofUrl: null, adminNote: `Bukti transfer ditolak ${new Date().toLocaleString("id-ID")}${b.note ? `: ${b.note}` : ""}. File: ${loan.proofUrl}` } });
    await notify(loan.userId, "Bukti transfer ditolak", `Bukti untuk ${loan.requestNumber} tidak dapat diverifikasi${b.note ? `: ${b.note}` : ""}. Jika Anda sudah mentransfer, hubungi admin agar dananya diperiksa.`, { link: "/loans" });
  }
  return { ok: true };
});
