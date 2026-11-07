import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { PASSWORD_HINT, passwordOk } from "@/lib/password";
const sel = { name: true, email: true, phone: true, role: true } as const;
export const GET = route(["admin", "staff", "finance", "user", "employee"], async (s) => prisma.user.findUnique({ where: { id: s!.id }, select: sel }));
export const PATCH = route(["admin", "staff", "finance", "user", "employee"], async (s, req: Request) => {
  const b = await req.json(); const data: any = {};
  if (b.name !== undefined) { need(b.name.trim(), "Nama wajib diisi"); data.name = b.name.trim(); }
  if (b.phone !== undefined) data.phone = b.phone || null;
  if (b.newPassword) {
    need(passwordOk(b.newPassword), PASSWORD_HINT);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: s!.id } });
    if (!(await bcrypt.compare(String(b.currentPassword ?? ""), u.passwordHash))) throw new ApiError(400, "Password saat ini salah");
    data.passwordHash = await bcrypt.hash(b.newPassword, 10);
  }
  return prisma.user.update({ where: { id: s!.id }, data, select: sel });
});
