import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { offerFromPlans, type ProductOffer } from "@contracts/product-offer";
import {
  FEED_RETRY_AFTER_SECONDS, buildFeedItem, buildProductFeedXml, feedDescription, feedItems, merchantFeedResponse, productLd,
  type FeedProduct,
} from "./merchant-feed";

const GOLD = { id: 5, slug: "gold", name: "Gold", monthlyPrice: "99.00", yearlyPrice: "999.00", threeYearPrice: "2499.00", isActive: true };
const OFFER = offerFromPlans([GOLD])!;
const offerAt = (yearlyPrice: string): ProductOffer => offerFromPlans([{ ...GOLD, yearlyPrice }])!;

const DESCRIPTION = "Midnight Gold Digital Business Card is a ready-to-use digital business card design from DigitalCarda. Share your contact details, services, photos and payment links from one link or QR code — no app needed for you or the people you share it with. Update your details any time and your live card changes instantly, so a printed QR never goes out of date.";

/** A products row shaped like the listed ones in the database. */
const row = (over: Partial<FeedProduct> = {}): FeedProduct => ({
  id: 1, slug: "midnight-gold-card", name: "Midnight Gold Digital Business Card",
  tagline: "Instant digital card — no app, no printing", description: DESCRIPTION, category: "Real Estate",
  status: "published", price: "999.00",
  images: [
    "/products/midnight-gold/midnight-gold-digital-business-card.png",
    "/products/midnight-gold/midnight-gold-digital-business-card-features.png",
    "/products/midnight-gold/midnight-gold-digital-business-card-preview.png",
    "/products/midnight-gold/midnight-gold-digital-business-card-services.png",
  ],
  ...over,
});

/** The catalogue in miniature: listed designs and every kind that is not. */
const CATALOGUE: FeedProduct[] = [
  row({ id: 2, slug: "ocean-blue-card", name: "Ocean Blue Digital Business Card", category: null, images: ["/products/ocean-blue/ocean-blue-digital-business-card.png"] }),
  row({ id: 1 }),
  row({ id: 62, slug: "poster-collage-card", name: "Poster Collage Digital Business Card" }),          // held back for its pictures
  row({ id: 41, slug: "teal-breeze-card", name: "Teal Breeze Digital Business Card", price: "0.00" }), // not priced
  row({ id: 42, slug: "indigo-card", name: "Indigo Digital Business Card", price: "0.00" }),           // retired
  row({ id: 49, slug: "employee-id-card", name: "Employee ID Card", price: "0.00" }),                  // paid add-on
  row({ id: 50, slug: "membership-card", name: "Membership Card", price: "0.00" }),                    // paid add-on
  row({ id: 53, slug: "bento-grid-card", name: "Bento Grid Digital Business Card", price: "0.00", images: null }),
  row({ id: 60, slug: "priced-no-picture-card", name: "Priced, No Picture", images: [] }),
  row({ id: 61, slug: "draft-card", name: "Draft", status: "draft" }),
  row({ id: 62, slug: "archived-card", name: "Archived", status: "archived" }),
  row({ id: 28, slug: "ivory-bloom-bio-card", name: "Ivory Bloom (Bio) Digital Business Card", category: null }),
];
const LISTED = ["midnight-gold-card", "ocean-blue-card", "ivory-bloom-bio-card"];

/** Every <tag>value</tag> of one name, entities decoded. */
const values = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) =>
    m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"));
const itemsOf = (xml: string) => xml.split("<item>").slice(1).map((s) => s.split("</item>")[0]);

/** A strict enough reading of XML 1.0 for this file: legal characters only,
    every `&` an entity, no stray `<`, and every tag closed in order. */
function assertWellFormed(xml: string) {
  expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
  expect(xml).not.toMatch(/[^\t\n\r\x20-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/u);
  const body =xml.replace(/^<\?xml[^>]*\?>/, "");
  expect(body.replace(/&(amp|lt|gt|quot|apos);/g, "")).not.toContain("&");
  const open: string[] = [];
  let rest = body;
  for (let m = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*>/.exec(rest); m; m = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*>/.exec(rest)) {
    expect(rest.slice(0, m.index)).not.toMatch(/[<>]/); // text between tags
    if (m[1]) expect(open.pop()).toBe(m[2]); else open.push(m[2]);
    rest = rest.slice(m.index + m[0].length);
  }
  expect(rest.trim()).toBe("");
  expect(open).toEqual([]);
}

describe("which designs are in the feed", () => {
  const xml = buildProductFeedXml(CATALOGUE, OFFER);

  it("has an item for each listed design and for nothing else", () => {
    expect(values(xml, "g:id")).toEqual(LISTED);
    expect(itemsOf(xml)).toHaveLength(3);
  });

  it("leaves out unpriced designs, the paid add-ons, the retired design and the one held back for its pictures", () => {
    for (const slug of ["teal-breeze-card", "indigo-card", "employee-id-card", "membership-card", "poster-collage-card", "bento-grid-card", "priced-no-picture-card", "draft-card", "archived-card"]) {
      expect(xml).not.toContain(slug);
      expect(buildFeedItem(CATALOGUE.find((p) => p.slug === slug)!, OFFER)).toBe("");
    }
  });

  it("is in product order, however the rows arrive", () => {
    const shuffled = [...CATALOGUE].reverse();
    expect(buildProductFeedXml(shuffled, OFFER)).toBe(xml);
    expect(feedItems(shuffled, OFFER)).toEqual(feedItems(CATALOGUE, OFFER));
  });
});

describe("what each item says", () => {
  const xml = buildProductFeedXml(CATALOGUE, OFFER);
  const items = itemsOf(xml);

  it("is titled as a 1-year subscription", () => {
    expect(values(xml, "title").slice(1)).toEqual([
      "Midnight Gold Digital Business Card (1-Year Subscription)",
      "Ocean Blue Digital Business Card (1-Year Subscription)",
      "Ivory Bloom (Bio) Digital Business Card (1-Year Subscription)",
    ]);
  });

  it("is priced at the Gold yearly price, in rupees", () => {
    expect(values(xml, "g:price")).toEqual(["999.00 INR", "999.00 INR", "999.00 INR"]);
  });

  it("takes that price from the plan and never from the product row", () => {
    const odd = [row({ price: "1234.00" }), row({ id: 2, slug: "ocean-blue-card", price: "1" }), row({ id: 3, slug: "aqua-card", price: 5 })];
    expect(values(buildProductFeedXml(odd, OFFER), "g:price")).toEqual(["999.00 INR", "999.00 INR", "999.00 INR"]);
    // A new plan price is every item's price.
    expect(values(buildProductFeedXml(odd, offerAt("1199.00")), "g:price")).toEqual(["1199.00 INR", "1199.00 INR", "1199.00 INR"]);
    for (const text of [xml, buildProductFeedXml(odd, OFFER)]) {
      expect(text).not.toMatch(/<g:price>0(\.0+)? /);
      expect(text).not.toContain("NaN");
      expect(text).not.toContain("g:sale_price");
    }
  });

  it("states a plan price stored with paise as the whole rupees checkout charges", () => {
    expect(values(buildProductFeedXml([row()], offerAt("999.50")), "g:price")).toEqual(["1000.00 INR"]);
    expect((productLd(row(), offerAt("999.50"))!.offers as Record<string, unknown>).price).toBe("1000.00");
  });

  it("is a software subscription that is in stock", () => {
    expect(values(xml, "g:google_product_category")).toEqual(["5300", "5300", "5300"]);
    expect(values(xml, "g:availability")).toEqual(["in_stock", "in_stock", "in_stock"]);
    expect(values(xml, "g:condition")).toEqual(["new", "new", "new"]);
  });

  it("links to the design's own page", () => {
    expect(values(xml, "link").slice(1)).toEqual(LISTED.map((slug) => `https://digitalcarda.in/digital-business-cards-templates/${slug}`));
  });

  it("sends the main picture only, as a full https address", () => {
    expect(values(xml, "g:image_link")).toEqual([
      "https://digitalcarda.in/products/midnight-gold/midnight-gold-digital-business-card.png",
      "https://digitalcarda.in/products/ocean-blue/ocean-blue-digital-business-card.png",
      "https://digitalcarda.in/products/midnight-gold/midnight-gold-digital-business-card.png",
    ]);
    expect(xml).not.toContain("additional_image_link");
    expect(xml).not.toMatch(/-features\.png|-preview\.png|-services\.png|why-businessman/);
    expect(values(buildFeedItem(row({ images: ["/products/a b/ä.png"] }), OFFER), "g:image_link")).toEqual(["https://digitalcarda.in/products/a%20b/%C3%A4.png"]);
  });

  it("identifies the product by brand and our own part number, the slug", () => {
    expect(values(xml, "g:brand")).toEqual(["DigitalCarda", "DigitalCarda", "DigitalCarda"]);
    expect(values(xml, "g:mpn")).toEqual(LISTED);
    expect(values(xml, "g:mpn")).toEqual(values(xml, "g:id"));
    expect(xml).not.toContain("identifier_exists");
    expect(xml).not.toContain("g:gtin");
  });

  it("sends no shipping: the account's free-shipping policy covers it", () => {
    expect(xml).not.toContain("g:shipping");
  });

  it("carries exactly the same attributes on every item", () => {
    const tagsOf = (item: string) => [...item.matchAll(/<([\w:]+)>/g)].map((m) => m[1]);
    const base = ["g:id", "title", "description", "link", "g:image_link", "g:availability", "g:price", "g:brand", "g:mpn", "g:condition", "g:google_product_category", "g:product_type"];
    expect(tagsOf(items[0])).toEqual([...base, "g:custom_label_0"]); // has a category
    expect(tagsOf(items[1])).toEqual(base);
    expect(values(items[0], "g:product_type")).toEqual(["Digital Business Cards > Real Estate"]);
    expect(values(items[1], "g:product_type")).toEqual(["Digital Business Cards"]);
  });
});

describe("the description", () => {
  const text = feedDescription(row(), OFFER);

  it("says what is bought: a 1-year subscription, 12 months of access", () => {
    expect(text).toContain("A 1-year subscription: 12 months of access.");
    expect(text).toContain("Your link and QR code stay the same for as long as your plan is active.");
  });

  it("describes the product only: how it is paid for stays on the page and in the terms", () => {
    // Google's description rules keep out policies, prices and payment terms.
    for (const item of itemsOf(buildProductFeedXml(CATALOGUE, OFFER))) {
      expect(values(item, "description")[0]).not.toMatch(/paid once|auto-renew|renew|refund|money-back|GST|\d+\s*INR|999/i);
    }
  });

  it("keeps the design's own words but not the company name", () => {
    expect(text.startsWith("Midnight Gold Digital Business Card is a ready-to-use digital business card design. Share your contact details")).toBe(true);
    expect(text).not.toContain("from DigitalCarda");
  });

  it("never claims a permanent link, a lifetime, a free trial or a price", () => {
    const loud = feedDescription(row({
      description: "A fine card. Your permanent link & QR code. Yours forever! Lifetime access. Try it free for 30 days. Start your 30-day trial now. Only ₹999 today. Cancel anytime. Your QR never expires. Works on every phone.",
    }), OFFER);
    expect(loud.startsWith("A fine card. Works on every phone. A 1-year subscription")).toBe(true);
    for (const item of itemsOf(buildProductFeedXml(CATALOGUE, OFFER))) {
      expect(values(item, "description")[0]).not.toMatch(/permanent|forever|lifetime|never|free|trial|cancel anytime|₹/i);
    }
  });

  it("does not say a printed QR never goes out of date, and keeps the rest of that sentence", () => {
    // Every design's stored text ends with this claim; it holds only while a plan is active.
    expect(DESCRIPTION).toContain("so a printed QR never goes out of date.");
    expect(text).not.toMatch(/never|out of date/i);
    expect(text).toContain("Update your details any time and your live card changes instantly. A 1-year subscription");
    // Worded another way it is still an unconditional promise: the sentence goes.
    const other = feedDescription(row({ description: "A fine card. Your printed QR code never stops working. Works on every phone." }), OFFER);
    expect(other.startsWith("A fine card. Works on every phone. A 1-year subscription")).toBe(true);
  });

  it("falls back to the tagline, then to a plain sentence", () => {
    expect(feedDescription(row({ description: "" }), OFFER).startsWith("Instant digital card — no app, no printing. A 1-year subscription")).toBe(true);
    expect(feedDescription(row({ description: null, tagline: null }), OFFER).startsWith("Midnight Gold Digital Business Card is a digital business card design you share by link or QR code. A 1-year subscription")).toBe(true);
    expect(feedDescription(row({ description: "Free forever!" }), OFFER).startsWith("Midnight Gold Digital Business Card is a digital business card design")).toBe(true);
  });

  it("stays within Google's limits", () => {
    const long = feedDescription(row({ description: "word ".repeat(3000) }), OFFER);
    expect(long.length).toBeLessThanOrEqual(5000);
    expect(long.endsWith("for as long as your plan is active.")).toBe(true);
    const title = values(buildFeedItem(row({ name: "Very long name ".repeat(30) }), OFFER), "title")[0];
    expect(title.length).toBeLessThanOrEqual(150);
    expect(title.endsWith("(1-Year Subscription)")).toBe(true);
  });
});

describe("the file itself", () => {
  it("is well-formed XML", () => {
    assertWellFormed(buildProductFeedXml(CATALOGUE, OFFER));
  });

  it("stays well-formed whatever an admin types into a product", () => {
    const nasty = row({
      name: "Bold\x00 & <Bright>\x07 \"Card\" \u{D800} it's\x0B \u{FFFF} fine \u{1F600}",
      description: "Tabs\tand\nnew lines, a bell \u0007, a lone surrogate \uDC00 & an <unclosed tag. ]]> too.",
      category: "R&D <Labs>",
    });
    const xml = buildProductFeedXml([nasty], OFFER);
    assertWellFormed(xml);
    expect(values(xml, "title")[1]).toBe("Bold & <Bright> \"Card\" it's fine \u{1F600} (1-Year Subscription)");
    expect(values(xml, "g:custom_label_0")).toEqual(["R&D <Labs>"]);
    expect(values(xml, "description")[1]).toContain("a lone surrogate & an <unclosed tag. ]]> too.");
  });
});

describe("what the feed address answers", () => {
  const ok = async () => ({ offer: OFFER, rows: CATALOGUE });

  it("serves the feed when the products and the price were read", async () => {
    const res = await merchantFeedResponse(ok);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/xml; charset=utf-8");
    expect(res.body).toBe(buildProductFeedXml(CATALOGUE, OFFER));
    expect(res.headers["retry-after"]).toBeUndefined();
  });

  const unavailable = (res: Awaited<ReturnType<typeof merchantFeedResponse>>) => {
    expect(res.status).toBe(503);
    expect(res.headers["retry-after"]).toBe(String(FEED_RETRY_AFTER_SECONDS));
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(res.headers["cache-control"]).toBe("no-store");
    // Not a feed: nothing Google could read as "the catalogue is now empty".
    expect(res.body).not.toContain("<rss");
    expect(res.body).not.toContain("<?xml");
  };

  it("answers 503 with Retry-After when the database can't be read", async () => {
    unavailable(await merchantFeedResponse(async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:3306"); }));
    // The error text is not handed to whoever fetched the feed.
    const res = await merchantFeedResponse(async () => { throw new Error("secret-host:3306"); });
    expect(res.body).not.toContain("secret-host");
  });

  it("answers 503 when the Gold yearly price can't be read", async () => {
    unavailable(await merchantFeedResponse(async () => ({ offer: null, rows: CATALOGUE })));
    unavailable(await merchantFeedResponse(async () => ({ offer: offerFromPlans([{ ...GOLD, yearlyPrice: "0.00" }]), rows: CATALOGUE })));
    unavailable(await merchantFeedResponse(async () => ({ offer: offerFromPlans([{ ...GOLD, isActive: false }]), rows: CATALOGUE })));
  });

  it("answers 503, not an empty feed, when no design is listed", async () => {
    unavailable(await merchantFeedResponse(async () => ({ offer: OFFER, rows: [] })));
    unavailable(await merchantFeedResponse(async () => ({ offer: OFFER, rows: CATALOGUE.filter((p) => !LISTED.includes(p.slug)) })));
  });
});

describe("the Product block on a design's page", () => {
  const ld = productLd(row(), OFFER)!;
  const offer = ld.offers as Record<string, unknown>;

  it("states the design once, by the feed's id, with its main picture only", () => {
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Midnight Gold Digital Business Card");
    expect(ld.sku).toBe("midnight-gold-card");
    expect(ld.mpn).toBe("midnight-gold-card");
    expect(ld.brand).toEqual({ "@type": "Brand", name: "DigitalCarda" });
    expect(ld.category).toBe("Digital Business Cards > Real Estate");
    expect(ld.image).toBe("https://digitalcarda.in/products/midnight-gold/midnight-gold-digital-business-card.png");
    expect(ld.description).toBe(feedDescription(row(), OFFER));
  });

  it("has one Offer: the Gold yearly price in rupees, in stock, on this page", () => {
    expect(Array.isArray(ld.offers)).toBe(false);
    expect(offer["@type"]).toBe("Offer");
    expect(offer.price).toBe("999.00");
    expect(offer.priceCurrency).toBe("INR");
    expect(offer.availability).toBe("https://schema.org/InStock");
    // Condition is the fourth value Google needs to update a listing from the
    // page (with price, currency and availability); the feed item says "new".
    expect(offer.itemCondition).toBe("https://schema.org/NewCondition");
    expect(offer.seller).toMatchObject({ "@type": "Organization", "@id": "https://digitalcarda.in/#store", name: "DigitalCarda" });
    expect(values(buildFeedItem(row(), OFFER), "g:condition")).toEqual(["new"]);
    expect(offer.url).toBe("https://digitalcarda.in/digital-business-cards-templates/midnight-gold-card");
    expect(offer.name).toBe("Midnight Gold Digital Business Card (1-Year Subscription)");
    expect(JSON.stringify(ld).match(/"@type":"Offer"/g)).toHaveLength(1);
  });

  it("references the store-level return policy", () => {
    expect(offer.hasMerchantReturnPolicy).toEqual({
      "@id": "https://digitalcarda.in/refund-policy#policy",
    });
  });

  it("agrees with the design's feed item on id, price, picture and address", () => {
    for (const p of CATALOGUE.filter((x) => LISTED.includes(x.slug))) {
      const item = buildFeedItem(p, OFFER);
      const block = productLd(p, OFFER)!;
      const o = block.offers as Record<string, unknown>;
      expect(values(item, "g:id")).toEqual([block.sku]);
      expect(values(item, "g:mpn")).toEqual([block.mpn]);
      expect(values(item, "g:price")).toEqual([`${o.price} ${o.priceCurrency}`]);
      expect(values(item, "g:image_link")).toEqual([block.image]);
      expect(values(item, "link")).toEqual([o.url]);
      expect(values(item, "title")).toEqual([o.name]);
      expect(values(item, "description")).toEqual([block.description]);
    }
  });

  it("follows the plan price, not the product row", () => {
    expect((productLd(row({ price: "1234.00" }), OFFER)!.offers as Record<string, unknown>).price).toBe("999.00");
    expect((productLd(row(), offerAt("1499.00"))!.offers as Record<string, unknown>).price).toBe("1499.00");
  });

  it("is absent for every design that isn't listed — so no price of 0, and no product without an offer", () => {
    for (const p of CATALOGUE.filter((x) => !LISTED.includes(x.slug))) expect(productLd(p, OFFER)).toBeNull();
    for (const p of CATALOGUE) {
      const block = productLd(p, OFFER);
      if (block) expect(Number((block.offers as Record<string, unknown>).price)).toBeGreaterThan(0);
    }
  });

  it("is absent when the price can't be read", () => {
    for (const p of CATALOGUE) expect(productLd(p, null)).toBeNull();
  });
});

describe("where the structured data is written", () => {
  const read = (file: string) => fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");

  it("is the server only: the product page adds no second copy in the browser", () => {
    const page = read("src/pages/public/ProductDetail.tsx");
    expect(page).not.toContain("ld+json");
    expect(page).not.toContain("schema.org");
  });
});
