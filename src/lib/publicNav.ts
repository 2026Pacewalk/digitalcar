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

/* Contact details shown across the site. The server writes the current values
   (Admin → Settings → Business) into the page as window.__dcSettings; these
   literals are the fallback when it hasn't, e.g. the local dev server. */
type PublicSettings = { brandName?: string; supportEmail?: string; supportPhone?: string; whatsappNumber?: string };
const injected: PublicSettings =
  (globalThis as unknown as { __dcSettings?: PublicSettings }).__dcSettings || {};

const phone = injected.supportPhone || "+91 95177 22444";
const whatsapp = injected.whatsappNumber || "919517722444";

export const CONTACT = {
  email: injected.supportEmail || "hello@digitalcarda.in",
  phone,
  phoneHref: `tel:${phone.replace(/[^d+]/g, "")}`,
  whatsappHref: `https://wa.me/${whatsapp}?text=Hi%20DigitalCarda`,
};

export const BRAND_NAME = injected.brandName || "DigitalCarda";

/** Official profiles only. `icon` is a hosted brand mark (public/sig). Also
 *  feeds the Organization `sameAs` structured data in PublicLayout. */
export const SOCIAL_LINKS: { label: string; href: string; icon: string }[] = [
  { label: "Instagram", href: "https://www.instagram.com/digitalcarda/", icon: "/sig/s-instagram.png" },
  { label: "Facebook", href: "https://www.facebook.com/DigitalCarda/", icon: "/sig/s-facebook.png" },
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
    { label: "Instagram bio templates", href: "/instagram-bio-templates", badge: "Free" },
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
  { label: "Shipping policy", href: "/shipping-policy" },
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
      { label: "For doctors", href: "/industries/doctors", desc: "Clinic QR, directions and save contact for patients" },
      { label: "For advocates", href: "/industries/advocates", desc: "A factual card with practice areas and contact details" },
      { label: "For real estate agents", href: "/industries/real-estate", desc: "Property photos, WhatsApp and an enquiry form" },
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
      { label: "Instagram bio templates", href: "/instagram-bio-templates", badge: "Free", desc: "12 business bios that fit the 150-character limit" },
      { label: "All free tools", href: "/free-tools", desc: "Free for every business — no sign-up needed" },
    ],
    feature: {
      eyebrow: "No sign-up",
      title: "Free tools for your business",
      text: "Make an email signature, a WhatsApp welcome message or an Instagram bio and copy it in seconds.",
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

/** The profession pages under /industries, for the header search. Listed by
 *  hand (this file can't import src/data/industries); api/lib/public-nav.test.ts
 *  fails if a slug stops matching a registered page or a page has no entry
 *  here. Same order as the hub. Each desc names only features the page itself
 *  claims, so it stays true when the page's wording is checked. */
export const INDUSTRY_SEARCH: NavLink[] = [
  { label: "Digital card for advocates & lawyers", href: "/industries/advocates", desc: "Enrolment details, practice areas, call, email and save contact by QR" },
  { label: "Digital card for doctors & clinics", href: "/industries/doctors", desc: "Call, WhatsApp, directions and save contact for patients, from a clinic QR" },
  { label: "Digital card for real estate agents", href: "/industries/real-estate", desc: "Property photos, WhatsApp, directions, an enquiry form and a Leads list" },
  { label: "Digital card for insurance agents", href: "/industries/insurance-agents", desc: "For LIC, insurance and mutual fund advisors: plans, WhatsApp and an enquiry form" },
  { label: "Digital card for chartered accountants", href: "/industries/chartered-accountants", desc: "ITR, GST and accounting services, WhatsApp, email and save contact" },
  { label: "Digital card for beauty parlours & salons", href: "/industries/beauty-parlours", desc: "Services with prices, offers, a gallery and a Google review button" },
  { label: "Digital card for restaurants & cafes", href: "/industries/restaurants", desc: "Menu photos, directions, offers, payment QR and a Google review button" },
  { label: "Digital card for physiotherapists", href: "/industries/physiotherapists", desc: "Call, WhatsApp, directions and exercise videos for clinic and home visits" },
  { label: "Digital card for makeup artists", href: "/industries/makeup-artists", desc: "Bridal portfolio, Instagram reels, packages and an enquiry form" },
  { label: "Digital card for jewellers", href: "/industries/jewellers", desc: "Collections in a photo gallery, offers, directions and WhatsApp" },
  { label: "Digital card for electricians & plumbers", href: "/industries/home-services", desc: "One-tap call, service prices, payment QR and a Google review button" },
  { label: "Digital card for photographers", href: "/industries/photographers", desc: "Full-screen gallery, videos, packages and an enquiry form in one link" },
  { label: "Digital card for boutiques", href: "/industries/boutiques", desc: "New arrivals as photos and reels, offers, WhatsApp and Instagram" },
  { label: "Digital card for travel agencies", href: "/industries/travel-agencies", desc: "Tour packages with prices, offers with end dates and an enquiry form" },
  { label: "Digital card for event planners", href: "/industries/event-planners", desc: "Past-event gallery, packages and an enquiry form for planners, decorators and caterers" },
  { label: "Digital card for car dealers", href: "/industries/automobile", desc: "Car photos with prices, WhatsApp, an enquiry form and a card for each salesperson" },
  { label: "Digital card for schools & coaching classes", href: "/industries/schools-coaching", desc: "Courses with fees, directions, admission enquiries and a card for each teacher" },
  { label: "Digital card for interior designers & architects", href: "/industries/interior-designers", desc: "Project gallery, videos, services and an enquiry form" },
  { label: "Digital card for agencies & freelancers", href: "/industries/digital-agencies", desc: "Services, portfolio, Leads list, analytics and team cards for IT and marketing" },
  { label: "Digital card for consultants & coaches", href: "/industries/consultants", desc: "Services, session videos, an enquiry form and a Leads list for follow-ups" },
];

/** What the header search looks through, most-visited first (shown before
 *  anything is typed). Card templates are added live from the catalogue.
 *  Industry pages come last so the first 8 shown before typing stay the same. */
export const SEARCH_PAGES: NavLink[] = [
  { label: "Card templates", href: "/digital-business-cards-templates", desc: "Ready-made digital business cards" },
  { label: "Pricing", href: "/pricing", desc: "Plans from Rs. 99/month, 30-day free trial" },
  { label: "Features", href: "/features", desc: "QR, WhatsApp, leads, analytics and payments" },
  { label: "AI card generator", href: "/ai-card-generator", desc: "Let AI write your card" },
  { label: "Email signature generator", href: "/email-signature-generator", desc: "Free · 14 signature designs" },
  { label: "WhatsApp message templates", href: "/whatsapp-message-templates", desc: "Free · greeting, away and quick replies" },
  { label: "Instagram bio templates", href: "/instagram-bio-templates", desc: "Free · 12 business bios under 150 characters" },
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
  ...INDUSTRY_SEARCH,
];
