import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products } from "@db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";

/* ── Ecommerce product catalogue ──────────────────────────────────
   A product is a sellable listing (name, price, category, images, SEO)
   wrapping a design (styleNumber 1..44). Public reads see only published
   products; super-admin manages the full catalogue. Products are ARCHIVED,
   never hard-deleted, so historical customer links stay intact (Section 46). */

const slugify = (s: string) =>
  s.toLowerCase().replace(/\(bio\)/g, "bio").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "card";

async function uniqueSlug(db: ReturnType<typeof getDb>, base: string, ignoreId?: number): Promise<string> {
  let slug = base, n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
    const clash = rows.find((r) => r.id !== ignoreId);
    if (!clash) return slug;
    slug = `${base}-${++n}`;
  }
}

const money = z.union([z.string(), z.number()]).transform((v) => Number(v || 0).toFixed(2));

const productInput = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  styleNumber: z.number().int().min(1).max(60).default(1),
  category: z.string().optional().nullable(),
  price: money.default("0.00"),
  salePrice: money.optional().nullable(),
  currency: z.string().default("INR"),
  trialDays: z.number().int().min(0).max(365).default(30),
  primaryColor: z.string().optional().nullable(),
  secondaryColor: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  templateCategory: z.enum(["basic", "modern", "bio", "professional", "premium"]).default("modern"),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const productRouter = createRouter({
  // ── Public: the marketplace (published only) ──
  catalogue: publicQuery
    .input(z.object({ category: z.string().optional(), featured: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [eq(products.status, "published")];
      if (input?.category) conds.push(eq(products.category, input.category));
      if (input?.featured) conds.push(eq(products.isFeatured, true));
      return db.select().from(products).where(and(...conds)).orderBy(asc(products.displayOrder));
    }),

  // ── Public: single product by slug (for the product page) ──
  bySlug: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(products).where(eq(products.slug, input.slug));
    return rows[0] ?? null;
  }),

  // ── Admin: full catalogue with optional status filter ──
  listAll: adminQuery
    .input(z.object({ status: z.enum(["draft", "published", "archived"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const rows = input?.status
        ? await db.select().from(products).where(eq(products.status, input.status)).orderBy(asc(products.displayOrder))
        : await db.select().from(products).orderBy(asc(products.displayOrder));
      return rows;
    }),

  // ── Admin: create ──
  create: adminQuery.input(productInput).mutation(async ({ input }) => {
    const db = getDb();
    const slug = await uniqueSlug(db, slugify(input.name) + "-card");
    const [res] = await db.insert(products).values({ ...input, slug } as typeof products.$inferInsert).$returningId();
    return { ok: true, id: res.id, slug };
  }),

  // ── Admin: update ──
  update: adminQuery.input(productInput.partial().extend({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const { id, ...data } = input;
    await db.update(products).set(data).where(eq(products.id, id));
    return { ok: true, id };
  }),

  // ── Admin: clone (duplicate design + commercial settings under a new slug) ──
  clone: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(products).where(eq(products.id, input.id));
    const src = rows[0];
    if (!src) throw new Error("Product not found");
    const slug = await uniqueSlug(db, slugify(src.name) + "-copy");
    const { id: _drop, createdAt: _c, updatedAt: _u, ...rest } = src;
    const [res] = await db.insert(products).values({ ...rest, slug, name: `${src.name} (Copy)`, status: "draft", isFeatured: false }).$returningId();
    return { ok: true, id: res.id };
  }),

  // ── Admin: publish / unpublish / archive (never hard-delete) ──
  setStatus: adminQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "published", "archived"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(products).set({ status: input.status }).where(eq(products.id, input.id));
      return { ok: true };
    }),

  setFeatured: adminQuery
    .input(z.object({ id: z.number(), featured: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(products).set({ isFeatured: input.featured }).where(eq(products.id, input.id));
      return { ok: true };
    }),

  // ── Admin: bulk status (e.g. publish/archive selected) ──
  bulkStatus: adminQuery
    .input(z.object({ ids: z.array(z.number()).min(1), status: z.enum(["draft", "published", "archived"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(products).set({ status: input.status }).where(inArray(products.id, input.ids));
      return { ok: true, count: input.ids.length };
    }),
});
