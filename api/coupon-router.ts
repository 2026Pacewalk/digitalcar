import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { coupons, couponRedemptions, users, subscriptionPackages } from "@db/schema";
import { normalizeCode } from "./lib/coupons";

/* Super-admin coupon management. Coupons discount plan purchases only — the
   pricing rules live in api/lib/coupons.ts. */

const couponInput = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().trim().min(3).max(40),
  description: z.string().trim().max(255).optional(),
  discountType: z.enum(["percent", "flat"]),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().nullable().optional(),
  minAmount: z.number().positive().nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().min(0).max(1000).default(1),
  planIds: z.array(z.number().int().positive()).default([]),
  cycles: z.array(z.enum(["monthly", "yearly", "triennial"])).default([]),
  active: z.boolean().default(true),
});

export const couponRouter = createRouter({
  // Every coupon with how it has performed.
  list: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    const stats = rows.length
      ? await db.select({
          couponId: couponRedemptions.couponId,
          completed: sql<number>`sum(case when ${couponRedemptions.status} = 'completed' then 1 else 0 end)`,
          pending: sql<number>`sum(case when ${couponRedemptions.status} = 'pending' then 1 else 0 end)`,
          revenue: sql<string>`coalesce(sum(case when ${couponRedemptions.status} = 'completed' then ${couponRedemptions.amountPaid} else 0 end), 0)`,
          discounted: sql<string>`coalesce(sum(case when ${couponRedemptions.status} = 'completed' then ${couponRedemptions.discount} else 0 end), 0)`,
        }).from(couponRedemptions).groupBy(couponRedemptions.couponId)
      : [];
    const byId = new Map(stats.map((s) => [s.couponId, s]));
    const plans = await db.select({ id: subscriptionPackages.id, name: subscriptionPackages.name }).from(subscriptionPackages);
    return {
      plans,
      coupons: rows.map((c) => {
        const s = byId.get(c.id);
        return {
          ...c,
          uses: Number(s?.completed || 0),
          pendingUses: Number(s?.pending || 0),
          revenue: Number(s?.revenue || 0),
          discounted: Number(s?.discounted || 0),
        };
      }),
    };
  }),

  save: adminQuery.input(couponInput).mutation(async ({ input }) => {
    const db = getDb();
    const code = normalizeCode(input.code);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Use 3–40 letters, numbers, dashes or underscores for the code." });
    }
    if (input.discountType === "percent" && input.discountValue > 100) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A percentage discount can't be more than 100%." });
    }
    if (input.validFrom && input.validUntil && input.validUntil <= input.validFrom) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The end date must be after the start date." });
    }
    const clash = await db.select({ id: coupons.id }).from(coupons)
      .where(input.id ? and(eq(coupons.code, code), ne(coupons.id, input.id)) : eq(coupons.code, code)).limit(1);
    if (clash[0]) throw new TRPCError({ code: "CONFLICT", message: `A coupon with the code ${code} already exists.` });

    const values = {
      code,
      description: input.description || null,
      discountType: input.discountType,
      discountValue: input.discountValue.toFixed(2),
      maxDiscount: input.discountType === "percent" && input.maxDiscount ? input.maxDiscount.toFixed(2) : null,
      minAmount: input.minAmount ? input.minAmount.toFixed(2) : null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit,
      planIds: input.planIds.length ? input.planIds.join(",") : null,
      cycles: input.cycles.length ? input.cycles.join(",") : null,
      active: input.active,
    };
    if (input.id) {
      await db.update(coupons).set(values).where(eq(coupons.id, input.id));
      return { ok: true, id: input.id };
    }
    const [res] = await db.insert(coupons).values(values);
    return { ok: true, id: Number(res.insertId) };
  }),

  setActive: adminQuery
    .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      await getDb().update(coupons).set({ active: input.active }).where(eq(coupons.id, input.id));
      return { ok: true };
    }),

  // A coupon that has been used is switched off rather than deleted, so past
  // orders keep a record of the discount they received.
  remove: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    const used = await db.select({ id: couponRedemptions.id }).from(couponRedemptions)
      .where(eq(couponRedemptions.couponId, input.id)).limit(1);
    if (used[0]) {
      await db.update(coupons).set({ active: false }).where(eq(coupons.id, input.id));
      return { ok: true, deleted: false };
    }
    await db.delete(coupons).where(eq(coupons.id, input.id));
    return { ok: true, deleted: true };
  }),

  redemptions: adminQuery.input(z.object({ couponId: z.number().int().positive() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(couponRedemptions)
      .where(eq(couponRedemptions.couponId, input.couponId)).orderBy(desc(couponRedemptions.createdAt)).limit(200);
    const ids = [...new Set(rows.map((r) => r.userId))];
    const people = ids.length
      ? await db.select({ id: users.id, email: users.email, fullName: users.fullName }).from(users).where(inArray(users.id, ids))
      : [];
    return rows.map((r) => ({ ...r, customer: people.find((u) => u.id === r.userId) ?? null }));
  }),
});
