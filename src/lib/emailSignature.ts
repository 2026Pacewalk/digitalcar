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
  socials: { label: string; url: string }[];
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

const a = (href: string, text: string, color: string, bold = false) =>
  `<a href="${esc(href)}" style="color:${color};text-decoration:none;font-family:${FONT};${bold ? "font-weight:bold;" : ""}">${esc(text)}</a>`;

/* One "Label: value" contact row. Uses a nested table so the label column
   cannot collapse in Outlook. */
function row(label: string, valueHtml: string): string {
  return `<tr>
    <td style="padding:2px 8px 2px 0;font-family:${FONT};font-size:12px;color:${MUTED};white-space:nowrap;">${esc(label)}</td>
    <td style="padding:2px 0;font-family:${FONT};font-size:12px;color:${INK};">${valueHtml}</td>
  </tr>`;
}

function contactRows(d: SignatureData, o: SignatureOptions): string {
  const out: string[] = [];
  if (d.phone) out.push(row("Phone", a(`tel:${digits(d.phone)}`, d.phone, INK)));
  if (d.whatsapp && waDigits(d.whatsapp) !== waDigits(d.phone)) {
    out.push(row("WhatsApp", a(`https://wa.me/${waDigits(d.whatsapp)}`, d.whatsapp, INK)));
  }
  if (d.email) out.push(row("Email", a(`mailto:${d.email}`, d.email, INK)));
  if (d.website) out.push(row("Web", a(d.website, prettyUrl(d.website), INK)));
  if (o.showAddress && d.address) {
    out.push(row("Address", `<span style="font-family:${FONT};font-size:12px;color:${INK};">${esc(d.address)}</span>`));
  }
  return out.join("");
}

function socialsLine(d: SignatureData, o: SignatureOptions): string {
  if (!o.showSocials || !d.socials.length) return "";
  // Text links, not icons: icon fonts never render in mail, and hot-linked icon
  // images are blocked by default in Outlook.
  const links = d.socials.map((s) => a(s.url, s.label, o.accent)).join(
    `<span style="color:${LINE};"> &nbsp;|&nbsp; </span>`);
  return `<tr><td style="padding:8px 0 0;font-family:${FONT};font-size:11px;">${links}</td></tr>`;
}

/* The point of the whole feature: a prominent, tappable card link. */
function cardButton(d: SignatureData, o: SignatureOptions): string {
  return `<a href="${esc(d.cardUrl)}" style="display:inline-block;background:${o.accent};color:#ffffff;font-family:${FONT};font-size:12px;font-weight:bold;text-decoration:none;padding:8px 16px;border-radius:6px;">View my digital card</a>`;
}

function cardLinkLine(d: SignatureData, o: SignatureOptions): string {
  const tag = o.tagline ? `<div style="font-family:${FONT};font-size:11px;color:${MUTED};padding-top:4px;">${esc(o.tagline)}</div>` : "";
  return `${a(d.cardUrl, prettyUrl(d.cardUrl), o.accent, true)}${tag}`;
}

const logoImg = (d: SignatureData, size: number) =>
  `<img src="${esc(d.logo)}" width="${size}" alt="${esc(d.company || d.name)}" style="display:block;border:0;outline:none;width:${size}px;max-width:${size}px;height:auto;border-radius:6px;" />`;

const qrImg = (d: SignatureData, size: number) =>
  `<img src="${esc(d.qrSrc)}" width="${size}" height="${size}" alt="Scan my digital card" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;" />`;

const nameBlock = (d: SignatureData, o: SignatureOptions, nameSize = 16) => `
  <div style="font-family:${FONT};font-size:${nameSize}px;font-weight:bold;color:${INK};line-height:1.25;">${esc(d.name)}</div>
  ${d.designation || d.company ? `<div style="font-family:${FONT};font-size:12px;color:${MUTED};padding-top:2px;line-height:1.35;">
    ${esc(d.designation)}${d.designation && d.company ? " &nbsp;·&nbsp; " : ""}${d.company ? `<span style="color:${o.accent};font-weight:bold;">${esc(d.company)}</span>` : ""}
  </div>` : ""}`;

const wrap = (inner: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>${inner}</tbody></table>`;

/* ── Templates ─────────────────────────────────────────────────────────── */

const classic: SignatureTemplate["build"] = (d, o) => wrap(`
  <tr>
    ${o.showLogo && d.logo ? `<td style="padding:0 16px 0 0;vertical-align:top;">${logoImg(d, 72)}</td>
    <td style="padding:0 16px 0 0;border-left:3px solid ${o.accent};"></td>` : ""}
    <td style="vertical-align:top;">
      ${nameBlock(d, o)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;padding-top:8px;"><tbody>
        ${contactRows(d, o)}
        <tr><td colspan="2" style="padding:8px 0 0;">${cardLinkLine(d, o)}</td></tr>
        ${socialsLine(d, o)}
      </tbody></table>
    </td>
    ${o.showQr ? `<td style="padding:0 0 0 16px;vertical-align:top;">${qrImg(d, 76)}</td>` : ""}
  </tr>`);

const modern: SignatureTemplate["build"] = (d, o) => wrap(`
  <tr>
    <td style="border-left:4px solid ${o.accent};padding:2px 0 2px 14px;vertical-align:top;">
      ${o.showLogo && d.logo ? `<div style="padding-bottom:8px;">${logoImg(d, 64)}</div>` : ""}
      ${nameBlock(d, o, 17)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;padding-top:8px;"><tbody>
        ${contactRows(d, o)}
        ${socialsLine(d, o)}
      </tbody></table>
      <div style="padding-top:12px;">${cardButton(d, o)}</div>
      ${o.tagline ? `<div style="font-family:${FONT};font-size:11px;color:${MUTED};padding-top:6px;">${esc(o.tagline)}</div>` : ""}
    </td>
    ${o.showQr ? `<td style="padding:0 0 0 18px;vertical-align:top;">${qrImg(d, 84)}</td>` : ""}
  </tr>`);

const compact: SignatureTemplate["build"] = (d, o) => wrap(`
  <tr>
    ${o.showLogo && d.logo ? `<td style="padding:0 12px 0 0;vertical-align:middle;">${logoImg(d, 48)}</td>` : ""}
    <td style="vertical-align:middle;">
      <div style="font-family:${FONT};font-size:14px;font-weight:bold;color:${INK};">${esc(d.name)}${d.designation ? `<span style="font-weight:normal;color:${MUTED};font-size:12px;"> &nbsp;·&nbsp; ${esc(d.designation)}</span>` : ""}</div>
      <div style="font-family:${FONT};font-size:12px;color:${INK};padding-top:4px;">
        ${[d.phone ? a(`tel:${digits(d.phone)}`, d.phone, INK) : "",
           d.email ? a(`mailto:${d.email}`, d.email, INK) : "",
           d.website ? a(d.website, prettyUrl(d.website), INK) : ""]
          .filter(Boolean).join(`<span style="color:${LINE};"> &nbsp;|&nbsp; </span>`)}
      </div>
      <div style="padding-top:6px;">${cardLinkLine(d, o)}</div>
      ${o.showSocials && d.socials.length ? `<div style="padding-top:6px;font-family:${FONT};font-size:11px;">${d.socials.map((s) => a(s.url, s.label, o.accent)).join(`<span style="color:${LINE};"> &nbsp;|&nbsp; </span>`)}</div>` : ""}
    </td>
  </tr>`);

const banner: SignatureTemplate["build"] = (d, o) => wrap(`
  <tr><td style="background:${o.accent};padding:12px 16px;border-radius:8px 8px 0 0;">
    <div style="font-family:${FONT};font-size:16px;font-weight:bold;color:#ffffff;line-height:1.2;">${esc(d.name)}</div>
    ${d.designation || d.company ? `<div style="font-family:${FONT};font-size:12px;color:#ffffff;opacity:0.9;padding-top:2px;">${esc([d.designation, d.company].filter(Boolean).join(" · "))}</div>` : ""}
  </td></tr>
  <tr><td style="border:1px solid ${LINE};border-top:0;border-radius:0 0 8px 8px;padding:12px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>
      <tr>
        ${o.showLogo && d.logo ? `<td style="padding:0 14px 0 0;vertical-align:top;">${logoImg(d, 56)}</td>` : ""}
        <td style="vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>
            ${contactRows(d, o)}
            ${socialsLine(d, o)}
          </tbody></table>
          <div style="padding-top:10px;">${cardButton(d, o)}</div>
        </td>
        ${o.showQr ? `<td style="padding:0 0 0 14px;vertical-align:top;">${qrImg(d, 72)}</td>` : ""}
      </tr>
    </tbody></table>
  </td></tr>`);

const cardFirst: SignatureTemplate["build"] = (d, o) => wrap(`
  <tr>
    <td style="vertical-align:top;padding:0 16px 0 0;">
      ${qrImg(d, 96)}
      <div style="font-family:${FONT};font-size:10px;color:${MUTED};padding-top:4px;text-align:center;width:96px;">Scan my card</div>
    </td>
    <td style="vertical-align:top;border-left:1px solid ${LINE};padding-left:16px;">
      ${o.showLogo && d.logo ? `<div style="padding-bottom:8px;">${logoImg(d, 60)}</div>` : ""}
      ${nameBlock(d, o)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;padding-top:8px;"><tbody>
        ${contactRows(d, o)}
        ${socialsLine(d, o)}
      </tbody></table>
      <div style="padding-top:10px;">${cardButton(d, o)}</div>
      ${o.tagline ? `<div style="font-family:${FONT};font-size:11px;color:${MUTED};padding-top:6px;">${esc(o.tagline)}</div>` : ""}
    </td>
  </tr>`);

/* Text-only. Nothing to strip, nothing to block — renders identically in every
   client, including plain-text-only setups and mobile signature fields. */
const minimal: SignatureTemplate["build"] = (d, o) => wrap(`
  <tr><td style="font-family:${FONT};font-size:13px;color:${INK};line-height:1.5;">
    <strong style="color:${INK};">${esc(d.name)}</strong>${d.designation ? ` — ${esc(d.designation)}` : ""}${d.company ? `, ${esc(d.company)}` : ""}<br />
    ${[d.phone ? a(`tel:${digits(d.phone)}`, d.phone, INK) : "",
       d.email ? a(`mailto:${d.email}`, d.email, INK) : ""].filter(Boolean).join(" &nbsp;|&nbsp; ")}<br />
    ${cardLinkLine(d, o)}
  </td></tr>`);

export const SIGNATURE_TEMPLATES: SignatureTemplate[] = [
  { id: "classic", name: "Classic", blurb: "Logo, a divider rule, then your details. The safest all-rounder.", build: classic },
  { id: "modern", name: "Modern", blurb: "Accent bar down the side with a call-to-action button.", build: modern },
  { id: "compact", name: "Compact", blurb: "Two tight lines — good for replies and long threads.", build: compact },
  { id: "banner", name: "Banner", blurb: "Coloured header band with your name, details boxed beneath.", build: banner },
  { id: "card", name: "Card-first", blurb: "Leads with your QR so people can scan straight from the email.", build: cardFirst },
  { id: "minimal", name: "Plain text", blurb: "No images or colour blocks — renders anywhere, never blocked.", build: minimal },
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
    d.email ? `Email: ${d.email}` : "",
    d.website ? `Web: ${prettyUrl(d.website)}` : "",
    o.showAddress && d.address ? `Address: ${d.address}` : "",
    `My digital card: ${d.cardUrl}`,
    o.tagline || "",
    o.showSocials && d.socials.length ? d.socials.map((s) => `${s.label}: ${s.url}`).join("\n") : "",
  ];
  return lines.filter(Boolean).join("\n");
}
