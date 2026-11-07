import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { route, ApiError } from "@/lib/api";
/** Upload gambar (JPG/PNG/WebP, maks 3 MB). Tipe file diperiksa dari isi file, bukan dari nama. */
export const POST = route(["admin", "staff", "user", "employee"], async (s, req: Request) => {
  const kind = new URL(req.url).searchParams.get("kind");
  if (!["assets", "proofs", "employees", "receipts", "claims"].includes(kind ?? "")) throw new ApiError(400, "Jenis upload tidak valid");
  if ((s!.role === "employee" && kind !== "claims") || (kind === "claims" && ![ "admin", "employee" ].includes(s!.role)) || (kind === "assets" && s!.role === "user") || (kind === "employees" && s!.role !== "admin") || (kind === "receipts" && !["admin", "finance"].includes(s!.role))) throw new ApiError(403, "Akses ditolak");
  const f = (await req.formData()).get("file");
  if (!(f instanceof File)) throw new ApiError(400, "File tidak ditemukan");
  if (f.size > 3 * 1024 * 1024) throw new ApiError(400, "Ukuran file maksimal 3 MB");
  const b = Buffer.from(await f.arrayBuffer());
  const ext = b[0] === 0xff && b[1] === 0xd8 ? "jpg" : b[0] === 0x89 && b[1] === 0x50 ? "png" : b.subarray(0, 4).toString() === "RIFF" ? "webp" : null;
  if (!ext) throw new ApiError(400, "Format harus JPG, PNG, atau WebP");
  const name = `${randomUUID()}.${ext}`, dir = path.join(process.env.UPLOAD_DIR ?? "uploads", kind!);
  await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, name), b);
  return { url: `/api/files/${kind}/${name}` };
});
