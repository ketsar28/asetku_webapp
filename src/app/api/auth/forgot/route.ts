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
    const text = `Halo ${u.name},\n\nKami menerima permintaan untuk mengatur ulang password akun AsetKu Anda.\n\nBerikut langkah-langkah yang harus dilakukan:\n1. Klik tautan reset password berikut:\n   ${link}\n2. Masukkan password baru Anda (minimal 8 karakter, kombinasi huruf dan angka).\n3. Simpan password dan masuk kembali ke akun AsetKu Anda.\n\nCatatan:\n- Tautan ini hanya berlaku selama 1 jam.\n- Jika Anda tidak pernah meminta reset password, Anda dapat mengabaikan email ini dengan aman.\n\nSalam hangat,\nTim AsetKu Corporate`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <h2 style="color: #14342F; margin-top: 0;">Permintaan Reset Password Akun AsetKu</h2>
        <p>Halo <b>${u.name}</b>,</p>
        <p>Kami menerima permintaan untuk mengatur ulang kata sandi (password) akun Anda di sistem <b>AsetKu Corporate</b>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #14342F; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #14342F;">Apa yang harus Anda lakukan?</h4>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Klik tombol <b>"Atur Ulang Password"</b> di bawah ini.</li>
            <li>Buat kata sandi baru (minimal 8 karakter kombinasi huruf &amp; angka).</li>
            <li>Simpan dan silakan login kembali menggunakan password baru Anda.</li>
          </ol>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${link}" style="background-color: #14342F; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Atur Ulang Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Atau salin tautan berikut ke browser Anda:<br /><a href="${link}" style="color: #14342F; word-break: break-all;">${link}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
          ⚠️ <b>Penting:</b> Tautan ini hanya berlaku selama <b>1 jam</b>.<br />
          Jika Anda tidak pernah meminta pengaturan ulang kata sandi ini, silakan abaikan pesan ini. Akun Anda tetap aman.
        </p>
      </div>
    `;
    await Promise.allSettled([sendEmail(u.email, "Instruksi Reset Password Akun AsetKu", text, html), u.phone ? sendWA(u.phone, text) : Promise.resolve()]);
    if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "production") console.log(`[DEV] Tautan reset password untuk ${u.email}: ${link}`);
  }
  return NextResponse.json({ ok: true, message: "Jika email terdaftar, tautan reset password sudah dikirim." });
}
