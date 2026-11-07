import { prisma } from "./prisma";
import { notify } from "./notify";
import { loanIncomeTx } from "./finance";
const bankLabel = (b?: string) => (({ bca: "BCA", bni: "BNI", bri: "BRI", permata: "Bank Permata", cimb: "CIMB Niaga", mandiri: "Bank Mandiri", bsi: "BSI (Bank Syariah Indonesia)" } as Record<string, string>)[(b ?? "").toLowerCase()] ?? (b ? b.toUpperCase() : "Transfer Bank"));
/** Memetakan notifikasi Midtrans ke metode & bank di buku kas. */
export function mapPay(n: any) {
  const t = n.payment_type;
  if (t === "qris" || t === "gopay" || t === "shopeepay")
    return { paymentMethod: "qris", bankName: t === "gopay" || n.acquirer === "gopay" ? "GoPay" : t === "shopeepay" || n.acquirer === "airpay shopee" ? "ShopeePay" : "QRIS", accountNo: null as string | null, accountName: null as string | null };
  if (t === "bank_transfer") return { paymentMethod: "transfer", bankName: bankLabel(n.va_numbers?.[0]?.bank ?? (n.permata_va_number ? "permata" : n.bank)), accountNo: (n.va_numbers?.[0]?.va_number ?? n.permata_va_number ?? null) as string | null, accountName: null as string | null };
  if (t === "echannel") return { paymentMethod: "transfer", bankName: "Bank Mandiri", accountNo: (n.bill_key ?? null) as string | null, accountName: null as string | null };
  return { paymentMethod: "transfer", bankName: n.bank ? bankLabel(n.bank) : "Kartu / lainnya", accountNo: null as string | null, accountName: null as string | null };
}
/** Menandai tagihan lunas + mencatat uang masuk ke laporan keuangan. Idempotent. */
export async function settleOrder(orderId: string, pay: { paymentMethod: string; bankName: string | null; accountNo: string | null; accountName: string | null }) {
  const done = await prisma.$transaction(async (tx) => {
    const loans = await tx.loanRequest.findMany({ where: { paymentOrderId: orderId, paymentStatus: { in: ["unpaid", "verifying"] } }, include: { asset: true, user: true } });
    const now = new Date();
    for (const l of loans) {
      const name = pay.accountName ?? l.user.name;
      await tx.loanRequest.update({ where: { id: l.id }, data: { paymentStatus: "paid", paidAt: now, paymentMethod: pay.paymentMethod, bankName: pay.bankName, accountNo: pay.accountNo, accountName: name } });
      await tx.transaction.createMany({ data: loanIncomeTx(l, l.asset.name, { paymentMethod: pay.paymentMethod, bankName: pay.bankName, accountName: name, accountNo: pay.accountNo }, now, { id: l.userId, name: "Pembayaran online" }) });
    }
    return loans;
  });
  for (const l of done) await notify(l.userId, "Pembayaran diterima", `Pembayaran sewa ${l.asset.name} (${l.requestNumber}) berhasil dicatat. Aset bisa diambil setelah pesanan disetujui admin.`, { link: "/loans" });
  return done.length;
}

/** Menyamakan status pembayaran Midtrans dengan sistem (menyelamatkan webhook yang terlewat). */
export async function reconcileGateway() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (process.env.PAYMENT_MODE !== "midtrans" || !key) return { checked: 0, settled: 0, cleared: 0, skipped: true };
  const base = process.env.MIDTRANS_IS_PRODUCTION === "true" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
  const orders = await prisma.loanRequest.findMany({ where: { paymentStatus: "unpaid", paymentOrderId: { not: null } }, select: { paymentOrderId: true }, distinct: ["paymentOrderId"] });
  let settled = 0, cleared = 0;
  for (const o of orders.filter((x) => !x.paymentOrderId!.startsWith("MAN-"))) {
    const r = await fetch(`${base}/v2/${o.paymentOrderId}/status`, { headers: { Accept: "application/json", Authorization: "Basic " + Buffer.from(key + ":").toString("base64") } });
    const n: any = await r.json().catch(() => ({})), st = n.transaction_status;
    if (st === "settlement" || (st === "capture" && n.fraud_status === "accept")) { await settleOrder(o.paymentOrderId!, mapPay(n)); settled++; }
    else if (["expire", "cancel", "deny", "failure"].includes(st)) { await prisma.loanRequest.updateMany({ where: { paymentOrderId: o.paymentOrderId, paymentStatus: "unpaid" }, data: { paymentOrderId: null } }); cleared++; }
  }
  return { checked: orders.length, settled, cleared, skipped: false };
}
