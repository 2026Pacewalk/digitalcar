/* ─── Mobile app ─────────────────────────────────────────────────────────────
 * What the DigitalCarda iPhone/Android app needs beyond the website's API:
 *
 *  · Device sessions — the app signs in once and stays signed in for 90 days
 *    of use. It holds a rotating refresh token (only its hash is stored) and
 *    short-lived access tokens tied to the session, so signing a phone out
 *    ends its access within a minute.
 *  · Push tokens — where to send "New enquiry" alerts.
 *  · Account deletion — required by both app stores.
 *  · Config — the minimum supported app version.
 *
 * All additive: nothing the website uses changes behaviour. */
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accountDeletionRequests, appSessions, appSettings, pushTokens, users } from "@db/schema";
import { createToken, verifyToken } from "./lib/jwt";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";
import { isExpoPushToken } from "./lib/push";
import { forgetSession } from "./context";

const DAY = 86_400_000;
const SESSION_DAYS = 90;
const ACCESS_TTL = "1h";
const ACCESS_TTL_MS = 60 * 60 * 1000;
const DELETION_GRACE_DAYS = 30;

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
      if (ctx.user.role === "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin accounts can't be deleted from the app." });
      }
      if (!(await bcrypt.compare(input.password, ctx.user.password))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That password isn't right. Enter the password you sign in with." });
      }
      const db = getDb();
      const now = new Date();
      const scheduledFor = new Date(now.getTime() + DELETION_GRACE_DAYS * DAY);

      const pending = await db.select({ id: accountDeletionRequests.id }).from(accountDeletionRequests)
        .where(and(eq(accountDeletionRequests.userId, ctx.user.id), eq(accountDeletionRequests.status, "pending"))).limit(1);
      if (!pending[0]) {
        await db.insert(accountDeletionRequests).values({
          userId: ctx.user.id, email: ctx.user.email, reason: input.reason || null, source: "app", scheduledFor,
        });
      }

      await db.update(users).set({ status: "inactive" }).where(eq(users.id, ctx.user.id));
      const live = await db.select({ id: appSessions.id }).from(appSessions)
        .where(and(eq(appSessions.userId, ctx.user.id), isNull(appSessions.revokedAt)));
      for (const s of live) await revokeSessionRow(db, s.id);
      await db.update(pushTokens).set({ disabledAt: now }).where(and(eq(pushTokens.userId, ctx.user.id), isNull(pushTokens.disabledAt)));

      // Tell the team so the erasure is completed on time.
      try {
        const { sendEmail, ownerAddress } = await import("./lib/mail");
        const when = scheduledFor.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
        const reason = input.reason ? `\nReason given: ${input.reason}` : "";
        await sendEmail(ownerAddress(), {
          kind: "accountDeletionRequestAdmin",
          subject: `Account deletion requested — ${ctx.user.email}`,
          text: `${ctx.user.fullName} (${ctx.user.email}, user #${ctx.user.id}) asked to delete their account from the mobile app.\n\nThe account is signed out everywhere and deactivated, and its card is paused. Complete the deletion on or after ${when}.${reason}`,
          html: `<p><b>${escapeHtml(ctx.user.fullName)}</b> (${escapeHtml(ctx.user.email)}, user #${ctx.user.id}) asked to delete their account from the mobile app.</p><p>The account is signed out everywhere and deactivated, and its card is paused. Complete the deletion on or after <b>${when}</b>.</p>${input.reason ? `<p>Reason given: ${escapeHtml(input.reason)}</p>` : ""}`,
        });
      } catch (e) {
        console.error("[mobile] deletion notice email failed:", (e as Error).message);
      }

      return { ok: true as const, scheduledFor };
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
