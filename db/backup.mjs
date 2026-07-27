/*
 * DigitalCarda — Production Data Safety: BACKUP
 * ------------------------------------------------------------------
 * Snapshots EVERYTHING that matters before any migration runs:
 *   1. Full MySQL dump (schema + data)  -> backups/<ts>/mysql.sql
 *   2. All production JSON data files   -> backups/<ts>/json/*.json
 *   3. A manifest (counts, git commit, timestamp) -> manifest.json
 *
 * Safe to run anytime — it only READS. Nothing in production is modified.
 *
 * Usage:
 *   node db/backup.mjs                 # backs up the DB in DATABASE_URL
 *   MYSQLDUMP=/path/to/mysqldump node db/backup.mjs
 *
 * Restore (rollback) is documented at the end of this file and printed
 * after every run.
 */
import { spawnSync, execSync } from "node:child_process";
import { mkdirSync, copyFileSync, writeFileSync, readdirSync, existsSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, "..");

function parseDbUrl(url) {
  // mysql://user:pass@host:port/db
  const m = /^mysql:\/\/([^:]+):([^@]*)@([^:/]+):(\d+)\/([^?]+)/.exec(url || "");
  if (!m) throw new Error("DATABASE_URL missing or not a mysql:// URL");
  return { user: m[1], pass: decodeURIComponent(m[2]), host: m[3], port: m[4], db: m[5] };
}

function findMysqldump() {
  if (process.env.MYSQLDUMP) return process.env.MYSQLDUMP;
  // On the Linux VPS mysqldump is on PATH; on local Windows use the 8.4 install.
  const candidates = [
    "mysqldump",
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
  ];
  for (const c of candidates) {
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}

function ts() {
  // Local script (not a workflow) — Date is available here.
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function gitCommit() {
  try { return execSync("git rev-parse --short HEAD", { cwd: APP_DIR }).toString().trim(); }
  catch { return "unknown"; }
}

const db = parseDbUrl(process.env.DATABASE_URL);
const stamp = ts();
const outDir = join(APP_DIR, "backups", stamp);
const jsonDir = join(outDir, "json");
mkdirSync(jsonDir, { recursive: true });

console.log(`\n🛟  DigitalCarda backup → backups/${stamp}\n`);

// ── 1. MySQL dump ────────────────────────────────────────────────
const mysqldump = findMysqldump();
const sqlPath = join(outDir, "mysql.sql");
let dbOk = false;
if (!mysqldump) {
  console.warn("⚠️  mysqldump not found — set MYSQLDUMP=/path/to/mysqldump. Skipping DB dump.");
} else {
  const args = [
    `--host=${db.host}`, `--port=${db.port}`, `--user=${db.user}`,
    "--single-transaction", "--routines", "--events", "--no-tablespaces",
    "--result-file=" + sqlPath, db.db,
  ];
  const r = spawnSync(mysqldump, args, {
    encoding: "utf8",
    env: { ...process.env, MYSQL_PWD: db.pass }, // avoid password in argv
  });
  if (r.status === 0) {
    dbOk = true;
    const kb = existsSync(sqlPath) ? (statSync(sqlPath).size / 1024).toFixed(0) : "?";
    console.log(`✅  MySQL dump: mysql.sql (${kb} KB)`);
  } else {
    console.error("❌  mysqldump failed:", (r.stderr || r.error?.message || "").slice(0, 400));
  }
}

// ── 2. JSON data files ───────────────────────────────────────────
const pubDir = join(APP_DIR, "public");
const jsonFiles = existsSync(pubDir) ? readdirSync(pubDir).filter((f) => f.endsWith(".json")) : [];
const counts = {};
for (const f of jsonFiles) {
  copyFileSync(join(pubDir, f), join(jsonDir, f));
  try {
    const arr = JSON.parse(readFileSync(join(pubDir, f), "utf8"));
    counts[f] = Array.isArray(arr) ? arr.length : "object";
  } catch { counts[f] = "unreadable"; }
}
console.log(`✅  JSON data: ${jsonFiles.length} files copied`);

// ── 3. Manifest ──────────────────────────────────────────────────
const manifest = {
  createdAt: new Date().toISOString(),
  gitCommit: gitCommit(),
  database: { host: db.host, port: db.port, name: db.db, dumped: dbOk },
  jsonCounts: counts,
};
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\n📦  Backup complete: backups/${stamp}`);
console.log(`    ${dbOk ? "mysql.sql + " : ""}${jsonFiles.length} JSON files + manifest.json\n`);
console.log("↩️   To ROLLBACK the database from this backup:");
console.log(`    mysql -u <user> -p ${db.db} < backups/${stamp}/mysql.sql`);
console.log("    (JSON files: copy backups/" + stamp + "/json/*.json back into app/public/)\n");
