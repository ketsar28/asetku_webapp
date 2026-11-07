import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { monthly, per } from "@/lib/reports";
export const GET = route(["admin", "finance"], async () => {
  const [mon, closed] = await Promise.all([monthly(18), prisma.periodClose.findMany()]), cm = new Map(closed.map((c) => [c.period, c]));
  return mon.map((m) => ({ ...m, closed: cm.has(m.month), closedBy: cm.get(m.month)?.closedByName, closedAt: cm.get(m.month)?.closedAt })).reverse();
});
export const POST = route(["admin", "finance"], async (s, req: Request) => {
  const b = await req.json(); need(/^\d{4}-(0[1-9]|1[0-2])$/.test(b.period), "Periode tidak valid"); const by = { id: s!.id, name: s!.name };
  if (b.action === "close") {
    need(b.period < per(new Date()), "Hanya bulan yang sudah berakhir yang bisa ditutup");
    await prisma.periodClose.upsert({ where: { period: b.period }, update: {}, create: { period: b.period, closedBy: s!.id, closedByName: s!.name } });
    await audit(by, "close_period", "period", `Tutup buku ${b.period}`, b.period);
  } else {
    if (s!.role !== "admin") throw new ApiError(403, "Hanya admin yang boleh membuka kembali periode");
    need(String(b.reason ?? "").trim(), "Alasan membuka kembali wajib diisi");
    await prisma.periodClose.deleteMany({ where: { period: b.period } });
    await audit(by, "reopen_period", "period", `Buka kembali ${b.period}: ${b.reason}`, b.period);
  }
  return { ok: true };
});
