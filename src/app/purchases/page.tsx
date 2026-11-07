"use client";
import { useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PayFields, rp, tgl } from "../ui";
const B = "btn !px-3 !py-1.5 !text-[13px]", G = "btn-ghost !px-2.5 !py-1.5 !text-[13px]", D = "btn-ghost btn-danger !px-2.5 !py-1.5 !text-[13px]";
const TABS: [string, string][] = [["", "Semua"], ["pending", "Menunggu"], ["approved", "Disetujui"], ["completed", "Selesai"], ["rejected", "Ditolak"]];
const sb = (n: React.ReactNode) => <span className="whitespace-nowrap">{n}</span>;
export default function Purchases() {
  const [rows, setRows] = useState<any[]>([]); const [staff, setStaff] = useState(false); const [err, setErr] = useState("");
  const [filter, setFilter] = useState(""); const [dlg, setDlg] = useState<{ kind: "reject" | "handover"; g: any[] } | null>(null);
  const [ver, setVer] = useState<any>(null); const [vnote, setVnote] = useState(""); const [openG, setOpenG] = useState<Record<string, boolean>>({});
  const load = () => api("/api/purchases").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); api("/api/me").then((m) => setStaff(m.role !== "user")); }, []);
  const run = (p: Promise<any>) => p.then(() => { setErr(""); load(); }).catch((x) => { setErr(x.message); load(); });
  const each = async (g: any[], fn: (r: any) => Promise<any>) => { for (const r of g) await fn(r); };
  const act = (g: any[], action: string) => run(each(g, (r) => api(`/api/purchases/${r.id}`, "POST", { action })));
  const cancel = (g: any[]) => { if (confirm("Batalkan pesanan pembelian ini? Stok akan dikembalikan.")) run(each(g, (r) => api(`/api/purchases/${r.id}`, "DELETE"))); };
  async function submitDlg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)), d = dlg!;
    const list = d.g.filter((r) => (d.kind === "reject" ? ["pending", "approved"].includes(r.status) : r.status === "approved"));
    setDlg(null); await run(each(list, (r) => api(`/api/purchases/${r.id}`, "POST", { action: d.kind, ...f })));
  }
  const verify = (action: string) => {
    if (action === "refund" && !vnote.trim()) { setErr("Isi alasan penolakan pesanan terlebih dahulu."); return; }
    return run(api(`/api/purchases/${ver.id}/verify`, "POST", { action, note: vnote })).then(() => { setVer(null); setVnote(""); });
  };
  const tolak = (g: any[], verifying: any) => { if (verifying) { setErr('Pembayaran pembeli sedang diverifikasi. Pilih "Tolak pesanan & refund ke dompet" di jendela ini.'); setVer(verifying); } else setDlg({ kind: "reject", g }); };
  const shown = rows.filter((r) => !filter || r.status === filter);
  const map = new Map<string, any[]>(); for (const r of shown) { const k = r.groupNo ?? r.orderNumber; map.set(k, [...(map.get(k) ?? []), r]); }
  const groups = Array.from(map.values());
  const verRows = ver ? rows.filter((r) => r.paymentOrderId === ver.paymentOrderId && r.paymentStatus === "verifying") : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3"><div className="mr-auto"><h1 className="text-2xl font-extrabold text-ink">{staff ? "Pesanan Pembelian" : "Pembelian Saya"}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{staff ? "Kelola pengajuan pembelian aset, verifikasi pembayaran, dan serah terima." : "Pantau status pembelian, pembayaran, dan serah terima aset Anda."}</p></div>
        {!staff && <a className="btn" href="/catalog">Beli aset lain</a>}<button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button></div>
      <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Filter status">
        {TABS.map(([v, l]) => { const n = v ? rows.filter((r) => r.status === v).length : rows.length, on = filter === v;
          return <button key={v || "all"} role="tab" aria-selected={on} onClick={() => setFilter(v)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{l}<span className={`rounded-full px-1.5 text-xs font-semibold ${on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{n}</span></button>; })}
      </div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card max-h-[75vh] overflow-auto p-0 shadow-sm">
        {groups.length === 0 ? <Empty text={staff ? "Belum ada pesanan pembelian." : "Belum ada pembelian. Pilih aset yang dijual di Katalog."} /> :
        <table className="w-full text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50"><tr>{["No. pesanan", "Barang", ...(staff ? ["Pembeli"] : []), "Tanggal", "Status", "Total", "Pembayaran", ""].map((h, i) => <th key={h || i} className="th !text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{groups.map((g) => {
            const r0 = g[0], k = r0.groupNo ?? r0.orderNumber, isOpen = !!openG[k], many = g.length > 3, list = many && !isOpen ? g.slice(0, 3) : g;
            const sameSt = new Set(g.map((x) => x.status)).size === 1, samePay = new Set(g.map((x) => x.paymentStatus)).size === 1;
            const total = g.reduce((t, x) => t + Number(x.totalAmount), 0), open = g.filter((x) => ["pending", "approved"].includes(x.status));
            const unpaid = open.some((x) => x.paymentStatus === "unpaid"), verifying = g.find((x) => x.paymentStatus === "verifying"), withProof = g.find((x) => x.proofUrl);
            const allPending = g.every((x) => x.status === "pending"), pend = g.some((x) => x.status === "pending"), appr = g.some((x) => x.status === "approved");
            return <tr key={k} className="align-top transition hover:bg-slate-50/70">
              <td className="td !py-3.5 whitespace-nowrap font-mono text-xs text-slate-500">{k}<span className="mt-1.5 block"><span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-moss">{g.length} aset</span>{g.some((x) => x.insurance) && <span className="ml-1 inline-block rounded-full bg-sky-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-sky-800">Asuransi</span>}</span></td>
              <td className="td !py-3.5 min-w-[300px]"><div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60">
                <ul className={`divide-y divide-slate-100 ${many && isOpen ? "max-h-64 overflow-y-auto" : ""}`}>{list.map((x) => <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2"><span className="min-w-0"><span className="block font-semibold text-ink">{x.asset.name}</span><span className="text-xs text-slate-500">{x.asset.assetCode} • {rp(x.price)}</span></span>{!sameSt && <span className="shrink-0">{sb(<Badge v={x.status} />)}</span>}</li>)}</ul>
                {many && <button className="w-full border-t border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-moss hover:bg-slate-50" onClick={() => setOpenG((o) => ({ ...o, [k]: !isOpen }))}>{isOpen ? "Ringkas daftar ▴" : `Lihat semua ${g.length} aset ▾`}</button>}</div></td>
              {staff && <td className="td !py-3.5 font-medium text-slate-700">{r0.user.name}</td>}
              <td className="td !py-3.5 whitespace-nowrap">{tgl(r0.createdAt)}</td>
              <td className="td !py-3.5">{sameSt ? sb(<Badge v={r0.status} />) : <span className="text-xs text-slate-500">Campur</span>}</td>
              <td className="td !py-3.5 whitespace-nowrap font-semibold tabular-nums text-ink">{rp(total)}</td>
              <td className="td !py-3.5">{samePay ? sb(<Badge v={r0.paymentStatus} />) : <span className="text-xs text-slate-500">Campur</span>}</td>
              <td className="td !py-3.5 min-w-[200px]"><div className="flex flex-wrap items-center justify-end gap-1.5">
                {!staff && unpaid && !verifying && <a className={B} href={`/buy-checkout?group=${r0.groupNo ?? ""}${r0.groupNo ? "" : `&order=${r0.id}`}`}>Bayar</a>}
                {!staff && allPending && !verifying && <button className={D} onClick={() => cancel(g)}>Batalkan</button>}
                {staff && pend && <button className={B} onClick={() => act(g.filter((x) => x.status === "pending"), "approve")}>Setujui</button>}
                {staff && appr && <button className={B} onClick={() => setDlg({ kind: "handover", g })}>Serahkan</button>}
                {staff && verifying && <button className={B} onClick={() => setVer(verifying)}>Cek bukti</button>}
                {staff && (pend || appr) && <button className={D} onClick={() => tolak(g, verifying)}>Tolak</button>}
                {withProof && <a className={G} href={`${withProof.proofUrl}?download=1`}>Unduh bukti</a>}
                {g.some((x) => ["approved", "completed"].includes(x.status)) && <a className={G} href={`/api/purchases/${r0.id}/receipt?all=1`} target="_blank" rel="noreferrer">Struk / BA</a>}
                {g.some((x) => x.adminNote && x.status === "rejected") && <span className="basis-full text-right text-xs text-slate-500">{g.find((x) => x.adminNote)?.adminNote}</span>}
              </div></td></tr>; })}</tbody></table>}
      </div>
      {dlg && <Modal title={dlg.kind === "reject" ? "Tolak pesanan pembelian" : "Serah terima aset"} onClose={() => setDlg(null)}>
        <form onSubmit={submitDlg} className="space-y-3">
          <ul className="max-h-40 overflow-auto rounded-lg border bg-paper p-3 text-sm">{dlg.g.map((x) => <li key={x.id}>• {x.asset.name} <span className="text-xs text-slate-500">({x.asset.assetCode})</span></li>)}</ul>
          {dlg.kind === "reject" ? <><Field l="Alasan penolakan (wajib)"><textarea name="note" rows={2} className="inp" required /></Field><p className="text-xs text-slate-500">Stok aset dikembalikan ke katalog. Pembayaran yang sudah masuk otomatis dikembalikan ke Saldo Dompet pembeli.</p></>
            : <>{dlg.g.some((x) => x.status === "approved" && x.paymentStatus !== "paid") ? <><p className="rounded bg-amber-50 p-2 text-sm text-amber-800">Ada tagihan yang belum lunas. Catat pembayaran yang Anda terima sekarang:</p><PayFields label="Metode pembayaran diterima" def={dlg.g[0]} /></> : <p className="text-sm text-slate-600">Pembayaran sudah lunas. Aset akan diserahkan dan menjadi milik pembeli.</p>}</>}
          <button className={`btn w-full ${dlg.kind === "reject" ? "!bg-red-700" : ""}`}>{dlg.kind === "reject" ? "Tolak pesanan" : "Serahkan aset"}</button>
        </form></Modal>}
      {ver && <Modal title="Cek bukti pembayaran" onClose={() => setVer(null)}>
        <div className="space-y-3 text-sm">
          <p>Pembeli: <b>{ver.user.name}</b> • {verRows.length} aset • Total <b className="text-moss">{rp(verRows.reduce((t, x) => t + Number(x.totalAmount), 0))}</b></p>
          <p className="text-slate-600">{ver.paymentMethod === "qris" ? "QRIS" : "Transfer"} {ver.bankName ?? ""}{ver.accountName ? ` • a.n. ${ver.accountName}` : ""}{ver.accountNo ? ` • ${ver.accountNo}` : ""}</p>
          {ver.proofUrl && <a href={ver.proofUrl} target="_blank" rel="noreferrer"><img src={ver.proofUrl} alt="Bukti pembayaran" className="max-h-80 w-full rounded-lg border object-contain" /></a>}
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-red-700">{err}</p>}
          <Field l="Alasan / catatan (wajib untuk menolak pesanan)"><input className="inp" value={vnote} onChange={(e) => setVnote(e.target.value)} /></Field>
          <div className="grid gap-2 sm:grid-cols-2"><button className="btn" onClick={() => verify("approve")}>Terima pembayaran</button><button className="btn-ghost btn-danger justify-center" onClick={() => verify("reject")}>Tolak bukti saja</button></div>
          <button className="btn-ghost btn-danger w-full justify-center" onClick={() => verify("refund")}>Tolak pesanan & refund ke dompet</button>
          <p className="text-xs text-slate-500"><b>Tolak bukti saja</b>: bukti tidak valid, uang belum masuk. <b>Tolak pesanan & refund</b>: uang sudah masuk ke rekening, pesanan ditolak, dan saldo dikembalikan ke Dompet pembeli.</p>
        </div></Modal>}
    </div>
  );
}
