"use client";
import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Empty, rp } from "../../ui";
import FinanceTabs from "../Tabs";
const LV: Record<string, string> = { high: "border-red-300 bg-red-50 text-red-800", medium: "border-amber-300 bg-amber-50 text-amber-800", low: "border-slate-200 bg-paper text-slate-700" };
export default function Analytics() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/api/finance/analytics").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="text-red-700">{err}</p>; if (!d) return <p className="text-slate-500">Memuat analitik…</p>;
  const chg = d.prev?.recognized ? ((d.cur.recognized - d.prev.recognized) / d.prev.recognized) * 100 : null, maxC = Math.max(1, ...d.categories.map((c: any) => c.value));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Analitik Keuangan</h1><a className="btn-ghost" href="/api/finance/report-export?type=assets">Export Excel per aset</a><button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button></div>
      <FinanceTabs />
      {d.alerts.length > 0 ? <div className="space-y-2"><p className="font-bold">Peringatan & pengingat ({d.alerts.length})</p>{d.alerts.map((a: any) => <a key={a.key} href={a.link ?? "#"} className={`block rounded-lg border p-3 text-sm ${LV[a.level]}`}><b>{a.title}</b><span className="block">{a.detail}</span></a>)}</div>
        : <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Tidak ada anomali atau pengingat. Semua catatan keuangan tampak wajar.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-500">Pendapatan bulan ini</p><p className="mt-1 text-2xl font-extrabold">{rp(d.cur.recognized)}</p><p className={`text-xs font-semibold ${chg == null ? "text-slate-400" : chg >= 0 ? "text-emerald-700" : "text-red-700"}`}>{chg == null ? "belum ada pembanding" : `${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg).toFixed(1)}% dari bulan lalu`}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Laba operasional</p><p className={`mt-1 text-2xl font-extrabold ${d.cur.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{rp(d.cur.profit)}</p><p className="text-xs text-slate-500">pendapatan − refund − beban</p></div>
        <div className="card"><p className="text-sm text-slate-500">Tagihan belum dibayar</p><p className="mt-1 text-2xl font-extrabold text-amber-600">{rp(d.receivables.total)}</p><p className="text-xs text-slate-500">{d.receivables.buckets.reduce((t: number, b: any) => t + b.n, 0)} pesanan</p></div>
        <div className="card"><p className="text-sm text-slate-500">Proyeksi pendapatan bulan depan</p><p className="mt-1 text-2xl font-extrabold">{rp(d.projection.trend)}</p><p className="text-xs text-slate-500">rata-rata 3 bulan: {rp(d.projection.avg3)}</p></div>
      </div>
      <div className="card h-80"><p className="mb-1 font-bold">Tren 12 bulan</p><p className="mb-2 text-xs text-slate-500">Sewa bulanan diakui bertahap per bulan masa sewa.</p>
        <ResponsiveContainer width="100%" height="82%"><ComposedChart data={d.monthly}><CartesianGrid vertical={false} stroke="#e5e7eb" /><XAxis dataKey="month" tickLine={false} /><YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}jt`} /><Tooltip formatter={(v) => rp(v)} /><Legend />
          <Bar dataKey="recognized" name="Pendapatan" fill="#00BF63" radius={[4, 4, 0, 0]} /><Bar dataKey="opex" name="Beban operasional" fill="#DC2626" radius={[4, 4, 0, 0]} /><Line dataKey="profit" name="Laba operasional" stroke="#14342F" strokeWidth={2.5} /></ComposedChart></ResponsiveContainer></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><p className="mb-3 font-bold">Pendapatan per kategori aset</p>{d.categories.length === 0 ? <Empty text="Belum ada data." /> : <div className="space-y-3">{d.categories.map((c: any) => <div key={c.name}><div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><b>{rp(c.value)}</b></div><div className="h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-[#00BF63]" style={{ width: `${Math.max(2, (c.value / maxC) * 100)}%` }} /></div></div>)}</div>}</div>
        <div className="card"><p className="mb-3 font-bold">Penyewa teratas</p>{d.tenants.length === 0 ? <Empty text="Belum ada pembayaran." /> : <ol className="space-y-2 text-sm">{d.tenants.map((t: any, i: number) => <li key={t.name} className="flex justify-between gap-2"><span>{i + 1}. {t.name} <span className="text-xs text-slate-500">({t.n} pesanan)</span></span><b>{rp(t.total)}</b></li>)}</ol>}</div>
      </div>
      <div className="card overflow-x-auto p-0"><p className="p-4 pb-2 font-bold">Aset paling menguntungkan (ROI)</p>
        <table className="w-full text-sm"><thead className="border-y bg-paper"><tr>{["Aset", "Harga beli", "Pendapatan", "Perawatan", "Laba bersih", "ROI", "Balik modal"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{d.topAssets.map((a: any) => <tr key={a.id}><td className="td font-semibold">{a.name}<span className="block text-xs font-normal text-slate-500">{a.code}</span></td><td className="td">{rp(a.cost)}</td><td className="td">{rp(a.revenue)}</td><td className="td">{rp(a.maintenance)}</td><td className="td font-bold text-emerald-700">{rp(a.net)}</td><td className="td">{a.roi == null ? "-" : `${(a.roi * 100).toFixed(1)}%`}</td><td className="td">{a.paybackMonths === 0 ? "Sudah" : a.paybackMonths ? `± ${a.paybackMonths} bln` : "-"}</td></tr>)}</tbody></table>
        {d.topAssets.length === 0 && <Empty text="Belum ada pendapatan per aset." />}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><p className="mb-3 font-bold">Aset dengan kinerja terendah</p><ul className="divide-y text-sm">{d.weakAssets.map((a: any) => <li key={a.id} className="flex justify-between gap-2 py-2"><span>{a.name} <span className="text-xs text-slate-500">{a.code}</span></span><b className={a.net < 0 ? "text-red-700" : ""}>{rp(a.net)}</b></li>)}</ul></div>
        <div className="card"><p className="mb-3 font-bold">Umur tagihan belum dibayar</p><div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">{d.receivables.buckets.map((b: any) => <div key={b.label} className="rounded-lg bg-paper p-2"><p className="text-slate-500">{b.label}</p><p className="font-bold">{b.n}</p><p>{rp(b.total)}</p></div>)}</div>
          <ul className="divide-y text-sm">{d.receivables.rows.slice(0, 6).map((r: any) => <li key={r.id} className="flex justify-between gap-2 py-1.5"><span>{r.user} • {r.asset} <span className="text-xs text-slate-500">({r.age} hr)</span></span><b>{rp(r.total)}</b></li>)}</ul></div>
      </div>
    </div>
  );
}
