"use client";
import { useEffect, useState } from "react";
import { api, rp, tglWaktu } from "../../ui";
import FinanceTabs from "../Tabs";
export default function Close() {
  const [rows, setRows] = useState<any[]>([]); const [admin, setAdmin] = useState(false); const [err, setErr] = useState("");
  const load = () => api("/api/finance/close").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); api("/api/me").then((m) => setAdmin(m.role === "admin")); }, []);
  const go = (period: string, action: "close" | "open") => {
    const reason = action === "open" ? prompt(`Alasan membuka kembali ${period} (wajib, tercatat di audit):`) : ""; if (action === "open" && !reason?.trim()) return;
    if (action === "close" && !confirm(`Tutup buku ${period}? Transaksi pada bulan ini tidak bisa diubah, dibatalkan, atau ditambah lagi.`)) return;
    api("/api/finance/close", "POST", { period, action, reason }).then(load).catch((x) => setErr(x.message));
  };
  const cur = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Tutup Buku Bulanan</h1><FinanceTabs />
      <p className="text-sm text-slate-600">Setelah ditutup, transaksi pada bulan itu terkunci: tidak bisa ditambah, diubah, atau dibatalkan. Hanya admin yang dapat membuka kembali, dengan alasan yang tercatat di audit.</p>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0"><table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Periode", "Pendapatan", "Refund", "Beban operasional", "Laba operasional", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.map((r) => <tr key={r.month}><td className="td font-semibold">{r.month}</td><td className="td">{rp(r.recognized)}</td><td className="td">{rp(r.refund)}</td><td className="td">{rp(r.opex)}</td><td className={`td font-bold ${r.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{rp(r.profit)}</td>
          <td className="td">{r.closed ? <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">Ditutup{r.closedBy ? ` • ${r.closedBy}` : ""}</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Terbuka</span>}{r.closedAt && <span className="block text-xs text-slate-500">{tglWaktu(r.closedAt)}</span>}</td>
          <td className="td">{r.closed ? admin && <button className="btn-ghost" onClick={() => go(r.month, "open")}>Buka kembali</button> : r.month < cur && <button className="btn" onClick={() => go(r.month, "close")}>Tutup buku</button>}</td></tr>)}</tbody></table></div>
    </div>
  );
}
