import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { settleOrder } from "@/lib/payments";
async function load(s: { id: number; role: string }, order: string | null) {
  if (process.env.PAYMENT_MODE !== "demo") throw new ApiError(403, "Mode demo tidak aktif");
  const loans = await prisma.loanRequest.findMany({ where: { paymentOrderId: order ?? "-", paymentStatus: "unpaid" }, include: { asset: true } });
  if (!loans.length || loans.some((l) => s.role === "user" && l.userId !== s.id)) throw new ApiError(404, "Tagihan tidak ditemukan atau sudah dibayar");
  return loans;
}
export const GET = route(["user", "staff", "admin"], async (s, req: Request) => {
  const loans = await load(s!, new URL(req.url).searchParams.get("order"));
  return { items: loans.map((l) => ({ name: l.asset.name, fee: Number(l.rentalFee) })), total: loans.reduce((t, l) => t + Number(l.rentalFee), 0) };
});
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const b = await req.json(); await load(s!, b.order);
  const p = payInfo(b);
  if (p.paymentMethod === "cash") throw new ApiError(400, "Pilih Transfer Bank atau QRIS");
  await settleOrder(b.order, p); return { ok: true };
});
