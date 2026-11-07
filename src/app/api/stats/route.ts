import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
export const GET = route(["admin", "staff"], async () => {
  const now = new Date();
  const [total, borrowed, damaged, pending, inMaint, cond, cats, overdue, pendingList, logs, rows] = await Promise.all([
    prisma.asset.count({ where: { status: { notIn: ["disposed", "sold"] } } }),
    prisma.asset.count({ where: { status: "borrowed" } }),
    prisma.asset.count({ where: { condition: "damaged", status: { notIn: ["disposed", "sold"] } } }),
    prisma.loanRequest.count({ where: { status: "pending" } }),
    prisma.maintenanceRecord.count({ where: { status: { not: "completed" } } }),
    prisma.asset.groupBy({ by: ["condition"], where: { status: { notIn: ["disposed", "sold"] } }, _count: true }),
    prisma.category.findMany({ select: { name: true, _count: { select: { assets: true } } } }),
    prisma.loanRequest.findMany({ where: { status: { in: ["on_loan", "overdue"] }, expectedReturnDate: { lt: now } }, include: { asset: true, user: { select: { name: true } } }, orderBy: { expectedReturnDate: "asc" }, take: 5 }),
    prisma.loanRequest.findMany({ where: { status: "pending" }, include: { asset: true, user: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.assetLog.findMany({ include: { asset: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { timestamp: "desc" }, take: 8 }),
    prisma.$queryRaw<{ month: string; total: bigint }[]>`
      SELECT DATE_FORMAT(request_date, '%Y-%m') AS month, COUNT(*) AS total
      FROM loan_requests WHERE request_date > DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month`,
  ]);
  return {
    total, borrowed, damaged, pending, inMaint,
    condition: cond.map((c) => ({ name: c.condition, value: c._count })),
    categories: cats.map((c) => ({ name: c.name, value: c._count.assets })),
    overdue, pendingList, logs,
    monthly: rows.map((r) => ({ month: r.month, total: Number(r.total) })),
  };
});
