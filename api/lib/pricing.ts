import { eq } from "drizzle-orm";
import { appSettings } from "@db/schema";
import { getDb } from "../queries/connection";

/* Limited-time upgrade offer. The percentage is ALWAYS decided server-side
   (never trusted from the client) so it can't be inflated to discount a plan.
   The client may only signal that it wants the offer; the server owns the % . */
export const UPGRADE_OFFER_KEY = "upgrade_offer_percent";
export const DEFAULT_OFFER_PERCENT = 10; // mirrors the client-side FOMO banner
export const MAX_OFFER_PERCENT = 25;     // hard cap — even a bad admin setting can't exceed this

const num = (v: unknown) => Number(v ?? 0);

/** Server-authoritative upgrade-offer percentage (admin-configurable, capped). */
export async function getUpgradeOfferPercent(db: ReturnType<typeof getDb>): Promise<number> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, UPGRADE_OFFER_KEY) });
  const val = row ? num(row.value) : DEFAULT_OFFER_PERCENT;
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.min(val, MAX_OFFER_PERCENT);
}

/** Set the upgrade-offer percentage (admin). Clamped to [0, MAX] — 0 disables
    the promo. Even a bad value can never exceed the cap (§68). */
export async function setUpgradeOfferPercent(db: ReturnType<typeof getDb>, pct: number): Promise<number> {
  const val = Math.max(0, Math.min(Math.round(num(pct)), MAX_OFFER_PERCENT));
  await db.insert(appSettings).values({ key: UPGRADE_OFFER_KEY, value: String(val) })
    .onDuplicateKeyUpdate({ set: { value: String(val) } });
  return val;
}
