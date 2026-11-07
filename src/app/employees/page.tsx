"use client";
import { useEffect, useState } from "react";
import { api, Avatar, Empty, Field, Modal, UploadField, rp, tgl } from "../ui";
import { POSITIONS, tenure } from "@/lib/payroll";
import { BANKS } from "@/lib/banks";
const kpiColor = (s: number) => (s >= 85 ? "bg-[#00BF63]" : s >= 70 ? "bg-amber-500" : "bg-red-600");
const day = (d?: string) => (d ? d.slice(0, 10) : "");
export default function Employees() {
  const [rows, setRows] = useState<any[]>([]); const [pos, setPos] = useState(""); const [q, setQ] = useState("");
  const [edit, setEdit] = useState<any>(null); const [view, setView] = useState<any>(null); const [err, setErr] = useState("");
  const load = () => api("/api/employees").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const list = rows.filter((e) => (!pos || e.position === pos) && (!q || e.name.toLowerCase().includes(q.toLowerCase())));
  const act = rows.filter((e) => e.status === "active");
  const sum = act.reduce((t, e) => t + Number(e.baseSalary) + Number(e.allowance), 0), avg = act.length ? Math.round(act.reduce((t, e) => t + e.kpiScore, 0) / act.length) : 0;
  async function save(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault(); const f: any = Object.fromEntries(new FormData(ev.currentTarget));
    try { edit.id ? await api("/api/employees", "PATCH", { ...f, id: edit.id }) : await api("/api/employees", "POST", f); setEdit(null); setErr(""); load(); } catch (x: any) { setErr(x.message); }
  }
  const del = (e: any) => confirm(`Hapus ${e.name}?`) && api("/api/employees", "DELETE", { id: e.id }).then(() => { setView(null); load(); }).catch((x) => { setErr(x.message); setView(null); });
  const v = edit ?? {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Karyawan</h1>
        <input className="inp max-w-xs" placeholder="Cari nama…" onChange={(e) => setQ(e.target.value)} /><a className="btn-ghost" href="/api/export?type=employees">Export Excel</a><button className="btn" onClick={() => setEdit({})}>Tambah karyawan</button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Karyawan aktif", act.length], ["Total gaji per bulan", rp(sum)], ["Rata-rata KPI", avg], ["Jabatan", POSITIONS.length]].map(([l, x]) => <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className="mt-1 text-2xl font-extrabold">{x}</p></div>)}</div>
      <div className="flex flex-wrap gap-2">{["", ...POSITIONS].map((p) => <button key={p} onClick={() => setPos(p)} className={`rounded-full border px-3 py-1 text-sm font-medium ${pos === p ? "border-moss bg-moss text-white" : "border-slate-300 bg-white"}`}>{p || "Semua"}</button>)}</div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {list.length === 0 ? <Empty text="Belum ada karyawan." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((e) => (
        <div key={e.id} className="card space-y-3">
          <div className="flex items-center gap-3"><Avatar e={e} s={56} /><div className="min-w-0"><p className="truncate font-bold">{e.name}</p><p className="text-xs text-slate-500">{e.employeeNo} • <span className="font-semibold text-moss">{e.position}</span></p>{e.status !== "active" && <span className="rounded-full bg-red-50 px-2 text-xs text-red-800">Nonaktif</span>}</div></div>
          <div className="grid grid-cols-2 gap-2 text-sm"><div><p className="text-xs text-slate-500">Lama bekerja</p><b>{tenure(e.joinDate)}</b></div><div><p className="text-xs text-slate-500">Gaji pokok</p><b>{rp(e.baseSalary)}</b></div></div>
          <div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">KPI</span><b>{e.kpiScore}/100</b></div><div className="h-2 rounded-full bg-paper"><div className={`h-2 rounded-full ${kpiColor(e.kpiScore)}`} style={{ width: `${e.kpiScore}%` }} /></div></div>
          <div className="flex gap-2"><button className="btn-ghost" onClick={() => setView(e)}>Detail</button><button className="btn-ghost" onClick={() => setEdit(e)}>Ubah</button></div>
        </div>))}</div>}
      {view && <Modal title="Detail karyawan" onClose={() => setView(null)}>
        <div className="space-y-3 text-sm"><div className="flex items-center gap-4"><Avatar e={view} s={88} /><div><p className="text-lg font-extrabold">{view.name}</p><p>{view.employeeNo} • {view.position}</p><p className="text-slate-500">Bergabung {tgl(view.joinDate)} ({tenure(view.joinDate)})</p></div></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">{[["Jenis kelamin", view.gender === "L" ? "Laki-laki" : "Perempuan"], ["Tanggal lahir", tgl(view.birthDate)], ["NIK", view.nik ?? "-"], ["Telepon", view.phone ?? "-"], ["Email", view.email ?? "-"], ["Status", view.status === "active" ? "Aktif" : "Nonaktif"], ["Gaji pokok", rp(view.baseSalary)], ["Tunjangan", rp(view.allowance)], ["Rekening", `${view.bankName ?? "-"} ${view.accountNo ?? ""}`], ["Atas nama", view.accountName ?? "-"]].map(([k, x]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold">{x}</dd></div>)}</dl>
          <p><span className="text-xs text-slate-500">Alamat</span><br /><b>{view.address ?? "-"}</b></p>
          <div><div className="mb-1 flex justify-between"><span>KPI</span><b>{view.kpiScore}/100</b></div><div className="h-2.5 rounded-full bg-paper"><div className={`h-2.5 rounded-full ${kpiColor(view.kpiScore)}`} style={{ width: `${view.kpiScore}%` }} /></div>{view.kpiNote && <p className="mt-1 text-slate-600">{view.kpiNote}</p>}</div>
          {view.idPhotoUrl && <div><p className="mb-1 text-xs text-slate-500">Foto KTP</p><img src={view.idPhotoUrl} alt="KTP" className="max-h-48 rounded-lg border" /></div>}
          <div className="flex gap-2"><button className="btn" onClick={() => { setEdit(view); setView(null); }}>Ubah</button><button className="btn-ghost btn-danger" onClick={() => del(view)}>Hapus</button></div></div></Modal>}
      {edit && <Modal title={edit.id ? "Ubah karyawan" : "Tambah karyawan"} onClose={() => setEdit(null)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{err}</p>}
          <UploadField kind="employees" name="photoUrl" label="Foto profil" current={v.photoUrl} /><UploadField kind="employees" name="idPhotoUrl" label="Foto KTP" current={v.idPhotoUrl} />
          <Field l="Nama lengkap"><input name="name" defaultValue={v.name} className="inp" required /></Field>
          <Field l="Jabatan"><select name="position" defaultValue={v.position ?? POSITIONS[4]} className="inp">{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field l="Jenis kelamin"><select name="gender" defaultValue={v.gender ?? "L"} className="inp"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></Field>
          <Field l="Tanggal lahir"><input name="birthDate" type="date" defaultValue={day(v.birthDate)} className="inp" /></Field>
          <Field l="NIK (KTP)"><input name="nik" defaultValue={v.nik ?? ""} inputMode="numeric" className="inp" /></Field><Field l="Telepon"><input name="phone" defaultValue={v.phone ?? ""} className="inp" /></Field>
          <Field l="Email"><input name="email" type="email" defaultValue={v.email ?? ""} className="inp" /></Field><Field l="Tanggal bergabung"><input name="joinDate" type="date" defaultValue={day(v.joinDate)} className="inp" required /></Field>
          <div className="sm:col-span-2"><Field l="Alamat"><textarea name="address" rows={2} defaultValue={v.address ?? ""} className="inp" /></Field></div>
          <Field l="Gaji pokok (Rp)"><input name="baseSalary" type="number" min="0" defaultValue={Number(v.baseSalary ?? 0)} className="inp" required /></Field><Field l="Tunjangan jabatan (Rp)"><input name="allowance" type="number" min="0" defaultValue={Number(v.allowance ?? 0)} className="inp" /></Field>
          <Field l="Skor KPI (0–100)"><input name="kpiScore" type="number" min="0" max="100" defaultValue={v.kpiScore ?? 80} className="inp" /></Field><Field l="Status"><select name="status" defaultValue={v.status ?? "active"} className="inp"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></Field>
          <div className="sm:col-span-2"><Field l="Catatan KPI"><input name="kpiNote" defaultValue={v.kpiNote ?? ""} className="inp" /></Field></div>
          <Field l="Bank (rekening gaji)"><select name="bankName" defaultValue={v.bankName ?? ""} className="inp"><option value="">—</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></Field><Field l="No. rekening"><input name="accountNo" defaultValue={v.accountNo ?? ""} inputMode="numeric" className="inp" /></Field>
          <div className="sm:col-span-2"><Field l="Atas nama rekening"><input name="accountName" defaultValue={v.accountName ?? ""} className="inp" /></Field></div>
          <button className="btn sm:col-span-2">Simpan</button>
        </form></Modal>}
    </div>
  );
}
