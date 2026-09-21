import { describe, expect, it } from "vitest";
import { asCurrency, inr, money, receipt } from "./kit";
import { paymentVerifiedEmail, subscriptionRenewalReminderEmail } from "./billing";
import { onlineSaleAdminEmail, ownerDailyDigestEmail, type OnlineSaleAlert, type OwnerDigest } from "./admin";

/* USD in the emails. With USD off every order, subscription and digest is INR,
   so the first rule is that anything that isn't an explicit "USD" renders
   byte-for-byte as it did before USD existed. */

const AT = new Date("2026-09-21T09:40:00Z");
const NOT_USD = [undefined, null, "", "INR", "inr", " INR ", "EUR", "usd?"] as const;

describe("kit money()", () => {
  it("is exactly inr() for anything that isn't USD", () => {
    for (const v of [0, 1, 99, 158.4, 105.6, 999, 1020, 123456, 1234567.891, "999.00", "1056.50", null, undefined, Number.NaN]) {
      for (const cur of NOT_USD) expect(money(v, cur)).toBe(inr(v));
      expect(money(v, "INR", { cents: true })).toBe(inr(v));
    }
  });

  it("formats dollars", () => {
    expect(money(12, "USD")).toBe("$12");
    expect(money(10.2, "USD")).toBe("$10.20");
    expect(money(9.18, "USD")).toBe("$9.18");
    expect(money(1056, "USD")).toBe("$1,056");
    expect(money("21.60", "USD")).toBe("$21.60");
    expect(money(12, "usd")).toBe("$12");
    expect(money(12, "USD", { cents: true })).toBe("$12.00");
    expect(money(null, "USD")).toBe("$0");
  });

  it("asCurrency only says USD when told so", () => {
    expect(asCurrency("USD")).toBe("USD");
    expect(asCurrency(" usd ")).toBe("USD");
    for (const v of NOT_USD) expect(asCurrency(v)).toBe("INR");
  });
});

describe("kit receipt()", () => {
  const base = { rows: [{ name: "Gold plan", sub: "Yearly", amount: 999 }], extra: [{ label: "Coupon", value: "− ₹100" }], totalLabel: "Amount paid", total: 899 };
  it("is unchanged for INR", () => {
    const before = receipt(base);
    for (const cur of NOT_USD) expect(receipt({ ...base, currency: cur })).toBe(before);
    expect(before).toContain("₹999");
    expect(before).toContain("₹899");
  });
  it("shows $ with cents for USD", () => {
    const html = receipt({ rows: [{ name: "Gold plan", amount: 12 }], totalLabel: "Amount paid", total: 10.2, currency: "USD" });
    expect(html).toContain("$12.00");
    expect(html).toContain("$10.20");
    expect(html).not.toContain("₹");
  });
});

describe("paymentVerifiedEmail", () => {
  const inrOrder = {
    name: "Aarav Mehta", billedTo: "Mehta Interiors", planName: "Gold", amount: 899, billingCycle: "yearly",
    invoiceNo: "DC-00042-2026", validTill: new Date("2027-09-21T09:40:00Z"), paidAt: AT, gateway: "razorpay", method: "upi",
    reference: "pay_DEMO123", listPrice: 999, couponCode: "SAVE100", discount: 100,
  };

  it("is unchanged for INR", () => {
    const before = paymentVerifiedEmail(inrOrder);
    for (const cur of NOT_USD) expect(paymentVerifiedEmail({ ...inrOrder, currency: cur })).toEqual(before);
    // Today's ₹ wording, pinned.
    expect(before.text).toContain("Gold plan (Yearly): ₹999");
    expect(before.text).toContain("Coupon SAVE100: -₹100");
    expect(before.text).toContain("Amount paid: ₹899\n");
    expect(before.html).toContain(">Amount paid<");
    expect(before.html).not.toContain("US dollars");
  });

  it("bills a $ order in dollars", () => {
    const e = paymentVerifiedEmail({ ...inrOrder, amount: 10.8, listPrice: 12, discount: 1.2, couponCode: "SAVE10", currency: "USD" });
    expect(e.text).toContain("Gold plan (Yearly): $12.00");
    expect(e.text).toContain("Coupon SAVE10: -$1.20");
    expect(e.text).toContain("Amount paid: $10.80 (USD)");
    expect(e.text).toContain("billed in US dollars (USD)");
    expect(e.html).toContain("Amount paid (USD)");
    expect(e.html).toContain("billed in US dollars (USD)");
    // A customer paying in $ never sees a ₹ figure.
    expect(e.html).not.toContain("₹");
    expect(e.text).not.toContain("₹");
  });

  it("shows a referral discount without a coupon as the gap to list price", () => {
    const e = paymentVerifiedEmail({ ...inrOrder, amount: 10.2, listPrice: 12, discount: null, couponCode: null, currency: "USD" });
    expect(e.text).toContain("Other discounts & upgrade credit: -$1.80");
    expect(e.text).toContain("Amount paid: $10.20 (USD)");
  });
});

describe("subscriptionRenewalReminderEmail", () => {
  const row = { name: "Aarav Mehta", planName: "Gold", daysLeft: 7, validTill: new Date("2026-09-28T09:40:00Z"), billingCycle: "yearly", packageId: 5, upgradeCredit: 999, nextPlanName: "Platinum" };
  it("is unchanged for INR", () => {
    const before = subscriptionRenewalReminderEmail(row);
    for (const cur of NOT_USD) expect(subscriptionRenewalReminderEmail({ ...row, currency: cur })).toEqual(before);
    expect(before.text).toContain("the ₹999 you paid comes off the price");
  });
  it("states a $ plan's credit in dollars", () => {
    const e = subscriptionRenewalReminderEmail({ ...row, upgradeCredit: 12, currency: "USD" });
    expect(e.text).toContain("the $12 you paid comes off the price");
    expect(e.html).toContain("the $12 you paid for Gold");
    expect(e.html).not.toContain("₹");
  });
});

describe("onlineSaleAdminEmail", () => {
  const sale: OnlineSaleAlert = {
    kind: "plan", itemName: "Gold", cycle: "yearly", amount: 2699, paymentId: "pay_DEMO123", coupon: "WELCOME10", discount: 300,
    customer: { id: 1042, name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 90000 01234" },
    referrer: { name: "Priya Sharma", reward: 405 }, reseller: { name: "Joshi Print & Media", commission: 270 },
    validTill: new Date("2027-09-21T09:40:00Z"), at: AT,
  };

  it("is unchanged for INR, even with an amountInr", () => {
    const before = onlineSaleAdminEmail(sale);
    for (const cur of NOT_USD) {
      expect(onlineSaleAdminEmail({ ...sale, currency: cur })).toEqual(before);
      expect(onlineSaleAdminEmail({ ...sale, currency: cur, amountInr: 2699 })).toEqual(before);
    }
    expect(before.subject).toBe("Online sale: ₹2,699 · Gold (yearly) · Aarav Mehta");
    expect(before.text).toContain("Paid: ₹2,699\n");
    expect(before.html).toContain("&#8377;");
  });

  it("leads with dollars and the ₹ value; reward and commission stay ₹", () => {
    const e = onlineSaleAdminEmail({
      ...sale, amount: 12, currency: "USD", amountInr: 1020, coupon: null, discount: null,
      referrer: { name: "Priya Sharma", reward: 153 }, reseller: { name: "Joshi Print & Media", commission: 102 },
    });
    expect(e.subject).toBe("Online sale: $12 (≈₹1,020) · Gold (yearly) · Aarav Mehta");
    expect(e.text).toContain("Paid: $12 (≈₹1,020)");
    expect(e.text).toContain("Razorpay settles it to your bank in ₹");
    expect(e.text).toContain("₹153 reward credited");
    expect(e.text).toContain("₹102 commission added");
    expect(e.html).toContain("Paid online in USD");
    expect(e.html).toContain("$12.00");
    expect(e.html).not.toContain("&#8377;");
  });

  it("puts a $ coupon in dollars", () => {
    const e = onlineSaleAdminEmail({ ...sale, amount: 21.6, discount: 2.4, currency: "USD", amountInr: 1836, referrer: null, reseller: null });
    expect(e.text).toContain("Coupon: WELCOME10 ($2.40 off, list price $24)");
    expect(e.html).toContain("− $2.40");
    expect(e.html).toContain("$24.00");
  });

  it("still reads without the ₹ value", () => {
    const e = onlineSaleAdminEmail({ ...sale, amount: 12, currency: "USD", coupon: null, discount: null });
    expect(e.subject).toBe("Online sale: $12 · Gold (yearly) · Aarav Mehta");
    expect(e.text).toContain("can differ a little.");
  });
});

describe("ownerDailyDigestEmail revenue", () => {
  const digest: OwnerDigest = { date: AT, signups: { today: 2, week: 11 }, revenue: { manual: 4999, online: 7396, count: 5 }, pendingPayments: [], failedEmails: 0 };

  it("is unchanged when there were no $ payments", () => {
    const before = ownerDailyDigestEmail(digest);
    for (const usd of [null, undefined, { total: 0, count: 0 }]) {
      expect(ownerDailyDigestEmail({ ...digest, revenue: { ...digest.revenue!, usd } })).toEqual(before);
    }
    expect(before.text).toContain("Revenue: ₹12,395 from 5 payments (₹7,396 online, ₹4,999 manual) — last 24 hours");
  });

  it("adds the $ part to a ₹ total", () => {
    const e = ownerDailyDigestEmail({ ...digest, revenue: { manual: 4999, online: 10456, count: 7, usd: { total: 36, count: 2 } } });
    expect(e.text).toContain("Revenue: ₹15,455 from 7 payments (₹10,456 online, ₹4,999 manual; incl. $36 from 2 USD payments) — last 24 hours");
    expect(e.html).toContain("incl. $36 from 2 USD payments");
    const one = ownerDailyDigestEmail({ ...digest, revenue: { manual: 0, online: 1020, count: 1, usd: { total: 12, count: 1 } } });
    expect(one.text).toContain("incl. $12 from 1 USD payment)");
  });
});
