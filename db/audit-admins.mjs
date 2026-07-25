/*
 * Audit (and optionally clean up) super-admin accounts.
 *
 *   node db/audit-admins.mjs          # list every super_admin, flag rogue ones
 *   node db/audit-admins.mjs --fix    # downgrade every super_admin except
 *                                     # ADMIN_EMAIL back to a normal 'customer'
 *
 * ADMIN_EMAIL (default hellopacewalk@gmail.com) is the ONE legitimate super
 * admin. Any other super_admin — e.g. a leftover "testing" account someone made
 * in the panel — is a mistake and is downgraded to a normal customer by --fix.
 *
 * SAFE: reads DATABASE_URL from .env; only changes the ROLE of rogue super
 * admins (never deletes an account, never touches the designated admin).
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/digitalcarda";
const adminEmail = (process.env.ADMIN_EMAIL || "hellopacewalk@gmail.com").toLowerCase().trim();
const FIX = process.argv.includes("--fix");

const c = await mysql.createConnection(url);
const [admins] = await c.query("SELECT id, email, full_name, role, status FROM users WHERE role='super_admin'");

console.log(`Designated super admin (ADMIN_EMAIL): ${adminEmail}`);
console.log(`\nFound ${admins.length} super_admin account(s):`);
const rogues = [];
for (const a of admins) {
  const legit = String(a.email || "").toLowerCase().trim() === adminEmail;
  console.log(`  ${legit ? "OK   " : "ROGUE"}  id=${a.id}  ${a.email}  "${a.full_name}"  (${a.status})`);
  if (!legit) rogues.push(a);
}

if (!rogues.length) {
  console.log("\n✓ No rogue super admins — clean.");
  await c.end();
  process.exit(0);
}

if (!FIX) {
  console.log(`\n→ ${rogues.length} rogue super_admin(s). DRY RUN — nothing changed. Re-run with --fix to downgrade them to 'customer'.`);
  await c.end();
  process.exit(0);
}

for (const r of rogues) {
  await c.execute("UPDATE users SET role='customer' WHERE id=? AND email<>?", [r.id, adminEmail]);
  console.log(`  downgraded id=${r.id} ${r.email} → customer`);
}
console.log(`\n✓ Downgraded ${rogues.length} rogue super_admin(s). ${adminEmail} remains the only super admin.`);
await c.end();
