"use client";
import { useEffect, useState } from "react";
import { api, Empty, Field, Modal, UploadField, rp, tgl } from "../ui";
import { hoursBetween, isTime, overtimePay } from "@/lib/overtime";
const B = "btn !px-3 !py-1.5 !text-[13px]", G = "btn-ghost !px-2.5 !py-1.5 !text-[13px]", D = "btn-ghost btn-danger !px-2.5 !py-1.5 !text-[13px]";
const ST: Record<string, [string, string]> = { pending: ["Menunggu", "bg-amber-50 text-amber-800"], approved: ["Disetujui", "bg-emerald-50 text-emerald-800"], rejected: ["Ditolak", "bg-red-50 text-red-800"] };
const Pill = ({ v }: { v: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${(ST[v] ?? ["", ""])[1]}`}>{(ST[v] ?? [v, ""])[0]}</span>;
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const isWeekend = (d: string) => { const w = new Date(`${d}T00:00:00`).getDay(); return w === 0 || w === 6; };
const ymOf = (d: string) => String(d).slice(0, 7);
const dateOf = (r: any) => String(r.workDate).slice(0, 10);
const Photo = ({ url, onOpen }: { url: string; onOpen: (u: string) => void }) => <button type="button" onClick={() => onOpen(url)} aria-label="Lihat foto bukti"><img src={url} alt="Foto bukti lembur" className="h-12 w-12 rounded-lg border object-cover" /></button>;
export default function Overtime() {
  const [role, setRole] = useState(""); const [data, setData] = useState<any>({ rows: [] }); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [img, setImg] = useState("");
  const load = () => api("/api/overtime").then(setData).catch((e) => setErr(e.message));
  useEffect(() => { api("/api/me").then((m) => setRole(m.role)); load(); }, []);
  if (!role) return <Empty text="Memuat…" />;
  return <>{role === "employee" ? <Mine data={data} load={load} err={err} setErr={setErr} msg={msg} setMsg={setMsg} setImg={setImg} /> : <Admin rows={data.rows} load={load} err={err} setErr={setErr} setImg={setImg} />}
    {img && <Modal title="Foto bukti kegiatan lembur" onClose={() => setImg("")}><a href={img} target="_blank" rel="noreferrer"><img src={img} alt="Foto bukti lembur" className="max-h-[70vh] w-full rounded-lg border object-contain" /></a></Modal>}</>;
}
function Mine({ data, load, err, setErr, msg, setMsg, setImg }: any) {
  const [date, setDate] = useState(todayStr()); const [start, setStart] = useState("17:00"); const [end, setEnd] = useState("20:00"); const [dayType, setDayType] = useState("workday"); const [fk, setFk] = useState(0); const [busy, setBusy] = useState(false);
  const rows: any[] = data.rows ?? [], ym = todayStr().slice(0, 7);
  const hours = isTime(start) && isTime(end) ? hoursBetween(start, end) : 0, est = data.monthly && hours >= 0.5 ? overtimePay(data.monthly, hours, dayType as any) : 0;
  const mine = rows.filter((r) => ymOf(dateOf(r)) === ym), okRows = mine.filter((r) => r.status === "approved");
  const pick = (d: string) => { setDate(d); setDayType(d && isWeekend(d) ? "holiday" : "workday"); };
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    try { const f = Object.fromEntries(new FormData(e.currentTarget)); await api("/api/overtime", "POST", { ...f, workDate: date, startTime: start, endTime: end, dayType }); setMsg("Lembur terkirim. Admin akan meninjau, dan jika disetujui nominalnya masuk ke gaji Anda."); setFk((k) => k + 1); load(); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold text-ink">Input Lembur</h1><p className="mt-0.5 text-sm text-slate-500">{data.employee ? `${data.employee.name} • ${data.employee.position}. ` : ""}Isi kegiatan dan unggah foto bukti. Lembur yang disetujui otomatis masuk ke gaji.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{[["Menunggu persetujuan", `${rows.filter((r) => r.status === "pending").length} pengajuan`], ["Lembur disetujui bulan ini", `${okRows.reduce((t, r) => t + Number(r.hours), 0)} jam`], ["Nominal disetujui bulan ini", rp(okRows.reduce((t, r) => t + Number(r.amount), 0))]].map(([l, v]) => <div key={l} className="card"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-extrabold">{v}</p></div>)}</div>
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <form key={fk} onSubmit={send} className="card grid gap-3 sm:grid-cols-2">
        <p className="font-bold sm:col-span-2">Ajukan lembur baru</p>
        <Field l="Tanggal lembur"><input type="date" className="inp" required max={todayStr()} value={date} onChange={(e) => pick(e.target.value)} /></Field>
        <Field l="Jenis hari"><select className="inp" value={dayType} onChange={(e) => setDayType(e.target.value)}><option value="workday">Hari kerja</option><option value="holiday">Hari libur / akhir pekan</option></select></Field>
        <Field l="Jam mulai"><input type="time" className="inp" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field l="Jam selesai"><input type="time" className="inp" required value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        <p className="rounded-lg bg-paper p-3 text-sm sm:col-span-2">Durasi: <b>{hours > 0 ? `${hours} jam` : "-"}</b>{est > 0 && <> • Perkiraan upah lembur: <b className="text-moss">{rp(est)}</b> <span className="text-xs text-slate-500">(nominal final dihitung saat disetujui)</span></>}</p>
        <div className="sm:col-span-2"><Field l="Kegiatan yang dikerjakan"><textarea name="activity" rows={3} required minLength={10} className="inp" placeholder="Contoh: Menyiapkan ruang rapat dan memeriksa 40 unit proyektor untuk acara besok pagi" /></Field></div>
        <div className="sm:col-span-2"><UploadField kind="claims" name="photoUrl" label="Foto bukti kegiatan lembur (wajib)" /></div>
        <button className="btn sm:col-span-2" disabled={busy || hours < 0.5}>{busy ? "Mengirim…" : "Kirim pengajuan lembur"}</button>
      </form>
      <div className="card max-h-[60vh] overflow-auto p-0 shadow-sm"><p className="px-5 pb-3 pt-4 font-bold">Riwayat lembur saya</p>
        {rows.length === 0 ? <Empty text="Belum ada pengajuan lembur." /> : <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-y border-slate-200 bg-slate-50"><tr>{["Tanggal", "Jam", "Kegiatan", "Foto", "Nominal", "Status", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((r) => <tr key={r.id} className="align-top hover:bg-slate-50/70"><td className="td whitespace-nowrap">{tgl(r.workDate)}</td><td className="td whitespace-nowrap">{r.startTime}–{r.endTime}<span className="block text-xs text-slate-500">{Number(r.hours)} jam • {r.dayType === "holiday" ? "hari libur" : "hari kerja"}</span></td><td className="td min-w-[220px]">{r.activity}{r.adminNote && <span className="mt-1 block text-xs text-slate-500">Catatan admin: {r.adminNote}</span>}</td><td className="td"><Photo url={r.photoUrl} onOpen={setImg} /></td>
            <td className="td whitespace-nowrap font-semibold tabular-nums">{rp(r.amount)}<span className="block text-xs font-normal text-slate-500">{r.status === "approved" ? `Gaji ${r.payPeriod}` : r.status === "pending" ? "estimasi" : ""}</span></td><td className="td"><Pill v={r.status} /></td>
            <td className="td text-right">{r.status === "pending" && <button className={D} onClick={() => { if (confirm("Batalkan pengajuan lembur ini?")) api(`/api/overtime/${r.id}`, "DELETE").then(load).catch((x) => setErr(x.message)); }}>Batalkan</button>}</td></tr>)}</tbody></table>}</div>
    </div>
  );
}
function Admin({ rows, load, err, setErr, setImg }: any) {
  const [tab, setTab] = useState("pending"); const [per, setPer] = useState(""); const [q, setQ] = useState(""); const [rej, setRej] = useState<any>(null);
  const pers = Array.from(new Set(rows.map((r: any) => ymOf(dateOf(r))))).sort().reverse() as string[];
  const shown = rows.filter((r: any) => (!tab || r.status === tab) && (!per || ymOf(dateOf(r)) === per) && (!q || `${r.employee.name} ${r.activity}`.toLowerCase().includes(q.toLowerCase())));
  const approvedSum = rows.filter((r: any) => r.status === "approved" && (!per || ymOf(dateOf(r)) === per)).reduce((t: number, r: any) => t + Number(r.amount), 0);
  const run = (p: Promise<any>) => p.then(() => { setErr(""); load(); }).catch((x) => { setErr(x.message); load(); });
  const approve = (r: any) => run(api(`/api/overtime/${r.id}`, "POST", { action: "approve" }));
  const approveAll = async () => { const list = shown.filter((r: any) => r.status === "pending"); if (!list.length || !confirm(`Setujui ${list.length} pengajuan lembur yang tampil?`)) return; await run((async () => { for (const r of list) await api(`/api/overtime/${r.id}`, "POST", { action: "approve" }); })()); };
  async function reject(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)), r = rej; setRej(null); await run(api(`/api/overtime/${r.id}`, "POST", { action: "reject", ...f })); }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3"><div className="mr-auto"><h1 className="text-2xl font-extrabold text-ink">Lembur Karyawan</h1><p className="mt-0.5 text-sm text-slate-500">Tinjau kegiatan dan foto bukti. Lembur yang disetujui otomatis masuk ke slip gaji (kolom lembur) periode terkait.</p></div>
        <select className="inp max-w-[11rem]" value={per} onChange={(e) => setPer(e.target.value)} aria-label="Periode"><option value="">Semua periode</option>{pers.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <input className="inp max-w-xs" placeholder="Cari nama atau kegiatan…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex flex-wrap items-center gap-2" role="tablist">{[["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"], ["", "Semua"]].map(([v, l]) => { const n = rows.filter((r: any) => !v || r.status === v).length, on = tab === v; return <button key={l} role="tab" aria-selected={on} onClick={() => setTab(v)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${on ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{l}<span className={`rounded-full px-1.5 text-xs font-semibold ${on ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{n}</span></button>; })}
        {tab === "pending" && shown.length > 1 && <button className={B} onClick={approveAll}>Setujui semua ({shown.length})</button>}
        <span className="ml-auto rounded-lg bg-paper px-3 py-1.5 text-sm">Total lembur disetujui{per ? ` ${per}` : ""}: <b className="text-moss">{rp(approvedSum)}</b></span></div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card max-h-[70vh] overflow-auto p-0 shadow-sm">{shown.length === 0 ? <Empty text="Tidak ada pengajuan lembur." /> :
        <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50"><tr>{["Karyawan", "Tanggal & jam", "Kegiatan", "Foto", "Nominal", "Status", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{shown.map((r: any) => <tr key={r.id} className="align-top hover:bg-slate-50/70"><td className="td whitespace-nowrap font-semibold text-ink">{r.employee.name}<span className="block text-xs font-normal text-slate-500">{r.employee.position}</span></td>
            <td className="td whitespace-nowrap">{tgl(r.workDate)}<span className="block text-xs text-slate-500">{r.startTime}–{r.endTime} • {Number(r.hours)} jam • {r.dayType === "holiday" ? "hari libur" : "hari kerja"}</span></td><td className="td min-w-[240px]">{r.activity}{r.adminNote && <span className="mt-1 block text-xs text-slate-500">Catatan: {r.adminNote}</span>}</td><td className="td"><Photo url={r.photoUrl} onOpen={setImg} /></td>
            <td className="td whitespace-nowrap font-semibold tabular-nums">{rp(r.amount)}<span className="block text-xs font-normal text-slate-500">{r.status === "approved" ? `Gaji ${r.payPeriod}${r.payrollId ? " (sudah di slip)" : " (masuk saat slip dibuat)"}` : r.status === "pending" ? "estimasi" : ""}</span></td><td className="td"><Pill v={r.status} /></td>
            <td className="td"><div className="flex flex-wrap justify-end gap-1.5">{r.status === "pending" && <><button className={B} onClick={() => approve(r)}>Setujui</button><button className={D} onClick={() => setRej(r)}>Tolak</button></>}</div></td></tr>)}</tbody></table>}</div>
      {rej && <Modal title="Tolak pengajuan lembur" onClose={() => setRej(null)}><form onSubmit={reject} className="space-y-3"><p className="text-sm">{rej.employee.name} • {tgl(rej.workDate)} • {Number(rej.hours)} jam</p><Field l="Alasan penolakan (wajib)"><textarea name="note" rows={2} required className="inp" /></Field><button className="btn w-full !bg-red-700">Tolak pengajuan</button></form></Modal>}
    </div>
  );
}
