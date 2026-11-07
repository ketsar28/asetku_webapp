import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { PASSWORD_HINT, passwordOk } from "@/lib/password";
export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!passwordOk(password)) return NextResponse.json({ error: PASSWORD_HINT }, { status: 400 });
  const r = await prisma.passwordReset.findUnique({ where: { tokenHash: createHash("sha256").update(String(token ?? "")).digest("hex") } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return NextResponse.json({ error: "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru." }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  await prisma.$transaction([prisma.user.update({ where: { id: r.userId }, data: { passwordHash: hash } }), prisma.passwordReset.updateMany({ where: { userId: r.userId, usedAt: null }, data: { usedAt: new Date() } })]);
  await notify(r.userId, "Password diubah", "Password akun Anda baru saja diubah. Jika bukan Anda, segera hubungi admin.", { link: "/login" });
  return NextResponse.json({ ok: true });
}
