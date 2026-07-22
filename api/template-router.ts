import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { templates, appSettings } from "@db/schema";
import { eq, and } from "drizzle-orm";

/* ── Prebuilt design templates (super-admin curated) ──────────────
   Each preset is a distinct template: a layout style (1–31) plus its
   OWN primary/secondary colour combination. Stored as a JSON list in
   app_settings so it applies to every user's card. */
type Preset = { id: number; name: string; style: number; primary: string; secondary: string; active: boolean };
const K_PRESETS = "template_presets";
const K_DEFAULT_PRESET = "default_preset_id";

const SEED_PRESETS: Preset[] = [
  { id: 1, name: "Midnight Gold", style: 1, primary: "#F7B31C", secondary: "#0F172A", active: true },
  { id: 2, name: "Ocean Blue", style: 2, primary: "#3B82F6", secondary: "#0f2b2e", active: true },
  { id: 3, name: "Emerald", style: 3, primary: "#16A34A", secondary: "#052e16", active: true },
  { id: 4, name: "Royal Purple", style: 4, primary: "#A21CAF", secondary: "#3b0764", active: true },
  { id: 5, name: "Crimson", style: 5, primary: "#EF4444", secondary: "#450a0a", active: true },
  { id: 6, name: "Teal Breeze", style: 6, primary: "#06B6D4", secondary: "#083344", active: true },
  { id: 7, name: "Sunset", style: 7, primary: "#F97316", secondary: "#431407", active: true },
  { id: 8, name: "Rose Pink", style: 8, primary: "#EC4899", secondary: "#500724", active: true },
  { id: 9, name: "Indigo", style: 9, primary: "#6366F1", secondary: "#1e1b4b", active: true },
  { id: 10, name: "Slate Pro", style: 10, primary: "#334155", secondary: "#0f172a", active: true },
  { id: 11, name: "Amber", style: 11, primary: "#EAB308", secondary: "#422006", active: true },
  { id: 12, name: "Sky", style: 12, primary: "#0EA5E9", secondary: "#082f49", active: true },
  { id: 13, name: "Forest", style: 13, primary: "#15803D", secondary: "#14210f", active: true },
  { id: 14, name: "Ruby", style: 14, primary: "#E11D48", secondary: "#4c0519", active: true },
  { id: 15, name: "Violet", style: 15, primary: "#7C3AED", secondary: "#2e1065", active: true },
  { id: 16, name: "Cyan Wave", style: 16, primary: "#0891B2", secondary: "#073b4c", active: true },
  { id: 17, name: "Tangerine", style: 17, primary: "#EA580C", secondary: "#431407", active: true },
  { id: 18, name: "Magenta", style: 18, primary: "#DB2777", secondary: "#4a0e2e", active: true },
  { id: 19, name: "Steel Blue", style: 19, primary: "#2563EB", secondary: "#0b1a3a", active: true },
  { id: 20, name: "Lime", style: 20, primary: "#65A30D", secondary: "#1a2e05", active: true },
  { id: 21, name: "Coral", style: 21, primary: "#FB7185", secondary: "#4c0519", active: true },
  { id: 22, name: "Deep Sea", style: 22, primary: "#0D9488", secondary: "#042f2e", active: true },
  { id: 23, name: "Bronze", style: 23, primary: "#B45309", secondary: "#2a1608", active: true },
  { id: 24, name: "Plum", style: 24, primary: "#9333EA", secondary: "#3b0764", active: true },
  { id: 25, name: "Scarlet", style: 25, primary: "#DC2626", secondary: "#450a0a", active: true },
  { id: 26, name: "Aqua", style: 26, primary: "#14B8A6", secondary: "#042f2e", active: true },
  { id: 27, name: "Marigold", style: 27, primary: "#D97706", secondary: "#422006", active: true },
  { id: 28, name: "Sapphire", style: 28, primary: "#1D4ED8", secondary: "#0a1533", active: true },
  { id: 29, name: "Fuchsia", style: 29, primary: "#C026D3", secondary: "#4a044e", active: true },
  { id: 30, name: "Pine", style: 30, primary: "#047857", secondary: "#022c22", active: true },
  { id: 31, name: "Onyx Gold", style: 31, primary: "#F59E0B", secondary: "#1c1917", active: true },
];

async function getSetting(db: ReturnType<typeof getDb>, key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row ? row.value : null;
}
async function setSetting(db: ReturnType<typeof getDb>, key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}
async function loadPresets(db: ReturnType<typeof getDb>): Promise<Preset[]> {
  const raw = await getSetting(db, K_PRESETS);
  if (!raw) { await setSetting(db, K_PRESETS, JSON.stringify(SEED_PRESETS)); return SEED_PRESETS; }
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : SEED_PRESETS; } catch { return SEED_PRESETS; }
}
async function defaultPresetId(db: ReturnType<typeof getDb>): Promise<number> {
  const raw = await getSetting(db, K_DEFAULT_PRESET);
  return raw ? Number(raw) || 1 : 1;
}

const presetInput = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  style: z.number().min(1).max(31),
  primary: z.string(),
  secondary: z.string(),
  active: z.boolean().default(true),
});

export const templateRouter = createRouter({
  // ─── Prebuilt templates (public: the gallery users pick from) ───
  presets: publicQuery.query(async () => {
    const db = getDb();
    return { list: await loadPresets(db), defaultId: await defaultPresetId(db) };
  }),

  // ─── The default template's style+colours (consumed by every card) ───
  siteConfig: publicQuery.query(async () => {
    const db = getDb();
    const list = await loadPresets(db);
    const did = await defaultPresetId(db);
    const def = list.find((p) => p.id === did) || list[0];
    return { defaultId: def?.style ?? 1, defaultColor: def?.primary ?? "#F7B31C", defaultSecondary: def?.secondary ?? "", disabled: [] as number[] };
  }),

  // ─── Super-admin: create / update a prebuilt template ───
  savePreset: adminQuery.input(presetInput).mutation(async ({ input }) => {
    const db = getDb();
    const list = await loadPresets(db);
    if (input.id && list.some((p) => p.id === input.id)) {
      const next = list.map((p) => (p.id === input.id ? { ...p, ...input, id: input.id } : p));
      await setSetting(db, K_PRESETS, JSON.stringify(next));
      return { ok: true, id: input.id };
    }
    const id = Math.max(0, ...list.map((p) => p.id)) + 1;
    await setSetting(db, K_PRESETS, JSON.stringify([...list, { ...input, id }]));
    return { ok: true, id };
  }),

  // ─── Super-admin: delete a prebuilt template ───
  deletePreset: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const list = (await loadPresets(db)).filter((p) => p.id !== input.id);
    await setSetting(db, K_PRESETS, JSON.stringify(list));
    return { ok: true };
  }),

  // ─── Super-admin: set the global default template ───
  setDefaultPreset: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await setSetting(db, K_DEFAULT_PRESET, String(input.id));
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
