import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notifications } from "@db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/* Central notification feed — referral rewards, payouts, plan events,
   and system messages all land in the `notifications` table and are
   surfaced in the top bell. */
export const notificationRouter = createRouter({
  // Latest notifications for the signed-in user
  list: authedQuery
    .input(z.object({ limit: z.number().min(1).max(100).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db.query.notifications.findMany({
        where: eq(notifications.userId, ctx.user.id),
        orderBy: [desc(notifications.createdAt)],
        limit: input?.limit ?? 30,
      });
    }),

  // Unread badge count
  unreadCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
    return { count: Number(rows[0]?.count ?? 0) };
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { ok: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
    return { ok: true };
  }),

  clearAll: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(notifications).where(eq(notifications.userId, ctx.user.id));
    return { ok: true };
  }),
});
