import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { analyticsEvents, cards, users, subscriptions, invoices, leads } from "@db/schema";
import { eq, and, sql, gte, desc, inArray } from "drizzle-orm";

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

      const [, uniqueVisitors, deviceBreakdown, dailyViews] = await Promise.all([
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

      const mine = inArray(analyticsEvents.cardId, cardIds);
      const viewsWhere = and(mine, eq(analyticsEvents.eventType, "view"), dateFilter);
      const [uniqueRes, dailyRes, deviceRes, sourceRes, clickRes] = await Promise.all([
        db.select({ n: sql<number>`count(distinct visitor_id)` }).from(analyticsEvents).where(viewsWhere),
        db.select({ date: sql<string>`DATE(created_at)`, count: sql<number>`count(*)` })
          .from(analyticsEvents).where(viewsWhere).groupBy(sql`DATE(created_at)`).orderBy(sql`DATE(created_at)`).limit(30),
        db.select({ device: analyticsEvents.device, count: sql<number>`count(*)` })
          .from(analyticsEvents).where(viewsWhere).groupBy(analyticsEvents.device),
        db.select({ referrer: analyticsEvents.referrer, count: sql<number>`count(*)` })
          .from(analyticsEvents).where(viewsWhere).groupBy(analyticsEvents.referrer),
        db.select({ n: sql<number>`count(*)` }).from(analyticsEvents).where(and(mine, eq(analyticsEvents.eventType, "click"), dateFilter)),
      ]);

      return {
        totalViews,
        totalVisitors: Number(uniqueRes[0]?.n || 0),
        totalLeads,
        totalClicks: Number(clickRes[0]?.n || 0),
        dailyViews: dailyRes.map((d) => ({ date: d.date, views: Number(d.count) })),
        deviceBreakdown: deviceRes.map((d) => ({ device: d.device || "Unknown", count: Number(d.count) })),
        sources: sourceRes.map((s) => ({ source: s.referrer || "Direct", count: Number(s.count) })),
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

      const [cardCount, totalViewsResult, dailyViews, deviceBreakdown, clickRes, userCount, leadTotal, planRows, topCardRows] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(cards),
        db.select({ count: sql<number>`sum(view_count)` }).from(cards),
        db.select({ date: sql<string>`DATE(created_at)`, count: sql<number>`count(*)` })
          .from(analyticsEvents).where(eq(analyticsEvents.eventType, "view"))
          .groupBy(sql`DATE(created_at)`).orderBy(sql`DATE(created_at)`).limit(30),
        db.select({ device: analyticsEvents.device, count: sql<number>`count(*)` })
          .from(analyticsEvents).groupBy(analyticsEvents.device),
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(eq(analyticsEvents.eventType, "click")),
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`coalesce(sum(lead_count), 0)` }).from(cards),
        db.select({ packageId: subscriptions.packageId, count: sql<number>`count(*)` })
          .from(subscriptions).where(eq(subscriptions.status, "active")).groupBy(subscriptions.packageId),
        db.select({ id: cards.id, title: cards.title, slug: cards.slug, views: cards.viewCount, leads: cards.leadCount, userId: cards.userId })
          .from(cards).orderBy(desc(cards.viewCount)).limit(8),
      ]);

      const ownerIds = [...new Set(topCardRows.map((c) => c.userId))];
      const owners = ownerIds.length
        ? await db.query.users.findMany({ where: inArray(users.id, ownerIds), columns: { id: true, fullName: true } })
        : [];
      const ownerMap = new Map(owners.map((u) => [u.id, u.fullName]));
      const PLAN_NAMES: Record<number, string> = { 1: "Starter", 2: "Professional", 3: "Business", 4: "Agency", 5: "Starter", 6: "Standard", 7: "Trial" };
      const planAgg: Record<string, number> = {};
      for (const p of planRows) {
        const nm = PLAN_NAMES[Number(p.packageId)] || `Plan ${p.packageId}`;
        planAgg[nm] = (planAgg[nm] || 0) + Number(p.count);
      }

      return {
        totalCards: Number(cardCount[0]?.count || 0),
        totalViews: Number(totalViewsResult[0]?.count || 0),
        totalClicks: Number(clickRes[0]?.count || 0),
        totalUsers: Number(userCount[0]?.count || 0),
        totalLeads: Number(leadTotal[0]?.count || 0),
        totalRevenue: 0,
        dailyViews: dailyViews.map((d) => ({ date: d.date, views: Number(d.count) })),
        deviceBreakdown: deviceBreakdown.map((d) => ({ device: d.device || "unknown", count: Number(d.count) })),
        planDistribution: Object.entries(planAgg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        topCards: topCardRows.map((c) => ({ id: c.id, title: c.title, slug: c.slug, owner: ownerMap.get(c.userId) || "—", views: Number(c.views), leads: Number(c.leads) })),
      };
    }),

  trafficSources: authedQuery
    .input(
      z.object({
        cardId: z.number().optional(),
        dateFrom: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      let conditions = [];

      if (input?.cardId) {
        conditions.push(eq(analyticsEvents.cardId, input.cardId));
      } else {
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

  // Live platform stats for the admin dashboard (super-admin only).
  adminStats: adminQuery.query(async () => {
    const db = getDb();

    const [
      roleCounts,
      cardCount,
      subCounts,
      revenueRow,
      monthly,
      recentUsers,
      recentLeads,
      recentPaid,
    ] = await Promise.all([
      db.select({ role: users.role, count: sql<number>`count(*)` }).from(users).groupBy(users.role),
      db.select({ count: sql<number>`count(*)` }).from(cards),
      db.select({ status: subscriptions.status, count: sql<number>`count(*)` }).from(subscriptions).groupBy(subscriptions.status),
      db.select({ total: sql<string>`coalesce(sum(total_amount), 0)` }).from(invoices).where(eq(invoices.status, "paid")),
      db.select({
        ym: sql<string>`DATE_FORMAT(paid_at, '%Y-%m')`,
        total: sql<string>`coalesce(sum(total_amount), 0)`,
      }).from(invoices).where(eq(invoices.status, "paid")).groupBy(sql`DATE_FORMAT(paid_at, '%Y-%m')`).orderBy(sql`DATE_FORMAT(paid_at, '%Y-%m')`).limit(12),
      db.select({ fullName: users.fullName, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(6),
      db.select({ fullName: leads.fullName, createdAt: leads.createdAt }).from(leads).orderBy(desc(leads.createdAt)).limit(3),
      db.select({ amount: invoices.totalAmount, paidAt: invoices.paidAt }).from(invoices).where(eq(invoices.status, "paid")).orderBy(desc(invoices.paidAt)).limit(3),
    ]);

    const roleMap: Record<string, number> = {};
    for (const r of roleCounts) roleMap[r.role] = Number(r.count);
    const subMap: Record<string, number> = {};
    for (const s of subCounts) subMap[s.status] = Number(s.count);

    const activity = [
      ...recentUsers.slice(0, 3).map((u) => ({ type: "user", text: `New ${u.role.replace("_", " ")} registered: ${u.fullName}`, at: u.createdAt as Date | null })),
      ...recentLeads.map((l) => ({ type: "lead", text: `New lead captured: ${l.fullName}`, at: l.createdAt as Date | null })),
      ...recentPaid.map((p) => ({ type: "purchase", text: `Payment received: ₹${Number(p.amount).toLocaleString("en-IN")}`, at: p.paidAt as Date | null })),
    ]
      .filter((a) => a.at)
      .sort((a, b) => new Date(b.at as Date).getTime() - new Date(a.at as Date).getTime())
      .slice(0, 5);

    return {
      totalUsers: roleCounts.reduce((s, r) => s + Number(r.count), 0),
      customers: roleMap["customer"] || 0,
      resellers: roleMap["reseller"] || 0,
      activeCards: Number(cardCount[0]?.count || 0),
      paidPlans: subMap["active"] || 0,
      trialPlans: subMap["trial"] || 0,
      revenue: Number(revenueRow[0]?.total || 0),
      monthlyRevenue: monthly.map((m) => ({ month: m.ym, amount: Number(m.total) })),
      recentUsers: recentUsers.map((u) => ({ fullName: u.fullName, email: u.email, role: u.role, createdAt: u.createdAt })),
      recentActivity: activity,
    };
  }),
});
