const S: [string, string][] = [
  ["1. Pemesanan", "Pemesanan baru berlaku setelah disetujui admin. Ketersediaan aset ditentukan oleh jadwal sewa yang sudah ada dan kondisi aset."],
  ["2. Biaya dan pembayaran", "Biaya sewa dihitung dari tarif aset dikalikan lama sewa, ditambah PPN 11% dan asuransi barang bila dipilih. Pembayaran dilakukan sebelum batas waktu yang tertera pada halaman pembayaran. Pesanan yang tidak dibayar dalam batas waktu dibatalkan otomatis."],
  ["3. Penggunaan aset", "Aset hanya boleh dipakai sesuai keperluan yang diajukan, tidak boleh dipindahtangankan atau disewakan kembali, dan harus dijaga kebersihan dan keamanannya."],
  ["4. Keterlambatan", "Pengembalian setelah batas waktu dikenai denda per hari keterlambatan sesuai tarif yang berlaku. Perpanjangan harus diajukan dan dibayar sebelum masa sewa berakhir."],
  ["5. Kerusakan atau kehilangan", "Penyewa bertanggung jawab atas kerusakan atau kehilangan selama masa sewa. Besarnya penggantian ditetapkan petugas berdasarkan hasil pemeriksaan saat pengembalian. Asuransi barang, bila dipilih, berlaku sesuai ketentuan perlindungannya."],
  ["6. Pembatalan dan refund", "Pesanan yang sudah dibayar lalu ditolak atau dibatalkan dikembalikan penuh ke Saldo Dompet penyewa. Saldo dapat dipakai untuk pesanan berikutnya atau ditarik ke rekening bank dengan PIN."],
  ["7. Keamanan akun dan PIN", "Penyewa wajib menjaga kerahasiaan password dan PIN Dompet dan bertanggung jawab atas aktivitas pada akunnya."],
  ["8. Data pribadi", "Data yang diberikan dipakai untuk memproses sewa, pembayaran, dan pemberitahuan, serta tidak dibagikan kepada pihak lain kecuali diwajibkan oleh hukum."],
  ["9. Perubahan ketentuan", "AsetKu Corporate dapat memperbarui ketentuan ini. Ketentuan yang berlaku adalah yang disetujui saat pemesanan."],
];
export const metadata = { title: "Syarat & Ketentuan Sewa – AsetKu" };
export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl space-y-4"><h1 className="text-2xl font-extrabold">Syarat & Ketentuan Sewa</h1>
      {S.map(([t, b]) => <div key={t} className="card"><p className="font-bold">{t}</p><p className="mt-1 text-sm text-slate-700">{b}</p></div>)}
      <a href="/" className="text-sm text-moss underline">Kembali ke beranda</a></div>
  );
}
