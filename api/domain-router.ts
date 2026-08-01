import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customDomains, publishedCards, users } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { promises as dns } from "node:dns";
import { activeSubPackage } from "./card-router";

const ROOT_HOST = "digitalcarda.in";
// Where customers point their domain. Ops must create an A record for this
// hostname → the VPS IP (see docs/CUSTOM_DOMAINS.md). Surfaced in the UI.
export const CNAME_TARGET = "cname.digitalcarda.in";

/** Normalise any user input to a bare lower-case hostname. */
function normDomain(input: string): string {
  return String(input || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
}

function isValidDomain(d: string): boolean {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) return false;
  // Never let a custom domain shadow our own site.
  if (d === ROOT_HOST || d.endsWith("." + ROOT_HOST)) return false;
  return true;
}

/** DNS instructions shown to the owner for a given domain + token. */
function dnsInstructions(domain: string, token: string) {
  return {
    cname: { type: "CNAME", host: domain, value: CNAME_TARGET },
    // Apex domains can't CNAME — offer an A-record note too (value filled by ops).
    txt: { type: "TXT", host: `_digitalcarda.${domain}`, value: token },
  };
}

/** Resolve a domain's (userId, cardId) → the live published card's slug. */
async function resolveSlugFor(db: ReturnType<typeof getDb>, userId: number, cardId: number) {
  const pc = await db.query.publishedCards.findFirst({
    where: and(eq(publishedCards.userId, userId), eq(publishedCards.cardId, cardId)),
  });
  if (!pc) return null;
  return { slug: pc.slug, publicId: pc.publicId };
}

/** Ownership check: TXT record _digitalcarda.<domain> must contain the token. */
async function txtVerified(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`_digitalcarda.${domain}`);
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch { return false; }
}

export const domainRouter = createRouter({
  // ── PUBLIC: host → card slug (used by the client gate on a custom domain) ──
  resolve: publicQuery.input(z.object({ host: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const domain = normDomain(input.host);
    if (!domain || domain === ROOT_HOST || domain.endsWith("." + ROOT_HOST)) return null;
    try {
      const row = await db.query.customDomains.findFirst({
        where: and(eq(customDomains.domain, domain), eq(customDomains.status, "active")),
      });
      if (!row) return null;
      return await resolveSlugFor(db, row.userId, row.cardId);
    } catch { return null; } // table not migrated yet → resolve to nothing
  }),

  // ── ADMIN: manage domains for ANY user ──
  list: adminQuery.query(async () => {
    const db = getDb();
    try {
    const rows = await db.select({
      id: customDomains.id, domain: customDomains.domain, userId: customDomains.userId,
      cardId: customDomains.cardId, status: customDomains.status, verifyToken: customDomains.verifyToken,
      addedByRole: customDomains.addedByRole, verifiedAt: customDomains.verifiedAt, createdAt: customDomains.createdAt,
      email: users.email, name: users.fullName,
    }).from(customDomains).leftJoin(users, eq(users.id, customDomains.userId)).orderBy(desc(customDomains.createdAt));
    return rows.map((r) => ({ ...r, dns: dnsInstructions(r.domain, r.verifyToken) }));
    } catch { return []; } // table not migrated yet
  }),

  assign: adminQuery
    .input(z.object({ userId: z.number().int().positive().optional(), email: z.string().optional(), cardId: z.number().int().positive().default(1), domain: z.string().min(3) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      let userId = input.userId;
      if (!userId && input.email) {
        const u = await db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase().trim()) });
        if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "No account with that email." });
        userId = Number(u.id);
      }
      if (!userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Provide a user id or email." });
      const domain = normDomain(input.domain);
      if (!isValidDomain(domain)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid domain like card.yourbusiness.com" });
      const existing = await db.query.customDomains.findFirst({ where: eq(customDomains.domain, domain) });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "That domain is already registered." });
      const verifyToken = nanoid(24);
      await db.insert(customDomains).values({ domain, userId, cardId: input.cardId, verifyToken, addedByRole: "admin", status: "pending" });
      return { ok: true, domain, dns: dnsInstructions(domain, verifyToken) };
    }),

  verify: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    const row = await db.query.customDomains.findFirst({ where: eq(customDomains.id, input.id) });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const ok = await txtVerified(row.domain, row.verifyToken);
    if (!ok) return { ok: false, message: "DNS TXT record not found yet — add it and try again in a few minutes." };
    await db.update(customDomains).set({ status: "active", verifiedAt: new Date() }).where(eq(customDomains.id, input.id));
    return { ok: true };
  }),

  // Admin override — activate/disable without waiting on DNS (e.g. already trusted).
  setStatus: adminQuery.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "active", "disabled"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(customDomains).set({ status: input.status, verifiedAt: input.status === "active" ? new Date() : null }).where(eq(customDomains.id, input.id));
      return { ok: true };
    }),

  remove: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.delete(customDomains).where(eq(customDomains.id, input.id));
    return { ok: true };
  }),

  // ── CUSTOMER / RESELLER: manage my own domains (plan-gated) ──
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const pkg = await activeSubPackage(db, ctx.user.id);
    let rows: (typeof customDomains.$inferSelect)[] = [];
    try { rows = await db.select().from(customDomains).where(eq(customDomains.userId, ctx.user.id)).orderBy(desc(customDomains.createdAt)); }
    catch { rows = []; } // table not migrated yet
    return {
      eligible: !!pkg?.featureCustomDomain,
      cnameTarget: CNAME_TARGET,
      domains: rows.map((r) => ({ id: r.id, domain: r.domain, cardId: r.cardId, status: r.status, verifiedAt: r.verifiedAt, dns: dnsInstructions(r.domain, r.verifyToken) })),
    };
  }),

  add: authedQuery.input(z.object({ domain: z.string().min(3), cardId: z.number().int().positive().default(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const pkg = await activeSubPackage(db, ctx.user.id);
      if (!pkg?.featureCustomDomain) throw new TRPCError({ code: "FORBIDDEN", message: "A custom domain requires an eligible plan." });
      const domain = normDomain(input.domain);
      if (!isValidDomain(domain)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid domain like card.yourbusiness.com" });
      const existing = await db.query.customDomains.findFirst({ where: eq(customDomains.domain, domain) });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "That domain is already registered." });
      const verifyToken = nanoid(24);
      const role = ctx.user.role === "reseller" ? "reseller" : "customer";
      await db.insert(customDomains).values({ domain, userId: ctx.user.id, cardId: input.cardId, verifyToken, addedByRole: role, status: "pending" });
      return { ok: true, domain, dns: dnsInstructions(domain, verifyToken) };
    }),

  verifyMine: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const row = await db.query.customDomains.findFirst({ where: and(eq(customDomains.id, input.id), eq(customDomains.userId, ctx.user.id)) });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const ok = await txtVerified(row.domain, row.verifyToken);
    if (!ok) return { ok: false, message: "DNS TXT record not found yet — add it and try again in a few minutes." };
    await db.update(customDomains).set({ status: "active", verifiedAt: new Date() }).where(eq(customDomains.id, input.id));
    return { ok: true };
  }),

  removeMine: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(customDomains).where(and(eq(customDomains.id, input.id), eq(customDomains.userId, ctx.user.id)));
    return { ok: true };
  }),
});
