import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { verifyToken } from "./lib/jwt";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

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
      if (payload) {
        const db = getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.id, payload.userId),
        });
        if (user) {
          ctx.user = user;
        }
      }
    }
  } catch {
    // Authentication is optional here
  }

  return ctx;
}
