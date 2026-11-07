"use client";
import { useEffect, useState } from "react";
import { api, Empty, Field, Modal, PayFields, rp, tgl } from "../../ui";
import FinanceTabs from "../Tabs";
const ST: Record<string, string> = { Lunas: "bg-emerald-50 text-emerald-800", Nihil: "bg-slate-100 text-slate-600", Berjalan: "bg-sky-50 text-sky-800", "Belum disetor": "bg-amber-50 text-amber-800", Terlambat: "bg-red-50 text-red-800" };
export default function Tax() {
  const [year, setYear] = useState(new Date().getFullYear()); const [d, setD] = useState<any>(null); const [pay, setPay] = useState<any>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const load = () => api(`/api/finance/tax?year=${year}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [year]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); try { await api("/api/finance/tax", "POST", { period: pay.period, ...Object.fromEntries(new FormData(e.currentTarget)) }); setPay(null); setErr(""); setMsg("Setoran PPN dicatat."); load(); } catch (x: any) { setErr(x.message); }
  }
  const soon = d?.vat.filter((v: any) => ["Terlambat", "Belum disetor"].includes(v.status)) ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Pajak & Kewajiban</h1><select className="inp w-auto" value={year} onChange={(e) => setYear(+e.target.value)}>{[0, 1, 2].map((i) => <option key={i}>{new Date().getFullYear() - i}</option>)}</select>
        <a className="btn-ghost" href={`/api/finance/report-export?type=tax&year=${year}`}>Export Excel PPN</a><button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button></div>
      <FinanceTabs />
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && !pay && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {soon.map((v: any) => <p key={v.period} className={`rounded-lg border p-3 text-sm ${v.status === "Terlambat" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}><b>PPN masa {v.period}: {v.status.toLowerCase()}.</b> Sisa {rp(v.left)}, jatuh tempo penyetoran dan pelaporan SPT Masa {tgl(v.deadline)}.</p>)}
      {!d ? <p className="text-slate-500">Memuat…</p> : <>
        <div className="card overflow-x-auto p-0"><p className="p-4 pb-2 font-bold">Rekap PPN Keluaran {year}</p>
          <table className="w-full text-sm"><thead className="border-y bg-paper"><tr>{["Masa", "Harga jual (sewa)", "DPP nilai lain (11/12)", "PPN keluaran", "Retur refund", "PPN neto", "Disetor", "Sisa", "Jatuh tempo", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{d.vat.map((v: any) => <tr key={v.period}><td className="td font-semibold">{v.period}</td><td className="td">{rp(v.sales)}</td><td className="td">{rp(v.dpp)}</td><td className="td">{rp(v.ppn)}</td><td className="td">{rp(v.retur)}</td><td className="td font-bold">{rp(v.net)}</td><td className="td">{rp(v.paid)}</td><td className="td font-bold text-amber-700">{rp(v.left)}</td><td className="td whitespace-nowrap">{tgl(v.deadline)}</td>
              <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ST[v.status]}`}>{v.status}</span></td><td className="td">{v.left > 0 && v.status !== "Berjalan" && <button className="btn-ghost" onClick={() => { setPay(v); setErr(""); }}>Catat setoran</button>}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-500">PPN dihitung dari tarif 12% × DPP nilai lain 11/12 (efektif 11%). Penyetoran dan pelaporan SPT Masa PPN umumnya paling lambat akhir bulan berikutnya. Ini rekap internal, bukan faktur pajak resmi. Hanya Pengusaha Kena Pajak (PKP) yang berhak memungut PPN. Konfirmasikan dengan akuntan atau konsultan pajak.</p>
        <div className="card overflow-x-auto p-0"><p className="p-4 pb-2 font-bold">Rekap penggajian & BPJS {year}</p>
          {d.payroll.length === 0 ? <Empty text="Belum ada gaji yang dibayar pada tahun ini." /> : <table className="w-full text-sm"><thead className="border-y bg-paper"><tr>{["Periode", "Karyawan", "Gaji pokok", "Tunjangan", "Bonus KPI", "Lembur", "BPJS karyawan", "BPJS perusahaan (est.)", "Potongan lain*", "Gaji bersih"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{d.payroll.map((p: any) => <tr key={p.period}><td className="td font-semibold">{p.period}</td><td className="td">{p.n}</td><td className="td">{rp(p.base)}</td><td className="td">{rp(p.allowance)}</td><td className="td">{rp(p.bonus)}</td><td className="td">{rp(p.overtime)}</td><td className="td">{rp(p.bpjsKaryawan)}</td><td className="td">{rp(p.bpjsPerusahaan)}</td><td className="td">{rp(p.other)}</td><td className="td font-bold">{rp(p.net)}</td></tr>)}</tbody></table>}</div>
        <p className="text-xs text-slate-500">*Kolom potongan lain dapat memuat PPh 21 jika Anda mengisinya manual pada slip gaji. Perhitungan PPh 21 otomatis (PTKP/TER) belum tersedia. BPJS perusahaan adalah estimasi 8,24% dari gaji pokok.</p></>}
      {pay && <Modal title={`Catat setoran PPN ${pay.period}`} onClose={() => setPay(null)}><form onSubmit={save} className="space-y-3">
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <Field l="Jumlah disetor (Rp)"><input name="amount" type="number" min="1" defaultValue={pay.left} className="inp" required /></Field>
        <Field l="Tanggal setor"><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="inp" required /></Field><Field l="NTPN (opsional)"><input name="ntpn" className="inp" /></Field>
        <PayFields label="Dibayar dari" /><button className="btn w-full">Simpan setoran</button><p className="text-xs text-slate-500">Setoran PPN mengurangi kewajiban pajak dan tidak dihitung sebagai beban usaha.</p></form></Modal>}
    </div>
  );
}
