/* Titles, descriptions, canonicals and breadcrumbs for every public page —
 * the ONE table both sides use.
 *
 * Three things read it and they must not disagree:
 *   · PublicLayout sets document.title / description / canonical / breadcrumbs
 *     on route change.
 *   · The server (api/lib/card-og.ts) writes the same tags into the raw HTML,
 *     which is all that link previewers and non-JavaScript crawlers ever see.
 *   · Each free-tool page sets its own JSON-LD from these constants.
 *
 * Keyword mapping (Semrush, India database, Sept 2026) — one primary term per
 * page so pages don't compete with each other:
 *   /                                  digital visiting card (4.4K), digital business card (3.6K),
 *                                      visiting card maker (8.1K), digital visiting card maker (1K)
 *   /digital-business-cards-templates  visiting card design (90.5K), digital business card templates
 *   /pricing                           digital visiting card price, nfc card price (590)
 *   /industries                        visiting card for business (1K); each /industries/<slug> owns its
 *                                      profession's term (e.g. visiting card for doctor → /industries/doctors),
 *                                      see src/data/industries
 *   /email-signature-generator         email signature generator (3.6K), free … (590)
 *   /whatsapp-message-templates        whatsapp business message templates (1K)
 *   /instagram-bio-templates           instagram bio for business, instagram bio templates
 *   /blog/*                            one article per informational cluster — see src/data/blog
 *
 * Length rules the titles and descriptions are held to: title ≤ 60 characters,
 * description ≤ 155, so neither is cut off in Indian mobile results.
 *
 * Keep this file free of imports: the server bundle pulls it in directly, and
 * the layout must not drag a lazily-loaded page into the main bundle.
 */

const SITE = "https://digitalcarda.in";

export type PageSeo = {
  title: string;
  description: string;
  /** The page this path duplicates, when it's an alias. Its canonical points
   *  there, so the two URLs don't split ranking signals. */
  canonicalPath?: string;
  /** Short name for the page in breadcrumbs. */
  crumb?: string;
  /** Path of the page this one sits under in breadcrumbs. Defaults to home. */
  parent?: string;
};

export const SEO_EMAIL_SIGNATURE: PageSeo = {
  title: "Free Email Signature Generator — 14 Templates | DigitalCarda",
  description:
    "Create a professional email signature free: pick from 14 designs and copy it into Gmail, Outlook or Apple Mail. No sign-up, nothing to install.",
  crumb: "Email Signature Generator",
  parent: "/free-tools",
};

export const SEO_FREE_TOOLS: PageSeo = {
  title: "Free Business Tools — Email Signature & WhatsApp Templates",
  description:
    "Free tools for small businesses: an email signature generator, WhatsApp Business templates, Instagram bio templates and an AI card builder.",
  crumb: "Free Tools",
};

export const SEO_INSTAGRAM_BIO: PageSeo = {
  title: "Instagram Bio Templates for Business (Free) | DigitalCarda",
  description:
    "12 free Instagram bio templates for salons, restaurants, shops, clinics and coaches. Fits the 150-character limit — add your details and copy.",
  crumb: "Instagram Bio Templates",
  parent: "/free-tools",
};

export const SEO_WHATSAPP_TEMPLATES: PageSeo = {
  title: "WhatsApp Business Message Templates (Free) | DigitalCarda",
  description:
    "12 free WhatsApp Business templates: greeting, away and quick-reply messages. Add your details, edit the words and copy them into WhatsApp Business.",
  crumb: "WhatsApp Message Templates",
  parent: "/free-tools",
};

export const DEFAULT_SEO: PageSeo = {
  title: "Digital Business Card India — ₹99/mo | DigitalCarda",
  description: "Make a digital visiting card in 2 minutes. QR + NFC + WhatsApp + UPI on one link. 50+ templates, AI writer, lead tracking. Free 30 days — no card details.",
};

export const PUBLIC_SEO: Record<string, PageSeo> = {
  "/": DEFAULT_SEO,
  "/features": {
    title: "Digital Business Card Features: QR, WhatsApp & Leads",
    description: "41 features in one digital business card: QR and WhatsApp sharing, lead capture, analytics, UPI payments and custom branding. Try it free for 30 days.",
    crumb: "Features",
  },
  "/digital-business-cards-templates": {
    title: "Digital Visiting Card Designs & Business Card Templates",
    description: "Browse 50+ digital visiting card designs and business card templates for every profession. Open a live demo, then try any design free for 30 days.",
    crumb: "Card Templates",
  },
  "/industries": {
    title: "Digital Visiting Card for Business, by Profession",
    description: "Digital visiting cards for doctors, advocates, CAs, property dealers, salons, restaurants and more: what each card needs. Free for 30 days.",
    crumb: "Industries",
  },
  "/pricing": {
    title: "Digital Visiting Card Price in India — From Rs. 99/month",
    description: "Digital visiting card plans from Rs. 99/month, NFC business cards at Rs. 499, QR codes, analytics and custom domains. Free for 30 days, no payment.",
    crumb: "Pricing",
  },
  "/ai-card-generator": {
    title: "AI Digital Business Card Generator | DigitalCarda",
    description: "Enter your business details and AI writes your digital card — headline, about, services, call-to-action and SEO text — ready to publish in minutes.",
    crumb: "AI Card Generator",
  },
  "/bulk-cards": {
    title: "Bulk Digital Business Cards for Teams | DigitalCarda",
    description: "Create digital business cards for your whole team with consistent branding and volume pricing that drops as you add cards. Request a bulk quote today.",
    crumb: "Bulk Cards",
  },
  "/resellers": {
    title: "Digital Business Card Reseller & White-Label Program",
    description: "Resell DigitalCarda digital business cards. Add customers from your own dashboard, earn 20% on every plan they buy, and withdraw to your bank or UPI any time.",
    crumb: "Reseller Program",
  },
  "/refer-earn": {
    title: "Refer & Earn: Give 15%, Get 15% Cash | DigitalCarda",
    description: "Refer a friend to DigitalCarda: they get 15% off their first paid plan and you earn 15% cash, paid to your wallet and withdrawable to bank or UPI.",
    crumb: "Refer & Earn",
  },
  "/custom-domain": {
    title: "Custom Domain for Your Digital Business Card | DigitalCarda",
    description: "Put your digital business card on your own domain, like card.yourbrand.com. HTTPS included, you keep ownership, live in 24–48 hours. Rs. 499 one-time.",
    crumb: "Custom Domain",
  },
  "/contact": {
    title: "Contact DigitalCarda — Call, WhatsApp or Email Us",
    description: "Questions about digital business cards, reseller plans or custom domains? Call or WhatsApp +91 95177 22444, or email hello@digitalcarda.in.",
    crumb: "Contact",
  },
  "/login": {
    title: "Login - DigitalCarda | Customer, Reseller & Admin Portal",
    description: "Sign in to your DigitalCarda account. Access your dashboard, cards, analytics, leads, and reseller tools.",
    crumb: "Login",
  },
  "/signup": {
    title: "Sign Up - DigitalCarda | Create Your Free Digital Card",
    description: "Start a 30-day free trial with no card details upfront. Create a digital business card with AI tools, QR codes and lead tracking.",
    crumb: "Sign Up",
  },
  "/privacy": {
    title: "Privacy Policy - DigitalCarda",
    description: "Read our privacy policy to understand how DigitalCarda collects, uses, and protects your personal information.",
    crumb: "Privacy Policy",
  },
  "/refund-policy": {
    title: "Refund Policy - DigitalCarda",
    description: "Review our refund policy for subscription plans and digital card services.",
    crumb: "Refund Policy",
  },
  "/shipping-policy": {
    title: "Shipping & Delivery Policy - DigitalCarda",
    description: "How DigitalCarda plans are delivered online, and how NFC cards and standees are shipped free within India in 3–7 working days.",
    crumb: "Shipping & Delivery",
  },
  "/free-tools": SEO_FREE_TOOLS,
  "/email-signature-generator": SEO_EMAIL_SIGNATURE,
  "/email-signature-templates": { ...SEO_EMAIL_SIGNATURE, canonicalPath: "/email-signature-generator" },
  "/whatsapp-message-templates": SEO_WHATSAPP_TEMPLATES,
  "/whatsapp-business-messages": { ...SEO_WHATSAPP_TEMPLATES, canonicalPath: "/whatsapp-message-templates" },
  "/instagram-bio-templates": SEO_INSTAGRAM_BIO,
  "/about": {
    title: "About DigitalCarda — Digital Visiting Cards for India",
    description: "Who makes DigitalCarda, what we build for Indian businesses, and how our guides are written, checked against official sources and kept up to date.",
    crumb: "About",
  },
  "/blog": {
    title: "Digital Visiting Card Blog: Guides, NFC, QR & Reviews",
    description: "Plain-English guides for Indian businesses: digital visiting cards, NFC and QR code business cards, Google review QR codes and card design ideas.",
    crumb: "Blog",
  },
  "/sitemap": {
    title: "Sitemap — Every DigitalCarda Page",
    description: "Every public page on DigitalCarda in one place: features, pricing, all digital business card templates, free tools, business programmes and policies.",
    crumb: "Sitemap",
  },
  "/terms-of-service": {
    title: "Terms & Conditions - DigitalCarda",
    description: "Read our terms of service to understand the rules and guidelines for using DigitalCarda.",
    crumb: "Terms & Conditions",
  },
  "/digital-business-card-guide": {
    title: "Digital Business Card Guide India 2026 — Complete",
    description: "The complete guide to digital business cards in India: cost, NFC vs QR, templates, industry cards and how to make one in 2 minutes. Updated 2026.",
    crumb: "Digital Business Card Guide",
  },
  "/vs/linktree": {
    title: "DigitalCarda vs Linktree — Bio Link for India (2026)",
    description: "DigitalCarda vs Linktree side by side: WhatsApp, UPI, NFC, Hindi content and Indian pricing. Which link-in-bio wins for professionals in India.",
    crumb: "vs Linktree",
    parent: "/",
  },
  "/vs/hihello": {
    title: "DigitalCarda vs HiHello — Digital Card in India",
    description: "DigitalCarda vs HiHello: INR pricing, WhatsApp, UPI, NFC delivery in India and Hindi support. Which digital business card fits Indian professionals.",
    crumb: "vs HiHello",
    parent: "/",
  },
  "/vs/beaconstac": {
    title: "DigitalCarda vs Beaconstac — QR & NFC Card India",
    description: "DigitalCarda vs Beaconstac QR: pricing in INR, WhatsApp, UPI, lead capture and NFC printed cards. Which suits Indian businesses better.",
    crumb: "vs Beaconstac",
    parent: "/",
  },
};

// City page SEO (auto-registered below)
const CITY_SLUGS = [
  ["delhi", "Delhi"], ["mumbai", "Mumbai"], ["bangalore", "Bangalore"],
  ["hyderabad", "Hyderabad"], ["chennai", "Chennai"], ["kolkata", "Kolkata"],
  ["pune", "Pune"], ["ahmedabad", "Ahmedabad"], ["jaipur", "Jaipur"],
  ["chandigarh", "Chandigarh"], ["lucknow", "Lucknow"], ["surat", "Surat"],
  ["ludhiana", "Ludhiana"], ["indore", "Indore"], ["nagpur", "Nagpur"],
  ["gurgaon", "Gurgaon"],
] as const;
for (const [slug, name] of CITY_SLUGS) {
  PUBLIC_SEO[`/digital-visiting-card/${slug}`] = {
    title: `Digital Visiting Card in ${name} — ₹99/mo | DigitalCarda`,
    description: `Digital business card for ${name} professionals — QR + NFC + WhatsApp + UPI on one link. Free 30-day trial, free NFC card delivery to ${name}.`,
    crumb: `Digital Card in ${name}`,
    parent: "/",
  };
}

// New long-form blog posts (SEO used by BlogPost when article data is present)
PUBLIC_SEO["/blog/nfc-vs-qr-business-card"] = {
  title: "NFC vs QR Business Card — Which is Better in India",
  description: "NFC business card vs QR code business card: cost, speed, phone support and use cases. Which one Indian professionals should choose in 2026.",
  crumb: "NFC vs QR business card",
  parent: "/blog",
};
PUBLIC_SEO["/blog/whatsapp-business-card"] = {
  title: "WhatsApp Business Card — Share Your Card on WhatsApp",
  description: "How to share your digital business card on WhatsApp, add it to WhatsApp Business, put the QR in your DP and get more replies from Indian customers.",
  crumb: "WhatsApp business card",
  parent: "/blog",
};
PUBLIC_SEO["/blog/digital-vs-paper-business-card"] = {
  title: "Digital vs Paper Business Card — Which is Better 2026",
  description: "Digital business card vs paper visiting card: cost per year, updates, WhatsApp, UPI and sustainability. Nine-point comparison for Indian professionals.",
  crumb: "Digital vs paper business card",
  parent: "/blog",
};

/** SEO for a public path, or null when the path has none. Trailing slashes are
 *  ignored. Own-property lookup, so a path can never resolve to something on
 *  Object.prototype. */
export function seoForPath(pathname: string): PageSeo | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(PUBLIC_SEO, clean) ? PUBLIC_SEO[clean] : null;
}

/** The path a page's canonical link should point at: itself, or the page it's an alias of. */
export function canonicalPathFor(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return seoForPath(clean)?.canonicalPath ?? clean;
}

/** BreadcrumbList JSON-LD for a public page, as a string — or null for the home
 *  page (a trail of one is meaningless) and for paths this table doesn't know.
 *  Product pages build their own trail, which includes the product name. */
export function breadcrumbJsonLd(pathname: string): string | null {
  const path = canonicalPathFor(pathname);
  if (path === "/") return null;
  const page = seoForPath(path);
  if (!page) return null;

  const trail: { name: string; path: string }[] = [{ name: "Home", path: "/" }];
  const parent = page.parent && page.parent !== "/" ? seoForPath(page.parent) : null;
  if (parent && page.parent) trail.push({ name: parent.crumb ?? parent.title, path: page.parent });
  trail.push({ name: page.crumb ?? page.title, path });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE}${t.path}`,
    })),
  });
}
