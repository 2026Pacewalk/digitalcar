/*
 * Refer & Earn emails: a friend joins with your link, their upgrade earns you
 * a reward, and the wallet payout moves through requested -> paid / declined.
 *
 * The three payout emails share one object, the "payout slip": the same card
 * (amount, where it goes, reference) with a stamp that changes as the request
 * moves along, so the customer recognises it from one email to the next.
 *
 * Kinds are stored in email_logs: keep them exactly as they are.
 */

import {
  type Email, type Tone,
  layout, heroBand, heroLight,
  sectionLabel, button, actionPills, statTiles, callout, note,
  progressSteps, quoteBlock, linkPanel, helpStrip, signoff, pill, darkChip,
  hi, p, strong, mono, small, goldLink,
  esc, inr, firstName, whenIst, dateIst,
  BRAND, TONE, FONT, SITE, SUPPORT_WHATSAPP,
} from "./kit";

/* ── Local helpers ─────────────────────────────────────────────────────── */

const REFER_URL = `${SITE}/dashboard/refer`;

/** "₹450" for whole rupees, "₹449.50" otherwise (commissions are percentages,
    so paise are common). Anything that isn't a number reads as ₹0. */
function rupees(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return inr(0);
  return Number.isInteger(n)
    ? inr(n)
    : "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A value that is present and numeric (so an optional balance of "" or "abc" drops out). */
const hasNum = (v: unknown): boolean => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

/** A usable Date or null. */
const okDate = (d?: Date | null): Date | null => (d instanceof Date && !isNaN(d.getTime()) ? d : null);

/** "UPI" / "Bank transfer" from the stored method ("upi" | "bank"). */
function methodLabel(method?: string | null): string {
  const m = String(method || "").trim().toLowerCase();
  if (m === "upi") return "UPI";
  if (m === "bank") return "Bank transfer";
  return m ? m.toUpperCase() : "";
}

/** The same, mid-sentence: "paid by UPI", "paid by bank transfer". */
const methodInline = (method?: string | null) => { const l = methodLabel(method); return l === "Bank transfer" ? "bank transfer" : l; };

/** Mask a payout destination so a forwarded email never carries a full account
    number or UPI id. Idempotent: masking an already-masked value gives the same
    result, so callers may pass either the raw or the masked value.
      "aarav.mehta@okicici" -> "aa•••@okicici"      "001234567890" -> "•••• 7890" */
function maskDestination(raw?: string | null): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const at = s.lastIndexOf("@");
  if (at > 0) {
    const handle = s.slice(0, at).replace(/[•*]+$/, "");
    return `${handle.slice(0, 2)}•••@${s.slice(at + 1)}`;
  }
  const digits = s.replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "••••";
}

/** The customer's own share link, exactly as the Refer & Earn page builds it. */
const referLink = (code: string) => `${SITE}/signup?ref=${encodeURIComponent(code.trim())}`;
const shareText = (link: string) => `Join DigitalCarda — the smart digital business card — with my link: ${link}`;
/** WhatsApp share sheet with no recipient, so they pick the chat. */
const waShare = (link: string) => `https://wa.me/?text=${encodeURIComponent(shareText(link))}`;

/** "Your link" panel + share pills, used where sharing again is the natural next step. */
function sharePanel(code: string, label = "Your referral link"): string {
  const link = referLink(code);
  return linkPanel(label, link) + actionPills([
    { label: "Share on WhatsApp", href: waShare(link), tone: "whatsapp" },
    { label: "Open Refer & Earn", href: REFER_URL, tone: "light" },
  ]);
}

/** The payout slip: a card with the amount up top, a status stamp, and rows
    below a dashed tear line. Row values are trusted HTML; labels are text. */
function payoutSlip(o: {
  heading: string;                 // "Payout request #214" (text)
  amount: unknown;
  stamp: { text: string; tone: Tone };
  rows: [string, string | null | undefined | false][];
}): string {
  const live = o.rows.filter((r): r is [string, string] => !!r[1]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;border:1px solid ${BRAND.line};border-top:4px solid ${BRAND.gold};border-radius:14px;background:#FFFFFF">
    <tr><td style="padding:18px 20px 16px;border-bottom:1px dashed #CBD5E1">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="top">
          <div style="font-family:${FONT};font-size:10.5px;font-weight:800;color:${BRAND.sub};text-transform:uppercase;letter-spacing:1.2px">${esc(o.heading)}</div>
          <div style="font-family:${FONT};font-size:30px;line-height:1.2;font-weight:800;color:${BRAND.ink};letter-spacing:-.6px;padding-top:6px;white-space:nowrap">${esc(rupees(o.amount))}</div>
        </td>
        <td valign="top" align="right" style="padding-left:12px">${pill(o.stamp.text, o.stamp.tone)}</td>
      </tr></table>
    </td></tr>
    ${live.length ? `<tr><td style="padding:4px 20px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${live.map(([k, v], i) => `<tr>
          <td valign="top" style="padding:11px 12px 11px 0;${i < live.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}font-family:${FONT};font-size:12.5px;font-weight:600;color:${BRAND.sub};white-space:nowrap">${esc(k)}</td>
          <td valign="top" align="right" style="padding:11px 0;${i < live.length - 1 ? `border-bottom:1px solid ${BRAND.line};` : ""}font-family:${FONT};font-size:13.5px;font-weight:700;line-height:1.5;color:${BRAND.ink};word-break:break-word">${v}</td>
        </tr>`).join("")}
      </table>
    </td></tr>` : ""}
  </table>`;
}

/** The helpStrip() line for plain-text versions. */
const HELP_TEXT = `Need a hand? Reply to this email or WhatsApp us on ${SUPPORT_WHATSAPP.display} (https://wa.me/${SUPPORT_WHATSAPP.wa}).`;

/** Plain-text lines, dropping empty ones. */
const lines = (...xs: (string | false | null | undefined)[]) => xs.filter((x) => x !== false && x !== null && x !== undefined).join("\n");

/* ── 1. A friend joined with your link (NEW) ───────────────────────────── */

/**
 * referralJoinedEmail: tells the REFERRER that someone signed up with their link.
 *
 * Audience: customer (the referrer).
 * Trigger:  welcomeNewAccount, api/auth-router.ts, right after the `referrals`
 *           row is inserted with status "joined" (next to the referrer's bell
 *           notification and referralSignupAdminEmail). Once per signup.
 *           Send to `referrer.email`; `referrer` is the full user row from resolveReferrer().
 *
 * No money has moved yet: the copy only says a reward comes when the friend
 * upgrades. It never names an amount unless the caller passes one.
 *
 * Fields:
 *  - name              the referrer's full name (referrer.fullName).
 *  - friendName        the new user's name (insertedUser.fullName). Only the name
 *                      is shown, never the friend's email.
 *  - rewardText        optional plain text for what the referrer earns, e.g.
 *                      "15% of what they pay". Read as "you earn <rewardText>"
 *                      after "When <friend> buys their first paid plan,".
 *                      Wins over commissionPercent.
 *  - commissionPercent optional; the admin setting referral_commission_percent
 *                      (default 15). Rendered as "N% of what they pay" (the reward
 *                      is credited once, on the friend's first paid conversion).
 *  - discountPercent   optional; referral_discount_percent (default 15): what the
 *                      friend saves on their first paid plan, used for a nudge.
 *  - code              optional; the referral code that was used (the referrer's
 *                      card slug or older DC... code). Adds the share-again panel.
 *  - joinedAt          optional signup time (defaults to not shown).
 */
export function referralJoinedEmail(o: {
  name?: string | null;
  friendName?: string | null;
  rewardText?: string | null;
  commissionPercent?: number | null;
  discountPercent?: number | null;
  code?: string | null;
  joinedAt?: Date | null;
}): Email {
  const friend = String(o.friendName || "").trim() || "Someone";
  const friendFirst = firstName(o.friendName) || "your friend";
  const pct = hasNum(o.commissionPercent) && Number(o.commissionPercent) > 0 ? Number(o.commissionPercent) : null;
  const off = hasNum(o.discountPercent) && Number(o.discountPercent) > 0 ? Number(o.discountPercent) : null;
  const reward = String(o.rewardText || "").trim() || (pct !== null ? `${pct}% of what they pay` : "");
  const code = String(o.code || "").trim();
  const joined = okDate(o.joinedAt);

  const chips = [
    joined ? darkChip(`Joined ${esc(dateIst(joined))}`) : "",
    code ? darkChip(`Your code &nbsp;<span style="color:${BRAND.gold}">${esc(code)}</span>`) : "",
  ].filter(Boolean);

  const hero = heroBand({
    eyebrow: "Refer & Earn · New signup",
    title: `${friend} just joined with your link`,
    sub: "Nothing to claim yet — you earn when they move to a paid plan.",
    tone: "gold",
    aside: pct !== null && !String(o.rewardText || "").trim() ? { label: "You earn", value: `${pct}%`, sub: "of their first plan" } : undefined,
    chips,
  });

  const earnLine = reward
    ? `When ${esc(friendFirst)} buys their first paid plan, you earn ${strong(reward)}. It's added to your Refer &amp; Earn wallet and we'll email you.`
    : `When ${esc(friendFirst)} buys their first paid plan, your referral reward is added to your Refer &amp; Earn wallet and we'll email you.`;

  const bodyHtml =
    hi(o.name) +
    p(`Good news: ${strong(friend)} signed up for DigitalCarda using your referral link. They're now linked to you, so when they upgrade, the reward is yours.`) +
    sectionLabel("Where this referral stands") +
    progressSteps(["You shared", "They joined", "They upgrade", "You get paid"], 2) +
    callout("gold", "What happens next",
      `${earnLine} From there you can withdraw it to your UPI or bank account whenever you like.`) +
    (off !== null
      ? callout("blue", `A nudge helps: ${friendFirst} saves ${off}%`,
          `Because they joined with your link, ${esc(friendFirst)} gets ${strong(`${off}% off`)} their first paid plan. A quick message reminding them of that may be all it takes.`)
      : "") +
    (code ? sectionLabel("Know someone else?") + p("Every friend who joins with your link and upgrades earns you a reward. Share it again:") + sharePanel(code) : button("Open Refer & Earn", REFER_URL)) +
    helpStrip() +
    signoff();

  const text = lines(
    `Hi ${firstName(o.name) || "there"},`,
    "",
    `${friend} just joined DigitalCarda with your referral link${joined ? ` (${dateIst(joined)})` : ""}.`,
    "",
    "Nothing to claim yet. Where this referral stands:",
    "  1. You shared your link - done",
    "  2. They joined - done",
    "  3. They upgrade to a paid plan - next",
    "  4. You get paid",
    "",
    reward
      ? `When ${friendFirst} buys their first paid plan, you earn ${reward}. It's added to your Refer & Earn wallet and we'll email you.`
      : `When ${friendFirst} buys their first paid plan, your referral reward is added to your Refer & Earn wallet and we'll email you.`,
    "You can then withdraw it to your UPI or bank account whenever you like.",
    off !== null && "",
    off !== null && `A nudge helps: because they joined with your link, ${friendFirst} gets ${off}% off their first paid plan.`,
    "",
    code ? `Your referral link: ${referLink(code)}` : false,
    `Refer & Earn: ${REFER_URL}`,
    "",
    HELP_TEXT,
    "",
    "Warm regards,",
    "Team DigitalCarda",
  );

  return {
    kind: "referralJoinedEmail",
    subject: `${friend} joined DigitalCarda with your link`,
    html: layout({
      preheader: reward
        ? `You earn ${reward} when ${friendFirst} buys their first paid plan.`
        : `Your reward lands in your wallet when ${friendFirst} buys their first paid plan.`,
      hero,
      bodyHtml,
      accent: BRAND.gold,
      audience: "customer",
    }),
    text,
  };
}

/* ── 2. Referral reward credited (PORTED) ──────────────────────────────── */

/**
 * referralRewardEmail: the referrer's wallet was credited for a paid conversion.
 *
 * Audience: customer (the referrer).
 * Triggers: activateVerifiedOrder, api/payment-router.ts (auto-credit on the
 *           referee's first paid plan, all three money paths). To be wired too:
 *           referral.creditReward, api/referral-router.ts (admin manual credit),
 *           passing creditedByTeam: true and the balance from applyWallet().
 *
 * Existing fields (unchanged): name, refereeName, amount, balance.
 * Added (all optional):
 *  - planName        the plan the friend bought (order.planName).
 *  - percent         the commission % used for this reward.
 *  - code            the referrer's referral code (referrals.code); adds the share-again panel.
 *  - creditedByTeam  true when an admin credited it by hand (creditReward).
 */
export function referralRewardEmail(o: {
  name?: string;
  refereeName?: string;
  amount: number | string;
  balance?: number | string;
  planName?: string | null;
  percent?: number | null;
  code?: string | null;
  creditedByTeam?: boolean;
}): Email {
  const who = String(o.refereeName || "").trim();
  const whoFirst = firstName(who) || "Your friend";
  const amount = rupees(o.amount);
  const bal = hasNum(o.balance) ? rupees(o.balance) : null;
  const pct = hasNum(o.percent) && Number(o.percent) > 0 ? Number(o.percent) : null;
  const plan = String(o.planName || "").trim();
  const code = String(o.code || "").trim();

  const hero = heroBand({
    eyebrow: o.creditedByTeam ? "Refer & Earn · Credited by our team" : "Refer & Earn · Reward credited",
    title: who ? `${who} upgraded to a paid plan` : "Your referral upgraded to a paid plan",
    sub: "Your reward is already in your wallet. Thank you for spreading the word.",
    tone: "green",
    aside: { label: "You earned", value: amount, sub: "added to wallet" },
    chips: [
      plan ? darkChip(`Plan: ${esc(plan)}`) : "",
      bal ? darkChip(`Wallet balance &nbsp;<span style="color:${BRAND.gold}">${esc(bal)}</span>`) : "",
    ].filter(Boolean),
  });

  const lead = o.creditedByTeam
    ? `Our team has credited ${strong(amount)} to your Refer &amp; Earn wallet for ${who ? strong(who) : "a friend you referred"} moving to a paid plan.`
    : `${who ? strong(who) : "Someone you referred"} just upgraded to a paid plan${plan ? ` (${esc(plan)})` : ""}, so ${strong(amount)} has been added to your Refer &amp; Earn wallet.`;

  const tiles = [
    { label: "This reward", value: esc(amount), sub: who ? esc(`for ${whoFirst}`) : undefined },
    ...(bal ? [{ label: "Wallet balance", value: esc(bal), sub: "ready to withdraw" }] : []),
    ...(pct !== null ? [{ label: "Your share", value: esc(`${pct}%`), sub: "of what they paid" }] : []),
  ];

  const bodyHtml =
    hi(o.name) +
    p(lead) +
    statTiles(tiles) +
    callout("green", "Cash it out whenever you like",
      "Request a payout from Refer &amp; Earn to your UPI ID or bank account. Our team pays it out and emails you when it's sent.",
      actionPills([{ label: "Withdraw to UPI or bank", href: REFER_URL, tone: "gold" }])) +
    (code
      ? sectionLabel("Keep it going") + p("Every friend who joins with your link and upgrades earns you another reward.") + sharePanel(code)
      : small(`Your referral link is always on ${goldLink(REFER_URL, "Refer & Earn")}: every friend who joins with it and upgrades earns you another reward.`)) +
    helpStrip() +
    signoff();

  const text = lines(
    `Hi ${firstName(o.name) || "there"},`,
    "",
    o.creditedByTeam
      ? `Our team has credited ${amount} to your Refer & Earn wallet for ${who || "a friend you referred"} moving to a paid plan.`
      : `${who || "Someone you referred"} just upgraded to a paid plan${plan ? ` (${plan})` : ""}, so ${amount} has been added to your Refer & Earn wallet.`,
    "",
    `This reward: ${amount}`,
    bal ? `Wallet balance: ${bal}` : false,
    pct !== null ? `Your share: ${pct}% of what they paid` : false,
    "",
    "Cash it out whenever you like: request a payout to your UPI ID or bank account from Refer & Earn.",
    `Wallet: ${REFER_URL}`,
    code ? "" : false,
    code ? `Keep sharing your link: ${referLink(code)}` : false,
    "",
    HELP_TEXT,
    "",
    "Warm regards,",
    "Team DigitalCarda",
  );

  return {
    kind: "referralRewardEmail",
    subject: `You earned ${amount} 🎉`,
    html: layout({
      preheader: bal
        ? `${who || "Your referral"} upgraded. Your wallet now holds ${bal}, ready to withdraw.`
        : `${who || "Your referral"} upgraded. Withdraw your reward to UPI or bank from Refer & Earn.`,
      hero,
      bodyHtml,
      accent: TONE.green.solid,
      audience: "customer",
    }),
    text,
  };
}

/* ── 3. Payout request received (NEW) ──────────────────────────────────── */

/**
 * payoutRequestReceivedEmail: confirms a wallet payout request to the person who made it.
 *
 * Audience: customer (the requester).
 * Trigger:  referral.requestWithdrawal, api/referral-router.ts, after the
 *           withdrawal row is inserted and the amount is held with applyWallet()
 *           (next to payoutRequestAdminEmail). Send to ctx.user.email.
 *
 * The code states no payout time, so the copy promises none: the team pays it
 * by hand and a second email follows (payoutCompletedEmail).
 *
 * Fields:
 *  - name               ctx.user.fullName.
 *  - amount             input.amount (rupees).
 *  - method             input.method: "upi" | "bank".
 *  - destinationMasked  the UPI id or account number. Masked again here, so the
 *                       raw input.destination is also safe to pass.
 *  - accountName        optional; bank account holder name (bank payouts).
 *  - ifsc               optional; IFSC code (bank payouts).
 *  - balance            optional; wallet balance after the hold (applyWallet's return value).
 *  - requestId          optional; the withdrawal_requests id (ins.insertId), shown as "#214".
 *  - requestedAt        optional; when it was requested (defaults to not shown).
 */
export function payoutRequestReceivedEmail(o: {
  name?: string | null;
  amount: number | string;
  method?: string | null;
  destinationMasked?: string | null;
  accountName?: string | null;
  ifsc?: string | null;
  balance?: number | string | null;
  requestId?: number | string | null;
  requestedAt?: Date | null;
}): Email {
  const amount = rupees(o.amount);
  const method = methodLabel(o.method);
  const dest = maskDestination(o.destinationMasked);
  const bal = hasNum(o.balance) ? rupees(o.balance) : null;
  const ref = o.requestId !== null && o.requestId !== undefined && String(o.requestId).trim() ? `#${String(o.requestId).trim()}` : "";
  const at = okDate(o.requestedAt);
  const isBank = String(o.method || "").toLowerCase() === "bank";

  const hero = heroLight({
    badge: "Payout requested",
    title: `We've got your ${amount} payout request`,
    sub: `The amount is on hold in your wallet while our team pays it out${method ? ` by ${methodInline(o.method)}` : ""}.`,
    tone: "blue",
  });

  const bodyHtml =
    hi(o.name) +
    p(`Thanks — your request to withdraw ${strong(amount)} from your Refer &amp; Earn wallet has reached us. Here's where it stands:`) +
    progressSteps(["Requested", "Team review", "Paid to you"], 1, "blue") +
    payoutSlip({
      heading: ref ? `Payout request ${ref}` : "Payout request",
      amount: o.amount,
      stamp: { text: "On hold", tone: "amber" },
      rows: [
        ["Method", method ? esc(method) : null],
        [isBank ? "Account" : "Paying to", dest ? esc(dest) : null],
        ["Account name", o.accountName ? esc(String(o.accountName).trim()) : null],
        ["IFSC", o.ifsc ? esc(String(o.ifsc).trim().toUpperCase()) : null],
        ["Requested", at ? esc(whenIst(at)) : null],
        ["Wallet after hold", bal ? esc(bal) : null],
      ],
    }) +
    callout("blue", "What happens now",
      `Our team reviews every payout by hand and sends it to the ${isBank ? "bank account" : method === "UPI" ? "UPI ID" : "account"} above. The amount stays on hold, so it can't be spent twice. We'll email you as soon as it's paid.`) +
    note(`${strong("Spotted a mistake in your details?")} Reply to this email before we pay it out and we'll fix it. If a payout can't be made, the full amount goes back to your wallet.`) +
    button("Track it in Refer & Earn", REFER_URL, "dark") +
    helpStrip() +
    signoff();

  const text = lines(
    `Hi ${firstName(o.name) || "there"},`,
    "",
    `We've got your request to withdraw ${amount} from your Refer & Earn wallet.`,
    "",
    `Payout request${ref ? ` ${ref}` : ""}: ${amount} (on hold)`,
    method ? `Method: ${method}` : false,
    dest ? `${isBank ? "Account" : "Paying to"}: ${dest}` : false,
    o.accountName ? `Account name: ${String(o.accountName).trim()}` : false,
    o.ifsc ? `IFSC: ${String(o.ifsc).trim().toUpperCase()}` : false,
    at ? `Requested: ${whenIst(at)}` : false,
    bal ? `Wallet after hold: ${bal}` : false,
    "",
    "What happens now: our team reviews every payout by hand and sends it to the details above. The amount stays on hold, so it can't be spent twice. We'll email you as soon as it's paid.",
    "",
    "Spotted a mistake in your details? Reply to this email before we pay it out. If a payout can't be made, the full amount goes back to your wallet.",
    "",
    `Track it: ${REFER_URL}`,
    "",
    HELP_TEXT,
    "",
    "Warm regards,",
    "Team DigitalCarda",
  );

  return {
    kind: "payoutRequestReceivedEmail",
    subject: `Payout request received — ${amount}`,
    html: layout({
      preheader: `${amount} is on hold in your wallet while our team pays it out. We'll email you once it's sent.`,
      hero,
      bodyHtml,
      accent: TONE.blue.solid,
      audience: "customer",
    }),
    text,
  };
}

/* ── 4. Payout sent (PORTED) ───────────────────────────────────────────── */

/**
 * payoutCompletedEmail: the team marked a wallet payout as paid.
 *
 * Audience: customer (the payee).
 * Trigger:  referral.payWithdrawal, api/referral-router.ts.
 *
 * Existing fields (unchanged): name, amount, method, reference.
 * Added (all optional):
 *  - destinationMasked  wr.destination; masked here, raw is safe to pass.
 *  - paidAt             when it was marked paid (processedAt).
 *  - requestId          the withdrawal_requests id, shown as "#214".
 *  - balance            the wallet balance left after this payout.
 *
 * Fixed: the wallet link now goes to /dashboard/refer (it pointed at /reseller).
 */
export function payoutCompletedEmail(o: {
  name?: string;
  amount: number | string;
  method?: string;
  reference?: string;
  destinationMasked?: string | null;
  paidAt?: Date | null;
  requestId?: number | string | null;
  balance?: number | string | null;
}): Email {
  const amount = rupees(o.amount);
  const method = methodLabel(o.method);
  const isBank = String(o.method || "").toLowerCase() === "bank";
  const isUpi = String(o.method || "").toLowerCase() === "upi";
  const dest = maskDestination(o.destinationMasked);
  const reference = String(o.reference || "").trim();
  const paid = okDate(o.paidAt);
  const ref = o.requestId !== null && o.requestId !== undefined && String(o.requestId).trim() ? `#${String(o.requestId).trim()}` : "";
  const bal = hasNum(o.balance) ? rupees(o.balance) : null;

  const hero = heroBand({
    eyebrow: "Payout · Sent",
    title: "Your payout is on its way",
    sub: `Paid from your Refer & Earn wallet${method ? ` by ${methodInline(o.method)}` : ""}. Thank you for referring your friends.`,
    tone: "green",
    aside: { label: "Paid out", value: amount, sub: method || undefined },
    chips: [
      dest ? darkChip(`To ${esc(dest)}`) : "",
      reference ? darkChip(`Ref &nbsp;<span style="color:${BRAND.gold}">${esc(reference)}</span>`) : "",
    ].filter(Boolean),
  });

  const reflect = isBank
    ? "Bank transfers can take 1–2 working days to show in your account."
    : isUpi
      ? "UPI payments usually show up in your UPI app's history soon after they're sent."
      : "Depending on your bank, it can take a little while to show in your account.";

  const bodyHtml =
    hi(o.name) +
    p(`Good news: your payout of ${strong(amount)} has been ${strong("processed")} and sent to you.`) +
    progressSteps(["Requested", "Team review", "Paid to you"], 3, "green") +
    payoutSlip({
      heading: ref ? `Payout ${ref}` : "Payout",
      amount: o.amount,
      stamp: { text: "Paid", tone: "green" },
      rows: [
        ["Method", method ? esc(method) : null],
        [isBank ? "Account" : "Paid to", dest ? esc(dest) : null],
        ["Reference", reference ? mono(reference) : null],
        ["Paid on", paid ? esc(dateIst(paid)) : null],
        ["Wallet balance", bal ? esc(bal) : null],
      ],
    }) +
    small(reflect) +
    callout("blue", "Not in your account yet?",
      reference
        ? `Check your ${isUpi ? "UPI app" : "bank statement"} for the reference ${mono(reference)}. If it still hasn't arrived, reply to this email with that reference and we'll trace it for you.`
        : `Give it a little time, then check your ${isUpi ? "UPI app" : "bank statement"}. If it still hasn't arrived, reply to this email and we'll trace it for you.`) +
    button("View my wallet", REFER_URL) +
    helpStrip() +
    signoff();

  const text = lines(
    `Hi ${firstName(o.name) || "there"},`,
    "",
    `Your payout of ${amount} has been processed and sent to you.`,
    "",
    `Payout${ref ? ` ${ref}` : ""}: ${amount} (paid)`,
    method ? `Method: ${method}` : false,
    dest ? `${isBank ? "Account" : "Paid to"}: ${dest}` : false,
    reference ? `Reference: ${reference}` : false,
    paid ? `Paid on: ${dateIst(paid)}` : false,
    bal ? `Wallet balance: ${bal}` : false,
    "",
    reflect,
    "Not in your account yet? Reply to this email" + (reference ? ` with the reference ${reference}` : "") + " and we'll trace it for you.",
    "",
    `View your wallet: ${REFER_URL}`,
    "",
    HELP_TEXT,
    "",
    "Warm regards,",
    "Team DigitalCarda",
  );

  return {
    kind: "payoutCompletedEmail",
    subject: `Payout sent — ${amount} 🎉`,
    html: layout({
      preheader: reference
        ? `${amount} has been paid${method ? ` by ${methodInline(o.method)}` : ""}. Payment reference: ${reference}.`
        : `${amount} has been paid${method ? ` by ${methodInline(o.method)}` : ""} from your Refer & Earn wallet.`,
      hero,
      bodyHtml,
      accent: TONE.green.solid,
      audience: "customer",
    }),
    text,
  };
}

/* ── 5. Payout declined, money back in the wallet (NEW) ────────────────── */

/**
 * payoutRejectedEmail: the team declined a payout; the held amount was refunded to the wallet.
 *
 * Audience: customer (the payee).
 * Trigger:  referral.rejectWithdrawal, api/referral-router.ts, after applyWallet()
 *           refunds the amount (next to the "payout_rejected" bell notification).
 *           Look up the payee's email and fullName by wr.userId.
 *
 * Fields:
 *  - name               payee fullName.
 *  - amount             wr.amount (the amount returned).
 *  - note               optional; input.note, the admin's reason, shown as their words.
 *  - balance            optional; applyWallet's return value (balance after the refund).
 *  - method             optional; wr.method ("upi" | "bank").
 *  - destinationMasked  optional; wr.destination, masked here (raw is safe to pass).
 *  - requestId          optional; wr.id, shown as "#214".
 */
export function payoutRejectedEmail(o: {
  name?: string | null;
  amount: number | string;
  note?: string | null;
  balance?: number | string | null;
  method?: string | null;
  destinationMasked?: string | null;
  requestId?: number | string | null;
}): Email {
  const amount = rupees(o.amount);
  const why = String(o.note || "").trim();
  const bal = hasNum(o.balance) ? rupees(o.balance) : null;
  const method = methodLabel(o.method);
  const isBank = String(o.method || "").toLowerCase() === "bank";
  const dest = maskDestination(o.destinationMasked);
  const ref = o.requestId !== null && o.requestId !== undefined && String(o.requestId).trim() ? `#${String(o.requestId).trim()}` : "";

  const hero = heroBand({
    eyebrow: "Payout · Not sent",
    title: "Your payout couldn't be sent",
    sub: `Your money is safe: the full ${amount} is back in your Refer & Earn wallet.`,
    tone: "amber",
    aside: { label: "Back in wallet", value: amount },
    chips: [
      ref ? darkChip(`Request ${esc(ref)}`) : "",
      bal ? darkChip(`Wallet balance &nbsp;<span style="color:${BRAND.gold}">${esc(bal)}</span>`) : "",
    ].filter(Boolean),
  });

  const bodyHtml =
    hi(o.name) +
    p(`We weren't able to pay out your request for ${strong(amount)}, so we've declined it and returned the ${strong("full amount")} to your wallet. Nothing has been lost.`) +
    (why
      ? sectionLabel("Why it wasn't sent") + quoteBlock(why, "DigitalCarda team")
      : p("If you'd like to know why, just reply to this email and we'll explain.")) +
    payoutSlip({
      heading: ref ? `Payout request ${ref}` : "Payout request",
      amount: o.amount,
      stamp: { text: "Returned to wallet", tone: "amber" },
      rows: [
        ["Method", method ? esc(method) : null],
        [isBank ? "Account" : "Was going to", dest ? esc(dest) : null],
        ["Refunded", esc(amount)],
        ["Wallet balance now", bal ? esc(bal) : null],
      ],
    }) +
    callout("gold", "Try again when you're ready",
      `Check your ${isBank ? "account number and IFSC" : method === "UPI" ? "UPI ID" : "payout details"}${why ? " against the note above" : ""}, then request the payout again from Refer &amp; Earn. Not sure what to change? Message us first and we'll help you get it right.`,
      actionPills([
        { label: "Request payout again", href: REFER_URL, tone: "gold" },
        { label: "Ask us on WhatsApp", href: `https://wa.me/${SUPPORT_WHATSAPP.wa}?text=${encodeURIComponent(`Hi, my Refer & Earn payout${ref ? ` ${ref}` : ""} of ${amount} was declined. Can you help?`)}`, tone: "whatsapp" },
      ])) +
    helpStrip() +
    signoff();

  const text = lines(
    `Hi ${firstName(o.name) || "there"},`,
    "",
    `We couldn't send your payout of ${amount}, so we've declined it and returned the full amount to your Refer & Earn wallet. Nothing has been lost.`,
    "",
    why ? `Why it wasn't sent: "${why}"` : "If you'd like to know why, just reply to this email and we'll explain.",
    "",
    `Payout request${ref ? ` ${ref}` : ""}: ${amount} (returned to wallet)`,
    method ? `Method: ${method}` : false,
    dest ? `${isBank ? "Account" : "Was going to"}: ${dest}` : false,
    bal ? `Wallet balance now: ${bal}` : false,
    "",
    "Try again when you're ready: check your payout details, then request the payout again from Refer & Earn.",
    REFER_URL,
    "",
    HELP_TEXT,
    "",
    "Warm regards,",
    "Team DigitalCarda",
  );

  return {
    kind: "payoutRejectedEmail",
    subject: `Payout declined — ${amount} is back in your wallet`,
    html: layout({
      preheader: why
        ? `Your ${amount} is back in your wallet. Here's why it wasn't sent and how to try again.`
        : `Your ${amount} is back in your wallet. You can request the payout again any time.`,
      hero,
      bodyHtml,
      accent: TONE.amber.solid,
      audience: "customer",
    }),
    text,
  };
}
