/*
 * DigitalCarda — first-deploy catalogue seed (idempotent, self-skipping).
 * ------------------------------------------------------------------
 * Runs golive-products.sql (40 cards @ INR 499 + demo-account deactivation)
 * ONLY when the products table is empty. On every later deploy it detects an
 * already-populated catalogue and SKIPS — so admin price/content edits made in
 * the panel are never overwritten. Additive; never drops or clears anything.
 *
 * Usage:  node db/golive-seed.mjs   (reads DATABASE_URL / LIVE_DATABASE_URL)
 */
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import "dotenv/config";

const url = process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("✗ No DATABASE_URL / LIVE_DATABASE_URL set."); process.exit(1); }

const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
try {
  const [rows] = await conn.query("SELECT COUNT(*) AS n FROM products");
  const count = rows[0].n;
  if (count > 0) {
    console.log(`• Catalogue already has ${count} products — skipping seed (admin edits preserved).`);
  } else {
    const sqlPath = path.join(process.cwd(), "db", "golive-products.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await conn.query(sql);
    const [after] = await conn.query("SELECT COUNT(*) AS n FROM products");
    console.log(`✓ Seeded catalogue — ${after[0].n} products @ INR 499.`);
  }

  // Plans (Trial/Gold/Platinum) — idempotent upsert, so it runs EVERY deploy to
  // keep server-side entitlement rows in sync with the pricing page. Never drops
  // the old tiers (just sets is_active=0); existing subscriptions are unaffected.
  try {
    const plansPath = path.join(process.cwd(), "db", "seed-plans-inr.sql");
    await conn.query(fs.readFileSync(plansPath, "utf8"));
    const [pl] = await conn.query("SELECT COUNT(*) AS n FROM subscription_packages WHERE is_active = 1");
    console.log(`✓ Plans synced — ${pl[0].n} active tiers (Trial/Gold/Platinum).`);
  } catch (e) {
    console.log("• Plans seed skipped: " + (e.code || e.message));
  }
} finally {
  await conn.end();
}
