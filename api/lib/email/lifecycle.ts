/*
 * Trial & card lifecycle emails: the 30-day trial journey (day 1 → ended),
 * the "almost published" nudge, the go-live moment, the monthly report, the
 * dormant-card nudge and the "your card link changed" notice.
 *
 * Rules these follow (see kit.ts for the blocks):
 *  - Numbers are only ever real card_events counts passed in by the caller.
 *    Nothing is estimated, rounded up or invented.
 *  - A discount is mentioned only when the caller passes an `offer`.
 *  - Every user/database value is escaped (esc / the kit's escaping helpers).
 *  - Every email has a complete plain-text twin with the same facts and links.
 */

import {
  type Email, type Tone,
  layout, heroBand,
  sectionLabel, button, actionPills, statTiles, callout, note, tickList, iconGrid,
  progressSteps, progressBar, quoteBlock, cardPreview, qrImage, helpStrip, signoff, pill, darkChip,
  codeValue, inkLink, goldLink,
  esc, safeUrl, firstName, dayIst, dateIst,
  p, hi, strong, small,
  BRAND, ON_DARK, SITE, SUPPORT_WHATSAPP, FONT,
} from "./kit";

/* ── Shared types ────────────────────────────────────────────────────────── */

/** Real engagement counts for one card, from card_events (see metricsFor in
    api/cron/lifecycle.ts). views = "view", saves = "save_contact",
    whatsapp = "whatsapp", calls = "call", leads = "enquiry". */
export interface TrialMetrics { views: number; saves: number; whatsapp: number; calls: number; leads: number; }

/** A discount that is REALLY available to this user right now. Pass it only
    when it is true (a coupon created for them, or the server-side upgrade offer
    `upgrade_offer_percent` > 0, which the plans page applies). Omit it and the
    email says nothing about discounts. */
export type TrialOffer = {
  /** Whole percent off, 1–100. Anything else hides the offer. */
  percent: number;
  /** Coupon code; the button then opens /dashboard/subscription?coupon=CODE. */
  code?: string | null;
  /** When the offer stops working. */
  endsAt?: Date | string | null;
};

type DateLike = Date | string | number | null | undefined;

/* ── Local helpers ───────────────────────────────────────────────────────── */

const PLANS = `${SITE}/dashboard/subscription`;
const BUILD = `${SITE}/dashboard/build`;
const QR_PAGE = `${SITE}/dashboard/qr`;
const DEFAULT_TRIAL_DAYS = 30; // api/trial-router.ts DEFAULT_DAYS

const toDate = (d: DateLike): Date | null => {
  if (d === null || d === undefined || d === "") return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isFinite(x.getTime()) ? x : null;
};
/** A count: finite, whole, never negative. */
const count = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0; };
const fmt = (v: unknown) => count(v).toLocaleString("en-IN");
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const hostOf = (url: string) => url.replace(/^https?:\/\//, "");
const cardUrlOf = (slug: string) => `${SITE}/${encodeURIComponent(slug)}`;
const qrUrlOf = (publicId: string) => `${SITE}/q/${encodeURIComponent(publicId)}`;
/** WhatsApp's own share sheet (no number): the owner picks who to send it to. */
const waShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
const shareMessage = (url: string) => `Here's my digital business card — save my number, see my work and message me in one tap: ${url}`;

const RESERVED = new Set(["dashboard", "admin", "login", "signup", "q", "og", "api", "contact", "pricing"]);
const CARD_URL = new RegExp(`^${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([A-Za-z0-9_-]+)/?$`, "i");
/** The slug inside "https://digitalcarda.in/<slug>", or null for dashboard links. */
function slugFromCardUrl(u?: string | null): string | null {
  const s = safeUrl(u);
  const m = s ? s.match(CARD_URL) : null;
  return m && !RESERVED.has(m[1].toLowerCase()) ? m[1] : null;
}
/** The card this email is about: an explicit slug wins, else one parsed from cardUrl. */
function cardOf(o: { slug?: string | null; cardUrl?: string | null }): { slug: string; url: string } | null {
  const slug = (o.slug && /^[A-Za-z0-9_-]+$/.test(o.slug) ? o.slug : null) || slugFromCardUrl(o.cardUrl);
  return slug ? { slug, url: cardUrlOf(slug) } : null;
}

/** A glyph for iconGrid tiles — typographic, not emoji, in brand gold. */
const glyph = (code: string) =>
  `<span style="font-family:${FONT};font-size:17px;font-weight:800;color:${BRAND.goldDark};line-height:36px">${code}</span>`;

/** statTiles, with the row gap tightened when it continues a previous row. */
const tileRow = (tiles: { label: string; value: string; sub?: string }[], continued = false) => {
  const html = statTiles(tiles);
  return continued ? html.replace("margin:22px 0 4px", "margin:8px 0 4px") : html;
};

const anyMetrics = (m: TrialMetrics) => count(m.views) + count(m.saves) + count(m.leads) + count(m.whatsapp) + count(m.calls) > 0;

/** The five real counts, as two rows of tiles. */
function metricsTiles(m: TrialMetrics): string {
  return tileRow([
    { label: "Card views", value: esc(fmt(m.views)) },
    { label: "Contacts saved", value: esc(fmt(m.saves)) },
    { label: "Enquiries", value: esc(fmt(m.leads)) },
  ]) + tileRow([
    { label: "WhatsApp taps", value: esc(fmt(m.whatsapp)) },
    { label: "Phone calls", value: esc(fmt(m.calls)) },
  ], true);
}
const metricsText = (m: TrialMetrics) => [
  `- Card views: ${fmt(m.views)}`,
  `- Contacts saved: ${fmt(m.saves)}`,
  `- Enquiries: ${fmt(m.leads)}`,
  `- WhatsApp taps: ${fmt(m.whatsapp)}`,
  `- Phone calls: ${fmt(m.calls)}`,
];

/** Where the trial stands. `daysLeft` from the caller; total defaults to 30. */
function trialState(o: { daysLeft: number; trialDays?: number | null; endsAt?: DateLike }) {
  const total = count(o.trialDays) || DEFAULT_TRIAL_DAYS;
  const left = Math.max(0, Math.min(total, Math.floor(Number(o.daysLeft) || 0)));
  const day = Math.max(1, total - left);
  const ends = toDate(o.endsAt);
  const caption = `${left === 0 ? "Ends today" : `${plural(left, "day")} left`}${ends ? ` · ends ${dayIst(ends)}` : ""}`;
  return { total, left, day, ends, caption };
}
function trialBar(o: { daysLeft: number; trialDays?: number | null; endsAt?: DateLike }, tone: Tone = "gold"): string {
  const t = trialState(o);
  return progressBar({ pct: (t.day / t.total) * 100, label: "Your free trial", value: `Day ${t.day} of ${t.total}`, tone, caption: t.caption });
}
const trialText = (o: { daysLeft: number; trialDays?: number | null; endsAt?: DateLike }) => {
  const t = trialState(o);
  return `Your free trial: day ${t.day} of ${t.total} (${t.caption.toLowerCase()})`;
};

function liveOffer(o?: TrialOffer | null) {
  const pct = Math.floor(Number(o?.percent));
  if (!o || !Number.isFinite(pct) || pct < 1 || pct > 100) return null;
  const code = String(o.code || "").trim() || null;
  return { pct, code, ends: toDate(o.endsAt), url: code ? `${PLANS}?coupon=${encodeURIComponent(code)}` : PLANS };
}
type LiveOffer = NonNullable<ReturnType<typeof liveOffer>>;
function offerCallout(x: LiveOffer): string {
  return callout("gold", `${x.pct}% off when you choose a plan now`,
    (x.code ? `Use code ${codeValue(x.code)} at checkout` : "The discount is applied on your plans page") +
    (x.ends ? `, until ${esc(dayIst(x.ends))}.` : "."));
}
const offerText = (x: LiveOffer) =>
  `${x.pct}% off when you choose a plan now${x.code ? ` — use code ${x.code} at checkout` : ""}${x.ends ? `, until ${dayIst(x.ends)}` : ""}.`;

/** Four places a card gets shared — alternatives, not steps. */
function shareGrid(): string {
  return iconGrid([
    { icon: glyph("&#10077;"), title: "WhatsApp", body: `Put your link in your WhatsApp Business greeting and away messages. ${goldLink(`${SITE}/dashboard/whatsapp`, "Write my message →")}` },
    { icon: glyph("@"), title: "Email signature", body: `One line under your name turns every email into a way to reach you. ${goldLink(`${SITE}/dashboard/signature`, "Make my signature →")}` },
    { icon: glyph("#"), title: "Instagram bio", body: `A bio that says what you do and sends people to your card. ${goldLink(`${SITE}/dashboard/instagram`, "Write my bio →")}` },
    { icon: glyph("&#9638;"), title: "Printed QR", body: `A print-ready QR standee for your desk, counter or packaging. ${goldLink(QR_PAGE, "Get my QR →")}` },
  ]);
}
const SHARE_TEXT = [
  `- WhatsApp: put your link in your greeting and away messages — ${SITE}/dashboard/whatsapp`,
  `- Email signature: one line under your name — ${SITE}/dashboard/signature`,
  `- Instagram bio: a bio that sends people to your card — ${SITE}/dashboard/instagram`,
  `- Printed QR: a standee for your desk, counter or packaging — ${QR_PAGE}`,
];

/** Their link and QR on navy, stacked and centred so it holds up on a phone. */
function linkQrPanel(o: { url: string; qrTarget: string; permanent: boolean }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px">
    <tr><td align="center" bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:16px;padding:22px 22px 20px">
      <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.gold};text-transform:uppercase;letter-spacing:1.1px">Your card link</div>
      <a href="${esc(o.url)}" target="_blank" style="display:inline-block;padding-top:6px;font-family:${FONT};font-size:18px;font-weight:800;color:#FFFFFF;text-decoration:none;word-break:break-all">${esc(hostOf(o.url))}</a>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px auto 0"><tr>
        <td align="center" bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:14px;padding:10px">${qrImage(o.qrTarget, 140)}</td>
      </tr></table>
      <div style="font-family:${FONT};font-size:12.5px;line-height:1.55;color:${ON_DARK.sub};padding-top:12px;max-width:400px">${o.permanent
        ? "This QR opens your card through a permanent link, so it keeps working even if your card&#39;s address ever changes."
        : "Every scan of this QR opens your card."} Print it on visiting cards, your counter or packaging.</div>
    </td></tr>
  </table>`;
}

/** Old address struck out, new one live — the whole story of a link change. */
function linkSwap(oldUrl: string, newUrl: string): string {
  const row = (tag: string, link: string, last: boolean) => `<tr>
      <td valign="top" style="padding:14px 18px;${last ? "" : `border-bottom:1px solid ${BRAND.line};`}font-family:${FONT};word-break:break-all">
        ${tag}<div style="padding-top:8px">${link}</div>
      </td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 14px;border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">
    ${row(pill("No longer works", "red"), `<span style="font-size:14px;font-weight:600;color:${BRAND.sub};text-decoration:line-through">${esc(hostOf(oldUrl))}</span>`, false)}
    ${row(pill("Live now", "green"), `<a href="${esc(newUrl)}" target="_blank" style="font-size:16px;font-weight:800;color:${BRAND.ink};text-decoration:none;border-bottom:2px solid ${BRAND.gold}">${esc(hostOf(newUrl))}</a>`, true)}
  </table>`;
}

/** Footer line for recurring emails, with an opt-out link when one exists. */
function recurringFooter(what: string, unsubscribeUrl?: string | null): string | undefined {
  const u = safeUrl(unsubscribeUrl);
  return u
    ? `You're receiving this ${esc(what)} because you have a DigitalCarda account. <a href="${esc(u)}" target="_blank" style="color:${BRAND.sub};text-decoration:underline">Stop these emails</a>`
    : undefined;
}

const greet = (name?: string | null) => `Hi ${firstName(name) || "there"},`;
const HELP_TEXT = `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display}: https://wa.me/${SUPPORT_WHATSAPP.wa}`;
const SIGN_TEXT = "Warm regards,\nTeam DigitalCarda";
/** Join text lines; false/null/undefined drop out, runs of blank lines collapse. */
const lines = (xs: (string | false | null | undefined)[]) =>
  xs.filter((x): x is string => typeof x === "string").join("\n").replace(/\n{3,}/g, "\n\n").trim();
const ending = () => signoff() + helpStrip();

/* ═══ Trial journey ══════════════════════════════════════════════════════ */

/**
 * Day 1 of the free trial: the card is live, go and share it.
 * Audience: customer. Trigger: runLifecycle (api/cron/lifecycle.ts), milestone ls_d1.
 * - cardUrl: the public card link (or a dashboard link when there is no card yet).
 * - slug: the card's slug; when omitted it is read from cardUrl.
 * - daysLeft / trialDays / endsAt: optional; when daysLeft is given a trial bar shows.
 */
export function trialDay1Email(o: {
  name?: string | null; cardUrl?: string;
  slug?: string | null; daysLeft?: number; trialDays?: number; endsAt?: Date | string | null;
}): Email {
  const card = cardOf(o);
  const hasTrial = typeof o.daysLeft === "number";
  const t = hasTrial ? trialState({ daysLeft: o.daysLeft!, trialDays: o.trialDays, endsAt: o.endsAt }) : null;
  const chips = [
    card ? darkChip(esc(hostOf(card.url)), BRAND.gold) : "",
    t?.ends ? darkChip(`Free trial until ${esc(dayIst(t.ends))}`) : "",
  ].filter(Boolean);
  const hero = heroBand({
    tone: "green", eyebrow: "Day 1 · Your card is live",
    title: "Your card is live. Now put it in front of people.",
    sub: "Every view, contact save and WhatsApp tap starts with one share.",
    chips,
  });
  const bodyHtml =
    hi(o.name) +
    p("Your DigitalCarda is published and working. The quickest way to your first enquiry is to share it today, in the places your customers already look.") +
    (card ? cardPreview(card.slug, `Your digital card at ${hostOf(card.url)}`) : "") +
    actionPills([
      { label: "Share on WhatsApp", href: card ? waShare(shareMessage(card.url)) : null, tone: "whatsapp" },
      { label: "Get my QR code", href: QR_PAGE, tone: "gold" },
      { label: "Open my card", href: card?.url, tone: "light" },
      { label: "Open my dashboard", href: card ? null : `${SITE}/dashboard`, tone: "light" },
    ]) +
    sectionLabel("Four places to share it today") +
    shareGrid() +
    (hasTrial ? trialBar({ daysLeft: o.daysLeft!, trialDays: o.trialDays, endsAt: o.endsAt }, "green") : "") +
    note("You can keep editing after you share. Every change you publish shows up on the same link.") +
    ending();
  return {
    kind: "trialDay1Email",
    subject: "Your DigitalCarda is live — start sharing 🎉",
    html: layout({ preheader: "Four easy places to share your new card today, plus a one-tap WhatsApp share.", hero, bodyHtml, accent: "#16A34A" }),
    text: lines([
      greet(o.name), "",
      card ? `Your DigitalCarda is live: ${card.url}` : "Your DigitalCarda is live.",
      "The quickest way to your first enquiry is to share it today.", "",
      card ? `Share it on WhatsApp: ${waShare(shareMessage(card.url))}` : `Your dashboard: ${SITE}/dashboard`,
      `Get your QR code: ${QR_PAGE}`, "",
      "Four places to share it today:", ...SHARE_TEXT, "",
      hasTrial ? trialText({ daysLeft: o.daysLeft!, trialDays: o.trialDays, endsAt: o.endsAt }) : null,
      "You can keep editing after you share. Every change you publish shows up on the same link.", "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * Day 7: fill the card out so visitors find what they came for.
 * Audience: customer. Trigger: runLifecycle, milestone ls_d7.
 * - cardUrl / slug: the public card (optional).
 * - daysLeft / trialDays / endsAt: optional; shown as the days left and a trial bar.
 */
export function trialDay7Email(o: {
  name?: string | null; cardUrl?: string;
  slug?: string | null; daysLeft?: number; trialDays?: number; endsAt?: Date | string | null;
}): Email {
  const card = cardOf(o);
  const hasTrial = typeof o.daysLeft === "number";
  const t = hasTrial ? trialState({ daysLeft: o.daysLeft!, trialDays: o.trialDays, endsAt: o.endsAt }) : null;
  const hero = heroBand({
    tone: "blue", eyebrow: "One week in",
    title: "Make your card work harder this week",
    sub: "Four small additions that give the people who open it more to act on.",
    aside: t ? { label: "Trial days left", value: String(t.left) } : undefined,
    chips: card ? [darkChip(esc(hostOf(card.url)), BRAND.gold)] : undefined,
  });
  const bodyHtml =
    hi(o.name) +
    p("You've had your card for a week. Now is a good time to fill it out, so the people who open it find what they came for, and have a reason to call, save your number or send an enquiry.") +
    sectionLabel("Four quick improvements") +
    iconGrid([
      { icon: glyph("&#9776;"), title: "Products &amp; services", body: `List what you sell or offer. Visitors can enquire about a specific item. ${goldLink(`${SITE}/dashboard/products`, "Add products →")}` },
      { icon: glyph("&#9635;"), title: "Photos &amp; videos", body: `Your work, your shop, your team — pictures make the card feel real. ${goldLink(`${SITE}/dashboard/media`, "Add to gallery →")}` },
      { icon: glyph("&#9638;"), title: "Your QR on paper", body: `Put it on visiting cards, your counter and packaging. ${goldLink(QR_PAGE, "Get my QR →")}` },
      { icon: glyph("&#10138;"), title: "See what works", body: `Which buttons people tap, and where they come from. ${goldLink(`${SITE}/dashboard/analytics`, "Open analytics →")}` },
    ]) +
    button("Improve my card", BUILD) +
    note(`Changes appear on your live card as soon as you publish, and the link stays the same${card ? `: ${inkLink(card.url, hostOf(card.url))}` : ""}.`) +
    (hasTrial ? trialBar({ daysLeft: o.daysLeft!, trialDays: o.trialDays, endsAt: o.endsAt }, "blue") : "") +
    ending();
  return {
    kind: "trialDay7Email",
    subject: "Get more from your DigitalCarda 💡",
    html: layout({ preheader: "Add products, photos and your QR so the people who open your card find what they need.", hero, bodyHtml, accent: "#2563EB" }),
    text: lines([
      greet(o.name), "",
      "One week in. Now is a good time to fill out your card, so the people who open it find what they came for.", "",
      "Four quick improvements:",
      `- Products & services: list what you sell or offer — ${SITE}/dashboard/products`,
      `- Photos & videos: your work, shop or team — ${SITE}/dashboard/media`,
      `- Your QR on paper: visiting cards, counter, packaging — ${QR_PAGE}`,
      `- See what works: which buttons people tap — ${SITE}/dashboard/analytics`, "",
      `Improve my card: ${BUILD}`,
      card ? `Your link stays the same: ${card.url}` : null, "",
      hasTrial ? trialText({ daysLeft: o.daysLeft!, trialDays: o.trialDays, endsAt: o.endsAt }) : null, "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * Day 15: halfway through the trial, with the card's real numbers so far.
 * Audience: customer. Trigger: runLifecycle, milestone ls_d15.
 * - daysLeft: whole days until the trial ends (0 or more).
 * - metrics: real card_events counts (all zero when there is no card).
 * - trialDays / endsAt / cardUrl / slug: optional extras for the trial bar and share buttons.
 */
export function trialDay15Email(o: {
  name?: string | null; daysLeft: number; metrics: TrialMetrics;
  trialDays?: number; endsAt?: Date | string | null; cardUrl?: string; slug?: string | null;
}): Email {
  const m = o.metrics;
  const any = anyMetrics(m);
  const t = trialState(o);
  const card = cardOf(o);
  const hero = heroBand({
    tone: "gold", eyebrow: "Halfway through your free trial",
    title: any ? "Here's what your card has done so far" : "You're halfway through your free trial",
    sub: any ? `${plural(t.left, "day")} of your trial left.` : "Share it this week so people start finding it.",
    aside: { label: "Days left", value: String(t.left) },
  });
  const bodyHtml =
    hi(o.name) +
    (any
      ? p("Every number below is a real visit or tap on your card — nothing is estimated.") + metricsTiles(m)
      : callout("blue", "No visits yet — that's normal before you share",
          "Your card only gets visits when people have the link. Send it to a few customers on WhatsApp today, and every open will show up in your analytics.",
          actionPills([
            { label: "Share on WhatsApp", href: card ? waShare(shareMessage(card.url)) : `${SITE}/dashboard/whatsapp`, tone: "whatsapp" },
            { label: "Get my QR code", href: QR_PAGE, tone: "light" },
          ]))) +
    trialBar(o) +
    callout("gold", "Keep your card going after the trial",
      "Choose a plan any time before your trial ends. Your link, your QR code and everything you've added stay exactly as they are.") +
    button("Keep my card active", PLANS) +
    ending();
  return {
    kind: "trialDay15Email",
    subject: `Halfway through your trial — ${plural(t.left, "day")} left`,
    html: layout({
      preheader: any
        ? `So far: ${fmt(m.views)} views, ${fmt(m.saves)} contacts saved and ${fmt(m.leads)} enquiries — all real.`
        : "Your card only gets visits when people have the link. Here's the quickest way to share it.",
      hero, bodyHtml,
    }),
    text: lines([
      greet(o.name), "",
      `You're halfway through your free trial — ${plural(t.left, "day")} left.`, "",
      any ? "What your card has done so far (real visits and taps, nothing estimated):" : "No visits yet — that's normal before you share. Send your link to a few customers on WhatsApp today.",
      ...(any ? metricsText(m) : [card ? `Share on WhatsApp: ${waShare(shareMessage(card.url))}` : `WhatsApp message: ${SITE}/dashboard/whatsapp`, `Get your QR code: ${QR_PAGE}`]), "",
      trialText(o), "",
      "Choose a plan any time before your trial ends. Your link, QR code and everything you've added stay exactly as they are.",
      `Keep my card active: ${PLANS}`, "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * Day 21: the card's results after three weeks.
 * Audience: customer. Trigger: runLifecycle, milestone ls_d21.
 * - daysLeft / metrics: as trialDay15Email. With all-zero metrics the email
 *   (and its subject) switches to a "get it seen" version instead of claiming results.
 * - trialDays / endsAt / cardUrl / slug: optional.
 */
export function trialDay21Email(o: {
  name?: string | null; daysLeft: number; metrics: TrialMetrics;
  trialDays?: number; endsAt?: Date | string | null; cardUrl?: string; slug?: string | null;
}): Email {
  const m = o.metrics;
  const any = anyMetrics(m);
  const t = trialState(o);
  const card = cardOf(o);
  const wins = [
    count(m.saves) ? plural(count(m.saves), "contact save") : "",
    count(m.leads) ? plural(count(m.leads), "enquiry", "enquiries") : "",
    count(m.whatsapp) ? plural(count(m.whatsapp), "WhatsApp tap") : "",
  ].filter(Boolean);
  const hero = any
    ? heroBand({
        tone: "green", eyebrow: "Three weeks in",
        title: "Your card is working",
        sub: wins.length ? `Including ${wins.join(", ")} — all real, all from your card.` : "People are opening it. Here are the real numbers.",
        aside: { label: "Card views", value: fmt(m.views) },
      })
    : heroBand({
        tone: "amber", eyebrow: "Three weeks in",
        title: `${plural(t.left, "day")} to get your card seen`,
        sub: "No visits yet. A few shares this week will change that.",
        aside: { label: "Days left", value: String(t.left) },
      });
  const bodyHtml =
    hi(o.name) +
    (any
      ? p("Here's what your DigitalCarda has done in three weeks. Every number is a real visit or tap:") +
        metricsTiles(m) +
        (count(m.leads)
          ? callout("green", `${plural(count(m.leads), "enquiry", "enquiries")} from your card`,
              "Each one is someone who asked about your business. If any are still waiting, a reply today goes a long way.",
              actionPills([{ label: "See my enquiries", href: `${SITE}/dashboard/leads`, tone: "dark" }]))
          : "")
      : p("Your card hasn't had visits yet, and that's almost always because the link hasn't reached people. Share it a few times this week, before your trial ends:") +
        actionPills([
          { label: "Share on WhatsApp", href: card ? waShare(shareMessage(card.url)) : `${SITE}/dashboard/whatsapp`, tone: "whatsapp" },
          { label: "Get my QR code", href: QR_PAGE, tone: "gold" },
        ]) +
        sectionLabel("Where to share it") + shareGrid()) +
    trialBar(o, any ? "green" : "amber") +
    callout("gold", any ? "Don't lose this momentum" : "Keep your card after the trial",
      `${plural(t.left, "day")} left on your trial. Choose a plan and your card carries on at the same link, with the same QR code and everything you've added.`) +
    button("Keep my card active", PLANS) +
    ending();
  return {
    kind: "trialDay21Email",
    subject: any ? "Your DigitalCarda is working 📈" : `${plural(t.left, "day")} left to get your card seen`,
    html: layout({
      preheader: any
        ? `${fmt(m.views)} views and ${fmt(m.leads)} enquiries so far, with ${plural(t.left, "day")} of your trial left.`
        : "A few shares this week will get your card its first visits. Here's where to start.",
      hero, bodyHtml, accent: any ? "#16A34A" : "#F59E0B",
    }),
    text: lines([
      greet(o.name), "",
      any ? "Your DigitalCarda is working. Here's what it has done in three weeks (real visits and taps):" : "Your card hasn't had visits yet — share the link a few times this week.",
      ...(any ? metricsText(m) : [card ? `Share on WhatsApp: ${waShare(shareMessage(card.url))}` : `WhatsApp message: ${SITE}/dashboard/whatsapp`, `Get your QR code: ${QR_PAGE}`, "", "Where to share it:", ...SHARE_TEXT]),
      any && count(m.leads) ? `\nSee your enquiries: ${SITE}/dashboard/leads` : null, "",
      trialText(o), "",
      `${plural(t.left, "day")} left on your trial. Choose a plan and your card carries on at the same link, with the same QR code and everything you've added.`,
      `Keep my card active: ${PLANS}`, "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * Day 25: a few days left — choose a plan to stay online.
 * Audience: customer. Trigger: runLifecycle, milestone ls_d25 (unless the
 * ≤2-days trialEndingEmail takes priority).
 * - daysLeft / metrics: as trialDay15Email; metrics are shown only when non-zero.
 * - trialDays / endsAt: optional; endsAt shows the end date in the hero.
 */
export function trialDay25Email(o: {
  name?: string | null; daysLeft: number; metrics: TrialMetrics;
  trialDays?: number; endsAt?: Date | string | null;
}): Email {
  const m = o.metrics;
  const t = trialState(o);
  const hero = heroBand({
    tone: "amber", eyebrow: "Trial reminder",
    title: `${plural(t.left, "day")} left on your free trial`,
    sub: "Choose a plan now and your card stays online without interruption.",
    aside: { label: "Days left", value: String(t.left), sub: t.ends ? `ends ${dayIst(t.ends)}` : undefined },
  });
  const bodyHtml =
    hi(o.name) +
    p(`Only ${strong(plural(t.left, "day"))} left on your free trial. Choose your plan now so your card, and everything you've built on it, stays online without interruption.`) +
    trialBar(o, "amber") +
    callout("amber", "What happens when the trial ends",
      "If no plan is active by then, visitors stop seeing your full card. Nothing is deleted: your link, QR code and content are kept, and your card is back as soon as a plan is active.") +
    button("Choose my plan", PLANS) +
    (anyMetrics(m) ? sectionLabel("What your card has done so far") + metricsTiles(m) : "") +
    ending();
  return {
    kind: "trialDay25Email",
    subject: `Keep your card active — ${plural(t.left, "day")} left`,
    html: layout({ preheader: `Choose a plan before ${t.ends ? dayIst(t.ends) : "your trial ends"} and your card stays online without a break.`, hero, bodyHtml, accent: "#F59E0B" }),
    text: lines([
      greet(o.name), "",
      `Only ${plural(t.left, "day")} left on your free trial${t.ends ? ` (it ends ${dayIst(t.ends)})` : ""}. Choose your plan now so your card stays online without interruption.`, "",
      "If no plan is active when the trial ends, visitors stop seeing your full card. Nothing is deleted: your link, QR code and content are kept, and your card is back as soon as a plan is active.", "",
      `Choose my plan: ${PLANS}`, "",
      anyMetrics(m) ? "What your card has done so far:" : null,
      ...(anyMetrics(m) ? metricsText(m) : []), "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * The trial ends in 0–3 days.
 * Audience: customer. Triggers: runLifecycle (≤2 days, ledger ls_ending) and
 * the legacy runTrialEmails (≤3 days, ledger trial_email_ending).
 * - daysLeft: whole days left (callers pass ≥1; 0 reads "today").
 * - cardUrl / slug: the public card (optional).
 * - endsAt / trialDays: optional, for the end date and trial bar.
 * - graceDays: optional; when the grace setting is on, the days the card stays
 *   up after the trial ends (api/publish-router.ts publicState).
 * - offer: ONLY when a discount is really available (see TrialOffer). Without
 *   it the email mentions no discount.
 */
export function trialEndingEmail(o: {
  name?: string | null; daysLeft: number; cardUrl?: string;
  slug?: string | null; endsAt?: Date | string | null; trialDays?: number;
  graceDays?: number; offer?: TrialOffer | null;
}): Email {
  const t = trialState(o);
  const card = cardOf(o);
  const offer = liveOffer(o.offer);
  const grace = count(o.graceDays);
  const when = t.left === 0 ? "today" : `in ${plural(t.left, "day")}`;
  const after = grace
    ? `After that, there's a ${grace}-day grace period, then visitors stop seeing your full card until a plan is active.`
    : "After that, visitors stop seeing your full card until a plan is active.";
  const chips = [
    t.ends ? darkChip(`Ends ${esc(dayIst(t.ends))}`) : "",
    card ? darkChip(esc(hostOf(card.url))) : "",
    offer ? darkChip(`${offer.pct}% off if you choose now`, BRAND.gold) : "",
  ].filter(Boolean);
  const hero = heroBand({
    tone: t.left <= 1 ? "red" : "amber", eyebrow: "Trial ending",
    title: `Your free trial ends ${when}`,
    sub: "Choose a plan to keep your card live for everyone who has your link.",
    aside: { label: "Days left", value: String(t.left) },
    chips,
  });
  const bodyHtml =
    hi(o.name) +
    p(`Your free trial ends ${t.left === 0 ? `<strong style="color:${BRAND.goldDark}">today</strong>` : `in <strong style="color:${BRAND.goldDark}">${esc(plural(t.left, "day"))}</strong>`}${t.ends ? ` (${esc(dayIst(t.ends))})` : ""}. ${esc(after)}`) +
    (offer ? offerCallout(offer) : "") +
    button(offer ? `Choose a plan — ${offer.pct}% off` : "Choose a plan & stay live", offer ? offer.url : PLANS) +
    tickList("What stays the same when you choose a plan", [
      `Your card link${card ? ` — ${inkLink(card.url, hostOf(card.url))}` : ""}, so there's nothing to re-share`,
      "Your QR code, including any you've already printed",
      "Every contact detail, product and photo you've added",
    ]) +
    trialBar(o, t.left <= 1 ? "red" : "amber") +
    ending();
  return {
    kind: "trialEndingEmail",
    subject: t.left === 0 ? "⏳ Your free trial ends today" : `⏳ Your free trial ends in ${plural(t.left, "day")}`,
    html: layout({
      preheader: `Choose a plan before it ends to keep your card live for everyone who has your link.${offer ? ` ${offer.pct}% off if you choose now.` : ""}`,
      hero, bodyHtml, accent: t.left <= 1 ? "#DC2626" : "#F59E0B",
    }),
    text: lines([
      greet(o.name), "",
      `Your free trial ends ${when}${t.ends ? ` (${dayIst(t.ends)})` : ""}. ${after}`, "",
      offer ? offerText(offer) : null,
      `Choose a plan & stay live: ${offer ? offer.url : PLANS}`, "",
      "What stays the same when you choose a plan:",
      `- Your card link${card ? ` (${card.url})` : ""}, so there's nothing to re-share`,
      "- Your QR code, including any you've already printed",
      "- Every contact detail, product and photo you've added", "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * The trial (and any grace period) is over; the card is paused.
 * Audience: customer. Triggers: runLifecycle (past trial end + grace, ledger
 * ls_ended) and the legacy runTrialEmails (ledger trial_email_ended).
 * - cardUrl / slug: optional; shows the link that is kept.
 * - metrics: optional real counts from the trial, shown when non-zero.
 * - offer: ONLY when a discount is really available (see TrialOffer).
 */
export function trialEndedEmail(o: {
  name?: string | null;
  cardUrl?: string; slug?: string | null; metrics?: TrialMetrics | null; offer?: TrialOffer | null;
}): Email {
  const card = cardOf(o);
  const offer = liveOffer(o.offer);
  const m = o.metrics && anyMetrics(o.metrics) ? o.metrics : null;
  const hero = heroBand({
    tone: "red", eyebrow: "Trial ended",
    title: "Your card is paused. Everything you built is safe.",
    sub: "Choose a plan and it's back at the same link as soon as the plan is active.",
    chips: [
      darkChip(card ? `&#10003; Link kept: ${esc(hostOf(card.url))}` : "&#10003; Link kept"),
      darkChip("&#10003; QR code kept"),
      darkChip("&#10003; Content kept"),
    ],
  });
  const bodyHtml =
    hi(o.name) +
    p("Your free trial has ended, so your digital card is now paused: visitors no longer see your full card.") +
    p("Nothing has been deleted. Your link, your QR code and everything you added are exactly where you left them.") +
    (m ? sectionLabel("What your card did during the trial") + metricsTiles(m) : "") +
    (offer ? offerCallout(offer) : "") +
    callout("green", "Bring your card back",
      "Choose a plan and your card is live again at the same link, with no need to re-share it or reprint your QR code.") +
    button(offer ? `Reactivate — ${offer.pct}% off` : "Reactivate my card", offer ? offer.url : PLANS) +
    small("Not sure which plan fits? Reply to this email and we'll help you choose.") +
    ending();
  return {
    kind: "trialEndedEmail",
    subject: "Your trial ended — reactivate your card anytime",
    html: layout({ preheader: "Your link, QR code and content are kept. Choose a plan and your card is back.", hero, bodyHtml, accent: "#DC2626" }),
    text: lines([
      greet(o.name), "",
      "Your free trial has ended, so your digital card is now paused: visitors no longer see your full card.",
      `Nothing has been deleted. Your link${card ? ` (${card.url})` : ""}, your QR code and everything you added are kept.`, "",
      m ? "What your card did during the trial:" : null,
      ...(m ? metricsText(m) : []), m ? "" : null,
      offer ? offerText(offer) : null,
      `Choose a plan and your card is live again at the same link: ${offer ? offer.url : PLANS}`, "",
      "Not sure which plan fits? Reply to this email and we'll help you choose.", "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * The card is designed but was never published.
 * Audience: customer (new-flow users with no card_trials and no published card).
 * Trigger: runLifecycle's abandoned sweep (ledger ls_abandoned).
 * These users have NO trial yet — it starts on first publish (trial.start).
 * - productName: the card design they picked (optional).
 * - cardUrl: where to finish (defaults to /dashboard/build).
 * - trialDays: optional trial length, to say how long the trial will be.
 */
export function abandonedPublishEmail(o: { name?: string | null; productName?: string; cardUrl?: string; trialDays?: number }): Email {
  const finish = safeUrl(o.cardUrl) || BUILD;
  const what = o.productName ? `your ${strong(o.productName)} card` : "your digital card";
  const days = count(o.trialDays);
  const hero = heroBand({
    tone: "gold", eyebrow: "Almost there",
    title: "Your card is one click from going live",
    sub: o.productName ? `Your ${o.productName} card is set up. It just isn't published yet.` : "It's set up. It just isn't published yet.",
  });
  const bodyHtml =
    hi(o.name) +
    p(`You've done the hard part: ${what} is designed and waiting. Publish it and it gets its own link and QR code, ready to share.`) +
    progressSteps(["Sign up", "Design your card", "Publish", "Share it"], 2) +
    button("Finish & publish my card", finish) +
    callout("green", "Your free trial hasn't started yet",
      `It starts the day you publish, so you get the full ${days ? esc(plural(days, "day")) : "trial"} to share your card and see who opens it.`) +
    tickList("When you publish", [
      "Your card gets its own link, like digitalcarda.in/your-name",
      "A QR code that opens it, ready to print",
      "You can keep editing afterwards — changes go live on the same link",
    ]) +
    ending();
  return {
    kind: "abandonedPublishEmail",
    subject: "Your DigitalCarda is almost ready 🚀",
    html: layout({ preheader: "Publish it to get your own link and QR code. Your free trial starts that day, not before.", hero, bodyHtml }),
    text: lines([
      greet(o.name), "",
      `You've done the hard part: ${o.productName ? `your ${o.productName} card` : "your digital card"} is designed and waiting. Publish it and it gets its own link and QR code, ready to share.`, "",
      `Finish & publish my card: ${finish}`, "",
      `Your free trial hasn't started yet. It starts the day you publish, so you get the full ${days ? plural(days, "day") : "trial"} to share your card.`, "",
      "When you publish:",
      "- Your card gets its own link, like digitalcarda.in/your-name",
      "- A QR code that opens it, ready to print",
      "- You can keep editing afterwards — changes go live on the same link", "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/* ═══ The card itself ════════════════════════════════════════════════════ */

/**
 * The go-live moment: their card, its link, its QR and where to share it.
 * Audience: customer. Trigger (to wire): the first publish of a card —
 * the snapshot insert in api/publish-router.ts saveSnapshot (~:167).
 * - slug: the card's public slug (required).
 * - company: business name from the card (optional; used in the headline).
 * - publicId: the card's permanent id (optional). When given, the QR encodes
 *   ${SITE}/q/<publicId>, which survives slug changes — same as /dashboard/qr.
 */
export function cardPublishedEmail(o: { name?: string | null; slug: string; company?: string | null; publicId?: string | null }): Email {
  const url = cardUrlOf(o.slug);
  const host = hostOf(url);
  const publicId = o.publicId && /^[A-Za-z0-9_-]{1,32}$/.test(o.publicId) ? o.publicId : null;
  const qrTarget = publicId ? qrUrlOf(publicId) : url;
  const company = String(o.company || "").trim();
  const hero = heroBand({
    tone: "green", eyebrow: "You're live",
    title: company ? `${company} is live` : "Your digital card is live",
    sub: "Published and ready to share with anyone, anywhere — by link or QR code.",
    chips: [darkChip(esc(host), BRAND.gold)],
  });
  const bodyHtml =
    hi(o.name) +
    p("Your digital business card is published. Here it is — tap it to see exactly what your customers see.") +
    cardPreview(o.slug, company ? `${company} — digital business card` : "Your digital business card") +
    linkQrPanel({ url, qrTarget, permanent: !!publicId }) +
    actionPills([
      { label: "Share on WhatsApp", href: waShare(shareMessage(url)), tone: "whatsapp" },
      { label: "Download my QR", href: QR_PAGE, tone: "gold" },
      { label: "Edit my card", href: BUILD, tone: "light" },
    ]) +
    sectionLabel("Where to share it") +
    shareGrid() +
    ending();
  return {
    kind: "cardPublishedEmail",
    subject: "🎉 Your digital card is live",
    html: layout({ preheader: `Your card is live at ${host}. Your QR code is inside, ready to print.`, hero, bodyHtml, accent: "#16A34A" }),
    text: lines([
      greet(o.name), "",
      `${company ? `${company} is live!` : "You're live!"} Your digital business card is published: ${url}`, "",
      `Your QR code${publicId ? " (a permanent link that keeps working even if your card's address changes)" : ""}: ${qrTarget}`,
      `Download it print-ready: ${QR_PAGE}`,
      `Share on WhatsApp: ${waShare(shareMessage(url))}`, "",
      "Where to share it:", ...SHARE_TEXT, "",
      `Edit your card any time: ${BUILD}`, "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}

/**
 * Monthly report: the card's real numbers for one month.
 * Audience: customer. Trigger (to wire): daily cron on the 1st (IST), once per
 * user per month; needs an opt-out before it is switched on.
 * - month: display label, e.g. "August 2026".
 * - views / leads: that month's "view" and "enquiry" counts. saves: "save_contact".
 * - whatsapp / calls / qrScans: optional extra counts ("whatsapp", "call", "qr_scan");
 *   a second row of tiles shows the ones passed.
 * - prevViews / prevLeads: optional previous-month counts for a comparison.
 * - topProduct: optional most-viewed product name.
 * - unsubscribeUrl: optional opt-out link, shown in the footer.
 */
export function monthlyDigestEmail(o: {
  name?: string | null; month: string; slug?: string | null;
  views: number; leads: number; saves?: number; topProduct?: string | null;
  whatsapp?: number; calls?: number; qrScans?: number;
  prevViews?: number; prevLeads?: number; unsubscribeUrl?: string | null;
}): Email {
  const views = count(o.views), leads = count(o.leads), saves = count(o.saves);
  const month = String(o.month || "").trim() || "last month";
  const card = cardOf({ slug: o.slug });
  const vs = (now: number, prev?: number) => {
    if (typeof prev !== "number" || !Number.isFinite(prev)) return "";
    const pv = count(prev);
    if (pv === 0) return now > 0 ? "up from 0 last month" : "same as last month";
    const pct = Math.round(((now - pv) / pv) * 100);
    return pct === 0 ? "same as last month" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% vs last month`;
  };
  const viewsVs = vs(views, o.prevViews), leadsVs = vs(leads, o.prevLeads);
  const title = leads > 0
    ? `${plural(leads, "enquiry", "enquiries")} and ${plural(views, "view")} in ${month}`
    : views > 0 ? `Your card was opened ${plural(views, "time")} in ${month}` : `A quiet month for your card`;
  const hero = heroBand({
    tone: "blue", eyebrow: `Monthly report · ${month}`,
    title,
    sub: card ? hostOf(card.url) : undefined,
    aside: { label: "Views", value: fmt(views), sub: viewsVs || undefined },
  });
  const extras = ([
    ["WhatsApp taps", o.whatsapp], ["Phone calls", o.calls], ["QR scans", o.qrScans],
  ] as [string, number | undefined][]).filter(([, v]) => typeof v === "number").map(([label, v]) => ({ label, n: count(v) }));
  const advice = leads > 0
    ? callout("green", "Keep it going",
        "Add a fresh photo or offer this month, so people who come back see something new.",
        actionPills([
          { label: "See my enquiries", href: `${SITE}/dashboard/leads`, tone: "dark" },
          { label: "Update my card", href: BUILD, tone: "light" },
        ]))
    : views > 0
      ? callout("gold", "People are looking. Give them a reason to enquire.",
          "Put up an offer or move your best product to the top, so visitors have something to ask about.",
          actionPills([
            { label: "Add an offer", href: `${SITE}/dashboard/products?tab=offers`, tone: "dark" },
            { label: "Update my card", href: BUILD, tone: "light" },
          ]))
      : callout("blue", "Get your card seen this month",
          "Your card only gets visits when people have the link. Put it in your WhatsApp greeting message and print your QR where customers stand.",
          actionPills([
            { label: "Write my WhatsApp message", href: `${SITE}/dashboard/whatsapp`, tone: "whatsapp" },
            { label: "Get my QR", href: QR_PAGE, tone: "light" },
          ]));
  const bodyHtml =
    hi(o.name) +
    p(`Here's how your digital card did in ${strong(month)}. Every number is a real visit or tap on your card — nothing is estimated.`) +
    tileRow([
      { label: "Card views", value: esc(fmt(views)), sub: viewsVs ? esc(viewsVs) : undefined },
      { label: "Enquiries", value: esc(fmt(leads)), sub: leadsVs ? esc(leadsVs) : undefined },
      { label: "Contacts saved", value: esc(fmt(saves)) },
    ]) +
    (extras.length ? tileRow(extras.map((x) => ({ label: x.label, value: esc(fmt(x.n)) })), true) : "") +
    (o.topProduct ? note(`Your most-viewed item was ${strong(o.topProduct)} — worth featuring first on your card.`) : "") +
    advice +
    button("Open my analytics", `${SITE}/dashboard/analytics`) +
    (card ? small(`Your card: ${inkLink(card.url, hostOf(card.url))}`) : "") +
    ending();
  return {
    kind: "monthlyDigestEmail",
    subject: `Your card in ${month}: ${plural(views, "view")}, ${plural(leads, "enquiry", "enquiries")}`,
    html: layout({
      preheader: leads > 0 ? "Every number is a real visit or tap — plus one idea to keep the enquiries coming."
        : views > 0 ? "People opened your card. Here's one idea to turn those visits into enquiries."
        : "One simple way to get your card in front of more people this month.",
      hero, bodyHtml, accent: "#2563EB", footer: recurringFooter("monthly report", o.unsubscribeUrl),
    }),
    text: lines([
      greet(o.name), "",
      `Your card in ${month} (real visits and taps, nothing estimated):`,
      `- Card views: ${fmt(views)}${viewsVs ? ` (${viewsVs})` : ""}`,
      `- Enquiries: ${fmt(leads)}${leadsVs ? ` (${leadsVs})` : ""}`,
      `- Contacts saved: ${fmt(saves)}`,
      ...extras.map((x) => `- ${x.label}: ${fmt(x.n)}`),
      o.topProduct ? `\nYour most-viewed item was ${o.topProduct} — worth featuring first on your card.` : null, "",
      leads > 0 ? `Keep it going: add a fresh photo or offer this month. Your enquiries: ${SITE}/dashboard/leads`
        : views > 0 ? `People are looking — put up an offer so they have something to ask about: ${SITE}/dashboard/products?tab=offers`
        : `Get your card seen: put it in your WhatsApp greeting (${SITE}/dashboard/whatsapp) and print your QR (${QR_PAGE}).`, "",
      `Your analytics: ${SITE}/dashboard/analytics`,
      card ? `Your card: ${card.url}` : null, "",
      HELP_TEXT, safeUrl(o.unsubscribeUrl) ? `Stop these emails: ${safeUrl(o.unsubscribeUrl)}` : null, "", SIGN_TEXT,
    ]),
  };
}

/**
 * A card nobody has updated in a while.
 * Audience: customer. Trigger (to wire): daily cron on published_cards.updatedAt;
 * needs an opt-out first.
 * - days: whole days since the card last changed.
 * - slug: the card (optional; shows the card preview and link).
 * - views / viewsDays: optional real "view" count over the last `viewsDays`
 *   days (default label 30) — shown only when passed.
 * - unsubscribeUrl: optional opt-out link, shown in the footer.
 */
export function dormantCardEmail(o: {
  name?: string | null; slug?: string | null; days: number;
  views?: number; viewsDays?: number; unsubscribeUrl?: string | null;
}): Email {
  const days = count(o.days);
  const card = cardOf({ slug: o.slug });
  const hasViews = typeof o.views === "number" && Number.isFinite(o.views);
  const views = count(o.views);
  const span = count(o.viewsDays) || 30;
  const hero = heroBand({
    tone: "gold", eyebrow: "Quick refresh",
    title: `Your card hasn't changed in ${plural(days, "day")}`,
    sub: hasViews && views > 0
      ? `It was still opened ${plural(views, "time")} in the last ${span} days, so make sure it shows what's true today.`
      : "Two minutes of updates keeps it looking current.",
  });
  const bodyHtml =
    hi(o.name) +
    p(`It's been about ${esc(plural(days, "day"))} since your card last changed. Prices, timings and photos move on, and a quick refresh makes sure the people who open it see what's true today.`) +
    (hasViews
      ? tileRow([
          { label: "Since last update", value: esc(plural(days, "day")) },
          { label: `Views, last ${span} days`, value: esc(fmt(views)) },
        ])
      : "") +
    (card ? sectionLabel("What visitors see today") + cardPreview(card.slug, `Your card at ${hostOf(card.url)}`) : "") +
    sectionLabel("Quick wins") +
    iconGrid([
      { icon: glyph("&#9635;"), title: "Add a recent photo", body: `New work in your gallery is the easiest way to look active. ${goldLink(`${SITE}/dashboard/media`, "Add photos →")}` },
      { icon: glyph("%"), title: "Put up one offer", body: `A simple offer gives visitors a reason to call today. ${goldLink(`${SITE}/dashboard/products?tab=offers`, "Add an offer →")}` },
      { icon: glyph("&#9998;"), title: "Check your details", body: `Phone, address and timings — the things people came for. ${goldLink(BUILD, "Review details →")}` },
      { icon: glyph("&#9776;"), title: "Check your prices", body: `Update prices and remove anything you no longer sell. ${goldLink(`${SITE}/dashboard/products`, "Review products →")}` },
    ]) +
    button("Update your card", BUILD) +
    (card ? note(`It takes two minutes, and your link stays exactly the same: ${inkLink(card.url, hostOf(card.url))}`) : "") +
    ending();
  return {
    kind: "dormantCardEmail",
    subject: "Your card could use a refresh ✨",
    html: layout({
      preheader: "A two-minute refresh keeps your prices, photos and timings current for everyone who opens your card.",
      hero, bodyHtml, footer: recurringFooter("reminder", o.unsubscribeUrl),
    }),
    text: lines([
      greet(o.name), "",
      `Your card hasn't changed in about ${plural(days, "day")}.`,
      hasViews ? `It was opened ${plural(views, "time")} in the last ${span} days, so make sure it shows what's true today.` : null, "",
      "Quick wins:",
      `- Add a recent photo — ${SITE}/dashboard/media`,
      `- Put up one offer — ${SITE}/dashboard/products?tab=offers`,
      `- Check your phone, address and timings — ${BUILD}`,
      `- Check your prices — ${SITE}/dashboard/products`, "",
      `Update your card: ${BUILD}`,
      card ? `Your link stays exactly the same: ${card.url}` : null, "",
      HELP_TEXT, safeUrl(o.unsubscribeUrl) ? `Stop these emails: ${safeUrl(o.unsubscribeUrl)}` : null, "", SIGN_TEXT,
    ]),
  };
}

/**
 * NEW. Our team moved a customer's card to a new address.
 * Audience: customer (the card's owner).
 * Trigger (to wire): admin `reslugCard` in api/admin-router.ts (~:258), after
 * the update succeeds and only when the slug really changed. The select there
 * must also read the old slug and publicId.
 * Old links do NOT redirect (nothing stores slug history), so the old address
 * stops opening this card. The permanent ${SITE}/q/<publicId> link (boot.ts
 * /q/:publicId) resolves to the current slug, so dashboard QR codes keep working.
 * NFC chips and NFC print QR use the plain slug URL (nfc-router.ts cardUrlFor),
 * so those need updating — the email says so.
 * - oldSlug / newSlug: the addresses before and after (required).
 * - publicId: the card's permanent id (optional; when missing the email asks
 *   them to download a fresh QR instead of promising the old one works).
 * - company: business name on the card (optional).
 * - reason: optional short note from the team, shown as a quote.
 * - changedAt: optional time of the change.
 */
export function cardLinkChangedEmail(o: {
  name?: string | null; oldSlug: string; newSlug: string; publicId?: string | null;
  company?: string | null; reason?: string | null; changedAt?: Date | string | null;
}): Email {
  const oldUrl = cardUrlOf(o.oldSlug);
  const newUrl = cardUrlOf(o.newSlug);
  const newHost = hostOf(newUrl);
  const publicId = o.publicId && /^[A-Za-z0-9_-]{1,32}$/.test(o.publicId) ? o.publicId : null;
  const qUrl = publicId ? qrUrlOf(publicId) : null;
  const company = String(o.company || "").trim();
  const reason = String(o.reason || "").trim();
  const when = toDate(o.changedAt);
  const hero = heroBand({
    tone: "blue", eyebrow: "Your card has a new link",
    title: "Your card has a new link",
    sub: `It now opens at ${newHost}. The old link no longer works.`,
    chips: [
      darkChip(`New: ${esc(newHost)}`, BRAND.gold),
      darkChip(`Old: <span style="text-decoration:line-through">${esc(hostOf(oldUrl))}</span>`),
    ],
  });
  const updateList = [
    "Your WhatsApp Business profile, greeting message and status",
    "Your Instagram, Facebook and LinkedIn bios",
    "Your email signature",
    "Your Google Business Profile and your website",
    "Anything printed with the old link written on it",
    "An NFC card or standee from us — message us and we'll help you update it",
  ];
  const bodyHtml =
    hi(o.name) +
    p(`Our team has moved ${company ? `the ${strong(company)} card` : "your digital card"} to a new address${when ? ` on ${esc(dateIst(when))}` : ""}. From now on, the old link no longer opens your card.`) +
    (reason ? quoteBlock(reason, "DigitalCarda team") : p("This happens when two cards end up on the same address, so that each link opens the right business.")) +
    linkSwap(oldUrl, newUrl) +
    actionPills([
      { label: "Open my card", href: newUrl, tone: "gold" },
      { label: "Share the new link", href: waShare(shareMessage(newUrl)), tone: "whatsapp" },
      { label: "Get my QR", href: QR_PAGE, tone: "light" },
    ]) +
    (qUrl
      ? callout("green", "Your dashboard QR code still works",
          `QR codes downloaded from your dashboard use your permanent link, ${inkLink(qUrl, hostOf(qUrl))}, which always opens your card at its current address. There's nothing to reprint.`)
      : callout("amber", "Download a fresh QR code",
          "If you've printed a QR code for this card, download a new one from your dashboard so it opens the new address.",
          actionPills([{ label: "Get my QR", href: QR_PAGE, tone: "dark" }]))) +
    tickList("Update the new link here", updateList.map((x) => esc(x))) +
    ending();
  return {
    kind: "cardLinkChangedEmail",
    subject: "Your DigitalCarda link has changed",
    html: layout({ preheader: `Your card now opens at ${newHost}. The old link no longer works — here's where to update it.`, hero, bodyHtml, accent: "#2563EB" }),
    text: lines([
      greet(o.name), "",
      `Our team has moved ${company ? `the ${company} card` : "your digital card"} to a new address${when ? ` on ${dateIst(when)}` : ""}.`,
      reason ? `Note from our team: ${reason}` : "This happens when two cards end up on the same address, so that each link opens the right business.", "",
      `New link (live now): ${newUrl}`,
      `Old link (no longer works): ${oldUrl}`, "",
      qUrl
        ? `Your dashboard QR code still works: it uses your permanent link ${qUrl}, which always opens your card at its current address.`
        : `If you've printed a QR code for this card, download a fresh one: ${QR_PAGE}`, "",
      "Update the new link here:", ...updateList.map((x) => `- ${x}`), "",
      `Share the new link on WhatsApp: ${waShare(shareMessage(newUrl))}`, "",
      HELP_TEXT, "", SIGN_TEXT,
    ]),
  };
}
