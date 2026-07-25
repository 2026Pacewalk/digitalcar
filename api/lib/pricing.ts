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
