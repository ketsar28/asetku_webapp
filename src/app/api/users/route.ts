import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { PASSWORD_HINT, passwordOk } from "@/lib/password";
const pub = { id: true, name: true, email: true, role: true, phone: true, isActive: true, departmentId: true, department: { select: { name: true } } } as const;
export const GET = route(["admin"], async () => prisma.user.findMany({ select: pub, orderBy: { createdAt: "desc" } }));
export const POST = route(["admin"], async (_s, req: Request) => {
  const b = await req.json();
  need(b.name && /^\S+@\S+\.\S+$/.test(b.email) && b.password?.length >= 8, "Nama, email valid, dan password minimal 8 karakter wajib diisi");
  return prisma.user.create({ select: pub, data: { name: b.name, email: b.email, phone: b.phone || null, role: b.role ?? "user", departmentId: b.departmentId ? Number(b.departmentId) : null, passwordHash: await bcrypt.hash(b.password, 10) } });
});
export const PATCH = route(["admin"], async (_s, req: Request) => {
  const b = await req.json(); const data: any = {};
  if (b.name) data.name = b.name; if (b.role) data.role = b.role;
  if (b.resetPin) { data.pinHash = null; data.pinFailed = 0; data.pinLockedUntil = null; }
  if (b.phone !== undefined) data.phone = b.phone || null; if (typeof b.isActive === "boolean") data.isActive = b.isActive;
  if (b.departmentId !== undefined) data.departmentId = b.departmentId ? Number(b.departmentId) : null;
  if (b.password) { need(passwordOk(b.password), PASSWORD_HINT); data.passwordHash = await bcrypt.hash(b.password, 10); }
  return prisma.user.update({ where: { id: b.id }, data, select: pub });
});
export const DELETE = route(["admin"], async (s, req: Request) => {
  const { id } = await req.json();
  if (id === s!.id) throw new ApiError(400, "Tidak bisa menghapus akun sendiri");
  if (await prisma.loanRequest.count({ where: { userId: id } })) throw new ApiError(409, "User memiliki riwayat peminjaman");
  await prisma.user.delete({ where: { id } }); return { ok: true };
});
