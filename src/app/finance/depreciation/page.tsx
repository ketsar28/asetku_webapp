"use client";
import { useEffect, useState } from "react";
import { api, Empty, rp } from "../../ui";
import FinanceTabs from "../Tabs";
export default function Depreciation() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [n, setN] = useState(50);
  useEffect(() => { api("/api/finance/depreciation").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="text-red-700">{err}</p>; if (!d) return <p className="text-slate-500">Memuat…</p>;
  const b = d.balance, row = (k: string, v: number, bold = false) => <div className={`flex justify-between py-1 ${bold ? "border-t font-bold" : ""}`}><span>{k}</span><span>{rp(v)}</span></div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Neraca & Penyusutan Aset</h1><a className="btn-ghost" href="/api/finance/report-export?type=depreciation">Export Excel</a><button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button></div>
      <FinanceTabs />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card text-sm"><p className="mb-2 font-bold">Aset</p>{row("Kas & bank (menurut buku)", b.kas)}{row("Aset tetap (nilai buku)", b.aset)}{row("Total aset", b.totalAset, true)}</div>
        <div className="card text-sm"><p className="mb-2 font-bold">Kewajiban</p>{row("Saldo Dompet penyewa", b.wallet)}{row("PPN belum disetor", b.ppn)}{row("Total kewajiban", b.kewajiban, true)}</div>
        <div className="rounded-xl border bg-ink p-4 text-sm text-white"><p className="mb-2 font-bold">Ekuitas</p><p className="text-2xl font-extrabold">{rp(b.ekuitas)}</p><p className="mt-1 text-xs text-white/70">Total aset dikurangi total kewajiban</p></div>
      </div>
      <p className="text-xs text-slate-500">Neraca sederhana. Kas dihitung dari seluruh transaksi yang tercatat (tanpa saldo awal). Penyusutan memakai metode garis lurus dengan umur ekonomis per kategori (atur di <code>src/lib/depreciation.ts</code>). Sesuaikan dengan kebijakan akuntansi dan konsultasikan dengan akuntan.</p>
      <div className="grid gap-3 sm:grid-cols-4">{[["Harga perolehan", d.totals.cost], ["Beban penyusutan / bulan", d.totals.monthly], ["Akumulasi penyusutan", d.totals.accumulated], ["Nilai buku", d.totals.book]].map(([l, v]) => <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className="mt-1 text-xl font-extrabold">{rp(v)}</p></div>)}</div>
      <div className="card overflow-x-auto p-0"><p className="p-4 pb-2 font-bold">Per kategori</p><table className="w-full text-sm"><thead className="border-y bg-paper"><tr>{["Kategori", "Jumlah", "Harga perolehan", "Penyusutan/bulan", "Akumulasi", "Nilai buku"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{d.categories.map((c: any) => <tr key={c.name}><td className="td font-semibold">{c.name}</td><td className="td">{c.n}</td><td className="td">{rp(c.cost)}</td><td className="td">{rp(c.monthly)}</td><td className="td">{rp(c.accumulated)}</td><td className="td font-bold">{rp(c.book)}</td></tr>)}</tbody></table></div>
      <div className="card overflow-x-auto p-0"><p className="p-4 pb-2 font-bold">Per aset</p>{d.rows.length === 0 ? <Empty text="Belum ada aset dengan harga perolehan." /> : <table className="w-full text-sm"><thead className="border-y bg-paper"><tr>{["Aset", "Perolehan", "Umur", "Penyusutan/bln", "Akumulasi", "Nilai buku"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{d.rows.slice(0, n).map((r: any) => <tr key={r.id}><td className="td font-semibold">{r.name}<span className="block text-xs font-normal text-slate-500">{r.code} • {r.category}</span></td><td className="td">{rp(r.cost)}</td><td className="td">{r.ageMonths}/{r.lifeMonths} bln</td><td className="td">{rp(r.monthly)}</td><td className="td">{rp(r.accumulated)}</td><td className="td font-bold">{rp(r.book)}</td></tr>)}</tbody></table>}
        {d.rows.length > n && <div className="p-3 text-center"><button className="btn-ghost" onClick={() => setN(n + 50)}>Muat lebih banyak</button></div>}</div>
    </div>
  );
}
