import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectAnomalies } from "@/lib/anomaly";
import { notify } from "@/lib/notify";
import { reconcileGateway } from "@/lib/payments";
/** Jalankan harian: Authorization: Bearer <CRON_SECRET>. Rekonsiliasi Midtrans + peringatan anomali & PPN. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const gateway = await reconcileGateway().catch((e) => ({ error: String(e) })), alerts = await detectAnomalies(), day = new Date().toISOString().slice(0, 10);
  const users = await prisma.user.findMany({ where: { role: { in: ["admin", "finance"] }, isActive: true }, select: { id: true } });
  let sent = 0;
  for (const a of alerts.filter((x) => x.level !== "low")) for (const u of users) { await notify(u.id, `Peringatan keuangan: ${a.title}`, a.detail, { link: a.link, ref: `fa-${createHash("md5").update(a.key).digest("hex").slice(0, 14)}-${u.id}-${day}` }); sent++; }
  return NextResponse.json({ gateway, alerts: alerts.length, notifications: sent });
}
