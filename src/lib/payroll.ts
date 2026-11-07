export const POSITIONS = ["SVP", "Area Coordinator", "Admin", "Facility", "Staf Gudang", "Satpam"];
/** Bonus KPI: persentase dari gaji pokok berdasarkan skor. Ubah tabel ini sesuai kebijakan perusahaan. */
export const kpiRate = (s: number) => (s >= 90 ? 0.1 : s >= 80 ? 0.075 : s >= 70 ? 0.05 : s >= 60 ? 0.025 : 0);
/** Potongan BPJS bagian karyawan: 1% Kesehatan + 2% JHT = 3% gaji pokok (sederhana, belum termasuk PPh 21). */
export function calcPay(p: { base: number; allowance: number; kpiScore: number; overtime?: number; otherDeduction?: number; kpiBonus?: number }) {
  const kpiBonus = p.kpiBonus ?? Math.round(p.base * kpiRate(p.kpiScore));
  const bpjs = Math.round(p.base * 0.03);
  return { kpiBonus, bpjs, net: p.base + p.allowance + kpiBonus + (p.overtime ?? 0) - bpjs - (p.otherDeduction ?? 0) };
}
export function tenure(join: string | Date) {
  const j = new Date(join), n = new Date(); let m = (n.getFullYear() - j.getFullYear()) * 12 + n.getMonth() - j.getMonth();
  if (n.getDate() < j.getDate()) m--; m = Math.max(0, m);
  return m >= 12 ? `${Math.floor(m / 12)} thn ${m % 12} bln` : `${m} bln`;
}
const S = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
export function terbilang(n: number): string {
  n = Math.floor(Math.abs(n)); const r = (x: number, u: number) => (x % u ? " " + terbilang(x % u) : "");
  if (n < 12) return S[n]; if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + r(n, 10); if (n < 200) return "seratus" + r(n, 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus" + r(n, 100); if (n < 2000) return "seribu" + r(n, 1000);
  if (n < 1e6) return terbilang(Math.floor(n / 1000)) + " ribu" + r(n, 1000);
  if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + " juta" + r(n, 1e6);
  return terbilang(Math.floor(n / 1e9)) + " miliar" + r(n, 1e9);
}
