import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BANKS, EWALLETS } from "../src/lib/banks";
import { calcPay } from "../src/lib/payroll";
import { ensureEmployeeAccount } from "../src/lib/employee-account";
import EMP from "./employees.json";
const db = new PrismaClient();
let s = 42; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a: number, b: number, step = 1) => Math.round((a + rnd() * (b - a)) / step) * step;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const day = (n: number) => new Date(Date.now() - n * 86400000);
const pad = (n: number, l = 3) => String(n).padStart(l, "0");
type Spec = { cat: string; code: string; count: number; names: string[]; brands: string[]; cost: [number, number, number]; rate: [number, number]; unit?: string; loc: string[] };
const SPECS: Spec[] = [
  { cat: "Gedung & Ruangan", code: "GDG", count: 60, names: ["Gedung Serbaguna", "Aula Utama", "Ruang Rapat", "Ruang Seminar", "Ruang Kelas", "Ruang Workshop", "Gedung Pertemuan"], brands: ["-"], cost: [150e6, 2500e6, 1e6], rate: [500e3, 5e6], loc: ["Kampus Utama", "Kampus Timur", "Gedung A", "Gedung B"] },
  { cat: "Fasilitas Olahraga", code: "OLR", count: 60, names: ["Lapangan Futsal", "Lapangan Badminton", "Lapangan Basket", "Lapangan Tenis", "Lapangan Voli", "Lapangan Mini Soccer"], brands: ["-"], cost: [80e6, 600e6, 1e6], rate: [150e3, 600e3], loc: ["Sport Center", "Area Olahraga Barat", "Area Olahraga Timur"] },
  { cat: "Elektronik", code: "ELK", count: 100, names: ["Laptop", "Proyektor", "Kamera DSLR", "Tablet", "Printer", "Drone", "Monitor", "Kamera Mirrorless"], brands: ["Lenovo", "Epson", "Canon", "Samsung", "HP", "Dell", "DJI", "Sony"], cost: [3e6, 35e6, 1e5], rate: [25e3, 300e3], loc: ["Gudang A", "Gudang B"] },
  { cat: "Kendaraan", code: "KDR", count: 50, names: ["Mobil Avanza", "Minibus Hiace", "Motor Operasional", "Pickup Box", "Bus Mini", "Mobil Innova"], brands: ["Toyota", "Honda", "Suzuki", "Daihatsu", "Isuzu"], cost: [18e6, 600e6, 1e6], rate: [150e3, 2e6], loc: ["Garasi Utama", "Garasi Barat"] },
  { cat: "Furnitur", code: "FRN", count: 80, names: ["Meja Lipat", "Kursi Lipat", "Tenda Event", "Panggung Portable", "Sofa Tamu", "Meja Rapat", "Kursi Kuliah"], brands: ["Informa", "Olympic", "Ikea"], cost: [300e3, 25e6, 1e4], rate: [5e3, 150e3], loc: ["Gudang C", "Gudang Event"] },
  { cat: "Peralatan Audio Visual", code: "AVD", count: 70, names: ["Sound System", "Mikrofon Wireless", "Layar Proyektor", "Lighting Panggung", "Kamera Siaran", "Mixer Audio", "Speaker Aktif"], brands: ["Yamaha", "Shure", "JBL", "Behringer", "Sony"], cost: [1e6, 60e6, 1e5], rate: [30e3, 500e3], loc: ["Gudang AV", "Studio"] },
  { cat: "Perlengkapan Presentasi", code: "PRS", count: 50, names: ["Whiteboard", "Flipchart", "Podium", "Laser Pointer", "Papan Display", "Standing Banner"], brands: ["Sakura", "Joyko", "-"], cost: [200e3, 10e6, 1e4], rate: [5e3, 75e3], loc: ["Gudang C", "Ruang Perlengkapan"] },
];
async function main() {
  // Bersihkan kategori & aset "Layanan Internet" dari database lama beserta riwayat terkait
  const oldCat = await db.category.findUnique({ where: { name: "Layanan Internet" } });
  if (oldCat) {
    const ids = (await db.asset.findMany({ where: { categoryId: oldCat.id }, select: { id: true } })).map((x) => x.id);
    await db.$transaction([db.transaction.deleteMany({ where: { assetId: { in: ids } } }), db.loanRequest.deleteMany({ where: { assetId: { in: ids } } }), db.asset.deleteMany({ where: { categoryId: oldCat.id } }), db.category.delete({ where: { id: oldCat.id } })]);
  }
  const dept = await db.department.upsert({ where: { code: "IT" }, update: {}, create: { name: "Teknologi Informasi", code: "IT" } });
  await db.department.upsert({ where: { code: "HR" }, update: {}, create: { name: "Sumber Daya Manusia", code: "HR" } });
  const mk = (name: string, email: string, role: "admin" | "staff" | "finance" | "user", pw = "Password123!") => db.user.upsert({ where: { email }, update: {}, create: { name, email, role, departmentId: dept.id, passwordHash: bcrypt.hashSync(pw, 10) } });
  const admin = await mk("Administrator", "admin@example.com", "admin"); await mk("Staff Gudang", "staff@example.com", "staff"); await mk("Staf Keuangan", "finance@example.com", "finance"); const demo = await mk("Peminjam Demo", "user@example.com", "user");
  // Akun tim pengembang (administrator / pengendali penuh)
  for (const [n, e] of [["Rizaldi", "Rizaldi@Asetku.org"], ["M. Zidan Khalil Gibran", "Zidan@Asetku.org"], ["M. Ketsar Ali Abi Wahid", "Ketsar@Asetku.org"], ["Ibrahim Saleh Siregar", "Ibrahim@Asetku.org"], ["Handika Nur Ichsan", "Handika@Asetku.org"]]) await mk(n, e, "admin", "123456789");
  for (const c of SPECS) await db.category.upsert({ where: { name: c.cat }, update: {}, create: { name: c.cat } });
  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.name, c.id]));
  const data = SPECS.flatMap((sp) => Array.from({ length: sp.count }, (_, k) => {
    const i = k + 1, r = rnd();
    return { assetCode: `${sp.code}-${pad(i)}`, imageUrl: `/img/assets/${sp.code}-${pad(i)}.svg`, name: `${sp.names[k % sp.names.length]} ${Math.ceil(i / sp.names.length)}`, categoryId: cats[sp.cat], brand: pick(sp.brands), model: `${sp.code}-${between(100, 999)}`,
      serialNumber: `SN${between(100000, 999999)}`, location: pick(sp.loc), condition: r < 0.04 ? "damaged" as const : r < 0.08 ? "maintenance" as const : "good" as const,
      purchaseDate: day(between(40, 420)), purchaseCost: between(sp.cost[0], sp.cost[1], sp.cost[2]), rentalRate: between(sp.rate[0], sp.rate[1], 5000), rentalUnit: sp.unit ?? "day" };
  }));
  await db.asset.createMany({ data, skipDuplicates: true });
  // Sebagian aset bergerak juga dijual (harga jual 80% dari harga beli), contoh data untuk fitur beli
  await db.$executeRaw`UPDATE assets a JOIN categories c ON c.id = a.category_id SET a.sale_price = ROUND(a.purchase_cost * 0.8, -4) WHERE c.name IN ('Elektronik', 'Furnitur', 'Peralatan Audio Visual', 'Perlengkapan Presentasi') AND a.sale_price IS NULL AND a.purchase_cost > 0 AND a.status = 'available' AND a.\`condition\` = 'good' AND MOD(a.id, 3) = 0`;
  const assets = await db.asset.findMany();
  // Pembelian aset -> uang keluar
  const have = new Set((await db.transaction.findMany({ where: { source: "purchase" }, select: { refNo: true } })).map((t) => t.refNo));
  await db.transaction.createMany({ data: assets.filter((a) => a.purchaseCost && !have.has(a.assetCode)).map((a) => ({ type: "expense" as const, category: "Pembelian aset", amount: a.purchaseCost!, description: `Pembelian ${a.name} (${a.assetCode})`, txDate: a.purchaseDate ?? a.createdAt, source: "purchase", assetId: a.id, refNo: a.assetCode, createdBy: admin.id, createdByName: admin.name })) });
  // Riwayat peminjaman contoh -> sewa & denda (uang masuk)
  if (!(await db.loanRequest.count({ where: { requestNumber: { startsWith: "LN-SEED" } } }))) {
    const ok = assets.filter((a) => a.condition === "good" && Number(a.rentalRate) > 0).filter((_, i) => i % 3 === 0).slice(0, 170);
    const loans: any[] = [], txs: any[] = [];
    ok.forEach((a, i) => {
      const month = a.rentalUnit === "month", n = month ? pick([30, 60, 90]) : between(1, 5), start = day(month ? between(100, 220) : between(10, 200));
      const end = new Date(+start + (n - 1) * 86400000), late = rnd() < 0.15 ? between(1, 4) : 0, back = new Date(+end + late * 86400000);
      const fee = Number(a.rentalRate) * (month ? Math.ceil(n / 30) : n), fine = late * 10000, no = `LN-SEED-${pad(i + 1, 4)}`;
      loans.push({ requestNumber: no, userId: demo.id, assetId: a.id, startDate: start, expectedReturnDate: end, actualReturnDate: back, status: "returned" as const, purpose: "Kegiatan operasional", approvedBy: admin.id, rentalFee: fee, fineAmount: fine, requestDate: start });
      txs.push({ type: "income" as const, category: "Pendapatan sewa", amount: fee, description: `Sewa aset ${no}`, txDate: start, source: "rental", assetId: a.id, refNo: no, createdBy: admin.id, createdByName: admin.name });
      if (fine) txs.push({ type: "income" as const, category: "Denda keterlambatan", amount: fine, description: `Denda ${no} (${late} hari terlambat)`, txDate: back, source: "fine", assetId: a.id, refNo: no, createdBy: admin.id, createdByName: admin.name });
    });
    await db.loanRequest.createMany({ data: loans }); await db.transaction.createMany({ data: txs });
  }
  // Riwayat perawatan contoh -> uang keluar
  if (!(await db.maintenanceRecord.count())) {
    for (const a of assets.filter((_, i) => i % 17 === 0).slice(0, 30)) {
      const cost = between(100e3, 5e6, 5000), d = day(between(20, 300));
      const m = await db.maintenanceRecord.create({ data: { assetId: a.id, maintenanceDate: d, completionDate: d, cost, description: "Servis berkala dan penggantian suku cadang", vendor: "Mitra Servis Resmi", status: "completed" } });
      await db.transaction.create({ data: { type: "expense", category: "Perawatan aset", amount: cost, description: "Perawatan: Servis berkala dan penggantian suku cadang", txDate: d, source: "maintenance", refNo: `MT-${m.id}`, assetId: a.id, createdBy: admin.id, createdByName: admin.name } });
    }
  }
  // Variasi metode pembayaran untuk data contoh (hanya jika belum ada yang non-tunai)
  if (!(await db.transaction.count({ where: { paymentMethod: { not: "cash" } } }))) {
    const groups: Record<string, number[]> = {};
    for (const t of await db.transaction.findMany({ select: { id: true } })) {
      const r = rnd(), m = r < 0.3 ? "cash" : r < 0.72 ? "transfer" : "qris";
      const bank = m === "cash" ? "" : pick(m === "qris" ? [...BANKS.slice(0, 8), ...EWALLETS] : BANKS.slice(0, 10));
      (groups[`${m}|${bank}`] ??= []).push(t.id);
    }
    for (const [k, ids] of Object.entries(groups)) { const [m, b] = k.split("|"); await db.transaction.updateMany({ where: { id: { in: ids } }, data: { paymentMethod: m, bankName: b || null } }); }
  }
  await db.loanRequest.updateMany({ where: { status: { in: ["on_loan", "overdue", "returned"] }, paymentStatus: "unpaid" }, data: { paymentStatus: "paid" } });
  const NAMES = ["Budi Santoso", "Siti Rahma", "Andi Pratama", "Dewi Lestari", "Rizky Fadillah", "Putri Ayu", "Hendra Gunawan", "CV Maju Jaya", "PT Sinar Mandiri", "Yuliana Sari"];
  for (const t of await db.transaction.findMany({ where: { paymentMethod: { not: "cash" }, accountNo: null }, select: { id: true, type: true } }))
    await db.transaction.update({ where: { id: t.id }, data: { accountName: t.type === "expense" ? "PT AsetKu Corporate" : pick(NAMES), accountNo: String(between(1000000000, 9999999999)) } });
  // Spesifikasi & deskripsi aset (data baru maupun lama)
  const R = (a: number, b: number, s = 1) => between(a, b, s);
  const SP: Record<string, (n: string, b: string) => [string, string][]> = {
    GDG: () => [["Kapasitas", `${R(30, 800, 10)} orang`], ["Luas", `${R(60, 1500, 10)} m2`], ["Fasilitas", pick(["AC, proyektor, sound system", "AC, panggung, WiFi", "AC, WiFi, kursi dan meja"])], ["Parkir", pick(["Tersedia (30 mobil)", "Tersedia (60 mobil)", "Tersedia (100 mobil)"])], ["Jam operasional", "07.00 - 22.00 WIB"]],
    OLR: () => [["Jenis lantai", pick(["Vinyl", "Rumput sintetis", "Parket kayu", "Beton poles"])], ["Ukuran", pick(["25 x 15 m", "28 x 15 m", "40 x 20 m"])], ["Penerangan", "Lampu LED untuk malam hari"], ["Fasilitas", "Ruang ganti, toilet, tribun"], ["Jam operasional", "06.00 - 23.00 WIB"]],
    ELK: (n) => /Laptop/.test(n) ? [["Prosesor", pick(["Intel Core i5", "Intel Core i7", "AMD Ryzen 5", "AMD Ryzen 7"])], ["RAM", pick(["8 GB", "16 GB", "32 GB"])], ["Penyimpanan", pick(["SSD 256 GB", "SSD 512 GB", "SSD 1 TB"])], ["Layar", pick(['14"', '15,6"'])], ["Baterai", "Hingga 8 jam"]]
      : /Proyektor/.test(n) ? [["Kecerahan", `${R(3000, 5500, 100)} lumen`], ["Resolusi", pick(["XGA", "WXGA", "Full HD"])], ["Konektivitas", "HDMI, VGA, USB"], ["Lampu", "Hingga 10.000 jam"]]
      : /Kamera/.test(n) ? [["Sensor", pick(["24,2 MP", "26,2 MP", "32,5 MP"])], ["Video", pick(["4K 30 fps", "Full HD 60 fps"])], ["Lensa", "Kit 18-55 mm"], ["Kelengkapan", "Baterai, charger, tas, kartu SD 64 GB"]]
      : /Drone/.test(n) ? [["Kamera", "4K"], ["Waktu terbang", `${R(25, 40)} menit`], ["Jarak kendali", "Hingga 10 km"], ["Kelengkapan", "2 baterai, remote, tas"]]
      : [["Tipe", n.replace(/ \d+$/, "")], ["Kondisi", "Terawat, siap pakai"], ["Kelengkapan", "Kabel daya dan buku panduan"]],
    KDR: () => [["Kapasitas", pick(["2 orang", "7 orang", "14 orang", "30 orang"])], ["Bahan bakar", pick(["Bensin", "Solar"])], ["Transmisi", pick(["Manual", "Otomatis"])], ["Tahun", String(R(2018, 2025))], ["Kelengkapan", "STNK, asuransi, P3K"]],
    FRN: () => [["Bahan", pick(["Besi dan kayu", "Plastik HDPE", "Besi hollow", "Kayu jati"])], ["Dimensi", pick(["120 x 60 cm", "180 x 90 cm", "4 x 6 m"])], ["Warna", pick(["Hitam", "Putih", "Cokelat", "Abu-abu"])], ["Kondisi", "Bersih dan terawat"]],
    AVD: () => [["Daya", `${R(100, 1500, 50)} watt`], ["Konektivitas", pick(["XLR, Bluetooth", "HDMI, USB", "XLR, jack 6,3 mm"])], ["Kelengkapan", "Kabel, stand, tas"], ["Pemeriksaan", "Dites sebelum disewakan"]],
    PRS: () => [["Ukuran", pick(["90 x 120 cm", "60 x 90 cm", "80 x 200 cm"])], ["Bahan", pick(["Aluminium", "Besi", "Kayu"])], ["Kelengkapan", "Spidol, penghapus, stand"], ["Kondisi", "Baik"]],
  };
  for (const a of assets.filter((x) => !x.specs)) {
    const sp = (SP[a.assetCode.slice(0, 3)] ?? (() => [] as [string, string][]))(a.name, a.brand ?? "");
    await db.asset.update({ where: { id: a.id }, data: { specs: sp.map(([k, v]) => `${k}: ${v}`).join("\n"), description: `${a.name}${a.brand && a.brand !== "-" ? ` (${a.brand})` : ""} tersedia untuk disewa di ${a.location ?? "AsetKu"}. Hubungi admin untuk kebutuhan khusus.` } });
  }
  await db.$executeRaw`UPDATE loan_requests SET total_amount = rental_fee WHERE total_amount = 0 AND rental_fee > 0`;
  // Gambar untuk semua aset yang belum punya foto (termasuk data lama)
  await db.$executeRaw`UPDATE assets SET image_url = CONCAT('/img/assets/', asset_code, '.svg') WHERE image_url IS NULL`;
  // Karyawan + riwayat gaji 2 bulan terakhir (otomatis tercatat sebagai uang keluar)
  if (!(await db.employee.count())) {
    const BASE: Record<string, [number, number]> = { SVP: [25e6, 35e6], "Area Coordinator": [9e6, 13e6], Admin: [5e6, 6.5e6], Facility: [4.5e6, 5.5e6], "Staf Gudang": [4e6, 5e6], Satpam: [3.6e6, 4.4e6] };
    const ALW: Record<string, number> = { SVP: 5e6, "Area Coordinator": 1.5e6, Admin: 6e5, Facility: 5e5, "Staf Gudang": 4e5, Satpam: 35e4 };
    const STREETS = ["Jl. Sudirman", "Jl. Khatib Sulaiman", "Jl. Ahmad Yani", "Jl. Proklamasi", "Jl. Perintis Kemerdekaan"];
    const NOTES = ["Konsisten dan disiplin", "Perlu peningkatan ketepatan waktu", "Inisiatif tinggi", "Hasil kerja sangat baik", "Kerja sama tim baik"];
    for (const [i, e] of EMP.entries()) {
      const [lo, hi] = BASE[e.position];
      await db.employee.create({ data: { employeeNo: `EMP-${pad(i + 1)}`, name: e.name, position: e.position, gender: e.gender, birthDate: day(between(9500, 17500)), nik: `1371${between(100000000000, 999999999999)}`,
        phone: `08${between(1100000000, 9999999999)}`, email: `${e.name.toLowerCase().replace(/[^a-z]+/g, ".")}@asetku.co.id`, address: `${pick(STREETS)} No. ${between(1, 99)}, Padang, Sumatera Barat`,
        joinDate: day(between(200, 3200)), baseSalary: between(lo, hi, 50000), allowance: ALW[e.position], kpiScore: between(62, 97), kpiNote: pick(NOTES),
        bankName: pick(BANKS.slice(0, 8)), accountName: e.name, accountNo: String(between(1000000000, 9999999999)), photoUrl: `/img/staff/EMP-${pad(i + 1)}.svg` } });
    }
    const emps = await db.employee.findMany(), txs: any[] = [];
    for (const back of [2, 1]) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - back, 1), period = `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`;
      for (const e of emps) {
        const base = Number(e.baseSalary), allowance = Number(e.allowance), overtime = e.position === "Satpam" || e.position === "Staf Gudang" ? between(0, 600000, 25000) : 0, c = calcPay({ base, allowance, kpiScore: e.kpiScore, overtime });
        const slipNo = `SG-${period.replace("-", "")}-${e.employeeNo.slice(4)}`, paidAt = new Date(d.getFullYear(), d.getMonth(), 28, 10, between(0, 59), between(0, 59));
        await db.payroll.create({ data: { slipNo, employeeId: e.id, period, baseSalary: base, allowance, kpiScore: e.kpiScore, kpiBonus: c.kpiBonus, overtime, bpjs: c.bpjs, net: c.net, status: "paid", paidAt, paymentMethod: "transfer", bankName: "Bank Mandiri" } });
        txs.push({ type: "expense" as const, category: "Gaji karyawan", amount: c.net, description: `Gaji ${period} - ${e.name} (${e.position}) ke ${e.bankName} ${e.accountNo}`, txDate: paidAt, source: "payroll", refNo: slipNo, paymentMethod: "transfer", bankName: "Bank Mandiri", accountName: "PT AsetKu Corporate", accountNo: "1230001234567", createdBy: admin.id, createdByName: admin.name });
      }
    }
    await db.transaction.createMany({ data: txs });
  }
  // Akun login semua karyawan aktif (nama depan@asetku.org, password awal 123456789). Hanya bisa membuka menu Lembur dan Reimburse.
  for (const e of await db.employee.findMany({ where: { status: "active" } })) await ensureEmployeeAccount(db, e);
  console.log(`Seed selesai: ${assets.length} aset.`);
}
main().finally(() => db.$disconnect());
