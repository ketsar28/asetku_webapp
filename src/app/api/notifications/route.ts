import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
export const GET = route(["admin", "staff", "finance", "user", "employee"], async (s) => ({
  items: await prisma.notification.findMany({ where: { userId: s!.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  unread: await prisma.notification.count({ where: { userId: s!.id, readAt: null } }),
}));
export const POST = route(["admin", "staff", "finance", "user", "employee"], async (s) => { await prisma.notification.updateMany({ where: { userId: s!.id, readAt: null }, data: { readAt: new Date() } }); return { ok: true }; });
