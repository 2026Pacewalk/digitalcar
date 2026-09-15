import { Link, useLocation, Outlet } from "react-router";
import { useEffect } from "react";
import { Phone, Mail, Sparkles, MessageCircle, ArrowRight, FileCode2 } from "lucide-react";
import { DEFAULT_SEO, seoForPath, breadcrumbJsonLd } from "@/lib/publicSeo";
import { CONTACT, FOOTER_GROUPS, LEGAL_LINKS, SOCIAL_LINKS } from "@/lib/publicNav";
import SiteHeader from "@/components/layout/SiteHeader";
import AnnouncementPopup from "@/components/AnnouncementPopup";

export default function PublicLayout() {
  const location = useLocation();

  const seo = seoForPath(location.pathname) || DEFAULT_SEO;

  // On a product page, carry the product into signup so the trial starts on that
  // exact card (e.g. /signup?product=ocean-blue-card); otherwise plain /signup.
  const productMatch = location.pathname.match(/^\/digital-business-cards-templates\/([^/]+)\/?$/);
  const signupHref = productMatch ? `/signup?product=${encodeURIComponent(decodeURIComponent(productMatch[1]))}` : "/signup";

  useEffect(() => {
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seo.description);
    else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = seo.description;
      document.head.appendChild(meta);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", seo.title);
    else {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      meta.content = seo.title;
      document.head.appendChild(meta);
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", seo.description);
    else {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      meta.content = seo.description;
      document.head.appendChild(meta);
    }
    // Canonical: one indexable URL per route. Without it, the same page reached
    // with a tracking query string or a trailing slash reads to Google as a
    // duplicate and splits its ranking signals.
    const path = location.pathname === "/" ? "/" : location.pathname.replace(/\/+$/, "");
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    // An alias URL (e.g. /card-designs) points at the page it duplicates.
    canon.href = `https://digitalcarda.in${seo.canonicalPath ?? path}`;

    window.scrollTo(0, 0);
  }, [location.pathname, seo]);

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

  /* Site-wide structured data — who we are, the site itself (so Google can
     offer a sitelinks search box), and the product with its real pricing.

     Deliberately NO AggregateRating: review markup must reflect genuinely
     collected, verifiable ratings, and inventing it risks a manual action.
     Add it only once real reviews are being captured. */
  useEffect(() => {
    const ld = {
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
          publisher: { "@id": "https://digitalcarda.in/#organization" },
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: "https://digitalcarda.in/digital-business-cards-templates?q={search_term_string}" },
            "query-input": "required name=search_term_string",
          },
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
            description: "Plans from Rs. 99/month, with a 30-day free trial that needs no card details upfront.",
            url: "https://digitalcarda.in/pricing",
          },
        },
      ],
    };
    let s = document.getElementById("dc-site-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-site-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
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
                <Sparkles size={13} /> 30-day free trial · no card details
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

      {/* Sticky mobile CTA bar — native-app style persistent action */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] px-4 pt-3 pb-safe shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.15)]">
        <div className="flex items-center gap-2.5 pb-3">
          <a href="https://wa.me/919517722444?text=Hi%20DigitalCarda" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="w-12 h-12 shrink-0 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center active:scale-95 transition-transform">
            <MessageCircle size={20} />
          </a>
          <Link to={signupHref} className="btn-gold flex-1 h-12 flex items-center justify-center gap-2 text-base">
            Start 30-Day Free Trial <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <AnnouncementPopup audience="public" />
    </div>
  );
}
