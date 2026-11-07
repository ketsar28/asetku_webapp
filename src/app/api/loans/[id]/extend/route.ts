import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { notifyRoles } from "@/lib/notify";
import { charges } from "@/lib/pricing";
/** Perpanjang sewa: membuat pesanan perpanjangan (disetujui & dibayar seperti pesanan biasa) untuk hari setelah tanggal kembali saat ini. */
export const POST = route(["user", "staff", "admin"], async (s, req: Request, { params }: { params: { id: string } }) => {
  const b = await req.json();
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) }, include: { asset: true } });
  if (!loan || (s!.role === "user" && loan.userId !== s!.id)) throw new ApiError(404, "Pesanan tidak ditemukan");
  if (loan.status !== "on_loan" || loan.extensionOf) throw new ApiError(409, "Hanya sewa yang sedang berjalan (pesanan utama) yang bisa diperpanjang");
  const newEnd = new Date(b.newEnd); need(!isNaN(+newEnd) && newEnd > loan.expectedReturnDate, "Tanggal baru harus setelah tanggal kembali saat ini");
  const start = new Date(+loan.expectedReturnDate + 86400000);
  if (await prisma.loanRequest.count({ where: { extensionOf: loan.requestNumber, status: { in: ["pending", "approved"] } } })) throw new ApiError(409, "Sudah ada permintaan perpanjangan yang menunggu");
  if (await prisma.loanRequest.count({ where: { assetId: loan.assetId, id: { not: loan.id }, status: { in: ["pending", "approved", "on_loan", "overdue"] }, startDate: { lte: newEnd }, expectedReturnDate: { gte: start } } })) throw new ApiError(409, "Aset sudah dipesan pihak lain pada tanggal tersebut");
  const days = Math.max(1, Math.round((+newEnd - +start) / 86400000) + 1), fee = Number(loan.asset.rentalRate) * (loan.asset.rentalUnit === "month" ? Math.ceil(days / 30) : days), ch = charges(fee, false), groupNo = `GRP-${Date.now().toString(36).toUpperCase()}`;
  const ext = await prisma.loanRequest.create({ data: { requestNumber: `LN-${Date.now().toString(36).toUpperCase()}X`, userId: loan.userId, assetId: loan.assetId, startDate: start, expectedReturnDate: newEnd, purpose: `Perpanjangan ${loan.requestNumber}`, groupNo, extensionOf: loan.requestNumber, termsAcceptedAt: new Date(), rentalFee: fee, vatAmount: ch.vat, totalAmount: ch.total } });
  await notifyRoles(["admin", "staff"], "Permintaan perpanjangan sewa", `${s!.name} memperpanjang ${loan.asset.name} hingga ${newEnd.toLocaleDateString("id-ID")}.`, "/loans");
  return { id: ext.id, groupNo, total: ch.total };
});
