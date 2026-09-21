import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  CURRENCIES, isCurrency, usdFromInr, roundMoney, toMinor, formatMoney, chargeFor, currencySymbol, isValidRate,
} from "@contracts/money";
import {
  FX_KEYS, DEFAULT_RATE, priceKey, isPriceKey, cleanOverrides, parseFxConfig, getFxConfig, usdFor, usdPriceTable, readOrderMoney,
  isInvalidCurrencyError, suggestCurrency, resolveCheckoutCurrency, UnsupportedCurrencyError, USD_UNAVAILABLE_MESSAGE,
  effectiveRowCurrency,
  type FxConfig,
} from "./fx";

const PLAN_INR = { gold: [99, 999, 2499], platinum: [199, 1999, 4999] } as const;
const cfgAt = (rate: number, overrides: FxConfig["overrides"] = {}): FxConfig => ({ enabled: true, rate, overrides });

describe("currencies", () => {
  it("knows exactly INR and USD", () => {
    expect([...CURRENCIES]).toEqual(["INR", "USD"]);
    expect(isCurrency("INR")).toBe(true);
    expect(isCurrency("USD")).toBe(true);
    for (const v of ["usd", "EUR", "", null, undefined, 1, {}]) expect(isCurrency(v)).toBe(false);
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
  });

  it("defaults the rate to 85 and accepts 50–200 only", () => {
    expect(DEFAULT_RATE).toBe(85);
    for (const r of [50, 85, 88, 200, 83.25]) expect(isValidRate(r)).toBe(true);
    for (const r of [49.99, 200.01, 0, -85, NaN, Infinity, "85"]) expect(isValidRate(r)).toBe(false);
  });
});

describe("usdFromInr", () => {
  it("prices today's catalogue at 88 as in the design table", () => {
    const at = (inr: number) => usdFromInr(inr, 88);
    expect(PLAN_INR.gold.map(at)).toEqual([2, 12, 29]);
    expect(PLAN_INR.platinum.map(at)).toEqual([3, 23, 57]);
    expect(at(299)).toBe(4);   // add-on yearly
    expect(at(24.92)).toBe(1); // add-on monthly
    expect(at(499)).toBe(6);   // custom domain
  });

  it("prices today's catalogue at the owner's 85", () => {
    const at = (inr: number) => usdFromInr(inr, 85);
    expect(PLAN_INR.gold.map(at)).toEqual([2, 12, 30]);
    expect(PLAN_INR.platinum.map(at)).toEqual([3, 24, 59]);
    expect(at(299)).toBe(4);
    expect(at(24.92)).toBe(1);
    expect(at(499)).toBe(6);
  });

  it("keeps an exact multiple exact, and never goes below $1 for a paid item", () => {
    expect(usdFromInr(880, 88)).toBe(10);
    expect(usdFromInr(850, 85)).toBe(10);
    expect(usdFromInr(851, 85)).toBe(11);
    expect(usdFromInr(1, 85)).toBe(1);
    expect(usdFromInr(24.92, 88)).toBe(1);
  });

  it("is $0 for a free item", () => {
    expect(usdFromInr(0, 88)).toBe(0);
    expect(usdFromInr(-5, 88)).toBe(0);
  });

  it("throws on a bad rate or price instead of charging a wrong amount", () => {
    for (const r of [0, -88, NaN, Infinity, 49, 201]) expect(() => usdFromInr(999, r)).toThrow(RangeError);
    expect(() => usdFromInr(NaN, 88)).toThrow(TypeError);
  });
});

describe("usdFor and priceKey", () => {
  it("builds the override keys the admin table uses", () => {
    expect(priceKey.plan(5, "monthly")).toBe("plan:5:monthly");
    expect(priceKey.plan(6, "triennial")).toBe("plan:6:triennial");
    expect(priceKey.addon("yearly")).toBe("addon:yearly");
    expect(priceKey.domain).toBe("domain");
    for (const k of ["plan:5:monthly", "plan:12:yearly", "addon:monthly", "domain"]) expect(isPriceKey(k)).toBe(true);
    for (const k of ["plan:x:monthly", "plan:5:weekly", "addon:triennial", "domains", "", 5]) expect(isPriceKey(k)).toBe(false);
  });

  it("uses a valid override over the computed price", () => {
    const cfg = cfgAt(88, { "plan:5:triennial": 30, "plan:6:yearly": 24 });
    expect(usdFor(priceKey.plan(5, "triennial"), 2499, cfg)).toBe(30);
    expect(usdFor(priceKey.plan(6, "yearly"), 1999, cfg)).toBe(24);
    expect(usdFor(priceKey.plan(6, "monthly"), 199, cfg)).toBe(3); // no override: computed
  });

  it("ignores overrides of 0, fractions, NaN and non-numbers", () => {
    for (const bad of [0, 2.5, NaN, -3, "24"] as unknown as number[]) {
      expect(usdFor(priceKey.plan(5, "yearly"), 999, cfgAt(88, { "plan:5:yearly": bad }))).toBe(12);
    }
  });

  it("keeps a ₹0 item at $0 even with an override", () => {
    expect(usdFor(priceKey.plan(7, "monthly"), 0, cfgAt(88, { "plan:7:monthly": 5 }))).toBe(0);
  });

  it("builds the whole price table", () => {
    const pkgs = [
      { id: 5, monthlyPrice: "99.00", yearlyPrice: "999.00", threeYearPrice: "2499.00" },
      { id: 6, monthlyPrice: "199.00", yearlyPrice: "1999.00", threeYearPrice: "4999.00" },
      { id: 7, monthlyPrice: "0.00", yearlyPrice: "0.00", threeYearPrice: "0.00" },
    ];
    expect(usdPriceTable(pkgs, { yearly: 299, monthly: 24.92 }, 499, cfgAt(85))).toEqual({
      plans: {
        5: { monthly: 2, yearly: 12, triennial: 30 },
        6: { monthly: 3, yearly: 24, triennial: 59 },
        7: { monthly: 0, yearly: 0, triennial: 0 },
      },
      addon: { yearly: 4, monthly: 1 },
      domain: 6,
    });
    const t = usdPriceTable(pkgs, { yearly: 299, monthly: 24.92 }, 499, cfgAt(85, { domain: 9, "addon:monthly": 2 }));
    expect(t.domain).toBe(9);
    expect(t.addon).toEqual({ yearly: 4, monthly: 2 });
  });
});

describe("fx config", () => {
  it("is off at 85 with no overrides when nothing is set", () => {
    expect(parseFxConfig({})).toEqual({ enabled: false, rate: 85, overrides: {} });
  });

  it("reads the admin's settings", () => {
    const cfg = parseFxConfig({
      [FX_KEYS.enabled]: "true",
      [FX_KEYS.rate]: "88",
      [FX_KEYS.overrides]: JSON.stringify({ "plan:5:monthly": 2, "addon:yearly": 4, domain: 6 }),
    });
    expect(cfg).toEqual({ enabled: true, rate: 88, overrides: { "plan:5:monthly": 2, "addon:yearly": 4, domain: 6 } });
  });

  it("falls back safely on bad values", () => {
    for (const rate of ["", "abc", "0", "10", "500", "-88"]) expect(parseFxConfig({ [FX_KEYS.rate]: rate }).rate).toBe(85);
    for (const on of ["1", "TRUE", "yes", "", "false"]) expect(parseFxConfig({ [FX_KEYS.enabled]: on }).enabled).toBe(false);
    expect(parseFxConfig({ [FX_KEYS.overrides]: "{not json" }).overrides).toEqual({});
    expect(parseFxConfig({ [FX_KEYS.overrides]: "[1,2]" }).overrides).toEqual({});
    expect(parseFxConfig({
      [FX_KEYS.overrides]: JSON.stringify({ "plan:5:yearly": 0, "plan:6:yearly": 2.5, "plan:x:yearly": 3, junk: 4, "plan:6:monthly": "3", domain: 6 }),
    }).overrides).toEqual({ domain: 6 });
  });

  it("cleans admin override input before it is saved", () => {
    expect(cleanOverrides({ "plan:5:triennial": 30, "plan:6:yearly": 24.5, "addon:monthly": 1, domain: 0, hack: 1 }))
      .toEqual({ "plan:5:triennial": 30, "addon:monthly": 1 });
    for (const v of [null, undefined, "x", 5, [["domain", 6]]]) expect(cleanOverrides(v)).toEqual({});
  });

  it("getFxConfig reads the three keys from app_settings", async () => {
    let asked: unknown;
    const db = {
      query: {
        appSettings: {
          findMany: async (q: unknown) => {
            asked = q;
            return [{ key: FX_KEYS.enabled, value: "true" }, { key: FX_KEYS.rate, value: "86.5" }];
          },
        },
      },
    } as unknown as Parameters<typeof getFxConfig>[0];
    expect(await getFxConfig(db)).toEqual({ enabled: true, rate: 86.5, overrides: {} });
    expect(asked).toBeTruthy();
  });
});

describe("roundMoney, toMinor and formatMoney", () => {
  it("rounds INR to whole rupees exactly like computeAmount, USD to cents", () => {
    expect(roundMoney(89.1, "INR")).toBe(89);
    expect(roundMoney(89.5, "INR")).toBe(90);
    expect(roundMoney(849.15, "INR")).toBe(849);
    expect(roundMoney(1.8, "USD")).toBe(1.8);
    expect(roundMoney(10.2 * 0.9, "USD")).toBe(9.18);
    expect(roundMoney(1.005, "USD")).toBe(1.01);
    expect(roundMoney(2 * 0.85 * 0.9, "USD")).toBe(1.53);
    for (let v = 0; v < 6000; v += 0.37) expect(roundMoney(v, "INR")).toBe(Math.round(v));
  });

  it("converts to paise/cents like the old Math.round(charged * 100)", () => {
    expect(toMinor(999)).toBe(99900);
    expect(toMinor(9.18)).toBe(918);
    expect(toMinor(10.2)).toBe(1020);
    expect(toMinor(1)).toBe(100);
    for (let v = 0; v < 600; v += 0.01) expect(toMinor(v)).toBe(Math.round(v * 100));
  });

  it("formats with the right symbol and grouping", () => {
    expect(formatMoney(123456, "INR")).toBe("₹1,23,456");
    expect(formatMoney(1056, "USD")).toBe("$1,056");
    expect(formatMoney(9.18, "USD")).toBe("$9.18");
    expect(formatMoney(1.8, "USD")).toBe("$1.80");
    expect(formatMoney(12, "USD")).toBe("$12");
    expect(formatMoney("1999.00", "INR")).toBe("₹1,999");
    expect(formatMoney(158.4, "INR")).toBe("₹158.40");
    expect(formatMoney(12, "USD", { decimals: 2 })).toBe("$12.00");
    expect(formatMoney(9.18, "USD", { decimals: 0 })).toBe("$9");
    expect(formatMoney(null, "INR")).toBe("₹0");
    expect(formatMoney("abc", "USD")).toBe("$0");
    expect(formatMoney(-5, "USD")).toBe("-$5");
  });

  it("matches the existing INR helpers it replaces", () => {
    // Pricing.tsx / Subscription.tsx: whole rupees.
    const wholeInr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
    // orderUi.tsx / InvoicePanel.tsx: always two decimals.
    const ledgerInr = (v: unknown) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const samples = [0, 1, 24.92, 83, 89.1, 99, 849.5, 999, 1056, 2499, 4999, 123456, 1234567.89];
    for (const v of samples) {
      expect(formatMoney(v, "INR", { decimals: 0 })).toBe(wholeInr(v));
      expect(formatMoney(v, "INR", { decimals: 2 })).toBe(ledgerInr(v));
    }
  });
});

describe("chargeFor", () => {
  /* Inline copy of computeAmount's arithmetic (api/payment-router.ts) as it was
     before USD, so any drift in the INR result fails here. */
  function todayInr(base: number, s: {
    existingPaid: boolean; referred: boolean; discountPct: number;
    paidPlanActive: boolean; latestAmount: number; offer: number;
  }) {
    const round2 = (v: number) => Math.round(v);
    let charged: number, discountPct = 0;
    if (!s.existingPaid) {
      if (s.referred) discountPct = s.discountPct;
      charged = round2(base * (1 - discountPct / 100));
    } else if (s.paidPlanActive) {
      charged = Math.max(0, round2(base - s.latestAmount));
    } else {
      charged = round2(base);
    }
    const offer = s.offer;
    if (offer) charged = round2(charged * (1 - offer / 100));
    return charged;
  }

  const bases = [99, 999, 2499, 199, 1999, 4999, 0, 24.92, 99.5, 149.49];
  const referralPcts = [0, 15, 12.5];
  const offers = [0, 10, 25];
  // Member states: first plan (referral applies), lapsed paid plan (full price),
  // and a running paid plan worth each of these (upgrade credit).
  const credits = [99, 199, 999, 1999, 2499, 4999, 5000, 24.92, 849.5];
  type State = Parameters<typeof todayInr>[1];
  const states: Array<Omit<State, "offer" | "discountPct">> = [
    { existingPaid: false, referred: false, paidPlanActive: false, latestAmount: 0 },
    { existingPaid: false, referred: true, paidPlanActive: false, latestAmount: 0 },
    { existingPaid: true, referred: true, paidPlanActive: false, latestAmount: 999 },
    ...credits.map((c) => ({ existingPaid: true, referred: true, paidPlanActive: true, latestAmount: c })),
  ];

  it("gives exactly today's INR result for every plan × referral × offer × credit", () => {
    let cases = 0;
    for (const base of bases) for (const discountPct of referralPcts) for (const offer of offers) for (const st of states) {
      const s = { ...st, discountPct, offer };
      const referralPct = !s.existingPaid && s.referred ? discountPct : 0;
      const credit = s.paidPlanActive ? s.latestAmount : 0;
      expect(chargeFor({ base, currency: "INR", referralPct, credit, offerPct: offer }), JSON.stringify({ base, ...s }))
        .toBe(todayInr(base, s));
      cases++;
    }
    expect(cases).toBe(bases.length * referralPcts.length * offers.length * states.length);
  });

  it("spot-checks known INR prices", () => {
    expect(chargeFor({ base: 999, currency: "INR", referralPct: 15 })).toBe(849);
    expect(chargeFor({ base: 99, currency: "INR", offerPct: 10 })).toBe(89);
    expect(chargeFor({ base: 1999, currency: "INR", credit: 999 })).toBe(1000);
    expect(chargeFor({ base: 1999, currency: "INR", credit: 999, offerPct: 10 })).toBe(900);
    expect(chargeFor({ base: 999, currency: "INR" })).toBe(999);
  });

  it("keeps cents in USD", () => {
    const afterReferral = chargeFor({ base: 12, currency: "USD", referralPct: 15 });
    expect(afterReferral).toBe(10.2);
    expect(chargeFor({ base: 12, currency: "USD", referralPct: 15, offerPct: 10 })).toBe(9.18);
    expect(chargeFor({ base: 2, currency: "USD", offerPct: 10 })).toBe(1.8);
    expect(chargeFor({ base: 24, currency: "USD", credit: 12 })).toBe(12);
    expect(chargeFor({ base: 59, currency: "USD", credit: 24, offerPct: 10 })).toBe(31.5);
  });

  it("floors the upgrade credit at 0", () => {
    expect(chargeFor({ base: 12, currency: "USD", credit: 24 })).toBe(0);
    expect(chargeFor({ base: 999, currency: "INR", credit: 1999 })).toBe(0);
    expect(chargeFor({ base: 999, currency: "INR", credit: 1999, offerPct: 10 })).toBe(0);
  });

  it("lets a credit win over a referral discount, as the old if/else did", () => {
    expect(chargeFor({ base: 1999, currency: "INR", referralPct: 15, credit: 999 })).toBe(1000);
  });
});

describe("resolveCheckoutCurrency", () => {
  const code = (fn: () => unknown) => {
    try { fn(); } catch (e) { return e instanceof TRPCError ? e.code : "OTHER"; }
    return "OK";
  };

  it("defaults to INR", () => {
    expect(resolveCheckoutCurrency({ usdEnabled: false })).toBe("INR");
    expect(resolveCheckoutCurrency({ usdEnabled: true })).toBe("INR");
    expect(resolveCheckoutCurrency({ requested: undefined, usdEnabled: true, lockedTo: null })).toBe("INR");
  });

  it("rejects USD while it is switched off", () => {
    expect(code(() => resolveCheckoutCurrency({ requested: "USD", usdEnabled: false }))).toBe("PRECONDITION_FAILED");
    expect(() => resolveCheckoutCurrency({ requested: "USD", usdEnabled: false })).toThrow(USD_UNAVAILABLE_MESSAGE);
  });

  it("ignores any lock while USD is off, exactly as today", () => {
    // Pre-USD rows carried the old 'USD' column default; they must never block a ₹ upgrade.
    expect(resolveCheckoutCurrency({ requested: "INR", usdEnabled: false, lockedTo: "USD" })).toBe("INR");
    expect(resolveCheckoutCurrency({ requested: "INR", usdEnabled: false, lockedTo: "INR" })).toBe("INR");
  });

  it("allows USD when on and unlocked", () => {
    expect(resolveCheckoutCurrency({ requested: "USD", usdEnabled: true })).toBe("USD");
    expect(resolveCheckoutCurrency({ requested: "USD", usdEnabled: true, lockedTo: "USD" })).toBe("USD");
  });

  it("rejects a currency that differs from the running plan's", () => {
    expect(code(() => resolveCheckoutCurrency({ requested: "USD", usdEnabled: true, lockedTo: "INR" }))).toBe("BAD_REQUEST");
    expect(() => resolveCheckoutCurrency({ requested: "USD", usdEnabled: true, lockedTo: "INR" }))
      .toThrow("Your current plan was paid in ₹. Upgrades are charged in ₹ until it ends.");
    expect(() => resolveCheckoutCurrency({ requested: "INR", usdEnabled: true, lockedTo: "USD" }))
      .toThrow("Your current plan was paid in $. Upgrades are charged in $ until it ends.");
  });

  it("treats an unknown lock value as INR", () => {
    expect(resolveCheckoutCurrency({ requested: "INR", usdEnabled: true, lockedTo: "" })).toBe("INR");
    expect(code(() => resolveCheckoutCurrency({ requested: "USD", usdEnabled: true, lockedTo: "EUR" }))).toBe("BAD_REQUEST");
  });

  it("rejects anything that isn't INR or USD", () => {
    for (const r of ["EUR", "usd", "", 1]) expect(code(() => resolveCheckoutCurrency({ requested: r, usdEnabled: true }))).toBe("BAD_REQUEST");
  });

  /* The lock is only ever handed a corroborated label (see effectiveRowCurrency
     below), so a row that merely SAYS 'USD' can never lock anyone to $. */
  it("never locks a 'USD' row with no $ payment behind it, even with USD on", () => {
    const lockedTo = effectiveRowCurrency("USD", false); // the recovered-member rows
    expect(resolveCheckoutCurrency({ requested: "INR", usdEnabled: true, lockedTo })).toBe("INR");
    expect(code(() => resolveCheckoutCurrency({ requested: "USD", usdEnabled: true, lockedTo }))).toBe("BAD_REQUEST");
  });
});

describe("effectiveRowCurrency", () => {
  it("believes a 'USD' subscription only when a $ payment backs it", () => {
    expect(effectiveRowCurrency("USD", true)).toBe("USD");
    expect(effectiveRowCurrency("USD", false)).toBe("INR");
  });

  it("calls every other label ₹, whatever the payments say", () => {
    for (const paid of [false, true]) {
      for (const v of ["INR", "", null, undefined, "usd", "EUR", 0, {}]) {
        expect(effectiveRowCurrency(v, paid)).toBe("INR");
      }
    }
  });

  /* The upgrade credit is read in this currency, so the whole harm of trusting
     the label is here: ₹1,999 read as $1,999 wipes out a $59 plan. */
  it("keeps a mislabelled row's ₹ credit out of a $ price", () => {
    const row = { amount: 1999, currency: "USD" };
    const credit = (paidUsd: boolean) =>
      chargeFor({ base: 59, currency: "USD", credit: effectiveRowCurrency(row.currency, paidUsd) === "USD" ? row.amount : 0 });
    expect(credit(false)).toBe(59);  // no $ payment: the ₹ amount is not a $ credit
    expect(credit(true)).toBe(0);    // a real $1,999 plan really does cover a $59 one
  });
});

describe("readOrderMoney", () => {
  const cfg = { rate: 85 };

  it("reads a USD order with the rate saved at checkout", () => {
    expect(readOrderMoney({ amount: 1200, currency: "USD", notes: { currency: "USD", fxRate: "88" } }, cfg))
      .toEqual({ amount: 12, currency: "USD", fxRate: 88 });
    expect(readOrderMoney({ amount: 918, currency: "USD", notes: { fxRate: "85" } }, cfg))
      .toEqual({ amount: 9.18, currency: "USD", fxRate: 85 });
  });

  it("gives INR rate 1, whatever the notes say", () => {
    expect(readOrderMoney({ amount: 99900, currency: "INR", notes: { fxRate: "88" } }, cfg))
      .toEqual({ amount: 999, currency: "INR", fxRate: 1 });
    expect(readOrderMoney({ amount: 84900, currency: "INR" }, cfg)).toEqual({ amount: 849, currency: "INR", fxRate: 1 });
  });

  it("falls back to the current rate for a USD order without a usable one", () => {
    expect(readOrderMoney({ amount: 1200, currency: "USD", notes: {} }, cfg).fxRate).toBe(85);
    expect(readOrderMoney({ amount: 1200, currency: "USD", notes: { fxRate: "abc" } }, cfg).fxRate).toBe(85);
    expect(readOrderMoney({ amount: 1200, currency: "USD", notes: { fxRate: "1" } }, cfg).fxRate).toBe(85);
    expect(readOrderMoney({ amount: 1200, currency: "USD" }, { rate: NaN }).fxRate).toBe(DEFAULT_RATE);
  });

  it("refuses any other currency, or notes that disagree with the gateway", () => {
    expect(() => readOrderMoney({ amount: 1200, currency: "EUR" }, cfg)).toThrow(UnsupportedCurrencyError);
    expect(() => readOrderMoney({ amount: 1200, currency: "INR", notes: { currency: "USD" } }, cfg)).toThrow(UnsupportedCurrencyError);
  });

  it("treats a missing gateway currency as the noted one, else INR (what every pre-USD order was)", () => {
    expect(readOrderMoney({ amount: 99900 }, cfg)).toEqual({ amount: 999, currency: "INR", fxRate: 1 });
    expect(readOrderMoney({ amount: 1200, currency: "", notes: { currency: "USD", fxRate: "88" } }, cfg))
      .toEqual({ amount: 12, currency: "USD", fxRate: 88 });
    expect(readOrderMoney({ amount: 1200, currency: "usd" }, cfg).currency).toBe("USD");
  });

  it("refuses a bad amount", () => {
    expect(() => readOrderMoney({ amount: NaN, currency: "INR" }, cfg)).toThrow(TypeError);
  });
});

describe("isInvalidCurrencyError", () => {
  const rzpError = (status: number, body: unknown) => {
    const err = new Error(`Razorpay order creation failed (${status}): ${JSON.stringify(body)}`) as Error & { status?: number };
    err.status = status;
    return err;
  };

  it("spots Razorpay refusing the currency", () => {
    expect(isInvalidCurrencyError(rzpError(400, { error: { code: "BAD_REQUEST_INVALID_CURRENCY", field: "currency" } }))).toBe(true);
    expect(isInvalidCurrencyError(rzpError(400, { error: { code: "BAD_REQUEST_ERROR", description: "Currency is not supported", field: "currency" } }))).toBe(true);
    expect(isInvalidCurrencyError(rzpError(400, { error: { code: "BAD_REQUEST_ERROR", description: "Currency is not supported" } }))).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isInvalidCurrencyError(rzpError(400, { error: { code: "BAD_REQUEST_ERROR", field: "amount" } }))).toBe(false);
    expect(isInvalidCurrencyError(rzpError(401, { error: { code: "BAD_REQUEST_INVALID_CURRENCY" } }))).toBe(false);
    expect(isInvalidCurrencyError(rzpError(500, {}))).toBe(false);
    expect(isInvalidCurrencyError(new Error("BAD_REQUEST_INVALID_CURRENCY"))).toBe(false); // no status
    for (const v of [null, undefined, "BAD_REQUEST_INVALID_CURRENCY", 400]) expect(isInvalidCurrencyError(v)).toBe(false);
  });
});

describe("suggestCurrency", () => {
  it("suggests ₹ for India and unknown visitors, $ elsewhere", () => {
    expect(suggestCurrency("IN")).toBe("INR");
    expect(suggestCurrency("in")).toBe("INR");
    expect(suggestCurrency("US")).toBe("USD");
    expect(suggestCurrency(" gb ")).toBe("USD");
    for (const c of [null, undefined, "", "XX", "T1", "USA", "1"]) expect(suggestCurrency(c)).toBe("INR");
  });

  it("never suggests $ when USD can't be charged", () => {
    expect(suggestCurrency("US", false)).toBe("INR");
  });
});
