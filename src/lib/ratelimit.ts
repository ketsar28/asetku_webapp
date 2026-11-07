/** Pembatas laju sederhana (di memori per proses). Untuk banyak server, ganti dengan Redis. */
const hits = new Map<string, number[]>();
export function limit(key: string, max: number, windowMs: number) {
  const now = Date.now(), arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
export const clearLimit = (key: string) => { hits.delete(key); };
