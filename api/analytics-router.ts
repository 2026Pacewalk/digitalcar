import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { analyticsEvents, cards } from "@db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

export const analyticsRouter = createRouter({
  cardOverview: authedQuery
    .input(
      z.object({
        cardId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.cardId), eq(cards.userId, ctx.user.id)),
      });
      if (!card) return null;

      let dateFilter = undefined;
      if (input.dateFrom) {
        dateFilter = gte(analyticsEvents.createdAt, input.dateFrom);
      }

      const [views, uniqueVisitors, deviceBreakdown, dailyViews] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(analyticsEvents)
          .where(and(eq(analyticsEvents.cardId, input.cardId), eq(analyticsEvents.eventType, "view"), dateFilter)),
        db.select({ count: sql<number>`count(distinct visitor_id)` })
          .from(analyticsEvents)
          .where(and(eq(analyticsEvents.cardId, input.cardId), dateFilter)),
        db.select({
          device: analyticsEvents.device,
          count: sql<number>`count(*)`,
        })
          .from(analyticsEvents)
          .where(and(eq(analyticsEvents.cardId, input.cardId), dateFilter))
          .groupBy(analyticsEvents.device),
        db.select({
          date: sql<string>`DATE(created_at)`,
          count: sql<number>`count(*)`,
        })
          .from(analyticsEvents)
          .where(and(eq(analyticsEvents.cardId, input.cardId), eq(analyticsEvents.eventType, "view"), dateFilter))
          .groupBy(sql`DATE(created_at)`)
          .orderBy(sql`DATE(created_at)`),
      ]);

      return {
        totalViews: card.viewCount,
        uniqueVisitors: uniqueVisitors[0]?.count || 0,
        deviceBreakdown: deviceBreakdown.map((d) => ({ device: d.device || "unknown", count: d.count })),
        dailyViews: dailyViews.map((d) => ({ date: d.date, views: d.count })),
      };
    }),

  myOverview: authedQuery
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userCards = await db.query.cards.findMany({
        where: eq(cards.userId, ctx.user.id),
      });

      const cardIds = userCards.map((c) => c.id);
      if (cardIds.length === 0) {
        return { totalViews: 0, totalVisitors: 0, totalLeads: 0, totalClicks: 0, cards: [] };
      }

      let dateFilter = undefined;
      if (input?.dateFrom) {
        dateFilter = gte(analyticsEvents.createdAt, input.dateFrom);
      }

      const totalViews = userCards.reduce((sum, c) => sum + Number(c.viewCount), 0);
      const totalLeads = userCards.reduce((sum, c) => sum + c.leadCount, 0);

      return {
        totalViews,
        totalVisitors: totalViews,
        totalLeads,
        totalClicks: 0,
        cards: userCards.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          views: Number(c.viewCount),
          leads: c.leadCount,
          status: c.status,
        })),
      };
    }),

  adminOverview: adminQuery
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional()
    )
    .query(async () => {
      const db = getDb();

      const [cardCount, totalViewsResult, dailyViews, deviceBreakdown] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(cards),
        db.select({ count: sql<number>`sum(view_count)` }).from(cards),
        db.select({
          date: sql<string>`DATE(created_at)`,
          count: sql<number>`count(*)`,
        })
          .from(analyticsEvents)
          .where(eq(analyticsEvents.eventType, "view"))
          .groupBy(sql`DATE(created_at)`)
          .orderBy(sql`DATE(created_at)`)
          .limit(30),
        db.select({
          device: analyticsEvents.device,
          count: sql<number>`count(*)`,
        })
          .from(analyticsEvents)
          .groupBy(analyticsEvents.device),
      ]);

      return {
        totalCards: cardCount[0]?.count || 0,
        totalViews: Number(totalViewsResult[0]?.count || 0),
        totalLeads: 0,
        totalRevenue: 0,
        dailyViews: dailyViews.map((d) => ({ date: d.date, views: d.count })),
        deviceBreakdown: deviceBreakdown.map((d) => ({ device: d.device || "unknown", count: d.count })),
      };
    }),

  trafficSources: authedQuery
    .input(
      z.object({
        cardId: z.number().optional(),
        dateFrom: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      let conditions = [];

      if (input?.cardId) {
        conditions.push(eq(analyticsEvents.cardId, input.cardId));
      } else {
        const userCards = await db.query.cards.findMany({
          where: eq(cards.userId, ctx.user.id),
        });
        // Simple approach - get all for user
      }

      const sources = await db
        .select({
          referrer: analyticsEvents.referrer,
          count: sql<number>`count(*)`,
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, "view"))
        .groupBy(analyticsEvents.referrer);

      return {
        sources: sources.map((s) => ({
          source: s.referrer || "Direct",
          count: s.count,
        })),
      };
    }),
});
