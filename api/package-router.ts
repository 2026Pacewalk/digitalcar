import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptionPackages } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const packageRouter = createRouter({
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
      return db.query.subscriptionPackages.findFirst({
        where: eq(subscriptionPackages.id, input.id),
      });
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        monthlyPrice: z.string(),
        yearlyPrice: z.string(),
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
