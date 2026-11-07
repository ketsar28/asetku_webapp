import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { ApiError } from "./api";
import { prisma } from "./prisma";
import { due } from "./pricing";
type Tx = Prisma.TransactionClient;
export const PIN_RE = /^\d{6}$/;
export const rpS = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
/** Memeriksa PIN. 5 kali salah = terkunci 15 menit. (Status 403/429, bukan 401, agar tidak memicu logout.) */
export async function checkPin(userId: number, pin: unknown) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!u.pinHash) throw new ApiError(400, "Anda belum membuat PIN. Buat PIN di menu Dompet.");
  if (u.pinLockedUntil && u.pinLockedUntil > new Date()) throw new ApiError(429, `PIN terkunci sampai ${u.pinLockedUntil.toLocaleTimeString("id-ID")}. Coba lagi nanti.`);
  if (!(await bcrypt.compare(String(pin ?? ""), u.pinHash))) {
    const f = u.pinFailed + 1;
    await prisma.user.update({ where: { id: userId }, data: f >= 5 ? { pinFailed: 0, pinLockedUntil: new Date(Date.now() + 15 * 60000) } : { pinFailed: f } });
    throw new ApiError(403, f >= 5 ? "PIN salah 5 kali. Dompet dikunci 15 menit." : `PIN salah. Sisa percobaan: ${5 - f}.`);
  }
  if (u.pinFailed) await prisma.user.update({ where: { id: userId }, data: { pinFailed: 0 } });
}
/** Mengubah saldo secara atomik (delta + masuk, - keluar) dan mencatat riwayatnya. Saldo tidak boleh negatif. */
export async function walletMove(tx: Tx, userId: number, delta: number, w: { type: string; description: string; refNo?: string; status?: string; bankName?: string; accountName?: string; accountNo?: string }) {
  const u = await tx.user.update({ where: { id: userId }, data: { walletBalance: { increment: delta } } });
  if (Number(u.walletBalance) < 0) throw new ApiError(409, "Saldo dompet tidak cukup");
  return tx.walletTx.create({ data: { userId, amount: delta, balanceAfter: u.walletBalance, ...w } });
}
/** Refund pesanan yang sudah dibayar: saldo masuk ke Dompet penyewa; pendapatan dibalik di buku kas. */
export async function refundToWallet(tx: Tx, loan: any, assetName: string, by: { id: number; name: string }) {
  const amt = due(loan), u = await tx.user.findUniqueOrThrow({ where: { id: loan.userId } });
  await walletMove(tx, loan.userId, amt, { type: "refund", description: `Refund sewa ${assetName} (${loan.requestNumber})`, refNo: loan.requestNumber });
  await tx.transaction.create({ data: { type: "expense", category: "Refund sewa", amount: amt, description: `Refund ke Saldo Dompet ${u.name}: ${loan.requestNumber}`, txDate: new Date(), source: "refund", assetId: loan.assetId, refNo: `RF-${loan.requestNumber}`, paymentMethod: "wallet", bankName: "Saldo Dompet Penyewa", accountName: u.name, createdBy: by.id, createdByName: by.name } });
  await tx.loanRequest.update({ where: { id: loan.id }, data: { paymentStatus: "refunded" } });
}
