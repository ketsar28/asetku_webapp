import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
export const GET = route(["admin", "staff", "user"], async () => prisma.category.findMany({ orderBy: { name: "asc" } }));
export const POST = route(["admin", "staff"], async (_s, req: Request) => { const b = await req.json(); need(b.name, "Nama kategori wajib diisi"); return prisma.category.create({ data: { name: b.name } }); });
