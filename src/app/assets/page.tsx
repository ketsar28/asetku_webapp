"use client";
import { useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PayFields, UploadField, rp, tgl } from "../ui";
export default function Assets() {
  const [rows, setRows] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const [cat, setCat] = useState(""); const [n, setN] = useState(50); const [hist, setHist] = useState<any>(null); const [err, setErr] = useState(""); const [q, setQ] = useState("");
  const load = () => api(`/api/assets?q=${encodeURIComponent(q)}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [q]);
  useEffect(() => { api("/api/categories").then(setCats); }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f: any = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (edit.id) await api(`/api/assets/${edit.id}`, "PATCH", f); else await api("/api/assets", "POST", f);
      setEdit(null); setErr(""); load();
    } catch (x: any) { setErr(x.message); }
  }
  async function del(a: any) { if (confirm(`Hapus ${a.name}?`)) api(`/api/assets/${a.id}`, "DELETE").then(load).catch((x) => setErr(x.message)); }
  const v = edit ?? {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold">Kelola Aset</h1>{rows.some((a) => a.status === "sold") && <span className="mr-auto rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">Stok habis: {rows.filter((a) => a.status === "sold").length} aset terjual</span>}<span className="mr-auto" />
        <input className="inp max-w-xs" placeholder="Cari…" onChange={(e) => setQ(e.target.value)} />
        <select className="inp w-auto" onChange={(e) => { setCat(e.target.value); setN(50); }}><option value="">Semua kategori ({rows.length})</option>{cats.map((c) => <option key={c.id}>{c.name}</option>)}</select>
        <a className="btn-ghost" href="/api/export?type=assets">Export Excel</a><button className="btn-ghost" onClick={() => print()}>Cetak / PDF</button>
        <button className="btn" onClick={() => setEdit({})}>Tambah aset</button></div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? <Empty text="Belum ada aset. Klik “Tambah aset” untuk memulai." /> :
        <table className="w-full text-sm"><thead className="border-b bg-paper"><tr>{["Kode", "Nama", "Kategori", "Lokasi", "Kondisi", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.filter((a) => !cat || a.category.name === cat).slice(0, n).map((a) => (
            <tr key={a.id} className={a.status === "sold" ? "bg-red-50/50" : ""}><td className="td font-mono text-xs">{a.assetCode}</td><td className="td font-semibold">{a.name}<div className="text-xs font-normal text-slate-500">{[a.brand, a.model].filter(Boolean).join(" ")}</div></td>
              <td className="td">{a.category.name}</td><td className="td">{a.location ?? "-"}</td><td className="td"><Badge v={a.condition} /></td><td className="td"><Badge v={a.status} />{a.status === "sold" && <div className="mt-1 text-xs font-medium text-red-700">Terjual {tgl(a.soldAt)}{Number(a.salePrice) > 0 ? ` • ${rp(a.salePrice)}` : ""}</div>}{a.status === "available" && Number(a.salePrice) > 0 && <div className="mt-1 text-xs text-slate-500">{Number(a.rentalRate) > 0 ? "Disewa & dijual" : "Hanya dijual"} {rp(a.salePrice)}</div>}</td>
              <td className="td space-x-1 whitespace-nowrap"><button className="btn-ghost" onClick={() => api(`/api/assets/${a.id}`).then((l) => setHist({ a, l }))}>Riwayat</button><button className="btn-ghost" onClick={() => setEdit(a)}>Ubah</button><button className="btn-ghost btn-danger" onClick={() => del(a)}>Hapus</button></td></tr>))}</tbody></table>}
      </div>
      {rows.filter((a) => !cat || a.category.name === cat).length > n && <button className="btn-ghost mx-auto block" onClick={() => setN(n + 50)}>Muat lebih banyak</button>}
      {edit && <Modal title={edit.id ? "Ubah aset" : "Tambah aset"} onClose={() => setEdit(null)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {!edit.id && <Field l="Kode aset" req><input name="assetCode" className="inp" required /></Field>}
          <Field l="Nama" req><input name="name" defaultValue={v.name} className="inp" required /></Field>
          {!edit.id && <Field l="Kategori" req><select name="categoryId" className="inp" required>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
          <Field l="Merek"><input name="brand" defaultValue={v.brand} className="inp" /></Field><Field l="Model"><input name="model" defaultValue={v.model} className="inp" /></Field>
          <Field l="Nomor seri"><input name="serialNumber" defaultValue={v.serialNumber} className="inp" /></Field><Field l="Lokasi"><input name="location" defaultValue={v.location} className="inp" /></Field>
          {!edit.id && <><Field l="Tanggal beli"><input name="purchaseDate" type="date" className="inp" /></Field><Field l="Harga beli (Rp)"><input name="purchaseCost" type="number" min="0" className="inp" /></Field><PayFields label="Pembayaran pembelian aset" /></>}
          {edit.id && <><Field l="Kondisi"><select name="condition" defaultValue={v.condition} className="inp"><option value="good">Baik</option><option value="damaged">Rusak</option><option value="maintenance">Perawatan</option></select></Field>
            <Field l="Status"><select name="status" defaultValue={v.status} className="inp"><option value="available">Tersedia</option><option value="borrowed">Dipinjam</option><option value="sold">Terjual (stok habis)</option><option value="disposed">Dihapus</option></select></Field></>}
          <div className="sm:col-span-2"><UploadField kind="assets" name="imageUrl" label="Foto aset (JPG/PNG/WebP, maks 3 MB)" current={v.imageUrl} /></div>
          <div className="sm:col-span-2"><Field l="Deskripsi singkat"><textarea name="description" rows={2} defaultValue={v.description ?? ""} className="inp" /></Field></div>
          <div className="sm:col-span-2"><Field l="Spesifikasi (satu baris satu item: Nama: nilai)"><textarea name="specs" rows={5} defaultValue={v.specs ?? ""} placeholder={"Prosesor: Intel Core i5\nRAM: 16 GB\nPenyimpanan: SSD 512 GB"} className="inp font-mono text-xs" /></Field></div>
          <Field l="Satuan tarif"><select name="rentalUnit" defaultValue={v.rentalUnit ?? "day"} className="inp"><option value="day">Per hari</option><option value="month">Per bulan</option></select></Field>
          <Field l="Tarif sewa (Rp) — kosongkan/0 jika hanya dijual"><input name="rentalRate" type="number" min="0" defaultValue={v.rentalRate ? Number(v.rentalRate) : 0} className="inp" /></Field>
          <div className="sm:col-span-2"><Field l="Harga jual (Rp) — isi jika aset ini juga bisa dibeli, kosongkan jika hanya disewa"><input name="salePrice" type="number" min="0" defaultValue={v.salePrice ? Number(v.salePrice) : ""} className="inp" /></Field></div>
          <button className="btn sm:col-span-2">Simpan</button>
        </form></Modal>}
      {hist && <Modal title={`Riwayat ${hist.a.name}`} onClose={() => setHist(null)}>
        {hist.l.length === 0 ? <Empty text="Belum ada catatan." /> : <ol className="space-y-3 border-l-2 border-moss/30 pl-4">{hist.l.map((x: any) => <li key={x.id}><p className="text-sm font-semibold">{x.description}</p><p className="text-xs text-slate-500">{new Date(x.timestamp).toLocaleString("id-ID")} oleh {x.user.name}</p></li>)}</ol>}
      </Modal>}
    </div>
  );
}
