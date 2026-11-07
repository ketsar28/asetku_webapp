"use client";
import { useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PayFields, parseSpecs, rp } from "../ui";
import { charges, saleCharges } from "@/lib/pricing";
import AvailabilityCalendar from "../AvailabilityCalendar";
import QrScanner from "../QrScanner";
const unit = (a: any) => (a.rentalUnit === "month" ? "bulan" : "hari");
export default function Catalog() {
  const [assets, setAssets] = useState<any[]>([]); const [cat, setCat] = useState(""); const [n, setN] = useState(24);
  const [cart, setCart] = useState<number[]>([]); const [open, setOpen] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [d, setD] = useState({ start: "", end: "" }); const [info, setInfo] = useState<any>(null); const [scan, setScan] = useState(false); const [agree, setAgree] = useState(false); const [scanMsg, setScanMsg] = useState(""); const [buyCart, setBuyCart] = useState<number[]>([]); const [buyOpen, setBuyOpen] = useState(false); const [agreeBuy, setAgreeBuy] = useState(false); const [buyErr, setBuyErr] = useState("");
  useEffect(() => { load(); }, []);
  const load = (q = "") => api(`/api/assets?q=${encodeURIComponent(q)}`).then(setAssets).catch((e) => setErr(e.message));
  const cats = Array.from(new Set(assets.map((a) => a.category.name)));
  const forSale = (a: any) => a.status === "available" && Number(a.salePrice) > 0;
  const saleOnly = (a: any) => Number(a.salePrice) > 0 && !(Number(a.rentalRate) > 0); // hanya dijual, tidak disewakan
  const canRent = (a: any) => a.status === "available" && !saleOnly(a);
  const list = assets.filter((a) => (cat === "__sale" ? forSale(a) : !cat || a.category.name === cat));
  const picked = assets.filter((a) => cart.includes(a.id)), buyPicked = assets.filter((a) => buyCart.includes(a.id)), buyTotal = buyPicked.reduce((t, a) => t + Number(a.salePrice), 0), buyVat = buyPicked.reduce((t, a) => t + saleCharges(Number(a.salePrice), false).vat, 0);
  const days = d.start && d.end && d.end >= d.start ? Math.round((+new Date(d.end) - +new Date(d.start)) / 86400000) + 1 : 0;
  const fee = (a: any) => Number(a.rentalRate) * (a.rentalUnit === "month" ? Math.ceil(days / 30) : days);
  const rentSum = picked.reduce((t, a) => t + fee(a), 0), vatSum = picked.reduce((t, a) => t + charges(fee(a), false).vat, 0), total = rentSum + vatSum;
  const toggle = (id: number) => { setCart(cart.includes(id) ? cart.filter((x) => x !== id) : [...cart, id]); setBuyCart((c) => c.filter((x) => x !== id)); };
  const toggleBuy = (id: number) => { setBuyCart(buyCart.includes(id) ? buyCart.filter((x) => x !== id) : [...buyCart, id]); setCart((c) => c.filter((x) => x !== id)); };
  async function purchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBuyErr("");
    try {
      const f = Object.fromEntries(new FormData(e.currentTarget));
      const r = await api("/api/purchases", "POST", { ...f, assetIds: buyCart, terms: agreeBuy });
      location.href = `/buy-checkout?group=${r.groupNo}`;
    } catch (x: any) { setBuyErr(x.message); load(); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    try {
      const f = Object.fromEntries(new FormData(e.currentTarget));
      const r = await api("/api/loans", "POST", { ...f, startDate: d.start, expectedReturnDate: d.end, assetIds: cart, terms: agree });
      location.href = `/checkout?group=${r.groupNo}`;
    } catch (x: any) { setErr(x.message); }
  }
  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-extrabold">Pilih Aset untuk Disewa atau Dibeli</h1>
        <input className="inp max-w-xs" placeholder="Cari nama atau kode…" onChange={(e) => load(e.target.value)} /><button className="btn-ghost" onClick={() => { setScan(true); setScanMsg(""); }}>Scan QR</button></div>
      <div className="flex flex-wrap gap-2">{["", ...cats, "__sale"].map((c) => <button key={c} onClick={() => { setCat(c); setN(24); }} className={`rounded-full border px-3 py-1 text-sm font-medium ${cat === c ? "border-moss bg-moss text-white" : "border-slate-300 bg-white"}`}>{c === "__sale" ? "Dijual" : c || "Semua"}</button>)}</div>
      {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}{!open && err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {list.length === 0 ? <Empty text="Tidak ada aset yang cocok." /> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.slice(0, n).map((a) => (
          <div key={a.id} className={`card flex flex-col gap-3 ${cart.includes(a.id) ? "border-moss ring-2 ring-moss/30" : ""}`}>
            <div className="overflow-hidden rounded-lg">{a.imageUrl ? <img src={a.imageUrl} alt={a.name} loading="lazy" className="h-44 w-full object-cover transition duration-300 hover:scale-105" /> : <div className="grid h-44 place-items-center bg-gradient-to-br from-ink to-moss text-4xl font-extrabold text-white/80">{a.name.slice(0, 2).toUpperCase()}</div>}</div>
            <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{a.name}</p><p className="text-xs text-slate-500">{a.assetCode} • {a.category.name}</p></div><Badge v={a.status} /></div>
            <p className="text-sm text-slate-600">{[a.brand !== "-" && a.brand, a.model].filter(Boolean).join(" ")}{a.location ? ` — ${a.location}` : ""}</p>
            <div>{saleOnly(a) ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hanya dijual</p> : <p className="text-sm font-bold text-moss">{Number(a.rentalRate) > 0 ? `Sewa ${rp(a.rentalRate)} / ${unit(a)}` : "Sewa gratis"}</p>}{forSale(a) && <p className="text-sm font-bold text-ink">Beli {rp(a.salePrice)}</p>}</div>
            <div className="mt-auto grid gap-2"><button className="btn-ghost justify-center" onClick={() => setInfo(a)}>Detail & spesifikasi</button>{canRent(a) && <button className={cart.includes(a.id) ? "btn-ghost justify-center" : "btn"} onClick={() => toggle(a.id)}>{cart.includes(a.id) ? "✓ Dipilih untuk sewa (batalkan)" : "Tambah ke keranjang sewa"}</button>}{forSale(a) && <button className={buyCart.includes(a.id) ? "btn-ghost justify-center" : saleOnly(a) ? "btn" : "btn-ghost justify-center !border-moss !text-moss"} onClick={() => toggleBuy(a.id)}>{buyCart.includes(a.id) ? "✓ Dipilih untuk dibeli (batalkan)" : "Tambah ke keranjang beli"}</button>}</div>
          </div>))}
      </div>}
      {list.length > n && <button className="btn-ghost mx-auto block" onClick={() => setN(n + 24)}>Muat lebih banyak ({list.length - n})</button>}
      {(cart.length > 0 || buyCart.length > 0) && <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white p-3 shadow-lg"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        {cart.length > 0 && <div className="flex items-center gap-3"><p className="text-sm"><b>{cart.length}</b> aset untuk disewa</p><button className="btn" onClick={() => { setOpen(true); setErr(""); }}>Atur sewa & ajukan</button></div>}
        {buyCart.length > 0 && <div className="flex items-center gap-3"><p className="text-sm"><b>{buyCart.length}</b> aset untuk dibeli • <b>{rp(buyTotal)}</b></p><button className="btn" onClick={() => { setBuyOpen(true); setBuyErr(""); setAgreeBuy(false); }}>Atur pembelian & ajukan</button></div>}
      </div></div>}
      {scan && <Modal title="Scan QR aset" onClose={() => setScan(false)}><QrScanner onCode={(code) => { const a = assets.find((x) => x.assetCode.toLowerCase() === code.trim().toLowerCase()); if (a) { setScan(false); setInfo(a); } else setScanMsg(`Kode ${code} tidak ditemukan atau aset sedang tidak tersedia.`); }} />{scanMsg && <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{scanMsg}</p>}</Modal>}
      {info && <Modal title={info.name} onClose={() => setInfo(null)}>
        <div className="space-y-3 text-sm">
          {info.imageUrl && <img src={info.imageUrl} alt={info.name} className="w-full rounded-lg object-cover" />}
          <div className="flex flex-wrap items-center gap-2"><Badge v={info.status} /><span className="text-slate-500">{info.assetCode} • {info.category.name}{info.location ? ` • ${info.location}` : ""}</span></div>
          <p className="text-lg font-extrabold text-moss">{saleOnly(info) ? "Hanya dijual" : <>{Number(info.rentalRate) > 0 ? `Sewa ${rp(info.rentalRate)} / ${unit(info)}` : "Sewa gratis"} <span className="text-xs font-normal text-slate-500">belum termasuk PPN 11%</span></>}</p>
          {forSale(info) && <p className="text-lg font-extrabold text-ink">Beli {rp(info.salePrice)} <span className="text-xs font-normal text-slate-500">harga jual final</span></p>}
          {info.description && <p className="text-slate-700">{info.description}</p>}
          {!saleOnly(info) && <AvailabilityCalendar assetId={info.id} />}
          <div><p className="mb-1 font-bold">Spesifikasi</p>{parseSpecs(info.specs).length === 0 ? <p className="text-slate-500">Spesifikasi belum diisi.</p> :
            <table className="w-full overflow-hidden rounded-lg border text-sm"><tbody className="divide-y">{parseSpecs(info.specs).map(([k, v], i) => <tr key={i} className={i % 2 ? "bg-paper" : ""}><td className="w-2/5 px-3 py-2 font-semibold">{k}</td><td className="px-3 py-2">{v}</td></tr>)}</tbody></table>}</div>
          {canRent(info) && <button className="btn w-full" onClick={() => { if (!cart.includes(info.id)) toggle(info.id); setInfo(null); }}>{cart.includes(info.id) ? "Sudah di keranjang sewa" : "Tambah ke keranjang sewa"}</button>}
          {forSale(info) && <button className={saleOnly(info) ? "btn w-full" : "btn-ghost w-full justify-center !border-moss !text-moss"} onClick={() => { if (!buyCart.includes(info.id)) toggleBuy(info.id); setInfo(null); }}>{buyCart.includes(info.id) ? "Sudah di keranjang beli" : "Tambah ke keranjang beli"}</button>}
        </div></Modal>}
      {buyOpen && buyPicked.length > 0 && <Modal title="Keranjang pembelian" onClose={() => setBuyOpen(false)}>
        <form onSubmit={purchase} className="space-y-3">
          {buyErr && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{buyErr}</p>}
          <ul className="divide-y rounded-lg border text-sm">{buyPicked.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 p-2"><span>{a.name}<span className="block text-xs text-slate-500">{a.assetCode} • {a.category.name}</span></span><span className="flex items-center gap-2"><b>{rp(a.salePrice)}</b><button type="button" aria-label="Hapus" className="text-red-700" onClick={() => { toggleBuy(a.id); if (buyPicked.length === 1) setBuyOpen(false); }}>×</button></span></li>)}</ul>
          <p className="rounded-lg bg-paper p-2 text-sm">Jumlah barang: <b>{buyPicked.length}</b> • Harga {rp(buyTotal)} + PPN 11% {rp(buyVat)} = <b className="text-moss">{rp(buyTotal + buyVat)}</b></p>
          <p className="text-xs text-slate-500">Pembelian tidak memakai tanggal atau durasi sewa. Asuransi barang bisa ditambahkan (opsional) di halaman pembayaran.</p>
          <Field l="Keperluan"><textarea name="purpose" rows={2} className="inp" required /></Field>
          <p className="text-xs text-slate-500">Stok aset ditahan setelah Anda mengajukan. Setelah disetujui admin, bayar lewat transfer bank, QRIS, saldo dompet, atau tunai saat mengambil aset.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agreeBuy} onChange={(e) => setAgreeBuy(e.target.checked)} /><span>Saya menyetujui <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-moss underline">syarat dan ketentuan</a> dan memahami aset ini <b>dibeli, bukan disewa</b>.</span></label>
          <button className="btn w-full" disabled={!agreeBuy}>Ajukan pembelian</button>
        </form></Modal>}
      {open && <Modal title="Keranjang sewa" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
          <ul className="divide-y rounded-lg border text-sm">{picked.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 p-2"><span>{a.name}<span className="block text-xs text-slate-500">{Number(a.rentalRate) ? `${rp(a.rentalRate)} / ${unit(a)}` : "Gratis"}</span></span><span className="flex items-center gap-2"><b>{days ? rp(fee(a)) : "-"}</b><button type="button" aria-label="Hapus" className="text-red-700" onClick={() => toggle(a.id)}>×</button></span></li>)}</ul>
          <div className="grid grid-cols-2 gap-3"><Field l="Tanggal mulai"><input type="date" min={new Date().toISOString().slice(0, 10)} className="inp" required value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} /></Field>
            <Field l="Tanggal selesai"><input type="date" min={d.start} className="inp" required value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} /></Field></div>
          <p className="rounded-lg bg-paper p-2 text-sm">Lama sewa: <b>{days ? `${days} hari` : "-"}</b> • Sewa {days ? rp(rentSum) : "-"} + PPN 11% {days ? rp(vatSum) : "-"} = <b className="text-moss">{days ? rp(total) : "-"}</b></p>
          <p className="text-xs text-slate-500">Asuransi barang bisa ditambahkan (opsional) di halaman pembayaran.</p>
          <Field l="Keperluan"><textarea name="purpose" rows={2} className="inp" required /></Field>
          <p className="text-xs text-slate-500">Setelah disetujui admin, bayar lewat transfer bank atau QRIS lalu unggah buktinya di menu Sewa Saya, atau bayar tunai saat mengambil aset.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>Saya menyetujui <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-moss underline">syarat dan ketentuan sewa</a>.</span></label>
          <button className="btn w-full" disabled={!days || !picked.length || !agree}>Ajukan sewa</button>
        </form></Modal>}
    </div>
  );
}
