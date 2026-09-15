import { and, eq, inArray, sql } from "drizzle-orm";
import { coupons, couponRedemptions, type Coupon } from "@db/schema";
import type { getDb } from "../queries/connection";

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

  const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c || !c.active) return { ok: false, reason: "This coupon code isn't valid." };

  const now = ctx.now ?? new Date();
  if (c.validFrom && now < c.validFrom) return { ok: false, reason: `This coupon can be used from ${day(c.validFrom)}.` };
  if (c.validUntil && now > c.validUntil) return { ok: false, reason: "This coupon has expired." };

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

  let discount = c.discountType === "percent"
    ? (ctx.amount * Number(c.discountValue)) / 100
    : Number(c.discountValue);
  if (c.maxDiscount && discount > Number(c.maxDiscount)) discount = Number(c.maxDiscount);
  // Always leave at least ₹1 to pay — the payment gateway can't take ₹0.
  discount = Math.min(Math.round(discount), Math.max(0, Math.round(ctx.amount) - 1));
  if (discount <= 0) return { ok: false, reason: "This coupon doesn't apply to this amount." };

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

/** Admin rejected a manual payment → release the coupon use. */
export async function cancelRedemptionForOrder(db: Db, paymentOrderId: number): Promise<void> {
  await db.update(couponRedemptions).set({ status: "cancelled" })
    .where(and(eq(couponRedemptions.paymentOrderId, paymentOrderId), eq(couponRedemptions.status, "pending")));
}
