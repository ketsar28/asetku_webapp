"use client";
import { useEffect, useState } from "react";
import { api, rp, tglWaktu } from "../ui";
/** Pengeluaran besar yang dicatat peran Keuangan menunggu persetujuan admin. */
export default function Pending() {
  const [rows, setRows] = useState<any[]>([]); const [admin, setAdmin] = useState(false); const [err, setErr] = useState("");
  const load = () => api("/api/finance/pending").then(setRows).catch(() => {});
  useEffect(() => { load(); api("/api/me").then((m) => setAdmin(m.role === "admin")); }, []);
  const act = (id: number, approve: boolean) => { const note = approve ? "" : prompt("Alasan menolak:") ?? ""; if (!approve && !note.trim()) return; api("/api/finance", "PATCH", { id, approve, note }).then(load).catch((x) => setErr(x.message)); };
  if (!rows.length) return null;
  return (
    <div className="card border-amber-300 bg-amber-50/60"><p className="mb-2 font-bold text-amber-800">Pengeluaran menunggu persetujuan admin ({rows.length})</p>
      {err && <p className="mb-2 text-sm text-red-700">{err}</p>}
      <ul className="divide-y text-sm">{rows.map((t) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><div><b>{rp(t.amount)}</b> • {t.category}<span className="block text-xs text-slate-600">{t.description} • {t.createdByName} • {tglWaktu(t.createdAt)}{t.attachmentUrl && <> • <a className="underline" href={t.attachmentUrl} target="_blank" rel="noreferrer">lampiran</a></>}</span></div>
        {admin ? <div className="space-x-1"><button className="btn" onClick={() => act(t.id, true)}>Setujui</button><button className="btn-ghost btn-danger" onClick={() => act(t.id, false)}>Tolak</button></div> : <span className="text-xs text-amber-800">Menunggu admin</span>}</li>)}</ul></div>
  );
}
