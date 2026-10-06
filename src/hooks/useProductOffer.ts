/* The price a listed design's product page shows: the Gold plan's 1-year price,
 * or null when there is none to show.
 *
 * On a product page the server puts this value in the HTML it sends (seeded as
 * product.offer by api/lib/vite.ts), so it is there on the first paint, without
 * JavaScript and without a request — Google's crawler may not call /api/ at
 * all. It is the same value the server wrote into the page's structured data.
 *
 * Deliberately not useCurrency: this price is rupees for every visitor,
 * wherever they are, and it is never fetched again once the page has it, so it
 * cannot change under the reader after the page has loaded. Reached by a link
 * inside the site, the page asks the server once.
 *
 * Show a price only when this returns an offer AND productListing(product) in
 * @contracts/product-offer says the design is listed.
 */
import { trpc } from "@/providers/trpc";
import type { ProductOffer } from "@contracts/product-offer";

export function useProductOffer(opts: { /** false: don't ask (a page showing no design). */ enabled?: boolean } = {}): ProductOffer | null {
  const { data } = trpc.product.offer.useQuery(undefined, {
    enabled: opts.enabled ?? true,
    staleTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return data ?? null;
}
