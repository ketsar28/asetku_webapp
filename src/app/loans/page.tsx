"use client";
import { useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PayFields, UploadField, rp, tgl } from "../ui";
import { due } from "@/lib/pricing";
const ONLINE = process.env.NEXT_PUBLIC_ONLINE_PAYMENT === "true";
const B = "btn !px-3 !py-1.5 !text-[13px]", G = "btn-ghost !px-2.5 !py-1.5 !text-[13px]", D = "btn-ghost btn-danger !px-2.5 !py-1.5 !text-[13px]";
const TABS: [string, string][] = [["", "Semua"], ["pending", "Menunggu"], ["approved", "Disetujui"], ["on_loan", "Dipinjam"], ["overdue", "Terlambat"], ["returned", "Dikembalikan"], ["rejected", "Ditolak"]];
const sb = (n: React.ReactNode) => <span className="whitespace-nowrap">{n}</span>;
const actions: Record<string, [string, string][]> = { pending: [["approve", "Setujui"], ["reject", "Tolak"]], approved: [["checkout", "Serahkan"], ["reject", "Tolak"]], on_loan: [["checkin", "Terima kembali"]], overdue: [["checkin", "Terima kembali"]] };
export default function Loans() {
  const [rows, setRows] = useState<any[]>([]); const [staff, setStaff] = useState(false); const [err, setErr] = useState("");
  const [dlg, setDlg] = useState<{ id: number; action: string } | null>(null); const [filter, setFilter] = useState(""); const [proof, setProof] = useState<number | null>(null); const [ver, setVer] = useState<any>(null); const [ext, setExt] = useState<any>(null); const [bd, setBd] = useState<{ action: string; items: any[] } | null>(null); const [openG, setOpenG] = useState<Record<string, boolean>>({});
  const load = () => api("/api/loans").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); api("/api/me").then((m) => setStaff(m.role !== "user")); }, []);
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { await api(dlg!.action === "refund" ? `/api/loans/${dlg!.id}/refund` : `/api/loans/${dlg!.id}`, "POST", { action: dlg!.action, ...Object.fromEntries(new FormData(e.currentTarget)) }); setDlg(null); setErr(""); load(); }
    catch (x: any) { setErr(x.message); setDlg(null); }
  }
  async function extend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { const d = await api(`/api/loans/${ext.id}/extend`, "POST", Object.fromEntries(new FormData(e.currentTarget))); location.href = `/checkout?group=${d.groupNo}`; } catch (x: any) { setErr(x.message); setExt(null); }
  }
  async function sendProof(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f: any = Object.fromEntries(new FormData(e.currentTarget));
    if (!f.proofUrl) { setErr("Bukti transfer wajib diunggah."); return; }
    try { await api(`/api/loans/${proof}/proof`, "POST", f); setProof(null); setErr(""); load(); } catch (x: any) { setErr(x.message); }
  }
  const verify = (action: string, note?: string) => api(`/api/loans/${ver.id}/verify`, "POST", { action, note }).then(() => { setVer(null); load(); }).catch((x) => { setErr(x.message); setVer(null); });
  const pay = (id: number) => api("/api/payments", "POST", { loanId: id }).then((d) => { location.href = d.redirectUrl; }).catch((x) => setErr(x.message));
  const act = (id: number, action: string) => action === "approve" || (action === "checkout" && (!Number(rows.find((x) => x.id === id)?.rentalFee) || rows.find((x) => x.id === id)?.paymentStatus === "paid")) ? api(`/api/loans/${id}`, "POST", { action }).then(load).catch((x) => setErr(x.message)) : setDlg({ id, action });
  const shown = rows.filter((r) => !filter || r.status === filter);
  // ---- Pesanan banyak aset (satu keranjang): aksi sekali tekan untuk semua aset
  const batch = (action: string, items: any[], per: any = {}, body: any = {}) => api("/api/loans/batch", "POST", { action, items: items.map((x) => ({ id: x.id, ...(per[x.id] ?? {}) })), ...body })
    .then((r) => { setErr(r.failed?.length ? `${r.done} berhasil, ${r.failed.length} gagal: ${Array.from(new Set(r.failed.map((f: any) => f.error))).join("; ")}` : ""); load(); }).catch((x) => setErr(x.message));
  const gact = (items: any[], action: string) => {
    if (!items.length) return;
    const needPay = action === "checkout" && items.some((x) => Number(x.rentalFee) > 0 && x.paymentStatus !== "paid");
    if (action === "approve" || (action === "checkout" && !needPay)) batch(action, items); else setBd({ action, items });
  };
  async function sendBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f: any = Object.fromEntries(new FormData(e.currentTarget)), per: any = {};
    for (const x of bd!.items) per[x.id] = { condition: f[`cond-${x.id}`], damageFee: Number(f[`fee-${x.id}`]) || 0 };
    await batch(bd!.action, bd!.items, per, { note: f.note, paymentMethod: f.paymentMethod, bankName: f.bankName, accountName: f.accountName, accountNo: f.accountNo }); setBd(null);
  }
  const groups = Object.values(shown.reduce((m: Record<string, any[]>, r) => { const k = r.groupNo ?? `s${r.id}`; (m[k] ??= []).push(r); return m; }, {})) as any[][];
  const vg = ver ? rows.filter((x) => x.paymentOrderId && x.paymentOrderId === ver.paymentOrderId) : [];
  const groupRow = (g: any[]) => {
    const r0 = g[0], same = new Set(g.map((x) => x.status)).size === 1, total = g.reduce((t, x) => t + due(x), 0), fine = g.reduce((t, x) => t + Number(x.fineAmount), 0);
    const pend = g.filter((x) => x.status === "pending"), appr = g.filter((x) => x.status === "approved"), back = g.filter((x) => ["on_loan", "overdue"].includes(x.status) && !x.extensionOf), rej = g.filter((x) => ["pending", "approved"].includes(x.status));
    const verifying = g.find((x) => x.paymentStatus === "verifying"), paidOne = g.find((x) => ["paid", "refunded"].includes(x.paymentStatus)), withProof = g.find((x) => x.proofUrl);
    const payable = g.some((x) => ["pending", "approved"].includes(x.status) && x.paymentStatus === "unpaid" && Number(x.rentalFee) > 0), hand = g.some((x) => ["approved", "on_loan", "overdue", "returned"].includes(x.status));
    return (
      <tr key={r0.groupNo} className="align-top transition hover:bg-slate-50/70">
        <td className="td !py-3.5 whitespace-nowrap font-mono text-xs text-slate-500">{r0.groupNo}<span className="mt-1.5 block"><span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-moss">{g.length} aset</span></span></td>
        <td className="td !py-3.5 min-w-[320px]">{(() => {
          const isOpen = !!openG[r0.groupNo], many = g.length > 3, list = many && !isOpen ? g.slice(0, 3) : g;
          const sum = Object.entries(g.reduce((m: Record<string, number>, x) => { m[x.status] = (m[x.status] ?? 0) + 1; return m; }, {}));
          return <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60">
            {many && <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2">{sum.map(([st, n]) => <span key={st} className="inline-flex items-center gap-1 whitespace-nowrap"><b className="text-xs text-slate-600">{n}</b><Badge v={st} /></span>)}</div>}
            <ul className={`divide-y divide-slate-100 ${many && isOpen ? "max-h-64 overflow-y-auto" : ""}`}>{list.map((x) => <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2"><span className="min-w-0"><span className="block font-semibold text-ink">{x.asset.name}</span>{!x.extensionOf && x.status === "on_loan" && <button className="text-xs font-medium text-moss underline underline-offset-2" onClick={() => setExt(x)}>Perpanjang</button>}</span><span className="shrink-0">{sb(<Badge v={x.status} />)}</span></li>)}</ul>
            {many && <button className="w-full border-t border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-slate-50" onClick={() => setOpenG((o) => ({ ...o, [r0.groupNo]: !isOpen }))}>{isOpen ? "Ringkas daftar ▴" : `Lihat semua ${g.length} aset ▾`}</button>}
          </div>;
        })()}</td>
        {staff && <td className="td !py-3.5 font-medium text-slate-700">{r0.user.name}</td>}
        <td className="td !py-3.5 whitespace-nowrap"><span className="block">{tgl(r0.startDate)}</span><span className="block text-xs text-slate-400">s/d {tgl(r0.expectedReturnDate)}</span></td>
        <td className="td !py-3.5">{same ? sb(<Badge v={r0.status} />) : <span className="text-xs text-slate-500">Beragam</span>}</td>
        <td className="td !py-3.5 whitespace-nowrap font-semibold tabular-nums text-ink">{total > 0 ? rp(total) : <span className="font-medium text-slate-500">Gratis</span>}</td>
        <td className="td !py-3.5">{total > 0 ? (new Set(g.map((x) => x.paymentStatus)).size === 1 ? sb(<Badge v={r0.paymentStatus} />) : <span className="text-xs text-slate-500">Beragam</span>) : "-"}</td>
        <td className="td !py-3.5 whitespace-nowrap tabular-nums">{fine ? <span className="font-semibold text-red-700">{rp(fine)}</span> : <span className="text-slate-300">-</span>}</td>
        <td className="td !py-3.5 min-w-[200px]"><div className="flex flex-wrap items-center justify-end gap-1.5">
          {!staff && payable && <a className={B} href={`/checkout?group=${r0.groupNo}`}>Bayar semua</a>}
          {!staff && pend.length > 0 && <button className={D} onClick={() => confirm(`Batalkan ${pend.length} pesanan yang masih menunggu?`) && Promise.all(pend.map((x) => api(`/api/loans/${x.id}`, "DELETE"))).then(load).catch((x) => setErr(x.message))}>Batalkan semua</button>}
          {staff && verifying && <button className={B} onClick={() => setVer(verifying)}>Cek bukti</button>}
          {staff && pend.length > 0 && <button className={B} onClick={() => gact(pend, "approve")}>Setujui semua ({pend.length})</button>}
          {staff && appr.length > 0 && <button className={B} onClick={() => gact(appr, "checkout")}>Serahkan semua ({appr.length})</button>}
          {staff && back.length > 0 && <button className={B} onClick={() => gact(back, "checkin")}>Terima kembali semua ({back.length})</button>}
          {staff && rej.length > 0 && <button className={D} onClick={() => gact(rej, "reject")}>Tolak semua</button>}
          {withProof && <a className={G} href={`${withProof.proofUrl}?download=1`}>Unduh bukti</a>}
          {hand && <a className={G} href={`/api/loans/${r0.id}/handover?all=1`} target="_blank" rel="noreferrer">Berita acara</a>}
          {paidOne && <a className={G} href={`/api/loans/${paidOne.id}/receipt?all=1`} target="_blank" rel="noreferrer">Kwitansi</a>}
        </div></td>
      </tr>
    );
  };
  const rowOf = (r: any) => (
    <tr key={r.id} className="align-top transition hover:bg-slate-50/70"><td className="td !py-3.5 whitespace-nowrap font-mono text-xs text-slate-500">{r.requestNumber}</td><td className="td !py-3.5 min-w-[250px] font-semibold text-ink">{r.asset.name}</td>{staff && <td className="td !py-3.5 font-medium text-slate-700">{r.user.name}</td>}
              <td className="td !py-3.5 whitespace-nowrap"><span className="block">{tgl(r.startDate)}</span><span className="block text-xs text-slate-400">s/d {tgl(r.expectedReturnDate)}</span></td><td className="td !py-3.5">{sb(<Badge v={r.status} />)}</td>
              <td className="td !py-3.5 whitespace-nowrap font-semibold tabular-nums text-ink">{Number(r.rentalFee) ? <>{rp(due(r))}{Number(r.vatAmount) > 0 && <span className="block text-xs font-normal text-slate-500">termasuk PPN{r.insurance ? " + asuransi" : ""}</span>}</> : <span className="font-medium text-slate-500">Gratis</span>}</td>
              <td className="td !py-3.5">{Number(r.rentalFee) ? sb(<Badge v={r.paymentStatus} />) : <span className="text-slate-300">-</span>}</td>
              <td className="td !py-3.5 whitespace-nowrap tabular-nums">{Number(r.fineAmount) ? <span className="font-semibold text-red-700">{rp(r.fineAmount)}</span> : <span className="text-slate-300">-</span>}</td>
              <td className="td !py-3.5 min-w-[200px]"><div className="flex flex-wrap items-center justify-end gap-1.5">{!staff && (r.status === "pending" || r.status === "approved") && r.paymentStatus === "unpaid" && Number(r.rentalFee) > 0 && <a className={B} href={`/checkout?${r.groupNo ? `group=${r.groupNo}` : `loan=${r.id}`}`}>Bayar</a>}{!staff && r.status === "pending" && <button className={D} onClick={() => confirm("Batalkan pengajuan ini?") && api(`/api/loans/${r.id}`, "DELETE").then(load).catch((x) => setErr(x.message))}>Batalkan</button>}{!r.extensionOf && r.status === "on_loan" && <button className={G} onClick={() => setExt(r)}>Perpanjang</button>}{["approved", "on_loan", "overdue", "returned"].includes(r.status) && <a className={G} href={`/api/loans/${r.id}/handover`} target="_blank" rel="noreferrer">Berita acara</a>}{r.proofUrl && <a className={G} href={`${r.proofUrl}?download=1`}>Unduh bukti</a>}{["paid", "refunded"].includes(r.paymentStatus) && <a className={G} href={`/api/loans/${r.id}/receipt`} target="_blank" rel="noreferrer">Kwitansi</a>}{staff && r.paymentStatus === "verifying" && <button className={B} onClick={() => setVer(r)}>Cek bukti</button>}{staff && r.paymentStatus === "refund_due" && <button className={B} onClick={() => setDlg({ id: r.id, action: "refund" })}>Proses refund</button>}{staff && (r.extensionOf && r.status === "on_loan" ? [] : actions[r.status] ?? []).map(([a, l]) => <button key={a} className={a === "reject" ? D : B} onClick={() => act(r.id, a)}>{l}</button>)}</div></td></tr>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3"><div className="mr-auto"><h1 className="text-2xl font-extrabold text-ink">{staff ? "Pengajuan & Serah Terima" : "Peminjaman Saya"}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{staff ? "Kelola pengajuan sewa, serah terima, dan pengembalian aset." : "Pantau status dan riwayat peminjaman Anda."}</p></div>
        {staff && <a className="btn-ghost" href="/api/export?type=loans">Export Excel</a>}<button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button></div>
      <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Filter status">
        {TABS.map(([v, l]) => { const n = v ? rows.filter((r) => r.status === v).length : rows.length, on = filter === v;
          return <button key={v || "all"} role="tab" aria-selected={on} onClick={() => setFilter(v)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{l}<span className={`rounded-full px-1.5 text-xs font-semibold ${on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{n}</span></button>; })}
      </div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card max-h-[75vh] overflow-auto p-0 shadow-sm">
        {shown.length === 0 ? <Empty text="Belum ada peminjaman." /> :
        <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50"><tr>{["No. pengajuan", "Aset", ...(staff ? ["Peminjam"] : []), "Periode", "Status", "Total tagihan", "Pembayaran", "Denda", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{groups.map((g) => (g.length > 1 ? groupRow(g) : rowOf(g[0])))}</tbody></table>}
      </div>
      {bd && <Modal title={bd.action === "reject" ? `Tolak ${bd.items.length} aset` : bd.action === "checkout" ? `Serahkan ${bd.items.length} aset & terima pembayaran` : `Terima pengembalian ${bd.items.length} aset`} onClose={() => setBd(null)}>
        <form onSubmit={sendBatch} className="space-y-3">
          <ul className="rounded-lg border bg-paper p-3 text-sm">{bd.items.map((x) => <li key={x.id}>• {x.asset.name} <span className="text-xs text-slate-500">({x.asset.assetCode})</span></li>)}</ul>
          {["checkout", "checkin"].includes(bd.action) && <PayFields def={bd.items[0]} label={bd.action === "checkout" ? "Pembayaran sewa" : "Pembayaran denda (jika ada)"} />}
          {bd.action === "checkin" && bd.items.map((x) => <div key={x.id} className="grid grid-cols-2 gap-2 rounded-lg border p-2"><p className="col-span-2 text-sm font-semibold">{x.asset.name}</p>
            <Field l="Kondisi"><select name={`cond-${x.id}`} className="inp"><option value="good">Baik</option><option value="damaged">Rusak</option><option value="maintenance">Perlu perawatan</option></select></Field>
            <Field l="Denda kerusakan (Rp)"><input name={`fee-${x.id}`} type="number" min="0" className="inp" /></Field></div>)}
          <Field l={bd.action === "reject" ? "Alasan penolakan" : "Catatan (opsional)"}><textarea name="note" rows={3} className="inp" required={bd.action === "reject"} /></Field>
          <button className="btn w-full">Konfirmasi untuk semua</button>
        </form></Modal>}
      {ext && <Modal title={`Perpanjang sewa ${ext.asset.name}`} onClose={() => setExt(null)}><form onSubmit={extend} className="space-y-3">
        <p className="rounded-lg bg-paper p-3 text-sm">Batas kembali saat ini: <b>{tgl(ext.expectedReturnDate)}</b>. Perpanjangan dihitung mulai hari berikutnya, lalu disetujui dan dibayar seperti pesanan biasa.</p>
        <Field l="Perpanjang sampai tanggal" req><input name="newEnd" type="date" min={new Date(+new Date(ext.expectedReturnDate) + 86400000).toISOString().slice(0, 10)} className="inp" required /></Field><button className="btn w-full">Ajukan perpanjangan</button></form></Modal>}
      {proof && <Modal title="Upload bukti transfer" onClose={() => setProof(null)}>
        <form onSubmit={sendProof} className="space-y-3">
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
          <p className="rounded-lg bg-paper p-2 text-sm">Transfer ke: <b>{process.env.NEXT_PUBLIC_TRANSFER_INFO ?? "hubungi admin untuk nomor rekening"}</b></p>
          <PayFields label="Cara transfer" />
          <UploadField kind="proofs" name="proofUrl" label="Foto / screenshot bukti transfer" required={true} />
          <button className="btn w-full">Kirim bukti</button>
        </form></Modal>}
      {ver && <Modal title="Verifikasi bukti transfer" onClose={() => setVer(null)}>
        <div className="space-y-3 text-sm"><p><b>{ver.user.name}</b> • {vg.length > 1 ? `${vg.length} aset` : ver.requestNumber} • {rp(vg.length ? vg.reduce((t, x) => t + due(x), 0) : due(ver))}</p>{vg.length > 1 && <ul className="rounded-lg border bg-paper p-2">{vg.map((x) => <li key={x.id}>• {x.asset.name} <span className="text-slate-500">{rp(due(x))}</span></li>)}</ul>}<p>{ver.bankName} • {ver.accountName} • {ver.accountNo}</p>
          <a href={ver.proofUrl} target="_blank" rel="noreferrer"><img src={ver.proofUrl} alt="Bukti transfer" className="max-h-80 w-full rounded-lg border object-contain" /></a>
          <a className="btn-ghost" href={`${ver.proofUrl}?download=1`}>Unduh bukti pembayaran</a>
          <div className="grid gap-2"><button className="btn" onClick={() => verify("approve")}>Terima pembayaran</button>
            <button className="btn-ghost btn-danger justify-center" onClick={() => { const n = prompt("Alasan menolak pesanan (uang yang sudah masuk akan dikembalikan ke Saldo Dompet penyewa):"); if (n?.trim()) verify("refund", n); }}>Tolak pesanan & refund ke dompet</button>
            <button className="btn-ghost justify-center" onClick={() => { const n = prompt("Alasan bukti tidak valid (mis. nominal tidak sesuai):"); if (n !== null) verify("reject", n); }}>Bukti tidak valid (uang belum diterima)</button></div>
          <p className="text-xs text-slate-500">Jika uang sudah masuk ke rekening tetapi pesanan tidak bisa diproses, pilih <b>Tolak pesanan & refund</b>. Jangan pilih "Bukti tidak valid", karena tagihan kembali belum dibayar.</p></div></Modal>}
      {dlg && <Modal title={dlg.action === "refund" ? "Kreditkan refund ke Saldo Dompet" : dlg.action === "reject" ? "Tolak pengajuan" : dlg.action === "checkout" ? "Serahkan aset & terima pembayaran sewa" : "Terima pengembalian"} onClose={() => setDlg(null)}>
        <form onSubmit={send} className="space-y-3">
          {["checkout", "checkin"].includes(dlg.action) && <PayFields def={rows.find((x) => x.id === dlg.id)} label={dlg.action === "refund" ? "Refund dibayarkan dengan" : dlg.action === "checkout" ? "Pembayaran sewa" : "Pembayaran denda (jika ada)"} />}
          {dlg.action === "checkin" && <Field l="Denda kerusakan (Rp, opsional)"><input name="damageFee" type="number" min="0" className="inp" /></Field>}
          {dlg.action === "checkin" && <Field l="Kondisi aset saat kembali"><select name="condition" className="inp"><option value="good">Baik</option><option value="damaged">Rusak</option><option value="maintenance">Perlu perawatan</option></select></Field>}
          <Field l={dlg.action === "reject" ? "Alasan penolakan" : "Catatan (opsional)"}><textarea name="note" rows={3} className="inp" required={dlg.action === "reject"} /></Field>
          <button className="btn w-full">Konfirmasi</button>
        </form></Modal>}
    </div>
  );
}
