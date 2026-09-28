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
