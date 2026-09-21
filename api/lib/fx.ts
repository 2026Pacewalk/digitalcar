/* USD checkout: config, price resolution and gateway helpers (server only).

   A USD price FOLLOWS the INR price: INR ÷ the admin's ₹-per-$ rate, rounded up
   to whole dollars, unless the admin set a per-item override. Everything lives in
   app_settings, so subscription_packages (and the deploy-time INR price upsert)
   never change. USD is off until the admin turns usd_enabled on; while it is off,
   every checkout resolves to INR exactly as before.

   No runtime import of the schema or the DB connection: the helpers here stay pure
   and unit-testable, and getFxConfig takes the db from its caller. */
import { TRPCError } from "@trpc/server";
import type { getDb } from "../queries/connection";
import {
  usdFromInr, isCurrency, isValidRate, currencySymbol, DEFAULT_RATE, FX_RATE_MIN, FX_RATE_MAX,
  type Currency, type PlanCycle, type AddonCycle, type UsdPriceTable,
} from "@contracts/money";

export { DEFAULT_RATE, FX_RATE_MIN, FX_RATE_MAX };

type Db = ReturnType<typeof getDb>;

/** app_settings keys. gatewayAlertAt throttles the owner's "Razorpay rejected USD" alert to one a day. */
export const FX_KEYS = {
  enabled: "usd_enabled",
  rate: "usd_inr_rate",
  overrides: "usd_price_overrides",
  gatewayAlertAt: "usd_gateway_alert_at",
} as const;

export type FxConfig = {
  enabled: boolean;
  /** ₹ per $1, always within FX_RATE_MIN..FX_RATE_MAX. */
  rate: number;
  /** Whole-dollar prices by priceKey; only valid entries survive parsing. */
  overrides: Partial<Record<PriceKey, number>>;
};

export type PriceKey = `plan:${number}:${PlanCycle}` | `addon:${AddonCycle}` | "domain";

/** Keys for usdFor() and the usd_price_overrides JSON. */
export const priceKey = {
  plan: (id: number, cycle: PlanCycle): PriceKey => `plan:${id}:${cycle}`,
  addon: (cycle: AddonCycle): PriceKey => `addon:${cycle}`,
  domain: "domain" as PriceKey,
};

const PRICE_KEY_RE = /^(plan:\d+:(monthly|yearly|triennial)|addon:(yearly|monthly)|domain)$/;
export const isPriceKey = (k: unknown): k is PriceKey => typeof k === "string" && PRICE_KEY_RE.test(k);

/** An override is a whole number of dollars, at least $1 (Razorpay's floor). */
export const isValidOverride = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100_000;

/** Keep only well-formed overrides (known key, whole dollars ≥ 1). Also for
    sanitising the admin's input before it is saved as usd_price_overrides. */
export function cleanOverrides(raw: unknown): FxConfig["overrides"] {
  const out: FxConfig["overrides"] = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) if (isPriceKey(k) && isValidOverride(v)) out[k] = v;
  }
  return out;
}

/** Build the config from raw app_settings values. Anything missing or malformed
    falls back to the safe default: USD off, rate 85, no overrides. */
export function parseFxConfig(values: Partial<Record<string, string | null | undefined>>): FxConfig {
  const rate = Number(values[FX_KEYS.rate]);
  let overrides: FxConfig["overrides"] = {};
  try { overrides = cleanOverrides(JSON.parse(values[FX_KEYS.overrides] || "{}")); }
  catch { /* unreadable JSON: computed prices only */ }
  return {
    enabled: values[FX_KEYS.enabled] === "true",
    rate: isValidRate(rate) ? rate : DEFAULT_RATE,
    overrides,
  };
}

export async function getFxConfig(db: Db): Promise<FxConfig> {
  const keys: string[] = [FX_KEYS.enabled, FX_KEYS.rate, FX_KEYS.overrides];
  const rows = await db.query.appSettings.findMany({ where: (s, { inArray }) => inArray(s.key, keys) });
  return parseFxConfig(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/* ── "Really paid in $" ───────────────────────────────────────────────────────
   subscriptions.currency is never trusted on its own. That column's old default
   was 'USD', so every row written before USD existed — including all of
   db/recover-members.mjs's — carries the label although it was paid in ₹, and
   nothing rewrites them (the deploy must not touch live rows). A running plan
   counts as paid in $ only when the member has a VERIFIED USD payment on record:
   the rule api/lib/referral-value.ts already uses. Everything that reads the
   label (the checkout currency lock, the upgrade credit, the renewal reminder's
   credit tip, the Subscription page) resolves it through these. */

/** The currency a subscription row really counts as. Anything but a corroborated
    'USD' is ₹ — exactly what every such row was charged in. */
export const effectiveRowCurrency = (label: unknown, paidInUsd: boolean): Currency =>
  label === "USD" && paidInUsd ? "USD" : "INR";

/** The member's newest verified USD payment, or undefined. Proof a 'USD' label
    is real, and the rate that payment was priced at (for an ₹ upgrade credit). */
export function verifiedUsdPayment(db: Db, userId: number) {
  return db.query.paymentOrders.findFirst({
    where: (p, { and, eq }) => and(eq(p.userId, userId), eq(p.currency, "USD"), eq(p.status, "verified")),
    orderBy: (p, { desc }) => [desc(p.verifiedAt)],
  });
}

/** Which of these members have a verified USD payment — one query, for the crons. */
export async function usersWithUsdPayments(db: Db, userIds: number[]): Promise<Set<number>> {
  if (!userIds.length) return new Set<number>();
  const rows = await db.query.paymentOrders.findMany({
    where: (p, { and, eq, inArray }) => and(inArray(p.userId, userIds), eq(p.currency, "USD"), eq(p.status, "verified")),
    columns: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

/** The USD price for one item: the admin's override when valid, else the INR
    price converted at the rate. A ₹0 item (the Trial) is always $0. */
export function usdFor(key: PriceKey, inr: number, cfg: Pick<FxConfig, "rate" | "overrides">): number {
  const v = Number(inr);
  if (!Number.isFinite(v)) throw new TypeError(`INR price for ${key} is not a number: ${inr}`);
  if (v <= 0) return 0;
  const o = cfg.overrides[key];
  return isValidOverride(o) ? o : usdFromInr(v, cfg.rate);
}

type PkgPrices = { id: number; monthlyPrice: unknown; yearlyPrice: unknown; threeYearPrice: unknown };
const num = (v: unknown) => Number(v ?? 0);

/** Every USD list price the browser shows, from the same inputs checkout uses. */
export function usdPriceTable(
  pkgs: PkgPrices[],
  addonInr: Record<AddonCycle, number>,
  domainInr: number,
  cfg: Pick<FxConfig, "rate" | "overrides">,
): UsdPriceTable {
  const plans: UsdPriceTable["plans"] = {};
  for (const p of pkgs) {
    plans[p.id] = {
      monthly: usdFor(priceKey.plan(p.id, "monthly"), num(p.monthlyPrice), cfg),
      yearly: usdFor(priceKey.plan(p.id, "yearly"), num(p.yearlyPrice), cfg),
      triennial: usdFor(priceKey.plan(p.id, "triennial"), num(p.threeYearPrice), cfg),
    };
  }
  return {
    plans,
    addon: {
      yearly: usdFor(priceKey.addon("yearly"), addonInr.yearly, cfg),
      monthly: usdFor(priceKey.addon("monthly"), addonInr.monthly, cfg),
    },
    domain: usdFor(priceKey.domain, domainInr, cfg),
  };
}

/** Thrown for a gateway order in a currency we never create (anything but INR/USD).
    The webhook should log it and answer 200, so Razorpay does not retry forever. */
export class UnsupportedCurrencyError extends Error {
  currency: string;
  constructor(currency: string) {
    super(`Unsupported payment currency: ${currency || "(none)"}`);
    this.name = "UnsupportedCurrencyError";
    this.currency = currency;
  }
}

type GatewayOrder = { amount: number; currency?: string | null; notes?: Record<string, unknown> | null };

/** What a paid Razorpay order is worth, for recording it. The currency comes from
    the gateway (notes.currency only if the gateway omitted it; a mismatch is
    refused). INR is rate 1; USD uses the rate stored in the notes at checkout, so
    a rate change between checkout and verify can't change what gets credited,
    falling back to the current rate for an order without one. */
export function readOrderMoney(order: GatewayOrder, cfg: Pick<FxConfig, "rate">): { amount: number; currency: Currency; fxRate: number } {
  const noted = String(order.notes?.currency ?? "").trim().toUpperCase();
  const given = String(order.currency ?? "").trim().toUpperCase();
  const cur = given || noted || "INR";
  if (!isCurrency(cur)) throw new UnsupportedCurrencyError(cur);
  if (noted && noted !== cur) throw new UnsupportedCurrencyError(`${cur} (order notes say ${noted})`);
  const amount = Number(order.amount) / 100;
  if (!Number.isFinite(amount) || amount < 0) throw new TypeError(`Bad order amount: ${order.amount}`);
  if (cur === "INR") return { amount, currency: cur, fxRate: 1 };
  const notedRate = Number(order.notes?.fxRate);
  const fxRate = isValidRate(notedRate) ? notedRate : isValidRate(cfg.rate) ? cfg.rate : DEFAULT_RATE;
  return { amount, currency: cur, fxRate };
}

/** True when Razorpay refused an order's currency — International Payments is not
    active on the account. createRazorpayOrder throws with err.status and the
    Razorpay JSON body in the message. */
export function isInvalidCurrencyError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const status = (e as { status?: unknown }).status;
  const msg = String((e as { message?: unknown }).message ?? "");
  return status === 400 && (
    msg.includes("BAD_REQUEST_INVALID_CURRENCY")
    || /"field"\s*:\s*"currency"/.test(msg)
    || /currency is not supported/i.test(msg)
  );
}

/** Currency to suggest for an edge country code. India, unknown ("XX", Tor "T1",
    missing) and USD-unavailable all mean ₹. */
export function suggestCurrency(country: string | null | undefined, usdAvailable = true): Currency {
  const c = String(country ?? "").trim().toUpperCase();
  if (!usdAvailable || !/^[A-Z]{2}$/.test(c) || c === "XX" || c === "IN") return "INR";
  return "USD";
}

/** Shown when $ is asked for but can't be charged (switched off, or Razorpay refused it). */
export const USD_UNAVAILABLE_MESSAGE = "Paying in US dollars isn't available right now. Pay in ₹ or contact us.";

const lockMessage = (cur: Currency) =>
  `Your current plan was paid in ${currencySymbol(cur)}. Upgrades are charged in ${currencySymbol(cur)} until it ends.`;

/** The currency a checkout is charged in. The browser only asks; this decides.
    - Nothing asked → INR.
    - USD switched off → INR only, and no currency lock at all: exactly today's behaviour.
    - USD on → a member whose paid plan is still running pays in that plan's
      currency (`lockedTo`, i.e. latest.currency while paidPlanActive), so the
      upgrade credit is never ₹ taken off a $ price or the other way round.
      A lock value that isn't INR/USD is treated as INR: every row written before
      USD existed is INR. */
export function resolveCheckoutCurrency(p: { requested?: unknown; usdEnabled: boolean; lockedTo?: string | null }): Currency {
  const want = p.requested == null ? "INR" : p.requested;
  if (!isCurrency(want)) throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported currency." });
  if (!p.usdEnabled) {
    if (want === "USD") throw new TRPCError({ code: "PRECONDITION_FAILED", message: USD_UNAVAILABLE_MESSAGE });
    return "INR";
  }
  if (p.lockedTo != null) {
    const lock: Currency = isCurrency(p.lockedTo) ? p.lockedTo : "INR";
    if (lock !== want) throw new TRPCError({ code: "BAD_REQUEST", message: lockMessage(lock) });
  }
  return want;
}
