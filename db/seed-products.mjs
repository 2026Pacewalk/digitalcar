/*
 * Phase 06 — create the `products` table (additive) and seed one product per
 * design preset. Idempotent. LOCAL SANDBOX use; the same additive SQL runs on
 * live when deployment is approved. Writes nothing destructive.
 */
import mysql from "mysql2/promise";
import "dotenv/config";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── 1. Additive table (safe: IF NOT EXISTS) ───────────────────────
await conn.query(`
  CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) NULL,
    description TEXT NULL,
    style_number INT NOT NULL DEFAULT 1,
    category VARCHAR(100) NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(10,2) NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    trial_days INT NOT NULL DEFAULT 30,
    primary_color VARCHAR(7) NULL,
    secondary_color VARCHAR(7) NULL,
    images JSON NULL,
    seo_title VARCHAR(255) NULL,
    seo_description VARCHAR(500) NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX product_status_idx (status),
    INDEX product_category_idx (category)
  )`);
console.log("✅ products table ready");

// ── 2. Seed from the live design catalogue (app_settings.template_presets) ──
const [[row]] = await conn.query("SELECT value FROM app_settings WHERE `key`='template_presets'");
const presets = row ? JSON.parse(row.value) : [];
const slugify = (s) => String(s).toLowerCase().replace(/\(bio\)/g, "bio").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

let created = 0, skipped = 0;
for (let i = 0; i < presets.length; i++) {
  const p = presets[i];
  const slug = `${slugify(p.name)}-card`;
  const [exists] = await conn.query("SELECT id FROM products WHERE slug=? LIMIT 1", [slug]);
  if (exists.length) { skipped++; continue; }
  await conn.query(
    `INSERT INTO products
      (slug, name, tagline, style_number, category, price, currency, trial_days,
       primary_color, secondary_color, status, display_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [slug, `${p.name} Digital Business Card`, "Instant digital card — no app, no printing",
      p.style, null, "999.00", "INR", 30, p.primary || null, p.secondary || null,
      "published", i]
  );
  created++;
}
const [[{ n }]] = await conn.query("SELECT COUNT(*) n FROM products");
console.log(`✅ seeded ${created} new, ${skipped} existing → ${n} products total`);
await conn.end();
