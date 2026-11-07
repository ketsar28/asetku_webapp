import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { walletMove } from "./wallet";
type Tx = Prisma.TransactionClient;
export type PayInfo = { paymentMethod: string; bankName: string | null; accountName: string | null; accountNo: string | null };
export const orderNo = (i = 0) => `PB-${Date.now().toString(36).toUpperCase()}${i}`;
/** Baris buku kas pembelian: penjualan aset, premi asuransi, dan PPN keluaran dipisah. */
export function saleIncomeTx(p: any, assetName: string, pay: PayInfo, at: Date, by: { id: number; name: string }) {
  const base = { type: "income" as const, txDate: at, assetId: p.assetId, refNo: p.orderNumber, createdBy: by.id, createdByName: by.name, ...pay };
  const rows = [{ ...base, source: "sale", category: "Penjualan aset", amount: Number(p.price), description: `Penjualan ${assetName} (${p.orderNumber})` }];
  if (Number(p.insuranceFee) > 0) rows.push({ ...base, source: "sale_ins", category: "Premi asuransi", amount: Number(p.insuranceFee), description: `Asuransi barang ${assetName} (${p.orderNumber})` });
  if (Number(p.vatAmount) > 0) rows.push({ ...base, source: "rental_vat", category: "PPN keluaran 11%", amount: Number(p.vatAmount), description: `PPN 11% atas ${p.orderNumber}` });
  return rows;
}
/** Mengembalikan stok: aset yang tertahan (status terjual) pada pesanan yang batal atau ditolak menjadi tersedia lagi. */
export async function releaseAssets(tx: Tx, assetIds: number[]) {
  if (assetIds.length) await tx.asset.updateMany({ where: { id: { in: assetIds }, status: "sold" }, data: { status: "available", soldAt: null } });
}
/** Refund pesanan yang sudah dibayar ke Saldo Dompet pembeli; pendapatan dibalik di buku kas. */
export async function refundPurchase(tx: Tx, p: any, assetName: string, by: { id: number; name: string }) {
  const amt = Number(p.totalAmount), u = await tx.user.findUniqueOrThrow({ where: { id: p.userId } });
  await walletMove(tx, p.userId, amt, { type: "refund", description: `Refund pembelian ${assetName} (${p.orderNumber})`, refNo: p.orderNumber });
  await tx.transaction.create({ data: { type: "expense", category: "Refund pembelian", amount: amt, description: `Refund ke Saldo Dompet ${u.name}: ${p.orderNumber}`, txDate: new Date(), source: "refund", assetId: p.assetId, refNo: `RF-${p.orderNumber}`, paymentMethod: "wallet", bankName: "Saldo Dompet", accountName: u.name, createdBy: by.id, createdByName: by.name } });
  await tx.purchase.update({ where: { id: p.id }, data: { paymentStatus: "refunded" } });
}
/** Pesanan yang sudah memilih metode non-tunai tetapi belum dibayar melewati batas waktu dibatalkan otomatis dan stoknya dikembalikan. */
export async function expireStale() {
  const hrs = Number(process.env.NEXT_PUBLIC_PAY_DEADLINE_HOURS ?? 24);
  const old = await prisma.purchase.findMany({ where: { status: { in: ["pending", "approved"] }, paymentStatus: "unpaid", paymentMethod: { not: "cash" }, createdAt: { lt: new Date(Date.now() - hrs * 3600000) } }, select: { id: true, assetId: true } });
  if (!old.length) return;
  await prisma.$transaction(async (tx) => {
    await tx.purchase.updateMany({ where: { id: { in: old.map((o) => o.id) }, paymentStatus: "unpaid" }, data: { status: "rejected", adminNote: "Dibatalkan otomatis: melewati batas waktu pembayaran" } });
    await releaseAssets(tx, old.map((o) => o.assetId));
  });
}
