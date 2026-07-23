import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { leads, cards } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendLeadNotification } from "./lib/mail";

export const leadRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        status: z.string().optional(),
        cardId: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { page = 1, limit = 25, status, cardId } = input || {};
      const offset = (page - 1) * limit;

      let conditions = [eq(leads.userId, ctx.user.id)];

      const leadList = await db.query.leads.findMany({
        where: and(...conditions),
        limit,
        offset,
        orderBy: [desc(leads.createdAt)],
      });

      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(...conditions));

      return {
        leads: leadList,
        total: totalResult[0]?.count || 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  listAll: adminQuery
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

      const leadList = await db.query.leads.findMany({
        limit,
        offset,
        orderBy: [desc(leads.createdAt)],
      });

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(leads);

      return { leads: leadList, total: totalResult[0]?.count || 0, page, totalPages: Math.ceil((totalResult[0]?.count || 0) / limit) };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const lead = await db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.userId, ctx.user.id)),
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      return lead;
    }),

  create: publicQuery
    .input(
      z.object({
        cardId: z.number(),
        fullName: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        message: z.string().optional(),
        source: z.string().default("card"),
        ipAddress: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        device: z.string().optional(),
        browser: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: eq(cards.id, input.cardId),
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await db.insert(leads).values({
        cardId: input.cardId,
        userId: card.userId,
        fullName: input.fullName,
        email: input.email || null,
        phone: input.phone || null,
        company: input.company || null,
        message: input.message || null,
        source: input.source,
        ipAddress: input.ipAddress || null,
        country: input.country || null,
        city: input.city || null,
        device: input.device || null,
        browser: input.browser || null,
      }).$returningId();

      await db.update(cards)
        .set({ leadCount: sql`${cards.leadCount} + 1` })
        .where(eq(cards.id, input.cardId));

      // Notify the owner by email (non-blocking, never throws).
      void sendLeadNotification({
        name: input.fullName, email: input.email, contact: input.phone,
        message: input.message, slug: card.slug, cardName: card.title,
      });

      return db.query.leads.findFirst({ where: eq(leads.id, result[0].id) });
    }),

  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "interested", "follow_up", "converted", "not_interested", "closed"]),
        notes: z.string().optional(),
        followUpDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const lead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.userId, ctx.user.id)),
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(leads).set(data).where(eq(leads.id, id));
      return db.query.leads.findFirst({ where: eq(leads.id, id) });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(leads).where(
        and(eq(leads.id, input.id), eq(leads.userId, ctx.user.id))
      );
      return { success: true };
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [totalResult, newResult, contactedResult, convertedResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.userId, ctx.user.id)),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(
        and(eq(leads.userId, ctx.user.id), eq(leads.status, "new"))
      ),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(
        and(eq(leads.userId, ctx.user.id), eq(leads.status, "contacted"))
      ),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(
        and(eq(leads.userId, ctx.user.id), eq(leads.status, "converted"))
      ),
    ]);

    const total = totalResult[0]?.count || 0;
    const converted = convertedResult[0]?.count || 0;

    return {
      total,
      newThisWeek: newResult[0]?.count || 0,
      contacted: contactedResult[0]?.count || 0,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  }),
});
