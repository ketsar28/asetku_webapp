import { prisma } from "@/lib/prisma";
import { route, need, ApiError } from "@/lib/api";
import { payInfo } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { refundToWallet } from "@/lib/wallet";
import { loanIncomeTx } from "@/lib/finance";
/** POST {action: approve|reject|checkout|checkin, note?, condition?} */
export const POST = route(["admin", "staff"], async (s, req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json(); const { action, note, condition } = body;
  const pay = () => payInfo(body);
  const out = await prisma.$transaction(async (tx) => {
    const loan = await tx.loanRequest.findUnique({ where: { id: Number(params.id) }, include: { asset: true } });
    if (!loan) throw new ApiError(404, "Pengajuan tidak ditemukan");
    const log = (actionType: any, description: string) =>
      tx.assetLog.create({ data: { assetId: loan.assetId, actionType, description, performedBy: s!.id } });
    const must = (st: string[]) => { if (!st.includes(loan.status)) throw new ApiError(409, `Status saat ini "${loan.status}" tidak valid untuk aksi ini`); };

    if (action === "approve") {
      must(["pending"]);
      return tx.loanRequest.update({ where: { id: loan.id }, data: { status: "approved", approvedBy: s!.id, adminNote: note } });
    }
    if (action === "reject") {
      must(["pending", "approved"]); if (loan.paymentStatus === "verifying") throw new ApiError(409, "Pembayaran penyewa sedang diverifikasi. Buka \"Cek bukti\", lalu pilih Terima pembayaran, atau \"Tolak pesanan & refund ke dompet\" bila uang sudah masuk ke rekening."); need(note, "Alasan penolakan wajib diisi");
      const upd = await tx.loanRequest.update({ where: { id: loan.id }, data: { status: "rejected", approvedBy: s!.id, adminNote: note } });
      if (loan.paymentStatus === "paid") { await refundToWallet(tx, loan, loan.asset.name, { id: s!.id, name: s!.name }); return { ...upd, paymentStatus: "refunded" }; }
      return upd;
    }
    if (action === "checkout") {
      must(["approved"]);
      if (loan.extensionOf) { // perpanjangan: aset sudah di tangan penyewa, cukup aktifkan dan geser tanggal kembali pesanan induk
        const parent = await tx.loanRequest.findFirst({ where: { requestNumber: loan.extensionOf, status: { in: ["on_loan", "overdue"] } } });
        if (!parent) throw new ApiError(409, "Pesanan induk sudah dikembalikan; perpanjangan tidak dapat diaktifkan");
        if (Number(loan.rentalFee) > 0 && loan.paymentStatus !== "paid") await tx.transaction.createMany({ data: loanIncomeTx(loan, loan.asset.name, payInfo(body.paymentMethod ? body : loan), new Date(), { id: s!.id, name: s!.name }) });
        await tx.loanRequest.update({ where: { id: parent.id }, data: { expectedReturnDate: loan.expectedReturnDate, status: "on_loan" } });
        await log("updated", `Perpanjangan ${loan.requestNumber} diaktifkan hingga ${loan.expectedReturnDate.toISOString().slice(0, 10)}`);
        return tx.loanRequest.update({ where: { id: loan.id }, data: { status: "on_loan", paymentStatus: "paid", paidAt: loan.paidAt ?? new Date() } });
      }
      const a = await tx.asset.updateMany({ where: { id: loan.assetId, status: "available" }, data: { status: "borrowed" } });
      if (!a.count) throw new ApiError(409, "Aset tidak tersedia");
      await log("updated", `Check-out ${loan.requestNumber}`);
      if (Number(loan.rentalFee) > 0 && loan.paymentStatus !== "paid") await tx.transaction.createMany({ data: loanIncomeTx(loan, loan.asset.name, payInfo(body.paymentMethod ? body : loan), new Date(), { id: s!.id, name: s!.name }) });
      return tx.loanRequest.update({ where: { id: loan.id }, data: { status: "on_loan", paymentStatus: "paid", paidAt: loan.paidAt ?? new Date() } });
    }
    if (action === "checkin") {
      must(["on_loan", "overdue"]);
      if (loan.extensionOf) throw new ApiError(409, "Perpanjangan dikembalikan bersama pesanan induknya. Terima pengembalian pada pesanan induk.");
      const cond = ["good", "damaged", "maintenance"].includes(condition) ? condition : "good";
      const now = new Date();
      const late = Math.max(0, Math.ceil((+now - +loan.expectedReturnDate) / 86400000));
      const fine = late * Number(process.env.FINE_PER_DAY ?? 10000), damage = Math.max(0, Math.round(Number(body.damageFee) || 0));
      if (fine > 0) await tx.transaction.create({ data: { type: "income", category: "Denda keterlambatan", amount: fine, description: `Denda ${loan.requestNumber} (${late} hari terlambat)`, txDate: now, source: "fine", assetId: loan.assetId, refNo: loan.requestNumber, ...payInfo(body.paymentMethod ? body : loan), createdBy: s!.id, createdByName: s!.name } });
      if (damage > 0) await tx.transaction.create({ data: { type: "income", category: "Denda kerusakan", amount: damage, description: `Denda kerusakan ${loan.requestNumber}`, txDate: now, source: "damage", assetId: loan.assetId, refNo: loan.requestNumber, ...payInfo(body.paymentMethod ? body : loan), createdBy: s!.id, createdByName: s!.name } });
      await tx.loanRequest.updateMany({ where: { extensionOf: loan.requestNumber, status: "on_loan" }, data: { status: "returned", actualReturnDate: now } });
      await tx.asset.update({ where: { id: loan.assetId }, data: { status: "available", condition: cond } });
      await log(cond === "good" ? "updated" : "condition_change", `Check-in ${loan.requestNumber}, kondisi: ${cond}, telat ${late} hari`);
      return tx.loanRequest.update({ where: { id: loan.id }, data: { status: "returned", actualReturnDate: now, fineAmount: fine + damage, damageFee: damage, adminNote: note ?? loan.adminNote } });
    }
    throw new ApiError(400, "Aksi tidak dikenal");
  });
  const no = out.requestNumber, d = out.expectedReturnDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const msg: Record<string, [string, string]> = {
    approve: ["Pengajuan disetujui", `Pengajuan ${no} disetujui admin. Silakan bayar di menu Sewa Saya agar aset bisa diambil.`],
    reject: ["Pengajuan ditolak", `Pengajuan ${no} ditolak. Alasan: ${note}.${out.paymentStatus === "refunded" ? " Pembayaran Anda sudah dikembalikan ke Saldo Dompet." : ""}`],
    checkout: ["Aset diserahkan", `Aset pada ${no} sudah diserahkan. Mohon dikembalikan paling lambat ${d}.`],
    checkin: ["Pengembalian diterima", `Pengembalian ${no} sudah diterima.${Number(out.fineAmount) ? ` Denda: Rp ${Number(out.fineAmount).toLocaleString("id-ID")}.` : ""}`],
  };
  if (msg[action] && !body.silent) await notify(out.userId, msg[action][0], msg[action][1], { link: "/loans" });
  return out;
});
export const DELETE = route(["user", "staff", "admin"], async (s, _r: Request, { params }: { params: { id: string } }) => {
  const loan = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) } });
  if (!loan || (s!.role === "user" && loan.userId !== s!.id)) throw new ApiError(404, "Pengajuan tidak ditemukan");
  if (loan.status !== "pending") throw new ApiError(409, "Hanya pengajuan yang masih menunggu yang bisa dibatalkan");
  if (loan.paymentStatus === "verifying") throw new ApiError(409, "Bukti transfer Anda sedang diverifikasi. Tunggu hasilnya sebelum membatalkan.");
  return prisma.$transaction(async (tx) => {
    const full = await tx.loanRequest.findUniqueOrThrow({ where: { id: loan.id }, include: { asset: true } });
    const upd = await tx.loanRequest.update({ where: { id: loan.id }, data: { status: "rejected", adminNote: "Dibatalkan oleh penyewa" } });
    if (full.paymentStatus === "paid") await refundToWallet(tx, full, full.asset.name, { id: s!.id, name: s!.name });
    return upd;
  });
});
export const GET = route(["user", "staff", "admin"], async (s, _r: Request, { params }: { params: { id: string } }) => {
  const l = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) }, include: { asset: true, user: { select: { name: true, email: true, phone: true } } } });
  if (!l || (s!.role === "user" && l.userId !== s!.id)) throw new ApiError(404, "Data tidak ditemukan"); return l;
});
