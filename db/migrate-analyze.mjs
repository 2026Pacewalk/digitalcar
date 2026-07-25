/*
 * DigitalCarda — Production Data Safety: MIGRATION READINESS ANALYZER
 * ------------------------------------------------------------------
 * DRY RUN ONLY. Reads the production JSON files + the live DB and reports
 * exactly how cleanly the legacy card data would migrate into MySQL
 * (cards / card_blocks). It writes NOTHING — it only measures risk so we
 * go into the real migration eyes-open.
 *
 * Usage:  DATABASE_URL=... node db/migrate-analyze.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import "dotenv/config";

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (f) => JSON.parse(readFileSync(join(APP_DIR, "public", f), "utf8"));
const S = (v) => String(v ?? "").trim();
const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) + "%" : "0%");

const customers = pub("customers.json");
const products = pub("product.json");
const gallery = pub("gallery.json");
const videos = pub("video.json");
const offers = pub("offer.json");
const qrcodes = pub("qrcode.json");
const uploads = pub("uploads.json");

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [dbUsers] = await conn.query("SELECT id, LOWER(email) email FROM users");
const emailToUserId = new Map(dbUsers.map((u) => [u.email, u.id]));
let dbCards = [];
try { const [rows] = await conn.query("SELECT id, slug, user_id FROM cards"); dbCards = rows; } catch { /* table shape */ }
const dbCardSlugs = new Set(dbCards.map((c) => S(c.slug).toLowerCase()));

const line = (label, val) => console.log(`   ${label.padEnd(46)} ${val}`);
const H = (t) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 50 - t.length))}`);

console.log("\n📊  DIGITALCARDA — MIGRATION READINESS (dry run, no writes)\n" + "=".repeat(60));

// ── Identity & URL integrity ──────────────────────────────────────
H("Identity & public URL");
const slugs = customers.map((c) => S(c.slug).toLowerCase());
const emptySlug = slugs.filter((s) => !s).length;
const slugCounts = slugs.reduce((m, s) => (s && m.set(s, (m.get(s) || 0) + 1), m), new Map());
const dupSlugs = [...slugCounts.entries()].filter(([, n]) => n > 1);
const emails = customers.map((c) => S(c.email).toLowerCase());
const emptyEmail = emails.filter((e) => !e).length;
const dupEmail = [...emails.reduce((m, e) => (e && m.set(e, (m.get(e) || 0) + 1), m), new Map()).entries()].filter(([, n]) => n > 1);
line("Total customers", customers.length);
line("Missing/empty slug (blocks public URL)", emptySlug);
line("Duplicate slugs (URL collision)", `${dupSlugs.length} groups` + (dupSlugs.length ? ` e.g. ${dupSlugs.slice(0, 3).map(([s]) => s).join(", ")}` : ""));
line("Missing email (blocks login/ownership)", emptyEmail);
line("Duplicate emails", `${dupEmail.length} groups`);

// ── Ownership: JSON customer → DB user ────────────────────────────
H("Ownership (JSON customer → DB user)");
let matched = 0, unmatched = [];
for (const c of customers) {
  const e = S(c.email).toLowerCase();
  if (e && emailToUserId.has(e)) matched++;
  else unmatched.push(c.slug || c.username || c.id);
}
line("Customers with a matching DB user", `${matched} (${pct(matched, customers.length)})`);
line("Customers WITHOUT a DB user", `${unmatched.length}` + (unmatched.length ? ` — need user rows first` : ""));
line("DB users total", dbUsers.length);

// ── Existing DB cards (idempotency check) ─────────────────────────
H("Existing DB cards (would we double-create?)");
const already = slugs.filter((s) => s && dbCardSlugs.has(s)).length;
line("cards rows currently in DB", dbCards.length);
line("Customer slugs already having a card", already);
line("→ Cards to CREATE on migration", customers.length - already - emptySlug);

// ── Content linkage (uname → customer) ────────────────────────────
H("Content linkage (product/gallery/… → owner)");
const slugSet = new Set(slugs.filter(Boolean));
const userSet = new Set(customers.map((c) => S(c.username).toLowerCase()).filter(Boolean));
function linkage(name, list) {
  const unames = list.map((x) => S(x.uname).toLowerCase());
  const bySlug = unames.filter((u) => slugSet.has(u)).length;
  const byUser = unames.filter((u) => userSet.has(u)).length;
  const key = bySlug >= byUser ? "slug" : "username";
  const matched = Math.max(bySlug, byUser);
  line(`${name} (${list.length})`, `links by ${key}: ${matched} matched, ${list.length - matched} orphan`);
}
linkage("products", products);
linkage("gallery", gallery);
linkage("videos", videos);
linkage("offers", offers);
linkage("qrcodes", qrcodes);
linkage("uploads", uploads);

// ── Field coverage (card quality) ─────────────────────────────────
H("Field coverage");
const cov = (fn) => customers.filter(fn).length;
line("Has name", `${cov((c) => S(c.name))} (${pct(cov((c) => S(c.name)), customers.length)})`);
line("Has logo/photo", `${cov((c) => S(c.logo))} (${pct(cov((c) => S(c.logo)), customers.length)})`);
line("Has mobile1", `${cov((c) => S(c.mobile1))} (${pct(cov((c) => S(c.mobile1)), customers.length)})`);
line("Has any SEO title", `${cov((c) => S(c.seo_title))} (${pct(cov((c) => S(c.seo_title)), customers.length)})`);

// ── Plan / trial distribution ─────────────────────────────────────
H("Plan / trial (legacy package_id + expiry)");
const pkgDist = customers.reduce((m, c) => (m.set(c.package_id, (m.get(c.package_id) || 0) + 1), m), new Map());
line("package_id distribution", [...pkgDist.entries()].map(([k, v]) => `${k}:${v}`).join("  "));
const now = Date.now();
const expired = customers.filter((c) => { const d = new Date(S(c.expired_on).replace(" ", "T")); return !isNaN(d) && d < now; }).length;
line("Expired (by expired_on date)", `${expired} (${pct(expired, customers.length)})`);
line("Active / not-yet-expired", customers.length - expired);

console.log("\n" + "=".repeat(60));
console.log("✅  Dry run complete. NOTHING was written. Use this to size the real migration.\n");
await conn.end();
