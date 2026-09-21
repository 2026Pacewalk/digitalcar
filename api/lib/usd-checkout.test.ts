import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { toMinor } from "@contracts/money";
import { FX_KEYS, priceKey, type FxConfig } from "./fx";
import {
  priceIn, moneyNotes, checkPaidItem, contextCountry, currencyContext, usdAdminRows, parseRate, parseOverrides,
  fxChangedKeys, probeUsd, domainPriceLabel, USD_ACTIVATION_MESSAGE,
} from "./usd-checkout";

/* The prices the routers pass in (addon-router ADDON_YEARLY/ADDON_MONTHLY,
   domain-router DOMAIN_ADDON_PRICE). */
const ADDON = { yearly: 299, monthly: Math.round((299 / 12) * 100) / 100 };
const DOMAIN = 499;
const PKGS = [
  { id: 1, name: "Trial", monthlyPrice: "0.00", yearlyPrice: "0.00", threeYearPrice: "0.00" },
  { id: 5, name: "Gold", monthlyPrice: "99.00", yearlyPrice: "999.00", threeYearPrice: "2499.00" },
  { id: 6, name: "Platinum", monthlyPrice: "199.00", yearlyPrice: "1999.00", threeYearPrice: "4999.00" },
];
const cfgAt = (rate: number, overrides: FxConfig["overrides"] = {}, enabled = true): FxConfig => ({ enabled, rate, overrides });
const MISMATCH = "The paid amount doesn't match this add-on. Contact support with your payment ID.";

const trpcCode = (fn: () => unknown) => {
  try { fn(); } catch (e) { return e instanceof TRPCError ? `${e.code}: ${e.message}` : `other: ${(e as Error).message}`; }
  return "no error";
};

describe("INR add-on and domain amounts are unchanged (golden)", () => {
  // Whatever the USD settings, a ₹ checkout charges exactly what the old code did.
  const anyCfgs = [cfgAt(85), cfgAt(60, { "addon:yearly": 9, "addon:monthly": 3, domain: 20 }), cfgAt(200, {}, false)];
  it("charges the same paise as before for every ₹ item", () => {
    for (const cfg of anyCfgs) {
      // addon-router: Math.round(amountRupees(cycle) * 100)
      expect(toMinor(priceIn("INR", priceKey.addon("yearly"), ADDON.yearly, cfg))).toBe(Math.round(ADDON.yearly * 100));
      expect(toMinor(priceIn("INR", priceKey.addon("monthly"), ADDON.monthly, cfg))).toBe(Math.round(ADDON.monthly * 100));
      // domain-router: DOMAIN_ADDON_PRICE * 100
      expect(toMinor(priceIn("INR", priceKey.domain, DOMAIN, cfg))).toBe(DOMAIN * 100);
    }
    expect(ADDON.monthly).toBe(24.92);
    expect(toMinor(ADDON.monthly)).toBe(2492);
    expect(toMinor(ADDON.yearly)).toBe(29900);
    expect(toMinor(DOMAIN)).toBe(49900);
  });

  it("accepts exactly the old ₹ amounts at verify, and nothing else", () => {
    const cfg = cfgAt(85);
    const inr = (amount: number, notes?: Record<string, string>) => ({ amount, currency: "INR", notes });
    expect(checkPaidItem(inr(29900), { key: priceKey.addon("yearly"), inr: ADDON.yearly }, cfg, MISMATCH))
      .toEqual({ amount: 299, currency: "INR", fxRate: 1 });
    expect(checkPaidItem(inr(2492, { userId: "7" }), { key: priceKey.addon("monthly"), inr: ADDON.monthly }, cfg, MISMATCH).amount).toBe(24.92);
    expect(checkPaidItem(inr(49900, { currency: "INR", fxRate: "1" }), { key: priceKey.domain, inr: DOMAIN }, cfg, MISMATCH).fxRate).toBe(1);
    // A cheaper ₹ order can't unlock the dearer item (the old check).
    expect(trpcCode(() => checkPaidItem(inr(2492), { key: priceKey.addon("yearly"), inr: ADDON.yearly }, cfg, MISMATCH))).toBe(`BAD_REQUEST: ${MISMATCH}`);
    // A ₹ order that happens to equal the $ price in cents is still not ₹299.
    expect(trpcCode(() => checkPaidItem(inr(400), { key: priceKey.addon("yearly"), inr: ADDON.yearly }, cfg, MISMATCH))).toBe(`BAD_REQUEST: ${MISMATCH}`);
  });

  it("keeps the ₹-only 'add-on required' wording while USD is off", () => {
    expect(domainPriceLabel(DOMAIN, null)).toBe("₹499");
    expect(domainPriceLabel(DOMAIN, 6)).toBe("₹499 or $6");
  });
});

describe("USD add-on and domain prices", () => {
  it("prices at 85: add-on $4 a year or $1 a month, domain $6", () => {
    const cfg = cfgAt(85);
    expect(priceIn("USD", priceKey.addon("yearly"), ADDON.yearly, cfg)).toBe(4);
    expect(priceIn("USD", priceKey.addon("monthly"), ADDON.monthly, cfg)).toBe(1);
    expect(priceIn("USD", priceKey.domain, DOMAIN, cfg)).toBe(6);
    expect(toMinor(priceIn("USD", priceKey.addon("monthly"), ADDON.monthly, cfg))).toBe(100); // Razorpay's floor
  });

  it("uses the admin's override", () => {
    const cfg = cfgAt(85, { "addon:yearly": 5, domain: 7 });
    expect(priceIn("USD", priceKey.addon("yearly"), ADDON.yearly, cfg)).toBe(5);
    expect(priceIn("USD", priceKey.addon("monthly"), ADDON.monthly, cfg)).toBe(1);
    expect(priceIn("USD", priceKey.domain, DOMAIN, cfg)).toBe(7);
  });

  it("writes currency and rate (and the country when known) into the order notes", () => {
    expect(moneyNotes("INR", cfgAt(85))).toEqual({ currency: "INR", fxRate: "1" });
    expect(moneyNotes("USD", cfgAt(85), "US")).toEqual({ currency: "USD", fxRate: "85", country: "US" });
    expect(moneyNotes("USD", cfgAt(83.25), null)).toEqual({ currency: "USD", fxRate: "83.25" });
  });
});

describe("checkPaidItem for USD orders", () => {
  const usd = (amount: number, fxRate = "85") => ({ amount, currency: "USD", notes: { currency: "USD", fxRate } });
  const yearly = { key: priceKey.addon("yearly"), inr: ADDON.yearly };

  it("accepts the $ price and reports the rate it was priced at", () => {
    expect(checkPaidItem(usd(400), yearly, cfgAt(85), MISMATCH)).toEqual({ amount: 4, currency: "USD", fxRate: 85 });
    expect(checkPaidItem(usd(600), { key: priceKey.domain, inr: DOMAIN }, cfgAt(85), MISMATCH).amount).toBe(6);
  });

  it("still accepts a genuine payment after the admin changed the rate", () => {
    // Priced at 85 ($4); the rate is now 60, where ₹299 is $5.
    expect(checkPaidItem(usd(400, "85"), yearly, cfgAt(60), MISMATCH).fxRate).toBe(85);
    // And an order priced after the change pays the new price.
    expect(checkPaidItem(usd(500, "60"), yearly, cfgAt(60), MISMATCH).amount).toBe(5);
  });

  it("accepts an override price", () => {
    expect(checkPaidItem(usd(900), yearly, cfgAt(85, { "addon:yearly": 9 }), MISMATCH).amount).toBe(9);
  });

  it("still accepts a genuine payment after the admin changed the item's override", () => {
    // Priced at an override of $9; the admin clears it while the modal is open,
    // so neither candidate rate gives $9 — only the price written into the notes.
    const priced = (minor: number, overrides: FxConfig["overrides"] = {}) =>
      ({ amount: minor, currency: "USD", notes: { ...moneyNotes("USD", cfgAt(85, overrides), null, minor) } });
    expect(checkPaidItem(priced(900, { "addon:yearly": 9 }), yearly, cfgAt(85), MISMATCH).amount).toBe(9);
    // And the other way: priced at the computed $4, the admin then sets $9.
    expect(checkPaidItem(priced(400), yearly, cfgAt(85, { "addon:yearly": 9 }), MISMATCH).amount).toBe(4);
    // A cheaper payment is still refused: the note is server-written, not the amount.
    expect(trpcCode(() => checkPaidItem({ ...priced(400), amount: 100 }, yearly, cfgAt(85, { "addon:yearly": 9 }), MISMATCH)))
      .toBe(`BAD_REQUEST: ${MISMATCH}`);
    // A junk note changes nothing — the price candidates still decide.
    const junk = { amount: 400, currency: "USD", notes: { currency: "USD", fxRate: "85", priceMinor: "not a number" } };
    expect(checkPaidItem(junk, yearly, cfgAt(85), MISMATCH).amount).toBe(4);
    expect(trpcCode(() => checkPaidItem({ ...junk, amount: 100 }, yearly, cfgAt(85), MISMATCH))).toBe(`BAD_REQUEST: ${MISMATCH}`);
  });

  it("writes the charged price into an order's notes, for $ only", () => {
    expect(moneyNotes("USD", cfgAt(85), "US", 400)).toEqual({ currency: "USD", fxRate: "85", country: "US", priceMinor: "400" });
    // ₹ notes are untouched: an INR order must verify on its ₹ price alone.
    expect(moneyNotes("INR", cfgAt(85), null, 29900)).toEqual({ currency: "INR", fxRate: "1" });
  });

  it("refuses a cheaper $ order for the dearer item", () => {
    expect(trpcCode(() => checkPaidItem(usd(100), yearly, cfgAt(85), MISMATCH))).toBe(`BAD_REQUEST: ${MISMATCH}`);
    expect(trpcCode(() => checkPaidItem(usd(29900), yearly, cfgAt(85), MISMATCH))).toBe(`BAD_REQUEST: ${MISMATCH}`);
  });

  it("refuses other currencies and a notes/gateway mismatch as BAD_REQUEST (the webhook acks it)", () => {
    const eur = { amount: 400, currency: "EUR", notes: {} };
    expect(trpcCode(() => checkPaidItem(eur, yearly, cfgAt(85), MISMATCH))).toMatch(/^BAD_REQUEST: This payment was made in a currency we don't accept/);
    const mixed = { amount: 29900, currency: "INR", notes: { currency: "USD", fxRate: "85" } };
    expect(trpcCode(() => checkPaidItem(mixed, yearly, cfgAt(85), MISMATCH))).toMatch(/^BAD_REQUEST: This payment was made in a currency/);
  });

  it("treats an unreadable amount as a mismatch, not a crash", () => {
    const bad = { amount: Number.NaN, currency: "INR" };
    expect(trpcCode(() => checkPaidItem(bad, yearly, cfgAt(85), MISMATCH))).toBe(`BAD_REQUEST: ${MISMATCH}`);
  });
});

describe("currency.context", () => {
  const ctxFor = (country: string | null, cfg: FxConfig, razorpayEnabled = true) =>
    currencyContext({ country, cfg, razorpayEnabled, pkgs: PKGS, addonInr: ADDON, domainInr: DOMAIN });

  it("is ₹ with no $ prices while USD is off, even abroad", () => {
    for (const country of ["US", "IN", null]) {
      expect(ctxFor(country, cfgAt(85, {}, false))).toEqual({ country, suggested: "INR", usdAvailable: false, prices: null });
    }
  });

  it("is ₹ while Razorpay is off, even with USD switched on", () => {
    expect(ctxFor("US", cfgAt(85), false)).toEqual({ country: "US", suggested: "INR", usdAvailable: false, prices: null });
  });

  it("suggests $ abroad and ₹ in India or when unknown, with the price table at 85", () => {
    expect(ctxFor("US", cfgAt(85)).suggested).toBe("USD");
    expect(ctxFor("IN", cfgAt(85)).suggested).toBe("INR");
    expect(ctxFor(null, cfgAt(85)).suggested).toBe("INR");
    expect(ctxFor("US", cfgAt(85)).prices).toEqual({
      plans: {
        1: { monthly: 0, yearly: 0, triennial: 0 },
        5: { monthly: 2, yearly: 12, triennial: 30 },
        6: { monthly: 3, yearly: 24, triennial: 59 },
      },
      addon: { yearly: 4, monthly: 1 },
      domain: 6,
    });
  });

  it("only takes the dev ?geo= stand-in outside production", () => {
    expect(contextCountry("IN", "us", false)).toBe("US");
    expect(contextCountry("IN", "us", true)).toBe("IN");
    expect(contextCountry(null, undefined, false)).toBeNull();
    expect(contextCountry("IN", "USA", false)).toBe("IN");
    expect(contextCountry("IN", "1.2", false)).toBe("IN");
  });
});

describe("admin USD settings", () => {
  it("lists every paid item with its computed and effective $ price", () => {
    const rows = usdAdminRows(PKGS, ADDON, DOMAIN, cfgAt(85, { "plan:5:triennial": 29 }));
    expect(rows.map((r) => r.key)).toEqual([
      "plan:5:monthly", "plan:5:yearly", "plan:5:triennial",
      "plan:6:monthly", "plan:6:yearly", "plan:6:triennial",
      "addon:yearly", "addon:monthly", "domain",
    ]); // the ₹0 Trial is left out
    expect(rows[2]).toEqual({ key: "plan:5:triennial", label: "Gold · 3 years", inr: 2499, computed: 30, override: 29, usd: 29 });
    expect(rows[4]).toEqual({ key: "plan:6:yearly", label: "Platinum · Yearly", inr: 1999, computed: 24, override: null, usd: 24 });
    expect(rows[8]).toMatchObject({ label: "Custom domain setup", inr: 499, usd: 6 });
  });

  it("accepts a rate of 50–200 only, kept to 4 decimals", () => {
    expect(parseRate(85)).toBe(85);
    expect(parseRate(83.123456)).toBe(83.1235);
    for (const r of [49.9, 200.5, 0, -85, Number.NaN, Infinity]) {
      expect(trpcCode(() => parseRate(r))).toBe("BAD_REQUEST: The rate must be between ₹50 and ₹200 per $1.");
    }
  });

  it("refuses bad overrides instead of silently dropping them", () => {
    expect(parseOverrides({ "plan:5:yearly": 12, "addon:monthly": 1, domain: 6 })).toEqual({ "plan:5:yearly": 12, "addon:monthly": 1, domain: 6 });
    expect(parseOverrides({})).toEqual({});
    expect(trpcCode(() => parseOverrides({ "plan:5:weekly": 3 }))).toBe('BAD_REQUEST: Unknown price "plan:5:weekly".');
    for (const v of [0, 2.5, -1, Number.NaN]) {
      expect(trpcCode(() => parseOverrides({ domain: v }))).toBe("BAD_REQUEST: USD prices are whole dollars, $1 or more (domain).");
    }
  });

  it("names only the settings that really changed", () => {
    const a = cfgAt(85, { domain: 6, "addon:yearly": 4 }, false);
    expect(fxChangedKeys(a, cfgAt(85, { "addon:yearly": 4, domain: 6 }, false))).toEqual([]); // same overrides, other order
    expect(fxChangedKeys(a, cfgAt(88, { domain: 6, "addon:yearly": 4 }, true))).toEqual([FX_KEYS.enabled, FX_KEYS.rate]);
    expect(fxChangedKeys(a, cfgAt(85, { domain: 7, "addon:yearly": 4 }, false))).toEqual([FX_KEYS.overrides]);
    expect(fxChangedKeys(a, cfgAt(85, {}, false))).toEqual([FX_KEYS.overrides]);
  });
});

describe("probeUsd (the check before USD is switched on)", () => {
  const creds = { keyId: "rzp_test_x", keySecret: "s" };
  const failWith = (status: number, body: string) => async () => {
    throw Object.assign(new Error(`Razorpay order creation failed (${status}): ${body}`), { status });
  };

  it("creates one unpaid $1 order and reports success", async () => {
    const calls: unknown[] = [];
    const res = await probeUsd(creds, async (params) => { calls.push(params); return { id: "order_1", amount: 100, currency: "USD", status: "created" }; });
    expect(res).toEqual({ ok: true, message: null });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ amount: 100, currency: "USD", notes: { purpose: "usd_probe" } });
  });

  it("gives the activation message when Razorpay refuses the currency", async () => {
    const res = await probeUsd(creds, failWith(400, '{"error":{"code":"BAD_REQUEST_ERROR","reason":"BAD_REQUEST_INVALID_CURRENCY","field":"currency"}}'));
    expect(res).toEqual({ ok: false, message: USD_ACTIVATION_MESSAGE });
  });

  it("tells bad keys and other failures apart", async () => {
    expect((await probeUsd(creds, failWith(401, "{}"))).message).toMatch(/API keys/);
    expect((await probeUsd(creds, failWith(500, "{}"))).message).toMatch(/Try again in a minute/);
    expect((await probeUsd(creds, failWith(400, '{"error":{"field":"amount"}}'))).ok).toBe(false);
  });
});
