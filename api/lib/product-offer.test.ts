import { describe, expect, it } from "vitest";
import {
  FREE_TRIAL_DAYS, KEPT_AFTER_TRIAL, LINK_STAYS_NOTE, NOT_LISTED, NO_RENEWAL_NOTE, OFFER_CYCLE, OFFER_MONTHS, OFFER_PLAN,
  buyPath, isChosenPlanPath, isListed, mainImage, mayKeepProductPage, offerAmount, offerCopy, offerFromPlans, offerPriceText,
  planChoice, planPageCurrency, planPagePath, productImages, productListing, productSeo, signInPath, subscriptionTitle,
  type PlanRow,
} from "@contracts/product-offer";
import { chargeFor } from "@contracts/money";

// The plans as they are stored (db/seed-plans-inr.sql): decimal columns come
// back from MySQL as strings.
const TRIAL: PlanRow = { id: 7, slug: "trial", name: "Trial", monthlyPrice: "0.00", yearlyPrice: "0.00", threeYearPrice: "0.00", isActive: true };
const GOLD: PlanRow = { id: 5, slug: "gold", name: "Gold", monthlyPrice: "99.00", yearlyPrice: "999.00", threeYearPrice: "2499.00", isActive: true };
const PLATINUM: PlanRow = { id: 6, slug: "platinum", name: "Platinum", monthlyPrice: "199.00", yearlyPrice: "1999.00", threeYearPrice: "4999.00", isActive: true };
const PLANS = [TRIAL, GOLD, PLATINUM];

const product = (over: Record<string, unknown> = {}) => ({
  slug: "midnight-gold-card", status: "published", price: "999.00",
  images: ["/products/midnight-gold/midnight-gold-digital-business-card.png", "/products/midnight-gold/midnight-gold-digital-business-card-features.png"],
  ...over,
});

describe("the offer a listed design carries", () => {
  it("is the Gold plan's yearly price, in rupees, for 12 months", () => {
    expect(offerFromPlans(PLANS)).toEqual({
      plan: "gold", planName: "Gold", packageId: 5, cycle: "yearly", months: 12, price: 999, currency: "INR",
    });
    expect([OFFER_PLAN, OFFER_CYCLE, OFFER_MONTHS]).toEqual(["gold", "yearly", 12]);
  });

  it("follows the stored price", () => {
    const offer = offerFromPlans([{ ...GOLD, yearlyPrice: "1199.00" }])!;
    expect(offer.price).toBe(1199);
    expect(offerAmount(offer)).toBe("1199.00");
    expect(offerPriceText(offer)).toBe("₹1,199");
    expect(offerFromPlans([{ ...GOLD, yearlyPrice: 1499 }])!.price).toBe(1499);
  });

  it("is the amount checkout charges, also for a price stored with paise", () => {
    // api/payment-router.ts charges chargeFor(the stored price), which is whole
    // rupees. The feed, the structured data and the page state that amount.
    for (const yearlyPrice of ["999.00", "999.49", "999.50", "999.99", "1049.99", "1199.50", "0.50", 1234.5, " 999.50 "]) {
      const offer = offerFromPlans([{ ...GOLD, yearlyPrice }])!;
      const charged = chargeFor({ base: Number(yearlyPrice), currency: "INR" });
      expect(offer.price).toBe(charged);
      expect(offerAmount(offer)).toBe(charged.toFixed(2));
      expect(Number.isInteger(offer.price)).toBe(true);
    }
    const offer = offerFromPlans([{ ...GOLD, yearlyPrice: "999.50" }])!;
    expect(offerAmount(offer)).toBe("1000.00");
    expect(offerPriceText(offer)).toBe("₹1,000");
    expect(offerCopy(offer).buyLabel).toBe("Buy now — ₹1,000 for 1 year");
    // A price checkout would round to nothing is no offer at all.
    for (const yearlyPrice of ["0.40", "0.49", 0.01]) expect(offerFromPlans([{ ...GOLD, yearlyPrice }])).toBeNull();
  });

  it("is never the monthly or the 3-year price", () => {
    const offer = offerFromPlans([{ ...GOLD, monthlyPrice: "1.00", threeYearPrice: "2.00" }])!;
    expect(offer.price).toBe(999);
  });

  it("is nothing at all when the Gold yearly price can't be had", () => {
    expect(offerFromPlans(null)).toBeNull();
    expect(offerFromPlans(undefined)).toBeNull();
    expect(offerFromPlans([])).toBeNull();
    expect(offerFromPlans([TRIAL, PLATINUM])).toBeNull();
    expect(offerFromPlans([{ ...GOLD, isActive: false }])).toBeNull();
    expect(offerFromPlans([{ ...GOLD, isActive: 0 }])).toBeNull();
    for (const yearlyPrice of ["0.00", "0", 0, "", "  ", "abc", null, undefined, "-5", Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(offerFromPlans([{ ...GOLD, yearlyPrice }])).toBeNull();
    }
    // A plan that only shares the name is not the Gold plan.
    expect(offerFromPlans([{ ...GOLD, slug: "gold-legacy" }])).toBeNull();
  });

  it("shows whole rupees without decimals and states two decimals to Google", () => {
    const offer = offerFromPlans(PLANS)!;
    expect(offerPriceText(offer)).toBe("₹999");
    expect(offerAmount(offer)).toBe("999.00");
  });
});

describe("which designs are listed", () => {
  it("lists a published design with its own picture and a price above 0", () => {
    expect(productListing(product())).toEqual({ listed: true });
    expect(isListed(product())).toBe(true);
  });

  it("does not list a draft or archived design", () => {
    for (const status of ["draft", "archived", "", null, undefined]) {
      expect(productListing(product({ status }))).toEqual({ listed: false, reason: "unpublished" });
    }
  });

  it("does not list a design that isn't priced for sale", () => {
    for (const price of ["0.00", 0, "", null, undefined, "abc", "-1"]) {
      expect(productListing(product({ slug: "teal-breeze-card", price }))).toEqual({ listed: false, reason: "not-priced" });
    }
  });

  it("does not list a design without a picture of its own", () => {
    for (const images of [null, undefined, [], "", "[]", "not json", [""], ["   "], [42], ["products/no-leading-slash.png"], ["http://example.com/a.png"], ["//cdn.example.com/a.png"], ["data:image/png;base64,AAAA"]]) {
      expect(productListing(product({ images }))).toEqual({ listed: false, reason: "no-image" });
    }
  });

  it("holds back the designs on the not-listed list, each for its stated reason", () => {
    expect(Object.keys(NOT_LISTED).sort()).toEqual(["employee-id-card", "indigo-card", "membership-card", "poster-collage-card"]);
    for (const entry of Object.values(NOT_LISTED)) expect(entry.why.length).toBeGreaterThan(20);
    // Even priced and pictured exactly like a listed design.
    expect(productListing(product({ slug: "poster-collage-card" }))).toEqual({ listed: false, reason: "image" });
    expect(productListing(product({ slug: "employee-id-card" }))).toEqual({ listed: false, reason: "addon" });
    expect(productListing(product({ slug: "membership-card" }))).toEqual({ listed: false, reason: "addon" });
    expect(productListing(product({ slug: "indigo-card" }))).toEqual({ listed: false, reason: "retired" });
    // The add-ons are told apart from other unpriced designs, so their pages can say what they are.
    expect(productListing(product({ slug: "employee-id-card", price: "0.00" }))).toEqual({ listed: false, reason: "addon" });
  });

  it("does not list a design whose slug can't be a Google product id", () => {
    for (const slug of ["Has-Capitals", "has space", "a".repeat(51), "", "-leading-hyphen", "ünïcode-card"]) {
      expect(productListing(product({ slug }))).toEqual({ listed: false, reason: "id" });
    }
    expect(isListed(product({ slug: "a".repeat(50) }))).toBe(true);
    // Not mistaken for an entry of the not-listed list.
    expect(isListed(product({ slug: "constructor" }))).toBe(true);
  });

  it("reads the images column as an array or as its JSON text", () => {
    expect(productImages(["/a.png", " /b.png ", "", 7, "https://cdn.example.com/c.png"])).toEqual(["/a.png", "/b.png", "https://cdn.example.com/c.png"]);
    expect(productImages('["/a.png","/b.png"]')).toEqual(["/a.png", "/b.png"]);
    expect(mainImage(["", "/second-is-first-usable.png"])).toBe("/second-is-first-usable.png");
    expect(mainImage(null)).toBeNull();
  });
});

describe("the words the feed and the pages share", () => {
  it("titles a design as a 1-year subscription", () => {
    expect(subscriptionTitle("Midnight Gold Digital Business Card")).toBe("Midnight Gold Digital Business Card (1-Year Subscription)");
    expect(subscriptionTitle("  Ivory   Bloom (Bio)  ")).toBe("Ivory Bloom (Bio) (1-Year Subscription)");
  });

  it("keeps a title within Google's 150 characters and still says what it is", () => {
    const title = subscriptionTitle("Long name ".repeat(40));
    expect(title.length).toBeLessThanOrEqual(150);
    expect(title.endsWith(" (1-Year Subscription)")).toBe(true);
  });

  it("states the payment model truthfully", () => {
    const copy = offerCopy(offerFromPlans(PLANS)!);
    expect(copy.price).toBe("₹999");
    expect(copy.priceLine).toBe("₹999 for 12 months");
    expect(copy.planLine).toBe("1-year subscription on the Gold plan");
    expect(copy.taxLine).toMatch(/GST/);
    expect(copy.payLine).toBe("Pay once. No auto-renewal.");
    expect(copy.refundLine).toBe("7-day money-back on your first plan");
    expect(copy.trialLine).toBe("Or try it free for 30 days first. No payment needed.");
    expect(copy.buyLabel).toBe("Buy now — ₹999 for 1 year");
    expect(copy.afterTrial).toContain("₹999 for 12 months");
    expect(FREE_TRIAL_DAYS).toBe(30);
    expect(NO_RENEWAL_NOTE).toBe("No auto-renewal · 7-day money-back on your first plan");
    expect(LINK_STAYS_NOTE).toBe("stays the same for as long as your plan is active");
  });

  it("puts the changed price into every line that names it", () => {
    const copy = offerCopy(offerFromPlans([{ ...GOLD, yearlyPrice: "1299.00" }])!);
    for (const line of [copy.price, copy.priceLine, copy.buyLabel, copy.afterTrial]) expect(line).toContain("₹1,299");
    expect(JSON.stringify(copy)).not.toContain("999");
  });

  it("never promises what the plan doesn't", () => {
    const all = JSON.stringify(offerCopy(offerFromPlans(PLANS)!)) + NO_RENEWAL_NOTE + LINK_STAYS_NOTE;
    expect(all).not.toMatch(/cancel anytime|permanent|forever|lifetime|\$/i);
  });

  it("offers the free trial as the other way to start, not as part of what Buy gives", () => {
    // The paid 12 months start on the day of payment (api/payment-router.ts),
    // so a buyer who pays today does not get 30 free days first.
    const { trialLine } = offerCopy(offerFromPlans(PLANS)!);
    expect(trialLine).toMatch(/^Or try it free for 30 days first\./);
    expect(trialLine).not.toMatch(/first 30 days free/i);
  });

  it("says a card is kept for a while after the trial, as the Terms do — not saved without limit", () => {
    expect(KEPT_AFTER_TRIAL).toBe("Your card and everything on it are kept for a while, so you can pick up where you left off.");
    const { afterTrial } = offerCopy(offerFromPlans(PLANS)!);
    expect(afterTrial.startsWith(`${KEPT_AFTER_TRIAL} To keep it live, buy a plan:`)).toBe(true);
    expect(afterTrial).not.toMatch(/stays? saved/i);
  });
});

describe("keeping a product page the server has built", () => {
  it("keeps a listed design's page only when it went out with its price", () => {
    expect(mayKeepProductPage(product(), true)).toBe(true);
    // The price could not be read, or the page was not rendered on the server:
    // served this once, built again for the next request.
    expect(mayKeepProductPage(product(), false)).toBe(false);
  });

  it("keeps the page of a design that shows no price anyway", () => {
    for (const p of [product({ slug: "teal-breeze-card", price: "0.00" }), product({ slug: "employee-id-card" }), product({ slug: "poster-collage-card" }), product({ images: [] })]) {
      expect(mayKeepProductPage(p, false)).toBe(true);
      expect(mayKeepProductPage(p, true)).toBe(true);
    }
  });
});

describe("a product page's title and description", () => {
  const stored = {
    slug: "teal-breeze-card", name: "Teal Breeze Digital Business Card", trialDays: 30,
    seoTitle: "Teal Breeze Digital Business Card — Digital Business Card Design | DigitalCarda",
    seoDescription: "Create your Teal Breeze Digital Business Card in minutes. Included with your DigitalCarda plan — start free for 30 days.",
    tagline: "Instant digital card — no app, no printing",
  };

  it("uses what is stored for the product", () => {
    expect(productSeo(stored)).toEqual({ title: stored.seoTitle, description: stored.seoDescription });
    expect(productSeo({ ...stored, seoTitle: null, seoDescription: null })).toEqual({
      title: "Teal Breeze Digital Business Card — DigitalCarda", description: stored.tagline,
    });
    expect(productSeo({ slug: "x-card", name: "X" }).description).toBe("X — try it free for 30 days. No app, no printing.");
  });

  it("does not call a paid add-on included in the plan", () => {
    for (const slug of ["employee-id-card", "membership-card"]) {
      const seo = productSeo({ ...stored, slug, name: "Employee ID Card" });
      expect(seo.description).not.toMatch(/included/i);
      expect(seo.description).toMatch(/paid extra/);
      expect(seo.title).toBe(stored.seoTitle);
    }
  });
});

describe("the way to buy", () => {
  it("links Buy to the free sign-up, carrying the design, the plan and the term", () => {
    const offer = offerFromPlans(PLANS)!;
    expect(buyPath(offer, "ocean-blue-card")).toBe("/signup?product=ocean-blue-card&plan=gold&cycle=yearly");
    expect(buyPath({ plan: "platinum", cycle: "triennial" })).toBe("/signup?plan=platinum&cycle=triennial");
    expect(buyPath(offer, "a b&c")).toBe("/signup?product=a+b%26c&plan=gold&cycle=yearly");
  });

  it("accepts a plan and term from a link only when they are really on sale", () => {
    expect(planChoice("gold", "yearly", PLANS)).toEqual({ packageId: 5, plan: "gold", planName: "Gold", cycle: "yearly" });
    expect(planChoice(" Platinum ", "triennial", PLANS)).toEqual({ packageId: 6, plan: "platinum", planName: "Platinum", cycle: "triennial" });
    expect(planChoice("gold", "monthly", PLANS)?.cycle).toBe("monthly");
  });

  it("ignores a plan it doesn't know, a free one, or one that is switched off", () => {
    for (const plan of ["diamond", "", null, undefined, "5", "trial", "gold'; DROP TABLE"]) {
      expect(planChoice(plan, "yearly", PLANS)).toBeNull();
    }
    expect(planChoice("gold", "yearly", [{ ...GOLD, isActive: false }])).toBeNull();
    expect(planChoice("gold", "yearly", null)).toBeNull();
  });

  it("falls back to yearly for a term it doesn't know or the plan isn't sold for", () => {
    for (const cycle of ["weekly", "", null, undefined, "3year", "YEARLY"]) {
      expect(planChoice("gold", cycle, PLANS)?.cycle).toBe("yearly");
    }
    expect(planChoice("gold", "triennial", [{ ...GOLD, threeYearPrice: "0.00" }])?.cycle).toBe("yearly");
  });

  it("sends a signed-in buyer to the plan page, opened on that plan and term", () => {
    expect(planPagePath(planChoice("gold", "yearly", PLANS)!)).toBe("/dashboard/subscription?plan=5&cycle=yearly");
    expect(planPagePath(planChoice("platinum", "triennial", PLANS)!)).toBe("/dashboard/subscription?plan=6&cycle=triennial");
    // The offer a product page sells names the same plan and term.
    expect(planPagePath(offerFromPlans(PLANS)!)).toBe("/dashboard/subscription?plan=5&cycle=yearly");
  });

  it("shows the plan page in rupees to a buyer who was quoted in rupees, without touching their saved choice", () => {
    const visitor = { locked: false, usdPriced: true };
    // Their own choice is $ (saved, or suggested for their country): ₹ while the Buy link's mark is on…
    expect(planPageCurrency({ ...visitor, quotedInRupees: true, chosen: "USD" })).toBe("INR");
    // …and $ again once they have used the ₹/$ switch, which takes the mark off.
    expect(planPageCurrency({ ...visitor, quotedInRupees: false, chosen: "USD" })).toBe("USD");
    expect(planPageCurrency({ ...visitor, quotedInRupees: true, chosen: "INR" })).toBe("INR");
    expect(planPageCurrency({ ...visitor, quotedInRupees: false, chosen: "INR" })).toBe("INR");
  });

  it("never shows rupees over a paid plan still running in dollars", () => {
    expect(planPageCurrency({ quotedInRupees: true, locked: true, chosen: "USD", usdPriced: true })).toBe("USD");
  });

  it("shows dollars only when there are dollar prices to show", () => {
    expect(planPageCurrency({ quotedInRupees: false, locked: false, chosen: "USD", usdPriced: false })).toBe("INR");
    expect(planPageCurrency({ quotedInRupees: false, locked: true, chosen: "USD", usdPriced: false })).toBe("INR");
  });

  it("keeps the chosen plan when a buyer who already has an account signs in instead", () => {
    const planPage = planPagePath(planChoice("gold", "yearly", PLANS)!, { quotedInRupees: true });
    const href = signInPath(planPage);
    expect(href).toBe("/login?next=%2Fdashboard%2Fsubscription%3Fplan%3D5%26cycle%3Dyearly%26currency%3DINR");
    // The sign-in page reads it back whole, and knows it for a chosen plan.
    const next = new URL(href, "https://digitalcarda.in").searchParams.get("next");
    expect(next).toBe(planPage);
    expect(isChosenPlanPath(next)).toBe(true);
    expect(isChosenPlanPath(planPagePath(planChoice("platinum", "triennial", PLANS)!))).toBe(true);
    // No plan chosen: the plain sign-in page, as before.
    expect(signInPath("")).toBe("/login");
  });

  it("does not take any other page for a chosen plan", () => {
    // /dashboard/subscription alone is the "reactivate this card" link.
    for (const path of ["/dashboard/subscription", "/dashboard/subscription?coupon=X", "/dashboard/subscription?plan=gold", "/dashboard/nfc?plan=5", "/account/delete", "", null, undefined]) {
      expect(isChosenPlanPath(path)).toBe(false);
    }
    expect(isChosenPlanPath("/dashboard/subscription?cycle=yearly&plan=6")).toBe(true);
  });
});
