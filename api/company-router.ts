import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { companies, companyMembers, users } from "@db/schema";
import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/* Corporate / Teams (Phase 28, foundation). A user creates a company (becomes
   its admin), governs branding + approved designs, and bulk-adds employees who
   get cards under that identity (§56). */

async function adminCompany(db: ReturnType<typeof getDb>, userId: number) {
  const rows = await db.select().from(companies).where(eq(companies.adminUserId, userId));
  return rows[0] ?? null;
}

export const companyRouter = createRouter({
  // Create a company — the caller becomes its admin.
  create: authedQuery
    .input(z.object({ name: z.string().min(1), logo: z.string().optional(), brandColor: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (await adminCompany(db, ctx.user.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "You already manage a company." });
      const [ins] = await db.insert(companies).values({
        name: input.name.trim(), adminUserId: ctx.user.id, logo: input.logo || null, brandColor: input.brandColor || null,
      }).$returningId();
      await db.insert(companyMembers).values({ companyId: ins.id, userId: ctx.user.id, role: "admin" })
        .onDuplicateKeyUpdate({ set: { companyId: ins.id, role: "admin" } });
      return { ok: true, id: ins.id };
    }),

  // The company the caller belongs to (as admin or employee), with members.
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const mem = await db.select().from(companyMembers).where(eq(companyMembers.userId, ctx.user.id));
    if (!mem[0]) return null;
    const comp = await db.select().from(companies).where(eq(companies.id, mem[0].companyId));
    if (!comp[0]) return null;
    const rows = await db.select().from(companyMembers).where(eq(companyMembers.companyId, comp[0].id));
    const ids = rows.map((r) => r.userId);
    const list = ids.length ? await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(inArray(users.id, ids)) : [];
    const umap = new Map(list.map((u) => [u.id, u]));
    return {
      company: comp[0], myRole: mem[0].role,
      members: rows.map((r) => ({ id: r.userId, role: r.role, ...(umap.get(r.userId) || {}) })),
    };
  }),

  // Admin: brand governance — logo, colours, approved designs, required fields.
  setBranding: authedQuery
    .input(z.object({
      logo: z.string().optional().nullable(), brandColor: z.string().optional().nullable(),
      brandColor2: z.string().optional().nullable(),
      approvedStyles: z.array(z.number()).optional(), mandatoryFields: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const comp = await adminCompany(db, ctx.user.id);
      if (!comp) throw new TRPCError({ code: "FORBIDDEN", message: "No company to manage." });
      await db.update(companies).set(input).where(eq(companies.id, comp.id));
      return { ok: true };
    }),

  // Admin: bulk-add employees (creates customer accounts under the company).
  addMembers: authedQuery
    .input(z.object({ members: z.array(z.object({ fullName: z.string().min(1), email: z.string().email(), password: z.string().min(6) })).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const comp = await adminCompany(db, ctx.user.id);
      if (!comp) throw new TRPCError({ code: "FORBIDDEN", message: "Create your company first." });
      let created = 0, skipped = 0;
      for (const m of input.members) {
        const email = m.email.trim().toLowerCase();
        const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
        if (exists[0]) { skipped++; continue; }
        const password = await bcrypt.hash(m.password, 12);
        const [ins] = await db.insert(users).values({ email, password, fullName: m.fullName.trim(), role: "customer", status: "active" }).$returningId();
        await db.insert(companyMembers).values({ companyId: comp.id, userId: ins.id, role: "employee" });
        created++;
      }
      return { ok: true, created, skipped };
    }),
});
