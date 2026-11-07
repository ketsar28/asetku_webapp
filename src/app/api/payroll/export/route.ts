import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DT, RP, wib, xlsxResponse } from "@/lib/xlsx";
export async function GET(req: Request) {
  const s = await getSession(); const period = new URL(req.url).searchParams.get("period") ?? "";
  if (s?.role !== "admin") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });
  const p = await prisma.payroll.findMany({ where: { period }, include: { employee: true }, orderBy: { employee: { name: "asc" } } });
  return xlsxResponse(`penggajian-${period}`, `Gaji ${period}`, [
    { header: "No Slip", key: "slip", width: 20 }, { header: "Karyawan", key: "nama", width: 26 }, { header: "Jabatan", key: "jab", width: 18 }, { header: "Gaji Pokok", key: "base", width: 16, fmt: RP }, { header: "Tunjangan", key: "alw", width: 14, fmt: RP },
    { header: "Skor KPI", key: "kpi", width: 10 }, { header: "Bonus KPI", key: "bonus", width: 14, fmt: RP }, { header: "Lembur", key: "ot", width: 14, fmt: RP }, { header: "BPJS", key: "bpjs", width: 14, fmt: RP }, { header: "Potongan Lain", key: "ded", width: 14, fmt: RP },
    { header: "Gaji Bersih", key: "net", width: 18, fmt: RP }, { header: "Status", key: "st", width: 10 }, { header: "Tgl Bayar", key: "paid", width: 22, fmt: DT }, { header: "Bank", key: "bank", width: 20 }, { header: "No Rekening", key: "norek", width: 20, fmt: "@" },
  ], p.map((x) => ({ slip: x.slipNo, nama: x.employee.name, jab: x.employee.position, base: Number(x.baseSalary), alw: Number(x.allowance), kpi: x.kpiScore, bonus: Number(x.kpiBonus), ot: Number(x.overtime), bpjs: Number(x.bpjs), ded: Number(x.otherDeduction), net: Number(x.net), st: x.status === "paid" ? "Dibayar" : "Draft", paid: wib(x.paidAt), bank: x.employee.bankName ?? "", norek: x.employee.accountNo ?? "" })), { sum: ["base", "alw", "bonus", "ot", "bpjs", "ded", "net"] });
}
