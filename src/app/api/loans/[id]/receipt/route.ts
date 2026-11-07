import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { due } from "@/lib/pricing";
import { terbilang } from "@/lib/payroll";
/** Kwitansi dibuat langsung di server (HTML siap cetak). Tidak bergantung pada halaman React, jadi selalu bisa dibuka. */
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const dt = (d?: Date | null, time = false) => (d ? d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } : {}) }) : "-");
const page = (body: string, status = 200) => new NextResponse(`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kwitansi</title><body style="font-family:system-ui,Arial;background:#F4F5F2;margin:0;padding:16px;color:#1f2937">${body}</body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const s = await getSession(); if (!s) return NextResponse.redirect(new URL("/login", req.url));
  const l = await prisma.loanRequest.findUnique({ where: { id: Number(params.id) }, include: { asset: true, user: { select: { name: true } } } });
  if (!l || (s.role === "user" && l.userId !== s.id)) return page("<p>Kwitansi tidak ditemukan.</p>", 404);
  if (!["paid", "refunded"].includes(l.paymentStatus)) return page("<p>Kwitansi tersedia setelah pembayaran lunas.</p>", 409);
  const all = !!new URL(req.url).searchParams.get("all") && !!l.groupNo;
  const list = all ? await prisma.loanRequest.findMany({ where: { groupNo: l.groupNo, userId: l.userId, paymentStatus: { in: ["paid", "refunded"] } }, include: { asset: true }, orderBy: { id: "asc" } }) : [l];
  const ins = list.reduce((t, x) => t + Number(x.insuranceFee), 0), vat = list.reduce((t, x) => t + Number(x.vatAmount), 0);
  const total = list.reduce((t, x) => t + due(x), 0), refunded = list.every((x) => x.paymentStatus === "refunded");
  const method = l.paymentMethod === "wallet" ? "Saldo Dompet AsetKu" : l.paymentMethod === "cash" ? "Tunai" : `${l.paymentMethod === "qris" ? "QRIS" : "Transfer"} ${l.bankName ?? ""}`;
  const row = (k: string, v: number) => `<tr><td>${k}</td><td style="text-align:right">${rp(v)}</td></tr>`;
  const html = `<style>.k{max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;font-size:14px}table{width:100%;border-collapse:collapse}td{padding:5px 0}dl{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin:16px 0}dt{font-size:11px;color:#64748b}dd{margin:0;font-weight:600}.b{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700}.btn{background:#078A4B;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;margin:0 auto 12px;display:block}@media print{body{background:#fff!important;padding:0!important}.btn{display:none}.k{border:0}}</style>
<button class="btn" onclick="print()">Unduh / cetak PDF</button>
<div class="k"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #14342F;padding-bottom:12px"><div style="display:flex;align-items:center;gap:12px"><img src="/logo.png" alt="" style="height:56px"><div><b style="font-size:16px">AsetKu Corporate</b><br><span style="font-size:12px;color:#64748b">Kwitansi Pembayaran Sewa</span></div></div>
<div style="text-align:right"><code style="font-size:12px">KW-${esc(all ? l.groupNo : l.requestNumber)}</code><br><span class="b" style="background:${refunded ? "#e0f2fe;color:#075985" : "#dcfce7;color:#166534"}">${refunded ? "DIKEMBALIKAN (REFUND)" : "LUNAS"}</span></div></div>
<dl><div><dt>Diterima dari</dt><dd>${esc(l.user.name)}</dd></div><div><dt>Tanggal bayar</dt><dd>${dt(l.paidAt, true)}</dd></div><div><dt>Aset${list.length > 1 ? ` (${list.length})` : ""}</dt><dd>${list.map((x) => `${esc(x.asset.name)} (${esc(x.asset.assetCode)})`).join("<br>")}</dd></div><div><dt>Periode sewa</dt><dd>${dt(l.startDate)} – ${dt(l.expectedReturnDate)}</dd></div>
<div><dt>Metode</dt><dd>${esc(method)}</dd></div><div><dt>Pengirim</dt><dd>${esc([l.accountName, l.accountNo].filter(Boolean).join(" • ") || "-")}</dd></div></dl>
<table style="border-top:1px solid #e2e8f0">${list.map((x) => row(list.length > 1 ? `Sewa ${esc(x.asset.name)}` : "Biaya sewa", Number(x.rentalFee))).join("")}${ins > 0 ? row("Asuransi barang", ins) : ""}${vat > 0 ? row("PPN 11%", vat) : ""}<tr style="border-top:2px solid #14342F;font-weight:800;font-size:16px"><td style="padding:8px 0">Total dibayar</td><td style="text-align:right">${rp(total)}</td></tr></table>
<p style="font-size:12px;color:#475569;text-transform:capitalize">Terbilang: ${terbilang(total)} rupiah</p>${refunded ? '<p style="font-size:12px;color:#075985">Pesanan ini dibatalkan/ditolak dan dananya sudah dikembalikan ke Saldo Dompet penyewa.</p>' : ""}
<div style="margin-top:32px;text-align:right;font-size:12px"><p>Padang, ${dt(l.paidAt)}</p><div style="height:50px"></div><b>AsetKu Corporate</b></div></div>${new URL(req.url).searchParams.get("print") ? "<script>onload=()=>print()</script>" : ""}`;
  return page(html);
}
