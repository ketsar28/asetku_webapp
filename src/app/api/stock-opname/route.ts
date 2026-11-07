import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
export const GET = route(["admin", "staff"], async () => {
  const l = await prisma.stockOpname.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { items: { select: { status: true } } } });
  return l.map(({ items, ...o }) => ({ ...o, total: items.length, found: items.filter((i) => i.status === "found").length, missing: items.filter((i) => i.status === "missing").length }));
});
/** Mulai sesi opname: semua aset aktif dicatat sebagai "belum dicek". */
export const POST = route(["admin", "staff"], async (s, req: Request) => {
  const b = await req.json(); need(String(b.name ?? "").trim(), "Nama sesi opname wajib diisi");
  const assets = await prisma.asset.findMany({ where: { status: { notIn: ["disposed", "sold"] } }, select: { id: true } });
  return prisma.stockOpname.create({ data: { name: String(b.name).trim().slice(0, 120), createdByName: s!.name, items: { createMany: { data: assets.map((a) => ({ assetId: a.id })) } } } });
});
