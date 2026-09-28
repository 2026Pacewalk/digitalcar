/*
 * Email the team writes by hand: Admin → Customers → ⋮ → Send email → Custom
 * message. The admin's own words, sent in the DigitalCarda design.
 *
 * The message is plain text — never HTML or markdown — so nothing the admin
 * types can change the email's markup. It is escaped; a blank line starts a
 * new paragraph and a single line break is kept. A bare http(s) address
 * becomes a link only when safeUrl() accepts it, and the link always shows the
 * full address, so a link can't hide where it goes. Only the first
 * MANUAL_EMAIL_LIMITS.linksMax addresses become links; the rest stay as text.
 */
import { MANUAL_EMAIL_LIMITS } from "@contracts/customer-email";
import {
  layout, heroLight, helpStrip, signoff, hi, p, esc, safeUrl, firstName,
  BRAND, SUPPORT_WHATSAPP, type Email,
} from "./kit";

/* ── Cleaning what the admin typed ───────────────────────────────────────── */

// Characters that draw nothing but can reorder or hide text (bidi overrides,
// zero-width space, BOM). Zero-width joiners stay: Indian scripts need them.
const INVISIBLE = /[\u{200B}\u{2060}\u{FEFF}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;

/** One line, no control characters — a subject is a mail header, where a
    line break would start a new header. */
export const oneLine = (s: unknown) =>
  String(s ?? "").replace(INVISIBLE, "").replace(/[\p{Cc}\u{2028}\u{2029}]+/gu, " ").replace(/\s+/g, " ").trim();

/** The message with Windows/Mac line breaks made "\n", control characters and
    trailing spaces dropped, and runs of blank lines cut to one. */
export function normalizeMessage(s: unknown): string {
  return String(s ?? "")
    .replace(/\r\n?|[\u{2028}\u{2029}]/gu, "\n")
    .replace(/\t/g, " ")
    .replace(/(?!\n)\p{Cc}/gu, "")
    .replace(INVISIBLE, "")
    .split("\n").map((l) => l.replace(/\s+$/, "")).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const clip = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

/* ── Links ───────────────────────────────────────────────────────────────── */

// Curly quotes and guillemets (what phones type for " and ') end an address too.
const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"'`“”‘’«»\u{200C}\u{200D}]+/giu;
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
// Closing quotes and brackets, and sentence punctuation in any script: … । ॥ 。 ，
const TRAILING = /[\p{Pf}\p{Pe}\p{Po}]$/u;

/** Punctuation that ends a sentence isn't part of the address before it:
    "see https://digitalcarda.in." or "(https://digitalcarda.in/pricing)", and
    "https://digitalcarda.in/pricing।" or "…/pricing…". A closing bracket stays
    when the address opened one itself: https://example.com/a_(b). */
function trimUrl(u: string): string {
  let url = u;
  for (;;) {
    const last = [...url].pop() ?? "";
    const open = CLOSERS[last];
    if (open) {
      if (url.split(open).length < url.split(last).length) url = url.slice(0, -1);
      else return url;
    } else if (TRAILING.test(last) && !/[/#%&@]/.test(last)) url = url.slice(0, -last.length);
    else return url;
  }
}

/** An address fit to be a link: http(s), a real host name, and no
    "name@" part (https://digitalcarda.in@example.com goes to example.com). */
function linkable(url: string): string | null {
  const safe = safeUrl(url);
  if (!safe) return null;
  try {
    const u = new URL(safe);
    if (u.username || u.password || !u.hostname.includes(".")) return null;
    return safe;
  } catch { return null; }
}

export type MessagePiece = { text: string } | { url: string };

/** The message as text and link pieces. `links` are the addresses made
    clickable, in order; `extra` counts usable ones left as text past the cap. */
export function linkPieces(message: string, max: number = MANUAL_EMAIL_LIMITS.linksMax): { pieces: MessagePiece[]; links: string[]; extra: number } {
  const pieces: MessagePiece[] = [];
  const links: string[] = [];
  let extra = 0;
  let at = 0;
  for (const m of message.matchAll(URL_IN_TEXT)) {
    const url = trimUrl(m[0]);
    const ok = linkable(url);
    if (!ok) continue;
    if (links.length >= max) { extra++; continue; }
    const start = m.index ?? 0;
    if (start > at) pieces.push({ text: message.slice(at, start) });
    pieces.push({ url: ok });
    links.push(ok);
    at = start + url.length;
  }
  if (at < message.length) pieces.push({ text: message.slice(at) });
  return { pieces, links, extra };
}

/** Paragraphs of escaped text, with the links drawn in full. */
function messageHtml(message: string): string {
  const flat = linkPieces(message).pieces.map((x) => "url" in x
    ? `<a href="${esc(x.url)}" target="_blank" style="color:${BRAND.goldDark};text-decoration:underline;word-break:break-all">${esc(x.url)}</a>`
    : esc(x.text)).join("");
  return flat.split(/\n\n+/).map((par) => par.trim()).filter(Boolean)
    .map((par) => p(par.replace(/\n/g, "<br>"))).join("");
}

/* ── The email ───────────────────────────────────────────────────────────── */

const TEXT_HELP = `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa}) — a real person answers.`;
const PROMO_FOOTER = "You're receiving this because you have a DigitalCarda account. Don't want tips and news? Switch them off in your dashboard under Notifications.";

/**
 * A message from the team, in the admin's own words.
 * Audience: customer. Trigger: customerEmail.send (Admin → Customers → Send
 * email → Custom message), one customer at a time.
 * - name: the customer's full name (the greeting uses the first name).
 * - subject: one line; also the heading.
 * - message: plain text, as typed (see the header comment for what it becomes).
 * - promotional: news or an offer rather than a service message. It honours
 *   the customer's "tips & news" switch (the caller checks), and the footer
 *   says where to switch it off.
 */
const GREETING = /^(hi|hii|hello|hey|dear|namaste|namaskar|greetings|good\s+(morning|afternoon|evening))\b/i;

export function teamMessageEmail(o: { name?: string | null; subject: string; message: string; promotional?: boolean }): Email {
  const subject = clip(oneLine(o.subject), MANUAL_EMAIL_LIMITS.subjectMax) || "A message from DigitalCarda";
  const message = normalizeMessage(o.message);
  const promo = !!o.promotional;
  // Admins often open with their own "Hi Priya," — then the email doesn't
  // greet twice, and the inbox preview starts at the first real sentence.
  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);
  const greets = GREETING.test(lines[0] || "");
  const firstLine = oneLine((greets ? lines[1] : lines[0]) || "");

  const hero = heroLight({ badge: promo ? "News from DigitalCarda" : "From the DigitalCarda team", title: subject });
  const bodyHtml =
    (greets ? "" : hi(o.name)) +
    `<div style="word-break:break-word;overflow-wrap:anywhere">${messageHtml(message)}</div>` +
    signoff() +
    helpStrip();

  const text = [
    ...(greets ? [] : [`Hi ${firstName(o.name) || "there"},`, ""]),
    message, "",
    "Warm regards,", "Team DigitalCarda", "",
    TEXT_HELP,
    ...(promo ? ["", PROMO_FOOTER] : []),
  ].join("\n");

  return {
    kind: "teamMessageEmail",
    subject,
    html: layout({
      preheader: clip(firstLine || subject, 140),
      hero, bodyHtml, audience: "customer",
      footer: promo ? esc(PROMO_FOOTER) : undefined,
    }),
    text,
  };
}
