import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { notifyRoles } from "@/lib/notify";
export const POST = route(["user", "staff", "admin"], async (s, req: Request, { params }: { params: { id: string } }) => {
  const b = await req.json();
  need(typeof b.proofUrl === "string" && b.proofUrl.startsWith("/api/files/proofs/"), "Upload foto bukti transfer terlebih dahulu");
  const p = payInfo(b); if (p.paymentMethod === "cash") throw new ApiError(400, "Pilih Transfer Bank atau QRIS");
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) } });
  if (!loan || (s!.role === "user" && loan.userId !== s!.id)) throw new ApiError(404, "Pengajuan tidak ditemukan");
  const loans = await prisma.loanRequest.findMany({ where: { userId: loan.userId, status: { in: ["pending", "approved"] }, paymentStatus: "unpaid", rentalFee: { gt: 0 }, ...(loan.groupNo ? { groupNo: loan.groupNo } : { id: loan.id }) } });
  if (!loans.length) throw new ApiError(409, "Tidak ada tagihan yang perlu dibayar");
  await prisma.loanRequest.updateMany({ where: { id: { in: loans.map((l) => l.id) } }, data: { paymentStatus: "verifying", paymentOrderId: `MAN-${Date.now().toString(36).toUpperCase()}-${loans[0].id}`, proofUrl: b.proofUrl, ...p } });
  await notifyRoles(["admin", "staff"], "Bukti transfer masuk", `${s!.name} mengunggah bukti transfer untuk ${loans.length} aset. Mohon diverifikasi.`, "/loans");
  return { ok: true };
});
