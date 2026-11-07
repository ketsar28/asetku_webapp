"use client";
import { useState } from "react";
import { api, Field } from "../ui";
export default function Login() {
  const [reg, setReg] = useState(false); const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (reg) { await api("/api/auth/register", "POST", f); setReg(false); setOk("Akun dibuat. Silakan masuk."); return; }
      const d = await api("/api/auth/login", "POST", f);
      location.href = d.role === "user" ? "/portal" : d.role === "employee" ? "/overtime" : d.role === "finance" ? "/finance" : "/dashboard";
    } catch (x: any) { setErr(x.message); }
  }
  return (
    <div className="grid min-h-[90vh] place-items-center lg:grid-cols-2">
      <div className="hidden h-full w-full flex-col justify-end rounded-3xl bg-ink p-10 text-white lg:flex">
        <h1 className="text-4xl font-extrabold leading-tight">Semua aset kantor,<br />satu catatan yang rapi.</h1>
        <p className="mt-3 max-w-sm text-white/70">Ajukan pinjam, setujui, serah terima, dan pantau kondisi aset tanpa spreadsheet.</p>
        <ul className="mt-8 space-y-3 text-sm">{["Persetujuan & serah terima terdokumentasi", "Denda keterlambatan dihitung otomatis", "Katalog & pemesanan aset real-time", "Laporan siap export ke Excel"].map((t) => <li key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#00BF63] text-xs font-bold text-ink">✓</span>{t}</li>)}</ul>
      </div>
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <img src="/logo.png" alt="AsetKu Corporate" className="mx-auto h-24 w-auto" />
        <h2 className="text-2xl font-bold">{reg ? "Buat akun" : "Masuk"}</h2>
        {ok && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-800">{ok}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        {reg && <Field l="Nama lengkap" req><input name="name" className="inp" required /></Field>}
        {reg && <Field l="No. telepon / WhatsApp"><input name="phone" className="inp" placeholder="08xxxxxxxxxx" /></Field>}
        <Field l="Email" req><input name="email" type="email" className="inp" required /></Field>
        <Field l="Password" req><input name="password" type="password" minLength={8} className="inp" required /></Field>
        {reg && <p className="text-xs text-slate-500">Minimal 8 karakter, kombinasi huruf dan angka.</p>}
        <button className="btn w-full">{reg ? "Daftar" : "Masuk"}</button>
        {!reg && <a href="/forgot" className="block text-center text-sm text-moss underline">Lupa password?</a>}
        <button type="button" className="w-full text-sm text-moss" onClick={() => { setReg(!reg); setErr(""); }}>{reg ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</button>
      </form>
    </div>
  );
}
