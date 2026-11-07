// Backup database MySQL: npm run db:backup   (butuh mysqldump terpasang; jalankan terjadwal dengan cron/Task Scheduler)
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
const raw = process.env.DATABASE_URL;
if (!raw) { console.error("DATABASE_URL belum diatur di .env"); process.exit(1); }
const u = new URL(raw), db = u.pathname.replace(/^\//, ""), dir = path.join(process.cwd(), "backups"), keep = Number(process.env.BACKUP_KEEP ?? 14);
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12), file = path.join(dir, `asetku-${stamp}.sql`), out = fs.openSync(file, "w");
const r = spawnSync("mysqldump", ["--single-transaction", "--routines", "-h", u.hostname, "-P", u.port || "3306", "-u", decodeURIComponent(u.username), db],
  { env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) }, stdio: ["ignore", out, "inherit"] });
fs.closeSync(out);
if (r.error || r.status !== 0) { fs.rmSync(file, { force: true }); console.error("Backup gagal. Pastikan mysqldump terpasang dan DATABASE_URL benar."); process.exit(1); }
console.log(`Backup tersimpan: ${path.relative(process.cwd(), file)}`);
const old = fs.readdirSync(dir).filter((f) => /^asetku-.*\.sql$/.test(f)).sort().reverse().slice(keep);
for (const f of old) { fs.rmSync(path.join(dir, f)); console.log(`Hapus backup lama: ${f}`); }
