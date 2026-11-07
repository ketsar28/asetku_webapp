import { NextResponse } from "next/server";
import { getSession, Session } from "./auth";
import { prisma } from "./prisma";
export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }
type Role = Session["role"];
/** Membungkus handler: autentikasi, RBAC, dan error handling JSON seragam. */
export function route<T extends unknown[]>(roles: Role[] | null, fn: (s: Session | null, ...a: T) => Promise<unknown>) {
  return async (...a: T) => {
    try {
      const s = await getSession();
      if (roles && !s) throw new ApiError(401, "Belum login");
      if (s) { // pastikan akun masih ada & aktif, dan pakai role terbaru dari database
        const u = await prisma.user.findUnique({ where: { id: s.id }, select: { isActive: true, role: true } });
        if (!u || !u.isActive) throw new ApiError(401, "Sesi tidak valid atau akun dinonaktifkan. Silakan login ulang.");
        s.role = u.role;
      }
      if (roles && s && !roles.includes(s.role)) throw new ApiError(403, "Akses ditolak");
      return NextResponse.json(await fn(s, ...a));
    } catch (e: any) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e?.code === "PERIOD_CLOSED") return NextResponse.json({ error: e.message }, { status: 409 });
      if (e?.code === "P2002") return NextResponse.json({ error: "Data duplikat" }, { status: 409 });
      if (e?.code === "P2003") return NextResponse.json({ error: "Data terkait tidak ditemukan. Muat ulang halaman atau login ulang." }, { status: 409 });
      console.error(e);
      return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
    }
  };
}
export const need = (c: unknown, msg: string) => { if (!c) throw new ApiError(400, msg); };
