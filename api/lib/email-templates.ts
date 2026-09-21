/*
 * Branded, responsive HTML email templates for DigitalCarda.
 * Every template returns { subject, html, text } and shares one layout, so all
 * emails look consistent. Email-client-safe: tables + inline styles only.
 */

const SITE = "https://digitalcarda.in";
const BRAND = {
  gold: "#F7B31C",
  goldDark: "#B45309",
  goldTint: "#FFF8EA",   // warm band behind the hero
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

export interface Email {
  /** Which template produced this — recorded in the email log. */
  kind?: string;
  subject: string;
  html: string;
  text: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

export const inr = (n: unknown) => "₹" + Number(n || 0).toLocaleString("en-IN");

/* ── Shared building blocks ──────────────────────────────────────────────
   Email HTML is 1998 technology: tables, inline styles, no flex/grid, no web
   fonts we can rely on. So the design carries itself on colour blocking,
   spacing, and type hierarchy rather than effects that half the clients drop. */

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif";

/** Primary call to action. Solid gold with a darker keyline so it still reads
    as a button in clients that ignore border-radius. */
function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr>
    <td align="center" bgcolor="${BRAND.gold}" style="border-radius:12px;border-bottom:3px solid ${BRAND.goldDark}">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:15px;font-weight:700;color:#1A1206;text-decoration:none;letter-spacing:.2px">${esc(label)}</a>
    </td></tr></table>`;
}

/** Key/value card with a gold rail — labels above values so long values
    (URLs, emails, passwords) get the full width instead of being squeezed. */
function detailTable(rows: [string, string][], opts: { accentLast?: boolean } = {}): string {
  void opts;
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

/** A single credential value styled for reading aloud / copying. */
function codeValue(v: string): string {
  return `<span style="display:inline-block;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:15px;font-weight:700;color:${BRAND.ink};background:${BRAND.goldTint};border:1px solid ${BRAND.goldLine};border-radius:7px;padding:5px 11px;letter-spacing:.4px">${esc(v)}</span>`;
}

/** Numbered feature row — a gold chip, a title, and one line of plain English. */
function featureRow(n: number, title: string, body: string): string {
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

/** Highlight panel — used for the card link, so it feels like the hero object. */
function linkPanel(label: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0">
    <tr><td align="center" bgcolor="${BRAND.navy}" style="border-radius:14px;padding:22px 24px">
      <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.gold};text-transform:uppercase;letter-spacing:1.1px;margin-bottom:8px">${esc(label)}</div>
      <a href="${esc(url)}" target="_blank" style="font-family:${FONT};font-size:17px;font-weight:700;color:#FFFFFF;text-decoration:none;word-break:break-all">${esc(url.replace(/^https:\/\//, ""))}</a>
    </td></tr>
  </table>`;
}

/** Soft note / caveat line. */
function note(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr><td style="background:${BRAND.soft};border-radius:10px;padding:13px 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${BRAND.body}">${html}</td></tr>
  </table>`;
}


/** Their actual card, as a tappable picture. Remote images are blocked by
    default in some clients, so the link panel below it always repeats the URL. */
function cardPreview(slug: string, alt: string): string {
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

/** Short list of plain-English pointers, ticked. Not numbered — these are
    alternatives, not steps, and fake ordering reads as filler. */
function tickList(label: string, items: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
    <tr><td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border-radius:14px;padding:18px 20px 6px">
      <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1px;padding-bottom:6px">${esc(label)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${items.map((t) => `<tr>
          <td width="24" valign="top" style="padding:8px 0 8px;font-family:${FONT};font-size:14px;font-weight:800;color:${BRAND.goldDark};line-height:1.6">&check;</td>
          <td valign="top" style="padding:8px 0 8px;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.body}">${t}</td>
        </tr>`).join("")}
      </table>
    </td></tr>
  </table>`;
}

/** Wrap content in the branded shell. `accent` sets the header strip mood.
    `footer` overrides the default account-email footer line. `hero` replaces
    the standard badge + heading band with custom rows (the owner alerts). */
function layout(opts: { preheader: string; badge?: string; heading: string; bodyHtml: string; accent?: string; footer?: string; hero?: string }): string {
  const accent = opts.accent || BRAND.gold;
  const footerLine = opts.footer ?? "You're receiving this because you have a DigitalCarda account.";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>DigitalCarda</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.page}">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.line}">

        <!-- header -->
        <tr><td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};padding:26px 32px 24px">
          <table role="presentation" width="100%"><tr>
            <td valign="middle">
              <img src="${SITE}/logo.png" width="146" height="46" alt="DigitalCarda"
                   style="display:block;border:0;outline:none;text-decoration:none;height:46px;width:146px;font-family:${FONT};font-size:19px;font-weight:700;color:#FFFFFF">
            </td>
            <td align="right" valign="middle" style="font-family:${FONT};font-size:10.5px;font-weight:600;color:#8FA2BC;text-transform:uppercase;letter-spacing:1.2px">Digital Business Cards</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:3px;background:${accent};line-height:3px;font-size:0">&nbsp;</td></tr>

        <!-- hero -->
        ${opts.hero ?? `<tr><td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};padding:30px 32px 26px;border-bottom:1px solid ${BRAND.goldLine}">
          ${opts.badge ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 13px"><tr>
            <td bgcolor="${BRAND.navy}" style="border-radius:999px;padding:6px 14px;font-family:${FONT};font-size:10px;font-weight:700;color:${BRAND.gold};text-transform:uppercase;letter-spacing:1.2px">${esc(opts.badge)}</td>
          </tr></table>` : ""}
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:800;color:${BRAND.ink};letter-spacing:-.3px">${opts.heading}</h1>
        </td></tr>`}

        <!-- body -->
        <tr><td style="padding:30px 32px 8px">
          <div style="font-family:${FONT};font-size:15px;line-height:1.7;color:${BRAND.body}">${opts.bodyHtml}</div>
        </td></tr>

        <!-- footer -->
        <tr><td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};padding:24px 32px 26px;border-top:1px solid ${BRAND.line}">
          <table role="presentation" width="100%"><tr>
            <td style="font-family:${FONT};font-size:13px;font-weight:700;color:${BRAND.ink}">
              <a href="${SITE}" style="color:${BRAND.ink};text-decoration:none">digitalcarda.in</a>
            </td>
            <td align="right" style="font-family:${FONT};font-size:12px">
              <a href="${SITE}/dashboard" style="color:${BRAND.goldDark};text-decoration:none;font-weight:600">Dashboard</a>
              <span style="color:#C7D0DC">&nbsp;·&nbsp;</span>
              <a href="${SITE}/contact" style="color:${BRAND.goldDark};text-decoration:none;font-weight:600">Support</a>
            </td>
          </tr></table>
          <div style="height:1px;background:${BRAND.line};margin:16px 0 14px;font-size:0;line-height:0">&nbsp;</div>
          <div style="font-family:${FONT};font-size:11.5px;line-height:1.65;color:${BRAND.sub}">
            Your all-in-one digital business card — share it with a link or a QR code.<br>
            ${footerLine}
          </div>
        </td></tr>
      </table>
      <div style="font-family:${FONT};font-size:11px;color:#9FAEC1;padding:18px 0 0">© DigitalCarda · Made by Pacewalk</div>
    </td></tr>
  </table>
</body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
const hi = (name?: string | null) => p(`Hi ${esc(name || "there")},`);

/* ── Templates ───────────────────────────────────────────────────────── */

export function welcomeEmail(o: { name?: string; role?: string }): Email {
  const heading = "Welcome to DigitalCarda 🎉";
  const bodyHtml =
    hi(o.name) +
    p("Your account is ready. You can now create your digital business card, add products &amp; a gallery, capture leads, and share it anywhere with a single link or QR code.") +
    p("Here's how to get started:") +
    `<ul style="margin:0 0 14px;padding-left:20px;color:#334155">
      <li style="margin-bottom:6px">Fill in your business details &amp; logo</li>
      <li style="margin-bottom:6px">Add products, gallery and payment options</li>
      <li style="margin-bottom:6px">Share your card link &amp; start collecting leads</li>
    </ul>` +
    button("Go to your dashboard", `${SITE}/dashboard`);
  return {
    kind: "welcomeEmail",
    subject: "Welcome to DigitalCarda 🎉",
    html: layout({ preheader: "Your DigitalCarda account is ready — let's build your card.", badge: "Welcome", heading, bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nWelcome to DigitalCarda! Your account is ready. Build your digital card, add products & gallery, and start capturing leads.\n\nDashboard: ${SITE}/dashboard`,
  };
}

/* Super-admin hand-off: everything a new customer needs to get started —
   their login, their card link, and a warm welcome. The password is OPTIONAL:
   pass it only when the admin has just set one, and we always tell the customer
   to change it after signing in. */
export function accountDetailsEmail(o: {
  name?: string | null; loginEmail: string; password?: string | null;
  slug?: string | null; company?: string | null;
}): Email {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  const who = o.company || o.name || "your business";

  const rows: [string, string][] = [
    ["Login email", `<a href="mailto:${esc(o.loginEmail)}" style="color:${BRAND.ink};text-decoration:none">${esc(o.loginEmail)}</a>`],
  ];
  if (o.password) rows.push(["Password", codeValue(o.password)]);
  rows.push(["Sign in at", `<a href="${SITE}/login" style="color:${BRAND.goldDark};text-decoration:none">digitalcarda.in/login</a>`]);

  const bodyHtml =
    hi(o.name) +
    p(`Welcome to <strong style="color:${BRAND.ink}">DigitalCarda</strong> — we're delighted to have <strong style="color:${BRAND.ink}">${esc(who)}</strong> on board. Here is your card:`) +
    (o.slug ? cardPreview(o.slug, `${who} — digital business card`) : "") +
    (cardUrl ? linkPanel("Share this link anywhere", cardUrl) : "") +
    tickList("Where to put your link", [
      "In your <strong style=\"color:" + BRAND.ink + "\">WhatsApp Business</strong> profile and status — where most enquiries start.",
      "One line under your name in your <strong style=\"color:" + BRAND.ink + "\">email signature</strong>.",
      "<strong style=\"color:" + BRAND.ink + "\">Print the QR</strong> on your visiting card, packaging or shop counter.",
    ]) +
    `<div style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1px;margin:30px 0 -6px">Your login</div>` +
    detailTable(rows) +
    (o.password ? note(`<strong style="color:${BRAND.ink}">Please change this password</strong> after your first sign-in — under <strong>Dashboard &rarr; Settings</strong>.`) : "") +
    button("Sign in and edit your card", `${SITE}/login`) +
    p(`<span style="font-size:13.5px;color:${BRAND.sub}">Need a hand setting it up? Just reply to this email — a real person will help.</span>`);

  const textLines = [
    `Hi ${o.name || "there"},`, "",
    "Welcome to DigitalCarda! Your digital business card is live and ready to share.", "",
    ...(cardUrl ? [`Your card: ${cardUrl}`, ""] : []),
    "YOUR LOGIN",
    `Email: ${o.loginEmail}`,
    ...(o.password ? [`Password: ${o.password}`, "(Please change it after your first sign-in.)"] : []),
    `Sign in: ${SITE}/login`,
    "", "Need help getting set up? Just reply to this email.", "", "— Team DigitalCarda",
  ];

  return {
    kind: "accountDetailsEmail",
    subject: o.company ? `${o.company} — your digital card is live` : "Your digital card is live",
    html: layout({ preheader: "Your card link, your QR code and your login — everything to get started.", badge: "Welcome aboard", heading: "Your digital card is ready", bodyHtml }),
    text: textLines.join("\n"),
  };
}

/* "What's new" announcement for existing customers. FEATURE_HIGHLIGHTS is the
   single source of truth — the WhatsApp version (src/lib/shareTemplates.ts)
   mirrors the same list, so the two never drift apart. */
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

export function featureUpdateEmail(o: { name?: string | null; slug?: string | null }): Email {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";

  const bodyHtml =
    hi(o.name) +
    p("We've been busy. Your digital card just became a lot more powerful — and a lot easier to edit.") +
    (o.slug ? cardPreview(o.slug, "Your digital business card") : "") +
    (cardUrl ? linkPanel("Same link, same QR code", cardUrl) : "") +
    p("Here's what's new:") +
    `<div style="margin:20px 0 4px">${FEATURE_HIGHLIGHTS.map((f, i) => featureRow(i + 1, f.title, f.body)).join("")}</div>` +
    button("See it in your dashboard", `${SITE}/dashboard/build`) +
    p(`<span style="font-size:13.5px;color:${BRAND.sub}">It's all included in your current plan — nothing extra to pay. Reply to this email if you'd like a quick walkthrough.</span>`);

  const strip = (t: string) => t.replace(/&amp;/g, "&");
  const textLines = [
    `Hi ${o.name || "there"},`, "",
    "Your DigitalCarda card just got a big update. What's new:", "",
    ...FEATURE_HIGHLIGHTS.map((f, i) => `${i + 1}. ${strip(f.title)} — ${strip(f.body)}`),
    "", `See it: ${SITE}/dashboard/build`,
    ...(cardUrl ? [`Your card (same link & QR): ${cardUrl}`] : []),
    "", "All included in your plan. Reply if you'd like a walkthrough.", "", "— Team DigitalCarda",
  ];

  return {
    kind: "featureUpdateEmail",
    subject: "New on your DigitalCarda card ✨ (all included in your plan)",
    html: layout({ preheader: "A brand-new editor, live preview, new designs and more — already in your account.", badge: "Product update", heading: "What's new on DigitalCarda ✨", bodyHtml }),
    text: textLines.join("\n"),
  };
}

/* ── Sent on the CUSTOMER's behalf ─────────────────────────────────────
   When a visitor fills the enquiry form on someone's card, the card owner gets
   a lead notification — but until now the visitor got nothing at all, which
   makes our customer look unresponsive. This is the reply they never had to
   write: it carries the BUSINESS's name and details, not ours. */
export function enquiryAutoReplyEmail(o: {
  visitorName?: string | null; message?: string | null;
  business: string; ownerPhone?: string | null; ownerEmail?: string | null;
  slug?: string | null; whatsapp?: string | null;
}): Email {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  const rows: [string, string][] = [];
  if (o.ownerPhone) rows.push(["Phone", `<a href="tel:${esc(o.ownerPhone)}" style="color:${BRAND.ink};text-decoration:none">${esc(o.ownerPhone)}</a>`]);
  if (o.ownerEmail) rows.push(["Email", `<a href="mailto:${esc(o.ownerEmail)}" style="color:${BRAND.ink};text-decoration:none">${esc(o.ownerEmail)}</a>`]);
  if (o.whatsapp) rows.push(["WhatsApp", `<a href="https://wa.me/${esc(String(o.whatsapp).replace(/\D/g, ""))}" style="color:${BRAND.goldDark};text-decoration:none">Message on WhatsApp</a>`]);

  const bodyHtml =
    hi(o.visitorName) +
    p(`Thank you for getting in touch with <strong style="color:${BRAND.ink}">${esc(o.business)}</strong>. We've received your enquiry and someone will get back to you shortly.`) +
    (o.message ? note(`<span style="font-size:11px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px;display:block;margin-bottom:6px">Your message</span>${esc(o.message)}`) : "") +
    (rows.length ? `<div style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1px;margin:26px 0 -6px">Reach us directly</div>` + detailTable(rows) : "") +
    (cardUrl ? button(`View ${o.business}`, cardUrl) : "");

  return {
    kind: "enquiryAutoReplyEmail",
    subject: `We've received your enquiry — ${o.business}`,
    html: layout({
      preheader: `Thanks for contacting ${o.business}. We'll be in touch shortly.`,
      badge: "Enquiry received", heading: "Thanks for reaching out 🙏", bodyHtml,
      footer: `This confirmation was sent on behalf of ${esc(o.business)}, who use DigitalCarda for their digital business card.`,
    }),
    text: [`Hi ${o.visitorName || "there"},`, "", `Thank you for contacting ${o.business}. We've received your enquiry and will get back to you shortly.`,
      ...(o.message ? ["", `Your message: ${o.message}`] : []),
      ...(o.ownerPhone ? ["", `Phone: ${o.ownerPhone}`] : []),
      ...(o.ownerEmail ? [`Email: ${o.ownerEmail}`] : []),
      ...(cardUrl ? ["", `${o.business}: ${cardUrl}`] : [])].join("\n"),
  };
}

/* Their plan changed (usually because an admin upgraded them). Until now this
   happened silently and the customer only found out by looking. */
export function planUpgradedEmail(o: { name?: string | null; planName: string; validTill?: string | null; slug?: string | null }): Email {
  const rows: [string, string][] = [["Your plan", `<strong style="color:${BRAND.ink}">${esc(o.planName)}</strong>`]];
  if (o.validTill) rows.push(["Valid until", esc(o.validTill)]);
  const bodyHtml =
    hi(o.name) +
    p(`Good news — your DigitalCarda account is now on the <strong style="color:${BRAND.ink}">${esc(o.planName)}</strong> plan. Everything is already active; there's nothing you need to do.`) +
    detailTable(rows) +
    p("Your higher limits apply straight away — more products, gallery images, videos, offers and uploads on your card.") +
    button("Open your dashboard", `${SITE}/dashboard/build`) +
    (o.slug ? note(`Your card stays at <a href="${SITE}/${esc(o.slug)}" style="color:${BRAND.goldDark};text-decoration:none;font-weight:700">digitalcarda.in/${esc(o.slug)}</a> — same link, same QR code.`) : "");
  return {
    kind: "planUpgradedEmail",
    subject: `Your plan is now ${o.planName} 🎉`,
    html: layout({ preheader: `${o.planName} is active on your DigitalCarda account.`, badge: "Plan updated", heading: `You're on ${esc(o.planName)} now 🎉`, bodyHtml }),
    text: [`Hi ${o.name || "there"},`, "", `Your DigitalCarda account is now on the ${o.planName} plan.`,
      ...(o.validTill ? [`Valid until: ${o.validTill}`] : []),
      "", `Dashboard: ${SITE}/dashboard/build`].join("\n"),
  };
}

/* The activation moment: their card just went public. Give them the link, the
   QR, and the two or three things that actually get a card shared. */
export function cardPublishedEmail(o: { name?: string | null; slug: string; company?: string | null }): Email {
  const cardUrl = `${SITE}/${o.slug}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(cardUrl)}`;
  const bodyHtml =
    hi(o.name) +
    p(`${o.company ? `<strong style="color:${BRAND.ink}">${esc(o.company)}</strong> is` : "You're"} live 🎉 Your digital business card is published and ready to share with anyone, anywhere.`) +
    linkPanel("Your card is live at", cardUrl) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0">
      <tr><td align="center" style="border:1px solid ${BRAND.line};border-radius:14px;padding:22px">
        <img src="${qr}" width="180" height="180" alt="QR code for your card" style="display:block;border:0;border-radius:10px">
        <div style="font-family:${FONT};font-size:12.5px;color:${BRAND.sub};padding-top:12px">Save this QR — print it on your card, shop board or invoice.<br>Every scan opens your card.</div>
      </td></tr>
    </table>` +
    `<div style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1px;margin:26px 0 4px">Get your first enquiries</div>` +
    featureRow(1, "Set it as your WhatsApp link", "Put your card link in your WhatsApp Business profile and status — it's the fastest source of enquiries.") +
    featureRow(2, "Add it to your email signature", "One line under your name turns every email you send into a shopfront.") +
    featureRow(3, "Print the QR where customers stand", "Reception, counter, packaging, visiting cards, vehicle — anywhere a phone camera can reach.") +
    button("Share your card", `${SITE}/dashboard/qr`);
  return {
    kind: "cardPublishedEmail",
    subject: "🎉 Your digital card is live",
    html: layout({ preheader: `Your card is live at digitalcarda.in/${o.slug} — here's your QR code.`, badge: "You're live", heading: "Your card is live 🎉", bodyHtml }),
    text: [`Hi ${o.name || "there"},`, "", `Your digital business card is live: ${cardUrl}`, "",
      "Get your first enquiries:", "1. Put the link in your WhatsApp Business profile & status",
      "2. Add it to your email signature", "3. Print the QR where customers stand", "",
      `Share it: ${SITE}/dashboard/qr`].join("\n"),
  };
}

/* Monthly retention digest — the numbers a card owner actually cares about. */
export function monthlyDigestEmail(o: {
  name?: string | null; month: string; slug?: string | null;
  views: number; leads: number; saves?: number; topProduct?: string | null;
}): Email {
  const stat = (n: number | string, label: string) => `
    <td align="center" width="33%" style="padding:18px 8px;background:${BRAND.soft};border-radius:12px">
      <div style="font-family:${FONT};font-size:28px;font-weight:800;color:${BRAND.ink};line-height:1.1">${esc(String(n))}</div>
      <div style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px;padding-top:5px">${esc(label)}</div>
    </td>`;
  const bodyHtml =
    hi(o.name) +
    p(`Here's how your digital card performed in <strong style="color:${BRAND.ink}">${esc(o.month)}</strong>.`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0">
      <tr>${stat(o.views.toLocaleString("en-IN"), "Card views")}<td width="10"></td>${stat(o.leads.toLocaleString("en-IN"), "Enquiries")}<td width="10"></td>${stat((o.saves ?? 0).toLocaleString("en-IN"), "Contacts saved")}</tr>
    </table>` +
    (o.topProduct ? note(`Your most-viewed item was <strong style="color:${BRAND.ink}">${esc(o.topProduct)}</strong> — worth featuring first on your card.`) : "") +
    (o.leads === 0
      ? p("No enquiries yet this month? Share your card link on WhatsApp and add your QR where customers can see it — that's where most enquiries start.")
      : p("Keep it going: add a fresh photo or offer this month so returning visitors see something new.")) +
    button("Open your dashboard", `${SITE}/dashboard`) +
    (o.slug ? p(`<span style="font-size:13.5px;color:${BRAND.sub}">Your card: <a href="${SITE}/${esc(o.slug)}" style="color:${BRAND.goldDark};text-decoration:none">digitalcarda.in/${esc(o.slug)}</a></span>`) : "");
  return {
    kind: "monthlyDigestEmail",
    subject: `Your card in ${o.month}: ${o.views.toLocaleString("en-IN")} views, ${o.leads} enquiries`,
    html: layout({ preheader: `${o.views} views and ${o.leads} enquiries in ${o.month}.`, badge: "Monthly report", heading: `Your ${esc(o.month)} report 📊`, bodyHtml }),
    text: [`Hi ${o.name || "there"},`, "", `Your card in ${o.month}:`,
      `- Views: ${o.views}`, `- Enquiries: ${o.leads}`, `- Contacts saved: ${o.saves ?? 0}`,
      "", `Dashboard: ${SITE}/dashboard`].join("\n"),
  };
}

/* Gentle nudge for a card nobody has touched in a while. */
export function dormantCardEmail(o: { name?: string | null; slug?: string | null; days: number }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your digital card hasn't changed in about ${o.days} days — and a card that looks current gets far more enquiries than one that looks abandoned.`) +
    `<div style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1px;margin:24px 0 4px">Three quick wins</div>` +
    featureRow(1, "Add a recent photo or two", "New work in your gallery is the easiest way to look active.") +
    featureRow(2, "Put up one offer", "A simple limited-time offer gives visitors a reason to call today.") +
    featureRow(3, "Check your details are current", "Phone, address and timings — the things people actually came for.") +
    button("Update your card", `${SITE}/dashboard/build`) +
    (o.slug ? p(`<span style="font-size:13.5px;color:${BRAND.sub}">It takes two minutes, and your link stays exactly the same: digitalcarda.in/${esc(o.slug)}</span>`) : "");
  return {
    kind: "dormantCardEmail",
    subject: "Your card could use a refresh ✨",
    html: layout({ preheader: "A couple of quick updates keep your card working for you.", badge: "Quick nudge", heading: "Time for a quick refresh ✨", bodyHtml }),
    text: [`Hi ${o.name || "there"},`, "", `Your card hasn't changed in about ${o.days} days.`, "",
      "Three quick wins: add recent photos, put up one offer, check your contact details are current.", "",
      `Update it: ${SITE}/dashboard/build`].join("\n"),
  };
}

/* Ask a happy customer for a public review. Sent manually, never on a timer. */
export function reviewRequestEmail(o: { name?: string | null; reviewUrl?: string | null }): Email {
  const url = o.reviewUrl || "https://g.page/r/digitalcarda/review";
  const bodyHtml =
    hi(o.name) +
    p("We hope your digital card is bringing you enquiries. If it's been useful, would you take a minute to leave us a review?") +
    p(`<span style="font-size:13.5px;color:${BRAND.sub}">Reviews from real business owners are how other small businesses decide whether to trust us — it genuinely helps.</span>`) +
    button("Write a review", url) +
    note("Not happy with something? Reply to this email instead and we'll put it right — we'd much rather fix it than read about it later.");
  return {
    kind: "reviewRequestEmail",
    subject: "Would you review DigitalCarda?",
    html: layout({ preheader: "If your card has been useful, a quick review would mean a lot.", badge: "A small favour", heading: "Would you share your experience? ⭐", bodyHtml }),
    text: [`Hi ${o.name || "there"},`, "", "If DigitalCarda has been useful, would you leave us a quick review?", "", url, "",
      "Not happy with something? Reply to this email and we'll put it right."].join("\n"),
  };
}

export function leadNotificationEmail(o: { name: string; email?: string | null; contact?: string | null; message?: string | null; slug?: string | null; cardName?: string | null }): Email {
  const label = o.cardName || o.slug || "your card";
  const bodyHtml =
    p(`You just received a new enquiry on <strong>${esc(label)}</strong>.`) +
    detailTable([
      ["Name", esc(o.name || "—")],
      ["Email", o.email ? `<a href="mailto:${esc(o.email)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.email)}</a>` : "—"],
      ["Phone", o.contact ? `<a href="tel:${esc(o.contact)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.contact)}</a>` : "—"],
      ["Message", esc(o.message || "—").replace(/\n/g, "<br>")],
    ]) +
    (o.slug ? button("View card", `${SITE}/${esc(o.slug)}`) : "");
  return {
    kind: "leadNotificationEmail",
    subject: `New lead: ${o.name || "Enquiry"} — ${label}`,
    html: layout({ preheader: `New enquiry from ${o.name} on ${label}`, badge: "New Lead", heading: "You've got a new lead 🎯", bodyHtml, accent: "#22C55E" }),
    text: `New lead on ${label}\n\nName: ${o.name}\nEmail: ${o.email || "—"}\nPhone: ${o.contact || "—"}\nMessage: ${o.message || "—"}`,
  };
}

export function hotLeadEmail(o: { name: string; email?: string | null; contact?: string | null; message?: string | null; slug?: string | null; cardName?: string | null }): Email {
  const label = o.cardName || o.slug || "your card";
  const bodyHtml =
    p(`<strong style="color:#EA580C">This looks like a high-intent lead</strong> — reach out fast. Enquiry on <strong>${esc(label)}</strong>:`) +
    detailTable([
      ["Name", esc(o.name || "—")],
      ["Email", o.email ? `<a href="mailto:${esc(o.email)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.email)}</a>` : "—"],
      ["Phone", o.contact ? `<a href="tel:${esc(o.contact)}" style="color:${BRAND.goldDark};text-decoration:none">${esc(o.contact)}</a>` : "—"],
      ["Message", esc(o.message || "—").replace(/\n/g, "<br>")],
    ]) +
    (o.contact ? button("Call now", `tel:${esc(o.contact)}`) : o.slug ? button("View card", `${SITE}/${esc(o.slug)}`) : "");
  return {
    kind: "hotLeadEmail",
    subject: `🔥 Hot lead: ${o.name || "Enquiry"} — ${label}`,
    html: layout({ preheader: `High-intent enquiry from ${o.name} — respond fast`, badge: "🔥 Hot Lead", heading: "🔥 Hot lead — respond fast", bodyHtml, accent: "#EA580C" }),
    text: `HOT LEAD on ${label}\n\nName: ${o.name}\nEmail: ${o.email || "—"}\nPhone: ${o.contact || "—"}\nMessage: ${o.message || "—"}`,
  };
}

export function paymentSubmittedEmail(o: { name?: string; planName: string; amount: number; reference: string; method?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`We've received your payment details for the <strong>${esc(o.planName)}</strong> plan. Our team is verifying it now — your plan activates as soon as it's confirmed (usually within a few hours).`) +
    detailTable([
      ["Plan", esc(o.planName)],
      ["Method", esc((o.method || "").toUpperCase() || "—")],
      ["Reference", esc(o.reference)],
      ["Amount", inr(o.amount)],
    ], { accentLast: true }) +
    p(`We'll email you the moment it's verified.`);
  return {
    kind: "paymentSubmittedEmail",
    subject: `Payment received — ${o.planName} (under review)`,
    html: layout({ preheader: "We're verifying your payment — plan activates shortly.", badge: "Payment · Pending", heading: "Payment received ⏳", bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nWe received your ${o.planName} payment (ref ${o.reference}, ${inr(o.amount)}). It's under verification and your plan activates once confirmed.`,
  };
}

export function paymentToVerifyAdminEmail(o: { name?: string; email?: string; planName: string; amount: number; reference: string; method?: string }): Email {
  const bodyHtml =
    p(`A customer submitted a manual payment that needs your verification.`) +
    detailTable([
      ["Customer", esc(o.name || "—")],
      ["Email", esc(o.email || "—")],
      ["Plan", esc(o.planName)],
      ["Method", esc((o.method || "").toUpperCase() || "—")],
      ["Reference", esc(o.reference)],
      ["Amount", inr(o.amount)],
    ], { accentLast: true }) +
    button("Review in admin", `${SITE}/admin/payments`);
  return {
    kind: "paymentToVerifyAdminEmail",
    subject: `Payment to verify: ${o.planName} — ${inr(o.amount)}`,
    html: layout({ preheader: `${o.name} submitted a ${o.planName} payment to verify.`, badge: "Action needed", heading: "New payment to verify 🔎", bodyHtml, accent: "#3B82F6" }),
    text: `New payment to verify.\n\nCustomer: ${o.name} (${o.email})\nPlan: ${o.planName}\nRef: ${o.reference}\nAmount: ${inr(o.amount)}\n\nReview: ${SITE}/admin/payments`,
  };
}

export function paymentVerifiedEmail(o: { name?: string; planName: string; amount: number; billingCycle?: string; invoiceNo: string; validTill: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your payment is verified and your <strong>${esc(o.planName)}</strong> plan is now <strong>active</strong> — your card is live and every feature is unlocked. 🎉`) +
    `<p style="margin:18px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.5px">Invoice</p>` +
    detailTable([
      ["Invoice no.", esc(o.invoiceNo)],
      ["Plan", esc(o.planName)],
      ["Billing", esc((o.billingCycle || "").replace(/^\w/, (m) => m.toUpperCase()) || "—")],
      ["Valid till", esc(o.validTill)],
      ["Amount paid", inr(o.amount)],
    ], { accentLast: true }) +
    button("Open dashboard", `${SITE}/dashboard`);
  return {
    kind: "paymentVerifiedEmail",
    subject: `Payment confirmed — ${o.planName} is active 🎉`,
    html: layout({ preheader: `Your ${o.planName} plan is active. Invoice ${o.invoiceNo}.`, badge: "Payment · Confirmed", heading: "You're all set 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour ${o.planName} plan is active.\nInvoice: ${o.invoiceNo}\nValid till: ${o.validTill}\nAmount: ${inr(o.amount)}\n\nDashboard: ${SITE}/dashboard`,
  };
}

export function paymentRejectedEmail(o: { name?: string; planName: string; note?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`We couldn't verify your <strong>${esc(o.planName)}</strong> payment.${o.note ? ` <br><br><em style="color:${BRAND.sub}">Reason: ${esc(o.note)}</em>` : ""}`) +
    p("Please double-check the payment reference and submit again — or reply to this email and we'll help sort it out.") +
    button("Try again", `${SITE}/dashboard/subscription`);
  return {
    kind: "paymentRejectedEmail",
    subject: `Couldn't verify your ${o.planName} payment`,
    html: layout({ preheader: "We couldn't verify your payment — please try again.", badge: "Payment · Action needed", heading: "Payment not verified", bodyHtml, accent: "#EF4444" }),
    text: `Hi ${o.name || "there"},\n\nWe couldn't verify your ${o.planName} payment.${o.note ? ` Reason: ${o.note}.` : ""} Please check the reference and try again: ${SITE}/dashboard/subscription`,
  };
}

export function verifyEmailAddressEmail(o: { name?: string; link: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Thanks for joining <strong>DigitalCarda</strong>! Please confirm this is your email address — it secures your account and lets us send you important updates about your card, leads and plan.") +
    button("Verify my email", o.link) +
    `<div style="margin:8px 0 6px;padding:12px 14px;background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:12px">
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:${BRAND.sub}">Button not working? Paste this link into your browser:</p>
      <a href="${esc(o.link)}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.goldDark};text-decoration:none;word-break:break-all">${esc(o.link)}</a>
    </div>` +
    p(`<span style="color:${BRAND.sub};font-size:13px">This link expires in 3 days. If you didn't create a DigitalCarda account, you can safely ignore this email.</span>`);
  return {
    kind: "verifyEmailAddressEmail",
    subject: "Verify your email — DigitalCarda",
    html: layout({ preheader: "Confirm your email to secure your DigitalCarda account.", badge: "Verify email", heading: "Confirm your email address ✅", bodyHtml, accent: "#3B82F6" }),
    text: `Hi ${o.name || "there"},\n\nWelcome to DigitalCarda! Confirm your email to secure your account:\n${o.link}\n\nThis link expires in 3 days. If you didn't sign up, ignore this email.`,
  };
}

export function passwordChangedEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("This is a confirmation that your DigitalCarda account password was just changed.") +
    p(`If this was you, no action is needed. <strong>If you didn't change it</strong>, reset your password immediately and contact us.`) +
    button("Secure your account", `${SITE}/dashboard/settings`);
  return {
    kind: "passwordChangedEmail",
    subject: "Your password was changed",
    html: layout({ preheader: "Your DigitalCarda password was just changed.", badge: "Security", heading: "Password changed 🔒", bodyHtml, accent: "#3B82F6" }),
    text: `Hi ${o.name || "there"},\n\nYour DigitalCarda password was just changed. If this wasn't you, reset it immediately: ${SITE}/dashboard/settings`,
  };
}

export function passwordResetEmail(o: { name?: string; link: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("We received a request to reset your DigitalCarda password. Click below to choose a new one — this link expires in 60 minutes.") +
    button("Reset password", o.link) +
    p(`<span style="color:${BRAND.sub};font-size:13px">If you didn't request this, you can safely ignore this email — your password stays the same.</span>`);
  return {
    kind: "passwordResetEmail",
    subject: "Reset your DigitalCarda password",
    html: layout({ preheader: "Reset your password — link expires in 60 minutes.", badge: "Security", heading: "Reset your password", bodyHtml, accent: "#3B82F6" }),
    text: `Hi ${o.name || "there"},\n\nReset your DigitalCarda password (link expires in 60 min): ${o.link}\n\nDidn't request this? Ignore this email.`,
  };
}

export function trialEndingEmail(o: { name?: string; daysLeft: number; cardUrl?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your free trial ends in <strong style="color:${BRAND.goldDark}">${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}</strong>. After that your card is paused and won't be visible to visitors.`) +
    p("Upgrade now to keep your card live, keep capturing leads, and unlock every feature — plus a limited-time discount waiting on your dashboard.") +
    button("Upgrade & keep my card live", `${SITE}/dashboard/subscription`);
  return {
    kind: "trialEndingEmail",
    subject: `⏳ Your card goes offline in ${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}`,
    html: layout({ preheader: `Only ${o.daysLeft} day(s) left on your trial — upgrade to stay live.`, badge: "Trial ending", heading: `${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"} left on your trial ⏳`, bodyHtml, accent: BRAND.gold }),
    text: `Hi ${o.name || "there"},\n\nYour trial ends in ${o.daysLeft} day(s) — after that your card is paused. Upgrade to stay live: ${SITE}/dashboard/subscription`,
  };
}

/* ── Owner / admin alerts ────────────────────────────────────────────── */

/* Owner alerts are read on a phone between other work. So they open on a
   dark "who / how much" band, put every way to reach the person one tap away,
   and only then list the detail. Same rules as above: tables, inline styles,
   solid colours (no rgba — Outlook drops it), nothing that needs a web font. */

const ON_DARK = { text: "#FFFFFF", sub: "#93A4BD", chip: "#1C2F4D", chipLine: "#2A4166", chipText: "#DCE4EF" };
const TONE = {
  green: { solid: "#16A34A", tint: "#ECFDF3", line: "#B7EBC9", text: "#14532D" },
  amber: { solid: "#F59E0B", tint: "#FFF8E6", line: "#F8DC9B", text: "#78350F" },
};

const IST = "Asia/Kolkata";
/** "Sun, 21 Sept, 3:42 pm" in India time, whatever the server clock's zone. */
const whenIst = (d: Date) => d.toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const dayIst = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

/** wa.me wants the full number, digits only: 10-digit Indian numbers get 91. */
function waNumber(phone?: string | null): string | null {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
const waLink = (phone: string | null | undefined, message: string) => {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : null;
};
const telLink = (phone?: string | null) => { const n = waNumber(phone); return n ? `tel:+${n}` : null; };
/** "+91 90000 01234" for Indian mobiles; anything else as typed. */
const showPhone = (phone: string) => { const n = waNumber(phone); return n && n.length === 12 && n.startsWith("91") ? `+91 ${n.slice(2, 7)} ${n.slice(7)}` : phone; };
const phoneLink = (phone: string) => { const t = telLink(phone); return t ? inkLink(t, showPhone(phone)) : esc(phone); };

/** Small uppercase heading for each block of an alert. */
function sectionLabel(t: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 12px"><tr>
    <td width="18" style="width:18px;padding:0 8px 0 0"><div style="height:2px;width:18px;background:${BRAND.gold};font-size:0;line-height:0">&nbsp;</div></td>
    <td style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${BRAND.goldDark};text-transform:uppercase;letter-spacing:1.3px;white-space:nowrap">${esc(t)}</td>
  </tr></table>`;
}

/** Pill on the dark hero band. */
const darkChip = (html: string, fg = ON_DARK.chipText) =>
  `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 11px;border-radius:999px;background:${ON_DARK.chip};border:1px solid ${ON_DARK.chipLine};font-family:${FONT};font-size:11.5px;font-weight:700;color:${fg};line-height:1.2;white-space:nowrap">${html}</span>`;

/** Two to three figures side by side. Values are trusted HTML; labels are text. */
function statTiles(tiles: { label: string; value: string; sub?: string }[]): string {
  const w = Math.floor(100 / tiles.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr>
    ${tiles.map((t, i) => `<td width="${w}%" valign="top" style="padding:0 ${i < tiles.length - 1 ? 8 : 0}px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:14px;padding:14px 14px 13px">
          <div style="font-family:${FONT};font-size:10px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px">${esc(t.label)}</div>
          <div style="font-family:${FONT};font-size:21px;font-weight:800;color:${BRAND.ink};letter-spacing:-.4px;line-height:1.25;padding-top:5px">${t.value}</div>
          ${t.sub ? `<div style="font-family:${FONT};font-size:11.5px;line-height:1.45;color:${BRAND.sub};padding-top:2px">${t.sub}</div>` : ""}
        </td></tr></table>
    </td>`).join("")}
  </tr></table>`;
}

/** Tap-to-act buttons that wrap on a narrow screen. Links without a target are skipped. */
function actionPills(actions: { label: string; href: string | null; tone?: "whatsapp" | "dark" | "light" }[]): string {
  const tones = {
    whatsapp: { bg: "#25D366", fg: "#FFFFFF", bd: "#1FAF55" },
    dark: { bg: BRAND.navy, fg: "#FFFFFF", bd: BRAND.navyDeep },
    light: { bg: "#FFFFFF", fg: BRAND.ink, bd: "#D5DDE8" },
  };
  const live = actions.filter((a): a is { label: string; href: string; tone?: "whatsapp" | "dark" | "light" } => !!a.href);
  if (!live.length) return "";
  return `<div style="margin:0 0 4px">${live.map((a) => {
    const t = tones[a.tone || "light"];
    return `<a href="${esc(a.href)}" target="_blank" style="display:inline-block;margin:0 8px 9px 0;padding:11px 17px;border-radius:999px;background:${t.bg};border:1px solid ${t.bd};font-family:${FONT};font-size:13.5px;font-weight:700;color:${t.fg};text-decoration:none;line-height:1.1;white-space:nowrap">${esc(a.label)}</a>`;
  }).join("")}</div>`;
}

/** Label | value rows — denser than detailTable, for alerts with many facts.
    Values are trusted HTML (callers escape); rows with an empty value drop out. */
function infoGrid(rows: [string, string | null | undefined][]): string {
  const live = rows.filter((r): r is [string, string] => !!r[1]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">
    ${live.map(([k, v], i) => `<tr>
      <td width="34%" valign="top" style="padding:12px 10px 12px 18px;${i < live.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}font-family:${FONT};font-size:12px;font-weight:600;color:${BRAND.sub}">${esc(k)}</td>
      <td valign="top" style="padding:12px 18px 12px 0;${i < live.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}font-family:${FONT};font-size:14px;font-weight:600;line-height:1.5;color:${BRAND.ink};word-break:break-word">${v}</td>
    </tr>`).join("")}
  </table>`;
}

const inkLink = (href: string, label: string) =>
  `<a href="${esc(href)}" target="_blank" style="color:${BRAND.ink};text-decoration:none;border-bottom:1px solid ${BRAND.goldLine}">${esc(label)}</a>`;
const mutedSpan = (t: string) => `<span style="color:${BRAND.sub};font-weight:500">${t}</span>`;

/** A coloured "what to do now" panel. */
function callout(tone: keyof typeof TONE, title: string, bodyHtml: string, actionsHtml = ""): string {
  const t = TONE[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0">
    <tr><td bgcolor="${t.tint}" style="background:${t.tint};border:1px solid ${t.line};border-left:5px solid ${t.solid};border-radius:14px;padding:18px 20px 12px">
      <div style="font-family:${FONT};font-size:16px;font-weight:800;color:${t.text};letter-spacing:-.2px">${title}</div>
      <div style="font-family:${FONT};font-size:13.5px;line-height:1.6;color:${BRAND.body};padding:5px 0 12px">${bodyHtml}</div>
      ${actionsHtml}
    </td></tr>
  </table>`;
}

/* ── New signup ─────────────────────────────────────────────────────────── */

export type SignupAlert = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  /** Google profile photo, when they signed up with Google. */
  photo?: string | null;
  method: "email" | "google";
  emailVerified: boolean;
  business?: string | null;
  /** Their new card's slug (null if provisioning failed). */
  slug?: string | null;
  trial?: { days: number; endsAt: Date; voucher?: string | null } | null;
  /** The template chosen before signing up, if any. */
  template?: { name: string; image?: string | null; url?: string | null } | null;
  colour?: string | null;
  aiDraft?: boolean;
  referral?: { name: string; code: string } | null;
  place?: string | null;
  device?: string | null;
  /** The page the signup form was on, e.g. /signup?product=bloom-profile-card */
  page?: string | null;
  counts?: { today: number; month: number; total: number } | null;
  at?: Date;
};

export function newSignupAdminEmail(o: SignupAlert): Email {
  const at = o.at ?? new Date();
  const first = (o.name || "").trim().split(/\s+/)[0] || "there";
  const cardUrl = o.slug ? `${SITE}/${encodeURIComponent(o.slug)}` : null;
  const photo = safeUrl(o.photo);
  const colour = o.colour && /^#[0-9a-f]{6}$/i.test(o.colour) ? o.colour : null;
  const via = o.method === "google" ? "Google" : "email";

  const avatar = photo
    ? `<img src="${esc(photo)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:50%;border:3px solid ${BRAND.gold};object-fit:cover">`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="64" height="64" align="center" valign="middle" bgcolor="${BRAND.gold}" style="width:64px;height:64px;border-radius:50%;font-family:${FONT};font-size:26px;font-weight:800;color:${BRAND.navyDeep}">${esc(first.charAt(0).toUpperCase() || "?")}</td></tr></table>`;

  const hero = `<tr><td bgcolor="${BRAND.navyDeep}" style="background:${BRAND.navyDeep};padding:28px 32px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="80" valign="top" style="width:80px;padding-top:2px">${avatar}</td>
      <td valign="top">
        <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${TONE.green.solid};text-transform:uppercase;letter-spacing:1.4px">&#9679;&nbsp; New signup &nbsp;<span style="color:${ON_DARK.sub};font-weight:600;letter-spacing:.4px;text-transform:none">${esc(whenIst(at))}</span></div>
        <div style="font-family:${FONT};font-size:27px;line-height:1.2;font-weight:800;color:${ON_DARK.text};letter-spacing:-.4px;padding-top:7px">${esc(o.name || o.email)}</div>
        ${o.business ? `<div style="font-family:${FONT};font-size:15px;font-weight:700;color:${BRAND.gold};padding-top:4px">${esc(o.business)}</div>` : ""}
        <div style="padding-top:14px">
          ${darkChip(`Signed up with ${via}`)}${darkChip(o.emailVerified ? "&#10003; Email verified" : "Email not verified yet", o.emailVerified ? "#86EFAC" : "#FCD34D")}${o.place ? darkChip(`&#9906; ${esc(o.place)}`) : ""}${o.referral ? darkChip(`Referred by ${esc(o.referral.name)}`, "#C4B5FD") : ""}
        </div>
      </td>
    </tr></table>
  </td></tr>`;

  const tiles: { label: string; value: string; sub?: string }[] = [];
  if (o.trial) tiles.push({ label: "Trial ends", value: esc(dayIst(o.trial.endsAt)), sub: `${o.trial.days}-day free trial${o.trial.voucher ? ` · ${esc(o.trial.voucher)}` : ""}` });
  if (o.counts) {
    tiles.push({ label: "Signups today", value: o.counts.today.toLocaleString("en-IN"), sub: `${o.counts.month.toLocaleString("en-IN")} this month` });
    tiles.push({ label: "Customers", value: o.counts.total.toLocaleString("en-IN"), sub: "all time" });
  }

  const waHello = waLink(o.phone, `Hi ${first}, this is the DigitalCarda team 👋 Thanks for signing up!${cardUrl ? ` Your card is already live at ${cardUrl.replace(/^https:\/\//, "")}.` : ""} Would you like a hand setting it up?`);
  const reach = actionPills([
    { label: "WhatsApp", href: waHello, tone: "whatsapp" },
    { label: "Call", href: telLink(o.phone), tone: "dark" },
    { label: "Email", href: `mailto:${o.email}?subject=${encodeURIComponent("Welcome to DigitalCarda")}` },
    { label: "Open their card", href: cardUrl },
  ]);

  const picked = o.template || colour || o.aiDraft
    ? sectionLabel("What they picked before signing up") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF"><tr>
        ${o.template && safeUrl(o.template.image) ? `<td width="132" valign="top" style="width:132px;padding:14px 0 14px 14px">
          <img src="${esc(o.template.image)}" width="118" alt="${esc(o.template.name)}" style="display:block;width:118px;height:auto;border-radius:10px;border:1px solid ${BRAND.line};background:${BRAND.soft}">
        </td>` : ""}
        <td valign="middle" style="padding:16px 18px">
          ${o.template ? `<div style="font-family:${FONT};font-size:10px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px">Template</div>
          <div style="font-family:${FONT};font-size:16px;font-weight:800;color:${BRAND.ink};padding:3px 0 10px">${o.template.url ? inkLink(o.template.url, o.template.name) : esc(o.template.name)}</div>` : ""}
          ${colour ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px"><tr>
            <td width="18" height="18" bgcolor="${colour}" style="width:18px;height:18px;border-radius:5px;border:1px solid ${BRAND.line};font-size:0;line-height:0">&nbsp;</td>
            <td style="padding-left:8px;font-family:${FONT};font-size:13px;color:${BRAND.body}">Colour <span style="font-family:'SF Mono',Menlo,Consolas,monospace;color:${BRAND.ink}">${colour.toUpperCase()}</span></td>
          </tr></table>` : ""}
          ${o.aiDraft ? `<div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${BRAND.body}">&#10022; Brought a draft from the <strong style="color:${BRAND.ink}">AI Card Generator</strong>, so their card already has text.</div>` : ""}
        </td>
      </tr></table>`
    : "";

  const bodyHtml =
    (tiles.length ? statTiles(tiles) : "") +
    sectionLabel("Say hello") +
    p(`<span style="font-size:14px">A short message while they're still setting up is the easiest way to help them finish their card.</span>`) +
    reach +
    sectionLabel("Account") +
    infoGrid([
      ["Email", inkLink(`mailto:${o.email}`, o.email)],
      ["Phone", o.phone ? phoneLink(o.phone) : mutedSpan("Not given")],
      ["Business", o.business ? esc(o.business) : mutedSpan("Not given")],
      ["Card link", cardUrl ? inkLink(cardUrl, cardUrl.replace(/^https:\/\//, "")) : mutedSpan("Not created — check the admin")],
      ["Account", `#${o.id} ${mutedSpan("· customer")}`],
    ]) +
    sectionLabel("Where they came from") +
    infoGrid([
      ["Location", o.place ? esc(o.place) : mutedSpan("Unknown")],
      ["Device", o.device ? esc(o.device) : null],
      ["Signup page", o.page ? `<span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12.5px">${esc(o.page)}</span>` : null],
      ["Referred by", o.referral ? `${esc(o.referral.name)} ${mutedSpan(`· code ${esc(o.referral.code)}`)}` : null],
      ["Signed up", esc(whenIst(at))],
    ]) +
    picked +
    (o.slug ? sectionLabel("Their card right now") + cardPreview(o.slug, `${o.name}'s card`) : "") +
    button("Open in admin", `${SITE}/admin/customers?q=${encodeURIComponent(o.email)}`);

  const subjectBits = [o.name || o.email, o.business, o.place].filter(Boolean);
  return {
    kind: "newSignupAdminEmail",
    subject: `New signup: ${subjectBits.join(" · ")}`,
    html: layout({
      preheader: `${o.name || o.email}${o.business ? ` (${o.business})` : ""} just started a free trial${o.place ? ` from ${o.place}` : ""}.`,
      heading: "New signup", hero, bodyHtml, accent: TONE.green.solid,
      footer: "You're receiving this because you run DigitalCarda. Owner alerts go to the admin address in Settings.",
    }),
    text: [
      `New signup: ${o.name || o.email}${o.business ? ` (${o.business})` : ""}`, "",
      `Email: ${o.email}${o.emailVerified ? " (verified)" : " (not verified yet)"}`,
      `Phone: ${o.phone || "not given"}`,
      `Signed up with: ${via}, ${whenIst(at)}`,
      ...(cardUrl ? [`Card: ${cardUrl}`] : []),
      ...(o.trial ? [`Trial: ${o.trial.days} days, ends ${dayIst(o.trial.endsAt)}${o.trial.voucher ? ` (${o.trial.voucher})` : ""}`] : []),
      ...(o.place ? [`Location: ${o.place}`] : []),
      ...(o.device ? [`Device: ${o.device}`] : []),
      ...(o.page ? [`Signup page: ${o.page}`] : []),
      ...(o.referral ? [`Referred by: ${o.referral.name} (code ${o.referral.code})`] : []),
      ...(o.template ? [`Template: ${o.template.name}`] : []),
      ...(o.counts ? ["", `Signups today: ${o.counts.today} · this month: ${o.counts.month} · customers: ${o.counts.total}`] : []),
      "", `Admin: ${SITE}/admin/customers?q=${encodeURIComponent(o.email)}`,
    ].join("\n"),
  };
}

export function referralSignupAdminEmail(o: { newUserName?: string; newUserEmail?: string; referrerName?: string; code?: string }): Email {
  const bodyHtml =
    p(`Someone joined through the <strong>Refer &amp; Earn</strong> program.`) +
    detailTable([
      ["New user", esc(o.newUserName || "—")],
      ["Email", esc(o.newUserEmail || "—")],
      ["Referred by", esc(o.referrerName || "—")],
      ["Referral code", esc(o.code || "—")],
    ]) +
    p(`<span style="color:${BRAND.sub};font-size:13px">The referrer earns a reward once this user upgrades to a paid plan.</span>`);
  return {
    kind: "referralSignupAdminEmail",
    subject: `Referral signup: ${o.newUserName || "New user"} (via ${o.referrerName || o.code || "referral"})`,
    html: layout({ preheader: `${o.newUserName} joined via ${o.referrerName}'s referral.`, badge: "Referral", heading: "New referral signup 🔗", bodyHtml, accent: "#8B5CF6" }),
    text: `Referral signup.\n\nNew user: ${o.newUserName} (${o.newUserEmail})\nReferred by: ${o.referrerName}\nCode: ${o.code}`,
  };
}

export function smtpTestEmail(o: { to?: string }): Email {
  const bodyHtml =
    p("✅ Your DigitalCarda email delivery is working.") +
    p("This is a test message sent from your admin panel. If you're reading it, SMTP is configured correctly and your automated emails — welcome, trial lifecycle, referral rewards, payment receipts, and lead alerts — will all send.") +
    (o.to ? p(`<span style="color:${BRAND.sub};font-size:13px">Sent to: ${esc(o.to)}</span>`) : "") +
    button("Open dashboard", `${SITE}/dashboard`);
  return {
    kind: "smtpTestEmail",
    subject: "✅ DigitalCarda email test — it works!",
    html: layout({ preheader: "Your SMTP is working — automated emails will send.", badge: "Email test", heading: "Email delivery works 🎉", bodyHtml, accent: "#22C55E" }),
    text: "Your DigitalCarda email delivery is working. This test message confirms SMTP is configured correctly — automated emails will send.",
  };
}

export function referralRewardEmail(o: { name?: string; refereeName?: string; amount: number | string; balance?: number | string }): Email {
  const rows: [string, string][] = [["Reward credited", inr(o.amount)]];
  if (o.balance != null) rows.push(["Wallet balance", inr(o.balance)]);
  const bodyHtml =
    hi(o.name) +
    p(`Great news — <strong>${esc(o.refereeName || "someone you referred")}</strong> just upgraded to a paid plan, so you've earned a referral reward! 🎉`) +
    detailTable(rows, { accentLast: true }) +
    p("Keep sharing your link — every friend who goes paid earns you more.") +
    button("View my wallet", `${SITE}/dashboard/refer`);
  return {
    kind: "referralRewardEmail",
    subject: `You earned ${inr(o.amount)} 🎉`,
    html: layout({ preheader: `${o.refereeName || "A referral"} went paid — you earned ${inr(o.amount)}.`, badge: "Reward earned", heading: "You earned a reward 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\n${o.refereeName || "Someone you referred"} went paid — you earned ${inr(o.amount)}. View your wallet: ${SITE}/dashboard/refer`,
  };
}

export function payoutRequestAdminEmail(o: { name?: string; email?: string; amount: number; method: string; destination: string; accountName?: string | null; ifsc?: string | null }): Email {
  const rows: [string, string][] = [
    ["Requested by", esc(o.name || "—")],
    ["Email", esc(o.email || "—")],
    ["Method", esc((o.method || "").toUpperCase())],
    ["Destination", esc(o.destination)],
  ];
  if (o.accountName) rows.push(["Account name", esc(o.accountName)]);
  if (o.ifsc) rows.push(["IFSC", esc(o.ifsc)]);
  rows.push(["Amount", inr(o.amount)]);
  const bodyHtml =
    p(`A user requested a payout from their Refer &amp; Earn wallet. The funds are on hold until you process it.`) +
    detailTable(rows, { accentLast: true }) +
    button("Review payouts", `${SITE}/admin/referrals`);
  return {
    kind: "payoutRequestAdminEmail",
    subject: `Payout request: ${inr(o.amount)} — ${o.name || o.email || "user"}`,
    html: layout({ preheader: `${o.name} requested a ${inr(o.amount)} payout.`, badge: "Action needed", heading: "New payout request 💸", bodyHtml, accent: "#3B82F6" }),
    text: `Payout request.\n\nUser: ${o.name} (${o.email})\nMethod: ${o.method}\nDestination: ${o.destination}\nAmount: ${inr(o.amount)}`,
  };
}

/* ── Reseller / partner application ──────────────────────────────────── */

export function resellerApplicationAdminEmail(o: { name?: string; email?: string; phone?: string | null; companyName?: string | null; message?: string | null }): Email {
  const rows: [string, string][] = [
    ["Name", esc(o.name || "—")],
    ["Email", esc(o.email || "—")],
    ["Phone", esc(o.phone || "—")],
    ["Company", esc(o.companyName || "—")],
    ["Message", esc(o.message || "—")],
  ];
  const bodyHtml =
    p("Someone applied to become a reseller partner. Review and approve or reject them in the admin panel.") +
    detailTable(rows) +
    button("Review application", `${SITE}/admin/reseller-applications`);
  return {
    kind: "resellerApplicationAdminEmail",
    subject: `Reseller application: ${o.name || o.email || "New partner"}`,
    html: layout({ preheader: `${o.name} wants to become a reseller.`, badge: "Action needed", heading: "New reseller application 👋", bodyHtml, accent: "#8B5CF6" }),
    text: `New reseller application.\n\nName: ${o.name}\nEmail: ${o.email}\nPhone: ${o.phone || "—"}\nCompany: ${o.companyName || "—"}\nMessage: ${o.message || "—"}\n\nReview: ${SITE}/admin/reseller-applications`,
  };
}

export function resellerApplicationReceivedEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Thanks for applying to become a <strong>DigitalCarda reseller partner</strong>! 👋") +
    p("Our team is reviewing your application. We'll email you as soon as it's approved — usually within 1–2 business days.") +
    p(`<span style="color:${BRAND.sub};font-size:13px">Questions? Just reply to this email.</span>`);
  return {
    kind: "resellerApplicationReceivedEmail",
    subject: "We received your reseller application 👋",
    html: layout({ preheader: "Thanks for applying — we're reviewing your application.", badge: "Application received", heading: "Application received 👋", bodyHtml, accent: "#8B5CF6" }),
    text: `Hi ${o.name || "there"},\n\nThanks for applying to become a DigitalCarda reseller. We're reviewing your application and will email you once it's approved.`,
  };
}

/* The person who wrote in through the website's /contact form. Confirms the
   enquiry arrived and says what happens next. It never repeats what they typed:
   the form accepts any address, so echoing free text would let anyone send
   their own words to a stranger from our domain (see api/contact-router.ts). */
export function contactReceivedEmail(o: { name?: string | null; requirement?: string | null }): Email {
  const rows: [string, string][] = [
    ["WhatsApp", `<a href="https://wa.me/919517722444" style="color:${BRAND.goldDark};text-decoration:none">+91 95177 22444</a>`],
    ["Email", `<a href="mailto:hello@digitalcarda.in" style="color:${BRAND.ink};text-decoration:none">hello@digitalcarda.in</a>`],
  ];
  const about = o.requirement ? ` about <strong style="color:${BRAND.ink}">${esc(o.requirement)}</strong>` : "";
  const bodyHtml =
    hi(o.name) +
    p(`Thanks for contacting <strong style="color:${BRAND.ink}">DigitalCarda</strong>. We've received your enquiry${about}, and someone from our team will get back to you within 24 hours.`) +
    p("If it's urgent, message us on WhatsApp — that's where we reply fastest.") +
    detailTable(rows) +
    button("Browse card templates", `${SITE}/digital-business-cards-templates`) +
    p(`<span style="color:${BRAND.sub};font-size:13px">Want to add something? Just reply to this email.</span>`);
  return {
    kind: "contactReceivedEmail",
    subject: "We've received your enquiry — DigitalCarda",
    html: layout({
      preheader: "Thanks for contacting DigitalCarda — we'll get back to you within 24 hours.",
      badge: "Enquiry received", heading: "Thanks for reaching out 🙏", bodyHtml,
      footer: "You're receiving this because you sent an enquiry on digitalcarda.in.",
    }),
    text: [
      `Hi ${o.name || "there"},`, "",
      `Thanks for contacting DigitalCarda. We've received your enquiry${o.requirement ? ` about ${o.requirement}` : ""}, and someone from our team will get back to you within 24 hours.`, "",
      "Urgent? WhatsApp us on +91 95177 22444 or email hello@digitalcarda.in.", "",
      `Browse card templates: ${SITE}/digital-business-cards-templates`,
    ].join("\n"),
  };
}

/* An NFC card / standee order is paid. Repeats exactly what will be printed
   and where it ships, so a mistake can be caught before production. */
export function nfcOrderConfirmedEmail(o: {
  name?: string | null; orderId: number; productName: string; quantity: number; amount: number;
  printLines: string[]; address: string; cardUrl: string; deliveryDays: string;
  /** Several products paid together (e.g. card + standee): one line each. */
  items?: { name: string; quantity: number }[];
}): Email {
  const itemText = o.items && o.items.length > 1
    ? o.items.map((i) => `${i.quantity} × ${i.name}`).join(" + ")
    : `${o.quantity} × ${o.productName}`;
  const rows: [string, string][] = [
    ["Order", `#${o.orderId}`],
    [o.items && o.items.length > 1 ? "Items" : "Item", esc(itemText)],
    ["Paid", esc(inr(o.amount))],
    ["Delivery", `Free · ${esc(o.deliveryDays)}`],
  ];
  const bodyHtml =
    hi(o.name) +
    p("Thank you — your order is confirmed. Here's exactly what we'll print and where we'll send it.") +
    detailTable(rows) +
    note(
      `<strong style="color:${BRAND.ink}">Printed details</strong><br>${o.printLines.map((l) => esc(l)).join("<br>")}` +
      `<br><br><strong style="color:${BRAND.ink}">The NFC chip and QR code open</strong><br>${esc(o.cardUrl)}` +
      `<br><br><strong style="color:${BRAND.ink}">Shipping to</strong><br>${esc(o.address)}`,
    ) +
    p("Spotted a mistake? Reply to this email as soon as you can, so we can correct it before printing.") +
    button("View your order", `${SITE}/dashboard/nfc`);
  return {
    kind: "nfcOrderConfirmedEmail",
    subject: `Order confirmed — ${itemText} (#${o.orderId})`,
    html: layout({
      preheader: `Your ${o.items && o.items.length > 1 ? "NFC" : o.productName} order is confirmed. Free delivery in ${o.deliveryDays}.`,
      badge: "Order confirmed", heading: "Your order is confirmed 🎉", bodyHtml,
    }),
    text: [
      `Hi ${o.name || "there"},`, "",
      `Your order #${o.orderId} is confirmed: ${itemText}, paid ${inr(o.amount)}.`,
      `Delivery: free, ${o.deliveryDays}.`, "",
      "Printed details:", ...o.printLines, "",
      `The NFC chip and QR code open: ${o.cardUrl}`, "",
      `Shipping to: ${o.address}`, "",
      "Spotted a mistake? Reply to this email as soon as you can, so we can correct it before printing.",
    ].join("\n"),
  };
}

/* The team marked an NFC order shipped. */
export function nfcOrderShippedEmail(o: {
  name?: string | null; orderId: number; productName: string; quantity: number; tracking?: string | null;
}): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Good news — your ${o.quantity} × ${esc(o.productName)} (order #${o.orderId}) is on its way.`) +
    (o.tracking ? detailTable([["Tracking", esc(o.tracking)]]) : "") +
    p("Once it arrives, tap it on your phone to check it opens your card. Any problem, just reply to this email.") +
    button("View your order", `${SITE}/dashboard/nfc`);
  return {
    kind: "nfcOrderShippedEmail",
    subject: `Shipped — your ${o.productName} (#${o.orderId})`,
    html: layout({ preheader: `Your ${o.productName} is on its way.`, badge: "Shipped", heading: "Your order is on its way 🚚", bodyHtml }),
    text: [
      `Hi ${o.name || "there"},`, "",
      `Your ${o.quantity} × ${o.productName} (order #${o.orderId}) is on its way.`,
      ...(o.tracking ? [`Tracking: ${o.tracking}`] : []), "",
      "Any problem, just reply to this email.",
    ].join("\n"),
  };
}

/* ── NFC order → the team ───────────────────────────────────────────────
   One email per checkout (a card and a standee bought together arrive as one),
   laid out in the order the work happens: collect or confirm the money, print,
   encode and test the chip, ship. */

export type NfcAdminAlert = {
  ids: number[];
  paid: boolean;
  paymentId?: string | null;
  items: { product: "nfc_card" | "nfc_standee" | string; name: string; print: string; quantity: number; unitPrice: number; amount: number }[];
  printLines: string[];
  cardUrl: string;
  logoUrl?: string | null;
  ship: { name: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string };
  customer?: { id: number; name: string; email: string } | null;
  delivery: { label: string; maxDays: number };
  at?: Date;
};

/** `days` working days after `from` (Mon–Sat; couriers deliver on Saturdays). */
function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  for (let left = days; left > 0;) {
    d.setUTCDate(d.getUTCDate() + 1);
    // The weekday in India, not in the server's zone.
    if (new Date(d.getTime() + 5.5 * 3_600_000).getUTCDay() !== 0) left--;
  }
  return d;
}

/** What gets printed, drawn as the object: a bank-card-sized PVC card (front
    and back) and/or a counter standee. Layout only — the words are exact. */
function printMock(o: { lines: string[]; short: string; card: boolean; standee: boolean; logo: boolean }): string {
  const [name = "", ...rest] = o.lines;
  const text = (big: boolean) =>
    `<div style="font-family:${FONT};font-size:${big ? 17 : 15}px;font-weight:800;color:#FFFFFF;letter-spacing:-.2px;line-height:1.25">${esc(name)}</div>
     ${rest.map((l) => `<div style="font-family:${FONT};font-size:11.5px;line-height:1.5;color:#C3CFDF;padding-top:2px">${esc(l)}</div>`).join("")}`;
  const logoChip = o.logo
    ? `<span style="display:inline-block;padding:3px 7px;border:1px dashed #5B7090;border-radius:5px;font-family:${FONT};font-size:9px;font-weight:700;color:#93A4BD;letter-spacing:.8px">LOGO</span>`
    : `<span style="display:inline-block;height:4px;width:28px;background:${BRAND.gold};border-radius:2px;font-size:0;line-height:0">&nbsp;</span>`;
  const qr = (size: number) => `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
    <td width="${size}" height="${size}" align="center" valign="middle" bgcolor="#FFFFFF" style="width:${size}px;height:${size}px;border:2px solid ${BRAND.ink};border-radius:8px;font-family:${FONT};font-size:10px;font-weight:800;color:${BRAND.ink};letter-spacing:.6px">QR</td>
  </tr></table>`;
  const caption = (t: string) => `<div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px;padding:8px 0 0;text-align:center">${t}</div>`;

  const card = o.card ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>
    <td width="50%" valign="top" style="padding:0 6px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td height="150" valign="top" bgcolor="${BRAND.navy}" style="height:150px;background:${BRAND.navy};border-radius:14px;padding:16px 16px 12px;border:1px solid ${BRAND.navy};border-bottom:4px solid ${BRAND.gold}">
          ${logoChip}
          <div style="padding-top:22px">${text(false)}</div>
          <div style="font-family:${FONT};font-size:13px;font-weight:800;color:${BRAND.gold};text-align:right;letter-spacing:-1px;padding-top:6px">)))</div>
        </td></tr></table>
      ${caption("Card · front")}
    </td>
    <td width="50%" valign="top" style="padding:0 0 0 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td height="150" align="center" valign="middle" bgcolor="${BRAND.soft}" style="height:150px;background:${BRAND.soft};border:1px solid ${BRAND.line};border-bottom:4px solid ${BRAND.line};border-radius:14px;padding:14px 10px">
          ${qr(66)}
          <div style="font-family:${FONT};font-size:11.5px;font-weight:700;color:${BRAND.ink};padding-top:10px;word-break:break-all">${esc(o.short)}</div>
          <div style="font-family:${FONT};font-size:10.5px;color:${BRAND.sub};padding-top:2px">Tap or scan to open</div>
        </td></tr></table>
      ${caption("Card · back")}
    </td>
  </tr></table>` : "";

  const standee = o.standee ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:14px 0 0 14px;padding:18px 18px">
        ${logoChip}
        <div style="padding-top:14px">${text(true)}</div>
        <div style="font-family:${FONT};font-size:11.5px;font-weight:700;color:${BRAND.gold};padding-top:10px">Tap your phone here )))</div>
      </td>
      <td width="120" align="center" valign="middle" bgcolor="${BRAND.soft}" style="width:120px;background:${BRAND.soft};border:1px solid ${BRAND.line};border-left:0;border-radius:0 14px 14px 0;padding:14px 10px">
        ${qr(74)}
        <div style="font-family:${FONT};font-size:10.5px;color:${BRAND.sub};padding-top:8px">or scan</div>
      </td>
    </tr></table>
    ${caption("Standee · one side")}
  </td></tr></table>` : "";

  return card + standee;
}

export function nfcOrderAdminEmail(o: NfcAdminAlert): Email {
  const at = o.at ?? new Date();
  const ref = o.ids.map((id) => `#${id}`).join(" + ");
  const total = o.items.reduce((s, i) => s + i.amount, 0);
  const itemText = o.items.map((i) => `${i.quantity} × ${i.name}`).join(" + ");
  const first = (o.ship.name || "").trim().split(/\s+/)[0] || "there";
  const tone = o.paid ? TONE.green : TONE.amber;
  const short = o.cardUrl.replace(/^https?:\/\//, "");
  const slug = (() => { try { return new URL(o.cardUrl).pathname.replace(/^\/+|\/+$/g, ""); } catch { return ""; } })();
  const addressLines = [o.ship.line1, o.ship.line2, `${o.ship.city}, ${o.ship.state}`].filter((x): x is string => !!x);
  const fullAddress = [...addressLines, o.ship.pincode].join(", ");
  const deliverBy = addWorkingDays(at, o.delivery.maxDays);

  const hero = `<tr><td bgcolor="${BRAND.navyDeep}" style="background:${BRAND.navyDeep};padding:26px 32px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="top">
        <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${tone.solid};font-family:${FONT};font-size:10.5px;font-weight:800;color:${o.paid ? "#FFFFFF" : "#1A1206"};text-transform:uppercase;letter-spacing:1.1px">${o.paid ? "&#10003; Paid · ready to print" : "Awaiting payment"}</span>
        <div style="font-family:${FONT};font-size:12px;font-weight:700;color:${ON_DARK.sub};text-transform:uppercase;letter-spacing:1.3px;padding-top:16px">NFC order</div>
        <div style="font-family:${FONT};font-size:34px;line-height:1.1;font-weight:800;color:${BRAND.gold};letter-spacing:-.6px;padding-top:2px">${esc(ref)}</div>
        <div style="font-family:${FONT};font-size:14px;font-weight:600;color:${ON_DARK.text};padding-top:8px">${esc(itemText)}</div>
      </td>
      <td valign="top" align="right" style="padding-left:12px">
        <div style="font-family:${FONT};font-size:10.5px;font-weight:700;color:${ON_DARK.sub};text-transform:uppercase;letter-spacing:1.2px;padding-top:42px">${o.paid ? "Paid" : "To collect"}</div>
        <div style="font-family:${FONT};font-size:30px;line-height:1.15;font-weight:800;color:${ON_DARK.text};letter-spacing:-.6px;white-space:nowrap">${esc(inr(total))}</div>
        <div style="font-family:${FONT};font-size:11.5px;color:${ON_DARK.sub};padding-top:2px">free delivery</div>
      </td>
    </tr></table>
    <div style="padding-top:16px">
      ${darkChip(esc(whenIst(at)))}${darkChip(`&#9906; ${esc(o.ship.city)}, ${esc(o.ship.state)}`)}${darkChip(`Deliver by ${esc(dayIst(deliverBy))}`, "#FCD34D")}
    </div>
  </td></tr>`;

  const waMsg = o.paid
    ? `Hi ${first}, this is DigitalCarda 👋 We've received your payment for order ${ref} (${itemText}). We're printing it now and will send tracking as soon as it ships.`
    : `Hi ${first}, this is DigitalCarda 👋 Thanks for your order ${ref}: ${itemText}, ${inr(total)} with free delivery. How would you like to pay? As soon as it's paid we print it and ship within ${o.delivery.label}.`;
  const contact = actionPills([
    { label: `WhatsApp ${first}`, href: waLink(o.ship.phone, waMsg), tone: "whatsapp" },
    { label: "Call", href: telLink(o.ship.phone), tone: "dark" },
    { label: "Email", href: o.customer?.email ? `mailto:${o.customer.email}?subject=${encodeURIComponent(`Your DigitalCarda order ${ref}`)}` : null },
  ]);
  const next = o.paid
    ? callout("green", "Paid online — go ahead and print",
        `${esc(inr(total))} received${o.paymentId ? ` · Razorpay <span style="font-family:'SF Mono',Menlo,Consolas,monospace;color:${BRAND.ink}">${esc(o.paymentId)}</span>` : ""}. The customer already has their confirmation email.`, contact)
    : callout("amber", `Collect ${esc(inr(total))} before printing`,
        `Online payment is switched off, so nothing has been charged. Contact ${esc(first)} to arrange payment, then set the order to <strong>Paid</strong> in Admin.`, contact);

  const itemRows = o.items.map((i) => `<tr>
      <td style="padding:13px 0 13px 18px;border-bottom:1px solid ${BRAND.line};font-family:${FONT}">
        <div style="font-size:14.5px;font-weight:700;color:${BRAND.ink}">${esc(i.name)}</div>
        <div style="font-size:12px;color:${BRAND.sub};padding-top:2px">${esc(i.print)} · ${esc(inr(i.unitPrice))} each</div>
      </td>
      <td align="center" style="padding:13px 8px;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:14px;font-weight:700;color:${BRAND.ink};white-space:nowrap">× ${i.quantity}</td>
      <td align="right" style="padding:13px 18px 13px 0;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:14.5px;font-weight:700;color:${BRAND.ink};white-space:nowrap">${esc(inr(i.amount))}</td>
    </tr>`).join("");
  const itemsTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">
    ${itemRows}
    <tr>
      <td style="padding:12px 0 12px 18px;font-family:${FONT};font-size:13px;color:${BRAND.sub}">Delivery · ${esc(o.delivery.label)}</td>
      <td></td>
      <td align="right" style="padding:12px 18px 12px 0;font-family:${FONT};font-size:13px;font-weight:700;color:${TONE.green.solid}">Free</td>
    </tr>
    <tr>
      <td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};padding:14px 0 14px 18px;border-top:1px solid ${BRAND.goldLine};border-radius:0 0 0 14px;font-family:${FONT};font-size:14px;font-weight:800;color:${BRAND.ink}">Total</td>
      <td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};border-top:1px solid ${BRAND.goldLine}"></td>
      <td bgcolor="${BRAND.goldTint}" align="right" style="background:${BRAND.goldTint};padding:14px 18px 14px 0;border-top:1px solid ${BRAND.goldLine};border-radius:0 0 14px 0;font-family:${FONT};font-size:18px;font-weight:800;color:${BRAND.ink};white-space:nowrap">${esc(inr(total))}</td>
    </tr>
  </table>`;

  const hasCard = o.items.some((i) => i.product === "nfc_card");
  const hasStandee = o.items.some((i) => i.product === "nfc_standee");
  const logo = safeUrl(o.logoUrl);

  const label = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td bgcolor="#FFFFFF" style="background:#FFFFFF;border:2px dashed #C3CDDA;border-radius:14px;padding:18px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="top">
          <div style="font-family:${FONT};font-size:10px;font-weight:800;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1.2px">Ship to</div>
          <div style="font-family:${FONT};font-size:17px;font-weight:800;color:${BRAND.ink};padding-top:6px">${esc(o.ship.name)}</div>
          <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.body};padding-top:4px">${addressLines.map((l) => esc(l)).join("<br>")}</div>
          <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${BRAND.ink};padding-top:6px">${phoneLink(o.ship.phone)}</div>
        </td>
        <td valign="top" align="right" width="96" style="width:96px">
          <div style="font-family:${FONT};font-size:10px;font-weight:800;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1.2px">PIN</div>
          <div style="display:inline-block;margin-top:6px;padding:7px 10px;border:2px solid ${BRAND.ink};border-radius:8px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:17px;font-weight:800;color:${BRAND.ink};letter-spacing:1px">${esc(o.ship.pincode)}</div>
        </td>
      </tr></table>
      <div style="padding-top:12px;font-family:${FONT};font-size:12.5px"><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(fullAddress)}" target="_blank" style="color:${BRAND.goldDark};font-weight:700;text-decoration:none">Open in Google Maps &rarr;</a></div>
    </td>
  </tr></table>`;

  const steps: [string, string][] = [
    ...(o.paid ? [] : [["Collect the payment", `${esc(inr(total))} from ${esc(o.ship.name)}, then set the order to <strong>Paid</strong>.`] as [string, string]]),
    ["Print it", `Use the exact text above${logo ? " and the logo file" : ", with the logo from their card if it has one"}.`],
    ["Write the chip", `Encode <strong>${esc(short)}</strong> on the NFC chip — the same link as the QR code.`],
    ["Test it", "Tap it on an Android phone and an iPhone, and scan the QR code. Both must open the card."],
    ["Ship it", "Set the order to <strong>Shipped</strong> with the tracking number — the customer is emailed automatically."],
  ];

  const bodyHtml =
    next +
    sectionLabel("Order") + itemsTable +
    sectionLabel("What to print") +
    printMock({ lines: o.printLines, short, card: hasCard, standee: hasStandee, logo: !!logo }) +
    infoGrid([
      ["Printed text", o.printLines.map((l) => esc(l)).join("<br>")],
      ["Chip + QR open", inkLink(o.cardUrl, short)],
      ["Logo", logo ? inkLink(logo, "Download the logo") : `${mutedSpan("Not uploaded")} — take it from ${inkLink(o.cardUrl, "their card")} if it has one`],
    ]) +
    (slug ? `<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>` + cardPreview(slug, `The card the chip opens`) : "") +
    sectionLabel("Shipping label") + label +
    (o.customer ? sectionLabel("Customer account") + infoGrid([
      ["Name", esc(o.customer.name)],
      ["Email", inkLink(`mailto:${o.customer.email}`, o.customer.email)],
      ["Account", `#${o.customer.id} ${mutedSpan(`· ${inkLink(`${SITE}/admin/customers?q=${encodeURIComponent(o.customer.email)}`, "open in admin")}`)}`],
    ]) : "") +
    sectionLabel("Checklist") +
    steps.map(([t, b], i) => featureRow(i + 1, t, b)).join("") +
    button("Open NFC orders", `${SITE}/admin/nfc-orders`);

  return {
    kind: "nfcOrderAdmin",
    subject: `NFC order ${ref} · ${itemText} · ${inr(total)} · ${o.paid ? "Paid, ready to print" : "Awaiting payment"}`,
    html: layout({
      preheader: `${o.paid ? "Paid" : "Collect payment"}: ${itemText} for ${o.ship.name}, ${o.ship.city}. ${inr(total)}.`,
      heading: `NFC order ${ref}`, hero, bodyHtml, accent: tone.solid,
      footer: "You're receiving this because you run DigitalCarda. Owner alerts go to the admin address in Settings.",
    }),
    text: [
      `NFC order ${ref} — ${o.paid ? `PAID${o.paymentId ? ` (Razorpay ${o.paymentId})` : ""}, ready to print` : "AWAITING PAYMENT — collect it before printing"}`, "",
      ...o.items.map((i) => `${i.quantity} × ${i.name} (${i.print}) = ${inr(i.amount)}`),
      `Total: ${inr(total)} · free delivery, ${o.delivery.label} (by ${dayIst(deliverBy)})`, "",
      "Print:", ...o.printLines,
      `NFC chip + QR open: ${o.cardUrl}`,
      `Logo: ${logo || `not uploaded — take it from ${o.cardUrl} if the card has one`}`, "",
      `Ship to: ${o.ship.name}, ${o.ship.phone}`, fullAddress, "",
      ...(o.customer ? [`Customer account: #${o.customer.id} ${o.customer.name} <${o.customer.email}>`, ""] : []),
      `Manage it: ${SITE}/admin/nfc-orders`,
    ].join("\n"),
  };
}

export function resellerApprovedEmail(o: { name?: string; link: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Great news — your <strong>reseller partner</strong> application is <strong>approved</strong>! 🎉") +
    p("Set your password to activate your reseller account, then you can start onboarding customers and earning commissions.") +
    button("Set your password", o.link) +
    p(`<span style="color:${BRAND.sub};font-size:13px">This link expires in 60 minutes. If it expires, use “Forgot password” on the login page.</span>`);
  return {
    kind: "resellerApprovedEmail",
    subject: "You're approved — welcome, partner! 🎉",
    html: layout({ preheader: "Your reseller application is approved — set your password.", badge: "Approved", heading: "You're a reseller now 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour reseller application is approved! Set your password to activate your account: ${o.link}`,
  };
}

export function resellerApprovedExistingEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Great news — your <strong>reseller partner</strong> application is <strong>approved</strong>! 🎉") +
    p("Your existing account has been upgraded to a reseller account. Just sign in with your usual password to access your reseller dashboard.") +
    button("Go to reseller dashboard", `${SITE}/reseller`);
  return {
    kind: "resellerApprovedExistingEmail",
    subject: "You're approved — welcome, partner! 🎉",
    html: layout({ preheader: "Your reseller application is approved.", badge: "Approved", heading: "You're a reseller now 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour reseller application is approved and your account is upgraded. Sign in to access your reseller dashboard: ${SITE}/reseller`,
  };
}

export function resellerRejectedEmail(o: { name?: string; note?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Thank you for your interest in becoming a DigitalCarda reseller. After review, we're unable to approve your application at this time.${o.note ? `<br><br><em style="color:${BRAND.sub}">${esc(o.note)}</em>` : ""}`) +
    p("You're welcome to use DigitalCarda as a customer, and you can reach out to us if your circumstances change.");
  return {
    kind: "resellerRejectedEmail",
    subject: "Update on your reseller application",
    html: layout({ preheader: "An update on your reseller application.", badge: "Application", heading: "Reseller application update", bodyHtml, accent: "#64748B" }),
    text: `Hi ${o.name || "there"},\n\nThank you for applying. We're unable to approve your reseller application at this time.${o.note ? ` ${o.note}` : ""}`,
  };
}

/* ── Trial lifecycle (§9) — driven by the card_trials engine ─────────────
   Each is sent at most once per user (notifications ledger dedup). Metric
   emails show ONLY real numbers pulled from card_events (§36 — never faked). */

export interface TrialMetrics { views: number; saves: number; whatsapp: number; calls: number; leads: number; }

function metricsBlock(m: TrialMetrics): string {
  const cell = (n: number, label: string) =>
    `<td align="center" style="padding:14px 8px;border:1px solid ${BRAND.line};border-radius:12px">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:${BRAND.ink}">${n}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${label}</div>
    </td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:18px 0"><tr>
    ${cell(m.views, "Views")}${cell(m.saves, "Saves")}${cell(m.whatsapp, "WhatsApp")}${cell(m.leads, "Leads")}
  </tr></table>`;
}

const CTA = `${SITE}/dashboard/subscription`;

export function trialDay1Email(o: { name?: string; cardUrl?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Your DigitalCarda is <strong>live</strong> and ready to share 🎉 The best next step is to get it in front of people — every view, save and WhatsApp click starts here.") +
    p("Share it in your WhatsApp status, email signature, and social bios today.") +
    button("Share my card", o.cardUrl || `${SITE}/dashboard`);
  return {
    kind: "trialDay1Email",
    subject: "Your DigitalCarda is live — start sharing 🎉",
    html: layout({ preheader: "Your card is live. Share it to start getting engagement.", badge: "Day 1 · Live", heading: "Your card is live 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour DigitalCarda is live! Share it everywhere to start getting views, saves and leads: ${o.cardUrl || SITE + "/dashboard"}`,
  };
}

export function trialDay7Email(o: { name?: string; cardUrl?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("One week in — here's how to get more out of your card:") +
    `<ul style="margin:0 0 14px;padding-left:20px;color:#334155">
      <li style="margin-bottom:6px">Add your <strong>services &amp; gallery</strong> so visitors know what you offer</li>
      <li style="margin-bottom:6px">Turn on <strong>lead capture</strong> to collect enquiries automatically</li>
      <li style="margin-bottom:6px">Put your <strong>QR code</strong> on your visiting card &amp; signage</li>
    </ul>` +
    button("Improve my card", `${SITE}/dashboard`);
  return {
    kind: "trialDay7Email",
    subject: "Get more from your DigitalCarda 💡",
    html: layout({ preheader: "3 quick ways to get more views and leads from your card.", badge: "Day 7 · Tips", heading: "Make your card work harder 💡", bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nOne week in! Add services & gallery, enable lead capture, and share your QR code to get more from your card: ${SITE}/dashboard`,
  };
}

export function trialDay15Email(o: { name?: string; daysLeft: number; metrics: TrialMetrics }): Email {
  const any = o.metrics.views + o.metrics.saves + o.metrics.leads > 0;
  const bodyHtml =
    hi(o.name) +
    p(`You're halfway through your free trial — <strong>${o.daysLeft} days left</strong>.`) +
    (any ? p("Here's what your card has done so far:") + metricsBlock(o.metrics)
         : p("Your card is live — share it more this week to start seeing views, saves and leads roll in.")) +
    button("Keep my card active", CTA);
  return {
    kind: "trialDay15Email",
    subject: `Halfway through your trial — ${o.daysLeft} days left`,
    html: layout({ preheader: `${o.daysLeft} days left on your trial. Here's your progress.`, badge: "Day 15 · Halfway", heading: "You're halfway there ⏳", bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nHalfway through your trial — ${o.daysLeft} days left. Views: ${o.metrics.views}, Saves: ${o.metrics.saves}, Leads: ${o.metrics.leads}. Keep it active: ${CTA}`,
  };
}

export function trialDay21Email(o: { name?: string; daysLeft: number; metrics: TrialMetrics }): Email {
  const any = o.metrics.views + o.metrics.saves + o.metrics.leads > 0;
  const bodyHtml =
    hi(o.name) +
    (any
      ? p("Your DigitalCarda is working. Here's the value it's generated:") + metricsBlock(o.metrics) +
        p(`Don't lose this momentum — <strong>${o.daysLeft} days left</strong> on your trial.`)
      : p(`<strong>${o.daysLeft} days left</strong> on your trial. Share your card a few more times this week to start seeing real engagement before it ends.`)) +
    button("Keep my card active", CTA);
  return {
    kind: "trialDay21Email",
    subject: "Your DigitalCarda is working 📈",
    html: layout({ preheader: `Your card's results so far — ${o.daysLeft} days left.`, badge: "Day 21 · Results", heading: "Your card is working 📈", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour card's results — Views: ${o.metrics.views}, Saves: ${o.metrics.saves}, WhatsApp: ${o.metrics.whatsapp}, Leads: ${o.metrics.leads}. ${o.daysLeft} days left. Keep it active: ${CTA}`,
  };
}

export function trialDay25Email(o: { name?: string; daysLeft: number; metrics: TrialMetrics }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Only <strong style="color:${BRAND.goldDark}">${o.daysLeft} days left</strong> on your free trial. Activate your plan now so your card — and everything you've built — stays online without interruption.`) +
    (o.metrics.views + o.metrics.leads > 0 ? metricsBlock(o.metrics) : "") +
    button("Keep my card active", CTA);
  return {
    kind: "trialDay25Email",
    subject: `Keep your card active — ${o.daysLeft} days left`,
    html: layout({ preheader: `${o.daysLeft} days left — activate to keep your card online.`, badge: "Day 25 · Reminder", heading: "Keep your card active 🔔", bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nOnly ${o.daysLeft} days left on your trial. Activate your plan to keep your card online: ${CTA}`,
  };
}

export function abandonedPublishEmail(o: { name?: string; productName?: string; cardUrl?: string }): Email {
  const what = o.productName ? `your <strong>${esc(o.productName)}</strong> card` : "your digital card";
  const bodyHtml =
    hi(o.name) +
    p(`You're almost there — ${what} is set up but not published yet. Publishing takes one click, and your <strong>30-day free trial is already running</strong>, so finish now and start sharing your card.`) +
    button("Finish &amp; publish my card", o.cardUrl || `${SITE}/dashboard/build`);
  return {
    kind: "abandonedPublishEmail",
    subject: "Your DigitalCarda is almost ready 🚀",
    html: layout({ preheader: "One click to publish — your free trial is already running.", badge: "Almost done", heading: "You're one click away 🚀", bodyHtml, accent: BRAND.gold }),
    text: `Hi ${o.name || "there"},\n\nYour digital card is almost ready — publish it to make it live. Your 30-day free trial is already running: ${o.cardUrl || SITE + "/dashboard/build"}`,
  };
}

export function trialEndedEmail(o: { name?: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p("Your free trial has ended, so your digital card is now <strong>paused</strong> and hidden from visitors.") +
    p("Everything you built is safe. Upgrade any time to bring your card back online instantly and pick up right where you left off.") +
    button("Reactivate my card", `${SITE}/dashboard/subscription`);
  return {
    kind: "trialEndedEmail",
    subject: "Your trial ended — reactivate your card anytime",
    html: layout({ preheader: "Your card is paused. Upgrade to bring it back online.", badge: "Trial ended", heading: "Your trial has ended", bodyHtml, accent: "#EF4444" }),
    text: `Hi ${o.name || "there"},\n\nYour trial ended and your card is paused. Your data is safe — upgrade to reactivate: ${SITE}/dashboard/subscription`,
  };
}

/* ── Paid-subscription lifecycle ─────────────────────────────────────── */

export function subscriptionRenewalReminderEmail(o: { name?: string; planName: string; daysLeft: number; validTill: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your <strong>${esc(o.planName)}</strong> plan renews in <strong style="color:${BRAND.goldDark}">${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}</strong> (valid till ${esc(o.validTill)}). Renew now so your card stays live and every feature keeps working without a break.`) +
    button("Renew my plan", `${SITE}/dashboard/subscription`);
  return {
    kind: "subscriptionRenewalReminderEmail",
    subject: `Your ${o.planName} plan renews in ${o.daysLeft} day${o.daysLeft === 1 ? "" : "s"}`,
    html: layout({ preheader: `Renew your ${o.planName} plan to stay live.`, badge: "Renewal reminder", heading: "Time to renew ⏳", bodyHtml }),
    text: `Hi ${o.name || "there"},\n\nYour ${o.planName} plan renews in ${o.daysLeft} day(s) (valid till ${o.validTill}). Renew: ${SITE}/dashboard/subscription`,
  };
}

export function subscriptionExpiredEmail(o: { name?: string; planName: string }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your <strong>${esc(o.planName)}</strong> plan has expired, so your card is now <strong>paused</strong> and hidden from visitors.`) +
    p("Everything you built is safe. Renew any time to bring your card back online instantly.") +
    button("Renew &amp; go live again", `${SITE}/dashboard/subscription`);
  return {
    kind: "subscriptionExpiredEmail",
    subject: `Your ${o.planName} plan expired — renew to go live`,
    html: layout({ preheader: "Your plan expired and your card is paused — renew to reactivate.", badge: "Plan expired", heading: "Your plan has expired", bodyHtml, accent: "#EF4444" }),
    text: `Hi ${o.name || "there"},\n\nYour ${o.planName} plan expired and your card is paused. Renew to reactivate: ${SITE}/dashboard/subscription`,
  };
}

export function paymentFailedEmail(o: { name?: string; planName: string; amount: number }): Email {
  const bodyHtml =
    hi(o.name) +
    p(`Your online payment of <strong>${inr(o.amount)}</strong> for the <strong>${esc(o.planName)}</strong> plan didn't go through — no money was deducted, or any hold will be released automatically.`) +
    p("You can try again with a different method (card, UPI, netbanking or wallet) — it only takes a minute.") +
    button("Try payment again", `${SITE}/dashboard/subscription`);
  return {
    kind: "paymentFailedEmail",
    subject: `Payment didn't go through — ${o.planName}`,
    html: layout({ preheader: "Your payment didn't complete — try again to activate your plan.", badge: "Payment · Failed", heading: "Payment didn't complete", bodyHtml, accent: "#EF4444" }),
    text: `Hi ${o.name || "there"},\n\nYour ${inr(o.amount)} payment for ${o.planName} didn't go through — no money was deducted. Try again: ${SITE}/dashboard/subscription`,
  };
}

/* ── Reseller earnings ───────────────────────────────────────────────── */

export function resellerCommissionEmail(o: { name?: string; customerName?: string; amount: number | string; pendingPayout?: number | string }): Email {
  const rows: [string, string][] = [["Commission earned", inr(o.amount)]];
  if (o.pendingPayout != null) rows.push(["Pending payout", inr(o.pendingPayout)]);
  const bodyHtml =
    hi(o.name) +
    p(`Nice work — <strong>${esc(o.customerName || "one of your customers")}</strong> just activated a paid plan, so you've earned a commission! 💰`) +
    detailTable(rows, { accentLast: true }) +
    p("Keep onboarding customers — every paid activation adds to your payout.") +
    button("View my earnings", `${SITE}/reseller`);
  return {
    kind: "resellerCommissionEmail",
    subject: `You earned ${inr(o.amount)} commission 💰`,
    html: layout({ preheader: `${o.customerName || "A customer"} went paid — you earned ${inr(o.amount)}.`, badge: "Commission earned", heading: "You earned a commission 💰", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\n${o.customerName || "A customer"} activated a paid plan — you earned ${inr(o.amount)} commission. View earnings: ${SITE}/reseller`,
  };
}

export function payoutCompletedEmail(o: { name?: string; amount: number | string; method?: string; reference?: string }): Email {
  const rows: [string, string][] = [["Amount", inr(o.amount)]];
  if (o.method) rows.push(["Method", esc(o.method.toUpperCase())]);
  if (o.reference) rows.push(["Reference", esc(o.reference)]);
  const bodyHtml =
    hi(o.name) +
    p("Good news — your payout has been <strong>processed</strong> and is on its way to you. 🎉") +
    detailTable(rows, { accentLast: true }) +
    p(`<span style="color:${BRAND.sub};font-size:13px">Bank transfers can take 1–2 business days to reflect.</span>`) +
    button("View my wallet", `${SITE}/reseller`);
  return {
    kind: "payoutCompletedEmail",
    subject: `Payout sent — ${inr(o.amount)} 🎉`,
    html: layout({ preheader: `Your ${inr(o.amount)} payout has been processed.`, badge: "Payout · Sent", heading: "Your payout is on its way 🎉", bodyHtml, accent: "#22C55E" }),
    text: `Hi ${o.name || "there"},\n\nYour payout of ${inr(o.amount)} has been processed${o.reference ? ` (ref ${o.reference})` : ""}. It may take 1–2 business days to reflect.`,
  };
}

/* ── Cold outreach / marketing intro ─────────────────────────────────────
   For prospecting emails to businesses who don't yet have an account. Uses a
   marketing footer (not the account-holder footer) with an opt-out line. */

export function marketingIntroEmail(o: { name?: string; businessName?: string; ctaUrl?: string }): Email {
  const who = o.businessName ? esc(o.businessName) : "your business";
  const feature = (title: string, desc: string) =>
    `<tr>
      <td style="padding:10px 0;vertical-align:top;width:26px;font-size:18px">✅</td>
      <td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#334155"><strong style="color:${BRAND.ink}">${title}</strong> — ${desc}</td>
    </tr>`;
  const bodyHtml =
    p(`Hi ${esc(o.name || "there")},`) +
    p(`I'm reaching out from <strong>DigitalCarda</strong> — we help businesses like ${who} replace the paper visiting card with a smart, shareable <strong>digital business card</strong> that wins more customers.`) +
    p("In minutes you get a professional card you can share by link, QR or WhatsApp — with everything a customer needs in one place:") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px">
      ${feature("One tap to everything", "call, WhatsApp, directions, website & save-contact")}
      ${feature("Showcase what you sell", "products, services, gallery, videos & offers")}
      ${feature("Capture leads automatically", "every enquiry lands in your dashboard")}
      ${feature("Take payments", "UPI, cards & netbanking built in")}
      ${feature("Look credible", "Google reviews, custom domain & your own branding")}
      ${feature("Know what works", "real analytics on views, taps & leads")}
    </table>` +
    p("There's a <strong>30-day free trial</strong> — no credit card needed. Build your card today and share it the same day.") +
    button("Create your free card", o.ctaUrl || `${SITE}/`) +
    p(`<span style="color:${BRAND.sub};font-size:13px">Prefer to talk? Reply to this email or reach us at <a href="mailto:hello@digitalcarda.in" style="color:${BRAND.goldDark};text-decoration:none">hello@digitalcarda.in</a> · +91 95177 22444.</span>`);
  return {
    kind: "marketingIntroEmail",
    subject: `${o.businessName ? o.businessName + " — turn" : "Turn"} your visiting card into a smart digital card`,
    html: layout({
      preheader: "A smart digital business card that wins more customers — 30-day free trial.",
      badge: "DigitalCarda",
      heading: "Your business deserves a smarter card 🚀",
      bodyHtml,
      footer: "You received this because we believe DigitalCarda can help your business grow. Not interested? Just reply “unsubscribe”.",
    }),
    text: `Hi ${o.name || "there"},\n\nDigitalCarda turns your paper visiting card into a smart digital business card — share by link/QR/WhatsApp, showcase products & services, capture leads, take payments (UPI/cards), add Google reviews, a custom domain and real analytics.\n\n30-day free trial, no credit card. Create your card: ${o.ctaUrl || SITE + "/"}\n\nQuestions? hello@digitalcarda.in · +91 95177 22444\n\nNot interested? Reply "unsubscribe".`,
  };
}
