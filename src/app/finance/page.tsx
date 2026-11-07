"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Empty, Field, Modal, PayFields, UploadField, rp, tgl, tglWaktu } from "../ui";
import FinanceTabs from "./Tabs";
import Pending from "./Pending";
const PM: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", wallet: "Dompet" };
const src: Record<string, string> = { manual: "Manual", fine: "Denda", purchase: "Pembelian", maintenance: "Perawatan", rental: "Sewa", refund: "Refund", damage: "Denda", payroll: "Gaji", rental_ins: "Asuransi", rental_vat: "PPN" };
export default function Finance() {
  const y = new Date().getFullYear();
  const [f, setF] = useState({ from: `${y}-01-01`, to: new Date().toISOString().slice(0, 10), type: "", method: "" });
  const [d, setD] = useState<any>(null); const [open, setOpen] = useState(false); const [err, setErr] = useState("");
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const load = () => api(`/api/finance?${qs}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [qs]);
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { await api("/api/finance", "POST", Object.fromEntries(new FormData(e.currentTarget))); setOpen(false); setErr(""); load(); } catch (x: any) { setErr(x.message); }
  }
  const del = (id: number) => { const reason = prompt("Alasan membatalkan transaksi (wajib). Transaksi tidak dihapus, hanya ditandai batal dan tercatat di Jejak Audit:"); if (reason?.trim()) api("/api/finance", "DELETE", { id, reason }).then(load).catch((x) => setErr(x.message)); };
  const s = d?.summary;
  return (
    <div className="space-y-4">
      <FinanceTabs /><Pending />
      <div className="hidden print:block"><h1 className="text-xl font-extrabold">Laporan Keuangan AsetKu Corporate</h1><p className="text-sm">Periode {tgl(f.from)} – {tgl(f.to)} • dicetak {tglWaktu(new Date().toISOString())}</p></div>
      <div className="flex flex-wrap items-center gap-3 print:hidden"><h1 className="mr-auto text-2xl font-extrabold">Laporan Keuangan</h1>
        <button className="btn-ghost" onClick={() => api("/api/finance/sync", "POST").then((r) => { alert(`${r.added} transaksi ditambahkan dari data yang sudah ada.`); load(); }).catch((x) => setErr(x.message))}>Sinkronkan data lama</button><a className="btn-ghost" href={`/api/finance/export?${qs}`}>Export Excel</a><button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button><button className="btn" onClick={() => setOpen(true)}>Catat transaksi</button></div>
      <div className="card flex flex-wrap items-end gap-3 print:hidden">
        <Field l="Dari"><input type="date" className="inp" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field l="Sampai"><input type="date" className="inp" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Field l="Jenis"><select className="inp" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">Semua</option><option value="income">Uang masuk</option><option value="expense">Uang keluar</option></select></Field>
        <Field l="Pembayaran"><select className="inp" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="">Semua</option><option value="cash">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="wallet">Saldo Dompet</option></select></Field>
      </div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!d ? <p className="text-slate-500">Memuat…</p> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card"><p className="text-sm text-slate-500">Uang masuk</p><p className="mt-1 text-2xl font-extrabold text-emerald-700">{rp(s.income)}</p></div>
          <div className="card"><p className="text-sm text-slate-500">Uang keluar</p><p className="mt-1 text-2xl font-extrabold text-red-700">{rp(s.expense)}</p></div>
          <div className={`rounded-xl border p-4 ${s.balance >= 0 ? "bg-ink text-white" : "bg-red-700 text-white"}`}><p className="text-sm text-white/70">Saldo periode</p><p className="mt-1 text-2xl font-extrabold">{rp(s.balance)}</p></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card h-72 lg:col-span-2"><p className="mb-3 font-bold">Arus kas per bulan</p>
            {d.monthly.length === 0 ? <Empty text="Belum ada transaksi pada periode ini." /> :
            <ResponsiveContainer width="100%" height="88%"><BarChart data={d.monthly}><CartesianGrid vertical={false} stroke="#e5e7eb" /><XAxis dataKey="month" tickLine={false} /><YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1e6}jt`} /><Tooltip formatter={(v) => rp(v)} /><Legend /><Bar dataKey="income" name="Masuk" fill="#00BF63" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="Keluar" fill="#DC2626" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</div>
          <div className="card"><p className="mb-3 font-bold">Per kategori</p>
            {d.categories.length === 0 ? <Empty text="Belum ada data." /> : <ul className="space-y-2.5 text-sm">{d.categories.map((c: any) => <li key={c.type + c.name} className="flex justify-between gap-2"><span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${c.type === "income" ? "bg-[#00BF63]" : "bg-red-600"}`} />{c.name}</span><b>{rp(c.total)}</b></li>)}</ul>}</div>
        </div>
        <div className="card"><p className="mb-3 font-bold">Rekap metode pembayaran</p>{d.payments.length === 0 ? <Empty text="Belum ada data." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Metode", "Bank / penyedia", "Uang masuk", "Uang keluar"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody className="divide-y">{d.payments.map((p: any) => <tr key={p.method + p.bank}><td className="td font-semibold">{PM[p.method]}</td><td className="td">{p.bank || "-"}</td><td className="td text-emerald-700">{p.income ? rp(p.income) : ""}</td><td className="td text-red-700">{p.expense ? rp(p.expense) : ""}</td></tr>)}</tbody></table></div>}</div>
        <div className="card overflow-x-auto p-0">
          {d.rows.length === 0 ? <Empty text="Belum ada transaksi. Klik “Catat transaksi” atau lakukan check-in / tambah aset." /> :
          <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Tanggal & Jam", "Kategori", "Keterangan", "Sumber", "Pembayaran", "Masuk", "Keluar", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{d.rows.map((r: any) => <tr key={r.id}><td className="td whitespace-nowrap">{tglWaktu(r.txDate)}</td><td className="td font-semibold">{r.category}</td><td className="td">{r.description}<div className="text-xs text-slate-500">oleh {r.createdByName}{r.attachmentUrl && <> • <a className="text-moss underline" href={r.attachmentUrl} target="_blank" rel="noreferrer">lampiran</a></>}</div></td><td className="td"><span className="rounded-full bg-paper px-2 py-0.5 text-xs">{src[r.source] ?? r.source}</span></td><td className="td whitespace-nowrap"><b>{PM[r.paymentMethod]}</b>{r.bankName && <div className="text-xs text-slate-500">{r.bankName}</div>}{(r.accountName || r.accountNo) && <div className="text-xs text-slate-500">{r.accountName} {r.accountNo && `• ${r.accountNo}`}</div>}</td>
              <td className="td whitespace-nowrap font-semibold text-emerald-700">{r.type === "income" ? rp(r.amount) : ""}</td><td className="td whitespace-nowrap font-semibold text-red-700">{r.type === "expense" ? rp(r.amount) : ""}</td>
              <td className="td">{r.source === "manual" && <button className="btn-ghost btn-danger" onClick={() => del(r.id)}>Batalkan</button>}</td></tr>)}</tbody>
            <tfoot className="border-t-2 bg-paper font-bold"><tr><td className="td" colSpan={5}>Total</td><td className="td text-emerald-700">{rp(s.income)}</td><td className="td text-red-700">{rp(s.expense)}</td><td /></tr></tfoot></table>}
        </div></>}
      {open && <Modal title="Catat transaksi" onClose={() => setOpen(false)}>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Field l="Jenis"><select name="type" className="inp"><option value="income">Uang masuk</option><option value="expense">Uang keluar</option></select></Field><Field l="Tanggal & jam"><input name="txDate" type="datetime-local" step="1" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19)} className="inp" required /></Field></div>
          <Field l="Kategori"><input name="category" list="cats" className="inp" placeholder="mis. Operasional" required /></Field>
          <datalist id="cats">{["Hibah / pemasukan lain", "Operasional", "Pembelian aset", "Perawatan aset", "Asuransi", "Lain-lain"].map((c) => <option key={c} value={c} />)}</datalist>
          <PayFields />
          <UploadField kind="receipts" name="attachmentUrl" label="Lampiran bukti (nota/foto, opsional)" />
          <Field l="Nominal (Rp)"><input name="amount" type="number" min="1" className="inp" required /></Field>
          <Field l="Keterangan"><textarea name="description" rows={2} className="inp" required /></Field>
          <button className="btn w-full">Simpan</button>
        </form></Modal>}
    </div>
  );
}
