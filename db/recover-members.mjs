/*
 * Recover customer & reseller data into the `users` table.
 *
 * Source of truth: public/members_migration.json (the 508 real members migrated
 * from the old digitalcarda.in site). Optionally merges real passwords from
 * public/customers.json when that file is present (it lives on the VPS, not in git).
 *
 * Role mapping:  package "STANDARD" -> reseller,  everything else -> customer.
 *
 * SAFE BY DESIGN:
 *   - Never deletes anything.
 *   - Existing rows keep their current password (only brand-new rows get one).
 *   - A super_admin row is never demoted, even if its email appears in the roster.
 *
 * Usage:
 *   node db/recover-members.mjs --dry     # parse & report, write nothing
 *   node db/recover-members.mjs           # apply to the database
 *
 * Reads DATABASE_URL from the environment (falls back to the local VPS default).
 */
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3306/digitalcarda";

const rosterPath = new URL("../public/members_migration.json", import.meta.url);
const roster = JSON.parse(readFileSync(rosterPath, "utf8"));

// Optional: real passwords from the old export (present on the VPS only).
const passByEmail = new Map();
const custPath = new URL("../public/customers.json", import.meta.url);
if (existsSync(custPath)) {
  try {
    const cust = JSON.parse(readFileSync(custPath, "utf8"));
    for (const c of cust) {
      const e = String(c.email || "").trim().toLowerCase();
      if (e && c.password) passByEmail.set(e, String(c.password));
    }
    console.log(`Loaded ${passByEmail.size} real passwords from customers.json`);
  } catch (e) {
    console.warn("Could not parse customers.json — using default passwords for new rows.", e.message);
  }
} else {
  console.log("customers.json not found — new rows will get a default password (existing rows keep theirs).");
}

const roleFor = (pkg) => (String(pkg || "").trim().toUpperCase() === "STANDARD" ? "reseller" : "customer");

// De-duplicate the roster by email and compute the intended role.
const seen = new Set();
const rows = [];
let skipped = 0;
for (const m of roster) {
  const email = String(m.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || seen.has(email)) { skipped++; continue; }
  seen.add(email);
  rows.push({
    email,
    fullName: String(m.name || email).trim(),
    phone: String(m.phone || "").trim(),
    role: roleFor(m.package),
  });
}

const customers = rows.filter((r) => r.role === "customer").length;
const resellers = rows.filter((r) => r.role === "reseller").length;
console.log(`\nRoster: ${roster.length} rows → ${rows.length} unique emails (skipped ${skipped}).`);
console.log(`  customers: ${customers}`);
console.log(`  resellers: ${resellers}`);

if (DRY) {
  console.log("\n[dry run] No database changes made. Re-run without --dry to apply.");
  process.exit(0);
}

const conn = await mysql.createConnection(url);
let inserted = 0, updated = 0;
const defaultHash = await bcrypt.hash("changeme123", 8);

for (const r of rows) {
  const plain = passByEmail.get(r.email);
  const hash = plain ? await bcrypt.hash(plain, 8) : defaultHash;
  // INSERT sets password for new rows; ON DUPLICATE preserves password and never
  // demotes a super_admin.
  const [res] = await conn.execute(
    `INSERT INTO users (email, password, full_name, phone, role, status)
     VALUES (?, ?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       phone     = VALUES(phone),
       role      = IF(role = 'super_admin', role, VALUES(role))`,
    [r.email, hash, r.fullName, r.phone, r.role]
  );
  // mysql2 affectedRows: 1 = inserted, 2 = updated (an existing row changed).
  if (res.affectedRows === 1) inserted++; else updated++;
  if ((inserted + updated) % 100 === 0) console.log(`  …${inserted + updated} processed`);
}

const [[counts]] = await conn.query(
  "SELECT COUNT(*) AS total, SUM(role='customer') AS customers, SUM(role='reseller') AS resellers, SUM(role='super_admin') AS admins FROM users"
);
console.log(`\nDone. inserted: ${inserted}, updated: ${updated}.`);
console.log(`users table now → total ${counts.total}, customers ${counts.customers}, resellers ${counts.resellers}, admins ${counts.admins}`);
await conn.end();
