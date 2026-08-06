/*
 * One-time brand-asset generator (run locally; commits the outputs).
 *  - Favicons + apple-touch-icon + manifest icons from a brand SVG.
 *  - A 1200×630 (<500 KB JPG) social OG banner per product that has images,
 *    written next to the feature image as og.jpg. Used for og:image so LinkedIn
 *    / Facebook / WhatsApp previews are correctly sized.
 *
 * Usage:  DATABASE_URL="mysql://root:root@localhost:3307/digitalcarda" node scripts/gen-brand-assets.mjs
 */
import sharp from "sharp";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import "dotenv/config";

const PUB = path.resolve(process.cwd(), "public");
const NAVY = "#0F172A", GOLD = "#F7B31C";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ── Favicons ─────────────────────────────────────────────── */
const brandSvg = (bg = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${bg ? `<rect width="64" height="64" rx="14" fill="${GOLD}"/>` : `<rect width="64" height="64" fill="${GOLD}"/>`}
  <rect x="13" y="19" width="38" height="26" rx="4" fill="${NAVY}"/>
  <rect x="13" y="25" width="38" height="5" fill="${GOLD}"/>
  <rect x="18" y="36" width="15" height="3.5" rx="1.75" fill="${GOLD}"/>
</svg>`;

// Minimal ICO wrapper around a single 32×32 PNG (ICO supports PNG entries).
function pngToIco(png, size = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir.writeUInt8(size % 256, 0); dir.writeUInt8(size % 256, 1); dir.writeUInt8(0, 2); dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6); dir.writeUInt32LE(png.length, 8); dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, png]);
}

async function favicons() {
  const svg = Buffer.from(brandSvg(true));
  const svgFull = Buffer.from(brandSvg(false));
  fs.writeFileSync(path.join(PUB, "favicon.svg"), brandSvg(true));
  const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(PUB, "favicon-32x32.png"), png32);
  fs.writeFileSync(path.join(PUB, "favicon-16x16.png"), await sharp(svg).resize(16, 16).png().toBuffer());
  fs.writeFileSync(path.join(PUB, "favicon.ico"), pngToIco(png32, 32));
  // apple-touch + android icons: full-bleed gold (no transparent corners).
  fs.writeFileSync(path.join(PUB, "apple-touch-icon.png"), await sharp(svgFull).resize(180, 180).flatten({ background: GOLD }).png().toBuffer());
  fs.writeFileSync(path.join(PUB, "android-chrome-192x192.png"), await sharp(svgFull).resize(192, 192).flatten({ background: GOLD }).png().toBuffer());
  fs.writeFileSync(path.join(PUB, "android-chrome-512x512.png"), await sharp(svgFull).resize(512, 512).flatten({ background: GOLD }).png().toBuffer());
  fs.writeFileSync(path.join(PUB, "site.webmanifest"), JSON.stringify({
    name: "DigitalCarda", short_name: "DigitalCarda",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: NAVY, background_color: NAVY, display: "standalone",
  }, null, 2));
  console.log("✓ favicons + manifest written");
}

/* ── 1200×630 OG banner per product ───────────────────────── */
function wrap(name, max = 15) {
  const words = String(name).split(/\s+/); const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

async function ogBanner(prod) {
  const imgs = Array.isArray(prod.images) ? prod.images : JSON.parse(prod.images || "[]");
  if (!imgs.length) return false;
  const rel = imgs[0].replace(/^\//, "");
  const src = path.join(PUB, rel);
  if (!fs.existsSync(src)) { console.log("  · missing feature image, skip: " + prod.slug); return false; }

  const W = 1200, H = 630;
  // Framed mockup on the right (rounded corners).
  const mockH = 540;
  const meta = await sharp(src).metadata();
  const mockW = Math.round(mockH * (meta.width / meta.height));
  const resized = await sharp(src).resize(mockW, mockH).toBuffer();
  const mask = Buffer.from(`<svg width="${mockW}" height="${mockH}"><rect width="${mockW}" height="${mockH}" rx="26" ry="26" fill="#fff"/></svg>`);
  const rounded = await sharp(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const mockX = W - mockW - 70, mockY = Math.round((H - mockH) / 2);

  const nameLines = wrap(prod.name);
  const nameSvg = nameLines.map((l, i) => `<text x="70" y="${250 + i * 62}" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#ffffff">${esc(l)}</text>`).join("");
  const eyebrow = esc((prod.category || "Digital Business Card").toUpperCase());
  const accent = /^#[0-9a-f]{6}$/i.test(prod.primary_color || "") ? prod.primary_color : GOLD;

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="#0F172A"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.25" cy="0.2" r="0.7">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <g font-family="Arial, sans-serif">
      <rect x="70" y="150" width="10" height="34" rx="5" fill="${GOLD}"/>
      <text x="94" y="176" font-size="20" font-weight="700" letter-spacing="3" fill="${GOLD}">${eyebrow}</text>
      ${nameSvg}
      <text x="70" y="${250 + nameLines.length * 62 + 20}" font-size="24" font-weight="500" fill="#94A3B8">One-tap call · WhatsApp · QR · Lead capture</text>
      <rect x="70" y="${250 + nameLines.length * 62 + 46}" width="330" height="46" rx="23" fill="${GOLD}"/>
      <text x="94" y="${250 + nameLines.length * 62 + 76}" font-size="20" font-weight="800" fill="${NAVY}">30-Day Free Trial · No app</text>
      <text x="70" y="585" font-size="26" font-weight="800" fill="#ffffff">Digital<tspan fill="${GOLD}">Carda</tspan></text>
    </g>
  </svg>`);

  // Soft shadow behind the framed mockup.
  const shadow = Buffer.from(`<svg width="${mockW + 40}" height="${mockH + 40}"><rect x="20" y="24" width="${mockW}" height="${mockH}" rx="30" fill="#000" opacity="0.35"/></svg>`);
  const out = path.join(path.dirname(src), "og.jpg");
  await sharp(bg)
    .composite([
      { input: await sharp(shadow).blur(18).png().toBuffer(), left: mockX - 20, top: mockY - 24 },
      { input: rounded, left: mockX, top: mockY },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ✓ ${prod.slug} → ${path.relative(PUB, out)} (${kb} KB)`);
  return true;
}

/* ── main ─────────────────────────────────────────────────── */
await favicons();
const url = process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
const conn = await mysql.createConnection(url);
try {
  const [rows] = await conn.query("SELECT slug, name, category, primary_color, images FROM products WHERE status='published' AND images IS NOT NULL AND JSON_LENGTH(images) > 0");
  console.log(`Generating OG banners for ${rows.length} product(s)…`);
  for (const p of rows) await ogBanner(p);
} finally { await conn.end(); }
console.log("Done.");
