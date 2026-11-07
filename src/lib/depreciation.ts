/** Umur ekonomis (bulan) per kategori, metode garis lurus. Sesuaikan dengan kebijakan akuntansi perusahaan. */
export const LIFE_MONTHS: Record<string, number> = { "Gedung & Ruangan": 240, "Fasilitas Olahraga": 120, Elektronik: 48, Kendaraan: 96, Furnitur: 96, "Peralatan Audio Visual": 60, "Perlengkapan Presentasi": 48 };
export const DEFAULT_LIFE = 48, SALVAGE_RATE = 0;
export function depr(cost: number, start: Date, life: number, asOf = new Date()) {
  const months = Math.max(0, (asOf.getFullYear() - start.getFullYear()) * 12 + asOf.getMonth() - start.getMonth());
  const base = cost * (1 - SALVAGE_RATE), monthly = base / life, acc = Math.min(base, monthly * months);
  return { months, monthly, acc, book: cost - acc };
}
