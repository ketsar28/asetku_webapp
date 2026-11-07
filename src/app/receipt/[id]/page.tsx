"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, rp, tgl, tglWaktu } from "../../ui";
import { terbilang } from "@/lib/payroll";
import { due } from "@/lib/pricing";
export default function Receipt() {
  const { id } = useParams<{ id: string }>(); const [l, setL] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/api/loans/${id}`).then(setL).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="text-red-700">{err}</p>; if (!l) return <p className="text-slate-500">Memuat…</p>;
  if (l.paymentStatus !== "paid") return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Kwitansi tersedia setelah pembayaran lunas.</p>;
  const n = (x: unknown) => Number(x), total = due(l), row = (k: string, v: number) => <tr key={k}><td className="py-1">{k}</td><td className="py-1 text-right">{rp(v)}</td></tr>;
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <button className="btn print:hidden" onClick={() => print()}>Unduh / cetak PDF</button>
      <div className="rounded-xl border bg-white p-6 text-sm">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3"><div className="flex items-center gap-3"><img src="/logo.png" alt="AsetKu Corporate" className="h-14 w-auto" /><div><p className="font-extrabold">AsetKu Corporate</p><p className="text-xs text-slate-500">Kwitansi Pembayaran Sewa</p></div></div>
          <div className="text-right"><p className="font-mono text-xs">KW-{l.requestNumber}</p><p className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">LUNAS</p></div></div>
        <dl className="my-4 grid grid-cols-2 gap-x-4 gap-y-2">{[["Diterima dari", l.user.name], ["Tanggal bayar", tglWaktu(l.paidAt)], ["Aset", `${l.asset.name} (${l.asset.assetCode})`], ["Periode sewa", `${tgl(l.startDate)} – ${tgl(l.expectedReturnDate)}`],
          ["Metode", l.paymentMethod === "wallet" ? "Saldo Dompet AsetKu" : l.paymentMethod === "cash" ? "Tunai" : `${l.paymentMethod === "qris" ? "QRIS" : "Transfer"} ${l.bankName ?? ""}`], ["Pengirim", [l.accountName, l.accountNo].filter(Boolean).join(" • ") || "-"]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
        <table className="w-full border-t"><tbody>{row("Biaya sewa", n(l.rentalFee))}{n(l.insuranceFee) > 0 && row("Asuransi barang", n(l.insuranceFee))}{n(l.vatAmount) > 0 && row("PPN 11%", n(l.vatAmount))}<tr className="border-t-2 border-ink text-base font-extrabold"><td className="py-2">Total dibayar</td><td className="py-2 text-right">{rp(total)}</td></tr></tbody></table>
        <p className="mt-2 text-xs capitalize text-slate-600">Terbilang: {terbilang(total)} rupiah</p>
        <div className="mt-8 text-right text-xs"><p>Padang, {tgl(l.paidAt)}</p><div className="h-14" /><p className="font-semibold">AsetKu Corporate</p></div>
      </div>
    </div>
  );
}
