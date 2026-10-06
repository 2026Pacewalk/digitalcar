/*
 * What Google is told about a design: its item in the Merchant Center product
 * feed (RSS 2.0 + g: namespace; boot.ts serves it at /merchant-feed.xml and the
 * older /feed/products.xml) and the Product block on its page (./vite.ts). Both
 * are built here, from the same product row and the same offer, so they agree.
 *
 * What is sold is "this design on the Gold plan, 1 year, prepaid" — a software
 * subscription, which Google lists only in this shape. So every item has:
 *  - the title "<name> (1-Year Subscription)" and category 5300, Software >
 *    Computer Software > Business & Productivity Software;
 *  - the Gold plan's yearly price, read from subscription_packages by
 *    ./product-offer.ts. products.price is never sent;
 *  - one picture, the main one. A design's other pictures are posters with text
 *    on them, which Google rejects;
 *  - brand and mpn. DigitalCarda makes the product and is its only seller; for
 *    that case Google's brand page says to send an MPN of your own choosing
 *    instead of identifier_exists "no", and its MPN page allows the maker to
 *    create one. The slug is that MPN (and the structured data's sku and mpn);
 *  - no shipping: the Merchant Center account has a free-shipping policy for
 *    India, which covers a product delivered online.
 * Which designs are listed is decided by productListing() in
 * contracts/product-offer.ts — the product page asks the same question.
 *
 * A feed with no items tells Google to remove every product. So when the
 * products or the price can't be read, the answer is 503 with Retry-After
 * (merchantFeedResponse), never a valid but empty feed.
 */
import { offerLd } from "../../src/lib/offerPolicy";
import { mainImage, offerAmount, productListing, subscriptionTitle, type ProductOffer } from "@contracts/product-offer";

const SITE = "https://digitalcarda.in";
const BRAND = "DigitalCarda";
/** Software > Computer Software > Business & Productivity Software. Google asks for the id. */
const GOOGLE_CATEGORY = "5300";
const DESCRIPTION_MAX = 5000; // Google's limit for a description
/** How long Google is asked to wait before fetching again after a 503. */
export const FEED_RETRY_AFTER_SECONDS = 900;

/** The columns of a products row used here. */
export type FeedProduct = {
  id?: number | null; slug: string; name: string; tagline?: string | null; description?: string | null;
  category?: string | null; status?: string | null; price?: string | number | null; images?: unknown;
};

/** What the feed is built from (./product-offer.ts loadFeedSource). */
export type FeedSource = { offer: ProductOffer | null; rows: FeedProduct[] };

/* XML 1.0 cannot carry control characters, lone surrogates or U+FFFE/U+FFFF —
   not even escaped — so one of them in a product name would make the whole file
   unreadable. They are dropped. */
const XML_ILLEGAL = /[^\t\n\r\x20-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu;
const clean =(s: unknown) => String(s ?? "").replace(XML_ILLEGAL, "").replace(/\s+/g, " ").trim();
const esc = (s: unknown) =>
  String(s ?? "").replace(XML_ILLEGAL, "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch] || ch));

/** A path on this site, or an https URL, as a full encoded https URL. Null for anything else. */
function httpsUrl(u: string, base: string): string | null {
  try {
    const url = new URL(u, `${base}/`);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

const productUrl = (slug: string, base: string) => `${base}/digital-business-cards-templates/${encodeURIComponent(slug)}`;

/** A listed design's main picture as a full URL. Null when the design isn't
    listed — the one test the feed item and the Product block both start with. */
function listedImage(p: FeedProduct, base: string): string | null {
  if (!productListing(p).listed) return null;
  const main = mainImage(p.images);
  return main ? httpsUrl(main, base) : null;
}

/* A sentence of a design's own text is left out when it promises something the
   plan doesn't ("permanent", "forever", "lifetime", something that "never"
   happens), or talks about price or the free trial — Google allows neither in
   a description. */
const NOT_FOR_GOOGLE = /\b(permanent|permanently|forever|lifetime|never|free|trial|cancel anytime)\b|₹|\bRs\.?\s*\d/i;

/** The description sent to Google, in the feed and in the page's Product block:
    the design's own words, then what is actually bought. */
export function feedDescription(p: FeedProduct, offer: ProductOffer): string {
  const own = clean(p.description || p.tagline || "")
    // The maker's name has its own field (brand); Google asks to keep it out of here.
    .replace(/\s+from DigitalCarda(?=[\s.,;:!?]|$)/gi, "")
    // The designs' stored text ends "…your live card changes instantly, so a
    // printed QR never goes out of date". That holds only while a plan is
    // active, which the closing sentence below says; the rest of it stays.
    .replace(/,?\s+so (?:a|your) printed QR(?: code)? never goes out of date(?=[.!?]|$)/gi, "")
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence && !NOT_FOR_GOOGLE.test(sentence))
    .join(" ");
  const lead = own || `${clean(p.name)} is a digital business card design you share by link or QR code.`;
  // What is bought, as facts about the product only. How it is paid for (once,
  // no auto-renewal, the refund) is on the page and in the terms, where Google
  // asks for it — its description rules keep payment terms and policies out.
  const terms = `A 1-year subscription: ${offer.months} months of access. Your link and QR code stay the same for as long as your plan is active.`;
  const room = DESCRIPTION_MAX - terms.length - 2;
  const body = lead.length > room ? lead.slice(0, room).trimEnd() : lead;
  return `${body}${/[.!?]$/.test(body) ? "" : "."} ${terms}`;
}

/** One feed item — or "" when the design isn't listed. */
export function buildFeedItem(p: FeedProduct, offer: ProductOffer, base = SITE): string {
  const image = listedImage(p, base);
  if (!image) return "";
  const category = clean(p.category);
  return [
    "  <item>",
    `    <g:id>${esc(p.slug)}</g:id>`,
    `    <title>${esc(subscriptionTitle(clean(p.name)))}</title>`,
    `    <description>${esc(feedDescription(p, offer))}</description>`,
    `    <link>${esc(productUrl(p.slug, base))}</link>`,
    `    <g:image_link>${esc(image)}</g:image_link>`,
    `    <g:availability>in_stock</g:availability>`,
    `    <g:price>${offerAmount(offer)} ${offer.currency}</g:price>`,
    `    <g:brand>${BRAND}</g:brand>`,
    `    <g:mpn>${esc(p.slug)}</g:mpn>`,
    `    <g:condition>new</g:condition>`,
    `    <g:google_product_category>${GOOGLE_CATEGORY}</g:google_product_category>`,
    `    <g:product_type>${esc(category ? `Digital Business Cards > ${category}` : "Digital Business Cards")}</g:product_type>`,
    ...(category ? [`    <g:custom_label_0>${esc(category)}</g:custom_label_0>`] : []),
    "  </item>",
  ].join("\n");
}

/** The listed designs' items, oldest product first, so the file reads the same
    on every fetch whatever order the rows arrive in. */
export function feedItems(rows: FeedProduct[], offer: ProductOffer, base = SITE): string[] {
  return [...(rows || [])]
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => buildFeedItem(p, offer, base))
    .filter(Boolean);
}

export function buildProductFeedXml(rows: FeedProduct[], offer: ProductOffer, base = SITE): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n` +
    `  <title>DigitalCarda — Digital Business Cards</title>\n` +
    `  <link>${base}/digital-business-cards-templates</link>\n` +
    `  <description>Digital business card designs by DigitalCarda, each sold as a 1-year subscription</description>\n` +
    `${feedItems(rows, offer, base).join("\n")}\n</channel>\n</rss>`;
}

export type FeedResponse = { status: 200 | 503; body: string; headers: Record<string, string> };

/** What the feed URL answers. `load` reads the products and the offer and may
    throw. Anything short of a real catalogue — the read failed, the plan price
    is unreadable, or nothing is listed — is "temporarily unavailable", so
    Google keeps the products it already has and fetches again later. */
export async function merchantFeedResponse(load: () => Promise<FeedSource>, base = SITE): Promise<FeedResponse> {
  let why: string;
  try {
    const { offer, rows } = await load();
    if (!offer) why = "the plan price could not be read";
    else if (!feedItems(rows, offer, base).length) why = "no product is listed";
    else return { status: 200, body: buildProductFeedXml(rows, offer, base), headers: { "content-type": "application/xml; charset=utf-8" } };
  } catch {
    why = "the products could not be read";
  }
  return {
    status: 503,
    body: `The product feed is temporarily unavailable (${why}). Please try again later.\n`,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": String(FEED_RETRY_AFTER_SECONDS),
      "cache-control": "no-store",
    },
  };
}

/** The Product block for a design's page: the same name, picture, identifiers
    and price as its feed item. Null when the design isn't listed or there is no
    price to state — the page then carries no Product block at all, so it can
    never state a price of 0 or a product nobody can buy. */
export function productLd(p: FeedProduct, offer: ProductOffer | null, base = SITE): Record<string, unknown> | null {
  if (!offer) return null;
  const image = listedImage(p, base);
  if (!image) return null;
  const name = clean(p.name);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: feedDescription(p, offer),
    sku: p.slug,
    mpn: p.slug,
    brand: { "@type": "Brand", name: BRAND },
    image,
    offers: offerLd({ name: subscriptionTitle(name), price: offerAmount(offer), url: productUrl(p.slug, base) }),
  };
}
