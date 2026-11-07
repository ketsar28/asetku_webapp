"use client";
import { useEffect, useRef, useState } from "react";
/** Pemindai QR memakai kamera (BarcodeDetector di Chrome/Android). Jika tidak didukung, tersedia input kode manual. */
export default function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null), cb = useRef(onCode); cb.current = onCode;
  const [err, setErr] = useState(""); const [manual, setManual] = useState("");
  useEffect(() => {
    let stop = false, stream: MediaStream | null = null, timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const BD = (window as any).BarcodeDetector;
      if (!BD || !navigator.mediaDevices?.getUserMedia) { setErr("Pemindai kamera belum didukung browser ini. Ketik kode secara manual."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        const det = new BD({ formats: ["qr_code"] }); let last = "";
        timer = setInterval(async () => {
          if (stop || !video.current) return;
          try { const r = await det.detect(video.current), c = r[0]?.rawValue; if (c && c !== last) { last = c; cb.current(c); } } catch { /* frame belum siap */ }
        }, 400);
      } catch { setErr("Kamera tidak dapat diakses. Izinkan akses kamera atau ketik kode secara manual."); }
    })();
    return () => { stop = true; if (timer) clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return (
    <div className="space-y-3">
      <video ref={video} className="aspect-video w-full rounded-lg bg-black object-cover" muted playsInline />
      {err && <p className="text-sm text-amber-700">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { cb.current(manual.trim()); setManual(""); } }} className="flex gap-2">
        <input className="inp" placeholder="Ketik kode aset, mis. ELK-001" value={manual} onChange={(e) => setManual(e.target.value)} /><button className="btn">Cari</button></form>
    </div>
  );
}
