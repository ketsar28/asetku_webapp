import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { POSITIONS } from "@/lib/payroll";
import { ensureEmployeeAccount, DEFAULT_PASSWORD } from "@/lib/employee-account";
const NULLABLE = ["nik", "phone", "email", "address", "kpiNote", "bankName", "accountName", "accountNo", "photoUrl", "idPhotoUrl"];
function clean(b: any) {
  const d: any = {};
  for (const k of NULLABLE) if (b[k] !== undefined) d[k] = b[k] === "" ? null : b[k];
  for (const k of ["name", "position", "gender", "status"]) if (b[k]) d[k] = b[k];
  if (d.position) need(POSITIONS.includes(d.position), "Jabatan tidak valid");
  if (b.birthDate !== undefined) d.birthDate = b.birthDate ? new Date(b.birthDate) : null;
  if (b.joinDate) d.joinDate = new Date(b.joinDate);
  for (const k of ["baseSalary", "allowance"]) if (b[k] !== undefined) d[k] = Math.max(0, Number(b[k]) || 0);
  if (b.kpiScore !== undefined) d.kpiScore = Math.min(100, Math.max(0, Math.round(Number(b.kpiScore) || 0)));
  return d;
}
export const GET = route(["admin"], async () => prisma.employee.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] }));
export const POST = route(["admin"], async (_s, req: Request) => {
  const b = await req.json(); need(b.name?.trim() && b.position && b.joinDate, "Nama, jabatan, dan tanggal bergabung wajib diisi");
  return prisma.$transaction(async (tx) => {
    const e = await tx.employee.create({ data: { ...clean(b), employeeNo: `TMP-${Date.now()}` } });
    const upd = await tx.employee.update({ where: { id: e.id }, data: { employeeNo: `EMP-${String(e.id).padStart(3, "0")}` } });
    const acc = await ensureEmployeeAccount(tx, upd); // akun login otomatis: nama depan@asetku.org
    return { ...upd, email: acc.email, accountEmail: acc.email, accountPassword: DEFAULT_PASSWORD };
  });
});
export const PATCH = route(["admin"], async (_s, req: Request) => {
  const b = await req.json(), d = clean(b);
  const { email: _ignored, ...data } = d; // email akun dikelola otomatis
  return prisma.$transaction(async (tx) => {
    const e = await tx.employee.update({ where: { id: Number(b.id) }, data });
    if (d.status) await tx.user.updateMany({ where: { employeeId: e.id }, data: { isActive: d.status === "active" } }); // karyawan nonaktif tidak bisa login
    if (d.name) await tx.user.updateMany({ where: { employeeId: e.id }, data: { name: d.name } });
    if (e.status === "active") await ensureEmployeeAccount(tx, e);
    return e;
  });
});
export const DELETE = route(["admin"], async (_s, req: Request) => {
  const { id } = await req.json();
  if (await prisma.payroll.count({ where: { employeeId: id } })) throw new ApiError(409, "Karyawan memiliki riwayat gaji. Ubah statusnya menjadi nonaktif.");
  if ((await prisma.overtimeRequest.count({ where: { employeeId: id } })) + (await prisma.reimbursement.count({ where: { employeeId: id } }))) throw new ApiError(409, "Karyawan memiliki riwayat lembur atau reimburse. Ubah statusnya menjadi nonaktif.");
  try {
    await prisma.$transaction(async (tx) => { // hapus akun loginnya lebih dulu
      const u = await tx.user.findUnique({ where: { employeeId: id }, select: { id: true } });
      if (u) { await tx.notification.deleteMany({ where: { userId: u.id } }); await tx.user.delete({ where: { id: u.id } }); }
      await tx.employee.delete({ where: { id } });
    });
  } catch { throw new ApiError(409, "Karyawan memiliki data terkait. Ubah statusnya menjadi nonaktif."); }
  return { ok: true };
});
