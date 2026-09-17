import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptions, invoices } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getUpgradeOfferPercent, setUpgradeOfferPercent, MAX_OFFER_PERCENT } from "./lib/pricing";

export const subscriptionRouter = createRouter({
  mySubscription: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    // Coalesce to null — tRPC/react-query reject an `undefined` query result.
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
      with: { package: true },
      orderBy: [desc(subscriptions.createdAt)],
    });
    if (!sub) return null;
    // Decided here, once, so the Subscription page never has to guess:
    //  · isActive — the same rule the entitlement checks use (card-router's
    //    activeSubPackage): active/trial status AND the period hasn't ended.
    //    Nothing marks rows "expired", so the end date is what counts.
    //  · term — the billing term the member is actually on. It is the stored
    //    billingCycle (written by every payment and by the admin's Change
    //    Package), except a free plan, which is always a 30-day term. Null when
    //    the plan isn't active, so an expired plan is never shown as "current".
    const isActive = (sub.status === "active" || sub.status === "trial")
      && new Date(sub.currentPeriodEnd).getTime() > Date.now();
    const pkg = sub.package as { monthlyPrice?: unknown; yearlyPrice?: unknown } | null;
    const isFree = sub.packageId === 7 || (!!pkg && Number(pkg.monthlyPrice) === 0 && Number(pkg.yearlyPrice) === 0);
    const term: "monthly" | "yearly" | "triennial" | null = !isActive ? null : isFree ? "monthly" : sub.billingCycle;
    return { ...sub, isActive, term };
  }),

  // NOTE: the former `subscribe` and `upgrade` mutations were removed (Phase 31
  // security). They self-activated a paid subscription with NO payment
  // verification — any authenticated client could grant itself the top plan for
  // free over tRPC. The real, money-safe path is payment.createOrder → admin
  // payment.verifyOrder (server-verified). Do not reintroduce client-callable
  // activation without server-verified payment (§42).

  cancel: authedQuery
    .input(z.object({ reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(subscriptions)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: input.reason || null,
          autoRenew: false,
        })
        .where(eq(subscriptions.userId, ctx.user.id));

      return db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, ctx.user.id),
      });
    }),

  list: adminQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const { page = 1, limit = 25 } = input || {};
      const offset = (page - 1) * limit;

      const subs = await db.query.subscriptions.findMany({
        limit,
        offset,
        orderBy: [desc(subscriptions.createdAt)],
        with: { package: true },
      });

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(subscriptions);

      return {
        subscriptions: subs,
        total: totalResult[0]?.count || 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  invoices: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.invoices.findMany({
      where: eq(invoices.userId, ctx.user.id),
      orderBy: [desc(invoices.createdAt)],
      with: { subscription: { with: { package: true } } },
    });
  }),

  // Admin: the current limited-time upgrade-offer promo (§68). 0 = no promo.
  getUpgradeOffer: adminQuery.query(async () => ({
    percent: await getUpgradeOfferPercent(getDb()),
    max: MAX_OFFER_PERCENT,
  })),

  // Admin: run/adjust/stop the promo. Server clamps to [0, MAX] — the discount
  // can never exceed the cap no matter what's entered.
  setUpgradeOffer: adminQuery
    .input(z.object({ percent: z.number().int().min(0).max(MAX_OFFER_PERCENT) }))
    .mutation(async ({ input }) => ({ ok: true, percent: await setUpgradeOfferPercent(getDb(), input.percent) })),
});
