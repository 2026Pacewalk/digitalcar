import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { publishedCards, cards, cardTrials, subscriptions, appSettings, cardEvents } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

const DAY = 86_400_000;
async function setting(db: ReturnType<typeof getDb>, key: string): Promise<string | null> {
  const r = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return r[0]?.value ?? null;
}

/* Slugs owned by the LEGACY customers.json cards. The public /slug page resolves
   these case-insensitively (boot.ts `/api/card/:slug`), so a new card must not be
   allowed to claim one — otherwise its snapshot would override the legacy card
   (snapshot wins over legacy JSON in PublicCard.tsx). Cached 60s like card-og. */
let legacyCache: Set<string> | null = null;
let legacyAt = 0;
export function legacySlugSet(): Set<string> {
  const now = Date.now();
  if (legacyCache && now - legacyAt < 60_000) return legacyCache;
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(fs.readFileSync(path.resolve(p), "utf-8")) as { slug?: string }[];
      legacyCache = new Set(rows.map((r) => String(r.slug || "").toLowerCase().trim()).filter(Boolean));
      legacyAt = now;
      return legacyCache;
    } catch { /* try next path */ }
  }
  return legacyCache ?? new Set();
}

/* True when `slug` is already owned by anyone OTHER than (ownerUserId, ownerCardId).
   Checks ALL THREE card systems the public /slug page can resolve from — legacy
   customers.json, the relational `cards` table, and `published_cards` snapshots —
   so a slug can never be claimed across systems (the pacewalk cross-system leak). */
export async function slugTakenByOther(
  db: ReturnType<typeof getDb>, slug: string, ownerUserId: number, ownerCardId: number,
): Promise<boolean> {
  // 1) Legacy customers.json (case-insensitive, matching the public resolver).
  if (legacySlugSet().has(slug.toLowerCase().trim())) return true;
  // 2) Relational cards — cards.slug is globally unique; taken if another user holds it.
  const rel = await db.select({ userId: cards.userId }).from(cards).where(eq(cards.slug, slug));
  if (rel.some((r) => Number(r.userId) !== ownerUserId)) return true;
  // 3) Other snapshots (another user, or this user's other card).
  const snap = await db.select({ userId: publishedCards.userId, cardId: publishedCards.cardId })
    .from(publishedCards).where(eq(publishedCards.slug, slug));
  return snap.some((t) => !(t.userId === ownerUserId && t.cardId === ownerCardId));
}

/* Published-card snapshots + permanent QR identity.
   On publish, the builder sends the whole card here; the public /slug page
   reads it back. Each card also gets an immutable `public_id` — the target the
   QR/print material binds to (via /q/<public_id>), so a slug change never
   breaks a printed code (Phase 04 / §14). */

export const publishRouter = createRouter({
  // Authed: upsert the signed-in user's snapshot; mint public_id once.
  saveSnapshot: authedQuery
    .input(z.object({ slug: z.string().min(1).max(191), data: z.any(), cardId: z.number().int().positive().default(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cardId = input.cardId || 1;
      // Sanitize to identifier-safe chars (also blocks slug-based XSS in the card).
      const slug = input.slug.trim().replace(/[^a-zA-Z0-9_-]/g, "");
      if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid card URL." });
      // Reject a slug owned by ANY OTHER card — across legacy, relational and
      // snapshot cards — so no card can hijack a victim's URL/leads (Phase 31).
      if (await slugTakenByOther(db, slug, ctx.user.id, cardId))
        throw new TRPCError({ code: "CONFLICT", message: "That card URL is already taken." });

      const owner = and(eq(publishedCards.userId, ctx.user.id), eq(publishedCards.cardId, cardId));
      const existing = await db.select().from(publishedCards).where(owner);
      if (existing[0]) {
        await db.update(publishedCards).set({ slug, data: input.data }).where(owner);
        return { ok: true, publicId: existing[0].publicId };
      }
      const publicId = nanoid(10);
      await db.insert(publishedCards).values({ userId: ctx.user.id, cardId, slug, publicId, data: input.data });
      return { ok: true, publicId };
    }),

  // Authed: is a slug free for this user's given card? (live check while editing)
  checkSlug: authedQuery
    .input(z.object({ slug: z.string(), cardId: z.number().int().positive().default(1) }))
    .query(async ({ ctx, input }) => {
      const slug = input.slug.trim().replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
      if (!slug) return { available: false, slug };
      const db = getDb();
      const available = !(await slugTakenByOther(db, slug, ctx.user.id, input.cardId || 1));
      return { available, slug };
    }),

  // Authed: every published card this user owns (for the My Cards hub).
  myCards: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select({ cardId: publishedCards.cardId, slug: publishedCards.slug, publicId: publishedCards.publicId })
      .from(publishedCards).where(eq(publishedCards.userId, ctx.user.id)).orderBy(publishedCards.cardId);
  }),

  // Authed: unpublish one card (used when a card is deleted). Only ever removes
  // the caller's OWN card row; never touches another user's data.
  removeCard: authedQuery
    .input(z.object({ cardId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(publishedCards).where(and(eq(publishedCards.userId, ctx.user.id), eq(publishedCards.cardId, input.cardId)));
      return { ok: true };
    }),

  // Public: fetch the snapshot for a slug (the public card render source).
  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(publishedCards).where(eq(publishedCards.slug, input.slug)).orderBy(publishedCards.id).limit(1);
      return rows[0]?.data ?? null;
    }),

  // Public: is this card paused (trial expired past grace, no active plan)?
  // Never deletes data or the URL — just controls what a visitor sees (§11–12).
  publicState: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const mode = (await setting(db, "expiry_mode")) || "deactivate";
    const rows = await db.select({ userId: publishedCards.userId }).from(publishedCards).where(eq(publishedCards.slug, input.slug)).orderBy(publishedCards.id).limit(1);
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
  myStats: authedQuery
    .input(z.object({ cardId: z.number().int().positive().default(1) }).optional())
    .query(async ({ ctx, input }) => {
    const db = getDb();
    const cardId = input?.cardId || 1;
    const pc = await db.select({ slug: publishedCards.slug }).from(publishedCards)
      .where(and(eq(publishedCards.userId, ctx.user.id), eq(publishedCards.cardId, cardId)));
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
  // ALWAYS server-scoped to ctx.user (the JWT owner) so copy/share/QR can never
  // surface another account's link. If the requested card has no published row,
  // fall back to this user's primary/first published card rather than null —
  // otherwise the client would fall back to a possibly-stale localStorage slug.
  mine: authedQuery
    .input(z.object({ cardId: z.number().int().positive().default(1) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const cardId = input?.cardId || 1;
      const mineRows = await db.select({ slug: publishedCards.slug, publicId: publishedCards.publicId, cardId: publishedCards.cardId })
        .from(publishedCards).where(eq(publishedCards.userId, ctx.user.id)).orderBy(publishedCards.cardId);
      if (!mineRows.length) return null;
      const exact = mineRows.find((r) => Number(r.cardId) === cardId);
      const pick = exact ?? mineRows[0];
      return { slug: pick.slug, publicId: pick.publicId };
    }),
});
