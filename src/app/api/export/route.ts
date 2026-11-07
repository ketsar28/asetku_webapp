import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { due } from "@/lib/pricing";
import { D, DT, RP, wib, xlsxResponse } from "@/lib/xlsx";
const day = new Date().toISOString().slice(0, 10);
export async function GET(req: Request) {
  const s = await getSession(); const type = new URL(req.url).searchParams.get("type");
  if (!s || s.role === "user" || (type === "employees" && s.role !== "admin")) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  if (type === "loans") {
    const l = await prisma.loanRequest.findMany({ include: { asset: true, user: true }, orderBy: { createdAt: "desc" } });
    return xlsxResponse(`transaksi-sewa-${day}`, "Transaksi Sewa", [
      { header: "No Pengajuan", key: "no", width: 20 }, { header: "Kode Aset", key: "kode", width: 12 }, { header: "Aset", key: "aset", width: 30 }, { header: "Penyewa", key: "user", width: 22 },
      { header: "Mulai", key: "mulai", width: 13, fmt: D }, { header: "Rencana Kembali", key: "rencana", width: 16, fmt: D }, { header: "Kembali", key: "kembali", width: 13, fmt: D }, { header: "Status", key: "status", width: 12 },
      { header: "Biaya Sewa", key: "sewa", width: 16, fmt: RP }, { header: "Asuransi", key: "asuransi", width: 14, fmt: RP }, { header: "PPN", key: "ppn", width: 14, fmt: RP }, { header: "Total Tagihan", key: "total", width: 16, fmt: RP },
      { header: "Denda", key: "denda", width: 14, fmt: RP }, { header: "Status Bayar", key: "bayar", width: 14 }, { header: "Metode", key: "metode", width: 12 }, { header: "Bank/Penyedia", key: "bank", width: 22 }, { header: "Keperluan", key: "perlu", width: 40 },
    ], l.map((r) => ({ no: r.requestNumber, kode: r.asset.assetCode, aset: r.asset.name, user: r.user.name, mulai: wib(r.startDate), rencana: wib(r.expectedReturnDate), kembali: wib(r.actualReturnDate), status: r.status, sewa: Number(r.rentalFee), asuransi: Number(r.insuranceFee), ppn: Number(r.vatAmount), total: due(r), denda: Number(r.fineAmount), bayar: r.paymentStatus, metode: r.paymentMethod, bank: r.bankName ?? "", perlu: r.purpose })), { sum: ["sewa", "asuransi", "ppn", "total", "denda"] });
  }
  if (type === "employees") {
    const e = await prisma.employee.findMany({ orderBy: { employeeNo: "asc" } });
    return xlsxResponse(`data-karyawan-${day}`, "Karyawan", [
      { header: "No Karyawan", key: "no", width: 13 }, { header: "Nama", key: "nama", width: 26 }, { header: "Jabatan", key: "jab", width: 18 }, { header: "L/P", key: "jk", width: 6 }, { header: "Tgl Lahir", key: "lahir", width: 13, fmt: D }, { header: "NIK", key: "nik", width: 20, fmt: "@" },
      { header: "Telepon", key: "tel", width: 16, fmt: "@" }, { header: "Email", key: "email", width: 28 }, { header: "Alamat", key: "alamat", width: 40 }, { header: "Tgl Bergabung", key: "join", width: 14, fmt: D }, { header: "Status", key: "status", width: 10 },
      { header: "Gaji Pokok", key: "gaji", width: 16, fmt: RP }, { header: "Tunjangan", key: "tunj", width: 14, fmt: RP }, { header: "Skor KPI", key: "kpi", width: 10 }, { header: "Bank", key: "bank", width: 20 }, { header: "No Rekening", key: "norek", width: 20, fmt: "@" }, { header: "Atas Nama", key: "an", width: 24 },
    ], e.map((x) => ({ no: x.employeeNo, nama: x.name, jab: x.position, jk: x.gender, lahir: wib(x.birthDate), nik: x.nik ?? "", tel: x.phone ?? "", email: x.email ?? "", alamat: x.address ?? "", join: wib(x.joinDate), status: x.status, gaji: Number(x.baseSalary), tunj: Number(x.allowance), kpi: x.kpiScore, bank: x.bankName ?? "", norek: x.accountNo ?? "", an: x.accountName ?? "" })), { sum: ["gaji", "tunj"] });
  }
  const a = await prisma.asset.findMany({ include: { category: true }, orderBy: { assetCode: "asc" } });
  return xlsxResponse(`inventaris-aset-${day}`, "Inventaris Aset", [
    { header: "Kode", key: "kode", width: 12 }, { header: "Nama", key: "nama", width: 32 }, { header: "Kategori", key: "kat", width: 24 }, { header: "Merek", key: "merek", width: 14 }, { header: "Model", key: "model", width: 14 }, { header: "No Seri", key: "seri", width: 16 },
    { header: "Kondisi", key: "kondisi", width: 12 }, { header: "Status", key: "status", width: 12 }, { header: "Lokasi", key: "lokasi", width: 20 }, { header: "Tarif Sewa", key: "tarif", width: 16, fmt: RP }, { header: "Satuan", key: "unit", width: 9 },
    { header: "Tgl Beli", key: "tgl", width: 13, fmt: D }, { header: "Harga Beli", key: "beli", width: 18, fmt: RP }, { header: "Spesifikasi", key: "spek", width: 60 },
  ], a.map((x) => ({ kode: x.assetCode, nama: x.name, kat: x.category.name, merek: x.brand ?? "", model: x.model ?? "", seri: x.serialNumber ?? "", kondisi: x.condition, status: x.status, lokasi: x.location ?? "", tarif: Number(x.rentalRate), unit: x.rentalUnit === "month" ? "bulan" : "hari", tgl: wib(x.purchaseDate), beli: x.purchaseCost ? Number(x.purchaseCost) : null, spek: (x.specs ?? "").replace(/\n/g, "; ") })), { sum: ["beli"] });
}
