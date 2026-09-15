/* Single source of truth for the decorative auth-page card mock.

   The card is a FICTIONAL sample business (the same "Aarav Mehta / Nayara
   Interiors" the public tools and the home page use). Never put a real
   customer's or the founder's details here — resellers sell this platform
   under their own names and object to seeing anyone else's business on it.

   The two trust figures are the ones the site already publishes elsewhere.
   Do NOT add, round up, or invent numbers here. */

export const AUTH_MOCK_CARD = {
  name: "AARAV MEHTA",
  role: "DIRECTOR · NAYARA INTERIORS",
  phone: "+91 98110 24680",
  site: "nayarainteriors.in",
  email: "aarav@nayarainteriors.in",
  views: "5,173",
} as const;

export const AUTH_TRUST = {
  rating: "4.9",
  ratingLabel: "Rated 4.9 out of 5",
  businesses: "1,456+",
} as const;

/* Real, already-published support channels (PublicLayout.tsx:302,322). */
export const SUPPORT = {
  whatsappHref: "https://wa.me/919517722444",
  whatsappLabel: "WhatsApp +91 95177 22444",
  email: "hello@digitalcarda.in",
} as const;
