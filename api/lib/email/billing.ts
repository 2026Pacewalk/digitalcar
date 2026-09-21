/*
 * Billing & plans: every email a customer gets about their plan and their money.
 *
 * Built on the shared kit (./kit). Facts these emails rely on, checked against
 * the code so the copy never promises something the product doesn't do:
 *  - Nothing renews or charges automatically (no gateway subscription is ever
 *    created). A plan simply runs until its end date.
 *  - When a paid plan ends, the customer's main (published) card stays online:
 *    publish.publicState keeps a card live once its trial is converted. What
 *    pauses is plan-gated: cards under "My Cards" go offline for visitors
 *    (card.getBySlug), and SEO / custom-domain settings on those cards lock
 *    (activeSubPackage). A free custom domain is included only while Platinum
 *    3-year is active (domain-router freeDomainEligible); already-connected
 *    domains are grandfathered.
 *  - While a plan is active the Subscription page won't sell the same plan again
 *    (the button is disabled), so early renewal goes through the team.
 *  - An upgrade while the plan is running credits what was already paid; after
 *    the end date a purchase is at full price (payment-router computeAmount).
 *
 * Every user/database value is escaped (esc() or a kit helper that escapes);
 * subjects are collapsed to one line.
 */
import {
  layout, heroBand, heroLight, sectionLabel, button, actionPills, statTiles, infoGrid, callout, note,
  tickList, progressSteps, receipt, quoteBlock, linkPanel, cardPreview, helpStrip, signoff, darkChip,
  mono, inkLink, waLink, whenIst, dayIst, dateIst, esc, inr, firstName, p, hi,
  BRAND, TONE, ON_DARK, SITE, SUPPORT_WHATSAPP, FONT, MONO,
  type Email, type Tone,
} from "./kit";

/* ── Local helpers ───────────────────────────────────────────────────────── */

const PLANS_URL = `${SITE}/dashboard/subscription`;

/** One line of plain text: collapses whitespace and line breaks (subjects must never carry a newline). */
const line = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const clip = (v: unknown, max: number) => { const s = String(v ?? "").trim(); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };
const plural = (n: number, word: string) => `${n.toLocaleString("en-IN")} ${word}${n === 1 ? "" : "s"}`;
/** A finite rupee amount (callers sometimes pass decimal strings from MySQL). */
const money = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

/** A date that may arrive as a Date, a calendar day ("2027-09-21"), an ISO
    timestamp, or text the caller already formatted ("21 Sept 2027"). */
function toDate(v: string | Date | null | undefined): Date | null {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  const s = line(v);
  // A bare calendar day: pin it to midday IST so it never slips a day either way.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00+05:30`)
    : /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) ? new Date(s.replace(" ", "T"))
    : null;
  return d && Number.isFinite(d.getTime()) ? d : null;
}
/** "21 Sept 2027"; text that isn't a recognisable date is shown as written. */
const showDate = (v: string | Date | null | undefined) => { const d = toDate(v); return d ? dateIst(d) : line(v); };
/** "Mon, 28 Sept" — for a deadline a few days out, where the weekday matters
    more than the year (the full date sits next to it). */
const showDay = (v: string | Date | null | undefined) => { const d = toDate(v); return d ? dayIst(d) : line(v); };

type Cycle = "monthly" | "yearly" | "triennial";
const asCycle = (c?: string | null): Cycle | null => {
  const k = line(c).toLowerCase();
  return k === "monthly" || k === "yearly" || k === "triennial" ? k : null;
};
/** "Yearly" / "3 years" — for chips and table cells. */
const cycleLabel = (c?: string | null) => {
  const k = asCycle(c);
  if (k === "monthly") return "Monthly";
  if (k === "yearly") return "Yearly";
  if (k === "triennial") return "3 years";
  const t = line(c);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
};
/** "yearly plan" / "3-year plan" / "plan" — for sentences. */
const termPhrase = (c?: string | null) => {
  const k = asCycle(c);
  return k === "monthly" ? "monthly plan" : k === "yearly" ? "yearly plan" : k === "triennial" ? "3-year plan" : "plan";
};

/** "Yearly plan" / "3-year plan" for a chip; "" when the term is unknown. */
const termChip = (c?: string | null) => { const t = termPhrase(c); return t === "plan" ? (cycleLabel(c) ? `${cycleLabel(c)} plan` : "") : t.charAt(0).toUpperCase() + t.slice(1); };

/** How the money arrived. Razorpay orders are stored with method "upi" whatever
    the customer used, so an online payment is named by its gateway instead. */
function paidBy(method?: string | null, gateway?: string | null): string {
  if (line(gateway).toLowerCase() === "razorpay") return "Online payment (Razorpay)";
  const k = line(method).toLowerCase();
  if (k === "upi") return "UPI";
  if (k === "bank") return "Bank transfer";
  if (k === "card") return "Card";
  if (k === "netbanking") return "Netbanking";
  if (k === "wallet") return "Wallet";
  const t = line(method);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/** The Subscription page, optionally pre-selecting a plan, a term and a coupon
    (the page reads ?plan=, ?cycle= and ?coupon=). */
function plansUrl(o: { packageId?: number | null; cycle?: string | null; coupon?: string | null } = {}): string {
  const q = new URLSearchParams();
  const id = Number(o.packageId);
  if (Number.isInteger(id) && id > 0) q.set("plan", String(id));
  const c = asCycle(o.cycle);
  if (c) q.set("cycle", c);
  const code = line(o.coupon);
  if (code && /^[A-Za-z0-9_-]{1,40}$/.test(code)) q.set("coupon", code.toUpperCase());
  const s = q.toString();
  return s ? `${PLANS_URL}?${s}` : PLANS_URL;
}

/** Our support WhatsApp with a short pre-typed message (never personal data). */
const supportWa = (message: string) => waLink(SUPPORT_WHATSAPP.wa, message) || `https://wa.me/${SUPPORT_WHATSAPP.wa}`;

const cleanSlug = (s?: string | null) => line(s).replace(/^\/+/, "");
const cardUrl = (slug: string) => `${SITE}/${encodeURIComponent(slug)}`;
const cardLabel = (slug: string) => `digitalcarda.in/${slug}`;

const chip = (text: string) => darkChip(esc(text));
const chips = (...xs: (string | null | undefined | false)[]) => xs.filter((x): x is string => !!x).map(chip);
/** A deliberate blank line in a plain-text body. Conditional parts that come out
    empty ("", null, false) are dropped; runs of blank lines collapse to one. */
const BR = String.fromCharCode(1);
const lines = (...xs: (string | null | undefined | false)[]) =>
  xs.filter((x): x is string => typeof x === "string" && x !== "")
    .map((x) => (x === BR ? "" : x))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();

/** What stops when a paid plan lapses, from the code (see the header comment).
    Only lines that apply to this plan: Gold never had SEO or a custom domain. */
function defaultLapses(planName: string, cycle?: string | null): string[] {
  const platinum = /platinum/i.test(planName);
  const out = [`If you've made cards under <strong style="color:${BRAND.ink}">My Cards</strong>, visitors can't open them`];
  if (platinum) out.push("SEO and custom-domain settings on those cards are locked");
  if (platinum && asCycle(cycle) === "triennial") out.push("A new custom domain needs the paid add-on — it's free only while Platinum 3-year is active");
  return out;
}
const KEEPS = [
  "Your main card stays online, at the same link and QR code",
  "Nothing is deleted — your details, photos, products and enquiries stay in your account",
];

/** Trusted HTML back to plain text (for the text/plain part). */
const stripTags = (html: string) => html.replace(/<[^>]*>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** What keeps working vs what pauses: two panels side by side on a wide screen
    that stack on a phone (fluid inline-blocks; Outlook desktop simply stacks them).
    Items are trusted HTML. */
function keepPausePanel(keep: string[], pause: string[]): string {
  const col = (title: string, tone: Tone, mark: string, items: string[], first: boolean) => {
    const t = TONE[tone];
    return `<div style="display:inline-block;vertical-align:top;width:100%;max-width:260px;margin:0 ${first ? 12 : 0}px 12px 0;font-size:14px;line-height:1.5">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="${t.tint}" style="background:${t.tint};border:1px solid ${t.line};border-radius:14px;padding:15px 16px 7px">
          <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${t.text};text-transform:uppercase;letter-spacing:1px;padding-bottom:3px">${esc(title)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${items.map((it) => `<tr>
              <td width="20" valign="top" style="width:20px;padding:7px 0;font-family:${FONT};font-size:13px;font-weight:800;color:${t.solid};line-height:1.55">${mark}</td>
              <td valign="top" style="padding:7px 0;font-family:${FONT};font-size:13.5px;line-height:1.55;color:${BRAND.body}">${it}</td>
            </tr>`).join("")}
          </table>
        </td></tr></table>
    </div>`;
  };
  return `<div style="margin:6px 0 0;font-size:0;line-height:0">${col("Keeps working", "green", "&#10003;", keep, true)}${col("Paused until you renew", "amber", "&#8211;", pause, false)}</div>`;
}

/** Navy invoice strip above the receipt: number, date and a PAID stamp. */
function invoiceHeader(no: string, date: string): string {
  const label = `font-family:${FONT};font-size:10px;font-weight:700;color:${ON_DARK.sub};text-transform:uppercase;letter-spacing:1.1px`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr>
    <td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:14px;padding:14px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle">
          <div style="${label}">Invoice no.</div>
          <div style="font-family:${MONO};font-size:15px;font-weight:700;color:#FFFFFF;padding-top:3px;word-break:break-all">${esc(no)}</div>
        </td>
        <td valign="middle" align="right" style="padding-left:12px">
          <div style="${label}">Date</div>
          <div style="font-family:${FONT};font-size:14px;font-weight:700;color:#FFFFFF;padding-top:3px;white-space:nowrap">${esc(date)}</div>
        </td>
        <td valign="middle" align="right" width="64" style="width:64px;padding-left:12px">
          <span style="display:inline-block;padding:5px 10px;border-radius:999px;background:${TONE.green.solid};border:1px solid #15803D;font-family:${FONT};font-size:11px;font-weight:800;color:#FFFFFF;letter-spacing:1px">PAID</span>
        </td>
      </tr></table>
    </td>
  </tr></table>`;
}

/* ── Plan changed by the team ────────────────────────────────────────────── */

/**
 * Customer. Sent when an admin changes the customer's package (user.setPackage,
 * api/user-router.ts:223), only for non-trial packages.
 *
 * - `planName`: the new plan. The current caller maps any id other than 5/6 to
 *   "Trial"; since this email is never sent for the trial, a "Trial" name is
 *   treated as unknown and the copy says "a new plan" instead of something untrue.
 * - `validTill`: end of the new period — "YYYY-MM-DD", a Date, or formatted text.
 * - `slug`: the customer's card (the caller passes null today — pass the real
 *   slug to show the card and the "same link" note).
 * - `billingCycle` (optional, new): "monthly" | "yearly" | "triennial".
 * - `features` (optional, new): plain-text bullets for the plan (e.g. from the
 *   package row, as src/lib/planFeatures.ts builds them).
 * - `previousPlanName` (optional, new): the plan they were on.
 */
export function planUpgradedEmail(o: {
  name?: string | null; planName: string; validTill?: string | Date | null; slug?: string | null;
  billingCycle?: string | null; features?: string[] | null; previousPlanName?: string | null;
}): Email {
  const raw = line(o.planName);
  const plan = raw && !/^trial$/i.test(raw) ? raw : "";
  const prev = line(o.previousPlanName);
  const till = o.validTill ? showDate(o.validTill) : "";
  const cycle = cycleLabel(o.billingCycle);
  const slug = cleanSlug(o.slug);
  const features = (o.features || []).map(line).filter(Boolean).slice(0, 12);
  const dash = `${SITE}/dashboard/build`;

  const hero = heroBand({
    eyebrow: "Plan updated", tone: "gold", icon: "&#127881;",
    title: plan ? `You're on ${plan} now` : "Your plan has been updated",
    sub: "Our team has switched your account over. It's already active — there's nothing you need to do.",
    chips: chips(plan, termChip(o.billingCycle), till && `Valid till ${till}`),
  });

  const bodyHtml =
    hi(o.name) +
    p(`Your DigitalCarda account has moved ${prev && prev !== plan ? `from ${esc(prev)} ` : ""}to ${plan ? `the <strong style="color:${BRAND.ink}">${esc(plan)}</strong> plan` : "a new plan"}. It's live on your account right now${till ? `, valid till <strong style="color:${BRAND.ink}">${esc(till)}</strong>` : ""}.`) +
    (features.length
      ? sectionLabel(plan ? `What ${plan} includes` : "What your plan includes") + tickList("", features.map(esc))
      : p("Your plan's features and limits apply straight away — open Card Studio to put them to work.")) +
    button("Open Card Studio", dash) +
    (slug
      ? sectionLabel("Your card") + cardPreview(slug, "Your DigitalCarda card") +
        note(`Same link, same QR code — ${inkLink(cardUrl(slug), cardLabel(slug))}. Nothing to reprint.`)
      : "") +
    helpStrip();

  const subjPlan = line(plan);
  return {
    kind: "planUpgradedEmail",
    subject: subjPlan ? `Your plan is now ${subjPlan} 🎉` : "Your DigitalCarda plan has been updated 🎉",
    html: layout({
      preheader: `${plan || "Your new plan"} is already active${till ? ` until ${till}` : ""} — no action needed on your side.`,
      hero, bodyHtml, accent: BRAND.gold, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      plan ? `Your DigitalCarda account is now on the ${plan} plan. It's already active — nothing to do.` : "Your DigitalCarda plan has been updated. It's already active — nothing to do.",
      cycle && `Term: ${cycle}`,
      till && `Valid till: ${till}`,
      ...(features.length ? [BR, `What ${plan || "your plan"} includes:`, ...features.map((f) => `- ${f}`)] : []),
      slug && BR, slug && `Your card (same link, same QR code): ${cardUrl(slug)}`,
      BR, `Open Card Studio: ${dash}`,
      BR, `Need a hand? Reply to this email or WhatsApp us: ${SUPPORT_WHATSAPP.display}`,
    ),
  };
}

/* ── Manual payment submitted ────────────────────────────────────────────── */

/**
 * Customer. Sent when they submit a manual UPI / bank payment reference
 * (payment.createOrder, api/payment-router.ts:352). The order is pending until
 * an admin verifies it.
 *
 * - `amount`: what they were asked to pay, after every discount.
 * - `reference`: the UTR / transaction id they typed.
 * - `method`: "upi" | "bank".
 * - Optional, new: `billingCycle`; `couponCode` + `discount` (₹ taken off by the
 *   coupon — createOrder has both in `coupon`); `submittedAt`.
 */
export function paymentSubmittedEmail(o: {
  name?: string | null; planName: string; amount: number; reference: string; method?: string | null;
  billingCycle?: string | null; couponCode?: string | null; discount?: number | null; submittedAt?: Date | null;
}): Email {
  const plan = line(o.planName) || "your plan";
  const amount = money(o.amount);
  const ref = line(o.reference);
  const by = paidBy(o.method);
  const cycle = cycleLabel(o.billingCycle);
  const code = line(o.couponCode);
  const off = money(o.discount);
  const when = o.submittedAt instanceof Date && Number.isFinite(o.submittedAt.getTime()) ? whenIst(o.submittedAt) : "";

  const hero = heroLight({
    badge: "Payment · Under review", tone: "gold",
    title: `We've got your ${plan} payment details`,
    sub: `We're checking your ${inr(amount)} payment now. Your plan switches on as soon as it's verified.`,
  });

  const bodyHtml =
    hi(o.name) +
    p(`Thanks — your payment details for the <strong style="color:${BRAND.ink}">${esc(plan)}</strong> ${esc(termPhrase(o.billingCycle))} have reached our team. We match every manual payment against our account by hand before switching the plan on.`) +
    progressSteps(["Details received", "We verify the payment", "Plan goes live"], 1, "gold") +
    sectionLabel("What you sent us") +
    infoGrid([
      ["Plan", esc(plan) + (cycle ? ` <span style="color:${BRAND.sub};font-weight:500">· ${esc(cycle)}</span>` : "")],
      ["Amount", esc(inr(amount)) + (off > 0 ? ` <span style="color:${TONE.green.text};font-weight:600;font-size:12.5px">(${code ? `coupon ${esc(code.toUpperCase())}, ` : ""}${esc(inr(off))} off)</span>` : "")],
      ["Paid by", by && esc(by)],
      ["Reference", ref && mono(ref)],
      ["Sent", when && esc(when)],
    ]) +
    callout("gold", "You'll hear from us either way",
      "The moment it's confirmed you'll get an email with your invoice. If something doesn't match, we'll tell you what to fix.") +
    note(`Typed the reference wrong? Just reply to this email with the correct one — there's no need to pay again.`) +
    helpStrip();

  return {
    kind: "paymentSubmittedEmail",
    subject: `Payment details received — ${line(plan)} (under review)`,
    html: layout({
      preheader: `Our team is matching reference ${ref || "you sent"} now — you'll get an email as soon as your plan is active.`,
      hero, bodyHtml, accent: TONE.gold.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `We've received your payment details for the ${plan} ${termPhrase(o.billingCycle)}. Our team is verifying it now — your plan switches on as soon as it's confirmed.`, BR,
      `Plan: ${plan}${cycle ? ` (${cycle})` : ""}`,
      `Amount: ${inr(amount)}${off > 0 ? ` (${code ? `coupon ${code.toUpperCase()}, ` : ""}${inr(off)} off)` : ""}`,
      by && `Paid by: ${by}`,
      ref && `Reference: ${ref}`,
      when && `Sent: ${when}`, BR,
      "You'll get an email the moment it's verified. Typed the reference wrong? Reply with the correct one — no need to pay again.",
      BR, `Your plan: ${PLANS_URL}`,
      `Need a hand? WhatsApp us: ${SUPPORT_WHATSAPP.display}`,
    ),
  };
}

/* ── Payment confirmed: receipt / invoice ────────────────────────────────── */

/**
 * Customer. The receipt, sent from activateVerifiedOrder
 * (api/payment-router.ts:228) for all three money paths: an admin verifying a
 * manual payment, razorpayVerify, and the Razorpay webhook.
 *
 * - `amount`: what was actually paid (order.amount).
 * - `invoiceNo`, `validTill` (end of the new period: Date, "YYYY-MM-DD" or text).
 * - Optional, new:
 *   - `paidAt`: when the payment was confirmed (defaults to now, i.e. send time).
 *   - `method` + `gateway` ("manual" | "razorpay") and `reference` (UTR or
 *     Razorpay payment id) — order.method / order.gateway / order.reference.
 *   - `listPrice`: the plan price before any discount or upgrade credit.
 *   - `couponCode` + `discount`: the coupon and the ₹ it took off.
 *     With `listPrice`, anything else between list price and amount paid is
 *     shown as "Other discounts & upgrade credit".
 *   - `billedTo`: name/business on the invoice (defaults to `name`).
 */
export function paymentVerifiedEmail(o: {
  name?: string | null; planName: string; amount: number; billingCycle?: string | null; invoiceNo: string; validTill: string | Date;
  paidAt?: Date | null; method?: string | null; gateway?: string | null; reference?: string | null;
  listPrice?: number | null; couponCode?: string | null; discount?: number | null; billedTo?: string | null;
}): Email {
  const plan = line(o.planName) || "Plan";
  const amount = money(o.amount);
  const till = showDate(o.validTill);
  const cycle = cycleLabel(o.billingCycle);
  const inv = line(o.invoiceNo);
  const paidAt = o.paidAt instanceof Date && Number.isFinite(o.paidAt.getTime()) ? o.paidAt : new Date();
  const by = paidBy(o.method, o.gateway);
  const ref = line(o.reference);
  const code = line(o.couponCode).toUpperCase();
  const billedTo = line(o.billedTo) || line(o.name);

  // Make the receipt add up: row at list price, then each discount, total = paid.
  const list = money(o.listPrice);
  const coupon = Math.max(0, money(o.discount));
  const extra: { label: string; value: string; tone?: Tone }[] = [];
  let rowAmount = amount;
  if (list > amount) {
    rowAmount = list;
    const c = Math.min(coupon, list - amount);
    if (c > 0) extra.push({ label: code ? `Coupon ${code}` : "Coupon discount", value: `− ${inr(c)}`, tone: "green" });
    const rest = money(list - amount - c);
    if (rest > 0) extra.push({ label: "Other discounts & upgrade credit", value: `− ${inr(rest)}`, tone: "green" });
  } else if (coupon > 0) {
    rowAmount = money(amount + coupon);
    extra.push({ label: code ? `Coupon ${code}` : "Coupon discount", value: `− ${inr(coupon)}`, tone: "green" });
  }
  const saved = money(rowAmount - amount);

  const hero = heroBand({
    eyebrow: "Payment confirmed", tone: "green",
    title: `Your ${plan} plan is active`,
    sub: `Thank you${firstName(o.name) ? `, ${firstName(o.name)}` : ""} — your payment is confirmed and your plan is switched on.`,
    aside: { label: "Paid", value: inr(amount), sub: saved > 0 ? `You saved ${inr(saved)}` : undefined },
    chips: chips(termChip(o.billingCycle), till && `Valid till ${till}`, inv && `Invoice ${inv}`),
  });

  const bodyHtml =
    hi(o.name) +
    p(`Your payment is confirmed and <strong style="color:${BRAND.ink}">${esc(plan)}</strong> is active on your account${till ? ` until <strong style="color:${BRAND.ink}">${esc(till)}</strong>` : ""}. Keep this email — it's your invoice.`) +
    sectionLabel("Invoice") +
    invoiceHeader(inv || "—", dateIst(paidAt)) +
    receipt({
      rows: [{ name: `${plan} plan`, sub: [cycle, till && `valid till ${till}`].filter(Boolean).join(" · ") || undefined, amount: rowAmount }],
      extra, totalLabel: "Amount paid", total: amount,
    }) +
    `<div style="height:10px;font-size:0;line-height:0">&nbsp;</div>` +
    infoGrid([
      ["Billed to", billedTo && esc(billedTo)],
      ["Paid by", by && esc(by)],
      ["Payment ref", ref && mono(ref)],
      ["Paid on", esc(whenIst(paidAt))],
    ]) +
    note("This was a one-time payment. Plans don't renew or charge automatically — you decide when to renew.") +
    button("Open your dashboard", `${SITE}/dashboard`) +
    helpStrip();

  return {
    kind: "paymentVerifiedEmail",
    subject: `Payment confirmed — ${line(plan)} is active 🎉`,
    html: layout({
      preheader: `${inr(amount)} received${inv ? ` · invoice ${inv}` : ""}${till ? ` · valid till ${till}` : ""}.`,
      hero, bodyHtml, accent: TONE.green.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `Your payment is confirmed and your ${plan} plan is active${till ? ` until ${till}` : ""}. Keep this email as your invoice.`, BR,
      `INVOICE ${inv || ""}`.trim(),
      `Date: ${dateIst(paidAt)}`,
      billedTo && `Billed to: ${billedTo}`,
      `${plan} plan${cycle ? ` (${cycle})` : ""}: ${inr(rowAmount)}`,
      ...extra.map((x) => `${x.label}: ${x.value.replace("− ", "-")}`),
      `Amount paid: ${inr(amount)}`,
      by && `Paid by: ${by}`,
      ref && `Payment ref: ${ref}`,
      till && `Valid till: ${till}`, BR,
      "This was a one-time payment. Plans don't renew or charge automatically.",
      BR, `Dashboard: ${SITE}/dashboard`,
      `Need a hand? WhatsApp us: ${SUPPORT_WHATSAPP.display}`,
    ),
  };
}

/* ── Manual payment rejected ─────────────────────────────────────────────── */

/**
 * Customer. Sent when an admin rejects a manual payment (payment.rejectOrder,
 * api/payment-router.ts:624).
 *
 * - `note`: the admin's reason, shown as their words (optional).
 * - Optional, new: `amount`, `reference`, `method`, `billingCycle`,
 *   `submittedAt` (order.createdAt), `packageId` (pre-selects the plan on the
 *   retry link) — all on the order row the caller already has.
 */
export function paymentRejectedEmail(o: {
  name?: string | null; planName: string; note?: string | null;
  amount?: number | null; reference?: string | null; method?: string | null; billingCycle?: string | null;
  submittedAt?: Date | null; packageId?: number | null;
}): Email {
  const plan = line(o.planName) || "plan";
  const reason = clip(o.note, 1000);
  const amount = o.amount != null ? money(o.amount) : 0;
  const ref = line(o.reference);
  const by = paidBy(o.method);
  const cycle = cycleLabel(o.billingCycle);
  const when = o.submittedAt instanceof Date && Number.isFinite(o.submittedAt.getTime()) ? whenIst(o.submittedAt) : "";
  const retry = plansUrl({ packageId: o.packageId, cycle: o.billingCycle });
  const wa = supportWa(`Hi, my ${line(plan)} payment couldn't be verified. I'm sending a screenshot of the payment.`);

  const hero = heroBand({
    eyebrow: "Payment not verified", tone: "red",
    title: `We couldn't verify your ${plan} payment`,
    sub: "Your plan hasn't been switched on yet. Here's what our team found and how to fix it.",
    aside: amount > 0 ? { label: "Amount", value: inr(amount) } : undefined,
    chips: chips(by, ref && `Ref ${clip(ref, 40)}`),
  });

  const bodyHtml =
    hi(o.name) +
    (reason
      ? p("Our team checked the payment details you sent and couldn't confirm them. Here's their note:") +
        quoteBlock(reason, "DigitalCarda payments team")
      : p("Our team checked the payment details you sent and couldn't confirm them against our account.")) +
    sectionLabel("Worth checking") +
    tickList("", [
      "The reference is the UTR / transaction ID from your UPI app or bank statement — not an order or invoice number",
      "The amount you paid matches the price shown when you chose the plan",
      "The payment shows as successful, not pending, in your bank or UPI app",
    ]) +
    callout("gold", "Fix it in a minute",
      `Open Subscription, choose ${esc(plan)} again and submit the correct reference. Sure the payment went through? Send us a screenshot and we'll check it again.`,
      actionPills([
        { label: "Submit again", href: retry, tone: "gold" },
        { label: "Send a screenshot", href: wa, tone: "whatsapp" },
      ])) +
    sectionLabel("What you sent") +
    infoGrid([
      ["Plan", esc(plan) + (cycle ? ` <span style="color:${BRAND.sub};font-weight:500">· ${esc(cycle)}</span>` : "")],
      ["Amount", amount > 0 && esc(inr(amount))],
      ["Paid by", by && esc(by)],
      ["Reference", ref && mono(ref)],
      ["Sent", when && esc(when)],
    ]) +
    helpStrip();

  return {
    kind: "paymentRejectedEmail",
    subject: `Couldn't verify your ${line(plan)} payment`,
    html: layout({
      preheader: reason ? `Our team's note: ${clip(line(reason), 110)}` : "Check the reference and submit it again — or send us a screenshot and we'll look again.",
      hero, bodyHtml, accent: TONE.red.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `We couldn't verify your ${plan} payment, so your plan hasn't been switched on yet.`,
      reason && BR, reason && `Note from our team: ${reason}`, BR,
      "Worth checking:",
      "- The reference is the UTR / transaction ID from your UPI app or bank statement",
      "- The amount paid matches the plan price",
      "- The payment shows as successful, not pending", BR,
      amount > 0 && `Amount: ${inr(amount)}`,
      by && `Paid by: ${by}`,
      ref && `Reference: ${ref}`,
      when && `Sent: ${when}`,
      (amount > 0 || by || ref || when) && BR,
      `Submit again: ${retry}`,
      `Sure it went through? WhatsApp us a screenshot: ${SUPPORT_WHATSAPP.display} (or reply to this email).`,
    ),
  };
}

/* ── Online payment failed ───────────────────────────────────────────────── */

/**
 * Customer. For the Razorpay `payment.failed` webhook event (not wired yet —
 * see the plan, item 13). Send only for plan orders (notes.packageId present)
 * and only if the order isn't already paid.
 *
 * - `amount`: rupees (pay.amount / 100).
 * - Optional, new: `billingCycle` + `packageId` (order notes — they pre-select
 *   the plan on the retry link), `couponCode` (notes.couponCode — kept on the
 *   retry link), `paymentId` (pay.id), `reason` (pay.error_description, plain
 *   text), `method` (pay.method: "upi" | "card" | "netbanking" | "wallet").
 */
export function paymentFailedEmail(o: {
  name?: string | null; planName: string; amount: number;
  billingCycle?: string | null; packageId?: number | null; couponCode?: string | null;
  paymentId?: string | null; reason?: string | null; method?: string | null;
}): Email {
  const plan = line(o.planName) || "your plan";
  const amount = money(o.amount);
  const code = line(o.couponCode).toUpperCase();
  const pid = line(o.paymentId);
  const reason = clip(line(o.reason), 200);
  const method = paidBy(o.method);
  const retry = plansUrl({ packageId: o.packageId, cycle: o.billingCycle, coupon: code });
  const couponKept = !!code && retry.includes("coupon=");

  const hero = heroBand({
    eyebrow: "Payment didn't go through", tone: "red",
    title: `Your ${plan} payment didn't complete`,
    sub: "Your plan isn't active yet. Trying again only takes a minute.",
    aside: amount > 0 ? { label: "Amount", value: inr(amount) } : undefined,
    chips: chips(termChip(o.billingCycle), method, pid && `Ref ${clip(pid, 40)}`),
  });

  const bodyHtml =
    hi(o.name) +
    p(`Your online payment${amount > 0 ? ` of <strong style="color:${BRAND.ink}">${esc(inr(amount))}</strong>` : ""} for the <strong style="color:${BRAND.ink}">${esc(plan)}</strong> ${esc(termPhrase(o.billingCycle))} didn't finish, so your plan hasn't been switched on.`) +
    (reason ? note(`<strong style="color:${BRAND.ink}">What the payment gateway said:</strong> ${esc(reason)}`) : "") +
    button("Try the payment again", retry) +
    (couponKept ? p(`<span style="font-size:13px;color:${BRAND.sub}">Your coupon ${esc(code)} is already on that link.</span>`) : "") +
    callout("amber", "If money left your account",
      `A failed payment isn't collected by us. If your bank or UPI app still shows a debit, it's normally reversed to you automatically within a few working days. If it isn't, send us the payment reference${pid ? ` (${mono(pid)})` : ""} and we'll chase it for you.`) +
    tickList("Other ways to pay", [
      "Try a different method at checkout — UPI, card, netbanking or wallet",
      "Or pay by UPI or bank transfer and submit the reference on the Subscription page — our team verifies it by hand",
    ]) +
    helpStrip();

  return {
    kind: "paymentFailedEmail",
    subject: `Payment didn't go through — ${line(plan)}`,
    html: layout({
      preheader: reason ? `The gateway said: ${reason}. Your plan isn't active yet — you can try again now.` : "Your plan isn't active yet — try again with the same or a different payment method.",
      hero, bodyHtml, accent: TONE.red.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `Your online payment${amount > 0 ? ` of ${inr(amount)}` : ""} for the ${plan} ${termPhrase(o.billingCycle)} didn't go through, so your plan isn't active yet.`,
      reason && `What the payment gateway said: ${reason}`,
      pid && `Payment ref: ${pid}`, BR,
      `Try again: ${retry}`,
      couponKept && `(Your coupon ${code} is already on that link.)`, BR,
      "If money left your account: a failed payment isn't collected by us, and your bank normally reverses any debit automatically within a few working days. If it doesn't, send us the payment reference and we'll chase it.", BR,
      "Other ways to pay: a different method at checkout (UPI, card, netbanking, wallet), or pay by UPI/bank transfer and submit the reference on the Subscription page.", BR,
      `Need a hand? WhatsApp us: ${SUPPORT_WHATSAPP.display}`,
    ),
  };
}

/* ── Paid plan ending soon ───────────────────────────────────────────────── */

/**
 * Customer. The paid-plan reminder, for a daily job (plan item 2) at 7 and 1
 * days before `currentPeriodEnd` of the latest active, non-trial subscription.
 * Nothing renews automatically, so this says when the plan ENDS.
 *
 * - `daysLeft`: whole days until the end (0 = today, 1 = tomorrow).
 * - `validTill`: the end date (Date, "YYYY-MM-DD" or formatted text).
 * - Optional, new:
 *   - `billingCycle`, `slug` (their card link), `packageId` (pre-selects the
 *     plan on the Subscription link once it has ended).
 *   - `upgradeCredit` + `nextPlanName`: what they paid for this plan (the row's
 *     amount) and the next tier up — shows the "upgrade before the end date and
 *     this comes off the price" tip. Omit for the top tier or admin-granted
 *     (₹0) plans, where there is no credit.
 *   - `lapses`: plain-text lines for what pauses when it ends, to override the
 *     defaults derived from the code.
 */
export function subscriptionRenewalReminderEmail(o: {
  name?: string | null; planName: string; daysLeft: number; validTill: string | Date;
  billingCycle?: string | null; slug?: string | null; packageId?: number | null;
  upgradeCredit?: number | null; nextPlanName?: string | null; lapses?: string[] | null;
}): Email {
  const plan = line(o.planName) || "paid";
  const days = Math.max(0, Math.round(Number(o.daysLeft) || 0));
  const endDay = showDay(o.validTill);
  const endDate = showDate(o.validTill);
  const cycle = cycleLabel(o.billingCycle);
  const slug = cleanSlug(o.slug);
  const credit = money(o.upgradeCredit);
  const next = line(o.nextPlanName);
  const lapses = o.lapses && o.lapses.length ? o.lapses.map((x) => esc(line(x))) : defaultLapses(plan, o.billingCycle);
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const urgent = days <= 1;
  const wa = supportWa(`Hi, I'd like to renew my ${line(plan)} plan before it ends${endDate ? ` on ${endDate}` : ""}.`);

  const hero = heroBand({
    eyebrow: urgent ? (days === 0 ? "Plan ends today" : "Plan ends tomorrow") : "Plan ending soon",
    tone: urgent ? "red" : "amber",
    title: endDay ? `Your ${plan} plan ends on ${endDay}` : `Your ${plan} plan ends ${when}`,
    sub: "Nothing renews automatically, so you won't be charged. Renew to keep your premium features without a break.",
    aside: days === 0 ? { label: "Ends", value: "Today" } : { label: days === 1 ? "Day left" : "Days left", value: String(days) },
    chips: chips(termChip(o.billingCycle), endDate && `Ends ${endDate}`),
  });

  const bodyHtml =
    hi(o.name) +
    p(`Your <strong style="color:${BRAND.ink}">${esc(plan)}</strong> ${esc(termPhrase(o.billingCycle))} runs until <strong style="color:${BRAND.ink}">${esc(endDate || when)}</strong>. DigitalCarda plans don't renew by themselves, so nothing will be charged — but once that date passes, your premium features pause until you renew.`) +
    callout(urgent ? "red" : "amber", "Renew without a break",
      `Message us on WhatsApp before ${esc(endDate || "it ends")} and we'll help you renew so nothing pauses. You can also renew yourself from the Subscription page once your plan has ended.`,
      actionPills([
        { label: "Renew on WhatsApp", href: wa, tone: "whatsapp" },
        { label: "See my plan", href: plansUrl({ packageId: o.packageId, cycle: o.billingCycle }), tone: "light" },
      ])) +
    (credit > 0
      ? note(`<strong style="color:${BRAND.ink}">Thinking of moving up${next ? ` to ${esc(next)}` : ""}?</strong> Upgrade before ${esc(endDate || "your plan ends")} and the ${esc(inr(credit))} you paid for ${esc(plan)} comes off the price. After that date, plans are charged in full.`)
      : "") +
    sectionLabel("If your plan ends") +
    keepPausePanel(KEEPS.map(esc), lapses) +
    sectionLabel("Your plan") +
    infoGrid([
      ["Plan", esc(plan)],
      ["Term", cycle && esc(cycle)],
      ["Ends on", endDate && esc(endDate)],
      ["Your card", slug && inkLink(cardUrl(slug), cardLabel(slug))],
    ]) +
    signoff() +
    helpStrip();

  return {
    kind: "subscriptionRenewalReminderEmail",
    subject: `Your ${line(plan)} plan ends ${when}`,
    html: layout({
      preheader: `It won't renew or charge by itself — renew before ${endDate || "it ends"} to keep your premium features running.`,
      hero, bodyHtml, accent: urgent ? TONE.red.solid : TONE.amber.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `Your ${plan} ${termPhrase(o.billingCycle)} ends ${when}${endDate ? ` (${endDate})` : ""}.`,
      "DigitalCarda plans don't renew by themselves, so nothing will be charged — but once that date passes, your premium features pause until you renew.", BR,
      `Renew without a break: WhatsApp us before ${endDate || "it ends"} and we'll help you renew — ${wa}`,
      `Or renew yourself from the Subscription page once it has ended: ${PLANS_URL}`,
      credit > 0 && BR,
      credit > 0 && `Thinking of moving up${next ? ` to ${next}` : ""}? Upgrade before ${endDate || "your plan ends"} and the ${inr(credit)} you paid comes off the price. After that date, plans are charged in full.`, BR,
      "If your plan ends:",
      ...KEEPS.map((k) => `+ ${k}`),
      ...lapses.map((l) => `- ${stripTags(l)}`),
      slug && BR, slug && `Your card: ${cardUrl(slug)}`,
      BR, "Warm regards,", "Team DigitalCarda",
    ),
  };
}

/* ── Paid plan ended ─────────────────────────────────────────────────────── */

/**
 * Customer. For the daily job (plan item 2) once `currentPeriodEnd` of the
 * latest paid subscription has passed. The card is NOT paused (see the header
 * comment) — this says what stops and how to renew.
 *
 * Optional, new: `expiredOn` (the end date), `slug` (shows their live card),
 * `packageId` + `billingCycle` (pre-select the plan on the renew link),
 * `lapses` (plain-text override for what paused).
 */
export function subscriptionExpiredEmail(o: {
  name?: string | null; planName: string;
  expiredOn?: string | Date | null; slug?: string | null; packageId?: number | null; billingCycle?: string | null;
  lapses?: string[] | null;
}): Email {
  const plan = line(o.planName) || "paid";
  const ended = o.expiredOn ? showDate(o.expiredOn) : "";
  const slug = cleanSlug(o.slug);
  const lapses = o.lapses && o.lapses.length ? o.lapses.map((x) => esc(line(x))) : defaultLapses(plan, o.billingCycle);
  const renew = plansUrl({ packageId: o.packageId, cycle: o.billingCycle });

  const hero = heroBand({
    eyebrow: "Plan ended", tone: "amber",
    title: ended ? `Your ${plan} plan ended on ${ended}` : `Your ${plan} plan has ended`,
    sub: "Your card is still online and nothing has been deleted. Renew to switch your premium features back on.",
    aside: slug ? { label: "Your card", value: "Live" } : undefined,
    chips: chips(termChip(o.billingCycle), !slug && "Card still online", "Nothing deleted"),
  });

  const bodyHtml =
    hi(o.name) +
    p(`Your <strong style="color:${BRAND.ink}">${esc(plan)}</strong> plan ${ended ? `ended on <strong style="color:${BRAND.ink}">${esc(ended)}</strong>` : "has ended"}. We haven't taken your card down — ${slug ? `it's still live at ${inkLink(cardUrl(slug), cardLabel(slug))}` : "it stays online at the same link"}, and everything you've built is safe.`) +
    (slug ? cardPreview(slug, "Your DigitalCarda card — still live") : "") +
    sectionLabel("What changes until you renew") +
    keepPausePanel(KEEPS.map(esc), lapses) +
    callout("gold", "Renew in a minute",
      `Choose ${esc(plan)} again on the Subscription page and pay online, or by UPI or bank transfer. Your premium features switch back on as soon as the payment is confirmed.`) +
    button(`Renew ${line(plan) === "paid" ? "my plan" : line(plan)}`, renew) +
    signoff() +
    helpStrip();

  return {
    kind: "subscriptionExpiredEmail",
    subject: `Your ${line(plan)} plan has ended — renew to keep premium features`,
    html: layout({
      preheader: `Your card is still online and nothing is deleted — renew ${line(plan) === "paid" ? "your plan" : line(plan)} to switch premium features back on.`,
      hero, bodyHtml, accent: TONE.amber.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `Your ${plan} plan ${ended ? `ended on ${ended}` : "has ended"}. We haven't taken your card down — ${slug ? `it's still live at ${cardUrl(slug)}` : "it stays online at the same link"}, and everything you've built is safe.`, BR,
      "What changes until you renew:",
      ...KEEPS.map((k) => `+ ${k}`),
      ...lapses.map((l) => `- ${stripTags(l)}`), BR,
      `Renew in a minute: ${renew}`,
      "Pay online, or by UPI or bank transfer — premium features switch back on as soon as the payment is confirmed.", BR,
      "Warm regards,", "Team DigitalCarda",
      `Need a hand? WhatsApp us: ${SUPPORT_WHATSAPP.display}`,
    ),
  };
}

/* ── Validity extended by the team (NEW) ─────────────────────────────────── */

/**
 * Customer. NEW. Sent when an admin extends a customer's validity
 * (user.extendValidity, api/user-router.ts:368-391 — not wired yet, plan item 25).
 *
 * - `days`: days added (1–3650, input.days).
 * - `validTill`: the new end date (`end`, or the returned "YYYY-MM-DD").
 * - `planName` (optional): name of the plan on the latest subscription row
 *   (look up sub.packageId). When no row existed the job creates a Trial row.
 * - `previousEnd` (optional): the old `sub.currentPeriodEnd`. If it is in the
 *   past the plan had lapsed, and the copy says so.
 * - `slug` (optional): their card, for the link panel.
 */
export function planExtendedEmail(o: {
  name?: string | null; planName?: string | null; days: number; validTill: string | Date;
  previousEnd?: string | Date | null; slug?: string | null;
}): Email {
  const plan = line(o.planName);
  const days = Math.max(1, Math.round(Number(o.days) || 0));
  const till = showDate(o.validTill);
  const prevDate = o.previousEnd ? toDate(o.previousEnd) : null;
  const prev = o.previousEnd ? showDate(o.previousEnd) : "";
  const lapsed = !!prevDate && prevDate.getTime() < Date.now();
  const slug = cleanSlug(o.slug);
  const planWords = plan ? `${plan} plan` : "plan";

  const hero = heroBand({
    eyebrow: "Plan extended", tone: "green",
    title: `We've added ${plural(days, "day")} to your ${planWords}`,
    sub: `It's now valid till ${till}. It's already applied — there's nothing you need to do.`,
    aside: { label: "Added", value: `+${days.toLocaleString("en-IN")}`, sub: days === 1 ? "day" : "days" },
    chips: chips(plan && `${plan} plan`, till && `Valid till ${till}`),
  });

  const tiles = [
    prev ? { label: lapsed ? "Had ended on" : "Was ending", value: esc(prev) } : null,
    { label: "Now valid till", value: `<span style="color:${TONE.green.text}">${esc(till)}</span>` },
    { label: "Added", value: esc(`+${plural(days, "day")}`) },
  ].filter((t): t is { label: string; value: string } => !!t);

  const bodyHtml =
    hi(o.name) +
    p(`Our team has extended your <strong style="color:${BRAND.ink}">${esc(planWords)}</strong> by <strong style="color:${BRAND.ink}">${esc(plural(days, "day"))}</strong>.${lapsed ? " Your plan is running again from today." : ""} Your card and everything you've set up carry on exactly as before.`) +
    statTiles(tiles) +
    (slug ? linkPanel("Your card", cardUrl(slug)) : "") +
    button("Open your dashboard", `${SITE}/dashboard`) +
    helpStrip();

  return {
    kind: "planExtendedEmail",
    subject: `Your ${line(planWords)} is extended till ${till}`,
    html: layout({
      preheader: `${plural(days, "day")} added by our team — ${lapsed ? "your plan is running again" : "no action needed"}.`,
      hero, bodyHtml, accent: TONE.green.solid, audience: "customer",
    }),
    text: lines(
      `Hi ${firstName(o.name) || "there"},`, BR,
      `Our team has extended your ${planWords} by ${plural(days, "day")}.${lapsed ? " Your plan is running again from today." : ""} It's already applied — nothing to do.`, BR,
      prev && `${lapsed ? "Had ended on" : "Was ending"}: ${prev}`,
      `Now valid till: ${till}`,
      slug && `Your card: ${cardUrl(slug)}`, BR,
      `Dashboard: ${SITE}/dashboard`,
      `Need a hand? WhatsApp us: ${SUPPORT_WHATSAPP.display}`,
    ),
  };
}
