/*
 * Owner alerts: every email DigitalCarda sends to the team inbox
 * (ownerAddress()). All of them use layout({ audience: "admin" }), open with the
 * one fact that matters, then say what to do and link straight to the admin
 * page where it gets done.
 *
 * Kinds are stored in email_logs and labelled in src/pages/admin/EmailLog.tsx —
 * never rename one. The three emails that used to be built inline keep their
 * old kinds ("contactEnquiryAdmin", "accountDeletionRequestAdmin") and the bulk
 * alert, which had none, now logs "bulkOrderAdmin".
 */
import {
  layout, heroBand, heroLight, heroPerson,
  sectionLabel, button, actionPills, statTiles, infoGrid, detailTable, callout, note, tickList,
  progressSteps, receipt, quoteBlock, cardPreview,
  pill, darkChip, codeValue, inkLink, goldLink, phoneLink, emailLink, mailtoLink, waLink, telLink, showPhone,
  whenIst, dayIst, dateIst, esc, inr, safeUrl, safeHex, firstName, p, strong, muted, small, mono,
  BRAND, TONE, SITE, FONT,
  type Email, type Tone,
} from "./kit";

/* ── Local helpers ───────────────────────────────────────────────────────── */

const ADMIN = {
  home: `${SITE}/admin`,
  customers: `${SITE}/admin/customers`,
  paymentOrders: `${SITE}/admin/payment-orders`,
  paymentSettings: `${SITE}/admin/settings?tab=payment`,
  referrals: `${SITE}/admin/referrals`,
  resellerApps: `${SITE}/admin/reseller-applications`,
  leads: `${SITE}/admin/leads`,
  deletions: `${SITE}/admin/deletion-requests`,
  bulk: `${SITE}/admin/bulk-orders`,
  nfc: `${SITE}/admin/nfc-orders`,
  domains: `${SITE}/admin/domains`,
  emailLog: `${SITE}/admin/email-log`,
  profile: `${SITE}/admin/profile`,
} as const;

/** The Customers page reads ?q= into its search box. */
const customerSearch = (q: string) => `${ADMIN.customers}?q=${encodeURIComponent(q)}`;

const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const count = (v: unknown) => num(v).toLocaleString("en-IN");
const plural = (v: unknown, one: string, many = `${one}s`) => `${count(v)} ${num(v) === 1 ? one : many}`;
const toDate = (v: Date | string | number | null | undefined): Date | null => {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const methodLabel = (m?: string | null) => (m === "upi" ? "UPI" : m === "bank" ? "Bank transfer" : String(m || "").toUpperCase());
const CYCLES: Record<string, string> = { monthly: "Monthly", yearly: "Yearly", triennial: "3 years" };
const cycleLabel = (c?: string | null) => (c ? CYCLES[c] || c.charAt(0).toUpperCase() + c.slice(1) : "");
const looksLikeEmail = (s?: string | null) => !!s && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(s.trim());
/** "today" / "1 day" / "4 days" */
const ageText = (days: unknown) => { const d = Math.max(0, Math.floor(num(days))); return d === 0 ? "today" : d === 1 ? "1 day" : `${d} days`; };
/** A dark-band chip from plain text. */
const dc = (text: string, fg?: string) => darkChip(esc(text), fg);
/** actionPills with a little breathing room above. */
const spacerPills = (a: Parameters<typeof actionPills>[0]) => `<div style="height:18px;font-size:0;line-height:0">&nbsp;</div>${actionPills(a)}`;
/** Plain-text body: drops null/false lines, keeps "" as blank lines. */
const lines = (xs: (string | null | undefined | false)[]) => xs.filter((x): x is string => typeof x === "string").join("\n");

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

/** The template / colour / AI draft they brought from the site into signup. */
function pickedBlock(o: SignupAlert): string {
  const colour = safeHex(o.colour);
  if (!o.template && !colour && !o.aiDraft) return "";
  const img = o.template ? safeUrl(o.template.image) : null;
  const tplUrl = o.template ? safeUrl(o.template.url) : null;
  return sectionLabel("What they picked before signing up") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF"><tr>
      ${img ? `<td width="132" valign="top" style="width:132px;padding:14px 0 14px 14px">
        <img src="${esc(img)}" width="118" alt="${esc(o.template?.name)}" style="display:block;width:118px;height:auto;border-radius:10px;border:1px solid ${BRAND.line};background:${BRAND.soft}">
      </td>` : ""}
      <td valign="middle" style="padding:16px 18px">
        ${o.template ? `<div style="font-family:${FONT};font-size:10px;font-weight:700;color:${BRAND.sub};text-transform:uppercase;letter-spacing:.9px">Template</div>
        <div style="font-family:${FONT};font-size:16px;font-weight:800;color:${BRAND.ink};padding:3px 0 10px">${tplUrl ? inkLink(tplUrl, o.template.name) : esc(o.template.name)}</div>` : ""}
        ${colour ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px"><tr>
          <td width="18" height="18" bgcolor="${colour}" style="width:18px;height:18px;border-radius:5px;border:1px solid ${BRAND.line};font-size:0;line-height:0">&nbsp;</td>
          <td style="padding-left:8px;font-family:${FONT};font-size:13px;color:${BRAND.body}">Colour ${mono(colour.toUpperCase())}</td>
        </tr></table>` : ""}
        ${o.aiDraft ? `<div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${BRAND.body}">&#10022; Brought a draft from the <strong style="color:${BRAND.ink}">AI Card Generator</strong>, so their card already has text.</div>` : ""}
      </td>
    </tr></table>`;
}

/**
 * Owner alert for every new customer account (email or Google signup).
 * Trigger: alertOwnerOfSignup in api/auth-router.ts, after the starter card and trial exist.
 * kind: "newSignupAdminEmail"
 */
export function newSignupAdminEmail(o: SignupAlert): Email {
  const at = o.at ?? new Date();
  const first = firstName(o.name) || "there";
  const who = o.name || o.email;
  const cardUrl = o.slug ? `${SITE}/${encodeURIComponent(o.slug)}` : null;
  const via = o.method === "google" ? "Google" : "email";
  const adminUrl = customerSearch(o.email);

  const hero = heroPerson({
    eyebrow: "New signup", tone: "green", when: at,
    name: who, sub: o.business, photo: o.photo,
    chips: [
      dc(`Signed up with ${via}`),
      darkChip(o.emailVerified ? "&#10003; Email verified" : "Email not verified yet", o.emailVerified ? "#86EFAC" : "#FCD34D"),
      o.place ? darkChip(`&#9906; ${esc(o.place)}`) : "",
      o.referral ? darkChip(`Referred by ${esc(o.referral.name)}`, "#C4B5FD") : "",
    ].filter(Boolean),
  });

  const tiles: { label: string; value: string; sub?: string }[] = [];
  if (o.trial) tiles.push({ label: "Trial ends", value: esc(dayIst(o.trial.endsAt)), sub: `${num(o.trial.days)}-day free trial${o.trial.voucher ? ` · ${esc(o.trial.voucher)}` : ""}` });
  if (o.counts) {
    tiles.push({ label: "Signups today", value: count(o.counts.today), sub: `${count(o.counts.month)} this month` });
    tiles.push({ label: "Customers", value: count(o.counts.total), sub: "all time" });
  }

  const waHello = waLink(o.phone, `Hi ${first}, this is the DigitalCarda team 👋 Thanks for signing up!${cardUrl ? ` Your card is already live at ${cardUrl.replace(/^https:\/\//, "")}.` : ""} Would you like a hand setting it up?`);

  const bodyHtml =
    (tiles.length ? statTiles(tiles) : "") +
    sectionLabel("Say hello") +
    p(`<span style="font-size:14px">A short message while they're still setting up is the easiest way to help them finish their card.</span>`) +
    actionPills([
      { label: "WhatsApp", href: waHello, tone: "whatsapp" },
      { label: "Call", href: telLink(o.phone), tone: "dark" },
      { label: "Email", href: mailtoLink(o.email, "Welcome to DigitalCarda") },
      { label: "Open their card", href: cardUrl },
    ]) +
    sectionLabel("Account") +
    infoGrid([
      ["Email", `${emailLink(o.email)} ${o.emailVerified ? muted("· verified") : muted("· not verified yet")}`],
      ["Phone", o.phone ? phoneLink(o.phone) : muted("Not given")],
      ["Business", o.business ? esc(o.business) : muted("Not given")],
      ["Card link", cardUrl ? inkLink(cardUrl, cardUrl.replace(/^https:\/\//, "")) : muted("Not created — check the admin")],
      ["Account", `#${esc(o.id)} ${muted("· customer")}`],
    ]) +
    sectionLabel("Where they came from") +
    infoGrid([
      ["Location", o.place ? esc(o.place) : muted("Unknown")],
      ["Device", o.device ? esc(o.device) : null],
      ["Signup page", o.page ? mono(o.page) : null],
      ["Referred by", o.referral ? `${esc(o.referral.name)} ${muted(`· code ${esc(o.referral.code)}`)}` : null],
      ["Signed up", esc(whenIst(at))],
    ]) +
    pickedBlock(o) +
    (o.slug ? sectionLabel("Their card right now") + cardPreview(o.slug, `${o.name || "Their"}'s card`) : "") +
    button("Open in admin", adminUrl);

  const subjectBits = [who, o.business, o.place].filter(Boolean);
  return {
    kind: "newSignupAdminEmail",
    subject: `New signup: ${subjectBits.join(" · ")}`,
    html: layout({
      preheader: `${who}${o.business ? ` (${o.business})` : ""} just started a free trial${o.place ? ` from ${o.place}` : ""}.`,
      hero, bodyHtml, accent: TONE.green.solid, audience: "admin",
    }),
    text: lines([
      `New signup: ${who}${o.business ? ` (${o.business})` : ""}`, "",
      `Email: ${o.email}${o.emailVerified ? " (verified)" : " (not verified yet)"}`,
      `Phone: ${o.phone ? showPhone(o.phone) : "not given"}`,
      `Signed up with: ${via}, ${whenIst(at)}`,
      `Account: #${o.id}`,
      cardUrl ? `Card: ${cardUrl}` : "Card: not created — check the admin",
      o.trial ? `Trial: ${o.trial.days} days, ends ${dayIst(o.trial.endsAt)}${o.trial.voucher ? ` (${o.trial.voucher})` : ""}` : null,
      o.place ? `Location: ${o.place}` : null,
      o.device ? `Device: ${o.device}` : null,
      o.page ? `Signup page: ${o.page}` : null,
      o.referral ? `Referred by: ${o.referral.name} (code ${o.referral.code})` : null,
      o.template ? `Template: ${o.template.name}` : null,
      safeHex(o.colour) ? `Colour: ${safeHex(o.colour)!.toUpperCase()}` : null,
      o.aiDraft ? "Brought a draft from the AI Card Generator" : null,
      o.counts ? "" : null,
      o.counts ? `Signups today: ${o.counts.today} · this month: ${o.counts.month} · customers: ${o.counts.total}` : null,
      "", `Say hello on WhatsApp: ${waHello || "no phone given"}`,
      `Admin: ${adminUrl}`,
    ]),
  };
}

/* ── Referral signup ────────────────────────────────────────────────────── */

/** Referrer → new user, as two linked cards. Names are plain text. */
function referralChain(from: { label: string; name: string; sub?: string | null }, to: { label: string; name: string; sub?: string | null }): string {
  const box = (b: { label: string; name: string; sub?: string | null }, tone: Tone) => `
    <td width="44%" valign="top" bgcolor="${TONE[tone].tint}" style="background:${TONE[tone].tint};border:1px solid ${TONE[tone].line};border-radius:14px;padding:14px 16px">
      <div style="font-family:${FONT};font-size:10px;font-weight:800;color:${TONE[tone].text};text-transform:uppercase;letter-spacing:1px">${esc(b.label)}</div>
      <div style="font-family:${FONT};font-size:16px;font-weight:800;color:${BRAND.ink};padding-top:4px;word-break:break-word">${esc(b.name)}</div>
      ${b.sub ? `<div style="font-family:${FONT};font-size:12px;color:${BRAND.sub};padding-top:2px;word-break:break-all">${esc(b.sub)}</div>` : ""}
    </td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr>
    ${box(from, "violet")}
    <td width="12%" align="center" valign="middle" style="font-family:${FONT};font-size:22px;font-weight:800;color:${BRAND.gold}">&rarr;</td>
    ${box(to, "green")}
  </tr></table>`;
}

/**
 * Owner alert when a signup used someone's referral link or code.
 * Trigger: welcomeNewAccount in api/auth-router.ts, once resolveReferrer matches another user.
 * kind: "referralSignupAdminEmail"
 * Added optional fields: referrerEmail, rewardPercent (referral_commission_percent),
 * discountPercent (referral_discount_percent), at.
 */
export function referralSignupAdminEmail(o: {
  newUserName?: string; newUserEmail?: string; referrerName?: string; code?: string;
  /** The referrer's email, to find them in Customers. */
  referrerEmail?: string | null;
  /** Share of the new user's first paid order credited to the referrer (app setting). */
  rewardPercent?: number | null;
  /** Discount the new user gets on their first plan (app setting). */
  discountPercent?: number | null;
  at?: Date;
}): Email {
  const at = o.at ?? new Date();
  const who = o.newUserName || o.newUserEmail || "A new user";
  const newFirst = firstName(o.newUserName) || "the new user";
  const referrer = o.referrerName || (o.code ? `code ${o.code}` : "a referrer");
  const reward = num(o.rewardPercent) > 0 ? `${num(o.rewardPercent)}% of that payment` : "a share of that payment";
  const discount = num(o.discountPercent) > 0 ? `${num(o.discountPercent)}% off` : "a discount on";

  const hero = heroPerson({
    eyebrow: "Referral signup", tone: "violet", when: at,
    name: who, sub: `Joined through ${o.referrerName ? `${o.referrerName}'s` : "a"} referral link`,
    chips: [o.code ? dc(`Code ${o.code}`) : "", dc("Refer & Earn")].filter(Boolean),
  });

  const bodyHtml =
    referralChain(
      { label: "Referred by", name: referrer, sub: o.referrerEmail },
      { label: "Just joined", name: who, sub: o.newUserEmail },
    ) +
    callout("violet", "Nothing to do now",
      `When ${esc(newFirst)} buys their first paid plan, ${esc(o.referrerName || "the referrer")} gets ${esc(reward)} in their Refer &amp; Earn wallet automatically, and ${esc(newFirst)} gets ${esc(discount)} that first plan.`) +
    sectionLabel("Details") +
    infoGrid([
      ["New user's email", o.newUserEmail ? emailLink(o.newUserEmail) : null],
      ["Referrer's email", o.referrerEmail ? emailLink(o.referrerEmail) : null],
      ["Code used", o.code ? mono(o.code) : null],
      ["Joined", esc(whenIst(at))],
    ]) +
    spacerPills([
      { label: "Open new user", href: o.newUserEmail ? customerSearch(o.newUserEmail) : null, tone: "dark" },
      { label: "Open referrer", href: o.referrerEmail ? customerSearch(o.referrerEmail) : null },
      { label: "Referrals", href: ADMIN.referrals },
    ]);

  return {
    kind: "referralSignupAdminEmail",
    subject: `Referral signup: ${o.newUserName || "New user"} (via ${o.referrerName || o.code || "referral"})`,
    html: layout({
      preheader: `${who} joined with ${o.referrerName ? `${o.referrerName}'s` : "a"} link — the reward is credited automatically when they go paid.`,
      hero, bodyHtml, accent: TONE.violet.solid, audience: "admin",
    }),
    text: lines([
      "Referral signup.", "",
      `New user: ${who}${o.newUserEmail ? ` (${o.newUserEmail})` : ""}`,
      `Referred by: ${o.referrerName || "—"}${o.referrerEmail ? ` (${o.referrerEmail})` : ""}`,
      o.code ? `Code: ${o.code}` : null,
      "",
      `When ${newFirst} buys their first paid plan, ${o.referrerName || "the referrer"} gets ${reward} in their wallet automatically, and ${newFirst} gets ${discount} that first plan.`,
      "", `Referrals: ${ADMIN.referrals}`,
    ]),
  };
}

/* ── Manual payment to verify ───────────────────────────────────────────── */

/**
 * Owner alert: a customer submitted a UPI / bank payment reference for a plan.
 * Trigger: payment.createOrder in api/payment-router.ts.
 * kind: "paymentToVerifyAdminEmail"
 * Added optional fields: billingCycle, phone, coupon, orderId, at.
 * Fixed: the button went to /admin/payments, which redirects to Settings → Payment;
 * it now opens Payment Orders, where the verify button is.
 */
export function paymentToVerifyAdminEmail(o: {
  name?: string; email?: string; planName: string; amount: number; reference: string; method?: string;
  billingCycle?: string | null;
  phone?: string | null;
  /** Coupon applied to this order, and the rupees it took off. */
  coupon?: { code: string; discount?: number | null } | null;
  /** payment_orders.id */
  orderId?: number | null;
  at?: Date;
}): Email {
  const at = o.at ?? new Date();
  const who = o.name || o.email || "A customer";
  const method = methodLabel(o.method) || "Manual";
  const cycle = cycleLabel(o.billingCycle);
  const where = o.method === "bank" ? "your bank statement" : "your UPI app or bank statement";

  const hero = heroBand({
    eyebrow: "Payment to verify", tone: "blue",
    title: o.name ? `Did ${o.name}'s payment reach you?` : "Did this payment reach you?",
    sub: `Their ${o.planName} plan switches on as soon as you verify it.`,
    aside: { label: "Amount", value: inr(o.amount), sub: method },
    chips: [dc(o.planName), cycle ? dc(cycle) : "", o.coupon ? dc(`Coupon ${o.coupon.code}`) : ""].filter(Boolean),
  });

  const bodyHtml =
    sectionLabel("Find this reference") +
    p(codeValue(o.reference)) +
    small(`Match it in ${where} before you verify — look for ${strong(inr(o.amount))}.`) +
    progressSteps(["Customer paid", "You check it", "Plan goes live"], 1, "blue") +
    button("Verify in Payment Orders", ADMIN.paymentOrders) +
    sectionLabel("Order") +
    infoGrid([
      ["Customer", esc(who)],
      ["Email", o.email ? emailLink(o.email) : null],
      ["Phone", o.phone ? phoneLink(o.phone) : null],
      ["Plan", `${esc(o.planName)}${cycle ? ` ${muted(`· ${esc(cycle)}`)}` : ""}`],
      ["Method", esc(method)],
      ["Reference", mono(o.reference)],
      ["Coupon", o.coupon ? `${mono(o.coupon.code)}${num(o.coupon.discount) > 0 ? ` ${muted(`· ${esc(inr(o.coupon.discount))} off`)}` : ""}` : null],
      ["Amount", `<strong style="color:${BRAND.ink}">${esc(inr(o.amount))}</strong>`],
      ["Order", o.orderId ? `#${esc(o.orderId)}` : null],
      ["Submitted", esc(whenIst(at))],
    ]) +
    callout("amber", "Not in your account?",
      "Reject it in Payment Orders with a short note. They get an email with your note, so they can check the reference and pay again.");

  return {
    kind: "paymentToVerifyAdminEmail",
    subject: `Payment to verify: ${o.planName} — ${inr(o.amount)}`,
    html: layout({
      preheader: `Look for reference ${o.reference} in ${where}, then verify it to switch the plan on.`,
      hero, bodyHtml, accent: TONE.blue.solid, audience: "admin",
    }),
    text: lines([
      `Payment to verify: ${inr(o.amount)} from ${who}`, "",
      `Reference: ${o.reference}`,
      `Match it in ${where}, then verify it so their plan goes live.`, "",
      `Customer: ${who}${o.email ? ` (${o.email})` : ""}`,
      o.phone ? `Phone: ${showPhone(o.phone)}` : null,
      `Plan: ${o.planName}${cycle ? ` (${cycle})` : ""}`,
      `Method: ${method}`,
      o.coupon ? `Coupon: ${o.coupon.code}${num(o.coupon.discount) > 0 ? ` (${inr(o.coupon.discount)} off)` : ""}` : null,
      `Amount: ${inr(o.amount)}`,
      o.orderId ? `Order: #${o.orderId}` : null,
      `Submitted: ${whenIst(at)}`, "",
      `Verify: ${ADMIN.paymentOrders}`,
      "Not in your account? Reject it with a note — they get an email with your note.",
    ]),
  };
}

/* ── Refer & Earn payout request ────────────────────────────────────────── */

/**
 * Owner alert: a customer asked for their Refer & Earn wallet to be paid out.
 * Trigger: referral.requestWithdrawal in api/referral-router.ts (the amount is
 * already held from their wallet).
 * kind: "payoutRequestAdminEmail"
 * Added optional fields: phone, balanceAfter (wallet left after the hold), requestId, at.
 */
export function payoutRequestAdminEmail(o: {
  name?: string; email?: string; amount: number; method: string; destination: string; accountName?: string | null; ifsc?: string | null;
  phone?: string | null;
  /** Wallet balance left after this amount was held. */
  balanceAfter?: number | null;
  /** withdrawal_requests.id */
  requestId?: number | null;
  at?: Date;
}): Email {
  const at = o.at ?? new Date();
  const who = o.name || o.email || "A customer";
  const isBank = o.method === "bank";
  const method = isBank ? "Bank transfer" : methodLabel(o.method);

  const hero = heroBand({
    eyebrow: "Payout request", tone: "blue",
    title: `${who} asked for their referral earnings`,
    sub: "The amount is already held from their wallet, so it can't be spent twice while you pay it.",
    aside: { label: "To send", value: inr(o.amount), sub: `via ${method}` },
    chips: [dc(method), dc("Refer & Earn wallet")],
  });

  const dest: [string, string][] = isBank
    ? [
        ["Account number", codeValue(o.destination)],
        ...(o.ifsc ? [["IFSC", codeValue(o.ifsc)] as [string, string]] : []),
        ...(o.accountName ? [["Account holder", esc(o.accountName)] as [string, string]] : []),
      ]
    : [
        [o.method === "upi" ? "UPI ID" : "Send to", codeValue(o.destination)],
        ...(o.accountName ? [["Name on account", esc(o.accountName)] as [string, string]] : []),
        ...(o.ifsc ? [["IFSC", codeValue(o.ifsc)] as [string, string]] : []),
      ];
  dest.push(["Amount", `<span style="font-size:18px;font-weight:800;color:${BRAND.ink}">${esc(inr(o.amount))}</span>`]);

  const bodyHtml =
    sectionLabel("Send it here") +
    detailTable(dest) +
    progressSteps(["Requested", "You transfer", "Mark as paid"], 1, "blue") +
    button("Open payouts", ADMIN.referrals) +
    small(`In Referrals, open the <strong style="color:${BRAND.ink}">Payouts</strong> tab and mark it paid with the transfer reference — they get an email confirming it.`) +
    callout("amber", "Something looks off?", "Reject it instead. The full amount goes straight back to their wallet.") +
    sectionLabel("Requested by") +
    infoGrid([
      ["Name", esc(who)],
      ["Email", o.email ? emailLink(o.email) : null],
      ["Phone", o.phone ? phoneLink(o.phone) : null],
      ["Wallet left", o.balanceAfter != null ? esc(inr(o.balanceAfter)) : null],
      ["Request", o.requestId ? `#${esc(o.requestId)}` : null],
      ["Requested", esc(whenIst(at))],
    ]);

  return {
    kind: "payoutRequestAdminEmail",
    subject: `Payout request: ${inr(o.amount)} — ${o.name || o.email || "user"}`,
    html: layout({
      preheader: `Send ${inr(o.amount)} by ${method} to ${o.destination}, then mark it paid in Referrals.`,
      hero, bodyHtml, accent: TONE.blue.solid, audience: "admin",
    }),
    text: lines([
      `Payout request: ${inr(o.amount)} for ${who}`, "",
      `Method: ${method}`,
      `${isBank ? "Account number" : o.method === "upi" ? "UPI ID" : "Send to"}: ${o.destination}`,
      o.ifsc ? `IFSC: ${o.ifsc}` : null,
      o.accountName ? `Account name: ${o.accountName}` : null,
      `Amount: ${inr(o.amount)}`, "",
      `Requested by: ${who}${o.email ? ` (${o.email})` : ""}`,
      o.phone ? `Phone: ${showPhone(o.phone)}` : null,
      o.balanceAfter != null ? `Wallet left: ${inr(o.balanceAfter)}` : null,
      `Requested: ${whenIst(at)}`, "",
      "The amount is already held from their wallet. After you transfer it, mark it paid (Referrals → Payouts) with the reference; rejecting returns it to their wallet.",
      `Payouts: ${ADMIN.referrals}`,
    ]),
  };
}

/* ── Reseller application ───────────────────────────────────────────────── */

/**
 * Owner alert: someone applied to become a reseller partner.
 * Trigger: public reseller.submitApplication in api/reseller-router.ts.
 * kind: "resellerApplicationAdminEmail"
 * Added optional fields: repeat (a pending application already existed for
 * this email, so no new row was saved), at.
 */
export function resellerApplicationAdminEmail(o: {
  name?: string; email?: string; phone?: string | null; companyName?: string | null; message?: string | null;
  /** True when this email already had a pending application (nothing new was saved). */
  repeat?: boolean;
  at?: Date;
}): Email {
  const at = o.at ?? new Date();
  const who = o.name || o.email || "New partner";
  const first = firstName(o.name) || "there";

  const hero = heroPerson({
    eyebrow: o.repeat ? "Reseller application · again" : "Reseller application", tone: "violet", when: at,
    name: who, sub: o.companyName,
    chips: [
      o.phone ? dc(showPhone(o.phone)) : "",
      o.email ? dc(o.email) : "",
      o.repeat ? dc("Already waiting for review", "#FCD34D") : "",
    ].filter(Boolean),
  });

  const bodyHtml =
    (o.repeat ? callout("amber", "They applied again", "An application from this email is already waiting, so nothing new was saved. They may be waiting to hear back.") : "") +
    (o.message ? sectionLabel("In their words") + quoteBlock(o.message, o.name || undefined) : "") +
    sectionLabel("Talk to them") +
    actionPills([
      { label: "WhatsApp", href: waLink(o.phone, `Hi ${first}, thanks for applying to be a DigitalCarda reseller partner. Is now a good time to talk?`), tone: "whatsapp" },
      { label: "Call", href: telLink(o.phone), tone: "dark" },
      { label: "Email", href: o.email ? mailtoLink(o.email, "Your DigitalCarda reseller application") : null },
    ]) +
    sectionLabel("Application") +
    infoGrid([
      ["Name", esc(who)],
      ["Company", o.companyName ? esc(o.companyName) : muted("Not given")],
      ["Email", o.email ? emailLink(o.email) : muted("Not given")],
      ["Phone", o.phone ? phoneLink(o.phone) : muted("Not given")],
      ["Applied", esc(whenIst(at))],
    ]) +
    button("Review application", ADMIN.resellerApps) +
    small("Approving sets up their reseller account; rejecting closes the application. They get an email either way.");

  return {
    kind: "resellerApplicationAdminEmail",
    subject: `Reseller application: ${o.name || o.email || "New partner"}${o.repeat ? " (again)" : ""}`,
    html: layout({
      preheader: `${who}${o.companyName ? ` from ${o.companyName}` : ""} wants to sell DigitalCarda — approve or reject in the admin.`,
      hero, bodyHtml, accent: TONE.violet.solid, audience: "admin",
    }),
    text: lines([
      `${o.repeat ? "Reseller application (again — one is already pending)" : "New reseller application"}.`, "",
      `Name: ${who}`,
      `Email: ${o.email || "—"}`,
      `Phone: ${o.phone ? showPhone(o.phone) : "—"}`,
      `Company: ${o.companyName || "—"}`,
      `Message: ${o.message || "—"}`,
      `Applied: ${whenIst(at)}`, "",
      `Review: ${ADMIN.resellerApps}`,
    ]),
  };
}

/* ── Website contact enquiry (was inline in api/contact-router.ts) ──────── */

export type ContactEnquiryAlert = {
  /** As typed on the /contact form. */
  name: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  /** The requirement's label, e.g. "Bulk Cards for a Team" (REQUIREMENTS in contact-router). */
  requirement?: string | null;
  message?: string | null;
  /** Set when the visitor was signed in. */
  userId?: number | null;
  /** Whether storeEnquiry() saved it to Admin → Leads. false = this email is the only record. */
  stored?: boolean;
  at?: Date;
};

/**
 * Owner alert for the website /contact form. Send it with the visitor as reply-to,
 * and keep it awaited: contact.send needs its result.
 * Trigger: contact.send in api/contact-router.ts.
 * kind: "contactEnquiryAdmin" (unchanged from the inline email)
 */
export function contactEnquiryAdminEmail(o: ContactEnquiryAlert): Email {
  const at = o.at ?? new Date();
  const first = firstName(o.name) || "there";
  const guest = !o.userId;

  const hero = heroPerson({
    eyebrow: "Website enquiry", tone: "gold", when: at,
    name: o.name || o.email, sub: o.businessName,
    chips: [
      o.requirement ? dc(o.requirement, BRAND.gold) : "",
      dc(guest ? "Guest" : `Signed-in user #${o.userId}`),
    ].filter(Boolean),
  });

  const bodyHtml =
    (o.stored === false
      ? callout("red", "Not saved to Leads", "Saving it to Admin → Leads failed, so this email is the only record of this enquiry. Keep it until you have replied.")
      : "") +
    (o.message ? quoteBlock(o.message, o.name) : note(`${esc(first)} didn't write a message${o.requirement ? ` — they picked <strong style="color:${BRAND.ink}">${esc(o.requirement)}</strong>` : ""}.`)) +
    sectionLabel("Reply") +
    p(`<span style="font-size:14px">Hit reply and your answer goes straight to ${esc(first)}.</span>`) +
    actionPills([
      { label: "WhatsApp", href: waLink(o.phone, `Hi ${first}, thanks for contacting DigitalCarda${o.requirement ? ` about ${o.requirement}` : ""}. How can we help?`), tone: "whatsapp" },
      { label: "Call", href: telLink(o.phone), tone: "dark" },
      { label: "Email", href: looksLikeEmail(o.email) ? mailtoLink(o.email, "Re: your DigitalCarda enquiry") : null },
    ]) +
    sectionLabel("Details") +
    infoGrid([
      ["Name", esc(o.name)],
      ["Email", looksLikeEmail(o.email) ? emailLink(o.email) : esc(o.email)],
      ["Phone", o.phone ? phoneLink(o.phone) : muted("Not given")],
      ["Business", o.businessName ? esc(o.businessName) : muted("Not given")],
      ["Looking for", o.requirement ? esc(o.requirement) : muted("Not chosen")],
      ["From", guest ? "A guest" : `Signed-in user #${esc(o.userId)}`],
      ["Received", esc(whenIst(at))],
    ]) +
    (o.stored ? button("Open in Leads", ADMIN.leads) : "");

  return {
    kind: "contactEnquiryAdmin",
    subject: `New enquiry — ${o.name}${o.businessName ? ` (${o.businessName})` : ""}`,
    html: layout({
      preheader: `${o.requirement ? `${o.requirement}: ` : ""}${o.message ? o.message.replace(/\s+/g, " ").trim().slice(0, 110) : `${o.name} wants to hear from you.`}`,
      hero, bodyHtml, accent: BRAND.gold, audience: "admin",
    }),
    text: lines([
      o.stored === false ? "NOT SAVED TO LEADS — this email is the only record.\n" : null,
      `New website enquiry from ${o.name}`, "",
      `Name: ${o.name}`,
      `Email: ${o.email}`,
      `Phone: ${o.phone ? showPhone(o.phone) : "-"}`,
      `Business: ${o.businessName || "-"}`,
      `Requirement: ${o.requirement || "-"}`,
      o.message ? `Message:\n${o.message}` : null,
      guest ? "From a guest" : `From signed-in user #${o.userId}`,
      `Received: ${whenIst(at)}`, "",
      "Reply to this email to answer them.",
      o.stored ? `Leads: ${ADMIN.leads}` : null,
    ]),
  };
}

/* ── Account deletion requested (was inline in api/lib/account-deletion.ts) ─ */

export type DeletionRequestAlert = {
  userId: number;
  name: string;
  /** The account's email. It MUST stay in the subject: completeAccountDeletion
      purges email_logs rows whose subject contains it. */
  email: string;
  /** Where they asked: the website (/account/delete) or the mobile app. */
  source: "app" | "web";
  reason?: string | null;
  /** When the erasure becomes due (request time + DELETION_GRACE_DAYS). */
  scheduledFor: Date;
  /** When they asked (defaults to now). */
  at?: Date;
};

/**
 * Owner alert: a customer asked to delete their account. The account is already
 * switched off; the team completes (or cancels) it from Admin → Account Deletions.
 * Trigger: requestAccountDeletion in api/lib/account-deletion.ts.
 * kind: "accountDeletionRequestAdmin" (unchanged from the inline email)
 */
export function accountDeletionRequestAdminEmail(o: DeletionRequestAlert): Email {
  const at = o.at ?? new Date();
  const due = toDate(o.scheduledFor) ?? at;
  const days = Math.max(0, Math.round((due.getTime() - at.getTime()) / 86_400_000));
  const where = o.source === "web" ? "on the website" : "from the mobile app";
  const first = firstName(o.name) || "they";

  const hero = heroPerson({
    eyebrow: "Account deletion requested", tone: "red", when: at,
    name: o.name || o.email, sub: o.email,
    chips: [
      dc(o.source === "web" ? "Asked on the website" : "Asked in the app"),
      dc(`Account #${o.userId}`),
      dc(`Erase from ${dateIst(due)}`, "#FCA5A5"),
    ],
  });

  const bodyHtml =
    progressSteps([`Asked · ${dayIst(at)}`, `${days}-day window to change their mind`, `Erase from ${dayIst(due)}`], 1, "red") +
    callout("amber", "Already done automatically",
      "Their account is switched off, they're signed out of every phone, and their card shows as paused.") +
    button("Open Account Deletions", ADMIN.deletions, "dark") +
    (o.reason ? sectionLabel("Their reason") + quoteBlock(o.reason, o.name) : "") +
    sectionLabel("When you complete it") +
    tickList("Erased", [
      "Their cards and photos, enquiries, notifications and media",
      "Custom domains, team membership, app sessions and push tokens",
      "Their email-log rows and card visit stats",
    ]) +
    note(`<strong style="color:${BRAND.ink}">Kept for the books:</strong> payments, invoices, subscriptions, orders, and referral and wallet ledgers — attached to an account that no longer says who it was.`) +
    callout("blue", "If they change their mind",
      `Cancel the request. The account and card switch back on at once, and ${esc(first)} signs in again with the same password.`) +
    sectionLabel("Details") +
    infoGrid([
      ["Name", esc(o.name)],
      ["Email", emailLink(o.email)],
      ["Account", `#${esc(o.userId)}`],
      ["Asked", `${esc(whenIst(at))} ${muted(`· ${esc(where)}`)}`],
      ["Erase from", `<strong style="color:${BRAND.ink}">${esc(dateIst(due))}</strong>`],
    ]);

  return {
    kind: "accountDeletionRequestAdmin",
    subject: `Account deletion requested — ${o.email}`,
    html: layout({
      preheader: `Asked ${where}. The account is already off; erase it from ${dateIst(due)} or cancel if they change their mind.`,
      hero, bodyHtml, accent: TONE.red.solid, audience: "admin",
    }),
    text: lines([
      `${o.name} (${o.email}, user #${o.userId}) asked to delete their account ${where}.`, "",
      "Already done: the account is switched off, signed out of every phone, and its card shows as paused.", "",
      `Complete the deletion on or after ${dateIst(due)}, or cancel it if they change their mind: ${ADMIN.deletions}`,
      o.reason ? `\nReason given: ${o.reason}` : null,
      "",
      "Completing it erases their cards, enquiries, notifications, media, domains, sessions, email-log rows and visit stats. Payments, invoices, subscriptions, orders and wallet ledgers are kept, without their name.",
    ]),
  };
}

/* ── Bulk-card request (was inline, unescaped, in api/bulk-order-router.ts) ─ */

export type BulkOrderAlert = {
  company?: string | null;
  contactName?: string | null;
  phone?: string | null;
  /** Not validated by the router — only used as a link when it looks like an address. */
  email?: string | null;
  quantity: number;
  /** Rupees per card as shown to them (0 / missing = to be quoted). */
  pricePerCard?: number | null;
  /** Their estimated total in rupees. */
  totalEstimate?: number | null;
  /** Bundle name, e.g. "Team 50". */
  packageName?: string | null;
  note?: string | null;
  /** Set when a signed-in user asked. */
  userId?: number | null;
  at?: Date;
};

/**
 * Owner alert: a guest or customer asked for a bulk-card quote. No payment is
 * taken; the team follows up with an invoice.
 * Trigger: public bulkOrder.create in api/bulk-order-router.ts.
 * kind: "bulkOrderAdmin" (new — the inline email logged no kind)
 */
export function bulkOrderAdminEmail(o: BulkOrderAlert): Email {
  const at = o.at ?? new Date();
  const qty = Math.max(0, Math.floor(num(o.quantity)));
  const price = num(o.pricePerCard);
  const total = num(o.totalEstimate) || price * qty;
  const who = o.contactName || o.company || o.email || o.phone || "Someone";
  const first = firstName(o.contactName) || "there";
  const emailOk = looksLikeEmail(o.email);
  const bundle = o.packageName || "Custom quantity";
  const reach = actionPills([
    { label: "WhatsApp", href: waLink(o.phone, `Hi ${first}, thanks for your DigitalCarda bulk-card request for ${qty} cards${o.company ? ` for ${o.company}` : ""}. Can we talk through the details?`), tone: "whatsapp" },
    { label: "Call", href: telLink(o.phone), tone: "dark" },
    { label: "Email", href: emailOk ? mailtoLink(o.email!.trim(), "Your DigitalCarda bulk-card quote") : null },
  ]);

  const hero = heroBand({
    eyebrow: "Bulk-card request", tone: "gold",
    title: `${count(qty)} cards for ${o.company || who}`,
    sub: `${o.contactName ? `${o.contactName} wants` : "They want"} a quote. No payment is taken — you follow up with an invoice.`,
    aside: total > 0 ? { label: "Estimate", value: inr(total), sub: price > 0 ? `${inr(price)} per card` : undefined } : undefined,
    chips: [dc(bundle), dc(o.userId ? `Customer #${o.userId}` : "Guest")],
  });

  const bodyHtml =
    sectionLabel("Get back to them") +
    (reach || small("They left no phone number or email we can use — check the details below.")) +
    sectionLabel("What they asked for") +
    (price > 0
      ? receipt({
          rows: [{ name: bundle, sub: `${inr(price)} per card`, qty, amount: price * qty }],
          extra: total !== price * qty ? [{ label: "Their estimate", value: inr(total) }] : [],
          totalLabel: "Estimated total", total,
        })
      : infoGrid([["Quantity", `${esc(count(qty))} cards`], ["Bundle", esc(bundle)], ["Price", muted("To be quoted")]])) +
    (o.note ? sectionLabel("Their note") + quoteBlock(o.note, o.contactName || undefined) : "") +
    sectionLabel("Contact") +
    infoGrid([
      ["Company", o.company ? esc(o.company) : muted("Not given")],
      ["Contact", o.contactName ? esc(o.contactName) : muted("Not given")],
      ["Phone", o.phone ? phoneLink(o.phone) : muted("Not given")],
      ["Email", o.email ? (emailOk ? emailLink(o.email.trim()) : `${esc(o.email)} ${muted("· doesn't look like an address")}`) : muted("Not given")],
      ["From", o.userId ? `Signed-in user #${esc(o.userId)}` : "A guest"],
      ["Asked", esc(whenIst(at))],
    ]) +
    progressSteps(["New", "Contacted", "Won"], 0, "gold") +
    button("Open Bulk Orders", ADMIN.bulk) +
    small("Move it to Contacted once you've spoken, so it drops off the sidebar count.");

  return {
    kind: "bulkOrderAdmin",
    subject: `New bulk-card request — ${qty} cards${o.company ? ` (${o.company})` : ""}`,
    html: layout({
      preheader: `${who} asked about ${qty} cards${total > 0 ? ` (about ${inr(total)})` : ""}. Reply with a quote.`,
      hero, bodyHtml, accent: BRAND.gold, audience: "admin",
    }),
    text: lines([
      `New bulk-card request: ${qty} cards${o.company ? ` for ${o.company}` : ""}`, "",
      `Company: ${o.company || "-"}`,
      `Contact: ${o.contactName || "-"}`,
      `Phone: ${o.phone ? showPhone(o.phone) : "-"}`,
      `Email: ${o.email || "-"}`,
      `Bundle: ${bundle}`,
      `Quantity: ${qty} cards`,
      `Per card: ${price > 0 ? inr(price) : "to be quoted"}`,
      `Estimated total: ${total > 0 ? inr(total) : "to be quoted"}`,
      o.note ? `Note: ${o.note}` : null,
      o.userId ? `From signed-in user #${o.userId}` : "From a guest",
      `Asked: ${whenIst(at)}`, "",
      `Bulk Orders: ${ADMIN.bulk}`,
    ]),
  };
}

/* ── Online (Razorpay) sale ─────────────────────────────────────────────── */

export type OnlineSaleAlert = {
  /** What was bought: a subscription plan, an add-on (ID card / membership), or the Custom Domain add-on. */
  kind: "plan" | "addon" | "domain";
  /** "Gold", "ID Card add-on", "Custom Domain" … */
  itemName: string;
  /** Billing cycle, when the item has one ("monthly" | "yearly" | "triennial"). */
  cycle?: string | null;
  /** Rupees actually paid (after any coupon). */
  amount: number;
  /** Razorpay payment id (pay_…). */
  paymentId: string;
  /** Coupon code used, and the rupees it took off. */
  coupon?: string | null;
  discount?: number | null;
  customer: { id: number; name: string; email: string; phone?: string | null };
  /** Who referred the buyer; `reward` only if a reward was actually credited for this sale. */
  referrer?: { name: string; reward?: number | null } | null;
  /** The buyer's reseller; `commission` only if it was actually credited for this sale. */
  reseller?: { name: string; commission?: number | null } | null;
  /** When the plan / add-on now runs until. */
  validTill?: Date | string | null;
  /** Razorpay was in test mode: no real money moved. */
  testMode?: boolean;
  at?: Date;
};

/**
 * Owner alert for money that arrived online. Plans, add-ons and domains all switch
 * on automatically after Razorpay confirms, so this is news, not a task.
 * Triggers: recordRazorpayPayment in api/payment-router.ts (plans, both the
 * client verify and the webhook — it is idempotent on the payment id), and the
 * add-on / domain verify procedures.
 * kind: "onlineSaleAdminEmail"
 */
export function onlineSaleAdminEmail(o: OnlineSaleAlert): Email {
  const at = o.at ?? new Date();
  const amount = num(o.amount);
  const discount = num(o.discount);
  const cycle = cycleLabel(o.cycle);
  const c = o.customer;
  const buyer = c.name || c.email;
  const first = firstName(c.name) || "there";
  const kindLabel = o.kind === "plan" ? "Plan" : o.kind === "domain" ? "Custom domain" : "Add-on";
  const validTill = toDate(o.validTill);
  const what = o.kind === "plan" ? `the ${o.itemName} plan` : o.itemName;
  const auto = o.kind === "plan" ? "The plan switched on by itself"
    : o.kind === "domain" ? "The add-on is on — they connect their domain from their dashboard"
    : "The add-on switched on by itself";

  const hero = heroBand({
    eyebrow: o.testMode ? "Test payment · no real money" : "Online sale · Razorpay",
    tone: o.testMode ? "amber" : "green", icon: "&#8377;",
    title: `${buyer} bought ${what}`,
    sub: `${auto}${o.testMode ? "." : " — nothing for you to do."}`,
    aside: { label: o.testMode ? "Test amount" : "Received", value: inr(amount), sub: cycle || undefined },
    chips: [
      dc(kindLabel),
      o.coupon ? dc(`Coupon ${o.coupon}`, "#86EFAC") : "",
      o.referrer ? dc(`Referred by ${o.referrer.name}`, "#C4B5FD") : "",
      o.reseller ? dc(`Reseller: ${o.reseller.name}`) : "",
    ].filter(Boolean),
  });

  const credits: string[] = [];
  if (o.referrer) credits.push(num(o.referrer.reward) > 0
    ? `${strong(inr(o.referrer.reward))} referral reward went to ${esc(o.referrer.name)}'s wallet.`
    : `${esc(o.referrer.name)} referred them.`);
  if (o.reseller) credits.push(num(o.reseller.commission) > 0
    ? `${strong(inr(o.reseller.commission))} commission was added to ${esc(o.reseller.name)}'s pending payout.`
    : `They belong to reseller ${esc(o.reseller.name)}.`);

  const bodyHtml =
    (o.testMode ? callout("amber", "This was a test payment",
      `Razorpay is in test mode, so no money moved, but ${esc(what)} was still switched on for this account. Switch to live keys in Settings → Payment before real customers pay.`) : "") +
    sectionLabel("The sale") +
    receipt({
      rows: [{ name: o.itemName, sub: [kindLabel, cycle].filter(Boolean).join(" · "), amount: amount + discount }],
      extra: discount > 0 ? [{ label: `Coupon ${o.coupon || ""}`.trim(), value: `− ${inr(discount)}`, tone: "green" }] : [],
      totalLabel: o.testMode ? "Paid (test)" : "Paid online", total: amount,
    }) +
    (credits.length ? callout("violet", o.referrer && o.reseller ? "Referral and reseller" : o.referrer ? "Referral" : "Reseller", credits.join("<br>")) : "") +
    sectionLabel("Customer") +
    infoGrid([
      ["Name", esc(buyer)],
      ["Email", emailLink(c.email)],
      ["Phone", c.phone ? phoneLink(c.phone) : null],
      ["Account", `#${esc(c.id)}`],
      ["Valid till", validTill ? esc(dateIst(validTill)) : null],
      ["Payment ID", mono(o.paymentId)],
      ["Paid", esc(whenIst(at))],
    ]) +
    spacerPills([
      { label: "Say thanks on WhatsApp", href: o.testMode ? null : waLink(c.phone, `Hi ${first}, thank you for choosing DigitalCarda! Your ${o.itemName} is active. If you need a hand with anything, just reply here.`), tone: "whatsapp" },
      { label: "Open customer", href: customerSearch(c.email), tone: "dark" },
      { label: o.kind === "plan" ? "Payment Orders" : "Custom domains", href: o.kind === "plan" ? ADMIN.paymentOrders : o.kind === "domain" ? ADMIN.domains : null },
    ]) +
    small(`Search ${mono(o.paymentId)} in your Razorpay dashboard to see the settlement.`);

  return {
    kind: "onlineSaleAdminEmail",
    subject: `${o.testMode ? "[Test] " : ""}Online sale: ${inr(amount)} · ${o.itemName}${cycle ? ` (${cycle.toLowerCase()})` : ""} · ${buyer}`,
    html: layout({
      preheader: `${buyer} paid ${inr(amount)} online for ${what}${o.coupon ? ` with coupon ${o.coupon}` : ""}. ${auto}.`,
      hero, bodyHtml, accent: o.testMode ? TONE.amber.solid : TONE.green.solid, audience: "admin",
    }),
    text: lines([
      o.testMode ? "TEST PAYMENT — Razorpay is in test mode, no real money moved.\n" : null,
      `Online sale: ${buyer} bought ${what} for ${inr(amount)}.`,
      `${auto}.`, "",
      `Item: ${o.itemName} (${kindLabel}${cycle ? `, ${cycle}` : ""})`,
      discount > 0 ? `Coupon: ${o.coupon || "-"} (${inr(discount)} off, list price ${inr(amount + discount)})` : null,
      `Paid: ${inr(amount)}`,
      `Payment ID: ${o.paymentId}`,
      validTill ? `Valid till: ${dateIst(validTill)}` : null, "",
      `Customer: ${buyer} (${c.email}), account #${c.id}`,
      c.phone ? `Phone: ${showPhone(c.phone)}` : null,
      o.referrer ? `Referred by: ${o.referrer.name}${num(o.referrer.reward) > 0 ? ` — ${inr(o.referrer.reward)} reward credited` : ""}` : null,
      o.reseller ? `Reseller: ${o.reseller.name}${num(o.reseller.commission) > 0 ? ` — ${inr(o.reseller.commission)} commission added` : ""}` : null,
      "", `Customer in admin: ${customerSearch(c.email)}`,
    ]),
  };
}

/* ── Payment settings changed ───────────────────────────────────────────── */

type SettingInfo = { label: string; money: boolean };
/** app_settings keys written by payment.setConfig and payment.setRazorpayConfig. */
const PAY_SETTINGS: Record<string, SettingInfo> = {
  pay_upi_id: { label: "UPI ID", money: true },
  pay_upi_name: { label: "UPI payee name", money: false },
  pay_upi_qr: { label: "UPI QR code", money: true },
  pay_bank_name: { label: "Bank name", money: false },
  pay_bank_account: { label: "Bank account number", money: true },
  pay_bank_ifsc: { label: "IFSC", money: true },
  pay_bank_holder: { label: "Account holder name", money: false },
  pay_note: { label: "Payment note shown to customers", money: false },
  razorpay_key_id: { label: "Razorpay key ID", money: true },
  razorpay_key_secret: { label: "Razorpay key secret", money: true },
  razorpay_webhook_secret: { label: "Razorpay webhook secret", money: false },
  razorpay_mode: { label: "Razorpay test / live mode", money: false },
  razorpay_enabled: { label: "Online checkout on / off", money: false },
};
/** The procedures' input names, so a caller can pass either. */
const PAY_ALIASES: Record<string, string> = {
  upiId: "pay_upi_id", upiName: "pay_upi_name", upiQr: "pay_upi_qr", bankName: "pay_bank_name",
  bankAccount: "pay_bank_account", bankIfsc: "pay_bank_ifsc", bankHolder: "pay_bank_holder", note: "pay_note",
  keyId: "razorpay_key_id", keySecret: "razorpay_key_secret", webhookSecret: "razorpay_webhook_secret",
  mode: "razorpay_mode", enabled: "razorpay_enabled",
};

export type PaymentSettingsChange = {
  /** Setting NAMES that were saved (app_settings keys such as "pay_upi_id", or the
      procedure input names such as "upiId"). Never pass the values. */
  changedKeys: string[];
  at?: Date;
  /** The admin who saved them, e.g. "Shekhar (admin@…)". */
  who?: string | null;
  ip?: string | null;
  place?: string | null;
  device?: string | null;
};

/**
 * Security alert to the owner: the details customers pay to (UPI / bank / QR) or
 * the Razorpay keys were changed. Catches a hijacked admin session redirecting money.
 * Triggers: payment.setConfig and payment.setRazorpayConfig in api/payment-router.ts.
 * kind: "paymentSettingsChangedAdminEmail"
 */
export function paymentSettingsChangedAdminEmail(o: PaymentSettingsChange): Email {
  const at = o.at ?? new Date();
  const seen = new Set<string>();
  const items = (o.changedKeys || [])
    .map((k) => String(k || "").trim()).filter(Boolean)
    .map((k) => PAY_ALIASES[k] || k)
    .filter((k) => (seen.has(k) ? false : (seen.add(k), true)))
    .map((k) => ({ key: k, ...(PAY_SETTINGS[k] || { label: k, money: false }) }));
  const moneyItems = items.filter((i) => i.money);
  const names = items.map((i) => i.label);
  const shortList = names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3} more` : names.join(", ") || "payment settings";
  const byWho = o.who ? ` by ${o.who}` : "";

  const hero = heroLight({
    badge: "Security notice", tone: "red",
    title: moneyItems.length ? "Where customers pay you was changed" : "Your payment settings were changed",
    sub: `${shortList} — saved ${whenIst(at)}${byWho}.`,
  });

  const changeRows = items.map((i, idx) => `<tr>
      <td valign="middle" style="padding:12px 0 12px 18px;${idx < items.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}">
        <div style="font-family:${FONT};font-size:14.5px;font-weight:700;color:${BRAND.ink}">${esc(i.label)}</div>
        <div style="padding-top:2px">${mono(i.key)}</div>
      </td>
      <td valign="middle" align="right" style="padding:12px 18px 12px 8px;${idx < items.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}">${i.money ? pill("Decides where money goes", "red") : pill("Changed", "amber")}</td>
    </tr>`).join("");

  const bodyHtml =
    p(`These were saved in <strong style="color:${BRAND.ink}">Settings → Payment</strong>:`) +
    (items.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#FFFFFF">${changeRows}</table>`
      : note("No setting names were recorded.")) +
    small("For safety this email never shows the new values. Open the Payment tab to see them.") +
    callout("red", "Wasn't you?",
      `Someone with admin access may be sending customer payments to their own account. Change your admin password now (My Profile → Security), then put the right details back in the Payment tab${moneyItems.length ? ", and check Payment Orders for anything paid to the new details" : ""}.`,
      actionPills([
        { label: "Change my password", href: ADMIN.profile, tone: "dark" },
        { label: "Check payment settings", href: ADMIN.paymentSettings },
      ])) +
    sectionLabel("The change") +
    infoGrid([
      ["When", esc(whenIst(at))],
      ["By", o.who ? esc(o.who) : null],
      ["IP address", o.ip ? mono(o.ip) : null],
      ["Location", o.place ? esc(o.place) : null],
      ["Device", o.device ? esc(o.device) : null],
    ]) +
    small("If you made this change, there's nothing to do.");

  return {
    kind: "paymentSettingsChangedAdminEmail",
    subject: `Payment settings changed: ${shortList}`,
    html: layout({
      preheader: `Saved ${whenIst(at)}${byWho}. If this wasn't you, change your admin password now.`,
      hero, bodyHtml, accent: TONE.red.solid, audience: "admin",
    }),
    text: lines([
      `Payment settings changed${byWho}, ${whenIst(at)}.`, "",
      "Changed:",
      ...items.map((i) => `- ${i.label} (${i.key})${i.money ? " — decides where money goes" : ""}`),
      "", "The new values are not included, for safety. See them in Settings → Payment.",
      o.ip ? `IP address: ${o.ip}` : null,
      o.place ? `Location: ${o.place}` : null,
      o.device ? `Device: ${o.device}` : null,
      "", "Wasn't you? Change your admin password now (My Profile → Security), then put the right details back.",
      `Password: ${ADMIN.profile}`,
      `Payment settings: ${ADMIN.paymentSettings}`,
    ]),
  };
}

/* ── Owner daily digest ─────────────────────────────────────────────────── */

type Day = Date | string;
export type OwnerDigest = {
  /** The day the summary is for (usually the send date). */
  date: Date;
  /** What the signup / revenue figures cover. Default "last 24 hours". */
  periodLabel?: string | null;
  /** New customer accounts: `today` in the period, `week` in the last 7 days. */
  signups?: { today: number; week?: number | null } | null;
  /** Verified revenue in the period, in rupees, split by gateway; `count` = payments. */
  revenue?: { manual: number; online: number; count: number } | null;
  /** Manual payment orders with status "pending". */
  pendingPayments?: { name: string; plan: string; amount: number; ageDays: number }[] | null;
  /** NFC order rows with status "paid", grouped per customer: row ids, name, "1 × NFC card, 1 × standee". */
  nfcToProduce?: { ids: number[]; name: string; items: string }[] | null;
  /** Manual NFC orders still "pending_payment" (no razorpayOrderId). */
  nfcAwaitingPayment?: { ids?: number[] | null; name: string; items?: string | null; amount?: number | null; ageDays?: number | null }[] | null;
  /** Bulk-card requests with status "new". */
  bulkRequests?: { company: string; quantity: number; contact?: string | null }[] | null;
  /** Refer & Earn withdrawal requests with status "pending". */
  payoutsPending?: { name: string; amount: number; ageDays?: number | null }[] | null;
  /** Deletion requests whose 30-day window has ended. */
  deletionsDue?: { email: string; due: Day }[] | null;
  /** Card trials ending within 3 days. */
  trialsEnding?: { name: string; email: string; phone?: string | null; endsOn: Day }[] | null;
  /** Card trials that ended yesterday and were not converted. */
  trialsEnded?: { name: string; email: string; phone?: string | null; endedOn?: Day | null }[] | null;
  /** Paid subscriptions whose period ends within 7 days. */
  plansExpiring?: { name: string; plan: string; endsOn: Day; email?: string | null }[] | null;
  /** email_logs rows with status "failed" in the last 24 hours. */
  failedEmails?: number | null;
  /** True totals when a list above was truncated by the query (for "+N more"). */
  totals?: Partial<Record<DigestListKey, number>>;
  /** runLifecycle()'s result, when the digest runs after it. */
  automation?: { enabled: boolean; sent: number; abandoned?: number | null } | null;
};
type DigestListKey = "pendingPayments" | "nfcToProduce" | "nfcAwaitingPayment" | "bulkRequests" | "payoutsPending"
  | "deletionsDue" | "trialsEnding" | "trialsEnded" | "plansExpiring";

/** Rows shown per list: 5, fewer on a very busy day so the email stays under 60 KB. */
const digestCap = (busyLists: number) => (busyLists <= 5 ? 5 : busyLists <= 7 ? 4 : 3);

type DRow = { main: string; sub?: string; right?: string };   // trusted HTML
type DSection = {
  key: DigestListKey | "failedEmails";
  group: "money" | "make" | "deadline" | "sales" | "health";
  title: string; short: string; phrase: (n: number) => string;
  tone: Tone; href: string; action: string; hint?: string;
  total: number; rows: DRow[]; textRows: string[];
};

/* Digest rows repeat dozens of times, so their styles are kept short: the font
   is set once per cell and the text inside inherits it. */
const dCell = `border-top:1px solid ${BRAND.line};font-family:${FONT};line-height:1.45`;
const dSub = `font-size:12px;color:${BRAND.sub}`;

/** One "needs you" list: coloured rail, count, link to the admin page, rows, "+N more". */
function digestCard(s: DSection): string {
  const t = TONE[s.tone];
  // A count-only card (failed emails) has no rows, so nothing to say "+N more" about.
  const more = s.rows.length ? Math.max(0, s.total - s.rows.length) : 0;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid ${BRAND.line};border-left:4px solid ${t.solid};border-radius:14px;background:#FFFFFF">
    <tr><td colspan="2" style="padding:13px 18px 11px;font-family:${FONT}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="font-family:${FONT};font-size:15px;font-weight:800;color:${BRAND.ink}">${esc(s.title)}&nbsp; <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${t.solid};font-size:11px;font-weight:800;color:${t.onSolid};vertical-align:1px">${esc(count(s.total))}</span></td>
        <td valign="middle" align="right" style="font-family:${FONT};font-size:13px;white-space:nowrap;padding-left:10px">${goldLink(s.href, `${s.action} →`)}</td>
      </tr></table>
      ${s.hint ? `<div style="${dSub};line-height:1.5;padding-top:3px">${esc(s.hint)}</div>` : ""}
    </td></tr>
    ${s.rows.map((r) => `<tr><td valign="top" style="padding:10px 8px 10px 18px;${dCell};font-size:14px;font-weight:700;color:${BRAND.ink};word-break:break-word">${r.main}${r.sub ? `<br><span style="${dSub};font-weight:400">${r.sub}</span>` : ""}</td><td valign="top" align="right" style="padding:10px 18px 10px 0;${dCell};font-size:13px;font-weight:700;color:${BRAND.ink};white-space:nowrap">${r.right || ""}</td></tr>`).join("")}
    ${more ? `<tr><td colspan="2" style="padding:9px 18px 11px;${dCell};font-size:12.5px">${goldLink(s.href, `+${count(more)} more in the admin`)}</td></tr>` : ""}
  </table>`;
}

const fmtDay = (v: Day | null | undefined) => { const d = toDate(v ?? null); return d ? dayIst(d) : ""; };
/** "waiting 3 days", red from 2 days on. */
const waiting = (days: unknown) => {
  const d = Math.max(0, Math.floor(num(days)));
  const txt = d === 0 ? "since today" : `waiting ${ageText(d)}`;
  return d >= 2 ? `<span style="color:${TONE.red.solid};font-weight:700">${esc(txt)}</span>` : esc(txt);
};
const phoneOrMail = (email?: string | null, phone?: string | null) =>
  [email ? esc(email) : "", phone ? esc(showPhone(phone)) : ""].filter(Boolean).join(" · ");

/**
 * The owner's morning summary: money waiting to be checked, orders to make,
 * deadlines, sales follow-ups and email health, each linking to its admin page.
 * Every list is optional: leave a field out if it wasn't computed (it is then not
 * mentioned); pass [] / 0 when there is nothing (it joins the "All clear" line).
 * Lists show up to 5 rows (3–4 on a very busy day) with "+N more"; pass `totals`
 * if the query itself was limited.
 * Trigger: a new runOwnerDigest() in runDailyEmailJobs (api/boot.ts), after runLifecycle.
 * kind: "ownerDailyDigestEmail"
 */
export function ownerDailyDigestEmail(o: OwnerDigest): Email {
  const date = toDate(o.date) ?? new Date();
  const period = o.periodLabel || "last 24 hours";
  const total = (key: DigestListKey, list: unknown[] | null | undefined) => Math.max(num(o.totals?.[key]), list?.length || 0);
  const lists = [o.pendingPayments, o.payoutsPending, o.nfcToProduce, o.nfcAwaitingPayment, o.deletionsDue, o.bulkRequests, o.trialsEnding, o.trialsEnded, o.plansExpiring];
  const cap = digestCap(lists.filter((l) => l && l.length).length);
  const sections: DSection[] = [];
  const add = <T,>(
    key: DigestListKey, list: T[] | null | undefined,
    spec: Omit<DSection, "key" | "total" | "rows" | "textRows">,
    row: (x: T) => DRow, textRow: (x: T) => string, sort?: (a: T, b: T) => number,
  ) => {
    if (!list) return;
    const sorted = sort ? [...list].sort(sort) : list;
    const shown = sorted.slice(0, cap);
    sections.push({ key, ...spec, total: total(key, list), rows: shown.map(row), textRows: shown.map(textRow) });
  };

  add("pendingPayments", o.pendingPayments, {
    group: "money", title: "Payments to verify", short: "payments to verify", phrase: (n) => `${plural(n, "payment")} to verify`,
    tone: "blue", href: ADMIN.paymentOrders, action: "Verify", hint: "Oldest first — each customer is waiting for their plan to switch on.",
  }, (x) => ({ main: esc(x.name), sub: `${esc(x.plan)} · ${waiting(x.ageDays)}`, right: esc(inr(x.amount)) }),
  (x) => `${x.name} — ${x.plan}, ${inr(x.amount)}, ${num(x.ageDays) < 1 ? "since today" : `waiting ${ageText(x.ageDays)}`}`,
  (a, b) => num(b.ageDays) - num(a.ageDays));

  add("payoutsPending", o.payoutsPending, {
    group: "money", title: "Payouts to send", short: "payouts", phrase: (n) => `${plural(n, "payout")} to send`,
    tone: "blue", href: ADMIN.referrals, action: "Open payouts", hint: "Refer & Earn withdrawals — the amounts are already held from their wallets.",
  }, (x) => ({ main: esc(x.name), sub: x.ageDays != null ? (num(x.ageDays) < 1 ? "requested today" : `requested ${ageText(x.ageDays)} ago`) : undefined, right: esc(inr(x.amount)) }),
  (x) => `${x.name} — ${inr(x.amount)}`,
  (a, b) => num(b.ageDays) - num(a.ageDays));

  add("nfcToProduce", o.nfcToProduce, {
    group: "make", title: "NFC orders to make", short: "NFC orders to make", phrase: (n) => `${plural(n, "NFC order")} to make`,
    tone: "gold", href: ADMIN.nfc, action: "Open NFC orders", hint: "Paid and ready for printing.",
  }, (x) => ({ main: esc(x.name), sub: `${esc(x.items)}${x.ids?.length ? ` · ${esc(x.ids.map((i) => `#${i}`).join(", "))}` : ""}` }),
  (x) => `${x.name} — ${x.items}${x.ids?.length ? ` (${x.ids.map((i) => `#${i}`).join(", ")})` : ""}`);

  add("nfcAwaitingPayment", o.nfcAwaitingPayment, {
    group: "make", title: "NFC orders awaiting payment", short: "NFC orders awaiting payment", phrase: (n) => `${plural(n, "NFC order")} awaiting payment`,
    tone: "amber", href: ADMIN.nfc, action: "Check", hint: "Manual orders — check whether the money has arrived, then mark them paid.",
  }, (x) => ({ main: esc(x.name), sub: [x.items ? esc(x.items) : "", x.ageDays != null ? waiting(x.ageDays) : ""].filter(Boolean).join(" · ") || undefined, right: x.amount ? esc(inr(x.amount)) : "" }),
  (x) => `${x.name}${x.items ? ` — ${x.items}` : ""}${x.amount ? `, ${inr(x.amount)}` : ""}`,
  (a, b) => num(b.ageDays) - num(a.ageDays));

  add("deletionsDue", o.deletionsDue, {
    group: "deadline", title: "Account deletions due", short: "deletions due", phrase: (n) => `${plural(n, "deletion")} due`,
    tone: "red", href: ADMIN.deletions, action: "Open deletions", hint: "Their 30-day window is over — complete the erasure.",
  }, (x) => {
    const d = toDate(x.due);
    const late = d && d.getTime() < date.getTime() - 86_400_000;
    return { main: esc(x.email), right: d ? `<span style="color:${late ? TONE.red.solid : BRAND.ink}">${late ? "due since" : "due"} ${esc(dayIst(d))}</span>` : "" };
  },
  (x) => `${x.email} — due ${fmtDay(x.due) || "now"}`,
  (a, b) => (toDate(a.due)?.getTime() ?? 0) - (toDate(b.due)?.getTime() ?? 0));

  add("bulkRequests", o.bulkRequests, {
    group: "sales", title: "New bulk requests", short: "bulk requests", phrase: (n) => `${plural(n, "bulk request")}`,
    tone: "gold", href: ADMIN.bulk, action: "Open bulk orders", hint: "Not contacted yet.",
  }, (x) => ({ main: esc(x.company || "No company given"), sub: x.contact ? esc(x.contact) : undefined, right: `${esc(count(x.quantity))} cards` }),
  (x) => `${x.company || "No company"} — ${count(x.quantity)} cards${x.contact ? ` (${x.contact})` : ""}`);

  const followUp = (name: string, email: string, phone: string | null | undefined, when: string) => {
    const wa = waLink(phone, `Hi ${firstName(name) || "there"}, this is DigitalCarda. How is your card going?`);
    return {
      main: inkLink(customerSearch(email), name || email),
      sub: phoneOrMail(email, phone),
      right: `${esc(when)}${wa ? `<br><a href="${esc(wa)}" target="_blank" style="font-size:12px;color:#15803D;text-decoration:none">WhatsApp</a>` : ""}`,
    };
  };

  add("trialsEnding", o.trialsEnding, {
    group: "sales", title: "Trials ending soon", short: "trials ending", phrase: (n) => `${plural(n, "trial")} ending`,
    tone: "violet", href: ADMIN.customers, action: "Open customers", hint: "Ending in the next 3 days — worth a quick call before they decide.",
  }, (x) => followUp(x.name, x.email, x.phone, `ends ${fmtDay(x.endsOn)}`),
  (x) => `${x.name} (${x.email}${x.phone ? `, ${showPhone(x.phone)}` : ""}) — ends ${fmtDay(x.endsOn)}`,
  (a, b) => (toDate(a.endsOn)?.getTime() ?? 0) - (toDate(b.endsOn)?.getTime() ?? 0));

  add("trialsEnded", o.trialsEnded, {
    group: "sales", title: "Trials that just ended", short: "trials ended", phrase: (n) => `${plural(n, "trial")} ended`,
    tone: "amber", href: ADMIN.customers, action: "Open customers", hint: "Didn't upgrade. A friendly check-in can bring them back.",
  }, (x) => followUp(x.name, x.email, x.phone, x.endedOn ? `ended ${fmtDay(x.endedOn)}` : "ended"),
  (x) => `${x.name} (${x.email}${x.phone ? `, ${showPhone(x.phone)}` : ""})${x.endedOn ? ` — ended ${fmtDay(x.endedOn)}` : ""}`);

  add("plansExpiring", o.plansExpiring, {
    group: "sales", title: "Paid plans expiring", short: "plans expiring", phrase: (n) => `${plural(n, "plan")} expiring`,
    tone: "amber", href: ADMIN.customers, action: "Open customers", hint: "Within 7 days. Nothing renews automatically — they need to pay again to continue.",
  }, (x) => ({ main: x.email ? inkLink(customerSearch(x.email), x.name || x.email) : esc(x.name), sub: esc(x.plan), right: `ends ${esc(fmtDay(x.endsOn))}` }),
  (x) => `${x.name}${x.email ? ` (${x.email})` : ""} — ${x.plan}, ends ${fmtDay(x.endsOn)}`,
  (a, b) => (toDate(a.endsOn)?.getTime() ?? 0) - (toDate(b.endsOn)?.getTime() ?? 0));

  if (o.failedEmails != null) {
    const n = Math.max(0, Math.floor(num(o.failedEmails)));
    sections.push({
      key: "failedEmails", group: "health", title: "Emails that failed", short: "failed emails",
      phrase: (k) => `${plural(k, "email")} failed`,
      tone: "red", href: ADMIN.emailLog, action: "Open email log",
      hint: `${plural(n, "email")} could not be sent in the last 24 hours. The log shows which ones and why.`,
      total: n, rows: [], textRows: [],
    });
  }

  const busy = sections.filter((s) => s.total > 0);
  const clear = sections.filter((s) => s.total === 0);
  const phrases = busy.map((s) => s.phrase(s.total));
  const headline = !busy.length
    ? "All clear — nothing needs you today"
    : busy.length === 1 ? phrases[0]
    : busy.length === 2 ? `${phrases[0]} and ${phrases[1]}`
    : `${phrases[0]}, ${phrases[1]} and more`;

  const rev = o.revenue ? { total: num(o.revenue.manual) + num(o.revenue.online), manual: num(o.revenue.manual), online: num(o.revenue.online), count: num(o.revenue.count) } : null;
  const signupsToday = o.signups ? num(o.signups.today) : null;

  const hero = heroBand({
    eyebrow: `Daily summary · ${dayIst(date)}`, tone: busy.length ? "gold" : "green",
    title: headline,
    sub: busy.length
      ? `${plural(busy.length, "list")} need${busy.length === 1 ? "s" : ""} you today. Most urgent first.`
      : "No payments, orders or deadlines are waiting on you.",
    aside: rev
      ? { label: "Revenue", value: inr(rev.total), sub: `${plural(rev.count, "payment")} · ${period}` }
      : signupsToday != null ? { label: "New signups", value: count(signupsToday), sub: period } : undefined,
    chips: busy.length > 2 ? busy.slice(0, 5).map((s) => dc(s.phrase(s.total))) : [],
  });

  const tiles: { label: string; value: string; sub?: string }[] = [];
  if (o.signups) tiles.push({ label: "New signups", value: esc(count(o.signups.today)), sub: o.signups.week != null ? `${esc(count(o.signups.week))} in 7 days` : esc(period) });
  if (rev) {
    tiles.push({ label: "Revenue", value: esc(inr(rev.total)), sub: `${esc(inr(rev.online))} online · ${esc(inr(rev.manual))} manual` });
    tiles.push({ label: "Payments", value: esc(count(rev.count)), sub: esc(period) });
  }

  const GROUPS: { id: DSection["group"]; label: string }[] = [
    { id: "money", label: "Money waiting on you" },
    { id: "make", label: "To make and ship" },
    { id: "deadline", label: "Deadlines" },
    { id: "sales", label: "Sales follow-ups" },
    { id: "health", label: "Email health" },
  ];
  const groupsHtml = GROUPS.map((g) => {
    const list = busy.filter((s) => s.group === g.id);
    return list.length ? sectionLabel(g.label) + list.map(digestCard).join("") : "";
  }).join("");

  const clearNames = clear.map((s) => s.short);
  const clearLine = clearNames.length && busy.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0"><tr>
        <td bgcolor="${TONE.green.tint}" style="background:${TONE.green.tint};border:1px solid ${TONE.green.line};border-radius:12px;padding:12px 16px;font-family:${FONT};font-size:13px;line-height:1.55;color:${TONE.green.text}">
          <strong>&#10003; All clear:</strong> no ${esc(clearNames.join(", "))}.
        </td></tr></table>`
    : "";

  const automation = o.automation
    ? note(o.automation.enabled
      ? `Automatic trial emails sent in today's run: <strong style="color:${BRAND.ink}">${esc(count(o.automation.sent))}</strong>${num(o.automation.abandoned) > 0 ? `, plus ${esc(plural(o.automation.abandoned, "reminder"))} to publish an unfinished card` : ""}.`
      : "Automatic trial emails are switched off, so none went out today.")
    : "";

  const bodyHtml =
    (tiles.length ? statTiles(tiles) : "") +
    (busy.length
      ? groupsHtml + clearLine
      : callout("green", "All clear", sections.length
        ? `No ${esc(clearNames.join(", "))}. Enjoy the quiet.`
        : "Nothing was flagged in today's checks.")) +
    automation +
    button("Open the admin", ADMIN.home, "dark");

  const textSections = busy.flatMap((s) => {
    const more = s.textRows.length ? Math.max(0, s.total - s.textRows.length) : 0;
    return [
      "", `${s.title.toUpperCase()} (${count(s.total)})`,
      ...(s.hint && !s.textRows.length ? [s.hint] : []),
      ...s.textRows.map((r) => `- ${r}`),
      ...(more ? [`+${count(more)} more`] : []),
      s.href,
    ];
  });

  const preheaderBits = [
    o.signups ? `${plural(o.signups.today, "new signup")}` : "",
    rev ? `${inr(rev.total)} in` : "",
    busy.length ? `${plural(busy.length, "list")} to clear` : "nothing waiting on you",
  ].filter(Boolean);

  return {
    kind: "ownerDailyDigestEmail",
    subject: `Daily summary · ${dayIst(date)}: ${busy.length ? headline : "all clear"}`,
    html: layout({
      preheader: `${preheaderBits.join(", ")}.`.replace(/^./, (m) => m.toUpperCase()),
      hero, bodyHtml, accent: busy.length ? BRAND.gold : TONE.green.solid, audience: "admin",
    }),
    text: lines([
      `DigitalCarda daily summary — ${dayIst(date)}`,
      headline, "",
      o.signups ? `New signups: ${count(o.signups.today)} (${period})${o.signups.week != null ? `, ${count(o.signups.week)} in 7 days` : ""}` : null,
      rev ? `Revenue: ${inr(rev.total)} from ${plural(rev.count, "payment")} (${inr(rev.online)} online, ${inr(rev.manual)} manual) — ${period}` : null,
      ...textSections,
      clearNames.length ? `\nAll clear: no ${clearNames.join(", ")}.` : null,
      o.automation ? (o.automation.enabled ? `\nAutomatic trial emails sent today: ${o.automation.sent}${num(o.automation.abandoned) > 0 ? ` (+${o.automation.abandoned} publish reminders)` : ""}` : "\nAutomatic trial emails are switched off.") : null,
      "", `Admin: ${ADMIN.home}`,
    ]),
  };
}
