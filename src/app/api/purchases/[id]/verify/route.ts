import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { refundPurchase, releaseAssets, saleIncomeTx } from "@/lib/purchase";
/** action: "approve" = terima pembayaran | "refund" = uang SUDAH masuk tetapi pesanan ditolak (refund ke Saldo Dompet) | "reject" = bukti tidak valid, uang belum diterima */
export const POST = route(["admin", "staff"], async (s, req: Request, { params }: { params: { id: string } }) => {
  const b = await req.json(), action = b.action ?? (b.approve ? "approve" : "reject");
  const p = await prisma.purchase.findUnique({ where: { id: Number(params.id) } });
  const list = p?.paymentOrderId ? await prisma.purchase.findMany({ where: { paymentOrderId: p.paymentOrderId, paymentStatus: "verifying" }, include: { asset: true } }) : [];
  if (!p || !list.length) throw new ApiError(409, "Tidak ada bukti pembayaran yang perlu diverifikasi");
  if (action === "approve") {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const x of list) {
        await tx.purchase.update({ where: { id: x.id }, data: { paymentStatus: "paid", paidAt: now } });
        await tx.transaction.createMany({ data: saleIncomeTx(x, x.asset.name, { paymentMethod: x.paymentMethod, bankName: x.bankName, accountName: x.accountName, accountNo: x.accountNo }, now, { id: s!.id, name: s!.name }) });
      }
    });
    await notify(p.userId, "Pembayaran diterima", `Pembayaran pesanan ${p.orderNumber} sudah diverifikasi. Aset bisa diserahkan setelah pesanan disetujui admin.`, { link: "/purchases" });
  } else if (action === "refund") {
    if (!String(b.note ?? "").trim()) throw new ApiError(400, "Alasan penolakan pesanan wajib diisi");
    const now = new Date(), by = { id: s!.id, name: s!.name };
    await prisma.$transaction(async (tx) => {
      for (const x of list) { // uang dicatat masuk, pesanan ditolak, stok dikembalikan, lalu saldo dikembalikan ke Dompet pembeli (satu transaksi atomik)
        const paid = await tx.purchase.update({ where: { id: x.id }, data: { paymentStatus: "paid", paidAt: now } });
        await tx.transaction.createMany({ data: saleIncomeTx(paid, x.asset.name, { paymentMethod: x.paymentMethod, bankName: x.bankName, accountName: x.accountName, accountNo: x.accountNo }, now, by) });
        await tx.purchase.update({ where: { id: x.id }, data: { status: "rejected", approvedBy: s!.id, adminNote: b.note } });
        await refundPurchase(tx, paid, x.asset.name, by);
        await releaseAssets(tx, [x.assetId]);
      }
    });
    await notify(p.userId, "Pesanan ditolak, pembayaran dikembalikan", `Pesanan ${p.orderNumber} ditolak. Alasan: ${b.note}. Pembayaran Anda sudah masuk ke Saldo Dompet.`, { link: "/wallet" });
  } else {
    await prisma.purchase.updateMany({ where: { id: { in: list.map((x) => x.id) } }, data: { paymentStatus: "unpaid", paymentOrderId: null, proofUrl: null, adminNote: `Bukti pembayaran ditolak ${new Date().toLocaleString("id-ID")}${b.note ? `: ${b.note}` : ""}. File: ${p.proofUrl}` } });
    await notify(p.userId, "Bukti pembayaran ditolak", `Bukti untuk pesanan ${p.orderNumber} tidak dapat diverifikasi${b.note ? `: ${b.note}` : ""}. Jika Anda sudah membayar, hubungi admin.`, { link: "/purchases" });
  }
  return { ok: true };
});
