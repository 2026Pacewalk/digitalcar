import { describe, expect, it, vi } from "vitest";

// The crons' pure helpers are tested without a database: the schema and the
// connection are only touched inside the query functions.
vi.mock("@db/schema", () => ({}));
vi.mock("../queries/connection", () => ({ getDb: () => { throw new Error("no database in unit tests"); } }));

const { revenueFromGroups } = await import("./owner-digest");
const { creditTipApplies, rowCurrency } = await import("./billing");
const { ownerDailyDigestEmail } = await import("../lib/email/admin");

/** The digest's revenue fold before USD existed, verbatim (rows grouped by gateway only). */
function revenueBeforeUsd(rows: { gateway: string | null; n: unknown; sum: unknown }[]) {
  let manual = 0, online = 0, count = 0;
  for (const r of rows) {
    const s = Number(r.sum) || 0;
    if (r.gateway === "razorpay") online += s; else manual += s;
    count += Number(r.n) || 0;
  }
  return { manual, online, count };
}

describe("owner digest revenue", () => {
  // MySQL returns SUM(decimal) as a string; amount × fx_rate(1.0000) has 6 decimals.
  const cases: { gateway: "manual" | "razorpay"; n: number; sum: string }[][] = [
    [],
    [{ gateway: "razorpay", n: 1, sum: "999.00" }],
    [{ gateway: "manual", n: 2, sum: "4999.00" }, { gateway: "razorpay", n: 3, sum: "7396.00" }],
    [{ gateway: "manual", n: 1, sum: "89.50" }, { gateway: "razorpay", n: 14, sum: "24870.35" }],
  ];

  it("is unchanged for an all-₹ day (fx_rate 1)", () => {
    for (const groups of cases) {
      const now = revenueFromGroups(groups.map((g) => ({ ...g, currency: "INR", inr: `${g.sum}0000` })));
      expect(now).toEqual(revenueBeforeUsd(groups));
      expect(now).not.toHaveProperty("usd");
      // …so the email is identical too.
      const date = new Date("2026-09-21T09:40:00Z");
      expect(ownerDailyDigestEmail({ date, revenue: now })).toEqual(ownerDailyDigestEmail({ date, revenue: revenueBeforeUsd(groups) }));
    }
  });

  it("counts $ payments at their ₹ value and reports them on their own", () => {
    const r = revenueFromGroups([
      { gateway: "manual", currency: "INR", n: 1, sum: "4999.00", inr: "4999.000000" },
      { gateway: "razorpay", currency: "INR", n: 5, sum: "7396.00", inr: "7396.000000" },
      // $12 + $24 at 85 = ₹3,060
      { gateway: "razorpay", currency: "USD", n: 2, sum: "36.00", inr: "3060.000000" },
    ]);
    expect(r).toEqual({ manual: 4999, online: 10456, count: 8, usd: { total: 36, count: 2 } });
  });

  it("keeps the $ total to cents", () => {
    const r = revenueFromGroups([
      { gateway: "razorpay", currency: "USD", n: 1, sum: "10.20", inr: "867.000000" },
      { gateway: "razorpay", currency: "USD", n: 1, sum: "0.1", inr: "8.5" },
      { gateway: "razorpay", currency: "USD", n: 1, sum: "0.2", inr: "17" },
    ]);
    expect(r.usd).toEqual({ total: 10.5, count: 3 });
  });
});

describe("renewal reminder upgrade-credit tip", () => {
  it("reads the row's currency, ₹ unless it says USD", () => {
    expect(rowCurrency("USD")).toBe("USD");
    for (const v of ["INR", null, undefined, "", "usd", "EUR"]) expect(rowCurrency(v)).toBe("INR");
  });

  it("is unchanged for ₹ rows: any paid row, whatever the USD switch", () => {
    for (const usdOn of [false, true]) {
      expect(creditTipApplies({ amount: "999.00", currency: "INR" }, usdOn)).toBe(true);
      expect(creditTipApplies({ amount: "0.00", currency: "INR" }, usdOn)).toBe(false);
      expect(creditTipApplies({ amount: 99 }, usdOn)).toBe(true);
    }
  });

  it("gives a $ plan the tip only while USD checkout is on", () => {
    expect(creditTipApplies({ amount: "12.00", currency: "USD" }, true)).toBe(true);
    expect(creditTipApplies({ amount: "12.00", currency: "USD" }, false)).toBe(false);
    // Old recovered rows say USD but cost ₹0: never a tip, as before.
    expect(creditTipApplies({ amount: "0.00", currency: "USD" }, true)).toBe(false);
  });
});
