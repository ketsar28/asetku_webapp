"use client";
import { useEffect, useRef, useState } from "react";
import { api, Empty, Modal, tglWaktu } from "../ui";
import QrScanner from "../QrScanner";
export default function StockOpname() {
  const [list, setList] = useState<any[]>([]); const [cur, setCur] = useState<any>(null); const [tab, setTab] = useState("pending"); const [q, setQ] = useState(""); const [scan, setScan] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const ref = useRef<any>(null); ref.current = cur;
  const loadList = () => api("/api/stock-opname").then(setList).catch((e) => setErr(e.message));
  const open = (id: number) => api(`/api/stock-opname/${id}`).then(setCur).catch((e) => setErr(e.message));
  useEffect(() => { loadList(); }, []);
  const create = () => { const name = prompt("Nama sesi opname (mis. Opname Gudang A Nov 2026):"); if (name?.trim()) api("/api/stock-opname", "POST", { name }).then((o) => { loadList(); open(o.id); }).catch((x) => setErr(x.message)); };
  const onCode = (code: string) => {
    if (!ref.current) return;
    api(`/api/stock-opname/${ref.current.id}`, "POST", { code }).then((r) => { setMsg(`${r.already ? "Sudah tercatat" : "Ditemukan"}: ${r.code} ${r.name}${r.location ? ` (${r.location})` : ""}`); setErr(""); open(ref.current.id); }).catch((x) => { setMsg(""); setErr(x.message); });
  };
  const close = () => { if (confirm("Tutup sesi? Aset yang belum ditemukan dicatat HILANG.")) api(`/api/stock-opname/${cur.id}`, "PATCH").then((r) => { setMsg(`Sesi ditutup. ${r.missing} aset belum ditemukan.`); setScan(false); open(cur.id); loadList(); }).catch((x) => setErr(x.message)); };
  const items: any[] = cur?.items ?? [], n = (s: string) => items.filter((i) => i.status === s).length;
  const shown = items.filter((i) => i.status === tab && (!q || `${i.asset.assetCode} ${i.asset.name}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 100);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Stock Opname</h1>{cur && <button className="btn-ghost" onClick={() => { setCur(null); setMsg(""); }}>Daftar sesi</button>}{!cur && <button className="btn" onClick={create}>Mulai opname baru</button>}</div>
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!cur ? (list.length === 0 ? <Empty text="Belum ada sesi opname. Mulai untuk memeriksa keberadaan fisik semua aset dengan scan QR." /> :
        <div className="grid gap-3 sm:grid-cols-2">{list.map((o) => <button key={o.id} onClick={() => open(o.id)} className="card text-left hover:border-moss"><p className="font-bold">{o.name}</p><p className="text-xs text-slate-500">{tglWaktu(o.createdAt)} • {o.createdByName}</p>
          <div className="mt-2 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-[#00BF63]" style={{ width: `${o.total ? (o.found / o.total) * 100 : 0}%` }} /></div>
          <p className="mt-1 text-xs">{o.found}/{o.total} ditemukan{o.missing ? ` • ${o.missing} hilang` : ""} • <b>{o.status === "open" ? "Berjalan" : "Selesai"}</b></p></button>)}</div>) : <>
        <div className="card"><p className="font-bold">{cur.name} <span className="text-sm font-normal text-slate-500">• {cur.status === "open" ? "Berjalan" : `Selesai ${tglWaktu(cur.closedAt)}`}</span></p>
          <div className="mt-2 h-2.5 rounded-full bg-paper"><div className="h-2.5 rounded-full bg-[#00BF63]" style={{ width: `${items.length ? (n("found") / items.length) * 100 : 0}%` }} /></div>
          <p className="mt-1 text-sm">{n("found")} ditemukan • {n("pending")} belum dicek • {n("missing")} hilang • total {items.length}</p>
          {cur.status === "open" && <div className="mt-3 flex flex-wrap gap-2"><button className="btn" onClick={() => setScan(true)}>Scan QR aset</button><button className="btn-ghost btn-danger" onClick={close}>Tutup sesi</button></div>}
          <button className="btn-ghost mt-3 print:hidden" onClick={() => print()}>Cetak / PDF</button></div>
        <div className="flex flex-wrap items-center gap-2">{[["pending", "Belum dicek"], ["found", "Ditemukan"], ["missing", "Hilang"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-3 py-1 text-sm font-medium ${tab === k ? "border-moss bg-moss text-white" : "border-slate-300 bg-white"}`}>{l} ({n(k)})</button>)}
          <input className="inp max-w-xs" placeholder="Cari kode atau nama…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="card overflow-x-auto p-0">{shown.length === 0 ? <Empty text="Tidak ada aset pada daftar ini." /> : <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Kode", "Nama", "Kategori", "Lokasi", "Dicek"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{shown.map((i) => <tr key={i.id}><td className="td font-mono text-xs">{i.asset.assetCode}</td><td className="td font-semibold">{i.asset.name}</td><td className="td">{i.asset.category.name}</td><td className="td">{i.asset.location ?? "-"}</td><td className="td text-xs text-slate-500">{i.checkedAt ? `${tglWaktu(i.checkedAt)} • ${i.checkedBy}` : "-"}</td></tr>)}</tbody></table>}</div></>}
      {scan && <Modal title="Scan QR aset" onClose={() => setScan(false)}><QrScanner onCode={onCode} />{msg && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}{err && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}</Modal>}
    </div>
  );
}
