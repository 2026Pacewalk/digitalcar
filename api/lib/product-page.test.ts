import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { LINK_STAYS_NOTE, NO_RENEWAL_NOTE, afterSignupPath, buyPath, offerCopy, offerFromPlans, planChoice, planPagePath } from "@contracts/product-offer";

/* The rules a product page, the sign-up page and the footer must keep for the
   site to be listed on Google: the price a design shows is the plan's (never
   the product row's, never converted for the visitor's country), and nothing on
   these pages promises what the Terms don't. They are read as source, because
   the pages themselves are React and these tests run without a browser; what
   the built pages actually send is checked against the running site. */
const read = (file: string) => fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");
/** The file without its comments, so a rule can be explained next to the code it guards. */
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PRODUCT_PAGE = "src/pages/public/ProductDetail.tsx";
const SIGNUP = "src/pages/Signup.tsx";
const FOOTER = "src/components/layout/SiteFooter.tsx";
const PRICING = "src/pages/public/Pricing.tsx";
const PLAN_PAGE = "src/pages/customer/Subscription.tsx";
const LOGIN = "src/pages/Login.tsx";
const SERVER_PAGES = "api/lib/vite.ts";

const GOLD = { id: 5, slug: "gold", name: "Gold", monthlyPrice: "99.00", yearlyPrice: "999.00", threeYearPrice: "2499.00", isActive: true };

describe("the price on a product page", () => {
  const page = code(PRODUCT_PAGE);

  it("is the plan's price, read through the one hook the server seeds", () => {
    expect(page).toContain("useProductOffer()");
    expect(page).toContain("offerCopy(offer)");
  });

  it("is never the product row's price", () => {
    expect(page).not.toMatch(/\b(product|p)\.(price|salePrice)\b/);
    expect(code(SIGNUP)).not.toMatch(/selectedProduct\.(price|salePrice)\b/);
  });

  it("is rupees for every visitor: the page has no currency switch", () => {
    expect(page).not.toContain("useCurrency");
    expect(page).not.toContain("CurrencySwitch");
    expect(page).not.toMatch(/["'`]USD["'`]|\$\d/);
  });

  it("is shown, with Buy, under the same condition the server writes the Offer", () => {
    expect(page).toContain("const listing = productListing(product);");
    expect(page).toMatch(/const sale = offer && listing\.listed \?/);
    // Buy is only ever rendered from `sale`, so it cannot appear without a price.
    expect(page.match(/buyPath\(/g)).toHaveLength(1);
    expect(page).toContain("buyHref: buyPath(offer, product.slug)");
  });

  it("states the term, the tax, the payment and the free start beside the amount", () => {
    for (const line of ["sale.price", "sale.planLine", "sale.taxLine", "sale.payLine", "sale.refundLine", "sale.trialLine", "sale.buyLabel", "sale.afterTrial"]) {
      expect(page).toContain(line);
    }
    const copy = offerCopy(offerFromPlans([GOLD])!);
    expect(copy.price).toBe("₹999");
    expect(copy.buyLabel).toBe("Buy now — ₹999 for 1 year");
    expect(copy.afterTrial).toContain("₹999 for 12 months");
  });

  it("keeps the title and description the server wrote", () => {
    expect(page).toContain("productSeo(product)");
    expect(page).not.toContain("product.seoDescription");
  });

  it("keeps the desktop buy-bar's Buy button clear of the floating back-to-top button", () => {
    // That button sits over the bar's right-hand end: 56px wide (a 48px orb in
    // 4px of padding), 24px from the edge. Below 1344px the bar's content would
    // reach under it, so the bar keeps 96px free there. If the button moves or
    // grows, this padding has to follow.
    const footer = read(FOOTER);
    expect(footer).toMatch(/dc-top group fixed bottom-6 right-6 z-40 [^"`]*\bp-1\b/);
    expect(footer).toContain("<RocketOrb size={48} />");
    expect(page).toContain("max-w-6xl mx-auto px-4 pr-24 min-[1344px]:pr-4 py-2.5");
  });
});

describe("what these pages promise", () => {
  it("never says a plan can be cancelled anytime", () => {
    for (const file of [PRODUCT_PAGE, SIGNUP, FOOTER]) expect(read(file)).not.toMatch(/cancel\s+anytime/i);
    for (const file of [PRODUCT_PAGE, SIGNUP, FOOTER]) expect(code(file)).toContain("NO_RENEWAL_NOTE");
    expect(NO_RENEWAL_NOTE).toBe("No auto-renewal · 7-day money-back on your first plan");
  });

  it("never calls the link or QR code permanent", () => {
    const page = read(PRODUCT_PAGE);
    expect(page).not.toMatch(/permanent|forever|never change|never break/i);
    expect(code(PRODUCT_PAGE)).toContain("LINK_STAYS_NOTE");
    expect(LINK_STAYS_NOTE).toBe("stays the same for as long as your plan is active");
  });

  it("never tells a visitor a design is included in their plan", () => {
    // Not true of an add-on, which is bought on top of a plan — and an add-on
    // can also appear among the related designs on any other page.
    const page = code(PRODUCT_PAGE);
    expect(page).not.toMatch(/included in your plan/i);
    expect(page).toMatch(/listing\.reason === "addon"/);
    expect(page).toContain("Paid add-on");
  });

  it("answers what the trial leads to first, so the answer is in the page as served", () => {
    const page = code(PRODUCT_PAGE);
    const first = page.slice(page.indexOf("const faqsFor"), page.indexOf("];", page.indexOf("const faqsFor")));
    expect(first.indexOf("a: afterTrial")).toBeGreaterThan(-1);
    expect(first.indexOf("a: afterTrial")).toBeLessThan(first.indexOf("Do I need to install an app?"));
    // Only the open answer is rendered, and the first one starts open.
    expect(page).toContain("useState<number | null>(0)");
  });

  it("says a card is kept for a while after the trial, in every form of that answer", () => {
    // The Terms keep trial content "for a while"; "stays saved" would set no limit.
    const page = code(PRODUCT_PAGE);
    expect(page).not.toMatch(/stays? saved/i);
    expect(page).toContain("const AFTER_TRIAL_NO_PRICE = `${KEPT_AFTER_TRIAL} ");
    expect(page).toContain("const AFTER_TRIAL_ADDON = `${KEPT_AFTER_TRIAL} ");
  });
});

describe("the product page the server keeps", () => {
  const server = code(SERVER_PAGES);

  it("does not remember a product lookup that failed as \"no such product\"", () => {
    const lookup = server.slice(server.indexOf("async function publishedProduct"), server.indexOf("function productMeta"));
    // The catch leaves before the result is stored.
    expect(lookup).toMatch(/\} catch \{\s*return null;\s*\}\s*if \(productCache\.size > 500\) productCache\.clear\(\);\s*productCache\.set\(/);
  });

  it("serves a listed design's page that has no price once, and keeps no copy of it", () => {
    expect(server).toContain("oneOff = !!productPage && !mayKeepProductPage(productPage.row, priceShown);");
    expect(server).toContain("cacheable = !oneOff;");
    expect(server).toContain('if (oneOff) c.header("Cache-Control", "no-store");');
  });
});

describe("the plans on the pricing page, as stated to Google", () => {
  it("are the yearly prices in the whole rupees checkout charges", () => {
    const page = code(PRICING);
    expect(page).toContain('price: roundMoney(p.price.yearly, "INR").toFixed(2),');
    expect(page).not.toContain("p.price.yearly.toFixed(2)");
    expect(page).not.toContain("String(p.price.monthly)");
  });
});

describe("the way from Buy to the payment page", () => {
  it("starts at a link carrying the design, the plan and the term", () => {
    expect(buyPath(offerFromPlans([GOLD])!, "ocean-blue-card")).toBe("/signup?product=ocean-blue-card&plan=gold&cycle=yearly");
  });

  it("sign-up reads plan and cycle, checks them against the plans on sale, and lands on the plan page", () => {
    const page = code(SIGNUP);
    expect(page).toContain('searchParams.get("plan")');
    expect(page).toContain('searchParams.get("cycle")');
    expect(page).toContain("planChoice(planParam, cycleParam, plans)");
    expect(page).toContain("planPagePath(");
    // Every way of signing up — the form, Google with a new account, Google
    // finding an old one — asks the one function where to go.
    expect(page.match(/navigate\(afterSignupPath\(/g)).toHaveLength(3);
    expect(page).not.toMatch(/navigate\("\/dashboard/);
    expect(planPagePath(planChoice("gold", "yearly", [GOLD])!)).toBe("/dashboard/subscription?plan=5&cycle=yearly");
    expect(planChoice("diamond", "yearly", [GOLD])).toBeNull();
  });

  it("a new account goes to the plan it came to buy, however it signed up", () => {
    const plan = "/dashboard/subscription?plan=5&cycle=yearly";
    expect(afterSignupPath({ created: true, role: "customer" }, plan)).toBe(plan);
    // Google found an account that already existed: a customer still goes to the plan…
    expect(afterSignupPath({ created: false, role: "customer" }, plan)).toBe(plan);
    // …a partner goes to the partner portal, never to a customer's plan page.
    expect(afterSignupPath({ created: false, role: "reseller" }, plan)).toBe("/reseller");
    expect(afterSignupPath({ created: false, role: "super_admin" }, plan)).toBe("/dashboard");
  });

  it("with no plan in the link, sign-up lands where it always has", () => {
    expect(afterSignupPath({ created: true, role: "customer" }, "")).toBe("/dashboard/build");
    expect(afterSignupPath({ created: false, role: "customer" }, "")).toBe("/dashboard");
    expect(afterSignupPath({ created: false, role: "reseller" }, "")).toBe("/reseller");
    // A link naming a plan that is not on sale is the same as naming none.
    expect(planChoice("starter", "yearly", [GOLD])).toBeNull();
    expect(planChoice("gold", "yearly", [])).toBeNull();
  });

  it("the plan page reads the names sign-up sends", () => {
    const page = code(PLAN_PAGE);
    expect(page).toMatch(/\.get\("plan"\)/);
    expect(page).toMatch(/\.get\("cycle"\)/);
    const sent = new URL(planPagePath({ packageId: 5, cycle: "yearly" }), "https://digitalcarda.in").searchParams;
    expect([...sent.keys()].sort()).toEqual(["cycle", "plan"]);
  });

  it("a buyer who was shown the price in rupees pays in rupees", () => {
    // A product page prices in ₹ for every visitor, so its Buy link (the one that
    // carries a design) opens the plan page in ₹; a /pricing link does not say.
    expect(planPagePath({ packageId: 5, cycle: "yearly" }, { quotedInRupees: true })).toBe("/dashboard/subscription?plan=5&cycle=yearly&currency=INR");
    expect(code(SIGNUP)).toContain("planPagePath(choice, { quotedInRupees: !!productSlug })");
    const page = code(PLAN_PAGE);
    expect(page).toMatch(/\.get\("currency"\) === "INR"/);
    // The page is in ₹ for this visit by one tested rule (planPageCurrency) —
    // never over a running $ plan. Nothing saves ₹ as the visitor's ₹/$ choice
    // for them: that would change /pricing and the rest of the site too.
    expect(page).toContain("planPageCurrency({ quotedInRupees: openInInr, locked, chosen: currency, usdPriced: !!prices })");
    expect(page).not.toContain('currency !== "INR") setCurrency("INR")');
    // Using the ₹/$ switch ends it and takes the mark out of the address, so a
    // reload or Back keeps what the visitor picked.
    expect(page).toContain("onChange={pickCurrency}");
    expect(page).toMatch(/const pickCurrency = [\s\S]*?setOpenInInr\(false\);[\s\S]*?searchParams\.delete\("currency"\);[\s\S]*?replaceState\([\s\S]*?setCurrency\(c\);/);
  });

  it("a buyer who already has an account keeps the plan when they sign in instead", () => {
    const page = code(SIGNUP);
    expect(page).toContain("const signInHref = signInPath(planPage);");
    // Every "Sign in" link on the sign-up page goes through it: none is a bare /login.
    expect(page.match(/to=\{signInHref\}/g)).toHaveLength(5);
    expect(page).not.toMatch(/to="\/login"/);
    const login = code(LOGIN);
    expect(login).toContain("isChosenPlanPath(next)");
    expect(login).toContain("Sign in to continue to the plan you chose.");
  });

  it("the pricing page's paid plans carry their plan and the selected term", () => {
    const page = code(PRICING);
    expect(page).toContain("buyPath({ plan: p.slug, cycle: PERIOD_CYCLE[period] })");
    expect(page.match(/to=\{planHref\(/g)).toHaveLength(2);
    expect(page).not.toMatch(/: "\/signup"\}/);
  });

  it("changes nothing about what is charged", () => {
    // The link only pre-selects: no page on this path sends an amount to the server.
    expect(code(SIGNUP)).not.toMatch(/razorpay|createOrder/i);
    expect(code(PRODUCT_PAGE)).not.toMatch(/razorpay|createOrder/i);
  });
});
