import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { createRouter, superAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminActivity, cardViewBoosts, users } from "@db/schema";
import {
  CARD_VIEWS_ACTION, EXTRA_VIEWS_MAX, VIEW_NOTE_MAX, cleanViewNote, groupIn, viewsChangeSummary,
  type CardViews, type CardViewsChange,
} from "@contracts/card-views";
import { forgetExtraViews, oldSiteViewsOf, realViewsFor } from "./lib/card-views";
import { isCardSlug, realCards } from "./lib/admin-dashboard";
import { recordActivity } from "./lib/staff-access";

/* Admin → Customers → ⋮ → Card views (contracts/card-views.ts).
 *
 *   get  a card's real visits, its extra views, what the card shows, and the
 *        last few changes
 *   set  saves the extra views and a private note, writes the change to the
 *        activity log, and makes /api/views show the new number at once
 *
 * Super admin only. superAdminQuery lets no other role in, and nothing here is
 * listed in api/lib/staff-access.ts, so it can never be granted to staff. It
 * doesn't log on its own either, so set records its change itself. The card
 * is named by its slug and has to be a real card (realCards). */

type Db = ReturnType<typeof getDb>;
const MODULE = "customers";
const RECENT = 5;

const slugInput = z.string().trim().toLowerCase().min(1, "Pick a card.").max(191, "That isn't a card address.");
const extraViewsInput = z.number({ error: "Enter a number of views." })
  .int("Use a whole number of views.")
  .min(0, "Extra views can't be below 0.")
  .max(EXTRA_VIEWS_MAX, `Extra views can be at most ${groupIn(EXTRA_VIEWS_MAX)}.`);

const fromEpoch = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? null : new Date(Number(v) * 1000).toISOString());

async function cardSlug(db: Db, raw: string): Promise<string> {
  const slug = raw.trim().toLowerCase();
  if (!isCardSlug(slug) || !(await realCards(db, [slug])).real.has(slug)) {
    throw new TRPCError({ code: "NOT_FOUND", message: `There's no card at /${slug.slice(0, 60)}.` });
  }
  return slug;
}

/** The last few changes to this card's views, newest first (admin_activity). */
async function recentChanges(db: Db, slug: string): Promise<CardViewsChange[]> {
  const rows = await db.select({
    at: sql<number>`UNIX_TIMESTAMP(${adminActivity.createdAt})`, by: adminActivity.actorName, summary: adminActivity.summary,
  }).from(adminActivity)
    .where(and(eq(adminActivity.module, MODULE), eq(adminActivity.action, CARD_VIEWS_ACTION), eq(adminActivity.target, slug), eq(adminActivity.status, "ok")))
    .orderBy(desc(adminActivity.createdAt), desc(adminActivity.id)).limit(RECENT);
  return rows.map((r) => ({ at: fromEpoch(r.at) ?? new Date().toISOString(), by: r.by, summary: r.summary }));
}

async function boostOf(db: Db, slug: string) {
  const [row] = await db.select({
    extra: cardViewBoosts.extraViews, note: cardViewBoosts.note,
    // Epoch seconds: the same instant on the IST dev database and the UTC live one.
    at: sql<number>`UNIX_TIMESTAMP(${cardViewBoosts.updatedAt})`, by: users.fullName,
  }).from(cardViewBoosts).leftJoin(users, eq(users.id, cardViewBoosts.updatedBy))
    .where(eq(cardViewBoosts.slug, slug)).limit(1);
  return row ?? null;
}

async function load(db: Db, slug: string, recent?: CardViewsChange[]): Promise<CardViews> {
  const { legacyCustomers } = await import("./admin-router");
  const [boost, realViews, changes] = await Promise.all([boostOf(db, slug), realViewsFor(db, slug), recent ?? recentChanges(db, slug)]);
  const extraViews = Math.max(0, Number(boost?.extra) || 0);
  return {
    slug, realViews, extraViews, shownViews: realViews + extraViews,
    note: boost?.note ?? null,
    updatedAt: boost ? fromEpoch(boost.at) : null,
    updatedByName: boost?.by ?? null,
    oldSiteViews: oldSiteViewsOf(legacyCustomers(), slug),
    recent: changes,
  };
}

export const cardViewsRouter = createRouter({
  get: superAdminQuery
    .input(z.object({ slug: slugInput }))
    .query(async ({ input }): Promise<CardViews> => {
      const db = getDb();
      return load(db, await cardSlug(db, input.slug));
    }),

  // note: left out = keep the one saved; "" = remove it.
  set: superAdminQuery
    .input(z.object({ slug: slugInput, extraViews: extraViewsInput, note: z.string().max(2000, `Keep the note to ${VIEW_NOTE_MAX} characters.`).optional() }))
    .mutation(async ({ ctx, input }): Promise<CardViews> => {
      const db = getDb();
      const slug = await cardSlug(db, input.slug);
      const typed = input.note === undefined ? undefined : cleanViewNote(input.note);
      if (typed && typed.length > VIEW_NOTE_MAX) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Keep the note to ${VIEW_NOTE_MAX} characters.` });
      }
      const [before, recent] = await Promise.all([boostOf(db, slug), recentChanges(db, slug)]);
      const from = Math.max(0, Number(before?.extra) || 0);
      const note = typed === undefined ? before?.note ?? null : typed;
      const noteChanged = note !== (before?.note ?? null);
      // Nothing new: nothing to save or log.
      if (from === input.extraViews && !noteChanged) return load(db, slug, recent);

      // Upsert. "Remove" saves 0 and keeps the row, so the one-time seed never
      // comes back. updated_at from the database clock, like created_at.
      await db.insert(cardViewBoosts).values({ slug, extraViews: input.extraViews, note, updatedBy: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { extraViews: input.extraViews, note, updatedBy: ctx.user.id, updatedAt: sql`CURRENT_TIMESTAMP` } });
      forgetExtraViews(slug);

      const summary = viewsChangeSummary(slug, from, input.extraViews, noteChanged);
      recordActivity({ actor: ctx.user, module: MODULE, action: CARD_VIEWS_ACTION, target: slug, summary, req: ctx.req });
      // The log is written in the background, so this change is added by hand.
      const change: CardViewsChange = { at: new Date().toISOString(), by: ctx.user.fullName || ctx.user.email, summary };
      return load(db, slug, [change, ...recent].slice(0, RECENT));
    }),
});
