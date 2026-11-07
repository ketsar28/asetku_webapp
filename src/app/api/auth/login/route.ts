import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { clearLimit, limit } from "@/lib/ratelimit";
export async function POST(req: Request) {
  const { email, password } = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local", key = `login:${ip}:${String(email).toLowerCase()}`;
  if (!limit(key, 8, 15 * 60_000)) return NextResponse.json({ error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }, { status: 429 });
  const u = await prisma.user.findUnique({ where: { email: String(email) } });
  if (!u || !(await bcrypt.compare(String(password), u.passwordHash)))
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  if (!u.isActive) return NextResponse.json({ error: "Akun dinonaktifkan. Hubungi admin." }, { status: 403 });
  clearLimit(key);
  const res = NextResponse.json({ role: u.role });
  res.cookies.set("token", await signToken({ id: u.id, role: u.role, name: u.name }),
    { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 28800 });
  return res;
}
