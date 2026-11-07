import bcrypt from "bcryptjs";
/** Password awal semua akun karyawan. Karyawan disarankan menggantinya lewat menu Profil. */
export const DEFAULT_PASSWORD = "123456789";
/** Email akun karyawan: nama depan + @asetku.org, contoh "Agus Salim" menjadi agus@asetku.org. */
export const emailFor = (name: string) => `${(name.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") || "karyawan"}@asetku.org`;
/** Membuat akun login (role karyawan) untuk seorang karyawan bila belum punya. Email bentrok diberi angka (agus2@asetku.org). */
export async function ensureEmployeeAccount(db: any, e: { id: number; name: string }) {
  const have = await db.user.findUnique({ where: { employeeId: e.id } });
  if (have) return have;
  const base = emailFor(e.name).replace("@asetku.org", ""); let email = `${base}@asetku.org`, n = 2;
  while (await db.user.findUnique({ where: { email } })) email = `${base}${n++}@asetku.org`;
  const u = await db.user.create({ data: { name: e.name, email, role: "employee", employeeId: e.id, passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10) } });
  await db.employee.update({ where: { id: e.id }, data: { email } });
  return u;
}
