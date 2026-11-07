import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
/** Daftar aset yang terdeteksi rusak / perlu perawatan dan belum punya perawatan berjalan. */
export const GET = route(["admin", "staff", "employee"], async () => prisma.asset.findMany({
  where: { condition: { not: "good" }, status: { notIn: ["borrowed", "disposed", "sold"] }, maintenance: { none: { status: { not: "completed" } } } },
  select: { id: true, assetCode: true, name: true, condition: true, location: true, updatedAt: true, category: { select: { name: true } } },
  orderBy: [{ condition: "asc" }, { updatedAt: "desc" }], take: 200,
}));
/** Perbaiki aset rusak setelah konfirmasi: {assetIds, description?, vendor?, cost?, done?, paymentMethod?...}. done=true langsung selesai, kondisi kembali baik. */
export const POST = route(["admin", "staff", "employee"], async (s, req: Request) => {
  const b = await req.json();
  const ids: number[] = Array.from(new Set((Array.isArray(b.assetIds) ? b.assetIds : []).map(Number).filter(Boolean))) as number[];
  need(ids.length > 0 && ids.length <= 50, "Pilih 1–50 aset");
  const cost = Math.max(0, Number(b.cost) || 0), done = b.done === true;
  const note = String(b.description ?? "").trim().slice(0, 500) || "Perbaikan kerusakan";
  const vendor = String(b.vendor ?? "").trim().slice(0, 120) || null;
  const pay = cost > 0 ? payInfo(b) : {};
  const assets = await prisma.asset.findMany({ where: { id: { in: ids } }, include: { maintenance: { where: { status: { not: "completed" } }, select: { id: true } } } });
  if (assets.length !== ids.length) throw new ApiError(404, "Sebagian aset tidak ditemukan");
  const bad = assets.filter((a) => a.status === "borrowed" || a.status === "disposed" || a.status === "sold" || a.condition === "good" || a.maintenance.length > 0);
  if (bad.length) throw new ApiError(409, `Tidak bisa diproses: ${bad.map((a) => a.assetCode).join(", ")} (sedang dipinjam, sudah baik, atau sudah ada perawatan berjalan). Muat ulang halaman.`);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    for (const a of assets) {
      const m = await tx.maintenanceRecord.create({ data: { assetId: a.id, maintenanceDate: now, completionDate: done ? now : null, description: note, vendor, cost: cost > 0 ? cost : null, status: done ? "completed" : "in_progress" } });
      await tx.asset.update({ where: { id: a.id }, data: { condition: done ? "good" : "maintenance" } });
      if (cost > 0) await tx.transaction.create({ data: { type: "expense", category: "Perawatan aset", amount: cost, description: `Perawatan: ${note}`, txDate: now, source: "maintenance", refNo: `MT-${m.id}`, assetId: a.id, ...pay, createdBy: s!.id, createdByName: s!.name } });
      await tx.assetLog.create({ data: { assetId: a.id, actionType: "maintenance", description: done ? `Perbaikan selesai (${note}), kondisi kembali baik` : `Perbaikan dimulai: ${note}`, performedBy: s!.id } });
    }
    return { count: assets.length, done };
  }, { timeout: 30000 });
});
