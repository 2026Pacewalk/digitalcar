/*
 * The DigitalCarda email kit: one shell and a set of building blocks every
 * email is assembled from, so all of them look like one family.
 *
 * Email HTML is 1998 technology. Everything here is tables + inline styles,
 * solid colours (Outlook drops rgba), bgcolor attributes next to background
 * styles (Outlook ignores CSS backgrounds on cells), no web fonts, no flex or
 * grid, and nothing that needs <style> (Gmail strips it). The design carries
 * itself on colour blocking, type hierarchy and spacing, so it survives the
 * clients that ignore border-radius and padding on links.
 *
 * Every helper that takes `html` expects TRUSTED markup (callers escape user
 * text with esc()); every helper that takes plain text escapes it itself.
 */

export const SITE = "https://digitalcarda.in";
export const SUPPORT_WHATSAPP = { display: "+91 95177 22444", wa: "919517722444" };
export const SUPPORT_EMAIL = "hello@digitalcarda.in";

export const BRAND = {
  gold: "#F7B31C",
  goldDark: "#B45309",
  goldTint: "#FFF8EA",   // warm band behind the light hero
  goldLine: "#F6DFA8",
  navy: "#14243E",
  navyDeep: "#0B1729",
  ink: "#0F172A",
  body: "#3F4C5F",
  sub: "#7A8798",
  line: "#E8EDF3",
  soft: "#F4F7FB",
  page: "#EDF1F7",       // outside the card
};

/** On the dark hero band. */
export const ON_DARK = { text: "#FFFFFF", sub: "#93A4BD", chip: "#1C2F4D", chipLine: "#2A4166", chipText: "#DCE4EF" };

/** Status colours. `solid` for dots/rails/pills, `tint` + `line` for panels, `text` for words on the tint. */
export const TONE = {
  gold: { solid: "#F7B31C", tint: "#FFF8EA", line: "#F6DFA8", text: "#78350F", onSolid: "#1A1206" },
  green: { solid: "#16A34A", tint: "#ECFDF3", line: "#B7EBC9", text: "#14532D", onSolid: "#FFFFFF" },
  amber: { solid: "#F59E0B", tint: "#FFF8E6", line: "#F8DC9B", text: "#78350F", onSolid: "#1A1206" },
  red: { solid: "#DC2626", tint: "#FEF2F2", line: "#FBCACA", text: "#7F1D1D", onSolid: "#FFFFFF" },
  blue: { solid: "#2563EB", tint: "#EFF6FF", line: "#C7DBFE", text: "#1E3A8A", onSolid: "#FFFFFF" },
  violet: { solid: "#7C3AED", tint: "#F5F3FF", line: "#DDD3FD", text: "#4C1D95", onSolid: "#FFFFFF" },
} as const;
export type Tone = keyof typeof TONE;

export interface Email {
  /** Which template produced this — recorded in the email log. */
  kind?: string;
  /** The account this email is about, for the email log, when the recipient
      address no longer belongs to it (e.g. the old address after an email change),
      so erasing the account also erases the log row. */
  userId?: number;
  subject: string;
  html: string;
  text: string;
}

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif";
export const MONO = "'SF Mono',Menlo,Consolas,'Courier New',monospace";

/** Escape text for HTML text AND double-quoted attributes. */
export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

export const inr = (n: unknown) => "₹" + Number(n || 0).toLocaleString("en-IN");

/** An http(s) URL or null — never let javascript:/data: into an href or src. */
export const safeUrl = (u?: string | null) => (u && /^https?:\/\/[^\s"'<>]+$/i.test(u.trim()) ? u.trim() : null);

/** "#E11D48" or null. */
export const safeHex = (c?: string | null) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

export const firstName = (name?: string | null) => (String(name || "").trim().split(/\s+/)[0] || "");

/* ── Dates (always India time, whatever the server clock's zone) ─────────── */

const IST = "Asia/Kolkata";
/** "Sun, 21 Sept, 3:42 pm" */
export const whenIst = (d: Date) => d.toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
/** "Sun, 21 Sept" */
export const dayIst = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
/** "21 Sept 2026" */
export const dateIst = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });

/* ── Phone / WhatsApp ───────────────────────────────────────────────────── */

/** wa.me wants the full number, digits only: 10-digit Indian numbers get 91. */
export function waNumber(phone?: string | null): string | null {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
export const waLink = (phone: string | null | undefined, message: string) => {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : null;
};
export const telLink = (phone?: string | null) => { const n = waNumber(phone); return n ? `tel:+${n}` : null; };
/** "+91 90000 01234" for Indian mobiles; anything else as typed. */
export const showPhone = (phone: string) => {
  const n = waNumber(phone);
  return n && n.length === 12 && n.startsWith("91") ? `+91 ${n.slice(2, 7)} ${n.slice(7)}` : phone;
};
/** mailto: with the address kept intact (an address may legally contain ?, & or #). */
export const mailtoLink = (email: string, subject?: string) =>
  `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

/* ── Inline pieces ──────────────────────────────────────────────────────── */

export const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;
export const hi = (name?: string | null) => p(`Hi ${esc(firstName(name) || "there")},`);
export const strong = (text: string) => `<strong style="color:${BRAND.ink}">${esc(text)}</strong>`;
export const muted = (html: string) => `<span style="color:${BRAND.sub};font-weight:500">${html}</span>`;
export const small = (html: string) => p(`<span style="font-size:13px;line-height:1.6;color:${BRAND.sub}">${html}</span>`);
export const mono = (text: string) => `<span style="font-family:${MONO};font-size:13px;color:${BRAND.ink}">${esc(text)}</span>`;
/** A link that reads as text with a gold underline. */
export const inkLink = (href: string, label: string) =>
  `<a href="${esc(href)}" target="_blank" style="color:${BRAND.ink};text-decoration:none;border-bottom:1px solid ${BRAND.goldLine}">${esc(label)}</a>`;
/** A gold text link ("See pricing →"). */
export const goldLink = (href: string, label: string) =>
  `<a href="${esc(href)}" target="_blank" style="color:${BRAND.goldDark};font-weight:700;text-decoration:none">${esc(label)}</a>`;
export const phoneLink = (phone: string) => { const t = telLink(phone); return t ? inkLink(t, showPhone(phone)) : esc(phone); };
export const emailLink = (email: string) => inkLink(mailtoLink(email), email);
/** A single value for reading aloud / copying (codes, passwords, references). */
export const codeValue = (v: string) =>
  `<span style="display:inline-block;font-family:${MONO};font-size:15px;font-weight:700;color:${BRAND.ink};background:${BRAND.goldTint};border:1px solid ${BRAND.goldLine};border-radius:7px;padding:5px 11px;letter-spacing:.4px">${esc(v)}</span>`;
/** Coloured pill for light backgrounds. */
export const pill = (text: string, tone: Tone = "gold") =>
  `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${TONE[tone].tint};border:1px solid ${TONE[tone].line};font-family:${FONT};font-size:11px;font-weight:800;color:${TONE[tone].text};letter-spacing:.3px;white-space:nowrap">${esc(text)}</span>`;
/** Pill for the dark hero band. */
export const darkChip = (html: string, fg: string = ON_DARK.chipText) =>
  `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 11px;border-radius:999px;background:${ON_DARK.chip};border:1px solid ${ON_DARK.chipLine};font-family:${FONT};font-size:11.5px;font-weight:700;color:${fg};line-height:1.3;word-break:break-word">${html}</span> `;
export const spacer = (px = 16) => `<div style="height:${px}px;font-size:0;line-height:0">&nbsp;</div>`;
export const divider = () => `<div style="height:1px;background:${BRAND.line};margin:26px 0;font-size:0;line-height:0">&nbsp;</div>`;

/* ── Heroes: the band under the logo. One per email. ─────────────────────── */

/** Dark, bold band — the default for anything worth celebrating or acting on.
    `aside` is a big figure on the right (an amount, days left, a count). */
export function heroBand(o: {
  eyebrow: string;
  title: string;          // plain text
  sub?: string;           // plain text
  tone?: Tone;            // colour of the eyebrow dot + accents
  aside?: { label: string; value: string; sub?: string };  // plain text
  chips?: string[];       // trusted HTML (use darkChip content, i.e. escaped text)
  icon?: string;          // one emoji/glyph shown in a gold tile (optional)
}): string {
  const tone = TONE[o.tone || "gold"];
  const iconTile = o.icon
    ? `<td width="66" valign="top" style="width:66px;min-width:66px;padding-top:2px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="52" height="52" align="center" valign="middle" bgcolor="${BRAND.gold}" style="width:52px;height:52px;border-radius:14px;font-size:26px;line-height:52px">${o.icon}</td>
      </tr></table></td>`
    : "";
  const aside = o.aside
    ? `<td valign="top" align="right" style="padding-left:14px">
        <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${ON_DARK.sub};text-transform:uppercase;letter-spacing:1.2px;padding-top:4px;white-space:nowrap">${esc(o.aside.label)}</div>
        <div style="font-family:${FONT};font-size:30px;line-height:1.15;font-weight:800;color:${BRAND.gold};letter-spacing:-.6px;white-space:nowrap">${esc(o.aside.value)}</div>
        ${o.aside.sub ? `<div style="font-family:${FONT};font-size:11.5px;color:${ON_DARK.sub};padding-top:2px">${esc(o.aside.sub)}</div>` : ""}
      </td>`
    : "";
  return `<tr><td bgcolor="${BRAND.navyDeep}" style="background:${BRAND.navyDeep};padding:28px 32px 26px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${iconTile}
      <td valign="top">
        <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${tone.solid};text-transform:uppercase;letter-spacing:1.4px">&#9679;&nbsp; ${esc(o.eyebrow)}</div>
        <h1 style="margin:0;padding-top:8px;font-family:${FONT};font-size:27px;line-height:1.22;font-weight:800;color:${ON_DARK.text};letter-spacing:-.4px;word-break:break-word;overflow-wrap:anywhere">${esc(o.title)}</h1>
        ${o.sub ? `<div style="font-family:${FONT};font-size:14.5px;line-height:1.55;color:#C3CFDF;padding-top:8px">${esc(o.sub)}</div>` : ""}
      </td>
      ${aside}
    </tr></table>
    ${o.chips && o.chips.length ? `<div style="padding-top:16px">${o.chips.join(" ")}</div>` : ""}
  </td></tr>`;
}

/** Warm light band — for quiet, informational emails (security notices, receipts of a request). */
export function heroLight(o: { badge?: string; title: string; sub?: string; tone?: Tone }): string {
  const tone = TONE[o.tone || "gold"];
  return `<tr><td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};padding:30px 32px 26px;border-bottom:1px solid ${BRAND.goldLine}">
    ${o.badge ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 13px"><tr>
      <td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:999px;padding:6px 14px;font-family:${FONT};font-size:10px;font-weight:700;color:${tone.solid === TONE.gold.solid ? BRAND.gold : "#FFFFFF"};text-transform:uppercase;letter-spacing:1.2px">${esc(o.badge)}</td>
    </tr></table>` : ""}
    <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:800;color:${BRAND.ink};letter-spacing:-.3px">${esc(o.title)}</h1>
    ${o.sub ? `<div style="font-family:${FONT};font-size:15px;line-height:1.55;color:${BRAND.body};padding-top:8px">${esc(o.sub)}</div>` : ""}
  </td></tr>`;
}

/** A person at the top (owner alerts about a signup, an application, a lead). */
export function heroPerson(o: {
  eyebrow: string; tone?: Tone; when?: Date;
  name: string; sub?: string | null; photo?: string | null;
  chips?: string[];   // trusted HTML from darkChip()
}): string {
  const tone = TONE[o.tone || "green"];
  const photo = safeUrl(o.photo);
  const initial = (firstName(o.name).charAt(0) || "?").toUpperCase();
  const avatar = photo
    ? `<img src="${esc(photo)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:50%;border:3px solid ${BRAND.gold}">`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="64" height="64" align="center" valign="middle" bgcolor="${BRAND.gold}" style="width:64px;height:64px;border-radius:50%;font-family:${FONT};font-size:26px;font-weight:800;color:${BRAND.navyDeep}">${esc(initial)}</td></tr></table>`;
  return `<tr><td bgcolor="${BRAND.navyDeep}" style="background:${BRAND.navyDeep};padding:28px 32px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="80" valign="top" style="width:80px;min-width:80px;padding-top:2px">${avatar}</td>
      <td valign="top">
        <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${tone.solid};text-transform:uppercase;letter-spacing:1.4px">&#9679;&nbsp; ${esc(o.eyebrow)}${o.when ? ` &nbsp;<span style="color:${ON_DARK.sub};font-weight:600;letter-spacing:.4px;text-transform:none">${esc(whenIst(o.when))}</span>` : ""}</div>
        <div style="font-family:${FONT};font-size:27px;line-height:1.2;font-weight:800;color:${ON_DARK.text};letter-spacing:-.4px;padding-top:7px;word-break:break-word;overflow-wrap:anywhere">${esc(o.name)}</div>
        ${o.sub ? `<div style="font-family:${FONT};font-size:15px;font-weight:700;color:${BRAND.gold};padding-top:4px;word-break:break-word">${esc(o.sub)}</div>` : ""}
        ${o.chips && o.chips.length ? `<div style="padding-top:14px">${o.chips.join(" ")}</div>` : ""}
      </td>
    </tr></table>
  </td></tr>`;
}

/* ── Body blocks ─────────────────────────────────────────────────────────── */

/** Small uppercase heading with a gold dash, opening each block. */
export function sectionLabel(t: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 12px"><tr>
    <td width="18" style="width:18px;padding:0 8px 0 0"><div style="height:2px;width:18px;background:${BRAND.gold};font-size:0;line-height:0">&nbsp;</div></td>
    <td style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${BRAND.goldDark};text-transform:uppercase;letter-spacing:1.3px">${esc(t)}</td>
  </tr></table>`;
}

/** Primary call to action: solid gold with a darker keyline, so it still reads as
    a button in clients that ignore border-radius. `tone` swaps the colour. */
export function button(label: string, href: string, tone: "gold" | "dark" | "green" = "gold"): string {
  const t = tone === "dark" ? { bg: BRAND.navy, bd: BRAND.navyDeep, fg: "#FFFFFF" }
    : tone === "green" ? { bg: "#16A34A", bd: "#15803D", fg: "#FFFFFF" }
    : { bg: BRAND.gold, bd: BRAND.goldDark, fg: "#1A1206" };
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr>
    <td align="center" bgcolor="${t.bg}" style="background:${t.bg};border-radius:12px;border-bottom:3px solid ${t.bd}">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:15px;font-weight:700;color:${t.fg};text-decoration:none;letter-spacing:.2px">${esc(label)}</a>
    </td></tr></table>`;
}

type Action = { label: string; href: string | null | undefined; tone?: "whatsapp" | "dark" | "gold" | "light" };
/** Tap-to-act pills that wrap on a narrow screen. Actions without a link are skipped. */
export function actionPills(actions: Action[]): string {
  const tones = {
    whatsapp: { bg: "#25D366", fg: "#FFFFFF", bd: "#1FAF55" },
    dark: { bg: BRAND.navy, fg: "#FFFFFF", bd: BRAND.navyDeep },
    gold: { bg: BRAND.gold, fg: "#1A1206", bd: BRAND.goldDark },
    light: { bg: "#FFFFFF", fg: BRAND.ink, bd: "#D5DDE8" },
  };
  const live = actions.filter((a) => !!a.href);
  if (!live.length) return "";
  return `<div style="margin:0 0 4px">${live.map((a) => {
    const t = tones[a.tone || "light"];
    return `<a href="${esc(a.href)}" target="_blank" style="display:inline-block;margin:0 8px 9px 0;padding:11px 17px;border-radius:999px;background:${t.bg};border:1px solid ${t.bd};font-family:${FONT};font-size:13.5px;font-weight:700;color:${t.fg};text-decoration:none;line-height:1.1;white-space:nowrap">${esc(a.label)}</a>`;
  }).join(" ")}</div>`;
}

/** Two to three figures side by side. Values/subs are trusted HTML; labels are text. */
export function statTiles(tiles: { label: string; value: string; sub?: string }[]): string {
  if (!tiles.length) return "";
  const w = Math.floor(100 / tiles.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr>
    ${tiles.map((t, i) => `<td width="${w}%" valign="top" style="padding:0 ${i < tiles.length - 1 ? 8 : 0}px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:14px;padding:12px 10px 11px">
          <div style="font-family:${FONT};font-size:10px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.3px">${esc(t.label)}</div>
          <div style="font-family:${FONT};font-size:19px;font-weight:800;color:${BRAND.ink};letter-spacing:-.4px;line-height:1.25;padding-top:5px">${t.value}</div>
          ${t.sub ? `<div style="font-family:${FONT};font-size:11.5px;line-height:1.45;color:${BRAND.sub};padding-top:2px">${t.sub}</div>` : ""}
        </td></tr></table>
    </td>`).join("")}
  </tr></table>`;
}

/** Label | value rows. Values are trusted HTML; rows with an empty value drop out. */
export function infoGrid(rows: [string, string | null | undefined | false][]): string {
  const live = rows.filter((r): r is [string, string] => !!r[1]);
  if (!live.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">
    ${live.map(([k, v], i) => `<tr>
      <td width="34%" valign="top" style="padding:12px 10px 12px 18px;${i < live.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}font-family:${FONT};font-size:12px;font-weight:600;color:${BRAND.sub}">${esc(k)}</td>
      <td valign="top" style="padding:12px 18px 12px 0;${i < live.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}font-family:${FONT};font-size:14px;font-weight:600;line-height:1.5;color:${BRAND.ink};word-break:break-word">${v}</td>
    </tr>`).join("")}
  </table>`;
}

/** Key/value card with a gold rail — labels above values, so long values (URLs,
    emails, passwords) get the full width. Values are trusted HTML. */
export function detailTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid ${BRAND.line};border-left:4px solid ${BRAND.gold};border-radius:12px;background:#FFFFFF">
    <tr><td style="padding:6px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows.map(([k, v], i) => `<tr>
        <td style="padding:${i === 0 ? "16px" : "14px"} 0 14px;${i < rows.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}">
          <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px;margin-bottom:5px">${esc(k)}</div>
          <div style="font-family:${FONT};font-size:15px;font-weight:600;color:${BRAND.ink};word-break:break-word">${v}</div>
        </td></tr>`).join("")}
      </table>
    </td></tr>
  </table>`;
}

/** A coloured "what happens now / what to do" panel. Title is text; body and actions are HTML. */
export function callout(tone: Tone, title: string, bodyHtml: string, actionsHtml = ""): string {
  const t = TONE[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0">
    <tr><td bgcolor="${t.tint}" style="background:${t.tint};border:1px solid ${t.line};border-left:5px solid ${t.solid};border-radius:14px;padding:18px 20px ${actionsHtml ? 12 : 16}px">
      <div style="font-family:${FONT};font-size:16px;font-weight:800;color:${t.text};letter-spacing:-.2px">${esc(title)}</div>
      <div style="font-family:${FONT};font-size:13.5px;line-height:1.6;color:${BRAND.body};padding:5px 0 ${actionsHtml ? 12 : 0}px">${bodyHtml}</div>
      ${actionsHtml}
    </td></tr>
  </table>`;
}

/** Soft grey note / caveat. */
export function note(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr><td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border-radius:10px;padding:13px 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${BRAND.body}">${html}</td></tr>
  </table>`;
}

/** Numbered step — only for real sequences (order matters). Title/body are HTML. */
export function stepRow(n: number, title: string, body: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px">
    <tr>
      <td width="42" valign="top" style="padding:12px 0">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="30" height="30" align="center" valign="middle" bgcolor="${BRAND.goldTint}" style="width:30px;height:30px;border-radius:8px;border:1px solid ${BRAND.goldLine};font-family:${FONT};font-size:13px;font-weight:800;color:${BRAND.goldDark}">${n}</td>
        </tr></table>
      </td>
      <td valign="top" style="padding:12px 0 12px 4px;border-bottom:1px solid ${BRAND.line}">
        <div style="font-family:${FONT};font-size:15px;font-weight:700;color:${BRAND.ink};margin-bottom:3px">${title}</div>
        <div style="font-family:${FONT};font-size:13.5px;line-height:1.6;color:${BRAND.body}">${body}</div>
      </td>
    </tr>
  </table>`;
}
/** Back-compat name. */
export const featureRow = stepRow;

/** Ticked list of alternatives (not steps). Items are HTML. */
export function tickList(label: string, items: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
    <tr><td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border-radius:14px;padding:18px 20px 6px">
      ${label ? `<div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1px;padding-bottom:6px">${esc(label)}</div>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${items.map((t) => `<tr>
          <td width="24" valign="top" style="padding:8px 0;font-family:${FONT};font-size:14px;font-weight:800;color:${BRAND.goldDark};line-height:1.6">&#10003;</td>
          <td valign="top" style="padding:8px 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.body}">${t}</td>
        </tr>`).join("")}
      </table>
    </td></tr>
  </table>`;
}

/** Icon tiles in a 2-column grid — features, benefits, ideas. Icon is one emoji/glyph; title/body HTML. */
export function iconGrid(items: { icon: string; title: string; body: string }[]): string {
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const cell = (it?: { icon: string; title: string; body: string }, right = false) => it
      ? `<td width="50%" valign="top" style="padding:0 ${right ? 0 : 6}px 12px ${right ? 6 : 0}px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${BRAND.line};border-radius:14px;padding:16px 16px 14px">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="36" height="36" align="center" valign="middle" bgcolor="${BRAND.goldTint}" style="width:36px;height:36px;border-radius:10px;border:1px solid ${BRAND.goldLine};font-size:18px;line-height:36px">${it.icon}</td></tr></table>
              <div style="font-family:${FONT};font-size:14.5px;font-weight:800;color:${BRAND.ink};padding-top:10px">${it.title}</div>
              <div style="font-family:${FONT};font-size:13px;line-height:1.55;color:${BRAND.body};padding-top:3px">${it.body}</div>
            </td></tr></table>
        </td>`
      : `<td width="50%" style="padding:0 0 12px 6px">&nbsp;</td>`;
    rows.push(`<tr>${cell(items[i])}${cell(items[i + 1], true)}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0">${rows.join("")}</table>`;
}

/** Horizontal progress through a real sequence (order status, onboarding).
    `current` is the index of the step in progress; earlier ones are done. */
export function progressSteps(steps: string[], current: number, tone: Tone = "gold"): string {
  const t = TONE[tone];
  const w = Math.floor(100 / steps.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr>
    ${steps.map((s, i) => {
      const done = i < current, now = i === current;
      const dotBg = done ? t.solid : now ? "#FFFFFF" : BRAND.soft;
      const dotBd = done || now ? t.solid : "#D5DDE8";
      const lineL = i === 0 ? "#FFFFFF" : i <= current ? t.solid : BRAND.line;
      const lineR = i === steps.length - 1 ? "#FFFFFF" : i < current ? t.solid : BRAND.line;
      return `<td width="${w}%" align="center" valign="top">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="50%" style="padding-top:11px"><div style="height:3px;background:${lineL};font-size:0;line-height:0">&nbsp;</div></td>
          <td width="24" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="20" height="20" align="center" valign="middle" bgcolor="${dotBg}" style="width:20px;height:20px;border-radius:50%;border:2px solid ${dotBd};font-family:${FONT};font-size:11px;font-weight:800;color:${done ? t.onSolid : t.solid};line-height:20px">${done ? "&#10003;" : now ? "&#9679;" : "&nbsp;"}</td>
          </tr></table></td>
          <td width="50%" style="padding-top:11px"><div style="height:3px;background:${lineR};font-size:0;line-height:0">&nbsp;</div></td>
        </tr></table>
        <div style="font-family:${FONT};font-size:11px;line-height:1.35;font-weight:${now ? 800 : 600};color:${now ? BRAND.ink : done ? BRAND.body : BRAND.sub};padding:7px 2px 0">${esc(s)}</div>
      </td>`;
    }).join("")}
  </tr></table>`;
}

/** A bar showing how far along something is (trial used, profile complete). */
export function progressBar(o: { pct: number; label: string; value: string; tone?: Tone; caption?: string }): string {
  const t = TONE[o.tone || "gold"];
  const pct = Math.max(0, Math.min(100, Math.round(o.pct)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 6px">
    <tr>
      <td style="font-family:${FONT};font-size:12px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.8px;padding-bottom:8px">${esc(o.label)}</td>
      <td align="right" style="font-family:${FONT};font-size:13px;font-weight:800;color:${BRAND.ink};padding-bottom:8px;white-space:nowrap">${esc(o.value)}</td>
    </tr>
    <tr><td colspan="2">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.line}" style="background:${BRAND.line};border-radius:999px"><tr>
        ${pct > 0 ? `<td width="${pct}%" height="10" bgcolor="${t.solid}" style="width:${pct}%;height:10px;background:${t.solid};border-radius:999px;font-size:0;line-height:0">&nbsp;</td>` : ""}
        ${pct < 100 ? `<td height="10" style="height:10px;font-size:0;line-height:0">&nbsp;</td>` : ""}
      </tr></table>
    </td></tr>
    ${o.caption ? `<tr><td colspan="2" style="font-family:${FONT};font-size:12px;color:${BRAND.sub};padding-top:7px">${esc(o.caption)}</td></tr>` : ""}
  </table>`;
}

/** Itemised money table with a gold total band. Names are text; amounts are numbers. */
export function receipt(o: {
  rows: { name: string; sub?: string; qty?: number; amount: number }[];
  extra?: { label: string; value: string; tone?: Tone }[];   // delivery, discount… (text)
  totalLabel?: string; total: number;
}): string {
  const cell = `border-bottom:1px solid ${BRAND.line};font-family:${FONT}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">
    ${o.rows.map((r) => `<tr>
      <td style="padding:13px 0 13px 18px;${cell}">
        <div style="font-size:14.5px;font-weight:700;color:${BRAND.ink}">${esc(r.name)}</div>
        ${r.sub ? `<div style="font-size:12px;color:${BRAND.sub};padding-top:2px">${esc(r.sub)}</div>` : ""}
      </td>
      <td align="center" style="padding:13px 8px;${cell};font-size:14px;font-weight:700;color:${BRAND.ink};white-space:nowrap">${r.qty ? `&times; ${r.qty}` : ""}</td>
      <td align="right" style="padding:13px 18px 13px 0;${cell};font-size:14.5px;font-weight:700;color:${BRAND.ink};white-space:nowrap">${esc(inr(r.amount))}</td>
    </tr>`).join("")}
    ${(o.extra || []).map((x) => `<tr>
      <td style="padding:12px 0 12px 18px;font-family:${FONT};font-size:13px;color:${BRAND.sub}">${esc(x.label)}</td>
      <td></td>
      <td align="right" style="padding:12px 18px 12px 0;font-family:${FONT};font-size:13px;font-weight:700;color:${x.tone ? TONE[x.tone].solid : BRAND.ink};white-space:nowrap">${esc(x.value)}</td>
    </tr>`).join("")}
    <tr>
      <td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};padding:14px 0 14px 18px;border-top:1px solid ${BRAND.goldLine};border-radius:0 0 0 14px;font-family:${FONT};font-size:14px;font-weight:800;color:${BRAND.ink}">${esc(o.totalLabel || "Total")}</td>
      <td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};border-top:1px solid ${BRAND.goldLine}"></td>
      <td bgcolor="${BRAND.goldTint}" align="right" style="background:${BRAND.goldTint};padding:14px 18px 14px 0;border-top:1px solid ${BRAND.goldLine};border-radius:0 0 14px 0;font-family:${FONT};font-size:18px;font-weight:800;color:${BRAND.ink};white-space:nowrap">${esc(inr(o.total))}</td>
    </tr>
  </table>`;
}

/** Someone's own words (an enquiry, a review, a note from the admin). Text, newlines kept. */
export function quoteBlock(text: string, attribution?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr>
    <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${BRAND.line};border-radius:14px;padding:18px 20px 16px">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:26px;color:${BRAND.gold};height:24px">&ldquo;</div>
      <div style="font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.ink};padding-top:4px;word-break:break-word">${esc(text).replace(/\r?\n/g, "<br>")}</div>
      ${attribution ? `<div style="font-family:${FONT};font-size:12.5px;font-weight:700;color:${BRAND.sub};padding-top:10px">&mdash; ${esc(attribution)}</div>` : ""}
    </td>
  </tr></table>`;
}

/** Highlight panel for a link (their card), so it feels like the hero object. */
export function linkPanel(label: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0">
    <tr><td align="center" bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:14px;padding:22px 24px">
      <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.gold};text-transform:uppercase;letter-spacing:1.1px;margin-bottom:8px">${esc(label)}</div>
      <a href="${esc(url)}" target="_blank" style="font-family:${FONT};font-size:17px;font-weight:700;color:#FFFFFF;text-decoration:none;word-break:break-all">${esc(url.replace(/^https?:\/\//, ""))}</a>
    </td></tr>
  </table>`;
}

/** A scannable QR image of `url` — the same generator the NFC order page uses
    for its print preview, so the team and the customer see the same code. */
export const qrImage = (url: string, size = 160) =>
  `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&amp;margin=4&amp;data=${encodeURIComponent(url)}" width="${size}" height="${size}" alt="QR code for ${esc(url.replace(/^https?:\/\//, ""))}" style="display:block;width:${size}px;height:${size}px;border:0">`;

/** Their actual card, as a tappable picture (the per-card Open Graph image, with
    its QR code). Remote images can be blocked, so pair it with the link somewhere. */
export function cardPreview(slug: string, alt: string): string {
  const url = `${SITE}/${encodeURIComponent(slug)}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px">
    <tr><td align="center">
      <a href="${esc(url)}" target="_blank" style="text-decoration:none;display:block">
        <img src="${SITE}/og/${encodeURIComponent(slug)}.png" width="536" alt="${esc(alt)}"
             style="display:block;width:100%;max-width:536px;height:auto;border:1px solid ${BRAND.line};border-radius:14px;background:${BRAND.soft}">
      </a>
      <div style="font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.sub};padding:10px 0 0">
        Tap the card to open it &nbsp;&middot;&nbsp; the QR code works from a printed copy too
      </div>
    </td></tr>
  </table>`;
}

/** "Need a hand?" strip for customer emails — a real person, one tap away. */
export function helpStrip(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 6px"><tr>
    <td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:14px;padding:14px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="font-family:${FONT};font-size:13.5px;line-height:1.5;color:${BRAND.body}"><strong style="color:${BRAND.ink}">Need a hand?</strong> Reply to this email or message us — a real person answers.</td>
        <td valign="middle" align="right" style="padding-left:12px;white-space:nowrap">
          <a href="https://wa.me/${SUPPORT_WHATSAPP.wa}" target="_blank" style="display:inline-block;padding:9px 14px;border-radius:999px;background:#25D366;border:1px solid #1FAF55;font-family:${FONT};font-size:12.5px;font-weight:700;color:#FFFFFF;text-decoration:none;white-space:nowrap">WhatsApp us</a>
        </td>
      </tr></table>
    </td>
  </tr></table>`;
}

/** Sign-off line. */
export const signoff = (from = "Team DigitalCarda") =>
  `<p style="margin:22px 0 0;font-family:${FONT};font-size:14.5px;color:${BRAND.body}">Warm regards,<br><strong style="color:${BRAND.ink}">${esc(from)}</strong></p>`;

/* ── The shell ───────────────────────────────────────────────────────────── */

export type Audience = "customer" | "admin" | "visitor" | "prospect";

const FOOTERS: Record<Audience, string> = {
  customer: "You're receiving this because you have a DigitalCarda account.",
  admin: "You're receiving this because you run DigitalCarda. Owner alerts go to the admin address in Settings.",
  visitor: "You're receiving this because you contacted a business through its DigitalCarda card.",
  prospect: "You received this because we believe DigitalCarda can help your business. Not interested? Just reply “unsubscribe”.",
};

/** Wrap a body in the branded shell.
    - `hero`: rows from heroBand / heroLight / heroPerson. If omitted, a light hero
      is built from `badge` + `heading` (kept for older templates).
    - `accent`: the 3px strip under the logo (status colour).
    - `audience`: picks the footer line; `footer` overrides it. */
export function layout(opts: {
  preheader: string;
  hero?: string;
  badge?: string; heading?: string;
  bodyHtml: string;
  accent?: string;
  audience?: Audience;
  footer?: string;
}): string {
  const accent = opts.accent || BRAND.gold;
  const audience = opts.audience || "customer";
  const footerLine = opts.footer ?? FOOTERS[audience];
  const hero = opts.hero ?? heroLight({ badge: opts.badge, title: opts.heading || "DigitalCarda" });
  const links = audience === "admin"
    ? [["Admin", `${SITE}/admin`], ["Email log", `${SITE}/admin/email-log`]]
    : [["Dashboard", `${SITE}/dashboard`], ["Help", `${SITE}/contact`]];
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>DigitalCarda</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.page}">${esc(opts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.page}" style="background:${BRAND.page};padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.line}">

        <!-- header -->
        <tr><td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};padding:24px 32px 22px">
          <table role="presentation" width="100%"><tr>
            <td valign="middle">
              <a href="${SITE}" target="_blank" style="text-decoration:none"><img src="${SITE}/logo.png" width="146" height="46" alt="DigitalCarda"
                   style="display:block;border:0;outline:none;text-decoration:none;height:46px;width:146px;font-family:${FONT};font-size:19px;font-weight:700;color:#FFFFFF"></a>
            </td>
            <td align="right" valign="middle" style="font-family:${FONT};font-size:10.5px;font-weight:600;color:#8FA2BC;text-transform:uppercase;letter-spacing:1.2px">${audience === "admin" ? "Owner alert" : "Digital Business Cards"}</td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="${accent}" style="height:3px;background:${accent};line-height:3px;font-size:0">&nbsp;</td></tr>

        <!-- hero -->
        ${hero}

        <!-- body -->
        <tr><td style="padding:30px 32px 10px">
          <div style="font-family:${FONT};font-size:15px;line-height:1.7;color:${BRAND.body}">${opts.bodyHtml}</div>
        </td></tr>

        <!-- footer -->
        <tr><td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};padding:24px 32px 26px;border-top:1px solid ${BRAND.line}">
          <table role="presentation" width="100%"><tr>
            <td style="font-family:${FONT};font-size:13px;font-weight:700;color:${BRAND.ink}">
              <a href="${SITE}" style="color:${BRAND.ink};text-decoration:none">digitalcarda.in</a>
            </td>
            <td align="right" style="font-family:${FONT};font-size:12px">
              ${links.map(([l, h]) => `<a href="${h}" style="color:${BRAND.goldDark};text-decoration:none;font-weight:600">${l}</a>`).join(`<span style="color:#C7D0DC">&nbsp;·&nbsp;</span>`)}
            </td>
          </tr></table>
          <div style="height:1px;background:${BRAND.line};margin:16px 0 14px;font-size:0;line-height:0">&nbsp;</div>
          <div style="font-family:${FONT};font-size:11.5px;line-height:1.65;color:${BRAND.sub}">
            ${audience === "admin" ? "" : `Your all-in-one digital business card — share it with a link, a QR code or a tap.<br>`}
            ${footerLine}
          </div>
        </td></tr>
      </table>
      <div style="font-family:${FONT};font-size:11px;color:#9FAEC1;padding:18px 0 0">© DigitalCarda · Made by Pacewalk</div>
    </td></tr>
  </table>
</body></html>`;
}
