"use client";
import { useEffect, useState } from "react";
import { api, Avatar, Badge, Empty, Field, Modal, PayFields, rp, tgl } from "../ui";
import { calcPay } from "@/lib/payroll";
const thisMonth = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
export default function Payroll() {
  const [period, setPeriod] = useState(thisMonth()); const [rows, setRows] = useState<any[]>([]); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [ed, setEd] = useState<any>(null); const [pay, setPay] = useState<number[] | null>(null);
  const load = () => api(`/api/payroll?period=${period}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [period]);
  const run = (p: Promise<any>, ok: (d: any) => string) => p.then((d) => { setErr(""); setMsg(ok(d)); setEd(null); setPay(null); load(); }).catch((x) => { setMsg(""); setErr(x.message); });
  const sum = (f: (r: any) => boolean) => rows.filter(f).reduce((t, r) => t + Number(r.net), 0);
  const drafts = rows.filter((r) => r.status === "draft");
  const prev = ed ? calcPay({ base: +ed.baseSalary, allowance: +ed.allowance, kpiScore: +ed.kpiScore, overtime: +ed.overtime, otherDeduction: +ed.otherDeduction, kpiBonus: ed.kpiBonus === "" ? undefined : +ed.kpiBonus }) : null;
  const f = (k: string, l: string, h?: string) => <Field l={l}><input type="number" min="0" className="inp" value={ed[k]} onChange={(e) => setEd({ ...ed, [k]: e.target.value })} placeholder={h} /></Field>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Penggajian</h1>
        <input type="month" className="inp w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <button className="btn-ghost" onClick={() => run(api("/api/payroll", "POST", { period }), (d) => `${d.created} slip baru dibuat.`)}>Buat slip periode ini</button>
        <a className="btn-ghost" href={`/api/payroll/export?period=${period}`}>Export Excel</a>
        {drafts.length > 0 && <button className="btn" onClick={() => setPay(drafts.map((r) => r.id))}>Bayar semua ({drafts.length})</button>}</div>
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && !ed && !pay && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-3">{[["Total gaji bersih", sum(() => true), ""], ["Sudah dibayar", sum((r) => r.status === "paid"), "text-emerald-700"], ["Belum dibayar", sum((r) => r.status === "draft"), "text-amber-600"]].map(([l, x, c]) => <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className={`mt-1 text-2xl font-extrabold ${c}`}>{rp(x)}</p></div>)}</div>
      <div className="card overflow-x-auto p-0">{rows.length === 0 ? <Empty text="Belum ada slip pada periode ini. Klik “Buat slip periode ini”." /> :
        <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Karyawan", "Gaji pokok", "Tunjangan", "Bonus KPI", "Lembur", "Potongan", "Gaji bersih", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((r) => <tr key={r.id}>
            <td className="td"><div className="flex items-center gap-2"><Avatar e={r.employee} s={36} /><div><p className="font-semibold">{r.employee.name}</p><p className="text-xs text-slate-500">{r.employee.position}</p></div></div></td>
            <td className="td">{rp(r.baseSalary)}</td><td className="td">{rp(r.allowance)}</td><td className="td">{rp(r.kpiBonus)}<span className="block text-xs text-slate-500">KPI {r.kpiScore}</span></td><td className="td">{rp(r.overtime)}</td><td className="td">{rp(Number(r.bpjs) + Number(r.otherDeduction))}</td>
            <td className="td font-extrabold">{rp(r.net)}</td><td className="td"><Badge v={r.status === "paid" ? "paid" : "unpaid"} />{r.paidAt && <span className="block text-xs text-slate-500">{tgl(r.paidAt)}</span>}</td>
            <td className="td space-x-1 whitespace-nowrap">{r.status === "draft" && <><button className="btn-ghost" onClick={() => setEd({ ...r, baseSalary: Number(r.baseSalary), allowance: Number(r.allowance), overtime: Number(r.overtime), otherDeduction: Number(r.otherDeduction), kpiBonus: "" })}>Ubah</button><button className="btn" onClick={() => setPay([r.id])}>Bayar</button></>}
              <a className="btn-ghost" href={`/payroll/${r.id}/slip`} target="_blank" rel="noreferrer">Slip</a></td></tr>)}</tbody></table>}</div>
      {ed && prev && <Modal title={`Ubah gaji: ${ed.employee.name}`} onClose={() => setEd(null)}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(api("/api/payroll", "PATCH", ed), () => "Slip gaji diperbarui."); }}>
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{err}</p>}
          {f("baseSalary", "Gaji pokok (Rp)")}{f("allowance", "Tunjangan (Rp)")}{f("kpiScore", "Skor KPI")}{f("kpiBonus", "Bonus KPI (kosong = otomatis)", String(prev.kpiBonus))}{f("overtime", "Lembur (Rp)")}{f("otherDeduction", "Potongan lain (Rp)")}
          <div className="sm:col-span-2"><Field l="Catatan"><input className="inp" value={ed.note ?? ""} onChange={(e) => setEd({ ...ed, note: e.target.value })} /></Field></div>
          <p className="rounded-lg bg-paper p-3 text-sm sm:col-span-2">BPJS (3%): <b>{rp(prev.bpjs)}</b> • Bonus KPI: <b>{rp(prev.kpiBonus)}</b><br />Gaji bersih: <b className="text-lg text-moss">{rp(prev.net)}</b></p>
          <button className="btn sm:col-span-2">Simpan perubahan</button></form></Modal>}
      {pay && <Modal title={`Bayar gaji (${pay.length} slip)`} onClose={() => setPay(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(api("/api/payroll/pay", "POST", { ids: pay, ...Object.fromEntries(new FormData(e.currentTarget)) }), (d) => `${d.paid} gaji dibayar, ${rp(d.total)} tercatat di Laporan Keuangan.`); }}>
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
          <p className="rounded-lg bg-paper p-3 text-sm">Total: <b className="text-moss">{rp(rows.filter((r) => pay.includes(r.id)).reduce((t, r) => t + Number(r.net), 0))}</b>. Otomatis dicatat sebagai uang keluar “Gaji karyawan”.</p>
          <PayFields label="Dibayar dari (rekening perusahaan)" /><button className="btn w-full">Bayar & catat di laporan</button></form></Modal>}
    </div>
  );
}
