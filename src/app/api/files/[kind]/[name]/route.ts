import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
export async function GET(r: Request, { params }: { params: { kind: string; name: string } }) {
  const s = await getSession(); const { kind, name } = params;
  if (!s) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (!["assets", "proofs", "employees", "receipts", "claims"].includes(kind) || !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (kind === "receipts" && !["admin", "finance"].includes(s.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  if (kind === "claims" && !["admin", "finance"].includes(s.role)) { // foto lembur & nota reimburse: hanya admin/keuangan dan pemiliknya
    const url = `/api/files/claims/${name}`, mine = { employee: { user: { id: s.id } } };
    const own = s.role === "employee" && ((await prisma.overtimeRequest.findFirst({ where: { photoUrl: url, ...mine }, select: { id: true } })) || (await prisma.reimbursement.findFirst({ where: { receiptUrl: url, ...mine }, select: { id: true } })));
    if (!own) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  if (kind === "employees" && s.role !== "admin") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  if (kind === "proofs" && s.role === "user" && !(await prisma.loanRequest.findFirst({ where: { userId: s.id, proofUrl: `/api/files/proofs/${name}` } })) && !(await prisma.purchase.findFirst({ where: { userId: s.id, proofUrl: `/api/files/proofs/${name}` } })))
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  try {
    const buf = await readFile(path.join(process.env.UPLOAD_DIR ?? "uploads", kind, name));
    return new NextResponse(buf, { headers: { "Content-Type": MIME[name.split(".")[1]], "Cache-Control": "private, max-age=86400", ...(new URL(r.url).searchParams.get("download") ? { "Content-Disposition": `attachment; filename="bukti-pembayaran-${name}"` } : {}) } });
  } catch { return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 }); }
}
