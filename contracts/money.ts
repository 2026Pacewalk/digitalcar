/* Money shared by the server and the browser: the currencies we charge in, how a
   USD price follows the INR one, rounding, gateway units and display. Pure and
   dependency-free, so checkout maths is identical (and unit-tested) on both sides.

   INR is the default everywhere. With USD switched off (the default) every INR
   result here equals what the code computed before USD existed. */

export const CURRENCIES = ["INR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const isCurrency = (v: unknown): v is Currency => v === "INR" || v === "USD";

export type PlanCycle = "monthly" | "yearly" | "triennial";
export type AddonCycle = "yearly" | "monthly";

/* ₹ per $1 that USD prices are derived at. 85 keeps every plan price above its
   INR price after international card fees (~3% + 18% GST). The admin can change
   it within the range below; anything else falls back to the default. */
export const DEFAULT_RATE = 85;
export const FX_RATE_MIN = 50;
export const FX_RATE_MAX = 200;
export const isValidRate = (r: unknown): r is number =>
  typeof r === "number" && Number.isFinite(r) && r >= FX_RATE_MIN && r <= FX_RATE_MAX;

/** USD list price for an INR price: whole dollars, rounded UP so paying in $ is
    never cheaper at the admin's rate, and at least $1 (Razorpay's 100-cent floor).
    The epsilon keeps an exact multiple (₹850 at 85) at $10 instead of $11.
    ₹0 (the Trial) stays $0. Throws on a bad rate or price rather than mis-charge. */
export function usdFromInr(inr: number, rate: number): number {
  if (!isValidRate(rate)) throw new RangeError(`USD rate must be ${FX_RATE_MIN}–${FX_RATE_MAX}, got ${rate}`);
  const v = Number(inr);
  if (!Number.isFinite(v)) throw new TypeError(`INR price is not a number: ${inr}`);
  if (v <= 0) return 0;
  return Math.max(1, Math.ceil(v / rate - 1e-9));
}

/* Two-decimal rounding done on the decimal string, so 1.005 → 1.01 (plain
   Math.round(v * 100) sees 100.4999… and gives 1.00). */
const round2 = (v: number) => Math.round(Number((v * 100).toFixed(6))) / 100;

/** Round a charged amount. INR: whole rupees with Math.round — exactly the rule
    computeAmount has always used (₹99 − 10% = ₹89). USD: cents, so 10% off $2 is
    $1.80 and a small discount is not rounded away. */
export function roundMoney(v: number, cur: Currency): number {
  return cur === "INR" ? Math.round(v) : round2(v);
}

/** Major units → the gateway's minor units (paise or cents; both have 2 decimals). */
export const toMinor = (v: number): number => Math.round(v * 100);

const SYMBOL: Record<Currency, string> = { INR: "₹", USD: "$" };
const LOCALE: Record<Currency, string> = { INR: "en-IN", USD: "en-US" };
export const currencySymbol = (cur: Currency): string => SYMBOL[cur];

/** "auto": no decimals for a whole amount, else 2 ("$12", "$9.18").
    0: whole units with Math.round — identical to the old `"₹" + Math.round(n).toLocaleString("en-IN")`.
    2: always two decimals — identical to the old ledger `toLocaleString("en-IN", { min/max 2 })`. */
export type MoneyDecimals = "auto" | 0 | 2;

/** "₹1,23,456" (Indian grouping) or "$1,056" (US grouping). Accepts DB decimal strings. */
export function formatMoney(v: number | string | null | undefined, cur: Currency, opts: { decimals?: MoneyDecimals } = {}): string {
  const n = Number(v) || 0;
  const decimals = opts.decimals ?? "auto";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  let body: string;
  if (decimals === 0) body = Math.round(abs).toLocaleString(LOCALE[cur]);
  else if (decimals === "auto" && Number.isInteger(round2(abs))) body = round2(abs).toLocaleString(LOCALE[cur]);
  else body = abs.toLocaleString(LOCALE[cur], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sign + SYMBOL[cur] + body;
}

export type ChargeInput = {
  /** List price in `currency`: the INR column, or the USD price from usdFor(). */
  base: number;
  currency: Currency;
  /** First-plan referral discount %. Pass 0 unless this is the member's first paid plan. */
  referralPct?: number;
  /** What the member's running paid plan cost (same currency). 0 when none is running. */
  credit?: number;
  /** Server-decided limited-time offer %. 0 when not requested. */
  offerPct?: number;
};

/** The plan price after the referral discount or upgrade credit, then the offer —
    before any coupon. Lifted verbatim from computeAmount; for INR it returns
    exactly what that code did. The referral discount and the upgrade credit never
    both apply (a member with a running paid plan is not buying a first plan), so
    a credit takes precedence, as today's if/else did. */
export function chargeFor({ base, currency, referralPct = 0, credit = 0, offerPct = 0 }: ChargeInput): number {
  const round = (v: number) => roundMoney(v, currency);
  let charged = credit > 0
    ? Math.max(0, round(base - credit))
    : round(base * (1 - referralPct / 100));
  if (offerPct) charged = round(charged * (1 - offerPct / 100));
  return charged;
}

/** USD list prices shown in the browser (whole dollars; the server re-prices every checkout). */
export type UsdPriceTable = {
  plans: Record<number, Record<PlanCycle, number>>;
  addon: Record<AddonCycle, number>;
  domain: number;
};

/** What `currency.context` returns. `prices` is null while USD is switched off. */
export type CurrencyContext = {
  /** Edge country code (e.g. "US"), never an IP or city. null when unknown. */
  country: string | null;
  suggested: Currency;
  usdAvailable: boolean;
  prices: UsdPriceTable | null;
};
