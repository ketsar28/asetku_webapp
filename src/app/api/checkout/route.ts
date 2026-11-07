import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { charges } from "@/lib/pricing";
/** Menyimpan metode pembayaran pilihan penyewa untuk seluruh pesanan (satu grup). */
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const b = await req.json();
  if (typeof b.insurance === "boolean") {
    const l0 = await prisma.loanRequest.findUnique({ where: { id: Number(b.loanId) } });
    if (!l0 || (s!.role === "user" && l0.userId !== s!.id)) throw new ApiError(404, "Pesanan tidak ditemukan");
    const list = await prisma.loanRequest.findMany({ where: { userId: l0.userId, paymentStatus: "unpaid", status: { in: ["pending", "approved"] }, ...(l0.groupNo ? { groupNo: l0.groupNo } : { id: l0.id }) } });
    await prisma.$transaction(list.map((l) => { const c = charges(Number(l.rentalFee), b.insurance); return prisma.loanRequest.update({ where: { id: l.id }, data: { insurance: c.insurance > 0, insuranceFee: c.insurance, vatAmount: c.vat, totalAmount: c.total } }); }));
    return { ok: true };
  }
  need(["cash", "transfer", "qris"].includes(b.paymentMethod), "Metode pembayaran tidak valid");
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(b.loanId) } });
  if (!loan || (s!.role === "user" && loan.userId !== s!.id)) throw new ApiError(404, "Pesanan tidak ditemukan");
  await prisma.loanRequest.updateMany({ where: { userId: loan.userId, paymentStatus: "unpaid", status: { in: ["pending", "approved"] }, ...(loan.groupNo ? { groupNo: loan.groupNo } : { id: loan.id }) }, data: { paymentMethod: b.paymentMethod, bankName: b.bankName || null } });
  return { ok: true };
});
