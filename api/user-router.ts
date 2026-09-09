import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, authedQuery, resellerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, resellerProfiles, cards, subscriptions, publishedCards, cardTrials } from "@db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { sendEmail } from "./lib/mail";
import { accountDetailsEmail, featureUpdateEmail } from "./lib/email-templates";

export const userRouter = createRouter({
  list: adminQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        search: z.string().optional(),
        role: z.enum(["super_admin", "reseller", "customer"]).optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const { page = 1, limit = 25, search } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) {
        conditions.push(sql`${users.fullName} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`}`);
      }
      // Note: role and status filtering simplified

      const allUsers = await db.query.users.findMany({
        limit,
        offset,
        orderBy: [desc(users.createdAt)],
      });

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(users);

      return {
        users: allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          avatar: u.avatar,
          role: u.role,
          status: u.status,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        })),
        total: totalResult[0]?.count || 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  getById: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  create: adminQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Use at least 8 characters"),
        fullName: z.string(),
        phone: z.string().optional(),
        // super_admin is intentionally NOT assignable through the API — the
        // highest privilege can only be granted with db/reset-admin.mjs on the
        // server. This is what prevents a weak "testing" account from becoming
        // a super admin via the panel.
        role: z.enum(["reseller", "customer"]),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const hashedPassword = await bcrypt.hash(input.password, 12);
      const result = await db.insert(users).values({
        ...input,
        password: hashedPassword,
        status: input.status || "active",
      }).$returningId();
      return db.query.users.findFirst({
        where: eq(users.id, result[0].id),
        columns: { id: true, email: true, fullName: true, phone: true, role: true, status: true },
      });
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        email: z.string().email().optional(),
        fullName: z.string().optional(),
        phone: z.string().optional(),
        role: z.enum(["super_admin", "reseller", "customer"]).optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      // Never PROMOTE anyone to super_admin via the API. That privilege is only
      // granted by the server-side db/reset-admin.mjs script.
      if (data.role === "super_admin") {
        const target = await db.query.users.findFirst({ where: eq(users.id, id), columns: { role: true } });
        if (target?.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "super_admin can't be granted from the panel. Use the server admin-reset tool." });
        }
      }
      await db.update(users).set(data).where(eq(users.id, id));
      return db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { id: true, email: true, fullName: true, phone: true, avatar: true, role: true, status: true },
      });
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Protect super-admin accounts from being deleted through the panel.
      const target = await db.query.users.findFirst({ where: eq(users.id, input.id), columns: { role: true } });
      if (target?.role === "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "A super_admin account can't be deleted from the panel." });
      }
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),

  // ─── Give a customer extra days of card validity (matched by email) ───
  // Extends the active subscription's period end — which is what actually keeps
  // the public card live — so the extra days take real effect.
  /* ─── Super-admin: change a customer's package (Trial / Gold / Platinum) ───
     The admin UI used to change this ONLY in React state and show a success
     toast, so it silently reverted on refresh. The Customers list derives
     package_id from the SUBSCRIPTIONS table, so that is what has to be written.
     We also mirror the plan onto the published card snapshot (the public card's
     pause gate and the customer's own dashboard read package_id/expired_on from
     there) and convert any running trial, so every place that answers "what
     plan is this?" agrees. */
  setPackage: adminQuery
    .input(z.object({
      email: z.string().email(),
      packageId: z.number().int().min(1).max(99),
      cycle: z.enum(["monthly", "yearly", "triennial"]).default("yearly"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
      if (!user) return { ok: false as const, reason: "no_account" as const };

      const isTrial = input.packageId === 7;
      const days = isTrial ? 30 : input.cycle === "triennial" ? 1095 : input.cycle === "monthly" ? 30 : 365;
      const now = new Date();
      const end = new Date(now.getTime() + days * 86_400_000);

      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, user.id),
        orderBy: [desc(subscriptions.createdAt)],
      });
      if (sub) {
        await db.update(subscriptions).set({
          packageId: input.packageId, status: "active", billingCycle: input.cycle,
          currentPeriodStart: now, currentPeriodEnd: end,
        }).where(eq(subscriptions.id, sub.id));
      } else {
        await db.insert(subscriptions).values({
          userId: user.id, packageId: input.packageId, status: "active", billingCycle: input.cycle,
          amount: "0.00", currency: "INR", currentPeriodStart: now, currentPeriodEnd: end,
          paymentGateway: "manual",
        });
      }

      const expiredOn = end.toISOString().slice(0, 10);

      // Keep the published snapshot in step so the customer's dashboard and the
      // public card don't keep showing the old plan.
      try {
        const rows = await db.select().from(publishedCards).where(eq(publishedCards.userId, user.id));
        for (const row of rows) {
          const data = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>;
          const customer = { ...((data.customer as Record<string, unknown>) || {}) };
          customer.package_id = input.packageId;
          customer.expired_on = expiredOn;
          await db.update(publishedCards).set({ data: { ...data, customer } }).where(eq(publishedCards.id, row.id));
        }
      } catch { /* snapshot mirror is best-effort — never fail the plan change */ }

      // A paid plan ends the trial clock (otherwise lifecycle emails/pausing
      // still treat them as a trial user).
      try {
        if (!isTrial) await db.update(cardTrials).set({ status: "converted" }).where(eq(cardTrials.userId, user.id));
      } catch { /* ignore */ }

      return { ok: true as const, packageId: input.packageId, expiredOn };
    }),

  /* ─── Super-admin: email a customer their login + card link ───
     The password is optional and is NEVER stored or logged here — it is passed
     straight through to the message the admin chose to send, exactly as they
     typed it. Sending credentials is the admin's call; we always include the
     "change it after signing in" line in the template. */
  sendAccountDetails: adminQuery
    .input(z.object({
      email: z.string().email(),
      password: z.string().max(200).optional(),
      includePassword: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, fullName: true, email: true } });
      if (!user) return { ok: false as const, reason: "no_account" as const };
      const pub = await db.select({ slug: publishedCards.slug, data: publishedCards.data })
        .from(publishedCards).where(eq(publishedCards.userId, user.id)).limit(1);
      const cust = ((pub[0]?.data as { customer?: Record<string, unknown> })?.customer) || {};
      const res = await sendEmail(user.email, accountDetailsEmail({
        name: user.fullName,
        loginEmail: user.email,
        password: input.includePassword ? (input.password || null) : null,
        slug: pub[0]?.slug || null,
        company: (cust.company_name as string) || null,
      }));
      return { ok: res.ok, error: res.error, sentTo: user.email };
    }),

  /* ─── Super-admin: "what's new" announcement to an existing customer ─── */
  sendFeatureUpdate: adminQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, fullName: true, email: true } });
      if (!user) return { ok: false as const, reason: "no_account" as const };
      const pub = await db.select({ slug: publishedCards.slug }).from(publishedCards).where(eq(publishedCards.userId, user.id)).limit(1);
      const res = await sendEmail(user.email, featureUpdateEmail({ name: user.fullName, slug: pub[0]?.slug || null }));
      return { ok: res.ok, error: res.error, sentTo: user.email };
    }),

  extendValidity: adminQuery
    .input(z.object({ email: z.string().email(), days: z.number().int().min(1).max(3650) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
      if (!user) return { ok: false as const, reason: "no_account" as const };
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, user.id),
        orderBy: [desc(subscriptions.createdAt)],
      });
      const now = new Date();
      const from = sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now ? new Date(sub.currentPeriodEnd) : now;
      const end = new Date(from.getTime() + input.days * 86_400_000);
      if (sub) {
        await db.update(subscriptions).set({ currentPeriodEnd: end, status: "active" }).where(eq(subscriptions.id, sub.id));
      } else {
        await db.insert(subscriptions).values({
          userId: user.id, packageId: 7, status: "active", billingCycle: "monthly",
          amount: "0.00", currency: "INR", currentPeriodStart: now, currentPeriodEnd: end, paymentGateway: "manual",
        });
      }
      return { ok: true as const, expiredOn: end.toISOString().slice(0, 10) };
    }),

  // ─── Super-admin: set a user's card-limit override (null = plan default) ───
  // Keyed by email so it works from the customers admin table. Controls how many
  // cards the account may hold (the multi-card limit), independent of plan.
  setCardLimit: adminQuery
    .input(z.object({ email: z.string().email(), limit: z.number().int().min(1).max(1000).nullable() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
      if (!user) return { ok: false as const, reason: "no_account" as const };
      await db.update(users).set({ cardLimit: input.limit }).where(eq(users.id, user.id));
      return { ok: true as const, limit: input.limit };
    }),

  // ─── Deactivate a customer (safe soft-delete: pauses their card, reversible) ───
  deactivateCustomer: adminQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, role: true } });
      if (!user) return { ok: false as const, reason: "no_account" as const };
      if (user.role === "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "A super admin can't be deactivated here." });
      await db.update(users).set({ status: "suspended" }).where(eq(users.id, user.id));
      return { ok: true as const };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        fullName: z.string().optional(),
        phone: z.string().optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users).set(input).where(eq(users.id, ctx.user.id));
      // Never return the password hash (or other secrets) to the client.
      return db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { id: true, email: true, fullName: true, phone: true, avatar: true, role: true, status: true },
      });
    }),

  resellerStats: resellerQuery.query(async ({ ctx }) => {
    const db = getDb();
    const resellerId = ctx.user.role === "reseller" ? ctx.user.id : undefined;
    if (!resellerId) throw new TRPCError({ code: "FORBIDDEN" });

    const profile = await db.query.resellerProfiles.findFirst({
      where: eq(resellerProfiles.userId, resellerId),
    });

    const customerCount = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.resellerId, resellerId), eq(users.role, "customer")));

    return {
      totalCustomers: customerCount[0]?.count || 0,
      activeCustomers: customerCount[0]?.count || 0,
      monthlyEarnings: 0,
      totalEarnings: profile?.totalEarnings || "0.00",
      commissionRate: profile?.commissionRate || "10.00",
    };
  }),

  resellerCustomers: resellerQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const resellerId = ctx.user.role === "reseller" ? ctx.user.id : undefined;
      if (!resellerId) throw new TRPCError({ code: "FORBIDDEN" });

      const { page = 1, limit = 25 } = input || {};
      const offset = (page - 1) * limit;

      const customers = await db.query.users.findMany({
        where: and(eq(users.resellerId, resellerId), eq(users.role, "customer")),
        limit,
        offset,
        orderBy: [desc(users.createdAt)],
      });

      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.resellerId, resellerId), eq(users.role, "customer")));

      return {
        customers,
        total: totalResult[0]?.count || 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  createReseller: adminQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string(),
        phone: z.string().optional(),
        companyName: z.string(),
        commissionRate: z.number().default(10),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const hashedPassword = await bcrypt.hash(input.password, 12);

      const userResult = await db.insert(users).values({
        email: input.email,
        password: hashedPassword,
        fullName: input.fullName,
        phone: input.phone || null,
        role: "reseller",
        status: "active",
      }).$returningId();

      await db.insert(resellerProfiles).values({
        userId: userResult[0].id,
        companyName: input.companyName,
        commissionRate: String(input.commissionRate),
      });

      return db.query.users.findFirst({
        where: eq(users.id, userResult[0].id),
      });
    }),

  listResellers: adminQuery.query(async () => {
    const db = getDb();
    const resellers = await db.query.users.findMany({
      where: eq(users.role, "reseller"),
      orderBy: [desc(users.createdAt)],
    });

    const profiles = await db.query.resellerProfiles.findMany();

    return resellers.map((r) => {
      const profile = profiles.find((p) => p.userId === r.id);
      return {
        ...r,
        companyName: profile?.companyName,
        commissionRate: profile?.commissionRate,
        totalCustomers: profile?.totalCustomers,
        totalEarnings: profile?.totalEarnings,
        status: profile?.status || r.status,
      };
    });
  }),

  overview: adminQuery.query(async () => {
    const db = getDb();
    const [userCount, resellerCount, customerCount, cardCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "reseller")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "customer")),
      db.select({ count: sql<number>`count(*)` }).from(cards),
    ]);

    return {
      totalUsers: userCount[0]?.count || 0,
      totalResellers: resellerCount[0]?.count || 0,
      totalCustomers: customerCount[0]?.count || 0,
      totalCards: cardCount[0]?.count || 0,
    };
  }),
});
