"use client";
import { useEffect, useState } from "react";
import { api, Empty, Field, Modal, rp, tglWaktu } from "../ui";
import { BANKS } from "@/lib/banks";
const L: Record<string, string> = { refund: "Refund sewa", payment: "Pembayaran sewa", withdraw: "Penarikan saldo", withdraw_back: "Penarikan dibatalkan", adjust: "Penyesuaian admin" };
const pinInp = (v: string, set: (s: string) => void) => <input type="password" inputMode="numeric" maxLength={6} value={v} onChange={(e) => set(e.target.value.replace(/\D/g, ""))} className="inp tracking-[0.5em]" placeholder="••••••" />;
export default function Wallet() {
  const [w, setW] = useState<any>(null); const [m, setM] = useState<"" | "pin" | "wd">(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [pin, setPin] = useState(""), [pin2, setPin2] = useState(""), [cur, setCur] = useState("");
  const load = () => api("/api/wallet").then(setW).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const done = (t: string) => { setM(""); setErr(""); setMsg(t); setPin(""); setPin2(""); setCur(""); load(); };
  async function savePin(e: React.FormEvent) { e.preventDefault(); if (pin !== pin2) return setErr("Konfirmasi PIN tidak sama"); try { await api("/api/wallet/pin", "POST", { pin, currentPin: cur }); done("PIN berhasil disimpan."); } catch (x: any) { setErr(x.message); } }
  async function withdraw(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); try { await api("/api/wallet/withdraw", "POST", { ...Object.fromEntries(new FormData(e.currentTarget)), pin }); done("Permintaan penarikan dikirim. Admin akan mentransfer ke rekening Anda."); } catch (x: any) { setErr(x.message); } }
  if (!w) return <p className="text-slate-500">{err || "Memuat…"}</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Dompet AsetKu</h1>
      {!w.hasPin && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Buat <b>PIN 6 angka</b> terlebih dahulu untuk mengamankan dompet. PIN dibutuhkan saat membayar dengan saldo dan menarik saldo.</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      <div className="rounded-2xl bg-ink p-6 text-white"><p className="text-sm text-white/70">Saldo tersedia</p><p className="text-3xl font-extrabold">{rp(w.balance)}</p>
        <p className="mt-1 text-xs text-white/60">Refund pesanan yang ditolak atau dibatalkan masuk ke sini. Saldo bisa dipakai membayar sewa atau ditarik ke rekening bank.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-lg bg-[#00BF63] px-4 py-2 text-sm font-bold text-ink disabled:opacity-50" disabled={!w.hasPin || w.balance < 10000} onClick={() => { setM("wd"); setErr(""); }}>Tarik saldo</button>
          <button className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold" onClick={() => { setM("pin"); setErr(""); }}>{w.hasPin ? "Ubah PIN" : "Buat PIN"}</button></div></div>
      <div className="card"><p className="mb-3 font-bold">Riwayat dompet</p>
        {w.txs.length === 0 ? <Empty text="Belum ada transaksi dompet." /> : <ul className="divide-y">{w.txs.map((t: any) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div><p className="font-semibold">{L[t.type] ?? t.type}{t.status === "pending" && <span className="ml-2 rounded-full bg-amber-50 px-2 text-xs text-amber-800">Menunggu transfer</span>}{t.status === "rejected" && <span className="ml-2 rounded-full bg-red-50 px-2 text-xs text-red-800">Ditolak</span>}</p>
            <p className="text-xs text-slate-500">{t.description} • {tglWaktu(t.createdAt)}{t.note ? ` • ${t.note}` : ""}</p></div>
            <b className={t.amount >= 0 ? "text-emerald-700" : "text-red-700"}>{t.amount >= 0 ? "+" : "-"}{rp(Math.abs(t.amount))}</b></li>))}</ul>}</div>
      {m === "pin" && <Modal title={w.hasPin ? "Ubah PIN" : "Buat PIN"} onClose={() => setM("")}><form onSubmit={savePin} className="space-y-3">
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        {w.hasPin && <Field l="PIN saat ini">{pinInp(cur, setCur)}</Field>}<Field l="PIN baru (6 angka)">{pinInp(pin, setPin)}</Field><Field l="Ulangi PIN baru">{pinInp(pin2, setPin2)}</Field>
        <p className="text-xs text-slate-500">Jangan gunakan angka kembar atau berurutan, dan jangan bagikan PIN kepada siapa pun. Lima kali salah mengunci dompet 15 menit.</p><button className="btn w-full" disabled={pin.length !== 6}>Simpan PIN</button></form></Modal>}
      {m === "wd" && <Modal title="Tarik saldo ke rekening" onClose={() => setM("")}><form onSubmit={withdraw} className="space-y-3">
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <Field l={`Jumlah (maks ${rp(w.balance)})`}><input name="amount" type="number" min="10000" max={w.balance} className="inp" required /></Field>
        <Field l="Bank tujuan"><select name="bankName" className="inp">{BANKS.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field l="Nama pemilik rekening"><input name="accountName" className="inp" required /></Field><Field l="Nomor rekening"><input name="accountNo" inputMode="numeric" className="inp" required /></Field>
        <Field l="PIN Dompet">{pinInp(pin, setPin)}</Field><button className="btn w-full" disabled={pin.length !== 6}>Ajukan penarikan</button>
        <p className="text-xs text-slate-500">Saldo langsung ditahan. Admin mentransfer ke rekening Anda, dan Anda mendapat notifikasi. Jika ditolak, saldo dikembalikan.</p></form></Modal>}
    </div>
  );
}
