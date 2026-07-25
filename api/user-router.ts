import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, authedQuery, resellerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, resellerProfiles, cards } from "@db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

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
        password: z.string().min(6),
        fullName: z.string(),
        phone: z.string().optional(),
        role: z.enum(["super_admin", "reseller", "customer"]),
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
      await db.update(users).set(data).where(eq(users.id, id));
      return db.query.users.findFirst({ where: eq(users.id, id) });
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
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
      return db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
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
