import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
const per = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
function make() {
  const c = new PrismaClient();
  // Tutup buku: transaksi pada periode yang sudah ditutup tidak boleh dibuat, diubah, atau dihapus.
  c.$use(async (params, next) => {
    if (params.model === "Transaction" && ["create", "createMany", "update", "updateMany", "delete", "deleteMany"].includes(params.action)) {
      const a: any = params.args ?? {}, dates: Date[] = [];
      if (params.action === "create") a.data?.txDate && dates.push(new Date(a.data.txDate));
      else if (params.action === "createMany") for (const d of ([] as any[]).concat(a.data ?? [])) d.txDate && dates.push(new Date(d.txDate));
      else { const old = await c.transaction.findMany({ where: a.where, select: { txDate: true } }); old.forEach((o) => dates.push(o.txDate)); if (a.data?.txDate) dates.push(new Date(a.data.txDate)); }
      if (dates.length) {
        const closed = await c.periodClose.findFirst({ where: { period: { in: Array.from(new Set(dates.map(per))) } } });
        if (closed) throw Object.assign(new Error(`Periode ${closed.period} sudah ditutup buku. Buka kembali periodenya (admin) untuk mengubah transaksi.`), { code: "PERIOD_CLOSED" });
      }
    }
    return next(params);
  });
  return c;
}
export const prisma = g.prisma ?? make();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
