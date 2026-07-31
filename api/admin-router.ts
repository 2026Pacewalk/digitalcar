import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { publishedCards, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { legacySlugSet, slugTakenByOther } from "./publish-router";

/* Super-admin tools. Today: resolve cross-system card-URL conflicts, where a
   NEW-FLOW snapshot card shares a slug with a LEGACY (customers.json) card and
   — because "snapshot wins over legacy JSON" on the public page — shadows the
   rightful legacy owner (the pacewalk -> Taniya incident). These new-flow
   accounts don't appear in the customers.json-based admin list, so this is the
   only place to see and fix them. Super-admin only. */
export const adminRouter = createRouter({
  // List every snapshot whose slug ALSO belongs to a legacy customers.json card.
  slugConflicts: adminQuery.query(async () => {
    const db = getDb();
    const legacy = legacySlugSet();
    if (!legacy.size) return [];
    const snaps = await db
      .select({
        id: publishedCards.id,
        userId: publishedCards.userId,
        cardId: publishedCards.cardId,
        slug: publishedCards.slug,
        publicId: publishedCards.publicId,
        email: users.email,
        name: users.fullName,
        updatedAt: publishedCards.updatedAt,
      })
      .from(publishedCards)
      .leftJoin(users, eq(users.id, publishedCards.userId));
    return snaps
      .filter((s) => legacy.has(String(s.slug).toLowerCase().trim()))
      .map((s) => ({ ...s, suggested: `${String(s.slug).toLowerCase()}-2` }));
  }),

  // Move a snapshot card off a conflicting URL. Only touches the ONE snapshot
  // row (by userId+cardId); the legacy card is never modified. Guarded so the
  // new slug isn't itself taken. Super-admin only.
  reslugCard: adminQuery
    .input(z.object({
      userId: z.number().int().positive(),
      cardId: z.number().int().positive().default(1),
      newSlug: z.string().min(1).max(191),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const slug = input.newSlug.trim().replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
      if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid URL." });
      if (await slugTakenByOther(db, slug, input.userId, input.cardId))
        throw new TRPCError({ code: "CONFLICT", message: "That URL is already taken — pick another." });
      const owner = and(eq(publishedCards.userId, input.userId), eq(publishedCards.cardId, input.cardId));
      const existing = await db.select({ id: publishedCards.id }).from(publishedCards).where(owner);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "No published card for that account." });
      await db.update(publishedCards).set({ slug }).where(owner);
      return { ok: true, slug };
    }),
});
