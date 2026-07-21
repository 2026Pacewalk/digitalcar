import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { templates } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const templateRouter = createRouter({
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
      return db.query.templates.findFirst({
        where: eq(templates.id, input.id),
      });
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
