import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { notify } from "@/lib/notify";
import { POST as single } from "../[id]/route";
const ACTIONS = ["approve", "reject", "checkout", "checkin"];
const TITLE: Record<string, string> = { approve: "Pesanan disetujui", reject: "Pesanan ditolak", checkout: "Aset diserahkan", checkin: "Pengembalian diterima" };
const EXTRA: Record<string, string> = { approve: " Silakan lakukan pembayaran di menu Sewa Saya.", checkout: " Mohon dikembalikan tepat waktu.", reject: "", checkin: "" };
/** Menjalankan satu aksi (setujui/tolak/serahkan/terima kembali) untuk banyak pesanan sekaligus. Tiap pesanan diproses oleh logika yang sama dengan aksi satuan. */
export const POST = route(["admin", "staff"], async (_s, req: Request) => {
  const b = await req.json(); need(ACTIONS.includes(b.action), "Aksi tidak dikenal");
  const items: { id: number; condition?: string; damageFee?: number }[] = Array.isArray(b.items) ? b.items : []; need(items.length > 0 && items.length <= 100, "Pilih 1–100 pesanan");
  const ok: number[] = [], failed: { id: number; error: string }[] = [];
  for (const it of items) {
    const res = await single(new Request(req.url, { method: "POST", body: JSON.stringify({ action: b.action, note: b.note, condition: it.condition, damageFee: it.damageFee, paymentMethod: b.paymentMethod, bankName: b.bankName, accountName: b.accountName, accountNo: b.accountNo, silent: true }) }), { params: { id: String(it.id) } });
    if (res.ok) ok.push(it.id); else failed.push({ id: it.id, error: (await res.json().catch(() => ({})))?.error ?? "Gagal diproses" });
  }
  if (ok.length) { // satu notifikasi ringkas per penyewa, bukan satu per aset
    const loans = await prisma.loanRequest.findMany({ where: { id: { in: ok } }, include: { asset: true } }), by = new Map<number, typeof loans>();
    for (const l of loans) by.set(l.userId, [...(by.get(l.userId) ?? []), l]);
    for (const [uid, ls] of Array.from(by)) await notify(uid, `${TITLE[b.action]} (${ls.length} aset)`, `${ls.map((l) => l.asset.name).join(", ")}.${b.action === "reject" && b.note ? ` Alasan: ${b.note}.` : ""}${EXTRA[b.action]}`, { link: "/loans" });
  }
  return { done: ok.length, failed };
});
