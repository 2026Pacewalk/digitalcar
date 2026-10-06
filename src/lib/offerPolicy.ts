/* Return + delivery facts for every Offer in our Product structured data.
   Google reads Product + Offer + price as a merchant listing and asks for
   both fields. They must match what the site actually promises:
   - /refund-policy: full refund within 7 days of the first purchase, by email.
   - /shipping-policy: fully digital, activated instantly, nothing shipped.
   Change this file if either policy changes. */
const day = (n: number) => ({ "@type": "QuantitativeValue", minValue: n, maxValue: n, unitCode: "DAY" });

export const OFFER_POLICY = {
  hasMerchantReturnPolicy: {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnFees: "https://schema.org/FreeReturn",
    merchantReturnLink: "https://digitalcarda.in/refund-policy",
  },
  shippingDetails: {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: day(0), transitTime: day(0) },
  },
} as const;

/** One Offer for something a visitor can buy: a single price in rupees, in
    stock, with the return and delivery facts above. A design's product page
    (api/lib/merchant-feed.ts) and the plans on /pricing both build theirs here,
    so they read the same way. `price` is a plain decimal ("999.00") and must be
    an amount that can really be paid at `url` — a 1-year plan price, never 0.
    Price, currency, availability and condition are the four values Google needs
    to keep a listing up to date from the page; the feed says condition "new" too. */
export function offerLd({ price, url, name }: { price: string; url: string; name?: string }) {
  return {
    "@type": "Offer",
    ...(name ? { name } : {}),
    priceCurrency: "INR",
    price,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url,
    ...OFFER_POLICY,
  };
}
