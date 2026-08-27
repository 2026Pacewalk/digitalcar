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

// A published snapshot is served to the PUBLIC by slug, so it must never carry
// account secrets. The card JSON (dc_customer) has historically picked up a few
// non-card fields (a stray `password` from the old change-password flow, the
// e-mail-verification flag); strip them on the way in AND on the way out so a
// leak can never be published and any already-stored leak is never served.
const CUSTOMER_SECRET_KEYS = ["password", "email_verify_on", "email_verify", "otp", "reset_token"];
function sanitizeSnapshot<T>(data: T): T {
  try {
    const d = data as { customer?: Record<string, unknown> } | null;
    if (d && d.customer && typeof d.customer === "object") {
      for (const k of CUSTOMER_SECRET_KEYS) delete d.customer[k];
    }
  } catch { /* never let sanitising break a publish/read */ }
  return data;
}

async function setting(db: ReturnType<typeof getDb>, key: string): Promise<string | null> {
  const r = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return r[0]?.value ?? null;
}

/* Slugs owned by the LEGACY customers.json cards. The public /slug page resolves
   these case-insensitively (boot.ts `/api/card/:slug`), so a new card must not be
   allowed to claim one — otherwise its snapshot would override the legacy card
   (snapshot wins over legacy JSON in PublicCard.tsx). Cached 60s like card-og. */
let legacyCache: Set<string> | null = null;
let legacyOwnerCache: Map<string, string> | null = null;
let legacyAt = 0;
function loadLegacy(): void {
  const now = Date.now();
  if (legacyCache && legacyOwnerCache && now - legacyAt < 60_000) return;
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(fs.readFileSync(path.resolve(p), "utf-8")) as { slug?: string; email?: string }[];
      const owners = new Map<string, string>();
      for (const r of rows) {
        const slug = String(r.slug || "").toLowerCase().trim();
        if (slug) owners.set(slug, String(r.email || "").toLowerCase().trim());
      }
      legacyOwnerCache = owners;
      legacyCache = new Set(owners.keys());
      legacyAt = now;
      return;
    } catch { /* try next path */ }
  }
}
export function legacySlugSet(): Set<string> {
  loadLegacy();
  return legacyCache ?? new Set();
}
/* slug → owner email for the legacy customers.json cards, so the LEGITIMATE
   owner (same email) can publish/reclaim their own legacy slug. */
export function legacySlugOwners(): Map<string, string> {
  loadLegacy();
  return legacyOwnerCache ?? new Map();
}

/* True when `slug` is already owned by anyone OTHER than (ownerUserId, ownerCardId).
   Checks ALL THREE card systems the public /slug page can resolve from — legacy
   customers.json, the relational `cards` table, and `published_cards` snapshots —
   so a slug can never be claimed across systems (the pacewalk cross-system leak). */
export async function slugTakenByOther(
  db: ReturnType<typeof getDb>, slug: string, ownerUserId: number, ownerCardId: number,
  ownerEmail?: string,
): Promise<boolean> {
  const key = slug.toLowerCase().trim();
  // 1) Legacy customers.json (case-insensitive, matching the public resolver).
  //    Taken by "other" UNLESS the caller is the legitimate legacy owner (same
  //    email) reclaiming their own slug — that owner is allowed to publish over
  //    their legacy card (their snapshot then becomes the live version).
  const legacyOwner = legacySlugOwners().get(key);
  if (legacyOwner !== undefined) {
    const email = String(ownerEmail || "").toLowerCase().trim();
    if (!email || legacyOwner !== email) return true;
    // The caller IS the legitimate legacy owner of this slug — they're
    // authoritative for their own URL and must always be able to (re)publish it.
    // Do NOT fall through to relational/snapshot checks: a legacy→new migration
    // can leave a `cards`/`published_cards` row for the same slug under a
    // different internal user id, which would otherwise wrongly flag their own
    // slug as "taken" and silently block every edit from reaching the live card.
    return false;
  }
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
      if (await slugTakenByOther(db, slug, ctx.user.id, cardId, ctx.user.email))
        throw new TRPCError({ code: "CONFLICT", message: "That card URL is already taken." });

      const data = sanitizeSnapshot(input.data);
      const owner = and(eq(publishedCards.userId, ctx.user.id), eq(publishedCards.cardId, cardId));
      const existing = await db.select().from(publishedCards).where(owner);
      if (existing[0]) {
        await db.update(publishedCards).set({ slug, data }).where(owner);
        return { ok: true, publicId: existing[0].publicId };
      }
      const publicId = nanoid(10);
      await db.insert(publishedCards).values({ userId: ctx.user.id, cardId, slug, publicId, data });
      return { ok: true, publicId };
    }),

  // Authed: patch just the DESIGN (theme/colours) of an already-published card,
  // so changing the template on the Templates page updates the LIVE card + QR
  // immediately — no need to re-open the builder and hit Publish again.
  updateDesign: authedQuery
    .input(z.object({
      cardId: z.number().int().positive().default(1),
      theme: z.string(),
      color: z.string().optional(),
      color2: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cardId = input.cardId || 1;
      const owner = and(eq(publishedCards.userId, ctx.user.id), eq(publishedCards.cardId, cardId));
      const rows = await db.select().from(publishedCards).where(owner);
      const row = rows[0];
      if (!row) return { ok: true, published: false }; // not published yet — nothing live to update
      const data = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>;
      const customer = { ...((data.customer as Record<string, unknown>) || {}), theme: input.theme } as Record<string, unknown>;
      if (input.color !== undefined) customer.color = input.color;
      if (input.color2 !== undefined) customer.color2 = input.color2;
      await db.update(publishedCards).set({ data: { ...data, customer } }).where(owner);
      return { ok: true, published: true };
    }),

  // Authed: is a slug free for this user's given card? (live check while editing)
  checkSlug: authedQuery
    .input(z.object({ slug: z.string(), cardId: z.number().int().positive().default(1) }))
    .query(async ({ ctx, input }) => {
      const slug = input.slug.trim().replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
      if (!slug) return { available: false, slug };
      const db = getDb();
      const available = !(await slugTakenByOther(db, slug, ctx.user.id, input.cardId || 1, ctx.user.email));
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
      return rows[0]?.data ? sanitizeSnapshot(rows[0].data) : null;
    }),

  // Public: is this card paused (trial expired past grace, no active plan)?
  // Never deletes data or the URL — just controls what a visitor sees (§11–12).
  publicState: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const mode = (await setting(db, "expiry_mode")) || "deactivate";
    const rows = await db.select({ userId: publishedCards.userId, data: publishedCards.data }).from(publishedCards).where(eq(publishedCards.slug, input.slug)).orderBy(publishedCards.id).limit(1);
    if (!rows[0]) return { paused: false, mode };
    const uid = rows[0].userId;
    const now = Date.now();

    // An active paid subscription always keeps the card live.
    const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, uid)).orderBy(desc(subscriptions.createdAt)).limit(1);
    const sub = subs[0];
    if (sub && sub.status === "active" && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd).getTime() > now)) return { paused: false, mode };

    // Manual / legacy paid plans: admin-set packages live on the card record
    // itself (Gold=5 / Platinum=6 + expired_on) with NO subscriptions row. A
    // valid paid package must keep the card live even after the old trial clock
    // runs out — otherwise paying customers get paused (real prod incident).
    try {
      const cust = ((rows[0].data as { customer?: Record<string, unknown> })?.customer) || {};
      const pkg = Number(cust.package_id);
      if (pkg === 5 || pkg === 6) {
        const exp = String(cust.expired_on || "").trim();
        const expMs = exp ? Date.parse(exp) : NaN;
        // No expiry recorded → treat as live; else valid through the end of that day.
        if (!exp || (Number.isFinite(expMs) && expMs + DAY > now)) return { paused: false, mode };
      }
    } catch { /* malformed snapshot — fall through to trial gating */ }

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
    // Daily series for the last 30 days (IST day buckets) → real charts.
    const IST = 5.5 * 3600_000;
    const dayKey = (t: number) => new Date(t + IST).toISOString().slice(0, 10);
    const dayMap: Record<string, { views: number; taps: number }> = {};
    const dowCounts = [0, 0, 0, 0, 0, 0, 0]; // views by day-of-week (0=Sun)
    for (const r of rows) {
      const t = new Date(r.createdAt).getTime();
      total[r.type] = (total[r.type] || 0) + 1;
      if (now - t <= 30 * DAY) {
        last30[r.type] = (last30[r.type] || 0) + 1;
        const k = dayKey(t);
        (dayMap[k] = dayMap[k] || { views: 0, taps: 0 })[r.type === "view" ? "views" : "taps"]++;
      }
      if (r.type === "view") dowCounts[new Date(t + IST).getUTCDay()]++;
    }
    const daily: { date: string; views: number; taps: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const k = dayKey(now - i * DAY);
      daily.push({ date: k, views: dayMap[k]?.views || 0, taps: dayMap[k]?.taps || 0 });
    }
    return { slug, total, last30, daily, dow: dowCounts };
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
