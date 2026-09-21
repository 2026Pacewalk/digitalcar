/*
 * Marketing, visitor and system emails: the "what's new" announcement, the
 * cold intro to a prospect, the /contact confirmation, the review request,
 * the SMTP test, and the confirmation for a team (bulk) card request.
 *
 * Two of these go to an address a stranger typed into a public form
 * (contactReceivedEmail, bulkOrderReceivedEmail). They must never carry that
 * stranger's free text, or anyone could use our domain to mail their own words
 * to someone else. Names are clipped and escaped; notes and messages are never
 * accepted at all.
 */
import {
  layout, heroBand, heroLight, sectionLabel, button, actionPills, statTiles, infoGrid,
  callout, note, stepRow, tickList, iconGrid, cardPreview, helpStrip, signoff, darkChip,
  goldLink, inkLink, emailLink, mailtoLink, mono, p, hi, strong, small, esc, inr, safeUrl,
  firstName, showPhone, waNumber, whenIst, spacer, BRAND, TONE, SITE, SUPPORT_WHATSAPP, SUPPORT_EMAIL,
  FONT, type Email,
} from "./kit";

/* ── Local helpers ───────────────────────────────────────────────────────── */

/** Trim, collapse whitespace and cap the length of text we did not write. */
const clip = (s: unknown, max: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** "Hi Aarav," with the first name capped, for emails sent to a typed-in address. */
const greet = (name?: string | null) => p(`Hi ${esc(clip(firstName(name), 30) || "there")},`);
const greetText = (name?: string | null) => `Hi ${clip(firstName(name), 30) || "there"},`;

/** "digitalcarda.in/pacewalk" */
const bare = (url: string) => url.replace(/^https?:\/\//, "");

const WA_SUPPORT = `https://wa.me/${SUPPORT_WHATSAPP.wa}`;
const waSupport = (message: string) => `${WA_SUPPORT}?text=${encodeURIComponent(message)}`;

/** Plain-text help line used at the foot of every text version. */
const TEXT_HELP = `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT}) — a real person answers.`;

/** A linked line for a tickList: gold link on top, one quiet line under it. Trusted constants only. */
const linkItem = (label: string, href: string, line: string) =>
  `${goldLink(href, label)}<br><span style="font-size:13px;color:${BRAND.sub}">${esc(line)}</span>`;

/** Five gold stars on navy — the object of the review request. Linked only when
    there is a real review page to send people to. (Local block: not in the kit.) */
function starPanel(href: string | null): string {
  const stars = `<span style="font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:40px;letter-spacing:6px;color:${BRAND.gold}">&#9733;&#9733;&#9733;&#9733;&#9733;</span>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 18px"><tr>
    <td align="center" bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:14px;padding:22px 20px 18px">
      ${href ? `<a href="${esc(href)}" target="_blank" style="text-decoration:none;color:${BRAND.gold}">${stars}</a>` : stars}
      <div style="font-family:${FONT};font-size:13px;line-height:1.5;color:#C3CFDF;padding-top:6px">${href ? "Tap the stars to write your review" : "A line or two is plenty"}</div>
    </td></tr></table>`;
}

/* ── "What's new" announcement ───────────────────────────────────────────── */

/* FEATURE_HIGHLIGHTS is the single source of truth for the announcement. The
   WhatsApp version (src/lib/shareTemplates.ts) mirrors the same list by hand,
   so change both together. Titles and bodies are trusted HTML (&amp;). */
export const FEATURE_HIGHLIGHTS: { title: string; body: string }[] = [
  { title: "A brand-new card editor",
    body: "Everything on one screen — your details, look &amp; feel, and what's on your card — with a live preview that updates as you type. Nothing to save; it saves itself." },
  { title: "New premium designs",
    body: "Fresh single-screen card designs, plus a Compact layout that folds a long card into neat tap-to-open sections." },
  { title: "Gallery &amp; video layouts",
    body: "Show your photos full-width or as a tidy 3-across grid, and your videos stacked or as a swipe carousel." },
  { title: "Better products &amp; services",
    body: "Redesigned cards with price, a savings badge and a clear button — or switch to a compact icon list in one tap." },
  { title: "Your brand colours, automatically",
    body: "Upload your logo and we pick your brand colours from it, then preview every template in them. Custom backgrounds too." },
  { title: "AI card generator",
    body: "Paste your website link and we build the card for you — content, services, contact details and branding." },
  { title: "Tap-to-navigate address",
    body: "Add your Google Maps link so visitors can tap your address and get directions straight away." },
  { title: "You choose what shows",
    body: "Show or hide your QR code, share button, view count and plan badge — and drag your card sections into any order." },
];

/** Icon per highlight, keyed by title so an edit to the list never shifts icons onto the wrong feature. */
const FEATURE_ICONS: Record<string, string> = {
  "A brand-new card editor": "&#9999;&#65039;",
  "New premium designs": "&#128142;",
  "Gallery &amp; video layouts": "&#128444;&#65039;",
  "Better products &amp; services": "&#127991;&#65039;",
  "Your brand colours, automatically": "&#127912;",
  "AI card generator": "&#10024;",
  "Tap-to-navigate address": "&#128205;",
  "You choose what shows": "&#127899;&#65039;",
};

const unHtml = (t: string) => t.replace(/&amp;/g, "&");

/**
 * "What's new" announcement to one existing customer.
 * Audience: customer. Trigger: super-admin "What's new" action (user.sendFeatureUpdate).
 * - name: the customer's full name (greeting uses the first name).
 * - slug: their first published card, to show it and reassure that the link is unchanged.
 */
export function featureUpdateEmail(o: { name?: string | null; slug?: string | null }): Email {
  const n = FEATURE_HIGHLIGHTS.length;
  const cardUrl = o.slug ? `${SITE}/${encodeURIComponent(o.slug)}` : "";

  const hero = heroBand({
    eyebrow: "Product update",
    title: `${n} upgrades, already in your account`,
    sub: "A new editor with live preview, fresh designs and smarter layouts. Same link, same QR code.",
    aside: { label: "Extra cost", value: "₹0", sub: "in your plan" },
    chips: ["Live preview", "AI card generator", "Brand colours from your logo"].map((c) => darkChip(esc(c))),
  });

  const bodyHtml =
    hi(o.name) +
    p("We've rebuilt the way you edit your card and added new designs and layouts. Everything below is already switched on in your account &mdash; there is nothing to install and nothing extra to pay.") +
    button("Try the new editor", `${SITE}/dashboard/build`) +
    sectionLabel("What's new") +
    iconGrid(FEATURE_HIGHLIGHTS.map((f) => ({ icon: FEATURE_ICONS[f.title] || "&#9733;", title: f.title, body: f.body }))) +
    (o.slug
      ? sectionLabel("Your card — same link, same QR code") +
        cardPreview(o.slug, "Your digital business card") +
        p(`<span style="font-size:13.5px">Your link hasn't changed: ${inkLink(cardUrl, bare(cardUrl))}. Printed QR codes keep working.</span>`)
      : "") +
    helpStrip() +
    signoff();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    `Your DigitalCarda card just got ${n} upgrades. They're already in your account — nothing to install and nothing extra to pay.`, "",
    `Try the new editor: ${SITE}/dashboard/build`, "",
    "WHAT'S NEW",
    ...FEATURE_HIGHLIGHTS.map((f) => `- ${unHtml(f.title)}: ${unHtml(f.body)}`),
    ...(cardUrl ? ["", "YOUR CARD — same link, same QR code", cardUrl] : []),
    "", TEXT_HELP, "", "Warm regards,", "Team DigitalCarda",
  ].join("\n");

  return {
    kind: "featureUpdateEmail",
    subject: "New on your DigitalCarda card ✨ (all included in your plan)",
    html: layout({
      preheader: "A new editor with live preview, new designs and brand colours from your logo — already in your account.",
      hero, bodyHtml, audience: "customer",
    }),
    text,
  };
}

/* ── Cold intro to a prospect ────────────────────────────────────────────── */

const INTRO_FEATURES: { icon: string; title: string; body: string; text: string }[] = [
  { icon: "&#128222;", title: "One tap to reach you", body: "Call, WhatsApp, directions, your website and save-to-contacts, all from one link.",
    text: "One tap to reach you: call, WhatsApp, directions, website and save-to-contacts" },
  { icon: "&#128717;&#65039;", title: "Show what you sell", body: "Products and services with prices, a photo gallery, videos and offers.",
    text: "Show what you sell: products and services with prices, gallery, videos and offers" },
  { icon: "&#128229;", title: "Enquiries come to you", body: "Visitors send an enquiry from your card and every one lands in your dashboard.",
    text: "Enquiries come to you: every enquiry from your card lands in your dashboard" },
  { icon: "&#128179;", title: "Get paid by UPI", body: "Your UPI ID, payment QR and bank details on the card, ready to copy.",
    text: "Get paid by UPI: your UPI ID, payment QR and bank details, ready to copy" },
  { icon: "&#11088;", title: "Look trustworthy", body: "Your Google rating and reviews, your logo and your brand colours.",
    text: "Look trustworthy: your Google rating and reviews, logo and brand colours" },
  { icon: "&#128202;", title: "See what's working", body: "Track how many people open your card and how many send an enquiry.",
    text: "See what's working: views and enquiries, tracked for you" },
];

/**
 * Cold outreach to a business that has no account yet.
 * Audience: prospect (footer carries the "reply unsubscribe" opt-out).
 * Trigger: admin settings.sendMarketingEmail, one address at a time.
 * - name: the contact person, if known.
 * - businessName: their business, used in the subject and headline.
 * - ctaUrl: where "Create your free card" goes (http/https only); defaults to /signup.
 * - trialDays: the current free-trial length (app_settings "trial_days"); defaults to 30.
 */
export function marketingIntroEmail(o: { name?: string; businessName?: string; ctaUrl?: string; trialDays?: number | null }): Email {
  const business = clip(o.businessName, 60);
  const days = o.trialDays && o.trialDays > 0 ? Math.round(o.trialDays) : 30;
  const cta = safeUrl(o.ctaUrl) || `${SITE}/signup`;
  const who = business ? strong(business) : "your business";

  const hero = heroBand({
    eyebrow: "Digital business cards",
    title: `Everything about ${business || "your business"} in one link`,
    sub: "Customers can call you, WhatsApp you, get directions and save your number — from a link, a QR code or a tap.",
    aside: { label: "Free trial", value: `${days} days`, sub: "no card details" },
    chips: ["Share by link", "QR code", "WhatsApp"].map((c) => darkChip(esc(c))),
  });

  const bodyHtml =
    p(`Hi ${esc(clip(firstName(o.name), 30) || "there")},`) +
    p(`I'm writing from ${strong("DigitalCarda")}. We help Indian businesses like ${who} replace the paper visiting card with a digital one &mdash; a card your customers can act on straight away, and that you can update any time without reprinting.`) +
    p(`You can try everything free for ${days} days. No card details needed.`) +
    button("Create your free card", cta) +
    sectionLabel("What your customers get") +
    iconGrid(INTRO_FEATURES.map(({ icon, title, body }) => ({ icon, title, body: esc(body) }))) +
    sectionLabel("How it works") +
    stepRow(1, "Sign up free", esc(`Your ${days}-day trial starts straight away, with no payment details.`)) +
    stepRow(2, "Add your details, or let AI do it", "Pick a design and fill in your details &mdash; or paste your website link and the AI card generator builds the card for you.") +
    stepRow(3, "Share it the same day", "Send the link on WhatsApp, print the QR code on your counter or visiting card, and add it to your email signature.") +
    callout("gold", "Prefer to talk first?", "Reply to this email or message us on WhatsApp. A real person will answer your questions &mdash; no pressure to buy.",
      actionPills([
        { label: "WhatsApp us", href: waSupport("Hi DigitalCarda, I'd like to know more about a digital business card."), tone: "whatsapp" },
        { label: "See card designs", href: `${SITE}/digital-business-cards-templates`, tone: "light" },
        { label: "Pricing", href: `${SITE}/pricing`, tone: "light" },
      ])) +
    signoff();

  const text = [
    `Hi ${clip(firstName(o.name), 30) || "there"},`, "",
    `I'm writing from DigitalCarda. We help Indian businesses like ${business || "yours"} replace the paper visiting card with a digital one — a card your customers can act on straight away, and that you can update any time without reprinting.`, "",
    `Try everything free for ${days} days. No card details needed.`,
    `Create your free card: ${cta}`, "",
    "WHAT YOUR CUSTOMERS GET",
    ...INTRO_FEATURES.map((f) => `- ${f.text}`), "",
    "HOW IT WORKS",
    `1. Sign up free — your ${days}-day trial starts straight away.`,
    "2. Add your details, or paste your website link and the AI card generator builds the card for you.",
    "3. Share it the same day — WhatsApp, a printed QR code, your email signature.", "",
    `Prefer to talk first? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT}).`,
    `Card designs: ${SITE}/digital-business-cards-templates`,
    `Pricing: ${SITE}/pricing`, "",
    "Warm regards,", "Team DigitalCarda", "",
    `Not interested? Just reply "unsubscribe".`,
  ].join("\n");

  return {
    kind: "marketingIntroEmail",
    subject: `${business ? `${business} — turn` : "Turn"} your visiting card into a smart digital card`,
    html: layout({
      preheader: `Share your business by link, QR code or WhatsApp — free for ${days} days, no card details needed.`,
      hero, bodyHtml, audience: "prospect",
    }),
    text,
  };
}

/* ── /contact confirmation to the visitor ────────────────────────────────── */

type Tip = { label: string; href: string; line: string };
const TIP = {
  designs: { label: "Browse card designs", href: `${SITE}/digital-business-cards-templates`, line: "See the designs you can start from." },
  pricing: { label: "Compare plans", href: `${SITE}/pricing`, line: "Start with a free trial — no card details needed." },
  ai: { label: "Try the AI card generator", href: `${SITE}/ai-card-generator`, line: "Paste your website link and see a card built for you." },
  bulk: { label: "Team pricing", href: `${SITE}/bulk-cards`, line: "The per-card price drops as your team grows, from 10 cards." },
  resellers: { label: "How the reseller programme works", href: `${SITE}/resellers`, line: "What partners sell, and how they earn." },
  domain: { label: "Custom domains", href: `${SITE}/custom-domain`, line: "Show your card on your own web address." },
  features: { label: "Everything a card can do", href: `${SITE}/features`, line: "Leads, payments, reviews, analytics and more." },
  guide: { label: "Digital business card guide", href: `${SITE}/digital-business-card-guide`, line: "Answers to the questions we hear most." },
  login: { label: "Sign in to your dashboard", href: `${SITE}/login`, line: "Your card, enquiries and settings, in one place." },
} satisfies Record<string, Tip>;

/* The labels api/contact-router.ts turns its requirement keys into. Only these
   are ever repeated back: the router passes unknown values through as typed, and
   that is visitor free text. */
const REQUIREMENT_TIPS: Record<string, Tip[]> = {
  "Digital Business Card": [TIP.designs, TIP.pricing, TIP.ai],
  "Bulk Cards for a Team": [TIP.bulk, TIP.designs],
  "Reseller Programme": [TIP.resellers, TIP.pricing],
  "Custom Domain": [TIP.domain, TIP.pricing],
  "Enterprise Setup": [TIP.bulk, TIP.features],
  "Technical Support": [TIP.login, TIP.guide],
  "Other": [TIP.designs, TIP.pricing],
};

/**
 * Confirmation to someone who wrote in through the website's /contact form.
 * Audience: visitor. Trigger: contact.send (api/contact-router.ts), best effort.
 * It never repeats what they typed: the form accepts any address, so echoing
 * free text would let anyone send their own words to a stranger from our domain.
 * - name: as typed on the form (only the first name is used, clipped).
 * - requirement: the requirement LABEL; shown only when it is one of the known
 *   labels, otherwise ignored.
 */
export function contactReceivedEmail(o: { name?: string | null; requirement?: string | null }): Email {
  const req = o.requirement && REQUIREMENT_TIPS[o.requirement] ? o.requirement : null;
  const tips = req ? REQUIREMENT_TIPS[req] : [TIP.designs, TIP.pricing];

  const hero = heroLight({
    badge: "Enquiry received",
    title: "Thanks — we've got your enquiry",
    sub: "Someone from our team will get back to you, usually within 24 hours.",
  });

  const bodyHtml =
    greet(o.name) +
    p(`Thanks for contacting ${strong("DigitalCarda")}. Your enquiry${req ? ` about ${strong(req)}` : ""} has reached our team, and a real person will read it and reply.`) +
    callout("green", "Need an answer sooner?", "WhatsApp is where we reply fastest. Mention that you sent an enquiry on the website.",
      actionPills([
        { label: "WhatsApp us", href: waSupport("Hi DigitalCarda, I just sent an enquiry on your website."), tone: "whatsapp" },
        { label: `Email ${SUPPORT_EMAIL}`, href: mailtoLink(SUPPORT_EMAIL, "My enquiry"), tone: "light" },
      ])) +
    tickList("While you wait", tips.map((t) => linkItem(t.label, t.href, t.line))) +
    small("Want to add something? Just reply to this email &mdash; it reaches the same team.") +
    signoff();

  const text = [
    greetText(o.name), "",
    `Thanks for contacting DigitalCarda. Your enquiry${req ? ` about ${req}` : ""} has reached our team, and a real person will reply — usually within 24 hours.`, "",
    "NEED AN ANSWER SOONER?",
    `WhatsApp is where we reply fastest: ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT})`,
    `Email: ${SUPPORT_EMAIL}`, "",
    "WHILE YOU WAIT",
    ...tips.map((t) => `- ${t.label}: ${t.href}`), "",
    "Want to add something? Just reply to this email.", "",
    "Warm regards,", "Team DigitalCarda",
  ].join("\n");

  return {
    kind: "contactReceivedEmail",
    subject: "We've received your enquiry — DigitalCarda",
    html: layout({
      preheader: "A real person will reply, usually within 24 hours. In a hurry? WhatsApp is fastest.",
      hero, bodyHtml, audience: "visitor",
      footer: "You're receiving this because you sent an enquiry on digitalcarda.in.",
    }),
    text,
  };
}

/* ── Review request ──────────────────────────────────────────────────────── */

/**
 * Ask a happy customer for a public review. Sent by hand, never on a timer.
 * Audience: customer. Trigger: none wired yet (plan P3: after an NFC order is delivered).
 * - name: the customer's full name.
 * - reviewUrl: the public review page (http/https). When missing there is NO
 *   review button: the email asks for a reply with a line or two instead.
 * - productName: what they just received (e.g. "NFC card") when sent after a
 *   delivery; adds one line saying so.
 */
export function reviewRequestEmail(o: { name?: string | null; reviewUrl?: string | null; productName?: string | null }): Email {
  const url = safeUrl(o.reviewUrl);
  const product = clip(o.productName, 40);

  const hero = heroLight({
    badge: "A small favour",
    title: "Would you share your experience?",
    sub: "A few honest words from you help other business owners decide whether DigitalCarda is right for them.",
  });

  const ask = url
    ? button("Write a review", url)
    : p("Just reply to this email and tell us what you use your card for, and what it has done for you. We'll ask before we share your words anywhere.") +
      actionPills([
        { label: "Reply by email", href: mailtoLink(SUPPORT_EMAIL, "My DigitalCarda review"), tone: "dark" },
        { label: "Send it on WhatsApp", href: waSupport("Hi DigitalCarda, here's my review: "), tone: "whatsapp" },
      ]);

  const bodyHtml =
    hi(o.name) +
    (product ? p(`We hope your ${esc(product)} arrived safely and is working well.`) : "") +
    p("We hope your digital card is bringing you enquiries. If it has been useful, would you take a minute to tell others about it?") +
    starPanel(url) +
    ask +
    callout("amber", "Not happy with something?", "Reply to this email instead and we'll put it right. We'd much rather fix it than read about it later.") +
    helpStrip() +
    signoff();

  const text = [
    `Hi ${firstName(o.name) || "there"},`, "",
    ...(product ? [`We hope your ${product} arrived safely and is working well.`, ""] : []),
    "We hope your digital card is bringing you enquiries. If it has been useful, would you take a minute to tell others about it?", "",
    ...(url
      ? [`Write a review: ${url}`]
      : ["Just reply to this email and tell us what you use your card for, and what it has done for you. We'll ask before we share your words anywhere."]),
    "", "Not happy with something? Reply to this email instead and we'll put it right.", "",
    TEXT_HELP, "", "Warm regards,", "Team DigitalCarda",
  ].join("\n");

  return {
    kind: "reviewRequestEmail",
    subject: "Would you review DigitalCarda?",
    html: layout({
      preheader: "If your card has been useful, a few honest words from you would help other business owners.",
      hero, bodyHtml, audience: "customer",
    }),
    text,
  };
}

/* ── SMTP test ───────────────────────────────────────────────────────────── */

/**
 * Admin's "send a test email" from Settings.
 * Audience: admin (whoever the admin typed, or the owner address).
 * Trigger: settings.sendTestEmail.
 * - to: the address the test was sent to.
 * - from: the From header in use (mailFrom()), optional.
 * - host: SMTP host (process.env.SMTP_HOST), optional. Never pass credentials.
 * - sentAt: when it was sent; defaults to now.
 */
export function smtpTestEmail(o: { to?: string; from?: string | null; host?: string | null; sentAt?: Date }): Email {
  const at = o.sentAt instanceof Date && !isNaN(o.sentAt.getTime()) ? o.sentAt : new Date();
  const when = `${whenIst(at)} IST`;

  const hero = heroBand({
    eyebrow: "Email test",
    tone: "green",
    icon: "&#9989;",
    title: "Email delivery works",
    sub: "This message left the server and reached this inbox, so DigitalCarda can send mail.",
  });

  const bodyHtml =
    p("You sent this test from Admin &rarr; Settings. If you're reading it, the SMTP settings on the server are correct. Every automatic email the app sends goes out through this same connection.") +
    infoGrid([
      ["Sent to", o.to ? emailLink(o.to) : null],
      ["From", o.from ? esc(o.from) : null],
      ["SMTP server", o.host ? mono(o.host) : null],
      ["Sent at", esc(when)],
    ]) +
    tickList("Two things to check", [
      `${strong("It landed in Inbox, not Spam or Promotions.")} If it went to spam, check the SPF and DKIM records for the From domain.`,
      `${strong("The sender looks right")} &mdash; the From name and address are what a customer should see.`,
    ]) +
    button("Open the email log", `${SITE}/admin/email-log`, "dark") +
    small("The email log lists every email the app sends, including any that failed.");

  const text = [
    "Email delivery works.", "",
    "You sent this test from Admin → Settings. If you're reading it, the SMTP settings on the server are correct. Every automatic email the app sends goes out through this same connection.", "",
    ...(o.to ? [`Sent to: ${o.to}`] : []),
    ...(o.from ? [`From: ${o.from}`] : []),
    ...(o.host ? [`SMTP server: ${o.host}`] : []),
    `Sent at: ${when}`, "",
    "TWO THINGS TO CHECK",
    "- It landed in Inbox, not Spam or Promotions. If it went to spam, check the SPF and DKIM records for the From domain.",
    "- The From name and address are what a customer should see.", "",
    `Email log: ${SITE}/admin/email-log`,
  ].join("\n");

  return {
    kind: "smtpTestEmail",
    subject: "✅ DigitalCarda email test — it works!",
    html: layout({
      preheader: "SMTP is set up correctly on this server. Two quick things to check.",
      hero, bodyHtml, audience: "admin", accent: TONE.green.solid,
      footer: "Sent from Admin → Settings to check email delivery. No action needed.",
    }),
    text,
  };
}

/* ── Team (bulk) card request received ───────────────────────────────────── */

/**
 * Confirmation to the person who asked for team cards.
 * Audience: customer (the requester — signed in or a guest).
 * Trigger: bulkOrder.create (api/bulk-order-router.ts), after the request is saved.
 * WIRING: that endpoint is public and accepts any address. Validate the email
 * with a real check and rate-limit the endpoint BEFORE sending this, or it can be
 * used to mail strangers. The request's free-text `note` is deliberately not a field.
 */
export interface BulkOrderReceived {
  /** contactName as typed; only the clipped first name is used. */
  name?: string | null;
  /** Company as typed; shown clipped to 60 characters. */
  company?: string | null;
  /** Number of cards asked for (1–100000). */
  quantity: number;
  /** Bundle picked in Bulk Create Cards: "Team" | "Business" | "Enterprise" | "Custom". */
  packageName?: string | null;
  /** Price per card per year in rupees, before GST (pricePerCard). */
  pricePerCard?: number | null;
  /** The estimate shown when they asked (totalEstimate), in rupees. 0 or missing = no estimate shown. */
  estimate?: number | null;
  /** Whether `estimate` includes 18% GST. Omit to work it out from quantity × pricePerCard. */
  includesGst?: boolean | null;
  /** The phone they gave, repeated only when it is a valid number, so a typo can be caught. */
  phone?: string | null;
  /** bulk_order_requests.id, shown as a reference. */
  requestId?: number | null;
}

export function bulkOrderReceivedEmail(o: BulkOrderReceived): Email {
  const qty = Math.max(1, Math.round(Number(o.quantity) || 1));
  const qtyText = qty.toLocaleString("en-IN");
  const cards = `${qtyText} ${qty === 1 ? "card" : "cards"}`;
  const company = clip(o.company, 60);
  const bundleRaw = clip(o.packageName, 30);
  const bundle = !bundleRaw ? "" : /^custom$/i.test(bundleRaw) ? "Custom quantity" : `${bundleRaw} bundle`;
  const per = Number(o.pricePerCard) > 0 ? Number(o.pricePerCard) : 0;
  const est = Number(o.estimate) > 0 ? Math.round(Number(o.estimate)) : 0;
  const ref = o.requestId && Number(o.requestId) > 0 ? `#${Math.round(Number(o.requestId))}` : "";
  const phone = o.phone && waNumber(o.phone) ? showPhone(o.phone) : "";

  // Say what the estimate covers only when we can tell.
  let gst: boolean | null = o.includesGst ?? null;
  if (gst === null && est && per) {
    const base = qty * per;
    if (Math.abs(est - base * 1.18) <= 2) gst = true;
    else if (Math.abs(est - base) <= 2) gst = false;
  }
  const estNote = gst === true ? "incl. 18% GST" : gst === false ? "before GST" : "estimate";

  const hero = heroBand({
    eyebrow: "Team cards · request received",
    title: `We've received your request for ${cards}`,
    sub: "Nothing to pay yet. We'll confirm the details with you and send one GST invoice for the whole order.",
    aside: est ? { label: "Estimate", value: inr(est), sub: estNote } : { label: "Cards", value: qtyText },
    chips: [company, bundle, ref ? `Request ${ref}` : ""].filter(Boolean).map((c) => darkChip(esc(c))),
  });

  const tiles = [
    { label: "Cards", value: esc(qtyText), sub: bundle ? esc(bundle) : undefined },
    ...(per ? [{ label: "Per card", value: esc(inr(per)), sub: "per year, before GST" }] : []),
    ...(est ? [{ label: "Estimate", value: esc(inr(est)), sub: esc(estNote) }] : []),
  ];

  const bodyHtml =
    greet(o.name) +
    p(`Thanks for asking about DigitalCarda for ${company ? strong(company) : "your team"}. Your request has reached our team &mdash; here is what happens next.`) +
    sectionLabel("What happens next") +
    stepRow(1, "We get in touch", esc(`Usually within 24 hours${phone ? `, on ${phone}` : ""}, to confirm the number of cards, the designs and who they're for.`)) +
    stepRow(2, "You get one invoice", "A single GST-compliant invoice for the whole order. Nothing is charged before that.") +
    stepRow(3, "Your team's cards go live", "Once it's paid, we help you set up every card. Each person gets their own link and QR code.") +
    sectionLabel("Your request") +
    statTiles(tiles) +
    spacer(12) +
    infoGrid([
      ["Company", company ? esc(company) : null],
      ["Call back on", phone ? esc(phone) : null],
      ["Reference", ref ? esc(ref) : null],
    ]) +
    (est ? note("The estimate uses our published per-card prices. The final amount is the one on your invoice.") : "") +
    callout("gold", "Save time: get your team list ready",
      `One person per line &mdash; ${strong("name, designation, phone, email")}. If you have an account, you can paste the list straight into Bulk Create Cards.`,
      actionPills([{ label: "Open Bulk Create Cards", href: `${SITE}/dashboard/bulk`, tone: "dark" }])) +
    helpStrip() +
    signoff();

  const text = [
    greetText(o.name), "",
    `Thanks for asking about DigitalCarda for ${company || "your team"}. We've received your request for ${cards}. Nothing to pay yet.`, "",
    "WHAT HAPPENS NEXT",
    `1. We get in touch — usually within 24 hours${phone ? `, on ${phone}` : ""} — to confirm the number of cards, the designs and who they're for.`,
    "2. You get one GST-compliant invoice for the whole order. Nothing is charged before that.",
    "3. Once it's paid, we help you set up every card. Each person gets their own link and QR code.", "",
    "YOUR REQUEST",
    `Cards: ${qtyText}${bundle ? ` (${bundle})` : ""}`,
    ...(per ? [`Per card: ${inr(per)} per year, before GST`] : []),
    ...(est ? [`Estimate: ${inr(est)} (${estNote}) — the final amount is on your invoice`] : []),
    ...(company ? [`Company: ${company}`] : []),
    ...(phone ? [`Call back on: ${phone}`] : []),
    ...(ref ? [`Reference: ${ref}`] : []), "",
    "Save time: get your team list ready — one person per line: name, designation, phone, email.",
    `If you have an account, paste it into Bulk Create Cards: ${SITE}/dashboard/bulk`, "",
    TEXT_HELP, "", "Warm regards,", "Team DigitalCarda",
  ].join("\n");

  return {
    kind: "bulkOrderReceivedEmail",
    subject: `We've received your request for ${cards}`,
    html: layout({
      preheader: "Nothing to pay yet — we'll confirm the details and send one GST invoice for the whole order.",
      hero, bodyHtml, audience: "customer",
      footer: "You're receiving this because you asked for team cards on digitalcarda.in.",
    }),
    text,
  };
}
