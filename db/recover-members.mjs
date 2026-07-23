/*
 * Recover the real customer roster into the database, with full detail:
 *   users  (login identity)  +  subscriptions (package + start/expiry)  +  cards (URL slug)
 *
 * Source of truth: public/members_migration.json (the 508 real members migrated
 * from the old digitalcarda.in site). Optionally merges real passwords from
 * public/customers.json when that file is present (it lives on the VPS, not in git).
 *
 * ROLE MODEL: every member in this roster is a CUSTOMER. Their package
 * (Trial / Starter / Standard) is their subscription plan — it does NOT make them
 * a reseller. Real resellers are the "Retailers" (Sunny, Raman Kumar, Onkar Singh…)
 * who onboard customers; those are a separate account set and are not in this file.
 *
 * SAFE BY DESIGN:
 *   - Never deletes anything.
 *   - Existing users keep their current password (only brand-new rows get one).
 *   - A super_admin row is never demoted.
 *   - Idempotent: re-running updates in place (matched by email / unique slug / user).
 *
 * Usage:
 *   node db/recover-members.mjs --dry     # parse & report, write nothing
 *   node db/recover-members.mjs           # apply to the database
 *   node db/recover-members.mjs --users-only   # skip subscriptions & cards
 *
 * Reads DATABASE_URL from the environment (falls back to the local VPS default).
 */
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const USERS_ONLY = process.argv.includes("--users-only");
const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3306/digitalcarda";

const roster = JSON.parse(readFileSync(new URL("../public/members_migration.json", import.meta.url), "utf8"));

// Optional real passwords from the old export (present on the VPS only).
const passByEmail = new Map();
const custPath = new URL("../public/customers.json", import.meta.url);
if (existsSync(custPath)) {
  try {
    for (const c of JSON.parse(readFileSync(custPath, "utf8"))) {
      const e = String(c.email || "").trim().toLowerCase();
      if (e && c.password) passByEmail.set(e, String(c.password));
    }
    console.log(`Loaded ${passByEmail.size} real passwords from customers.json`);
  } catch (e) {
    console.warn("Could not parse customers.json — using default passwords for new rows.", e.message);
  }
} else {
  console.log("customers.json not found — new rows get a default password (existing rows keep theirs).");
}

// Old-site package ids used across the app UI: 5 = Starter, 6 = Standard, 7 = Trial.
const pkgId = (p) => {
  const u = String(p || "").trim().toUpperCase();
  if (u === "STARTER") return 5;
  if (u === "STANDARD") return 6;
  return 7; // Trial / Trail / blank
};
const pkgName = (id) => (id === 5 ? "Starter" : id === 6 ? "Standard" : "Trial");

// "DD-MM-YYYY" -> "YYYY-MM-DD 00:00:00" (null if unparseable).
const toDt = (s) => {
  const m = String(s || "").trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")} 00:00:00`;
};
const nowDt = new Date().toISOString().slice(0, 19).replace("T", " ");
const addDays = (dt, n) => {
  const d = new Date(dt.replace(" ", "T"));
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 19).replace("T", " ");
};

// De-duplicate roster by email.
const seen = new Set();
const rows = [];
let skipped = 0;
for (const m of roster) {
  const email = String(m.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || seen.has(email)) { skipped++; continue; }
  seen.add(email);
  const pid = pkgId(m.package);
  rows.push({
    email,
    fullName: String(m.name || email).trim(),
    phone: String(m.phone || "").trim(),
    slug: String(m.slug || "").trim().toLowerCase(),
    packageId: pid,
    status: pid === 7 ? "trial" : "active",
    start: toDt(m.startDate) || nowDt,
    end: toDt(m.expiryDate),
  });
}

const byPkg = rows.reduce((a, r) => ((a[pkgName(r.packageId)] = (a[pkgName(r.packageId)] || 0) + 1), a), {});
console.log(`\nRoster: ${roster.length} rows → ${rows.length} unique customers (skipped ${skipped}).`);
console.log("  by package:", byPkg);
console.log(`  with a card slug: ${rows.filter((r) => r.slug).length}`);

if (DRY) {
  console.log("\n[dry run] No database changes made. Re-run without --dry to apply.");
  process.exit(0);
}

const conn = await mysql.createConnection(url);
const defaultHash = await bcrypt.hash("changeme123", 8);
let usersUpserted = 0, subs = 0, cards = 0;

for (const r of rows) {
  // ── user ──
  const plain = passByEmail.get(r.email);
  const hash = plain ? await bcrypt.hash(plain, 8) : defaultHash;
  await conn.execute(
    `INSERT INTO users (email, password, full_name, phone, role, status)
     VALUES (?, ?, ?, ?, 'customer', 'active')
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       phone     = VALUES(phone),
       role      = IF(role = 'super_admin', role, 'customer')`,
    [r.email, hash, r.fullName, r.phone]
  );
  usersUpserted++;

  if (USERS_ONLY) { if (usersUpserted % 100 === 0) console.log(`  …${usersUpserted} users`); continue; }

  const [[u]] = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [r.email]);
  if (!u) continue;
  const uid = u.id;
  const end = r.end || addDays(r.start, 7);
  const trialEnds = r.status === "trial" ? end : null;

  // ── subscription (one per user; update if present) ──
  const [[sub]] = await conn.query("SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1", [uid]);
  if (sub) {
    await conn.execute(
      "UPDATE subscriptions SET package_id=?, status=?, current_period_start=?, current_period_end=?, trial_ends_at=? WHERE id=?",
      [r.packageId, r.status, r.start, end, trialEnds, sub.id]
    );
  } else {
    await conn.execute(
      `INSERT INTO subscriptions (user_id, package_id, status, amount, current_period_start, current_period_end, trial_ends_at)
       VALUES (?, ?, ?, '0.00', ?, ?, ?)`,
      [uid, r.packageId, r.status, r.start, end, trialEnds]
    );
  }
  subs++;

  // ── card (unique slug) ──
  if (r.slug) {
    await conn.execute(
      `INSERT INTO cards (user_id, slug, status, title, is_primary, published_at)
       VALUES (?, ?, 'published', ?, 1, ?)
       ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), title=VALUES(title), status='published'`,
      [uid, r.slug, r.fullName, r.start]
    );
    cards++;
  }

  if (usersUpserted % 100 === 0) console.log(`  …${usersUpserted} processed`);
}

const [[c]] = await conn.query(
  "SELECT (SELECT COUNT(*) FROM users WHERE role='customer') AS customers, (SELECT COUNT(*) FROM subscriptions) AS subs, (SELECT COUNT(*) FROM cards) AS cards"
);
console.log(`\nDone. users upserted: ${usersUpserted}, subscriptions: ${subs}, cards: ${cards}.`);
console.log(`DB now → customers ${c.customers}, subscriptions ${c.subs}, cards ${c.cards}`);
await conn.end();
