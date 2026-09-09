/* Per-card Open Graph image.

   When someone pastes a card link into WhatsApp, Facebook or LinkedIn, the
   preview used to show a generic stock photo for every customer. This renders a
   real 1200×630 card for that specific person — their name, role, company and
   logo, plus a QR code of their own card URL, so the preview itself is
   scannable.

   Built as an SVG and rasterised with sharp: scrapers only accept raster
   formats (SVG previews are ignored), and the server has the DejaVu/Liberation
   font families the SVG text needs. */

import sharp from "sharp";
import QRCode from "qrcode";

const W = 1200, H = 630;
const GOLD = "#F7B31C", NAVY = "#0F1D33";

const hex = (v: unknown) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v) : null);
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
/** Perceived brightness 0..1 — decides whether text should be light or dark. */
const lum = (h: string) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const mix = (h: string, t: [number, number, number], amt: number) => {
  const [r, g, b] = rgb(h);
  const f = (a: number, bb: number) => Math.round(a + (bb - a) * amt).toString(16).padStart(2, "0");
  return `#${f(r, t[0])}${f(g, t[1])}${f(b, t[2])}`;
};
const darken = (h: string, amt: number) => mix(h, [0, 0, 0], amt);

/** The card's template decides the look: color is the accent, color2 the deep
    ground. Falls back to the DigitalCarda navy/gold when a card has neither. */
function paletteFor(accentIn: string | null, secondIn: string | null) {
  const accent = accentIn || GOLD;
  // A usable backdrop: the template's secondary if it is dark enough to carry
  // white text, otherwise a deepened version of the accent.
  let base = secondIn && lum(secondIn) < 0.45 ? secondIn : null;
  if (!base) base = lum(accent) < 0.35 ? darken(accent, 0.35) : darken(accent, 0.78);
  const bgDark = darken(base, 0.25);
  const onDark = "#FFFFFF";
  const muted = mix(base, [255, 255, 255], 0.62);
  // Text drawn ON the accent (the initial tile) must contrast with it.
  const onAccent = lum(accent) > 0.6 ? "#14243E" : "#FFFFFF";
  return { accent, base, bgDark, onDark, muted, onAccent };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

/** Trim to a width that fits, adding an ellipsis. Rough but font-independent. */
function fit(text: string, max: number): string {
  const t = String(text || "").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** Data-URI or http(s) image → base64 data URI sharp can inline in the SVG. */
async function asDataUri(src: string): Promise<string | null> {
  try {
    if (!src) return null;
    if (src.startsWith("data:image/")) return src;
    if (!/^https?:\/\//i.test(src)) return null;
    const r = await fetch(src, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 3_000_000) return null;              // don't inline huge files
    // Normalise to PNG so the SVG renderer never meets an exotic format.
    const png = await sharp(buf).resize(280, 280, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch { return null; }
}

export interface OgCard {
  name?: string | null;
  designation?: string | null;
  company?: string | null;
  logo?: string | null;
  photo?: string | null;
  slug: string;
  accent?: string | null;   // customer.color  — template primary
  second?: string | null;   // customer.color2 — template secondary/deep tone
}

/** Render the card's social preview as a PNG buffer. */
export async function renderCardOg(card: OgCard): Promise<Buffer> {
  const url = `https://digitalcarda.in/${card.slug}`;
  const P = paletteFor(hex(card.accent), hex(card.second));
  const accent = P.accent;

  // QR of this exact card, drawn dark-on-white so it scans from a screen.
  const qrPng = await QRCode.toBuffer(url, {
    type: "png", width: 300, margin: 1, errorCorrectionLevel: "M",
    color: { dark: lum(P.base) < 0.5 ? P.bgDark : NAVY, light: "#FFFFFF" },
  });
  const qr = `data:image/png;base64,${qrPng.toString("base64")}`;

  // Prefer the logo (brand), fall back to their photo (person).
  const brand = (await asDataUri(String(card.logo || ""))) || (await asDataUri(String(card.photo || "")));

  const name = fit(card.name || card.slug, 26);
  const role = fit(card.designation || "", 34);
  const company = fit(card.company || "", 34);
  const initial = (String(card.name || card.slug).trim()[0] || "D").toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${P.base}"/><stop offset="62%" stop-color="${P.bgDark}"/><stop offset="100%" stop-color="${darken(P.base, 0.55)}"/>
    </linearGradient>
    <clipPath id="brandClip"><rect x="90" y="118" width="132" height="132" rx="28"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1090" cy="-40" r="260" fill="${accent}" opacity="0.10"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${accent}"/>

  <!-- brand mark -->
  ${brand
    ? `<rect x="90" y="118" width="132" height="132" rx="28" fill="#FFFFFF"/>
       <image href="${brand}" x="98" y="126" width="116" height="116" preserveAspectRatio="xMidYMid meet" clip-path="url(#brandClip)"/>`
    : `<rect x="90" y="118" width="132" height="132" rx="28" fill="${accent}"/>
       <text x="156" y="207" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="62" font-weight="bold" fill="${P.onAccent}" text-anchor="middle">${esc(initial)}</text>`}

  <!-- identity -->
  <text x="90" y="330" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="62" font-weight="bold" fill="${P.onDark}">${esc(name)}</text>
  ${role ? `<text x="90" y="386" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="30" font-weight="bold" fill="${accent}">${esc(role)}</text>` : ""}
  ${company ? `<text x="90" y="${role ? 432 : 392}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="28" fill="${P.muted}">${esc(company)}</text>` : ""}

  <!-- card url -->
  <rect x="90" y="492" width="640" height="58" rx="16" fill="#FFFFFF" opacity="0.08"/>
  <text x="114" y="530" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="26" fill="${P.onDark}">${esc(fit(url.replace(/^https:\/\//, ""), 34))}</text>

  <!-- scannable QR of this card -->
  <rect x="852" y="150" width="270" height="270" rx="26" fill="#FFFFFF"/>
  <image href="${qr}" x="872" y="170" width="230" height="230"/>
  <text x="987" y="466" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="23" font-weight="bold" fill="${accent}" text-anchor="middle">SCAN TO OPEN</text>

  <text x="987" y="536" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="21" fill="${P.muted}" text-anchor="middle">digitalcarda.in</text>
</svg>`;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
