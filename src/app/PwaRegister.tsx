"use client";
import { useEffect, useState } from "react";
export default function PwaRegister() {
  const [ev, setEv] = useState<any>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const h = (e: Event) => { e.preventDefault(); setEv(e); };
    addEventListener("beforeinstallprompt", h); return () => removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!ev) return null;
  return <button className="btn fixed bottom-4 right-4 z-50 shadow-lg" onClick={async () => { ev.prompt(); await ev.userChoice; setEv(null); }}>Pasang aplikasi</button>;
}
