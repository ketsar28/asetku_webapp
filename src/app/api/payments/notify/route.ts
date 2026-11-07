import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPay, settleOrder } from "@/lib/payments";
/** Webhook Midtrans (Payment Notification URL). Divalidasi dengan signature_key. */
export async function POST(req: Request) {
  const n = await req.json().catch(() => ({}));
  const key = process.env.MIDTRANS_SERVER_KEY ?? "";
  const sig = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`).digest("hex");
  if (!key || sig !== n.signature_key) return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
  const st = n.transaction_status;
  if (st === "settlement" || (st === "capture" && n.fraud_status === "accept")) await settleOrder(n.order_id, mapPay(n));
  else if (["expire", "cancel", "deny", "failure"].includes(st))
    await prisma.loanRequest.updateMany({ where: { paymentOrderId: n.order_id, paymentStatus: "unpaid" }, data: { paymentOrderId: null } });
  return NextResponse.json({ ok: true });
}
