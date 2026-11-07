import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { refundPurchase, releaseAssets, saleIncomeTx } from "@/lib/purchase";
type P = { params: { id: string } };
/** POST {action: approve|reject|handover, note?, paymentMethod?...} */
export const POST = route(["admin", "staff"], async (s, req: Request, { params }: P) => {
  const body = await req.json(), { action, note } = body, by = { id: s!.id, name: s!.name };
  const out = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.findUnique({ where: { id: Number(params.id) }, include: { asset: true } });
    if (!p) throw new ApiError(404, "Pesanan tidak ditemukan");
    const must = (st: string[]) => { if (!st.includes(p.status)) throw new ApiError(409, `Status saat ini "${p.status}" tidak valid untuk aksi ini`); };
    if (action === "approve") { must(["pending"]); return tx.purchase.update({ where: { id: p.id }, data: { status: "approved", approvedBy: s!.id, adminNote: note } }); }
    if (action === "reject") {
      must(["pending", "approved"]);
      if (p.paymentStatus === "verifying") throw new ApiError(409, "Pembayaran pembeli sedang diverifikasi. Buka \"Cek bukti\" dulu, lalu terima atau tolak buktinya.");
      need(String(note ?? "").trim(), "Alasan penolakan wajib diisi");
      const upd = await tx.purchase.update({ where: { id: p.id }, data: { status: "rejected", approvedBy: s!.id, adminNote: note } });
      if (p.paymentStatus === "paid") { await refundPurchase(tx, p, p.asset.name, by); }
      await releaseAssets(tx, [p.assetId]);
      return { ...upd, paymentStatus: p.paymentStatus === "paid" ? "refunded" : upd.paymentStatus };
    }
    if (action === "handover") {
      must(["approved"]);
      if (p.paymentStatus === "verifying") throw new ApiError(409, "Bukti pembayaran masih diverifikasi. Selesaikan verifikasi sebelum serah terima.");
      const now = new Date();
      if (p.paymentStatus !== "paid") await tx.transaction.createMany({ data: saleIncomeTx(p, p.asset.name, payInfo(body.paymentMethod ? body : p), now, by) });
      await tx.assetLog.create({ data: { assetId: p.assetId, actionType: "updated", description: `Serah terima pembelian ${p.orderNumber}`, performedBy: s!.id } });
      return tx.purchase.update({ where: { id: p.id }, data: { status: "completed", handedOverAt: now, paymentStatus: "paid", paidAt: p.paidAt ?? now } });
    }
    throw new ApiError(400, "Aksi tidak dikenal");
  });
  const msg: Record<string, [string, string]> = {
    approve: ["Pesanan pembelian disetujui", `Pesanan ${out.orderNumber} disetujui admin. Silakan lakukan pembayaran di menu Pembelian Saya.`],
    reject: ["Pesanan pembelian ditolak", `Pesanan ${out.orderNumber} ditolak. Alasan: ${note}.${out.paymentStatus === "refunded" ? " Pembayaran Anda sudah dikembalikan ke Saldo Dompet." : ""}`],
    handover: ["Pembelian selesai", `Aset pada pesanan ${out.orderNumber} sudah diserahkan dan menjadi milik Anda.`],
  };
  if (msg[action]) await notify(out.userId, msg[action][0], msg[action][1], { link: "/purchases" });
  return out;
});
/** Pembeli membatalkan pesanan yang masih menunggu persetujuan; stok dikembalikan. */
export const DELETE = route(["user", "staff", "admin"], async (s, _r: Request, { params }: P) => {
  const p = await prisma.purchase.findUnique({ where: { id: Number(params.id) }, include: { asset: true } });
  if (!p || (s!.role === "user" && p.userId !== s!.id)) throw new ApiError(404, "Pesanan tidak ditemukan");
  if (p.status !== "pending") throw new ApiError(409, "Hanya pesanan yang masih menunggu yang bisa dibatalkan");
  if (p.paymentStatus === "verifying") throw new ApiError(409, "Bukti pembayaran Anda sedang diverifikasi. Tunggu hasilnya sebelum membatalkan.");
  return prisma.$transaction(async (tx) => {
    const upd = await tx.purchase.update({ where: { id: p.id }, data: { status: "rejected", adminNote: "Dibatalkan oleh pembeli" } });
    if (p.paymentStatus === "paid") await refundPurchase(tx, p, p.asset.name, { id: s!.id, name: s!.name });
    await releaseAssets(tx, [p.assetId]);
    return upd;
  });
});
export const GET = route(["user", "staff", "admin"], async (s, _r: Request, { params }: P) => {
  const p = await prisma.purchase.findUnique({ where: { id: Number(params.id) }, include: { asset: true, user: { select: { name: true, email: true, phone: true } } } });
  if (!p || (s!.role === "user" && p.userId !== s!.id)) throw new ApiError(404, "Data tidak ditemukan"); return p;
});
