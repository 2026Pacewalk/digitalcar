import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptions, subscriptionPackages, invoices, appSettings } from "@db/schema";
import { eq, desc, sql, and, gt } from "drizzle-orm";

const DEFAULT_DISCOUNT = 15;
/** Referral discount % for a referee's first paid plan (0 if not eligible). */
async function referralDiscountFor(db: ReturnType<typeof getDb>, user: { id: number; referredById: number | null }): Promise<number> {
  if (!user.referredById) return 0;
  const alreadyPaid = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, user.id), gt(subscriptions.amount, "0")),
  });
  if (alreadyPaid) return 0; // one-time only
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "referral_discount_percent") });
  const pct = row ? Number(row.value) : DEFAULT_DISCOUNT;
  return Number.isFinite(pct) ? pct : DEFAULT_DISCOUNT;
}

export const subscriptionRouter = createRouter({
  mySubscription: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
      with: { package: true },
      orderBy: [desc(subscriptions.createdAt)],
    });
  }),

  subscribe: authedQuery
    .input(
      z.object({
        packageId: z.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
        paymentMethod: z.enum(["stripe", "paypal", "razorpay"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const pkg = await db.query.subscriptionPackages.findFirst({
        where: eq(subscriptionPackages.id, input.packageId),
      });
      if (!pkg) throw new Error("Package not found");

      const round2 = (v: number) => Math.round(v * 100) / 100;
      const base = Number(input.billingCycle === "yearly" ? pkg.yearlyPrice : pkg.monthlyPrice);

      // Is this the user's first paid plan, or an upgrade from one they already pay for?
      const existingPaid = await db.query.subscriptions.findFirst({
        where: and(eq(subscriptions.userId, ctx.user.id), gt(subscriptions.amount, "0")),
        orderBy: [desc(subscriptions.createdAt)],
      });

      let discountPct = 0;   // referral discount — first paid plan only
      let adjustment = 0;    // credit for what they already paid on the current plan
      let charged: number;   // what they pay right now
      let stored: number;    // amount saved on the subscription row

      if (!existingPaid) {
        // First paid plan → apply the one-time referral discount (if eligible).
        discountPct = await referralDiscountFor(db, ctx.user);
        charged = round2(base * (1 - discountPct / 100));
        stored = charged;
      } else {
        // Upgrade → no discount/commission; credit the old amount toward the new plan.
        adjustment = Number(existingPaid.amount);
        charged = Math.max(0, round2(base - adjustment));
        stored = round2(base); // plan value, so the next upgrade credits the full paid-up amount
      }
      const amount = stored.toFixed(2);
      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + pkg.trialDays);

      const result = await db.insert(subscriptions).values({
        userId: ctx.user.id,
        packageId: input.packageId,
        status: pkg.trialDays > 0 ? "trial" : "active",
        billingCycle: input.billingCycle,
        amount,
        currency: "INR",
        trialEndsAt: pkg.trialDays > 0 ? trialEnd : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentGateway: input.paymentMethod,
      }).$returningId();

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, result[0].id),
        with: { package: true },
      });
      return {
        subscription,
        planPrice: base,
        discountPercent: discountPct,
        adjustment,
        charged,
        isUpgrade: !!existingPaid,
      };
    }),

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

  upgrade: authedQuery
    .input(z.object({ packageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const currentSub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, ctx.user.id),
      });
      if (!currentSub) throw new Error("No active subscription");

      await db.update(subscriptions)
        .set({ packageId: input.packageId, status: "active" })
        .where(eq(subscriptions.id, currentSub.id));

      return db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, currentSub.id),
        with: { package: true },
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
    });
  }),
});
