/* Social preview image (1200×630) for the blog and each blog article.

   What people see when an article link is pasted into WhatsApp, Facebook,
   LinkedIn or X: the article title on the DigitalCarda navy, its category, and
   on the right the article's feature image — or, until one is added, the same
   cover art the article page shows.

   Built as SVG and rasterised with sharp, like the card previews (og-image.ts):
   scrapers only accept raster images, and the server has the DejaVu /
   Liberation fonts the text needs. */
import sharp from "sharp";

const W = 1200, H = 630;
const ART_X = 660, ART_W = W - ART_X;
const NAVY = "#0F172A", GOLD = "#F7B31C";
const FONT = "DejaVu Sans, Liberation Sans, Arial, sans-serif";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

/** Greedy word wrap to a character budget per line. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The largest title size (from a few steps) whose wrapped lines fit the left panel. */
function fitTitle(title: string): { size: number; lines: string[] } {
  const panel = ART_X - 64 - 40;
  for (const size of [62, 56, 50, 44, 40]) {
    const lines = wrap(title, Math.floor(panel / (size * 0.58)));
    if (lines.length <= (size >= 50 ? 3 : 4)) return { size, lines };
  }
  // Still too long at the smallest size: keep four lines and end the last with "…".
  const lines = wrap(title, Math.floor(panel / (40 * 0.58))).slice(0, 4);
  lines[3] = `${lines[3]}…`;
  return { size: 40, lines };
}

/** The picture alone — feature image, else cover art — at any size, with no
    text: the images Google asks for in Article structured data (16:9, 4:3, 1:1). */
export async function renderBlogArt(o: { width: number; height: number; coverSvg?: string | null; imagePath?: string | null }): Promise<{ jpeg: Buffer; hasArt: boolean }> {
  let art: Buffer | null = null;
  if (o.imagePath) {
    try {
      art = await sharp(o.imagePath).rotate().resize(o.width, o.height, { fit: "cover", position: "attention" }).png().toBuffer();
    } catch (e) {
      console.warn(`[og] blog feature image unreadable (${o.imagePath}); using the cover art:`, (e as Error).message);
    }
  }
  if (!art && o.coverSvg) {
    try {
      // Crops keep the right-hand side, where the cover's illustration sits.
      const svg = o.coverSvg
        .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMaxYMid slice"')
        .replace(/^<svg\b/, `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}"`);
      art = await sharp(Buffer.from(svg)).resize(o.width, o.height, { fit: "cover" }).png().toBuffer();
    } catch (e) {
      console.warn("[og] blog cover art could not be drawn:", (e as Error).message);
    }
  }
  const jpeg = await sharp({ create: { width: o.width, height: o.height, channels: 4, background: NAVY } })
    .composite(art ? [{ input: art, left: 0, top: 0 }] : [])
    .flatten({ background: NAVY })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return { jpeg, hasArt: !!art };
}

export async function renderBlogOg(o: {
  /** Small line above the title, e.g. the category. */
  label: string;
  title: string;
  /** Bottom line, e.g. "digitalcarda.in/blog · 6 min read". */
  footer: string;
  /** Cover art as SVG markup (any viewBox; it is cropped to fill). Also the
      fallback when a feature image can't be read. */
  coverSvg?: string | null;
  /** Absolute path of a feature image file; used in preference to the cover art. */
  imagePath?: string | null;
}): Promise<{ jpeg: Buffer; hasArt: boolean }> {
  // Right-hand artwork: the feature image, else the cover art.
  let art: Buffer | null = null;
  if (o.imagePath) {
    try {
      // rotate() with no angle applies the photo's EXIF orientation, so phone
      // pictures aren't drawn sideways.
      art = await sharp(o.imagePath).rotate().resize(ART_W, H, { fit: "cover", position: "attention" }).png().toBuffer();
    } catch (e) {
      console.warn(`[og] blog feature image unreadable (${o.imagePath}); using the cover art:`, (e as Error).message);
    }
  }
  if (!art && o.coverSvg) {
    try {
      // The cover's illustration sits on its right-hand side, so the tall crop
      // keeps the right edge rather than the centre.
      const svg = o.coverSvg
        .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMaxYMid slice"')
        .replace(/^<svg\b/, `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${H}"`);
      art = await sharp(Buffer.from(svg)).resize(ART_W, H, { fit: "cover" }).png().toBuffer();
    } catch (e) {
      console.warn("[og] blog cover art could not be drawn:", (e as Error).message);
    }
  }

  const { size, lines } = fitTitle(o.title);
  const lineH = Math.round(size * 1.14);
  const titleTop = 214 + size;
  const labelW = Math.round(o.label.length * 10.5 + 40);

  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${NAVY}" stop-opacity="1"/>
      <stop offset="1" stop-color="${NAVY}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.08" cy="0.1" r="0.6">
      <stop offset="0" stop-color="${GOLD}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${art ? `<rect x="${ART_X - 20}" y="0" width="200" height="${H}" fill="url(#fade)"/>` : ""}
  <rect x="0" y="0" width="${ART_X + 40}" height="${H}" fill="url(#glow)"/>
  <g font-family="${FONT}">
    <rect x="64" y="72" width="10" height="34" rx="5" fill="${GOLD}"/>
    <text x="88" y="98" font-size="20" font-weight="700" letter-spacing="3" fill="${GOLD}">DIGITALCARDA BLOG</text>
    <rect x="64" y="138" width="${labelW}" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.1"/>
    <text x="84" y="165" font-size="19" font-weight="600" fill="#E2E8F0">${esc(o.label)}</text>
    ${lines.map((l, i) => `<text x="64" y="${titleTop + i * lineH}" font-size="${size}" font-weight="800" fill="#FFFFFF">${esc(l)}</text>`).join("\n    ")}
    <rect x="64" y="524" width="72" height="5" rx="2.5" fill="${GOLD}"/>
    <text x="64" y="576" font-size="23" font-weight="600" fill="#94A3B8">${esc(o.footer)}</text>
  </g>
</svg>`);

  const layers: { input: Buffer; left: number; top: number }[] = [];
  if (art) layers.push({ input: art, left: ART_X, top: 0 });
  layers.push({ input: overlay, left: 0, top: 0 });
  // JPEG, not PNG: with a photo on the right a lossless PNG passes 350 KB, and
  // WhatsApp — the app most of these links are shared on — tends to drop
  // preview images over about 300 KB. This stays well under 150 KB.
  const jpeg = await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } })
    .composite(layers)
    .flatten({ background: NAVY })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return { jpeg, hasArt: !!art };
}
