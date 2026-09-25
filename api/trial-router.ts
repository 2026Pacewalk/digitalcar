import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cardTrials, appSettings, coupons, couponGrants, couponRedemptions } from "@db/schema";
import { and, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { EARLY_COUPON_CODE, EARLY_PERCENT, earlyCouponState } from "./lib/offer-grants";

/* Backend-authoritative 30-day trial engine + optional grace period (§5–6, §10).
   - Trial STARTS on first publish, never at registration.
   - All dates come from the server clock; the client only displays state.
   - Live status is COMPUTED, so a stale frontend can never lie about it.
   - Grace period + trial length are admin-configurable (§68) — never hard-coded. */

const DAY = 86_400_000;
const EXPIRING_SOON_DAYS = 7;
const K_TRIAL_DAYS = "trial_days";
const K_GRACE_ENABLED = "grace_enabled";
const K_GRACE_DAYS = "grace_days";
const DEFAULT_DAYS = 30;
const DEFAULT_GRACE = 3;

async function getSetting(db: ReturnType<typeof getDb>, key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}
async function setSetting(db: ReturnType<typeof getDb>, key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}
async function trialDays(db: ReturnType<typeof getDb>): Promise<number> {
  const n = Number(await getSetting(db, K_TRIAL_DAYS));
  return n >= 1 && n <= 365 ? n : DEFAULT_DAYS;
}
async function graceConfig(db: ReturnType<typeof getDb>): Promise<{ enabled: boolean; days: number }> {
  const enabled = (await getSetting(db, K_GRACE_ENABLED)) === "1";
  const d = Number(await getSetting(db, K_GRACE_DAYS));
  return { enabled, days: d >= 1 && d <= 90 ? d : DEFAULT_GRACE };
}

type Row = typeof cardTrials.$inferSelect;
type Grace = { enabled: boolean; days: number };
function computeState(row: Row, grace: Grace) {
  const now = Date.now();
  const started = row.startedAt ? new Date(row.startedAt).getTime() : 0;
  const ends = row.endsAt ? new Date(row.endsAt).getTime() : 0;
  const daysLeft = ends ? Math.ceil((ends - now) / DAY) : 0;
  const totalDays = started && ends ? Math.round((ends - started) / DAY) : 0;

  let status: string = row.status;
  let graceDaysLeft = 0;
  let graceEnds: Date | null = null;

  if (row.status !== "converted" && row.status !== "cancelled") {
    if (ends && now > ends) {
      const graceEndMs = ends + (grace.enabled ? grace.days : 0) * DAY;
      if (grace.enabled && now <= graceEndMs) {
        status = "grace";
        graceDaysLeft = Math.max(0, Math.ceil((graceEndMs - now) / DAY));
        graceEnds = new Date(graceEndMs);
      } else {
        status = "expired";
      }
    } else if (daysLeft <= EXPIRING_SOON_DAYS) {
      status = "expiring_soon";
    } else {
      status = "active";
    }
  }
  return {
    status, startedAt: row.startedAt, endsAt: row.endsAt, publishedAt: row.publishedAt,
    daysLeft: Math.max(0, daysLeft), totalDays, graceDaysLeft, graceEnds, productId: row.productId,
  };
}

export const trialRouter = createRouter({
  // Public: trial length + grace + expiry-mode config.
  config: publicQuery.query(async () => {
    const db = getDb();
    const g = await graceConfig(db);
    return {
      trialDays: await trialDays(db), graceEnabled: g.enabled, graceDays: g.days,
      expiryMode: (await getSetting(db, "expiry_mode")) || "deactivate",
      lifecycleEnabled: (await getSetting(db, "lifecycle_enabled")) !== "0",
    };
  }),

  // The signed-in user's current trial state (source of truth).
  me: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(cardTrials).where(eq(cardTrials.userId, ctx.user.id));
    if (!rows[0]) return { status: "not_started" as const, daysLeft: 0, totalDays: 0, graceDaysLeft: 0, graceEnds: null, startedAt: null, endsAt: null, publishedAt: null, productId: null };
    return computeState(rows[0], await graceConfig(db));
  }),

  // Called on FIRST publish. Idempotent — re-publishing returns the same trial.
  start: authedQuery.input(z.object({ productId: z.number().optional() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const grace = await graceConfig(db);
    const rows = await db.select().from(cardTrials).where(eq(cardTrials.userId, ctx.user.id));
    if (rows[0]) return { ...computeState(rows[0], grace), justStarted: false };

    const days = await trialDays(db);
    const now = new Date();
    const ends = new Date(now.getTime() + days * DAY);
    await db.insert(cardTrials).values({
      userId: ctx.user.id, productId: input.productId ?? null,
      status: "active", startedAt: now, endsAt: ends, publishedAt: now,
    });
    const [row] = await db.select().from(cardTrials).where(eq(cardTrials.userId, ctx.user.id));
    return { ...computeState(row, grace), justStarted: true };
  }),

  // Admin: trial length (§68).
  setDays: adminQuery.input(z.object({ days: z.number().int().min(1).max(365) })).mutation(async ({ input }) => {
    await setSetting(getDb(), K_TRIAL_DAYS, String(input.days));
    return { ok: true, trialDays: input.days };
  }),

  // Admin: grace period on/off + duration (§10, §68).
  setGrace: adminQuery.input(z.object({ enabled: z.boolean(), days: z.number().int().min(1).max(90) })).mutation(async ({ input }) => {
    const db = getDb();
    await setSetting(db, K_GRACE_ENABLED, input.enabled ? "1" : "0");
    await setSetting(db, K_GRACE_DAYS, String(input.days));
    return { ok: true, ...input };
  }),

  // Admin: what a visitor sees after a card's trial expires (§12).
  // deactivate = paused screen · basic = contact-only · limited = paused screen.
  setExpiryMode: adminQuery.input(z.object({ mode: z.enum(["deactivate", "limited", "basic"]) })).mutation(async ({ input }) => {
    await setSetting(getDb(), "expiry_mode", input.mode);
    return { ok: true, mode: input.mode };
  }),

  // Admin: the day-2 upgrade email (EARLY20) — is it on, and how is it doing?
  offerConfig: adminQuery.query(async () => {
    const db = getDb();
    const [c] = await db.select().from(coupons).where(eq(coupons.code, EARLY_COUPON_CODE)).limit(1);
    let sent = 0, open = 0, used = 0;
    let problem: string | null = c ? null : `The ${EARLY_COUPON_CODE} coupon is created automatically the first time it runs.`;
    if (c) {
      const now = new Date();
      const state = await earlyCouponState(db, c.id, now);
      if (!state.usable) problem = state.reason;
      const [s1] = await db.select({ n: sql<number>`count(*)` }).from(couponGrants).where(and(eq(couponGrants.couponId, c.id), isNotNull(couponGrants.sentAt)));
      const [s2] = await db.select({ n: sql<number>`count(*)` }).from(couponGrants).where(and(eq(couponGrants.couponId, c.id), gt(couponGrants.expiresAt, now)));
      const [s3] = await db.select({ n: sql<number>`count(*)` }).from(couponRedemptions).where(and(eq(couponRedemptions.couponId, c.id), inArray(couponRedemptions.status, ["pending", "completed"])));
      sent = Number(s1?.n || 0); open = Number(s2?.n || 0); used = Number(s3?.n || 0);
    }
    return {
      enabled: (await getSetting(db, "trial_offer_enabled")) === "1",
      hours: Number(await getSetting(db, "trial_offer_hours")) || 24,
      holidays: (await getSetting(db, "offer_holidays")) || "",
      coupon: c ? { code: c.code, active: !!c.active, percent: c.discountType === "percent" ? Number(c.discountValue) : null } : { code: EARLY_COUPON_CODE, active: false, percent: EARLY_PERCENT, missing: true },
      // Why nothing would be sent right now (null = ready).
      problem,
      sent, open, used,
    };
  }),

  setOffer: adminQuery.input(z.object({
    enabled: z.boolean(),
    // IST dates that don't count as working days, e.g. "2026-10-02, 2026-10-20".
    holidays: z.string().max(1000).optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await setSetting(db, "trial_offer_enabled", input.enabled ? "1" : "0");
    if (input.holidays !== undefined) {
      const days = input.holidays.split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      await setSetting(db, "offer_holidays", days.join(","));
    }
    return { ok: true, enabled: input.enabled };
  }),

  // Admin: master on/off for the trial lifecycle emails (§68).
  setLifecycle: adminQuery.input(z.object({ enabled: z.boolean() })).mutation(async ({ input }) => {
    await setSetting(getDb(), "lifecycle_enabled", input.enabled ? "1" : "0");
    return { ok: true, enabled: input.enabled };
  }),
});
