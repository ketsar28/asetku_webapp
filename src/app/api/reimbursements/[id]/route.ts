import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { notify } from "@/lib/notify";
type P = { params: { id: string } };
/** POST {action: pay|reject, note?, paymentMethod...}. Dibayar: langsung tercatat sebagai kas keluar di Laporan Keuangan. */
export const POST = route(["admin"], async (s, req: Request, { params }: P) => {
  const body = await req.json(), { action, note } = body;
  const out = await prisma.$transaction(async (tx) => {
    const r = await tx.reimbursement.findUnique({ where: { id: Number(params.id) }, include: { employee: true } });
    if (!r) throw new ApiError(404, "Pengajuan reimburse tidak ditemukan");
    if (r.status !== "pending") throw new ApiError(409, "Pengajuan ini sudah diproses");
    const now = new Date();
    if (action === "reject") { need(String(note ?? "").trim(), "Alasan penolakan wajib diisi"); return tx.reimbursement.update({ where: { id: r.id }, data: { status: "rejected", reviewedBy: s!.id, adminNote: note } }); }
    if (action !== "pay") throw new ApiError(400, "Aksi tidak dikenal");
    const pay = payInfo(body);
    await tx.transaction.create({ data: { type: "expense", category: "Reimburse karyawan", amount: Number(r.amount), description: `Reimburse ${r.category} - ${r.employee.name} (${r.employee.position}): ${r.description.slice(0, 200)}${r.employee.bankName ? ` | ke ${r.employee.bankName} ${r.employee.accountNo ?? ""}` : ""}`, txDate: now, source: "reimburse", refNo: r.claimNo, ...pay, createdBy: s!.id, createdByName: s!.name } });
    return tx.reimbursement.update({ where: { id: r.id }, data: { status: "paid", paidAt: now, reviewedBy: s!.id, adminNote: note || null, paymentMethod: pay.paymentMethod, bankName: pay.bankName } });
  });
  const u = await prisma.user.findUnique({ where: { employeeId: out.employeeId }, select: { id: true } });
  if (u) await notify(u.id, out.status === "paid" ? "Reimburse dibayar" : "Reimburse ditolak", out.status === "paid" ? `Reimburse ${out.claimNo} (${out.category}) sebesar Rp ${Number(out.amount).toLocaleString("id-ID")} sudah dibayar.` : `Reimburse ${out.claimNo} ditolak. Alasan: ${note}.`, { link: "/reimburse" });
  return out;
});
/** Karyawan membatalkan pengajuan yang masih menunggu. */
export const DELETE = route(["employee"], async (s, _r: Request, { params }: P) => {
  const u = await prisma.user.findUnique({ where: { id: s!.id }, select: { employeeId: true } });
  const r = await prisma.reimbursement.findUnique({ where: { id: Number(params.id) } });
  if (!r || r.employeeId !== u?.employeeId) throw new ApiError(404, "Pengajuan reimburse tidak ditemukan");
  if (r.status !== "pending") throw new ApiError(409, "Hanya pengajuan yang masih menunggu yang bisa dibatalkan");
  await prisma.reimbursement.delete({ where: { id: r.id } }); return { ok: true };
});
