import { Link, useLocation, Outlet } from "react-router";
import { useState, useEffect } from "react";
import {
  Menu, X, CreditCard, ChevronRight, Phone, Mail,
  Twitter, Linkedin, Instagram, Facebook,
  Sparkles, LayoutGrid, Tag, Wand2, Users, MessageCircle, LogIn, ArrowRight, Headphones,
} from "lucide-react";

const defaultSEO = {
  title: "DigitalCarda - AI-Powered Digital Business Cards & Smart Microsites",
  description: "Create stunning digital business cards with QR codes, lead tracking, payment links, social media, products, videos, and AI-powered analytics. Start your free 7-day trial.",
};

const seoMap: Record<string, { title: string; description: string }> = {
  "/": defaultSEO,
  "/features": {
    title: "Features - DigitalCarda | Everything You Need in One Digital Card",
    description: "Explore 20+ powerful features including AI content generation, QR codes, lead tracking, payment links, analytics, custom domains, and more.",
  },
  "/templates": {
    title: "Templates - DigitalCarda | Beautiful Ready-to-Use Card Designs",
    description: "Choose from professional card templates for corporate, freelancer, doctor, real estate, restaurant, salon, and more industries.",
  },
  "/sample-cards": {
    title: "Sample Cards - DigitalCarda | Explore Digital Card Examples",
    description: "View ready-made digital card examples for agencies, doctors, real estate, restaurants, freelancers, retail stores, and more.",
  },
  "/industries": {
    title: "Industries - DigitalCarda | Made for Every Business Type",
    description: "DigitalCarda serves digital agencies, doctors, real estate agents, lawyers, consultants, restaurants, salons, coaches, photographers, and more.",
  },
  "/pricing": {
    title: "Pricing - DigitalCarda | Simple Pricing for Every Business",
    description: "Start with a free 7-day trial. Plans from Rs. 1499/year. Includes AI tools, QR codes, analytics, custom domains, and reseller options.",
  },
  "/ai-card-generator": {
    title: "AI Card Generator - DigitalCarda | Build Cards with AI",
    description: "Enter your business details and let DigitalCarda AI generate a professional digital card structure, content, CTA, SEO title, and design.",
  },
  "/resellers": {
    title: "Reseller Program - DigitalCarda | Start Your Own Card Business",
    description: "White-label digital card platform for agencies. Add customers, assign packages, manage leads, and earn commissions.",
  },
  "/custom-domain": {
    title: "Custom Domain - DigitalCarda | Use Your Own Domain",
    description: "Connect your own domain or subdomain with your digital business card for stronger branding and customer trust.",
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
    description: "Start your 7-day free trial. Create beautiful digital business cards with AI-powered tools, QR codes, and lead tracking.",
  },
  "/privacy": {
    title: "Privacy Policy - DigitalCarda",
    description: "Read our privacy policy to understand how DigitalCarda collects, uses, and protects your personal information.",
  },
  "/refund-policy": {
    title: "Refund Policy - DigitalCarda",
    description: "Review our refund policy for subscription plans and digital card services.",
  },
  "/terms-of-service": {
    title: "Terms & Conditions - DigitalCarda",
    description: "Read our terms of service to understand the rules and guidelines for using DigitalCarda.",
  },
};

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const location = useLocation();

  const seo = seoMap[location.pathname] || defaultSEO;

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
    window.scrollTo(0, 0);
  }, [location.pathname, seo]);

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
    { label: "Features", href: "/features", icon: Sparkles },
    { label: "Templates", href: "/templates", icon: LayoutGrid },
    { label: "Sample Cards", href: "/sample-cards", icon: CreditCard },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "AI Generator", href: "/ai-card-generator", icon: Wand2 },
    { label: "Resellers", href: "/resellers", icon: Users },
    { label: "Contact", href: "/contact", icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-xl shadow-premium" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center shrink-0" aria-label="DigitalCarda home">
              {logoOk ? (
                <span className="inline-flex items-center rounded-xl bg-[#0F172A] px-3 py-1.5 shadow-premium ring-1 ring-white/5">
                  <img
                    src="/logo.png"
                    alt="DigitalCarda"
                    className="h-7 w-auto object-contain"
                    onError={() => setLogoOk(false)}
                  />
                </span>
              ) : (
                <span className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
                    <CreditCard size={18} className="text-[#0F172A]" />
                  </span>
                  <span className="text-xl font-bold text-[#0F172A]">
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
                      ? "text-[#F7B31C] bg-[#FEF3C7]/50"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/signup" className="btn-gold flex items-center gap-1.5">
                Get Started <ChevronRight size={14} />
              </Link>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
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
                    <p className="text-sm font-bold text-[#0F172A]">Start Free 7-Day Trial</p>
                    <p className="text-[11px] text-[#64748B]">No card required · Cancel anytime</p>
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
                <a href="tel:+919876543210" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-sm font-semibold hover:bg-[#E2E8F0] transition-colors active:scale-[0.98]">
                  <Phone size={15} className="text-[#F7B31C]" /> Call Us
                </a>
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#DCFCE7] text-[#166534] text-sm font-semibold hover:bg-[#BBF7D0] transition-colors active:scale-[0.98]">
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
                <span className="text-[11px] text-[#94A3B8] flex items-center gap-1.5"><Headphones size={13} /> support@digitalcarda.in</span>
                <div className="flex items-center gap-1.5">
                  {[Twitter, Instagram, Facebook, Linkedin].map((Ic, i) => (
                    <span key={i} className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#F7B31C] hover:bg-[#FEF3C7] transition-colors cursor-pointer"><Ic size={13} /></span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main><Outlet /></main>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Company */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">Company</h4>
              <div className="space-y-2.5">
                <Link to="/" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">About DigitalCarda</Link>
                <Link to="/features" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Features</Link>
                <Link to="/templates" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Templates</Link>
                <Link to="/pricing" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Pricing</Link>
                <Link to="/contact" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Contact</Link>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">Product</h4>
              <div className="space-y-2.5">
                <Link to="/features" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Digital Business Card</Link>
                <Link to="/ai-card-generator" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">AI Card Builder</Link>
                <Link to="/features" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">QR Code Card</Link>
                <Link to="/custom-domain" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Custom Domain</Link>
                <Link to="/features" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Analytics</Link>
              </div>
            </div>

            {/* For Business */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">For Business</h4>
              <div className="space-y-2.5">
                <Link to="/resellers" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Reseller Program</Link>
                <Link to="/industries" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Agencies</Link>
                <Link to="/industries" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Freelancers</Link>
                <Link to="/industries" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Local Businesses</Link>
                <Link to="/contact" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Enterprise</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-white">Legal</h4>
              <div className="space-y-2.5">
                <Link to="/privacy" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Privacy Policy</Link>
                <Link to="/refund-policy" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Refund Policy</Link>
                <Link to="/terms-of-service" className="block text-sm text-[#94A3B8] hover:text-[#F7B31C] transition-colors">Terms &amp; Conditions</Link>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                  <Mail size={14} className="text-[#64748B]" /> support@digitalcarda.com
                </div>
                <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                  <Phone size={14} className="text-[#64748B]" /> +91 98765 43210
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1E293B] mt-12 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                  <CreditCard size={16} className="text-[#0F172A]" />
                </div>
                <span className="text-lg font-bold text-white">DigitalCarda</span>
              </div>
              <p className="text-sm text-[#64748B] text-center">
                DigitalCarda is a smart digital business card platform that helps businesses create, share, and track professional digital cards with AI-powered tools.
              </p>
              <div className="flex items-center gap-4">
                {[Twitter, Linkedin, Instagram, Facebook].map((Icon, i) => (
                  <span key={i} className="w-9 h-9 rounded-lg bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-[#F7B31C] hover:bg-[#1E293B]/80 transition-all cursor-pointer">
                    <Icon size={16} />
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#64748B] text-center mt-6"> 2026 DigitalCarda. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
