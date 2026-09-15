/* The public site's link map — ONE list for the footer and the /sitemap page.
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

export type NavLink = { label: string; href: string; badge?: string };
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
    { label: "Card designs", href: "/templates" },
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

/** Everything, for /sitemap: the footer groups plus home and the legal pages. */
export const SITEMAP_GROUPS: NavGroup[] = [
  { title: "Start here", links: [{ label: "Home", href: "/" }, ...COMPANY.links.filter((l) => l.href !== "/sitemap")] },
  PRODUCT,
  FREE_TOOLS,
  BUSINESS,
  { title: "Legal", links: LEGAL_LINKS },
];
