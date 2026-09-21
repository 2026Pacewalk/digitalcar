import { describe, expect, it } from "vitest";
import { clientIp, enforceRateLimit } from "./rate-limit";

const req = (headers: Record<string, string>) => new Request("https://digitalcarda.in/api/trpc", { headers });

const VISITOR = "203.0.113.7";
const ATTACKER = "198.51.100.9";
const CF_EDGE = "162.158.12.34";
const CF_EDGE_V6 = "2400:cb00:2048:1::a29f:1";

describe("clientIp", () => {
  it("ignores a forged X-Forwarded-For sent through Cloudflare (nginx without real_ip)", () => {
    // Visitor typed "6.6.6.6", Cloudflare appended the visitor, nginx appended the edge.
    expect(clientIp(req({
      "x-forwarded-for": `6.6.6.6, ${VISITOR}, ${CF_EDGE}`,
      "cf-connecting-ip": VISITOR,
      "x-real-ip": CF_EDGE,
    }))).toBe(VISITOR);
  });

  it("returns the same IP however the forged entries rotate", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(clientIp(req({
        "x-forwarded-for": `10.0.${i}.1, 1.2.3.${i}, ${VISITOR}, ${CF_EDGE}`,
        "cf-connecting-ip": VISITOR,
      })));
    }
    expect([...seen]).toEqual([VISITOR]);
  });

  it("uses nginx's address when real_ip has already restored the visitor", () => {
    expect(clientIp(req({
      "x-forwarded-for": `6.6.6.6, ${VISITOR}, ${VISITOR}`,
      "cf-connecting-ip": VISITOR,
      "x-real-ip": VISITOR,
    }))).toBe(VISITOR);
  });

  it("recognises Cloudflare's IPv6 edges", () => {
    expect(clientIp(req({
      "x-forwarded-for": `2001:db8::1, ${CF_EDGE_V6}`,
      "cf-connecting-ip": "2001:db8::1",
    }))).toBe("2001:db8::1");
  });

  it("ignores CF-Connecting-IP when the origin is hit directly", () => {
    // Bypassing Cloudflare, the attacker sets every header, but nginx appends
    // the address that really connected.
    expect(clientIp(req({
      "x-forwarded-for": `1.1.1.1, ${ATTACKER}`,
      "cf-connecting-ip": "1.1.1.1",
      "x-real-ip": ATTACKER,
    }))).toBe(ATTACKER);
  });

  it("ignores a Cloudflare IP planted earlier in the chain", () => {
    expect(clientIp(req({
      "x-forwarded-for": `${VISITOR}, ${CF_EDGE}, ${ATTACKER}`,
      "cf-connecting-ip": VISITOR,
    }))).toBe(ATTACKER);
  });

  it("does not trust X-Real-IP over the address nginx appended", () => {
    expect(clientIp(req({
      "x-forwarded-for": ATTACKER,
      "x-real-ip": "5.5.5.5",
    }))).toBe(ATTACKER);
  });

  it("falls back to the edge address if Cloudflare sent no CF-Connecting-IP", () => {
    expect(clientIp(req({ "x-forwarded-for": `6.6.6.6, ${CF_EDGE}` }))).toBe(CF_EDGE);
  });

  it("tolerates blank and padded entries", () => {
    expect(clientIp(req({ "x-forwarded-for": ` , ${ATTACKER} ,  ` }))).toBe(ATTACKER);
  });

  it("falls back to X-Real-IP, then 'unknown', with no proxy in front", () => {
    expect(clientIp(req({ "x-real-ip": ` ${VISITOR} ` }))).toBe(VISITOR);
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("enforceRateLimit keyed by clientIp", () => {
  it("stops one real IP rotating a fake X-Forwarded-For after the limit", () => {
    const key = `test-register-${Date.now()}`;
    let allowed = 0;
    for (let i = 0; i < 50; i++) {
      const ip = clientIp(req({
        "x-forwarded-for": `9.9.${i}.${i}, ${VISITOR}, ${CF_EDGE}`,
        "cf-connecting-ip": VISITOR,
      }));
      try {
        enforceRateLimit(`${key}:${ip}`, 5, 10 * 60_000);
        allowed++;
      } catch (e) {
        expect((e as { code?: string }).code).toBe("TOO_MANY_REQUESTS");
      }
    }
    expect(allowed).toBe(5);
  });
});
