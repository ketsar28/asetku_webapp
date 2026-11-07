// Pemeriksa cepat tanpa dependensi: import/ekspor lokal, nama model Prisma, handler API, export default halaman.
// Jalankan: npm run verify   (untuk pemeriksaan tipe penuh: npm run typecheck)
import fs from "fs";
import path from "path";
const root = process.cwd(), src = path.join(root, "src");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const seed = path.join(root, "prisma", "seed.ts");
const files = walk(src).filter((f) => /\.(ts|tsx)$/.test(f)).concat(fs.existsSync(seed) ? [seed] : []);
let errors = 0;
const bad = (f, m) => { errors++; console.log("✗", path.relative(root, f), "-", m); };
const read = (f) => fs.readFileSync(f, "utf8");
const schema = read(path.join(root, "prisma", "schema.prisma"));
const models = [...schema.matchAll(/^model (\w+)/gm)].map((m) => m[1][0].toLowerCase() + m[1].slice(1));
const resolve = (from, spec) => {
  const base = spec.startsWith("@/") ? path.join(src, spec.slice(2)) : path.resolve(path.dirname(from), spec);
  for (const c of [base, base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};
const exportsOf = (f) => {
  const s = read(f), set = new Set();
  for (const line of s.split("\n")) {
    const m = line.match(/^export\s+(?:async\s+)?(const|function|class|type|interface|enum)\s+(\w+)/);
    if (!m) continue; set.add(m[2]);
    if (m[1] === "const") for (const x of line.matchAll(/(?:^|,)\s*(\w+)\s*(?::[^=,]+)?=/g)) set.add(x[1]);
  }
  for (const m of s.matchAll(/export\s*\{([^}]+)\}/g)) m[1].split(",").forEach((x) => set.add(x.trim().split(/\s+as\s+/).pop()));
  if (/export\s+default/.test(s)) set.add("default");
  return set;
};
for (const f of files) {
  const s = read(f);
  for (const m of s.matchAll(/import\s+(?:type\s+)?(\w+)?\s*,?\s*(?:\{([^}]*)\})?\s*(?:\*\s+as\s+\w+)?\s*from\s+["']([^"']+)["']/g)) {
    const spec = m[3];
    if (!(spec.startsWith("@/") || spec.startsWith(".")) || spec.endsWith(".css") || spec.endsWith(".json")) continue;
    const t = resolve(f, spec);
    if (!t) { bad(f, `import tidak ditemukan: ${spec}`); continue; }
    const ex = exportsOf(t);
    if (m[1] && !ex.has("default")) bad(f, `${spec} tidak punya default export`);
    for (const n of (m[2] ?? "").split(",").map((x) => x.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean)) if (!ex.has(n)) bad(f, `'${n}' tidak diekspor oleh ${spec}`);
  }
  for (const m of s.matchAll(/\b(?:prisma|tx|c)\.(\w+)\.(?:findMany|findUnique|findFirst|create|createMany|update|updateMany|upsert|delete|deleteMany|count|groupBy|aggregate|findUniqueOrThrow)\b/g))
    if (!models.includes(m[1])) bad(f, `model Prisma tidak ada di schema: ${m[1]}`);
  if (/[\\/]route\.ts$/.test(f) && !/export\s+(?:const|async function|function)\s+(GET|POST|PATCH|PUT|DELETE)\b/.test(s)) bad(f, "route tanpa handler HTTP");
  if (/[\\/]page\.tsx$/.test(f) && !/export\s+default/.test(s)) bad(f, "halaman tanpa export default");
}
const open = (schema.match(/\{/g) ?? []).length, close = (schema.match(/\}/g) ?? []).length;
if (open !== close) { errors++; console.log("✗ prisma/schema.prisma - kurung { } tidak seimbang"); }
console.log(errors ? `\n${errors} masalah ditemukan.` : `✓ Lolos: ${files.length} file diperiksa, ${models.length} model Prisma.`);
process.exit(errors ? 1 : 0);
