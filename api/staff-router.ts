/* Staff & Access — the super admin adds team members to the admin portal,
   chooses which modules each one may view or change, and reads everything they
   (and the super admin) did in the activity log.

   Managing staff and reading the log are super-admin only and can never be
   granted. A staff member can read their own access (myAccess) so the admin
   UI shows them only what they may open. */
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { createRouter, authedQuery, superAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, staffAccess, adminActivity } from "@db/schema";
import { STAFF_MODULE_KEYS, cleanPermissions, firstAllowedPath } from "@contracts/staff";
import { enforceRateLimit } from "./lib/rate-limit";
import { forgetStaffAccess, recordActivity, staffAccessFor } from "./lib/staff-access";

const levelEnum = z.enum(["view", "manage"]);

type Ctx = { user: Parameters<typeof recordActivity>[0]["actor"]; req: Request };
function logStaffChange(ctx: Ctx, action: string, who: { email: string; fullName?: string | null }, summary?: string) {
  recordActivity({ actor: ctx.user, module: "staff", action, target: who.email, summary: summary ?? who.fullName ?? null, req: ctx.req });
}
const describePerms = (p: Record<string, string>) =>
  Object.entries(p).map(([k, v]) => `${k}: ${v === "manage" ? "edit" : "view"}`).join(", ") || "no modules";
const permissionsInput = z.record(z.string(), levelEnum).transform(cleanPermissions);

// Readable but strong, so it can be read out on a call and changed at first sign-in.
function newPassword(): string {
  const words = ["Bright", "Swift", "Solid", "Prime", "Clear", "Sharp", "Steady", "Noble"];
  return `${words[Math.floor(Math.random() * words.length)]}@${Math.floor(1000 + Math.random() * 8999)}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;
}

async function staffUser(db: ReturnType<typeof getDb>, id: number) {
  const u = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!u || u.role !== "staff") throw new TRPCError({ code: "NOT_FOUND", message: "No staff member with that id." });
  return u;
}

export const staffRouter = createRouter({
  /** What the signed-in admin-portal user may open. */
  myAccess: authedQuery.query(async ({ ctx }) => {
    if (ctx.user.role === "super_admin") {
      return { role: "super_admin" as const, permissions: Object.fromEntries(STAFF_MODULE_KEYS.map((k) => [k, "manage"])), canImpersonate: true, jobTitle: null as string | null, home: "/admin" };
    }
    if (ctx.user.role !== "staff") return { role: ctx.user.role, permissions: {}, canImpersonate: false, jobTitle: null, home: "/dashboard" };
    const a = await staffAccessFor(ctx.user.id);
    return { role: "staff" as const, permissions: a.permissions, canImpersonate: a.canImpersonate, jobTitle: a.jobTitle, home: firstAllowedPath(a.permissions) };
  }),

  /** Staff page visits, so the activity log shows what they looked at. At most
      one entry per page per 10 minutes per person. */
  trackPage: authedQuery
    .input(z.object({ path: z.string().max(120), title: z.string().max(80).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "staff" || !input.path.startsWith("/admin")) return { ok: true };
      const db = getDb();
      const since = new Date(Date.now() - 10 * 60_000);
      const recent = await db.select({ id: adminActivity.id }).from(adminActivity)
        .where(and(eq(adminActivity.actorId, ctx.user.id), eq(adminActivity.action, "Opened page"), eq(adminActivity.target, input.path), gte(adminActivity.createdAt, since)))
        .limit(1);
      if (!recent.length) {
        const { moduleForAdminPath } = await import("@contracts/staff");
        recordActivity({ actor: ctx.user, module: moduleForAdminPath(input.path), action: "Opened page", summary: input.title || input.path, target: input.path, req: ctx.req });
      }
      return { ok: true };
    }),

  list: superAdminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      id: users.id, email: users.email, fullName: users.fullName, phone: users.phone,
      status: users.status, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
      jobTitle: staffAccess.jobTitle, permissions: staffAccess.permissions, canImpersonate: staffAccess.canImpersonate,
    }).from(users).leftJoin(staffAccess, eq(staffAccess.userId, users.id))
      .where(eq(users.role, "staff")).orderBy(desc(users.createdAt));

    const ids = rows.map((r) => r.id);
    const last = ids.length
      ? await db.select({ actorId: adminActivity.actorId, at: sql<Date>`max(${adminActivity.createdAt})`, n: sql<number>`count(*)` })
          .from(adminActivity)
          .where(and(inArray(adminActivity.actorId, ids), gte(adminActivity.createdAt, new Date(Date.now() - 30 * 86_400_000))))
          .groupBy(adminActivity.actorId)
      : [];
    const byId = new Map(last.map((l) => [Number(l.actorId), l]));
    return rows.map((r) => ({
      ...r,
      permissions: cleanPermissions(typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions),
      canImpersonate: !!r.canImpersonate,
      lastActiveAt: byId.get(r.id)?.at ?? null,
      actions30d: Number(byId.get(r.id)?.n) || 0,
    }));
  }),

  create: superAdminQuery
    .input(z.object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(255),
      phone: z.string().trim().max(30).optional(),
      jobTitle: z.string().trim().max(120).optional(),
      password: z.string().min(8).max(200).optional(),
      permissions: permissionsInput,
      canImpersonate: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`staff-create:${ctx.user.id}`, 20, 60 * 60_000);
      const db = getDb();
      const email = input.email.toLowerCase();
      const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, role: true } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: existing.role === "staff" ? "That email is already a staff member." : "That email already has a DigitalCarda account. Use a different email for staff." });
      }
      const pwd = input.password || newPassword();
      const inserted = await db.insert(users).values({
        email, password: await bcrypt.hash(pwd, 12), fullName: input.fullName, phone: input.phone || null,
        role: "staff", status: "active", emailVerified: true,
      });
      const userId = Number((inserted as unknown as [{ insertId?: number }])[0]?.insertId)
        || Number((await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } }))?.id);
      await db.insert(staffAccess).values({
        userId, jobTitle: input.jobTitle || null, permissions: input.permissions,
        canImpersonate: input.canImpersonate, createdBy: ctx.user.id,
      });
      logStaffChange(ctx, "Added a staff member", { email, fullName: input.fullName }, describePerms(input.permissions) + (input.canImpersonate ? ", can log in as customers" : ""));
      return { ok: true as const, userId, email, password: input.password ? null : pwd };
    }),

  update: superAdminQuery
    .input(z.object({
      id: z.number().int().positive(),
      fullName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().max(30).optional(),
      jobTitle: z.string().trim().max(120).optional(),
      permissions: permissionsInput.optional(),
      canImpersonate: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const target = await staffUser(db, input.id);
      if (input.fullName !== undefined || input.phone !== undefined) {
        await db.update(users).set({
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        }).where(eq(users.id, input.id));
      }
      const row = await db.query.staffAccess.findFirst({ where: eq(staffAccess.userId, input.id) });
      const patch = {
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle || null } : {}),
        ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
        ...(input.canImpersonate !== undefined ? { canImpersonate: input.canImpersonate } : {}),
      };
      if (row) {
        if (Object.keys(patch).length) await db.update(staffAccess).set(patch).where(eq(staffAccess.userId, input.id));
      } else {
        await db.insert(staffAccess).values({ userId: input.id, permissions: input.permissions ?? {}, jobTitle: input.jobTitle || null, canImpersonate: !!input.canImpersonate });
      }
      forgetStaffAccess(input.id);
      logStaffChange(ctx, "Changed staff access", target,
        input.permissions !== undefined ? describePerms(input.permissions) + (input.canImpersonate ? ", can log in as customers" : "") : "profile details");
      return { ok: true as const };
    }),

  /** Suspend blocks sign-in and ends access on the next request; reactivate restores it. */
  setStatus: superAdminQuery
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "suspended"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const target = await staffUser(db, input.id);
      await db.update(users).set({ status: input.status }).where(eq(users.id, input.id));
      forgetStaffAccess(input.id);
      logStaffChange(ctx, input.status === "suspended" ? "Suspended a staff member" : "Reactivated a staff member", target);
      return { ok: true as const };
    }),

  resetPassword: superAdminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const target = await staffUser(db, input.id);
      const pwd = newPassword();
      await db.update(users).set({ password: await bcrypt.hash(pwd, 12) }).where(eq(users.id, input.id));
      logStaffChange(ctx, "Reset a staff password", target);
      return { ok: true as const, password: pwd };
    }),

  /** Removes the account. Their past activity stays in the log under their name. */
  remove: superAdminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const u = await staffUser(db, input.id);
      await db.delete(staffAccess).where(eq(staffAccess.userId, u.id));
      await db.delete(users).where(eq(users.id, u.id));
      forgetStaffAccess(u.id);
      logStaffChange(ctx, "Removed a staff member", u);
      return { ok: true as const };
    }),

  /** The activity log: changes, sign-ins, page visits and refused attempts. */
  activity: superAdminQuery
    .input(z.object({
      actorId: z.number().int().positive().optional(),
      who: z.enum(["all", "staff", "super_admin"]).default("all"),
      module: z.string().max(40).optional(),
      status: z.enum(["all", "ok", "denied", "error"]).default("all"),
      kind: z.enum(["all", "changes", "signins", "visits"]).default("all"),
      q: z.string().max(120).optional(),
      from: z.string().max(10).optional(),
      to: z.string().max(10).optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(10).max(200).default(50),
    }).default({ who: "all", status: "all", kind: "all", page: 1, perPage: 50 }))
    .query(async ({ input }) => {
      const db = getDb();
      const where = [];
      if (input.actorId) where.push(eq(adminActivity.actorId, input.actorId));
      if (input.who !== "all") where.push(eq(adminActivity.actorRole, input.who));
      if (input.module) where.push(eq(adminActivity.module, input.module));
      if (input.status !== "all") where.push(eq(adminActivity.status, input.status));
      if (input.kind === "signins") where.push(eq(adminActivity.action, "Signed in"));
      if (input.kind === "visits") where.push(eq(adminActivity.action, "Opened page"));
      if (input.kind === "changes") where.push(and(sql`${adminActivity.action} <> 'Signed in'`, sql`${adminActivity.action} <> 'Opened page'`)!);
      if (input.from && /^\d{4}-\d{2}-\d{2}$/.test(input.from)) where.push(gte(adminActivity.createdAt, new Date(`${input.from}T00:00:00+05:30`)));
      if (input.to && /^\d{4}-\d{2}-\d{2}$/.test(input.to)) where.push(lte(adminActivity.createdAt, new Date(`${input.to}T23:59:59+05:30`)));
      const term = (input.q || "").trim().replace(/[%_]/g, "");
      if (term) {
        const pat = `%${term}%`;
        where.push(or(like(adminActivity.actorName, pat), like(adminActivity.action, pat), like(adminActivity.target, pat), like(adminActivity.summary, pat))!);
      }
      const filter = where.length ? and(...where) : undefined;
      const dayStart = new Date(Date.now() - 24 * 3600_000);
      const weekStart = new Date(Date.now() - 7 * 86_400_000);

      const [rows, counted, today, activeToday, deniedWeek] = await Promise.all([
        db.select().from(adminActivity).where(filter).orderBy(desc(adminActivity.createdAt))
          .limit(input.perPage).offset((input.page - 1) * input.perPage),
        db.select({ n: sql<number>`count(*)` }).from(adminActivity).where(filter),
        db.select({ n: sql<number>`count(*)` }).from(adminActivity).where(gte(adminActivity.createdAt, dayStart)),
        db.select({ n: sql<number>`count(distinct ${adminActivity.actorId})` }).from(adminActivity)
          .where(and(gte(adminActivity.createdAt, dayStart), eq(adminActivity.actorRole, "staff"))),
        db.select({ n: sql<number>`count(*)` }).from(adminActivity)
          .where(and(gte(adminActivity.createdAt, weekStart), eq(adminActivity.status, "denied"))),
      ]);
      return {
        rows,
        total: Number(counted[0]?.n) || 0,
        page: input.page,
        perPage: input.perPage,
        stats: {
          eventsToday: Number(today[0]?.n) || 0,
          staffActiveToday: Number(activeToday[0]?.n) || 0,
          deniedThisWeek: Number(deniedWeek[0]?.n) || 0,
        },
      };
    }),
});
