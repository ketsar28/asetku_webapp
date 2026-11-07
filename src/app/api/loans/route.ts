import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { charges } from "@/lib/pricing";
import { notifyRoles } from "@/lib/notify";
export const GET = route(["admin", "staff", "user"], async (s, req: Request) => {
  const sp = new URL(req.url).searchParams, one = sp.get("loan") ? await prisma.loanRequest.findUnique({ where: { id: Number(sp.get("loan")) }, select: { id: true, groupNo: true } }) : null;
  const grp = sp.get("group") ?? one?.groupNo;
  await prisma.loanRequest.updateMany({ where: { status: "on_loan", expectedReturnDate: { lt: new Date() } }, data: { status: "overdue" } });
  return prisma.loanRequest.findMany({
    where: { ...(s!.role === "user" ? { userId: s!.id } : {}), ...(grp ? { groupNo: grp } : one ? { id: one.id } : {}) },
    include: { asset: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 200,
  });
});
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const b = await req.json();
  const ids: number[] = (Array.isArray(b.assetIds) ? b.assetIds : [b.assetId]).map(Number).filter(Boolean);
  const start = new Date(b.startDate), end = new Date(b.expectedReturnDate);
  need(ids.length && b.purpose?.trim(), "Pilih minimal satu aset dan isi keperluan");
  need(b.terms === true, "Anda harus menyetujui syarat dan ketentuan sewa");
  need(!isNaN(+start) && !isNaN(+end) && end >= start, "Tanggal tidak valid");
  need(+start >= new Date().setHours(0, 0, 0, 0), "Tanggal mulai tidak boleh di masa lalu");
  const pay = payInfo(b); const groupNo = `GRP-${Date.now().toString(36).toUpperCase()}`;
  const days = Math.max(1, Math.round((+end - +start) / 86400000) + 1);
  const res = await prisma.$transaction(async (tx) => {
    let total = 0;
    for (const [i, id] of ids.entries()) {
      const a = await tx.asset.findUnique({ where: { id } });
      if (!a || a.status !== "available" || a.condition !== "good") throw new ApiError(409, `${a?.name ?? "Aset"} tidak tersedia`);
      if (Number(a.salePrice) > 0 && !(Number(a.rentalRate) > 0)) throw new ApiError(409, `${a.name} hanya dijual, tidak disewakan`);
      const clash = await tx.loanRequest.count({ where: { assetId: id, status: { in: ["pending", "approved", "on_loan", "overdue"] }, startDate: { lte: end }, expectedReturnDate: { gte: start } } });
      if (clash) throw new ApiError(409, `${a.name} sudah dipesan pada tanggal tersebut`);
      const fee = Number(a.rentalRate) * (a.rentalUnit === "month" ? Math.ceil(days / 30) : days); const ch = charges(fee, false); total += ch.total;
      await tx.loanRequest.create({ data: { requestNumber: `LN-${Date.now().toString(36).toUpperCase()}${i}`, userId: s!.id, assetId: id, startDate: start, expectedReturnDate: end, purpose: b.purpose, groupNo, termsAcceptedAt: new Date(), rentalFee: fee, vatAmount: ch.vat, totalAmount: ch.total, ...pay } });
    }
    return { count: ids.length, total, groupNo };
  });
  await notifyRoles(["admin", "staff"], "Pengajuan sewa baru", `${s!.name} mengajukan sewa ${ids.length} aset.`, "/loans");
  return res;
});
