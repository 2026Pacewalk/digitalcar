/*
 * Reseller / partner-programme emails.
 *
 * The journey these five cover, in order:
 *   applied  -> resellerApplicationReceivedEmail   (applicant, public form)
 *   decided  -> resellerApprovedEmail              (new account, set-password link)
 *            -> resellerApprovedExistingEmail      (existing account upgraded)
 *            -> resellerRejectedEmail              (applicant)
 *   earning  -> resellerCommissionEmail            (a customer they added paid for a plan)
 *
 * Design idea: joining a business programme, not signing up for an app. The
 * approval emails carry a "partner pass" (a membership-card panel with the
 * partner's name, business, sign-in email and commission rate) and a real,
 * numbered set-up sequence; the commission email puts the money in the hero
 * and shows the pending-payout ledger (before + this sale = now).
 *
 * Facts the copy relies on (checked against the code, 2026-09):
 * - Applications are reviewed by hand in /admin/reseller-applications; the
 *   public page promises a decision "usually within 1-2 business days".
 * - The set-password link is a 1-hour reset token (api/lib/jwt.ts), used once;
 *   saving the password sends the user to /login, and a reseller lands on /reseller.
 * - The reseller sidebar is Dashboard, My Customers (with "Add Customer") and
 *   Payment Orders (read-only list of their customers' payments, CSV export).
 * - Commission is credited in activateVerifiedOrder on EVERY verified plan order
 *   of a user whose users.resellerId is the reseller (manual or Razorpay).
 * - Nothing pays out reseller_profiles.pendingPayout today, so the copy never
 *   promises a payout date or an automatic transfer: it says how to ask.
 */

import {
  layout, heroBand, heroLight, sectionLabel, button, infoGrid, callout, stepRow,
  tickList, progressSteps, quoteBlock, helpStrip, signoff, darkChip, goldLink, inkLink,
  esc, inr, safeUrl, firstName, p, hi, small, strong, spacer, dateIst, showPhone,
  BRAND, TONE, ON_DARK, SITE, SUPPORT_WHATSAPP, FONT,
  type Email,
} from "./kit";

/* ── Local constants & helpers ───────────────────────────────────────────── */

const PARTNER_HOME = `${SITE}/reseller`;
const PARTNER_CUSTOMERS = `${SITE}/reseller/customers`;
const PARTNER_PAYMENTS = `${SITE}/reseller/payments`;
const LOGIN = `${SITE}/login`;
const FORGOT = `${SITE}/forgot-password`;
const APPLY = `${SITE}/become-reseller`;
const SIGNUP = `${SITE}/signup`;

const APPLICANT_FOOTER = "You're receiving this because you applied to the DigitalCarda reseller partner programme.";
const PARTNER_FOOTER = "You're receiving this because you're a DigitalCarda reseller partner.";

const clean = (s?: string | null) => String(s ?? "").trim();

/** A finite number, or null for missing / blank / non-numeric input. */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || (typeof v === "string" && !v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Rupees with paise when there are any: "₹999", "₹99.90", "₹1,234.50".
    (kit.inr drops trailing zeros, which reads oddly for commission amounts.) */
const rupees = (v: unknown): string => {
  const n = num(v) ?? 0;
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r)
    ? inr(r)
    : "₹" + r.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** "10%" / "12.5%" from 10, "10.00", "12.50"; null when missing or not positive. */
const pct = (v: unknown): string | null => {
  const n = num(v);
  return n === null || n <= 0 ? null : `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
};

const CYCLE: Record<string, string> = { monthly: "monthly", yearly: "yearly", triennial: "3-year" };
/** Plan name + billing cycle, as a label ("Business · yearly") and for a
    sentence ("Business (yearly)", "a yearly plan", "a plan"). Either may be missing. */
const planWords = (plan?: string | null, cycle?: string | null) => {
  const name = clean(plan);
  const k = clean(cycle).toLowerCase();
  const c = CYCLE[k] || k;
  return {
    label: [name, c].filter(Boolean).join(" · "),
    sentence: name ? `${name}${c ? ` (${c})` : ""}` : c ? `a ${c} plan` : "a plan",
  };
};

/** The partner pass: a membership-card panel for the approval emails. All
    values are plain text (escaped here). Rows that have no data drop out. */
function partnerPass(o: { name?: string; company?: string | null; email?: string | null; rate?: string | null; since?: Date }): string {
  const name = clean(o.name) || "DigitalCarda partner";
  const company = clean(o.company);
  const showCompany = !!company && company.toLowerCase() !== name.toLowerCase();
  const label = (t: string) =>
    `<div style="font-family:${FONT};font-size:10px;font-weight:700;color:${ON_DARK.sub};text-transform:uppercase;letter-spacing:1.1px">${esc(t)}</div>`;
  const foot: string[] = [];
  if (clean(o.email)) foot.push(`<td valign="top" style="padding:0 12px 0 0">${label("Sign-in email")}
      <div style="font-family:${FONT};font-size:13.5px;font-weight:700;color:${ON_DARK.chipText};padding-top:4px;word-break:break-all">${esc(clean(o.email))}</div></td>`);
  if (o.since) foot.push(`<td valign="top" align="${foot.length ? "right" : "left"}" style="white-space:nowrap">${label("Partner since")}
      <div style="font-family:${FONT};font-size:13.5px;font-weight:700;color:${ON_DARK.chipText};padding-top:4px">${esc(dateIst(o.since))}</div></td>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 6px"><tr>
    <td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:16px;border-top:4px solid ${BRAND.gold};padding:20px 22px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="top">
          <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${BRAND.gold};text-transform:uppercase;letter-spacing:1.4px">DigitalCarda &middot; Reseller partner</div>
          <div style="font-family:${FONT};font-size:21px;line-height:1.25;font-weight:800;color:#FFFFFF;padding-top:8px;word-break:break-word;overflow-wrap:anywhere">${esc(name)}</div>
          ${showCompany ? `<div style="font-family:${FONT};font-size:13.5px;font-weight:600;color:#C3CFDF;padding-top:3px;word-break:break-word">${esc(company)}</div>` : ""}
        </td>
        ${o.rate ? `<td valign="top" align="right" style="padding-left:14px;white-space:nowrap">
          ${label("Commission")}
          <div style="font-family:${FONT};font-size:28px;line-height:1.15;font-weight:800;color:${BRAND.gold};letter-spacing:-.5px;padding-top:2px">${esc(o.rate)}</div>
          <div style="font-family:${FONT};font-size:11px;color:${ON_DARK.sub};padding-top:1px">of each paid plan</div>
        </td>` : ""}
      </tr></table>
      ${foot.length ? `<div style="height:1px;background:${ON_DARK.chipLine};margin:16px 0 12px;font-size:0;line-height:0">&nbsp;</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${foot.join("")}</tr></table>` : ""}
    </td>
  </tr></table>`;
}

/** A small money statement: rows, then a gold total band. Values are plain text
    already formatted (rupees()); a "green" row is a credit. */
function payoutLedger(rows: { label: string; value: string; credit?: boolean }[], totalLabel: string, total: string): string {
  const cell = `border-bottom:1px solid ${BRAND.line};font-family:${FONT}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">
    ${rows.map((r) => `<tr>
      <td style="padding:13px 8px 13px 18px;${cell};font-size:14px;font-weight:600;color:${BRAND.body};word-break:break-word">${esc(r.label)}</td>
      <td align="right" style="padding:13px 18px 13px 0;${cell};font-size:14.5px;font-weight:800;color:${r.credit ? TONE.green.solid : BRAND.ink};white-space:nowrap">${esc(r.value)}</td>
    </tr>`).join("")}
    <tr>
      <td bgcolor="${BRAND.goldTint}" style="background:${BRAND.goldTint};padding:14px 8px 14px 18px;border-radius:0 0 0 14px;font-family:${FONT};font-size:14px;font-weight:800;color:${BRAND.ink}">${esc(totalLabel)}</td>
      <td bgcolor="${BRAND.goldTint}" align="right" style="background:${BRAND.goldTint};padding:14px 18px 14px 0;border-radius:0 0 14px 0;font-family:${FONT};font-size:19px;font-weight:800;color:${BRAND.ink};white-space:nowrap">${esc(total)}</td>
    </tr>
  </table>`;
}

/** The ₹ mark for the hero's icon tile (a glyph, not an emoji). */
const RUPEE_TILE = `<span style="font-family:${FONT};font-size:26px;font-weight:800;color:${BRAND.navyDeep}">&#8377;</span>`;

/* ── 1. Application received ─────────────────────────────────────────────── */

/**
 * Audience: the applicant (not yet a reseller, may have no account).
 * Trigger: public reseller.submitApplication (api/reseller-router.ts:43), right
 *   after the owner alert. Sent even when a pending application already exists.
 * Fields:
 * - name: full name typed on /become-reseller.
 * - email / phone / companyName (optional, added): what they submitted, echoed back
 *   in a "What you sent us" panel so they can spot a typo.
 * - alreadyPending (optional, added): true when the router found an existing
 *   pending application and skipped the insert - the copy says "no need to apply again".
 */
export function resellerApplicationReceivedEmail(o: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  alreadyPending?: boolean;
}): Email {
  const name = clean(o.name);
  const email = clean(o.email);
  const phone = clean(o.phone);
  const company = clean(o.companyName);
  const again = !!o.alreadyPending;

  const title = again ? "Your application is already with us" : "Thanks — your partner application is in";
  const sub = again
    ? "No need to apply again. Our team is still reviewing it and will email you the decision."
    : "Our team will review it and email you the decision, usually within 1–2 business days.";
  const lead = again
    ? `We already have a pending application from you, so we haven't created a second one. A member of our team is reviewing it and will email ${email ? `you at <strong>${esc(email)}</strong>` : "you"} as soon as there's a decision.`
    : `Thanks for applying to become a <strong>DigitalCarda reseller partner</strong>. A member of our team reviews every application by hand, and we'll email ${email ? `you at <strong>${esc(email)}</strong>` : "you"} as soon as there's a decision.`;

  const perks = [
    "A partner dashboard with your customers, your earnings and your commission rate",
    "Add customers to your account yourself — each one stays linked to you",
    "Commission credited each time a customer you added pays for a plan",
    "Your customers' payments in one list, with a CSV export",
  ];

  const bodyHtml =
    hi(name) +
    p(lead) +
    progressSteps(["Applied", "Team review", "Decision by email", "Partner account"], 1) +
    (email || phone || company
      ? sectionLabel("What you sent us") +
        infoGrid([
          ["Name", name ? esc(name) : null],
          ["Business", company ? esc(company) : null],
          ["Phone", phone ? esc(showPhone(phone)) : null],
          ["Email", email ? esc(email) : null],
        ]) +
        small("Spotted a mistake, or want to tell us more about your business? Just reply to this email.")
      : "") +
    tickList("What partners get", perks.map((t) => esc(t))) +
    helpStrip() +
    signoff("The DigitalCarda partner team");

  const text = [
    `Hi ${firstName(name) || "there"},`,
    "",
    again
      ? `We already have a pending reseller application from you, so there's no need to apply again. Our team is reviewing it and will email ${email ? `you at ${email}` : "you"} as soon as there's a decision.`
      : `Thanks for applying to become a DigitalCarda reseller partner. A member of our team reviews every application by hand, and we'll email ${email ? `you at ${email}` : "you"} as soon as there's a decision - usually within 1-2 business days.`,
    "",
    "Where you are: Applied (done) > Team review (now) > Decision by email > Partner account",
    ...(email || phone || company
      ? ["", "What you sent us:",
        ...(name ? [`  Name: ${name}`] : []),
        ...(company ? [`  Business: ${company}`] : []),
        ...(phone ? [`  Phone: ${showPhone(phone)}`] : []),
        ...(email ? [`  Email: ${email}`] : []),
        "Spotted a mistake? Just reply to this email."]
      : []),
    "",
    "What partners get:",
    ...perks.map((t) => `  - ${t}`),
    "",
    `Questions? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa}).`,
    "",
    "Warm regards,",
    "The DigitalCarda partner team",
  ].join("\n");

  return {
    kind: "resellerApplicationReceivedEmail",
    subject: again ? "Your reseller application is already with us 👋" : "We received your reseller application 👋",
    html: layout({
      preheader: again
        ? "No need to apply again — we're reviewing the application you already sent."
        : "A member of our team reviews every partner application and emails the decision, usually within 1–2 business days.",
      hero: heroLight({ badge: again ? "Already received" : "Application received", title, sub }),
      bodyHtml,
      accent: BRAND.gold,
      footer: APPLICANT_FOOTER,
    }),
    text,
  };
}

/* ── 2 & 3. Approved ─────────────────────────────────────────────────────── */

type ApprovedExtras = {
  /** The sign-in email of the (new or upgraded) reseller account. */
  email?: string | null;
  /** reseller_profiles.companyName (the router sets it to companyName || fullName). */
  companyName?: string | null;
  /** reseller_profiles.commissionRate, e.g. "10.00" (10 on a new profile). */
  commissionRate?: number | string | null;
  /** When the application was approved; defaults to now (the email is sent at approval). */
  approvedAt?: Date;
  /** An offline partner given a login by the admin — they never applied, so the
      copy says they have been set up rather than that an application was approved. */
  invited?: boolean;
};

function firstStepsTail(startAt: number): { html: string; text: string[] } {
  return {
    html:
      stepRow(startAt, "Add your first customer",
        `Open ${strong("My Customers")} and tap ${strong("Add Customer")}. Enter their name, email and a temporary password to share with them — from then on they're linked to your account.`) +
      stepRow(startAt + 1, "Earn when they pay for a plan",
        `Each time a customer you added pays for a plan, your commission is credited to your partner earnings and we email you the figures. Their payments show up under ${strong("Payment Orders")}.`),
    text: [
      `${startAt}. Add your first customer - open My Customers and tap Add Customer. Enter their name, email and a temporary password to share with them; they stay linked to your account. ${PARTNER_CUSTOMERS}`,
      `${startAt + 1}. Earn when they pay for a plan - each time a customer you added pays for a plan, your commission is credited to your partner earnings and we email you the figures. Their payments show under Payment Orders: ${PARTNER_PAYMENTS}`,
    ],
  };
}

/**
 * Audience: a newly approved reseller who had NO account (one was just created).
 * Trigger: admin reseller.approve (api/reseller-router.ts:92), isNew branch.
 * Fields:
 * - name: application full name.
 * - link: the set-password URL (1-hour, single-use reset token). If it is not an
 *   http(s) URL the email falls back to the Forgot password page.
 * - email / companyName / commissionRate / approvedAt (optional, added): shown on
 *   the partner pass. The router has all of them at the call site.
 */
export function resellerApprovedEmail(o: { name?: string; link: string } & ApprovedExtras): Email {
  const name = clean(o.name);
  const first = firstName(name);
  const email = clean(o.email);
  const rate = pct(o.commissionRate);
  const href = safeUrl(o.link) || FORGOT;
  const tail = firstStepsTail(3);

  const bodyHtml =
    hi(name) +
    p(o.invited
      ? "You’ve been set up as a <strong>DigitalCarda reseller partner</strong>. Your partner account is ready — set a password to open it."
      : "Your application to become a <strong>DigitalCarda reseller partner</strong> is <strong>approved</strong>. Your partner account is ready — set a password to open it.") +
    button("Set your password", href) +
    small(`This link works once and for 60 minutes. If it has expired, use ${goldLink(FORGOT, "Forgot password")} with ${email ? `<strong>${esc(email)}</strong>` : "this email address"} and we'll send a fresh one.`) +
    partnerPass({ name, company: o.companyName, email, rate, since: o.approvedAt || new Date() }) +
    sectionLabel("Your first steps") +
    stepRow(1, "Set your password", "Use the button above. Once it's saved, you'll be taken to the sign-in page.") +
    stepRow(2, "Sign in to your partner dashboard",
      `Sign in at ${inkLink(LOGIN, "digitalcarda.in/login")}${email ? ` with ${strong(email)}` : ""}. You'll land on your partner dashboard, with your customers, earnings and commission rate.`) +
    tail.html +
    helpStrip() +
    signoff("The DigitalCarda partner team");

  const text = [
    `Hi ${first || "there"},`,
    "",
    o.invited
      ? "You’ve been set up as a DigitalCarda reseller partner. Your partner account is ready - set a password to open it:"
      : "Your application to become a DigitalCarda reseller partner is approved. Your partner account is ready - set a password to open it:",
    href,
    "",
    `The link works once and for 60 minutes. If it has expired, use Forgot password (${FORGOT}) with ${email || "this email address"} and we'll send a fresh one.`,
    "",
    "Your partner account:",
    `  Partner: ${name || "DigitalCarda partner"}`,
    ...(clean(o.companyName) && clean(o.companyName).toLowerCase() !== name.toLowerCase() ? [`  Business: ${clean(o.companyName)}`] : []),
    ...(email ? [`  Sign-in email: ${email}`] : []),
    ...(rate ? [`  Commission: ${rate} of each paid plan`] : []),
    `  Partner since: ${dateIst(o.approvedAt || new Date())}`,
    "",
    "Your first steps:",
    "1. Set your password - use the link above. Once it's saved, you'll be taken to the sign-in page.",
    `2. Sign in to your partner dashboard at ${LOGIN}${email ? ` with ${email}` : ""}. You'll land on ${PARTNER_HOME}, with your customers, earnings and commission rate.`,
    ...tail.text,
    "",
    `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa}).`,
    "",
    "Warm regards,",
    "The DigitalCarda partner team",
  ].join("\n");

  return {
    kind: "resellerApprovedEmail",
    subject: o.invited ? "Your DigitalCarda partner account is ready 🎉" : "You're approved — welcome, partner! 🎉",
    html: layout({
      preheader: "Set your password within 60 minutes to open your partner dashboard and add your first customer.",
      hero: heroBand({
        eyebrow: o.invited ? "Partner account ready" : "Partner application approved",
        tone: "green",
        icon: "🎉",
        title: first ? `Welcome to the partner programme, ${first}` : "Welcome to the partner programme",
        sub: "Your DigitalCarda reseller account is ready. Set a password to open it.",
        chips: [darkChip("New reseller account"), darkChip("Set-up link valid for 60 minutes", BRAND.gold)],
      }),
      bodyHtml,
      accent: TONE.green.solid,
      footer: PARTNER_FOOTER,
    }),
    text,
  };
}

/**
 * Audience: an approved applicant who ALREADY had a DigitalCarda account; the
 *   account's role was switched to reseller (same email, same password).
 * Trigger: admin reseller.approve (api/reseller-router.ts:94), existing-user branch.
 * Fields: name, plus the same optional extras as resellerApprovedEmail
 *   (email, companyName, commissionRate, approvedAt).
 */
export function resellerApprovedExistingEmail(o: { name?: string } & ApprovedExtras): Email {
  const name = clean(o.name);
  const first = firstName(name);
  const email = clean(o.email);
  const rate = pct(o.commissionRate);
  const tail = firstStepsTail(2);

  const bodyHtml =
    hi(name) +
    p("Your application to become a <strong>DigitalCarda reseller partner</strong> is <strong>approved</strong>, and your existing account is now a reseller account. There's nothing new to set up — sign in with your usual email and password.") +
    button("Open your partner dashboard", PARTNER_HOME) +
    small("Anything you've already set up, like your own card, stays as it is.") +
    partnerPass({ name, company: o.companyName, email, rate, since: o.approvedAt || new Date() }) +
    sectionLabel("Your first steps") +
    stepRow(1, "Sign in as usual",
      `Sign in at ${inkLink(LOGIN, "digitalcarda.in/login")}${email ? ` with ${strong(email)}` : ""} and your usual password. You'll land on your partner dashboard, with your customers, earnings and commission rate.`) +
    tail.html +
    helpStrip() +
    signoff("The DigitalCarda partner team");

  const text = [
    `Hi ${first || "there"},`,
    "",
    "Your application to become a DigitalCarda reseller partner is approved, and your existing account is now a reseller account. There's nothing new to set up - sign in with your usual email and password.",
    "",
    `Open your partner dashboard: ${PARTNER_HOME}`,
    "Anything you've already set up, like your own card, stays as it is.",
    "",
    "Your partner account:",
    `  Partner: ${name || "DigitalCarda partner"}`,
    ...(clean(o.companyName) && clean(o.companyName).toLowerCase() !== name.toLowerCase() ? [`  Business: ${clean(o.companyName)}`] : []),
    ...(email ? [`  Sign-in email: ${email}`] : []),
    ...(rate ? [`  Commission: ${rate} of each paid plan`] : []),
    `  Partner since: ${dateIst(o.approvedAt || new Date())}`,
    "",
    "Your first steps:",
    `1. Sign in as usual at ${LOGIN}${email ? ` with ${email}` : ""} and your usual password. You'll land on your partner dashboard, with your customers, earnings and commission rate.`,
    ...tail.text,
    "",
    `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa}).`,
    "",
    "Warm regards,",
    "The DigitalCarda partner team",
  ].join("\n");

  return {
    kind: "resellerApprovedExistingEmail",
    subject: "You're approved — welcome, partner! 🎉",
    html: layout({
      preheader: "Your account is now a reseller account — sign in as usual to add your first customer.",
      hero: heroBand({
        eyebrow: "Partner application approved",
        tone: "green",
        icon: "🎉",
        title: first ? `Welcome to the partner programme, ${first}` : "Welcome to the partner programme",
        sub: "Your existing account is now a reseller account — same email, same password.",
        chips: [darkChip("Account upgraded"), darkChip("Partner dashboard unlocked", BRAND.gold)],
      }),
      bodyHtml,
      accent: TONE.green.solid,
      footer: PARTNER_FOOTER,
    }),
    text,
  };
}

/* ── 4. Rejected ─────────────────────────────────────────────────────────── */

/**
 * Audience: the applicant (not a reseller).
 * Trigger: admin reseller.reject (api/reseller-router.ts:110).
 * Fields:
 * - name: application full name.
 * - note: the admin's optional note (plain text, shown as a quote; newlines kept).
 */
export function resellerRejectedEmail(o: { name?: string; note?: string | null }): Email {
  const name = clean(o.name);
  const note = clean(o.note);

  const options = [
    { html: `<strong style="color:${BRAND.ink}">Use DigitalCarda for your own business.</strong> Sign up at ${inkLink(SIGNUP, "digitalcarda.in/signup")} and your card goes live straight away.`,
      text: `Use DigitalCarda for your own business - sign up at ${SIGNUP} and your card goes live straight away.` },
    { html: `<strong style="color:${BRAND.ink}">Recommend us through Refer &amp; Earn.</strong> Every account has its own referral code. When someone signs up with yours and buys their first paid plan, a reward is added to your wallet.`,
      text: "Recommend us through Refer & Earn - every account has its own referral code. When someone signs up with yours and buys their first paid plan, a reward is added to your wallet." },
    { html: `<strong style="color:${BRAND.ink}">Apply again when things change.</strong> If your business or plans change, you're welcome to apply again at ${inkLink(APPLY, "digitalcarda.in/become-reseller")}.`,
      text: `Apply again when things change - you're welcome to apply again at ${APPLY}.` },
  ];

  const bodyHtml =
    hi(name) +
    p("Thank you for your interest in becoming a DigitalCarda reseller partner. We've reviewed your application, and we're not able to approve it at this time.") +
    (note ? sectionLabel("A note from our team") + quoteBlock(note, "DigitalCarda partner team") : "") +
    p("If you'd like to know more about this decision, just reply to this email.") +
    tickList("What you can still do", options.map((x) => x.html)) +
    helpStrip() +
    signoff("The DigitalCarda partner team");

  const text = [
    `Hi ${firstName(name) || "there"},`,
    "",
    "Thank you for your interest in becoming a DigitalCarda reseller partner. We've reviewed your application, and we're not able to approve it at this time.",
    ...(note ? ["", "A note from our team:", note] : []),
    "",
    "If you'd like to know more about this decision, just reply to this email - a real person answers.",
    "",
    "What you can still do:",
    ...options.map((x) => `  - ${x.text}`),
    "",
    `WhatsApp: ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa})`,
    "",
    "Warm regards,",
    "The DigitalCarda partner team",
  ].join("\n");

  return {
    kind: "resellerRejectedEmail",
    subject: "Update on your reseller application",
    html: layout({
      preheader: note
        ? "We can't approve it right now — there's a note from our team inside, and what you can still do."
        : "We can't approve it right now — here's what you can still do with DigitalCarda.",
      hero: heroLight({
        badge: "Partner application",
        title: "We can't approve your application right now",
        sub: "Thank you for applying to the DigitalCarda reseller partner programme.",
      }),
      bodyHtml,
      accent: BRAND.sub,
      footer: APPLICANT_FOOTER,
    }),
    text,
  };
}

/* ── 5. Commission earned ────────────────────────────────────────────────── */

/**
 * Audience: the reseller.
 * Trigger: activateVerifiedOrder (api/payment-router.ts:210) when the buyer has
 *   users.resellerId - once per verified plan order, manual or Razorpay.
 * Fields:
 * - name: the reseller's full name.
 * - customerName: the buyer's full name.
 * - amount: the commission credited (order amount x rate / 100), e.g. "99.90".
 * - pendingPayout: the reseller's pending payout AFTER this credit. The ledger
 *   shows before (pendingPayout - amount), + this commission, = now.
 * Optional, added (all available at the call site, none passed today):
 * - rate: reseller_profiles.commissionRate used, e.g. "10.00".
 * - planName: order.planName.  billingCycle: order.billingCycle ("monthly" | "yearly" | "triennial").
 * - orderAmount: what the customer paid (order.amount).
 * - totalEarnings: total commission earned after this credit (profile.totalEarnings + amount).
 * - creditedAt: when it was credited (defaults to not shown).
 */
export function resellerCommissionEmail(o: {
  name?: string;
  customerName?: string | null;
  amount: number | string;
  pendingPayout?: number | string | null;
  rate?: number | string | null;
  planName?: string | null;
  billingCycle?: string | null;
  orderAmount?: number | string | null;
  totalEarnings?: number | string | null;
  creditedAt?: Date;
}): Email {
  const who = clean(o.customerName);
  const whoText = who || "One of your customers";
  const earned = rupees(o.amount);
  const rate = pct(o.rate);
  const { label: plan, sentence: planSentence } = planWords(o.planName, o.billingCycle);
  const paid = num(o.orderAmount);
  const after = num(o.pendingPayout);
  const amt = num(o.amount) ?? 0;
  const beforeRaw = after === null ? null : Math.round((after - amt) * 100) / 100;
  const before = beforeRaw !== null && beforeRaw >= 0 ? beforeRaw : null;
  const total = num(o.totalEarnings);

  const leadHtml = `Nice work — <strong style="color:${BRAND.ink}">${esc(whoText)}</strong> just paid for ${clean(o.planName) ? `<strong style="color:${BRAND.ink}">${esc(planSentence)}</strong>` : esc(planSentence)}, so <strong style="color:${BRAND.ink}">${esc(earned)}</strong> commission has been credited to your partner earnings.`;
  const leadText = `Nice work - ${whoText} just paid for ${planSentence}, so ${earned} commission has been credited to your partner earnings.`;

  const ledgerHtml = after === null ? "" :
    sectionLabel("Your pending payout") +
    (before !== null
      ? payoutLedger([
          { label: "Before this sale", value: rupees(before) },
          { label: who ? `Commission on ${who}'s plan` : "Commission on this plan", value: `+ ${earned}`, credit: true },
        ], "Pending payout now", rupees(after))
      : payoutLedger([{ label: "This commission", value: `+ ${earned}`, credit: true }], "Pending payout now", rupees(after))) +
    (total !== null ? small(`Total commission earned so far: <strong style="color:${BRAND.ink}">${esc(rupees(total))}</strong> — shown as Total Earnings on your dashboard.`) : "");

  const saleRows: [string, string | null][] = [
    ["Customer", who ? esc(who) : null],
    ["Plan", plan ? esc(plan) : null],
    ["Customer paid", paid !== null ? esc(rupees(paid)) : null],
    ["Your rate", rate ? esc(rate) : null],
    ["Your commission", `<span style="color:${TONE.green.text};font-weight:800">${esc(earned)}</span>`],
    ["Credited on", o.creditedAt ? esc(dateIst(o.creditedAt)) : null],
  ];

  const chips = [
    plan ? darkChip(esc(plan)) : "",
    paid !== null ? darkChip(`Customer paid ${esc(rupees(paid))}`) : "",
    rate ? darkChip(`${esc(rate)} commission`, BRAND.gold) : "",
  ].filter(Boolean);

  const bodyHtml =
    hi(o.name) +
    p(leadHtml) +
    button("Open your partner dashboard", PARTNER_HOME) +
    small(`${goldLink(PARTNER_PAYMENTS, "See your customers' payments →")}`) +
    ledgerHtml +
    sectionLabel("The sale") +
    infoGrid(saleRows) +
    callout("blue", "Getting your payout",
      after !== null
        ? "Your pending payout is commission credited to you that hasn't been paid out yet. To ask about settling it, reply to this email or message us on WhatsApp."
        : "Commission credited to you is held as your pending payout until it's paid out. To ask about settling it, reply to this email or message us on WhatsApp.") +
    spacer(20) +
    p(`<span style="font-size:14px">Know another business that needs a digital card? Add them from ${inkLink(PARTNER_CUSTOMERS, "My Customers")} — you earn commission each time a customer you added pays for a plan.</span>`) +
    helpStrip();

  const text = [
    `Hi ${firstName(o.name) || "there"},`,
    "",
    leadText,
    "",
    `Open your partner dashboard: ${PARTNER_HOME}`,
    `Your customers' payments: ${PARTNER_PAYMENTS}`,
    ...(after !== null
      ? ["", "Your pending payout:",
        ...(before !== null ? [`  Before this sale: ${rupees(before)}`] : []),
        `  + This commission: ${earned}`,
        `  = Pending payout now: ${rupees(after)}`,
        ...(total !== null ? [`Total commission earned so far: ${rupees(total)}`] : [])]
      : []),
    "",
    "The sale:",
    ...(who ? [`  Customer: ${who}`] : []),
    ...(plan ? [`  Plan: ${plan}`] : []),
    ...(paid !== null ? [`  Customer paid: ${rupees(paid)}`] : []),
    ...(rate ? [`  Your rate: ${rate}`] : []),
    `  Your commission: ${earned}`,
    ...(o.creditedAt ? [`  Credited on: ${dateIst(o.creditedAt)}`] : []),
    "",
    "Getting your payout: pending payout is commission credited to you that hasn't been paid out yet. To ask about settling it, reply to this email or WhatsApp us.",
    "",
    `Know another business that needs a digital card? Add them from My Customers (${PARTNER_CUSTOMERS}) - you earn commission each time a customer you added pays for a plan.`,
    "",
    `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa}).`,
  ].join("\n");

  return {
    kind: "resellerCommissionEmail",
    subject: `You earned ${earned} commission 💰`,
    html: layout({
      preheader: `${whoText} paid for ${planSentence} — ${earned} is now in your partner earnings.`,
      hero: heroBand({
        eyebrow: "Commission earned",
        tone: "green",
        icon: RUPEE_TILE,
        title: `${whoText} just paid for a plan`,
        sub: "Your commission has been credited to your partner account.",
        aside: { label: "You earned", value: earned, sub: rate ? `${rate} commission` : undefined },
        chips,
      }),
      bodyHtml,
      accent: TONE.green.solid,
      footer: PARTNER_FOOTER,
    }),
    text,
  };
}
