import { z } from "zod";
import { nanoid } from "nanoid";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cards, cardBlocks, analyticsEvents, subscriptions, users } from "@db/schema";
import { eq, desc, and, sql, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/** Turn a person's name into a URL-safe slug fragment. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "card";
}

/** The package of the user's currently-active (non-expired) subscription, or
    null. Used for server-side entitlement + quota checks (Phase 31 §44/§45). */
async function activeSubPackage(db: ReturnType<typeof getDb>, userId: number) {
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), sql`${subscriptions.status} in ('trial','active')`),
    with: { package: true },
    orderBy: [desc(subscriptions.createdAt)],
  });
  if (!sub) return null;
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() < Date.now()) return null;
  return sub.package ?? null;
}

export const cardRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { page = 1, limit = 25, status } = input || {};
      const offset = (page - 1) * limit;

      let conditions = [eq(cards.userId, ctx.user.id)];
      if (status) {
        conditions.push(eq(cards.status, status as "draft" | "published" | "archived"));
      }

      const [cardList, totalResult] = await Promise.all([
        db.query.cards.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: [desc(cards.updatedAt)],
          with: { blocks: true },
        }),
        db.select({ count: sql<number>`count(*)` })
          .from(cards)
          .where(and(...conditions)),
      ]);

      return {
        cards: cardList,
        total: totalResult[0]?.count || 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });
      return card;
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: eq(cards.slug, input.slug),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
      if (!card) return null;
      // Draft / archived cards are visible only to their owner (for preview),
      // never to the public by guessing a slug.
      if (card.status !== "published" && ctx.user?.id !== card.userId) return null;
      // Attach the owner's referral code so the public card's
      // "Create Your Free Card" CTA can credit them for the referral.
      const owner = await db.query.users.findFirst({
        where: eq(users.id, card.userId),
        columns: { referralCode: true, role: true },
      });
      // Pause the public card if the owner's trial/plan has expired.
      let ownerPaused = false;
      if (owner && owner.role !== "super_admin") {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, card.userId),
          orderBy: [desc(subscriptions.createdAt)],
        });
        if (sub) {
          const ended = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) < new Date() : false;
          ownerPaused = ["expired", "cancelled", "suspended"].includes(sub.status) || ended;
        }
      }
      return { ...card, ownerReferralCode: owner?.referralCode ?? null, ownerPaused };
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string(),
        templateId: z.number().optional(),
        slug: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.cards.findFirst({
        where: eq(cards.slug, input.slug),
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" });

      // Quota: enforce the active plan's maxCards (mirrors bulkCreate — Phase 31).
      const [usedRow] = await db.select({ count: sql<number>`count(*)` }).from(cards).where(eq(cards.userId, ctx.user.id));
      const used = Number(usedRow?.count || 0);
      const pkg = await activeSubPackage(db, ctx.user.id);
      const maxCards = pkg?.maxCards ?? 0; // 0 = unlimited / not enforced
      if (maxCards > 0 && used + 1 > maxCards) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Your plan allows ${maxCards} card${maxCards === 1 ? "" : "s"}. Upgrade your plan to create more.` });
      }

      const result = await db.insert(cards).values({
        userId: ctx.user.id,
        title: input.title,
        slug: input.slug,
        templateId: input.templateId || null,
        status: "draft",
        language: "en",
      }).$returningId();

      return db.query.cards.findFirst({
        where: eq(cards.id, result[0].id),
        with: { blocks: true },
      });
    }),

  /**
   * Bulk-create digital cards for a whole team under the current user's account
   * (Model A: one company account owns all the cards). Each member gets their own
   * card plus a starter Profile Header + Contact Info block, personalized with their
   * details. Enforces the subscription's maxCards quota when a package is active.
   */
  bulkCreate: authedQuery
    .input(
      z.object({
        companyName: z.string().max(255).optional(),
        templateId: z.number().optional(),
        publish: z.boolean().optional(),
        members: z
          .array(
            z.object({
              name: z.string().trim().min(1, "Name is required").max(255),
              designation: z.string().max(255).optional(),
              phone: z.string().max(50).optional(),
              email: z.string().max(255).optional(),
            })
          )
          .min(1, "Add at least one member")
          .max(500, "Bulk orders are limited to 500 cards at a time"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // ── 1) Quota check against the active subscription's package ──
      const [usedRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(cards)
        .where(eq(cards.userId, ctx.user.id));
      const used = Number(usedRow?.count || 0);

      const activeSub = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, ctx.user.id),
          sql`${subscriptions.status} in ('trial','active')`
        ),
        with: { package: true },
        orderBy: [desc(subscriptions.createdAt)],
      });

      const maxCards = activeSub?.package?.maxCards ?? 0;
      // maxCards <= 0 is treated as "unlimited / not enforced" (e.g. no plan yet).
      if (maxCards > 0 && used + input.members.length > maxCards) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your plan allows ${maxCards} cards. You have ${used}, so you can add ${Math.max(
            0,
            maxCards - used
          )} more. Upgrade your plan to create ${input.members.length} cards.`,
        });
      }

      // ── 2) Create one card (+ starter blocks) per member ──
      const status = input.publish ? "published" : "draft";
      const created: { id: number; slug: string; title: string }[] = [];

      for (const m of input.members) {
        const slug = `${slugify(m.name)}-${nanoid(6).toLowerCase()}`;

        const [row] = await db
          .insert(cards)
          .values({
            userId: ctx.user.id,
            title: m.name,
            slug,
            templateId: input.templateId ?? null,
            status,
            language: "en",
            publishedAt: input.publish ? new Date() : null,
          })
          .$returningId();

        await db.insert(cardBlocks).values([
          {
            cardId: row.id,
            type: "profile_header",
            position: 0,
            config: {},
            content: {
              name: m.name,
              title: m.designation ?? "",
              company: input.companyName ?? "",
              bio: "",
            },
          },
          {
            cardId: row.id,
            type: "contact_info",
            position: 1,
            config: {},
            content: {
              phone: m.phone ?? "",
              email: m.email ?? "",
              address: "",
              website: "",
            },
          },
        ]);

        created.push({ id: row.id, slug, title: m.name });
      }

      return { created, count: created.length };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        templateId: z.number().optional(),
        customDomain: z.string().optional(),
        language: z.string().optional(),
        settings: z.record(z.string(), z.any()).optional(),
        seoSettings: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const existing = await db.query.cards.findFirst({
        where: and(eq(cards.id, id), eq(cards.userId, ctx.user.id)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "published") updateData.publishedAt = new Date();
      }
      if (data.templateId !== undefined) updateData.templateId = data.templateId;
      if (data.language !== undefined) updateData.language = data.language;
      if (data.settings !== undefined) updateData.settings = data.settings;
      // Server-side entitlement: custom domain + SEO are paid features (§44/§45).
      // Setting a non-empty value requires an active plan that includes it; clearing
      // is always allowed. Frontend gating alone was bypassable over tRPC (Phase 31).
      if (data.customDomain !== undefined || data.seoSettings !== undefined) {
        const pkg = await activeSubPackage(db, ctx.user.id);
        if (data.customDomain !== undefined) {
          if (data.customDomain && !pkg?.featureCustomDomain) throw new TRPCError({ code: "FORBIDDEN", message: "A custom domain requires an eligible plan." });
          updateData.customDomain = data.customDomain;
        }
        if (data.seoSettings !== undefined) {
          const hasSeo = data.seoSettings && Object.keys(data.seoSettings).length > 0;
          if (hasSeo && !pkg?.featureSEO) throw new TRPCError({ code: "FORBIDDEN", message: "Custom SEO settings require an eligible plan." });
          updateData.seoSettings = data.seoSettings;
        }
      }

      await db.update(cards).set(updateData).where(eq(cards.id, id));

      return db.query.cards.findFirst({
        where: eq(cards.id, id),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(cards).where(
        and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id))
      );
      return { success: true };
    }),

  publish: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(cards)
        .set({ status: "published", publishedAt: new Date() })
        .where(and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)));
      return db.query.cards.findFirst({
        where: eq(cards.id, input.id),
        with: { blocks: { orderBy: cardBlocks.position } },
      });
    }),

  unpublish: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(cards)
        .set({ status: "draft" })
        .where(and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)));
      return db.query.cards.findFirst({ where: eq(cards.id, input.id) });
    }),

  duplicate: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const original = await db.query.cards.findFirst({
        where: and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)),
        with: { blocks: true },
      });
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });

      const [newCard] = await db.insert(cards).values({
        userId: ctx.user.id,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        templateId: original.templateId,
        status: "draft",
        language: original.language,
        settings: original.settings,
        seoSettings: original.seoSettings,
      });

      if (original.blocks) {
        for (const block of original.blocks) {
          await db.insert(cardBlocks).values({
            cardId: newCard.insertId,
            type: block.type,
            position: block.position,
            config: block.config,
            content: block.content,
          });
        }
      }

      return db.query.cards.findFirst({
        where: eq(cards.id, newCard.insertId),
        with: { blocks: true },
      });
    }),

  setPrimary: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Unset current primary
      await db.update(cards)
        .set({ isPrimary: false })
        .where(eq(cards.userId, ctx.user.id));
      // Set new primary
      await db.update(cards)
        .set({ isPrimary: true })
        .where(and(eq(cards.id, input.id), eq(cards.userId, ctx.user.id)));
      return { success: true };
    }),

  trackView: publicQuery
    .input(
      z.object({
        slug: z.string(),
        visitorId: z.string(),
        device: z.string().optional(),
        browser: z.string().optional(),
        referrer: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const card = await db.query.cards.findFirst({
        where: eq(cards.slug, input.slug),
      });
      if (!card) return { success: false };

      await db.update(cards)
        .set({ viewCount: sql`${cards.viewCount} + 1` })
        .where(eq(cards.id, card.id));

      await db.insert(analyticsEvents).values({
        cardId: card.id,
        eventType: "view",
        visitorId: input.visitorId,
        device: input.device || null,
        browser: input.browser || null,
        referrer: input.referrer || null,
        country: input.country || null,
        city: input.city || null,
      });

      return { success: true };
    }),

  trackEvent: publicQuery
    .input(
      z.object({
        cardId: z.number(),
        eventType: z.string(),
        eventData: z.record(z.string(), z.any()).optional(),
        visitorId: z.string(),
        device: z.string().optional(),
        browser: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        referrer: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      // Ignore events for cards that don't exist (junk / spam protection).
      const card = await db.query.cards.findFirst({ where: eq(cards.id, input.cardId), columns: { id: true } });
      if (!card) return { success: false };
      await db.insert(analyticsEvents).values({
        cardId: input.cardId,
        eventType: input.eventType,
        eventData: input.eventData || null,
        visitorId: input.visitorId,
        device: input.device || null,
        browser: input.browser || null,
        country: input.country || null,
        city: input.city || null,
        referrer: input.referrer || null,
      });
      return { success: true };
    }),

  listAll: adminQuery
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(25),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const { page = 1, limit = 25, search, status } = input || {};
      const offset = (page - 1) * limit;

      let conditions = [];
      if (search) conditions.push(like(cards.title, `%${search}%`));
      if (status) conditions.push(eq(cards.status, status as "draft" | "published" | "archived"));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [cardList, totalResult] = await Promise.all([
        db.query.cards.findMany({
          where,
          limit,
          offset,
          orderBy: [desc(cards.createdAt)],
        }),
        db.select({ count: sql<number>`count(*)` }).from(cards).where(where),
      ]);

      return { cards: cardList, total: totalResult[0]?.count || 0, page, totalPages: Math.ceil((totalResult[0]?.count || 0) / limit) };
    }),
});
