import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendWA } from "@/lib/notify";
import { limit } from "@/lib/ratelimit";
/** Minta tautan reset password. Respons selalu sama agar email terdaftar tidak bisa ditebak. */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!limit(`forgot:${ip}`, 5, 3_600_000)) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi dalam 1 jam." }, { status: 429 });
  const u = email ? await prisma.user.findUnique({ where: { email: String(email).trim() } }) : null;
  if (u && u.isActive) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordReset.create({ data: { userId: u.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) } });
    const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset?token=${token}`;
    const text = `Halo ${u.name},\n\nKlik tautan berikut untuk membuat password baru (berlaku 1 jam):\n${link}\n\nJika bukan Anda yang meminta, abaikan pesan ini.`;
    await Promise.allSettled([sendEmail(u.email, "Reset password", text), u.phone ? sendWA(u.phone, text) : Promise.resolve()]);
    if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "production") console.log(`[DEV] Tautan reset password untuk ${u.email}: ${link}`);
  }
  return NextResponse.json({ ok: true, message: "Jika email terdaftar, tautan reset password sudah dikirim." });
}
