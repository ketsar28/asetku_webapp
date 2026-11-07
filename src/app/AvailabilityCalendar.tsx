"use client";
import { useEffect, useState } from "react";
import { api } from "./ui";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/** Kalender 2 bulan: hijau = tersedia, merah = sudah dipesan. */
export default function AvailabilityCalendar({ assetId }: { assetId: number }) {
  const [booked, setBooked] = useState<Set<string> | null>(null);
  useEffect(() => {
    api(`/api/assets/${assetId}/bookings`).then((rows: any[]) => {
      const s = new Set<string>();
      for (const r of rows) for (let t = +new Date(r.startDate); t <= +new Date(r.expectedReturnDate); t += 86400000) s.add(new Date(t).toISOString().slice(0, 10));
      setBooked(s);
    }).catch(() => setBooked(new Set()));
  }, [assetId]);
  const now = new Date(), months = [0, 1].map((i) => new Date(now.getFullYear(), now.getMonth() + i, 1));
  if (!booked) return <p className="text-xs text-slate-500">Memuat ketersediaan…</p>;
  return (
    <div><p className="mb-1 font-bold">Ketersediaan</p>
      <div className="grid gap-3 sm:grid-cols-2">{months.map((m) => {
        const first = m.getDay(), days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        return (
          <div key={m.getMonth()} className="rounded-lg border p-2"><p className="mb-1 text-center text-xs font-semibold">{BULAN[m.getMonth()]} {m.getFullYear()}</p>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
              {["M", "S", "S", "R", "K", "J", "S"].map((d, i) => <span key={i} className="text-slate-400">{d}</span>)}
              {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
              {Array.from({ length: days }, (_, i) => { const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`; return <span key={key} className={`rounded py-0.5 ${booked.has(key) ? "bg-red-100 font-semibold text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{i + 1}</span>; })}
            </div></div>);
      })}</div>
      <p className="mt-1 text-xs text-slate-500"><span className="rounded bg-emerald-50 px-1 text-emerald-800">hijau</span> tersedia • <span className="rounded bg-red-100 px-1 text-red-700">merah</span> sudah dipesan</p></div>
  );
}
