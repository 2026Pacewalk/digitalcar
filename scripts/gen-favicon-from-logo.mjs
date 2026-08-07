/* One-time: build the favicon set from the brand icon inside public/logo.png.
 * Run locally:  node scripts/gen-favicon-from-logo.mjs   (needs: npm i -D sharp) */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUB = path.resolve(process.cwd(), "public");
const NAVY = "#0F172A";

// Wrap a 32×32 PNG into a single-image .ico container.
function pngToIco(png, size = 32) {
  const h = Buffer.alloc(6); h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  const d = Buffer.alloc(16);
  d.writeUInt8(size % 256, 0); d.writeUInt8(size % 256, 1);
  d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(png.length, 8); d.writeUInt32LE(22, 12);
  return Buffer.concat([h, d, png]);
}

// 1. Extract the clean gold icon from the left of the logo wordmark.
const meta = await sharp(path.join(PUB, "logo.png")).metadata();
const icon = await sharp(path.join(PUB, "logo.png"))
  .extract({ left: 0, top: 0, width: 105, height: meta.height })
  .trim({ threshold: 10 }).png().toBuffer();

// Square canvas with the icon centered. bg=null → transparent; else solid.
async function square(size, pad, bg) {
  const inner = Math.round(size * (1 - pad * 2));
  const fitted = await sharp(icon).resize({ width: inner, height: inner, fit: "inside" }).png().toBuffer();
  const base = bg
    ? sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  return base.composite([{ input: fitted, gravity: "center" }]).png().toBuffer();
}

// 2. Tab favicons — gold icon on transparent, minimal padding for visibility.
const png32 = await square(32, 0.06);
fs.writeFileSync(path.join(PUB, "favicon-32x32.png"), png32);
fs.writeFileSync(path.join(PUB, "favicon-16x16.png"), await square(16, 0.04));
fs.writeFileSync(path.join(PUB, "favicon.ico"), pngToIco(await square(32, 0.06), 32));

// 3. Crisp SVG favicon that embeds a 64px raster (so it matches exactly).
const png64 = await square(64, 0.06);
fs.writeFileSync(path.join(PUB, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${png64.toString("base64")}"/></svg>`);

// 4. Apple/Android — gold icon centered on the brand navy (no transparency).
const navy = { r: 15, g: 23, b: 42, alpha: 1 };
fs.writeFileSync(path.join(PUB, "apple-touch-icon.png"), await square(180, 0.2, navy));
fs.writeFileSync(path.join(PUB, "android-chrome-192x192.png"), await square(192, 0.2, navy));
fs.writeFileSync(path.join(PUB, "android-chrome-512x512.png"), await square(512, 0.2, navy));

// keep manifest theme in step
fs.writeFileSync(path.join(PUB, "site.webmanifest"), JSON.stringify({
  name: "DigitalCarda", short_name: "DigitalCarda",
  icons: [
    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  ],
  theme_color: NAVY, background_color: NAVY, display: "standalone",
}, null, 2));

console.log("✓ favicon set regenerated from logo icon");
