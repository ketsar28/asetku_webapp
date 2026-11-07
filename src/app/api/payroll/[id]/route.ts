import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
export const GET = route(["admin"], async (_s, _r: Request, { params }: { params: { id: string } }) => {
  const p = await prisma.payroll.findUnique({ where: { id: Number(params.id) }, include: { employee: true } });
  if (!p) throw new ApiError(404, "Slip tidak ditemukan"); return p;
});
