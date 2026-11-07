import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
export const GET = route(["admin", "staff", "user"], async (_s, _r: Request, { params }: { params: { id: string } }) =>
  prisma.loanRequest.findMany({ where: { assetId: Number(params.id), status: { in: ["pending", "approved", "on_loan", "overdue"] }, expectedReturnDate: { gte: new Date(Date.now() - 86400000) } }, select: { startDate: true, expectedReturnDate: true, status: true }, orderBy: { startDate: "asc" }, take: 100 }));
