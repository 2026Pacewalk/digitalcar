/* What a referred friend's paid plan is worth in ₹, for the admin's suggested
   referral reward (api/referral-router.ts adminList). Pure, so it's unit-tested
   without a database (payment-reporting.test.ts). */
import { isValidRate } from "@contracts/money";

const n = (v: unknown) => Number(v ?? 0);

export type PaidPlan = { userId: number; packageId: number; amount: unknown; currency: string };
export type UsdPaymentRow = { userId: number; packageId: number; amount: unknown; fxRate: unknown };

/** Rewards are paid from the ₹ wallet, so a $ plan is valued at the rate its
    payment was recorded at: the verified USD order that created it (same member,
    plan and amount). A 'USD' row with no $ payment on record is a pre-USD row
    carrying the old column default — it was paid in ₹. A ₹ plan is returned
    untouched, exactly as before USD existed. `fallbackRate` only covers a stored
    rate that's unusable, which a recorded payment never has. */
export function referralPlanValue(sub: PaidPlan, usdOrders: UsdPaymentRow[], fallbackRate: number) {
  const paid = n(sub.amount);
  const mine = sub.currency === "USD" ? usdOrders.filter((o) => o.userId === sub.userId) : [];
  if (!mine.length) return { currency: "INR" as const, paid, inr: paid };
  const o = mine.find((x) => x.packageId === sub.packageId && n(x.amount) === paid) ?? mine[0];
  const rate = isValidRate(n(o.fxRate)) ? n(o.fxRate) : fallbackRate;
  return { currency: "USD" as const, paid, inr: Math.round(paid * rate * 100) / 100 };
}
