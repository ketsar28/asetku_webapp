"use client";
import { useEffect, useState } from "react";
import { api, Empty, rp } from "../../ui";
import FinanceTabs from "../Tabs";
export default function Budget() {
  const [period, setPeriod] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7)); const [rows, setRows] = useState<any[]>([]); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [nc, setNc] = useState("");
  const load = () => api(`/api/finance/budget?period=${period}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [period]);
  const set = (c: string, v: string) => setRows(rows.map((r) => (r.category === c ? { ...r, budget: v } : r)));
  const save = () => api("/api/finance/budget", "POST", { period, items: rows.map((r) => ({ category: r.category, amount: r.budget })) }).then(() => { setMsg("Anggaran disimpan."); setErr(""); load(); }).catch((x) => setErr(x.message));
  const tb = rows.reduce((t, r) => t + Number(r.budget || 0), 0), ta = rows.reduce((t, r) => t + r.actual, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Anggaran vs Realisasi</h1><input type="month" className="inp w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} /><button className="btn" onClick={save}>Simpan anggaran</button></div>
      <FinanceTabs />
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-3">{[["Total anggaran", rp(tb)], ["Realisasi", rp(ta)], ["Sisa anggaran", rp(tb - ta)]].map(([l, v]) => <div key={l} className="card"><p className="text-sm text-slate-500">{l}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></div>)}</div>
      <div className="card">{rows.length === 0 ? <Empty text="Belum ada pengeluaran atau anggaran pada bulan ini. Tambahkan kategori di bawah." /> : <div className="space-y-4">{rows.map((r) => { const pct = Number(r.budget) ? (r.actual / Number(r.budget)) * 100 : r.actual ? 999 : 0; return (
        <div key={r.category}><div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm"><b>{r.category}</b><span className="flex items-center gap-2">Realisasi {rp(r.actual)} dari <input type="number" min="0" className="inp w-36 py-1" value={r.budget || ""} placeholder="anggaran" onChange={(e) => set(r.category, e.target.value)} /></span></div>
          <div className="h-2.5 rounded-full bg-paper"><div className={`h-2.5 rounded-full ${pct > 100 ? "bg-red-600" : pct >= 80 ? "bg-amber-500" : "bg-[#00BF63]"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
          {Number(r.budget) > 0 && pct >= 80 && <p className={`mt-1 text-xs font-semibold ${pct > 100 ? "text-red-700" : "text-amber-700"}`}>{pct > 100 ? `Melebihi anggaran ${rp(r.actual - Number(r.budget))}` : `Sudah ${pct.toFixed(0)}% dari anggaran`}</p>}</div>); })}</div>}
        <div className="mt-4 flex gap-2 border-t pt-3"><input className="inp" placeholder="Tambah kategori anggaran (mis. Operasional)" value={nc} onChange={(e) => setNc(e.target.value)} /><button className="btn-ghost" onClick={() => { if (nc.trim() && !rows.some((r) => r.category === nc.trim())) setRows([...rows, { category: nc.trim(), budget: "", actual: 0 }]); setNc(""); }}>Tambah</button></div></div>
    </div>
  );
}
