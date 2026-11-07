"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Badge, Empty, tgl } from "../ui";
const COL: Record<string, string> = { good: "#00BF63", damaged: "#DC2626", maintenance: "#D9822B" };
const NAME: Record<string, string> = { good: "Baik", damaged: "Rusak", maintenance: "Perawatan" };
export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [me, setMe] = useState<any>({}); const [err, setErr] = useState("");
  useEffect(() => { api("/api/stats").then(setD).catch((e) => setErr(e.message)); api("/api/me").then(setMe); }, []);
  if (err) return <p className="text-red-700">{err}</p>;
  if (!d) return <p className="text-slate-500">Memuat…</p>;
  const util = d.total ? Math.round((d.borrowed / d.total) * 100) : 0;
  const max = Math.max(1, ...d.categories.map((c: any) => c.value));
  const k = [["Total aset", d.total, "bg-ink text-white", "text-white/70"], ["Sedang dipinjam", d.borrowed, "bg-white", "text-slate-500"], ["Menunggu persetujuan", d.pending, "bg-white", "text-slate-500"], ["Aset rusak", d.damaged, "bg-white", "text-slate-500"], ["Dalam perawatan", d.inMaint, "bg-white", "text-slate-500"]];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Halo, {me.name?.split(" ")[0]}</h1><p className="text-sm text-slate-500">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div>
        <div className="flex gap-2"><Link href="/assets" className="btn-ghost">Tambah aset</Link><Link href="/loans" className="btn">Proses pengajuan {d.pending > 0 && `(${d.pending})`}</Link></div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {k.map(([l, v, bg, sub]) => <div key={l as string} className={`rounded-xl border border-slate-200 p-4 ${bg}`}><p className={`text-sm ${sub}`}>{l}</p><p className="mt-1 text-3xl font-extrabold">{v}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card h-80 lg:col-span-2"><p className="mb-3 font-bold">Pengajuan per bulan</p>
          {d.monthly.length === 0 ? <Empty text="Grafik akan muncul setelah ada pengajuan pertama." /> :
          <ResponsiveContainer width="100%" height="88%"><AreaChart data={d.monthly}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00BF63" stopOpacity={0.4} /><stop offset="100%" stopColor="#00BF63" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#e5e7eb" /><XAxis dataKey="month" tickLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="total" name="Pengajuan" stroke="#078A4B" strokeWidth={2.5} fill="url(#g)" /></AreaChart></ResponsiveContainer>}</div>
        <div className="card h-80"><p className="font-bold">Kondisi aset</p>
          <ResponsiveContainer width="100%" height="70%"><PieChart><Pie data={d.condition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>{d.condition.map((c: any) => <Cell key={c.name} fill={COL[c.name]} />)}</Pie><Tooltip formatter={(v, n) => [v, NAME[n as string]]} /></PieChart></ResponsiveContainer>
          <div className="flex justify-center gap-3 text-xs">{d.condition.map((c: any) => <span key={c.name} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COL[c.name] }} />{NAME[c.name]} ({c.value})</span>)}</div>
          <p className="mt-2 text-center text-xs text-slate-500">Utilisasi aset: <b>{util}%</b> sedang dipinjam</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><p className="mb-3 font-bold">Menunggu persetujuan</p>
          {d.pendingList.length === 0 ? <Empty text="Tidak ada pengajuan yang menunggu. Semua sudah diproses." /> :
          <ul className="divide-y">{d.pendingList.map((r: any) => <li key={r.id} className="flex items-center justify-between py-2.5 text-sm"><div><p className="font-semibold">{r.asset.name}</p><p className="text-xs text-slate-500">{r.user.name} • mulai {tgl(r.startDate)}</p></div><Link href="/loans" className="btn-ghost">Tinjau</Link></li>)}</ul>}</div>
        <div className="card"><p className="mb-3 font-bold">Terlambat dikembalikan</p>
          {d.overdue.length === 0 ? <Empty text="Tidak ada keterlambatan. Bagus!" /> :
          <ul className="divide-y">{d.overdue.map((r: any) => <li key={r.id} className="flex items-center justify-between py-2.5 text-sm"><div><p className="font-semibold">{r.asset.name}</p><p className="text-xs text-slate-500">{r.user.name} • seharusnya {tgl(r.expectedReturnDate)}</p></div><Badge v="overdue" /></li>)}</ul>}</div>
        <div className="card"><p className="mb-3 font-bold">Aset per kategori</p>
          <div className="space-y-3">{d.categories.map((c: any) => <div key={c.name}><div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><b>{c.value}</b></div><div className="h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-[#00BF63]" style={{ width: `${(c.value / max) * 100}%` }} /></div></div>)}</div></div>
        <div className="card"><p className="mb-3 font-bold">Aktivitas terbaru</p>
          {d.logs.length === 0 ? <Empty text="Belum ada aktivitas." /> :
          <ol className="space-y-3 border-l-2 border-moss/30 pl-4">{d.logs.map((l: any) => <li key={l.id}><p className="text-sm"><b>{l.asset.name}</b>: {l.description}</p><p className="text-xs text-slate-500">{new Date(l.timestamp).toLocaleString("id-ID")} oleh {l.user.name}</p></li>)}</ol>}</div>
      </div>
    </div>
  );
}
