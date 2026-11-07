# AsetKu: Sistem Manajemen Inventaris, Sewa, dan Jual-Beli Aset
Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + MySQL + JWT (cookie httpOnly) + RBAC.

**Fitur utama:** katalog aset, sewa (keranjang, pembayaran, asuransi, serah terima, denda), jual-beli aset, perawatan aset, stock opname, keuangan (kas, pajak, anggaran, audit), karyawan dan penggajian, lembur, serta reimburse.

## Daftar isi
1. [Yang harus dipasang dulu](#1-yang-harus-dipasang-dulu)
2. [Membuka project di laptop lain (langkah demi langkah)](#2-membuka-project-di-laptop-lain-langkah-demi-langkah)
3. [Akun untuk login](#3-akun-untuk-login)
4. [Setiap kali membuka project lagi](#4-setiap-kali-membuka-project-lagi)
5. [Memperbarui dari versi lama](#5-memperbarui-dari-versi-lama)
6. [Backup dan restore database](#6-backup-dan-restore-database)
7. [Jika ada masalah](#7-jika-ada-masalah)
8. [Fitur dan alur](#8-fitur-dan-alur)
9. [Pengaturan lain (.env, cron, pemeriksaan)](#9-pengaturan-lain)

---

## 1. Yang harus dipasang dulu
| Perangkat lunak | Keterangan | Unduh |
|---|---|---|
| Laragon (versi Full) | Sudah berisi MySQL dan HeidiSQL. **Tidak perlu** XAMPP atau MySQL terpisah | https://laragon.org/download/ |
| Node.js 20 LTS atau lebih baru | Sudah termasuk `npm`. Cek: `node -v` | https://nodejs.org/ |
| Visual Studio Code | Editor dan terminal | https://code.visualstudio.com/ |
| Google Chrome / Edge | Scan QR lewat kamera paling stabil di Chrome | |

Docker **tidak dipakai** di project ini. Catatan lengkap perangkat lunak ada di `docs/Catatan-Perangkat-Lunak-AsetKu.pdf`.

## 2. Membuka project di laptop lain (langkah demi langkah)
1. **Salin project** ke laptop. Jika berbentuk `.zip`, ekstrak dulu. **Jangan** ikut menyalin folder `node_modules`, `.next`, dan file `.env` (berisi rahasia).
2. Buka VS Code, pilih **File, Open Folder**, lalu pilih folder project (yang berisi `package.json`).
3. Buka Laragon dan klik **Start All** sampai MySQL berjalan.
4. **Buat database kosong** bernama `asset_db`: klik **Database** di Laragon (membuka HeidiSQL), klik kanan, **Create new, Database**, isi nama `asset_db`. Bisa juga lewat phpMyAdmin.
5. Di VS Code buka terminal (**Terminal, New Terminal**), lalu salin file env:
   - PowerShell / CMD: `copy .env.example .env`
   - Git Bash: `cp .env.example .env`
6. Buka file `.env`, lalu atur:
   - `DATABASE_URL`: bawaan Laragon memakai user `root` **tanpa password**, jadi isinya `mysql://root:@localhost:3306/asset_db`. Jika root Anda memakai password: `mysql://root:PASSWORD@localhost:3306/asset_db`
   - `JWT_SECRET`: teks acak minimal 32 karakter
   - `CRON_SECRET`: teks acak apa saja
7. Pasang dependensi: `npm install`
8. Buat tabel di database: `npx prisma db push`
9. Isi data awal (akun, aset, karyawan, dan lainnya): `npm run db:seed`
10. Jalankan: `npm run dev`, lalu buka http://localhost:3000

Setelah login, folder `uploads/` (foto bukti pembayaran, foto lembur, dan nota reimburse) dibuat otomatis. Foto aset bawaan sudah ada di `public/img`.

## 3. Akun untuk login
### Akun demo (password `Password123!`)
| Email | Peran | Bisa membuka |
|---|---|---|
| `admin@example.com` | Admin | Semua menu |
| `staff@example.com` | Staf gudang | Dashboard, aset, perawatan, stock opname, pengajuan sewa dan beli |
| `finance@example.com` | Keuangan | Laporan Keuangan |
| `user@example.com` | Penyewa / pembeli | Katalog, Sewa Saya, Beli Saya, Dompet |

### Akun administrator tim (password `123456789`)
`Rizaldi@Asetku.org`, `Zidan@Asetku.org`, `Ketsar@Asetku.org`, `Ibrahim@Asetku.org`, `Handika@Asetku.org`

### Akun karyawan (password awal `123456789`)
Email = **nama depan + `@asetku.org`**. Akun ini **hanya bisa membuka** menu **Input Lembur**, **Reimburse**, dan **Profil**. Dibuat otomatis oleh `npm run db:seed` dan saat admin menambah karyawan baru. Karyawan yang dinonaktifkan tidak bisa login.

| Karyawan | Jabatan | Email login |
|---|---|---|
| Hendra Wijaya | SVP | `hendra@asetku.org` |
| Ratna Kusuma | SVP | `ratna@asetku.org` |
| Andi Pratama | Area Coordinator | `andi@asetku.org` |
| Dewi Lestari | Area Coordinator | `dewi@asetku.org` |
| Rizky Fadillah | Area Coordinator | `rizky@asetku.org` |
| Yuliana Sari | Area Coordinator | `yuliana@asetku.org` |
| Siti Rahma | Admin | `siti@asetku.org` |
| Putri Ayu | Admin | `putri@asetku.org` |
| Fajar Nugroho | Admin | `fajar@asetku.org` |
| Maya Anggraini | Admin | `maya@asetku.org` |
| Budi Santoso | Facility | `budi@asetku.org` |
| Agus Setiawan | Facility | `agus@asetku.org` |
| Dian Permata | Facility | `dian@asetku.org` |
| Eko Prasetyo | Facility | `eko@asetku.org` |
| Joko Susilo | Staf Gudang | `joko@asetku.org` |
| Rudi Hartono | Staf Gudang | `rudi@asetku.org` |
| Bayu Saputra | Staf Gudang | `bayu@asetku.org` |
| Imam Syafei | Staf Gudang | `imam@asetku.org` |
| Dedi Kurniawan | Staf Gudang | `dedi@asetku.org` |
| Taufik Hidayat | Staf Gudang | `taufik@asetku.org` |
| Ahmad Fauzi | Satpam | `ahmad@asetku.org` |
| Surya Darma | Satpam | `surya@asetku.org` |
| Herman Syah | Satpam | `herman@asetku.org` |
| Irwan Maulana | Satpam | `irwan@asetku.org` |
| Zulkifli | Satpam | `zulkifli@asetku.org` |
| Bambang Irawan | Satpam | `bambang@asetku.org` |

Password `123456789` hanya cocok untuk demo atau lokal. Sebelum dipakai di server yang bisa diakses orang lain, ganti semua password lewat menu Profil (password baru minimal 8 karakter dengan huruf dan angka).

## 4. Setiap kali membuka project lagi
1. Start Laragon (**Start All**).
2. Buka folder project di VS Code, lalu jalankan `npm run dev`.
3. Langkah 7 sampai 9 pada bagian 2 **tidak perlu diulang**.

## 5. Memperbarui dari versi lama
Jika Anda sudah punya database dan menimpa file project dengan versi baru:
```
npm install
npx prisma db push
npm run db:seed
npm run dev
```
- `npx prisma db push` menambah tabel dan kolom baru tanpa menghapus data.
- `npm run db:seed` **aman diulang**: data lama tidak diduplikasi atau ditimpa. Seed juga membuat akun karyawan yang belum ada dan membersihkan kategori "Layanan Internet" dari database lama.
- Jika `npm install` atau `npx prisma generate` menampilkan error `EPERM`, hentikan dulu `npm run dev` (Ctrl+C), lalu ulangi.

## 6. Backup dan restore database
**Backup lewat terminal:** `npm run db:backup`. Hasilnya di folder `backups/` (nama seperti `asetku-202611061530.sql`), dan 14 file terbaru disimpan.
- Perintah ini butuh `mysqldump`. Jika muncul "Backup gagal. Pastikan mysqldump terpasang", tambahkan folder MySQL Laragon ke PATH:
  1. Cari folder: `dir C:\laragon\bin\mysql` (misalnya `mysql-8.0.30-winx64`).
  2. Untuk terminal yang sedang terbuka: `$env:Path += ";C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin"` (sesuaikan nama folder).
  3. Permanen: Laragon, **Menu, Tools, Path, Add Laragon to Path**, lalu tutup dan buka lagi VS Code.

**Backup tanpa terminal:** Laragon, **Database** (HeidiSQL), klik kanan `asset_db`, **Export database as SQL**.

**Restore:** HeidiSQL, buka `asset_db`, **File, Run SQL file**, pilih file backup. Atau `mysql -u root asset_db < backups\namafile.sql`. Restore **menimpa** data yang ada, jadi backup dulu jika data sekarang masih penting.

## 7. Jika ada masalah
| Masalah | Penyebab dan solusi |
|---|---|
| `Can't reach database server` | MySQL Laragon belum jalan, atau `DATABASE_URL` di `.env` salah (user, password, port, nama database) |
| `Unknown database 'asset_db'` | Database belum dibuat (langkah 4) |
| Port 3000 sudah dipakai | `npm run dev -- -p 3001`, lalu buka http://localhost:3001 |
| Error `prisma` atau `@prisma/client` | `npx prisma generate` |
| Tabel atau kolom tidak ditemukan | Skema belum diperbarui: `npx prisma db push` |
| Login karyawan gagal | Pastikan `npm run db:seed` sudah dijalankan. Email memakai nama depan, misalnya `agus@asetku.org` |
| Ingin mengulang data dari awal | Hapus database `asset_db`, buat lagi yang kosong, lalu ulangi langkah 8 dan 9 |
| Perubahan tidak tampil | Hentikan `npm run dev`, jalankan lagi, lalu refresh browser (Ctrl+F5) |

## 8. Fitur dan alur
### Sewa aset
Penyewa memilih aset di **Katalog** lalu **keranjang sewa**, mengisi tanggal dan keperluan, dan membayar di halaman **Pembayaran** (asuransi opsional, saldo dompet + PIN, transfer bank, QRIS dan e-wallet, atau tunai).
Alur status: pending, approve, checkout (aset `borrowed`), checkin (cek kondisi, denda = hari telat x `FINE_PER_DAY`, aset `available`). Admin dan staf mengelolanya di **Pengajuan & Serah Terima**.

### Jual-beli aset
- Admin atau staf mengisi **Harga jual** di Kelola Aset. Jika **Tarif sewa** kosong atau 0 dan ada harga jual, aset otomatis **hanya dijual** (tidak bisa disewa).
- Di katalog, penyewa menambah aset ke **keranjang beli** (terpisah dari keranjang sewa, tanpa tanggal dan durasi), lalu **Ajukan pembelian**.
- Alur sama seperti sewa: pengajuan, **Pembayaran** (`/buy-checkout`), persetujuan admin, verifikasi bukti, **serah terima** (Struk / Berita Acara).
- Menu penyewa: **Beli Saya**. Menu admin dan staf: **Pesanan Pembelian** (setujui, tolak, cek bukti, serahkan).
- Begitu diajukan, stok ditahan: aset hilang dari katalog dan tampil **Stok habis** (merah) di Kelola Aset. Jika pesanan ditolak, dibatalkan, atau tidak dibayar (non-tunai, lewat batas waktu), stok kembali tersedia.
- Jika admin menolak pesanan yang uangnya sudah masuk (termasuk bukti transfer yang sedang diverifikasi), gunakan **Tolak pesanan & refund ke dompet**. Saldo dikembalikan ke Dompet pembeli.
- Pembayaran masuk keuangan sebagai "Penjualan aset", "Premi asuransi", dan "PPN keluaran 11%".

### Perawatan aset
Menu **Perawatan Aset** mendeteksi aset berkondisi Rusak atau Perlu perawatan. Klik **Perbaiki** lalu konfirmasi (bisa langsung ditandai selesai). Biaya otomatis tercatat di keuangan.

### Lembur karyawan
- Karyawan mengisi tanggal, jam mulai dan selesai, jenis hari, **kegiatan**, dan **foto bukti** di menu **Input Lembur**.
- Admin menyetujui di **Lembur Karyawan**. Nominal dihitung otomatis: upah per jam = (gaji pokok + tunjangan) / 173; hari kerja jam pertama 1,5x lalu 2x; hari libur 2x untuk jam 1 sampai 8, 3x untuk jam ke-9, 4x untuk jam ke-10 dan seterusnya. Rumusnya ada di `src/lib/overtime.ts`.
- Lembur yang disetujui langsung masuk kolom lembur di slip gaji periode terkait. Jika slip bulan itu belum dibuat, ikut masuk saat slip dibuat. Jika sudah dibayar, pindah ke slip periode berikutnya.

### Reimburse karyawan
- Karyawan memilih jenis biaya (BBM, makan, parkir dan tol, perjalanan dinas, ATK, pulsa dan internet, perawatan kendaraan, kebersihan, lainnya), mengisi keperluan, dan mengunggah **foto nota**.
- Admin membayar di **Reimburse Karyawan**. Pembayaran langsung tercatat sebagai **kas keluar** kategori "Reimburse karyawan" di Laporan Keuangan.

### Keuangan
Menu **Laporan Keuangan** (admin dan keuangan): arus kas, analitik dan peringatan, pajak (PPN), neraca dan penyusutan, anggaran, rekonsiliasi, tutup buku, dan **Jejak Audit** (aksi ditampilkan dengan label yang mudah dipahami).

## 9. Pengaturan lain
### Isi `.env`
| Variabel | Fungsi |
|---|---|
| `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET` | Wajib diisi (lihat langkah 6 pada bagian 2) |
| `FINE_PER_DAY` | Denda keterlambatan per hari (Rp) |
| `PAY_DEADLINE_HOURS`, `NEXT_PUBLIC_PAY_DEADLINE_HOURS` | Batas jam pembayaran sebelum pesanan non-tunai dibatalkan otomatis |
| `PAYMENT_MODE`, `NEXT_PUBLIC_ONLINE_PAYMENT`, `MIDTRANS_*` | Pembayaran online (nonaktif secara bawaan) |
| `SMTP_*`, `MAIL_FROM`, `FONNTE_TOKEN` | Notifikasi email dan WhatsApp (opsional) |
| `UPLOAD_DIR` | Folder penyimpanan unggahan (bawaan `uploads`) |
| `APPROVAL_LIMIT` | Pengeluaran manual peran Keuangan di atas batas ini menunggu persetujuan admin |
| `BACKUP_KEEP` | Jumlah file backup yang disimpan |

### Jadwal otomatis (cron)
Panggil dengan header `Authorization: Bearer <CRON_SECRET>`:
- Harian: `GET /api/cron/reminders` (pengingat jatuh tempo sewa, pembatalan otomatis pesanan sewa yang belum dibayar) dan `GET /api/cron/finance` (peringatan anomali, pengingat PPN, rekonsiliasi Midtrans)
- Tanggal 1 tiap bulan: `GET /api/cron/monthly-report` (laporan bulan lalu ke admin dan keuangan; `?period=YYYY-MM` untuk bulan tertentu)

### Pemeriksaan sebelum dipakai atau deploy
- `npm run verify`: cek cepat impor/ekspor, nama model Prisma, dan handler API
- `npm run typecheck`: pemeriksaan tipe TypeScript penuh
- `npm run check`: verify, typecheck, dan build
- `npm run build` lalu `npm start`: menjalankan versi produksi
- Dokumentasi skripsi: folder `docs/` (ERD, use case dan alur, skenario uji dan UAT)

---
Dibuat oleh **Rizaldi, M. Zidan Khalil Gibran, M. Ketsar Ali Abi Wahid, Ibrahim Saleh Siregar, Handika Nur Ichsan**. Hak cipta (c) 2026 Rizaldi, M. Zidan Khalil Gibran, M. Ketsar Ali Abi Wahid, Ibrahim Saleh Siregar, Handika Nur Ichsan.
