import { useLocation, Outlet } from "react-router";
import { useEffect } from "react";
import { useEdgeToEdge } from "@/lib/nativeApp";
import { DEFAULT_SEO, seoForPath, breadcrumbJsonLd } from "@/lib/publicSeo";
import { SOCIAL_LINKS } from "@/lib/publicNav";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import PublicTabBar from "@/components/layout/PublicTabBar";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import JsonLd from "@/components/seo/JsonLd";
import type { PageSeo } from "@/lib/publicSeo";

/* Site-wide structured data — who we are, the site itself, and the product with
   its real pricing. Rendered in the page (so it is in the server HTML crawlers
   read), once, on every public page.

   Deliberately NO AggregateRating: review markup must reflect genuinely
   collected, verifiable ratings, and inventing it risks a manual action.
   Add it only once real reviews are being captured. */
const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://digitalcarda.in/#organization",
      name: "DigitalCarda",
      url: "https://digitalcarda.in/",
      logo: "https://digitalcarda.in/apple-touch-icon.png",
      // Profiles that are verifiably ours. Ties the brand entity together for
      // Google and AI answer engines; add each new official profile here.
      sameAs: SOCIAL_LINKS.map((s) => s.href),
      description: "DigitalCarda builds AI-powered digital business cards and smart microsites for businesses and professionals across India.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-95177-22444",
        email: "hello@digitalcarda.in",
        contactType: "customer support",
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://digitalcarda.in/#website",
      url: "https://digitalcarda.in/",
      name: "DigitalCarda",
      inLanguage: "en-IN",
      publisher: { "@id": "https://digitalcarda.in/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://digitalcarda.in/#app",
      name: "DigitalCarda",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      url: "https://digitalcarda.in/",
      publisher: { "@id": "https://digitalcarda.in/#organization" },
      description: "Create a digital business card with QR code, WhatsApp chat, payment links, products, gallery, lead capture and analytics — no app to install.",
      offers: {
        "@type": "Offer",
        price: "99",
        priceCurrency: "INR",
        description: "Plans from Rs. 99/month, with a 30-day free trial that needs no payment.",
        url: "https://digitalcarda.in/pricing",
      },
    },
  ],
};

/** Title, description and Open Graph text for a page the SEO table knows. */
function applyPageSeo(seo: PageSeo) {
  document.title = seo.title;
  const set = (selector: string, make: () => HTMLMetaElement, content: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) { el = make(); document.head.appendChild(el); }
    el.setAttribute("content", content);
  };
  const byName = (name: string) => () => { const m = document.createElement("meta"); m.name = name; return m; };
  const byProp = (prop: string) => () => { const m = document.createElement("meta"); m.setAttribute("property", prop); return m; };
  set('meta[name="description"]', byName("description"), seo.description);
  set('meta[property="og:title"]', byProp("og:title"), seo.title);
  set('meta[property="og:description"]', byProp("og:description"), seo.description);
}

/** The promo code behind the ₹0 30-day trial — applied for the visitor. */
const TRIAL_PROMO = "FREE30D";

export default function PublicLayout() {
  const location = useLocation();
  useEdgeToEdge();

  /* Pages this table doesn't know (product pages, blog articles) set their own
     title and description, and the server has already written theirs into the
     HTML. Overwriting them with the home page's defaults here made every such
     page read, after JavaScript ran, like a copy of the home page. */
  const known = seoForPath(location.pathname);
  const seo = known || DEFAULT_SEO;

  /* Every signup link carries the free-trial promo code (FREE30D), so nobody has
     to find or type it, and on a product page it also carries the product so the
     trial starts on that exact card (e.g. /signup?promo=FREE30D&product=ocean-blue-card). */
  const productMatch = location.pathname.match(/^\/digital-business-cards-templates\/([^/]+)\/?$/);
  const signupHref = productMatch
    ? `/signup?promo=${TRIAL_PROMO}&product=${encodeURIComponent(decodeURIComponent(productMatch[1]))}`
    : `/signup?promo=${TRIAL_PROMO}`;

  useEffect(() => {
    if (known) applyPageSeo(seo);
    // Canonical: one indexable URL per route. Without it, the same page reached
    // with a tracking query string or a trailing slash reads to Google as a
    // duplicate and splits its ranking signals.
    const path = location.pathname === "/" ? "/" : location.pathname.replace(/\/+$/, "");
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    // An alias URL (e.g. /card-designs) points at the page it duplicates.
    canon.href = `https://digitalcarda.in${seo.canonicalPath ?? path}`;

    window.scrollTo(0, 0);
  }, [location.pathname, seo, known]);

  /* BreadcrumbList for the current page — the same trail the server writes into
     the raw HTML (api/lib/card-og.ts, same element id), kept in step as people
     move around the site. Product pages publish their own trail with the
     product name in it, so the element is removed there. */
  useEffect(() => {
    const ld = breadcrumbJsonLd(location.pathname);
    let s = document.getElementById("dc-breadcrumb-ld");
    if (!ld) { s?.remove(); return; }
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-breadcrumb-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = ld;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <JsonLd id="dc-site-ld" data={SITE_LD} />
      <SiteHeader signupHref={signupHref} />

      <main><Outlet /></main>

      <SiteFooter signupHref={signupHref} />

      <PublicTabBar signupHref={signupHref} />

      <AnnouncementPopup audience="public" />
    </div>
  );
}
