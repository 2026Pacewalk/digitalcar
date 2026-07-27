/*
 * DigitalCarda — GO-LIVE additive schema migration.
 * ------------------------------------------------------------------
 * Creates every new table/column built across Phases 02–28. 100% ADDITIVE:
 * only CREATE TABLE IF NOT EXISTS + one constraint relaxation (leads.card_id
 * NOT NULL -> NULL). It NEVER drops, alters existing columns, or touches a row.
 * Idempotent — safe to run more than once.
 *
 * ALWAYS run `node db/backup.mjs` first.
 *
 * Usage:  DATABASE_URL="mysql://user:pass@host:port/db" node db/migrate-live.mjs
 */
import mysql from "mysql2/promise";
import "dotenv/config";

// Target LIVE explicitly via LIVE_DATABASE_URL so the everyday DATABASE_URL can
// stay pointed at local — nothing else in the app can accidentally hit prod.
const url = process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("✗ Set LIVE_DATABASE_URL (tunnel URL) in .env first."); process.exit(1); }
const target = new URL(url);
console.log("\n🚀  DigitalCarda go-live migration (additive only)");
console.log(`   → target: ${target.hostname}:${target.port || 3306}${target.pathname}  (user ${target.username})`);
if (!process.env.LIVE_DATABASE_URL) console.log("   ⚠  using DATABASE_URL (LIVE_DATABASE_URL not set)");
console.log("");

const conn = await mysql.createConnection(url);
const log = (s) => console.log("  " + s);

const TABLES = {
  products: `CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(191) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, tagline VARCHAR(255) NULL,
    description TEXT NULL, style_number INT NOT NULL DEFAULT 1, category VARCHAR(100) NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00, sale_price DECIMAL(10,2) NULL, currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    trial_days INT NOT NULL DEFAULT 30, primary_color VARCHAR(7) NULL, secondary_color VARCHAR(7) NULL,
    images JSON NULL, seo_title VARCHAR(255) NULL, seo_description VARCHAR(500) NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft', is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX product_status_idx (status), INDEX product_category_idx (category))`,
  card_trials: `CREATE TABLE IF NOT EXISTS card_trials (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    product_id BIGINT UNSIGNED NULL,
    status ENUM('not_started','active','expiring_soon','expired','converted','cancelled','grace') NOT NULL DEFAULT 'active',
    started_at TIMESTAMP NULL, ends_at TIMESTAMP NULL, published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
  published_cards: `CREATE TABLE IF NOT EXISTS published_cards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    slug VARCHAR(191) NOT NULL, public_id VARCHAR(16) NULL, data JSON NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX pubcard_slug_idx (slug), UNIQUE INDEX uq_pubcard_public_id (public_id))`,
  card_events: `CREATE TABLE IF NOT EXISTS card_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(191) NOT NULL, type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX cardev_slug_idx (slug), INDEX cardev_type_idx (type))`,
  funnel_events: `CREATE TABLE IF NOT EXISTS funnel_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, stage VARCHAR(40) NOT NULL, product_slug VARCHAR(191) NULL,
    user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX funnel_stage_idx (stage), INDEX funnel_product_idx (product_slug))`,
  companies: `CREATE TABLE IF NOT EXISTS companies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, admin_user_id BIGINT UNSIGNED NOT NULL,
    logo VARCHAR(500) NULL, brand_color VARCHAR(7) NULL, brand_color2 VARCHAR(7) NULL,
    approved_styles JSON NULL, mandatory_fields JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
  company_members: `CREATE TABLE IF NOT EXISTS company_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE, role ENUM('admin','employee') NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX companymember_company_idx (company_id))`,
};

for (const [name, sql] of Object.entries(TABLES)) {
  await conn.query(sql);
  log(`✓ table ${name}`);
}

// Relax leads.card_id to NULL (snapshot cards have no DB card row). Guarded.
const [col] = await conn.query(
  "SELECT IS_NULLABLE FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='leads' AND column_name='card_id'");
if (col[0] && col[0].IS_NULLABLE === "NO") {
  await conn.query("ALTER TABLE leads MODIFY card_id BIGINT UNSIGNED NULL");
  log("✓ leads.card_id -> NULLABLE");
} else {
  log("• leads.card_id already nullable (skipped)");
}

console.log("\n✅  Migration complete — additive only, no existing data touched.\n");
console.log("   Next: seed products (node db/seed-products.mjs) once the app has");
console.log("   generated its template presets, then set real INR prices in admin.\n");
await conn.end();
