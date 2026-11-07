"use client";
import { useState } from "react";
import { api, Field } from "../ui";
export default function Forgot() {
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { const r = await api("/api/auth/forgot", "POST", Object.fromEntries(new FormData(e.currentTarget))); setMsg(r.message); setErr(""); } catch (x: any) { setMsg(""); setErr(x.message); }
  }
  return (
    <div className="grid min-h-[80vh] place-items-center"><form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
      <img src="/logo.png" alt="AsetKu Corporate" className="mx-auto h-20 w-auto" /><h1 className="text-xl font-bold">Lupa password</h1>
      <p className="text-sm text-slate-600">Masukkan email akun Anda. Kami mengirim tautan untuk membuat password baru (berlaku 1 jam) lewat email dan WhatsApp yang terdaftar.</p>
      {msg && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <Field l="Email"><input name="email" type="email" className="inp" required /></Field><button className="btn w-full">Kirim tautan reset</button>
      <a href="/login" className="block text-center text-sm text-moss underline">Kembali ke halaman masuk</a>
    </form></div>
  );
}
