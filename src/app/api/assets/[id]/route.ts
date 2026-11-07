import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
type P = { params: { id: string } };
export const PATCH = route(["admin", "staff"], async (s, req: Request, { params }: P) => {
  const id = Number(params.id), b = await req.json();
  const old = await prisma.asset.findUnique({ where: { id } });
  if (!old) throw new ApiError(404, "Aset tidak ditemukan");
  const data: any = {};
  for (const k of ["name", "brand", "model", "location", "condition", "status", "serialNumber", "rentalRate", "rentalUnit", "imageUrl", "description", "specs"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.salePrice !== undefined) data.salePrice = Number(b.salePrice) > 0 ? Number(b.salePrice) : null;
  if (data.status === "sold" && old.status !== "sold") data.soldAt = new Date();
  if (data.status && data.status !== "sold" && old.status === "sold") data.soldAt = null;
  return prisma.$transaction(async (tx) => {
    const a = await tx.asset.update({ where: { id }, data });
    await tx.assetLog.create({ data: { assetId: id, performedBy: s!.id,
      actionType: data.condition && data.condition !== old.condition ? "condition_change" : "updated",
      description: `Perubahan: ${Object.keys(data).join(", ")}` } });
    return a;
  });
});
export const DELETE = route(["admin"], async (_s, _r: Request, { params }: P) => {
  const id = Number(params.id);
  if (await prisma.loanRequest.count({ where: { assetId: id, status: { in: ["pending", "approved", "on_loan", "overdue"] } } }))
    throw new ApiError(409, "Aset masih memiliki peminjaman aktif");
  if (await prisma.purchase.count({ where: { assetId: id, status: { in: ["pending", "approved"] } } })) throw new ApiError(409, "Aset masih memiliki pesanan pembelian aktif");
  await prisma.asset.update({ where: { id }, data: { status: "disposed" } }); // soft delete: riwayat tetap terjaga
  return { ok: true };
});
export const GET = route(["admin", "staff"], async (_s, _r: Request, { params }: P) =>
  prisma.assetLog.findMany({ where: { assetId: Number(params.id) }, include: { user: { select: { name: true } } }, orderBy: { timestamp: "desc" }, take: 50 }));
