/* One-time: generate the site-wide 1200×630 social banner public/og-default.jpg
 * (used as og:image for the homepage + marketing pages). Run locally:
 *   node scripts/gen-og-default.mjs   (needs: npm i -D sharp)
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUB = path.resolve(process.cwd(), "public");
const NAVY = "#0F172A", GOLD = "#F7B31C";
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const W = 1200, H = 630;

const src = path.join(PUB, "products/ocean-blue/ocean-blue-digital-business-card.png");
const mockH = 540;
const meta = await sharp(src).metadata();
const mockW = Math.round(mockH * (meta.width / meta.height));
const resized = await sharp(src).resize(mockW, mockH).toBuffer();
const mask = Buffer.from(`<svg width="${mockW}" height="${mockH}"><rect width="${mockW}" height="${mockH}" rx="26" fill="#fff"/></svg>`);
const rounded = await sharp(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
const mockX = W - mockW - 70, mockY = Math.round((H - mockH) / 2);

const lines = ["Smart Digital", "Business Cards"];
const nameSvg = lines.map((l, i) => `<text x="70" y="${232 + i * 62}" font-family="Arial, sans-serif" font-size="56" font-weight="800" fill="#ffffff">${esc(l)}</text>`).join("");

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="#0F172A"/></linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.2" r="0.7"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.28"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g font-family="Arial, sans-serif">
    <rect x="70" y="132" width="10" height="34" rx="5" fill="${GOLD}"/>
    <text x="94" y="158" font-size="20" font-weight="700" letter-spacing="3" fill="${GOLD}">DIGITALCARDA</text>
    ${nameSvg}
    <text x="70" y="372" font-size="24" font-weight="500" fill="#94A3B8">QR · WhatsApp · Maps · Lead capture</text>
    <rect x="70" y="400" width="360" height="46" rx="23" fill="${GOLD}"/>
    <text x="94" y="430" font-size="20" font-weight="800" fill="${NAVY}">30-Day Free Trial · No credit card</text>
    <text x="70" y="585" font-size="26" font-weight="800" fill="#ffffff">Digital<tspan fill="${GOLD}">Carda</tspan></text>
  </g>
</svg>`);
const shadow = Buffer.from(`<svg width="${mockW + 40}" height="${mockH + 40}"><rect x="20" y="24" width="${mockW}" height="${mockH}" rx="30" fill="#000" opacity="0.35"/></svg>`);
await sharp(bg)
  .composite([
    { input: await sharp(shadow).blur(18).png().toBuffer(), left: mockX - 20, top: mockY - 24 },
    { input: rounded, left: mockX, top: mockY },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(PUB, "og-default.jpg"));
console.log("✓ public/og-default.jpg", Math.round(fs.statSync(path.join(PUB, "og-default.jpg")).size / 1024), "KB");
