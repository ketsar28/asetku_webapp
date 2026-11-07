import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { refundToWallet } from "@/lib/wallet";
/** Untuk refund lama yang berstatus "menunggu refund": dikreditkan ke Saldo Dompet penyewa. */
export const POST = route(["admin", "staff"], async (s, _req: Request, { params }: { params: { id: string } }) => {
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) }, include: { asset: true } });
  if (!loan || loan.paymentStatus !== "refund_due") throw new ApiError(409, "Tidak ada refund yang perlu diproses");
  await prisma.$transaction((tx) => refundToWallet(tx, loan, loan.asset.name, { id: s!.id, name: s!.name }));
  await notify(loan.userId, "Refund masuk ke Saldo Dompet", `Refund ${loan.requestNumber} sudah masuk ke Saldo Dompet Anda. Anda bisa menariknya ke rekening bank di menu Dompet.`, { link: "/wallet" });
  return { ok: true };
});
