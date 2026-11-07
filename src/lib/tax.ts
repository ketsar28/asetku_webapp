import { prisma } from "./prisma";
import { per } from "./reports";
/** Estimasi iuran BPJS bagian perusahaan: Kesehatan 4% + JKK 0,24% + JKM 0,3% + JHT 3,7% = 8,24% dari gaji pokok. Sesuaikan dengan kepesertaan Anda. */
export const BPJS_PERUSAHAAN = 0.0824;
export async function vatRecap(year: number) {
  const base = { voidedAt: null, approval: "approved" };
  const [txs, paidTx] = await Promise.all([
    prisma.transaction.findMany({ where: { ...base, txDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }, source: { in: ["rental", "rental_vat", "refund"] } } }),
    prisma.transaction.findMany({ where: { ...base, source: "tax_vat", refNo: { startsWith: `PPN-${year}` } } }),
  ]);
  const refunds = txs.filter((t) => t.source === "refund" && t.refNo);
  const rl = refunds.length ? await prisma.loanRequest.findMany({ where: { requestNumber: { in: refunds.map((t) => t.refNo!.slice(3)) } }, select: { requestNumber: true, vatAmount: true } }) : [];
  const rv = new Map(rl.map((l) => [l.requestNumber, Number(l.vatAmount)])), now = new Date();
  return Array.from({ length: 12 }, (_, m) => {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`, mt = txs.filter((t) => per(t.txDate) === key);
    const vt = mt.filter((t) => t.source === "rental_vat"), refs = new Set(vt.map((t) => t.refNo));
    const sales = mt.filter((t) => t.source === "rental" && refs.has(t.refNo)).reduce((a, t) => a + Number(t.amount), 0);
    const ppn = vt.reduce((a, t) => a + Number(t.amount), 0), retur = mt.filter((t) => t.source === "refund").reduce((a, t) => a + (rv.get(t.refNo?.slice(3) ?? "") ?? 0), 0);
    const net = ppn - retur, paid = paidTx.filter((t) => t.refNo === `PPN-${key}`).reduce((a, t) => a + Number(t.amount), 0), left = Math.max(0, net - paid);
    const deadline = new Date(year, m + 2, 0, 23, 59, 59), ended = new Date(year, m + 1, 1) <= now;
    return { period: key, sales: Math.round(sales), dpp: Math.round((sales * 11) / 12), ppn: Math.round(ppn), retur: Math.round(retur), net: Math.round(net), paid: Math.round(paid), left: Math.round(left), deadline,
      status: net <= 0 ? "Nihil" : left <= 0 ? "Lunas" : !ended ? "Berjalan" : now > deadline ? "Terlambat" : "Belum disetor" };
  });
}
export async function payrollRecap(year: number) {
  const p = await prisma.payroll.findMany({ where: { period: { startsWith: String(year) }, status: "paid" } });
  const m = new Map<string, any>();
  for (const x of p) { const r = m.get(x.period) ?? { period: x.period, n: 0, base: 0, allowance: 0, bonus: 0, overtime: 0, bpjsKaryawan: 0, bpjsPerusahaan: 0, other: 0, net: 0 };
    r.n++; r.base += Number(x.baseSalary); r.allowance += Number(x.allowance); r.bonus += Number(x.kpiBonus); r.overtime += Number(x.overtime); r.bpjsKaryawan += Number(x.bpjs); r.bpjsPerusahaan += Math.round(Number(x.baseSalary) * BPJS_PERUSAHAAN); r.other += Number(x.otherDeduction); r.net += Number(x.net); m.set(x.period, r); }
  return Array.from(m.values()).sort((a, b) => a.period.localeCompare(b.period));
}
