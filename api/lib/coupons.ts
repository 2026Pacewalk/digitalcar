import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { coupons, couponRedemptions, subscriptionPackages, type Coupon } from "@db/schema";
import type { getDb } from "../queries/connection";
import { EARLY_COUPON_CODE, earlyGrantReason, exactPercentDiscount, exactPercentFrom } from "./offer-grants";
import { roundMoney, formatMoney, type Currency } from "@contracts/money";

/* Discount coupons for PLAN purchases only.

   Only api/payment-router.ts (plan pricing) calls these — add-ons, NFC products
   and the custom-domain setup never do, so a coupon can't discount them.

   A redemption row is written the moment an order carries a coupon:
     · manual UPI/bank order → "pending" until an admin verifies (→ completed)
       or rejects (→ cancelled) the payment
     · Razorpay → "completed" when the payment is confirmed
   Usage limits count pending AND completed rows, so one code can't be stacked
   onto several orders that are still awaiting verification. */

type Db = ReturnType<typeof getDb>;
export type Cycle = "monthly" | "yearly" | "triennial";

const CYCLE_LABEL: Record<string, string> = { monthly: "monthly", yearly: "yearly", triennial: "3-year" };

export const normalizeCode = (c: string) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
const csv = (v: string | null | undefined) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: string };

/** The coupon fields that set the discount. Its money figures (flat amount, cap,
    minimum) are always rupees: coupons have no currency of their own. */
export type CouponTerms = Pick<Coupon, "discountType" | "discountValue" | "maxDiscount" | "minAmount">;

/** Why an order is too small for this coupon, or null when it qualifies. The ₹
    minimum is compared with the order's INR value (`amount` × `rate`), so a $12
    order at ₹85 counts as ₹1,020. For INR this is exactly the old check. */
export function couponMinimumReason(c: CouponTerms, amount: number, currency: Currency = "INR", rate = 1): string | null {
  const min = Number(c.minAmount);
  if (!c.minAmount || !(currency === "INR" ? amount < min : amount * rate < min)) return null;
  // Rounded up to the cent, so paying the figure shown always qualifies.
  const approx = currency === "INR" ? "" : ` (about ${formatMoney(Math.ceil((min / rate) * 100 - 1e-9) / 100, currency)})`;
  return `This coupon needs a purchase of at least ${rupees(min)}${approx}.`;
}

/** What the coupon takes off `amount` (the price after every other discount, in
    `currency`); 0 means it doesn't apply to this amount.
    - A percentage works the same in any currency.
    - A flat amount and the cap are rupees, so a USD order gets them at `rate`
      (₹100 off at ₹85 = $1.18 off).
    - Rounded like the price (whole rupees, or cents), and always leaves at least
      1 unit to pay: the gateway can't take 0, and its floor is ₹1 / $1.
    For INR this is exactly the arithmetic evaluateCoupon has always used. */
export function couponDiscount(c: CouponTerms, amount: number, currency: Currency = "INR", rate = 1): number {
  const fromInr = (v: number) => (currency === "INR" ? v : v / rate);
  const round = (v: number) => roundMoney(v, currency);
  let discount = c.discountType === "percent"
    ? (amount * Number(c.discountValue)) / 100
    : fromInr(Number(c.discountValue));
  if (c.maxDiscount && discount > fromInr(Number(c.maxDiscount))) discount = fromInr(Number(c.maxDiscount));
  return Math.max(0, Math.min(round(discount), Math.max(0, round(round(amount) - 1))));
}

/** Is this code usable for this plan purchase, and how much does it take off
    `amount` (the price after every other discount, in `currency`, INR unless the
    checkout is in USD)? `rate` is ₹ per unit of `currency`; INR is always 1. */
export async function evaluateCoupon(
  db: Db,
  rawCode: string,
  ctx: {
    userId: number; packageId: number; cycle: Cycle; amount: number;
    /** The plan's LIST price in `currency`, before any discount. Only EARLY20's
        exact-percent rule needs it, and only on a $ checkout (the ₹ branch reads
        the plan's rupee column itself). */
    base?: number;
    currency?: Currency; rate?: number; now?: Date;
  },
): Promise<CouponCheck> {
  const currency = ctx.currency ?? "INR";
  const rate = currency === "INR" ? 1 : Number(ctx.rate);
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "Enter a coupon code." };
  // The free-trial voucher is not a discount on a purchase (see below).
  if (code === TRIAL_COUPON_CODE) return { ok: false, reason: `${TRIAL_COUPON_CODE} starts the free trial — it isn't a discount on a plan.` };
  // Without a rate the coupon's rupee figures can't be converted; refuse rather than guess.
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false, reason: "This coupon can't be used right now. Please try again later." };

  const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c || !c.active) return { ok: false, reason: "This coupon code isn't valid." };

  const now = ctx.now ?? new Date();
  if (c.validFrom && now < c.validFrom) return { ok: false, reason: `This coupon can be used from ${day(c.validFrom)}.` };
  if (c.validUntil && now > c.validUntil) return { ok: false, reason: "This coupon has expired." };
  // EARLY20 works only for a trial customer the day-2 offer email went to, until
  // their deadline (api/lib/offer-grants.ts).
  if (code === EARLY_COUPON_CODE) {
    const why = await earlyGrantReason(db, c.id, ctx.userId, now);
    if (why) return { ok: false, reason: why };
  }

  const plans = csv(c.planIds).map(Number);
  if (plans.length && !plans.includes(ctx.packageId)) return { ok: false, reason: "This coupon isn't valid for this plan." };
  const cycles = csv(c.cycles);
  if (cycles.length && !cycles.includes(ctx.cycle)) {
    return { ok: false, reason: `This coupon works on ${cycles.map((x) => CYCLE_LABEL[x] || x).join(" or ")} billing only.` };
  }
  const tooSmall = couponMinimumReason(c, ctx.amount, currency, rate);
  if (tooSmall) return { ok: false, reason: tooSmall };

  const [counts] = await db.select({
    total: sql<number>`count(*)`,
    mine: sql<number>`coalesce(sum(case when ${couponRedemptions.userId} = ${ctx.userId} then 1 else 0 end), 0)`,
  }).from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, c.id), inArray(couponRedemptions.status, ["pending", "completed"])));
  const total = Number(counts?.total || 0);
  const mine = Number(counts?.mine || 0);
  if (c.usageLimit && total >= c.usageLimit) return { ok: false, reason: "This coupon has reached its usage limit." };
  if (c.perUserLimit && mine >= c.perUserLimit) return { ok: false, reason: "You've already used this coupon." };

  /* EARLY20 is exactly its percentage off the plan's FULL price — never on top
     of the referral or upgrade discounts already in `amount`. The rule means the
     same thing in both currencies, so the browser can't make the code worth more
     by asking for $: in ₹ it works off the plan's ₹ column, in $ off the $ list
     price this checkout was priced at (ctx.base). The ₹ branch is untouched. */
  const exact = code === EARLY_COUPON_CODE && c.discountType === "percent";
  let discount: number;
  if (exact && currency === "INR") {
    discount = await exactPercentDiscount(db, ctx, Number(c.discountValue));
    if (c.maxDiscount && discount > Number(c.maxDiscount)) discount = Number(c.maxDiscount);
    // Always leave at least ₹1 to pay — the payment gateway can't take ₹0.
    discount = Math.min(Math.round(discount), Math.max(0, Math.round(ctx.amount) - 1));
  } else if (exact) {
    discount = exactPercentFrom(Number(ctx.base), ctx.amount, Number(c.discountValue), currency);
    // The cap is a rupee figure, like couponDiscount's.
    const cap = c.maxDiscount ? Number(c.maxDiscount) / rate : null;
    if (cap !== null && discount > cap) discount = cap;
    // Always leave at least $1 to pay — the same floor couponDiscount applies.
    const round = (v: number) => roundMoney(v, currency);
    discount = Math.max(0, Math.min(round(discount), Math.max(0, round(round(ctx.amount) - 1))));
  } else {
    discount = couponDiscount(c, ctx.amount, currency, rate);
  }
  if (discount <= 0) {
    return { ok: false, reason: exact ? `Your price already includes more than ${Number(c.discountValue)}% off, so ${code} adds nothing more.` : "This coupon doesn't apply to this amount." };
  }

  return { ok: true, coupon: c, discount };
}

/** Record that an order used a coupon. `completed` also bumps the coupon's counter. */
export async function recordRedemption(db: Db, r: {
  couponId: number; userId: number; packageId: number; amountBefore: number; discount: number; amountPaid: number;
  status: "pending" | "completed"; paymentOrderId?: number | null; paymentRef?: string | null;
}): Promise<void> {
  await db.insert(couponRedemptions).values({
    couponId: r.couponId,
    userId: r.userId,
    packageId: r.packageId,
    paymentOrderId: r.paymentOrderId ?? null,
    paymentRef: r.paymentRef ?? null,
    amountBefore: r.amountBefore.toFixed(2),
    discount: r.discount.toFixed(2),
    amountPaid: r.amountPaid.toFixed(2),
    status: r.status,
  });
  if (r.status === "completed") {
    await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, r.couponId));
  }
}

/** A Razorpay payment that carried a coupon (code + discount from the gateway order's notes). */
export async function recordPaidCoupon(db: Db, p: {
  code: string; discount: number; userId: number; packageId: number; amountPaid: number; paymentOrderId: number; paymentRef: string;
}): Promise<void> {
  const code = normalizeCode(p.code);
  if (!code) return;
  const [c] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c) return;
  await recordRedemption(db, {
    couponId: c.id, userId: p.userId, packageId: p.packageId,
    amountBefore: p.amountPaid + p.discount, discount: p.discount, amountPaid: p.amountPaid,
    status: "completed", paymentOrderId: p.paymentOrderId, paymentRef: p.paymentRef,
  });
}

/** Admin verified a manual payment → its coupon use counts. */
export async function completeRedemptionForOrder(db: Db, paymentOrderId: number): Promise<void> {
  const rows = await db.select().from(couponRedemptions)
    .where(and(eq(couponRedemptions.paymentOrderId, paymentOrderId), eq(couponRedemptions.status, "pending")));
  for (const r of rows) {
    await db.update(couponRedemptions).set({ status: "completed" }).where(eq(couponRedemptions.id, r.id));
    await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, r.couponId));
  }
}

/* ── FREE30D: the free-trial voucher ──────────────────────────────────────
   The 30-day trial is already ₹0 and never touches the payment gateway, so
   FREE30D is NOT a discount on a purchase (evaluateCoupon rejects it). It is
   the commercial record of a trial activation: the server validates it at
   signup, writes a ₹0 redemption, and Admin → Coupons then shows how many
   trials it started and who converted. Switching it off or capping it in the
   admin changes nothing for existing trials — only what new signups record. */
export const TRIAL_COUPON_CODE = "FREE30D";

export type TrialCouponCheck =
  | { ok: true; couponId: number; code: string }
  | { ok: false; reason: string };

/** The free plan's package id (Trial), used on the ₹0 redemption row. */
async function trialPackageId(db: Db): Promise<number> {
  const [p] = await db.select({ id: subscriptionPackages.id })
    .from(subscriptionPackages)
    .where(and(eq(subscriptionPackages.monthlyPrice, "0.00"), eq(subscriptionPackages.yearlyPrice, "0.00")))
    .orderBy(asc(subscriptionPackages.id)).limit(1);
  return p?.id ?? 7;
}

/** Create FREE30D once if an admin hasn't already. Never edits an existing row,
    so whatever the admin configures in Admin → Coupons wins. */
export async function ensureTrialCoupon(db: Db): Promise<void> {
  const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, TRIAL_COUPON_CODE)).limit(1);
  if (existing) return;
  await db.insert(coupons).values({
    code: TRIAL_COUPON_CODE,
    description: "30-day free trial — applied automatically when a new account signs up",
    discountType: "percent",
    discountValue: "100.00",
    perUserLimit: 1,          // one free trial per account
    planIds: String(await trialPackageId(db)),
    active: true,
  });
}

/** Can this account start a free trial on this code? Checked on the server at
    signup; a failure never blocks the signup, it only skips the record. */
export async function evaluateTrialCoupon(
  db: Db,
  rawCode: string,
  ctx: { userId: number; now?: Date },
): Promise<TrialCouponCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "No code given." };

  const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c) return { ok: false, reason: `${code} is not a known code.` };
  if (!c.active) return { ok: false, reason: `${code} is switched off.` };

  const now = ctx.now ?? new Date();
  if (c.validFrom && now < c.validFrom) return { ok: false, reason: `${code} starts on ${day(c.validFrom)}.` };
  if (c.validUntil && now > c.validUntil) return { ok: false, reason: `${code} expired on ${day(c.validUntil)}.` };

  const [counts] = await db.select({
    total: sql<number>`count(*)`,
    mine: sql<number>`coalesce(sum(case when ${couponRedemptions.userId} = ${ctx.userId} then 1 else 0 end), 0)`,
  }).from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, c.id), inArray(couponRedemptions.status, ["pending", "completed"])));
  if (c.usageLimit && Number(counts?.total || 0) >= c.usageLimit) return { ok: false, reason: `${code} has reached its usage limit.` };
  if (c.perUserLimit && Number(counts?.mine || 0) >= c.perUserLimit) return { ok: false, reason: `This account has already used ${code}.` };

  return { ok: true, couponId: c.id, code };
}

/** Write the ₹0 redemption for a trial that FREE30D started. */
export async function recordTrialRedemption(db: Db, r: { couponId: number; userId: number }): Promise<void> {
  await recordRedemption(db, {
    couponId: r.couponId,
    userId: r.userId,
    packageId: await trialPackageId(db),
    amountBefore: 0, discount: 0, amountPaid: 0,
    status: "completed",
  });
}

/** Admin rejected a manual payment → release the coupon use. */
export async function cancelRedemptionForOrder(db: Db, paymentOrderId: number): Promise<void> {
  await db.update(couponRedemptions).set({ status: "cancelled" })
    .where(and(eq(couponRedemptions.paymentOrderId, paymentOrderId), eq(couponRedemptions.status, "pending")));
}
