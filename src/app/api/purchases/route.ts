import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { saleCharges } from "@/lib/pricing";
import { notifyRoles } from "@/lib/notify";
import { orderNo, expireStale } from "@/lib/purchase";
export const GET = route(["admin", "staff", "user"], async (s, req: Request) => {
  await expireStale();
  const sp = new URL(req.url).searchParams, one = sp.get("order") ? await prisma.purchase.findUnique({ where: { id: Number(sp.get("order")) }, select: { id: true, groupNo: true } }) : null;
  const grp = sp.get("group") ?? one?.groupNo;
  return prisma.purchase.findMany({
    where: { ...(s!.role === "user" ? { userId: s!.id } : {}), ...(grp ? { groupNo: grp } : one ? { id: one.id } : {}) },
    include: { asset: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 300,
  });
});
/** Pengajuan pembelian dari keranjang beli: tanpa tanggal & durasi. Stok aset langsung ditahan (hilang dari katalog, merah di admin). */
export const POST = route(["user"], async (s, req: Request) => {
  const b = await req.json();
  const ids: number[] = Array.from(new Set((Array.isArray(b.assetIds) ? b.assetIds : []).map(Number).filter(Boolean))) as number[];
  need(ids.length >= 1 && ids.length <= 20, "Pilih 1–20 aset untuk dibeli");
  need(String(b.purpose ?? "").trim(), "Isi keperluan pembelian");
  need(b.terms === true, "Anda harus menyetujui syarat dan ketentuan pembelian");
  const groupNo = `GRB-${Date.now().toString(36).toUpperCase()}`, purpose = String(b.purpose).trim().slice(0, 500);
  const res = await prisma.$transaction(async (tx) => {
    let total = 0;
    for (const [i, id] of ids.entries()) {
      const a = await tx.asset.findUnique({ where: { id } });
      if (!a || a.status !== "available" || a.condition !== "good" || !(Number(a.salePrice) > 0)) throw new ApiError(409, `${a?.name ?? "Aset"} tidak tersedia untuk dibeli. Muat ulang katalog.`);
      if (await tx.loanRequest.count({ where: { assetId: id, status: { in: ["pending", "approved", "on_loan", "overdue"] } } })) throw new ApiError(409, `${a.name} sedang dalam proses sewa sehingga belum bisa dibeli`);
      const got = await tx.asset.updateMany({ where: { id, status: "available" }, data: { status: "sold", soldAt: new Date() } }); // tahan stok, cegah dua pembeli sekaligus
      if (got.count !== 1) throw new ApiError(409, `${a.name} baru saja dipesan pembeli lain`);
      const ch = saleCharges(Number(a.salePrice), false), no = orderNo(i); total += ch.total;
      await tx.purchase.create({ data: { orderNumber: no, groupNo, userId: s!.id, assetId: id, purpose, termsAcceptedAt: new Date(), price: Number(a.salePrice), vatAmount: ch.vat, totalAmount: ch.total } });
      await tx.assetLog.create({ data: { assetId: id, actionType: "updated", description: `Dipesan untuk dibeli oleh ${s!.name} (${no}). Stok ditahan.`, performedBy: s!.id } });
    }
    return { count: ids.length, total, groupNo };
  }, { timeout: 30000 });
  await notifyRoles(["admin", "staff"], "Pengajuan pembelian baru", `${s!.name} mengajukan pembelian ${ids.length} aset. Stok aset tersebut ditahan.`, "/purchases");
  return res;
});
