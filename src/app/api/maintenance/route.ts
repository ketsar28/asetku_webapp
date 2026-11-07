import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
export const GET = route(["admin", "staff"], async () => prisma.maintenanceRecord.findMany({ include: { asset: true }, orderBy: { maintenanceDate: "desc" }, take: 200 }));
export const POST = route(["admin", "staff"], async (s, req: Request) => {
  const b = await req.json(); need(b.assetId && b.description?.trim() && b.maintenanceDate, "Aset, tanggal, dan deskripsi wajib diisi");
  const a = await prisma.asset.findUnique({ where: { id: Number(b.assetId) } });
  if (!a) throw new ApiError(404, "Aset tidak ditemukan");
  if (a.status === "borrowed") throw new ApiError(409, "Aset sedang dipinjam. Selesaikan check-in dulu.");
  return prisma.$transaction(async (tx) => {
    const m = await tx.maintenanceRecord.create({ data: { assetId: a.id, maintenanceDate: new Date(b.maintenanceDate), description: b.description, vendor: b.vendor || null, cost: b.cost || null } });
    await tx.asset.update({ where: { id: a.id }, data: { condition: "maintenance" } });
    if (Number(b.cost) > 0) await tx.transaction.create({ data: { type: "expense", category: "Perawatan aset", amount: b.cost, description: `Perawatan: ${b.description}`, txDate: new Date(b.maintenanceDate), source: "maintenance", refNo: `MT-${m.id}`, assetId: a.id, ...payInfo(b), createdBy: s!.id, createdByName: s!.name } });
    await tx.assetLog.create({ data: { assetId: a.id, actionType: "maintenance", description: `Perawatan dijadwalkan: ${b.description}`, performedBy: s!.id } });
    return m;
  });
});
export const PATCH = route(["admin", "staff"], async (s, req: Request) => {
  const b = await req.json(); need(["in_progress", "completed"].includes(b.status), "Status tidak valid");
  return prisma.$transaction(async (tx) => {
    const m = await tx.maintenanceRecord.update({ where: { id: b.id }, data: { status: b.status, cost: Number(b.cost) > 0 ? b.cost : undefined, completionDate: b.status === "completed" ? new Date() : null } });
    if (b.status === "completed") await tx.asset.update({ where: { id: m.assetId }, data: { condition: "good" } });
    if (b.status === "completed" && Number(m.cost) > 0 && !(await tx.transaction.updateMany({ where: { source: "maintenance", refNo: `MT-${m.id}` }, data: { amount: m.cost! } })).count) await tx.transaction.create({ data: { type: "expense", category: "Perawatan aset", amount: m.cost!, description: `Perawatan: ${m.description}`, txDate: new Date(), source: "maintenance", refNo: `MT-${m.id}`, assetId: m.assetId, createdBy: s!.id, createdByName: s!.name } });
    await tx.assetLog.create({ data: { assetId: m.assetId, actionType: "maintenance", description: b.status === "completed" ? "Perawatan selesai, kondisi kembali baik" : "Perawatan dikerjakan", performedBy: s!.id } });
    return m;
  });
});
