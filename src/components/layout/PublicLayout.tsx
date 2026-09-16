import { Link, useLocation, Outlet } from "react-router";
import { useEffect, useState } from "react";
import { Phone, Mail, Sparkles, MessageCircle, ArrowRight, FileCode2, Home as HomeIcon, LayoutGrid, Tag, Menu, LayoutDashboard } from "lucide-react";
import { getToken } from "@/lib/session";
import { haptic, useEdgeToEdge } from "@/lib/nativeApp";
import { DEFAULT_SEO, seoForPath, breadcrumbJsonLd } from "@/lib/publicSeo";
import { CONTACT, FOOTER_GROUPS, LEGAL_LINKS, SOCIAL_LINKS } from "@/lib/publicNav";
import SiteHeader from "@/components/layout/SiteHeader";
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

      {/* Footer. Link lists come from src/lib/publicNav.ts — the same source as
          the /sitemap page — so the two can never list different pages. */}
      <footer className="relative overflow-hidden bg-[#0B1120] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#F7B31C]/10 blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-28 lg:pb-10">

          {/* Closing call to action */}
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#1A2438] via-[#131C2E] to-[#0F172A] p-6 sm:p-10 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]">
                <Sparkles size={13} /> 30-day free trial · no payment needed
              </p>
              <p className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
                Your whole business, one link away.
              </p>
              <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-[#94A3B8]">
                Contact details, services, payments and enquiries on a digital business card people open instantly — no app to install.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link to={signupHref} className="btn-gold inline-flex h-12 items-center justify-center gap-2 px-6">
                Create my free card <ArrowRight size={16} />
              </Link>
              <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/5">
                <MessageCircle size={16} className="text-[#25D366]" /> Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Brand + link columns */}
          <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <Link to="/" className="inline-flex items-center" aria-label="DigitalCarda home">
                <img src="/logo.png" alt="DigitalCarda" className="h-10 w-auto object-contain" loading="lazy" />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#94A3B8]">
                DigitalCarda helps businesses across India create, share and track digital business cards — with AI writing, QR sharing, payments and lead capture built in.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li>
                  <a href={"mailto:" + CONTACT.email} className="inline-flex items-center gap-2.5 text-[#CBD5E1] transition-colors hover:text-[#F7B31C]">
                    <Mail size={15} className="text-[#64748B]" /> {CONTACT.email}
                  </a>
                </li>
                <li>
                  <a href={CONTACT.phoneHref} className="inline-flex items-center gap-2.5 text-[#CBD5E1] transition-colors hover:text-[#F7B31C]">
                    <Phone size={15} className="text-[#64748B]" /> {CONTACT.phone}
                  </a>
                </li>
                <li>
                  <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5 text-[#CBD5E1] transition-colors hover:text-[#F7B31C]">
                    <MessageCircle size={15} className="text-[#64748B]" /> WhatsApp us
                  </a>
                </li>
              </ul>
              {SOCIAL_LINKS.length > 0 && (
                <div className="mt-6 flex items-center gap-2.5">
                  {SOCIAL_LINKS.map((s) => (
                    <a key={s.href} href={s.href} target="_blank" rel="noreferrer me" aria-label={"DigitalCarda on " + s.label}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/10">
                      <img src={s.icon} alt="" width={20} height={20} className="h-5 w-5" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
              {FOOTER_GROUPS.map((g) => (
                <nav key={g.title} aria-label={g.title}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">{g.title}</p>
                  <ul className="mt-4 space-y-2.5">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link to={l.href} className="text-sm text-[#CBD5E1] transition-colors hover:text-white">{l.label}</Link>
                        {l.badge && (
                          <span className="ml-2 rounded bg-[#F7B31C]/15 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-[#F7B31C]">{l.badge}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-col-reverse justify-between gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center">
            <p className="text-xs text-[#64748B]">© {new Date().getFullYear()} DigitalCarda. All rights reserved. · Made in India</p>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {LEGAL_LINKS.map((l) => (
                <Link key={l.href} to={l.href} className="text-[#94A3B8] transition-colors hover:text-white">{l.label}</Link>
              ))}
              <Link to="/sitemap" className="text-[#94A3B8] transition-colors hover:text-white">Sitemap</Link>
              <a href="/sitemap.xml" className="inline-flex items-center gap-1.5 text-[#94A3B8] transition-colors hover:text-white">
                <FileCode2 size={13} /> sitemap.xml
              </a>
            </nav>
          </div>
        </div>
      </footer>

      <PublicTabBar signupHref={signupHref} />

      <AnnouncementPopup audience="public" />
    </div>
  );
}

/* Phones and tablets: an app-style tab bar. The raised centre button starts the
   free trial — or, for someone already signed in, goes back to their dashboard. */
function PublicTabBar({ signupHref }: { signupHref: string }) {
  const { pathname } = useLocation();
  // Read after mount: the server renders the signed-out bar, so hydration matches.
  const [home, setHome] = useState<string | null>(null);
  useEffect(() => {
    setHome(getToken("main") ? "/dashboard" : getToken("admin") ? "/admin" : null);
  }, []);

  const designs = ["/digital-business-cards-templates", "/templates", "/card-designs", "/digital-business-cards", "/demo", "/industries"]
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const tab = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 pt-1 text-[10.5px] leading-none active:opacity-70 ${active ? "font-bold text-[#F7B31C]" : "font-medium text-[#94A3B8]"}`;

  return (
    <nav aria-label="Quick navigation" className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0B1120]/[0.96] backdrop-blur-xl">
      <div className="mx-auto flex h-[62px] max-w-lg items-stretch px-1">
        <Link to="/" onClick={() => haptic()} className={tab(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
          <HomeIcon size={21} strokeWidth={pathname === "/" ? 2.4 : 1.9} /> Home
        </Link>
        <Link to="/digital-business-cards-templates" onClick={() => haptic()} className={tab(designs)} aria-current={designs ? "page" : undefined}>
          <LayoutGrid size={21} strokeWidth={designs ? 2.4 : 1.9} /> Designs
        </Link>
        <div className="flex flex-1 justify-center">
          <Link to={home ?? signupHref} onClick={() => haptic()}
            className="-mt-5 flex flex-col items-center gap-1 text-[10.5px] font-bold leading-none text-white active:scale-95 transition-transform">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-[#0B1120] shadow-[0_10px_24px_-8px_rgba(247,179,28,0.8)] ring-4 ring-[#0B1120]">
              {home ? <LayoutDashboard size={22} /> : <Sparkles size={22} />}
            </span>
            {home ? "Dashboard" : "Start free"}
          </Link>
        </div>
        <Link to="/pricing" onClick={() => haptic()} className={tab(pathname.startsWith("/pricing"))} aria-current={pathname.startsWith("/pricing") ? "page" : undefined}>
          <Tag size={21} strokeWidth={pathname.startsWith("/pricing") ? 2.4 : 1.9} /> Pricing
        </Link>
        <button type="button" onClick={() => { haptic(); window.dispatchEvent(new Event("dc:open-site-menu")); }} className={tab(false)}>
          <Menu size={21} strokeWidth={1.9} /> Menu
        </button>
      </div>
      <div className="h-safe-bottom" />
    </nav>
  );
}
