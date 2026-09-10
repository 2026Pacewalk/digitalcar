/* Per-card Open Graph image.

   When someone pastes a card link into WhatsApp, Facebook or LinkedIn, the
   preview used to show a generic stock photo for every customer. This renders
   the TOP OF THAT PERSON'S CARD at 1200×630 — the same avatar, name, role,
   company and contact rows they see when they open it — in the card's own
   template colours, next to a QR code of the card URL. So the preview shows
   what the QR opens, and the preview itself is scannable.

   Built as an SVG and rasterised with sharp: scrapers only accept raster
   formats (SVG previews are ignored), and the server has the DejaVu/Liberation
   font families the SVG text needs. Deliberately no headless browser — this
   runs on every cold preview fetch and must stay fast and cheap. */

import sharp from "sharp";
import QRCode from "qrcode";

const W = 1200, H = 630;
const GOLD = "#F7B31C", NAVY = "#0F1D33";
const FONT = "DejaVu Sans, Liberation Sans, Arial, sans-serif";

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
  const faint = mix(base, [255, 255, 255], 0.38);
  // Text/glyphs drawn ON the accent (tiles, icon chips) must contrast with it.
  const onAccent = lum(accent) > 0.6 ? "#14243E" : "#FFFFFF";
  return { accent, base, bgDark, onDark, muted, faint, onAccent };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

/** Trim to a width that fits, adding an ellipsis. Rough but font-independent. */
function fit(text: string, max: number): string {
  const t = String(text || "").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** Data-URI or http(s) image → base64 data URI sharp can inline in the SVG.

    `square` crops to a centred square here rather than leaving it to the SVG:
    librsvg ignores preserveAspectRatio="slice" on <image>, so a portrait asked
    to fill a circle came out blank. Cropping up front means the SVG only ever
    has to draw a square into a square. */
async function asDataUri(src: string, square = false): Promise<string | null> {
  try {
    if (!src) return null;
    let buf: Buffer;
    if (src.startsWith("data:image/")) {
      const b64 = src.slice(src.indexOf(",") + 1);
      buf = Buffer.from(b64, "base64");
    } else if (/^https?:\/\//i.test(src)) {
      const r = await fetch(src, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return null;
      if (!(r.headers.get("content-type") || "image/png").startsWith("image/")) return null;
      buf = Buffer.from(await r.arrayBuffer());
    } else return null;
    if (!buf.length || buf.length > 3_000_000) return null;   // don't inline huge files
    // Normalise to PNG so the SVG renderer never meets an exotic format.
    const img = sharp(buf).resize(320, 320, square
      ? { fit: "cover", position: sharp.strategy.attention }   // keep the face, not the corners
      : { fit: "inside", withoutEnlargement: true });
    return `data:image/png;base64,${(await img.png().toBuffer()).toString("base64")}`;
  } catch { return null; }
}

/* Line-art glyphs on a 24×24 grid, matching the icons on the card itself. */
const GLYPH: Record<string, string> = {
  phone: `<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>`,
  mail: `<rect x="2" y="4.5" width="20" height="15" rx="2.5"/><path d="m2.8 6.6 9.2 6.4 9.2-6.4"/>`,
  globe: `<circle cx="12" cy="12" r="9.4"/><path d="M2.6 12h18.8"/><path d="M12 2.6a14 14 0 0 1 3.7 9.4A14 14 0 0 1 12 21.4 14 14 0 0 1 8.3 12 14 14 0 0 1 12 2.6z"/>`,
};

export interface OgCard {
  name?: string | null;
  designation?: string | null;
  company?: string | null;
  logo?: string | null;
  photo?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
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

  // The card leads with the person's photo; the logo stands in when there is
  // none, and rides as a small badge when there are both.
  const photo = await asDataUri(String(card.photo || ""), true);
  const logo = await asDataUri(String(card.logo || ""));
  const avatar = photo || logo;
  const badge = photo && logo ? logo : null;

  const name = fit(card.name || card.slug, 24);
  const role = fit(card.designation || "", 32);
  const company = fit(card.company || "", 34);
  const initial = (String(card.name || card.slug).trim()[0] || "D").toUpperCase();

  /* Contact rows, exactly as the card shows them — only the ones this card
     actually has, so a sparse card closes up rather than leaving gaps. */
  const rows = ([
    ["phone", "CALL", String(card.phone || "").trim()],
    ["mail", "EMAIL", String(card.email || "").trim()],
    ["globe", "WEBSITE", String(card.website || "").replace(/^https?:\/\//i, "").replace(/\/$/, "").trim()],
  ] as [string, string, string][]).filter(([, , v]) => v).slice(0, 3);

  const AV_CX = 150, AV_CY = 158, AV_R = 78;      // avatar circle
  const TX = 262;                                  // identity text column
  const ROW_TOP = 290, ROW_STEP = 80, CHIP = 62;   // contact rows

  const rowSvg = rows.map(([g, label, value], i) => {
    const y = ROW_TOP + i * ROW_STEP;
    return `<g>
    <rect x="72" y="${y}" width="${CHIP}" height="${CHIP}" rx="19" fill="${accent}" opacity="0.16"/>
    <rect x="72" y="${y}" width="${CHIP}" height="${CHIP}" rx="19" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.5"/>
    <g transform="translate(${72 + (CHIP - 28) / 2} ${y + (CHIP - 28) / 2}) scale(1.1667)" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPH[g]}</g>
    <text x="158" y="${y + 25}" font-family="${FONT}" font-size="18" font-weight="bold" fill="${P.faint}" letter-spacing="1.6">${esc(label)}</text>
    <text x="158" y="${y + 55}" font-family="${FONT}" font-size="27" fill="${P.onDark}">${esc(fit(value, 30))}</text>
  </g>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${P.base}"/><stop offset="62%" stop-color="${P.bgDark}"/><stop offset="100%" stop-color="${darken(P.base, 0.55)}"/>
    </linearGradient>
    <clipPath id="avClip"><circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R - 6}"/></clipPath>
    <clipPath id="badgeClip"><circle cx="${AV_CX + 58}" cy="${AV_CY + 58}" r="26"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1090" cy="-40" r="260" fill="${accent}" opacity="0.10"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${accent}"/>

  <!-- avatar: the face (or brand) the card opens with -->
  ${avatar
    ? `<circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R - 6}" fill="#FFFFFF"/>
       <image href="${avatar}" x="${AV_CX - AV_R + 6}" y="${AV_CY - AV_R + 6}" width="${(AV_R - 6) * 2}" height="${(AV_R - 6) * 2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#avClip)"/>`
    : `<circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R - 6}" fill="${accent}"/>
       <text x="${AV_CX}" y="${AV_CY + 26}" font-family="${FONT}" font-size="70" font-weight="bold" fill="${P.onAccent}" text-anchor="middle">${esc(initial)}</text>`}
  <circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R - 3}" fill="none" stroke="${accent}" stroke-width="5"/>
  ${badge
    ? `<circle cx="${AV_CX + 58}" cy="${AV_CY + 58}" r="26" fill="#FFFFFF" stroke="${P.bgDark}" stroke-width="3"/>
       <image href="${badge}" x="${AV_CX + 32}" y="${AV_CY + 32}" width="52" height="52" preserveAspectRatio="xMidYMid meet" clip-path="url(#badgeClip)"/>`
    : ""}

  <!-- identity -->
  <text x="${TX}" y="${role ? 148 : 168}" font-family="${FONT}" font-size="56" font-weight="bold" fill="${P.onDark}">${esc(name)}</text>
  ${role ? `<text x="${TX}" y="192" font-family="${FONT}" font-size="28" font-weight="bold" fill="${accent}">${esc(role)}</text>` : ""}
  ${company ? `<text x="${TX}" y="${role ? 232 : 210}" font-family="${FONT}" font-size="26" fill="${P.muted}">${esc(company)}</text>` : ""}

  <!-- what the card shows first -->
  ${rowSvg}

  <!-- card url -->
  <rect x="72" y="536" width="660" height="60" rx="17" fill="#FFFFFF" opacity="0.09"/>
  <text x="98" y="575" font-family="${FONT}" font-size="26" fill="${P.onDark}">${esc(fit(url.replace(/^https:\/\//, ""), 36))}</text>

  <!-- scannable QR of this card -->
  <rect x="838" y="132" width="292" height="292" rx="28" fill="#FFFFFF"/>
  <image href="${qr}" x="859" y="153" width="250" height="250"/>
  <text x="984" y="474" font-family="${FONT}" font-size="24" font-weight="bold" fill="${accent}" text-anchor="middle" letter-spacing="1.4">SCAN TO OPEN</text>
  <text x="984" y="518" font-family="${FONT}" font-size="21" fill="${P.muted}" text-anchor="middle">digitalcarda.in</text>
</svg>`;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
