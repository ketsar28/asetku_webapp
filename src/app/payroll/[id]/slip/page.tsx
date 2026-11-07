"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Avatar, rp, tgl, tglWaktu } from "../../../ui";
import { tenure, terbilang } from "@/lib/payroll";
export default function Slip() {
  const { id } = useParams<{ id: string }>(); const [p, setP] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/api/payroll/${id}`).then(setP).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="text-red-700">{err}</p>; if (!p) return <p className="text-slate-500">Memuat…</p>;
  const e = p.employee, n = (x: unknown) => Number(x), earn = n(p.baseSalary) + n(p.allowance) + n(p.kpiBonus) + n(p.overtime), ded = n(p.bpjs) + n(p.otherDeduction);
  const row = (l: string, v: number) => <tr key={l}><td className="py-1">{l}</td><td className="py-1 text-right">{rp(v)}</td></tr>;
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <button className="btn print:hidden" onClick={() => print()}>Cetak / simpan PDF</button>
      <div className="rounded-xl border bg-white p-6 text-sm">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3"><div className="flex items-center gap-3"><img src="/logo.png" alt="AsetKu Corporate" className="h-14 w-auto" /><div><p className="font-extrabold">AsetKu Corporate</p><p className="text-xs text-slate-500">Slip Gaji Karyawan</p></div></div>
          <div className="text-right"><p className="font-bold">{new Date(p.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p><p className="font-mono text-xs">{p.slipNo}</p></div></div>
        <div className="my-4 flex gap-4"><Avatar e={e} s={72} /><dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1">{[["Nama", e.name], ["No. karyawan", e.employeeNo], ["Jabatan", e.position], ["Lama bekerja", `${tenure(e.joinDate)} (sejak ${tgl(e.joinDate)})`], ["Skor KPI", `${p.kpiScore}/100`], ["Rekening", `${e.bankName ?? "-"} ${e.accountNo ?? ""}`]].map(([k, x]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold">{x}</dd></div>)}</dl></div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div><p className="mb-1 border-b font-bold">Penerimaan</p><table className="w-full"><tbody>{row("Gaji pokok", n(p.baseSalary))}{row("Tunjangan jabatan", n(p.allowance))}{row(`Bonus KPI (skor ${p.kpiScore})`, n(p.kpiBonus))}{row("Lembur", n(p.overtime))}<tr className="border-t font-bold"><td className="py-1">Total penerimaan</td><td className="py-1 text-right">{rp(earn)}</td></tr></tbody></table></div>
          <div><p className="mb-1 border-b font-bold">Potongan</p><table className="w-full"><tbody>{row("BPJS (Kesehatan 1% + JHT 2%)", n(p.bpjs))}{row("Potongan lain", n(p.otherDeduction))}<tr className="border-t font-bold"><td className="py-1">Total potongan</td><td className="py-1 text-right">{rp(ded)}</td></tr></tbody></table></div></div>
        <div className="mt-4 rounded-lg bg-ink p-4 text-white"><p className="text-xs text-white/70">Gaji bersih diterima</p><p className="text-2xl font-extrabold">{rp(p.net)}</p><p className="text-xs capitalize text-white/70">Terbilang: {terbilang(n(p.net)) || "nol"} rupiah</p></div>
        {p.note && <p className="mt-2 text-xs text-slate-600">Catatan: {p.note}</p>}
        <p className="mt-3 text-xs text-slate-500">{p.status === "paid" ? `Dibayar ${tglWaktu(p.paidAt)} via ${p.paymentMethod === "cash" ? "tunai" : `${p.paymentMethod} ${p.bankName ?? ""}`}` : "STATUS: BELUM DIBAYAR (draft)"}</p>
        <div className="mt-8 grid grid-cols-2 text-center text-xs"><div><p>Dibuat oleh</p><div className="h-14" /><p className="border-t pt-1">Admin / HRD</p></div><div><p>Diterima oleh</p><div className="h-14" /><p className="border-t pt-1">{e.name}</p></div></div>
      </div>
    </div>
  );
}
