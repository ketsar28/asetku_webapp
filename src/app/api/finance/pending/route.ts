import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
export const GET = route(["admin", "finance"], async () => (await prisma.transaction.findMany({ where: { approval: "pending", voidedAt: null }, orderBy: { createdAt: "asc" } })).map((t) => ({ ...t, amount: Number(t.amount) })));
