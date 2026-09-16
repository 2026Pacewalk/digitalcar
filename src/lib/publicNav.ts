/* The public site's link map — ONE place for the header menus, the page
 * search, the footer and the /sitemap page.
 *
 * Both used to be hand-written: the old footer pointed "Agencies",
 * "Freelancers" and "Local Businesses" all at /industries and three
 * different labels at /features, and had no way to stay in step with pages
 * added later. Adding a page here puts it in both places.
 *
 * Only real, working destinations belong here. Social profiles in particular:
 * the old footer showed Twitter, LinkedIn, Instagram and Facebook icons that
 * linked nowhere. Add a profile only once its official URL exists.
 *
 * Import-free so the server-rendered layout can use it without pulling pages.
 */

export type NavLink = { label: string; href: string; badge?: string; desc?: string };
export type NavGroup = { title: string; links: NavLink[] };

export const CONTACT = {
  email: "hello@digitalcarda.in",
  phone: "+91 95177 22444",
  phoneHref: "tel:+919517722444",
  whatsappHref: "https://wa.me/919517722444?text=Hi%20DigitalCarda",
};

/** Official profiles only. `icon` is a hosted brand mark (public/sig). Also
 *  feeds the Organization `sameAs` structured data in PublicLayout. */
export const SOCIAL_LINKS: { label: string; href: string; icon: string }[] = [
  { label: "Pinterest", href: "https://in.pinterest.com/digitalcarda/", icon: "/sig/s-pinterest.png" },
];

const PRODUCT: NavGroup = {
  title: "Product",
  links: [
    { label: "Features", href: "/features" },
    { label: "Card templates", href: "/digital-business-cards-templates" },
    { label: "Pricing", href: "/pricing" },
    { label: "AI card generator", href: "/ai-card-generator" },
    { label: "Custom domain", href: "/custom-domain" },
  ],
};

const FREE_TOOLS: NavGroup = {
  title: "Free tools",
  links: [
    { label: "All free tools", href: "/free-tools" },
    { label: "Email signature generator", href: "/email-signature-generator", badge: "Free" },
    { label: "WhatsApp message templates", href: "/whatsapp-message-templates", badge: "Free" },
  ],
};

const BUSINESS: NavGroup = {
  title: "For business",
  links: [
    { label: "Industries", href: "/industries" },
    { label: "Bulk cards for teams", href: "/bulk-cards" },
    { label: "Reseller program", href: "/resellers" },
    { label: "Refer & earn", href: "/refer-earn" },
  ],
};

const COMPANY: NavGroup = {
  title: "Company",
  links: [
    { label: "About us", href: "/about" },
    { label: "Blog & guides", href: "/blog" },
    { label: "Contact us", href: "/contact" },
    { label: "Start free trial", href: "/signup" },
    { label: "Sign in", href: "/login" },
    { label: "Sitemap", href: "/sitemap" },
  ],
};

export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms & conditions", href: "/terms-of-service" },
  { label: "Refund policy", href: "/refund-policy" },
];

export const FOOTER_GROUPS: NavGroup[] = [PRODUCT, FREE_TOOLS, BUSINESS, COMPANY];

/** Blog guides featured in the footer. Hand-picked (this file stays import-free,
 *  so it can't read the blog data); api/lib/public-nav.test.ts fails if a slug
 *  stops matching a real article. `desc` is the article's topic. */
export const FOOTER_GUIDES: (NavLink & { desc: string })[] = [
  { label: "How to make a digital visiting card online", href: "/blog/how-to-make-a-digital-visiting-card", desc: "Getting started" },
  { label: "NFC business cards in India: how they work and price", href: "/blog/nfc-business-card-india", desc: "NFC & QR codes" },
  { label: "Google review QR code: get more reviews", href: "/blog/google-review-qr-code", desc: "Grow your business" },
];

/** Everything, for /sitemap: the footer groups plus home and the legal pages. */
export const SITEMAP_GROUPS: NavGroup[] = [
  { title: "Start here", links: [{ label: "Home", href: "/" }, ...COMPANY.links.filter((l) => l.href !== "/sitemap")] },
  PRODUCT,
  FREE_TOOLS,
  BUSINESS,
  { title: "Legal", links: LEGAL_LINKS },
];

/* ── Header ──────────────────────────────────────────────────────────────────
   Every description states a fact the linked page itself makes — keep them in
   step when a page's offer changes. */

export type HeaderMenu = {
  id: "product" | "templates" | "tools" | "business";
  label: string;
  items: (NavLink & { desc: string })[];
  feature: { eyebrow: string; title: string; text: string; href: string; cta: string };
};

export const HEADER_MENUS: HeaderMenu[] = [
  {
    id: "product",
    label: "Product",
    items: [
      { label: "Features", href: "/features", desc: "QR and WhatsApp sharing, lead capture, analytics and UPI payments" },
      { label: "AI card generator", href: "/ai-card-generator", desc: "AI writes your headline, about, services and call-to-action" },
      { label: "Custom domain", href: "/custom-domain", desc: "Your card on your own domain, like card.yourbrand.com" },
    ],
    feature: {
      eyebrow: "30-day free trial",
      title: "Your card, live in minutes",
      text: "No card details needed. Share it by QR code, WhatsApp or a single link.",
      href: "/signup",
      cta: "Start free trial",
    },
  },
  {
    id: "templates",
    label: "Templates",
    items: [
      { label: "Card templates", href: "/digital-business-cards-templates", desc: "Ready-made digital business cards for every profession" },
      { label: "Industries", href: "/industries", desc: "Cards for doctors, real estate, lawyers, salons and more" },
    ],
    feature: {
      eyebrow: "Live demos",
      title: "Try a template before you pick",
      text: "Every template opens as a working demo card you can test on your phone.",
      href: "/digital-business-cards-templates",
      cta: "Browse templates",
    },
  },
  {
    id: "tools",
    label: "Free tools",
    items: [
      { label: "Email signature generator", href: "/email-signature-generator", badge: "Free", desc: "14 designs for Gmail, Outlook and Apple Mail" },
      { label: "WhatsApp message templates", href: "/whatsapp-message-templates", badge: "Free", desc: "12 greeting, away and quick-reply messages to copy" },
      { label: "All free tools", href: "/free-tools", desc: "Free for every business — no sign-up needed" },
    ],
    feature: {
      eyebrow: "No sign-up",
      title: "Free tools for your business",
      text: "Make an email signature or a WhatsApp welcome message and copy it in seconds.",
      href: "/free-tools",
      cta: "Open free tools",
    },
  },
  {
    id: "business",
    label: "Business",
    items: [
      { label: "Bulk cards for teams", href: "/bulk-cards", desc: "One brand for every employee, with volume pricing" },
      { label: "Reseller program", href: "/resellers", desc: "Sell under your own brand and earn 20–30% recurring" },
      { label: "Refer & earn", href: "/refer-earn", desc: "Friends get 15% off, you earn 15% cash" },
    ],
    feature: {
      eyebrow: "Partners",
      title: "Grow with DigitalCarda",
      text: "White-label digital cards for your clients, with recurring commission every month.",
      href: "/resellers",
      cta: "See the reseller program",
    },
  },
];

/** Plain links beside the menus. */
export const HEADER_LINKS: NavLink[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/** What the header search looks through, most-visited first (shown before
 *  anything is typed). Card templates are added live from the catalogue. */
export const SEARCH_PAGES: NavLink[] = [
  { label: "Card templates", href: "/digital-business-cards-templates", desc: "Ready-made digital business cards" },
  { label: "Pricing", href: "/pricing", desc: "Plans from Rs. 99/month, 30-day free trial" },
  { label: "Features", href: "/features", desc: "QR, WhatsApp, leads, analytics and payments" },
  { label: "AI card generator", href: "/ai-card-generator", desc: "Let AI write your card" },
  { label: "Email signature generator", href: "/email-signature-generator", desc: "Free · 14 signature designs" },
  { label: "WhatsApp message templates", href: "/whatsapp-message-templates", desc: "Free · greeting, away and quick replies" },
  { label: "Contact us", href: "/contact", desc: "Call, WhatsApp or email the team" },
  { label: "Blog & guides", href: "/blog", desc: "Digital visiting cards, NFC, QR codes and Google reviews" },
  { label: "Start free trial", href: "/signup?promo=FREE30D", desc: "30 days free, no payment needed" },
  { label: "Home", href: "/", desc: "DigitalCarda home page" },
  { label: "Industries", href: "/industries", desc: "Cards for every industry" },
  { label: "Custom domain", href: "/custom-domain", desc: "Your card on your own domain" },
  { label: "All free tools", href: "/free-tools", desc: "Free tools, no sign-up" },
  { label: "Bulk cards for teams", href: "/bulk-cards", desc: "Cards for your whole team" },
  { label: "Reseller program", href: "/resellers", desc: "White-label and earn commission" },
  { label: "Refer & earn", href: "/refer-earn", desc: "Give 15%, get 15% cash" },
  { label: "Sign in", href: "/login", desc: "Customer, reseller and admin login" },
  { label: "Sitemap", href: "/sitemap", desc: "Every page on DigitalCarda" },
  ...LEGAL_LINKS.map((l) => ({ ...l, desc: "Policies" })),
];
