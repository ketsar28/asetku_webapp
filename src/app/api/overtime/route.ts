import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { notifyRoles } from "@/lib/notify";
import { hoursBetween, isTime, overlap, overtimePay } from "@/lib/overtime";
import { dateOk, myEmployee } from "@/lib/employee-me";
export const GET = route(["admin", "employee"], async (s) => {
  if (s!.role === "employee") {
    const e = await myEmployee(s!.id);
    return { rows: await prisma.overtimeRequest.findMany({ where: { employeeId: e.id }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], take: 200 }), monthly: Number(e.baseSalary) + Number(e.allowance), employee: { name: e.name, position: e.position } };
  }
  return { rows: await prisma.overtimeRequest.findMany({ include: { employee: { select: { name: true, position: true, employeeNo: true } } }, orderBy: [{ createdAt: "desc" }], take: 500 }) };
});
/** Karyawan mengajukan lembur: tanggal, jam, kegiatan, dan foto bukti. Nominal dihitung otomatis. */
export const POST = route(["employee"], async (s, req: Request) => {
  const e = await myEmployee(s!.id), b = await req.json();
  const day = dateOk(b.workDate, 62); need(day, "Tanggal lembur tidak valid (tidak boleh di masa depan atau lebih dari 62 hari lalu)");
  need(isTime(b.startTime) && isTime(b.endTime), "Jam mulai dan jam selesai tidak valid");
  const hours = hoursBetween(b.startTime, b.endTime); need(hours >= 0.5 && hours <= 12, "Durasi lembur minimal 30 menit dan maksimal 12 jam per pengajuan");
  const activity = String(b.activity ?? "").trim(); need(activity.length >= 10, "Jelaskan kegiatan lembur (minimal 10 karakter)");
  need(typeof b.photoUrl === "string" && b.photoUrl.startsWith("/api/files/claims/"), "Unggah foto bukti kegiatan lembur");
  const dayType = b.dayType === "holiday" ? "holiday" : "workday";
  const same = await prisma.overtimeRequest.findMany({ where: { employeeId: e.id, workDate: day!, status: { in: ["pending", "approved"] } } });
  if (same.some((o) => overlap([o.startTime, o.endTime], [b.startTime, b.endTime]))) throw new ApiError(409, "Jam lembur ini bentrok dengan pengajuan lembur Anda yang lain pada tanggal yang sama");
  const amount = overtimePay(Number(e.baseSalary) + Number(e.allowance), hours, dayType);
  const r = await prisma.overtimeRequest.create({ data: { employeeId: e.id, workDate: day!, startTime: b.startTime, endTime: b.endTime, hours, dayType, activity: activity.slice(0, 1000), photoUrl: b.photoUrl, amount } });
  await notifyRoles(["admin"], "Pengajuan lembur baru", `${e.name} mengajukan lembur ${hours} jam pada ${b.workDate}. Mohon ditinjau.`, "/overtime");
  return r;
});
