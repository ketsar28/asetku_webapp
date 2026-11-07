"use client";
import { useEffect, useState } from "react";
import { api, Empty, PayFields, rp } from "../../ui";
export default function DemoPay() {
  const [order, setOrder] = useState(""); const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { const o = new URLSearchParams(location.search).get("order") ?? ""; setOrder(o); api(`/api/payments/demo?order=${encodeURIComponent(o)}`).then(setD).catch((e) => setErr(e.message)); }, []);
  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { await api("/api/payments/demo", "POST", { order, ...Object.fromEntries(new FormData(e.currentTarget)) }); location.href = "/loans"; } catch (x: any) { setErr(x.message); }
  }
  return (
    <div className="mx-auto max-w-md space-y-3">
      <p className="rounded-lg bg-amber-50 p-2 text-center text-xs font-semibold text-amber-800">MODE DEMO: pembayaran simulasi, tidak ada uang sungguhan</p>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!d ? (err ? <Empty text="Tagihan tidak tersedia." /> : <p className="text-slate-500">Memuat…</p>) : (
        <form onSubmit={pay} className="card space-y-3">
          <h1 className="text-xl font-extrabold">Pembayaran sewa</h1>
          <ul className="divide-y rounded-lg border text-sm">{d.items.map((i: any, k: number) => <li key={k} className="flex justify-between p-2"><span>{i.name}</span><b>{rp(i.fee)}</b></li>)}</ul>
          <p className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="text-moss">{rp(d.total)}</span></p>
          <PayFields label="Bayar dengan" />
          <button className="btn w-full">Bayar sekarang (simulasi)</button>
        </form>)}
    </div>
  );
}
