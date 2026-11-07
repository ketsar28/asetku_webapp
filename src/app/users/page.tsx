"use client";
import { useEffect, useState } from "react";
import { api, Empty, Field, Modal } from "../ui";
export default function Users() {
  const [users, setUsers] = useState<any[]>([]); const [deps, setDeps] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null); const [err, setErr] = useState("");
  const load = () => { api("/api/users").then(setUsers).catch((e) => setErr(e.message)); api("/api/departments").then(setDeps); };
  useEffect(() => { load(); }, []);
  const run = (p: Promise<unknown>) => p.then(() => { setErr(""); setEdit(null); load(); }).catch((x) => setErr(x.message));
  const adjust = (u: any) => { const a = Number(prompt(`Tambah Saldo Dompet ${u.name} (Rp):`)); if (!a || a <= 0) return; const note = prompt("Alasan (wajib, mis. transfer 2 Nov yang ditolak keliru):"); if (!note?.trim()) return; run(api("/api/wallet/adjust", "POST", { userId: u.id, amount: a, note })); };
  const saveUser = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f: any = Object.fromEntries(new FormData(e.currentTarget)); if (!f.password) delete f.password;
    run(edit.id ? api("/api/users", "PATCH", { ...f, id: edit.id }) : api("/api/users", "POST", f)); };
  const addDep = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const el = e.currentTarget; run(api("/api/departments", "POST", Object.fromEntries(new FormData(el))).then(() => el.reset())); };
  const v = edit ?? {};
  return (
    <div className="space-y-5">
      <div className="flex items-center"><h1 className="mr-auto text-2xl font-extrabold">Akun Penyewa & Staff</h1><button className="btn" onClick={() => setEdit({})}>Tambah user</button></div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0">{users.length === 0 ? <Empty text="Belum ada user." /> :
        <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Nama", "Email", "Telepon", "Role", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{users.map((u) => <tr key={u.id}><td className="td font-semibold">{u.name}</td><td className="td">{u.email}</td><td className="td">{u.phone ?? "-"}</td><td className="td">{u.role === "user" ? "Penyewa" : u.role}</td><td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{u.isActive ? "Aktif" : "Nonaktif"}</span></td>
            <td className="td space-x-1 whitespace-nowrap"><button className="btn-ghost" onClick={() => run(api("/api/users", "PATCH", { id: u.id, isActive: !u.isActive }))}>{u.isActive ? "Nonaktifkan" : "Aktifkan"}</button>{u.role === "user" && <button className="btn-ghost" onClick={() => adjust(u)}>Isi saldo</button>}{u.role === "user" && <button className="btn-ghost" onClick={() => confirm(`Reset PIN dompet ${u.name}?`) && run(api("/api/users", "PATCH", { id: u.id, resetPin: true }))}>Reset PIN</button>}<button className="btn-ghost" onClick={() => setEdit(u)}>Ubah</button><button className="btn-ghost btn-danger" onClick={() => confirm(`Hapus ${u.name}?`) && run(api("/api/users", "DELETE", { id: u.id }))}>Hapus</button></td></tr>)}</tbody></table>}</div>
      <div className="card"><p className="mb-3 font-bold">Departemen</p>
        <div className="mb-3 flex flex-wrap gap-2">{deps.map((d) => <span key={d.id} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 text-sm">{d.code} · {d.name}<button aria-label="Hapus" className="text-red-700" onClick={() => run(api("/api/departments", "DELETE", { id: d.id }))}>×</button></span>)}</div>
        <form onSubmit={addDep} className="flex flex-wrap gap-2"><input name="code" placeholder="Kode" className="inp w-24" required /><input name="name" placeholder="Nama departemen" className="inp max-w-xs" required /><button className="btn">Tambah</button></form></div>
      {edit && <Modal title={edit.id ? "Ubah user" : "Tambah user"} onClose={() => setEdit(null)}>
        <form onSubmit={saveUser} className="space-y-3">
          <Field l="Nama"><input name="name" defaultValue={v.name} className="inp" required /></Field>
          <Field l="No. telepon"><input name="phone" defaultValue={v.phone ?? ""} className="inp" /></Field>
          {!edit.id && <Field l="Email"><input name="email" type="email" className="inp" required /></Field>}
          <Field l="Role"><select name="role" defaultValue={v.role ?? "user"} className="inp"><option value="user">Penyewa</option><option value="staff">Staff gudang</option><option value="finance">Keuangan</option><option value="admin">Admin</option><option value="employee">Karyawan</option></select></Field>
          <Field l="Departemen"><select name="departmentId" defaultValue={v.departmentId ?? ""} className="inp"><option value="">—</option>{deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field l={edit.id ? "Password baru (kosongkan jika tidak diganti)" : "Password"}><input name="password" type="password" minLength={8} className="inp" required={!edit.id} /></Field>
          <button className="btn w-full">Simpan</button>
        </form></Modal>}
    </div>
  );
}
