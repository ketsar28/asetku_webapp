import { prisma } from "@/lib/prisma";
import { route, ApiError } from "@/lib/api";
import { due } from "@/lib/pricing";
const CH: Record<string, string[]> = { bca: ["bca_va"], bni: ["bni_va"], bri: ["bri_va"], permata: ["permata_va"], mandiri: ["echannel"], cimb: ["cimb_va"], card: ["credit_card"], credit_card: ["credit_card"], qris: ["qris"], gopay: ["gopay"], shopeepay: ["shopeepay"], dana: ["dana"], akulaku: ["akulaku"], kredivo: ["kredivo"], indodana: ["indodana"] };
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  if (!["demo", "midtrans"].includes(process.env.PAYMENT_MODE ?? "")) throw new ApiError(503, "Pembayaran online belum diaktifkan. Gunakan transfer manual atau bayar tunai.");
  const { loanId, channel } = await req.json();
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(loanId) } });
  if (!loan || (s!.role === "user" && loan.userId !== s!.id)) throw new ApiError(404, "Pengajuan tidak ditemukan");
  const loans = await prisma.loanRequest.findMany({ where: { userId: loan.userId, status: { in: ["pending", "approved"] }, paymentStatus: "unpaid", rentalFee: { gt: 0 }, ...(loan.groupNo ? { groupNo: loan.groupNo } : { id: loan.id }) }, include: { asset: true } });
  if (!loans.length) throw new ApiError(409, "Tidak ada tagihan yang perlu dibayar");
  const gross = Math.round(loans.reduce((t, l) => t + Math.round(due(l)), 0));
  const orderId = `AK-${Date.now().toString(36).toUpperCase()}-${loans[0].id}`;
  await prisma.loanRequest.updateMany({ where: { id: { in: loans.map((l) => l.id) } }, data: { paymentOrderId: orderId } });
  const mode = process.env.PAYMENT_MODE;
  if (mode === "demo") return { redirectUrl: `/pay/demo?order=${orderId}`, orderId };
  if (mode !== "midtrans") throw new ApiError(500, "Atur PAYMENT_MODE=demo atau midtrans di file .env");
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new ApiError(500, "MIDTRANS_SERVER_KEY belum diisi di .env");
  const base = process.env.MIDTRANS_IS_PRODUCTION === "true" ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
  const u = await prisma.user.findUniqueOrThrow({ where: { id: loan.userId } });
  const r = await fetch(`${base}/snap/v1/transactions`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: "Basic " + Buffer.from(key + ":").toString("base64") },
    body: JSON.stringify({ transaction_details: { order_id: orderId, gross_amount: gross },
      item_details: loans.flatMap((l) => [{ id: l.requestNumber, name: l.asset.name.slice(0, 40), price: Math.round(due(l) - Number(l.insuranceFee) - Number(l.vatAmount)), quantity: 1 }, ...(Number(l.insuranceFee) ? [{ id: `${l.requestNumber}-INS`, name: "Asuransi barang", price: Math.round(Number(l.insuranceFee)), quantity: 1 }] : []), ...(Number(l.vatAmount) ? [{ id: `${l.requestNumber}-PPN`, name: "PPN 11%", price: Math.round(Number(l.vatAmount)), quantity: 1 }] : [])]),
      customer_details: { first_name: u.name, email: u.email, phone: u.phone ?? undefined }, callbacks: { finish: `${process.env.APP_URL ?? ""}/loans` }, expiry: { unit: "hours", duration: 24 }, ...(CH[channel as string] ? { enabled_payments: CH[channel as string] } : {}) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.redirect_url) throw new ApiError(502, `Gateway menolak transaksi: ${d.error_messages?.join(", ") ?? r.status}`);
  return { redirectUrl: d.redirect_url, orderId };
});
