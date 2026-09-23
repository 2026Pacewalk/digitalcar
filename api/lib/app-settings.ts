/* Platform settings, stored in app_settings (one JSON row per section) and kept
 * in a small in-memory snapshot so code that needs them — the mailer, the login
 * rate limits — can read them without awaiting a query on every call.
 *
 * The snapshot is loaded at boot, refreshed after every save, and re-read in the
 * background once a minute so a change made on another server instance arrives
 * on its own. Environment variables remain the fallback: nothing breaks if the
 * table is empty. */
import { inArray } from "drizzle-orm";
import {
  ALERT_KIND_BY_TEMPLATE, DEFAULT_SETTINGS, type PlatformSettings, type SettingsSection,
} from "@contracts/settings";

const KEY = (section: string) => `settings:${section}`;
const SECTIONS: SettingsSection[] = ["business", "alerts", "email", "security"];
const REFRESH_MS = 60_000;

let snapshot: PlatformSettings = structuredClone(DEFAULT_SETTINGS);
let loadedAt = 0;
let loading: Promise<void> | null = null;

function merge(section: SettingsSection, stored: unknown): void {
  if (!stored || typeof stored !== "object") return;
  const base = snapshot[section] as Record<string, unknown>;
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    if (k in base && v !== undefined && v !== null) base[k] = v;
  }
}

/** Environment values are the starting point, so an untouched install behaves
    exactly as it did before these settings existed. */
function withEnvDefaults(s: PlatformSettings): PlatformSettings {
  if (process.env.LEAD_NOTIFY_TO && !s.alerts.recipients.length) s.alerts.recipients = [process.env.LEAD_NOTIFY_TO];
  return s;
}

export async function loadSettings(force = false): Promise<PlatformSettings> {
  if (!force && Date.now() - loadedAt < REFRESH_MS) return snapshot;
  if (loading) { await loading; return snapshot; }
  loading = (async () => {
    try {
      const { getDb } = await import("../queries/connection");
      const { appSettings } = await import("@db/schema");
      const rows = await getDb().select().from(appSettings).where(inArray(appSettings.key, SECTIONS.map(KEY)));
      const fresh = structuredClone(DEFAULT_SETTINGS);
      snapshot = fresh;
      for (const row of rows) {
        const section = row.key.replace("settings:", "") as SettingsSection;
        if (!SECTIONS.includes(section)) continue;
        try { merge(section, JSON.parse(row.value)); } catch { /* ignore a malformed row */ }
      }
      withEnvDefaults(snapshot);
      loadedAt = Date.now();
    } catch (e) {
      // Never let a settings read break a request — keep whatever we have.
      console.error("[settings] could not load:", (e as Error).message);
      loadedAt = Date.now();
    } finally {
      loading = null;
    }
  })();
  await loading;
  return snapshot;
}

/** The current settings, without awaiting. Triggers a background refresh when
    the snapshot is stale. Use this in synchronous code paths (the mailer). */
export function settings(): PlatformSettings {
  if (Date.now() - loadedAt > REFRESH_MS) void loadSettings();
  return snapshot;
}

export async function saveSettings(section: SettingsSection, values: Record<string, unknown>): Promise<PlatformSettings> {
  const { getDb } = await import("../queries/connection");
  const { appSettings } = await import("@db/schema");
  const db = getDb();
  await loadSettings();
  const merged = { ...(snapshot[section] as Record<string, unknown>), ...values };
  const value = JSON.stringify(merged);
  await db.insert(appSettings).values({ key: KEY(section), value }).onDuplicateKeyUpdate({ set: { value } });
  await loadSettings(true);
  return snapshot;
}

/** Who the platform's own alerts go to. Falls back to LEAD_NOTIFY_TO, then the
    platform address, so alerts are never silently addressed to nobody. */
export function alertRecipients(fallback: string): string[] {
  const list = settings().alerts.recipients.filter(Boolean);
  return list.length ? list : [fallback];
}

/** Is this owner-alert template switched on? Unknown templates are customer
    email and always send. */
export function alertEnabled(templateKind: string | undefined): boolean {
  if (!templateKind) return true;
  const kind = ALERT_KIND_BY_TEMPLATE[templateKind];
  if (!kind) return true;
  return settings().alerts.enabled[kind] !== false;
}

/** Settings the website itself needs (no secrets) — served to every visitor. */
export function publicSettings() {
  const b = settings().business;
  return {
    brandName: b.brandName,
    supportEmail: b.supportEmail,
    supportPhone: b.supportPhone,
    whatsappNumber: b.whatsappNumber,
  };
}

export async function invalidateSettings(): Promise<void> {
  await loadSettings(true);
}

/* ── Admin IP allowlist ─────────────────────────────────────────────────────
   Empty list = the admin portal is open from anywhere (the default). An entry
   is a plain address ("49.36.1.20") or an IPv4 range in CIDR form
   ("49.36.0.0/16"). IPv6 and anything unparseable is compared as text. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function ipAllowed(ip: string, allowlist: string[]): boolean {
  if (!allowlist.length) return true;
  const clean = (ip || "").trim().replace(/^::ffff:/i, "");
  const asInt = ipv4ToInt(clean);
  for (const rawEntry of allowlist) {
    const entry = rawEntry.trim().replace(/^::ffff:/i, "");
    if (!entry) continue;
    if (entry.toLowerCase() === clean.toLowerCase()) return true;
    const [base, bitsRaw] = entry.split("/");
    if (bitsRaw === undefined || asInt === null) continue;
    const baseInt = ipv4ToInt(base);
    const bits = Number(bitsRaw);
    if (baseInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((asInt & mask) === (baseInt & mask)) return true;
  }
  return false;
}
