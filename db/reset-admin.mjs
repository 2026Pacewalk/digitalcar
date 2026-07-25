/*
 * Reset (or create) the super-admin account — the login-recovery tool.
 *
 * On the server, run it from the project directory. It reads DATABASE_URL,
 * ADMIN_EMAIL and ADMIN_PASSWORD from .env automatically:
 *
 *   node db/reset-admin.mjs
 *
 * Or set the password inline (overrides .env) — use this to be certain which
 * password gets set:
 *
 *   ADMIN_PASSWORD='YourNewStrongPassword' node db/reset-admin.mjs
 *
 * SAFE: touches ONLY the one super-admin row. If a user with ADMIN_EMAIL
 * exists, its password + role are reset and it's set active; otherwise a new
 * super-admin is created. No other users or data are affected.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const email = (process.env.ADMIN_EMAIL || "hellopacewalk@gmail.com").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD;
const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/digitalcarda";

if (!password || password.length < 8) {
  console.error("✗ Set ADMIN_PASSWORD (min 8 chars), e.g.  ADMIN_PASSWORD='S3cret!Pass' node db/reset-admin.mjs");
  process.exit(1);
}

const conn = await mysql.createConnection(url);
const hash = await bcrypt.hash(password, 12);

// Upsert on the unique email: create the admin if missing, otherwise reset it.
const [res] = await conn.execute(
  `INSERT INTO users (email, password, full_name, role, status)
   VALUES (?, ?, 'Super Admin', 'super_admin', 'active')
   ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'super_admin', status = 'active'`,
  [email, hash]
);

// mysql affectedRows: 1 = row created, 2 = existing row updated, 0 = no change
const action = res.affectedRows === 1 ? "created" : "updated";
console.log(`✓ Super-admin ${action}: ${email}  (role super_admin, status active).`);
console.log("  Sign in with this email and the ADMIN_PASSWORD you just set.");
await conn.end();
