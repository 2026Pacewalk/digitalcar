import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notifications, subscriptions } from "@db/schema";
import { eq, desc, and, sql, isNull, isNotNull, inArray, or, lt, gt, type SQL } from "drizzle-orm";
import { legacyPlanOf, PAID_PACKAGE_IDS } from "./lib/entitlement";
import {
  USER_CATEGORIES, USER_CATEGORY_KEYS, userCategory, userCategoryMatcher, type UserCategory,
} from "@contracts/notifications";

/* A customer's or reseller's own notifications — enquiries, plan and billing,
   NFC orders, rewards and payouts, account changes — shown in the bell and on
   the notifications page.

   "Clear" hides a row (cleared_at) rather than deleting it: the daily jobs
   (cron/lifecycle, billing, trial-emails, lead-followups) use these rows, keyed
   by type, as their send-once record, and a deleted row would re-send.

   The first procedures keep their original shapes, because the mobile app
   (which can't be updated in step with the site) calls them. */

type Audience = "customer" | "reseller";
const audienceOf = (role: string): Audience => (role === "reseller" ? "reseller" : "customer");

const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** SQL for "this row's type belongs to `category`" (contracts/notifications.ts). */
function categoryWhere(category: UserCategory, audience: Audience): SQL {
  const m = userCategoryMatcher(category, audience);
  const parts: SQL[] = [];
  if (m.exact.length) parts.push(inArray(notifications.type, m.exact));
  for (const p of m.prefixes) parts.push(sql`${notifications.type} LIKE ${`${esc(p)}%`}`);
  const any = parts.length ? or(...parts)! : sql`FALSE`;
  return m.mode === "in" ? any : sql`NOT (${any})`;
}

const mine = (userId: number) => and(eq(notifications.userId, userId), isNull(notifications.clearedAt))!;
const idList = z.array(z.number().int().positive()).min(1).max(500);

/* A plan recorded on the old site (customers.json) ending soon or just ended.
   Plans bought here get the daily reminders (cron/billing.ts) in the bell;
   these don't, so the bell shows this notice until the customer dismisses it. */
async function legacyExpiry(user: { id: number; email: string; role: string }) {
  if (user.role !== "customer") return null;
  try {
    const plan = legacyPlanOf(user.email);
    if (!plan?.expiredOn || !PAID_PACKAGE_IDS.has(plan.packageId)) return null;
    const ends = Date.parse(plan.expiredOn);
    if (!Number.isFinite(ends)) return null;
    const days = Math.ceil((ends - Date.now()) / 86_400_000);
    if (days > 7 || days < -3) return null;
    const [sub] = await getDb().select({ id: subscriptions.id }).from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active"), gt(subscriptions.currentPeriodEnd, new Date()))).limit(1);
    if (sub) return null; // renewed here: the billing reminders cover it
    return { planName: plan.packageId === 6 ? "Platinum" : "Gold", endsOn: plan.expiredOn, daysLeft: days };
  } catch {
    return null;
  }
}

const shape = (n: typeof notifications.$inferSelect, audience: Audience) => ({
  id: n.id, type: n.type, category: userCategory(n.type, audience),
  title: n.title, message: n.message, link: n.link, isRead: n.isRead, createdAt: n.createdAt,
});

export const notificationRouter = createRouter({
  // Latest notifications (the mobile app's list).
  list: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db.query.notifications.findMany({
        where: mine(ctx.user.id),
        orderBy: [desc(notifications.createdAt), desc(notifications.id)],
        limit: input?.limit ?? 30,
      });
    }),

  // Unread badge count.
  unreadCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(mine(ctx.user.id), eq(notifications.isRead, false)));
    return { count: Number(rows[0]?.count ?? 0) };
  }),

  /* The bell and the notifications page: filter by chip, unread only or a
     search, newest first, a page at a time. */
  feed: authedQuery
    .input(z.object({
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.object({ at: z.coerce.date(), id: z.number().int().positive() }).nullish(),
      category: z.enum(USER_CATEGORY_KEYS).nullish(),
      unreadOnly: z.boolean().optional(),
      q: z.string().trim().max(80).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const audience = audienceOf(ctx.user.role);
      const where: SQL[] = [mine(ctx.user.id)];
      if (input.category) where.push(categoryWhere(input.category, audience));
      if (input.unreadOnly) where.push(eq(notifications.isRead, false));
      if (input.q) {
        const like = `%${esc(input.q)}%`;
        where.push(or(sql`${notifications.title} LIKE ${like}`, sql`${notifications.message} LIKE ${like}`)!);
      }
      if (input.cursor) {
        const { at, id } = input.cursor;
        where.push(or(lt(notifications.createdAt, at), and(eq(notifications.createdAt, at), lt(notifications.id, id)))!);
      }
      const rows = await db.select().from(notifications).where(and(...where))
        .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(input.limit + 1);
      const more = rows.length > input.limit;
      const items = rows.slice(0, input.limit).map((n) => shape(n, audience));
      const last = items[items.length - 1];
      return { items, nextCursor: more && last ? { at: last.createdAt, id: last.id } : null };
    }),

  /* Counts for the badge and the chips: unread and total, per chip. */
  summary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const audience = audienceOf(ctx.user.role);
    const rows = await db.select({
      type: notifications.type,
      total: sql<number>`count(*)`,
      unread: sql<number>`sum(case when ${notifications.isRead} = 0 then 1 else 0 end)`,
    }).from(notifications).where(mine(ctx.user.id)).groupBy(notifications.type);
    const byCategory = Object.fromEntries(USER_CATEGORIES[audience].map((c) => [c.key, { unread: 0, total: 0 }])) as Record<UserCategory, { unread: number; total: number }>;
    let unread = 0, total = 0;
    for (const r of rows) {
      const c = userCategory(r.type, audience);
      const u = Number(r.unread || 0), n = Number(r.total || 0);
      unread += u; total += n;
      if (byCategory[c]) { byCategory[c].unread += u; byCategory[c].total += n; }
    }
    return { unread, total, byCategory, categories: USER_CATEGORIES[audience], expiry: await legacyExpiry(ctx.user) };
  }),

  // Mark one (the app sends { id }) or several read.
  markRead: authedQuery
    .input(z.object({ id: z.number().int().positive().optional(), ids: idList.optional() }))
    .mutation(async ({ ctx, input }) => {
      const ids = input.ids ?? (input.id ? [input.id] : []);
      if (!ids.length) return { ok: true };
      await getDb().update(notifications).set({ isRead: true })
        .where(and(eq(notifications.userId, ctx.user.id), inArray(notifications.id, ids)));
      return { ok: true };
    }),

  markUnread: authedQuery
    .input(z.object({ ids: idList }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(notifications).set({ isRead: false })
        .where(and(eq(notifications.userId, ctx.user.id), inArray(notifications.id, input.ids)));
      return { ok: true };
    }),

  // Everything read — or everything under one chip.
  markAllRead: authedQuery
    .input(z.object({ category: z.enum(USER_CATEGORY_KEYS).nullish() }).optional())
    .mutation(async ({ ctx, input }) => {
      const where: SQL[] = [mine(ctx.user.id), eq(notifications.isRead, false)];
      if (input?.category) where.push(categoryWhere(input.category, audienceOf(ctx.user.role)));
      await getDb().update(notifications).set({ isRead: true }).where(and(...where));
      return { ok: true };
    }),

  // Hide some from the bell (they can be brought back, as they were, with `restore`).
  dismiss: authedQuery
    .input(z.object({ ids: idList }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(notifications).set({ clearedAt: new Date() })
        .where(and(mine(ctx.user.id), inArray(notifications.id, input.ids)));
      return { ok: true, ids: input.ids };
    }),

  restore: authedQuery
    .input(z.object({ ids: idList }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(notifications).set({ clearedAt: null })
        .where(and(eq(notifications.userId, ctx.user.id), isNotNull(notifications.clearedAt), inArray(notifications.id, input.ids)));
      return { ok: true };
    }),

  /* Clear everything (or one chip). Returns what was cleared so "Undo" can
     restore exactly that — up to 500; a bigger clear can't be undone. */
  clearAll: authedQuery
    .input(z.object({ category: z.enum(USER_CATEGORY_KEYS).nullish() }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const where: SQL[] = [mine(ctx.user.id)];
      if (input?.category) where.push(categoryWhere(input.category, audienceOf(ctx.user.role)));
      const rows = await db.select({ id: notifications.id }).from(notifications).where(and(...where)).limit(501);
      const res = await db.update(notifications).set({ clearedAt: new Date() }).where(and(...where));
      const count = Number((res as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
        ?? (res as unknown as { affectedRows?: number })?.affectedRows ?? rows.length);
      return { ok: true, count, ids: rows.length <= 500 ? rows.map((r) => r.id) : [] };
    }),

  /* What the owner wants to hear about. One switch per kind of message, for
     push and email alike (api/lib/notify-prefs.ts); the bell keeps everything
     either way, and account, security and payment mail is never affected. */
  prefs: authedQuery.query(async ({ ctx }) => {
    const { getPrefs } = await import("./lib/notify-prefs");
    return getPrefs(ctx.user.id);
  }),

  setPrefs: authedQuery
    .input(z.object({
      enquiries: z.boolean().optional(),
      followUps: z.boolean().optional(),
      plan: z.boolean().optional(),
      rewards: z.boolean().optional(),
      tips: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { setPrefs } = await import("./lib/notify-prefs");
      return setPrefs(ctx.user.id, input);
    }),
});
