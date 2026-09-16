/* Write a WebP beside every template artwork PNG in public/products, so pages can
 * serve <picture><source type="image/webp"> with the PNG kept as the fallback
 * (see src/lib/imageSources.ts → webpFor). Same file name, same dimensions.
 *
 *   node scripts/gen-product-webp.mjs
 *
 * Re-running is cheap: a PNG is skipped when its .webp already exists and is
 * newer than the PNG. Re-run after adding or replacing any product PNG. */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "public", "products");
const QUALITY = 80;
const EFFORT = 5;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.png$/i.test(entry.name)) out.push(full);
  }
  return out;
}

if (!fs.existsSync(ROOT)) {
  console.error(`No such folder: ${ROOT}`);
  process.exit(1);
}

const pngs = walk(ROOT).sort();
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
let written = 0, skipped = 0, failed = 0;
let pngBytes = 0, webpBytes = 0;

for (const png of pngs) {
  const webp = png.replace(/\.png$/i, ".webp");
  const rel = path.relative(ROOT, png);
  const pngStat = fs.statSync(png);
  pngBytes += pngStat.size;

  const existing = fs.existsSync(webp) ? fs.statSync(webp) : null;
  if (existing && existing.mtimeMs > pngStat.mtimeMs) {
    skipped++;
    webpBytes += existing.size;
    continue;
  }

  try {
    // No resize: the WebP keeps the PNG's exact width and height.
    await sharp(png).webp({ quality: QUALITY, effort: EFFORT }).toFile(webp);
    const size = fs.statSync(webp).size;
    webpBytes += size;
    written++;
    console.log(`  ${rel}  ${mb(pngStat.size)} MB -> ${mb(size)} MB`);
  } catch (err) {
    failed++;
    console.error(`  FAILED ${rel}: ${err.message}`);
  }
}

const saved = pngBytes ? Math.round((1 - webpBytes / pngBytes) * 100) : 0;
console.log(
  `\n${pngs.length} PNG(s): ${written} written, ${skipped} up to date, ${failed} failed.` +
  `\nTotal PNG ${mb(pngBytes)} MB -> total WebP ${mb(webpBytes)} MB (${saved}% smaller).`,
);
if (failed) process.exit(1);
