import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { attachToPayroll, overtimePay, type DayType } from "@/lib/overtime";
type P = { params: { id: string } };
const toUser = async (employeeId: number, title: string, msg: string) => { const u = await prisma.user.findUnique({ where: { employeeId }, select: { id: true } }); if (u) await notify(u.id, title, msg, { link: "/overtime" }); };
/** POST {action: approve|reject, note?}. Disetujui: nominal dihitung dan masuk ke slip gaji (kolom lembur). */
export const POST = route(["admin"], async (s, req: Request, { params }: P) => {
  const { action, note } = await req.json();
  const out = await prisma.$transaction(async (tx) => {
    const o = await tx.overtimeRequest.findUnique({ where: { id: Number(params.id) }, include: { employee: true } });
    if (!o) throw new ApiError(404, "Pengajuan lembur tidak ditemukan");
    if (o.status !== "pending") throw new ApiError(409, "Pengajuan ini sudah diproses");
    if (action === "reject") { need(String(note ?? "").trim(), "Alasan penolakan wajib diisi"); return tx.overtimeRequest.update({ where: { id: o.id }, data: { status: "rejected", reviewedBy: s!.id, reviewedAt: new Date(), adminNote: note } }); }
    if (action !== "approve") throw new ApiError(400, "Aksi tidak dikenal");
    const amount = overtimePay(Number(o.employee.baseSalary) + Number(o.employee.allowance), Number(o.hours), o.dayType as DayType);
    const link = await attachToPayroll(tx, { employeeId: o.employeeId, workDate: o.workDate }, amount);
    return tx.overtimeRequest.update({ where: { id: o.id }, data: { status: "approved", amount, reviewedBy: s!.id, reviewedAt: new Date(), adminNote: note || null, payPeriod: link.period, payrollId: link.payrollId } });
  });
  const d = out.workDate.toISOString().slice(0, 10), rp = `Rp ${Math.round(Number(out.amount)).toLocaleString("id-ID")}`;
  await toUser(out.employeeId, out.status === "approved" ? "Lembur disetujui" : "Lembur ditolak", out.status === "approved" ? `Lembur ${d} (${out.hours} jam) disetujui sebesar ${rp} dan masuk ke gaji periode ${out.payPeriod}.` : `Lembur ${d} ditolak. Alasan: ${note}.`);
  return out;
});
/** Karyawan membatalkan pengajuan lembur yang masih menunggu. */
export const DELETE = route(["employee"], async (s, _r: Request, { params }: P) => {
  const u = await prisma.user.findUnique({ where: { id: s!.id }, select: { employeeId: true } });
  const o = await prisma.overtimeRequest.findUnique({ where: { id: Number(params.id) } });
  if (!o || o.employeeId !== u?.employeeId) throw new ApiError(404, "Pengajuan lembur tidak ditemukan");
  if (o.status !== "pending") throw new ApiError(409, "Hanya pengajuan yang masih menunggu yang bisa dibatalkan");
  await prisma.overtimeRequest.delete({ where: { id: o.id } }); return { ok: true };
});
