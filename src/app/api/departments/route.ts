import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
export const GET = route(["admin", "staff", "user"], async () => prisma.department.findMany({ orderBy: { name: "asc" } }));
export const POST = route(["admin"], async (_s, req: Request) => { const b = await req.json(); need(b.name && b.code, "Nama dan kode wajib diisi"); return prisma.department.create({ data: { name: b.name, code: b.code.toUpperCase() } }); });
export const DELETE = route(["admin"], async (_s, req: Request) => {
  const { id } = await req.json();
  if (await prisma.user.count({ where: { departmentId: id } })) throw new ApiError(409, "Departemen masih memiliki user");
  await prisma.department.delete({ where: { id } }); return { ok: true };
});
