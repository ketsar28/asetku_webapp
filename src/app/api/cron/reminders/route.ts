import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
/** Panggil rutin (mis. sekali sehari) dengan header: Authorization: Bearer <CRON_SECRET> */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const now = new Date(), soon = new Date(+now + 36 * 3600 * 1000), fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  await prisma.loanRequest.updateMany({ where: { status: "on_loan", expectedReturnDate: { lt: now } }, data: { status: "overdue" } });
  const due = await prisma.loanRequest.findMany({ where: { status: "on_loan", expectedReturnDate: { gte: now, lt: soon } }, include: { asset: true } });
  const late = await prisma.loanRequest.findMany({ where: { status: "overdue" }, include: { asset: true } });
  for (const l of due) await notify(l.userId, "Pengembalian segera jatuh tempo", `${l.asset.name} (${l.requestNumber}) harus dikembalikan ${fmt(l.expectedReturnDate)}. Keterlambatan dikenai denda.`, { link: "/loans", ref: `due-${l.id}` });
  for (const l of late) await notify(l.userId, "Sewa melewati jatuh tempo", `${l.asset.name} (${l.requestNumber}) sudah melewati batas ${fmt(l.expectedReturnDate)}. Segera kembalikan agar denda tidak bertambah.`, { link: "/loans", ref: `late-${l.id}` });
  // Batas waktu pembayaran: pesanan yang belum dibayar melewati batas dibatalkan otomatis
  const hours = Number(process.env.PAY_DEADLINE_HOURS ?? 24), cutoff = new Date(+now - hours * 3600000), warn = new Date(+now - (hours - 4) * 3600000);
  const open = { status: { in: ["pending", "approved"] as ("pending" | "approved")[] }, paymentStatus: "unpaid", rentalFee: { gt: 0 } };
  const stale = await prisma.loanRequest.findMany({ where: { ...open, createdAt: { lt: cutoff } }, include: { asset: true } });
  for (const l of stale) {
    await prisma.loanRequest.update({ where: { id: l.id }, data: { status: "rejected", adminNote: `Dibatalkan otomatis: belum dibayar dalam ${hours} jam` } });
    await notify(l.userId, "Pesanan dibatalkan otomatis", `${l.asset.name} (${l.requestNumber}) dibatalkan karena belum dibayar dalam ${hours} jam. Silakan ajukan kembali bila masih diperlukan.`, { link: "/loans" });
  }
  const hint = await prisma.loanRequest.findMany({ where: { ...open, createdAt: { gte: cutoff, lt: warn } }, include: { asset: true } });
  for (const l of hint) await notify(l.userId, "Segera selesaikan pembayaran", `${l.asset.name} (${l.requestNumber}) akan dibatalkan otomatis dalam beberapa jam jika belum dibayar.`, { link: `/checkout?loan=${l.id}`, ref: `payhint-${l.id}` });
  return NextResponse.json({ due: due.length, late: late.length, cancelled: stale.length, paymentReminders: hint.length });
}
