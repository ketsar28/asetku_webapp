import { DT, RP, wib, Col } from "./xlsx";
const PM: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", wallet: "Dompet" };
export const financeCols: Col[] = [
  { header: "Tanggal & Jam (WIB)", key: "at", width: 22, fmt: DT }, { header: "Jenis", key: "jenis", width: 10 }, { header: "Kategori", key: "kat", width: 24 }, { header: "Keterangan", key: "ket", width: 52 },
  { header: "Referensi", key: "ref", width: 22 }, { header: "Metode", key: "metode", width: 12 }, { header: "Bank/Penyedia", key: "bank", width: 24 }, { header: "Nama Rekening Asal", key: "nama", width: 26 },
  { header: "No Rekening Asal", key: "norek", width: 22, fmt: "@" }, { header: "Uang Masuk", key: "masuk", width: 18, fmt: RP }, { header: "Uang Keluar", key: "keluar", width: 18, fmt: RP }, { header: "Dicatat oleh", key: "oleh", width: 22 },
];
export const financeRows = (rows: any[]) => rows.map((r) => ({ at: wib(r.txDate), jenis: r.type === "income" ? "Masuk" : "Keluar", kat: r.category, ket: r.description, ref: r.refNo ?? "", metode: PM[r.paymentMethod] ?? r.paymentMethod, bank: r.bankName ?? "", nama: r.accountName ?? "", norek: r.accountNo ?? "",
  masuk: r.type === "income" ? Number(r.amount) : null, keluar: r.type === "expense" ? Number(r.amount) : null, oleh: r.createdByName }));
