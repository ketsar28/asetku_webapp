import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { notifyRoles } from "@/lib/notify";
export const POST = route(["user", "staff", "admin"], async (s, req: Request, { params }: { params: { id: string } }) => {
  const b = await req.json();
  need(typeof b.proofUrl === "string" && b.proofUrl.startsWith("/api/files/proofs/"), "Upload foto bukti pembayaran terlebih dahulu");
  const pay = payInfo(b); if (pay.paymentMethod === "cash") throw new ApiError(400, "Pilih Transfer Bank atau QRIS");
  const p = await prisma.purchase.findUnique({ where: { id: Number(params.id) } });
  if (!p || (s!.role === "user" && p.userId !== s!.id)) throw new ApiError(404, "Pesanan tidak ditemukan");
  const list = await prisma.purchase.findMany({ where: { userId: p.userId, status: { in: ["pending", "approved"] }, paymentStatus: "unpaid", ...(p.groupNo ? { groupNo: p.groupNo } : { id: p.id }) } });
  if (!list.length) throw new ApiError(409, "Tidak ada tagihan yang perlu dibayar");
  await prisma.purchase.updateMany({ where: { id: { in: list.map((x) => x.id) } }, data: { paymentStatus: "verifying", paymentOrderId: `MAN-${Date.now().toString(36).toUpperCase()}-${list[0].id}`, proofUrl: b.proofUrl, ...pay } });
  await notifyRoles(["admin", "staff"], "Bukti pembayaran pembelian masuk", `${s!.name} mengunggah bukti pembayaran untuk ${list.length} aset yang dibeli. Mohon diverifikasi.`, "/purchases");
  return { ok: true };
});
