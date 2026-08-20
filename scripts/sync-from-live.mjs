/* One-way pull: snapshot the LIVE digitalcarda.in database into local MySQL
   (127.0.0.1:3307). Online is the source of truth; local edits never touch prod
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

const die = (m) => { console.error("✗ " + m); process.exit(1); };

if (!fs.existsSync(KEY)) die(`SSH key not found: ${KEY}`);

console.log("● Dumping the LIVE database from digitalcarda.in …");
const out = fs.openSync(DUMP, "w");
const dump = spawnSync("ssh", ["-i", KEY, "-o", "BatchMode=yes", "-p", PORT, HOST, REMOTE], { stdio: ["ignore", out, "inherit"] });
fs.closeSync(out);
if (dump.status !== 0) { fs.rmSync(DUMP, { force: true }); die("dump failed (SSH/key or server error)."); }
const size = fs.statSync(DUMP).size;
if (size < 1000) { fs.rmSync(DUMP, { force: true }); die("dump looks empty — aborting, local data left untouched."); }
console.log(`  got ${(size / 1024).toFixed(0)} KB.`);

console.log("● Importing into local MySQL (127.0.0.1:3307) …");
const imp = spawnSync(MYSQL, ["-h", "127.0.0.1", "-P", "3307", "-u", "root", "-proot", "digitalcarda"], { input: fs.readFileSync(DUMP), stdio: ["pipe", "inherit", "inherit"] });
if (imp.status !== 0) die("import failed — is local MySQL (3307) running?");

fs.rmSync(DUMP, { force: true });
fs.writeFileSync(path.resolve(".last-live-sync"), new Date().toISOString());
console.log("✓ Local database now matches digitalcarda.in (your local edits were replaced).");
