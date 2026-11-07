# Uji Alur, UAT, dan Perbandingan Manual vs Otomatis

Sebelum pengujian: `npm run verify`, `npm run typecheck`, `npm run build` (atau `npm run check`), lalu `npm run db:seed`.
Akun demo (password `Password123!`): admin@example.com, staff@example.com, finance@example.com, user@example.com.

## A. Skenario uji fungsional (isi kolom Hasil: Lulus/Gagal)
| Kode | Skenario | Langkah ringkas | Hasil diharapkan | Hasil |
|---|---|---|---|---|
| T01 | Daftar penyewa | Daftar dengan password tanpa angka, lalu dengan huruf+angka | Pertama ditolak, kedua berhasil | |
| T02 | Batas login | Salah password 9 kali | Muncul pesan terlalu banyak percobaan | |
| T03 | Lupa password | /forgot → buka tautan di terminal/email → set password baru | Bisa login dengan password baru; tautan tidak bisa dipakai ulang | |
| T04 | Katalog | Cari aset, filter kategori, buka Detail | Spesifikasi dan kalender ketersediaan tampil | |
| T05 | Scan QR | Katalog → Scan QR / ketik kode ELK-001 | Detail aset terbuka | |
| T06 | Pesan | Pilih 2 aset, tanggal, centang S&K, ajukan | Masuk halaman pembayaran; total = sewa + PPN 11% | |
| T07 | Asuransi | Centang asuransi di halaman pembayaran | Total bertambah (10% sewa, min Rp 5.000); bisa dibatalkan | |
| T08 | Bayar manual | Transfer → upload bukti | Status "Menunggu verifikasi" | |
| T09 | Verifikasi | Admin → Cek bukti → Terima | Lunas; masuk Laporan Keuangan (sewa, asuransi, PPN terpisah) | |
| T10 | Tolak + refund | Pesanan lunas ditolak admin | Saldo dompet penyewa bertambah; ada baris "Refund sewa" | |
| T11 | PIN dompet | Buat PIN; salah 5 kali | Dompet terkunci 15 menit | |
| T12 | Bayar dengan saldo | Pilih "Saldo Dompet" + PIN | Lunas, saldo berkurang | |
| T13 | Tarik saldo | Ajukan penarikan → admin tandai transfer | Status selesai; notifikasi terkirim | |
| T14 | Serah terima | Admin → Serahkan; buka Berita acara | Status dipinjam; dokumen siap cetak | |
| T15 | Perpanjang | Penyewa → Perpanjang → bayar → admin setujui & serahkan | Tanggal kembali induk bergeser; pengembalian induk menutup perpanjangan | |
| T16 | Kembali + denda | Check-in terlambat + denda kerusakan | Denda tercatat di keuangan; aset kembali tersedia | |
| T17 | Batas bayar | Jalankan cron reminders setelah 24 jam | Pesanan belum dibayar dibatalkan otomatis | |
| T18 | Kwitansi | Buka Kwitansi pesanan lunas | Halaman kwitansi tampil dan bisa dicetak | |
| T19 | Export | Export Excel (keuangan, aset, sewa, karyawan, gaji) | File .xlsx terbuka; angka bisa dijumlahkan | |
| T20 | Penggajian | Buat slip → ubah → bayar | Slip lunas; baris "Gaji karyawan" masuk keuangan | |
| T21 | Tutup buku | Tutup bulan lalu → coba catat transaksi bertanggal bulan itu | Ditolak dengan pesan periode ditutup | |
| T22 | Void | Batalkan transaksi manual dengan alasan | Hilang dari laporan; muncul di Audit | |
| T23 | Persetujuan | Akun Keuangan catat pengeluaran ≥ Rp 5 juta | Menunggu admin; admin menyetujui | |
| T24 | PPN | Tab Pajak → catat setoran | Sisa PPN berkurang; status Lunas | |
| T25 | Rekonsiliasi | Isi saldo aktual berbeda dari buku | Selisih ditandai dan muncul di peringatan | |
| T26 | Stock opname | Mulai sesi → scan beberapa aset → tutup | Yang tidak discan menjadi "Hilang" | |
| T27 | Hak akses | Penyewa membuka /finance, /users | Dialihkan; API menolak | |
| T28 | Backup | `npm run db:backup` | File .sql dibuat di folder backups | |

## B. UAT (System Usability Scale, skala 1–5: 1 = sangat tidak setuju, 5 = sangat setuju)
1. Saya ingin sering menggunakan sistem ini.
2. Saya merasa sistem ini terlalu rumit.
3. Saya merasa sistem ini mudah digunakan.
4. Saya perlu bantuan orang teknis untuk menggunakan sistem ini.
5. Fitur-fitur sistem ini terintegrasi dengan baik.
6. Saya merasa ada terlalu banyak ketidakkonsistenan pada sistem ini.
7. Kebanyakan orang akan cepat belajar menggunakan sistem ini.
8. Saya merasa sistem ini sangat membingungkan.
9. Saya merasa percaya diri menggunakan sistem ini.
10. Saya perlu belajar banyak hal sebelum bisa memakai sistem ini.

Skor SUS: untuk butir ganjil (1,3,5,7,9) nilai = skor − 1; untuk butir genap (2,4,6,8,10) nilai = 5 − skor. Jumlahkan semua nilai, kalikan 2,5. Rata-rata ≥ 68 dianggap di atas rata-rata; ≥ 80 baik. Gunakan minimal 5–10 responden per peran (penyewa, staf, admin, keuangan).

## C. Perbandingan pencatatan manual vs otomatis
| Metrik | Cara pengukuran | Manual | Otomatis (AsetKu) |
|---|---|---|---|
| Waktu mencatat satu transaksi sewa sampai masuk laporan | Stopwatch, minimal 10 transaksi, ambil rata-rata | | |
| Waktu menyusun laporan bulanan | Dari mulai sampai laporan jadi | | |
| Jumlah kesalahan pencatatan | Bandingkan dengan bukti (kwitansi/mutasi) per 100 transaksi | | |
| Selisih saldo saat rekonsiliasi | Saldo buku vs mutasi bank | | |
| Keterlacakan perubahan | Dapat diketahui siapa/kapan mengubah (Ya/Tidak) | | |
