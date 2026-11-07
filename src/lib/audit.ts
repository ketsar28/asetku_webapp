import { prisma } from "./prisma";
/** Jejak audit: siapa melakukan apa dan kapan. Tidak pernah menggagalkan proses utama. */
export async function audit(by: { id: number; name: string }, action: string, entity: string, detail: string, entityId?: string | number) {
  try { await prisma.auditLog.create({ data: { userId: by.id, userName: by.name, action, entity, entityId: entityId != null ? String(entityId) : null, detail: detail.slice(0, 1000) } }); }
  catch (e) { console.error("audit gagal", e); }
}
