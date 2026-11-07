import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
export const GET = route(["admin", "finance"], async (_s, req: Request) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const [logs, voided] = await Promise.all([
    prisma.auditLog.findMany({ where: q ? { OR: [{ detail: { contains: q } }, { userName: { contains: q } }, { action: { contains: q } }] } : {}, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.transaction.findMany({ where: { voidedAt: { not: null } }, orderBy: { voidedAt: "desc" }, take: 100 }),
  ]);
  return { logs, voided: voided.map((t) => ({ ...t, amount: Number(t.amount) })) };
});
