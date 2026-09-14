/* One-way pull: snapshot the LIVE digitalcarda.in database into local MySQL
   (the DATABASE_URL in app/.env). Online is the source of truth; local edits never touch prod
   (the app points at the local copy, this only overwrites that copy).

   Uses the mycarda_deploy SSH key already on this machine (passwordless), and
   reads the live DB password from the server's own .env — so no passwords are
   needed or printed. Run:  node scripts/sync-from-live.mjs   (or db:pull). */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const KEY = path.join(os.homedir(), ".ssh", "mycarda_deploy");
const HOST = "root@163.227.92.219";
const PORT = "22587";
const MYSQL = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe";
const DUMP = path.resolve(".live-dump.sql");

// Server-side: parse the DB password out of the app .env, then mysqldump to stdout.
const REMOTE =
  `p=$(grep -E '^DATABASE_URL=' /var/www/digitalcarda/.env | sed -E 's#.*://[^:]+:([^@]+)@.*#\\1#'); ` +
  `MYSQL_PWD="$p" mysqldump --single-transaction --no-tablespaces --routines --triggers ` +
  `-h 127.0.0.1 -P 3306 -u digitalcarda digitalcarda`;

// `--soft` (used by predev): never block dev on a failed pull — warn and let the
// app start on the existing local copy. Without it (manual `db:pull`), fail hard.
const SOFT = process.argv.includes("--soft");
// Escape hatch for the auto-pull: `set SKIP_LIVE_SYNC=1 && npm run dev` restarts
// dev without re-pulling (handy when you're only iterating on code).
if (SOFT && process.env.SKIP_LIVE_SYNC) { console.log("○ Live sync skipped (SKIP_LIVE_SYNC set).\n"); process.exit(0); }
const die = (m) => {
  if (SOFT) { console.warn(`⚠ Live sync skipped (${m}). Using the existing local copy.\n`); process.exit(0); }
  console.error("✗ " + m);
  process.exit(1);
};

if (!fs.existsSync(KEY)) die(`SSH key not found: ${KEY}`);

console.log("● Dumping the LIVE database from digitalcarda.in …");
const out = fs.openSync(DUMP, "w");
const dump = spawnSync("ssh", ["-i", KEY, "-o", "BatchMode=yes", "-p", PORT, HOST, REMOTE], { stdio: ["ignore", out, "inherit"] });
fs.closeSync(out);
if (dump.status !== 0) { fs.rmSync(DUMP, { force: true }); die("dump failed (SSH/key or server error)."); }
const size = fs.statSync(DUMP).size;
if (size < 1000) { fs.rmSync(DUMP, { force: true }); die("dump looks empty — aborting, local data left untouched."); }
console.log(`  got ${(size / 1024).toFixed(0)} KB.`);

// Import target comes from the app's own .env, so a local DB moved to another
// port (e.g. when XAMPP or another project is holding 3307) is followed instead
// of the sync silently skipping and leaving a stale copy.
const localUrl = (() => {
  try {
    const v = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
    return v ? new URL(v) : null;
  } catch { return null; }
})();
const L = {
  host: localUrl?.hostname || "127.0.0.1",
  port: localUrl?.port || "3307",
  user: decodeURIComponent(localUrl?.username || "root"),
  pass: decodeURIComponent(localUrl?.password || "root"),
  db: (localUrl?.pathname || "/digitalcarda").slice(1) || "digitalcarda",
};
if (L.host === "localhost") L.host = "127.0.0.1";
// This OVERWRITES the target database with the live dump. Never let a
// DATABASE_URL that points somewhere else turn it into a write against prod.
if (!["127.0.0.1", "::1"].includes(L.host)) die(`refusing to import into non-local host ${L.host}`);

console.log(`● Importing into local MySQL (${L.host}:${L.port}) …`);
const imp = spawnSync(MYSQL, ["-h", L.host, "-P", String(L.port), "-u", L.user, L.db], {
  input: fs.readFileSync(DUMP), stdio: ["pipe", "inherit", "inherit"],
  env: { ...process.env, MYSQL_PWD: L.pass },   // not on the command line / process list
});
if (imp.status !== 0) die(`import failed — is local MySQL (${L.port}) running?`);

fs.rmSync(DUMP, { force: true });
fs.writeFileSync(path.resolve(".last-live-sync"), new Date().toISOString());
console.log("✓ Local database now matches digitalcarda.in (your local edits were replaced).");
