"use client";
import { useEffect, useState } from "react";
import { api, Badge, Empty, Field, UploadField, rp, tglWaktu } from "../ui";
import { BANK_ACCOUNTS, WALLET_ACCOUNTS } from "@/lib/company";
import { saleCharges } from "@/lib/pricing";
const GATEWAY = false; // pembayaran online belum tersedia untuk pembelian; pakai transfer, QRIS, saldo dompet, atau tunai
type M = { key: string; label: string; method: "transfer" | "qris" | "cash"; bank: string; kind: "bank" | "wallet" | "qris" | "card" | "paylater" | "cash" | "balance"; gateway?: boolean; acct?: { no: string; name: string } };
const VA: [string, string][] = [["bca", "BCA"], ["bni", "BNI"], ["bri", "BRI"], ["permata", "Bank Permata"], ["mandiri", "Bank Mandiri"], ["cimb", "CIMB Niaga"]];
const GROUPS: { title: string; items: M[] }[] = [
  { title: "Saldo Dompet", items: [{ key: "balance", label: "Saldo Dompet AsetKu", method: "transfer", bank: "Saldo Dompet", kind: "balance" }] },
  ...(GATEWAY ? [{ title: "Virtual Account Bank", items: VA.map(([key, bank]) => ({ key, label: `${bank} Virtual Account`, method: "transfer", bank, kind: "bank", gateway: true }) as M) }] : []),
  { title: GATEWAY ? "Transfer Manual (upload bukti)" : "Transfer Bank", items: BANK_ACCOUNTS.map((a) => ({ key: "m-" + a.key, label: `Transfer ${a.bank}`, method: "transfer", bank: a.bank, kind: "bank", acct: a }) as M) },
  { title: "QRIS & E-Wallet", items: GATEWAY
    ? [["qris", "QRIS (semua e-wallet & m-banking)"], ["gopay", "GoPay"], ["shopeepay", "ShopeePay"], ["dana", "DANA"]].map(([key, label]) => ({ key, label, method: "qris", bank: key === "qris" ? "QRIS" : label, kind: "qris", gateway: true }) as M)
    : [{ key: "m-qris", label: "QRIS (scan kode)", method: "qris", bank: "QRIS", kind: "qris" } as M, ...WALLET_ACCOUNTS.map((w) => ({ key: "m-" + w.key, label: `${w.bank} (transfer ke nomor)`, method: "qris", bank: w.bank, kind: "wallet", acct: w }) as M)] },
  { title: "Kartu Kredit / Debit", items: [{ key: "card", label: "Kartu Kredit / Debit (Visa, Mastercard, JCB)", method: "transfer", bank: "Kartu Kredit/Debit", kind: "card", gateway: true }] },
  { title: "PayLater & Cicilan", items: [["akulaku", "Akulaku PayLater"], ["kredivo", "Kredivo"], ["indodana", "Indodana PayLater"]].map(([key, label]) => ({ key, label, method: "transfer", bank: label, kind: "paylater", gateway: true }) as M) },
  { title: "Bayar di Tempat", items: [{ key: "cash", label: "Tunai saat mengambil aset", method: "cash", bank: "", kind: "cash" }] },
];
export default function BuyCheckout() {
  const [w, setW] = useState<any>(null); const [pin, setPin] = useState(""); const [rows, setRows] = useState<any[]>([]); const [sel, setSel] = useState<M | null>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const load = () => api(`/api/purchases${location.search}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); api("/api/wallet").then(setW).catch(() => {}); }, []);
  const unpaid = rows.filter((r) => r.paymentStatus === "unpaid"), sum = (f: (r: any) => number) => unpaid.reduce((t, r) => t + f(r), 0);
  const total = sum((r) => Number(r.totalAmount)), sRent = sum((r) => Number(r.price)), sIns = sum((r) => Number(r.insuranceFee)), sVat = sum((r) => Number(r.vatAmount)), insured = unpaid.some((r) => r.insurance), insCost = sum((r) => saleCharges(Number(r.price), true).insurance);
  const allPaid = rows.length > 0 && rows.every((r) => r.paymentStatus === "paid"), verifying = rows.some((r) => r.paymentStatus === "verifying");
  const pending = rows.some((r) => r.status === "pending"), rejected = rows.length > 0 && rows.every((r) => r.status === "rejected");
  const canPay = rows.length > 0 && !allPaid && !verifying && rows.every((r) => ["pending", "approved"].includes(r.status));
  const deadline = canPay && rows[0] ? new Date(+new Date(rows[0].createdAt) + Number(process.env.NEXT_PUBLIC_PAY_DEADLINE_HOURS ?? 24) * 3600000) : null;
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => setMsg("Tersalin ke clipboard."));
  const run = (p: Promise<any>, ok: string) => p.then(() => { setErr(""); setMsg(ok); load(); }).catch((x) => { setMsg(""); setErr(x.message); });
  const save = (m: M) => run(api("/api/purchases/checkout", "POST", { purchaseId: rows[0].id, paymentMethod: m.method, bankName: m.bank }), "Pilihan pembayaran tersimpan.");
  const toggleIns = (v: boolean) => run(api("/api/purchases/checkout", "POST", { purchaseId: rows[0].id, insurance: v }), v ? "Asuransi barang ditambahkan." : "Asuransi barang dihapus.");
  const payWallet = () => run(api("/api/purchases/wallet", "POST", { purchaseId: rows[0].id, pin }), "Pembayaran dengan saldo berhasil.").then(() => { setPin(""); setSel(null); api("/api/wallet").then(setW); });
  function sendProof(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget));
    run(api(`/api/purchases/${rows[0].id}/proof`, "POST", { ...f, paymentMethod: sel!.method, bankName: sel!.bank }), "Bukti terkirim. Admin akan memverifikasi pembayaran Anda.").then(() => setSel(null));
  }
  if (!rows.length) return err ? <p role="alert" className="text-red-700">{err}</p> : <Empty text="Memuat pesanan…" />;
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">Pembayaran</h1><p className="text-sm text-slate-500">Pembelian {rows[0].groupNo ?? rows[0].orderNumber} • {rows.length} aset</p></div>
      {deadline && total > 0 && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Batas pembayaran: <b>{tglWaktu(deadline.toISOString())}</b> (sisa sekitar {Math.max(0, Math.round((+deadline - Date.now()) / 3600000))} jam). Pesanan dengan metode non-tunai yang belum dibayar dibatalkan otomatis dan stok dikembalikan.</p>}
      {pending && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Pesanan menunggu persetujuan admin. Anda sudah bisa membayar sekarang. Jika pesanan ditolak, pembayaran dikembalikan (refund).</p>}
      {verifying && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Bukti transfer sedang diverifikasi admin. Anda akan mendapat notifikasi.</p>}
      {allPaid && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Pembayaran lunas. Aset akan diserahkan oleh admin setelah pesanan disetujui.</p>}
      {rejected && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Pesanan ini ditolak atau dibatalkan.</p>}
      {rows.some((r) => r.paymentStatus === "refund_due") && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Pembayaran Anda akan dikembalikan (refund) oleh admin. Anda akan mendapat notifikasi saat selesai.</p>}
      {rows.some((r) => r.paymentStatus === "refunded") && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Refund sudah diproses oleh admin.</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {!allPaid && !rejected && !verifying && <>
            {insCost > 0 && <label className={`card flex cursor-pointer items-start gap-3 ${insured ? "border-moss ring-1 ring-moss" : ""}`}>
              <input type="checkbox" className="mt-1" checked={insured} disabled={!canPay} onChange={(e) => toggleIns(e.target.checked)} />
              <span className="text-sm"><b>Tambahkan asuransi barang</b> <span className="font-bold text-moss">+ {rp(insCost)}</span><br /><span className="text-slate-600">Melindungi barang dari kerusakan atau kehilangan saat pengiriman dan masa garansi awal sesuai syarat dan ketentuan. Biaya 2% dari harga barang (minimal Rp 5.000 per aset) dan dibayar bersama tagihan.</span></span></label>}
            {GROUPS.map((g) => <fieldset key={g.title} className="card space-y-2"><legend className="px-1 text-sm font-bold">{g.title}</legend>
              {g.items.map((m) => { const off = m.gateway && !GATEWAY; return (
                <label key={m.key} className={`flex items-center gap-3 rounded-lg border p-3 ${off ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${sel?.key === m.key ? "border-moss bg-emerald-50/60 ring-1 ring-moss" : "border-slate-200"}`}>
                  <input type="radio" name="pm" disabled={off} checked={sel?.key === m.key} onChange={() => setSel(m)} />
                  <span className="flex-1 text-sm font-medium">{m.label}</span>{off && <span className="rounded-full bg-paper px-2 py-0.5 text-xs">Segera hadir</span>}</label>); })}
            </fieldset>)}
            {sel && <div className="card space-y-3"><p className="font-bold">Instruksi: {sel.label}</p>
              {sel.kind === "balance" && <div className="space-y-3 text-sm"><p>Saldo Anda: <b className="text-moss">{rp(w?.balance ?? 0)}</b> • Tagihan: <b>{rp(total)}</b></p>
                {!w?.hasPin ? <p className="rounded bg-amber-50 p-2 text-amber-800">Buat PIN dulu di menu <a className="font-bold underline" href="/wallet">Dompet</a>.</p>
                  : (w?.balance ?? 0) < total ? <p className="rounded bg-amber-50 p-2 text-amber-800">Saldo belum cukup untuk tagihan ini. Pilih metode lain.</p>
                  : canPay && <><Field l="PIN Dompet (6 angka)"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="inp tracking-[0.5em]" /></Field><button className="btn w-full" disabled={pin.length !== 6} onClick={payWallet}>Bayar dengan saldo</button></>}</div>}
              {sel.kind === "cash" && <p className="text-sm">Bayar tunai kepada admin saat mengambil aset. Pembayaran dicatat otomatis saat serah terima.</p>}
              {sel.acct && <div className="rounded-lg bg-paper p-3 text-sm"><p>Transfer ke {sel.bank}</p><p className="text-xl font-extrabold tracking-wide">{sel.acct.no}</p><p>a.n. {sel.acct.name}</p><button type="button" className="btn-ghost mt-2" onClick={() => copy(sel.acct!.no)}>Salin nomor</button></div>}
              {sel.key === "m-qris" && <div className="text-center"><img src="/qris.png" alt="Kode QRIS" className="mx-auto h-56 w-56 rounded-lg border object-contain" onError={(e) => (e.currentTarget.style.display = "none")} /><p className="text-xs text-slate-500">Letakkan gambar QRIS Anda di public/qris.png</p></div>}
              {(sel.acct || sel.key === "m-qris" || sel.gateway) && <p className="text-sm">Nominal: <b className="text-moss">{rp(total)}</b> <button type="button" className="ml-2 text-xs underline" onClick={() => copy(String(Math.round(total)))}>salin</button></p>}
              {canPay && !sel.gateway && sel.kind !== "cash" && sel.kind !== "balance" && <form onSubmit={sendProof} className="space-y-3 border-t pt-3">
                <Field l={sel.method === "qris" ? "Nama pengirim (opsional)" : "Nama pemilik rekening pengirim"}><input name="accountName" className="inp" required={sel.method === "transfer"} /></Field>
                <Field l={sel.method === "qris" ? "No. HP / rekening (opsional)" : "No. rekening pengirim"}><input name="accountNo" inputMode="numeric" className="inp" required={sel.method === "transfer"} /></Field>
                <UploadField kind="proofs" name="proofUrl" label="Foto / screenshot bukti pembayaran" /><button className="btn w-full">Kirim bukti pembayaran</button></form>}
                            {!canPay && pending && <button className="btn w-full" onClick={() => save(sel)}>Simpan pilihan pembayaran</button>}
              {canPay && sel.kind === "cash" && <button className="btn w-full" onClick={() => save(sel)}>Pilih bayar tunai</button>}
            </div>}</>}
        </div>
        <div className="card h-fit space-y-3 lg:sticky lg:top-20"><p className="font-bold">Ringkasan pesanan</p>
          <ul className="divide-y text-sm">{rows.map((r) => <li key={r.id} className="py-2"><div className="flex justify-between gap-2"><span className="font-semibold">{r.asset.name}</span><b>{rp(r.totalAmount)}</b></div><p className="text-xs text-slate-500">{r.asset.assetCode} <Badge v={r.status} /></p></li>)}</ul>
          <div className="space-y-1 border-t pt-3 text-sm"><div className="flex justify-between"><span>Harga barang</span><span>{rp(sRent)}</span></div>{sIns > 0 && <div className="flex justify-between"><span>Asuransi barang</span><span>{rp(sIns)}</span></div>}<div className="flex justify-between"><span>PPN 11%</span><span>{rp(sVat)}</span></div></div>
          <p className="flex justify-between border-t pt-3 text-lg font-extrabold"><span>Total tagihan</span><span className="text-moss">{rp(total)}</span></p></div>
      </div>
    </div>
  );
}
