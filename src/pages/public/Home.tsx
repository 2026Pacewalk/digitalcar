import { Link } from "react-router";
import {
  CreditCard, QrCode, MessageCircle, Download, FileDown, FileText,
  ShoppingBag, Image, Play, Wallet, MapPin, Star, Sparkles, Phone, Mail,
  Check, ArrowRight, Zap, Users, Eye, MousePointer,
  Share2, Layers, Shield, Clock, TrendingUp,
  ChevronRight, ChevronLeft, Monitor, Smartphone, Globe, BarChart3,
  Link2, Leaf, Quote, ScanLine, Gift, Building2, Plus,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import TemplateThumb, { THUMB_W, THUMB_H } from "@/components/TemplateThumb";
import { STANDEE_STYLES, standeeMarkup } from "@/lib/standee";

/* ─────────────────────────────────────────────────────────────
   Scroll-reveal primitives
   ───────────────────────────────────────────────────────────── */
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    // Safety net: never leave content permanently hidden if the observer
    // is slow/blocked (background tab, non-painting renderer, etc.).
    const fallback = window.setTimeout(() => setVisible(true), 900);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            window.clearTimeout(fallback);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return { ref, visible };
}

function Reveal({
  children,
  stagger,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  stagger?: boolean;
  className?: string;
  as?: "div" | "section";
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const base = stagger ? "reveal-stagger" : "reveal";
  return (
    <Tag ref={ref as never} className={`${base} ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/* ─── Animated number counter (rAF, fires when in view) ─── */
function Counter({ end, duration = 2000, separator = true }: { end: number; duration?: number; separator?: boolean }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setVal(end); return; }
    let raf = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, end, duration]);

  return <span ref={ref}>{separator ? val.toLocaleString("en-US") : String(val)}</span>;
}

/* ─── Shared heading ─── */
function SectionHeading({ eyebrow, title, subtitle, light }: { eyebrow?: string; title: ReactNode; subtitle?: string; light?: boolean }) {
  return (
    <Reveal className="text-center max-w-3xl mx-auto mb-12">
      {eyebrow && (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${light ? "bg-white/10 text-[#F7B31C] ring-1 ring-white/10" : "bg-[#FEF3C7] text-[#92400E]"}`}>
          <Sparkles size={12} /> {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl sm:text-4xl lg:text-[2.7rem] font-extrabold tracking-tight ${light ? "text-white" : "text-[#0F172A]"}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-base leading-relaxed ${light ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{subtitle}</p>}
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────
   Card slider (hero visual)
   ───────────────────────────────────────────────────────────── */
const SLIDER_CARDS = [
  { id: 1, name: "SHEKHAR JAIN", title: "DIRECTOR", company: "PACEWALK", phone: "+91 99881 44844", website: "pacewalk.com", email: "md@pacewalk.com", address: "SCO-209, Green Lotus Avenue, Zirakpur, Punjab", views: 5173 },
  { id: 2, name: "DR. PRIYA PATEL", title: "CARDIOLOGIST", company: "HEART CARE", phone: "+91 98250 33445", website: "heartcare.in", email: "dr.priya@heartcare.in", address: "Apollo Hospital, Jubilee Hills, Hyderabad", views: 3421 },
  { id: 3, name: "RAJ SHARMA", title: "CEO", company: "PIXELCRAFT", phone: "+91 99881 44844", website: "pixelcraft.in", email: "raj@pixelcraft.in", address: "Sector 17, Chandigarh", views: 2890 },
  { id: 4, name: "VIKRAM MEHTA", title: "FOUNDER", company: "STYLEHUB", phone: "+91 98111 22333", website: "stylehub.com", email: "vikram@stylehub.com", address: "Bandra West, Mumbai", views: 4156 },
  { id: 5, name: "CHEF SANJAY", title: "HEAD CHEF", company: "SPICE GARDEN", phone: "+91 98123 44556", website: "spicegarden.com", email: "sanjay@spicegarden.com", address: "Connaught Place, New Delhi", views: 1987 },
  { id: 6, name: "DR. ANJALI RAO", title: "CONSULTANT", company: "STRATEGY FIRST", phone: "+91 98450 66778", website: "strategyfirst.com", email: "anjali@strategyfirst.com", address: "MG Road, Bangalore", views: 2754 },
];

function CardContactSlider() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => setCurrent((p) => (p + 1) % SLIDER_CARDS.length), []);
  const prevSlide = useCallback(() => setCurrent((p) => (p - 1 + SLIDER_CARDS.length) % SLIDER_CARDS.length), []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide]);

  const total = SLIDER_CARDS.length + 1; // slide 0 = product mockup image, rest = live cards
  const isImage = current === 0;
  const card = SLIDER_CARDS[Math.max(0, current - 1)];

  return (
    <div className="relative flex flex-col items-center" onMouseEnter={() => setIsAutoPlaying(false)} onMouseLeave={() => setIsAutoPlaying(true)}>
      <div className="relative flex justify-center w-full">
      {/* Glow behind the phone */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[440px] rounded-[48px] bg-gradient-to-b from-[#F7B31C]/25 via-[#F7B31C]/5 to-transparent blur-2xl" />
      </div>

      {isImage ? (
        <div className="relative w-[340px] min-h-[470px] flex items-center justify-center">
          <picture>
            <source srcSet="/hero/digital-business-card-app-mockup.webp" type="image/webp" />
            <img
              src="/hero/digital-business-card-app-mockup.png"
              width="1000" height="1403"
              alt="Two smartphones showing DigitalCarda digital business cards — a marketing consultant and an event & wedding planner profile with call, WhatsApp, email and QR sharing"
              loading="eager"
              className="w-[300px] sm:w-[330px] h-auto drop-shadow-2xl"
            />
          </picture>
        </div>
      ) : (
      <div className="relative w-[340px] bg-white rounded-[28px] shadow-premium-lg overflow-hidden border border-[#F1F5F9] ring-1 ring-black/5">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#F7B31C]">
          <div className="flex items-center gap-1.5">
            <Eye size={12} className="text-white" />
            <span className="text-[10px] font-semibold text-white tabular-nums">{card.views.toLocaleString()}</span>
          </div>
          <button className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center" aria-label="Share card">
            <Share2 size={12} className="text-white" />
          </button>
        </div>

        {/* Name banner */}
        <div className="relative mx-5 mt-3">
          <div className="bg-[#F7B31C] py-3 px-6 text-center relative" style={{ clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)" }}>
            <p className="text-sm font-bold text-white tracking-wide">{card.name}</p>
            <p className="text-[10px] text-white/80 font-medium mt-0.5">{card.title}</p>
          </div>
        </div>

        <p className="text-center text-[9px] text-[#94A3B8] mt-2 tracking-wider uppercase font-medium">{card.company}</p>

        {/* Contact rows */}
        <div className="mx-5 mt-2 rounded-xl overflow-hidden bg-[#374151]">
          {[
            { icon: Phone, text: card.phone },
            { icon: Globe, text: card.website },
            { icon: Mail, text: card.email },
            { icon: MapPin, text: card.address },
          ].map((row, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < 3 ? "border-b border-white/10" : ""}`}>
              <div className="w-8 h-8 rounded-lg bg-[#F7B31C] flex items-center justify-center shrink-0">
                <row.icon size={14} className="text-white" />
              </div>
              <span className="text-[10px] text-white/90 font-medium truncate">{row.text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mx-5 mt-3 grid grid-cols-2 gap-0 rounded-xl overflow-hidden mb-5">
          <button className="flex items-center justify-center gap-2 py-3 bg-[#F7B31C] hover:bg-[#D97706] transition-colors">
            <Phone size={14} className="text-white" />
            <span className="text-xs font-semibold text-white">CALL</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3 bg-[#F7B31C] hover:bg-[#D97706] transition-colors border-l border-white/20">
            <MessageCircle size={14} className="text-white" />
            <span className="text-xs font-semibold text-white">WHATSAPP</span>
          </button>
        </div>

        <div className="absolute bottom-4 right-4 bg-[#0F172A] rounded-full px-3 py-1.5 shadow-lg">
          <span className="text-[9px] font-bold text-white">Save Contact</span>
        </div>
      </div>
      )}

      {/* Floating chips */}
      <div className="hidden sm:flex absolute -left-4 top-16 items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-premium-lg border border-[#F1F5F9] animate-float">
        <div className="w-8 h-8 rounded-lg bg-[#CCFBF1] flex items-center justify-center"><QrCode size={15} className="text-[#0D9488]" /></div>
        <div>
          <p className="text-[10px] font-bold text-[#0F172A] leading-none">QR Scans</p>
          <p className="text-[9px] text-[#94A3B8] mt-0.5">+128 today</p>
        </div>
      </div>
      <div className="hidden sm:flex absolute -right-5 bottom-24 items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-premium-lg border border-[#F1F5F9] animate-float" style={{ animationDelay: "1.2s" }}>
        <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><TrendingUp size={15} className="text-[#2563EB]" /></div>
        <div>
          <p className="text-[10px] font-bold text-[#0F172A] leading-none">New Lead</p>
          <p className="text-[9px] text-[#94A3B8] mt-0.5">Just now</p>
        </div>
      </div>

      {/* Arrows */}
      <button onClick={prevSlide} aria-label="Previous card" className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-premium border border-[#F1F5F9] flex items-center justify-center hover:bg-[#F8FAFC] transition-colors text-[#64748B] hover:text-[#F7B31C]">
        <ChevronLeft size={18} />
      </button>
      <button onClick={nextSlide} aria-label="Next card" className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-premium border border-[#F1F5F9] flex items-center justify-center hover:bg-[#F8FAFC] transition-colors text-[#64748B] hover:text-[#F7B31C]">
        <ChevronRight size={18} />
      </button>
      </div>

      {/* Dots — one per slide (mockup image + live cards) */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} aria-label={`Show slide ${i + 1}`} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-[#F7B31C]" : "w-1.5 bg-[#E2E8F0] hover:bg-[#CBD5E1]"}`} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────── */
const AVATARS = ["#F7B31C", "#14B8A6", "#8B5CF6", "#3B82F6", "#EC4899"];

function HeroSection() {
  const highlights = ["No coding required", "Share on WhatsApp instantly", "Track leads & clicks", "AI-powered content tools"];

  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
      <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#14B8A6]/12 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left */}
          <Reveal stagger>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C] animate-pulse" /> AI-Powered Digital Cards · New
            </span>
            <h1 className="mt-6 text-[2.6rem] sm:text-5xl lg:text-[3.9rem] font-extrabold text-[#0F172A] leading-[1.05] tracking-tight">
              Create Your Smart{" "}
              <span className="relative inline-block text-gradient-gold">
                Digital Business Card
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none">
                  <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>{" "}
              in Minutes
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
              Beautiful, shareable cards with QR codes, lead tracking, payment links, products, videos, and analytics — built for professionals, agencies, and resellers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                30 Days Free Cardless Trial <ArrowRight size={18} />
              </Link>
              <Link to="/digital-business-cards-templates" className="btn-navy h-12 px-7 flex items-center justify-center gap-2 text-base">
                <Eye size={18} /> View Templates
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-7 flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {AVATARS.map((c, i) => (
                  <div key={i} className="w-9 h-9 rounded-full ring-2 ring-white flex items-center justify-center text-[11px] font-bold text-white" style={{ background: c }}>
                    {["A", "B", "E", "S", "R"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={13} className="fill-[#F7B31C] text-[#F7B31C]" />)}
                  <span className="ml-1.5 text-xs font-bold text-[#0F172A]">4.9/5</span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">Loved by <span className="font-semibold text-[#0F172A]">1,456+</span> businesses</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-2 max-w-md">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check size={11} className="text-emerald-600" /></span>
                  <span className="text-xs text-[#64748B]">{h}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Right */}
          <Reveal className="lg:pl-6">
            <CardContactSlider />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stats band (animated counters)
   ───────────────────────────────────────────────────────────── */
function StatsBand() {
  const stats = [
    { end: 91000, suffix: "+", label: "Card Views", sep: true },
    { end: 5173, suffix: "+", label: "Active Cards", sep: true },
    { end: 1456, suffix: "+", label: "Happy Clients", sep: true },
    { end: 23, suffix: "+", label: "Templates" },
    { end: 5, suffix: "", label: "Countries" },
  ];
  return (
    <section className="relative -mt-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-3xl overflow-hidden bg-[#1E293B] shadow-premium-lg gradient-navy ring-1 ring-white/5">
          {stats.map((s, i) => (
            <div key={i} className="bg-[#0F172A]/60 px-5 py-7 text-center">
              <p className="text-3xl sm:text-[2.1rem] font-extrabold text-white tabular-nums">
                <Counter end={s.end} duration={2200} separator={s.sep} />
                <span className="text-gradient-gold">{s.suffix}</span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Trusted marquee
   ───────────────────────────────────────────────────────────── */
function TrustedSection() {
  const brands = ["Digital Agencies", "Doctors & Clinics", "Consultants", "Restaurants", "Real Estate", "Freelancers", "Retail Stores", "Coaches", "Salons", "Photographers"];
  const row = [...brands, ...brands];
  return (
    <section className="py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-8">
          Trusted by businesses, professionals & local brands across India
        </p>
      </div>
      <div className="relative overflow-hidden mask-fade-x">
        <div className="marquee-track gap-3">
          {row.map((b, i) => (
            <span key={i} className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E2E8F0] shadow-premium text-sm font-medium text-[#475569]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C]" /> {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Features (bento)
   ───────────────────────────────────────────────────────────── */
/* Icon chip tinted to a category accent */
function ChipRow({ icon: Icon, label, accent }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; accent: string }) {
  return (
    <div className="group/i flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-[#F8FAFC] transition-colors">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-black/[0.03]" style={{ backgroundColor: `${accent}1A`, color: accent }}>
        <Icon size={14} />
      </span>
      <span className="text-[12px] font-medium text-[#334155]">{label}</span>
      <ChevronRight size={14} className="ml-auto text-[#CBD5E1] -translate-x-1 opacity-0 group-hover/i:opacity-100 group-hover/i:translate-x-0 transition-all" />
    </div>
  );
}

function FeaturesSection() {
  const builderItems = [
    { icon: CreditCard, label: "Drag & Drop Builder", desc: "Arrange blocks visually" },
    { icon: Image, label: "Image Gallery", desc: "Showcase photos & work" },
    { icon: Play, label: "Video Embed", desc: "Add intro & product videos" },
    { icon: ShoppingBag, label: "Products & Services", desc: "List what you sell" },
    { icon: Sparkles, label: "Offers & Deals", desc: "Promote your discounts" },
    { icon: Layers, label: "Multilingual", desc: "Reach every customer" },
  ];

  const groups = [
    {
      title: "Sharing", icon: Share2, accent: "#14B8A6", color: "from-[#14B8A6] to-[#0D9488]", span: "md:col-span-1",
      items: [{ icon: QrCode, label: "QR Code" }, { icon: MessageCircle, label: "WhatsApp Chat" }, { icon: Download, label: "Save Contact" }, { icon: FileDown, label: "vCard / PDF" }],
    },
    {
      title: "Leads & Forms", icon: Globe, accent: "#8B5CF6", color: "from-[#8B5CF6] to-[#6D28D9]", span: "md:col-span-1",
      items: [{ icon: Globe, label: "Enquiry Form" }, { icon: BarChart3, label: "Lead Tracking" }, { icon: MapPin, label: "Google Maps" }, { icon: Star, label: "Review Link" }],
    },
    {
      title: "Payments", icon: Wallet, accent: "#EC4899", color: "from-[#EC4899] to-[#BE185D]", span: "md:col-span-1",
      items: [{ icon: Wallet, label: "UPI / GPay / Paytm" }, { icon: Link2, label: "Payment Links" }, { icon: QrCode, label: "Payment QR" }],
    },
    {
      title: "Analytics & SEO", icon: BarChart3, accent: "#3B82F6", color: "from-[#3B82F6] to-[#1D4ED8]", span: "md:col-span-1",
      items: [{ icon: Eye, label: "Views & Clicks" }, { icon: MousePointer, label: "Click Analytics" }, { icon: Shield, label: "SEO Settings" }, { icon: Globe, label: "Custom Domain" }],
    },
    {
      title: "AI Powered", icon: Sparkles, accent: "#F59E0B", color: "from-[#F7B31C] via-[#F59E0B] to-[#14B8A6]", span: "md:col-span-2", wide: true,
      items: [{ icon: Sparkles, label: "AI Bio Writer" }, { icon: FileText, label: "AI Descriptions" }, { icon: Globe, label: "AI SEO Generator" }, { icon: MessageCircle, label: "AI FAQ Generator" }, { icon: Mail, label: "AI Lead Reply" }, { icon: Layers, label: "AI Translate" }],
    },
    {
      title: "Reseller", icon: Users, accent: "#334155", color: "from-[#0F172A] to-[#334155]", span: "md:col-span-2", wide: true,
      items: [{ icon: Users, label: "White-Label" }, { icon: Shield, label: "Custom Branding" }, { icon: BarChart3, label: "Commission Reports" }, { icon: Eye, label: "Customer Analytics" }],
    },
  ];

  return (
    <section className="py-16 relative overflow-hidden" id="features">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#F7B31C]/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading eyebrow="Features" title="Everything You Need in One Digital Card" subtitle="22+ powerful features organized by what matters most — create, share, convert, and grow." />
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-fr">

          {/* Hero tile — Card Builder */}
          <div className="sm:col-span-2 md:col-span-2 md:row-span-2 relative flex flex-col rounded-3xl bg-white ring-1 ring-black/5 shadow-premium overflow-hidden card-hover">
            <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#F7B31C]/10 blur-3xl" />
            <div className="relative bg-gradient-to-r from-[#F7B31C] to-[#D97706] px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center"><CreditCard size={19} className="text-white" /></div>
              <div>
                <h3 className="text-base font-bold text-white leading-none">Card Builder</h3>
                <p className="text-[11px] text-white/80 mt-1">The visual editor at the core</p>
              </div>
              <span className="ml-auto text-[10px] font-bold text-[#7C4A03] bg-white/90 rounded-full px-2.5 py-1">CORE</span>
            </div>

            <div className="relative p-4 grid grid-cols-2 gap-2.5 content-start flex-1">
              {builderItems.map((it, i) => (
                <div key={i} className="group/f rounded-2xl bg-[#F8FAFC] hover:bg-white p-3.5 ring-1 ring-black/[0.04] hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-2.5 group-hover/f:scale-105 transition-transform"><it.icon size={17} className="text-[#D97706]" /></div>
                  <p className="text-[13px] font-semibold text-[#0F172A] leading-tight">{it.label}</p>
                  <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">{it.desc}</p>
                </div>
              ))}
            </div>

            {/* Mini builder window */}
            <div className="relative mx-4 mb-4 rounded-2xl bg-[#0F172A] p-4 overflow-hidden">
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#F7B31C]/20 blur-2xl" />
              <div className="relative flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /><span className="w-2 h-2 rounded-full bg-[#F7B31C]" /><span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-[10px] text-white/40 ml-1.5 font-medium">card-builder · live preview</span>
              </div>
              <div className="relative space-y-1.5">
                <div className="h-2.5 w-2/5 rounded-full bg-[#F7B31C]" />
                <div className="h-2 w-full rounded-full bg-white/10" />
                <div className="h-2 w-4/5 rounded-full bg-white/10" />
              </div>
              <div className="relative mt-3 flex items-center gap-2">
                <div className="h-8 flex-1 rounded-lg bg-gradient-to-r from-[#F7B31C] to-[#D97706] flex items-center justify-center gap-1.5">
                  <Zap size={12} className="text-[#0F172A]" /><span className="text-[11px] font-bold text-[#0F172A]">Publish in 2 min</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center"><Share2 size={13} className="text-white/60" /></div>
              </div>
            </div>
          </div>

          {/* Standard + wide tiles */}
          {groups.map((group, gi) => (
            <div key={gi} className={`${group.span} relative flex flex-col rounded-3xl bg-white ring-1 ring-black/5 shadow-premium overflow-hidden card-hover`}>
              <div className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-[0.12]" style={{ background: group.accent }} />
              <div className={`relative bg-gradient-to-r ${group.color} px-4 py-3 flex items-center gap-2.5`}>
                <div className="w-9 h-9 rounded-xl bg-white/20 ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center"><group.icon size={16} className="text-white" /></div>
                <h3 className="text-sm font-bold text-white">{group.title}</h3>
                <span className="ml-auto text-[10px] font-semibold text-white/90 bg-white/15 rounded-full px-2 py-0.5">{group.items.length} tools</span>
              </div>
              <div className={`relative p-2.5 flex-1 ${group.wide ? "grid grid-cols-2 gap-x-2 gap-y-1 content-start" : "flex flex-col gap-0.5"}`}>
                {group.items.map((item, ii) => (
                  <ChipRow key={ii} icon={item.icon} label={item.label} accent={group.accent} />
                ))}
              </div>
            </div>
          ))}
        </Reveal>

        <div className="text-center mt-8">
          <Link to="/features" className="btn-navy inline-flex items-center gap-2 h-10 px-5 text-sm">Explore All 22+ Features <ChevronRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Why DigitalCarda
   ───────────────────────────────────────────────────────────── */
function WhyDigitalCardaSection() {
  const benefits = [
    { icon: Wallet, text: "Your card is always in your client's pocket — one tap away." },
    { icon: TrendingUp, text: "88% of printed business cards are thrown away within a week." },
    { icon: Leaf, text: "Paperless by nature — no trees or ink wasted." },
    { icon: Shield, text: "A professional digital identity that builds instant trust." },
    { icon: Zap, text: "Update once and it's live everywhere, instantly." },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-[#F7B31C]/8 rounded-full blur-3xl -translate-y-1/2" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="relative flex justify-center">
            <picture>
              <source srcSet="/hero/digital-business-card-nfc-professional.webp" type="image/webp" />
              <img
                src="/hero/digital-business-card-nfc-professional.png"
                width="1082" height="993"
                alt="Businessman holding a smartphone showing a DigitalCarda digital business card and an NFC smart card"
                loading="lazy"
                className="w-full max-w-md drop-shadow-2xl"
              />
            </picture>
            <div className="absolute bottom-8 left-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-bold text-[#F7B31C]">5,173+</p>
              <p className="text-[10px] text-[#94A3B8]">Active Digital Cards</p>
            </div>
            <div className="absolute top-12 right-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-bold text-[#14B8A6]">98%</p>
              <p className="text-[10px] text-[#94A3B8]">Client Satisfaction</p>
            </div>
          </Reveal>

          <Reveal>
            <p className="text-[#F7B31C] text-xs font-bold uppercase tracking-widest mb-2">Why DigitalCarda?</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">Inspire Your Client Digitally</h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-8">
              Forget old printed visiting cards that end up in the bin. Share contact info with one-click actions — Call, Email, WhatsApp, Maps, Bank Details, Website & Social Links — all from a single smart card.
            </p>
            <div className="space-y-4">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-9 h-9 rounded-xl bg-[#F7B31C]/15 ring-1 ring-[#F7B31C]/20 flex items-center justify-center shrink-0 group-hover:bg-[#F7B31C] transition-colors">
                    <b.icon size={16} className="text-[#F7B31C] group-hover:text-[#0F172A] transition-colors" />
                  </div>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed pt-2">{b.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Link to="/signup" className="btn-gold inline-flex items-center gap-2 h-11 px-6 text-sm">Get Started <ArrowRight size={14} /></Link>
              <Link to="/features" className="h-11 px-6 inline-flex items-center gap-2 text-sm font-medium text-[#CBD5E1] border border-white/20 rounded-xl hover:bg-white/5 transition-all">Learn More</Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── AI Section ─── */
function AISection() {
  const aiFeatures = [
    { icon: FileDown, title: "AI About Us Writer", desc: "Generate compelling business descriptions instantly." },
    { icon: ShoppingBag, title: "AI Product Descriptions", desc: "Create product copy that converts visitors to buyers." },
    { icon: Globe, title: "AI SEO Generator", desc: "Auto-generate meta titles, descriptions, and keywords." },
    { icon: CreditCard, title: "AI Bio Writer", desc: "Craft a professional bio for your digital card." },
    { icon: MessageCircle, title: "AI FAQ Generator", desc: "Generate relevant FAQs for your business automatically." },
    { icon: Globe, title: "AI Translation", desc: "Translate your card content into multiple languages." },
    { icon: Mail, title: "AI Lead Reply", desc: "Draft professional responses to captured leads." },
    { icon: Sparkles, title: "AI Template Suggestion", desc: "Get AI-recommended templates for your industry." },
  ];
  return (
    <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#F7B31C]/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-[#14B8A6]/8 rounded-full blur-3xl" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading eyebrow="AI Tools" title="Build Smarter Cards with AI" subtitle="AI tools that write business descriptions, product content, SEO titles, FAQs, bios, CTAs, and multilingual content in seconds." light />
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiFeatures.map((f, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 card-hover hover:border-[#F7B31C]/30">
              <div className="w-10 h-10 rounded-xl bg-[#F7B31C]/20 flex items-center justify-center mb-3"><f.icon size={18} className="text-[#F7B31C]" /></div>
              <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </Reveal>
        <div className="text-center mt-10">
          <Link to="/ai-card-generator" className="btn-gold inline-flex items-center gap-2 h-12 px-7"><Sparkles size={18} /> Try AI Card Generator</Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Templates ─── */
function TemplatesSection() {
  const { data: products = [], isLoading } = trpc.product.catalogue.useQuery();
  // Featured first, then curated display order — show the best 8 real designs.
  const shown = [...products]
    .sort((a, b) => (Number(b.isFeatured) - Number(a.isFeatured)) || (a.displayOrder - b.displayOrder))
    .slice(0, 8);
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Templates" title="Beautiful, Ready-to-Use Templates" subtitle="Pick a professional design, customize colors, upload your logo, add details, and publish instantly." />
        <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-[#F1F5F9] shadow-premium overflow-hidden">
                  <div className="w-full animate-pulse bg-[#F1F5F9]" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }} />
                  <div className="p-3.5"><div className="h-3.5 w-2/3 mx-auto bg-[#F1F5F9] rounded-full animate-pulse" /></div>
                </div>
              ))
            : shown.map((p) => {
              const feat = Array.isArray(p.images) && p.images.length ? p.images[0] : null;
              return (
                <article key={p.id} className="group rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-premium hover:shadow-premium-lg hover:-translate-y-1.5 transition-all duration-300">
                  <Link to={`/digital-business-cards-templates/${p.slug}`} className="relative block active:scale-[0.99] transition-transform">
                    {p.isFeatured && <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F172A] text-[#F7B31C] shadow-sm">★ Featured</span>}
                    {/* Prefer the product's uploaded feature image; fall back to the generated card thumbnail. */}
                    {feat
                      ? <div className="w-full bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7]" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
                          <img src={feat} alt={`${p.name} — digital business card`} loading="lazy" className="w-full h-full object-cover object-top" />
                        </div>
                      : <TemplateThumb style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} />}
                    <div className="absolute inset-0 hidden md:flex items-center justify-center bg-[#0F172A]/0 group-hover:bg-[#0F172A]/30 transition-colors duration-300">
                      <span className="opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-[#0F172A] text-[13px] font-bold shadow-lg"><Eye size={14} /> Live Preview</span>
                    </div>
                  </Link>
                  <div className="p-3.5 text-center">
                    <Link to={`/digital-business-cards-templates/${p.slug}`} className="text-sm font-semibold text-[#0F172A] group-hover:text-[#F7B31C] transition-colors line-clamp-1">{p.name}</Link>
                  </div>
                </article>
              );
            })}
        </Reveal>
        <div className="text-center mt-10">
          <Link to="/digital-business-cards-templates" className="btn-navy inline-flex items-center gap-2">Browse All Templates <ChevronRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Industries ─── */
function IndustriesSection() {
  const industries = [
    { icon: Monitor, name: "Digital Marketing Agencies" }, { icon: CreditCard, name: "Doctors & Clinics" },
    { icon: MapPin, name: "Real Estate Agents" }, { icon: Shield, name: "Lawyers" },
    { icon: Users, name: "Consultants" }, { icon: Sparkles, name: "Freelancers" },
    { icon: ShoppingBag, name: "Restaurants" }, { icon: Image, name: "Salons" },
    { icon: ShoppingBag, name: "Retail Shops" }, { icon: Zap, name: "Coaches" },
    { icon: Image, name: "Photographers" }, { icon: Clock, name: "Event Planners" },
    { icon: FileDown, name: "Education Institutes" }, { icon: Zap, name: "Startups" },
    { icon: Shield, name: "Local Service Providers" },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Industries" title="Made for Every Business Type" subtitle="Whatever your industry, DigitalCarda has the features and templates to help you grow." />
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {industries.map((ind, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] card-hover flex items-center gap-3 hover:border-[#F7B31C]/40 group">
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] group-hover:bg-[#FEF3C7] flex items-center justify-center shrink-0 transition-colors">
                <ind.icon size={18} className="text-[#F7B31C]" />
              </div>
              <span className="text-sm font-medium text-[#0F172A]">{ind.name}</span>
            </div>
          ))}
        </Reveal>
        <div className="text-center mt-10">
          <Link to="/industries" className="btn-navy inline-flex items-center gap-2">View All Industries <ChevronRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorksSection() {
  const steps = [
    { num: 1, title: "Create Your Own", desc: "It takes 2 minutes. Choose a template, add your details, and customize your card.", img: "/step-create.png" },
    { num: 2, title: "Save to Your Device", desc: "Accessible anytime, from anywhere — on phone, tablet, or desktop.", img: "/step-save.png" },
    { num: 3, title: "Share with Everyone", desc: "Share via WhatsApp, Email, QR Code, and social media with a single tap.", img: "/step-share.png" },
  ];
  return (
    <section className="py-20 bg-gradient-to-br from-[#F7B31C] via-[#D97706] to-[#F7B31C] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark opacity-20" />
      <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0F172A]/10 text-[#0F172A] mb-3">How it works</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Live in Three Simple Steps</h2>
        </div>
        <Reveal stagger className="grid md:grid-cols-3 gap-8 relative">
          {/* connecting line */}
          <div className="hidden md:block absolute top-20 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-white/30" />
          {steps.map((s) => (
            <div key={s.num} className="text-center group relative z-10">
              <div className="relative w-40 h-40 mx-auto mb-6">
                <div className="absolute inset-0 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors" />
                <img src={s.img} alt={s.title} className="relative z-10 w-full h-full object-contain p-4 drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0F172A] border-2 border-[#F7B31C] flex items-center justify-center z-20">
                  <span className="text-xs font-bold text-[#F7B31C]">{s.num}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-xs text-white/80 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </Reveal>
        <div className="text-center mt-12">
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 h-12 px-10 bg-[#0F172A] text-white rounded-2xl text-sm font-semibold hover:bg-[#1E293B] transition-all hover:shadow-lg active:scale-[0.98]">
            Create Now <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Analytics ─── */
function AnalyticsSection() {
  const stats = [
    { icon: Eye, label: "Total Views", desc: "How many people view your card" },
    { icon: Users, label: "Unique Visitors", desc: "Track individual visitor counts" },
    { icon: Phone, label: "Call Clicks", desc: "Monitor phone call initiations" },
    { icon: MessageCircle, label: "WhatsApp Clicks", desc: "Track WhatsApp conversations" },
    { icon: Mail, label: "Email Clicks", desc: "See email engagement rates" },
    { icon: QrCode, label: "QR Scans", desc: "Count QR code scans" },
    { icon: Globe, label: "Lead Forms", desc: "Track enquiry submissions" },
    { icon: Share2, label: "Source Tracking", desc: "Know where visitors come from" },
    { icon: Smartphone, label: "Device Reports", desc: "Mobile vs desktop breakdown" },
    { icon: TrendingUp, label: "Monthly Growth", desc: "Compare month-over-month" },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Analytics" title="Track Every Click and Lead" subtitle="Know how customers interact with your card — views, WhatsApp & call clicks, QR scans, product views, offers, and enquiries." />
        <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] card-hover text-center hover:border-[#F7B31C]/40">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-3"><s.icon size={18} className="text-[#F7B31C]" /></div>
              <h3 className="text-xs font-semibold text-[#0F172A] mb-1">{s.label}</h3>
              <p className="text-[10px] text-[#64748B]">{s.desc}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ─── QR & NFC ─── */
function QRNFCSection() {
  return (
    <section className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#CCFBF1] text-[#115E59] mb-4">QR &amp; NFC</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mb-4 tracking-tight">Share Faster with <span className="text-gradient-gold">QR and NFC</span></h2>
            <p className="text-base text-[#64748B] leading-relaxed mb-6">Generate a QR code for your card and use it on visiting cards, posters, packaging, brochures, counters, and NFC cards. Customers scan and instantly access your digital presence.</p>
            <div className="space-y-3">
              {["Print on business cards & brochures", "Display on store counters & packaging", "Share via WhatsApp, email & SMS", "Embed on websites & social media", "Permanent link — redesign your card, the QR never breaks"].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check size={12} className="text-emerald-600" /></span>
                  <span className="text-sm text-[#475569]">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8"><Link to="/signup" className="btn-gold inline-flex items-center gap-2">Get Your QR Code <ArrowRight size={16} /></Link></div>
          </Reveal>
          <Reveal className="flex justify-center">
            <div className="relative w-full max-w-[420px]">
              <div className="absolute -top-3 -right-3 z-10 bg-[#14B8A6] text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                <ScanLine size={12} /> NFC Ready
              </div>
              <style>{STANDEE_STYLES}</style>
              <div dangerouslySetInnerHTML={{ __html: standeeMarkup({
                brandName: "Aarav Mehta",
                subtitle: "Founder · Mehta & Co.",
                phone: "+91 98765 43210",
                linkText: "digitalcarda.in/aarav",
                prompt: "Scan to view my digital card",
                qrSrc: `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=12&format=png&data=${encodeURIComponent("https://digitalcarda.in/digital-business-cards-templates")}&color=0F172A&bgcolor=FFFFFF`,
              }) }} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Custom Domain ─── */
function CustomDomainSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark opacity-30" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal stagger className="order-2 lg:order-1 flex justify-center">
            <div className="space-y-3 w-full max-w-sm">
              {["card.yourbusiness.com", "profile.yourbusiness.com", "me.yourbusiness.com", "link.yourbusiness.com"].map((domain, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 flex items-center gap-3 hover:border-[#14B8A6]/40 transition-colors">
                  <Globe size={16} className="text-[#14B8A6]" />
                  <span className="text-sm text-white font-medium">{domain}</span>
                  <Check size={14} className="text-emerald-400 ml-auto" />
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F7B31C]/20 text-[#F7B31C] mb-4">Custom Domain</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">Use Your <span className="text-gradient-gold">Own Domain</span></h2>
            <p className="text-base text-[#94A3B8] leading-relaxed mb-6">Connect your own domain or subdomain for stronger branding and trust. Your customers see a professional URL that matches your brand.</p>
            <div className="space-y-3">
              {["Strengthen brand identity", "Build customer trust", "Better SEO rankings", "Professional appearance"].map((item, i) => (
                <div key={i} className="flex items-center gap-3"><Check size={16} className="text-[#F7B31C] shrink-0" /><span className="text-sm text-[#CBD5E1]">{item}</span></div>
              ))}
            </div>
            <div className="mt-8"><Link to="/custom-domain" className="btn-gold inline-flex items-center gap-2">Learn More <ArrowRight size={16} /></Link></div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Testimonials
   ───────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  { name: "ADI Textiles", role: "Retail · Surat", quote: "Your services and the dealing deserve praise. Thank you DigitalCarda for providing us a customised platform.", accent: "#F7B31C" },
  { name: "Bombay Jewellers", role: "Jewellery · Mumbai", quote: "Professional, reliable and beautifully designed. Our card now reaches customers everywhere with a single tap.", accent: "#14B8A6" },
  { name: "Eurydice", role: "Boutique · Delhi", quote: "Fascinating for a shopkeeper like me. A single card reaches hundreds of people with a tap. Thanks a million times.", accent: "#8B5CF6" },
  { name: "Scube Promoters", role: "Real Estate · Pune", quote: "DigitalCarda made my business easier than before. I even shared it directly to Facebook in seconds.", accent: "#3B82F6" },
  { name: "Shivlal Jewellers", role: "Jewellery · Jaipur", quote: "A great initiative to preserve the environment with an innovative business approach. Highly recommended.", accent: "#EC4899" },
  { name: "Availcar", role: "Auto · Chandigarh", quote: "Digital cards are pocket-friendly and easy to share anywhere. A smart way to advertise through DigitalCarda.", accent: "#0EA5E9" },
];

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="w-[340px] shrink-0 bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
      <Quote size={26} className="text-[#F7B31C]/30 mb-3" />
      <p className="text-sm text-[#475569] leading-relaxed mb-5">{t.quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: t.accent }}>
          {t.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{t.name}</p>
          <p className="text-xs text-[#94A3B8]">{t.role}</p>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[#F7B31C] text-[#F7B31C]" />)}
        </div>
      </div>
    </div>
  );
}

/* ─── Do More — multi-card · refer & earn · bulk teams ─── */
function GrowSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Do More" title="More Than a Card — a Growth Engine" subtitle="One login unlocks multiple cards, referral rewards and team-wide bulk ordering — everything you need to scale your presence." />
        <Reveal stagger className="grid md:grid-cols-3 gap-5 md:auto-rows-fr">

          {/* Multiple cards */}
          <div className="group relative flex flex-col rounded-3xl bg-white ring-1 ring-black/5 shadow-premium overflow-hidden card-hover">
            <div className="p-6 pb-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center shadow-lg"><Layers size={22} className="text-white" /></div>
              <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Multiple Cards, One Login</h3>
              <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">Run a separate card for each role, brand or location. Switch designs anytime — your URL &amp; QR never change.</p>
            </div>
            <div className="relative mx-6 my-6 h-32 rounded-2xl bg-[#F8FAFC] ring-1 ring-black/[0.04] overflow-hidden">
              <div className="absolute left-1/2 -translate-x-1/2 top-9 w-40 h-20 rounded-xl bg-[#CBD5E1] rotate-[-9deg] shadow-md" />
              <div className="absolute left-1/2 -translate-x-1/2 top-6 w-40 h-20 rounded-xl bg-[#94A3B8] rotate-[5deg] shadow-md" />
              <div className="absolute left-1/2 -translate-x-1/2 top-4 w-40 h-20 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] shadow-xl p-3 flex flex-col justify-between">
                <div className="w-7 h-7 rounded-full bg-white/25" />
                <div className="space-y-1"><div className="h-1.5 w-2/3 rounded-full bg-white/50" /><div className="h-1.5 w-1/2 rounded-full bg-white/30" /></div>
              </div>
              <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#1D4ED8] bg-white rounded-full px-2 py-1 shadow-sm"><Plus size={11} /> New card</div>
            </div>
            <div className="px-6 pb-6 mt-auto"><Link to="/pricing" className="text-sm font-bold text-[#2563EB] inline-flex items-center gap-1 group-hover:gap-2 transition-all">See plans <ArrowRight size={15} /></Link></div>
          </div>

          {/* Refer & Earn */}
          <div className="group relative flex flex-col rounded-3xl bg-white ring-1 ring-black/5 shadow-premium overflow-hidden card-hover">
            <div className="p-6 pb-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center shadow-lg"><Gift size={22} className="text-white" /></div>
              <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Refer &amp; Earn</h3>
              <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">Share your code, earn real wallet rewards on every paid signup, and withdraw straight to UPI or bank.</p>
            </div>
            <div className="relative mx-6 my-6 h-32 rounded-2xl bg-[#F8FAFC] ring-1 ring-black/[0.04] flex items-center justify-center">
              <div className="w-44 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-3.5 shadow-xl">
                <div className="flex items-center justify-between"><span className="text-[10px] text-white/60 font-medium">My Wallet</span><Wallet size={13} className="text-[#F7B31C]" /></div>
                <p className="text-white font-extrabold text-xl mt-1 tabular-nums">₹2,450</p>
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#0F172A] bg-[#F7B31C] rounded-full px-2 py-0.5"><TrendingUp size={11} /> +₹250 referral</div>
              </div>
            </div>
            <div className="px-6 pb-6 mt-auto"><Link to="/signup" className="text-sm font-bold text-[#D97706] inline-flex items-center gap-1 group-hover:gap-2 transition-all">Start earning <ArrowRight size={15} /></Link></div>
          </div>

          {/* Bulk / Teams */}
          <div className="group relative flex flex-col rounded-3xl bg-white ring-1 ring-black/5 shadow-premium overflow-hidden card-hover">
            <div className="p-6 pb-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg"><Building2 size={22} className="text-white" /></div>
              <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Bulk Cards for Teams</h3>
              <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">Outfit your whole team — up to 500 branded cards from one account, consistent design, one dashboard.</p>
            </div>
            <div className="relative mx-6 my-6 h-32 rounded-2xl bg-[#F8FAFC] ring-1 ring-black/[0.04] flex flex-col items-center justify-center gap-2.5">
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center" style={{ opacity: 0.35 + (i % 6) * 0.11 }}><Users size={10} className="text-white" /></span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F766E] bg-[#CCFBF1] rounded-full px-2.5 py-1">Up to 500 cards</span>
            </div>
            <div className="px-6 pb-6 mt-auto"><Link to="/bulk-cards" className="text-sm font-bold text-[#0D9488] inline-flex items-center gap-1 group-hover:gap-2 transition-all">Get a bulk quote <ArrowRight size={15} /></Link></div>
          </div>

        </Reveal>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Testimonials" title="They Say We Did a Great Job" subtitle="Businesses across India have replaced paper cards with DigitalCarda — here's what they think." />
      </div>
      <div className="relative mask-fade-x">
        <div className="marquee-track gap-5 py-2">
          {row.map((t, i) => <TestimonialCard key={i} t={t} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── Reseller ─── */
function ResellerSection() {
  const features = ["Add Customers", "Assign Packages", "Track Expiry", "Manage Leads", "White Label Branding", "Commission Reports", "Customer Analytics", "Marketing Materials"];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Reseller Program</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mb-4 tracking-tight">Start Your Own <span className="text-gradient-gold">Digital Card Business</span></h2>
            <p className="text-base text-[#64748B] leading-relaxed mb-6">A complete white-label system to create and manage cards for your customers. Build a recurring revenue stream with minimal effort.</p>
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2"><Check size={14} className="text-[#F7B31C] shrink-0" /><span className="text-xs text-[#64748B]">{f}</span></div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Link to="/resellers" className="btn-gold inline-flex items-center gap-2">Become a Reseller <ArrowRight size={16} /></Link>
              <Link to="/contact" className="btn-ghost inline-flex items-center gap-2">Contact Sales</Link>
            </div>
          </Reveal>
          <Reveal className="bg-gradient-to-br from-white to-[#F8FAFC] rounded-3xl p-8 shadow-premium-lg border border-[#F1F5F9]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center"><Users size={24} className="text-[#0F172A]" /></div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Reseller Dashboard</p>
                <p className="text-xs text-[#94A3B8]">Manage your customers</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Total Customers", value: "48", color: "text-[#F7B31C]" },
                { label: "Active Cards", value: "142", color: "text-[#14B8A6]" },
                { label: "Monthly Revenue", value: "₹24,500", color: "text-[#0F172A]" },
                { label: "Commission Earned", value: "₹4,900", color: "text-emerald-600" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#F1F5F9]">
                  <span className="text-sm text-[#64748B]">{stat.label}</span>
                  <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function PricingSection() {
  const plans = [
    { name: "Free Trial", price: "₹0", period: "30 Days", popular: false, cta: "Start Free Trial", features: ["Full Gold features", "1 Digital Card", "All 40+ templates", "No credit card needed", "Live in minutes"] },
    { name: "Gold", price: "₹999", period: "/ year", popular: true, cta: "Get Gold", features: ["1 Digital Card", "Products & Services", "Gallery, Videos & Offers", "QR & UPI Payments", "Enquiry Form + Leads", "Full Analytics", "Custom URL & Colours"] },
    { name: "Platinum", price: "₹1,999", period: "/ year", popular: false, cta: "Go Platinum", features: ["Everything in Gold", "Up to 3 Cards", "Unlimited Products & Offers", "Remove Branding", "Custom Domain + SEO", "AI Content Tools", "Priority Support"] },
  ];
  return (
    <section className="py-20 bg-[#F8FAFC]" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Pricing" title="Simple Pricing for Every Business" subtitle="Choose the plan that fits your needs. Start a 30-day free trial that requires no credit card details upfront." />
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-3">
          {plans.map((plan, i) => (
            <div key={i} className={`rounded-2xl p-6 card-hover relative ${plan.popular ? "bg-[#0F172A] shadow-premium-lg ring-2 ring-[#F7B31C]" : "bg-white shadow-premium border border-[#F1F5F9]"}`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full whitespace-nowrap shadow-gold">MOST POPULAR</span>}
              <h3 className={`text-base font-semibold ${plan.popular ? "text-white" : "text-[#0F172A]"}`}>{plan.name}</h3>
              <div className="mt-3 mb-5 flex items-baseline gap-1">
                <span className={`text-3xl font-extrabold ${plan.popular ? "text-white" : "text-[#0F172A]"}`}>{plan.price}</span>
                <span className={`text-sm ${plan.popular ? "text-[#94A3B8]" : "text-[#94A3B8]"}`}>{plan.period}</span>
              </div>
              <div className="space-y-2.5 mb-6">
                {plan.features.map((f, j) => (
                  <div key={j} className={`flex items-center gap-2 text-xs ${plan.popular ? "text-[#CBD5E1]" : "text-[#64748B]"}`}>
                    <Check size={13} className={plan.popular ? "text-[#F7B31C] shrink-0" : "text-emerald-500 shrink-0"} /> {f}
                  </div>
                ))}
              </div>
              <Link to="/signup" className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-all ${plan.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:border-[#F7B31C]/40"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </Reveal>
        <p className="text-center text-xs text-[#94A3B8] mt-8">All plans include SSL, hosting, and free updates. Prices exclusive of GST.</p>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCTA() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-6 py-16 sm:px-16 sm:py-20 text-center shadow-premium-lg">
          <div className="absolute inset-0 bg-grid-dark opacity-30" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#F7B31C]/12 rounded-full blur-3xl animate-aurora-drift" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#14B8A6]/12 rounded-full blur-3xl animate-aurora-drift" style={{ animationDelay: "2s" }} />
          <div className="relative max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#F7B31C] ring-1 ring-white/10 mb-5">
              <Sparkles size={12} /> Start in under 2 minutes
            </span>
            <h2 className="text-3xl sm:text-[2.6rem] font-extrabold text-white mb-4 tracking-tight leading-tight">Create Your Digital Business Card Today</h2>
            <p className="text-base text-[#94A3B8] mb-8">Join thousands of businesses using DigitalCarda to create, share, and track professional digital cards.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2 text-base">Start Free Trial <ArrowRight size={18} /></Link>
              <Link to="/digital-business-cards-templates" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">View Templates</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Page ─── */
// Homepage section toggles — Reseller & Pricing are hidden from the homepage
// (still reachable at /resellers and /pricing). Flip to true to bring back.
const SHOW_RESELLER_SECTION = false;
const SHOW_PRICING_SECTION = false;

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsBand />
      <TrustedSection />
      <FeaturesSection />
      <WhyDigitalCardaSection />
      <AISection />
      <TemplatesSection />
      <IndustriesSection />
      <HowItWorksSection />
      <AnalyticsSection />
      <QRNFCSection />
      <CustomDomainSection />
      <GrowSection />
      <TestimonialsSection />
      {SHOW_RESELLER_SECTION && <ResellerSection />}
      {SHOW_PRICING_SECTION && <PricingSection />}
      <FinalCTA />
    </>
  );
}
