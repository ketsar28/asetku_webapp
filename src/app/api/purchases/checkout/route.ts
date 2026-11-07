import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { saleCharges } from "@/lib/pricing";
/** Menyimpan asuransi atau metode pembayaran pilihan pembeli untuk seluruh pesanan satu grup yang belum dibayar. */
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const b = await req.json();
  const p0 = await prisma.purchase.findUnique({ where: { id: Number(b.purchaseId) } });
  if (!p0 || (s!.role === "user" && p0.userId !== s!.id)) throw new ApiError(404, "Pesanan tidak ditemukan");
  const where = { userId: p0.userId, paymentStatus: "unpaid", status: { in: ["pending", "approved"] as ("pending" | "approved")[] }, ...(p0.groupNo ? { groupNo: p0.groupNo } : { id: p0.id }) };
  if (typeof b.insurance === "boolean") {
    const list = await prisma.purchase.findMany({ where });
    await prisma.$transaction(list.map((p) => { const c = saleCharges(Number(p.price), b.insurance); return prisma.purchase.update({ where: { id: p.id }, data: { insurance: c.insurance > 0, insuranceFee: c.insurance, vatAmount: c.vat, totalAmount: c.total } }); }));
    return { ok: true };
  }
  need(["cash", "transfer", "qris"].includes(b.paymentMethod), "Metode pembayaran tidak valid");
  await prisma.purchase.updateMany({ where, data: { paymentMethod: b.paymentMethod, bankName: b.bankName || null } });
  return { ok: true };
});
