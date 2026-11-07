"use client";
import { useEffect, useState } from "react";
import { api, Empty, Field, Modal, rp, tglWaktu } from "../ui";
export default function Withdrawals() {
  const [rows, setRows] = useState<any[]>([]); const [ed, setEd] = useState<{ t: any; approve: boolean } | null>(null); const [err, setErr] = useState("");
  const load = () => api("/api/wallet/withdrawals").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { await api("/api/wallet/withdrawals", "POST", { id: ed!.t.id, approve: ed!.approve, ...Object.fromEntries(new FormData(e.currentTarget)) }); setEd(null); setErr(""); load(); } catch (x: any) { setErr(x.message); }
  }
  const st: Record<string, string> = { pending: "bg-amber-50 text-amber-800", done: "bg-emerald-50 text-emerald-800", rejected: "bg-red-50 text-red-800" };
  const lb: Record<string, string> = { pending: "Menunggu transfer", done: "Sudah ditransfer", rejected: "Ditolak" };
  const pend = rows.filter((r) => r.status === "pending");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Penarikan Saldo Dompet</h1>
      <div className="grid gap-3 sm:grid-cols-2"><div className="card"><p className="text-sm text-slate-500">Menunggu transfer</p><p className="text-2xl font-extrabold text-amber-600">{pend.length} • {rp(pend.reduce((t, r) => t + r.amount, 0))}</p></div>
        <div className="card text-sm text-slate-600">Transfer manual ke rekening tujuan, lalu tekan <b>Sudah ditransfer</b> dan isi nomor referensi. Penarikan yang ditolak otomatis dikembalikan ke saldo penyewa.</div></div>
      {err && !ed && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0">{rows.length === 0 ? <Empty text="Belum ada permintaan penarikan." /> :
        <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Waktu", "Penyewa", "Jumlah", "Rekening tujuan", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((r) => <tr key={r.id}><td className="td whitespace-nowrap">{tglWaktu(r.createdAt)}</td><td className="td font-semibold">{r.user?.name}<span className="block text-xs font-normal text-slate-500">{r.user?.phone}</span></td><td className="td font-bold">{rp(r.amount)}</td>
            <td className="td">{r.bankName}<span className="block text-xs text-slate-500">{r.accountName} • {r.accountNo}</span></td>
            <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st[r.status]}`}>{lb[r.status]}</span>{r.note && <span className="block text-xs text-slate-500">{r.note}</span>}</td>
            <td className="td space-x-1 whitespace-nowrap">{r.status === "pending" && <><button className="btn" onClick={() => { setEd({ t: r, approve: true }); setErr(""); }}>Sudah ditransfer</button><button className="btn-ghost btn-danger" onClick={() => { setEd({ t: r, approve: false }); setErr(""); }}>Tolak</button></>}</td></tr>)}</tbody></table>}</div>
      {ed && <Modal title={ed.approve ? "Konfirmasi transfer" : "Tolak penarikan"} onClose={() => setEd(null)}><form onSubmit={send} className="space-y-3">
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <p className="rounded-lg bg-paper p-3 text-sm"><b>{rp(ed.t.amount)}</b> ke {ed.t.bankName} {ed.t.accountNo} a.n. {ed.t.accountName}</p>
        <Field l={ed.approve ? "No. referensi transfer (opsional)" : "Alasan penolakan"}><input name="note" className="inp" required={!ed.approve} /></Field><button className="btn w-full">{ed.approve ? "Tandai sudah ditransfer" : "Tolak & kembalikan saldo"}</button></form></Modal>}
    </div>
  );
}
