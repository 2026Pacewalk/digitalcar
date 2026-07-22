import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { templates, appSettings } from "@db/schema";
import { eq, and } from "drizzle-orm";

/* ── Site-wide template config (super-admin controlled) ──
   Stored in app_settings so it applies to every user's card. */
const K_DEFAULT_ID = "default_template_id";
const K_DEFAULT_COLOR = "default_template_color";
const K_DEFAULT_SECONDARY = "default_template_secondary";
const K_DISABLED = "disabled_templates";
const DEFAULTS: Record<string, string> = {
  [K_DEFAULT_ID]: "1", [K_DEFAULT_COLOR]: "#F7B31C", [K_DEFAULT_SECONDARY]: "", [K_DISABLED]: "[]",
};
async function getSetting(db: ReturnType<typeof getDb>, key: string): Promise<string> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row ? row.value : (DEFAULTS[key] ?? "");
}
async function setSetting(db: ReturnType<typeof getDb>, key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export const templateRouter = createRouter({
  // ─── Site template config (public: consumed by every card) ───
  siteConfig: publicQuery.query(async () => {
    const db = getDb();
    let disabled: number[] = [];
    try { disabled = JSON.parse(await getSetting(db, K_DISABLED)); } catch { disabled = []; }
    return {
      defaultId: Number(await getSetting(db, K_DEFAULT_ID)) || 1,
      defaultColor: await getSetting(db, K_DEFAULT_COLOR) || "#F7B31C",
      defaultSecondary: await getSetting(db, K_DEFAULT_SECONDARY) || "",
      disabled: Array.isArray(disabled) ? disabled : [],
    };
  }),

  // ─── Super-admin: set the global default template + colours ───
  setSiteConfig: adminQuery
    .input(z.object({
      defaultId: z.number().min(1).max(64).optional(),
      defaultColor: z.string().optional(),
      defaultSecondary: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.defaultId !== undefined) await setSetting(db, K_DEFAULT_ID, String(input.defaultId));
      if (input.defaultColor !== undefined) await setSetting(db, K_DEFAULT_COLOR, input.defaultColor);
      if (input.defaultSecondary !== undefined) await setSetting(db, K_DEFAULT_SECONDARY, input.defaultSecondary);
      return { ok: true };
    }),

  // ─── Super-admin: enable/disable a template for all users ───
  setTemplateActive: adminQuery
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      let disabled: number[] = [];
      try { disabled = JSON.parse(await getSetting(db, K_DISABLED)); } catch { disabled = []; }
      const set = new Set(Array.isArray(disabled) ? disabled : []);
      if (input.active) set.delete(input.id); else set.add(input.id);
      await setSetting(db, K_DISABLED, JSON.stringify([...set]));
      return { ok: true };
    }),
  list: publicQuery
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const category = input?.category;
      if (category) {
        return db.query.templates.findMany({
          where: and(eq(templates.isActive, true), eq(templates.category, category)),
          orderBy: [templates.displayOrder],
        });
      }
      return db.query.templates.findMany({
        where: eq(templates.isActive, true),
        orderBy: [templates.displayOrder],
      });
    }),

  listAll: adminQuery
    .input(z.object({ category: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      let conditions = [];
      if (input?.category) conditions.push(eq(templates.category, input.category));
      if (input?.status === "active") conditions.push(eq(templates.isActive, true));
      if (input?.status === "inactive") conditions.push(eq(templates.isActive, false));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.query.templates.findMany({ where, orderBy: [templates.displayOrder] });
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tpl = await db.query.templates.findFirst({
        where: eq(templates.id, input.id),
      });
      return tpl ?? null;
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        category: z.string(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        previewUrl: z.string().optional(),
        isActive: z.boolean().default(true),
        settings: z.record(z.string(), z.any()).optional(),
        minPackage: z.string().optional(),
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(templates).values(input).$returningId();
      return db.query.templates.findFirst({ where: eq(templates.id, result[0].id) });
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        previewUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        settings: z.record(z.string(), z.any()).optional(),
        minPackage: z.string().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(templates).set(data).where(eq(templates.id, id));
      return db.query.templates.findFirst({ where: eq(templates.id, id) });
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(templates).where(eq(templates.id, input.id));
      return { success: true };
    }),
});
