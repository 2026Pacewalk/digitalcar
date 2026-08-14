import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customDomains, publishedCards, users, appSettings, subscriptions } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import { promises as dns } from "node:dns";
import { cfEnabled, cfFallbackTarget, cfCreateHostname, cfGetByHostname, cfDeleteByHostname, cfIsActive, cfHealthCheck, type CfHostname } from "./lib/cloudflare";

const ROOT_HOST = "digitalcarda.in";
// Manual-mode CNAME target (used only when Cloudflare for SaaS isn't configured).
export const CNAME_TARGET = "cname.digitalcarda.in";

/* ── Custom-domain add-on ($499 one-time setup) ──────────────────────────────
   The custom domain is a paid add-on, NOT bundled into any plan — except it is
   FREE for Platinum members on the 3-year term. A customer becomes eligible to
   connect a domain either by paying the add-on (Razorpay) or by being free-
   eligible. Resellers/admins keep their existing (plan-based) access. */
export const DOMAIN_ADDON_PRICE = 499;
const ADDON_USERS_KEY = "domain_addon_users"; // app_settings: JSON array of paid userIds

async function readSetting(db: ReturnType<typeof getDb>, key: string): Promise<string> {
  const r = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return r?.value ?? "";
}
async function razorpayCreds(db: ReturnType<typeof getDb>) {
  return { keyId: await readSetting(db, "pay_razorpay_key_id"), keySecret: await readSetting(db, "pay_razorpay_key_secret") };
}
async function paidAddonUsers(db: ReturnType<typeof getDb>): Promise<number[]> {
  try { const v = JSON.parse((await readSetting(db, ADDON_USERS_KEY)) || "[]"); return Array.isArray(v) ? v.map(Number) : []; }
  catch { return []; }
}
async function grantAddon(db: ReturnType<typeof getDb>, userId: number): Promise<void> {
  const list = await paidAddonUsers(db);
  if (!list.includes(userId)) list.push(userId);
  const value = JSON.stringify(list);
  await db.insert(appSettings).values({ key: ADDON_USERS_KEY, value }).onDuplicateKeyUpdate({ set: { value } });
}
// Free custom domain = an active Platinum subscription bought on the 3-year term.
async function freeDomainEligible(db: ReturnType<typeof getDb>, userId: number): Promise<boolean> {
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), sql`${subscriptions.status} in ('trial','active')`),
    with: { package: true },
    orderBy: [desc(subscriptions.createdAt)],
  });
  if (!sub) return false;
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() < Date.now()) return false;
  return sub.billingCycle === "triennial" && (sub.package?.name || "").toLowerCase() === "platinum";
}
/** Whether a customer may connect a custom domain, and why. Resellers/admins are
    always allowed (their access predates the add-on model). */
async function domainAccess(db: ReturnType<typeof getDb>, userId: number, role: string) {
  if (role === "reseller" || role === "super_admin" || role === "admin") return { eligible: true, free: false, paid: true };
  const [free, paidList] = await Promise.all([freeDomainEligible(db, userId), paidAddonUsers(db)]);
  const paid = paidList.includes(userId);
  return { eligible: free || paid, free, paid };
}

function normDomain(input: string): string {
  return String(input || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
}
function isValidDomain(d: string): boolean {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) return false;
  if (d === ROOT_HOST || d.endsWith("." + ROOT_HOST)) return false;
  return true;
}

type DnsRecord = { type: string; host: string; value: string };
type OwnerInfo = { mode: "cloudflare" | "manual"; records: DnsRecord[]; sslStatus: string | null; active: boolean };

/** DNS records + SSL status a domain owner needs, from Cloudflare when enabled. */
async function ownerInfo(domain: string, token: string, cfHost?: CfHostname | null): Promise<OwnerInfo> {
  if (cfEnabled()) {
    let h = cfHost;
    if (h === undefined) { try { h = await cfGetByHostname(domain); } catch { h = null; } }
    const records: DnsRecord[] = [{ type: "CNAME", host: domain, value: cfFallbackTarget() }];
    if (h?.ownership_verification?.name && h.ownership_verification.value)
      records.push({ type: "TXT", host: h.ownership_verification.name, value: h.ownership_verification.value });
    for (const v of h?.ssl?.validation_records ?? []) if (v.txt_name && v.txt_value) records.push({ type: "TXT", host: v.txt_name, value: v.txt_value });
    return { mode: "cloudflare", records, sslStatus: h?.ssl?.status || h?.status || "pending", active: cfIsActive(h ?? null) };
  }
  return {
    mode: "manual",
    records: [
      { type: "CNAME", host: domain, value: CNAME_TARGET },
      { type: "TXT", host: `_digitalcarda.${domain}`, value: token },
    ],
    sslStatus: null, active: false,
  };
}

async function resolveSlugFor(db: ReturnType<typeof getDb>, userId: number, cardId: number) {
  const pc = await db.query.publishedCards.findFirst({ where: and(eq(publishedCards.userId, userId), eq(publishedCards.cardId, cardId)) });
  if (!pc) return null;
  return { slug: pc.slug, publicId: pc.publicId };
}

/** Manual-mode ownership check: TXT _digitalcarda.<domain> contains the token. */
async function txtVerified(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`_digitalcarda.${domain}`);
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch { return false; }
}

type Row = typeof customDomains.$inferSelect;

/** Live status + records for a stored row; auto-promotes to active once
   Cloudflare reports the cert is live so the card serves without a manual step. */
async function enrich(db: ReturnType<typeof getDb>, r: Row) {
  let info: OwnerInfo;
  let status = r.status;
  if (cfEnabled()) {
    let h: CfHostname | null = null;
    try { h = await cfGetByHostname(r.domain); } catch { /* offline / not created yet */ }
    info = await ownerInfo(r.domain, r.verifyToken, h);
    if (info.active && r.status !== "active") {
      try { await db.update(customDomains).set({ status: "active", verifiedAt: new Date() }).where(eq(customDomains.id, r.id)); status = "active"; } catch { /* ignore */ }
    }
  } else {
    info = await ownerInfo(r.domain, r.verifyToken, null);
  }
  return { id: r.id, domain: r.domain, userId: r.userId, cardId: r.cardId, status, addedByRole: r.addedByRole, verifiedAt: r.verifiedAt, createdAt: r.createdAt, dns: info };
}

export const domainRouter = createRouter({
  // ── PUBLIC: host → card slug (client gate on a custom domain) ──
  resolve: publicQuery.input(z.object({ host: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const domain = normDomain(input.host);
    if (!domain || domain === ROOT_HOST || domain.endsWith("." + ROOT_HOST)) return null;
    try {
      const row = await db.query.customDomains.findFirst({ where: and(eq(customDomains.domain, domain), eq(customDomains.status, "active")) });
      if (!row) return null;
      return await resolveSlugFor(db, row.userId, row.cardId);
    } catch { return null; }
  }),

  // ── ADMIN: is Cloudflare for SaaS wired up? (real token/zone/SaaS check) ──
  cfStatus: adminQuery.query(async () => {
    const health = await cfHealthCheck();
    return { enabled: cfEnabled(), verified: health.ok, error: health.ok ? null : (health.error ?? null), fallback: cfFallbackTarget() };
  }),

  // ── ADMIN: manage domains for ANY user ──
  list: adminQuery.query(async () => {
    const db = getDb();
    try {
      const rows = await db.select().from(customDomains).leftJoin(users, eq(users.id, customDomains.userId)).orderBy(desc(customDomains.createdAt));
      return await Promise.all(rows.map(async (r) => ({
        ...(await enrich(db, r.custom_domains)),
        email: r.users?.email ?? null, name: r.users?.fullName ?? null,
      })));
    } catch { return []; }
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
      if (await db.query.customDomains.findFirst({ where: eq(customDomains.domain, domain) })) throw new TRPCError({ code: "CONFLICT", message: "That domain is already registered." });
      const verifyToken = nanoid(24);
      let cfHost: CfHostname | null = null;
      if (cfEnabled()) { try { cfHost = await cfCreateHostname(domain); } catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Cloudflare: ${(e as Error).message}` }); } }
      await db.insert(customDomains).values({ domain, userId, cardId: input.cardId, verifyToken, addedByRole: "admin", status: "pending" });
      return { ok: true, domain, dns: await ownerInfo(domain, verifyToken, cfHost) };
    }),

  verify: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    const row = await db.query.customDomains.findFirst({ where: eq(customDomains.id, input.id) });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return verifyRow(db, row);
  }),

  setStatus: adminQuery.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "active", "disabled"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(customDomains).set({ status: input.status, verifiedAt: input.status === "active" ? new Date() : null }).where(eq(customDomains.id, input.id));
      return { ok: true };
    }),

  remove: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    const row = await db.query.customDomains.findFirst({ where: eq(customDomains.id, input.id) });
    if (row && cfEnabled()) { try { await cfDeleteByHostname(row.domain); } catch { /* best-effort */ } }
    await db.delete(customDomains).where(eq(customDomains.id, input.id));
    return { ok: true };
  }),

  // ── CUSTOMER / RESELLER: manage my own domains (plan-gated) ──
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const access = await domainAccess(db, ctx.user.id, ctx.user.role);
    const { keyId } = await razorpayCreds(db);
    let domains: Awaited<ReturnType<typeof enrich>>[] = [];
    try {
      const rows = await db.select().from(customDomains).where(eq(customDomains.userId, ctx.user.id)).orderBy(desc(customDomains.createdAt));
      domains = await Promise.all(rows.map((r) => enrich(db, r)));
    } catch { domains = []; }
    // Grandfather anyone who already connected a domain under the old model so
    // their live domain is never hidden behind the add-on offer.
    return {
      eligible: access.eligible || domains.length > 0, freeEligible: access.free, addonPaid: access.paid,
      addonPrice: DOMAIN_ADDON_PRICE, onlinePay: !!keyId,
      cloudflare: cfEnabled(), cnameTarget: cfEnabled() ? cfFallbackTarget() : CNAME_TARGET, domains,
    };
  }),

  // Add-on checkout: free-eligible → grant immediately; else create a Razorpay
  // order (or signal manual/contact when online pay isn't configured yet).
  addonCheckout: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const access = await domainAccess(db, ctx.user.id, ctx.user.role);
    if (access.eligible) return { granted: true as const };
    const { keyId, keySecret } = await razorpayCreds(db);
    if (!keyId || !keySecret) return { manual: true as const, price: DOMAIN_ADDON_PRICE };
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64") },
      body: JSON.stringify({ amount: DOMAIN_ADDON_PRICE * 100, currency: "INR", receipt: `domain_${ctx.user.id}_${Date.now()}`.slice(0, 40), notes: { userId: String(ctx.user.id), addon: "custom_domain" } }),
    });
    if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not start the payment. Please try again." });
    const order = (await res.json()) as { id: string; amount: number };
    return { orderId: order.id, amount: order.amount, currency: "INR", keyId };
  }),

  // Verify a completed Razorpay payment (HMAC of "orderId|paymentId") and grant.
  addonVerify: authedQuery
    .input(z.object({ orderId: z.string().min(1), paymentId: z.string().min(1), signature: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { keySecret } = await razorpayCreds(db);
      if (!keySecret) throw new TRPCError({ code: "BAD_REQUEST", message: "Online payment isn't configured." });
      const expected = crypto.createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
      if (expected !== input.signature) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment could not be verified." });
      await grantAddon(db, ctx.user.id);
      return { ok: true };
    }),

  add: authedQuery.input(z.object({ domain: z.string().min(3), cardId: z.number().int().positive().default(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (!(await domainAccess(db, ctx.user.id, ctx.user.role)).eligible)
        throw new TRPCError({ code: "FORBIDDEN", message: "Add the Custom Domain add-on (₹499) to connect your domain." });
      const domain = normDomain(input.domain);
      if (!isValidDomain(domain)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid domain like card.yourbusiness.com" });
      if (await db.query.customDomains.findFirst({ where: eq(customDomains.domain, domain) })) throw new TRPCError({ code: "CONFLICT", message: "That domain is already registered." });
      const verifyToken = nanoid(24);
      let cfHost: CfHostname | null = null;
      if (cfEnabled()) { try { cfHost = await cfCreateHostname(domain); } catch (e) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Cloudflare: ${(e as Error).message}` }); } }
      const role = ctx.user.role === "reseller" ? "reseller" : "customer";
      await db.insert(customDomains).values({ domain, userId: ctx.user.id, cardId: input.cardId, verifyToken, addedByRole: role, status: "pending" });
      return { ok: true, domain, dns: await ownerInfo(domain, verifyToken, cfHost) };
    }),

  verifyMine: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const row = await db.query.customDomains.findFirst({ where: and(eq(customDomains.id, input.id), eq(customDomains.userId, ctx.user.id)) });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return verifyRow(db, row);
  }),

  removeMine: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const row = await db.query.customDomains.findFirst({ where: and(eq(customDomains.id, input.id), eq(customDomains.userId, ctx.user.id)) });
    if (row && cfEnabled()) { try { await cfDeleteByHostname(row.domain); } catch { /* best-effort */ } }
    await db.delete(customDomains).where(and(eq(customDomains.id, input.id), eq(customDomains.userId, ctx.user.id)));
    return { ok: true };
  }),
});

/** Shared verify: Cloudflare status when enabled, else a manual TXT check. */
async function verifyRow(db: ReturnType<typeof getDb>, row: Row) {
  if (cfEnabled()) {
    let h: CfHostname | null = null;
    try { h = await cfGetByHostname(row.domain); } catch (e) { return { ok: false, message: `Cloudflare: ${(e as Error).message}` }; }
    if (cfIsActive(h)) {
      await db.update(customDomains).set({ status: "active", verifiedAt: new Date() }).where(eq(customDomains.id, row.id));
      return { ok: true };
    }
    const reason = h?.ssl?.status || h?.status || "pending";
    return { ok: false, message: `Not live yet (Cloudflare status: ${reason}). Make sure the CNAME record is added; SSL can take a few minutes.` };
  }
  const ok = await txtVerified(row.domain, row.verifyToken);
  if (!ok) return { ok: false, message: "DNS TXT record not found yet — add it and try again in a few minutes." };
  await db.update(customDomains).set({ status: "active", verifiedAt: new Date() }).where(eq(customDomains.id, row.id));
  return { ok: true };
}
