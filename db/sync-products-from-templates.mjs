/*
 * DigitalCarda — keep the PRODUCT catalogue in step with the TEMPLATE presets.
 * ------------------------------------------------------------------
 * A design should exist once: as a template preset AND as a sellable product
 * row. Newer presets (e.g. the link-bio and premium ID/membership designs) were
 * added without matching products, so the admin showed 51 templates vs 40
 * products. This creates a product for any preset that doesn't have one and
 * aligns template_category / featured on the ones that do.
 *
 * Additive + idempotent: never deletes a product, never overwrites admin copy
 * (name/description/SEO/images are only set when creating a brand-new row).
 */
import mysql from "mysql2/promise";
import "dotenv/config";

const K_PRESETS = "template_presets";
const slugify = (s) => String(s).toLowerCase().replace(/\(|\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function syncProductsFromTemplates(conn, log = (s) => console.log(s)) {
  const [setRows] = await conn.query("SELECT value FROM app_settings WHERE `key` = ?", [K_PRESETS]);
  if (!setRows[0]?.value) { log("• no template presets stored (skipped)"); return { created: 0, aligned: 0 }; }
  let presets;
  try { presets = JSON.parse(setRows[0].value); } catch { log("• presets unreadable (skipped)"); return { created: 0, aligned: 0 }; }
  if (!Array.isArray(presets)) return { created: 0, aligned: 0 };

  const [prods] = await conn.query("SELECT id, slug, style_number, template_category, is_featured FROM products");
  const byStyle = new Map(prods.map((p) => [Number(p.style_number), p]));
  const slugs = new Set(prods.map((p) => p.slug));

  let created = 0, aligned = 0;
  for (const pre of presets) {
    const style = Number(pre.style);
    if (!style) continue;
    const category = pre.category || "modern";
    const featured = pre.featured ? 1 : 0;
    const existing = byStyle.get(style);

    if (existing) {
      // Keep the shared taxonomy in step (cheap, non-destructive).
      if (existing.template_category !== category || Number(existing.is_featured) !== featured) {
        await conn.query("UPDATE products SET template_category = ?, is_featured = ? WHERE id = ?", [category, featured, existing.id]);
        aligned++;
      }
      continue;
    }

    // Create the missing product for this design.
    const isBio = /\(bio\)/i.test(pre.name);
    const clean = pre.name.replace(/\s*\(bio\)/i, "").trim();
    const base = slugify(clean);
    // Don't produce "…-card-card" for designs already named "… Card".
    const endsWithCard = /card$/i.test(clean);
    let slug = endsWithCard ? base : `${base}-card`;
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;
    slugs.add(slug);

    const name = isBio
      ? `${clean} Link-in-Bio Card`
      : endsWithCard ? clean : `${clean} Digital Business Card`;
    const description =
      `${name} is a ready-to-use digital business card design from DigitalCarda.` +
      ` Share your contact details, services, photos and payment links from one link or QR code — no app needed for you or the people you share it with.` +
      ` Update your details any time and your live card changes instantly, so a printed QR never goes out of date.`;

    await conn.query(
      `INSERT INTO products
        (slug, name, tagline, description, style_number, price, currency, trial_days,
         primary_color, secondary_color, seo_title, seo_description, status, template_category, is_featured, display_order)
       VALUES (?, ?, ?, ?, ?, '0.00', 'INR', 30, ?, ?, ?, ?, 'published', ?, ?, ?)`,
      [
        slug, name, "Instant digital card — no app, no printing", description, style,
        pre.primary || null, pre.secondary || null,
        `${name} — Digital Business Card Design | DigitalCarda`.slice(0, 255),
        `Create your ${name} in minutes. Share by link or QR, capture enquiries and update details anytime. Included with your DigitalCarda plan — start free for 30 days.`.slice(0, 500),
        category, featured, style,
      ],
    );
    created++;
  }

  log(`✓ products synced from templates — created: ${created}, aligned: ${aligned} (${presets.length} designs)`);
  return { created, aligned };
}

// Standalone: node db/sync-products-from-templates.mjs
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const url = process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) { console.error("✗ No DATABASE_URL"); process.exit(1); }
  const conn = await mysql.createConnection(url);
  await syncProductsFromTemplates(conn);
  await conn.end();
}
