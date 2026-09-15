/* Titles and descriptions for every public page — the ONE table both sides use.
 *
 * Three things read it and they must not disagree:
 *   · PublicLayout sets document.title / description / og tags on route change.
 *   · The server (api/lib/card-og.ts) writes the same tags into the raw HTML,
 *     which is all that link previewers and non-JavaScript crawlers ever see.
 *   · Each free-tool page sets its own canonical link and JSON-LD.
 *
 * Before this was shared, the server kept its own shorter list, so /features
 * arrived as "Features — DigitalCarda" and turned into "Features - DigitalCarda |
 * Everything You Need in One Digital Card" once JavaScript ran, and pages added
 * later (the free tools) never made it into the server's list at all.
 *
 * Keep this file free of imports: the server bundle pulls it in directly, and
 * the layout must not drag a lazily-loaded page into the main bundle.
 */

export type PageSeo = { title: string; description: string };

export const SEO_EMAIL_SIGNATURE: PageSeo = {
  title: "Free Email Signature Generator — 14 Templates | DigitalCarda",
  description:
    "Create a professional email signature free. Fill in your details, pick from 14 designs, and copy it straight into Gmail, Outlook or Apple Mail. No sign-up needed.",
};

export const SEO_FREE_TOOLS: PageSeo = {
  title: "Free Business Tools — Email Signature & WhatsApp Templates | DigitalCarda",
  description:
    "Free tools for small businesses: an email signature generator, WhatsApp Business message templates and an AI business card builder. No sign-up, nothing to install.",
};

export const SEO_WHATSAPP_TEMPLATES: PageSeo = {
  title: "Free WhatsApp Business Message Templates — 12 Ready Replies | DigitalCarda",
  description:
    "Free WhatsApp Business greeting, away and quick-reply templates. Fill in your details, edit the wording, and copy them into WhatsApp Business. No sign-up needed.",
};

export const DEFAULT_SEO: PageSeo = {
  title: "DigitalCarda - AI-Powered Digital Business Cards & Smart Microsites",
  description: "Create stunning digital business cards with QR codes, lead tracking, payment links, social media, products, videos, and AI-powered analytics. Start a 30-day free trial that requires no credit card details upfront.",
};

export const PUBLIC_SEO: Record<string, PageSeo> = {
  "/": DEFAULT_SEO,
  "/features": {
    title: "Features - DigitalCarda | Everything You Need in One Digital Card",
    description: "Explore 20+ powerful features including AI content generation, QR codes, lead tracking, payment links, analytics, custom domains, and more.",
  },
  "/digital-business-cards-templates": {
    title: "Card Templates - DigitalCarda | Browse Digital Business Card Designs",
    description: "Browse professionally-designed digital business card templates for every profession. Preview a live demo and start your 30-day free trial — no app, no printing, no credit card upfront.",
  },
  "/industries": {
    title: "Industries - DigitalCarda | Made for Every Business Type",
    description: "DigitalCarda serves digital agencies, doctors, real estate agents, lawyers, consultants, restaurants, salons, coaches, photographers, and more.",
  },
  "/pricing": {
    title: "Pricing - DigitalCarda | Simple Pricing for Every Business",
    description: "Start a 30-day free trial that requires no credit card details upfront. Plans from Rs. 99/month. Includes AI tools, QR codes, analytics, custom domains, and reseller options.",
  },
  "/ai-card-generator": {
    title: "AI Card Generator - DigitalCarda | Build Cards with AI",
    description: "Enter your business details and let DigitalCarda AI generate a professional digital card structure, content, CTA, SEO title, and design.",
  },
  "/bulk-cards": {
    title: "Bulk Digital Cards - DigitalCarda | Cards for Your Whole Team",
    description: "Create digital business cards in bulk for your staff, partners, or resellers. Volume pricing that gets cheaper the more you add, with consistent branding.",
  },
  "/resellers": {
    title: "Reseller Program - DigitalCarda | Start Your Own Card Business",
    description: "White-label digital card platform for agencies. Add customers, assign packages, manage leads, and earn commissions.",
  },
  "/refer-earn": {
    title: "Refer & Earn - DigitalCarda | Give 15%, Get 15% Cash",
    description: "Refer friends to DigitalCarda. They get 15% off their first paid plan, and you earn a flat 15% cash commission — paid to your wallet and withdrawable to bank or UPI.",
  },
  "/custom-domain": {
    title: "Custom Domain for Your Digital Business Card | DigitalCarda",
    description: "Put your digital business card on your own domain, like card.yourbrand.com. HTTPS included, you keep ownership, live in 24–48 hours. Rs. 499 one-time.",
  },
  "/contact": {
    title: "Contact - DigitalCarda | Get in Touch With Our Team",
    description: "Have questions about digital cards, reseller plans, custom domains, or enterprise setup? Contact our support team.",
  },
  "/login": {
    title: "Login - DigitalCarda | Customer, Reseller & Admin Portal",
    description: "Sign in to your DigitalCarda account. Access your dashboard, cards, analytics, leads, and reseller tools.",
  },
  "/signup": {
    title: "Sign Up - DigitalCarda | Create Your Free Digital Card",
    description: "Start a 30-day free trial that requires no credit card details upfront. Create beautiful digital business cards with AI-powered tools, QR codes, and lead tracking.",
  },
  "/privacy": {
    title: "Privacy Policy - DigitalCarda",
    description: "Read our privacy policy to understand how DigitalCarda collects, uses, and protects your personal information.",
  },
  "/refund-policy": {
    title: "Refund Policy - DigitalCarda",
    description: "Review our refund policy for subscription plans and digital card services.",
  },
  "/free-tools": SEO_FREE_TOOLS,
  "/email-signature-generator": SEO_EMAIL_SIGNATURE,
  "/email-signature-templates": SEO_EMAIL_SIGNATURE,
  "/whatsapp-message-templates": SEO_WHATSAPP_TEMPLATES,
  "/whatsapp-business-messages": SEO_WHATSAPP_TEMPLATES,
  "/terms-of-service": {
    title: "Terms & Conditions - DigitalCarda",
    description: "Read our terms of service to understand the rules and guidelines for using DigitalCarda.",
  },
};

/** SEO for a public path, or null when the path has none. Trailing slashes are
 *  ignored. Own-property lookup, so a path can never resolve to something on
 *  Object.prototype. */
export function seoForPath(pathname: string): PageSeo | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(PUBLIC_SEO, clean) ? PUBLIC_SEO[clean] : null;
}
