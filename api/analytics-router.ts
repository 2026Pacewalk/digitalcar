import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { analyticsEvents, cards, users, subscriptions, invoices, leads, funnelEvents, products } from "@db/schema";
import { eq, and, sql, gte, desc, inArray, isNotNull } from "drizzle-orm";
import { mergedCustomerCount } from "./admin-router";

/* ── Deep card insights ────────────────────────────────────────────────────
   Everything the customer Analytics page needs, in ONE round trip, computed
   with SQL aggregation.

   Why not reuse publish.myStats: that loads EVERY event row for a slug into
   node and reduces in JavaScript. Fine at a few hundred rows, ruinous at a few
   hundred thousand — and it can only ever answer "how many", never "of what".
   These queries group in MySQL and lean on the (slug, type, created_at) index. */

// Types that represent a deliberate visitor ACTION (everything except the
// passive page-level signals) — used for the "actions" and engagement figures.
const PASSIVE_TYPES = ["view", "section_view", "scroll", "time_on_card", "card_exit"];

export const analyticsRouter = createRouter({
  /* The signed-in owner's deep report for ONE of their cards.
     Server-scoped to ctx.user, so a card id/slug can never leak another
     account's analytics. */
  insights: authedQuery
    .input(z.object({
      cardId: z.number().int().positive().default(1),
      days: z.number().int().min(1).max(365).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const days = input?.days ?? 30;
      const cardId = input?.cardId ?? 1;
      const { publishedCards, cardEvents } = await import("@db/schema");

      // Resolve the slug from the OWNER's published cards only.
      const owned = await db.select({ slug: publishedCards.slug, cardId: publishedCards.cardId })
        .from(publishedCards).where(eq(publishedCards.userId, ctx.user.id)).orderBy(publishedCards.cardId);
      const slug = (owned.find((r) => r.cardId === cardId) || owned[0])?.slug;

      const empty = {
        slug: null as string | null, days,
        totals: { views: 0, visitors: 0, returning: 0, actions: 0, leads: 0, avgTimeMs: 0 },
        prev: { views: 0, visitors: 0, actions: 0, leads: 0 },
        daily: [] as { date: string; views: number; actions: number }[],
        byType: [] as { key: string; n: number }[],
        topProducts: [] as { key: string; n: number }[],
        topSections: [] as { key: string; n: number }[],
        bySource: [] as { key: string; n: number }[],
        byDevice: [] as { key: string; n: number }[],
        byCity: [] as { key: string; n: number }[],
        heatmap: [] as { dow: number; hour: number; n: number }[],
        scroll: { d25: 0, d50: 0, d75: 0, d100: 0 },
        funnel: { views: 0, engaged: 0, enquiryStart: 0, enquiry: 0 },
      };
      if (!slug) return empty;

      const DAYMS = 86_400_000;
      const now = Date.now();
      const from = new Date(now - days * DAYMS);
      const prevFrom = new Date(now - 2 * days * DAYMS);

      const inRange = and(eq(cardEvents.slug, slug), gte(cardEvents.createdAt, from));
      const inPrev = and(eq(cardEvents.slug, slug), gte(cardEvents.createdAt, prevFrom), sql`${cardEvents.createdAt} < ${from}`);
      const passive = PASSIVE_TYPES.map((t) => `'${t}'`).join(",");

      // A single grouped pass per dimension. `label`/`source`/… are NULL on old
      // rows, so every breakdown filters NULLs out rather than showing a blank.
      const grouped = (col: typeof cardEvents.label, where = inRange, limit = 12) =>
        db.select({ key: sql<string>`${col}`, n: sql<number>`count(*)` })
          .from(cardEvents).where(and(where, isNotNull(col), sql`${col} <> ''`))
          .groupBy(sql`${col}`).orderBy(desc(sql`count(*)`)).limit(limit);

      const [
        totalsRow, prevRow, dailyRows, typeRows, productRows, sectionRows,
        sourceRows, deviceRows, cityRows, heatRows, scrollRows, funnelRows,
      ] = await Promise.all([
        // Headline totals for the window.
        db.select({
          views: sql<number>`sum(case when ${cardEvents.type} = 'view' then 1 else 0 end)`,
          actions: sql<number>`sum(case when ${cardEvents.type} not in (${sql.raw(passive)}) then 1 else 0 end)`,
          visitors: sql<number>`count(distinct ${cardEvents.visitorId})`,
          avgTimeMs: sql<number>`avg(case when ${cardEvents.type} = 'time_on_card' then ${cardEvents.durationMs} end)`,
        }).from(cardEvents).where(inRange),
        // Same figures for the PREVIOUS window → up/down comparison.
        db.select({
          views: sql<number>`sum(case when ${cardEvents.type} = 'view' then 1 else 0 end)`,
          actions: sql<number>`sum(case when ${cardEvents.type} not in (${sql.raw(passive)}) then 1 else 0 end)`,
          visitors: sql<number>`count(distinct ${cardEvents.visitorId})`,
        }).from(cardEvents).where(inPrev),
        // Daily series (IST buckets so "today" matches the owner's day).
        db.select({
          date: sql<string>`date(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`,
          views: sql<number>`sum(case when ${cardEvents.type} = 'view' then 1 else 0 end)`,
          actions: sql<number>`sum(case when ${cardEvents.type} not in (${sql.raw(passive)}) then 1 else 0 end)`,
        }).from(cardEvents).where(inRange)
          .groupBy(sql`date(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`)
          .orderBy(sql`date(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`),
        db.select({ key: sql<string>`${cardEvents.type}`, n: sql<number>`count(*)` })
          .from(cardEvents).where(inRange).groupBy(sql`${cardEvents.type}`).orderBy(desc(sql`count(*)`)),
        // Which products pull — the single most actionable table on the page.
        db.select({ key: sql<string>`${cardEvents.label}`, n: sql<number>`count(*)` })
          .from(cardEvents)
          .where(and(inRange, isNotNull(cardEvents.label), inArray(cardEvents.type, ["product_click", "product_enquiry", "offer_click"])))
          .groupBy(sql`${cardEvents.label}`).orderBy(desc(sql`count(*)`)).limit(10),
        db.select({ key: sql<string>`${cardEvents.label}`, n: sql<number>`count(*)` })
          .from(cardEvents).where(and(inRange, eq(cardEvents.type, "section_view"), isNotNull(cardEvents.label)))
          .groupBy(sql`${cardEvents.label}`).orderBy(desc(sql`count(*)`)).limit(12),
        grouped(cardEvents.source as unknown as typeof cardEvents.label),
        grouped(cardEvents.device as unknown as typeof cardEvents.label, inRange, 5),
        grouped(cardEvents.city as unknown as typeof cardEvents.label, inRange, 10),
        // When are people actually looking? (IST day-of-week × hour)
        db.select({
          dow: sql<number>`dayofweek(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`,
          hour: sql<number>`hour(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`,
          n: sql<number>`count(*)`,
        }).from(cardEvents).where(and(inRange, eq(cardEvents.type, "view")))
          .groupBy(sql`dayofweek(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`, sql`hour(convert_tz(${cardEvents.createdAt}, '+00:00', '+05:30'))`),
        db.select({ key: sql<string>`${cardEvents.label}`, n: sql<number>`count(*)` })
          .from(cardEvents).where(and(inRange, eq(cardEvents.type, "scroll"), isNotNull(cardEvents.label)))
          .groupBy(sql`${cardEvents.label}`),
        // Enquiry funnel: reached the card → engaged → opened the form → sent.
        db.select({
          views: sql<number>`count(distinct case when ${cardEvents.type} = 'view' then ${cardEvents.visitorId} end)`,
          engaged: sql<number>`count(distinct case when ${cardEvents.type} not in (${sql.raw(passive)}) then ${cardEvents.visitorId} end)`,
          enquiryStart: sql<number>`count(distinct case when ${cardEvents.type} = 'enquiry_start' then ${cardEvents.visitorId} end)`,
          enquiry: sql<number>`count(distinct case when ${cardEvents.type} = 'enquiry' then ${cardEvents.visitorId} end)`,
        }).from(cardEvents).where(inRange),
      ]);

      // Visitors seen on more than one distinct day in the window = returning.
      // Raw execute: a derived table is clearer here than a query-builder
      // subquery, and drizzle's .from(sql`…`.as()) drops the inner SELECT.
      let returningCount = 0;
      try {
        const res = await db.execute(sql`
          select count(*) as n from (
            select visitor_id from card_events
            where slug = ${slug} and created_at >= ${from} and visitor_id is not null
            group by visitor_id
            having count(distinct date(created_at)) > 1
          ) t`);
        // mysql2 returns [rows, fields]; drizzle may hand back either shape.
        const rows = (Array.isArray(res) ? res[0] : res) as unknown as { n?: number }[];
        returningCount = Number(rows?.[0]?.n || 0);
      } catch { returningCount = 0; }

      const leadRows = await db.select({ n: sql<number>`count(*)` }).from(leads)
        .where(and(eq(leads.userId, ctx.user.id), gte(leads.createdAt, from)));
      const prevLeadRows = await db.select({ n: sql<number>`count(*)` }).from(leads)
        .where(and(eq(leads.userId, ctx.user.id), gte(leads.createdAt, prevFrom), sql`${leads.createdAt} < ${from}`));

      const num = (v: unknown) => Number(v || 0);
      const list = (rows: { key: string | null; n: unknown }[]) =>
        rows.filter((r) => r.key != null && String(r.key).trim() !== "").map((r) => ({ key: String(r.key), n: num(r.n) }));
      const scrollAt = (d: string) => num(scrollRows.find((r) => String(r.key) === d)?.n);

      // Fill every day in the window so the chart has no gaps.
      const IST = 5.5 * 3600_000;
      const dayKey = (t: number) => new Date(t + IST).toISOString().slice(0, 10);
      const dmap = new Map(dailyRows.map((r) => [String(r.date).slice(0, 10), r]));
      const daily: { date: string; views: number; actions: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const k = dayKey(now - i * DAYMS);
        const hit = dmap.get(k);
        daily.push({ date: k, views: num(hit?.views), actions: num(hit?.actions) });
      }

      return {
        slug, days,
        totals: {
          views: num(totalsRow[0]?.views),
          visitors: num(totalsRow[0]?.visitors),
          returning: returningCount,
          actions: num(totalsRow[0]?.actions),
          leads: num(leadRows[0]?.n),
          avgTimeMs: Math.round(num(totalsRow[0]?.avgTimeMs)),
        },
        prev: {
          views: num(prevRow[0]?.views),
          visitors: num(prevRow[0]?.visitors),
          actions: num(prevRow[0]?.actions),
          leads: num(prevLeadRows[0]?.n),
        },
        daily,
        byType: list(typeRows),
        topProducts: list(productRows),
        topSections: list(sectionRows),
        bySource: list(sourceRows),
        byDevice: list(deviceRows),
        byCity: list(cityRows),
        // MySQL DAYOFWEEK() is 1=Sunday; normalise to 0=Sunday.
        heatmap: heatRows.map((r) => ({ dow: (num(r.dow) + 6) % 7, hour: num(r.hour), n: num(r.n) })),
        scroll: { d25: scrollAt("25"), d50: scrollAt("50"), d75: scrollAt("75"), d100: scrollAt("100") },
        funnel: {
          views: num(funnelRows[0]?.views),
          engaged: num(funnelRows[0]?.engaged),
          enquiryStart: num(funnelRows[0]?.enquiryStart),
          enquiry: num(funnelRows[0]?.enquiry),
        },
      };
    }),

  // Admin: per-product funnel — which designs drive views → try → publish (§61).
  productFunnel: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({ slug: funnelEvents.productSlug, stage: funnelEvents.stage, n: sql<number>`count(*)` })
      .from(funnelEvents).where(isNotNull(funnelEvents.productSlug)).groupBy(funnelEvents.productSlug, funnelEvents.stage);
    const prodRows = await db.select({ slug: products.slug, name: products.name }).from(products);
    const map: Record<string, Record<string, number>> = {};
    for (const r of rows) { if (!r.slug) continue; (map[r.slug] ??= {})[r.stage] = Number(r.n); }
    return prodRows.map((p) => {
      const m = map[p.slug] || {};
      const views = m.product_view ?? 0;
      const published = m.published ?? 0;
      return {
        slug: p.slug, name: p.name, views,
        demo: m.demo_view ?? 0, tryFree: m.try_free ?? 0,
        registration: m.registration ?? 0, published,
        convRate: views ? Math.round((published / views) * 100) : 0,
      };
    }).filter((x) => x.views > 0 || x.tryFree > 0 || x.published > 0)
      .sort((a, b) => b.views - a.views);
  }),

  // Admin: conversion funnel counts by stage (§62).
  funnel: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({ stage: funnelEvents.stage, n: sql<number>`count(*)` }).from(funnelEvents).groupBy(funnelEvents.stage);
    const c = Object.fromEntries(rows.map((r) => [r.stage, Number(r.n)])) as Record<string, number>;
    const at = (s: string) => c[s] ?? 0;
    return {
      steps: [
        { key: "product_view", label: "Product Views", count: at("product_view") },
        { key: "demo_view", label: "Demo Views", count: at("demo_view") },
        { key: "try_free", label: "Try-Free Clicks", count: at("try_free") },
        { key: "registration", label: "Registrations", count: at("registration") },
        { key: "published", label: "Cards Published", count: at("published") },
        { key: "payment", label: "Paid Conversions", count: at("payment") },
      ],
    };
  }),

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
    .query(async ({ ctx, input }) => {
      const db = getDb();
      // Only the signed-in user's own cards (never platform-wide data).
      const userCards = await db.query.cards.findMany({
        where: eq(cards.userId, ctx.user.id),
        columns: { id: true },
      });
      let cardIds = userCards.map((c) => c.id);
      // If a specific card is requested, honour it only if they own it.
      if (input?.cardId) cardIds = cardIds.filter((id) => id === input.cardId);
      if (cardIds.length === 0) return { sources: [] };

      const conditions = [inArray(analyticsEvents.cardId, cardIds), eq(analyticsEvents.eventType, "view")];
      if (input?.dateFrom) conditions.push(gte(analyticsEvents.createdAt, input.dateFrom));

      const sources = await db
        .select({ referrer: analyticsEvents.referrer, count: sql<number>`count(*)` })
        .from(analyticsEvents)
        .where(and(...conditions))
        .groupBy(analyticsEvents.referrer);

      return {
        sources: sources.map((s) => ({ source: s.referrer || "Direct", count: Number(s.count) })),
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

    // Match the /admin/customers list exactly: legacy customers.json + new-flow
    // DB accounts (deduped, minus hidden), so the Dashboard cards never diverge.
    const merged = await mergedCustomerCount(db);
    return {
      totalUsers: merged.total + merged.superAdmins,
      customers: merged.total,
      resellers: merged.resellers || roleMap["reseller"] || 0,
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
