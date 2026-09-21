/* USD for the add-ons (ID/Membership card, custom domain), the public
   currency.context answer and the admin's USD settings: the pure parts of
   api/currency-router.ts, api/addon-router.ts and api/domain-router.ts.

   Like ./fx.ts, nothing here imports the schema or the DB connection, so it is
   unit-tested directly (usd-checkout.test.ts). The routers do the DB reads and
   pass the results in. */
import { TRPCError } from "@trpc/server";
import {
  toMinor, usdFromInr, isValidRate, formatMoney, FX_RATE_MIN, FX_RATE_MAX,
  type Currency, type CurrencyContext, type AddonCycle, type PlanCycle,
} from "@contracts/money";
import {
  FX_KEYS, usdFor, usdPriceTable, readOrderMoney, suggestCurrency, isInvalidCurrencyError, isPriceKey, isValidOverride,
  UnsupportedCurrencyError, priceKey, type FxConfig, type PriceKey,
} from "./fx";
import { createRazorpayOrder, type RazorpayCreds } from "./razorpay";

type Rates = Pick<FxConfig, "rate" | "overrides">;

/** An item's price in the checkout currency: the INR list price untouched, or its USD price. */
export function priceIn(currency: Currency, key: PriceKey, inr: number, cfg: Rates): number {
  return currency === "USD" ? usdFor(key, inr, cfg) : inr;
}

/** Notes an add-on order carries so verify and the webhook read back what it was
    priced in (readOrderMoney), plus the edge country as GST evidence for the CA.
    `priceMinor` records what the order was actually created for, so a $ payment
    still verifies when the admin edits that item's override in between; an ₹
    order's notes are unchanged. */
export function moneyNotes(currency: Currency, cfg: Pick<FxConfig, "rate">, country?: string | null, priceMinor?: number): Record<string, string> {
  const notes: Record<string, string> = { currency, fxRate: currency === "USD" ? String(cfg.rate) : "1" };
  if (country) notes.country = country;
  if (currency === "USD" && Number.isFinite(priceMinor) && Number(priceMinor) > 0) notes.priceMinor = String(priceMinor);
  return notes;
}

type PaidOrder = { amount: number; currency?: string | null; notes?: Record<string, unknown> | null };

/** What a paid add-on order was worth, after checking it paid this item's price.
    - INR must equal the ₹ price exactly, as before USD existed.
    - USD must equal the $ price now, the $ price at the rate the order was
      created at (notes.fxRate), or the price the order WAS created for
      (notes.priceMinor, written by moneyNotes): neither an admin rate change nor
      an edited per-item override between checkout and payment may strand a
      genuine payment. All three are server-written, so a cheaper order still
      can't unlock it.
    Throws BAD_REQUEST otherwise, which the webhook acknowledges instead of
    retrying (a retry can't change the order). */
export function checkPaidItem(order: PaidOrder, item: { key: PriceKey; inr: number }, cfg: Rates, mismatch: string) {
  let money: ReturnType<typeof readOrderMoney>;
  try {
    money = readOrderMoney(order, cfg);
  } catch (e) {
    if (e instanceof UnsupportedCurrencyError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This payment was made in a currency we don't accept. Contact support with your payment ID." });
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: mismatch }); // no readable amount
  }
  const paid = Number(order.amount);
  const noted = Number(order.notes?.priceMinor);
  const ok = money.currency === "INR"
    ? paid === toMinor(item.inr)
    : (Number.isInteger(noted) && noted > 0 && paid === noted)
      || [cfg, { rate: money.fxRate, overrides: cfg.overrides }].some((c) => paid === toMinor(usdFor(item.key, item.inr, c)));
  if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: mismatch });
  return money;
}

/** The visitor's country: the edge header; outside production only, the dev
    hook's ?geo=XX stand-in (local dev has no Cloudflare header). */
export function contextCountry(edge: string | null, devCountry: string | null | undefined, isProduction: boolean): string | null {
  if (!isProduction && devCountry && /^[A-Za-z]{2}$/.test(devCountry)) return devCountry.toUpperCase();
  return edge;
}

type PkgRow = { id: number; name?: string; monthlyPrice: unknown; yearlyPrice: unknown; threeYearPrice: unknown };

/** The currency.context answer. USD is offered only while the admin has it on AND
    Razorpay can take payments; otherwise it's ₹ with no $ prices, as before USD. */
export function currencyContext(p: {
  country: string | null; cfg: FxConfig; razorpayEnabled: boolean;
  pkgs: PkgRow[]; addonInr: Record<AddonCycle, number>; domainInr: number;
}): CurrencyContext {
  const usdAvailable = p.cfg.enabled && p.razorpayEnabled;
  return {
    country: p.country,
    suggested: suggestCurrency(p.country, usdAvailable),
    usdAvailable,
    prices: usdAvailable ? usdPriceTable(p.pkgs, p.addonInr, p.domainInr, p.cfg) : null,
  };
}

/** One line of the admin's USD price table. */
export type UsdPriceRow = {
  key: PriceKey;
  label: string;
  inr: number;
  /** INR ÷ rate, rounded up to whole dollars. */
  computed: number;
  /** The admin's whole-dollar override, or null. */
  override: number | null;
  /** What checkout charges: the override when set, else `computed`. */
  usd: number;
};

const CYCLE_LABEL: Record<PlanCycle, string> = { monthly: "Monthly", yearly: "Yearly", triennial: "3 years" };

/** Every paid item's INR price and USD price, for the admin table. ₹0 items (the
    Trial, a package with no 3-year price) are left out: they are always $0. */
export function usdAdminRows(pkgs: PkgRow[], addonInr: Record<AddonCycle, number>, domainInr: number, cfg: Rates): UsdPriceRow[] {
  const rows: UsdPriceRow[] = [];
  const add = (key: PriceKey, label: string, raw: unknown) => {
    const inr = Number(raw ?? 0);
    if (!Number.isFinite(inr) || inr <= 0) return;
    rows.push({ key, label, inr, computed: usdFromInr(inr, cfg.rate), override: cfg.overrides[key] ?? null, usd: usdFor(key, inr, cfg) });
  };
  for (const p of pkgs) {
    const name = p.name || `Plan ${p.id}`;
    add(priceKey.plan(p.id, "monthly"), `${name} · ${CYCLE_LABEL.monthly}`, p.monthlyPrice);
    add(priceKey.plan(p.id, "yearly"), `${name} · ${CYCLE_LABEL.yearly}`, p.yearlyPrice);
    add(priceKey.plan(p.id, "triennial"), `${name} · ${CYCLE_LABEL.triennial}`, p.threeYearPrice);
  }
  add(priceKey.addon("yearly"), "ID / Membership card add-on · Yearly", addonInr.yearly);
  add(priceKey.addon("monthly"), "ID / Membership card add-on · Monthly", addonInr.monthly);
  add(priceKey.domain, "Custom domain setup", domainInr);
  return rows;
}

/** The admin's rate, kept to the 4 decimals payment_orders.fx_rate stores. */
export function parseRate(rate: number): number {
  if (!isValidRate(rate)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `The rate must be between ₹${FX_RATE_MIN} and ₹${FX_RATE_MAX} per $1.` });
  }
  return Math.round(rate * 10_000) / 10_000;
}

/** The admin's USD overrides. A bad entry is refused, not dropped, so a typo is
    never saved as "use the computed price" without the admin knowing. */
export function parseOverrides(raw: Record<string, unknown>): FxConfig["overrides"] {
  const out: FxConfig["overrides"] = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isPriceKey(k)) throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown price "${k}".` });
    if (!isValidOverride(v)) throw new TRPCError({ code: "BAD_REQUEST", message: `USD prices are whole dollars, $1 or more (${k}).` });
    out[k] = v;
  }
  return out;
}

const overridesId = (o: FxConfig["overrides"]) =>
  JSON.stringify(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** app_settings key names that really changed, for the owner's security email
    (names only, never values). */
export function fxChangedKeys(before: FxConfig, after: FxConfig): string[] {
  const keys: string[] = [];
  if (before.enabled !== after.enabled) keys.push(FX_KEYS.enabled);
  if (before.rate !== after.rate) keys.push(FX_KEYS.rate);
  if (overridesId(before.overrides) !== overridesId(after.overrides)) keys.push(FX_KEYS.overrides);
  return keys;
}

/** Shown when turning USD on and Razorpay refuses a USD order. */
export const USD_ACTIVATION_MESSAGE = "Razorpay rejected USD: activate International Payments → International Cards, then try again.";

export type UsdProbe = { ok: boolean; message: string | null };

/** Does this Razorpay account accept USD? Creates a $1 order that is never paid
    (an unpaid order is harmless and never reaches the webhook): the only reliable
    check, since the dashboard setting can't be read through the API. */
export async function probeUsd(creds: RazorpayCreds, create: typeof createRazorpayOrder = createRazorpayOrder): Promise<UsdProbe> {
  try {
    await create({ amount: 100, currency: "USD", receipt: `usd_probe_${Date.now()}`, notes: { purpose: "usd_probe" } }, creds);
    return { ok: true, message: null };
  } catch (e) {
    console.error("[usd] Razorpay USD check failed:", (e as Error)?.message);
    if (isInvalidCurrencyError(e)) return { ok: false, message: USD_ACTIVATION_MESSAGE };
    if ((e as { status?: unknown })?.status === 401) {
      return { ok: false, message: "Razorpay didn't accept the API keys. Check them under Razorpay keys, then try again." };
    }
    return { ok: false, message: "Couldn't check USD with Razorpay just now. Try again in a minute." };
  }
}

/** The custom-domain price for the "add-on required" message: ₹ alone while USD
    is off (exactly the old wording), both once it's on. */
export function domainPriceLabel(inr: number, usd: number | null): string {
  const rupees = formatMoney(inr, "INR", { decimals: 0 });
  return usd == null ? rupees : `${rupees} or ${formatMoney(usd, "USD")}`;
}
