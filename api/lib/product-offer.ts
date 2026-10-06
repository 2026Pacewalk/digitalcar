/* Reads what contracts/product-offer.ts decides from: the Gold plan's row in
   subscription_packages, and the published products.

   Everything that states a price for a design — the product page, its
   structured data (./vite.ts) and the Google Merchant feed (./merchant-feed.ts)
   — gets it from readProductOffer() here, which reads the same column checkout
   charges from. Nothing is cached in this file: a changed plan price is the
   price on the very next read. */
import { asc, eq } from "drizzle-orm";
import { products, subscriptionPackages } from "@db/schema";
import { getDb } from "../queries/connection";
import { offerFromPlans, type ProductOffer } from "@contracts/product-offer";
import type { FeedSource } from "./merchant-feed";

/** The Gold 1-year offer as stored right now. Null when there is no such plan
    on sale; throws when the database can't be read. */
export async function readProductOffer(): Promise<ProductOffer | null> {
  const plans = await getDb()
    .select({
      id: subscriptionPackages.id, slug: subscriptionPackages.slug, name: subscriptionPackages.name,
      yearlyPrice: subscriptionPackages.yearlyPrice, isActive: subscriptionPackages.isActive,
    })
    .from(subscriptionPackages)
    .where(eq(subscriptionPackages.isActive, true));
  return offerFromPlans(plans);
}

/** The same, for a page: a price that can't be read is no price (null), never
    an error page and never a guessed amount. */
export async function currentProductOffer(): Promise<ProductOffer | null> {
  try { return await readProductOffer(); } catch { return null; }
}

/** Everything the Merchant feed is built from, in a stable order. Throws when
    either read fails, so the feed can answer "try again later" instead of
    handing Google an empty catalogue. */
export async function loadFeedSource(): Promise<FeedSource> {
  const [offer, rows] = await Promise.all([
    readProductOffer(),
    getDb().select().from(products).where(eq(products.status, "published")).orderBy(asc(products.id)),
  ]);
  return { offer, rows };
}
