import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { route, need } from "@/lib/api";
import { notify } from "@/lib/notify";
import { checkPin, PIN_RE } from "@/lib/wallet";
export const POST = route(["user", "staff", "admin"], async (s, req: Request) => {
  const b = await req.json(); need(PIN_RE.test(String(b.pin)), "PIN harus 6 angka");
  need(!/^(\d)\1{5}$/.test(b.pin) && !"01234567890".includes(b.pin) && !"09876543210".includes(b.pin), "PIN terlalu mudah ditebak (jangan angka kembar atau berurutan)");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: s!.id } });
  if (u.pinHash) await checkPin(s!.id, b.currentPin);
  await prisma.user.update({ where: { id: s!.id }, data: { pinHash: await bcrypt.hash(b.pin, 10), pinFailed: 0, pinLockedUntil: null } });
  await notify(s!.id, u.pinHash ? "PIN Dompet diubah" : "PIN Dompet dibuat", "Jika ini bukan Anda, segera hubungi admin.", { link: "/wallet" });
  return { ok: true };
});
