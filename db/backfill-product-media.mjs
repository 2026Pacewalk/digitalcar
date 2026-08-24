/*
 * DigitalCarda — backfill product mockup images + description/SEO.
 * ------------------------------------------------------------------
 * The marketing mockups already ship in public/products/<base>/, but products
 * were stored with images = NULL, so the product gallery rendered nothing.
 * This links each product to its own mockups and fills description, SEO title
 * and SEO description when they're empty.
 *
 * Safe + idempotent: only writes columns that are currently NULL/empty, so an
 * admin's hand-written copy is never overwritten. Re-running changes nothing.
 */
import mysql from "mysql2/promise";
import { readdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

const url = process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("✗ No DATABASE_URL"); process.exit(1); }

const IMG_RE = /\.(png|jpe?g|webp)$/i;
/** Mockups for a product, ordered: main → preview → the rest. og.jpg excluded. */
async function mockupsFor(base, publicDir) {
  try {
    const dir = path.join(publicDir, "products", base);
    const files = (await readdir(dir)).filter((f) => IMG_RE.test(f) && f.toLowerCase() !== "og.jpg");
    const rank = (f) => {
      const n = f.toLowerCase();
      if (n === `${base}-digital-business-card.png`) return 0; // hero/main
      if (n.includes("-preview")) return 1;
      if (n.includes("-showcase")) return 2;
      if (n.includes("-features")) return 3;
      return 4;
    };
    return files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((f) => `/products/${base}/${f}`);
  } catch { return []; }
}

const conn = await mysql.createConnection(url);
const [rows] = await conn.query("SELECT id, slug, name, tagline, category, description, seo_title, seo_description, images FROM products");
const publicDir = "public";

let imgN = 0, descN = 0, seoN = 0;
for (const p of rows) {
  const base = String(p.slug).replace(/-card$/, "");
  const patch = {};

  // 1) Mockup images (only when none stored yet)
  const hasImages = Array.isArray(p.images) ? p.images.length > 0 : !!p.images;
  if (!hasImages) {
    const pics = await mockupsFor(base, publicDir);
    if (pics.length) { patch.images = JSON.stringify(pics); imgN++; }
  }

  // 2) Description
  if (!String(p.description || "").trim()) {
    const forWho = p.category ? ` Ideal for ${String(p.category).toLowerCase()} professionals.` : "";
    patch.description =
      `${p.name} is a ready-to-use digital business card design from DigitalCarda.` +
      ` Share your contact details, services, photos and payment links from one link or QR code — no app needed for you or the people you share it with.` +
      `${forWho} Update your details any time and your live card changes instantly, so a printed QR never goes out of date.`;
    descN++;
  }

  // 3) SEO title + description
  if (!String(p.seo_title || "").trim()) {
    patch.seo_title = `${p.name} — Digital Business Card Design | DigitalCarda`.slice(0, 255);
  }
  if (!String(p.seo_description || "").trim()) {
    patch.seo_description =
      `Create your ${p.name} digital business card in minutes. Share by link or QR, capture enquiries and update details anytime. Included with your DigitalCarda plan — start free for 30 days.`.slice(0, 500);
  }
  if (patch.seo_title || patch.seo_description) seoN++;

  const keys = Object.keys(patch);
  if (!keys.length) continue;
  await conn.query(
    `UPDATE products SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
    [...keys.map((k) => patch[k]), p.id],
  );
}

console.log(`✓ product media backfill — images: ${imgN}, descriptions: ${descN}, seo: ${seoN} (of ${rows.length} products)`);
await conn.end();
