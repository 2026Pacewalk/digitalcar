/* What a design's product page sells, and which designs are sold that way —
   decided once here for the server (the Google Merchant feed, the page's
   structured data) and the browser (the product page itself).

   A design is never bought on its own. A buyer signs up free, then pays once
   for a plan; so a listed design is honestly "this design on the Gold plan,
   1 year, prepaid". Its price is the Gold plan's yearly price in
   subscription_packages — the same row checkout charges from
   (api/payment-router.ts). products.price never decides an amount: it only
   says whether a design is offered for sale at all (more than 0).

   Pure and dependency-free, like ./money, so the page, its structured data and
   the feed are built from the same answers and are unit-tested once
   (api/lib/product-offer.test.ts). The server reads the plan row in
   api/lib/product-offer.ts; the page reads the result through
   src/hooks/useProductOffer.ts. */

import { chargeFor, formatMoney, type Currency, type PlanCycle } from "./money";

/** subscription_packages.slug of the plan a listed design is sold on. */
export const OFFER_PLAN = "gold";
/** Google lists a software subscription only when it is prepaid for a year or
    more, so the listed term is the yearly one — never the monthly price. */
export const OFFER_CYCLE: Extract<PlanCycle, "yearly"> = "yearly";
export const OFFER_MONTHS = 12;
/** The free trial every new account starts on: no payment details, and it never
    turns into a paid plan by itself. */
export const FREE_TRIAL_DAYS = 30;

export type ProductOffer = {
  plan: typeof OFFER_PLAN;
  /** The plan's name as customers see it, e.g. "Gold". */
  planName: string;
  /** subscription_packages.id — the plan checkout is asked to charge for. */
  packageId: number;
  cycle: typeof OFFER_CYCLE;
  months: typeof OFFER_MONTHS;
  /** Rupees for the whole term, GST included: the stored yearly price as
      checkout rounds it, so whole rupees. Always more than 0. */
  price: number;
  currency: "INR";
};

/** The columns of a subscription_packages row used here; package.list rows fit. */
export type PlanRow = {
  id: number;
  slug?: string | null;
  name: string;
  monthlyPrice?: string | number | null;
  yearlyPrice?: string | number | null;
  threeYearPrice?: string | number | null;
  isActive?: boolean | number | null;
};

/** A stored price as rupees with at most two decimals, or null when it is not a
    real amount above zero (blank, "abc", 0, negative). */
function amount(v: unknown): number | null {
  if (v === null || v === undefined || (typeof v === "string" && !v.trim())) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  return rounded > 0 ? rounded : null;
}

const planKey = (p: PlanRow) => String(p.slug ?? "").trim().toLowerCase();
const isOnSale = (p: PlanRow) => p.isActive !== false && p.isActive !== 0;

/** The one offer every listed design carries, from the plan rows as stored — or
    null when the Gold plan is missing, switched off, or has no yearly price.
    Null means "state no price anywhere": no feed, no Offer, no price on the page.

    The price is what checkout charges for the stored yearly price before any
    discount: chargeFor, the function api/payment-router.ts charges with, which
    rounds rupees to whole ones. So a price stored with paise (999.50) is stated
    as the ₹1,000 a buyer is asked for, never as an amount nobody pays. */
export function offerFromPlans(plans: readonly PlanRow[] | null | undefined): ProductOffer | null {
  const gold = (plans ?? []).find((p) => planKey(p) === OFFER_PLAN && isOnSale(p));
  if (!gold || amount(gold.yearlyPrice) === null) return null;
  const price = chargeFor({ base: Number(gold.yearlyPrice), currency: "INR" });
  if (!(price > 0)) return null; // under 50 paise: checkout would charge nothing
  return { plan: OFFER_PLAN, planName: gold.name, packageId: gold.id, cycle: OFFER_CYCLE, months: OFFER_MONTHS, price, currency: "INR" };
}

/** "999.00" — the amount as the feed and structured data state it. */
export const offerAmount = (offer: ProductOffer): string => offer.price.toFixed(2);
/** "₹999" — the amount as the page shows it. Always rupees: this price is never
    passed through the visitor-country currency switch (src/hooks/useCurrency.ts). */
export const offerPriceText = (offer: ProductOffer): string => formatMoney(offer.price, "INR");

/* ── Which designs are listed ──────────────────────────────────────────────── */

export type NotListedReason =
  | "unpublished"   // draft or archived
  | "addon"         // sold separately, as a paid extra on top of a plan
  | "retired"       // no longer offered to new customers
  | "image"         // has pictures, but the main one can't be sent to Google yet
  | "no-image"      // has no picture of its own
  | "not-priced"    // products.price is 0: not offered for sale
  | "id";           // its slug can't be used as a Google product id

/* Published designs that are deliberately not listed, by slug, each with why.
   This is the only such list: the feed, the structured data and the page all
   ask productListing() below. Remove a line when its reason no longer holds. */
export const NOT_LISTED: Readonly<Record<string, { reason: NotListedReason; why: string }>> = {
  "emerald-card": {
    reason: "image",
    why: "Its main image has text added on top (a '30d Trial' badge, a headline, an icon bar). Google disapproves product images with promotional overlays. List it again once the first image is a clean one.",
  },
  "employee-id-card": {
    reason: "addon",
    why: "A paid add-on bought on top of a plan (api/addon-router.ts), so it is not included in the Gold plan's price.",
  },
  "membership-card": {
    reason: "addon",
    why: "A paid add-on bought on top of a plan (api/addon-router.ts), so it is not included in the Gold plan's price.",
  },
  "indigo-card": {
    reason: "retired",
    why: "Withdrawn from the designs offered to new customers (api/template-router.ts, preset 9).",
  },
};
/** The list's entry for a slug. An own-property test, so a slug such as
    "constructor" doesn't find something inherited. */
const heldBack = (slug: string) =>
  (Object.prototype.hasOwnProperty.call(NOT_LISTED, slug) ? NOT_LISTED[slug] : undefined);

/** What productListing() looks at; a products row fits. */
export type ListingProduct = {
  slug: string;
  status?: string | null;
  price?: string | number | null;
  images?: unknown;
};

export type Listing = { listed: true } | { listed: false; reason: NotListedReason };

/** A product's own pictures, in order. Takes the images column as stored (an
    array, or its JSON text from raw SQL) and keeps only entries that can be
    turned into a link: a path on this site ("/products/…") or an https URL. */
export function productImages(images: unknown): string[] {
  let list: unknown = images;
  if (typeof images === "string") { try { list = JSON.parse(images); } catch { list = []; } }
  return (Array.isArray(list) ? list : [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => /^\/(?!\/)\S/.test(x) || /^https:\/\/\S+$/i.test(x));
}

/** The picture shown first on the page — the only one sent to Google. */
export const mainImage = (images: unknown): string | null => productImages(images)[0] ?? null;

/* Google's product id: at most 50 characters. Slugs are lower-case letters,
   digits and hyphens, so they need no escaping in a URL or in XML either. */
const FEED_ID = /^[a-z0-9][a-z0-9-]{0,49}$/;

/** Is this design listed — a feed item, an Offer in its structured data, and a
    price with a Buy button on its page — and if not, why not. */
export function productListing(p: ListingProduct): Listing {
  if (p.status !== "published") return { listed: false, reason: "unpublished" };
  const held = heldBack(p.slug);
  if (held) return { listed: false, reason: held.reason };
  if (!mainImage(p.images)) return { listed: false, reason: "no-image" };
  if (amount(p.price) === null) return { listed: false, reason: "not-priced" };
  if (!FEED_ID.test(p.slug)) return { listed: false, reason: "id" };
  return { listed: true };
}

export const isListed = (p: ListingProduct): boolean => productListing(p).listed;

/** May the server keep the product page it has just built, and let a CDN keep
    it? Not when the design is listed but this copy went out without its price
    (`priceShown` false: the price could not be read, or the page could not be
    rendered on the server). The feed is never kept and states the price again
    on its next fetch, so a kept copy would leave the page disagreeing with it
    for minutes; built fresh, the next request shows the price. */
export const mayKeepProductPage = (p: ListingProduct, priceShown: boolean): boolean => priceShown || !isListed(p);

/* ── Words shared by the feed and the pages ────────────────────────────────── */

const TITLE_SUFFIX = " (1-Year Subscription)";
const TITLE_MAX = 150; // Google's limit for a title

/** The feed title. Google asks for the word "subscription" and the term in the
    title of a software subscription. */
export function subscriptionTitle(name: string): string {
  const base = String(name ?? "").replace(/\s+/g, " ").trim();
  return base.slice(0, TITLE_MAX - TITLE_SUFFIX.length).trimEnd() + TITLE_SUFFIX;
}

/** What is true where the site used to say "Cancel anytime". */
export const NO_RENEWAL_NOTE = "No auto-renewal · 7-day money-back on your first plan";
/** What is true where the site used to call the link or QR "permanent":
    "Your link and QR code " + this. */
export const LINK_STAYS_NOTE = "stays the same for as long as your plan is active";
/** What happens to a card when its free trial ends, as the Terms put it ("Free
    trial": content "is kept for a while") — not "stays saved", which sets no limit. */
export const KEPT_AFTER_TRIAL = "Your card and everything on it are kept for a while, so you can pick up where you left off.";

/** The payment model in the customer's words, for a listed design's page. Each
    line is true of the offer passed in; none of them needs another sentence. */
export function offerCopy(offer: ProductOffer) {
  const price = offerPriceText(offer);
  return {
    /** "₹999" */
    price,
    /** "₹999 for 12 months" */
    priceLine: `${price} for ${offer.months} months`,
    /** "1-year subscription on the Gold plan" */
    planLine: `1-year subscription on the ${offer.planName} plan`,
    taxLine: "Price includes GST",
    payLine: "Pay once. No auto-renewal.",
    refundLine: "7-day money-back on your first plan",
    /* The free trial is the other way to start, not part of what Buy gives: the
       paid 12 months begin on the day of payment, so a buyer who pays today
       gets 12 months — not 30 free days and then 12 months. */
    trialLine: `Or try it free for ${FREE_TRIAL_DAYS} days first. No payment needed.`,
    /** The primary button. */
    buyLabel: `Buy now — ${price} for 1 year`,
    /** The answer to "What happens after the free trial?". */
    afterTrial: `${KEPT_AFTER_TRIAL} To keep it live, buy a plan: this design on the ${offer.planName} plan is ${price} for ${offer.months} months, GST included. You pay once; nothing renews by itself, and nothing is charged unless you choose to pay.`,
  };
}

/** A product page's <title> and meta description, the same in the server HTML
    and after the page loads. The stored description of an add-on says it is
    included in the plan, which is not true of an add-on, so it is not used. */
export function productSeo(p: {
  slug: string; name: string;
  seoTitle?: string | null; seoDescription?: string | null; tagline?: string | null; trialDays?: number | null;
}): { title: string; description: string } {
  const title = p.seoTitle || `${p.name} — DigitalCarda`;
  if (heldBack(p.slug)?.reason === "addon") {
    return { title, description: `${p.name}: a card design you add to a DigitalCarda plan as a paid extra. Share it by link or QR code — no app needed.` };
  }
  return { title, description: p.seoDescription || p.tagline || `${p.name} — try it free for ${p.trialDays ?? FREE_TRIAL_DAYS} days. No app, no printing.` };
}

/* ── The way to buy ────────────────────────────────────────────────────────── */

const CYCLES: readonly PlanCycle[] = ["monthly", "yearly", "triennial"];
const cyclePrice = (p: PlanRow, cycle: PlanCycle) =>
  amount(cycle === "triennial" ? p.threeYearPrice : cycle === "yearly" ? p.yearlyPrice : p.monthlyPrice);

/** Where a Buy button leads: the free sign-up, carrying the design and the plan
    and term to pay for, e.g. /signup?product=ocean-blue-card&plan=gold&cycle=yearly. */
export function buyPath(choice: { plan: string; cycle: PlanCycle }, productSlug?: string | null): string {
  const q = new URLSearchParams();
  if (productSlug) q.set("product", productSlug);
  q.set("plan", choice.plan);
  q.set("cycle", choice.cycle);
  return `/signup?${q.toString()}`;
}

export type PlanChoice = { packageId: number; plan: string; planName: string; cycle: PlanCycle };

/** `plan` and `cycle` from a link, checked against the plans really on sale. They
    only pre-select what the payment page opens on — the server prices every
    order itself. An unknown, switched-off or free plan gives null (the link is
    ignored); an unknown term, or one the plan isn't sold for, falls back to
    yearly. */
export function planChoice(
  plan: string | null | undefined, cycle: string | null | undefined, plans: readonly PlanRow[] | null | undefined,
): PlanChoice | null {
  const key = String(plan ?? "").trim().toLowerCase();
  const row = key ? (plans ?? []).find((p) => planKey(p) === key && isOnSale(p)) : undefined;
  if (!row) return null;
  const asked = CYCLES.find((c) => c === cycle);
  const term = asked && cyclePrice(row, asked) !== null ? asked : cyclePrice(row, "yearly") !== null ? "yearly" : null;
  return term ? { packageId: row.id, plan: key, planName: row.name, cycle: term } : null;
}

/** Where a signed-in buyer pays for that choice: the plan page, opened on the
    plan and term, e.g. /dashboard/subscription?plan=5&cycle=yearly. The plan is
    named by its id — the form the page already reads from the mobile app
    (src/pages/customer/Subscription.tsx).

    `quotedInRupees`: the buyer came from a design's product page, which states
    its price in ₹ to every visitor. The plan page then opens in ₹ too
    (&currency=INR), so the amount to pay is the one they were shown, wherever
    they are. A plan chosen on /pricing carries no such mark: that page shows ₹
    or $ by the visitor's own choice, and the plan page follows the same choice. */
export function planPagePath(choice: Pick<PlanChoice, "packageId" | "cycle">, opts: { quotedInRupees?: boolean } = {}): string {
  return `/dashboard/subscription?plan=${choice.packageId}&cycle=${choice.cycle}${opts.quotedInRupees ? "&currency=INR" : ""}`;
}

/** The currency the plan page shows and asks checkout for.

    `quotedInRupees`: the page was opened with planPagePath's &currency=INR mark
    and the visitor has not used the ₹/$ switch since. The page is then in ₹ for
    this visit only — it is not saved as the visitor's ₹/$ choice, which goes on
    deciding /pricing and every other page — unless a paid plan still running
    in $ fixes the currency (`locked`). Without the mark the visitor's own
    choice stands, and $ needs $ prices to show. */
export function planPageCurrency(o: { quotedInRupees: boolean; locked: boolean; chosen: Currency; usdPriced: boolean }): Currency {
  if (o.quotedInRupees && !o.locked) return "INR";
  return o.chosen === "USD" && o.usdPriced ? "USD" : "INR";
}

/** Where "Sign in" on the sign-up page leads. A buyer who already has an
    account keeps the plan they chose: the sign-in page sends them on to
    `planPage` (its ?next=). With no plan chosen it is the plain sign-in page. */
export const signInPath = (planPage: string): string => (planPage ? `/login?next=${encodeURIComponent(planPage)}` : "/login");

/** Is this path the plan page with a plan already chosen (planPagePath)? The
    sign-in page asks, to say "continue to your plan" instead of its usual note. */
export const isChosenPlanPath = (path: string | null | undefined): boolean =>
  /^\/dashboard\/subscription\?(?:[^#]*&)?plan=\d+(?:[&#]|$)/.test(String(path ?? ""));

/** Where the sign-up page sends an account once it is signed in. `planPage` is
    planPagePath() for the plan the visit came to buy, or "" when the link named
    none — and then every answer is the one the page gave before a plan could be
    bought this way: a new account opens the card builder, an account that
    already existed (Google found it) opens its own dashboard. A partner is
    never sent to a customer's plan page. */
export function afterSignupPath(account: { created: boolean; role: string }, planPage: string): string {
  if (account.created) return planPage || "/dashboard/build";
  if (account.role === "reseller") return "/reseller";
  return (account.role === "customer" && planPage) || "/dashboard";
}
