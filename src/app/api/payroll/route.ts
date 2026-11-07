import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { calcPay } from "@/lib/payroll";
import { applyOvertimeToSlips } from "@/lib/overtime";
const okPeriod = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
export const GET = route(["admin"], async (_s, req: Request) => {
  const period = new URL(req.url).searchParams.get("period") ?? ""; need(okPeriod(period), "Periode tidak valid");
  return prisma.payroll.findMany({ where: { period }, include: { employee: true }, orderBy: { employee: { name: "asc" } } });
});
/** Membuat slip draft untuk semua karyawan aktif yang belum punya slip pada periode tersebut. */
export const POST = route(["admin"], async (_s, req: Request) => {
  const { period } = await req.json(); need(okPeriod(period), "Periode tidak valid");
  const end = new Date(Number(period.slice(0, 4)), Number(period.slice(5)), 0, 23, 59, 59);
  const emps = await prisma.employee.findMany({ where: { status: "active", joinDate: { lte: end } } });
  const r = await prisma.payroll.createMany({ skipDuplicates: true, data: emps.map((e) => {
    const base = Number(e.baseSalary), allowance = Number(e.allowance), c = calcPay({ base, allowance, kpiScore: e.kpiScore });
    return { slipNo: `SG-${period.replace("-", "")}-${e.employeeNo.slice(4)}`, employeeId: e.id, period, baseSalary: base, allowance, kpiScore: e.kpiScore, kpiBonus: c.kpiBonus, bpjs: c.bpjs, net: c.net };
  }) });
  await prisma.$transaction((tx) => applyOvertimeToSlips(tx, period)); // lembur yang sudah disetujui ikut masuk ke slip
  return { created: r.count };
});
/** Mengubah komponen gaji (hanya slip draft). Gaji bersih dihitung ulang otomatis. */
export const PATCH = route(["admin"], async (_s, req: Request) => {
  const b = await req.json(); const p = await prisma.payroll.findUnique({ where: { id: Number(b.id) } });
  if (!p) throw new ApiError(404, "Slip tidak ditemukan"); if (p.status !== "draft") throw new ApiError(409, "Slip yang sudah dibayar tidak bisa diubah");
  const n = (v: unknown, d: number) => (v === undefined || v === "" ? d : Math.max(0, Number(v) || 0));
  const base = n(b.baseSalary, Number(p.baseSalary)), allowance = n(b.allowance, Number(p.allowance)), overtime = n(b.overtime, Number(p.overtime)), other = n(b.otherDeduction, Number(p.otherDeduction));
  const kpiScore = Math.min(100, n(b.kpiScore, p.kpiScore));
  const c = calcPay({ base, allowance, kpiScore, overtime, otherDeduction: other, kpiBonus: b.kpiBonus === undefined || b.kpiBonus === "" || b.kpiBonus === null ? undefined : Number(b.kpiBonus) });
  return prisma.payroll.update({ where: { id: p.id }, data: { baseSalary: base, allowance, kpiScore, overtime, otherDeduction: other, kpiBonus: c.kpiBonus, bpjs: c.bpjs, net: c.net, note: b.note ?? p.note } });
});
