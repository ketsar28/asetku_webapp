import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { notifyRoles } from "@/lib/notify";
import { checkPin, rpS, walletMove } from "@/lib/wallet";
/** Tarik saldo ke rekening bank. Saldo langsung ditahan; admin mentransfer lalu menandai selesai. */
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const b = await req.json(); await checkPin(s!.id, b.pin);
  const amount = Math.floor(Number(b.amount)); need(amount >= 10000, "Penarikan minimal Rp 10.000");
  need(b.bankName && String(b.accountName ?? "").trim() && /^[0-9-]{5,30}$/.test(String(b.accountNo ?? "")), "Data rekening tujuan tidak lengkap atau tidak valid");
  await prisma.$transaction((tx) => walletMove(tx, s!.id, -amount, { type: "withdraw", status: "pending", description: `Penarikan ke ${b.bankName} ${b.accountNo}`, bankName: b.bankName, accountName: String(b.accountName).trim(), accountNo: b.accountNo }));
  await notifyRoles(["admin", "staff"], "Permintaan penarikan saldo", `${s!.name} menarik ${rpS(amount)} ke ${b.bankName}.`, "/withdrawals");
  return { ok: true };
});
