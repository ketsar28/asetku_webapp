import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { payInfo, stamp } from "@/lib/finance";
export const GET = route(["admin", "staff", "user"], async (s, req: Request) => {
  const q = new URL(req.url).searchParams;
  const search = q.get("q") ?? "";
  return prisma.asset.findMany({
    where: {
      ...(s!.role === "user" ? { status: "available", condition: "good" } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { assetCode: { contains: search } }] } : {}),
    },
    include: { category: true }, orderBy: { createdAt: "desc" }, take: 1000,
  });
});
export const POST = route(["admin", "staff"], async (s, req: Request) => {
  const b = await req.json();
  need(b.assetCode && b.name && b.categoryId, "Kode, nama, dan kategori wajib diisi");
  return prisma.$transaction(async (tx) => {
    const a = await tx.asset.create({ data: {
      assetCode: b.assetCode, name: b.name, categoryId: Number(b.categoryId), brand: b.brand, model: b.model,
      serialNumber: b.serialNumber, location: b.location, imageUrl: b.imageUrl, rentalRate: Number(b.rentalRate) || 0, rentalUnit: b.rentalUnit === "month" ? "month" : "day", salePrice: Number(b.salePrice) > 0 ? Number(b.salePrice) : null, description: b.description || null, specs: b.specs || null,
      purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : null, purchaseCost: b.purchaseCost || null } });
    await tx.assetLog.create({ data: { assetId: a.id, actionType: "created", description: "Aset dibuat", performedBy: s!.id } });
    if (Number(b.purchaseCost) > 0) await tx.transaction.create({ data: { type: "expense", category: "Pembelian aset", amount: b.purchaseCost, description: `Pembelian ${a.name} (${a.assetCode})`, txDate: stamp(a.purchaseDate), source: "purchase", assetId: a.id, refNo: a.assetCode, ...payInfo(b), createdBy: s!.id, createdByName: s!.name } });
    return a;
  });
});
