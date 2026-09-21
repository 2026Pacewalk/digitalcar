import { BlockList, isIP } from "node:net";
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

// Cloudflare's edge ranges — https://www.cloudflare.com/ips/ (checked 2026-09-21).
const CLOUDFLARE = new BlockList();
for (const cidr of [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
  "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
]) {
  const [net, bits] = cidr.split("/");
  CLOUDFLARE.addSubnet(net, Number(bits), net.includes(":") ? "ipv6" : "ipv4");
}

function isCloudflare(ip: string): boolean {
  const v = isIP(ip);
  return v !== 0 && CLOUDFLARE.check(ip, v === 6 ? "ipv6" : "ipv4");
}

/**
 * The visitor's IP, trusting only what our own proxies wrote.
 *
 * Not the FIRST X-Forwarded-For entry: Cloudflare keeps whatever X-Forwarded-For
 * the visitor sends and appends to it, so that entry is attacker-typed. The LAST
 * entry is appended by our nginx ($proxy_add_x_forwarded_for) and is the address
 * that actually connected to it:
 *  - a Cloudflare edge → the request really came through Cloudflare, so
 *    CF-Connecting-IP (overwritten by Cloudflare on every request) is the visitor;
 *  - anything else → that address IS the visitor: either nginx's real_ip already
 *    swapped in CF-Connecting-IP, or someone reached the origin directly — and
 *    then their CF-Connecting-IP is ignored, because anyone can send one.
 * X-Real-IP is nginx's same $remote_addr, so it only matters with no proxy (dev).
 */
export function clientIp(req: Request): string {
  const hops = (req.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  const peer = hops.at(-1);
  if (!peer) return req.headers.get("x-real-ip")?.trim() || "unknown";
  if (isCloudflare(peer)) return req.headers.get("cf-connecting-ip")?.trim() || peer;
  return peer;
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
