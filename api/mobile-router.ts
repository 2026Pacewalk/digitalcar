/* ─── Mobile app ─────────────────────────────────────────────────────────────
 * What the DigitalCarda iPhone/Android app needs beyond the website's API:
 *
 *  · Device sessions — the app signs in once and stays signed in for 90 days
 *    of use. It holds a rotating refresh token (only its hash is stored) and
 *    short-lived access tokens tied to the session, so signing a phone out
 *    ends its access within a minute.
 *  · Push tokens — where to send "New enquiry" alerts.
 *  · Account deletion — required by both app stores.
 *  · Web links — one-time links that open a dashboard page on the website
 *    already signed in (plan checkout, NFC orders, email signature).
 *  · Config — the minimum supported app version.
 *
 * All additive: nothing the website uses changes behaviour. */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accountDeletionRequests, appSessions, appSettings, appWebLinks, publishedCards, pushTokens, users } from "@db/schema";
import { createToken, verifyToken } from "./lib/jwt";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";
import { isExpoPushToken } from "./lib/push";
import { forgetSession } from "./context";
import { requestAccountDeletion } from "./lib/account-deletion";

const DAY = 86_400_000;
const SESSION_DAYS = 90;
const ACCESS_TTL = "1h";
const ACCESS_TTL_MS = 60 * 60 * 1000;
const WEB_LINK_TTL_MS = 2 * 60_000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";
/** Dashboard pages the app may open signed in: /dashboard/<words>, optional simple query. */
const SAFE_WEB_PATH = /^\/dashboard(\/[a-z0-9-]+)*\/?(\?[A-Za-z0-9=&_.%-]{0,120})?$/;

/* The older card system's records (customers.json), cached for a minute. */
type LegacyRow = { id?: unknown; slug?: string; email?: string; name?: string };
let legacyRows: LegacyRow[] = [];
let legacyRowsAt = 0;
function legacyCustomers(): LegacyRow[] {
  if (Date.now() - legacyRowsAt < 60_000) return legacyRows;
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(fs.readFileSync(path.resolve(p), "utf-8"));
      if (Array.isArray(rows)) { legacyRows = rows as LegacyRow[]; legacyRowsAt = Date.now(); return legacyRows; }
    } catch { /* try the next path */ }
  }
  return legacyRows;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newRefreshToken = () => randomBytes(32).toString("base64url");
const platformSchema = z.enum(["ios", "android", "web", "unknown"]).default("unknown");

async function issue(user: { id: number; email: string; role: string }, sessionId: number, refreshToken: string) {
  const accessToken = await createToken({ userId: user.id, email: user.email, role: user.role }, { expiresIn: ACCESS_TTL, sid: sessionId });
  return {
    sessionId,
    accessToken,
    accessExpiresAt: Date.now() + ACCESS_TTL_MS,
    refreshToken,
  };
}

/** The session id carried by the caller's access token, if any. */
async function callerSessionId(req: Request): Promise<number | null> {
  const token = req.headers.get("x-auth-token") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return (await verifyToken(token))?.sid ?? null;
}

async function revokeSessionRow(db: ReturnType<typeof getDb>, sessionId: number) {
  await db.update(appSessions).set({ revokedAt: new Date() }).where(eq(appSessions.id, sessionId));
  await db.update(pushTokens).set({ disabledAt: new Date() }).where(and(eq(pushTokens.sessionId, sessionId), isNull(pushTokens.disabledAt)));
  forgetSession(sessionId);
}

export const mobileRouter = createRouter({
  /** Called right after sign-in: turns the sign-in into a long-lived device session. */
  startSession: authedQuery
    .input(z.object({
      platform: platformSchema,
      deviceName: z.string().trim().max(120).optional(),
      appVersion: z.string().trim().max(32).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const refreshToken = newRefreshToken();
      const tokenHash = sha256(refreshToken);
      await db.insert(appSessions).values({
        userId: ctx.user.id,
        tokenHash,
        platform: input.platform,
        deviceName: input.deviceName || null,
        appVersion: input.appVersion || null,
        expiresAt: new Date(Date.now() + SESSION_DAYS * DAY),
      });
      const row = await db.select({ id: appSessions.id }).from(appSessions).where(eq(appSessions.tokenHash, tokenHash)).limit(1);
      const sessionId = row[0]?.id;
      if (!sessionId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't start the session. Please sign in again." });
      return issue(ctx.user, sessionId, refreshToken);
    }),

  /** Exchanges the refresh token for a new access token (and a new refresh token). */
  refresh: publicQuery
    .input(z.object({ refreshToken: z.string().min(20).max(200) }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`app-refresh:${clientIp(ctx.req)}`, 60, 60_000);
      const db = getDb();
      const hash = sha256(input.refreshToken);
      const rows = await db.select().from(appSessions)
        .where(or(eq(appSessions.tokenHash, hash), eq(appSessions.prevTokenHash, hash))).limit(1);
      const s = rows[0];
      const expired = () => new TRPCError({ code: "UNAUTHORIZED", message: "SESSION_ENDED: Please sign in again." });
      if (!s || s.revokedAt || new Date(s.expiresAt).getTime() <= Date.now()) throw expired();

      if (s.tokenHash !== hash) {
        // An already-rotated token. Moments after a rotation that's two refreshes
        // racing on the same phone — harmless, the app retries with the new one.
        // Later, it means an old token was copied and replayed: end the session.
        if (Date.now() - new Date(s.lastUsedAt).getTime() < 60_000) {
          throw new TRPCError({ code: "CONFLICT", message: "REFRESH_RACE: Retry with the latest token." });
        }
        await revokeSessionRow(db, s.id);
        throw expired();
      }

      const user = await db.query.users.findFirst({ where: eq(users.id, s.userId) });
      if (!user || user.status !== "active") {
        await revokeSessionRow(db, s.id);
        throw expired();
      }

      const refreshToken = newRefreshToken();
      await db.update(appSessions).set({
        tokenHash: sha256(refreshToken),
        prevTokenHash: hash,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DAYS * DAY), // 90 days from last use
      }).where(eq(appSessions.id, s.id));
      return issue(user, s.id, refreshToken);
    }),

  /** Signs this device out. Works with an expired access token. */
  signOut: publicQuery
    .input(z.object({ refreshToken: z.string().min(20).max(200) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const hash = sha256(input.refreshToken);
      const rows = await db.select({ id: appSessions.id }).from(appSessions)
        .where(or(eq(appSessions.tokenHash, hash), eq(appSessions.prevTokenHash, hash))).limit(1);
      if (rows[0]) await revokeSessionRow(db, rows[0].id);
      return { ok: true as const };
    }),

  /** Phones and tablets signed in to this account. */
  sessions: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const current = await callerSessionId(ctx.req);
    const rows = await db.select({
      id: appSessions.id, platform: appSessions.platform, deviceName: appSessions.deviceName,
      appVersion: appSessions.appVersion, lastUsedAt: appSessions.lastUsedAt, createdAt: appSessions.createdAt,
    }).from(appSessions)
      .where(and(eq(appSessions.userId, ctx.user.id), isNull(appSessions.revokedAt), gt(appSessions.expiresAt, new Date())))
      .orderBy(desc(appSessions.lastUsedAt));
    return rows.map((r) => ({ ...r, current: r.id === current }));
  }),

  revokeSession: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select({ id: appSessions.id }).from(appSessions)
        .where(and(eq(appSessions.id, input.id), eq(appSessions.userId, ctx.user.id))).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "That device is already signed out." });
      await revokeSessionRow(db, input.id);
      return { ok: true as const };
    }),

  /** Where this phone receives push notifications. */
  registerDevice: authedQuery
    .input(z.object({ token: z.string().max(255), platform: platformSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!isExpoPushToken(input.token)) throw new TRPCError({ code: "BAD_REQUEST", message: "Not a push token." });
      const db = getDb();
      const sessionId = await callerSessionId(ctx.req);
      const existing = await db.select({ id: pushTokens.id }).from(pushTokens).where(eq(pushTokens.token, input.token)).limit(1);
      if (existing[0]) {
        // Same phone, possibly a different account now: the latest sign-in owns it.
        await db.update(pushTokens).set({ userId: ctx.user.id, sessionId, platform: input.platform, disabledAt: null })
          .where(eq(pushTokens.id, existing[0].id));
      } else {
        await db.insert(pushTokens).values({ userId: ctx.user.id, sessionId, token: input.token, platform: input.platform });
      }
      return { ok: true as const };
    }),

  unregisterDevice: authedQuery
    .input(z.object({ token: z.string().max(255) }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(pushTokens).set({ disabledAt: new Date() })
        .where(and(eq(pushTokens.token, input.token), eq(pushTokens.userId, ctx.user.id)));
      return { ok: true as const };
    }),

  /** Current deletion request, if the account has one. */
  deletionRequest: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb().select().from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.userId, ctx.user.id), eq(accountDeletionRequests.status, "pending"))).limit(1);
    return rows[0] ?? null;
  }),

  /* Deletes the account on request. Immediately: the account is signed out on
     every device and can't sign in, and its card is paused. The team completes
     the erasure after the grace period (in case of a mistaken or malicious
     request); nothing is erased automatically. */
  requestAccountDeletion: authedQuery
    .input(z.object({ password: z.string().min(1).max(200), reason: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`app-delete:${ctx.user.id}`, 5, 15 * 60_000);
      if (ctx.user.role === "super_admin" || ctx.user.role === "staff") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin accounts can't be deleted from the app." });
      }
      if (!(await bcrypt.compare(input.password, ctx.user.password))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That password isn't right. Enter the password you sign in with." });
      }
      const { scheduledFor } = await requestAccountDeletion(getDb(), ctx.user, { reason: input.reason, source: "app" });
      return { ok: true as const, scheduledFor };
    }),

  /** Signs out every phone except this one — offered after a password change. */
  revokeOtherSessions: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const current = await callerSessionId(ctx.req);
    const live = await db.select({ id: appSessions.id }).from(appSessions)
      .where(and(eq(appSessions.userId, ctx.user.id), isNull(appSessions.revokedAt)));
    let signedOut = 0;
    for (const s of live) {
      if (s.id === current) continue;
      await revokeSessionRow(db, s.id);
      signedOut++;
    }
    return { ok: true as const, signedOut };
  }),

  /** A one-time link that opens a dashboard page on the website already signed
      in, so the owner isn't asked for their password again in the browser.
      The page is fixed here (never read from the link), the code works once,
      for two minutes, and only its hash is stored. */
  webLink: authedQuery
    .input(z.object({ next: z.string().max(200) }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`app-weblink:${ctx.user.id}`, 30, 10 * 60_000);
      if (!SAFE_WEB_PATH.test(input.next)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That page can't be opened from the app." });
      }
      const code = randomBytes(24).toString("base64url");
      await getDb().insert(appWebLinks).values({
        userId: ctx.user.id, codeHash: sha256(code), next: input.next, expiresAt: new Date(Date.now() + WEB_LINK_TTL_MS),
      });
      return { url: `${PUBLIC_BASE_URL}/auth/app-link?code=${encodeURIComponent(code)}` };
    }),

  /** The website's side of webLink: swaps the code for a normal website session. */
  redeemWebLink: publicQuery
    .input(z.object({ code: z.string().min(20).max(100) }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`app-weblink-redeem:${clientIp(ctx.req)}`, 30, 10 * 60_000);
      const expired = () => new TRPCError({ code: "UNAUTHORIZED", message: "This link has expired. Open the page again from the DigitalCarda app." });
      const db = getDb();
      const [row] = await db.select().from(appWebLinks).where(eq(appWebLinks.codeHash, sha256(input.code))).limit(1);
      if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now()) throw expired();
      // Claim it atomically, so two tabs racing for one code can't both succeed.
      const claim = await db.update(appWebLinks).set({ usedAt: new Date() })
        .where(and(eq(appWebLinks.id, row.id), isNull(appWebLinks.usedAt)));
      const affected = (claim as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
        ?? (claim as unknown as { affectedRows?: number })?.affectedRows ?? 0;
      if (affected !== 1) throw expired();
      const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
      if (!user || user.status !== "active") throw expired();
      const token = await createToken({ userId: user.id, email: user.email, role: user.role });
      return {
        token,
        next: row.next,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, status: user.status, avatar: user.avatar },
      };
    }),

  /** A card this account still has only on the older system (customers.json).
      The app works on published cards; opening the website dashboard once moves
      an older card across (its auto-publish), so the app offers that. Null when
      the account already has a published card, or has no older card. */
  legacyCard: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const published = await db.select({ id: publishedCards.id }).from(publishedCards).where(eq(publishedCards.userId, ctx.user.id)).limit(1);
    if (published[0]) return null;
    const email = ctx.user.email.toLowerCase().trim();
    const rows = legacyCustomers().filter((r) => String(r.email || "").toLowerCase().trim() === email && String(r.slug || "").trim());
    if (!rows.length) return null;
    // Cards an admin removed stay removed.
    const setting = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "hidden_customers")).limit(1);
    let hidden = new Set<string>();
    try { hidden = new Set((JSON.parse(setting[0]?.value || "[]") as unknown[]).map(String)); } catch { /* none */ }
    const row = rows.find((r) => !hidden.has(String(r.id)));
    if (!row) return null;
    return { slug: String(row.slug).toLowerCase().trim(), name: String(row.name || "").trim() || null };
  }),

  /** Lets the app ask for an update when an old build can no longer work. */
  config: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(appSettings)
      .where(or(eq(appSettings.key, "app_min_version"), eq(appSettings.key, "app_latest_version")));
    const get = (k: string) => rows.find((r) => r.key === k)?.value ?? null;
    return { minVersion: get("app_min_version") ?? "0.0.0", latestVersion: get("app_latest_version") };
  }),
});
