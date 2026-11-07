import type { Prisma } from "@prisma/client";
import { calcPay } from "./payroll";
type Tx = Prisma.TransactionClient;
export type DayType = "workday" | "holiday";
/** Pembagi upah per jam: 1/173 upah sebulan (Kepmenakertrans 102/2004). Upah sebulan = gaji pokok + tunjangan. */
export const MONTH_HOURS = 173;
export const isTime = (t: unknown) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
/** Selisih jam (boleh melewati tengah malam), dibulatkan 2 desimal. */
export function hoursBetween(start: string, end: string) {
  const s = mins(start); let e = mins(end); if (e <= s) e += 1440;
  return Math.round(((e - s) / 60) * 100) / 100;
}
/** Dua rentang jam bentrok? */
export function overlap(a: [string, string], b: [string, string]) {
  const r = (x: [string, string]) => { const s = mins(x[0]); let e = mins(x[1]); if (e <= s) e += 1440; return [s, e]; };
  const [as, ae] = r(a), [bs, be] = r(b); return as < be && bs < ae;
}
/** Upah lembur. Hari kerja: jam 1 = 1,5x, jam berikutnya 2x. Hari libur: jam 1-8 = 2x, jam ke-9 = 3x, jam ke-10 dst = 4x. */
export function overtimePay(monthly: number, hours: number, dayType: DayType) {
  const eq = dayType === "holiday" ? (hours <= 8 ? 2 * hours : hours <= 9 ? 16 + 3 * (hours - 8) : 19 + 4 * (hours - 9)) : hours <= 1 ? 1.5 * hours : 1.5 + 2 * (hours - 1);
  return Math.round((monthly / MONTH_HOURS) * eq);
}
const pad = (n: number) => String(n).padStart(2, "0");
export const periodOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
export const nowPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const nextPeriod = (p: string) => { const y = Number(p.slice(0, 4)), m = Number(p.slice(5)); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; };
/** Menambahkan nominal lembur ke kolom lembur slip gaji (draft) dan menghitung ulang gaji bersih. */
async function addToSlip(tx: Tx, slip: any, amount: number) {
  const overtime = Number(slip.overtime) + amount;
  const c = calcPay({ base: Number(slip.baseSalary), allowance: Number(slip.allowance), kpiScore: slip.kpiScore, overtime, otherDeduction: Number(slip.otherDeduction), kpiBonus: Number(slip.kpiBonus) });
  await tx.payroll.update({ where: { id: slip.id }, data: { overtime, bpjs: c.bpjs, net: c.net } });
}
/** Menentukan slip gaji tujuan lembur yang disetujui. Slip periode kerja bila masih draft; jika sudah dibayar, ke periode berikutnya. Bila slip belum dibuat, lembur ikut masuk saat slip dibuat. */
export async function attachToPayroll(tx: Tx, o: { employeeId: number; workDate: Date }, amount: number) {
  const find = (period: string) => tx.payroll.findUnique({ where: { employeeId_period: { employeeId: o.employeeId, period } } });
  let per = periodOf(o.workDate); const cur = nowPeriod();
  if (per < cur) { const old = await find(per); if (old && old.status === "draft") { await addToSlip(tx, old, amount); return { period: per, payrollId: old.id as number | null }; } per = cur; }
  for (let i = 0; i < 24; i++) {
    const slip = await find(per);
    if (!slip) return { period: per, payrollId: null as number | null };
    if (slip.status === "draft") { await addToSlip(tx, slip, amount); return { period: per, payrollId: slip.id as number | null }; }
    per = nextPeriod(per);
  }
  return { period: per, payrollId: null as number | null };
}
/** Dipanggil setelah slip draft dibuat: memasukkan lembur yang sudah disetujui untuk periode itu. */
export async function applyOvertimeToSlips(tx: Tx, period: string) {
  const list = await tx.overtimeRequest.findMany({ where: { status: "approved", payPeriod: period, payrollId: null } });
  const by = new Map<number, typeof list>(); for (const o of list) by.set(o.employeeId, [...(by.get(o.employeeId) ?? []), o]);
  for (const [employeeId, items] of Array.from(by)) {
    const slip = await tx.payroll.findUnique({ where: { employeeId_period: { employeeId, period } } });
    if (!slip || slip.status !== "draft") continue;
    await addToSlip(tx, slip, items.reduce((t, o) => t + Number(o.amount), 0));
    await tx.overtimeRequest.updateMany({ where: { id: { in: items.map((o) => o.id) } }, data: { payrollId: slip.id } });
  }
}
