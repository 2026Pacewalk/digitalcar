/*
 * Google Merchant Center product feed (RSS 2.0 + g: namespace), built from the
 * published catalogue. Pure + testable — boot.ts serves it at /merchant-feed.xml
 * (and the legacy /feed/products.xml).
 *
 * Rules honoured:
 *  - Every image_link / additional_image_link is an ABSOLUTE https URL (Google
 *    rejects relative paths).
 *  - Items are described honestly as a DIGITAL service (no physical/NFC claims).
 *  - Prices match the product pages; sale_price only when genuinely lower.
 *  - Required attrs: id, title, description, link, image_link, availability,
 *    price, condition. Recommended: brand, identifier_exists, google_product_category.
 */
const SITE = "https://digitalcarda.in";
const GOOGLE_CATEGORY = "Business & Industrial > Advertising & Marketing";

export type FeedProduct = {
  slug: string; name: string; tagline?: string | null; description?: string | null;
  category?: string | null; price: string | number; salePrice?: string | number | null;
  currency?: string | null; trialDays?: number | null; images?: unknown;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch] || ch));

const absUrl = (u: string, base: string) => (/^https?:/i.test(u) ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`);

/** Parse a product's images column (array, or JSON string from raw SQL) → string[]. */
export function imageList(images: unknown): string[] {
  let arr: unknown = images;
  if (typeof images === "string") { try { arr = JSON.parse(images); } catch { arr = []; } }
  return (Array.isArray(arr) ? arr : []).filter((x): x is string => typeof x === "string" && !!x);
}

export function buildFeedItem(p: FeedProduct, base = SITE): string {
  const cur = (p.currency || "INR").toUpperCase();
  const link = `${base}/digital-business-cards-templates/${encodeURIComponent(p.slug)}`;
  const price = Number(p.price || 0).toFixed(2);
  const sale = p.salePrice != null && p.salePrice !== "" ? Number(p.salePrice).toFixed(2) : null;
  const imgArr = imageList(p.images);
  const image = imgArr[0] ? absUrl(imgArr[0], base) : `${base}/why-businessman.png`;
  const extra = imgArr.slice(1, 11).map((u) => absUrl(u, base));
  // Honest, non-promotional description (Google discourages promo text like
  // "free trial" and requires the feed price to match the landing page).
  const baseDesc = String(p.description || p.tagline || `${p.name}: a personalised digital business card you share online.`).trim();
  const desc = (/[.!?]$/.test(baseDesc) ? baseDesc : baseDesc + ".") +
    " A digital business card delivered online — instant activation, unlimited edits, and a permanent link & QR code, with one year of access.";

  return [
    "  <item>",
    `    <g:id>${esc(p.slug)}</g:id>`,
    `    <title>${esc(p.name)}</title>`,
    `    <description>${esc(desc)}</description>`,
    `    <link>${esc(link)}</link>`,
    `    <g:image_link>${esc(image)}</g:image_link>`,
    ...extra.map((u) => `    <g:additional_image_link>${esc(u)}</g:additional_image_link>`),
    `    <g:availability>in stock</g:availability>`,
    `    <g:price>${price} ${cur}</g:price>`,
    ...(sale && Number(sale) < Number(price) ? [`    <g:sale_price>${sale} ${cur}</g:sale_price>`] : []),
    `    <g:brand>DigitalCarda</g:brand>`,
    `    <g:condition>new</g:condition>`,
    `    <g:identifier_exists>no</g:identifier_exists>`,
    `    <g:google_product_category>${esc(GOOGLE_CATEGORY)}</g:google_product_category>`,
    `    <g:product_type>Digital Business Cards${p.category ? " &gt; " + esc(p.category) : ""}</g:product_type>`,
    ...(p.category ? [`    <g:custom_label_0>${esc(p.category)}</g:custom_label_0>`] : []),
    "  </item>",
  ].join("\n");
}

export function buildProductFeedXml(rows: FeedProduct[], base = SITE): string {
  // Only advertise products that have a real product image — submitting many
  // items sharing one generic placeholder triggers Google image disapprovals.
  // Unimaged products auto-join the feed once their images are set.
  const items = (rows || []).filter((p) => imageList(p.images).length > 0).map((p) => buildFeedItem(p, base)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n` +
    `  <title>DigitalCarda — Digital Business Cards</title>\n` +
    `  <link>${base}/digital-business-cards-templates</link>\n` +
    `  <description>Digital business card products by DigitalCarda</description>\n` +
    `${items}\n</channel>\n</rss>`;
}
