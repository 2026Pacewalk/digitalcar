import { z } from "zod";
import { createRouter, teamQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { teamNotifications, teamNotificationMarks } from "@db/schema";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import {
  TEAM_CATEGORIES, TEAM_CATEGORY_KEYS, teamCategoriesFor, teamModulesFor, type TeamCategory,
} from "@contracts/notifications";
import { staffAccessFor } from "./lib/staff-access";

/* What the DigitalCarda team is told: sign-ups, payments to verify, payouts,
   reseller applications, orders, enquiries, deletion requests …
   (api/lib/notify.ts notifyTeam, next to each alert email).

   One row per event. Who sees it is decided here, on every read, from the
   event's staff module: the super admin sees everything, a staff member only
   the modules they were given (so a change of access applies to the past too).
   Read and cleared are per admin (team_notification_marks); "Needs action" is
   shared — once someone handles it, it's handled for everyone.

   Read state: an admin's own mark (read or unread) always wins; with no mark,
   an event counts as read if it happened before their account existed. */

const tn = teamNotifications;
const tm = teamNotificationMarks;
const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const idList = z.array(z.number().int().positive()).min(1).max(500);
const BATCH = 500;

type Me = { id: number; role: string; createdAt: Date | string | null };

/** This admin's view: which modules, and from when things count as new. */
async function viewOf(user: Me) {
  const perms = user.role === "staff" ? (await staffAccessFor(user.id)).permissions : null;
  const modules = teamModulesFor(user.role, perms);
  const since = user.createdAt ? new Date(user.createdAt) : new Date(0);
  return { perms, modules, since: Number.isNaN(since.getTime()) ? new Date(0) : since };
}

const moduleSql = (modules: string[] | null): SQL =>
  modules === null ? sql`TRUE` : modules.length ? inArray(tn.module, modules) : sql`FALSE`;
/** Rows this admin may see and hasn't cleared (needs the marks LEFT JOIN). */
const visible = (modules: string[] | null) => and(moduleSql(modules), isNull(tm.clearedAt))!;
const joinMine = (userId: number) => and(eq(tm.notificationId, tn.id), eq(tm.userId, userId));
const unreadSql = (since: Date) => or(
  and(isNotNull(tm.notificationId), isNull(tm.readAt)),
  and(isNull(tm.notificationId), gt(tn.createdAt, since)),
)!;
const needsActionSql = and(eq(tn.severity, "action"), isNull(tn.resolvedAt))!;
const isOld = (createdAt: Date | string, since: Date) => new Date(createdAt).getTime() <= since.getTime();

/** The rows among `ids` this admin may act on. */
async function visibleRows(modules: string[] | null, ids: number[]) {
  return getDb().select({ id: tn.id, createdAt: tn.createdAt }).from(tn).where(and(inArray(tn.id, ids), moduleSql(modules)));
}

/** Read, unread or cleared, for these rows. A clear leaves the read state as
    it was, so Undo puts things back exactly. */
async function setMarks(userId: number, rows: { id: number; createdAt: Date | string }[], since: Date, what: "read" | "unread" | "clear") {
  if (!rows.length) return;
  const now = new Date();
  const values = rows.map((r) => ({
    notificationId: r.id, userId,
    readAt: what === "read" ? now : what === "unread" ? null : (isOld(r.createdAt, since) ? now : null),
    clearedAt: what === "clear" ? now : null,
  }));
  const set = what === "read" ? { readAt: sql`COALESCE(${tm.readAt}, NOW())` }
    : what === "unread" ? { readAt: null }
    : { clearedAt: now };
  await getDb().insert(tm).values(values).onDuplicateKeyUpdate({ set });
}

const feedInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.object({ at: z.coerce.date(), id: z.number().int().positive() }).nullish(),
  category: z.enum(TEAM_CATEGORY_KEYS).nullish(),
  unreadOnly: z.boolean().optional(),
  needsAction: z.boolean().optional(),
  q: z.string().trim().max(80).optional(),
});

export const teamNotificationRouter = createRouter({
  feed: teamQuery.input(feedInput).query(async ({ ctx, input }) => {
    const db = getDb();
    const { modules, since } = await viewOf(ctx.user);
    const where: SQL[] = [visible(modules)];
    if (input.category) where.push(eq(tn.category, input.category));
    if (input.unreadOnly) where.push(unreadSql(since));
    if (input.needsAction) where.push(needsActionSql);
    if (input.q) {
      const like = `%${esc(input.q)}%`;
      where.push(or(sql`${tn.title} LIKE ${like}`, sql`${tn.message} LIKE ${like}`)!);
    }
    if (input.cursor) {
      const { at, id } = input.cursor;
      where.push(or(lt(tn.createdAt, at), and(eq(tn.createdAt, at), lt(tn.id, id)))!);
    }
    const rows = await db.select({ n: tn, markId: tm.notificationId, readAt: tm.readAt }).from(tn)
      .leftJoin(tm, joinMine(ctx.user.id))
      .where(and(...where))
      .orderBy(desc(tn.createdAt), desc(tn.id)).limit(input.limit + 1);
    const more = rows.length > input.limit;
    const items = rows.slice(0, input.limit).map(({ n, markId, readAt }) => ({
      id: n.id, type: n.type, category: n.category as TeamCategory, severity: n.severity,
      title: n.title, message: n.message, link: n.link, createdAt: n.createdAt,
      isRead: markId ? !!readAt : isOld(n.createdAt, since),
      needsAction: n.severity === "action" && !n.resolvedAt,
      resolvedAt: n.resolvedAt,
    }));
    const last = items[items.length - 1];
    return { items, nextCursor: more && last ? { at: last.createdAt, id: last.id } : null };
  }),

  /* The badge and the chips: unread and total per category, and how many
     events still need someone. */
  summary: teamQuery.query(async ({ ctx }) => {
    const db = getDb();
    const { perms, modules, since } = await viewOf(ctx.user);
    const rows = await db.select({
      category: tn.category,
      total: sql<number>`count(*)`,
      unread: sql<number>`sum(case when ${unreadSql(since)} then 1 else 0 end)`,
      action: sql<number>`sum(case when ${needsActionSql} then 1 else 0 end)`,
    }).from(tn).leftJoin(tm, joinMine(ctx.user.id)).where(visible(modules)).groupBy(tn.category);
    const allowed = teamCategoriesFor(ctx.user.role, perms);
    const categories = TEAM_CATEGORIES.filter((c) => allowed.includes(c.key));
    const byCategory = Object.fromEntries(categories.map((c) => [c.key, { unread: 0, total: 0, action: 0 }])) as Record<TeamCategory, { unread: number; total: number; action: number }>;
    let unread = 0, total = 0, needsAction = 0;
    for (const r of rows) {
      const u = Number(r.unread || 0), n = Number(r.total || 0), a = Number(r.action || 0);
      unread += u; total += n; needsAction += a;
      const c = byCategory[r.category as TeamCategory];
      if (c) { c.unread += u; c.total += n; c.action += a; }
    }
    return { unread, total, needsAction, byCategory, categories };
  }),

  markRead: teamQuery.input(z.object({ ids: idList })).mutation(async ({ ctx, input }) => {
    const { modules, since } = await viewOf(ctx.user);
    await setMarks(ctx.user.id, await visibleRows(modules, input.ids), since, "read");
    return { ok: true };
  }),

  markUnread: teamQuery.input(z.object({ ids: idList })).mutation(async ({ ctx, input }) => {
    const { modules, since } = await viewOf(ctx.user);
    await setMarks(ctx.user.id, await visibleRows(modules, input.ids), since, "unread");
    return { ok: true };
  }),

  // Everything this admin can see (or one chip), newest first, in batches.
  markAllRead: teamQuery
    .input(z.object({ category: z.enum(TEAM_CATEGORY_KEYS).nullish() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { modules, since } = await viewOf(ctx.user);
      const where: SQL[] = [visible(modules), unreadSql(since)];
      if (input?.category) where.push(eq(tn.category, input.category));
      let count = 0;
      for (let i = 0; i < 200; i++) {
        const rows = await getDb().select({ id: tn.id, createdAt: tn.createdAt }).from(tn).leftJoin(tm, joinMine(ctx.user.id))
          .where(and(...where)).orderBy(desc(tn.createdAt), desc(tn.id)).limit(BATCH);
        if (!rows.length) break;
        await setMarks(ctx.user.id, rows, since, "read");
        count += rows.length;
        if (rows.length < BATCH) break;
      }
      return { ok: true, count };
    }),

  dismiss: teamQuery.input(z.object({ ids: idList })).mutation(async ({ ctx, input }) => {
    const { modules, since } = await viewOf(ctx.user);
    const rows = await visibleRows(modules, input.ids);
    await setMarks(ctx.user.id, rows, since, "clear");
    return { ok: true, ids: rows.map((r) => r.id) };
  }),

  restore: teamQuery.input(z.object({ ids: idList })).mutation(async ({ ctx, input }) => {
    await getDb().update(tm).set({ clearedAt: null })
      .where(and(eq(tm.userId, ctx.user.id), isNotNull(tm.clearedAt), inArray(tm.notificationId, input.ids)));
    return { ok: true };
  }),

  /* Clear this admin's list (or one chip). Only their own view: the event
     stays for the rest of the team. Returns the ids for Undo — up to 500. */
  clearAll: teamQuery
    .input(z.object({ category: z.enum(TEAM_CATEGORY_KEYS).nullish() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { modules, since } = await viewOf(ctx.user);
      const where: SQL[] = [visible(modules)];
      if (input?.category) where.push(eq(tn.category, input.category));
      const cleared: number[] = [];
      for (let i = 0; i < 200; i++) {
        const rows = await getDb().select({ id: tn.id, createdAt: tn.createdAt }).from(tn).leftJoin(tm, joinMine(ctx.user.id))
          .where(and(...where)).orderBy(desc(tn.createdAt), desc(tn.id)).limit(BATCH);
        if (!rows.length) break;
        await setMarks(ctx.user.id, rows, since, "clear");
        cleared.push(...rows.map((r) => r.id));
        if (rows.length < BATCH) break;
      }
      return { ok: true, count: cleared.length, ids: cleared.length <= 500 ? cleared : [] };
    }),
});
