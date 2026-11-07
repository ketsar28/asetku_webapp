import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { notify } from "@/lib/notify";
import { rpS, walletMove } from "@/lib/wallet";
/** Admin menambah Saldo Dompet penyewa secara manual (mis. memperbaiki transfer yang terlanjur ditolak). Tercatat di riwayat dompet. */
export const POST = route(["admin"], async (s, req: Request) => {
  const b = await req.json(); const amount = Math.floor(Number(b.amount));
  need(amount > 0 && amount <= 100_000_000, "Nominal tidak valid"); need(String(b.note ?? "").trim(), "Alasan wajib diisi");
  const u = await prisma.user.findUnique({ where: { id: Number(b.userId) } }); need(u && u.role === "user", "Penyewa tidak ditemukan");
  await prisma.$transaction((tx) => walletMove(tx, u!.id, amount, { type: "adjust", description: `Penyesuaian admin: ${String(b.note).trim()}`.slice(0, 250), refNo: `ADJ-${s!.id}` }));
  await notify(u!.id, "Saldo Dompet bertambah", `${rpS(amount)} ditambahkan ke Saldo Dompet Anda. ${String(b.note).trim()}`, { link: "/wallet" });
  return { ok: true };
});
