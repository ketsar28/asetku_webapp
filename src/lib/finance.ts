import { prisma } from "./prisma";
import { ApiError } from "./api";
export function payInfo(b: any) {
  const m = ["cash", "transfer", "qris"].includes(b?.paymentMethod) ? b.paymentMethod : "cash";
  if (m === "cash") return { paymentMethod: m, bankName: null, accountName: null, accountNo: null };
  if (!b.bankName) throw new ApiError(400, "Pilih bank / penyedia untuk pembayaran Transfer atau QRIS");
  const name = String(b.accountName ?? "").trim(), no = String(b.accountNo ?? "").replace(/\s/g, "");
  if (m === "transfer" && (!name || !no)) throw new ApiError(400, "Nama dan nomor rekening asal wajib diisi untuk Transfer");
  if (no && !/^[0-9-]{5,30}$/.test(no)) throw new ApiError(400, "Nomor rekening hanya boleh angka (5–30 digit)");
  return { paymentMethod: m, bankName: b.bankName as string, accountName: name || null, accountNo: no || null };
}
/** Tanggal tanpa jam (00:00:00) dilengkapi dengan jam saat pencatatan agar log lebih detail. */
export function stamp(d?: Date | string | null) {
  const x = d ? new Date(d) : new Date();
  if (d && x.getHours() + x.getMinutes() + x.getSeconds() === 0) { const n = new Date(); x.setHours(n.getHours(), n.getMinutes(), n.getSeconds()); }
  return x;
}
export function queryTx(sp: URLSearchParams) {
  const from = sp.get("from"), to = sp.get("to"), type = sp.get("type"), method = sp.get("method");
  return prisma.transaction.findMany({
    where: { voidedAt: null, approval: "approved", ...(from || to ? { txDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + "T23:59:59") } : {}) } } : {}), ...(type === "income" || type === "expense" ? { type } : {}), ...(method ? { paymentMethod: method } : {}) },
    orderBy: { txDate: "desc" }, take: 5000,
  });
}

/** Baris buku kas untuk pembayaran sewa: pendapatan sewa, premi asuransi, dan PPN keluaran dipisah. */
export function loanIncomeTx(l: any, assetName: string, pay: { paymentMethod: string; bankName: string | null; accountName: string | null; accountNo: string | null }, at: Date, by: { id: number; name: string }) {
  const base = { type: "income" as const, txDate: at, assetId: l.assetId, refNo: l.requestNumber, createdBy: by.id, createdByName: by.name, ...pay };
  const rows = [{ ...base, source: "rental", category: "Pendapatan sewa", amount: Number(l.rentalFee), description: `Sewa ${assetName} (${l.requestNumber})` }];
  if (Number(l.insuranceFee) > 0) rows.push({ ...base, source: "rental_ins", category: "Premi asuransi", amount: Number(l.insuranceFee), description: `Asuransi barang ${assetName} (${l.requestNumber})` });
  if (Number(l.vatAmount) > 0) rows.push({ ...base, source: "rental_vat", category: "PPN keluaran 11%", amount: Number(l.vatAmount), description: `PPN 11% atas ${l.requestNumber}` });
  return rows;
}
