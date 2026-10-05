#!/usr/bin/env node
/*
 * DigitalCarda — database backup, every 6 hours (runs on the VPS from root's crontab).
 * ------------------------------------------------------------------
 * Installed at /usr/local/bin/digitalcarda-db-backup.mjs; this copy in the repo
 * is the source. Cron (server time is UTC; these are 03:00, 09:00, 15:00 and
 * 21:00 IST):
 *
 *   30 3,9,15,21 * * * /usr/bin/node /usr/local/bin/digitalcarda-db-backup.mjs >> /var/log/digitalcarda/db-backup.log 2>&1
 *
 * What it does:
 *  - Reads DATABASE_URL from the app's .env (no credentials live in this file,
 *    in cron, or on a command line — the password goes to mysqldump through
 *    its environment).
 *  - Dumps the whole database in one consistent snapshot (--single-transaction,
 *    so the live site isn't locked) and gzips it to
 *    /var/backups/digitalcarda/db-YYYY-MM-DD_HHMM.sql.gz (root-only).
 *  - Keeps a backup only if mysqldump finished cleanly AND wrote its
 *    "Dump completed" marker; a failed run leaves no half-written file.
 *  - Deletes backups older than KEEP_DAYS, but never the newest KEEP_MIN.
 *
 * Restore one (to a scratch database first, then copy what you need):
 *   gunzip -c /var/backups/digitalcarda/db-<date>.sql.gz | mysql -u <user> -p <scratch_db>
 *
 * The backups sit on the same server as the database: they protect against a
 * bad change or an overwritten card, not against losing the server.
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, chmodSync } from "node:fs";
import { createGzip } from "node:zlib";
import { join } from "node:path";

const ENV_FILE = process.env.DC_ENV_FILE || "/var/www/digitalcarda/.env";
const OUT_DIR = process.env.DC_BACKUP_DIR || "/var/backups/digitalcarda";
const KEEP_DAYS = 30;
const KEEP_MIN = 28; // a week at four a day

const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
const log = (msg) => console.log(`${stamp()} ${msg}`);
const fail = (msg) => { console.error(`${stamp()} BACKUP FAILED: ${msg}`); process.exit(1); };

function databaseUrl() {
  let text;
  try { text = readFileSync(ENV_FILE, "utf8"); } catch (e) { fail(`can't read ${ENV_FILE} (${e.code})`); }
  const m = text.match(/^DATABASE_URL=(.*)$/m);
  if (!m) fail("DATABASE_URL isn't set in the app's .env");
  try { return new URL(m[1].trim().replace(/^['"]|['"]$/g, "")); } catch { fail("DATABASE_URL isn't a valid URL"); }
}

const url = databaseUrl();
const db = decodeURIComponent(url.pathname.slice(1));
if (!db) fail("DATABASE_URL has no database name");

mkdirSync(OUT_DIR, { recursive: true, mode: 0o700 });
chmodSync(OUT_DIR, 0o700);
const now = new Date();
const name = `db-${now.toISOString().slice(0, 10)}_${now.toISOString().slice(11, 16).replace(":", "")}.sql.gz`;
const file = join(OUT_DIR, name);
const partial = file + ".partial";

const dump = spawn("mysqldump", [
  "--single-transaction", "--quick", "--routines", "--triggers", "--no-tablespaces",
  "--default-character-set=utf8mb4",
  `--host=${url.hostname}`, `--port=${url.port || 3306}`, `--user=${decodeURIComponent(url.username)}`,
  db,
], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) }, stdio: ["ignore", "pipe", "pipe"] });

let stderr = "";
let tail = "";
dump.stderr.on("data", (d) => { stderr = (stderr + d).slice(-2000); });
dump.stdout.on("data", (d) => { tail = (tail + d.toString("latin1")).slice(-400); });

const out = createWriteStream(partial, { mode: 0o600 });
const gz = createGzip({ level: 6 });
dump.stdout.pipe(gz).pipe(out);

const exited = new Promise((res) => dump.on("close", res));
const written = new Promise((res, rej) => { out.on("finish", res); out.on("error", rej); gz.on("error", rej); });

try {
  const [code] = await Promise.all([exited, written]);
  if (code !== 0) throw new Error(`mysqldump exited ${code}: ${stderr.trim().split("\n").pop() || "no message"}`);
  if (!/-- Dump completed/.test(tail)) throw new Error("the dump didn't finish (no completion marker)");
  renameSync(partial, file);
} catch (e) {
  try { unlinkSync(partial); } catch { /* nothing written */ }
  fail(e.message);
}

// Old backups go; the newest KEEP_MIN always stay, whatever their age.
const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
const backups = readdirSync(OUT_DIR).filter((f) => /^db-.*\.sql\.gz$/.test(f)).sort().reverse();
let removed = 0;
backups.forEach((f, i) => {
  if (i < KEEP_MIN) return;
  const p = join(OUT_DIR, f);
  if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed++; }
});

const mb = (statSync(file).size / 1_048_576).toFixed(2);
log(`backup ok: ${name} (${mb} MB), ${backups.length - removed} kept${removed ? `, ${removed} old removed` : ""}`);
