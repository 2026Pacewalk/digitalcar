/* Email-signature builder — turns the customer's existing card data into a
   signature they can paste into Gmail / Outlook / Apple Mail.

   EMAIL HTML IS NOT WEB HTML. Mail clients (Outlook worst of all) strip
   stylesheets, classes, flexbox and grid, and Outlook's Word renderer ignores
   most box model rules. So everything here is deliberately old-fashioned:

     • layout with <table role="presentation">, never divs/flex/grid
     • styles INLINE on every element — no <style>, no classes
     • font-family repeated on each text node (Outlook does not inherit it)
     • padding on <td>, never margin
     • explicit width/height + border:0 + display:block on images
     • an explicit colour on every <a> (clients otherwise force blue/underline)

   Icons are hosted PNGs (public/sig/, built by scripts/build-signature-icons.mjs).
   Gmail strips inline <svg>, Outlook ignores icon webfonts, and every client
   blocks data: URIs in <img> — a hosted PNG is the only format that survives.

   Everything is escaped: the card fields are user input and end up in someone
   else's inbox. */

export type SignatureData = {
  name: string;
  designation: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  logo: string;      // absolute https URL (or a data: URI)
  cardUrl: string;   // https://digitalcarda.in/<slug>
  qrSrc: string;     // absolute QR image URL
  /** `platform` selects the brand icon; `label` is the accessible name. */
  socials: { platform: string; label: string; url: string }[];
};

export type SignatureOptions = {
  accent: string;
  showLogo: boolean;
  showQr: boolean;
  showSocials: boolean;
  showAddress: boolean;
  tagline: string;    // optional call-to-action under the card link
};

export type SignatureTemplate = {
  id: string;
  name: string;
  blurb: string;
  build: (d: SignatureData, o: SignatureOptions) => string;
};

const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/* Digits only — tel:/wa.me links must not carry spaces or punctuation. */
const digits = (s: string) => String(s || "").replace(/[^\d+]/g, "");
const waDigits = (s: string) => String(s || "").replace(/\D/g, "");

/* Strip the scheme for display, keep it for the href. */
const prettyUrl = (u: string) => String(u || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");

/* Which platforms have a generated s-<key>.png. Keep in step with
   scripts/build-signature-icons.mjs. */
const ICON_PLATFORMS = new Set([
  "facebook", "instagram", "x", "youtube", "linkedin", "whatsapp", "telegram",
  "tiktok", "pinterest", "snapchat", "github", "behance", "dribbble", "spotify",
  "twitch", "discord",
]);

/* Icons live beside the card, so a signature previewed on localhost uses local
   icons and one built in production points at production. */
function iconBase(d: SignatureData): string {
  try { return `${new URL(d.cardUrl).origin}/sig`; } catch { return "https://digitalcarda.in/sig"; }
}

/* Cache-buster on every icon URL. A CDN caches by full URL, and a 404 fetched
   before these files were deployed can sit in one edge location for hours while
   other locations serve the file perfectly — so a probe from elsewhere proves
   nothing. Bumping this mints new cache keys everywhere at once, which beats
   waiting for a TTL or asking someone to purge. Bump it whenever an icon is
   regenerated with different artwork. */
const ICON_V = "3";
const iconUrl = (d: SignatureData, file: string) => `${iconBase(d)}/${file}.png?v=${ICON_V}`;

const icon = (d: SignatureData, name: string, size: number, inline = false) =>
  `<img src="${esc(iconUrl(d, name))}" width="${size}" height="${size}" alt="" ` +
  `style="display:${inline ? "inline-block" : "block"};border:0;outline:none;` +
  `width:${size}px;height:${size}px;${inline ? "vertical-align:-2px;" : ""}" />`;

const a = (href: string, text: string, color: string, bold = false) =>
  `<a href="${esc(href)}" style="color:${color};text-decoration:none;font-family:${FONT};${bold ? "font-weight:bold;" : ""}">${esc(text)}</a>`;

/** Vertical space between blocks. A sized empty div survives everywhere;
    padding on a <div> is dropped by Outlook's Word renderer. */
const gap = (px: number) => `<div style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</div>`;

/* ── Contact lines ─────────────────────────────────────────────────────────
   An icon cell then the value — the layout every professional signature uses.
   The icon column is fixed width so values line up even when a row wraps. */
type Line = { icon: string; html: string };

function contactLines(d: SignatureData, o: SignatureOptions, color = INK, withAddress = true, monoIcons = false): Line[] {
  const out: Line[] = [];
  if (d.phone) out.push({ icon: "phone", html: a(`tel:${digits(d.phone)}`, d.phone, color) });
  if (d.whatsapp && waDigits(d.whatsapp) !== waDigits(d.phone)) {
    out.push({ icon: monoIcons ? "phone" : "s-whatsapp", html: a(`https://wa.me/${waDigits(d.whatsapp)}`, d.whatsapp, color) });
  }
  if (d.email) out.push({ icon: "mail", html: a(`mailto:${d.email}`, d.email, color) });
  if (d.website) out.push({ icon: "globe", html: a(d.website, prettyUrl(d.website), color) });
  if (withAddress && o.showAddress && d.address) {
    out.push({ icon: "pin", html: `<span style="font-family:${FONT};font-size:12px;color:${color};">${esc(d.address)}</span>` });
  }
  return out;
}

/** Stacked icon rows — the classic left-aligned contact block.
    `light` swaps in the white glyph set for dark backgrounds; the brand discs
    (WhatsApp) already read fine on dark, so they are left alone. */
function contactStack(d: SignatureData, o: SignatureOptions, color = INK, light = false, monoIcons = false): string {
  const lines = contactLines(d, o, color, true, monoIcons);
  if (!lines.length) return "";
  const rows = lines.map((l) => `<tr>
      <td width="22" valign="top" style="width:22px;padding:3px 8px 3px 0;">${icon(d, light && !l.icon.startsWith("s-") ? `${l.icon}-w` : l.icon, 14)}</td>
      <td valign="top" style="padding:2px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${color};">${l.html}</td>
    </tr>`).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>${rows}</tbody></table>`;
}

/** One flowing line of icon+value pairs — for the compact template.
    Built from inline spans rather than a table ON PURPOSE: a table row cannot
    wrap, so a customer with four long contact fields would push the reader into
    a horizontal scroll. Each pair keeps nowrap so an icon never separates from
    its value, but the line as a whole breaks where it must. The address is left
    out — it is far too long for a single-line layout. */
function contactInline(d: SignatureData, o: SignatureOptions, color = INK): string {
  const lines = contactLines(d, o, color, false);
  if (!lines.length) return "";
  const sep = `<span style="color:${LINE};">&nbsp;&nbsp;|&nbsp;&nbsp;</span>`;
  const cells = lines.map((l, i) =>
    `<span style="white-space:nowrap;font-family:${FONT};font-size:12px;color:${color};">` +
    `${i ? sep : ""}${icon(d, l.icon, 13, true)}&nbsp;${l.html}</span>`).join("");
  return `<div style="font-family:${FONT};font-size:12px;line-height:2;color:${color};">${cells}</div>`;
}

/** Brand-coloured social discs. Falls back to a text link for any platform we
    have no icon for, so a link is never silently dropped. */
function socialRow(d: SignatureData, o: SignatureOptions, size = 26, textOnly = false): string {
  if (!o.showSocials || !d.socials.length) return "";
  const cells = d.socials.map((s) => {
    const inner = !textOnly && ICON_PLATFORMS.has(s.platform)
      ? `<img src="${esc(iconUrl(d, `s-${s.platform}`))}" width="${size}" height="${size}" alt="${esc(s.label)}" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;" />`
      : `<span style="font-family:${FONT};font-size:11px;color:${o.accent};">${esc(s.label)}</span>`;
    return `<td style="padding:0 6px 0 0;"><a href="${esc(s.url)}" style="text-decoration:none;">${inner}</a></td>`;
  }).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>${cells}</tr></tbody></table>`;
}

/* The point of the whole feature: a prominent, tappable card link.
   Renders nothing without a link — the public generator is used by people who
   have no card yet, and a button pointing nowhere is worse than no button. */
const cardButton = (d: SignatureData, o: SignatureOptions, label = "View my digital card") =>
  (!d.cardUrl ? "" :
  `<a href="${esc(d.cardUrl)}" style="display:inline-block;background:${o.accent};color:#ffffff;font-family:${FONT};font-size:12px;font-weight:bold;text-decoration:none;padding:9px 18px;border-radius:5px;">${esc(label)}</a>`);

const taglineLine = (o: SignatureOptions, color = MUTED) =>
  o.tagline ? `<div style="font-family:${FONT};font-size:11px;color:${color};padding-top:6px;line-height:1.4;">${esc(o.tagline)}</div>` : "";

/* Both return NOTHING without a source. An <img src=""> resolves to the page
   itself, so it renders as a broken-image icon in the builder and drags the
   whole page in as an attachment in some mail clients. The public generator
   has no logo at all, and no QR until a card link is entered. */
const logoImg = (d: SignatureData, size: number) =>
  (!d.logo ? "" :
  `<img src="${esc(d.logo)}" width="${size}" alt="${esc(d.company || d.name)}" style="display:block;border:0;outline:none;width:${size}px;max-width:${size}px;height:auto;" />`);

const qrImg = (d: SignatureData, size: number) =>
  (!d.qrSrc ? "" :
  `<img src="${esc(d.qrSrc)}" width="${size}" height="${size}" alt="Scan my digital card" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;" />`);

/** Name, role and company — the identity block, shared by every template. */
function identity(d: SignatureData, o: SignatureOptions, opts: { nameSize?: number; onDark?: boolean } = {}): string {
  const { nameSize = 17, onDark = false } = opts;
  const nameColor = onDark ? "#ffffff" : INK;
  const roleColor = onDark ? "#f1f5f9" : MUTED;
  const coColor = onDark ? "#ffffff" : o.accent;
  const role = d.designation
    ? `<div style="font-family:${FONT};font-size:12.5px;color:${roleColor};padding-top:3px;line-height:1.4;">${esc(d.designation)}</div>` : "";
  const co = d.company
    ? `<div style="font-family:${FONT};font-size:12.5px;font-weight:bold;color:${coColor};padding-top:2px;line-height:1.4;">${esc(d.company)}</div>` : "";
  return `<div style="font-family:${FONT};font-size:${nameSize}px;font-weight:bold;color:${nameColor};line-height:1.25;letter-spacing:.2px;">${esc(d.name)}</div>${role}${co}`;
}

/** Mix a hex colour toward white. Returns a solid hex — rgba() and opacity are
    unreliable in Outlook, so a pre-mixed colour is the only safe tint. */
function tint(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return "#f8fafc";
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, bl] = [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)];
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

const OPEN = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>`;
const CLOSE = `</tbody></table>`;

/* ══════════════════════════════════════════════════════════════════════════
   TEMPLATES
   ══════════════════════════════════════════════════════════════════════════ */

/* 1 ── Corporate: logo, a vertical accent rule, then the details. The layout
        most company signatures use, and the safest across clients. */
function corporate(d: SignatureData, o: SignatureOptions): string {
  const withLogo = o.showLogo && !!d.logo;
  const socials = socialRow(d, o);
  return `${OPEN}<tr>
    ${withLogo ? `<td valign="top" style="padding:0 18px 0 0;">${logoImg(d, 96)}</td>
    <td width="3" style="width:3px;background:${o.accent};font-size:0;line-height:0;">&nbsp;</td>` : ""}
    <td valign="top" style="padding:0 0 0 ${withLogo ? "18px" : "0"};">
      ${identity(d, o)}
      ${gap(10)}
      ${contactStack(d, o)}
      ${gap(12)}
      ${cardButton(d, o)}
      ${taglineLine(o)}
      ${socials ? gap(12) + socials : ""}
    </td>
    ${o.showQr ? `<td valign="top" style="padding:0 0 0 20px;">${qrImg(d, 84)}</td>` : ""}
  </tr>${CLOSE}`;
}

/* 2 ── Executive: name across the top over a full-width accent rule, details
        left, logo and QR right. Reads like a letterhead. */
function executive(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o, 24);
  const right = [
    o.showLogo && d.logo ? logoImg(d, 90) : "",
    o.showQr ? `<div style="padding-top:10px;">${qrImg(d, 76)}</div>` : "",
  ].filter(Boolean).join("");
  return `${OPEN}
    <tr><td colspan="2" style="padding:0 0 8px;">${identity(d, o, { nameSize: 19 })}</td></tr>
    <tr><td colspan="2" style="padding:0 0 12px;"><div style="height:2px;line-height:2px;font-size:0;background:${o.accent};">&nbsp;</div></td></tr>
    <tr>
      <td valign="top" style="padding:0 24px 0 0;">
        ${contactStack(d, o)}
        ${gap(12)}
        ${cardButton(d, o)}
        ${taglineLine(o)}
        ${socials ? gap(12) + socials : ""}
      </td>
      ${right ? `<td valign="top" align="right" style="padding:0;">${right}</td>` : ""}
    </tr>${CLOSE}`;
}

/* 3 ── Slim: a few tight lines. Built for reply chains, where a tall block
        turns into noise by the third message. */
function slim(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o, 22);
  const rest = [d.designation, d.company].filter(Boolean).join(", ");
  const head = `<span style="font-family:${FONT};font-size:14px;font-weight:bold;color:${INK};">${esc(d.name)}</span>` +
    (rest ? `<span style="font-family:${FONT};font-size:12px;color:${MUTED};"> — ${esc(rest)}</span>` : "");
  return `${OPEN}
    <tr><td style="padding:0 0 3px;">${head}</td></tr>
    <tr><td style="padding:4px 0 0;">${contactInline(d, o)}</td></tr>
    <tr><td style="padding:7px 0 0;font-family:${FONT};font-size:12px;color:${MUTED};">
      ${[
        d.cardUrl ? a(d.cardUrl, prettyUrl(d.cardUrl), o.accent, true) : "",
        o.tagline ? esc(o.tagline) : "",
      ].filter(Boolean).join(" &nbsp;·&nbsp; ")}
    </td></tr>
    ${socials ? `<tr><td style="padding:8px 0 0;">${socials}</td></tr>` : ""}
    ${CLOSE}`;
}

/* 4 ── Header band: name reversed out of a solid accent bar, details beneath.
        The boldest of the set — suits sales and marketing mail. */
function headerBand(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o);
  return `${OPEN}
    <tr><td style="background:${o.accent};padding:14px 18px;border-radius:5px 5px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody><tr>
        <td valign="middle" style="padding:0;">${identity(d, o, { nameSize: 17, onDark: true })}</td>
        ${o.showLogo && d.logo ? `<td valign="middle" align="right" style="padding:0 0 0 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr><td style="background:#ffffff;padding:7px 9px;border-radius:4px;">${logoImg(d, 76)}</td></tr></tbody></table></td>` : ""}
      </tr></tbody></table>
    </td></tr>
    <tr><td style="border:1px solid ${LINE};border-top:0;border-radius:0 0 5px 5px;padding:14px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>
        <td valign="top" style="padding:0;">
          ${contactStack(d, o)}
          ${gap(12)}
          ${cardButton(d, o)}
          ${taglineLine(o)}
          ${socials ? gap(12) + socials : ""}
        </td>
        ${o.showQr ? `<td valign="top" align="right" style="padding:0 0 0 20px;">${qrImg(d, 80)}</td>` : ""}
      </tr></tbody></table>
    </td></tr>${CLOSE}`;
}

/* 5 ── Card spotlight: the QR leads, so the card is the first thing scanned.
        The one to pick when the card IS the pitch. */
function spotlight(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o);
  const qr = qrImg(d, 104);
  return `${OPEN}<tr>
    ${qr ? `<td valign="top" align="center" style="padding:0 18px 0 0;">
      ${qr}
      <div style="font-family:${FONT};font-size:10px;color:${MUTED};padding-top:6px;text-align:center;">Scan my card</div>
    </td>
    <td width="1" style="width:1px;background:${LINE};font-size:0;line-height:0;">&nbsp;</td>` : ""}
    <td valign="top" style="padding:0 0 0 ${qr ? "18px" : "0"};">
      ${o.showLogo && d.logo ? `<div style="padding:0 0 8px;">${logoImg(d, 84)}</div>` : ""}
      ${identity(d, o)}
      ${gap(10)}
      ${contactStack(d, o)}
      ${gap(12)}
      ${cardButton(d, o, "Open my card")}
      ${taglineLine(o)}
      ${socials ? gap(12) + socials : ""}
    </td>
  </tr>${CLOSE}`;
}

/* 6 ── Plain text: no images, no colour blocks. Renders identically in every
        client, survives plain-text-only recipients, and is never blocked. */
function plain(d: SignatureData, o: SignatureOptions): string {
  const rows: string[] = [];
  if (d.phone) rows.push(`Phone: ${a(`tel:${digits(d.phone)}`, d.phone, INK)}`);
  if (d.email) rows.push(`Email: ${a(`mailto:${d.email}`, d.email, INK)}`);
  if (d.website) rows.push(`Web: ${a(d.website, prettyUrl(d.website), INK)}`);
  if (o.showAddress && d.address) rows.push(esc(d.address));
  const head = [d.designation, d.company].filter(Boolean).map(esc).join(", ");
  return `${OPEN}
    <tr><td style="font-family:${FONT};font-size:13px;color:${INK};line-height:1.6;">
      <strong style="color:${INK};">${esc(d.name)}</strong>${head ? `<br />${head}` : ""}
      ${rows.length ? `<br />${rows.join("<br />")}` : ""}
      ${d.cardUrl ? `<br />${a(d.cardUrl, prettyUrl(d.cardUrl), o.accent)}` : ""}
      ${o.tagline ? `<br /><span style="color:${MUTED};font-size:12px;">${esc(o.tagline)}</span>` : ""}
    </td></tr>${CLOSE}`;
}

/* 7 ── Bookmark: a wide accent band down the left with the logo sitting on a
        tinted panel, like a ribbon marking the page. */
function bookmark(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o, 24);
  return `${OPEN}<tr>
    <td width="8" style="width:8px;background:${o.accent};font-size:0;line-height:0;">&nbsp;</td>
    <td valign="top" style="background:${tint(o.accent, 0.94)};padding:16px 20px;">
      ${o.showLogo && d.logo ? `<div style="padding:0 0 10px;">${logoImg(d, 92)}</div>` : ""}
      ${identity(d, o)}
      ${gap(10)}
      ${contactStack(d, o)}
      ${gap(12)}
      ${cardButton(d, o)}
      ${taglineLine(o)}
      ${socials ? gap(12) + socials : ""}
    </td>
    ${o.showQr ? `<td valign="top" style="padding:0 0 0 16px;">${qrImg(d, 84)}</td>` : ""}
  </tr>${CLOSE}`;
}

/* 8 ── After dark: light type on a charcoal panel, using the white glyph set.
        Looks deliberate in a dark-mode inbox instead of inverted. */
function afterDark(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o);
  return `${OPEN}<tr><td style="background:#0f172a;padding:18px 22px;border-radius:6px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>
      <td valign="top" style="padding:0;">
        ${o.showLogo && d.logo ? `<div style="padding:0 0 10px;">${logoImg(d, 88)}</div>` : ""}
        ${identity(d, o, { onDark: true })}
        ${gap(10)}
        ${contactStack(d, o, "#e2e8f0", true)}
        ${gap(14)}
        ${cardButton(d, o)}
        ${o.tagline ? `<div style="font-family:${FONT};font-size:11px;color:#94a3b8;padding-top:6px;line-height:1.4;">${esc(o.tagline)}</div>` : ""}
        ${socials ? gap(12) + socials : ""}
      </td>
      ${o.showQr ? `<td valign="top" align="right" style="padding:0 0 0 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tbody><tr>
          <td style="background:#ffffff;padding:6px;border-radius:4px;">${qrImg(d, 78)}</td>
        </tr></tbody></table>
      </td>` : ""}
    </tr></tbody></table>
  </td></tr>${CLOSE}`;
}

/* 9 ── Marketing banner: the signature, then a full-width accent strip that
        turns the tagline into a call to action. */
function marketingBanner(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o, 24);
  const withLogo = o.showLogo && !!d.logo;
  return `${OPEN}
    <tr><td style="padding:0 0 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>
        ${withLogo ? `<td valign="top" style="padding:0 16px 0 0;">${logoImg(d, 88)}</td>` : ""}
        <td valign="top" style="padding:0;">
          ${identity(d, o)}
          ${gap(8)}
          ${contactStack(d, o)}
          ${socials ? gap(10) + socials : ""}
        </td>
        ${o.showQr ? `<td valign="top" align="right" style="padding:0 0 0 18px;">${qrImg(d, 78)}</td>` : ""}
      </tr></tbody></table>
    </td></tr>
    <tr><td style="background:${o.accent};padding:12px 18px;border-radius:5px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody><tr>
        <td valign="middle" style="font-family:${FONT};font-size:13px;font-weight:bold;color:#ffffff;line-height:1.35;">
          ${esc(o.tagline || "See everything about me in one link")}
        </td>
        <td valign="middle" align="right" style="padding:0 0 0 14px;white-space:nowrap;">
          ${d.cardUrl ? `<a href="${esc(d.cardUrl)}" style="display:inline-block;background:#ffffff;color:${o.accent};font-family:${FONT};font-size:12px;font-weight:bold;text-decoration:none;padding:8px 16px;border-radius:4px;">Open my card</a>` : ""}
        </td>
      </tr></tbody></table>
    </td></tr>${CLOSE}`;
}

/* 10 ── Logo panel: the logo gets a tinted panel of its own, so a small or pale
         mark still reads as branding rather than an afterthought. */
function logoPanel(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o);
  const panel = [
    o.showLogo && d.logo ? logoImg(d, 96) : "",
    o.showQr ? `<div style="padding-top:12px;">${qrImg(d, 88)}</div>` : "",
  ].filter(Boolean).join("");
  return `${OPEN}<tr>
    ${panel ? `<td valign="middle" align="center" style="background:${tint(o.accent, 0.9)};padding:18px;border-radius:6px;">${panel}</td>` : ""}
    <td valign="top" style="padding:2px 0 2px ${panel ? "20px" : "0"};">
      ${identity(d, o, { nameSize: 18 })}
      ${gap(10)}
      ${contactStack(d, o)}
      ${gap(12)}
      ${cardButton(d, o)}
      ${taglineLine(o)}
      ${socials ? gap(12) + socials : ""}
    </td>
  </tr>${CLOSE}`;
}

/* 11 ── Tiles: each contact detail in its own bordered box. Scans quickly, and
         Outlook handles table cells better than anything else. */
function tiles(d: SignatureData, o: SignatureOptions): string {
  const lines = contactLines(d, o);
  const socials = socialRow(d, o, 24);
  const cells = lines.map((l) =>
    `<td width="50%" valign="middle" style="width:50%;border:1px solid ${LINE};padding:8px 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tbody><tr>
        <td width="20" valign="middle" style="width:20px;padding:0 7px 0 0;">${icon(d, l.icon, 13)}</td>
        <td valign="middle" style="font-family:${FONT};font-size:12px;color:${INK};">${l.html}</td>
      </tr></tbody></table>
    </td>`);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>${cells[i]}${cells[i + 1] || `<td width="50%" style="width:50%;">&nbsp;</td>`}</tr>`);
  }
  return `${OPEN}
    <tr><td style="padding:0 0 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>
        ${o.showLogo && d.logo ? `<td valign="middle" style="padding:0 14px 0 0;">${logoImg(d, 80)}</td>` : ""}
        <td valign="middle" style="padding:0;">${identity(d, o)}</td>
        ${o.showQr ? `<td valign="middle" align="right" style="padding:0 0 0 14px;">${qrImg(d, 70)}</td>` : ""}
      </tr></tbody></table>
    </td></tr>
    ${rows.length ? `<tr><td style="padding:0 0 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody>${rows.join("")}</tbody></table>
    </td></tr>` : ""}
    <tr><td style="padding:0;">${cardButton(d, o)}${taglineLine(o)}</td></tr>
    ${socials ? `<tr><td style="padding:12px 0 0;">${socials}</td></tr>` : ""}
    ${CLOSE}`;
}

/* 12 ── Monochrome: no accent colour at all. For legal, finance, and anyone
         whose house style forbids decoration. */
function monochrome(d: SignatureData, o: SignatureOptions): string {
  const mono: SignatureOptions = { ...o, accent: "#111111" };
  const socials = socialRow(d, mono, 22, true);
  const role = [d.designation, d.company].filter(Boolean).join("  ·  ");
  return `${OPEN}
    <tr><td style="padding:0 0 6px;font-family:${FONT};font-size:16px;font-weight:bold;color:#111111;letter-spacing:1.2px;text-transform:uppercase;">${esc(d.name)}</td></tr>
    ${role ? `<tr><td style="padding:0 0 10px;font-family:${FONT};font-size:11.5px;color:#555555;letter-spacing:.6px;text-transform:uppercase;">${esc(role)}</td></tr>` : ""}
    <tr><td style="padding:0 0 10px;"><div style="height:1px;line-height:1px;font-size:0;background:#111111;">&nbsp;</div></td></tr>
    <tr><td style="padding:0;">${contactStack(d, mono, "#333333", false, true)}</td></tr>
    <tr><td style="padding:10px 0 0;font-family:${FONT};font-size:12px;">
      ${d.cardUrl ? `<a href="${esc(d.cardUrl)}" style="color:#111111;font-family:${FONT};font-weight:bold;text-decoration:underline;">${esc(prettyUrl(d.cardUrl))}</a>` : ""}
      ${o.tagline ? `<span style="color:#777777;"> &nbsp;·&nbsp; ${esc(o.tagline)}</span>` : ""}
    </td></tr>
    ${socials ? `<tr><td style="padding:10px 0 0;">${socials}</td></tr>` : ""}
    ${CLOSE}`;
}

/* 13 ── Centred: everything stacked down the middle. Holds up best on a phone,
         where side-by-side columns get squeezed. */
function centred(d: SignatureData, o: SignatureOptions): string {
  const lines = contactLines(d, o, INK, false);
  const inline = lines.map((l, i) =>
    `<span style="white-space:nowrap;font-family:${FONT};font-size:12px;color:${INK};">` +
    `${i ? `<span style="color:${LINE};">&nbsp;&nbsp;|&nbsp;&nbsp;</span>` : ""}${icon(d, l.icon, 13, true)}&nbsp;${l.html}</span>`).join("");
  const socials = socialRow(d, o, 24);
  return `${OPEN}
    ${o.showLogo && d.logo ? `<tr><td align="center" style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tbody><tr><td>${logoImg(d, 96)}</td></tr></tbody></table></td></tr>` : ""}
    <tr><td align="center" style="padding:0 0 8px;text-align:center;">${identity(d, o, { nameSize: 18 })}</td></tr>
    <tr><td align="center" style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tbody><tr><td width="52" style="width:52px;height:2px;line-height:2px;font-size:0;background:${o.accent};">&nbsp;</td></tr></tbody></table></td></tr>
    <tr><td align="center" style="padding:0 0 12px;text-align:center;font-family:${FONT};font-size:12px;line-height:2;">${inline}</td></tr>
    <tr><td align="center" style="padding:0;text-align:center;">${cardButton(d, o)}${o.tagline ? `<div style="font-family:${FONT};font-size:11px;color:${MUTED};padding-top:6px;">${esc(o.tagline)}</div>` : ""}</td></tr>
    ${socials ? `<tr><td align="center" style="padding:12px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tbody><tr><td>${socials}</td></tr></tbody></table></td></tr>` : ""}
    ${CLOSE}`;
}

/* 14 ── Ruled: name left, socials right, one accent rule beneath, contacts
         along the bottom. The tidy corporate default. */
function ruled(d: SignatureData, o: SignatureOptions): string {
  const socials = socialRow(d, o, 24);
  return `${OPEN}
    <tr><td style="padding:0 0 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody><tr>
        ${o.showLogo && d.logo ? `<td valign="middle" style="padding:0 14px 0 0;">${logoImg(d, 74)}</td>` : ""}
        <td valign="middle" style="padding:0;">${identity(d, o, { nameSize: 16 })}</td>
        ${socials ? `<td valign="middle" align="right" style="padding:0 0 0 14px;">${socials}</td>` : ""}
      </tr></tbody></table>
    </td></tr>
    <tr><td style="padding:0 0 10px;"><div style="height:2px;line-height:2px;font-size:0;background:${o.accent};">&nbsp;</div></td></tr>
    <tr><td style="padding:0 0 10px;">${contactInline(d, o)}</td></tr>
    <tr><td style="padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody><tr>
        <td valign="middle" style="padding:0;">${cardButton(d, o)}${taglineLine(o)}</td>
        ${o.showQr ? `<td valign="middle" style="padding:0 0 0 16px;">${qrImg(d, 72)}</td>` : ""}
      </tr></tbody></table>
    </td></tr>${CLOSE}`;
}

export const SIGNATURE_TEMPLATES: SignatureTemplate[] = [
  { id: "corporate", name: "Corporate", blurb: "Logo, accent rule, then your details. The safest all-rounder.", build: corporate },
  { id: "executive", name: "Executive", blurb: "Letterhead style — name across the top, logo and QR to the right.", build: executive },
  { id: "slim", name: "Slim", blurb: "A few tight lines. Stays unobtrusive down a long reply chain.", build: slim },
  { id: "header", name: "Header band", blurb: "Your name reversed out of a solid colour bar. The boldest option.", build: headerBand },
  { id: "spotlight", name: "Card spotlight", blurb: "Leads with the QR so people scan straight from the email.", build: spotlight },
  { id: "bookmark", name: "Bookmark", blurb: "Wide colour band down the side, details on a soft tint.", build: bookmark },
  { id: "afterdark", name: "After dark", blurb: "Light type on charcoal. At home in a dark-mode inbox.", build: afterDark },
  { id: "banner", name: "Marketing banner", blurb: "Your details, then a full-width call-to-action strip.", build: marketingBanner },
  { id: "logopanel", name: "Logo panel", blurb: "Logo and QR framed in their own tinted panel.", build: logoPanel },
  { id: "tiles", name: "Tiles", blurb: "Each contact detail boxed. Scans fast, rock-solid in Outlook.", build: tiles },
  { id: "mono", name: "Monochrome", blurb: "Black and white only. For a strict house style.", build: monochrome },
  { id: "centred", name: "Centred", blurb: "Stacked down the middle. The safest one on a phone.", build: centred },
  { id: "ruled", name: "Ruled", blurb: "Name and socials on one line, contacts under a colour rule.", build: ruled },
  { id: "plain", name: "Plain text", blurb: "No images or colour. Renders anywhere, never blocked.", build: plain },
];

export function buildSignature(templateId: string, d: SignatureData, o: SignatureOptions): string {
  const t = SIGNATURE_TEMPLATES.find((x) => x.id === templateId) || SIGNATURE_TEMPLATES[0];
  return t.build(d, o);
}

/* The plain-text flavour that rides along on the clipboard, for plain-text
   composers (and as the fallback when a client refuses HTML). */
export function buildSignatureText(d: SignatureData, o: SignatureOptions): string {
  const lines = [
    [d.name, d.designation, d.company].filter(Boolean).join(" | "),
    d.phone ? `Phone: ${d.phone}` : "",
    d.whatsapp && waDigits(d.whatsapp) !== waDigits(d.phone) ? `WhatsApp: ${d.whatsapp}` : "",
    d.email ? `Email: ${d.email}` : "",
    d.website ? `Web: ${prettyUrl(d.website)}` : "",
    o.showAddress && d.address ? `Address: ${d.address}` : "",
    d.cardUrl ? `My digital card: ${d.cardUrl}` : "",
    o.tagline || "",
    o.showSocials && d.socials.length ? d.socials.map((s) => `${s.label}: ${s.url}`).join("\n") : "",
  ];
  return lines.filter(Boolean).join("\n");
}
