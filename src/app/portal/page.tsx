"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Badge, Empty, rp, tgl } from "../ui";
import { due } from "@/lib/pricing";
export default function Portal() {
  const [rows, setRows] = useState<any[]>([]); const [me, setMe] = useState<any>({});
  useEffect(() => { api("/api/loans").then(setRows); api("/api/me").then(setMe); }, []);
  const c = (...s: string[]) => rows.filter((r) => s.includes(r.status)).length;
  const spent = rows.filter((r) => ["approved", "on_loan", "overdue", "returned"].includes(r.status)).reduce((t, r) => t + due(r) + Number(r.fineAmount), 0);
  const k = [["Sewa berjalan", c("on_loan", "overdue")], ["Menunggu persetujuan", c("pending")], ["Siap diambil", c("approved")], ["Total biaya sewa", rp(spent)]];
  const steps = ["Pilih aset di katalog dan masukkan ke keranjang", "Tentukan tanggal mulai dan lama sewa, lalu ajukan", "Tunggu persetujuan admin, lalu bayar (transfer/QRIS + unggah bukti, atau tunai saat ambil)", "Ambil aset, gunakan, lalu kembalikan tepat waktu"];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-ink p-6 text-white sm:p-8">
        <p className="text-sm text-white/70">Selamat datang,</p><h1 className="text-2xl font-extrabold sm:text-3xl">{me.name}</h1>
        <p className="mt-2 max-w-xl text-white/70">Sewa atau beli gedung, lapangan, kendaraan, dan perlengkapan dalam beberapa klik.</p>
        <Link href="/catalog" className="mt-4 inline-block rounded-lg bg-[#00BF63] px-5 py-2.5 font-bold text-ink hover:bg-white">Sewa aset sekarang</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{k.map(([l, v]) => <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><p className="mb-3 font-bold">Cara menyewa</p><ol className="space-y-3">{steps.map((t, i) => <li key={t} className="flex gap-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-moss text-xs font-bold text-white">{i + 1}</span>{t}</li>)}</ol></div>
        <div className="card"><div className="mb-3 flex items-center justify-between"><p className="font-bold">Sewa terbaru</p><Link href="/loans" className="text-sm text-moss">Lihat semua</Link></div>
          {rows.length === 0 ? <Empty text="Belum ada sewa. Mulai dari katalog aset." /> :
          <ul className="divide-y">{rows.slice(0, 5).map((r) => <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm"><div><p className="font-semibold">{r.asset.name}</p><p className="text-xs text-slate-500">{tgl(r.startDate)} – {tgl(r.expectedReturnDate)} • {Number(r.rentalFee) ? rp(due(r)) : "Gratis"}</p></div><Badge v={r.status} /></li>)}</ul>}</div>
      </div>
    </div>
  );
}
