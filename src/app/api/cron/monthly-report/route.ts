import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { financeCols, financeRows } from "@/lib/finance-sheet";
import { notify, sendReportMail, sendWA } from "@/lib/notify";
import { monthly, per } from "@/lib/reports";
import { xlsxBuffer } from "@/lib/xlsx";
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
/** Jalankan tiap tanggal 1: laporan bulan lalu dikirim otomatis ke admin & keuangan (notifikasi, email + lampiran Excel, WhatsApp). ?period=YYYY-MM untuk bulan tertentu. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const now = new Date(), period = new URL(req.url).searchParams.get("period") ?? per(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const m = (await monthly(14)).find((x) => x.month === period); if (!m) return NextResponse.json({ error: "Periode di luar jangkauan" }, { status: 400 });
  const from = new Date(Number(period.slice(0, 4)), Number(period.slice(5)) - 1, 1), to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const txs = await prisma.transaction.findMany({ where: { voidedAt: null, approval: "approved", txDate: { gte: from, lt: to } }, orderBy: { txDate: "asc" } });
  const buf = await xlsxBuffer(`Keuangan ${period}`, financeCols, financeRows(txs), { sum: ["masuk", "keluar"], balance: ["masuk", "keluar"] });
  const text = `Laporan keuangan ${period}\nPendapatan: ${rp(m.recognized)}\nRefund: ${rp(m.refund)}\nBeban operasional: ${rp(m.opex)}\nLaba operasional: ${rp(m.profit)}\nPPN keluaran: ${rp(m.vatIn)}\nPembelian aset: ${rp(m.capex)}\nKas masuk ${rp(m.cashIn)} / keluar ${rp(m.cashOut)}`;
  const users = await prisma.user.findMany({ where: { role: { in: ["admin", "finance"] }, isActive: true } }); let sent = 0;
  for (const u of users) {
    const ref = `monthly-${period}-${u.id}`; if (await prisma.notification.findUnique({ where: { ref } })) continue;
    await notify(u.id, `Laporan keuangan ${period}`, text, { link: "/finance/analytics", ref, external: false });
    await Promise.allSettled([sendReportMail(u.email, `Laporan keuangan ${period}`, text, `laporan-keuangan-${period}.xlsx`, buf), u.phone ? sendWA(u.phone, `*Laporan keuangan ${period}*\n${text}`) : Promise.resolve()]); sent++;
  }
  return NextResponse.json({ period, recipients: sent });
}
