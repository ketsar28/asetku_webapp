import { prisma } from "./prisma";
import { vatRecap } from "./tax";
export type Alert = { level: "high" | "medium" | "low"; key: string; title: string; detail: string; link?: string };
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
/** Deteksi anomali & pengingat: pengeluaran tak wajar, transaksi ganda, selisih data, rekonsiliasi, PPN jatuh tempo, persetujuan tertunda. */
export async function detectAnomalies(): Promise<Alert[]> {
  const out: Alert[] = [], now = new Date(), d30 = new Date(+now - 30 * 86400000), d120 = new Date(+now - 120 * 86400000);
  const rec = await prisma.transaction.findMany({ where: { voidedAt: null, approval: "approved", txDate: { gte: d120 } } });
  const ex = rec.filter((t) => t.type === "expense" && !["purchase", "tax_vat", "refund", "payroll"].includes(t.source)), hist = new Map<string, number[]>();
  for (const t of ex.filter((x) => x.txDate < d30)) hist.set(t.category, [...(hist.get(t.category) ?? []), Number(t.amount)]);
  for (const t of ex.filter((x) => x.txDate >= d30)) {
    const h = hist.get(t.category), avg = h?.length ? h.reduce((a, b) => a + b, 0) / h.length : 0, a = Number(t.amount);
    if (a >= 1_000_000 && ((avg && a > avg * 3) || (!avg && a >= 5_000_000))) out.push({ level: "medium", key: `big-${t.id}`, title: "Pengeluaran tidak biasa", detail: `${t.category}: ${rp(a)}${avg ? ` (rata-rata sebelumnya ${rp(avg)})` : ""}. ${t.description.slice(0, 80)}`, link: "/finance" });
  }
  const seen = new Map<string, number>();
  for (const t of rec.filter((x) => x.txDate >= d30)) { if (!t.refNo && t.source !== "manual") continue; const k = t.source === "manual" ? `${t.type}|${t.category}|${t.amount}|${t.description}` : `${t.source}|${t.refNo}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  for (const [k, n] of Array.from(seen)) if (n > 1) out.push({ level: "high", key: `dup-${k}`, title: "Kemungkinan transaksi ganda", detail: `${n} catatan serupa: ${k.split("|").slice(0, 3).join(" • ")}`, link: "/finance" });
  const paid = await prisma.loanRequest.findMany({ where: { paymentStatus: { in: ["paid", "refunded"] }, rentalFee: { gt: 0 }, paidAt: { gte: d120 } }, select: { requestNumber: true } });
  const have = new Set(rec.filter((t) => t.source === "rental").map((t) => t.refNo)), miss = paid.filter((l) => !have.has(l.requestNumber));
  if (miss.length) out.push({ level: "high", key: "integrity", title: "Pesanan lunas belum tercatat di laporan", detail: `${miss.length} pesanan, contoh: ${miss.slice(0, 3).map((m) => m.requestNumber).join(", ")}. Jalankan "Sinkronkan data lama".`, link: "/finance" });
  const rc = await prisma.reconciliation.findMany({ where: { createdAt: { gte: d30 } }, orderBy: { createdAt: "desc" } }), last = new Map<string, (typeof rc)[number]>();
  for (const r of rc) if (!last.has(r.channel + r.bank)) last.set(r.channel + r.bank, r);
  for (const r of Array.from(last.values())) if (Math.abs(Number(r.diff)) >= 1) out.push({ level: "medium", key: `rec-${r.id}`, title: "Selisih rekonsiliasi", detail: `${r.channel} ${r.bank}: selisih ${rp(Number(r.diff))} pada ${r.asOf.toLocaleDateString("id-ID")}`, link: "/finance/reconcile" });
  for (const y of now.getMonth() === 0 ? [now.getFullYear() - 1, now.getFullYear()] : [now.getFullYear()])
    for (const v of await vatRecap(y)) {
      const days = Math.ceil((+v.deadline - +now) / 86400000);
      if (v.status === "Terlambat") out.push({ level: "high", key: `ppn-late-${v.period}`, title: `PPN ${v.period} terlambat disetor`, detail: `Sisa ${rp(v.left)}, jatuh tempo ${v.deadline.toLocaleDateString("id-ID")}`, link: "/finance/tax" });
      else if (v.status === "Belum disetor" && days <= 7) out.push({ level: "medium", key: `ppn-soon-${v.period}`, title: `PPN ${v.period} segera jatuh tempo`, detail: `Sisa ${rp(v.left)}, ${days} hari lagi (${v.deadline.toLocaleDateString("id-ID")})`, link: "/finance/tax" });
    }
  const pend = await prisma.transaction.count({ where: { approval: "pending", createdAt: { lt: new Date(+now - 2 * 86400000) } } });
  if (pend) out.push({ level: "low", key: "pending", title: "Pengeluaran menunggu persetujuan > 2 hari", detail: `${pend} pengeluaran belum diputuskan admin`, link: "/finance" });
  return out.sort((a, b) => ["high", "medium", "low"].indexOf(a.level) - ["high", "medium", "low"].indexOf(b.level));
}
