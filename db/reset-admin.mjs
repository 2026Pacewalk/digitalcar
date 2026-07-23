/*
 * Reset the super-admin password.
 *
 *   ADMIN_PASSWORD='YourNewStrongPassword' node db/reset-admin.mjs
 *
 * Optional: ADMIN_EMAIL (defaults to admin@digitalcarda.com).
 * Reads DATABASE_URL from the environment (falls back to the local dev DB).
 */
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const email = (process.env.ADMIN_EMAIL || "hellopacewalk@gmail.com").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD;
const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/digitalcarda";

if (!password || password.length < 8) {
  console.error("✗ Set ADMIN_PASSWORD (min 8 chars). e.g.  ADMIN_PASSWORD='S3cret!Pass' node db/reset-admin.mjs");
  process.exit(1);
}

const conn = await mysql.createConnection(url);
const hash = await bcrypt.hash(password, 12);
const [res] = await conn.execute(
  "UPDATE users SET password = ?, role = 'super_admin' WHERE email = ?",
  [hash, email]
);
if (res.affectedRows === 0) {
  console.error(`✗ No user found with email ${email}. Nothing changed.`);
  process.exit(1);
}
console.log(`✓ Password updated for ${email} (super_admin).`);
await conn.end();
