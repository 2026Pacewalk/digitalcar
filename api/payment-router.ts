import { z } from "zod";
import { createRouter, authedQuery, adminQuery, resellerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  paymentOrders, appSettings, subscriptionPackages, subscriptions, users, notifications, cardTrials, funnelEvents, resellerProfiles,
  referrals, resellerCommissions,
} from "@db/schema";
import { applyWallet, affectedRows } from "./lib/wallet";
import { eq, desc, and, gt, ne, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail, ownerAddress } from "./lib/mail";
import { allows } from "./lib/notify-prefs";
import {
  paymentSubmittedEmail, paymentToVerifyAdminEmail, paymentVerifiedEmail, paymentRejectedEmail, referralRewardEmail, resellerCommissionEmail,
  onlineSaleAdminEmail, paymentSettingsChangedAdminEmail, type Email,
} from "./lib/email-templates";
import { getUpgradeOfferPercent } from "./lib/pricing";
import { evaluateCoupon, recordRedemption, recordPaidCoupon, completeRedemptionForOrder, cancelRedemptionForOrder } from "./lib/coupons";
import { envRazorpayCreds, credsComplete, inferMode, createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder } from "./lib/razorpay";
import { clientIp } from "./lib/rate-limit";
import { notifyUser, notifyTeam, resolveTeam } from "./lib/notify";
import { linkedSince, visibleSinceLink } from "./lib/reseller-links";
import { edgeGeo } from "./lib/analytics";
import {
  FX_KEYS, getFxConfig, usdFor, priceKey, readOrderMoney, resolveCheckoutCurrency, isInvalidCurrencyError,
  UnsupportedCurrencyError, USD_UNAVAILABLE_MESSAGE, effectiveRowCurrency, verifiedUsdPayment,
} from "./lib/fx";
import { layout, heroLight, p as para, small, esc, whenIst, TONE } from "./lib/email/kit";
import { CURRENCIES, isCurrency, chargeFor, roundMoney, toMinor, formatMoney, type Currency } from "@contracts/money";

type Order = typeof paymentOrders.$inferSelect;
/** A confirmed online plan payment. `amount` is in `currency` (from the gateway
    order); `fxRate` is ₹ per unit it was priced at (1 for INR), so amount × fxRate
    is the INR value that revenue, commission and rewards use. */
type RazorpayPayment = {
  userId: number; packageId: number; planName: string; billingCycle: "monthly" | "yearly" | "triennial";
  amount: number; currency: Currency; fxRate: number;
  paymentId: string; couponCode?: string; couponDiscount?: number;
};
/** What activateVerifiedOrder actually credited for this sale, for the owner's sale alert. */
type Credited = { periodEnd: Date; resellerCommission?: number; referrerReward?: number };

/* Resolve the active Razorpay credentials: admin-set DB settings take precedence,
   falling back to the process env. This is what lets a super-admin switch from the
   env test keys to live keys from the dashboard without a redeploy. The secret is
   returned for server-side use only — never sent to the browser. */
const RZP_KEYS = ["razorpay_key_id", "razorpay_key_secret", "razorpay_mode", "razorpay_enabled", "razorpay_webhook_secret"] as const;
export async function resolveRazorpay(db: ReturnType<typeof getDb>) {
  const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, [...RZP_KEYS]) });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const env = envRazorpayCreds();
  const keyId = (m.razorpay_key_id || env.keyId || "").trim();
  const keySecret = (m.razorpay_key_secret || env.keySecret || "").trim();
  const webhookSecret = (m.razorpay_webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  const mode = (m.razorpay_mode as "live" | "test" | undefined) || inferMode(keyId);
  // Enabled unless an admin explicitly turned it off, and only when both keys exist.
  const toggledOff = m.razorpay_enabled === "false";
  return { keyId, keySecret, webhookSecret, mode, enabled: !toggledOff && credsComplete({ keyId, keySecret }) };
}

/* Record a confirmed Razorpay payment → activate the plan. Shared by the client
   verify (razorpayVerify) and the server-to-server webhook, so both produce the
   same result. Idempotent on the razorpay payment id, so the two paths (and
   webhook retries) can't double-activate in the common sequential case. */
export async function recordRazorpayPayment(
  db: ReturnType<typeof getDb>,
  p: RazorpayPayment,
): Promise<{ ok: boolean; already?: boolean }> {
  const existing = await db.query.paymentOrders.findFirst({ where: eq(paymentOrders.reference, p.paymentId) });
  if (existing) return { ok: true, already: true };
  const [ins] = await db.insert(paymentOrders).values({
    userId: p.userId,
    packageId: p.packageId,
    planName: p.planName,
    billingCycle: p.billingCycle,
    amount: money(p.amount),
    currency: p.currency,
    fxRate: p.fxRate.toFixed(4),
    method: "upi",
    gateway: "razorpay",
    reference: p.paymentId,
    status: "verified",
    verifiedAt: new Date(),
  });
  const order = await db.query.paymentOrders.findFirst({ where: eq(paymentOrders.id, Number(ins.insertId)) });
  if (order && p.couponCode) {
    try {
      await recordPaidCoupon(db, {
        code: p.couponCode, discount: Number(p.couponDiscount || 0), userId: p.userId, packageId: p.packageId,
        // In the sale's currency; the admin totals get ₹ via the payment_orders row's fx_rate.
        amountPaid: p.amount, paymentOrderId: order.id, paymentRef: p.paymentId,
      });
    } catch (e) { console.error("[coupon] could not record redemption:", (e as Error).message); }
  }
  if (order) {
    const credited = await activateVerifiedOrder(db, order, "razorpay");
    // Past the early return above, so a retried verify or webhook never re-alerts.
    void emailOnlineSale(db, p, order, credited).catch(() => {});
  }
  return { ok: true };
}

/* Owner alert for a plan paid online (manual payments already alert at
   createOrder). Fire-and-forget, so neither the verify nor the webhook's 2xx
   waits on these lookups or SMTP. */
async function emailOnlineSale(db: ReturnType<typeof getDb>, p: RazorpayPayment, order: Order, credited: Credited) {
  // The client verify and the webhook can arrive together and both get past the
  // idempotency check; only the call that wrote the first row for this payment alerts.
  const [first] = await db.select({ id: sql<number>`min(${paymentOrders.id})` })
    .from(paymentOrders).where(eq(paymentOrders.reference, p.paymentId));
  if (first?.id != null && Number(first.id) !== order.id) return;

  const buyer = await db.query.users.findFirst({
    where: eq(users.id, p.userId),
    columns: { fullName: true, email: true, phone: true, resellerId: true, referredById: true },
  });
  const linked = [buyer?.resellerId, buyer?.referredById].filter((x): x is number => !!x);
  const people = linked.length
    ? await db.query.users.findMany({ where: inArray(users.id, linked), columns: { id: true, fullName: true } })
    : [];
  const nameOf = (id?: number | null) => (id ? people.find((u) => u.id === id)?.fullName || null : null);
  const referrerName = nameOf(buyer?.referredById);
  const resellerName = nameOf(buyer?.resellerId);
  const cr = await resolveRazorpay(db);

  await sendEmail(ownerAddress(), onlineSaleAdminEmail({
    kind: "plan",
    itemName: p.planName,
    cycle: p.billingCycle,
    // Amount and coupon discount are in the sale's currency; the reward and
    // commission below are always ₹ (credited on the INR value).
    amount: p.amount,
    currency: p.currency,
    amountInr: p.currency === "INR" ? undefined : Number(money(p.amount * p.fxRate)),
    paymentId: p.paymentId,
    coupon: p.couponCode || null,
    discount: p.couponDiscount || null,
    customer: { id: p.userId, name: buyer?.fullName || `Account #${p.userId}`, email: buyer?.email || "", phone: buyer?.phone },
    // Amounts only when this sale actually credited them; the email says so otherwise.
    referrer: referrerName ? { name: referrerName, reward: credited.referrerReward ?? null } : null,
    reseller: resellerName ? { name: resellerName, commission: credited.resellerCommission ?? null } : null,
    validTill: credited.periodEnd,
    testMode: cr.mode === "test",
  }));
  await notifyTeam({
    type: "online_sale",
    // ₹ keeps the exact wording it has always had (no digit grouping); only a $
    // sale uses the formatter.
    title: `${cr.mode === "test" ? "[Test] " : ""}Online payment · ${p.currency === "INR" ? `₹${p.amount}` : formatMoney(p.amount, p.currency)} for ${p.planName}`,
    message: `${buyer?.fullName || `Account #${p.userId}`}${buyer?.email ? ` (${buyer.email})` : ""} · ${p.billingCycle}${p.couponCode ? ` · coupon ${p.couponCode}` : ""} · ${p.paymentId}`,
    link: "/admin/payment-orders",
    entity: { type: "payment_order", id: order.id },
    subjectUserId: p.userId,
    dedupeKey: `sale:${p.paymentId}`,
  }, db);
}

const n = (v: unknown) => Number(v ?? 0);
const money = (v: number) => v.toFixed(2);

const PAY_KEYS = [
  "pay_upi_id", "pay_upi_name", "pay_upi_qr",
  "pay_bank_name", "pay_bank_account", "pay_bank_ifsc", "pay_bank_holder", "pay_note",
] as const;

/** Where customers pay by hand (UPI / QR / bank). Also used by nfc-router's manual checkout email. */
export async function getSettings(db: ReturnType<typeof getDb>) {
  const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, [...PAY_KEYS]) });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    upiId: map.pay_upi_id ?? "", upiName: map.pay_upi_name ?? "DigitalCarda", upiQr: map.pay_upi_qr ?? "",
    bankName: map.pay_bank_name ?? "", bankAccount: map.pay_bank_account ?? "", bankIfsc: map.pay_bank_ifsc ?? "",
    bankHolder: map.pay_bank_holder ?? "", note: map.pay_note ?? "",
  };
}
async function setSetting(db: ReturnType<typeof getDb>, key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

/* Tell the owner that where customers pay (or the Razorpay keys) changed — a
   hijacked admin session could redirect customer money. Setting names only,
   never values. Non-blocking, and never fails the save it reports on. */
function alertPaymentSettings(ctx: { user: { fullName: string; email: string }; req: Request }, changedKeys: string[]) {
  try {
    const ip = clientIp(ctx.req);
    void sendEmail(ownerAddress(), paymentSettingsChangedAdminEmail({
      changedKeys, who: `${ctx.user.fullName} (${ctx.user.email})`, ip: ip === "unknown" ? null : ip,
    }));
    void notifyTeam({
      type: "payment_settings_changed",
      title: "Payment details were changed",
      message: `${ctx.user.fullName} (${ctx.user.email}) changed ${changedKeys.join(", ")}${ip !== "unknown" ? ` · IP ${ip}` : ""}. If this wasn't you or your team, check Settings → Payments now.`,
      link: "/admin/settings?tab=payment",
    });
  } catch { /* non-critical */ }
}

const DAY_MS = 86_400_000;

/* Razorpay refused a USD order: International Payments isn't active on the
   account (or was switched off). The buyer is told to pay in ₹ or contact us;
   the owner gets at most one email a day about it. The day's slot is claimed
   with a conditional UPDATE, so failures arriving together send one email.
   Exported for the add-on and domain checkouts, which can hit the same refusal. */
export async function alertUsdRejected(db: ReturnType<typeof getDb>, where: string, detail: string): Promise<void> {
  const now = Date.now();
  await db.insert(appSettings).ignore().values({ key: FX_KEYS.gatewayAlertAt, value: "0" }); // 0 = never alerted
  const claim = await db.update(appSettings).set({ value: String(now) }).where(and(
    eq(appSettings.key, FX_KEYS.gatewayAlertAt),
    sql`CAST(${appSettings.value} AS UNSIGNED) <= ${now - DAY_MS}`,
  ));
  const affected = (claim as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
    ?? (claim as unknown as { affectedRows?: number })?.affectedRows ?? 0;
  if (!affected) return;
  await sendEmail(ownerAddress(), usdRejectedAdminEmail(where, detail.slice(0, 300), new Date(now)));
}

/** The owner's "Razorpay refused USD" alert. The detail is Razorpay's error body (no keys in it). */
function usdRejectedAdminEmail(where: string, detail: string, at: Date): Email {
  const fix = "In the Razorpay dashboard (Live mode): Account & Settings → Payment methods → International payments → International Cards → Activate.";
  const off = "To stop offering $ meanwhile, switch off “Accept USD” in Admin → Settings → Payment.";
  return {
    kind: "usdGatewayRejectedAdminEmail",
    subject: "Razorpay refused a US dollar payment",
    html: layout({
      preheader: "A customer tried to pay in $ and Razorpay refused the currency. They were asked to pay in ₹ or contact you.",
      hero: heroLight({ badge: "Payment problem", tone: "amber", title: "Razorpay refused a US dollar payment", sub: `${where} — ${whenIst(at)}` }),
      bodyHtml:
        para("A customer chose to pay in US dollars and Razorpay refused the currency, which usually means International Payments isn't active on the account. They were asked to pay in ₹ or contact you.") +
        para(esc(fix)) + para(esc(off)) +
        small(`Razorpay said: ${esc(detail)}`) +
        small("You get this email at most once a day."),
      accent: TONE.amber.solid, audience: "admin",
    }),
    text: [
      `Razorpay refused a US dollar payment (${where}, ${whenIst(at)}).`, "",
      "The customer was asked to pay in ₹ or contact you. This usually means International Payments isn't active on the Razorpay account.",
      fix, off, "", `Razorpay said: ${detail}`, "", "You get this email at most once a day.",
    ].join("\n"),
  };
}

/* Amount the user should pay for a package (mirrors subscribe pricing:
   referral discount on first paid plan, upgrade credit, limited-time offer), in
   the currency the checkout is charged in. `requested` is only what the browser
   asked for; resolveCheckoutCurrency decides (INR unless USD is switched on, and
   a running paid plan locks upgrades to its own currency). */
async function computeAmount(
  db: ReturnType<typeof getDb>,
  user: { id: number; referredById: number | null },
  packageId: number, cycle: "monthly" | "yearly" | "triennial", wantsOffer: boolean, couponCode?: string,
  requested: Currency = "INR",
) {
  const pkg = await db.query.subscriptionPackages.findFirst({ where: eq(subscriptionPackages.id, packageId) });
  if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
  const inrBase = n(cycle === "triennial" ? pkg.threeYearPrice : cycle === "yearly" ? pkg.yearlyPrice : pkg.monthlyPrice);
  const existingPaid = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, user.id), gt(subscriptions.amount, "0")),
    orderBy: [desc(subscriptions.createdAt)],
  });
  // Upgrade credit (what they already paid comes off the new price) applies only
  // while that paid plan is still running. Once it has lapsed, a renewal or a
  // switch is a fresh purchase at full price — otherwise an expired member could
  // renew for the difference, often ₹0. The referral discount stays first-plan-only.
  // The credit comes from the member's CURRENT plan — the newest row, the same
  // one the Subscription page shows — and only while it is paid and running.
  // (existingPaid, any paid row ever, still decides first-plan referral pricing.)
  const latest = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
    orderBy: [desc(subscriptions.createdAt)],
  });
  const paidPlanActive = !!latest && n(latest.amount) > 0
    && (latest.status === "active" || latest.status === "trial")
    && new Date(latest.currentPeriodEnd).getTime() > Date.now();

  // The lock never trusts the subscriptions.currency label on its own: a row
  // merely LABELLED 'USD' (the column's old default, never rewritten) was paid
  // in ₹, so it must not lock a member out of paying in rupees — nor hand them
  // a $ price with their ₹ amount taken off it. See api/lib/fx.ts.
  const paidUsd = latest?.currency === "USD" ? await verifiedUsdPayment(db, user.id) : undefined;
  const latestCurrency = effectiveRowCurrency(latest?.currency, !!paidUsd);

  const fx = await getFxConfig(db);
  const currency = resolveCheckoutCurrency({
    requested, usdEnabled: fx.enabled, lockedTo: paidPlanActive && latest ? latestCurrency : null,
  });
  // ₹ per unit this checkout is priced at: recorded with the payment, so what gets
  // credited never depends on the rate at verify time.
  const fxRate = currency === "USD" ? fx.rate : 1;
  const base = currency === "USD" ? usdFor(priceKey.plan(pkg.id, cycle), inrBase, fx) : inrBase;

  let discountPct = 0;
  if (!existingPaid && user.referredById) {
    const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "referral_discount_percent") });
    discountPct = row ? n(row.value) : 15;
  }
  // Upgrade credit: what the running plan cost. While USD is on, the lock keeps it
  // in the checkout's currency. With USD off every checkout is INR and there is no
  // lock, so a plan really paid in $ (a USD payment on record) is credited at the
  // rate it was paid at, not as that many rupees. A row merely labelled USD (the
  // old column default) keeps today's credit.
  let credit = paidPlanActive && latest ? n(latest.amount) : 0;
  if (credit > 0 && currency === "INR" && latestCurrency === "USD" && paidUsd) {
    credit *= n(paidUsd.fxRate) || fx.rate;
  }
  // The offer percentage is server-controlled; the client may only request it.
  const offer = wantsOffer ? await getUpgradeOfferPercent(db) : 0;
  // Whole rupees (₹99 − 10% = ₹89, exactly as before USD) or cents ($2 − 10% = $1.80).
  let charged = chargeFor({ base, currency, referralPct: discountPct, credit, offerPct: offer });
  // A coupon comes off last, from the price after every other discount. It is
  // checked here on the server every time — the browser only sends the code.
  let coupon: { id: number; code: string; discount: number; before: number } | null = null;
  if (couponCode && couponCode.trim()) {
    const r = await evaluateCoupon(db, couponCode, { userId: user.id, packageId, cycle, amount: charged, base, currency, rate: fxRate });
    if (!r.ok) throw new TRPCError({ code: "BAD_REQUEST", message: r.reason });
    coupon = { id: r.coupon.id, code: r.coupon.code, discount: r.discount, before: charged };
    charged = roundMoney(charged - r.discount, currency);
  }
  return { pkg, base, charged, isUpgrade: paidPlanActive, coupon, currency, fxRate };
}

/* Atomically flip a pending order → verified. The WHERE status='pending' guard
   means only one of two concurrent verifies wins, preventing double-activation +
   double commission credit (Phase 31 TOCTOU). Returns true iff THIS call claimed it. */
async function claimPendingOrder(db: ReturnType<typeof getDb>, orderId: number): Promise<boolean> {
  const claim = await db.update(paymentOrders).set({ status: "verified", verifiedAt: new Date() })
    .where(and(eq(paymentOrders.id, orderId), eq(paymentOrders.status, "pending")));
  const affected = (claim as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
    ?? (claim as unknown as { affectedRows?: number })?.affectedRows ?? 0;
  return affected > 0;
}

/* Everything that happens once a payment is confirmed: activate the paid
   subscription, convert the trial, credit reseller commission + referral reward,
   notify + email the buyer. Shared by the manual admin-verify flow and the
   automatic Razorpay flow so both behave identically. The caller MUST have already
   claimed the order via claimPendingOrder(). `gateway` is recorded on the sub.
   Returns what it credited, for the online-sale alert. */
async function activateVerifiedOrder(db: ReturnType<typeof getDb>, order: Order, gateway: "manual" | "razorpay"): Promise<Credited> {
  const now = new Date();
  const pkg = await db.query.subscriptionPackages.findFirst({ where: eq(subscriptionPackages.id, order.packageId) });
  const periodEnd = new Date(now);
  if (order.billingCycle === "triennial") periodEnd.setFullYear(periodEnd.getFullYear() + 3);
  else if (order.billingCycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);
  const credited: Credited = { periodEnd };
  // The plan keeps the currency it was paid in (the upgrade lock reads it), while
  // commission and rewards are always credited on the INR value: amount × fx_rate.
  const currency: Currency = isCurrency(order.currency) ? order.currency : "INR";
  const inrValue = currency === "INR" ? n(order.amount) : n(order.amount) * n(order.fxRate);

  // Activate a paid subscription for the user
  await db.insert(subscriptions).values({
    userId: order.userId,
    packageId: order.packageId,
    status: "active",
    billingCycle: order.billingCycle,
    amount: money(n(order.amount)),
    currency,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    paymentGateway: gateway,
  });

  // The trial has converted to a paid plan — reflect it in the trial engine
  // so the lifecycle banner stops and the card stays live past trial end.
  await db.update(cardTrials).set({ status: "converted" }).where(eq(cardTrials.userId, order.userId));
  db.insert(funnelEvents).values({ stage: "payment", userId: order.userId }).catch(() => {}); // funnel: paid

  // Reseller commission: if this buyer belongs to a reseller, credit them.
  // The statement row, the wallet credit and the lifetime total are one step —
  // all or nothing. The statement row is unique per order, so an order that is
  // somehow activated twice pays commission once. The money goes to the
  // reseller's wallet, the same one referral rewards use, and leaves through
  // the same withdrawal queue.
  try {
    const rc = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { resellerId: true, fullName: true } });
    if (rc?.resellerId) {
      const resellerId = rc.resellerId;
      const profile = await db.query.resellerProfiles.findFirst({ where: eq(resellerProfiles.userId, resellerId) });
      const rate = Number(profile?.commissionRate ?? 10);
      const orderValue = inrValue; // the plan's rupee value (USD orders converted at the order's fx rate)
      const commission = money((orderValue * rate) / 100);
      const balanceAfter = await db.transaction(async (tx) => {
        const ins = await tx.insert(resellerCommissions).ignore().values({
          resellerUserId: resellerId, customerUserId: order.userId, paymentOrderId: order.id,
          orderAmount: money(orderValue), rate: rate.toFixed(2), amount: commission,
        });
        if (affectedRows(ins) === 0) return null; // already credited for this order
        await tx.update(resellerProfiles).set({
          totalEarnings: sql`${resellerProfiles.totalEarnings} + ${commission}`,
        }).where(eq(resellerProfiles.userId, resellerId));
        return applyWallet(db, resellerId, n(commission), {
          type: "commission", note: `Commission — ${rc.fullName} (${rate}% of ₹${money(orderValue)})`,
        }, tx);
      });
      if (balanceAfter !== null) {
        credited.resellerCommission = n(commission);
        await db.insert(notifications).values({
          userId: resellerId, type: "reseller_commission", title: "Commission earned 💰",
          message: `${rc.fullName} activated a plan — ₹${commission} added to your wallet.`, link: "/reseller/earnings",
        });
        const resellerUser = await db.query.users.findFirst({ where: eq(users.id, resellerId), columns: { email: true, fullName: true } });
        void sendEmail(resellerUser?.email, resellerCommissionEmail({
          name: resellerUser?.fullName, customerName: rc.fullName, amount: commission,
          pendingPayout: money(balanceAfter), rate, planName: pkg?.name ?? null, billingCycle: order.billingCycle,
          orderAmount: money(orderValue), totalEarnings: money(n(profile?.totalEarnings) + n(commission)),
          creditedAt: now,
        }));
      }
    }
  } catch (e) {
    // The customer's plan is already active; a failed credit must not undo that.
    // But it must not vanish either — a reseller would silently lose money.
    console.error(`[reseller-commission] FAILED to credit order ${order.id} (buyer ${order.userId}):`, (e as Error).message);
  }

  // Notify the buyer
  await notifyUser({
    userId: order.userId,
    type: "payment_verified",
    title: "Payment verified — plan active 🎉",
    message: `Your ${order.planName || "plan"} is now active. Your card is live and all features are unlocked.`,
    link: "/dashboard/subscription",
    push: "always",
  }, db);

  // Email the buyer a confirmation + invoice (non-blocking).
  try {
    const buyerUser = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { email: true, fullName: true } });
    const invoiceNo = `DC-${String(order.id).padStart(5, "0")}-${periodEnd.getFullYear()}`;
    const validTill = periodEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    void sendEmail(buyerUser?.email, paymentVerifiedEmail({
      name: buyerUser?.fullName, planName: order.planName || pkg?.name || "Plan",
      amount: n(order.amount), currency, billingCycle: order.billingCycle, invoiceNo, validTill,
    }));
  } catch { /* non-critical */ }

  // Auto-credit the referrer's wallet on this genuine paid conversion — completes
  // the Refer & Earn growth loop without manual admin action (Phase 29). Idempotent:
  // only an un-rewarded referral is credited.
  try {
    const buyer = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { referredById: true, fullName: true } });
    if (buyer?.referredById) {
      const ref = await db.query.referrals.findFirst({
        where: and(eq(referrals.refereeId, order.userId), ne(referrals.status, "rewarded")),
      });
      if (ref) {
        const pctRow = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "referral_commission_percent") });
        const pct = pctRow ? Number(pctRow.value) : 15;
        const reward = money((inrValue * (Number.isFinite(pct) ? pct : 15)) / 100);
        await db.update(referrals).set({ status: "rewarded", rewardAmount: reward, rewardedAt: now }).where(eq(referrals.id, ref.id));
        const nextBal = money(await applyWallet(db, buyer.referredById, n(reward), {
          type: "reward", referralId: ref.id, note: "Referral reward — paid conversion",
        }));
        credited.referrerReward = n(reward);
        await db.insert(notifications).values({
          userId: buyer.referredById, type: "referral_reward", title: "Referral reward credited 🎉",
          message: `${buyer.fullName} went paid — ₹${reward} added to your wallet.`, link: "/dashboard/refer",
        });
        const rrUser = await db.query.users.findFirst({ where: eq(users.id, buyer.referredById), columns: { email: true, fullName: true } });
        // The wallet entry and the bell stay; only the email follows the switch.
        if (await allows(buyer.referredById, "rewards")) {
          void sendEmail(rrUser?.email, referralRewardEmail({ name: rrUser?.fullName, refereeName: buyer.fullName, amount: reward, balance: nextBal }));
        }
      }
    }
  } catch { /* non-critical */ }
  return credited;
}

export const paymentRouter = createRouter({
  // ─── Where to pay (UPI id / QR / bank), shown to the user ───
  instructions: authedQuery.query(async () => {
    const db = getDb();
    return getSettings(db);
  }),

  // Amount preview for a plan before paying. `currency` is only a request; the
  // answer says what the checkout will actually be charged in.
  quote: authedQuery
    .input(z.object({
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly", "triennial"]),
      wantsOffer: z.boolean().optional(),
      currency: z.enum(CURRENCIES).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { pkg, base, charged, isUpgrade, currency } = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.wantsOffer ?? false, undefined, input.currency);
      return { planName: pkg.name, base, amount: charged, isUpgrade, currency };
    }),

  // Try a coupon on a plan before paying: the exact amount it leaves, or why it
  // can't be used. Plans only — add-ons have no coupon field at all.
  checkCoupon: authedQuery
    .input(z.object({
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly", "triennial"]),
      wantsOffer: z.boolean().optional(),
      couponCode: z.string().trim().min(1).max(40),
      currency: z.enum(CURRENCIES).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const before = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.wantsOffer ?? false, undefined, input.currency);
      const { currency } = before;
      const r = await evaluateCoupon(db, input.couponCode, {
        userId: ctx.user.id, packageId: input.packageId, cycle: input.billingCycle, amount: before.charged, base: before.base, currency, rate: before.fxRate,
      });
      if (!r.ok) return { valid: false as const, reason: r.reason, amount: before.charged, currency };
      return {
        valid: true as const,
        code: r.coupon.code,
        description: r.coupon.description,
        discount: r.discount,
        amountBefore: before.charged,
        amount: roundMoney(before.charged - r.discount, currency),
        currency,
      };
    }),

  // ─── User submits proof of a manual payment → pending order ───
  createOrder: authedQuery
    .input(z.object({
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly", "triennial"]),
      method: z.enum(["upi", "bank"]),
      reference: z.string().min(3),
      wantsOffer: z.boolean().optional(),
      couponCode: z.string().trim().max(40).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Block a second pending order
      const pending = await db.query.paymentOrders.findFirst({
        where: and(eq(paymentOrders.userId, ctx.user.id), eq(paymentOrders.status, "pending")),
      });
      if (pending) throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a payment awaiting verification." });

      // UPI and Indian bank transfer take rupees only, so a manual order is always
      // INR (the table default). A member whose running plan is in $ is refused by the lock.
      const { pkg, charged, coupon } = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.wantsOffer ?? false, input.couponCode, "INR");
      const [ins] = await db.insert(paymentOrders).values({
        userId: ctx.user.id,
        packageId: input.packageId,
        planName: pkg.name,
        billingCycle: input.billingCycle,
        amount: money(charged),
        method: input.method,
        reference: input.reference.trim(),
        status: "pending",
      });
      if (coupon) {
        await recordRedemption(db, {
          couponId: coupon.id, userId: ctx.user.id, packageId: input.packageId,
          amountBefore: coupon.before, discount: coupon.discount, amountPaid: charged,
          status: "pending", paymentOrderId: Number(ins.insertId),
        });
      }
      await db.insert(notifications).values({
        userId: ctx.user.id,
        type: "payment_pending",
        title: "Payment submitted ⏳",
        message: `We received your ${pkg.name} payment reference. Your plan activates once our team verifies it.`,
        link: "/dashboard/subscription",
      });

      // Email the buyer (receipt) and the owner (to verify). Non-blocking.
      const pay = { planName: pkg.name, amount: charged, reference: input.reference.trim(), method: input.method };
      void sendEmail(ctx.user.email, paymentSubmittedEmail({ name: ctx.user.fullName, ...pay }));
      void sendEmail(ownerAddress(), paymentToVerifyAdminEmail({ name: ctx.user.fullName, email: ctx.user.email, ...pay }));
      void notifyTeam({
        type: "payment_to_verify",
        title: `Payment to verify · ₹${charged} for ${pkg.name}`,
        message: `${ctx.user.fullName} (${ctx.user.email}) · ${input.method.toUpperCase()} reference ${input.reference.trim()}`,
        link: "/admin/payment-orders",
        entity: { type: "payment_order", id: Number(ins.insertId) },
        subjectUserId: ctx.user.id,
        dedupeKey: `payment:${ins.insertId}`,
      }, db);

      return { ok: true, id: ins.insertId, amount: charged };
    }),

  // User's payment orders
  myOrders: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.paymentOrders.findMany({
      where: eq(paymentOrders.userId, ctx.user.id),
      orderBy: [desc(paymentOrders.createdAt)],
      limit: 20,
    });
  }),

  // ═══════════════ RAZORPAY (instant online checkout) ═══════════════

  // Is online checkout available? Drives whether the "Pay instantly" button shows.
  razorpayConfig: authedQuery.query(async () => {
    const cr = await resolveRazorpay(getDb());
    return { enabled: cr.enabled, keyId: cr.keyId, mode: cr.mode }; // public Key ID only
  }),

  // Create a Razorpay order for a plan. The amount is computed SERVER-SIDE from the
  // plan + the user's own discounts — the client never sends a price. No DB row is
  // written yet: the gateway is the source of truth for a pending payment, and a row
  // is persisted only once payment is verified (razorpayVerify), so abandoned
  // checkouts never pollute the pending-orders list or block the manual flow.
  razorpayCreateOrder: authedQuery
    .input(z.object({
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly", "triennial"]),
      wantsOffer: z.boolean().optional(),
      couponCode: z.string().trim().max(40).optional(),
      currency: z.enum(CURRENCIES).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cr = await resolveRazorpay(db);
      if (!cr.enabled) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Online payments are not enabled." });
      }
      const { pkg, charged, coupon, currency, fxRate } = await computeAmount(
        db, ctx.user, input.packageId, input.billingCycle, input.wantsOffer ?? false, input.couponCode, input.currency,
      );
      const amountMinor = toMinor(charged); // paise or cents
      if (amountMinor < 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: currency === "INR"
            ? "This plan's payable amount is below the ₹1 online minimum — please use the manual option or contact support."
            : `This plan's payable amount is below the ${formatMoney(1, currency)} online minimum — please contact support.`,
        });
      }
      // The edge country (code only, never the IP) is the accountant's evidence of
      // where a sale came from: an Indian buyer paying in $ is still a domestic sale.
      const country = edgeGeo((h) => ctx.req.headers.get(h)).country;
      try {
        const order = await createRazorpayOrder({
          amount: amountMinor,
          currency,
          receipt: `dc_${ctx.user.id}_${Date.now()}`.slice(0, 40),
          notes: {
            userId: String(ctx.user.id), packageId: String(input.packageId), billingCycle: input.billingCycle, planName: pkg.name,
            couponCode: coupon?.code ?? "", couponDiscount: String(coupon?.discount ?? 0),
            // Read back by verify and the webhook (readOrderMoney), so a rate change
            // in between can't change what is credited.
            currency, fxRate: String(fxRate),
            ...(country ? { country } : {}),
          },
        }, cr);
        // keyId lets the browser open checkout.js without needing a build-time env var.
        return { keyId: cr.keyId, orderId: order.id, amount: order.amount, currency: order.currency, planName: pkg.name };
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 401) throw new TRPCError({ code: "UNAUTHORIZED", message: "Payment gateway authentication failed." });
        // International payments off (or switched off) on the Razorpay account.
        if (currency !== "INR" && isInvalidCurrencyError(e)) {
          console.error("[usd] Razorpay refused a USD plan order:", (e as Error).message);
          void alertUsdRejected(db, "Plan checkout", (e as Error).message)
            .catch((err) => console.error("[usd] owner alert failed:", (err as Error).message));
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: USD_UNAVAILABLE_MESSAGE });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not start the payment. Please try again." });
      }
    }),

  // Verify the Razorpay signature and, only on a match, activate the plan. The amount
  // is recomputed server-side (never trusted from the client) for the stored record.
  // Idempotent: a repeated verify for the same payment id is a no-op.
  razorpayVerify: authedQuery
    .input(z.object({
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly", "triennial"]),
      wantsOffer: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cr = await resolveRazorpay(db);
      const valid = verifyRazorpaySignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      }, cr.keySecret);
      // Signature mismatch → never mark as paid.
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment could not be verified. If you were charged, contact support — the plan was not activated." });
      }

      // The signature only proves this order+payment pair is genuine — it says
      // NOTHING about which plan was bought. Read the plan back from the order's
      // own notes (written server-side at creation, same as the webhook does),
      // so a client cannot pay for the cheapest plan and then ask us to activate
      // the most expensive one.
      let order;
      try {
        order = await fetchRazorpayOrder(input.razorpayOrderId, cr);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not confirm this payment with the gateway. If you were charged, contact support — nothing was activated." });
      }
      const notes = order.notes || {};
      if (String(notes.userId || "") !== String(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This payment belongs to another account." });
      }
      const paidPackageId = Number(notes.packageId);
      const nc = notes.billingCycle;
      const paidCycle = (nc === "monthly" || nc === "yearly" || nc === "triennial") ? nc : null;
      if (!paidPackageId || !paidCycle) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This order is missing its plan details. Contact support — you have not been charged for a plan." });
      }

      // The gateway's own figure and currency are the authoritative amount actually
      // paid; the rate comes from the order's notes (written at checkout).
      let paid: ReturnType<typeof readOrderMoney>;
      try {
        paid = readOrderMoney({ amount: Number(order.amount || 0), currency: order.currency, notes }, await getFxConfig(db));
      } catch (e) {
        if (!(e instanceof UnsupportedCurrencyError)) throw e;
        console.error(`[razorpay verify] ${input.razorpayPaymentId}: ${e.message}`);
        throw new TRPCError({ code: "BAD_REQUEST", message: "This payment is in a currency we don't accept. If you were charged, contact support — the plan was not activated." });
      }

      const pkg = await db.query.subscriptionPackages.findFirst({ where: eq(subscriptionPackages.id, paidPackageId) });
      await recordRazorpayPayment(db, {
        userId: ctx.user.id,
        packageId: paidPackageId,
        planName: pkg?.name || String(notes.planName || "Plan"),
        billingCycle: paidCycle,
        ...paid,
        paymentId: input.razorpayPaymentId, // the gateway payment id = our proof of payment
        couponCode: String(notes.couponCode || "") || undefined,
        couponDiscount: Number(notes.couponDiscount || 0),
      });
      return { ok: true };
    }),

  // ═══════════════════ ADMIN ═══════════════════

  adminOrders: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.query.paymentOrders.findMany({ orderBy: [desc(paymentOrders.createdAt)], limit: 500 });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const list = userIds.length
      ? await db.query.users.findMany({ where: inArray(users.id, userIds), columns: { id: true, fullName: true, email: true, phone: true } })
      : [];
    const map = new Map(list.map((u) => [u.id, u]));
    return rows.map((r) => ({
      ...r, amount: n(r.amount),
      user: map.get(r.userId) ? { name: map.get(r.userId)!.fullName, email: map.get(r.userId)!.email, phone: map.get(r.userId)!.phone } : null,
    }));
  }),

  // Revenue + status summary across ALL orders (accurate beyond the list's page
  // limit) for the Payment Orders module cards. Split by gateway (manual vs razorpay).
  // Every revenue figure is ₹: amount × fx_rate, which is the amount itself for an
  // INR row (rate 1). usdRevenue/usdCount are the $ sales inside those totals.
  adminStats: adminQuery.query(async () => {
    const db = getDb();
    const grouped = await db.select({
      status: paymentOrders.status,
      gateway: paymentOrders.gateway,
      currency: paymentOrders.currency,
      cnt: sql<number>`count(*)`,
      sum: sql<string>`coalesce(sum(${paymentOrders.amount} * ${paymentOrders.fxRate}), 0)`,
      native: sql<string>`coalesce(sum(${paymentOrders.amount}), 0)`,
    }).from(paymentOrders).groupBy(paymentOrders.status, paymentOrders.gateway, paymentOrders.currency);

    const [{ sum: monthSum } = { sum: "0" }] = await db.select({
      sum: sql<string>`coalesce(sum(${paymentOrders.amount} * ${paymentOrders.fxRate}), 0)`,
    }).from(paymentOrders).where(and(
      eq(paymentOrders.status, "verified"),
      sql`${paymentOrders.verifiedAt} >= date_format(now(), '%Y-%m-01')`,
    ));

    let pending = 0, verified = 0, rejected = 0, revenue = 0, manualRevenue = 0, razorpayRevenue = 0, usdRevenue = 0, usdCount = 0;
    for (const g of grouped) {
      const c = Number(g.cnt), s = n(g.sum);
      if (g.status === "pending") pending += c;
      else if (g.status === "rejected") rejected += c;
      else if (g.status === "verified") {
        verified += c; revenue += s;
        if (g.gateway === "razorpay") razorpayRevenue += s; else manualRevenue += s;
        if (g.currency === "USD") { usdRevenue += n(g.native); usdCount += c; }
      }
    }
    return {
      pending, verified, rejected, revenue, manualRevenue, razorpayRevenue, monthRevenue: n(monthSum),
      usdRevenue: roundMoney(usdRevenue, "USD"), usdCount, // cents: adding per-group floats can leave 0.0000001s
    };
  }),

  // ═══════ RESELLER: read-only view of THEIR OWN customers' payment orders ═══════
  resellerOrders: resellerQuery.query(async ({ ctx }) => {
    const db = getDb();
    const custs = await db.query.users.findMany({
      where: eq(users.resellerId, ctx.user.id),
      columns: { id: true, fullName: true, email: true, phone: true },
    });
    if (!custs.length) return [];
    const ids = custs.map((c) => c.id);
    const rows = await db.query.paymentOrders.findMany({
      where: inArray(paymentOrders.userId, ids), orderBy: [desc(paymentOrders.createdAt)], limit: 500,
    });
    const map = new Map(custs.map((u) => [u.id, u]));
    // A customer the team linked to this reseller: payments from the link date only.
    const since = await linkedSince(db, ctx.user.id, ids);
    return rows.filter((r) => visibleSinceLink(r, since.get(r.userId))).map((r) => ({
      ...r, amount: n(r.amount),
      user: map.get(r.userId) ? { name: map.get(r.userId)!.fullName, email: map.get(r.userId)!.email, phone: map.get(r.userId)!.phone } : null,
    }));
  }),

  // ═══════ RAZORPAY KEYS (super-admin) — set live/test keys from the dashboard ═══════
  // Returns the public key id + mode + whether a secret is stored. NEVER returns the
  // secret itself. `source` tells the admin whether keys currently come from the DB
  // (dashboard-set) or the env fallback.
  getRazorpayConfig: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, [...RZP_KEYS]) });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const cr = await resolveRazorpay(db);
    const base = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";
    return {
      keyId: cr.keyId,
      mode: cr.mode,
      enabled: cr.enabled,
      hasSecret: !!cr.keySecret,
      hasWebhookSecret: !!cr.webhookSecret,
      webhookUrl: `${base.replace(/\/$/, "")}/api/razorpay/webhook`,
      source: m.razorpay_key_id ? "dashboard" : (envRazorpayCreds().keyId ? "env" : "none"),
    };
  }),
  setRazorpayConfig: adminQuery
    .input(z.object({
      keyId: z.string().trim().optional(),
      keySecret: z.string().trim().optional(),       // only stored when non-empty (blank = keep existing)
      webhookSecret: z.string().trim().optional(),   // only stored when non-empty (blank = keep existing)
      mode: z.enum(["test", "live"]).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // The effective settings before the save, to alert only on a real change.
      // The page re-sends every field on each save, so "was sent" isn't "changed".
      const before = await resolveRazorpay(db).catch(() => null);
      if (input.keyId !== undefined) await setSetting(db, "razorpay_key_id", input.keyId);
      if (input.keySecret) await setSetting(db, "razorpay_key_secret", input.keySecret); // never blank-overwrite
      if (input.webhookSecret) await setSetting(db, "razorpay_webhook_secret", input.webhookSecret);
      if (input.mode !== undefined) await setSetting(db, "razorpay_mode", input.mode);
      if (input.enabled !== undefined) await setSetting(db, "razorpay_enabled", input.enabled ? "true" : "false");
      const cr = await resolveRazorpay(db);
      // Key NAMES only — the secrets never go into an email. Unknown "before"
      // (read failed) → list what was saved, since this is a security alert.
      const changed = before
        ? ([
            ["razorpay_key_id", before.keyId !== cr.keyId],
            ["razorpay_key_secret", before.keySecret !== cr.keySecret],
            ["razorpay_webhook_secret", before.webhookSecret !== cr.webhookSecret],
            ["razorpay_mode", before.mode !== cr.mode],
            ["razorpay_enabled", before.enabled !== cr.enabled],
          ] as const).filter(([, diff]) => diff).map(([k]) => k)
        : ([
            input.keyId !== undefined && "razorpay_key_id",
            !!input.keySecret && "razorpay_key_secret",
            !!input.webhookSecret && "razorpay_webhook_secret",
            input.mode !== undefined && "razorpay_mode",
            input.enabled !== undefined && "razorpay_enabled",
          ].filter(Boolean) as string[]);
      if (changed.length) alertPaymentSettings(ctx, changed);
      return { ok: true, enabled: cr.enabled, mode: cr.mode, keyId: cr.keyId, hasSecret: !!cr.keySecret, hasWebhookSecret: !!cr.webhookSecret };
    }),

  // Verify a payment → activate the subscription (card goes live)
  verifyOrder: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const order = await db.query.paymentOrders.findFirst({ where: eq(paymentOrders.id, input.id) });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });

      // Atomically claim the order (see claimPendingOrder), then run the shared
      // activation used by both the manual-verify and Razorpay flows.
      const claimed = await claimPendingOrder(db, order.id);
      if (!claimed) throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      await activateVerifiedOrder(db, order, "manual");
      await completeRedemptionForOrder(db, order.id);
      void resolveTeam("payment_order", order.id, ctx.user.id, db);
      return { ok: true };
    }),

  // Reject a payment order
  rejectOrder: adminQuery
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const order = await db.query.paymentOrders.findFirst({ where: eq(paymentOrders.id, input.id) });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      await db.update(paymentOrders).set({ status: "rejected", adminNote: input.note?.trim() || null, verifiedAt: new Date() }).where(eq(paymentOrders.id, order.id));
      await cancelRedemptionForOrder(db, order.id);
      void resolveTeam("payment_order", order.id, ctx.user.id, db);
      await notifyUser({
        userId: order.userId,
        type: "payment_rejected",
        title: "Payment could not be verified",
        message: `We couldn't verify your ${order.planName || "plan"} payment${input.note ? `: ${input.note}` : ""}. Please check the reference and try again.`,
        link: "/dashboard/subscription",
        push: "always",
      }, db);

      // Email the buyer (non-blocking).
      try {
        const buyerUser = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { email: true, fullName: true } });
        void sendEmail(buyerUser?.email, paymentRejectedEmail({ name: buyerUser?.fullName, planName: order.planName || "plan", note: input.note?.trim() }));
      } catch { /* non-critical */ }

      return { ok: true };
    }),

  // Platform payment settings (UPI / QR / bank)
  getConfig: adminQuery.query(async () => {
    const db = getDb();
    return getSettings(db);
  }),
  setConfig: adminQuery
    .input(z.object({
      upiId: z.string().optional(), upiName: z.string().optional(), upiQr: z.string().optional(),
      bankName: z.string().optional(), bankAccount: z.string().optional(), bankIfsc: z.string().optional(),
      bankHolder: z.string().optional(), note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // What customers were shown before, so only a real change alerts (the page sends every field).
      const before = await getSettings(db).catch(() => null);
      const map: Record<string, string | undefined> = {
        pay_upi_id: input.upiId, pay_upi_name: input.upiName, pay_upi_qr: input.upiQr,
        pay_bank_name: input.bankName, pay_bank_account: input.bankAccount, pay_bank_ifsc: input.bankIfsc,
        pay_bank_holder: input.bankHolder, pay_note: input.note,
      };
      for (const [k, v] of Object.entries(map)) if (v !== undefined) await setSetting(db, k, v);
      // The input names match getSettings()'s fields; the template maps them to labels.
      const changed = (Object.keys(input) as (keyof typeof input)[])
        .filter((k) => input[k] !== undefined && (!before || input[k] !== before[k]));
      if (changed.length) alertPaymentSettings(ctx, changed);
      return { ok: true };
    }),
});
