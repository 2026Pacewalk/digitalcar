/* Cloudflare for SaaS (Custom Hostnames) client.
 *
 * When CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID are set in the prod .env, the
 * custom-domains module registers each domain as a Cloudflare Custom Hostname —
 * Cloudflare then issues & renews its SSL automatically and proxies it to our
 * fallback origin (which reaches nginx → the app). No VPS/proxy changes needed.
 *
 * When the env vars are absent (e.g. locally, or before setup) every function
 * reports "not configured" and the router falls back to the manual TXT flow, so
 * nothing breaks.
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN  — token with "SSL and Certificates: Edit" on the zone
 *   CLOUDFLARE_ZONE_ID    — the digitalcarda.in zone id
 *   CF_SAAS_FALLBACK      — hostname customers CNAME to (your fallback origin,
 *                           e.g. ssl.digitalcarda.in). Defaults below.
 */

const CF_API = "https://api.cloudflare.com/client/v4";

function cfConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const fallback = process.env.CF_SAAS_FALLBACK || "ssl.digitalcarda.in";
  return token && zone ? { token, zone, fallback } : null;
}

export function cfEnabled(): boolean {
  return !!cfConfig();
}

export function cfFallbackTarget(): string {
  return (process.env.CF_SAAS_FALLBACK || "ssl.digitalcarda.in").trim();
}

type CfJson = { success: boolean; result?: unknown; errors?: { message: string }[] };

async function cf(path: string, init?: RequestInit): Promise<unknown> {
  const cfg = cfConfig();
  if (!cfg) throw new Error("Cloudflare not configured");
  const res = await fetch(`${CF_API}/zones/${cfg.zone}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = (await res.json()) as CfJson;
  if (!json.success) throw new Error(json.errors?.[0]?.message || `Cloudflare API ${res.status}`);
  return json.result;
}

export type CfHostname = {
  id: string;
  hostname: string;
  status: string; // "pending" | "active" | "blocked" | ...
  ssl?: { status?: string; validation_records?: { txt_name?: string; txt_value?: string; http_url?: string; http_body?: string }[] };
  ownership_verification?: { type?: string; name?: string; value?: string };
  verification_errors?: string[];
};

/** Create (or return the existing) Custom Hostname for a domain. */
export async function cfCreateHostname(hostname: string): Promise<CfHostname> {
  try {
    const r = await cf("/custom_hostnames", {
      method: "POST",
      body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } } }),
    });
    return r as CfHostname;
  } catch (e) {
    // Already exists → fetch and return it instead of failing.
    const existing = await cfGetByHostname(hostname);
    if (existing) return existing;
    throw e;
  }
}

/** Look up a Custom Hostname by its hostname. */
export async function cfGetByHostname(hostname: string): Promise<CfHostname | null> {
  const list = (await cf(`/custom_hostnames?hostname=${encodeURIComponent(hostname)}`)) as CfHostname[];
  return Array.isArray(list) && list.length ? list[0] : null;
}

/** Delete a Custom Hostname (by hostname) so we stop serving/renewing it. */
export async function cfDeleteByHostname(hostname: string): Promise<void> {
  const existing = await cfGetByHostname(hostname);
  if (existing?.id) await cf(`/custom_hostnames/${existing.id}`, { method: "DELETE" });
}

/** Is Cloudflare reporting the hostname's certificate as active & serving? */
export function cfIsActive(h: CfHostname | null): boolean {
  return !!h && h.status === "active" && (h.ssl?.status === "active" || !h.ssl);
}

/** Live check that the token + zone work AND Cloudflare for SaaS is enabled.
   Hitting the custom_hostnames endpoint proves all three at once. */
export async function cfHealthCheck(): Promise<{ ok: boolean; error?: string }> {
  if (!cfEnabled()) return { ok: false, error: "not configured" };
  try { await cf("/custom_hostnames?per_page=1"); return { ok: true }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}
