/** PPN: tarif UU 12% x DPP nilai lain 11/12 (PMK 131/2024) = tarif efektif 11% untuk jasa non-mewah. Ubah di sini bila aturan berubah. */
export const VAT_RATE = 0.12, VAT_DPP = 11 / 12;
/** Asuransi barang: persen dari biaya sewa, dengan batas minimum. Atur sesuai produk asuransi Anda. */
export const INSURANCE_RATE = 0.1, INSURANCE_MIN = 5000;
/** Jasa asuransi umumnya tidak dikenai PPN. Set true bila premi juga ingin dikenai PPN (konfirmasi ke akuntan/konsultan pajak). */
export const VAT_ON_INSURANCE = false;
export function charges(rent: number, insured: boolean) {
  const insurance = insured && rent > 0 ? Math.max(INSURANCE_MIN, Math.round(rent * INSURANCE_RATE)) : 0;
  const vat = Math.round((rent + (VAT_ON_INSURANCE ? insurance : 0)) * VAT_DPP * VAT_RATE);
  return { rent, insurance, vat, total: rent + insurance + vat };
}
/** Total tagihan sebuah peminjaman; data lama (sebelum PPN) memakai biaya sewa saja. */
export const due = (l: any) => Number(l.totalAmount) || Number(l.rentalFee);
/** Asuransi pembelian: persen dari harga barang, dengan batas minimum. Atur sesuai produk asuransi Anda. */
export const SALE_INSURANCE_RATE = 0.02, SALE_INSURANCE_MIN = 5000;
export function saleCharges(price: number, insured: boolean) {
  const insurance = insured && price > 0 ? Math.max(SALE_INSURANCE_MIN, Math.round(price * SALE_INSURANCE_RATE)) : 0;
  const vat = Math.round(price * VAT_DPP * VAT_RATE);
  return { price, insurance, vat, total: price + insurance + vat };
}
