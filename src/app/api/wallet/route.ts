import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
export const GET = route(["user", "staff", "admin"], async (s) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: s!.id } });
  const txs = await prisma.walletTx.findMany({ where: { userId: s!.id }, orderBy: { createdAt: "desc" }, take: 30 });
  return { balance: Number(u.walletBalance), hasPin: !!u.pinHash, lockedUntil: u.pinLockedUntil, txs: txs.map((t) => ({ ...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter) })) };
});
