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
 *   /                                  digital business card (3.6K), digital visiting card (4.4K)
 *   /digital-business-cards-templates  digital business card templates
 *   /templates                         digital visiting card designs
 *   /pricing                           digital visiting card price
 *   /email-signature-generator         email signature generator (3.6K), free … (590)
 *   /whatsapp-message-templates        whatsapp business message templates (1K)
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
    "Free tools for small businesses: an email signature generator, WhatsApp Business message templates and an AI card builder. No sign-up needed.",
  crumb: "Free Tools",
};

export const SEO_WHATSAPP_TEMPLATES: PageSeo = {
  title: "WhatsApp Business Message Templates (Free) | DigitalCarda",
  description:
    "12 free WhatsApp Business templates: greeting, away and quick-reply messages. Add your details, edit the words and copy them into WhatsApp Business.",
  crumb: "WhatsApp Message Templates",
  parent: "/free-tools",
};

const SEO_TEMPLATES: PageSeo = {
  title: "Digital Visiting Card Designs | DigitalCarda",
  description:
    "Pick from ready-to-use digital visiting card designs. Every one works on any phone, updates live and keeps your QR code working. Start free for 30 days.",
  crumb: "Card Designs",
};

export const DEFAULT_SEO: PageSeo = {
  title: "Digital Business Card & Digital Visiting Card | DigitalCarda",
  description: "Create your digital visiting card in minutes — QR code, WhatsApp, UPI payments and lead capture on one link. Free 30-day trial, no card details needed.",
};

export const PUBLIC_SEO: Record<string, PageSeo> = {
  "/": DEFAULT_SEO,
  "/features": {
    title: "Digital Business Card Features: QR, WhatsApp & Leads",
    description: "41 features in one digital business card: QR and WhatsApp sharing, lead capture, analytics, UPI payments and custom branding. Try it free for 30 days.",
    crumb: "Features",
  },
  "/digital-business-cards-templates": {
    title: "Digital Business Card Templates for Every Profession",
    description: "Browse ready-made digital business card templates for every profession. Preview a live demo, then try any card free for 30 days — no app, no printing.",
    crumb: "Card Templates",
  },
  "/templates": SEO_TEMPLATES,
  "/card-designs": { ...SEO_TEMPLATES, canonicalPath: "/templates" },
  "/industries": {
    title: "Digital Business Cards for Every Industry | DigitalCarda",
    description: "Digital visiting cards for doctors, real estate agents, lawyers, consultants, restaurants, salons, coaches and agencies — made for how each finds clients.",
    crumb: "Industries",
  },
  "/pricing": {
    title: "Digital Visiting Card Price in India — From Rs. 99/month",
    description: "Digital visiting card plans from Rs. 99/month with AI tools, QR codes, analytics and custom domains. Start a 30-day free trial, no card details needed.",
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
    description: "Sell digital business cards under your own brand. Add customers, assign plans, manage leads and earn 20–30% recurring commission.",
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
  "/free-tools": SEO_FREE_TOOLS,
  "/email-signature-generator": SEO_EMAIL_SIGNATURE,
  "/email-signature-templates": { ...SEO_EMAIL_SIGNATURE, canonicalPath: "/email-signature-generator" },
  "/whatsapp-message-templates": SEO_WHATSAPP_TEMPLATES,
  "/whatsapp-business-messages": { ...SEO_WHATSAPP_TEMPLATES, canonicalPath: "/whatsapp-message-templates" },
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
