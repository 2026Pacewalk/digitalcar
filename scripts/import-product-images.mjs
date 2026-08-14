/*
 * One-time importer: takes the 148 phone-mockup PNGs (37 products × 4) exported
 * to a local folder, resizes/optimises each to the site's product-image spec
 * (~1149px wide, palette PNG), writes them into public/products/<folder>/ using
 * the same naming as the existing cards, and sets products.images + status.
 *
 * After running this, run scripts/gen-brand-assets.mjs to build each og.jpg.
 *
 * Usage:
 *   SRC_DIR="/abs/path/to/downloaded/pngs" \
 *   DATABASE_URL="mysql://root:root@localhost:3307/digitalcarda" \
 *   node scripts/import-product-images.mjs
 */
import sharp from "sharp";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import "dotenv/config";

const SRC = process.env.SRC_DIR;
if (!SRC || !fs.existsSync(SRC)) { console.error("Set SRC_DIR to the folder of downloaded PNGs"); process.exit(1); }
const PUB = path.resolve(process.cwd(), "public");
const WIDTH = 1149;

// Drive product-name (prefix before " N.png") → product slug.
const NAME_TO_SLUG = {
  "Aqua": "aqua-card",
  "Aurora Glass": "aurora-glass-bio-card",
  "Bronze": "bronze-card",
  "Coral": "coral-card",
  "Crimson": "crimson-card",
  "Cyan Wave": "cyan-wave-card",
  "Deep Sea": "deep-sea-card",
  "Editorial Bio": "editorial-bio-card",
  "Forest": "forest-card",
  "Fuchsia": "fuchsia-card",
  "Gold Luxe": "gold-luxe-bio-card",
  "Ivory Bloom": "ivory-bloom-bio-card",
  "Lavender Dream": "lavender-dream-bio-card",
  "Lime": "lime-card",
  "Magenta": "magenta-card",
  "Marigold": "marigold-card",
  "Midnight Neon": "midnight-neon-bio-card",
  "Mint Fresh": "mint-fresh-bio-card",
  "Neon Cyber": "neon-cyber-bio-card",
  "Noir Bold": "noir-bold-bio-card",
  "Ocean Frost": "ocean-frost-bio-card",
  "Onyx Gold": "onyx-gold-card",
  "Peach Soft": "peach-soft-bio-card",
  "Pine": "pine-card",
  "Plum": "plum-card",
  "Retro Groove": "retro-groove-bio-card",
  "Rose Pink": "rose-pink-card",
  "Ruby": "ruby-card",
  "Sapphire": "sapphire-card",
  "Scarlet": "scarlet-card",
  "Slate": "slate-pro-card",
  "Steel blue": "steel-blue-card",
  "Sunset": "sunset-card",
  "Sunset Warm": "sunset-warm-bio-card",
  "Tangerine": "tangerine-card",
  "Violet": "violet-card",
  "royal purple": "royal-purple-card",
};

// image index (1-4) → filename suffix, matching the existing 3 products.
const SUFFIX = { 1: "", 2: "-features", 3: "-preview", 4: "-services" };

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
const conn = await mysql.createConnection(url);

let updated = 0, skipped = [];
try {
  for (const [driveName, slug] of Object.entries(NAME_TO_SLUG)) {
    const folder = slug.replace(/-card$/, "");
    const base = `${folder}-digital-business-card`;
    const outDir = path.join(PUB, "products", folder);
    fs.mkdirSync(outDir, { recursive: true });

    const images = [];
    let missing = false;
    for (const idx of [1, 2, 3, 4]) {
      const src = path.join(SRC, `${driveName} ${idx}.png`);
      if (!fs.existsSync(src)) { missing = true; skipped.push(`${slug}: missing "${driveName} ${idx}.png"`); break; }
      const outName = `${base}${SUFFIX[idx]}.png`;
      await sharp(src).resize(WIDTH).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(outDir, outName));
      images.push(`/products/${folder}/${outName}`);
    }
    if (missing) continue;

    await conn.query("UPDATE products SET images = ?, status = 'published' WHERE slug = ?", [JSON.stringify(images), slug]);
    updated++;
    console.log(`  ✓ ${slug} → ${folder}/ (4 images)`);
  }
} finally { await conn.end(); }

console.log(`\nUpdated ${updated} product(s).`);
if (skipped.length) { console.log("Skipped:"); skipped.forEach((s) => console.log("  · " + s)); }
