import { describe, expect, it, vi } from "vitest";

// coupons.ts reads its tables from @db/schema, which vitest can't resolve (no
// alias here). The maths under test never touches them.
vi.mock("@db/schema", () => ({ coupons: {}, couponRedemptions: {}, subscriptionPackages: {} }));

import { couponDiscount, couponMinimumReason, type CouponTerms } from "./coupons";
import { chargeFor, roundMoney, toMinor } from "@contracts/money";
import { usdFor, priceKey, readOrderMoney } from "./fx";
import { exactPercentFrom } from "./offer-grants";

const pct = (value: number, maxDiscount: string | null = null, minAmount: string | null = null): CouponTerms =>
  ({ discountType: "percent", discountValue: value.toFixed(2), maxDiscount, minAmount });
const flat = (value: number, maxDiscount: string | null = null, minAmount: string | null = null): CouponTerms =>
  ({ discountType: "flat", discountValue: value.toFixed(2), maxDiscount, minAmount });

/* Inline copies of evaluateCoupon's arithmetic as it was before USD, so any drift
   in an INR result fails here. A result <= 0 meant "doesn't apply". */
function todayDiscount(c: CouponTerms, amount: number): number {
  let discount = c.discountType === "percent"
    ? (amount * Number(c.discountValue)) / 100
    : Number(c.discountValue);
  if (c.maxDiscount && discount > Number(c.maxDiscount)) discount = Number(c.maxDiscount);
  discount = Math.min(Math.round(discount), Math.max(0, Math.round(amount) - 1));
  return discount;
}
function todayMinimum(c: CouponTerms, amount: number): string | null {
  if (c.minAmount && amount < Number(c.minAmount)) {
    return `This coupon needs a purchase of at least ${"₹" + Math.round(Number(c.minAmount)).toLocaleString("en-IN")}.`;
  }
  return null;
}

const INR_AMOUNTS = [0, 1, 2, 24.92, 83, 89, 99, 99.5, 169, 179, 849, 999, 1000, 1699, 1999, 2124, 2499, 4249, 4999, 12000];
const COUPONS: CouponTerms[] = [
  ...[1, 5, 10, 12.5, 15, 25, 33.33, 50, 99, 100].flatMap((v) => [pct(v), pct(v, "50.00"), pct(v, "100.00"), pct(v, "0.00")]),
  ...[1, 49.5, 50, 100, 500, 999, 5000].flatMap((v) => [flat(v), flat(v, "100.00")]),
];

describe("couponDiscount: INR is exactly today's arithmetic", () => {
  it("matches for every coupon × amount", () => {
    for (const c of COUPONS) {
      for (const a of INR_AMOUNTS) {
        const before = todayDiscount(c, a);
        const now = couponDiscount(c, a, "INR", 1);
        expect(now > 0, `${JSON.stringify(c)} on ₹${a}`).toBe(before > 0);
        if (before > 0) expect(now, `${JSON.stringify(c)} on ₹${a}`).toBe(before);
      }
    }
  });

  it("defaults to INR", () => {
    expect(couponDiscount(pct(10), 999)).toBe(100);
    expect(couponDiscount(flat(100), 999)).toBe(100);
  });

  it("always leaves ₹1 to pay", () => {
    expect(couponDiscount(pct(100), 999)).toBe(998);
    expect(couponDiscount(flat(5000), 999)).toBe(998);
    expect(couponDiscount(pct(100), 1)).toBe(0);
  });
});

describe("couponMinimumReason: INR is exactly today's check and message", () => {
  it("matches for every minimum × amount", () => {
    for (const min of [null, "0.00", "99.00", "500.00", "999.00", "2000.00", "12345.00"]) {
      for (const a of INR_AMOUNTS) {
        const c = pct(10, null, min);
        expect(couponMinimumReason(c, a, "INR", 1)).toBe(todayMinimum(c, a));
        expect(couponMinimumReason(c, a)).toBe(todayMinimum(c, a));
      }
    }
    expect(couponMinimumReason(pct(10, null, "2000.00"), 999)).toBe("This coupon needs a purchase of at least ₹2,000.");
  });
});

describe("couponDiscount: USD", () => {
  it("applies a percentage in dollars, keeping cents", () => {
    expect(couponDiscount(pct(10), 12, "USD", 88)).toBe(1.2);
    expect(couponDiscount(pct(15), 10.2, "USD", 85)).toBe(1.53);
    expect(couponDiscount(pct(10), 9.18, "USD", 85)).toBe(0.92);
  });

  it("converts a flat ₹ amount and a ₹ cap at the rate", () => {
    expect(couponDiscount(flat(100), 12, "USD", 88)).toBe(1.14);
    expect(couponDiscount(flat(100), 12, "USD", 85)).toBe(1.18);
    expect(couponDiscount(pct(10, "50.00"), 12, "USD", 88)).toBe(0.57);
    expect(couponDiscount(pct(10, "50.00"), 12, "USD", 85)).toBe(0.59);
    expect(couponDiscount(flat(500, "100.00"), 24, "USD", 85)).toBe(1.18);
  });

  it("always leaves $1 to pay", () => {
    expect(couponDiscount(pct(100), 12, "USD", 85)).toBe(11);
    expect(couponDiscount(flat(5000), 12, "USD", 85)).toBe(11);
    expect(couponDiscount(pct(100), 10.2, "USD", 85)).toBe(9.2);
    expect(couponDiscount(pct(100), 1.5, "USD", 85)).toBe(0.5);
    expect(couponDiscount(pct(100), 1, "USD", 85)).toBe(0);
    expect(couponDiscount(pct(50), 1, "USD", 85)).toBe(0);
  });
});

describe("couponMinimumReason: USD compares the INR value", () => {
  it("passes a ₹500 minimum on a $12 order and refuses ₹2,000 with the $ figure", () => {
    expect(couponMinimumReason(pct(10, null, "500.00"), 12, "USD", 88)).toBeNull();
    expect(couponMinimumReason(pct(10, null, "2000.00"), 12, "USD", 88))
      .toBe("This coupon needs a purchase of at least ₹2,000 (about $22.73).");
    // Rounded up to the cent: paying the figure shown always qualifies.
    expect(couponMinimumReason(pct(10, null, "2000.00"), 22.73, "USD", 88)).toBeNull();
    expect(couponMinimumReason(pct(10, null, "1020.00"), 12, "USD", 85)).toBeNull();
    expect(couponMinimumReason(pct(10, null, "1700.00"), 12, "USD", 85))
      .toBe("This coupon needs a purchase of at least ₹1,700 (about $20).");
  });
});

describe("the whole plan price (computeAmount): INR unchanged", () => {
  /* computeAmount before USD: referral / credit / offer in whole rupees, then the
     coupon, then paise for Razorpay. */
  function todayCharge(base: number, s: { referralPct: number; credit: number; offer: number; coupon: CouponTerms | null }) {
    const round2 = (v: number) => Math.round(v);
    let charged = s.credit > 0 ? Math.max(0, round2(base - s.credit)) : round2(base * (1 - s.referralPct / 100));
    if (s.offer) charged = round2(charged * (1 - s.offer / 100));
    let ok = true;
    if (s.coupon) {
      const d = todayDiscount(s.coupon, charged);
      if (d <= 0) ok = false;
      else charged = charged - d;
    }
    return { ok, charged, paise: Math.round(charged * 100) };
  }
  function nowCharge(base: number, s: { referralPct: number; credit: number; offer: number; coupon: CouponTerms | null }) {
    let charged = chargeFor({ base, currency: "INR", referralPct: s.referralPct, credit: s.credit, offerPct: s.offer });
    let ok = true;
    if (s.coupon) {
      const d = couponDiscount(s.coupon, charged, "INR", 1);
      if (d <= 0) ok = false;
      else charged = roundMoney(charged - d, "INR");
    }
    return { ok, charged, paise: toMinor(charged) };
  }

  it("gives the same amount and paise for plans × referral × credit × offer × coupon", () => {
    const coupons = [null, pct(10), pct(15, "100.00"), pct(100), flat(100), flat(5000)];
    let cases = 0;
    for (const base of [99, 999, 2499, 199, 1999, 4999]) {
      for (const referralPct of [0, 15]) {
        for (const credit of [0, 99, 999, 1999, 2499]) {
          for (const offer of [0, 10]) {
            for (const coupon of coupons) {
              const s = { referralPct: credit ? 0 : referralPct, credit, offer, coupon };
              expect(nowCharge(base, s), `₹${base} ${JSON.stringify(s)}`).toEqual(todayCharge(base, s));
              cases++;
            }
          }
        }
      }
    }
    expect(cases).toBe(720);
  });
});

describe("the whole plan price in USD", () => {
  const cfg = { rate: 85, overrides: {} };

  it("prices Gold yearly at $12 and takes referral, offer and coupon in cents", () => {
    const base = usdFor(priceKey.plan(5, "yearly"), 999, cfg);
    expect(base).toBe(12);
    let charged = chargeFor({ base, currency: "USD", referralPct: 15, credit: 0, offerPct: 10 });
    expect(charged).toBe(9.18);
    const d = couponDiscount(pct(10), charged, "USD", cfg.rate);
    expect(d).toBe(0.92);
    charged = roundMoney(charged - d, "USD");
    expect(charged).toBe(8.26);
    expect(toMinor(charged)).toBe(826);
  });

  it("gives upgrade credit in dollars against a dollar price", () => {
    const platinumYearly = usdFor(priceKey.plan(6, "yearly"), 1999, cfg);
    expect(platinumYearly).toBe(24);
    expect(chargeFor({ base: platinumYearly, currency: "USD", credit: 12 })).toBe(12);
  });

  it("credits commission and the referral reward on the INR value", () => {
    // payment-router: inrValue = amount × fx_rate; commission/reward = money(inrValue × % / 100).
    const money = (v: number) => v.toFixed(2);
    const paid = readOrderMoney({ amount: 1200, currency: "USD", notes: { currency: "USD", fxRate: "85" } }, cfg);
    const inrValue = paid.amount * paid.fxRate;
    expect(inrValue).toBe(1020);
    expect(money((inrValue * 10) / 100)).toBe("102.00");
    expect(money((inrValue * 15) / 100)).toBe("153.00");
    // An INR sale is credited on its own amount, exactly as before.
    const inr = readOrderMoney({ amount: 99900, currency: "INR", notes: {} }, cfg);
    expect(inr).toEqual({ amount: 999, currency: "INR", fxRate: 1 });
    expect(money((inr.amount * 15) / 100)).toBe("149.85");
  });
});

/* EARLY20's "exactly 20% off the plan's FULL price" rule, which must mean the
   same thing in both currencies — otherwise a referred trial member could make
   the grant worth more simply by flipping the browser's ₹/$ switch. The ₹ side
   is exactPercentDiscount (a DB read of the plan's rupee column); this is the
   arithmetic both branches of evaluateCoupon run. */
describe("EARLY20 is the same offer in ₹ and in $", () => {
  const RATE = 85;
  const cfg = { rate: RATE, overrides: {} };
  /** The ₹ branch, verbatim from offer-grants.exactPercentDiscount + coupons.ts. */
  const inrExact = (planInr: number, amount: number, percent = 20) => {
    const target = Math.round(planInr * (1 - percent / 100));
    const discount = Math.max(0, Math.round(amount) - target);
    return Math.min(Math.round(discount), Math.max(0, Math.round(amount) - 1));
  };
  const usdExact = (planUsd: number, amount: number, percent = 20) => {
    const d = exactPercentFrom(planUsd, amount, percent, "USD");
    return Math.max(0, Math.min(roundMoney(d, "USD"), Math.max(0, roundMoney(roundMoney(amount, "USD") - 1, "USD"))));
  };

  const PLANS: [number, "monthly" | "yearly" | "triennial", number][] = [
    [5, "yearly", 999], [6, "yearly", 1999], [6, "triennial", 4999], [5, "triennial", 2499],
  ];

  it("leaves the member on 80% of the list price, whichever currency they pick", () => {
    for (const [id, cycle, inrBase] of PLANS) {
      const usdBase = usdFor(priceKey.plan(id, cycle), inrBase, cfg);
      // A referred first-time buyer: 15% is already off before the coupon.
      const inrAfter = chargeFor({ base: inrBase, currency: "INR", referralPct: 15 });
      const usdAfter = chargeFor({ base: usdBase, currency: "USD", referralPct: 15 });
      const inrPaid = inrAfter - inrExact(inrBase, inrAfter);
      const usdPaid = roundMoney(usdAfter - usdExact(usdBase, usdAfter), "USD");
      expect(inrPaid).toBe(Math.round(inrBase * 0.8));
      expect(usdPaid).toBe(roundMoney(usdBase * 0.8, "USD"));
      // …and the $ price is never the cheaper way to hold the same coupon.
      expect(usdPaid * RATE).toBeGreaterThanOrEqual(inrPaid);
    }
  });

  it("adds nothing when the price already carries more than 20% off", () => {
    for (const [id, cycle, inrBase] of PLANS) {
      const usdBase = usdFor(priceKey.plan(id, cycle), inrBase, cfg);
      // The limited-time offer alone is 20%: the coupon must be refused in both.
      expect(inrExact(inrBase, chargeFor({ base: inrBase, currency: "INR", offerPct: 20 }))).toBe(0);
      expect(usdExact(usdBase, chargeFor({ base: usdBase, currency: "USD", offerPct: 20 }))).toBe(0);
      // An upgrade that already halves the price, likewise.
      const credit = Math.round(inrBase / 2);
      expect(inrExact(inrBase, chargeFor({ base: inrBase, currency: "INR", credit }))).toBe(0);
      expect(usdExact(usdBase, chargeFor({ base: usdBase, currency: "USD", credit: Math.round(usdBase / 2) }))).toBe(0);
    }
  });

  it("falls back to the plain percentage when the list price is unusable", () => {
    for (const bad of [NaN, 0, -1]) expect(exactPercentFrom(bad, 20.4, 20, "USD")).toBe(4.08);
  });
});
