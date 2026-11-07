"use client";
import { useEffect, useState } from "react";
import { api, Empty, rp, tglWaktu } from "../../ui";
import FinanceTabs from "../Tabs";
// Kode aksi teknis -> label yang mudah dipahami + warna
const AKSI: Record<string, [string, string]> = {
  create_transaction: ["Transaksi dicatat", "bg-emerald-50 text-emerald-800"],
  void_transaction: ["Transaksi dibatalkan", "bg-red-50 text-red-800"],
  approve_expense: ["Pengeluaran disetujui", "bg-emerald-50 text-emerald-800"],
  reject_expense: ["Pengeluaran ditolak", "bg-red-50 text-red-800"],
  close_period: ["Tutup buku", "bg-slate-100 text-slate-700"],
  reopen_period: ["Buka kembali periode", "bg-amber-50 text-amber-800"],
  tax_payment: ["Setoran PPN", "bg-sky-50 text-sky-800"],
  set_budget: ["Anggaran diperbarui", "bg-sky-50 text-sky-800"],
  reconcile: ["Rekonsiliasi kas / bank", "bg-sky-50 text-sky-800"],
  gateway_reconcile: ["Sinkron pembayaran online", "bg-sky-50 text-sky-800"],
};
const aksi = (a: string): [string, string] => AKSI[a] ?? [a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), "bg-slate-100 text-slate-700"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const bulan = (t: string) => t.replace(/\b(\d{4})-(0[1-9]|1[0-2])\b/g, (_, y, m) => `${BULAN[Number(m) - 1]} ${y}`);
/** Ubah detail teknis (mis. JSON) menjadi kalimat yang mudah dibaca. */
function Detail({ action, text }: { action: string; text: string }) {
  if (action === "gateway_reconcile") {
    try {
      const r = JSON.parse(text);
      if (r.skipped) return <span className="text-slate-600">Dilewati karena pembayaran online belum diaktifkan.</span>;
      return <span className="text-slate-600">{r.checked} pesanan dicek • {r.settled} lunas • {r.cleared} dibatalkan / kedaluwarsa</span>;
    } catch { /* tampilkan apa adanya */ }
  }
  if (action === "reconcile") return <span className="text-slate-600">{bulan(text).replace(/(buku|aktual|selisih) (-?\d+)/g, (_, k, n) => `${k} ${rp(n)}`)}</span>;
  const parts = bulan(text).split(" • "), head = parts[0], tone = action === "create_transaction" ? (head.startsWith("Masuk") ? "text-emerald-700" : head.startsWith("Keluar") ? "text-red-700" : "") : "";
  return <span><span className={`font-semibold text-ink ${tone}`}>{head}</span>{parts.length > 1 && <span className="text-slate-500"> • {parts.slice(1).join(" • ")}</span>}</span>;
}
const TH = "th !text-[11px] uppercase tracking-wide";
export default function Audit() {
  const [d, setD] = useState<any>(null); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { const t = setTimeout(() => api(`/api/finance/audit?q=${encodeURIComponent(q)}`).then(setD).catch((e) => setErr(e.message)), 250); return () => clearTimeout(t); }, [q]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Jejak Audit</h1><input className="inp max-w-xs" placeholder="Cari aksi, nama, atau detail…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <FinanceTabs />{err && <p role="alert" className="text-red-700">{err}</p>}
      <div className="card max-h-[70vh] overflow-auto p-0 shadow-sm"><div className="px-5 pb-3 pt-4"><p className="font-bold text-ink">Aktivitas keuangan</p><p className="text-sm text-slate-500">Catatan siapa melakukan apa dan kapan{d ? ` • ${d.logs.length} aktivitas terbaru` : ""}.</p></div>{!d || d.logs.length === 0 ? <Empty text="Belum ada catatan audit." /> :
        <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-y border-slate-200 bg-slate-50"><tr>{["Waktu", "Pengguna", "Aksi", "Detail"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{d.logs.map((l: any) => { const [lb, tone] = aksi(l.action), wk = tglWaktu(l.createdAt).match(/^(.*?),?\s(\d{2}:\d{2}:\d{2})$/), tg = wk ? wk[1] : tglWaktu(l.createdAt), jam = wk ? wk[2] : "";
            return <tr key={l.id} className="align-top transition hover:bg-slate-50/70"><td className="td !py-3 whitespace-nowrap"><span className="block font-medium text-ink">{tg}</span>{jam && <span className="block text-xs text-slate-400">{jam}</span>}</td>
              <td className="td !py-3 whitespace-nowrap"><span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-moss text-xs font-bold uppercase text-white">{String(l.userName).slice(0, 1)}</span><span className="font-medium text-slate-700">{l.userName}</span></span></td>
              <td className="td !py-3 whitespace-nowrap"><span title={l.action} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{lb}</span></td>
              <td className="td !py-3 min-w-[280px]"><Detail action={l.action} text={l.detail} /></td></tr>; })}</tbody></table>}</div>
      <div className="card overflow-x-auto p-0 shadow-sm"><div className="px-5 pb-3 pt-4"><p className="font-bold text-ink">Transaksi dibatalkan / ditolak</p></div>{!d || d.voided.length === 0 ? <Empty text="Tidak ada transaksi yang dibatalkan." /> :
        <table className="w-full text-sm"><thead className="border-y border-slate-200 bg-slate-50"><tr>{["Dibatalkan", "Kategori", "Nominal", "Keterangan", "Alasan"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{d.voided.map((t: any) => <tr key={t.id} className="align-top transition hover:bg-slate-50/70"><td className="td whitespace-nowrap">{tglWaktu(t.voidedAt)}</td><td className="td">{t.category}</td><td className="td whitespace-nowrap font-semibold tabular-nums">{rp(t.amount)}</td><td className="td">{t.description}</td><td className="td text-red-700">{t.voidReason}</td></tr>)}</tbody></table>}</div>
    </div>
  );
}
