/*
 * Account & sign-in emails: the welcome, the admin hand-off with login
 * details, email verification, the password notices, and the account
 * lifecycle (sign-in email changed, deletion scheduled, deletion cancelled).
 *
 * Everything is built from ./kit. User and database text is escaped with esc()
 * or by the kit helpers that escape; only trusted markup goes into *Html params.
 */
import {
  SITE, SUPPORT_WHATSAPP, SUPPORT_EMAIL, BRAND, TONE, FONT, MONO,
  type Email,
  layout, heroBand, heroLight,
  sectionLabel, button, actionPills, statTiles, infoGrid, detailTable, callout, note,
  stepRow, tickList, progressSteps, linkPanel, cardPreview, helpStrip, signoff,
  darkChip, codeValue, goldLink, inkLink, mailtoLink, waLink,
  whenIst, dayIst, dateIst, esc, firstName, p, hi, strong, small, spacer,
} from "./kit";

/* ── Local helpers (not exported) ────────────────────────────────────────── */

const DAY = 86_400_000;
const IST = "Asia/Kolkata";

const cardUrlOf = (slug: string) => `${SITE}/${encodeURIComponent(slug)}`;
/** "digitalcarda.in/pacewalk" */
const bare = (url: string) => url.replace(/^https?:\/\//, "");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const clean = (s?: string | null) => String(s ?? "").trim() || null;
/** A usable Date, or null (never "Invalid Date" in a subject line). */
const validDate = (d?: Date | string | null) => {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x.getTime()) ? null : x;
};
/** "21 Oct" and "2026", India time. */
const dayMonth = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
const yearIst = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST, year: "numeric" });
const greet = (name?: string | null) => `Hi ${firstName(name) || "there"},`;

const WA_SUPPORT = `https://wa.me/${SUPPORT_WHATSAPP.wa}`;
const supportText = [
  `WhatsApp: ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT})`,
  `Email: ${SUPPORT_EMAIL}`,
];

/** WhatsApp + email pills to a real person. The prefilled message never carries personal data. */
function supportPills(waMessage: string, mailSubject: string, lead?: { label: string; href: string }): string {
  return actionPills([
    ...(lead ? [{ label: lead.label, href: lead.href, tone: "dark" as const }] : []),
    { label: "WhatsApp us", href: waLink(SUPPORT_WHATSAPP.wa, waMessage), tone: "whatsapp" },
    { label: "Email support", href: mailtoLink(SUPPORT_EMAIL, mailSubject), tone: "light" },
  ]);
}

/** "Button not working?" panel carrying the raw link. */
function fallbackLink(link: string): string {
  return note(`<strong style="color:${BRAND.ink}">Button not working?</strong> Copy this link into your browser:<br>
    <a href="${esc(link)}" target="_blank" style="font-family:${MONO};font-size:12px;line-height:1.7;color:${BRAND.goldDark};text-decoration:none;word-break:break-all">${esc(link)}</a>`);
}

/** Before → now card for a changed value (the sign-in email). Values are text. */
function swapCard(before: string, now: string): string {
  const row = (label: string, value: string, current: boolean) => `<tr>
      <td width="70" valign="middle" style="width:70px;padding:15px 0 15px 18px;font-family:${FONT};font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${current ? BRAND.goldDark : BRAND.sub}">${label}</td>
      <td valign="middle" style="padding:15px 18px 15px 8px;font-family:${MONO};font-size:14px;line-height:1.5;font-weight:${current ? 700 : 500};color:${current ? BRAND.ink : BRAND.sub};${current ? "" : "text-decoration:line-through;"}word-break:break-all">${esc(value)}</td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;border:1px solid ${BRAND.line};border-left:4px solid ${TONE.amber.solid};border-radius:14px;background:#FFFFFF">
    ${row("Before", before, false)}
    <tr><td colspan="2" style="padding:0 18px"><div style="height:1px;background:${BRAND.line};font-size:0;line-height:0">&nbsp;</div></td></tr>
    ${row("Now", now, true)}
  </table>`;
}

/* ── Welcome (v2) ────────────────────────────────────────────────────────── */

/** The trial a new account starts with (provisionStarterCard's `starter.trial`). */
export interface WelcomeTrial {
  /** Trial length in days (admin setting `trial_days`, default 30). */
  days: number;
  /** When the trial ends. */
  endsAt: Date;
  /** The trial voucher recorded at signup (FREE30D), or null when none was applied. */
  voucher?: string | null;
}

function normTrial(t?: WelcomeTrial | null): { days: number; endsAt: Date; voucher: string | null } | null {
  if (!t) return null;
  const endsAt = validDate(t.endsAt);
  const days = Math.round(Number(t.days));
  if (!endsAt || !Number.isFinite(days) || days <= 0) return null;
  return { days, endsAt, voucher: clean(t.voucher) };
}

/**
 * Welcome — the first email a brand-new account gets.
 *
 * Audience: customer. Trigger: `welcomeNewAccount` (api/auth-router.ts), once per
 * new account, for email and Google signups alike.
 *
 * v2: send it AFTER `provisionStarterCard` and pass `slug`, `companyName` and
 * `trial` (from `starter.slug`, `opts.companyName`, `starter.trial`). With them the
 * email shows the live card, its link, the trial length and end date, and three
 * first steps. When `starter` is null, call it as before ({name, role}) and it
 * falls back to a plain welcome.
 *
 * - name: the account's full name.
 * - role: accepted for compatibility; not used.
 * - slug: the starter card's slug (the card is published at SITE/<slug>).
 * - companyName: the business name typed at signup.
 * - trial: see WelcomeTrial.
 */
export function welcomeEmail(o: {
  name?: string | null; role?: string | null;
  slug?: string | null; companyName?: string | null; trial?: WelcomeTrial | null;
}): Email {
  const slug = clean(o.slug);
  const company = clean(o.companyName);
  const cardUrl = slug ? cardUrlOf(slug) : null;
  const trial = normTrial(o.trial);

  const chips: string[] = [];
  if (cardUrl) chips.push(darkChip(`<span style="color:${TONE.green.solid}">&#9679;</span>&nbsp; ${esc(bare(cardUrl))}`));
  if (trial?.voucher) chips.push(darkChip(`Trial code ${esc(trial.voucher)}`, BRAND.gold));

  const hero = heroBand({
    eyebrow: "Welcome to DigitalCarda",
    tone: cardUrl ? "green" : "gold",
    title: cardUrl ? (company ? `${company} is live` : "Your digital card is live") : "Your account is ready",
    sub: cardUrl
      ? `Your card is published${trial ? " and your free trial has started" : ""}. Here's your link — it's ready to share today.`
      : "Build your card, share it with a link or a QR code, and start collecting enquiries.",
    aside: trial ? { label: "Free trial", value: plural(trial.days, "day"), sub: `until ${dayIst(trial.endsAt)}` } : undefined,
    chips,
  });

  const stepsLive =
    stepRow(1, "Make it yours",
      `Add your logo, photo, services and products in the card editor. ${goldLink(`${SITE}/dashboard/cards`, "Edit your card →")}`) +
    stepRow(2, "Put it on WhatsApp",
      `Pick a ready-made reply with your card link and set it as your WhatsApp Business greeting. ${goldLink(`${SITE}/dashboard/whatsapp`, "Choose a message →")}`) +
    stepRow(3, "Print your QR",
      `A print-ready QR standee for your desk or counter — every scan opens your card. ${goldLink(`${SITE}/dashboard/qr`, "Get your QR →")}`);
  const stepsBasic =
    stepRow(1, "Fill in your business details",
      `Your name, logo, phone and address — the basics a customer looks for first. ${goldLink(`${SITE}/dashboard/cards`, "Start your card →")}`) +
    stepRow(2, "Add products, gallery and payment options",
      `Show what you sell and how to pay you. ${goldLink(`${SITE}/dashboard/products`, "Add products →")}`) +
    stepRow(3, "Share your link",
      `Send it on WhatsApp, add it to your email signature, print the QR. ${goldLink(`${SITE}/dashboard/qr`, "Get your QR →")}`);

  const trialBlock = trial
    ? sectionLabel("Your free trial") +
      statTiles([
        { label: "Free for", value: esc(plural(trial.days, "day")) },
        { label: "Ends on", value: esc(dateIst(trial.endsAt)) },
        { label: "Paid today", value: "&#8377;0", sub: "No card details asked" },
      ]) +
      note(`Before the trial ends, choose a plan under ${inkLink(`${SITE}/dashboard/subscription`, "Subscription")} to keep your card live. Nothing is charged automatically — if you don't pick a plan, your card is paused, never deleted.`)
    : "";

  const bodyHtml =
    hi(o.name) +
    (cardUrl
      ? p(`Welcome to DigitalCarda! ${company ? `The card for ${strong(company)} is` : "Your digital business card is"} already published with the details you gave us. Add your logo, services and photos, and it's ready for your customers.`) +
        cardPreview(slug!, `${company || clean(o.name) || "Your"} — digital business card`) +
        linkPanel("Your card is live at", cardUrl)
      : p("Your account is ready. Create your digital business card, add products and a gallery, capture leads, and share it anywhere with a single link or QR code.")) +
    sectionLabel("Your first three steps") +
    (cardUrl ? stepsLive : stepsBasic) +
    button("Open your dashboard", `${SITE}/dashboard`) +
    trialBlock +
    helpStrip() +
    signoff();

  const text = [
    greet(o.name), "",
    ...(cardUrl
      ? [`Welcome to DigitalCarda! ${company ? `The card for ${company} is` : "Your digital business card is"} live:`, cardUrl, ""]
      : ["Welcome to DigitalCarda! Your account is ready. Build your digital card, add products and a gallery, and start capturing leads.", ""]),
    ...(trial
      ? [
          "YOUR FREE TRIAL",
          `${plural(trial.days, "day")}, free — ends on ${dateIst(trial.endsAt)}.${trial.voucher ? ` Trial code: ${trial.voucher}.` : ""}`,
          "Nothing is charged automatically. Choose a plan before it ends to keep your card live (if you don't, your card is paused, never deleted):",
          `${SITE}/dashboard/subscription`, "",
        ]
      : []),
    "YOUR FIRST THREE STEPS",
    ...(cardUrl
      ? [
          `1. Make it yours — add your logo, photo, services and products: ${SITE}/dashboard/cards`,
          `2. Put it on WhatsApp — pick a ready-made reply with your card link: ${SITE}/dashboard/whatsapp`,
          `3. Print your QR — a print-ready standee for your desk or counter: ${SITE}/dashboard/qr`,
        ]
      : [
          `1. Fill in your business details and logo: ${SITE}/dashboard/cards`,
          `2. Add products, gallery and payment options: ${SITE}/dashboard/products`,
          `3. Share your link and QR: ${SITE}/dashboard/qr`,
        ]),
    "", `Dashboard: ${SITE}/dashboard`, "",
    `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT}).`, "",
    "— Team DigitalCarda",
  ];

  return {
    kind: "welcomeEmail",
    subject: cardUrl ? "Welcome to DigitalCarda 🎉 Your card is live" : "Welcome to DigitalCarda 🎉",
    html: layout({
      preheader: cardUrl
        ? `Your card is live at ${bare(cardUrl)}${trial ? ` and free until ${dateIst(trial.endsAt)}` : ""} — here are your first three steps.`
        : "Your DigitalCarda account is ready — here's where to start with your digital card.",
      hero, bodyHtml, accent: cardUrl ? TONE.green.solid : BRAND.gold, audience: "customer",
    }),
    text: text.join("\n"),
  };
}

/* ── Account details (admin hand-off) ────────────────────────────────────── */

/**
 * Account details — a super-admin hands a customer their card and login.
 *
 * Audience: customer. Trigger: `user.sendAccountDetails` (api/user-router.ts), and
 * later `user.createCustomer`. The body is never logged (it may hold a password).
 *
 * - name: the customer's full name.
 * - loginEmail: the address they sign in with.
 * - password: only when the admin just set one and chose to include it.
 * - slug: their published card's slug, if they have one.
 * - company: the business name on the card.
 */
export function accountDetailsEmail(o: {
  name?: string | null; loginEmail: string; password?: string | null;
  slug?: string | null; company?: string | null;
}): Email {
  const slug = clean(o.slug);
  const company = clean(o.company);
  const cardUrl = slug ? cardUrlOf(slug) : null;
  const who = company || clean(o.name) || "your business";
  const password = o.password ? String(o.password) : null;

  const chips: string[] = [];
  if (cardUrl) chips.push(darkChip(`<span style="color:${TONE.green.solid}">&#9679;</span>&nbsp; ${esc(bare(cardUrl))}`));
  chips.push(darkChip("Login details inside"));

  const hero = heroBand({
    eyebrow: "Welcome aboard",
    tone: "gold",
    title: cardUrl ? "Your digital card is ready" : "Your DigitalCarda account is ready",
    sub: cardUrl
      ? `${company ? `Made for ${company} — your` : "Your"} link, your QR code and your login, all in one place.`
      : "Your login details are below — sign in to build your card.",
    chips,
  });

  const rows: [string, string][] = [
    ["Login email", `<span style="word-break:break-all">${esc(o.loginEmail)}</span>`],
  ];
  if (password) rows.push(["Password", codeValue(password)]);
  rows.push(["Sign in at", goldLink(`${SITE}/login`, "digitalcarda.in/login")]);

  const bodyHtml =
    hi(o.name) +
    p(`Welcome to DigitalCarda — we're delighted to have ${strong(who)} on board.${cardUrl ? " Here is your card:" : ""}`) +
    (cardUrl ? cardPreview(slug!, `${who} — digital business card`) + linkPanel("Share this link anywhere", cardUrl) : "") +
    sectionLabel("Your login") +
    detailTable(rows) +
    (password
      ? note(`<strong style="color:${BRAND.ink}">Please change this password</strong> after your first sign-in, under ${inkLink(`${SITE}/dashboard/settings`, "Dashboard → Settings")}. We never keep a readable copy of it.`)
      : note(`Don't know your password? Use ${inkLink(`${SITE}/forgot-password`, "Forgot password")} on the sign-in page and we'll email you a link to set one.`)) +
    button(cardUrl ? "Sign in and edit your card" : "Sign in to build your card", `${SITE}/login`) +
    (cardUrl
      ? tickList("Where to put your link", [
          `In your ${strong("WhatsApp Business")} profile and status — where most enquiries start.`,
          `One line under your name in your ${strong("email signature")}.`,
          `${strong("Print the QR")} on your visiting card, packaging or shop counter.`,
        ])
      : "") +
    helpStrip() +
    signoff();

  const text = [
    greet(o.name), "",
    cardUrl
      ? "Welcome to DigitalCarda! Your digital business card is live and ready to share."
      : "Welcome to DigitalCarda! Your account is ready — sign in to build your card.",
    "",
    ...(cardUrl ? [`Your card: ${cardUrl}`, ""] : []),
    "YOUR LOGIN",
    `Email: ${o.loginEmail}`,
    ...(password
      ? [`Password: ${password}`, `(Please change it after your first sign-in: ${SITE}/dashboard/settings)`]
      : [`Don't know your password? Set one here: ${SITE}/forgot-password`]),
    `Sign in: ${SITE}/login`,
    ...(cardUrl
      ? ["", "WHERE TO PUT YOUR LINK", "- Your WhatsApp Business profile and status", "- One line in your email signature", "- The QR on your visiting card, packaging or counter"]
      : []),
    "", `Need help getting set up? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT}).`,
    "", "— Team DigitalCarda",
  ];

  return {
    kind: "accountDetailsEmail",
    subject: cardUrl
      ? (company ? `${company} — your digital card is live` : "Your digital card is live")
      : (company ? `${company} — your DigitalCarda login` : "Your DigitalCarda login details"),
    html: layout({
      preheader: cardUrl
        ? "Your card link, your QR code and your login — everything to get started."
        : "Your login details, and where to sign in to build your card.",
      hero, bodyHtml, audience: "customer",
    }),
    text: text.join("\n"),
  };
}

/* ── Verify email address ────────────────────────────────────────────────── */

/**
 * Verify email address — a one-tap confirmation link (valid 3 days).
 *
 * Audience: customer (any role). Triggers: email signup (`welcomeNewAccount` with
 * verifyEmail), `auth.resendVerification`, and — in the next phase — the NEW
 * address after a sign-in email change.
 *
 * - name: the account's full name.
 * - link: the verify-email URL (built on the server, trusted).
 * - email: optional; the address being confirmed, shown in the header.
 * - purpose: optional. "signup" adds a welcome line; "resend" says it's a fresh
 *   link; "changed" explains the address was just set as the new sign-in email.
 *   Omitted = neutral copy that fits both signup and resend.
 */
export function verifyEmailAddressEmail(o: {
  name?: string | null; link: string;
  email?: string | null; purpose?: "signup" | "resend" | "changed" | null;
}): Email {
  const email = clean(o.email);
  const changed = o.purpose === "changed";
  const intro = changed
    ? "You've made this the sign-in email for your DigitalCarda account. Please confirm it's really yours — it keeps your account secure and makes sure password-reset links and updates about your card and plan reach you."
    : `${o.purpose === "signup" ? "Thanks for joining DigitalCarda! " : o.purpose === "resend" ? "Here's a fresh link, as you asked. " : ""}Please confirm this is your email address — it keeps your account secure and makes sure password-reset links and updates about your card and plan reach you.`;

  const hero = heroLight({
    badge: changed ? "New sign-in email" : "One quick step",
    tone: "blue",
    title: changed ? "Confirm your new email address" : "Confirm your email address",
    sub: email ? `For ${email} · the link works for 3 days` : "One tap — the link works for 3 days.",
  });

  const bodyHtml =
    hi(o.name) +
    p(esc(intro)) +
    button("Verify my email", o.link) +
    fallbackLink(o.link) +
    small(changed
      ? "Don't recognise this? If you didn't add this address to a DigitalCarda account, ignore this email — it won't be confirmed."
      : "If you didn't create a DigitalCarda account, you can safely ignore this email.") +
    signoff();

  return {
    kind: "verifyEmailAddressEmail",
    subject: changed ? "Confirm your new email — DigitalCarda" : "Verify your email — DigitalCarda",
    html: layout({
      preheader: changed
        ? "One tap confirms this as the sign-in email for your DigitalCarda account."
        : "One tap confirms your address and secures your DigitalCarda account.",
      hero, bodyHtml, accent: TONE.blue.solid, audience: "customer",
    }),
    text: [
      greet(o.name), "", intro, "",
      `Verify${email ? ` ${email}` : " your email"}: ${o.link}`, "",
      "This link expires in 3 days.",
      changed
        ? "If you didn't add this address to a DigitalCarda account, ignore this email."
        : "If you didn't create a DigitalCarda account, ignore this email.",
      "", "— Team DigitalCarda",
    ].join("\n"),
  };
}

/* ── Password changed ────────────────────────────────────────────────────── */

/**
 * Password changed — security notice.
 *
 * Audience: customer (any role). Triggers: `auth.changePassword`,
 * `auth.resetPassword`, and — in the next phase — an admin `user.setPassword`
 * (pass `byTeam: true`).
 *
 * - name: the account's full name.
 * - byTeam: true when our support team set the password at the customer's request.
 * - at: optional; when it changed (shown in India time).
 */
export function passwordChangedEmail(o: { name?: string | null; byTeam?: boolean | null; at?: Date | null }): Email {
  const byTeam = !!o.byTeam;
  const at = validDate(o.at);
  const when = at ? `${whenIst(at)} IST` : null;

  const hero = heroLight({
    badge: "Security",
    tone: "blue",
    title: byTeam ? "Our team reset your password" : "Your password was changed",
    sub: byTeam
      ? "We set a new password at your request. Your old one no longer works."
      : "A quick confirmation — if it was you, there's nothing to do.",
  });

  const waMsg = "Hi DigitalCarda team, my password was changed and it wasn't me. Please help me secure my account.";
  const bodyHtml =
    hi(o.name) +
    p(byTeam
      ? "As you asked, our support team has set a new password for your DigitalCarda account. Your old password no longer works."
      : "The password for your DigitalCarda account was just changed. Your old password no longer works.") +
    infoGrid([
      ["What changed", "Password"],
      ["When", when ? esc(when) : null],
      ["Changed by", byTeam ? "DigitalCarda support team" : null],
    ]) +
    (byTeam
      ? note(`Once you're signed in, change it to a password only you know, under ${inkLink(`${SITE}/dashboard/settings`, "Dashboard → Settings")}.`)
      : "") +
    callout("red",
      byTeam ? "Didn't ask us for this?" : "Wasn't you?",
      byTeam
        ? "Tell us right away — we'll help you secure your account."
        : "Reset your password now, then tell us — we'll help you secure your account.",
      supportPills(waMsg, "My password was changed and it wasn't me", byTeam ? undefined : { label: "Reset password", href: `${SITE}/forgot-password` })) +
    signoff();

  return {
    kind: "passwordChangedEmail",
    subject: "Your password was changed",
    html: layout({
      preheader: byTeam
        ? "Our support team set a new password for your DigitalCarda account, as you asked."
        : "Your DigitalCarda password was just changed. If it was you, there's nothing to do.",
      hero, bodyHtml, accent: TONE.blue.solid, audience: "customer",
    }),
    text: [
      greet(o.name), "",
      byTeam
        ? "As you asked, our support team has set a new password for your DigitalCarda account. Your old password no longer works."
        : "The password for your DigitalCarda account was just changed. Your old password no longer works.",
      ...(when ? [`When: ${when}`] : []),
      "",
      ...(byTeam
        ? [`Once you're signed in, change it to one only you know: ${SITE}/dashboard/settings`, "", "Didn't ask us for this? Tell us right away:"]
        : [`Wasn't you? Reset your password now: ${SITE}/forgot-password`, "Then tell us:"]),
      ...supportText,
      "", "— Team DigitalCarda",
    ].join("\n"),
  };
}

/* ── Password reset ──────────────────────────────────────────────────────── */

/**
 * Password reset link (valid 60 minutes, works once).
 *
 * Audience: customer (any role). Trigger: `auth.requestPasswordReset`.
 *
 * - name: the account's full name.
 * - link: the reset-password URL (built on the server, trusted).
 */
export function passwordResetEmail(o: { name?: string | null; link: string }): Email {
  const hero = heroLight({
    badge: "Password reset",
    tone: "blue",
    title: "Choose a new password",
    sub: "This link works once and expires in 60 minutes.",
  });

  const bodyHtml =
    hi(o.name) +
    p("We received a request to reset the password for your DigitalCarda account. Tap the button to choose a new one.") +
    button("Choose a new password", o.link) +
    fallbackLink(o.link) +
    callout("blue", "Didn't ask for this?",
      `Ignore this email — your password stays the same, and the link stops working in 60 minutes. If these keep arriving, ${inkLink(waLink(SUPPORT_WHATSAPP.wa, "Hi DigitalCarda team, I keep getting password reset emails I didn't ask for.") || WA_SUPPORT, "tell us on WhatsApp")}.`) +
    small(`Link expired? Ask for a new one at ${inkLink(`${SITE}/forgot-password`, "digitalcarda.in/forgot-password")}.`) +
    signoff();

  return {
    kind: "passwordResetEmail",
    subject: "Reset your DigitalCarda password",
    html: layout({
      preheader: "Tap the link within 60 minutes to choose a new password.",
      hero, bodyHtml, accent: TONE.blue.solid, audience: "customer",
    }),
    text: [
      greet(o.name), "",
      "We received a request to reset the password for your DigitalCarda account.",
      `Choose a new one (the link works once and expires in 60 minutes): ${o.link}`, "",
      "Didn't ask for this? Ignore this email — your password stays the same.",
      `Link expired? Ask for a new one: ${SITE}/forgot-password`,
      "", "— Team DigitalCarda",
    ].join("\n"),
  };
}

/* ── Sign-in email changed (NEW) ─────────────────────────────────────────── */

/**
 * Sign-in email changed — security notice sent to the OLD address.
 *
 * Audience: customer (any role). Trigger: `auth.updateProfile`, only when the
 * email really changes (`email && email !== ctx.user.email.toLowerCase()`), so an
 * ordinary profile save doesn't send it.
 *
 * - name: the account holder's full name (ctx.user.fullName).
 * - oldEmail: the previous sign-in email (ctx.user.email) — the recipient.
 * - newEmail: the new sign-in email.
 * - at: optional; when it changed (shown in India time).
 * - verificationSent: optional; true when verifyEmailAddressEmail({purpose:"changed"})
 *   was sent to the new address, so this email can say so.
 */
export function emailChangedEmail(o: {
  name?: string | null; oldEmail: string; newEmail: string;
  at?: Date | null; verificationSent?: boolean | null;
}): Email {
  const at = validDate(o.at);
  const when = at ? `${whenIst(at)} IST` : null;
  const waMsg = "Hi DigitalCarda team, the sign-in email on my account was changed and it wasn't me. Please help me get my account back.";

  const hero = heroLight({
    badge: "Security notice",
    tone: "amber",
    title: "Your sign-in email was changed",
    sub: "We're writing to your old address so you know about it.",
  });

  const bodyHtml =
    hi(o.name) +
    p(`The email you use to sign in to DigitalCarda was just changed${when ? ` (${esc(when)})` : ""}. From now on, sign-in and account emails go to the new address.`) +
    swapCard(o.oldEmail, o.newEmail) +
    callout("red", "Wasn't you?",
      "Someone may have got into your account. Message us right away from this address — we'll check it with you and help you get your account back and secure it.",
      supportPills(waMsg, "My sign-in email was changed and it wasn't me")) +
    spacer(14) +
    small(`If you made this change, there's nothing more to do${o.verificationSent ? " — just confirm the new address from the link we sent there" : ""}.`) +
    signoff();

  return {
    kind: "emailChangedEmail",
    subject: "Your DigitalCarda sign-in email was changed",
    html: layout({
      preheader: "If you didn't make this change, message us right away and we'll help you secure your account.",
      hero, bodyHtml, accent: TONE.amber.solid, audience: "customer",
    }),
    text: [
      greet(o.name), "",
      "The email you use to sign in to DigitalCarda was just changed. From now on, sign-in and account emails go to the new address.", "",
      `Before: ${o.oldEmail}`,
      `Now:    ${o.newEmail}`,
      ...(when ? [`When:   ${when}`] : []),
      "",
      "WASN'T YOU?",
      "Someone may have got into your account. Message us right away from this address and we'll help you get it back and secure it.",
      ...supportText,
      "",
      `If you made this change, there's nothing more to do${o.verificationSent ? " — just confirm the new address from the link we sent there" : ""}.`,
      "", "— Team DigitalCarda",
    ].join("\n"),
  };
}

/* ── Account deletion scheduled (NEW) ────────────────────────────────────── */

/**
 * Account deletion scheduled — confirms a deletion request and how to undo it.
 *
 * Audience: customer. Trigger: `requestAccountDeletion` (api/lib/account-deletion.ts),
 * after the request row is stored and the account switched off — not when it
 * returns `already: true`. Covers the website and the app. Send it to the
 * account's email (user.email), which is still intact at this point.
 *
 * Facts it states: the account is switched off and signed out everywhere now,
 * the card shows as paused, the erasure is due on `scheduledFor`, and only
 * support can cancel it (the owner can't sign in meanwhile).
 *
 * - name: user.fullName.
 * - scheduledFor: when the erasure is due (the request's scheduledFor).
 * - source: optional; "web" (digitalcarda.in/account/delete) or "app".
 * - requestedAt: optional; when they asked (used for the days count; defaults to now).
 * - reason: optional; the reason they typed, shown back to them.
 */
export function accountDeletionScheduledEmail(o: {
  name?: string | null; scheduledFor: Date;
  source?: "web" | "app" | null; requestedAt?: Date | null; reason?: string | null;
}): Email {
  const due = validDate(o.scheduledFor);
  const asked = validDate(o.requestedAt);
  const daysLeft = due ? Math.max(0, Math.round((due.getTime() - (asked ?? new Date()).getTime()) / DAY)) : null;
  const onDate = due ? `on ${dateIst(due)}` : "after 30 days";
  const beforeDate = due ? `before ${dateIst(due)}` : "as soon as you can";
  const where = o.source === "web" ? " on the DigitalCarda website" : o.source === "app" ? " in the DigitalCarda app" : "";
  const reason = clean(o.reason);

  const chips = [
    darkChip("Signed out everywhere"),
    darkChip("Card paused"),
    ...(o.source === "web" ? [darkChip("Asked on the website")] : o.source === "app" ? [darkChip("Asked in the app")] : []),
  ];
  const hero = heroBand({
    eyebrow: "Account deletion scheduled",
    tone: "red",
    title: `Your account will be erased ${onDate}`,
    sub: "It's switched off now: you're signed out everywhere and your card is paused.",
    aside: daysLeft !== null ? { label: "To change your mind", value: plural(daysLeft, "day"), sub: due ? `until ${dayMonth(due)} ${yearIst(due)}` : undefined } : undefined,
    chips,
  });

  const cancelMsg = "Hi DigitalCarda team, I asked to delete my account but I've changed my mind. Please cancel the deletion.";
  const notMeMsg = "Hi DigitalCarda team, I did not ask to delete my account. Please stop the deletion and help me secure it.";

  const bodyHtml =
    hi(o.name) +
    p(`We've received your request${where} to delete your DigitalCarda account${asked ? ` (${esc(whenIst(asked))} IST)` : ""}. Here's what happens next.`) +
    progressSteps(["Request received", "Switched off", "Time to change your mind", due ? `Erased ${dayMonth(due)}` : "Erased"], 2, "gold") +
    spacer(14) +
    infoGrid([
      ["Right now", "You're signed out on every device, you can't sign in, and visitors see your card as paused."],
      [due ? `From ${dayMonth(due)}` : "After 30 days", "We permanently erase your card and its photos, visitor enquiries, visit stats, uploads, custom domain and notifications."],
      ["What we keep", "Payment, invoice and order records the law requires us to keep — no longer linked to your name or email."],
      ["Your reason", reason ? esc(reason) : null],
    ]) +
    callout("gold", "Changed your mind?",
      `You can't sign in while the deletion is pending, so message us ${esc(beforeDate)} — we'll cancel it and your account and card come back.`,
      supportPills(cancelMsg, "Please cancel my account deletion")) +
    callout("red", "Didn't ask for this?",
      "Someone may know your password. Contact us immediately — we'll stop the deletion and help you secure your account.",
      supportPills(notMeMsg, "I did not ask to delete my account")) +
    signoff();

  return {
    kind: "accountDeletionScheduledEmail",
    subject: due ? `Your DigitalCarda account will be deleted on ${dateIst(due)}` : "Your DigitalCarda account is scheduled for deletion",
    html: layout({
      preheader: `You're signed out and your card is paused. To cancel, message us ${beforeDate}.`,
      hero, bodyHtml, accent: TONE.red.solid, audience: "customer",
    }),
    text: [
      greet(o.name), "",
      `We've received your request${where} to delete your DigitalCarda account${asked ? ` (${whenIst(asked)} IST)` : ""}.`, "",
      "WHAT HAPPENS NOW",
      "- Right now: you're signed out on every device, you can't sign in, and visitors see your card as paused.",
      `- ${due ? `From ${dateIst(due)}` : "After 30 days"}: we permanently erase your card and its photos, visitor enquiries, visit stats, uploads, custom domain and notifications.`,
      "- What we keep: payment, invoice and order records the law requires us to keep, no longer linked to your name or email.",
      ...(reason ? [`- Your reason: ${reason}`] : []),
      "",
      "CHANGED YOUR MIND?",
      `You can't sign in while the deletion is pending, so message us ${beforeDate} and we'll cancel it — your account and card come back.`, "",
      "DIDN'T ASK FOR THIS?",
      "Someone may know your password. Contact us immediately and we'll stop the deletion and help you secure your account.", "",
      ...supportText,
      "", "— Team DigitalCarda",
    ].join("\n"),
  };
}

/* ── Account restored (NEW) ──────────────────────────────────────────────── */

/**
 * Account restored — a pending deletion was cancelled.
 *
 * Audience: customer. Trigger: `cancelAccountDeletion` (api/lib/account-deletion.ts),
 * i.e. the team cancelled the request from Admin → Account Deletions. Send it to
 * the request's `email` (still the original address; look up the name by userId).
 *
 * - name: the account holder's full name.
 * - slug: optional; their card's slug, to show the link that's back.
 */
export function accountRestoredEmail(o: { name?: string | null; slug?: string | null }): Email {
  const slug = clean(o.slug);
  const cardUrl = slug ? cardUrlOf(slug) : null;

  const hero = heroBand({
    eyebrow: "Deletion cancelled",
    tone: "green",
    title: "Welcome back — your account is restored",
    sub: "Nothing was erased. Your account is switched back on and your card is showing again.",
    chips: [darkChip(`<span style="color:${TONE.green.solid}">&#10003;</span>&nbsp; Account active`), darkChip("Card back online"), darkChip("Sign in to continue", BRAND.gold)],
  });

  const bodyHtml =
    hi(o.name) +
    p("We've cancelled the deletion of your DigitalCarda account. Everything is where you left it — your card, your enquiries and your settings.") +
    (cardUrl ? linkPanel("Your card is back at", cardUrl) : "") +
    callout("green", "Sign in again",
      "When the deletion was requested, we signed you out everywhere for your safety. Sign in once on the website and in the app, and you're set.",
      actionPills([{ label: "Sign in", href: `${SITE}/login`, tone: "dark" }, { label: "Forgot password?", href: `${SITE}/forgot-password`, tone: "light" }])) +
    note(`If your free trial or plan ran out while the account was switched off, your card stays paused until you choose a plan — ${inkLink(`${SITE}/dashboard/subscription`, "see plans")}.`) +
    helpStrip() +
    signoff();

  return {
    kind: "accountRestoredEmail",
    subject: "Welcome back — your DigitalCarda account is restored",
    html: layout({
      preheader: "Nothing was erased. Sign in again to pick up where you left off.",
      hero, bodyHtml, accent: TONE.green.solid, audience: "customer",
    }),
    text: [
      greet(o.name), "",
      "We've cancelled the deletion of your DigitalCarda account. Nothing was erased — your card, your enquiries and your settings are where you left them.",
      ...(cardUrl ? ["", `Your card is back at: ${cardUrl}`] : []),
      "",
      "SIGN IN AGAIN",
      "When the deletion was requested, we signed you out everywhere for your safety. Sign in once on the website and in the app:",
      `${SITE}/login  (forgot your password? ${SITE}/forgot-password)`, "",
      `If your free trial or plan ran out while the account was switched off, your card stays paused until you choose a plan: ${SITE}/dashboard/subscription`, "",
      `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (${WA_SUPPORT}).`,
      "", "— Team DigitalCarda",
    ].join("\n"),
  };
}
