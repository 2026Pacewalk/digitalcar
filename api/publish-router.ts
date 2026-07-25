import { z } from "zod";
import { nanoid } from "nanoid";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { publishedCards, cardTrials, subscriptions, appSettings, cardEvents } from "@db/schema";
import { eq, desc } from "drizzle-orm";

const DAY = 86_400_000;
async function setting(db: ReturnType<typeof getDb>, key: string): Promise<string | null> {
  const r = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return r[0]?.value ?? null;
}

/* Published-card snapshots + permanent QR identity.
   On publish, the builder sends the whole card here; the public /slug page
   reads it back. Each card also gets an immutable `public_id` — the target the
   QR/print material binds to (via /q/<public_id>), so a slug change never
   breaks a printed code (Phase 04 / §14). */

export const publishRouter = createRouter({
  // Authed: upsert the signed-in user's snapshot; mint public_id once.
  saveSnapshot: authedQuery
    .input(z.object({ slug: z.string().min(1).max(191), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.select().from(publishedCards).where(eq(publishedCards.userId, ctx.user.id));
      if (existing[0]) {
        await db.update(publishedCards).set({ slug: input.slug, data: input.data }).where(eq(publishedCards.userId, ctx.user.id));
        return { ok: true, publicId: existing[0].publicId };
      }
      const publicId = nanoid(10);
      await db.insert(publishedCards).values({ userId: ctx.user.id, slug: input.slug, publicId, data: input.data });
      return { ok: true, publicId };
    }),

  // Public: fetch the snapshot for a slug (the public card render source).
  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(publishedCards).where(eq(publishedCards.slug, input.slug));
      return rows[0]?.data ?? null;
    }),

  // Public: is this card paused (trial expired past grace, no active plan)?
  // Never deletes data or the URL — just controls what a visitor sees (§11–12).
  publicState: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const mode = (await setting(db, "expiry_mode")) || "deactivate";
    const rows = await db.select({ userId: publishedCards.userId }).from(publishedCards).where(eq(publishedCards.slug, input.slug));
    if (!rows[0]) return { paused: false, mode };
    const uid = rows[0].userId;
    const now = Date.now();

    // An active paid subscription always keeps the card live.
    const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, uid)).orderBy(desc(subscriptions.createdAt)).limit(1);
    const sub = subs[0];
    if (sub && sub.status === "active" && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd).getTime() > now)) return { paused: false, mode };

    const tr = await db.select().from(cardTrials).where(eq(cardTrials.userId, uid));
    const t = tr[0];
    if (!t || t.status === "converted" || t.status === "cancelled") return { paused: false, mode };

    const ends = t.endsAt ? new Date(t.endsAt).getTime() : 0;
    const graceEnabled = (await setting(db, "grace_enabled")) === "1";
    const graceDays = Number(await setting(db, "grace_days")) || 3;
    const graceEnd = ends + (graceEnabled ? graceDays : 0) * DAY;
    return { paused: ends > 0 && now > graceEnd, mode };
  }),

  // Authed: real engagement stats for the signed-in user's card (§36).
  myStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const pc = await db.select({ slug: publishedCards.slug }).from(publishedCards).where(eq(publishedCards.userId, ctx.user.id));
    const slug = pc[0]?.slug;
    if (!slug) return { slug: null, total: {} as Record<string, number>, last30: {} as Record<string, number> };
    const rows = await db.select().from(cardEvents).where(eq(cardEvents.slug, slug));
    const now = Date.now();
    const total: Record<string, number> = {};
    const last30: Record<string, number> = {};
    for (const r of rows) {
      total[r.type] = (total[r.type] || 0) + 1;
      if (now - new Date(r.createdAt).getTime() <= 30 * DAY) last30[r.type] = (last30[r.type] || 0) + 1;
    }
    return { slug, total, last30 };
  }),

  // Authed: the signed-in user's public identity (for the QR / share tools).
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select({ slug: publishedCards.slug, publicId: publishedCards.publicId })
      .from(publishedCards).where(eq(publishedCards.userId, ctx.user.id));
    return rows[0] ?? null;
  }),
});
