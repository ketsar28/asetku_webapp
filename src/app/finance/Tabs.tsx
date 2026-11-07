"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const T = [["/finance", "Arus Kas"], ["/finance/analytics", "Analitik & Peringatan"], ["/finance/tax", "Pajak"], ["/finance/depreciation", "Neraca & Penyusutan"], ["/finance/budget", "Anggaran"], ["/finance/reconcile", "Rekonsiliasi"], ["/finance/close", "Tutup Buku"], ["/finance/audit", "Audit"]];
export default function FinanceTabs() {
  const p = usePathname();
  return <nav className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">{T.map(([h, l]) => <Link key={h} href={h} className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold ${p === h ? "border-moss bg-moss text-white" : "border-slate-200 bg-white text-slate-600"}`}>{l}</Link>)}</nav>;
}
