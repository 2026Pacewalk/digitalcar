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
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
    card_id INT NOT NULL DEFAULT 1,
    slug VARCHAR(191) NOT NULL, public_id VARCHAR(16) NULL, data JSON NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX pubcard_slug_idx (slug), UNIQUE INDEX uq_pubcard_public_id (public_id),
    UNIQUE INDEX uq_pubcard_user_card (user_id, card_id))`,
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
  bulk_order_requests: `CREATE TABLE IF NOT EXISTS bulk_order_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NULL,
    company VARCHAR(255) NULL, contact_name VARCHAR(255) NULL, phone VARCHAR(50) NULL, email VARCHAR(255) NULL,
    quantity INT NOT NULL DEFAULT 0, price_per_card DECIMAL(10,2) NOT NULL DEFAULT 0, total_estimate DECIMAL(10,2) NOT NULL DEFAULT 0,
    package_name VARCHAR(50) NULL, note TEXT NULL,
    status ENUM('new','contacted','won','lost') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX bulkreq_user_idx (user_id), INDEX bulkreq_status_idx (status))`,
  card_addons: `CREATE TABLE IF NOT EXISTS card_addons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('id_card','membership') NOT NULL,
    billing_cycle ENUM('monthly','yearly') NOT NULL DEFAULT 'yearly',
    status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX addon_user_idx (user_id), UNIQUE INDEX uq_addon_user_type (user_id, type))`,
  ai_generations: `CREATE TABLE IF NOT EXISTS ai_generations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, business_name VARCHAR(120) NULL, profession VARCHAR(80) NULL,
    city VARCHAR(80) NULL, phone VARCHAR(30) NULL, source VARCHAR(16) NULL, ip VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX aigen_created_idx (created_at), INDEX aigen_phone_idx (phone))`,
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

// Phase 31: enforce unique published_cards.slug (defense-in-depth vs card hijack).
// Best-effort — if legacy duplicates exist it's skipped (the app-level ownership
// check already prevents new collisions), never failing the deploy.
try {
  await conn.query("ALTER TABLE published_cards ADD UNIQUE INDEX uq_pubcard_slug (slug)");
  log("✓ published_cards.slug -> UNIQUE");
} catch (e) {
  log("• published_cards.slug unique skipped (" + (e.code || e.message) + ")");
}

// Phase 35: super-admin per-user card-limit override (null = plan default).
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='card_limit'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE users ADD COLUMN card_limit INT NULL AFTER status");
    log("✓ users.card_limit added (nullable override)");
  } else { log("• users.card_limit present (skipped)"); }
}

// Email verification (new-flow accounts). EXISTING users default to verified (1)
// so no one is disrupted; the register endpoint inserts new signups with 0 and
// sends them a verification email. Additive + guarded + idempotent.
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='email_verified'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER status");
    await conn.query("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL AFTER email_verified");
    log("✓ users.email_verified added (existing users default verified)");
  } else { log("• users.email_verified present (skipped)"); }
}

// Phase 34: multi-card publishing — published_cards goes one-row-per-card so a
// multi-card plan can publish several. Add card_id (default 1 = primary), drop
// the single-column user_id UNIQUE, add composite UNIQUE (user_id, card_id).
// Existing rows are each user's primary card — untouched.
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='published_cards' AND column_name='card_id'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE published_cards ADD COLUMN card_id INT NOT NULL DEFAULT 1 AFTER user_id");
    log("✓ published_cards.card_id added (default 1)");
  } else { log("• published_cards.card_id present (skipped)"); }
  // Drop any single-column UNIQUE index on user_id (blocks multi-card publish).
  const [idx] = await conn.query(
    `SELECT INDEX_NAME AS name, COUNT(*) AS cols,
            SUM(CASE WHEN COLUMN_NAME='user_id' THEN 1 ELSE 0 END) AS hasUser
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='published_cards' AND NON_UNIQUE=0 AND INDEX_NAME<>'PRIMARY'
     GROUP BY INDEX_NAME`);
  for (const r of idx) {
    if (Number(r.cols) === 1 && Number(r.hasUser) === 1) {
      await conn.query("ALTER TABLE published_cards DROP INDEX `" + r.name + "`");
      log("✓ dropped single-column user_id UNIQUE (" + r.name + ")");
    }
  }
  const [uq] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE table_schema=DATABASE() AND table_name='published_cards' AND index_name='uq_pubcard_user_card'");
  if (uq[0].n === 0) {
    try { await conn.query("ALTER TABLE published_cards ADD UNIQUE INDEX uq_pubcard_user_card (user_id, card_id)"); log("✓ published_cards (user_id, card_id) UNIQUE added"); }
    catch (e) { log("• uq_pubcard_user_card skipped (" + (e.code || e.message) + ")"); }
  }
}

// Phase 32: 3-year (triennial) billing support. Additive column + enum widening
// (enum widening never drops existing 'monthly'/'yearly' values). Then upsert the
// live INR plan rows so three_year_price is populated. Runs BEFORE the app reload,
// so the new code that SELECTs three_year_price never hits a missing column.
{
  const [tyc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='subscription_packages' AND column_name='three_year_price'");
  if (tyc[0].n === 0) {
    await conn.query("ALTER TABLE subscription_packages ADD COLUMN three_year_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER yearly_price");
    log("✓ subscription_packages.three_year_price added");
  } else {
    log("• three_year_price already present (skipped)");
  }
  // Enum widening — idempotent (same definition = no-op).
  await conn.query("ALTER TABLE subscriptions MODIFY COLUMN billing_cycle ENUM('monthly','yearly','triennial') NOT NULL DEFAULT 'monthly'");
  await conn.query("ALTER TABLE payment_orders MODIFY COLUMN billing_cycle ENUM('monthly','yearly','triennial') NOT NULL DEFAULT 'monthly'");
  log("✓ billing_cycle enum widened to include 'triennial'");
  // Upsert live INR plans (Trial 7 / Gold 5 / Platinum 6) with 3-year prices.
  await conn.query(`INSERT INTO subscription_packages
    (id, name, slug, description, monthly_price, yearly_price, three_year_price, trial_days,
     max_cards, max_products, max_gallery_images, max_videos, storage_limit_mb,
     feature_custom_domain, feature_seo, feature_analytics, feature_lead_capture,
     feature_remove_branding, feature_white_label, feature_priority_support,
     feature_ai, feature_multilingual, feature_crm, is_active, display_order)
    VALUES
     (7,'Trial','trial','Full Gold features, free for 30 days',0.00,0.00,0.00,30,1,25,20,8,100,0,0,1,1,0,0,0,0,0,0,1,0),
     (5,'Gold','gold','Everything a business needs',99.00,999.00,2499.00,30,1,25,20,8,500,0,0,1,1,0,0,0,0,0,0,1,1),
     (6,'Platinum','platinum','For brands that want it all',199.00,1999.00,4999.00,30,3,9999,60,25,2000,1,1,1,1,1,0,1,1,1,1,1,2)
    ON DUPLICATE KEY UPDATE
     name=VALUES(name), slug=VALUES(slug), description=VALUES(description),
     monthly_price=VALUES(monthly_price), yearly_price=VALUES(yearly_price), three_year_price=VALUES(three_year_price),
     trial_days=VALUES(trial_days), max_cards=VALUES(max_cards), max_products=VALUES(max_products),
     max_gallery_images=VALUES(max_gallery_images), max_videos=VALUES(max_videos), storage_limit_mb=VALUES(storage_limit_mb),
     feature_custom_domain=VALUES(feature_custom_domain), feature_seo=VALUES(feature_seo), feature_analytics=VALUES(feature_analytics),
     feature_lead_capture=VALUES(feature_lead_capture), feature_remove_branding=VALUES(feature_remove_branding),
     feature_white_label=VALUES(feature_white_label), feature_priority_support=VALUES(feature_priority_support),
     feature_ai=VALUES(feature_ai), feature_multilingual=VALUES(feature_multilingual), feature_crm=VALUES(feature_crm),
     is_active=VALUES(is_active), display_order=VALUES(display_order)`);
  await conn.query("UPDATE subscription_packages SET is_active = 0 WHERE id IN (1,2,3,4)");
  log("✓ live INR plans upserted (Trial/Gold/Platinum + 3-year prices)");
}

// Phase 33: back-fill legacy enquiries.json into the leads CRM so old + new
// leads live in one place (/dashboard/leads). Idempotent & additive — reads
// dist/public|public JSON (built just before this step), never deletes it.
try {
  const { importLegacyEnquiries } = await import("./import-legacy-enquiries.mjs");
  await importLegacyEnquiries(conn, log);
} catch (e) {
  log("• legacy enquiries import skipped (" + (e.code || e.message) + ")");
}

// Deep analytics: enrich card_events so an event records WHAT was tapped, on
// WHICH device, from WHICH source, by an anonymous visitor — instead of just
// "a tap happened". Every column is NULLABLE, so existing rows stay valid and
// every query tolerates NULLs. Nothing personal is stored: visitor_id is a
// rotating salted hash (never an IP) and geo is coarse country/city from the
// CDN edge headers. Idempotent — each column/index is checked before adding.
{
  const evCols = [
    ["label", "VARCHAR(191) NULL"],
    ["card_id", "INT NULL"],
    ["visitor_id", "VARCHAR(64) NULL"],
    ["session_id", "VARCHAR(64) NULL"],
    ["device", "VARCHAR(16) NULL"],
    ["os", "VARCHAR(24) NULL"],
    ["browser", "VARCHAR(24) NULL"],
    ["source", "VARCHAR(32) NULL"],
    ["referrer", "VARCHAR(255) NULL"],
    ["country", "VARCHAR(2) NULL"],
    ["city", "VARCHAR(64) NULL"],
    ["duration_ms", "INT NULL"],
    ["meta", "JSON NULL"],
  ];
  let added = 0;
  for (const [col, ddl] of evCols) {
    const [r] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='card_events' AND column_name=?", [col]);
    if (r[0].n === 0) { await conn.query(`ALTER TABLE card_events ADD COLUMN ${col} ${ddl}`); added++; }
  }
  log(added ? `✓ card_events: ${added} analytics column(s) added` : "• card_events analytics columns already present (skipped)");

  // Range + breakdown queries always filter slug (+type) over a date window.
  const evIdx = [
    ["cardev_slug_created_idx", "(slug, created_at)"],
    ["cardev_slug_type_created_idx", "(slug, type, created_at)"],
    ["cardev_visitor_idx", "(visitor_id)"],
  ];
  let idx = 0;
  for (const [name, cols] of evIdx) {
    const [r] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE table_schema=DATABASE() AND table_name='card_events' AND index_name=?", [name]);
    if (r[0].n === 0) { await conn.query(`ALTER TABLE card_events ADD INDEX ${name} ${cols}`); idx++; }
  }
  log(idx ? `✓ card_events: ${idx} analytics index(es) added` : "• card_events analytics indexes already present (skipped)");
}

// SECURITY SCRUB: an old change-password bug wrote the user's PLAINTEXT password
// into the card JSON (dc_customer), which auto-publish then copied into the
// public snapshot — where publish.bySlug served it to anyone. The code paths are
// fixed (the mutation is server-side + bcrypt now, and saveSnapshot/bySlug strip
// these keys on both write and read), but historic rows can still carry the
// value. This removes ONLY those secret keys from the JSON and touches nothing
// else. Idempotent: once clean, it reports and skips.
{
  const SECRET_PATHS = ["$.customer.password", "$.customer.email_verify_on", "$.customer.otp", "$.customer.reset_token"];
  const whereAny = SECRET_PATHS.map((p) => `JSON_EXTRACT(data, '${p}') IS NOT NULL`).join(" OR ");
  const [before] = await conn.query(`SELECT COUNT(*) AS n FROM published_cards WHERE ${whereAny}`);
  if (before[0].n > 0) {
    await conn.query(
      `UPDATE published_cards
         SET data = JSON_REMOVE(data, ${SECRET_PATHS.map((p) => `'${p}'`).join(", ")})
       WHERE ${whereAny}`);
    const [after] = await conn.query(`SELECT COUNT(*) AS n FROM published_cards WHERE ${whereAny}`);
    log(`✓ published_cards: secrets stripped from ${before[0].n} snapshot(s) — ${after[0].n} remaining`);
  } else {
    log("• published_cards snapshots carry no secrets (skipped)");
  }
}

console.log("\n✅  Migration complete — additive only, no existing data touched.\n");
console.log("   Next: seed products (node db/seed-products.mjs) once the app has");
console.log("   generated its template presets, then set real INR prices in admin.\n");
await conn.end();
