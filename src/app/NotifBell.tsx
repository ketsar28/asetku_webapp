"use client";
import { useEffect, useState } from "react";
import { api, tglWaktu } from "./ui";
export default function NotifBell({ up, dark }: { up?: boolean; dark?: boolean }) {
  const [d, setD] = useState<any>({ items: [], unread: 0 }); const [open, setOpen] = useState(false);
  const load = () => api("/api/notifications").then(setD).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  async function toggle() { setOpen(!open); if (!open && d.unread) { await api("/api/notifications", "POST"); setTimeout(load, 2000); } }
  return (
    <div className="relative print:hidden">
      <button onClick={toggle} aria-label="Notifikasi" className={`relative rounded-full p-1.5 ${dark ? "text-white hover:bg-white/10" : "text-slate-600 hover:bg-paper"}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {d.unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{d.unread}</span>}
      </button>
      {open && <div className={`absolute right-0 z-50 w-80 max-w-[85vw] overflow-hidden rounded-xl border bg-white text-slate-800 shadow-xl ${up ? "bottom-full mb-2" : "top-full mt-2"}`}>
        <p className="border-b p-3 text-sm font-bold">Notifikasi</p>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {d.items.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Belum ada notifikasi.</li>}
          {d.items.map((n: any) => <li key={n.id}><a href={n.link ?? "#"} className={`block p-3 text-sm hover:bg-paper ${n.readAt ? "" : "bg-emerald-50/60"}`}><b>{n.title}</b><span className="block text-slate-600">{n.body}</span><span className="text-xs text-slate-400">{tglWaktu(n.createdAt)}</span></a></li>)}
        </ul></div>}
    </div>
  );
}
