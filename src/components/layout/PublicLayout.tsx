import { Link, useLocation, Outlet } from "react-router";
import { useState, useEffect } from "react";
import {
  Menu, X, CreditCard, ChevronRight, Phone, Mail,
  Twitter, Linkedin, Instagram, Facebook,
  Sparkles, LayoutGrid, Tag, Wand2, Users, MessageCircle, LogIn, ArrowRight, Headphones, Layers, Gift,
  PenLine, FileCode2,
} from "lucide-react";
import { DEFAULT_SEO, seoForPath, breadcrumbJsonLd } from "@/lib/publicSeo";
import { CONTACT, FOOTER_GROUPS, LEGAL_LINKS, SOCIAL_LINKS } from "@/lib/publicNav";

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: "Templates", href: "/templates", icon: LayoutGrid },
    { label: "Features", href: "/features", icon: Sparkles },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "Bulk Cards", href: "/bulk-cards", icon: Layers },
    { label: "AI Generator", href: "/ai-card-generator", icon: Wand2 },
    { label: "Free Tools", href: "/free-tools", icon: PenLine },
    { label: "Resellers", href: "/resellers", icon: Users },
    { label: "Refer & Earn", href: "/refer-earn", icon: Gift },
    { label: "Contact", href: "/contact", icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled ? "bg-[#0F172A]/95 backdrop-blur-xl shadow-lg border-white/10" : "bg-[#0F172A] border-white/5"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center shrink-0" aria-label="DigitalCarda home">
              {logoOk ? (
                <img
                  src="/logo.png"
                  alt="DigitalCarda"
                  className="h-10 w-auto object-contain"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <span className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
                    <CreditCard size={18} className="text-[#0F172A]" />
                  </span>
                  <span className="text-xl font-bold text-white">
                    Digital<span className="text-gradient-gold">Carda</span>
                  </span>
                </span>
              )}
            </Link>

            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? "text-[#F7B31C] bg-[#F7B31C]/10"
                      : "text-[#CBD5E1] hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-[#CBD5E1] hover:text-white transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/signup" className="btn-gold flex items-center gap-1.5">
                Get Started <ChevronRight size={14} />
              </Link>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — kept OUTSIDE <nav> on purpose: the nav gets a
          backdrop-blur (backdrop-filter) once scrolled, which would otherwise
          become the containing block for these position:fixed overlays and
          collapse the drawer into the 64px header on any scrolled page. */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] ${mobileOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!mobileOpen}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          />

          {/* Panel */}
          <div
            className={`absolute top-0 right-0 h-full w-[86%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
            style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#F1F5F9] shrink-0">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center" aria-label="DigitalCarda home">
                {logoOk ? (
                  <span className="inline-flex items-center rounded-xl bg-[#0F172A] px-3 py-1.5">
                    <img src="/logo.png" alt="DigitalCarda" className="h-6 w-auto object-contain" onError={() => setLogoOk(false)} />
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center"><CreditCard size={18} className="text-[#0F172A]" /></span>
                    <span className="text-lg font-bold text-[#0F172A]">Digital<span className="text-gradient-gold">Carda</span></span>
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] transition-colors active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
              {/* Trial banner */}
              <Link to="/signup" onClick={() => setMobileOpen(false)} className="block rounded-2xl p-[1.5px] bg-gradient-to-r from-[#F7B31C] to-[#14B8A6] mb-5 shadow-premium">
                <div className="rounded-[15px] bg-white px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Sparkles size={17} className="text-[#F7B31C]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0F172A]">30 Days Free Cardless Trial</p>
                    <p className="text-[11px] text-[#64748B]">No credit card details required</p>
                  </div>
                  <ArrowRight size={16} className="text-[#F7B31C] shrink-0" />
                </div>
              </Link>

              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest px-2 mb-1.5">Menu</p>
              <nav className={mobileOpen ? "stagger-children" : ""}>
                {navLinks.map((link) => {
                  const active = location.pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all active:scale-[0.98] ${active ? "bg-[#FEF3C7]/60" : "hover:bg-[#F8FAFC]"}`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? "gradient-gold" : "bg-[#F1F5F9]"}`}>
                        <link.icon size={17} className={active ? "text-[#0F172A]" : "text-[#64748B]"} />
                      </span>
                      <span className={`text-sm font-semibold flex-1 ${active ? "text-[#0F172A]" : "text-[#334155]"}`}>{link.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C]" />}
                      <ChevronRight size={16} className="text-[#CBD5E1]" />
                    </Link>
                  );
                })}
              </nav>

              {/* Quick contact */}
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest px-2 mt-5 mb-2">Quick contact</p>
              <div className="grid grid-cols-2 gap-2.5">
                <a href="tel:+919517722444" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-sm font-semibold hover:bg-[#E2E8F0] transition-colors active:scale-[0.98]">
                  <Phone size={15} className="text-[#F7B31C]" /> Call Us
                </a>
                <a href="https://wa.me/919517722444" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#DCFCE7] text-[#166534] text-sm font-semibold hover:bg-[#BBF7D0] transition-colors active:scale-[0.98]">
                  <MessageCircle size={15} /> WhatsApp
                </a>
              </div>
            </div>

            {/* Footer / CTA */}
            <div className="shrink-0 border-t border-[#F1F5F9] px-4 py-4 space-y-3 pb-safe">
              <div className="grid grid-cols-2 gap-2.5">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors active:scale-[0.98]">
                  <LogIn size={15} /> Sign In
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]">
                  Get Started <ChevronRight size={15} />
                </Link>
              </div>
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[11px] text-[#94A3B8] flex items-center gap-1.5"><Headphones size={13} /> hello@digitalcarda.in</span>
                <div className="flex items-center gap-1.5">
                  {[Twitter, Instagram, Facebook, Linkedin].map((Ic, i) => (
                    <span key={i} className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#F7B31C] hover:bg-[#FEF3C7] transition-colors cursor-pointer"><Ic size={13} /></span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

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
            30 Days Free Cardless Trial <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
