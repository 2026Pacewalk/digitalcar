/* Extra card views (contracts/card-views.ts) on the server: the number
 * GET /api/views/:slug (api/boot.ts) adds to a card's tracked visits, and
 * what the super admin's Card views modal reads (api/card-views-router.ts).
 *
 * /api/views runs on every card visit, so each slug's extra views are kept
 * here for a minute. Saving a new number forgets that slug at once, so the
 * card shows it on its next load (the site runs as one process,
 * ecosystem.config.cjs). The database is passed in, so this loads in unit tests.
 *
 * Extra views belong to the card, not the address: they move with it when its
 * address changes (moveExtraViews) and go when its address is freed
 * (clearExtraViews), so they never pass to whoever takes the address next. */
import { and, eq, gt, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { getDb } from "../queries/connection";
import { cardEvents, cardViewBoosts, cards, publishedCards } from "@db/schema";
import { EXTRA_VIEWS_MAX } from "@contracts/card-views";
import { isCardSlug } from "./admin-dashboard";

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const TTL_MS = 60_000;
// Any slug can be asked for (the endpoint is public), so the cache is bounded.
const MAX_SLUGS = 5000;
const cache = new Map<string, { n: number; at: number }>();
// Bumped by every forget, so a read that started before a save can't put the
// old number back in the cache after it.
let generation = 0;

/** The extra views a card carries (0 for almost every card). Never throws:
    if the table can't be read, the last number known for the slug is used,
    else 0, so a database hiccup never breaks the card. */
export async function extraViewsFor(db: Db, slug: string): Promise<number> {
  if (!isCardSlug(slug)) return 0;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.n;
  const gen = generation;
  try {
    const [row] = await db.select({ n: cardViewBoosts.extraViews }).from(cardViewBoosts)
      .where(eq(cardViewBoosts.slug, slug)).limit(1);
    const n = Math.max(0, Number(row?.n) || 0);
    if (gen === generation) {
      if (cache.size >= MAX_SLUGS) cache.clear();
      cache.set(slug, { n, at: Date.now() });
    }
    return n;
  } catch {
    return hit?.n ?? 0;
  }
}

/** After a save: the next /api/views for this card reads the new number. */
export function forgetExtraViews(slug: string): void {
  generation++;
  cache.delete(slug);
}

type Boost = { extraViews: number; note: string | null };

/** A card's extra views moved onto the row its new address may already have:
    the numbers add up (never past EXTRA_VIEWS_MAX), and that row's note stays
    if it has one, else the card's note comes along. */
export function mergedBoost(from: Boost, into: Boost | null): Boost {
  const count = (v: unknown) => Math.max(0, Math.floor(Number(v)) || 0);
  return {
    extraViews: Math.min(EXTRA_VIEWS_MAX, count(into?.extraViews) + count(from.extraViews)),
    note: into?.note || from.note || null,
  };
}

// A row whose card left its address. Kept, at 0, never deleted, so the
// one-time pacewalk seed (INSERT IGNORE) can't bring a number back. No one
// changed it by hand, so it names no one.
const cleared = () => ({ extraViews: 0, note: null, updatedBy: null, updatedAt: sql`CURRENT_TIMESTAMP` });

/** A card moved from one address to another: its extra views and note go with
    it (mergedBoost), and the old address is left at 0 with no note. Nothing
    happens when the old address has neither. Runs in the caller's transaction
    with both rows locked; the caller forgets both slugs once it commits. */
export async function moveExtraViews(tx: Tx, fromSlug: string, toSlug: string): Promise<boolean> {
  const from = fromSlug.trim().toLowerCase();
  const to = toSlug.trim().toLowerCase();
  if (!from || !to || from === to) return false;
  const read = (slug: string) => tx.select({ extraViews: cardViewBoosts.extraViews, note: cardViewBoosts.note })
    .from(cardViewBoosts).where(eq(cardViewBoosts.slug, slug)).limit(1).for("update");
  const [old] = await read(from);
  if (!old || (!(Number(old.extraViews) > 0) && old.note == null)) return false;
  const [cur] = await read(to);
  const next = mergedBoost(old, cur ?? null);
  await tx.insert(cardViewBoosts).values({ slug: to, ...next, updatedBy: null })
    .onDuplicateKeyUpdate({ set: { ...next, updatedBy: null, updatedAt: sql`CURRENT_TIMESTAMP` } });
  await tx.update(cardViewBoosts).set(cleared()).where(eq(cardViewBoosts.slug, from));
  return true;
}

/** Addresses a deleted card (or an erased account) left free: their extra
    views go to 0 and their note goes, so whoever takes the address next starts
    from their own visits. The caller leaves out legacy (customers.json)
    addresses, as it does for card_events; one another card still uses isn't
    free and is left alone. Pass the transaction the card was deleted in, if
    any, and forget the slugs once it commits. */
export async function clearExtraViews(db: Db | Tx, slugs: readonly string[]): Promise<void> {
  const want = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (!want.length) return;
  const pub = await db.select({ slug: publishedCards.slug }).from(publishedCards).where(inArray(publishedCards.slug, want));
  const rel = await db.select({ slug: cards.slug }).from(cards).where(inArray(cards.slug, want));
  const held = new Set([...pub, ...rel].map((r) => String(r.slug).toLowerCase()));
  const free = want.filter((s) => !held.has(s));
  if (!free.length) return;
  await db.update(cardViewBoosts).set(cleared())
    .where(and(inArray(cardViewBoosts.slug, free), or(gt(cardViewBoosts.extraViews, 0), isNotNull(cardViewBoosts.note))));
}

/** Tracked visits: the card's "view" events in card_events, all time. */
export async function realViewsFor(db: Db, slug: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(cardEvents)
    .where(and(eq(cardEvents.slug, slug), eq(cardEvents.type, "view")));
  return Number(row?.n) || 0;
}

/** What the card showed on the old site: the `views` of its customers.json
    row, when that is a positive number. Only the number leaves here, never
    the row, which also holds passwords and bank details. */
export function oldSiteViewsOf(rows: readonly unknown[], slug: string): number | null {
  const want = slug.trim().toLowerCase();
  if (!want) return null;
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const row = r as { slug?: unknown; views?: unknown };
    if (String(row.slug ?? "").trim().toLowerCase() !== want) continue;
    const n = typeof row.views === "number" || typeof row.views === "string" ? Number(row.views) : NaN;
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return null;
}
