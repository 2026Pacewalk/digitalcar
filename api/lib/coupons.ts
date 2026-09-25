import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { coupons, couponRedemptions, subscriptionPackages, type Coupon } from "@db/schema";
import type { getDb } from "../queries/connection";
import { EARLY_COUPON_CODE, earlyGrantReason, exactPercentDiscount } from "./offer-grants";

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

/** Is this code usable for this plan purchase, and how much does it take off
    `amount` (the price after every other discount, in whole rupees)? */
export async function evaluateCoupon(
  db: Db,
  rawCode: string,
  ctx: { userId: number; packageId: number; cycle: Cycle; amount: number; now?: Date },
): Promise<CouponCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "Enter a coupon code." };
  // The free-trial voucher is not a discount on a purchase (see below).
  if (code === TRIAL_COUPON_CODE) return { ok: false, reason: `${TRIAL_COUPON_CODE} starts the free trial — it isn't a discount on a plan.` };

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
  if (c.minAmount && ctx.amount < Number(c.minAmount)) {
    return { ok: false, reason: `This coupon needs a purchase of at least ${rupees(Number(c.minAmount))}.` };
  }

  const [counts] = await db.select({
    total: sql<number>`count(*)`,
    mine: sql<number>`coalesce(sum(case when ${couponRedemptions.userId} = ${ctx.userId} then 1 else 0 end), 0)`,
  }).from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, c.id), inArray(couponRedemptions.status, ["pending", "completed"])));
  const total = Number(counts?.total || 0);
  const mine = Number(counts?.mine || 0);
  if (c.usageLimit && total >= c.usageLimit) return { ok: false, reason: "This coupon has reached its usage limit." };
  if (c.perUserLimit && mine >= c.perUserLimit) return { ok: false, reason: "You've already used this coupon." };

  // EARLY20 is exactly its percentage off the plan's FULL price — never on top
  // of the referral or upgrade discounts already in `amount`.
  const exact = code === EARLY_COUPON_CODE && c.discountType === "percent";
  let discount = exact
    ? await exactPercentDiscount(db, ctx, Number(c.discountValue))
    : c.discountType === "percent"
      ? (ctx.amount * Number(c.discountValue)) / 100
      : Number(c.discountValue);
  if (c.maxDiscount && discount > Number(c.maxDiscount)) discount = Number(c.maxDiscount);
  // Always leave at least ₹1 to pay — the payment gateway can't take ₹0.
  discount = Math.min(Math.round(discount), Math.max(0, Math.round(ctx.amount) - 1));
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
