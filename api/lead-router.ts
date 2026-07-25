import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { leads, cards } from "@db/schema";
import { eq, and, or, desc, asc, sql, like, isNotNull, notInArray, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendLeadNotification } from "./lib/mail";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";

// The lead pipeline stages (must match the DB enum on the leads table).
const STAGES = ["new", "contacted", "interested", "follow_up", "converted", "not_interested", "closed"] as const;
const stageEnum = z.enum(STAGES);

export const leadRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { page = 1, limit = 25, status, search } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [eq(leads.userId, ctx.user.id)];
      if (status && status !== "all" && (STAGES as readonly string[]).includes(status)) {
        conditions.push(eq(leads.status, status as (typeof STAGES)[number]));
      }
      const term = search?.trim();
      if (term) {
        const q = `%${term}%`;
        const match = or(
          like(leads.fullName, q),
          like(leads.email, q),
          like(leads.phone, q),
          like(leads.company, q)
        );
        if (match) conditions.push(match);
      }

      const where = and(...conditions);
      const [leadList, totalResult] = await Promise.all([
        db.query.leads.findMany({ where, limit, offset, orderBy: [desc(leads.createdAt)] }),
        db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);
      return { leads: leadList, total, page, totalPages: Math.ceil(total / limit) };
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
    .mutation(async ({ ctx, input }) => {
      // Throttle enquiry submissions per IP to blunt form-spam floods.
      enforceRateLimit(`enquiry:${clientIp(ctx.req)}`, 6, 60_000);
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

  // Update a lead's pipeline stage, notes and/or follow-up date. Any field is
  // optional; followUpDate can be set to null to clear the reminder.
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: stageEnum.optional(),
        notes: z.string().optional(),
        followUpDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const lead = await db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.userId, ctx.user.id)),
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      const data: Partial<typeof leads.$inferInsert> = {};
      if (input.status !== undefined) data.status = input.status;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.followUpDate !== undefined) data.followUpDate = input.followUpDate;
      if (Object.keys(data).length) await db.update(leads).set(data).where(eq(leads.id, input.id));

      return db.query.leads.findFirst({ where: eq(leads.id, input.id) });
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

  // Open leads that have a follow-up date, soonest first — powers the
  // "follow-ups due" reminders on the dashboard and CRM.
  followUps: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.leads.findMany({
      where: and(
        eq(leads.userId, ctx.user.id),
        isNotNull(leads.followUpDate),
        notInArray(leads.status, ["converted", "not_interested", "closed"]),
      ),
      orderBy: [asc(leads.followUpDate)],
      limit: 50,
    });
  }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const mine = eq(leads.userId, ctx.user.id);
    const [totalResult, newResult, followUpResult, convertedResult, dueResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads).where(mine),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(and(mine, eq(leads.status, "new"))),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(and(mine, eq(leads.status, "follow_up"))),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(and(mine, eq(leads.status, "converted"))),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(
        and(mine, isNotNull(leads.followUpDate), lte(leads.followUpDate, endToday), notInArray(leads.status, ["converted", "not_interested", "closed"]))
      ),
    ]);

    const total = Number(totalResult[0]?.count || 0);
    const converted = Number(convertedResult[0]?.count || 0);

    return {
      total,
      new: Number(newResult[0]?.count || 0),
      followUp: Number(followUpResult[0]?.count || 0),
      converted,
      followUpsDue: Number(dueResult[0]?.count || 0),
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  }),
});
