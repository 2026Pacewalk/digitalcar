/* Builds the installable-app icon set from the brand mark in public/logo.png.
 *   node scripts/gen-app-icons.mjs
 *
 * The mark in the logo is only ~100px tall, so a straight resize to 512px is
 * soft. Instead it is enlarged 16×, its edges snapped back to solid (the art is
 * flat gold + white), then scaled down to each size — crisp at any size.
 *
 * Writes: apple-touch-icon.png, android-chrome-192/512 (kept for old links),
 * icons/app-192.png, icons/app-512.png, icons/maskable-512.png, and the 96px
 * home-screen shortcut icons named in site.webmanifest. */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUB = path.resolve(process.cwd(), "public");
const OUT = path.join(PUB, "icons");
fs.mkdirSync(OUT, { recursive: true });
const NAVY = { r: 15, g: 23, b: 42, alpha: 1 };

// Columns 0–98 of the logo hold the mark; the wordmark starts at 104.
const mark = await sharp(path.join(PUB, "logo.png"))
  .extract({ left: 0, top: 0, width: 99, height: (await sharp(path.join(PUB, "logo.png")).metadata()).height })
  .trim({ threshold: 10 })
  .ensureAlpha()
  .png()
  .toBuffer();

const meta = await sharp(mark).metadata();
const SCALE = 16;
const big = await sharp(mark)
  .resize({ width: meta.width * SCALE, height: meta.height * SCALE, kernel: "lanczos3" })
  .raw()
  .toBuffer({ resolveWithObject: true });

// Snap every pixel to fully on/off, keeping its colour: smooth curves from the
// enlargement, hard edges like the original vector.
const { data, info } = big;
for (let i = 0; i < data.length; i += info.channels) {
  const a = data[i + 3];
  if (a < 110) { data[i + 3] = 0; continue; }
  data[i + 3] = 255;
  // Pale pixels are the white squares and hand; the rest is the brand gold.
  const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const sat = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
  if (lum > 200 && sat < 60) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  else { data[i] = 0xf7; data[i + 1] = 0xb3; data[i + 2] = 0x1c; }
}
const crisp = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();

async function onNavy(size, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const fitted = await sharp(crisp).resize({ width: inner, height: inner, fit: "inside", kernel: "lanczos3" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: fitted, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const write = (file, buf) => { fs.writeFileSync(file, buf); console.log("wrote", path.relative(PUB, file), buf.length, "bytes"); };

write(path.join(PUB, "apple-touch-icon.png"), await onNavy(180, 0.17));
write(path.join(PUB, "android-chrome-192x192.png"), await onNavy(192, 0.17));
write(path.join(PUB, "android-chrome-512x512.png"), await onNavy(512, 0.17));
write(path.join(OUT, "app-192.png"), await onNavy(192, 0.17));
write(path.join(OUT, "app-512.png"), await onNavy(512, 0.17));
// Maskable: launchers crop to a circle/squircle, so the mark stays inside the
// central safe zone.
write(path.join(OUT, "maskable-512.png"), await onNavy(512, 0.25));

// Shortcut icons — a gold line glyph on navy, drawn from the same Lucide icons
// the app uses, so a long-press menu looks like the rest of the app.
const lucide = (name) => {
  const src = fs.readFileSync(path.resolve("node_modules/lucide-react/dist/esm/icons", `${name}.js`), "utf8");
  const body = src.slice(src.indexOf("__iconNode"), src.indexOf("];", src.indexOf("__iconNode")) + 1);
  const parts = [...body.matchAll(/\["(\w+)",\s*\{([^}]*)\}\]/g)].map(([, tag, attrs]) => {
    const a = [...attrs.matchAll(/(\w+):\s*"([^"]*)"/g)].filter(([, k]) => k !== "key").map(([, k, v]) => `${k}="${v}"`).join(" ");
    return `<${tag} ${a}/>`;
  });
  return parts.join("");
};
const SHORTCUTS = { edit: "wand-sparkles", share: "qr-code", leads: "inbox", analytics: "chart-column" };
for (const [file, icon] of Object.entries(SHORTCUTS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="22" fill="#0F172A"/>
    <g transform="translate(24 24) scale(2)" fill="none" stroke="#F7B31C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${lucide(icon)}</g>
  </svg>`;
  write(path.join(OUT, `shortcut-${file}.png`), await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer());
}
