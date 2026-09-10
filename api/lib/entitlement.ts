/*
 * Who is on a manual / legacy PAID plan — answered from TRUSTED sources only.
 * ---------------------------------------------------------------------------
 * A published card snapshot (`published_cards.data`) is written by the CUSTOMER
 * (publish.saveSnapshot takes `data: z.any()`), so anything inside it is user
 * input. The pause gate and the trial-lifecycle engine used to read
 * `customer.package_id` / `customer.expired_on` straight out of that snapshot,
 * which meant a customer could publish `{package_id: 6, expired_on: "2099-01-01"}`
 * and keep their card live for free — and lifecycle.ts would then stamp their
 * trial "converted", persisting the forgery in the database permanently.
 *
 * The snapshot copy still exists and is still useful — it is what the customer's
 * own dashboard displays — but it is a MIRROR, never the authority. Entitlement
 * is decided from:
 *
 *   1. `subscriptions` — what admin `user.setPackage` actually writes. Checked
 *      by the callers, which already had that query.
 *   2. `customers.json` — the legacy import, written by admins only, never
 *      reachable by a customer request. This is where the real "paying customer
 *      with no subscriptions row" lives (49 × Gold, 32 × Platinum), the case the
 *      original snapshot fallback was added for after a production incident.
 *
 * Keeping (2) is what stops this fix from pausing genuine paying customers.
 */
import fs from "node:fs";
import path from "node:path";

const DAY = 86_400_000;

/** Package ids that mean "paid": Gold = 5, Platinum = 6. */
export const PAID_PACKAGE_IDS = new Set([5, 6]);

type LegacyPlan = { packageId: number; expiredOn: string };

let planCache: Map<string, LegacyPlan> | null = null;
let planAt = 0;

/** email (lowercased) → the plan the ADMIN recorded in customers.json. */
function loadPlans(): Map<string, LegacyPlan> {
  const now = Date.now();
  if (planCache && now - planAt < 60_000) return planCache;
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(fs.readFileSync(path.resolve(p), "utf-8")) as
        { email?: string; package_id?: unknown; expired_on?: unknown }[];
      const map = new Map<string, LegacyPlan>();
      for (const r of rows) {
        const email = String(r.email || "").toLowerCase().trim();
        if (!email) continue;
        const packageId = Number(r.package_id);
        if (!Number.isFinite(packageId)) continue;
        // Keep the STRONGEST record for a duplicated email: a paid row must not
        // be shadowed by a trial row that happens to come later in the file.
        const prev = map.get(email);
        if (prev && PAID_PACKAGE_IDS.has(prev.packageId) && !PAID_PACKAGE_IDS.has(packageId)) continue;
        map.set(email, { packageId, expiredOn: String(r.expired_on ?? "").trim() });
      }
      planCache = map;
      planAt = now;
      return map;
    } catch { /* try the next path */ }
  }
  // File unreadable → an EMPTY map would silently pause every legacy paid
  // customer, so keep serving the last good copy rather than a wrong answer.
  return planCache ?? new Map();
}

/**
 * Is this email a legacy/manual PAID customer whose plan is still valid?
 *
 * An empty `expired_on` means "no expiry recorded" and is treated as live —
 * matching the behaviour these customers have had since the import. A malformed
 * date is treated the same way rather than pausing a paying customer over a bad
 * string.
 */
export function legacyPaidPlan(email: string | null | undefined, now = Date.now()): boolean {
  const key = String(email || "").toLowerCase().trim();
  if (!key) return false;
  const plan = loadPlans().get(key);
  if (!plan || !PAID_PACKAGE_IDS.has(plan.packageId)) return false;
  if (!plan.expiredOn) return true;
  const ms = Date.parse(plan.expiredOn);
  if (!Number.isFinite(ms)) return true;
  return ms + DAY > now; // valid through the end of the recorded day
}

/** The admin-recorded plan for an email, for display/debugging. Never a gate. */
export function legacyPlanOf(email: string | null | undefined): LegacyPlan | null {
  const key = String(email || "").toLowerCase().trim();
  return key ? loadPlans().get(key) ?? null : null;
}
