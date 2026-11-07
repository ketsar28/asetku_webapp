"use client";
import { useEffect, useState } from "react";
import { api, Empty, Field, Modal, PayFields, UploadField, rp, tgl } from "../ui";
import { CLAIM_CATEGORIES } from "@/lib/reimburse";
const B = "btn !px-3 !py-1.5 !text-[13px]", D = "btn-ghost btn-danger !px-2.5 !py-1.5 !text-[13px]";
const ST: Record<string, [string, string]> = { pending: ["Menunggu", "bg-amber-50 text-amber-800"], paid: ["Sudah dibayar", "bg-emerald-50 text-emerald-800"], rejected: ["Ditolak", "bg-red-50 text-red-800"] };
const Pill = ({ v }: { v: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${(ST[v] ?? ["", ""])[1]}`}>{(ST[v] ?? [v, ""])[0]}</span>;
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const ymOf = (d: string) => String(d).slice(0, 7);
const Nota = ({ url, onOpen }: { url: string; onOpen: (u: string) => void }) => <button type="button" onClick={() => onOpen(url)} aria-label="Lihat foto nota"><img src={url} alt="Foto nota" className="h-12 w-12 rounded-lg border object-cover" /></button>;
export default function Reimburse() {
  const [role, setRole] = useState(""); const [data, setData] = useState<any>({ rows: [] }); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [img, setImg] = useState("");
  const load = () => api("/api/reimbursements").then(setData).catch((e) => setErr(e.message));
  useEffect(() => { api("/api/me").then((m) => setRole(m.role)); load(); }, []);
  if (!role) return <Empty text="Memuat…" />;
  return <>{role === "employee" ? <Mine data={data} load={load} err={err} setErr={setErr} msg={msg} setMsg={setMsg} setImg={setImg} /> : <Admin rows={data.rows} load={load} err={err} setErr={setErr} setImg={setImg} />}
    {img && <Modal title="Foto nota / bukti pengeluaran" onClose={() => setImg("")}><a href={img} target="_blank" rel="noreferrer"><img src={img} alt="Foto nota" className="max-h-[70vh] w-full rounded-lg border object-contain" /></a></Modal>}</>;
}
function Mine({ data, load, err, setErr, msg, setMsg, setImg }: any) {
  const rows: any[] = data.rows ?? [], ym = todayStr().slice(0, 7); const [fk, setFk] = useState(0); const [busy, setBusy] = useState(false);
  const month = rows.filter((r) => ymOf(String(r.expenseDate)) === ym && r.status !== "rejected");
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    try { await api("/api/reimbursements", "POST", Object.fromEntries(new FormData(e.currentTarget))); setMsg("Pengajuan reimburse terkirim. Admin akan meninjau dan membayarnya."); setFk((k) => k + 1); load(); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold text-ink">Reimburse</h1><p className="mt-0.5 text-sm text-slate-500">{data.employee ? `${data.employee.name} • ${data.employee.position}. ` : ""}Ajukan penggantian biaya penunjang kantor (bensin, makan, parkir, dan lainnya) dengan foto nota.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{[["Menunggu persetujuan", `${rows.filter((r) => r.status === "pending").length} pengajuan`], ["Sudah dibayar bulan ini", rp(month.filter((r) => r.status === "paid").reduce((t, r) => t + Number(r.amount), 0))], ["Menunggu dibayar", rp(rows.filter((r) => r.status === "pending").reduce((t, r) => t + Number(r.amount), 0))]].map(([l, v]) => <div key={l} className="card"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-extrabold">{v}</p></div>)}</div>
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <form key={fk} onSubmit={send} className="card grid gap-3 sm:grid-cols-2">
        <p className="font-bold sm:col-span-2">Ajukan reimburse baru</p>
        <Field l="Jenis biaya"><select name="category" className="inp" required defaultValue=""><option value="" disabled>Pilih jenis biaya</option>{CLAIM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field l="Tanggal pengeluaran"><input name="expenseDate" type="date" className="inp" required max={todayStr()} defaultValue={todayStr()} /></Field>
        <Field l="Nominal (Rp)"><input name="amount" type="number" min="1" max="50000000" step="1" className="inp" required /></Field>
        <div className="hidden sm:block" />
        <div className="sm:col-span-2"><Field l="Keperluan"><textarea name="description" rows={3} required minLength={5} className="inp" placeholder="Contoh: Bensin motor untuk mengantar berkas ke kantor cabang, 12 Nov" /></Field></div>
        <div className="sm:col-span-2"><UploadField kind="claims" name="receiptUrl" label="Foto nota / bukti pengeluaran (wajib)" /></div>
        <button className="btn sm:col-span-2" disabled={busy}>{busy ? "Mengirim…" : "Kirim pengajuan reimburse"}</button>
      </form>
      <div className="card max-h-[60vh] overflow-auto p-0 shadow-sm"><p className="px-5 pb-3 pt-4 font-bold">Riwayat reimburse saya</p>
        {rows.length === 0 ? <Empty text="Belum ada pengajuan reimburse." /> : <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-y border-slate-200 bg-slate-50"><tr>{["No.", "Tanggal", "Jenis & keperluan", "Nota", "Nominal", "Status", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((r) => <tr key={r.id} className="align-top hover:bg-slate-50/70"><td className="td whitespace-nowrap font-mono text-xs text-slate-500">{r.claimNo}</td><td className="td whitespace-nowrap">{tgl(r.expenseDate)}</td><td className="td min-w-[220px]"><b>{r.category}</b><span className="block text-slate-600">{r.description}</span>{r.adminNote && <span className="mt-1 block text-xs text-slate-500">Catatan admin: {r.adminNote}</span>}</td><td className="td"><Nota url={r.receiptUrl} onOpen={setImg} /></td>
            <td className="td whitespace-nowrap font-semibold tabular-nums">{rp(r.amount)}</td><td className="td"><Pill v={r.status} />{r.paidAt && <span className="mt-1 block text-xs text-slate-500">{tgl(r.paidAt)}</span>}</td>
            <td className="td text-right">{r.status === "pending" && <button className={D} onClick={() => { if (confirm("Batalkan pengajuan reimburse ini?")) api(`/api/reimbursements/${r.id}`, "DELETE").then(load).catch((x) => setErr(x.message)); }}>Batalkan</button>}</td></tr>)}</tbody></table>}</div>
    </div>
  );
}
function Admin({ rows, load, err, setErr, setImg }: any) {
  const [tab, setTab] = useState("pending"); const [per, setPer] = useState(""); const [q, setQ] = useState(""); const [dlg, setDlg] = useState<{ kind: "pay" | "reject"; r: any } | null>(null);
  const pers = Array.from(new Set(rows.map((r: any) => ymOf(String(r.expenseDate))))).sort().reverse() as string[];
  const shown = rows.filter((r: any) => (!tab || r.status === tab) && (!per || ymOf(String(r.expenseDate)) === per) && (!q || `${r.employee.name} ${r.category} ${r.description}`.toLowerCase().includes(q.toLowerCase())));
  const sum = (st: string) => rows.filter((r: any) => r.status === st && (!per || ymOf(String(r.expenseDate)) === per)).reduce((t: number, r: any) => t + Number(r.amount), 0);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)), d = dlg!; setDlg(null);
    await api(`/api/reimbursements/${d.r.id}`, "POST", { action: d.kind, ...f }).then(() => { setErr(""); load(); }).catch((x) => { setErr(x.message); load(); });
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3"><div className="mr-auto"><h1 className="text-2xl font-extrabold text-ink">Reimburse Karyawan</h1><p className="mt-0.5 text-sm text-slate-500">Periksa foto nota, lalu bayar. Pembayaran otomatis tercatat sebagai kas keluar di Laporan Keuangan.</p></div>
        <select className="inp max-w-[11rem]" value={per} onChange={(e) => setPer(e.target.value)} aria-label="Periode"><option value="">Semua periode</option>{pers.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <input className="inp max-w-xs" placeholder="Cari nama, jenis, atau keperluan…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex flex-wrap items-center gap-2" role="tablist">{[["pending", "Menunggu"], ["paid", "Sudah dibayar"], ["rejected", "Ditolak"], ["", "Semua"]].map(([v, l]) => { const n = rows.filter((r: any) => !v || r.status === v).length, on = tab === v; return <button key={l} role="tab" aria-selected={on} onClick={() => setTab(v)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${on ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{l}<span className={`rounded-full px-1.5 text-xs font-semibold ${on ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{n}</span></button>; })}
        <span className="ml-auto rounded-lg bg-paper px-3 py-1.5 text-sm">Menunggu dibayar: <b className="text-amber-700">{rp(sum("pending"))}</b> • Sudah dibayar: <b className="text-moss">{rp(sum("paid"))}</b></span></div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card max-h-[70vh] overflow-auto p-0 shadow-sm">{shown.length === 0 ? <Empty text="Tidak ada pengajuan reimburse." /> :
        <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50"><tr>{["Karyawan", "Tanggal", "Jenis & keperluan", "Nota", "Nominal", "Status", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{shown.map((r: any) => <tr key={r.id} className="align-top hover:bg-slate-50/70"><td className="td whitespace-nowrap font-semibold text-ink">{r.employee.name}<span className="block text-xs font-normal text-slate-500">{r.claimNo}</span>{r.employee.bankName && <span className="block text-xs font-normal text-slate-500">{r.employee.bankName} {r.employee.accountNo}</span>}</td><td className="td whitespace-nowrap">{tgl(r.expenseDate)}</td>
            <td className="td min-w-[240px]"><b>{r.category}</b><span className="block text-slate-600">{r.description}</span>{r.adminNote && <span className="mt-1 block text-xs text-slate-500">Catatan: {r.adminNote}</span>}</td><td className="td"><Nota url={r.receiptUrl} onOpen={setImg} /></td>
            <td className="td whitespace-nowrap font-semibold tabular-nums">{rp(r.amount)}</td><td className="td"><Pill v={r.status} />{r.paidAt && <span className="mt-1 block text-xs text-slate-500">{tgl(r.paidAt)}</span>}</td>
            <td className="td"><div className="flex flex-wrap justify-end gap-1.5">{r.status === "pending" && <><button className={B} onClick={() => setDlg({ kind: "pay", r })}>Bayar</button><button className={D} onClick={() => setDlg({ kind: "reject", r })}>Tolak</button></>}</div></td></tr>)}</tbody></table>}</div>
      {dlg && <Modal title={dlg.kind === "pay" ? "Bayar reimburse" : "Tolak reimburse"} onClose={() => setDlg(null)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-lg border bg-paper p-3 text-sm"><p className="font-bold">{dlg.r.employee.name} • {dlg.r.category}</p><p className="text-slate-600">{dlg.r.description}</p><p className="mt-1 text-lg font-extrabold text-moss">{rp(dlg.r.amount)}</p></div>
          {dlg.kind === "pay" ? <><PayFields label="Dibayar dengan" def={{ paymentMethod: "transfer" }} /><Field l="Catatan (opsional)"><input name="note" className="inp" /></Field><p className="text-xs text-slate-500">Setelah dibayar, nominal ini langsung tercatat sebagai kas keluar kategori &quot;Reimburse karyawan&quot;.</p></>
            : <Field l="Alasan penolakan (wajib)"><textarea name="note" rows={2} required className="inp" /></Field>}
          <button className={`btn w-full ${dlg.kind === "reject" ? "!bg-red-700" : ""}`}>{dlg.kind === "pay" ? `Bayar ${rp(dlg.r.amount)}` : "Tolak pengajuan"}</button>
        </form></Modal>}
    </div>
  );
}
