import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptions, subscriptionPackages, invoices } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

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

      const amount = input.billingCycle === "yearly" ? pkg.yearlyPrice : pkg.monthlyPrice;
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
        currency: "USD",
        trialEndsAt: pkg.trialDays > 0 ? trialEnd : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentGateway: input.paymentMethod,
      }).$returningId();

      return db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, result[0].id),
        with: { package: true },
      });
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
