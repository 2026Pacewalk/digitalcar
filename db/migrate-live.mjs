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
  /* Every email the platform sends, so support can answer "did they get it?".
     Deliberately NO body/html column: welcome mails carry a plaintext password,
     and a log is read by far more people than a mailbox is. */
  email_logs: `CREATE TABLE IF NOT EXISTS email_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL, subject VARCHAR(300) NOT NULL,
    kind VARCHAR(64) NULL, reply_to VARCHAR(255) NULL,
    status ENUM('sent','failed','skipped') NOT NULL DEFAULT 'sent', error VARCHAR(500) NULL,
    user_id BIGINT UNSIGNED NULL, sent_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX emlog_created_idx (created_at), INDEX emlog_to_idx (to_email),
    INDEX emlog_status_idx (status), INDEX emlog_kind_idx (kind),
    INDEX emlog_user_created (user_id, created_at))`,
  // Coupons offered to one customer until a deadline (EARLY20, day-2 trial email).
  coupon_grants: `CREATE TABLE IF NOT EXISTS coupon_grants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coupon_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
    source VARCHAR(40) NOT NULL, sent_at TIMESTAMP NULL, expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_cg_coupon_user (coupon_id, user_id), INDEX cg_user_idx (user_id))`,
  // What each logged email actually said (Admin → Email Log → view). Secrets are
  // blanked before storing (api/lib/mail.ts); rows go with their log row.
  email_log_bodies: `CREATE TABLE IF NOT EXISTS email_log_bodies (
    email_log_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    html_gz MEDIUMTEXT NULL, text_body MEDIUMTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_elb_log FOREIGN KEY (email_log_id) REFERENCES email_logs(id) ON DELETE CASCADE)`,
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
  /* Razorpay orders already fulfilled (card and domain add-ons) — dedups the
     in-browser verify against the payment webhook, and dates each sale. */
  razorpay_fulfilments: `CREATE TABLE IF NOT EXISTS razorpay_fulfilments (
    razorpay_order_id VARCHAR(64) NOT NULL PRIMARY KEY, kind VARCHAR(32) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL, razorpay_payment_id VARCHAR(64) NOT NULL,
    amount DECIMAL(12,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX rzp_fulfil_user_idx (user_id))`,
  /* Staff accounts: the admin modules each one may use. */
  staff_access: `CREATE TABLE IF NOT EXISTS staff_access (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
    job_title VARCHAR(120) NULL, permissions JSON NOT NULL,
    can_impersonate BOOLEAN NOT NULL DEFAULT FALSE, created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY staff_access_user_unique (user_id))`,
  /* Who did what in the admin portal (changes, sign-ins, visits, refusals). */
  admin_activity: `CREATE TABLE IF NOT EXISTS admin_activity (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_id BIGINT UNSIGNED NULL,
    actor_name VARCHAR(255) NOT NULL, actor_role VARCHAR(20) NOT NULL,
    module VARCHAR(40) NULL, action VARCHAR(80) NOT NULL, summary VARCHAR(300) NULL,
    target VARCHAR(191) NULL, status ENUM('ok','denied','error') NOT NULL DEFAULT 'ok',
    error VARCHAR(300) NULL, ip VARCHAR(64) NULL, user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX admact_created_idx (created_at), INDEX admact_actor_idx (actor_id, created_at),
    INDEX admact_module_idx (module, created_at), INDEX admact_status_idx (status))`,
  ai_generations: `CREATE TABLE IF NOT EXISTS ai_generations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, business_name VARCHAR(120) NULL, profession VARCHAR(80) NULL,
    city VARCHAR(80) NULL, phone VARCHAR(30) NULL, source VARCHAR(16) NULL, ip VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX aigen_created_idx (created_at), INDEX aigen_phone_idx (phone))`,
  /* The public "become a reseller" form writes here and Admin → Resellers reads
     it. It existed on production only because an early drizzle push made it —
     nothing in this repo ever created it, and it has since gone missing from
     live, which broke the apply form and the approve flow outright. */
  reseller_applications: `CREATE TABLE IF NOT EXISTS reseller_applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(50) NULL,
    company_name VARCHAR(255) NULL, message TEXT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    user_id BIGINT UNSIGNED NULL, admin_note TEXT NULL, reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ra_status_idx (status), INDEX ra_email_idx (email))`,
  /* One row per commission a reseller earns — the itemised statement behind the
     wallet credit, so a reseller can see which customer each rupee came from.
     UNIQUE on the payment order makes crediting idempotent even if the order is
     somehow activated twice. */
  reseller_commissions: `CREATE TABLE IF NOT EXISTS reseller_commissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reseller_user_id BIGINT UNSIGNED NOT NULL, customer_user_id BIGINT UNSIGNED NOT NULL,
    payment_order_id BIGINT UNSIGNED NOT NULL,
    order_amount DECIMAL(12,2) NOT NULL, rate DECIMAL(5,2) NOT NULL, amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_rc_order (payment_order_id),
    INDEX rc_reseller_idx (reseller_user_id, created_at))`,
  // Admin links/moves/unlinks of a customer to a reseller (Admin → Customers).
  reseller_assignments: `CREATE TABLE IF NOT EXISTS reseller_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_user_id BIGINT UNSIGNED NOT NULL,
    from_reseller_id BIGINT UNSIGNED NULL, to_reseller_id BIGINT UNSIGNED NULL,
    assigned_by BIGINT UNSIGNED NULL, note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX rasg_customer_idx (customer_user_id, created_at),
    INDEX rasg_to_idx (to_reseller_id))`,
  // What the team is told (Admin → bell / notifications): one row per event;
  // who may see it comes from its staff module (contracts/notifications.ts).
  team_notifications: `CREATE TABLE IF NOT EXISTS team_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, category VARCHAR(20) NOT NULL, module VARCHAR(20) NULL,
    severity ENUM('info','action','critical') NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL, message TEXT NOT NULL, link VARCHAR(500) NULL,
    entity_type VARCHAR(30) NULL, entity_id BIGINT UNSIGNED NULL,
    subject_user_id BIGINT UNSIGNED NULL,
    dedupe_key VARCHAR(120) NULL,
    resolved_at TIMESTAMP NULL, resolved_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_tn_dedupe (dedupe_key),
    INDEX tn_created_idx (created_at),
    INDEX tn_entity_idx (entity_type, entity_id),
    INDEX tn_subject_idx (subject_user_id))`,
  // Each admin's read / cleared state per team notification.
  team_notification_marks: `CREATE TABLE IF NOT EXISTS team_notification_marks (
    notification_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
    read_at TIMESTAMP NULL, cleared_at TIMESTAMP NULL,
    PRIMARY KEY (notification_id, user_id),
    INDEX tnm_user_idx (user_id),
    CONSTRAINT fk_tnm_notification FOREIGN KEY (notification_id) REFERENCES team_notifications(id) ON DELETE CASCADE)`,
  // Extra views the super admin gives a card (Admin → Customers → Card views),
  // added to the card's view counter. Never written into card_events.
  card_view_boosts: `CREATE TABLE IF NOT EXISTS card_view_boosts (
    slug VARCHAR(191) NOT NULL PRIMARY KEY,
    extra_views INT UNSIGNED NOT NULL DEFAULT 0, note VARCHAR(200) NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
  /* Old-site enquiries an owner deleted, so the enquiries.json back-fill
     (Phase 33 below) doesn't bring them back. A hash only — no names. */
  lead_tombstones: `CREATE TABLE IF NOT EXISTS lead_tombstones (
    user_id BIGINT UNSIGNED NOT NULL, key_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key_hash))`,
};

for (const [name, sql] of Object.entries(TABLES)) {
  await conn.query(sql);
  log(`✓ table ${name}`);
}

// pacewalk's views from the old platform, which used to be a number written
// into api/boot.ts, so the count on its card doesn't change. INSERT IGNORE:
// once the row exists (even at 0) this never touches it again, so the super
// admin's later changes stand.
{
  const [r] = await conn.query("INSERT IGNORE INTO card_view_boosts (slug, extra_views, note) VALUES ('pacewalk', 11542, 'Views from the old site')");
  log(r.affectedRows ? "✓ card_view_boosts: pacewalk's old-site views carried over" : "• card_view_boosts: pacewalk already set (skipped)");
}

// Staff accounts: widen users.role to include 'staff'. Idempotent (the same
// definition again is a no-op) and existing rows keep their role.
await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','reseller','customer','staff') NOT NULL DEFAULT 'customer'");

// Reseller commission is paid through the same wallet + withdrawal rail as
// referral rewards; 'commission' tells the two apart on a statement. Widening
// only — existing rows keep their type.
await conn.query("ALTER TABLE wallet_transactions MODIFY COLUMN type ENUM('reward','withdrawal','adjustment','commission') NOT NULL");
log("✓ wallet_transactions.type includes 'commission'");

// The reseller's own profile: contact details and where to pay their
// commission. Each column is guarded — MySQL has no ADD COLUMN IF NOT EXISTS.
for (const [col, def] of [
  ["whatsapp", "VARCHAR(30) NULL"],
  ["address", "VARCHAR(500) NULL"],
  ["gstin", "VARCHAR(20) NULL"],
  ["payout_method", "ENUM('bank','upi') NULL"],
  ["payout_upi", "VARCHAR(120) NULL"],
  ["payout_account_name", "VARCHAR(160) NULL"],
  ["payout_account_number", "VARCHAR(40) NULL"],
  ["payout_ifsc", "VARCHAR(20) NULL"],
]) {
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='reseller_profiles' AND column_name=?", [col]);
  if (cc[0].n === 0) {
    await conn.query(`ALTER TABLE reseller_profiles ADD COLUMN ${col} ${def}`);
    log(`✓ reseller_profiles.${col} added`);
  } else { log(`• reseller_profiles.${col} present (skipped)`); }
}
log("✓ users.role accepts 'staff'");

// Notifications: "Clear" hides a row instead of deleting it (the daily jobs
// use the rows as their send-once record), and the feed is read per user,
// newest first. Both guarded — MySQL has no ADD COLUMN / INDEX IF NOT EXISTS.
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='notifications' AND column_name='cleared_at'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE notifications ADD COLUMN cleared_at TIMESTAMP NULL AFTER link");
    log("✓ notifications.cleared_at added");
  } else { log("• notifications.cleared_at present (skipped)"); }
  const [ix] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE table_schema=DATABASE() AND table_name='notifications' AND index_name='notif_user_feed_idx'");
  if (ix[0].n === 0) {
    await conn.query("ALTER TABLE notifications ADD INDEX notif_user_feed_idx (user_id, created_at)");
    log("✓ notifications (user_id, created_at) index added");
  } else { log("• notifications feed index present (skipped)"); }
  // Who a team event is about, so erasing their account removes it.
  const [sc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='team_notifications' AND column_name='subject_user_id'");
  if (sc[0].n === 0) {
    await conn.query("ALTER TABLE team_notifications ADD COLUMN subject_user_id BIGINT UNSIGNED NULL AFTER entity_id, ADD INDEX tn_subject_idx (subject_user_id)");
    log("✓ team_notifications.subject_user_id added");
  } else { log("• team_notifications.subject_user_id present (skipped)"); }
}

// What each add-on sale was paid (the admin dashboard's revenue). Nullable:
// rows from before stay as they are. Guarded — MySQL has no ADD COLUMN IF NOT EXISTS.
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='razorpay_fulfilments' AND column_name='amount'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE razorpay_fulfilments ADD COLUMN amount DECIMAL(12,2) NULL AFTER razorpay_payment_id");
    log("✓ razorpay_fulfilments.amount added");
  } else { log("• razorpay_fulfilments.amount present (skipped)"); }
}

// Email log: who sent an email by hand (Admin → Customers → Send email), and
// each customer's emails newest first. Nullable/additive; guarded — MySQL has
// no ADD COLUMN / INDEX IF NOT EXISTS. The app writes sent_by on every email,
// so this must run before (or with) the release that ships it.
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='email_logs' AND column_name='sent_by'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE email_logs ADD COLUMN sent_by BIGINT UNSIGNED NULL AFTER user_id");
    log("✓ email_logs.sent_by added");
  } else { log("• email_logs.sent_by present (skipped)"); }
  const [ix] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE table_schema=DATABASE() AND table_name='email_logs' AND index_name='emlog_user_created'");
  if (ix[0].n === 0) {
    await conn.query("ALTER TABLE email_logs ADD INDEX emlog_user_created (user_id, created_at)");
    log("✓ email_logs (user_id, created_at) index added");
  } else { log("• email_logs (user_id, created_at) index present (skipped)"); }
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

// Phase 37: products carry the template category (product == template).
{
  const [cc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='products' AND column_name='template_category'");
  if (cc[0].n === 0) {
    await conn.query("ALTER TABLE products ADD COLUMN template_category ENUM('basic','modern','bio','professional','premium') NOT NULL DEFAULT 'modern' AFTER status");
    log("✓ products.template_category added");
  } else { log("• products.template_category present (skipped)"); }
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

// USD checkout: each payment records its currency and the ₹-per-unit rate it was
// priced at, so revenue, commission and rewards use amount × fx_rate (an INR
// value). The defaults (INR, 1) make every existing row correct with no backfill.
// Runs before the app reload, so the new code never SELECTs a missing column.
// USD prices live in app_settings — nothing here touches subscription_packages.
{
  const [t] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='payment_orders'");
  if (t[0].n) {
    for (const [col, ddl] of [
      ["currency", "VARCHAR(3) NOT NULL DEFAULT 'INR' AFTER amount"],
      ["fx_rate", "DECIMAL(10,4) NOT NULL DEFAULT 1.0000 AFTER currency"],
    ]) {
      const [r] = await conn.query(
        "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='payment_orders' AND column_name=?", [col]);
      if (r[0].n === 0) { await conn.query(`ALTER TABLE payment_orders ADD COLUMN ${col} ${ddl}`); log(`✓ payment_orders.${col} added`); }
      else log(`• payment_orders.${col} present (skipped)`);
    }
  } else log("• payment_orders missing (USD columns skipped)");

  const [sc] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='subscriptions' AND column_name='currency'");
  if (sc[0].n) {
    // The column defaulted to 'USD', a leftover; the app always wrote 'INR'.
    // Metadata-only and idempotent — no existing row is read or written.
    await conn.query("ALTER TABLE subscriptions ALTER COLUMN currency SET DEFAULT 'INR'");
    // Rows that omitted the currency (db/recover-members.mjs) still say 'USD'
    // although they were paid in ₹. They are NOT relabelled: the deploy never
    // rewrites live rows. The code resolves the label instead — a plan counts as
    // paid in $ only when the member has a verified USD payment_orders row
    // (api/lib/fx.ts effectiveRowCurrency), which every reader goes through.
    log("✓ subscriptions.currency default is 'INR'");
  }
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
  // The admin dashboard reads every card over a date window: created_at first.
  const evIdx = [
    ["cardev_slug_created_idx", "(slug, created_at)"],
    ["cardev_slug_type_created_idx", "(slug, type, created_at)"],
    ["cardev_visitor_idx", "(visitor_id)"],
    ["cardev_created_type_idx", "(created_at, type)"],
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

// Phase 37c: every template preset must also exist as a product (a design is
// one thing). Creates products for presets that have none; never deletes.
try {
  const { syncProductsFromTemplates } = await import("./sync-products-from-templates.mjs");
  if (typeof syncProductsFromTemplates === "function") await syncProductsFromTemplates(conn, log);
} catch (e) {
  log("• product/template sync skipped (" + (e.code || e.message) + ")");
}

// Phase 37b: link product mockup images + fill description/SEO where empty.
// Only writes columns that are NULL/empty, so admin-written copy is preserved.
try {
  const { backfillProductMedia } = await import("./backfill-product-media.mjs");
  if (typeof backfillProductMedia === "function") await backfillProductMedia(conn, log);
} catch (e) {
  log("• product media backfill skipped (" + (e.code || e.message) + ")");
}

console.log("\n✅  Migration complete — additive only, no existing data touched.\n");
console.log("   Next: seed products (node db/seed-products.mjs) once the app has");
console.log("   generated its template presets, then set real INR prices in admin.\n");
await conn.end();
