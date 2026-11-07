import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
type P = { params: { id: string } };
export const GET = route(["admin", "staff"], async (_s, _r: Request, { params }: P) => {
  const o = await prisma.stockOpname.findUnique({ where: { id: Number(params.id) }, include: { items: { include: { asset: { select: { assetCode: true, name: true, location: true, category: { select: { name: true } } } } }, orderBy: { asset: { assetCode: "asc" } } } } });
  if (!o) throw new ApiError(404, "Sesi opname tidak ditemukan"); return o;
});
/** Tandai aset ditemukan berdasarkan kode (hasil scan QR atau ketik manual). */
export const POST = route(["admin", "staff"], async (s, req: Request, { params }: P) => {
  const { code } = await req.json(); need(String(code ?? "").trim(), "Kode aset kosong");
  const o = await prisma.stockOpname.findUnique({ where: { id: Number(params.id) } });
  if (!o) throw new ApiError(404, "Sesi opname tidak ditemukan"); if (o.status !== "open") throw new ApiError(409, "Sesi opname sudah ditutup");
  const a = await prisma.asset.findUnique({ where: { assetCode: String(code).trim().toUpperCase() } });
  if (!a) throw new ApiError(404, `Kode ${String(code).trim()} tidak dikenal`);
  const it = await prisma.stockOpnameItem.findUnique({ where: { opnameId_assetId: { opnameId: o.id, assetId: a.id } } });
  if (!it) throw new ApiError(404, "Aset ini tidak termasuk dalam sesi opname");
  await prisma.stockOpnameItem.update({ where: { id: it.id }, data: { status: "found", checkedAt: new Date(), checkedBy: s!.name } });
  return { code: a.assetCode, name: a.name, location: a.location, already: it.status === "found" };
});
/** Tutup sesi: aset yang belum ditemukan dicatat hilang. */
export const PATCH = route(["admin", "staff"], async (_s, _r: Request, { params }: P) => {
  const id = Number(params.id), o = await prisma.stockOpname.findUnique({ where: { id } });
  if (!o || o.status !== "open") throw new ApiError(409, "Sesi tidak ditemukan atau sudah ditutup");
  const r = await prisma.stockOpnameItem.updateMany({ where: { opnameId: id, status: "pending" }, data: { status: "missing" } });
  await prisma.stockOpname.update({ where: { id }, data: { status: "closed", closedAt: new Date() } });
  return { missing: r.count };
});
