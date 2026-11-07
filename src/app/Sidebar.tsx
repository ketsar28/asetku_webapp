"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NotifBell from "./NotifBell";
export default function Sidebar({ role, name }: { role: string; name: string }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const staff = role !== "user";
  const items = [
    ...(staff ? [["/dashboard", "Dashboard"], ["/assets", "Kelola Aset"], ["/maintenance", "Perawatan Aset"], ["/withdrawals", "Penarikan Saldo"], ["/stock-opname", "Stock Opname"]] : []),
    ["/catalog", "Katalog Aset"], ["/loans", staff ? "Pengajuan & Serah Terima" : "Peminjaman Saya"], ["/purchases", staff ? "Pesanan Pembelian" : "Pembelian Saya"],
    ...(role === "admin" ? [["/employees", "Karyawan"], ["/payroll", "Penggajian"], ["/overtime", "Lembur Karyawan"], ["/reimburse", "Reimburse Karyawan"], ["/finance", "Laporan Keuangan"], ["/users", "Akun Penyewa & Staff"]] : []),
  ];
  return (
    <>
      <header className="flex items-center justify-between bg-ink px-4 py-3 text-white lg:hidden">
        <span className="rounded-lg bg-white px-2 py-1"><img src="/logo.png" alt="AsetKu Corporate" className="h-9 w-auto" /></span><button onClick={() => setOpen(!open)} className="rounded border border-white/30 px-2 py-1 text-sm">Menu</button>
      </header>
      <aside className={`${open ? "block" : "hidden"} w-full shrink-0 bg-ink p-4 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60`}>
        <div className="mb-6 hidden rounded-xl bg-white p-3 lg:block"><img src="/logo.png" alt="AsetKu Corporate" className="mx-auto h-24 w-auto" /></div>
        <nav className="space-y-1">
          {(role === "finance" ? [["/finance", "Laporan Keuangan"]] : items).map(([h, l]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${path.startsWith(h) ? "bg-white text-ink" : "text-white/80 hover:bg-white/10"}`}>{l}</Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-white/15 pt-4 text-sm lg:absolute lg:bottom-4 lg:left-4 lg:right-4">
          <div className="flex items-center justify-between"><p className="font-semibold">{name}</p><NotifBell up dark /></div><p className="mb-2 text-white/60">{role}</p>
          <button className="text-amber-500 hover:underline" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; }}>Keluar</button>
        </div>
      </aside>
    </>
  );
}
