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

    // Align products to the Gold plan price ("plans are the price"): bump only
    // the old ₹499 placeholder to Gold's yearly price. Anything else (admin edits)
    // is left untouched, so this becomes a no-op once done.
    const [gold] = await conn.query("SELECT yearly_price AS p FROM subscription_packages WHERE slug='gold' LIMIT 1");
    const goldYearly = gold[0]?.p;
    if (goldYearly) {
      const [up] = await conn.query("UPDATE products SET price=?, sale_price=NULL WHERE price='499.00'", [goldYearly]);
      if (up.affectedRows) console.log(`✓ Aligned ${up.affectedRows} products to Gold price ₹${goldYearly}.`);
    }
    // Platinum products are a finite cap (100), not unlimited — keep the pricing
    // page + dashboard limit in step. Only touches the old "unlimited" sentinel.
    const [cap] = await conn.query("UPDATE subscription_packages SET max_products=100 WHERE id=6 AND max_products>=9999");
    if (cap.affectedRows) console.log("✓ Capped Platinum products at 100.");
  } catch (e) {
    console.log("• Plans seed skipped: " + (e.code || e.message));
  }

  // Marketing media (mockup gallery + SEO) for launch templates. Non-destructive:
  // only fills products whose images are still empty, so admin edits are never
  // overwritten and later deploys become a no-op. Image files ship in public/.
  try {
    const media = (dir, files) => files.map((f) => `/products/${dir}/${f}`);
    const MEDIA = [
      { slug: "ocean-blue-card", title: "Ocean Blue Digital Business Card - Free 30-Day Trial",
        desc: "Ocean Blue smart digital business card: one-tap call, WhatsApp, QR code, Google Maps & lead capture. Works on any phone, no app. Try free for 30 days.",
        imgs: media("ocean-blue", ["ocean-blue-digital-business-card.png", "ocean-blue-digital-business-card-features.png", "ocean-blue-digital-business-card-preview.png", "ocean-blue-digital-business-card-services.png"]) },
      { slug: "midnight-gold-card", title: "Midnight Gold Digital Business Card - Free 30-Day Trial",
        desc: "Midnight Gold smart digital business card: one-tap call, WhatsApp, QR code, Google Maps & lead capture. Works on any phone, no app. Try free for 30 days.",
        imgs: media("midnight-gold", ["midnight-gold-digital-business-card.png", "midnight-gold-digital-business-card-features.png", "midnight-gold-digital-business-card-preview.png", "midnight-gold-digital-business-card-services.png"]) },
      { slug: "emerald-card", title: "Emerald Green Digital Business Card - Free 30-Day Trial",
        desc: "Emerald Green smart digital business card: one-tap call, WhatsApp, QR code, Google Maps & lead capture. Works on any phone, no app. Try free for 30 days.",
        imgs: media("emerald", ["emerald-digital-business-card.png", "emerald-digital-business-card-features.png", "emerald-digital-business-card-preview.png", "emerald-digital-business-card-showcase.png"]) },
    ];
    let n = 0;
    for (const m of MEDIA) {
      const [r] = await conn.query(
        "UPDATE products SET images = CAST(? AS JSON), seo_title = COALESCE(NULLIF(seo_title,''), ?), seo_description = COALESCE(NULLIF(seo_description,''), ?) WHERE slug = ? AND (images IS NULL OR JSON_LENGTH(images) = 0)",
        [JSON.stringify(m.imgs), m.title, m.desc, m.slug]);
      n += r.affectedRows || 0;
    }
    console.log(n ? `✓ Seeded marketing media for ${n} product(s).` : "• Product media already set — skipped.");

    // The 37 remaining launch templates: 4-image mockup galleries imported from
    // the design batch. Same folder/naming convention (folder = slug without
    // "-card", 4th image = "-services"). Names come from the DB so seo copy reads
    // naturally. Same non-destructive guard — images-empty only. Files ship in public/.
    const BATCH = [
      "royal-purple-card", "crimson-card", "sunset-card", "rose-pink-card", "slate-pro-card",
      "forest-card", "ruby-card", "violet-card", "cyan-wave-card", "tangerine-card",
      "magenta-card", "steel-blue-card", "lime-card", "coral-card", "deep-sea-card",
      "bronze-card", "plum-card", "scarlet-card", "aqua-card", "marigold-card",
      "sapphire-card", "fuchsia-card", "pine-card", "onyx-gold-card", "ivory-bloom-bio-card",
      "aurora-glass-bio-card", "midnight-neon-bio-card", "sunset-warm-bio-card", "ocean-frost-bio-card",
      "noir-bold-bio-card", "peach-soft-bio-card", "gold-luxe-bio-card", "neon-cyber-bio-card",
      "retro-groove-bio-card", "editorial-bio-card", "mint-fresh-bio-card", "lavender-dream-bio-card",
    ];
    const [pn] = await conn.query("SELECT slug, name FROM products WHERE slug IN (?)", [BATCH]);
    const nameBySlug = Object.fromEntries(pn.map((r) => [r.slug, r.name]));
    let n2 = 0;
    for (const slug of BATCH) {
      const folder = slug.replace(/-card$/, "");
      const base = `${folder}-digital-business-card`;
      const imgs = media(folder, [`${base}.png`, `${base}-features.png`, `${base}-preview.png`, `${base}-services.png`]);
      const name = nameBySlug[slug] || slug;
      const title = `${name} - Free 30-Day Trial`;
      const desc = `${name}: one-tap call, WhatsApp, QR code, Google Maps & lead capture. Works on any phone, no app. Try free for 30 days.`;
      const [r] = await conn.query(
        "UPDATE products SET images = CAST(? AS JSON), seo_title = COALESCE(NULLIF(seo_title,''), ?), seo_description = COALESCE(NULLIF(seo_description,''), ?) WHERE slug = ? AND (images IS NULL OR JSON_LENGTH(images) = 0)",
        [JSON.stringify(imgs), title, desc, slug]);
      n2 += r.affectedRows || 0;
    }
    console.log(n2 ? `✓ Seeded marketing media for ${n2} more product(s).` : "• Batch product media already set — skipped.");
  } catch (e) {
    console.log("• Product media seed skipped: " + (e.code || e.message));
  }
} finally {
  await conn.end();
}
