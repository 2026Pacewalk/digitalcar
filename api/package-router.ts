import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptionPackages, appSettings } from "@db/schema";
import { eq } from "drizzle-orm";

/* ── Package Feature List — the marketing feature bullets shown on the pricing
   page & product cards. Stored dynamically in app_settings (admin-editable),
   with an accurate default where every feature deep-links to its real page. */
const FEATURES_KEY = "package_features";
type Feat = { name: string; link?: string };
const DEFAULT_FEATURES: { customer: Feat[]; reseller: Feat[] } = {
  customer: [
    { name: "Your digital card + permanent link & QR", link: "/features" },
    { name: "31+ premium designs & link-in-bio styles", link: "/templates" },
    { name: "Share anywhere — WhatsApp, QR & link", link: "/features" },
    { name: "Edit your card anytime — instant updates", link: "/features" },
    { name: "Products & services online store", link: "/digital-business-cards" },
    { name: "Photo gallery + YouTube videos", link: "/features" },
    { name: "Lead capture form → built-in mini-CRM", link: "/features" },
    { name: "Payment links — UPI, Paytm, GPay & cards", link: "/features" },
    { name: "Google reviews + Maps directions", link: "/features" },
    { name: "Real-time analytics — views, clicks & scans", link: "/features" },
    { name: "Save-contact, call & all social links", link: "/features" },
    { name: "AI content generator", link: "/ai-card-generator" },
    { name: "SEO settings for Google", link: "/features" },
    { name: "Custom domain support", link: "/custom-domain" },
  ],
  reseller: [
    { name: "White-label reseller panel", link: "/resellers" },
    { name: "Add & manage unlimited customers", link: "/resellers" },
    { name: "Assign packages & set your pricing", link: "/resellers" },
    { name: "Commission tracking + wallet payouts", link: "/refer-earn" },
  ],
};
async function readFeatures(db: ReturnType<typeof getDb>): Promise<{ customer: Feat[]; reseller: Feat[] }> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, FEATURES_KEY) });
  if (!row?.value) return DEFAULT_FEATURES;
  try {
    const j = JSON.parse(row.value);
    return { customer: Array.isArray(j.customer) ? j.customer : DEFAULT_FEATURES.customer, reseller: Array.isArray(j.reseller) ? j.reseller : DEFAULT_FEATURES.reseller };
  } catch { return DEFAULT_FEATURES; }
}

export const packageRouter = createRouter({
  // Public: the dynamic feature list (pricing page + product cards read this).
  features: publicQuery.query(async () => readFeatures(getDb())),

  // Admin: replace the feature list for one audience (persists to app_settings).
  setFeatures: adminQuery
    .input(z.object({
      audience: z.enum(["customer", "reseller"]),
      features: z.array(z.object({ name: z.string().min(1).max(120), link: z.string().max(200).optional() })).max(40),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const current = await readFeatures(db);
      const next = { ...current, [input.audience]: input.features };
      const value = JSON.stringify(next);
      await db.insert(appSettings).values({ key: FEATURES_KEY, value }).onDuplicateKeyUpdate({ set: { value } });
      return { ok: true, count: input.features.length };
    }),
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.query.subscriptionPackages.findMany({
      where: eq(subscriptionPackages.isActive, true),
      orderBy: [subscriptionPackages.displayOrder],
    });
  }),

  listAll: adminQuery.query(async () => {
    const db = getDb();
    return db.query.subscriptionPackages.findMany({
      orderBy: [subscriptionPackages.displayOrder],
    });
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const pkg = await db.query.subscriptionPackages.findFirst({
        where: eq(subscriptionPackages.id, input.id),
      });
      return pkg ?? null;
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        monthlyPrice: z.string(),
        yearlyPrice: z.string(),
        threeYearPrice: z.string().optional(),
        trialDays: z.number().default(7),
        maxCards: z.number().default(1),
        maxProducts: z.number().default(0),
        maxGalleryImages: z.number().default(0),
        maxVideos: z.number().default(0),
        storageLimitMB: z.number().default(100),
        featureCustomDomain: z.boolean().default(false),
        featureSEO: z.boolean().default(false),
        featureAnalytics: z.boolean().default(false),
        featureLeadCapture: z.boolean().default(false),
        featureRemoveBranding: z.boolean().default(false),
        featureWhiteLabel: z.boolean().default(false),
        featurePrioritySupport: z.boolean().default(false),
        featureAI: z.boolean().default(false),
        featureMultilingual: z.boolean().default(false),
        featureCRM: z.boolean().default(false),
        isActive: z.boolean().default(true),
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(subscriptionPackages).values(input).$returningId();
      return db.query.subscriptionPackages.findFirst({
        where: eq(subscriptionPackages.id, result[0].id),
      });
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        monthlyPrice: z.string().optional(),
        yearlyPrice: z.string().optional(),
        threeYearPrice: z.string().optional(),
        trialDays: z.number().optional(),
        maxCards: z.number().optional(),
        maxProducts: z.number().optional(),
        maxGalleryImages: z.number().optional(),
        maxVideos: z.number().optional(),
        storageLimitMB: z.number().optional(),
        featureCustomDomain: z.boolean().optional(),
        featureSEO: z.boolean().optional(),
        featureAnalytics: z.boolean().optional(),
        featureLeadCapture: z.boolean().optional(),
        featureRemoveBranding: z.boolean().optional(),
        featureWhiteLabel: z.boolean().optional(),
        featurePrioritySupport: z.boolean().optional(),
        featureAI: z.boolean().optional(),
        featureMultilingual: z.boolean().optional(),
        featureCRM: z.boolean().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(subscriptionPackages).set(data).where(eq(subscriptionPackages.id, id));
      return db.query.subscriptionPackages.findFirst({
        where: eq(subscriptionPackages.id, id),
      });
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(subscriptionPackages).where(eq(subscriptionPackages.id, input.id));
      return { success: true };
    }),
});
