import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { verifyToken } from "./lib/jwt";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

/* Session liveness, cached briefly so a burst of app requests costs one query. */
const SESSION_CACHE_MS = 30_000;
const sessionCache = new Map<number, { live: boolean; at: number }>();

export function forgetSession(sid: number) {
  sessionCache.delete(sid);
}

async function sessionIsLive(sid: number, userId: number): Promise<boolean> {
  const hit = sessionCache.get(sid);
  if (hit && Date.now() - hit.at < SESSION_CACHE_MS) return hit.live;
  const { appSessions } = await import("@db/schema");
  const rows = await getDb()
    .select({ userId: appSessions.userId, revokedAt: appSessions.revokedAt, expiresAt: appSessions.expiresAt })
    .from(appSessions).where(eq(appSessions.id, sid)).limit(1);
  const s = rows[0];
  const live = !!s && s.userId === userId && !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now();
  if (sessionCache.size > 5000) sessionCache.clear();
  sessionCache.set(sid, { live, at: Date.now() });
  return live;
}

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  try {
    const token =
      opts.req.headers.get("x-auth-token") ||
      opts.req.headers.get("authorization")?.replace("Bearer ", "");

    if (token) {
      const payload = await verifyToken(token);
      // Mobile-app tokens belong to a device session; once that session is
      // signed out (from Settings → Signed-in devices, or a lost phone), its
      // tokens stop working within the cache window, not at token expiry.
      if (payload?.sid && !(await sessionIsLive(payload.sid, payload.userId))) {
        return ctx;
      }
      if (payload) {
        const db = getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.id, payload.userId),
        });
        // A token stays valid until it expires, so re-check the CURRENT account
        // state on every request: a suspended or deactivated (soft-deleted)
        // account must lose API access immediately, not at token expiry.
        if (user && user.status === "active") {
          ctx.user = user;
        }
      }
    }
  } catch {
    // Authentication is optional here
  }

  return ctx;
}
