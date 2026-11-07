"use client";
import { useEffect, useState } from "react";
import { api, Field } from "../ui";
export default function Profile() {
  const [u, setU] = useState<any>(null); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { api("/api/profile").then(setU); }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f: any = Object.fromEntries(new FormData(e.currentTarget)); if (!f.newPassword) { delete f.newPassword; delete f.currentPassword; }
    try { setU(await api("/api/profile", "PATCH", f)); setErr(""); setMsg("Profil disimpan."); } catch (x: any) { setMsg(""); setErr(x.message); }
  }
  if (!u) return <p className="text-slate-500">Memuat…</p>;
  return (
    <form onSubmit={save} className="card mx-auto max-w-lg space-y-3">
      <h1 className="text-xl font-extrabold">Profil saya</h1>
      {msg && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <Field l="Email"><input value={u.email} disabled className="inp bg-paper" /></Field>
      <Field l="Nama lengkap"><input name="name" defaultValue={u.name} className="inp" required /></Field>
      <Field l="No. telepon / WhatsApp"><input name="phone" defaultValue={u.phone ?? ""} className="inp" /></Field>
      <p className="pt-2 text-sm font-bold">Ganti password (opsional)</p>
      <Field l="Password saat ini"><input name="currentPassword" type="password" className="inp" /></Field>
      <Field l="Password baru"><input name="newPassword" type="password" minLength={8} className="inp" /></Field>
      <button className="btn w-full">Simpan</button>
    </form>
  );
}
