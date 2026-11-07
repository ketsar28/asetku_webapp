"use client";
import { useEffect, useState } from "react";
import { api, Field } from "../ui";
export default function Reset() {
  const [token, setToken] = useState(""); const [err, setErr] = useState(""); const [ok, setOk] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(location.search).get("token") ?? ""); }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f: any = Object.fromEntries(new FormData(e.currentTarget));
    if (f.password !== f.confirm) return setErr("Konfirmasi password tidak sama");
    try { await api("/api/auth/reset", "POST", { token, password: f.password }); setOk(true); setErr(""); } catch (x: any) { setErr(x.message); }
  }
  return (
    <div className="grid min-h-[80vh] place-items-center"><form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
      <img src="/logo.png" alt="AsetKu Corporate" className="mx-auto h-20 w-auto" /><h1 className="text-xl font-bold">Buat password baru</h1>
      {ok ? <><p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">Password berhasil diubah. Silakan masuk dengan password baru.</p><a href="/login" className="btn w-full">Ke halaman masuk</a></> : <>
        {!token && <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">Tautan tidak lengkap. Minta tautan baru di halaman Lupa password.</p>}{err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <Field l="Password baru"><input name="password" type="password" minLength={8} className="inp" required /></Field><Field l="Ulangi password baru"><input name="confirm" type="password" minLength={8} className="inp" required /></Field>
        <p className="text-xs text-slate-500">Minimal 8 karakter, kombinasi huruf dan angka.</p><button className="btn w-full" disabled={!token}>Simpan password</button></>}
    </form></div>
  );
}
