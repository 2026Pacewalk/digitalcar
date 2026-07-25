import { TRPCError } from "@trpc/server";

/* Lightweight in-memory rate limiter — a first line of defence against
   brute-force logins and enquiry/spam floods on public endpoints.
   Per-process (fine for the current single-VPS deployment); resets on restart.
   For multi-instance scale this would move to Redis. */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** Returns the real client IP, honouring the nginx X-Forwarded-For header. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Throws TOO_MANY_REQUESTS once more than `limit` hits for `key` arrive within
 * `windowMs`. Call at the top of a sensitive mutation.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) {
    const retryAfter = Math.ceil((b.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Please try again in ${retryAfter}s.`,
    });
  }
}
