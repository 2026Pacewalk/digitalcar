import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cards, cardBlocks, analyticsEvents } from "@db/schema";
import { eq, desc, and, sql, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const cardRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { page = 1, limit = 25, status } = input || {};
      const offset = (page - 1) * limit;

      let conditions = [eq(cards.userId, ctx.user.id)];
      if (status) {
        conditions.push(eq(cards.status, status as "draft" | "published" | "archived"));
      }

      const [cardList, totalResult] = await Promise.all([
        db.query.cards.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(cards.updatedAt)],
          with: { blocks: true },
        }),
        db.select({ count: sql<number>`count(*)` })
          .from(cards)
          .where(and(...conditions)),
      ]);

      return {
        cards: cardList,
        total: totalResult[0]?.count || 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });
      return card;
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.cards.findFirst({
        where: eq(cards.slug, input.slug),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string(),
        templateId: z.number().optional(),
        slug: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.cards.findFirst({
        where: eq(cards.slug, input.slug),
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" });

      const result = await db.insert(cards).values({
        userId: ctx.user.id,
        title: input.title,
        slug: input.slug,
        templateId: input.templateId || null,
        status: "draft",
        language: "en",
      }).$returningId();

      return db.query.cards.findFirst({
        where: eq(cards.id, result[0].id),
        with: { blocks: true },
      });
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        templateId: z.number().optional(),
        customDomain: z.string().optional(),
        language: z.string().optional(),
        settings: z.record(z.string(), z.any()).optional(),
        seoSettings: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const existing = await db.query.cards.findFirst({
        where: and(eq(cards.id, id), eq(cards.userId, ctx.user.id)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "published") updateData.publishedAt = new Date();
      }
      if (data.templateId !== undefined) updateData.templateId = data.templateId;
      if (data.customDomain !== undefined) updateData.customDomain = data.customDomain;
      if (data.language !== undefined) updateData.language = data.language;
      if (data.settings !== undefined) updateData.settings = data.settings;
      if (data.seoSettings !== undefined) updateData.seoSettings = data.seoSettings;

      await db.update(cards).set(updateData).where(eq(cards.id, id));

      return db.query.cards.findFirst({
        where: eq(cards.id, id),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(cards).where(
        and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id))
      );
      return { success: true };
    }),

  publish: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(cards)
        .set({ status: "published", publishedAt: new Date() })
        .where(and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)));
      return db.query.cards.findFirst({
        where: eq(cards.id, input.id),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
    }),

  unpublish: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(cards)
        .set({ status: "draft" })
        .where(and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)));
      return db.query.cards.findFirst({ where: eq(cards.id, input.id) });
    }),

  duplicate: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const original = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)),
        with: { blocks: true },
      });
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });

      const [newCard] = await db.insert(cards).values({
        userId: ctx.user.id,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        templateId: original.templateId,
        status: "draft",
        language: original.language,
        settings: original.settings,
        seoSettings: original.seoSettings,
      });

      if (original.blocks) {
        for (const block of original.blocks) {
          await db.insert(cardBlocks).values({
            cardId: newCard.insertId,
            type: block.type,
            position: block.position,
            config: block.config,
            content: block.content,
          });
        }
      }

      return db.query.cards.findFirst({
        where: eq(cards.id, newCard.insertId),
        with: { blocks: true },
      });
    }),

  setPrimary: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Unset current primary
      await db.update(cards)
        .set({ isPrimary: false })
        .where(eq(cards.userId, ctx.user.id));
      // Set new primary
      await db.update(cards)
        .set({ isPrimary: true })
        .where(and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)));
      return { success: true };
    }),

  trackView: publicQuery
    .input(
      z.object({
        slug: z.string(),
        visitorId: z.string(),
        device: z.string().optional(),
        browser: z.string().optional(),
        referrer: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: eq(cards.slug, input.slug),
      });
      if (!card) return { success: false };

      await db.update(cards)
        .set({ viewCount: sql`${cards.viewCount} + 1` })
        .where(eq(cards.id, card.id));

      await db.insert(analyticsEvents).values({
        cardId: card.id,
        eventType: "view",
        visitorId: input.visitorId,
        device: input.device || null,
        browser: input.browser || null,
        referrer: input.referrer || null,
        country: input.country || null,
        city: input.city || null,
      });

      return { success: true };
    }),

  trackEvent: publicQuery
    .input(
      z.object({
        cardId: z.number(),
        eventType: z.string(),
        eventData: z.record(z.string(), z.any()).optional(),
        visitorId: z.string(),
        device: z.string().optional(),
        browser: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        referrer: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(analyticsEvents).values({
        cardId: input.cardId,
        eventType: input.eventType,
        eventData: input.eventData || null,
        visitorId: input.visitorId,
        device: input.device || null,
        browser: input.browser || null,
        country: input.country || null,
        city: input.city || null,
        referrer: input.referrer || null,
      });
      return { success: true };
    }),

  listAll: adminQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const { page = 1, limit = 25, search, status } = input || {};
      const offset = (page - 1) * limit;

      let conditions = [];
      if (search) conditions.push(like(cards.title, `%${search}%`));
      if (status) conditions.push(eq(cards.status, status as "draft" | "published" | "archived"));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [cardList, totalResult] = await Promise.all([
        db.query.cards.findMany({
          where,
          limit,
          offset,
          orderBy: [desc(cards.createdAt)],
        }),
        db.select({ count: sql<number>`count(*)` }).from(cards).where(where),
      ]);

      return { cards: cardList, total: totalResult[0]?.count || 0, page, totalPages: Math.ceil((totalResult[0]?.count || 0) / limit) };
    }),
});
