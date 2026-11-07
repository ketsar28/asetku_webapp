"use client";
import { useEffect, useState } from "react";
import { BANKS, EWALLETS } from "@/lib/banks";
const tone: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-800", refund_due: "bg-amber-50 text-amber-800", refunded: "bg-sky-50 text-sky-800", verifying: "bg-sky-50 text-sky-800", unpaid: "bg-amber-50 text-amber-800",
  scheduled: "bg-amber-50 text-amber-800", in_progress: "bg-sky-50 text-sky-800", completed: "bg-emerald-50 text-emerald-800",
  available: "bg-emerald-50 text-emerald-800", good: "bg-emerald-50 text-emerald-800", returned: "bg-emerald-50 text-emerald-800", approved: "bg-sky-50 text-sky-800",
  borrowed: "bg-sky-50 text-sky-800", on_loan: "bg-sky-50 text-sky-800", pending: "bg-amber-50 text-amber-800", maintenance: "bg-amber-50 text-amber-800",
  damaged: "bg-red-50 text-red-800", overdue: "bg-red-50 text-red-800", rejected: "bg-red-50 text-red-800", disposed: "bg-slate-100 text-slate-600", sold: "bg-red-100 text-red-800",
};
const label: Record<string, string> = { available: "Tersedia", borrowed: "Dipinjam", disposed: "Dihapus", sold: "Stok habis", good: "Baik", damaged: "Rusak", maintenance: "Perawatan",
  pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak", on_loan: "Dipinjam", returned: "Dikembalikan", overdue: "Terlambat", paid: "Lunas", refund_due: "Menunggu refund", refunded: "Refund selesai", verifying: "Menunggu verifikasi", unpaid: "Belum dibayar", scheduled: "Dijadwalkan", in_progress: "Dikerjakan", completed: "Selesai" };
export const Badge = ({ v }: { v: string }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[v] ?? "bg-slate-100"}`}>{label[v] ?? v}</span>;
export const rp = (n: unknown) => `Rp ${Number(n ?? 0).toLocaleString("id-ID")}`;
export const tglWaktu = (d?: string) => (d ? new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/\./g, ":") : "-");
export const tgl = (d?: string) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Tutup" className="text-2xl leading-none text-slate-400">×</button></div>
        {children}
      </div>
    </div>
  );
}
export const Empty = ({ text }: { text: string }) => <p className="py-10 text-center text-sm text-slate-500">{text}</p>;
export const Field = ({ l, req, children }: { l: string; req?: boolean; children: React.ReactNode }) => <label className="block space-y-1 text-sm font-medium">{l}{req && <span className="ml-1 font-bold text-red-500">*</span>}{children}</label>;
export const api = async (url: string, method = "GET", body?: unknown) => {
  const r = await fetch(url, { method, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && typeof location !== "undefined" && location.pathname !== "/login") location.href = "/login";
  if (!r.ok) throw new Error(d.error ?? "Terjadi kesalahan");
  return d;
};

export function PayFields({ label = "Metode pembayaran", def }: { label?: string; def?: any }) {
  const [m, setM] = useState(def?.paymentMethod ?? "cash");
  return (
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
      <Field l={label} req><select name="paymentMethod" className="inp" value={m} onChange={(e) => setM(e.target.value)}><option value="cash">Tunai (Cash)</option><option value="transfer">Transfer Bank</option><option value="qris">QRIS</option></select></Field>
      {m !== "cash" && <Field l={m === "qris" ? "Bank / e-wallet penerbit QRIS" : "Bank"} req><select name="bankName" defaultValue={def?.bankName ?? undefined} className="inp" required>{(m === "qris" ? [...BANKS, ...EWALLETS] : BANKS).map((b) => <option key={b}>{b}</option>)}</select></Field>}
      {m !== "cash" && <><Field l="Nama pemilik rekening asal" req={m === "transfer"}><input name="accountName" defaultValue={def?.accountName ?? ""} className="inp" required={m === "transfer"} placeholder="mis. Budi Santoso" /></Field><Field l={m === "qris" ? "No. rekening / HP e-wallet (opsional)" : "No. rekening asal"} req={m === "transfer"}><input name="accountNo" defaultValue={def?.accountNo ?? ""} inputMode="numeric" className="inp" required={m === "transfer"} placeholder="mis. 1234567890" /></Field></>}
    </div>
  );
}

export function UploadField({ kind, name, label, current, required }: { kind: "assets" | "proofs" | "employees" | "receipts" | "claims"; name: string; label: string; current?: string | null; required?: boolean }) {
  const [url, setUrl] = useState(current ?? ""); const [prev, setPrev] = useState(current ?? ""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; setErr(""); setBusy(true); setPrev(URL.createObjectURL(f));
    try { const fd = new FormData(); fd.append("file", f); const r = await fetch(`/api/upload?kind=${kind}`, { method: "POST", body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setUrl(d.url); }
    catch (x: any) { setErr(x.message); setPrev(""); setUrl(""); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2 text-sm"><p className="font-medium">{label}{required && <span className="ml-1 font-bold text-red-500">*</span>}</p>
      {prev && <img src={prev} alt="Pratinjau" className="h-32 rounded-lg border object-cover" />}
      <input type="file" accept="image/jpeg,image/png,image/webp" required={required && !url} onChange={pick} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-2" />
      {busy && <p className="text-xs text-slate-500">Mengunggah…</p>}{err && <p className="text-xs text-red-700">{err}</p>}
      <input type="hidden" name={name} value={url} required={required} /></div>
  );
}

export const Avatar = ({ e, s = 48 }: { e: { name: string; photoUrl?: string | null }; s?: number }) =>
  e.photoUrl ? <img src={e.photoUrl} alt={e.name} style={{ width: s, height: s }} className="shrink-0 rounded-full object-cover" /> : <span style={{ width: s, height: s }} className="grid shrink-0 place-items-center rounded-full bg-moss font-bold text-white">{e.name.slice(0, 1)}</span>;

export const parseSpecs = (s?: string | null): [string, string][] => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l]; });
