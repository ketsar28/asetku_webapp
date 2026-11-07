import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
/** Membayar gaji: slip menjadi "paid" dan pengeluaran otomatis masuk Laporan Keuangan. */
export const POST = route(["admin"], async (s, req: Request) => {
  const b = await req.json(); need(Array.isArray(b.ids) && b.ids.length, "Pilih slip yang akan dibayar");
  const pay = payInfo(b); const now = new Date();
  const slips = await prisma.payroll.findMany({ where: { id: { in: b.ids.map(Number) }, status: "draft" }, include: { employee: true } });
  if (!slips.length) throw new ApiError(409, "Tidak ada slip draft yang bisa dibayar");
  await prisma.$transaction(slips.flatMap((p) => [
    prisma.payroll.update({ where: { id: p.id }, data: { status: "paid", paidAt: now, paymentMethod: pay.paymentMethod, bankName: pay.bankName } }),
    prisma.transaction.create({ data: { type: "expense", category: "Gaji karyawan", amount: p.net, description: `Gaji ${p.period} - ${p.employee.name} (${p.employee.position})${p.employee.bankName ? ` ke ${p.employee.bankName} ${p.employee.accountNo ?? ""}` : ""}`, txDate: now, source: "payroll", refNo: p.slipNo, ...pay, createdBy: s!.id, createdByName: s!.name } }),
  ]));
  return { paid: slips.length, total: slips.reduce((t, p) => t + Number(p.net), 0) };
});
