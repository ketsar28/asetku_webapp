import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { notifyRoles } from "@/lib/notify";
import { CLAIM_CATEGORIES, CLAIM_MAX } from "@/lib/reimburse";
import { dateOk, myEmployee } from "@/lib/employee-me";
export const GET = route(["admin", "employee"], async (s) => {
  if (s!.role === "employee") { const e = await myEmployee(s!.id); return { rows: await prisma.reimbursement.findMany({ where: { employeeId: e.id }, orderBy: { createdAt: "desc" }, take: 200 }), employee: { name: e.name, position: e.position } }; }
  return { rows: await prisma.reimbursement.findMany({ include: { employee: { select: { name: true, position: true, employeeNo: true, bankName: true, accountNo: true, accountName: true } } }, orderBy: { createdAt: "desc" }, take: 500 }) };
});
/** Karyawan mengajukan reimburse biaya penunjang kantor dengan foto nota. */
export const POST = route(["employee"], async (s, req: Request) => {
  const e = await myEmployee(s!.id), b = await req.json();
  need(CLAIM_CATEGORIES.includes(b.category), "Pilih jenis biaya");
  const day = dateOk(b.expenseDate, 92); need(day, "Tanggal pengeluaran tidak valid (tidak boleh di masa depan atau lebih dari 3 bulan lalu)");
  const amount = Math.round(Number(b.amount)); need(amount > 0 && amount <= CLAIM_MAX, "Nominal tidak valid (maksimal Rp 50.000.000)");
  const description = String(b.description ?? "").trim(); need(description.length >= 5, "Tulis keperluan pengeluaran (minimal 5 karakter)");
  need(typeof b.receiptUrl === "string" && b.receiptUrl.startsWith("/api/files/claims/"), "Unggah foto nota atau bukti pengeluaran");
  const r = await prisma.reimbursement.create({ data: { claimNo: `RB-${Date.now().toString(36).toUpperCase()}`, employeeId: e.id, category: b.category, expenseDate: day!, amount, description: description.slice(0, 1000), receiptUrl: b.receiptUrl } });
  await notifyRoles(["admin"], "Pengajuan reimburse baru", `${e.name} mengajukan reimburse ${b.category} sebesar Rp ${amount.toLocaleString("id-ID")}. Mohon ditinjau.`, "/reimburse");
  return r;
});
