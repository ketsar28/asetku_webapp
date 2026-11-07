"use client";
import { useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PayFields, rp, tgl } from "../ui";
export default function Maintenance() {
  const [rows, setRows] = useState<any[]>([]); const [assets, setAssets] = useState<any[]>([]); const [open, setOpen] = useState(false); const [err, setErr] = useState(""); const [broken, setBroken] = useState<any[]>([]); const [fix, setFix] = useState<any[] | null>(null); const [fixDone, setFixDone] = useState(false);
  const load = () => api("/api/maintenance").then(setRows).catch((e) => setErr(e.message));
  const loadBroken = () => api("/api/maintenance/repair").then(setBroken).catch((e) => setErr(e.message));
  useEffect(() => { load(); loadBroken(); api("/api/assets").then(setAssets); }, []);
  const run = (p: Promise<unknown>) => p.then(() => { setErr(""); setOpen(false); load(); loadBroken(); api("/api/assets").then(setAssets); }).catch((x) => setErr(x.message));
  const add = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); run(api("/api/maintenance", "POST", Object.fromEntries(new FormData(e.currentTarget)))); };
  const done = (id: number) => { const cost = prompt("Biaya perawatan (Rp, boleh kosong)?", "0"); if (cost !== null) run(api("/api/maintenance", "PATCH", { id, status: "completed", cost })); };
  const repair = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f: any = Object.fromEntries(new FormData(e.currentTarget)); run(api("/api/maintenance/repair", "POST", { ...f, done: fixDone, assetIds: fix!.map((a) => a.id) }).then(() => setFix(null))); };
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Perawatan Aset</h1><button className="btn" onClick={() => setOpen(true)}>Jadwalkan perawatan</button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Perlu perbaikan", "broken"], ["Dijadwalkan", "scheduled"], ["Dikerjakan", "in_progress"], ["Selesai", "completed"]].map(([l, s]) => <div key={s} className="card"><p className="text-sm text-slate-500">{l}</p><p className={`text-2xl font-extrabold ${s === "broken" && broken.length ? "text-red-700" : ""}`}>{s === "broken" ? broken.length : count(s)}</p></div>)}</div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mr-auto"><h2 className="text-lg font-bold text-ink">Aset perlu perbaikan {broken.length > 0 && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">{broken.length}</span>}</h2>
            <p className="text-sm text-slate-500">Terdeteksi otomatis dari kondisi aset: Rusak atau Perlu perawatan (dari pengembalian atau Kelola Aset) yang belum punya perawatan berjalan.</p></div>
          {broken.length > 1 && <button className="btn" onClick={() => { setFixDone(false); setFix(broken.slice(0, 50)); }}>Perbaiki semua ({Math.min(broken.length, 50)})</button>}
        </div>
        {broken.length === 0 ? <Empty text="Semua aset dalam kondisi baik atau sedang dalam perawatan." /> :
        <div className="max-h-96 overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 border-b border-slate-200 bg-white"><tr>{["Kode", "Aset", "Kategori", "Lokasi", "Kondisi", "Sejak", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{broken.map((a) => <tr key={a.id} className="transition hover:bg-slate-50/70"><td className="td whitespace-nowrap font-mono text-xs text-slate-500">{a.assetCode}</td><td className="td font-semibold text-ink">{a.name}</td><td className="td">{a.category.name}</td><td className="td">{a.location ?? "-"}</td><td className="td whitespace-nowrap"><Badge v={a.condition} /></td><td className="td whitespace-nowrap text-slate-500">{tgl(a.updatedAt)}</td>
            <td className="td text-right"><button className="btn !px-3 !py-1.5 !text-[13px]" onClick={() => { setFixDone(false); setFix([a]); }}>Perbaiki</button></td></tr>)}</tbody></table></div>}
      </div>
      <h2 className="pt-2 text-lg font-bold text-ink">Riwayat & jadwal perawatan</h2>
      <div className="card overflow-x-auto p-0">{rows.length === 0 ? <Empty text="Belum ada perawatan. Jadwalkan saat aset perlu diservis." /> :
        <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Aset", "Tanggal", "Pekerjaan", "Vendor", "Biaya", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((r) => <tr key={r.id}><td className="td font-semibold">{r.asset.name}</td><td className="td whitespace-nowrap">{tgl(r.maintenanceDate)}</td><td className="td">{r.description}</td><td className="td">{r.vendor ?? "-"}</td><td className="td">{r.cost ? rp(r.cost) : "-"}</td><td className="td"><Badge v={r.status} /></td>
            <td className="td space-x-1 whitespace-nowrap">{r.status === "scheduled" && <button className="btn-ghost" onClick={() => run(api("/api/maintenance", "PATCH", { id: r.id, status: "in_progress" }))}>Mulai</button>}{r.status !== "completed" && <button className="btn" onClick={() => done(r.id)}>Selesai</button>}</td></tr>)}</tbody></table>}</div>
      {fix && <Modal title="Konfirmasi perbaikan" onClose={() => setFix(null)}>
        <form onSubmit={repair} className="space-y-3">
          <p className="text-sm">Perbaiki <b>{fix.length} aset</b> berikut?</p>
          <ul className="max-h-40 overflow-auto rounded-lg border bg-paper p-3 text-sm">{fix.map((a) => <li key={a.id}>• {a.name} <span className="text-xs text-slate-500">({a.assetCode})</span></li>)}</ul>
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
          <Field l="Catatan perbaikan"><textarea name="description" rows={2} className="inp" defaultValue="Perbaikan kerusakan" required /></Field>
          <div className="grid grid-cols-2 gap-3"><Field l="Vendor / teknisi (opsional)"><input name="vendor" className="inp" /></Field><Field l="Biaya per aset (Rp, opsional)"><input name="cost" type="number" min="0" className="inp" /></Field></div>
          <PayFields label="Dibayar dengan" />
          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-0.5" checked={fixDone} onChange={(e) => setFixDone(e.target.checked)} /><span><b>Sudah selesai diperbaiki</b><span className="block text-xs text-slate-500">{fixDone ? "Aset langsung ditandai kondisi Baik." : "Aset masuk perawatan (Dikerjakan). Kondisi jadi Baik setelah Anda menekan Selesai."}</span></span></label>
          <button className="btn w-full">Ya, perbaiki {fix.length} aset</button>
        </form></Modal>}
      {open && <Modal title="Jadwalkan perawatan" onClose={() => setOpen(false)}>
        <form onSubmit={add} className="space-y-3">
          <Field l="Aset"><select name="assetId" className="inp" required>{assets.filter((a) => a.status !== "borrowed").map((a) => <option key={a.id} value={a.id}>{a.assetCode} – {a.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field l="Tanggal"><input name="maintenanceDate" type="date" className="inp" required /></Field><Field l="Perkiraan biaya (Rp)"><input name="cost" type="number" min="0" className="inp" /></Field></div>
          <PayFields label="Dibayar dengan" />
          <Field l="Vendor / teknisi"><input name="vendor" className="inp" /></Field>
          <Field l="Pekerjaan"><textarea name="description" rows={3} className="inp" required /></Field>
          <button className="btn w-full">Simpan jadwal</button>
        </form></Modal>}
    </div>
  );
}
