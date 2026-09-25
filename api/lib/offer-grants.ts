import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { coupons, couponGrants, couponRedemptions, subscriptionPackages } from "@db/schema";
import type { getDb } from "../queries/connection";

/* The day-2 trial offer: EARLY20, 20% off a paid plan.

   The code is EARLY20 for everyone (easy to type from an email), but it only
   works for a trial customer the offer email was sent to, and only until their
   deadline — a coupon_grants row per customer says so. A forwarded email gives
   nobody else anything: for them the code reads exactly like an unknown one.

   The deadline is 24 WORKING hours after the email is sent: Monday–Saturday,
   10 am–6 pm India time, skipping Sundays (and any holiday the admin lists).
   Opens can't be counted reliably — Gmail and Apple Mail pre-load images — so
   the clock starts at send, and the email prints the exact deadline.

   And it is exactly 20%: the price is capped at 20% off the plan's full price,
   so it never piles on top of the referral or upgrade discounts. */

type Db = ReturnType<typeof getDb>;

export const EARLY_COUPON_CODE = "EARLY20";
export const EARLY_PERCENT = 20;
export const TRIAL_OFFER_SOURCE = "trial_d2";

const IST_MS = 330 * 60_000;   // India has no daylight saving: always UTC+5:30
const DAY_START = 10;           // 10 am
const DAY_END = 18;             // 6 pm

/** `from` plus `hours` WORKING hours (Mon–Sat 10:00–18:00 IST). `holidays` are
    IST calendar dates, "YYYY-MM-DD", that don't count either. */
export function addWorkingHours(from: Date, hours: number, holidays: string[] = []): Date {
  const off = new Set(holidays);
  // Work in "IST wall-clock" milliseconds: shift once, read UTC fields as IST.
  let t = from.getTime() + IST_MS;
  let left = Math.max(0, hours) * 3_600_000;
  const dayStart = (ms: number) => { const d = new Date(ms); d.setUTCHours(DAY_START, 0, 0, 0); return d.getTime(); };
  const dayEnd = (ms: number) => { const d = new Date(ms); d.setUTCHours(DAY_END, 0, 0, 0); return d.getTime(); };
  const nextMorning = (ms: number) => { const d = new Date(ms); d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(DAY_START, 0, 0, 0); return d.getTime(); };
  const isOff = (ms: number) => { const d = new Date(ms); return d.getUTCDay() === 0 || off.has(d.toISOString().slice(0, 10)); };
  for (let guard = 0; guard < 400; guard++) {
    if (isOff(t)) { t = nextMorning(t); continue; }
    if (t < dayStart(t)) t = dayStart(t);
    if (t >= dayEnd(t)) { t = nextMorning(t); continue; }
    const today = dayEnd(t) - t;
    if (left <= today) return new Date(t + left - IST_MS);
    left -= today;
    t = nextMorning(t);
  }
  return new Date(t - IST_MS);
}

/** "Thu 1 Oct, 6:00 pm" in India time — how the deadline is written everywhere. */
export const deadlineIst = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** Why this customer can't use EARLY20 right now (null = they can). */
export async function earlyGrantReason(db: Db, couponId: number, userId: number, now: Date): Promise<string | null> {
  if (!userId) return "This coupon code isn't valid.";
  const [g] = await db.select().from(couponGrants)
    .where(and(eq(couponGrants.couponId, couponId), eq(couponGrants.userId, userId))).limit(1);
  // Same words as an unknown code: a forwarded email reveals nothing.
  if (!g || !g.sentAt || !g.expiresAt) return "This coupon code isn't valid.";
  if (now > g.expiresAt) return `Your ${EARLY_COUPON_CODE} offer ended on ${deadlineIst(g.expiresAt)}.`;
  return null;
}

/** EARLY20's discount: whatever brings the price down to 20% off the plan's
    FULL price — so with a referral or upgrade discount already applied it adds
    only the difference, and nothing once those already exceed 20%. */
export async function exactPercentDiscount(
  db: Db, ctx: { packageId: number; cycle: string; amount: number }, percent: number,
): Promise<number> {
  const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, ctx.packageId)).limit(1);
  const base = pkg ? Number(ctx.cycle === "triennial" ? pkg.threeYearPrice : ctx.cycle === "yearly" ? pkg.yearlyPrice : pkg.monthlyPrice) : NaN;
  if (!Number.isFinite(base) || base <= 0) return Math.round((ctx.amount * percent) / 100);
  const target = Math.round(base * (1 - percent / 100));
  return Math.max(0, Math.round(ctx.amount) - target);
}

/** The EARLY20 coupon row, created only if missing — an admin's own settings on
    an existing row are never touched. */
export async function ensureEarlyCoupon(db: Db): Promise<{ id: number; active: boolean } | null> {
  const [c] = await db.select({ id: coupons.id, active: coupons.active }).from(coupons).where(eq(coupons.code, EARLY_COUPON_CODE)).limit(1);
  if (c) return { id: c.id, active: !!c.active };
  await db.insert(coupons).values({
    code: EARLY_COUPON_CODE,
    description: "Day-2 trial offer — works only for trial customers who were emailed it, until their deadline",
    discountType: "percent", discountValue: String(EARLY_PERCENT), planIds: "5,6", perUserLimit: 1, active: true,
  });
  const [n] = await db.select({ id: coupons.id, active: coupons.active }).from(coupons).where(eq(coupons.code, EARLY_COUPON_CODE)).limit(1);
  return n ? { id: n.id, active: !!n.active } : null;
}

export type EarlyCouponState =
  | { usable: true; percent: number; validUntil: Date | null }
  | { usable: false; reason: string };

/** Can the offer go out at all right now? Not while the coupon is switched off,
    not a percentage, outside its dates or out of uses — the email would promise
    a code that checkout then refuses. */
export async function earlyCouponState(db: Db, couponId: number, now: Date): Promise<EarlyCouponState> {
  const [c] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
  const code = EARLY_COUPON_CODE;
  if (!c || !c.active) return { usable: false, reason: `The ${code} coupon is switched off in Coupons, so nothing is sent.` };
  if (c.discountType !== "percent" || !(Number(c.discountValue) > 0)) {
    return { usable: false, reason: `${code} must be a percentage coupon in Coupons, so nothing is sent.` };
  }
  if (c.validFrom && now < c.validFrom) return { usable: false, reason: `${code} only starts on ${deadlineIst(c.validFrom)} (Coupons), so nothing is sent until then.` };
  if (c.validUntil && now > c.validUntil) return { usable: false, reason: `${code} ended on ${deadlineIst(c.validUntil)} (Coupons), so nothing is sent.` };
  if (c.usageLimit) {
    const [u] = await db.select({ n: sql<number>`count(*)` }).from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, c.id), inArray(couponRedemptions.status, ["pending", "completed"])));
    if (Number(u?.n || 0) >= c.usageLimit) return { usable: false, reason: `${code} has reached its usage limit in Coupons, so nothing is sent.` };
  }
  return { usable: true, percent: Math.round(Number(c.discountValue)), validUntil: c.validUntil ?? null };
}

/** Free claims whose email never went out — the run stopped between claiming
    and sending — so a later run can offer again. An hour is far longer than
    any send takes. */
export async function releaseStaleClaims(db: Db, couponId: number): Promise<void> {
  await db.delete(couponGrants).where(and(
    eq(couponGrants.couponId, couponId), isNull(couponGrants.sentAt),
    sql`${couponGrants.createdAt} < NOW() - INTERVAL 1 HOUR`,
  ));
}

/** Claim the one grant this customer can ever get (false = they already had one). */
export async function claimGrant(db: Db, couponId: number, userId: number): Promise<boolean> {
  const r = await db.insert(couponGrants).ignore().values({ couponId, userId, source: TRIAL_OFFER_SOURCE });
  const affected = (r as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
    ?? (r as unknown as { affectedRows?: number })?.affectedRows ?? 0;
  return affected > 0;
}

/** The email went out: start their clock. */
export async function startGrant(db: Db, couponId: number, userId: number, sentAt: Date, expiresAt: Date): Promise<void> {
  await db.update(couponGrants).set({ sentAt, expiresAt })
    .where(and(eq(couponGrants.couponId, couponId), eq(couponGrants.userId, userId)));
}

/** The email couldn't be sent: release the claim so tomorrow's run can retry. */
export async function releaseGrant(db: Db, couponId: number, userId: number): Promise<void> {
  await db.delete(couponGrants).where(and(eq(couponGrants.couponId, couponId), eq(couponGrants.userId, userId)));
}
