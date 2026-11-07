"use client";
import { useEffect, useState } from "react";
import { api, Empty, rp, tglWaktu } from "../../ui";
import FinanceTabs from "../Tabs";
const PM: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", wallet: "Dompet Penyewa" };
export default function Reconcile() {
  const [d, setD] = useState<any>(null); const [act, setAct] = useState<Record<string, string>>({}); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const load = () => api("/api/finance/reconcile").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const key = (b: any) => `${b.channel}|${b.bank}`;
  const save = (b: any) => api("/api/finance/reconcile", "POST", { channel: b.channel, bank: b.bank, actual: act[key(b)] }).then((r) => { setMsg(`${PM[b.channel]} ${b.bank}: selisih ${rp(r.diff)}`); setErr(""); load(); }).catch((x) => setErr(x.message));
  const gw = () => api("/api/payments/reconcile", "POST").then((r) => setMsg(r.skipped ? "Mode Midtrans tidak aktif, tidak ada yang dicocokkan." : `Midtrans: ${r.checked} dicek, ${r.settled} dilunasi otomatis, ${r.cleared} dibersihkan.`)).catch((x) => setErr(x.message));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Rekonsiliasi Saldo</h1><button className="btn-ghost" onClick={gw}>Cocokkan status Midtrans</button></div>
      <FinanceTabs />
      <p className="text-sm text-slate-600">Bandingkan saldo menurut buku (dihitung dari transaksi) dengan saldo aktual di mutasi bank, e-wallet, atau kas fisik. Selisih ditandai dan masuk ke peringatan.</p>
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0">{!d ? <p className="p-4 text-slate-500">Memuat…</p> : d.balances.length === 0 ? <Empty text="Belum ada transaksi." /> :
        <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Channel", "Bank / penyedia", "Saldo buku", "Saldo aktual", "Selisih", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{d.balances.map((b: any) => { const v = act[key(b)], diff = v === undefined || v === "" ? null : Number(v) - b.book; return (
            <tr key={key(b)}><td className="td font-semibold">{PM[b.channel] ?? b.channel}</td><td className="td">{b.bank || "-"}</td><td className="td">{rp(b.book)}</td>
              <td className="td"><input type="number" className="inp w-40 py-1" value={v ?? ""} onChange={(e) => setAct({ ...act, [key(b)]: e.target.value })} placeholder="isi saldo aktual" /></td>
              <td className={`td font-bold ${diff == null ? "" : Math.abs(diff) < 1 ? "text-emerald-700" : "text-red-700"}`}>{diff == null ? "-" : Math.abs(diff) < 1 ? "Sesuai" : rp(diff)}</td><td className="td"><button className="btn-ghost" disabled={diff == null} onClick={() => save(b)}>Simpan</button></td></tr>); })}</tbody></table>}</div>
      <div className="card"><p className="mb-3 font-bold">Riwayat rekonsiliasi</p>{!d || d.history.length === 0 ? <Empty text="Belum ada rekonsiliasi." /> : <ul className="divide-y text-sm">{d.history.map((h: any) => <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{PM[h.channel] ?? h.channel} {h.bank} <span className="text-xs text-slate-500">• {tglWaktu(h.createdAt)} • {h.createdByName}</span></span><span>Buku {rp(h.bookBalance)} / Aktual {rp(h.actualBalance)} → <b className={Math.abs(h.diff) < 1 ? "text-emerald-700" : "text-red-700"}>{Math.abs(h.diff) < 1 ? "Sesuai" : rp(h.diff)}</b></span></li>)}</ul>}</div>
    </div>
  );
}
