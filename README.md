# Sistem Manajemen Inventaris & Peminjaman Aset
Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + MySQL + JWT (cookie httpOnly) + RBAC.

## Menjalankan
0. Jalankan MySQL lewat Laragon (klik **Start All**), lalu buat database kosong bernama `asset_db`
1. `cp .env.example .env` lalu isi `DATABASE_URL` dan `JWT_SECRET`
2. `npm install`
3. `npx prisma migrate dev --name init`
4. `npm run db:seed`
5. `npm run dev` → http://localhost:3000

Akun demo (password `Password123!`): admin@example.com, staff@example.com, user@example.com

## Alur
pending → approve → checkout (aset `borrowed`) → checkin (cek kondisi, denda = hari telat × FINE_PER_DAY, aset `available`).

---
Dibuat oleh **Rizaldi, M. Zidan Khalil Gibran, M. Ketsar Ali Abi Wahid, Ibrahim Saleh Siregar, Handika Nur Ichsan**. Hak cipta (c) 2026 Rizaldi, M. Zidan Khalil Gibran, M. Ketsar Ali Abi Wahid, Ibrahim Saleh Siregar, Handika Nur Ichsan.

## Jadwal otomatis (cron) — panggil dengan header `Authorization: Bearer <CRON_SECRET>`
- Harian: `GET /api/cron/reminders` (pengingat jatuh tempo sewa) dan `GET /api/cron/finance` (peringatan anomali, pengingat PPN, rekonsiliasi Midtrans)
- Tanggal 1 tiap bulan: `GET /api/cron/monthly-report` (laporan bulan lalu ke admin & keuangan; `?period=YYYY-MM` untuk bulan tertentu)
- Akun Keuangan demo: finance@example.com / Password123!

## Pemeriksaan sebelum dipakai / deploy
- `npm run verify` : cek cepat impor/ekspor, nama model Prisma, handler API (tanpa dependensi)
- `npm run typecheck` : pemeriksaan tipe TypeScript penuh
- `npm run check` : verify + typecheck + build
- `npm run db:backup` : backup database MySQL ke folder `backups/` (butuh `mysqldump`)
- Dokumentasi skripsi: folder `docs/` (ERD, use case & alur, skenario uji + UAT)
- Jadwal otomatis (cron, header `Authorization: Bearer <CRON_SECRET>`): `/api/cron/reminders` (harian, termasuk pembatalan otomatis pesanan belum dibayar), `/api/cron/finance` (harian), `/api/cron/monthly-report` (tanggal 1)

## Membuka & memakai project di laptop lain (Windows + Laragon + VS Code)
### Yang harus dipasang dulu
- [Laragon](https://laragon.org/download/) (sudah berisi MySQL)
- [Node.js](https://nodejs.org/) versi 20 atau lebih baru (cek: `node -v`)
- [VS Code](https://code.visualstudio.com/)

### Langkah
1. Salin folder project ke laptop (jika berbentuk `.zip`, ekstrak dulu). **Jangan** ikut menyalin folder `node_modules` dan `.next`.
2. Buka VS Code → **File → Open Folder** → pilih folder project (yang berisi `package.json`).
3. Buka Laragon, klik **Start All** sampai MySQL berjalan.
4. Buat database kosong bernama `asset_db`: klik **Database** di Laragon (membuka HeidiSQL) → klik kanan → **Create new → Database** → isi nama `asset_db`. Bisa juga lewat phpMyAdmin.
5. Di VS Code buka terminal (**Terminal → New Terminal**), lalu salin file env:
   - PowerShell / CMD: `copy .env.example .env`
   - Git Bash: `cp .env.example .env`
6. Buka file `.env`, lalu atur:
   - `DATABASE_URL` sesuai MySQL Laragon. Bawaan Laragon: user `root` **tanpa password**, jadi isinya `mysql://root:@localhost:3306/asset_db`. Jika root Anda memakai password: `mysql://root:PASSWORD@localhost:3306/asset_db`
   - `JWT_SECRET` dengan teks acak minimal 32 karakter
   - `CRON_SECRET` dengan teks acak apa saja
7. Pasang dependensi: `npm install`
8. Buat tabel di database: `npx prisma migrate dev --name init`
9. Isi data awal (akun demo, aset, dll): `npm run db:seed`
10. Jalankan project: `npm run dev`, lalu buka http://localhost:3000 di browser.

### Login demo
Password semua akun: `Password123!`
- `admin@example.com`
- `staff@example.com`
- `user@example.com`
- `finance@example.com`

Akun administrator tim (password `123456789`; dibuat oleh `npm run db:seed`, boleh dijalankan ulang di database yang sudah terisi):
- `Rizaldi@Asetku.org`
- `Zidan@Asetku.org`
- `Ketsar@Asetku.org`
- `Ibrahim@Asetku.org`
- `Handika@Asetku.org`

### Setiap kali membuka project lagi
1. Start Laragon (**Start All**).
2. Buka folder project di VS Code, lalu jalankan `npm run dev`.
3. Langkah 7–9 tidak perlu diulang.

### Jika ada masalah
- `Can't reach database server` → MySQL Laragon belum jalan, atau `DATABASE_URL` di `.env` salah (user, password, port, nama database).
- `Unknown database 'asset_db'` → database belum dibuat (langkah 4).
- Port 3000 sudah dipakai → `npm run dev -- -p 3001`, lalu buka http://localhost:3001
- Error `prisma` / `@prisma/client` → jalankan `npx prisma generate`
- Ingin mengulang data dari awal → hapus database `asset_db`, buat lagi yang kosong, lalu ulangi langkah 8–9.

## Jual-beli aset
- Admin/staf mengisi **Harga jual** di Kelola Aset. Jika **Tarif sewa** kosong/0 dan ada harga jual, aset otomatis **hanya dijual** (tidak bisa disewa).
- Di katalog, penyewa menambah aset ke **keranjang beli** (terpisah dari keranjang sewa, tanpa tanggal dan durasi), lalu **Ajukan pembelian**.
- Alur sama seperti sewa: pengajuan → **Pembayaran** (`/buy-checkout`: asuransi opsional, saldo dompet + PIN, transfer bank, QRIS/e-wallet, atau tunai) → persetujuan admin → verifikasi bukti → **serah terima** (Struk / Berita Acara).
- Menu penyewa: **Beli Saya**. Menu admin/staf: **Pesanan Pembelian** (setujui, tolak, cek bukti, serahkan).
- Begitu diajukan, stok aset ditahan: hilang dari katalog dan **Stok habis** (merah) di Kelola Aset. Jika pesanan ditolak, dibatalkan, atau tidak dibayar (non-tunai, lewat batas waktu), stok kembali tersedia.
- Pembayaran masuk keuangan sebagai "Penjualan aset", "Premi asuransi", dan "PPN keluaran 11%".
- Setelah memperbarui project dari versi lama, jalankan `npx prisma db push` lalu `npm run db:seed` (seed juga membersihkan kategori "Layanan Internet" dari database lama).

## Akun karyawan, lembur, dan reimburse
- Setiap karyawan punya akun login: **email = nama depan + `@asetku.org`**, **password awal `123456789`** (contoh `agus@asetku.org`). Dibuat otomatis oleh `npm run db:seed` dan saat admin menambah karyawan baru. Karyawan nonaktif tidak bisa login.
- Akun karyawan **hanya bisa membuka** menu **Input Lembur**, **Reimburse**, dan **Profil**.
- **Lembur:** karyawan mengisi tanggal, jam, kegiatan, dan foto bukti. Admin menyetujui di menu **Lembur Karyawan**; nominal dihitung otomatis (upah per jam = (gaji pokok + tunjangan) / 173; hari kerja jam pertama 1,5x lalu 2x; hari libur 2x, 3x, 4x) dan langsung masuk kolom lembur di slip gaji periode terkait. Jika slip bulan itu sudah dibayar, otomatis masuk ke slip periode berikutnya.
- **Reimburse:** karyawan memilih jenis biaya (BBM, makan, parkir/tol, perjalanan dinas, ATK, pulsa/internet, dan lain-lain), mengisi keperluan, dan mengunggah foto nota. Admin membayar di menu **Reimburse Karyawan**; pembayaran langsung tercatat sebagai kas keluar kategori "Reimburse karyawan" di Laporan Keuangan.
- Setelah memperbarui dari versi lama: `npx prisma db push`, lalu `npm run db:seed`.

| Karyawan | Email login |
|---|---|
| Hendra Wijaya | `hendra@asetku.org` |
| Ratna Kusuma | `ratna@asetku.org` |
| Andi Pratama | `andi@asetku.org` |
| Dewi Lestari | `dewi@asetku.org` |
| Rizky Fadillah | `rizky@asetku.org` |
| Yuliana Sari | `yuliana@asetku.org` |
| Siti Rahma | `siti@asetku.org` |
| Putri Ayu | `putri@asetku.org` |
| Fajar Nugroho | `fajar@asetku.org` |
| Maya Anggraini | `maya@asetku.org` |
| Budi Santoso | `budi@asetku.org` |
| Agus Setiawan | `agus@asetku.org` |
| Dian Permata | `dian@asetku.org` |
| Eko Prasetyo | `eko@asetku.org` |
| Joko Susilo | `joko@asetku.org` |
| Rudi Hartono | `rudi@asetku.org` |
| Bayu Saputra | `bayu@asetku.org` |
| Imam Syafei | `imam@asetku.org` |
| Dedi Kurniawan | `dedi@asetku.org` |
| Taufik Hidayat | `taufik@asetku.org` |
| Ahmad Fauzi | `ahmad@asetku.org` |
| Surya Darma | `surya@asetku.org` |
| Herman Syah | `herman@asetku.org` |
| Irwan Maulana | `irwan@asetku.org` |
| Zulkifli | `zulkifli@asetku.org` |
| Bambang Irawan | `bambang@asetku.org` |
