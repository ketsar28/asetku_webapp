import { prisma } from "./prisma";
import { ApiError } from "./api";
/** Data karyawan milik akun yang sedang login (role employee). */
export async function myEmployee(userId: number) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { employee: true } });
  if (!u?.employee || u.employee.status !== "active") throw new ApiError(403, "Akun ini tidak terhubung ke data karyawan yang aktif");
  return u.employee;
}
/** Tanggal "YYYY-MM-DD" yang tidak di masa depan dan tidak lebih lama dari `maxDays` hari. */
export function dateOk(v: unknown, maxDays: number) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (isNaN(+d) || d.toISOString().slice(0, 10) !== v) return null;
  return +d <= Date.now() + 12 * 3600000 && +d >= Date.now() - maxDays * 86400000 ? d : null;
}
