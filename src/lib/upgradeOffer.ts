import { scopedKey } from "@/hooks/useCustomer";

/* A per-user, limited-time upgrade offer: X% off if they upgrade within 48h.
   The 48h window starts the first time the user sees the offer and is stored
   per-account so it survives reloads. */
export const OFFER_PERCENT = 10;
const OFFER_HOURS = 48;

/** Returns the offer's expiry timestamp (ms), starting a fresh 48h window on first call. */
export function getOfferExpiry(): number {
  try {
    const key = scopedKey("dc_upgrade_offer_expires");
    const raw = localStorage.getItem(key);
    if (raw && Number(raw) > 0) return Number(raw);
    const exp = Date.now() + OFFER_HOURS * 3_600_000;
    localStorage.setItem(key, String(exp));
    return exp;
  } catch {
    return Date.now() + OFFER_HOURS * 3_600_000;
  }
}
