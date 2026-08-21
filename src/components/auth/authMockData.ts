/* Single source of truth for the decorative auth-page card mock.

   These are the founder's OWN published card details (the same ones already
   rendered at AuthBrandPanel.tsx:52-56 and Home.tsx), and the two trust figures
   the site already publishes (AuthBrandPanel.tsx:92,94).

   Do NOT add, round up, or invent numbers here. If a figure is not already
   published elsewhere on the site, it does not belong on an auth page. */

export const AUTH_MOCK_CARD = {
  name: "SHEKHAR JAIN",
  role: "DIRECTOR · PACEWALK",
  phone: "+91 99881 44844",
  site: "pacewalk.com",
  email: "md@pacewalk.com",
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
