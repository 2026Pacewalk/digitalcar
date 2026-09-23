import { Link } from "react-router";
import {
  CreditCard, QrCode, MessageCircle, Download, FileDown, FileText,
  ShoppingBag, Image, Play, Wallet, MapPin, Star, Sparkles, Phone, Mail,
  Check, ArrowRight, Zap, Users, Eye, MousePointer,
  Share2, Layers, Shield, Clock, TrendingUp,
  ChevronRight, ChevronLeft, Monitor, Smartphone, Globe, BarChart3,
  Link2, Leaf, Quote, ScanLine, Gift, Building2, Plus, Nfc,
} from "lucide-react";
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import TemplateThumb, { THUMB_W, THUMB_H } from "@/components/TemplateThumb";
import { STANDEE_STYLES, standeeMarkup } from "@/lib/standee";
import { useReveal, Reveal, SectionHeading } from "@/components/public/Reveal";
import JsonLd from "@/components/seo/JsonLd";
import { webpFor } from "@/lib/imageSources";
import { TESTIMONIALS } from "@/data/testimonials";

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

/* ─────────────────────────────────────────────────────────────
   Card slider (hero visual)
   ───────────────────────────────────────────────────────────── */
const SLIDER_CARDS = [
  { id: 1, name: "AARAV MEHTA", title: "DIRECTOR", company: "NAYARA INTERIORS", phone: "+91 98110 24680", website: "nayarainteriors.in", email: "aarav@nayarainteriors.in", address: "504 Trident Tower, Sector 44, Gurugram", views: 5173 },
  { id: 2, name: "DR. PRIYA PATEL", title: "CARDIOLOGIST", company: "HEART CARE", phone: "+91 98250 33445", website: "heartcare.in", email: "dr.priya@heartcare.in", address: "Apollo Hospital, Jubilee Hills, Hyderabad", views: 3421 },
  { id: 3, name: "RAJ SHARMA", title: "CEO", company: "PIXELCRAFT", phone: "+91 98722 55110", website: "pixelcraft.in", email: "raj@pixelcraft.in", address: "Sector 17, Chandigarh", views: 2890 },
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
              fetchPriority="high"
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C] animate-pulse" /> AI-Powered Digital Cards
            </span>
            <h1 className="mt-6 text-[2.6rem] sm:text-5xl lg:text-[3.9rem] font-extrabold text-[#0F172A] leading-[1.05] tracking-tight">
              <span className="relative inline-block text-gradient-gold">
                Digital Business Card
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none">
                  <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>{" "}
              <span className="sm:whitespace-nowrap">for Every Indian Professional</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
              Create a shareable digital visiting card with QR code, NFC tap, WhatsApp and UPI payments — in about two minutes. No app, no design skills, no reprinting.
            </p>
            {/* AEO answer block — a self-contained 40–60 word answer that AI search
                engines and Google's answer box can lift verbatim. Placed here so it
                sits near the top of the DOM, above the fold. */}
            <div className="mt-5 rounded-xl bg-white/70 ring-1 ring-[#FEF3C7] px-4 py-3 max-w-xl text-[13.5px] leading-relaxed text-[#334155]">
              <strong className="text-[#0F172A]">Quick answer:</strong> A digital business card is a link and QR code that replaces printed visiting cards. DigitalCarda makes one in 2 minutes with 50+ templates, WhatsApp, UPI payments, lead capture and analytics. Starts at <strong>₹99/month</strong> with a <strong>30-day free trial</strong> — no card details needed.
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                Start 30-Day Free Trial <ArrowRight size={18} />
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
  // Template count follows the live catalogue (rounded down to a 10, so "50+"
  // for 51) instead of a number typed in once and forgotten.
  const { data: catalogue } = trpc.product.catalogue.useQuery();
  const templates = catalogue?.length ? Math.max(10, Math.floor(catalogue.length / 10) * 10) : 50;

  /* The figures are the ones the site already publishes — only the
     presentation changed. Five equal boxes left an empty sixth cell on phones;
     this is a bento "proof board": the headline reach figure leads, and the
     other four sit in an even 2×2 so nothing is ever left dangling. */
  const tiles = [
    { end: 5173, suffix: "+", label: "Active cards", note: "live cards in use", icon: CreditCard, tint: "#F7B31C", sep: true },
    { end: 1456, suffix: "+", label: "Happy clients", note: "rated 4.9/5", icon: Users, tint: "#14B8A6", sep: true, stars: true },
    { end: templates, suffix: "+", label: "Templates", note: "ready-made designs", icon: Layers, tint: "#8B5CF6", href: "/digital-business-cards-templates" },
    { end: 5, suffix: "", label: "Countries", note: "and growing", icon: Globe, tint: "#3B82F6" },
  ];

  return (
    <section className="relative -mt-2 pb-2" aria-label="DigitalCarda in numbers">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-[#0B1120] ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(2,6,23,0.75)] p-3 sm:p-4 lg:p-5">
          {/* Backdrop — decorative only */}
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
          <div aria-hidden="true" className="absolute -top-28 -left-20 w-80 h-80 rounded-full blur-3xl bg-[#F7B31C]/[0.14]" />
          <div aria-hidden="true" className="absolute -bottom-32 right-0 w-96 h-96 rounded-full blur-3xl bg-[#14B8A6]/[0.10]" />

          <div className="relative flex items-center justify-between gap-3 px-2 pt-1 pb-3 sm:pb-4">
            <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-[#94A3B8]">
              <span className="dc-live-dot h-2 w-2 rounded-full bg-[#14B8A6]" aria-hidden="true" />
              DigitalCarda in numbers
            </p>
            <span className="hidden sm:inline text-xs text-[#64748B]">Real cards · real customers</span>
          </div>

          <div className="relative grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* ── Hero figure ── */}
            <div className="relative col-span-2 overflow-hidden rounded-[22px] sm:rounded-3xl p-5 sm:p-7 lg:p-5 bg-gradient-to-br from-[#1E293B] via-[#141C2E] to-[#0F172A] ring-1 ring-[#F7B31C]/25 flex flex-col justify-between min-h-[176px] lg:min-h-0">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F7B31C]/70 to-transparent" />

              {/* Reach rings — "people opening your card", drawn. */}
              <div aria-hidden="true" className="absolute -right-12 -top-12 sm:-right-4 sm:-top-4 lg:right-2 lg:top-1/2 lg:-translate-y-1/2 w-44 h-44 lg:w-32 lg:h-32 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-[#F7B31C]/15" />
                <span className="absolute inset-[16%] rounded-full border border-[#F7B31C]/20" />
                <span className="absolute inset-[32%] rounded-full border border-[#F7B31C]/30" />
                <span className="absolute inset-[32%] rounded-full bg-[#F7B31C]/10 motion-safe:animate-ping [animation-duration:2.8s]" />
                <span className="relative w-12 h-12 lg:w-10 lg:h-10 rounded-2xl lg:rounded-xl gradient-gold shadow-gold flex items-center justify-center">
                  <Eye size={22} className="text-[#0F172A]" />
                </span>
              </div>

              <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F7B31C]/12 border border-[#F7B31C]/25 px-2.5 py-1 text-[10.5px] sm:text-[11px] font-medium text-[#FCD34D]">
                <TrendingUp size={12} aria-hidden="true" /> And counting
              </span>

              <div className="relative mt-6 lg:mt-3">
                <p className="font-display text-[2.4rem] leading-none sm:text-5xl lg:text-[2.35rem] font-semibold text-white tabular-nums tracking-tight">
                  <Counter end={91000} duration={2200} />
                  <span className="text-[#F7B31C] font-medium">+</span>
                </p>
                <p className="mt-2.5 lg:mt-1.5 text-sm sm:text-[15px] lg:text-[13.5px] font-medium text-[#E2E8F0]">Card views</p>
                <p className="mt-0.5 text-[12px] sm:text-[13px] lg:text-[11.5px] font-normal text-[#94A3B8] max-w-[15rem] sm:max-w-xs lg:max-w-[12rem] leading-snug">
                  times customers have opened a DigitalCarda card
                </p>
              </div>
            </div>

            {/* ── Supporting figures (always an even 2×2) ── */}
            {tiles.map((t) => {
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/10" style={{ background: `${t.tint}1f` }}>
                      <t.icon size={17} style={{ color: t.tint }} aria-hidden="true" />
                    </span>
                    {t.href && (
                      <span className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[#94A3B8] lg:group-hover:bg-[#F7B31C] lg:group-hover:text-[#0F172A] transition-colors" aria-hidden="true">
                        <ArrowRight size={13} />
                      </span>
                    )}
                  </div>
                  <div className="mt-4 sm:mt-5 lg:mt-3">
                    <p className="font-display text-[1.6rem] sm:text-[1.9rem] lg:text-[1.6rem] leading-none font-semibold text-white tabular-nums tracking-tight">
                      <Counter end={t.end} duration={2200} separator={!!t.sep} />
                      <span className="font-medium" style={{ color: t.tint }}>{t.suffix}</span>
                    </p>
                    <p className="mt-2 text-[13px] sm:text-sm lg:text-[13px] font-medium text-[#E2E8F0]">{t.label}</p>
                    <p className="mt-0.5 text-[11.5px] lg:text-[11px] font-normal text-[#94A3B8] leading-snug lg:truncate">
                      {t.stars && (
                        <span className="inline-flex items-center gap-px mr-1 align-[-1px]" role="img" aria-label="4.9 out of 5 stars">
                          {[...Array(5)].map((_, k) => <Star key={k} size={10} className="fill-[#F7B31C] text-[#F7B31C]" />)}
                        </span>
                      )}
                      {t.note}
                    </p>
                  </div>
                  <div aria-hidden="true" className="absolute inset-x-5 bottom-0 h-[3px] rounded-t-full opacity-0 lg:group-hover:opacity-100 transition-opacity" style={{ background: t.tint }} />
                </>
              );
              const cls = "group relative overflow-hidden rounded-[20px] sm:rounded-3xl p-4 sm:p-5 lg:p-4 bg-white/[0.035] ring-1 ring-white/[0.08] lg:hover:bg-white/[0.06] lg:hover:ring-white/15 transition-all duration-300 lg:motion-safe:hover:-translate-y-0.5";
              return t.href ? (
                <Link key={t.label} to={t.href} className={`${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]`} aria-label={`${t.end}+ templates — browse the designs`}>
                  {inner}
                </Link>
              ) : (
                <div key={t.label} className={cls}>{inner}</div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Trusted marquee
   ───────────────────────────────────────────────────────────── */
function TrustedSection() {
  // Two rows drifting opposite ways, with the rating anchored in the middle
  // so the strip reads as proof rather than decoration.
  const rowA = ["Digital Agencies", "Doctors & Clinics", "Consultants", "Restaurants", "Real Estate", "Freelancers"];
  const rowB = ["Retail Stores", "Coaches", "Salons", "Photographers", "Event Planners", "Startups"];
  const pill = (b: string, i: number, copy = false) => (
    <span key={`${b}-${i}`} aria-hidden={copy || undefined} className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E2E8F0] shadow-premium text-sm font-medium text-[#475569]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C]" /> {b}
    </span>
  );

  return (
    <section className="py-14 bg-gradient-to-b from-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <p className="text-center text-xs font-semibold text-[#94A3B8] uppercase tracking-widest">
            Trusted by businesses, professionals &amp; local brands across India
          </p>
          <div className="inline-flex items-center gap-2.5 h-9 pl-3 pr-4 rounded-full bg-white ring-1 ring-[#E2E8F0] shadow-premium">
            <span className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[#F7B31C] text-[#F7B31C]" />)}
            </span>
            <span className="text-[12px] font-bold text-[#0F172A]">4.9</span>
            <span className="text-[12px] text-[#64748B]">from 1,456+ businesses</span>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden mask-fade-x space-y-3">
        <div className="marquee-track gap-3">{[...rowA, ...rowA].map((b, i) => pill(b, i, i >= rowA.length))}</div>
        <div className="marquee-track marquee-track--rev gap-3">{[...rowB, ...rowB].map((b, i) => pill(b, i, i >= rowB.length))}</div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Features (bento)
   ───────────────────────────────────────────────────────────── */
/* Every feature is visible at once — no tabs — so a skimming visitor and a
   crawler both get the full list. Each tile is one job the card does, with a
   small drawing of that job; the drawings are decoration only (aria-hidden). */
type FeatureIcon = React.ComponentType<{ size?: number; className?: string }>;
type FeatureTile = {
  id: "build" | "share" | "leads" | "pay" | "grow" | "ai" | "resell";
  title: string;
  text: string;
  accent: string;
  icon: FeatureIcon;
  items: { icon: FeatureIcon; label: string }[];
};

const FEATURE_TILES: FeatureTile[] = [
  {
    id: "build", title: "Build a card that sells", accent: "#F7B31C", icon: CreditCard,
    text: "A visual editor for everything your business wants to show — no design skills needed.",
    items: [
      { icon: CreditCard, label: "Drag & drop builder" }, { icon: Image, label: "Image gallery" }, { icon: Play, label: "Video embed" },
      { icon: ShoppingBag, label: "Products & services" }, { icon: Gift, label: "Offers & deals" }, { icon: Layers, label: "Multilingual" },
    ],
  },
  {
    id: "share", title: "Share it anywhere", accent: "#14B8A6", icon: Share2,
    text: "One scan or one tap, and your details are saved on their phone.",
    items: [{ icon: QrCode, label: "QR code" }, { icon: MessageCircle, label: "WhatsApp chat" }, { icon: Download, label: "Save contact" }, { icon: FileDown, label: "vCard / PDF" }],
  },
  {
    id: "leads", title: "Turn visits into leads", accent: "#8B5CF6", icon: Users,
    text: "Every enquiry lands in your dashboard, ready to follow up.",
    items: [{ icon: FileText, label: "Enquiry form" }, { icon: BarChart3, label: "Lead tracking" }, { icon: MapPin, label: "Google Maps" }, { icon: Star, label: "Review link" }],
  },
  {
    id: "pay", title: "Get paid on the card", accent: "#EC4899", icon: Wallet,
    text: "Customers pay you by UPI, straight from your card.",
    items: [{ icon: Wallet, label: "UPI / GPay / Paytm" }, { icon: Link2, label: "Payment links" }, { icon: QrCode, label: "Payment QR" }],
  },
  {
    id: "grow", title: "See what works", accent: "#3B82F6", icon: TrendingUp,
    text: "Views, clicks and search settings, all in one place.",
    items: [{ icon: Eye, label: "Views & clicks" }, { icon: MousePointer, label: "Click analytics" }, { icon: Shield, label: "SEO settings" }, { icon: Globe, label: "Custom domain" }],
  },
  {
    id: "ai", title: "Let AI write it", accent: "#D97706", icon: Sparkles,
    text: "Your bio, products, SEO and FAQs drafted in seconds — in more than one language.",
    items: [
      { icon: Sparkles, label: "AI bio writer" }, { icon: FileText, label: "AI descriptions" }, { icon: Globe, label: "AI SEO generator" },
      { icon: MessageCircle, label: "AI FAQ generator" }, { icon: Mail, label: "AI lead reply" }, { icon: Layers, label: "AI translate" },
    ],
  },
  {
    id: "resell", title: "Sell it under your brand", accent: "#F7B31C", icon: Building2,
    text: "White-label cards for your own clients, with commission reports built in.",
    items: [{ icon: Users, label: "White-label" }, { icon: Shield, label: "Custom branding" }, { icon: BarChart3, label: "Commission reports" }, { icon: Eye, label: "Customer analytics" }],
  },
];

function FeatureChips({ tile, dark }: { tile: FeatureTile; dark?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tile.items.map((it) => (
        <li
          key={it.label}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
            dark ? "bg-white/[0.07] text-[#E2E8F0] ring-1 ring-white/10" : "bg-[#F8FAFC] text-[#334155] ring-1 ring-[#E2E8F0]"
          }`}
        >
          <span className="flex" style={{ color: dark ? "#F7B31C" : tile.accent }}><it.icon size={12} /></span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function FeatureTileCard({ tile, dark, className = "", children }: { tile: FeatureTile; dark?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[22px] p-5 transition duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        dark
          ? "bg-[#0B1120] text-white shadow-[0_30px_60px_-30px_rgba(2,6,23,0.75)]"
          : "bg-white shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] ring-1 ring-[#0F172A]/[0.06] hover:shadow-[0_28px_60px_-28px_rgba(15,23,42,0.4)]"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl transition-opacity duration-500 ${dark ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ background: `${tile.accent}${dark ? "22" : "1F"}` }}
      />
      <div aria-hidden="true" className="relative flex flex-1 flex-col justify-center">{children}</div>
      <div className="relative pt-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: dark ? "rgba(247,179,28,0.15)" : `${tile.accent}1A`, color: dark ? "#F7B31C" : tile.accent }}
          >
            <tile.icon size={17} />
          </span>
          <h3 className={`text-base font-bold tracking-tight ${dark ? "text-white" : "text-[#0F172A]"}`}>{tile.title}</h3>
        </div>
        <p className={`mt-1.5 text-[13.5px] leading-relaxed ${dark ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{tile.text}</p>
        <div className="mt-3"><FeatureChips tile={tile} dark={dark} /></div>
      </div>
    </article>
  );
}

// 7×7 stand-in QR with three finder squares — decoration only.
const FEATURE_QR = Array.from({ length: 49 }, (_, i) => {
  const r = Math.floor(i / 7), c = i % 7;
  const finder = (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3);
  if (finder) return !((r === 1 && c === 1) || (r === 1 && c === 5) || (r === 5 && c === 1));
  return (r * 3 + c * 5) % 3 === 0;
});

function FloatChip({ icon: Icon, label, className }: { icon: FeatureIcon; label: string; className: string }) {
  return (
    <span className={`absolute hidden items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md sm:inline-flex ${className}`}>
      <Icon size={13} className="text-[#F7B31C]" /> {label}
    </span>
  );
}

function BuildArt() {
  const gallery = ["#FDE68A", "#99F6E4", "#C4B5FD", "#FBCFE8", "#BFDBFE", "#FED7AA"];
  return (
    <div className="relative flex min-h-[230px] flex-1 items-center justify-center">
      <div className="absolute inset-x-12 bottom-6 top-12 rounded-full bg-[#F7B31C]/10 blur-3xl" />
      <div className="relative w-[172px] rounded-[28px] bg-[#1E293B] p-2 shadow-2xl ring-1 ring-white/10 motion-safe:animate-[float_6s_ease-in-out_infinite]">
        <div className="overflow-hidden rounded-[26px] bg-white">
          <div className="h-16 bg-gradient-to-br from-[#F7B31C] to-[#D97706]" />
          <div className="-mt-8 flex flex-col items-center px-3 pb-4">
            <span className="h-14 w-14 rounded-full border-4 border-white bg-gradient-to-br from-[#0F172A] to-[#334155]" />
            <span className="mt-2 h-2 w-24 rounded bg-[#0F172A]" />
            <span className="mt-1.5 h-1.5 w-16 rounded bg-[#CBD5E1]" />
            <span className="mt-3 grid w-full grid-cols-3 gap-1.5">
              {["Call", "WhatsApp", "Save"].map((t) => (
                <span key={t} className={`rounded-lg py-1.5 text-center text-[8px] font-bold ${t === "WhatsApp" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#334155]"}`}>{t}</span>
              ))}
            </span>
            <span className="mt-3 grid w-full grid-cols-3 gap-1">
              {gallery.map((g) => <span key={g} className="aspect-square rounded-md" style={{ background: g }} />)}
            </span>
            <span className="mt-3 w-full space-y-1">
              <span className="block h-1.5 w-full rounded bg-[#E2E8F0]" />
              <span className="block h-1.5 w-4/5 rounded bg-[#E2E8F0]" />
            </span>
          </div>
        </div>
      </div>
      <FloatChip icon={Image} label="Gallery" className="left-[4%] top-[16%] -rotate-6 transition-transform duration-500 group-hover:-translate-y-1" />
      <FloatChip icon={Play} label="Video" className="right-[4%] top-[28%] rotate-3 transition-transform duration-500 group-hover:-translate-y-1" />
      <FloatChip icon={ShoppingBag} label="Products" className="bottom-[20%] left-[6%] rotate-2 transition-transform duration-500 group-hover:translate-y-1" />
      <span className="absolute bottom-[10%] right-[6%] hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F7B31C] to-[#FBBF24] px-3.5 py-2 text-xs font-bold text-[#0B1120] shadow-[0_10px_24px_-10px_rgba(247,179,28,0.9)] sm:inline-flex">
        <Zap size={13} /> Publish
      </span>
    </div>
  );
}

function ShareArt() {
  return (
    <div className="flex h-32 items-center justify-center gap-4">
      <div className="rounded-2xl bg-white p-3 shadow-lg ring-1 ring-[#E2E8F0] transition-transform duration-500 group-hover:-rotate-3 motion-reduce:transition-none">
        <div className="grid grid-cols-7 gap-[3px]">
          {FEATURE_QR.map((on, i) => <span key={i} className={`h-2 w-2 rounded-[2px] ${on ? "bg-[#0F172A]" : ""}`} />)}
        </div>
      </div>
      <div className="space-y-2">
        <p className="max-w-[160px] rounded-2xl rounded-bl-md bg-[#DCF8C6] px-2.5 py-1.5 text-[11.5px] leading-snug text-[#14532D] shadow-sm">
          Here's my digital card — tap to save my number.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0F766E]">
          <Check size={12} /> Contact saved
        </span>
      </div>
    </div>
  );
}

function LeadsArt() {
  const rows = [
    { who: "New enquiry", msg: "“Need cards for my whole team”", when: "now" },
    { who: "New enquiry", msg: "“Can you share your price list?”", when: "2m" },
  ];
  return (
    <div className="relative h-32">
      {rows.map((x, i) => (
        <div
          key={x.msg}
          className={`absolute inset-x-1 flex items-start gap-3 rounded-xl bg-white p-2.5 shadow-lg ring-1 ring-[#E2E8F0] transition-transform duration-500 motion-reduce:transition-none ${
            i === 0 ? "top-3 z-10 group-hover:-translate-y-1" : "top-[3.5rem] scale-[0.94] opacity-60"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]"><Users size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between text-[13px] font-semibold text-[#0F172A]">
              {x.who}<span className="text-[11px] font-medium text-[#94A3B8]">{x.when}</span>
            </span>
            <span className="block truncate text-[12px] text-[#64748B]">{x.msg}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function PayArt() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="w-full max-w-[200px] rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] p-3.5 text-white shadow-[0_18px_36px_-18px_rgba(190,24,93,0.8)] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none">
        <span className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/75">Pay on card</span>
          <Wallet size={15} className="text-white/80" />
        </span>
        <span className="mt-0.5 block text-xl font-extrabold tabular-nums">₹2,500</span>
        <span className="mt-3 flex gap-1.5">
          {["UPI", "GPay", "Paytm"].map((p) => <span key={p} className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{p}</span>)}
        </span>
      </div>
    </div>
  );
}

function GrowArt() {
  const bars = [38, 52, 45, 68, 60, 82, 96];
  return (
    <div className="flex h-32 flex-col rounded-2xl bg-[#F8FAFC] p-3.5 ring-1 ring-[#E2E8F0]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]"><Eye size={12} className="text-[#3B82F6]" /> Card views · 7 days</span>
      <span className="mt-3 flex flex-1 items-end gap-2">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-md transition-[filter] duration-300 ${i === bars.length - 1 ? "bg-[#3B82F6]" : "bg-[#3B82F6]/30 group-hover:bg-[#3B82F6]/45"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </span>
    </div>
  );
}

function AIArt() {
  return (
    <div className="h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-3.5 ring-1 ring-[#FDE68A]">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#B45309]"><Sparkles size={12} /> Writing your About</span>
      <span className="mt-1.5 block text-[12.5px] leading-snug text-[#78350F]">
        We help families find homes they love — with honest advice and site visits on your schedule
        <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-[#F59E0B] motion-safe:animate-pulse" />
      </span>
    </div>
  );
}

function FeaturesSection() {
  const [build, share, leads, pay, grow, ai, resell] = FEATURE_TILES;
  // /features lists 41 features (and its search description says so); these
  // tiles show the headline ones, so the badge quotes the full count.
  const FEATURE_COUNT = 41;

  return (
    <section className="relative overflow-hidden py-14 sm:py-16" id="features">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-40 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[#F7B31C]/[0.07] blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* The words "One Digital Card" sit on a small card of their own, so the
            heading shows the product rather than only naming it. */}
        <Reveal className="mx-auto mb-9 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 text-xs font-semibold text-[#92400E] shadow-premium ring-1 ring-[#FDE68A]">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F7B31C] to-[#FBBF24] px-2.5 py-1 text-[11px] font-bold text-[#0B1120]">
              <Sparkles size={12} /> {FEATURE_COUNT}
            </span>
            features in one card
          </span>

          <h2 className="mt-4 text-[1.6rem] font-extrabold leading-[1.2] tracking-tight text-[#0F172A] sm:text-[2.1rem] lg:text-[2.5rem]">
            <span className="block">Everything You Need</span>{" "}
            <span className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 sm:mt-2.5">
              <span>in</span>{" "}
              <span className="relative inline-flex -rotate-1 items-center gap-2.5 whitespace-nowrap rounded-xl bg-[#0B1120] px-3.5 py-1.5 shadow-[0_16px_30px_-16px_rgba(2,6,23,0.6)] ring-1 ring-white/10 transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none sm:gap-2.5 sm:rounded-2xl sm:py-1.5 sm:pl-3 sm:pr-4">
                <span aria-hidden="true" className="hidden h-6 w-8 shrink-0 grid-cols-3 gap-[2px] rounded-md bg-gradient-to-br from-[#FDE68A] to-[#D97706] p-1 sm:grid">
                  {Array.from({ length: 6 }, (_, i) => <span key={i} className="rounded-[2px] bg-[#0B1120]/20" />)}
                </span>
                <span className="text-gradient-gold">One Digital Card</span>
                <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#14B8A6] text-white shadow-lg ring-2 ring-[#F8FAFC]">
                  <Check size={14} />
                </span>
              </span>
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-[#64748B]">Grouped by what you want your card to do.</p>
          <ol className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {[
              { icon: CreditCard, label: "Build" },
              { icon: Share2, label: "Share" },
              { icon: Users, label: "Convert" },
              { icon: TrendingUp, label: "Grow" },
            ].map((s, i, all) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12.5px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0]">
                  <s.icon size={14} className="text-[#D97706]" /> {s.label}
                </span>
                {i < all.length - 1 && <ArrowRight aria-hidden="true" size={14} className="text-[#CBD5E1]" />}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal stagger className="grid gap-4 md:grid-cols-6 lg:grid-cols-12">
          <FeatureTileCard tile={build} dark className="md:col-span-6 lg:col-span-7 lg:row-span-2"><BuildArt /></FeatureTileCard>
          <FeatureTileCard tile={share} className="md:col-span-3 lg:col-span-5"><ShareArt /></FeatureTileCard>
          <FeatureTileCard tile={leads} className="md:col-span-3 lg:col-span-5"><LeadsArt /></FeatureTileCard>
          <FeatureTileCard tile={pay} className="md:col-span-2 lg:col-span-4"><PayArt /></FeatureTileCard>
          <FeatureTileCard tile={grow} className="md:col-span-2 lg:col-span-4"><GrowArt /></FeatureTileCard>
          <FeatureTileCard tile={ai} className="md:col-span-2 lg:col-span-4"><AIArt /></FeatureTileCard>

          {/* Reseller — a wide strip, text beside the drawing */}
          <article className="group relative overflow-hidden rounded-[22px] bg-[#0B1120] p-5 text-white shadow-[0_30px_60px_-30px_rgba(2,6,23,0.75)] sm:p-6 md:col-span-6 lg:col-span-12">
            <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#F7B31C]/15 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-[#14B8A6]/10 blur-3xl" />
            <div className="relative grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7B31C]/15 text-[#F7B31C]"><resell.icon size={17} /></span>
                  <h3 className="text-base font-bold tracking-tight">{resell.title}</h3>
                </div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[#94A3B8]">{resell.text}</p>
                <div className="mt-4"><FeatureChips tile={resell} dark /></div>
                <Link to="/resellers" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#F7B31C] hover:underline">
                  See the reseller program <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div aria-hidden="true" className="relative mx-auto flex h-32 w-full max-w-sm items-center justify-center">
                {[
                  { tone: "#0F766E", cls: "-translate-x-24 -rotate-12" },
                  { tone: "#7C3AED", cls: "translate-x-24 rotate-12" },
                  { tone: "#F7B31C", cls: "z-10 -translate-y-2" },
                ].map((c) => (
                  <span key={c.tone} className={`absolute w-40 rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-500 motion-reduce:transition-none ${c.cls}`}>
                    <span className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-full" style={{ background: c.tone }} />
                      <span className="flex-1 space-y-1">
                        <span className="block h-1.5 w-16 rounded bg-[#0F172A]" />
                        <span className="block h-1 w-10 rounded bg-[#CBD5E1]" />
                      </span>
                    </span>
                    <span className="mt-2.5 block h-1.5 w-full rounded bg-[#E2E8F0]" />
                    <span className="mt-1 block h-1.5 w-3/4 rounded bg-[#E2E8F0]" />
                  </span>
                ))}
                <span className="absolute -bottom-1 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#F7B31C] px-3 py-1 text-xs font-bold text-[#0B1120] shadow-lg">
                  <Building2 size={12} /> Your brand
                </span>
              </div>
            </div>
          </article>
        </Reveal>

        <div className="mt-8 text-center">
          <Link to="/features" className="btn-navy inline-flex h-10 items-center gap-2 px-5 text-sm">Explore all features <ChevronRight size={15} /></Link>
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
    <section className="pt-12 lg:pt-8 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-[#F7B31C]/8 rounded-full blur-3xl -translate-y-1/2" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Compact: the photo is cut off at the waist, so it stands on the section's
            bottom edge (no bottom padding, column aligned to the end) while the
            copy stays vertically centred. On mobile the copy comes first so the
            photo is still last, touching the bottom. */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-end">
          <Reveal className="relative flex justify-center order-2 lg:order-1">
            <picture>
              <source srcSet="/hero/digital-business-card-nfc-card-professional.webp" type="image/webp" />
              <img
                src="/hero/digital-business-card-nfc-card-professional.png"
                width="1100" height="1011"
                alt="Smiling professional holding a smartphone showing a DigitalCarda digital business card in one hand and a contactless NFC card with a QR code in the other"
                loading="lazy"
                className="block w-full max-w-[26rem] lg:max-w-none drop-shadow-2xl"
              />
            </picture>
            <div className="absolute bottom-8 left-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-bold text-[#F7B31C]">5,173+</p>
              <p className="text-[10px] text-[#94A3B8]">Active Digital Cards</p>
            </div>
            <div className="absolute top-10 right-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-bold text-[#14B8A6]">98%</p>
              <p className="text-[10px] text-[#94A3B8]">Client Satisfaction</p>
            </div>
          </Reveal>

          <Reveal className="order-1 lg:order-2 self-center lg:py-6">
            <p className="text-[#F7B31C] text-xs font-bold uppercase tracking-widest mb-2">Why DigitalCarda?</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">Inspire Your Client Digitally</h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              Forget old printed visiting cards that end up in the bin. Share contact info with one-click actions — Call, Email, WhatsApp, Maps, Bank Details, Website & Social Links — all from a single smart card.
            </p>
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-9 h-9 rounded-xl bg-[#F7B31C]/15 ring-1 ring-[#F7B31C]/20 flex items-center justify-center shrink-0 group-hover:bg-[#F7B31C] transition-colors">
                    <b.icon size={16} className="text-[#F7B31C] group-hover:text-[#0F172A] transition-colors" />
                  </div>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed pt-2">{b.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Link to="/features" className="h-11 px-6 inline-flex items-center gap-2 text-sm font-medium text-[#CBD5E1] border border-white/20 rounded-xl hover:bg-white/5 transition-all">See all features <ArrowRight size={14} /></Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── AI Section ─────────────────────────────────────────────
   Asymmetric on purpose: one hero tile that demonstrates the AI card
   generator, with the supporting tools as compact rows beside it —
   rather than eight identical cards in a row. */
function AISection() {
  const aiTools = [
    { icon: FileText, title: "AI About Us Writer", desc: "Compelling business descriptions, instantly." },
    { icon: ShoppingBag, title: "AI Product Copy", desc: "Product text that turns visitors into buyers." },
    { icon: Globe, title: "AI SEO Generator", desc: "Meta titles, descriptions and keywords." },
    { icon: MessageCircle, title: "AI FAQ Generator", desc: "Answer the questions customers actually ask." },
    { icon: Mail, title: "AI Lead Reply", desc: "Draft professional replies to captured leads." },
    { icon: Layers, title: "AI Translation", desc: "Publish your card in multiple languages." },
  ];
  const extracted = ["Logo", "Brand colours", "Services", "Contact details"];

  return (
    <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark opacity-30" />
      <div className="absolute top-0 right-0 w-[340px] h-[340px] bg-[#F7B31C]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[280px] h-[280px] bg-[#14B8A6]/10 rounded-full blur-3xl" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading eyebrow="AI Tools" title={<>Build Smarter Cards with <span className="text-gradient-gold">AI</span></>} subtitle="Paste a website and AI builds the card. Or let it write your bio, products, SEO and FAQs one section at a time." light />

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Hero tile — the generator, shown as a flow rather than described */}
          <Reveal className="lg:col-span-2">
            <div className="relative h-full rounded-3xl p-[1.5px] bg-gradient-to-br from-[#F7B31C] via-[#F7B31C]/25 to-[#14B8A6]/40">
              <div className="h-full rounded-[calc(1.5rem-1px)] bg-[#0B1222] p-6 flex flex-col">
                <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F7B31C]/15 text-[#F7B31C] ring-1 ring-[#F7B31C]/25">
                  <Sparkles size={11} /> Most loved
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-white leading-snug">AI Card Generator</h3>
                <p className="mt-2 text-[13px] text-[#94A3B8] leading-relaxed">Already have a website? Paste the link — AI reads it and builds a finished card for you.</p>

                {/* the flow */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                    <Globe size={15} className="text-[#14B8A6] shrink-0" />
                    <span className="text-[13px] text-white font-medium">nayarainteriors.in</span>
                    <span className="w-[2px] h-4 bg-[#F7B31C] animate-pulse rounded-full" />
                  </div>
                  <div className="flex justify-center"><ChevronRight size={16} className="text-[#475569] rotate-90" /></div>
                  <div className="flex flex-wrap gap-2">
                    {extracted.map((e) => (
                      <span key={e} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#14B8A6]/10 ring-1 ring-[#14B8A6]/25 text-[11px] font-semibold text-[#5EEAD4]">
                        <Check size={10} /> {e}
                      </span>
                    ))}
                  </div>
                </div>

                <Link to="/ai-card-generator" className="btn-gold mt-auto pt-0 h-12 flex items-center justify-center gap-2 !mt-7">
                  <Sparkles size={17} /> Try It Free
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Supporting tools — compact rows, two up */}
          <Reveal stagger className="lg:col-span-3 grid sm:grid-cols-2 gap-3.5 content-start">
            {aiTools.map((f) => (
              <div key={f.title} className="group flex items-start gap-3.5 rounded-2xl bg-white/[0.045] ring-1 ring-white/10 p-4 transition-all hover:bg-white/[0.08] hover:ring-[#F7B31C]/35 hover:-translate-y-0.5">
                <span className="w-10 h-10 rounded-xl bg-[#F7B31C]/15 ring-1 ring-[#F7B31C]/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#F7B31C]">
                  <f.icon size={17} className="text-[#F7B31C] transition-colors group-hover:text-[#0F172A]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-white leading-tight">{f.title}</h3>
                  <p className="mt-1 text-[12px] text-[#94A3B8] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </Reveal>
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
                          <picture>
                            {webpFor(feat) && <source srcSet={webpFor(feat)!} type="image/webp" />}
                            <img src={feat} alt={`${p.name} — digital business card`} loading="lazy" className="w-full h-full object-cover object-top" />
                          </picture>
                        </div>
                      : <TemplateThumb style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} name={p.name} />}
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

/* ─── Built for your profession ───────────────────────────────
   The conversion centrepiece: visitors pick their own trade and the
   pitch rewrites itself in place — a tailored headline, the objection
   that actually stops THEM, the four features that matter to them, and
   a card mock in their world. A generic "for everyone" pitch converts
   far worse than one the reader recognises as their own.

   Mechanics: a sliding active pill (measured, so it animates between
   tabs of different widths) and a keyed panel that re-mounts, so the
   content cross-fades on every switch. */
type Persona = {
  id: string; tab: string; short: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string; headline: string; pain: string; points: string[]; stat: string;
  card: { name: string; role: string; chips: string[] };
  /** Real card screenshot in a phone frame, public/hero/personas/<img>.{webp,png} (640x960, transparent). */
  img: string;
};

const PERSONAS: Persona[] = [
  {
    id: "clinics", tab: "Doctors & Clinics", short: "Doctors", icon: Plus, accent: "#14B8A6",
    headline: "Digital Visiting Card for Doctors & Clinics",
    pain: "Patients lose the paper slip with your OPD timings. Your card lives in their phone instead — timings, directions and a booking button always one tap away.",
    points: [
      "OPD timings and clinic address with one-tap directions",
      "Appointment requests straight to your WhatsApp",
      "Google review link that builds local trust",
      "Share reports, prescriptions and forms as PDFs",
    ],
    stat: "Timings, directions and bookings in one tap",
    card: { name: "Dr. Anita Sharma", role: "MD Physician · Sharma Clinic", chips: ["Call", "WhatsApp", "Directions"] },
    img: "digital-business-card-doctors-clinics",
  },
  {
    id: "realestate", tab: "Real Estate", short: "Real Estate", icon: MapPin, accent: "#F7B31C",
    headline: "Digital Business Card for Real Estate Agents",
    pain: "You meet twenty people at a site visit and hand out twenty cards. Send one link instead — with your live listings already inside it.",
    points: [
      "Property listings with photos, pricing and highlights",
      "One-tap site-visit booking over WhatsApp",
      "Google Maps directions to every project",
      "Every enquiry captured as a lead you can follow up",
    ],
    stat: "Listings, site visits and leads on one link",
    card: { name: "Rohit Malhotra", role: "Realtor · Malhotra Properties", chips: ["Listings", "Site Visit", "Directions"] },
    img: "digital-business-card-real-estate",
  },
  {
    id: "agencies", tab: "Agencies & Freelancers", short: "Agencies", icon: Monitor, accent: "#8B5CF6",
    headline: "Digital Business Card for Agencies & Freelancers",
    pain: "Your portfolio, your packages and your payment link should not need three different URLs and a follow-up email.",
    points: [
      "Portfolio gallery and showreel videos in one place",
      "Service packages with clear pricing",
      "UPI and payment links so you get paid faster",
      "Your own custom domain for a serious brand",
    ],
    stat: "Portfolio, services and enquiries on one link",
    card: { name: "Aarav Mehta", role: "Founder · Mehta Studio", chips: ["Portfolio", "Packages", "Pay Now"] },
    img: "digital-business-card-agencies-freelancers",
  },
  {
    id: "retail", tab: "Restaurants & Retail", short: "Retail", icon: ShoppingBag, accent: "#EC4899",
    headline: "Digital Card & QR Menu for Restaurants and Shops",
    pain: "One QR on the table can do the job of a menu, an offer board and a review request — without reprinting anything.",
    points: [
      "Menu and products with photos and live prices",
      "Today's offers, with an expiry date that self-removes",
      "UPI payment QR right at the counter",
      "Google review link that lifts your rating",
    ],
    stat: "Menu, offers and reviews one scan away",
    card: { name: "Spice Route", role: "Multi-cuisine · Zirakpur", chips: ["Menu", "Offers", "Pay via UPI"] },
    img: "digital-business-card-restaurants-retail",
  },
  {
    id: "salons", tab: "Salons & Wellness", short: "Salons", icon: Sparkles, accent: "#F97316",
    headline: "Digital Visiting Card for Salons & Spas",
    pain: "Clients rebook when booking takes one tap instead of one phone call they keep postponing.",
    points: [
      "Service menu with prices and duration",
      "WhatsApp booking in a single tap",
      "Before-and-after gallery of your work",
      "Packages and offers that bring clients back",
    ],
    stat: "Services, prices and bookings in one tap",
    card: { name: "Glow Studio", role: "Hair & Skin · Chandigarh", chips: ["Services", "Book Now", "Gallery"] },
    img: "digital-business-card-salons-spas",
  },
  {
    id: "coaches", tab: "Coaches & Consultants", short: "Coaches", icon: Users, accent: "#3B82F6",
    headline: "Digital Business Card for Coaches & Consultants",
    pain: "Your credibility is the product. Let people see it before the first call, not during it.",
    points: [
      "Programmes and packages with transparent pricing",
      "Testimonials and Google reviews front and centre",
      "Discovery calls booked over WhatsApp or a link",
      "Videos and free resources that build trust early",
    ],
    stat: "Programmes, reviews and calls on one link",
    card: { name: "Neha Kapoor", role: "Business Coach · Delhi", chips: ["Programmes", "Book Call", "Reviews"] },
    img: "digital-business-card-coaches-consultants",
  },
];

function PersonaSection() {
  const [active, setActive] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  // Measure the active tab so the pill can slide between tabs of different
  // widths (re-measured on resize and whenever the selection changes).
  useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[active];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  // Keep the chosen tab in view on narrow screens.
  useEffect(() => {
    const el = btnRefs.current[active];
    const strip = tabsRef.current;
    if (el && strip && strip.offsetParent) strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  const p = PERSONAS[active];
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setActive((i) => (i + d + PERSONAS.length) % PERSONAS.length);

  return (
    <section className="py-14 sm:py-20 bg-white relative overflow-hidden" id="built-for-you">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent" />
      <div
        className="absolute left-1/2 top-40 -translate-x-1/2 w-[760px] h-[400px] rounded-full blur-3xl pointer-events-none transition-colors duration-700"
        style={{ background: `${p.accent}14` }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          eyebrow="Built for you"
          title={<>Made for the Way <span className="text-gradient-gold">You Work</span></>}
          subtitle="Pick your line of work — the card, the features and the pitch change to match it."
        />

        {/* ── Phones & tablets: every industry visible at once ── */}
        <Reveal className="lg:hidden">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8] mb-3">Tap your industry</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3" role="tablist" aria-label="Choose your industry">
            {PERSONAS.map((x, i) => {
              const on = i === active;
              return (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="persona-panel"
                  onClick={() => setActive(i)}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-3 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] active:scale-95 ${on ? "bg-white shadow-premium" : "bg-[#F8FAFC] ring-1 ring-[#E2E8F0]"}`}
                  style={on ? { boxShadow: `0 0 0 2px ${x.accent}, 0 14px 28px -16px ${x.accent}` } : undefined}
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300"
                    style={{ background: on ? x.accent : `${x.accent}1A`, color: on ? "#fff" : x.accent }}
                  >
                    <x.icon size={19} />
                  </span>
                  <span className={`text-[12px] font-semibold leading-tight ${on ? "text-[#0F172A]" : "text-[#475569]"}`}>{x.short}</span>
                  {on && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white ring-2 ring-white" style={{ background: x.accent }}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* ── Desktop: persona tabs with a sliding indicator ── */}
        <Reveal className="hidden lg:block">
          <div ref={tabsRef} className="relative flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-[#F1F5F9] ring-1 ring-[#E2E8F0] mb-10">
            <span
              aria-hidden="true"
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-[#0F172A] shadow-premium transition-all duration-500"
              style={{ left: pill.left, width: pill.width, transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
            />
            {PERSONAS.map((x, i) => {
              const on = i === active;
              return (
                <button
                  key={x.id}
                  ref={(el) => { btnRefs.current[i] = el; }}
                  type="button"
                  onClick={() => setActive(i)}
                  onPointerEnter={() => { new window.Image().src = `/hero/personas/${x.img}.webp`; }}
                  onFocus={() => { new window.Image().src = `/hero/personas/${x.img}.webp`; }}
                  aria-pressed={on}
                  className={`relative z-10 shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-xl text-[13px] font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "text-white" : "text-[#475569] hover:text-[#0F172A]"}`}
                >
                  <x.icon size={15} className={on ? "" : "text-[#94A3B8]"} />
                  <span className="whitespace-nowrap">{x.tab}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* ── Phones & tablets: one swipeable spotlight card ── */}
        <div
          id="persona-panel"
          role="tabpanel"
          aria-label={p.tab}
          className="lg:hidden mt-6 relative rounded-[28px] bg-white ring-1 ring-[#E2E8F0] shadow-premium-lg overflow-hidden"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          {/* Stage: the real card, on the industry's colour */}
          <div key={`stage-${p.id}`} className="relative h-[300px] sm:h-[360px] overflow-hidden transition-colors duration-500" style={{ background: `linear-gradient(160deg, ${p.accent}33 0%, ${p.accent}0D 55%, #ffffff 100%)` }}>
            <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-40" />
            <div aria-hidden="true" className="absolute left-1/2 top-24 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl" style={{ background: `${p.accent}55` }} />

            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[12px] font-bold text-[#0F172A] shadow-sm">
                <p.icon size={13} className="shrink-0" />
                {p.tab}
              </span>
              <span className="rounded-full bg-[#0F172A]/80 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white tabular-nums">{active + 1}/{PERSONAS.length}</span>
            </div>

            <div className="absolute inset-x-0 top-14 flex justify-center">
              <picture className="dc-swap-in block w-[230px] sm:w-[270px]">
                <source srcSet={`/hero/personas/${p.img}.webp`} type="image/webp" />
                <img
                  src={`/hero/personas/${p.img}.png`}
                  width="640" height="960"
                  alt={`${p.card.name} — ${p.card.role}: a DigitalCarda digital business card for ${p.tab.toLowerCase()} on a smartphone`}
                  loading="lazy" decoding="async"
                  className="block w-full h-auto drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)]"
                />
              </picture>
            </div>
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />

            {/* Prev / next */}
            <button type="button" onClick={() => go(-1)} aria-label="Previous industry"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-[#0F172A] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next industry"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-[#0F172A] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <ChevronRight size={18} />
            </button>
          </div>

          <div key={`body-${p.id}`} className="dc-swap-in relative px-5 pb-6 -mt-4 sm:px-7">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: `${p.accent}1A`, color: "#0F172A", boxShadow: `inset 0 0 0 1px ${p.accent}40` }}>
              <Zap size={12} style={{ color: p.accent }} /> {p.stat}
            </span>
            <h3 className="mt-3 text-[1.35rem] sm:text-2xl font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">{p.headline}</h3>
            <p className="mt-2 text-[14px] text-[#64748B] leading-relaxed">{p.pain}</p>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">What your card does</p>
            <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {p.points.map((pt, i) => (
                <li key={pt} className="flex items-start gap-3 rounded-2xl bg-[#F8FAFC] ring-1 ring-[#F1F5F9] px-3.5 py-3">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-extrabold text-white tabular-nums" style={{ background: p.accent }}>{i + 1}</span>
                  <span className="text-[13.5px] text-[#334155] leading-snug">{pt}</span>
                </li>
              ))}
            </ul>

            {/* Progress dots */}
            <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
              {PERSONAS.map((x, i) => (
                <span key={x.id} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === active ? 22 : 6, background: i === active ? p.accent : "#E2E8F0" }} />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link to="/signup" className="h-12 inline-flex items-center justify-center gap-1.5 rounded-xl gradient-gold text-[#0F172A] text-[14px] font-bold active:scale-[0.98] transition-transform">
                Create my card <ArrowRight size={15} />
              </Link>
              <Link to="/industries" className="h-12 inline-flex items-center justify-center gap-1 rounded-xl border border-[#E2E8F0] text-[14px] font-semibold text-[#475569] active:bg-[#F8FAFC]">
                All industries <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Desktop: one shell, content swapped — keyed so it re-mounts and cross-fades ── */}
        <div key={p.id} className="hidden lg:grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="dc-swap-in">
            <h3 className="text-2xl sm:text-[2rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">{p.headline}</h3>
            <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">{p.pain}</p>

            <div className="mt-7 space-y-3.5">
              {p.points.map((pt) => (
                <div key={pt} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${p.accent}1F`, color: p.accent }}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-[14px] text-[#334155] leading-relaxed">{pt}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 ring-1" style={{ background: `${p.accent}12`, borderColor: "transparent", boxShadow: `inset 0 0 0 1px ${p.accent}33` }}>
              <Zap size={15} style={{ color: p.accent }} />
              <span className="text-[13px] font-bold text-[#0F172A]">{p.stat}</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/industries" className="h-12 px-6 inline-flex items-center gap-2 text-sm font-semibold text-[#475569] border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-all">
                See more industries <ChevronRight size={15} />
              </Link>
            </div>
          </div>

          {/* The real card for that persona, in a phone frame */}
          <div className="dc-swap-in dc-swap-d1 flex justify-center">
            <div className="relative w-full max-w-[300px] sm:max-w-[320px]">
              <div className="absolute inset-x-6 top-16 bottom-10 rounded-[3rem] blur-3xl opacity-70 transition-colors duration-700" style={{ background: `${p.accent}33` }} />
              <picture>
                <source srcSet={`/hero/personas/${p.img}.webp`} type="image/webp" />
                <img
                  src={`/hero/personas/${p.img}.png`}
                  width="640" height="960"
                  alt={`${p.card.name} — ${p.card.role}: a DigitalCarda digital business card for ${p.tab.toLowerCase()} on a smartphone`}
                  loading="lazy" decoding="async"
                  className="relative block w-full h-auto drop-shadow-[0_24px_40px_rgba(15,23,42,0.18)]"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ───
   Dark on purpose: it follows light sections, and the step illustrations sit
   on cream discs so their navy line-work still reads. The steps are a real
   sequence, so the big 01 / 02 / 03 numerals carry information. */
function HowItWorksSection() {
  const steps = [
    {
      num: 1, img: "/step-create.png", chip: "About 2 minutes", chipIcon: Clock,
      alt: "Creating a digital business card on a tablet by filling in your name and designation",
      title: "Pick. Fill. Done.",
      desc: "Choose one of 50+ templates, add your details and make it yours — no designer needed.",
    },
    {
      num: 2, img: "/step-save.png", chip: "Updates live", chipIcon: Zap,
      alt: "Saving a digital visiting card to a phone and a laptop",
      title: "Always in your pocket",
      desc: "Save it to your phone, tablet or desktop. Change a detail once and every shared link updates.",
    },
    {
      num: 3, img: "/step-share.png", chip: "WhatsApp · QR · Email", chipIcon: Share2,
      alt: "Sharing a digital business card by WhatsApp, email, QR code and social media",
      title: "One tap, everywhere",
      desc: "Send it on WhatsApp, by email, as a QR code or on social media — people save you in a tap.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0B1120] py-14 sm:py-16">
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#F7B31C]/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[#14B8A6]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7B31C]/10 px-3 py-1 text-xs font-semibold text-[#F7B31C] ring-1 ring-[#F7B31C]/20">
            <Zap size={12} /> How it works
          </span>
          <h2 className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
            Live before your{" "}
            <span className="relative inline-block whitespace-nowrap text-gradient-gold">
              chai gets cold
              <svg aria-hidden="true" className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none">
                <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
              </svg>
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#94A3B8]">
            Three steps. About two minutes. No printing, no app to install.
          </p>
        </Reveal>

        <Reveal stagger className="relative mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((s, i) => (
            <article
              key={s.num}
              className="group relative flex flex-col rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06] hover:ring-[#F7B31C]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-3 select-none font-display text-5xl font-extrabold leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(247,179,28,0.35)] transition-colors duration-300 group-hover:[-webkit-text-stroke:1.5px_rgba(247,179,28,0.7)]"
              >
                0{s.num}
              </span>

              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[#FFF7E6] to-[#FDE68A] p-2 shadow-[0_14px_28px_-16px_rgba(247,179,28,0.7)] ring-4 ring-white/5 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transition-none">
                <img src={s.img} alt={s.alt} width={80} height={80} loading="lazy" className="h-full w-full object-contain" />
              </div>

              <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-[#F7B31C]/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#F7B31C] ring-1 ring-[#F7B31C]/20">
                <s.chipIcon size={12} /> {s.chip}
              </span>
              <h3 className="mt-2 text-[17px] font-bold tracking-tight text-white">
                <span className="sr-only">Step {s.num}: </span>{s.title}
              </h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#94A3B8]">{s.desc}</p>

              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-[16px] top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#F7B31C] text-[#0B1120] shadow-[0_0_0_6px_#0B1120] md:flex"
                >
                  <ArrowRight size={16} />
                </span>
              )}
            </article>
          ))}
        </Reveal>

        <Reveal className="mt-8 flex flex-col items-center gap-3.5">
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link to="/signup" className="btn-gold inline-flex h-11 w-full items-center justify-center gap-2 px-6 text-[15px] sm:w-auto">
              Create my card free <ArrowRight size={17} />
            </Link>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-[#94A3B8]">
            {["30 days free", "No card details needed", "Update anytime"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-[#4ADE80]" /> {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Analytics ──────────────────────────────────────────────
   A page selling analytics should SHOW analytics: a real product shot of the
   card next to its dashboard (views, visitors, actions, enquiries, activity,
   top sections, devices), then the trackable metrics as chips. */
function AnalyticsSection() {
  const tracked = [
    { icon: Eye, label: "Total Views" }, { icon: Users, label: "Unique Visitors" },
    { icon: Phone, label: "Call Clicks" }, { icon: MessageCircle, label: "WhatsApp Clicks" },
    { icon: Mail, label: "Email Clicks" }, { icon: QrCode, label: "QR Scans" },
    { icon: Globe, label: "Lead Forms" }, { icon: Share2, label: "Source Tracking" },
    { icon: Smartphone, label: "Device Reports" }, { icon: TrendingUp, label: "Monthly Growth" },
  ];
  return (
    <section className="py-14 sm:py-20 bg-gradient-to-b from-white to-[#F8FAFC] relative overflow-hidden">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[#F7B31C]/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:items-center">
        <div>
          {/* Phones: centred heading. Laptops: left column beside the dashboard. */}
          <div className="lg:hidden">
            <SectionHeading eyebrow="Analytics" title={<>Track Every <span className="text-gradient-gold">Click and Lead</span></>} subtitle="Know exactly how customers interact with your card — views, WhatsApp and call clicks, QR scans, product views and enquiries." />
          </div>
          <Reveal className="hidden lg:block">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E]"><BarChart3 size={12} /> Analytics</span>
            <h2 className="mt-4 text-[2.4rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.1]">Track Every <span className="text-gradient-gold">Click and Lead</span></h2>
            <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">Know exactly how customers interact with your card — views, WhatsApp and call clicks, QR scans, product views and enquiries.</p>
          </Reveal>
          <Reveal stagger className="hidden lg:grid mt-7 grid-cols-2 gap-2">
            {tracked.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-2.5 h-11 px-3 rounded-xl bg-white ring-1 ring-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:ring-[#F7B31C]/50 hover:-translate-y-0.5 transition-all">
                <span className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><s.icon size={14} className="text-[#B45309]" /></span> {s.label}
              </span>
            ))}
          </Reveal>
        </div>
        <Reveal>
          <div className="relative rounded-[28px] bg-white ring-1 ring-[#EEF2F7] shadow-premium-lg overflow-hidden p-2 sm:p-3">
            <picture>
              <source srcSet="/hero/digital-business-card-analytics-dashboard.webp" type="image/webp" />
              <img
                src="/hero/digital-business-card-analytics-dashboard.png"
                width="1400" height="1075"
                alt="DigitalCarda analytics dashboard beside a digital business card on a phone — card views, unique visitors, actions taken, enquiries, a 7-day activity chart, top sections and devices"
                loading="lazy" decoding="async"
                className="w-full h-auto rounded-[20px]"
              />
            </picture>
          </div>
        </Reveal>
        <Reveal stagger className="lg:hidden mt-8 flex flex-wrap justify-center gap-2.5">
          {tracked.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white ring-1 ring-[#E2E8F0] shadow-premium text-[13px] font-medium text-[#334155]">
              <s.icon size={14} className="text-[#B45309]" /> {s.label}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ─── QR & NFC ───
   Desktop: copy beside the standee. Phones: the same promise told as a
   story — the standee first, then "scan or tap", where it goes, and why the
   QR never needs reprinting — so it reads at a glance instead of as a wall
   of text and ticks. */
const QR_STANDEE = () => (
  <>
    <style>{STANDEE_STYLES}</style>
    <div className="dc-qr-scan" dangerouslySetInnerHTML={{ __html: standeeMarkup({
      brandName: "Aarav Mehta",
      subtitle: "Founder · Mehta & Co.",
      phone: "+91 98765 43210",
      linkText: "digitalcarda.in/aarav",
      prompt: "Scan to view my digital card",
      qrSrc: `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=12&format=png&data=${encodeURIComponent("https://digitalcarda.in/digital-business-cards-templates")}&color=0F172A&bgcolor=FFFFFF`,
    }) }} />
  </>
);

/* The standee is designed at 400px wide. Squeezing it narrower wraps its text
   and shrinks nothing else, so on phones it's rendered at full size and scaled
   down as a whole — it looks exactly like the one customers download. */
const STANDEE_W = 400;
function ScaledStandee({ max = 290 }: { max?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 0.7, h: 0 });
  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const w = Math.min(outer.current.clientWidth, max);
      const scale = Math.min(1, w / STANDEE_W);
      setBox({ scale, h: inner.current.offsetHeight * scale });
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [max]);
  return (
    <div ref={outer} className="w-full flex justify-center">
      <div className="relative" style={{ width: STANDEE_W * box.scale, height: box.h || undefined }}>
        <div ref={inner} className="absolute left-0 top-0 origin-top-left" style={{ width: STANDEE_W, transform: `scale(${box.scale})` }}>
          <QR_STANDEE />
        </div>
      </div>
    </div>
  );
}

const QR_PLACES = [
  { icon: CreditCard, label: "Visiting cards & brochures", accent: "#F7B31C" },
  { icon: ShoppingBag, label: "Counters & packaging", accent: "#EC4899" },
  { icon: MessageCircle, label: "WhatsApp, email & SMS", accent: "#22C55E" },
  { icon: Globe, label: "Website & social media", accent: "#3B82F6" },
];

function QRNFCSection() {
  return (
    <section className="py-14 sm:py-20 bg-[#F8FAFC] relative overflow-hidden">
      {/* ── Phones & tablets ── */}
      <div className="lg:hidden relative max-w-xl mx-auto px-4 sm:px-6">
        <div aria-hidden="true" className="absolute -top-10 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-[#14B8A6]/10 blur-3xl pointer-events-none" />

        <Reveal className="relative text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#CCFBF1] text-[#115E59]">
            <ScanLine size={12} /> QR &amp; NFC
          </span>
          <h2 className="mt-3 text-[1.9rem] leading-[1.12] font-extrabold text-[#0F172A] tracking-tight">
            Share Faster with <span className="text-gradient-gold">QR and NFC</span>
          </h2>
          <p className="mt-3 text-[15px] text-[#64748B] leading-relaxed">
            No typing numbers. People <b className="text-[#0F172A]">scan</b> or <b className="text-[#0F172A]">tap</b> — your card opens instantly.
          </p>
        </Reveal>

        {/* The real standee design, scaled as one piece so it keeps its proportions */}
        <Reveal className="relative mt-7">
          <ScaledStandee />
        </Reveal>

        {/* Scan or tap */}
        <Reveal stagger className="relative mt-8 grid grid-cols-2 gap-3">
          {[
            { icon: QrCode, title: "Scan", text: "Any phone camera reads your QR — no app needed.", tone: "#0F172A", bg: "bg-[#0F172A]", fg: "text-white", sub: "text-[#94A3B8]", iconBg: "bg-[#F7B31C] text-[#0F172A]" },
            { icon: Nfc, title: "Tap", text: "Put your link on an NFC card; a tap on the phone opens it.", tone: "#14B8A6", bg: "bg-white ring-1 ring-[#E2E8F0]", fg: "text-[#0F172A]", sub: "text-[#64748B]", iconBg: "bg-[#CCFBF1] text-[#0F766E]" },
          ].map((m) => (
            <div key={m.title} className={`relative rounded-[22px] p-4 overflow-hidden shadow-premium ${m.bg}`}>
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${m.iconBg}`}><m.icon size={22} /></span>
              <p className={`mt-3 font-display text-[1.35rem] font-extrabold leading-none ${m.fg}`}>{m.title}</p>
              <p className={`mt-1.5 text-[12.5px] leading-snug ${m.sub}`}>{m.text}</p>
            </div>
          ))}
        </Reveal>

        {/* Where it goes */}
        <Reveal className="relative mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8] text-center">Put it everywhere</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {QR_PLACES.map((pl) => (
              <div key={pl.label} className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-[#EEF2F7] px-3 py-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${pl.accent}1A`, color: pl.accent }}>
                  <pl.icon size={17} />
                </span>
                <span className="text-[12.5px] font-semibold text-[#334155] leading-tight">{pl.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* The reassurance */}
        <Reveal className="relative mt-4">
          <div className="relative rounded-[22px] bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]/60 ring-1 ring-[#F7B31C]/30 p-4 flex items-start gap-3 overflow-hidden">
            <span className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 text-[#B45309]"><Shield size={19} /></span>
            <div>
              <p className="text-[14px] font-bold text-[#0F172A]">Print once. It never breaks.</p>
              <p className="mt-0.5 text-[12.5px] text-[#78350F]/80 leading-snug">Your link is permanent — change your details or redesign your card and the same QR keeps working.</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="relative mt-6 grid grid-cols-2 gap-2.5">
          <Link to="/signup" className="h-12 inline-flex items-center justify-center gap-1.5 rounded-xl gradient-gold text-[#0F172A] text-[14px] font-bold active:scale-[0.98] transition-transform">
            Get my QR <ArrowRight size={15} />
          </Link>
          <Link to="/features" className="h-12 inline-flex items-center justify-center gap-1 rounded-xl border border-[#E2E8F0] bg-white text-[14px] font-semibold text-[#475569] active:bg-[#F8FAFC]">
            Sharing features <ChevronRight size={15} />
          </Link>
        </Reveal>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
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
            <div className="mt-7"><Link to="/features" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B45309] hover:underline">See every sharing feature <ArrowRight size={15} /></Link></div>
          </Reveal>
          <Reveal className="flex justify-center">
            <div className="relative w-full max-w-[340px]">
              <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-[#F7B31C]/15 blur-3xl" />
              <div className="relative"><ScaledStandee max={320} /></div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Where to use the card link ───────────────────────────────
   Answer-engine content: a short, quotable answer block plus concrete
   placements. Written so Google AI Overviews / ChatGPT / Perplexity can
   lift a clean answer and cite us, and mirrored into FAQPage JSON-LD
   (schema text stays identical to the visible copy).

   Laid out as an editorial two-column list rather than another card
   grid — the page already has several of those. */
const LINK_ANSWER =
  "You can use a digital business card link anywhere you would normally hand over contact details — in email signatures, WhatsApp and SMS, social media bios, video-call backgrounds, printed material and packaging, your website, your Google Business Profile, listing and job portals, event badges and standees, invoices, and paid ad campaigns.";

const LINK_PLACEMENTS = [
  { icon: Mail, title: "Email Signature", desc: "Under every outgoing email, quietly capturing leads.", accent: "#F7B31C" },
  { icon: MessageCircle, title: "WhatsApp & SMS", desc: "Chats, broadcasts and your WhatsApp Business profile.", accent: "#22C55E" },
  { icon: Link2, title: "Social Media Bios", desc: "Your single link-in-bio on Instagram, LinkedIn and X.", accent: "#8B5CF6" },
  { icon: Monitor, title: "Video Call Backgrounds", desc: "A QR in your Zoom, Meet or Teams background.", accent: "#3B82F6" },
  { icon: FileDown, title: "Print & Packaging", desc: "Visiting cards, brochures, flyers, packaging, signage.", accent: "#EC4899" },
  { icon: Globe, title: "Website & Blog", desc: "Header, footer, author bio or Contact Us page.", accent: "#0EA5E9" },
  { icon: MapPin, title: "Google Business Profile", desc: "As your website or appointment link for local search.", accent: "#EF4444" },
  { icon: Building2, title: "Listing & Job Portals", desc: "IndiaMART, JustDial, Naukri — where one link is allowed.", accent: "#F97316" },
  { icon: ScanLine, title: "Events & Exhibitions", desc: "Badges, standees and stall banners people scan.", accent: "#6366F1" },
  { icon: FileText, title: "Invoices & Quotations", desc: "So clients can reach you straight from the document.", accent: "#0F766E" },
  { icon: TrendingUp, title: "Ads & Campaigns", desc: "The landing link for Google, Meta and WhatsApp ads.", accent: "#D97706" },
];

function WhereToUseSection() {
  // This section's question is published in the page's single FAQPage (see
  // FaqSection). It used to emit a second FAQPage block; one URL carrying two
  // is invalid structured data and loses FAQ eligibility for both.

  const half = Math.ceil(LINK_PLACEMENTS.length / 2);
  const columns = [LINK_PLACEMENTS.slice(0, half), LINK_PLACEMENTS.slice(half)];

  return (
    <section className="py-20 bg-white relative overflow-hidden" id="where-to-use">
      <div className="absolute -left-24 top-1/3 w-[420px] h-[420px] bg-[#14B8A6]/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12">

          {/* Intro + the quotable answer, held at the top on desktop */}
          <Reveal className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-[#FEF3C7] text-[#92400E]">
                <Sparkles size={12} /> Share Anywhere
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
                Where to Use Your <span className="text-gradient-gold">Digital Card Link</span>
              </h2>
              <p className="mt-4 text-base text-[#64748B] leading-relaxed">
                One link replaces every paper card. These are the places it earns you the most contacts.
              </p>

              <div className="relative mt-7 rounded-2xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0] p-5 pl-6 overflow-hidden">
                <span aria-hidden="true" className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[#F7B31C] to-[#D97706]" />
                <p className="text-[14.5px] leading-relaxed text-[#334155]">{LINK_ANSWER}</p>
              </div>

            </div>
          </Reveal>

          {/* The placements — hairline list, two up */}
          <Reveal stagger className="lg:col-span-7 grid sm:grid-cols-2 gap-x-8 gap-y-0 content-start">
            {columns.map((col, ci) => (
              <div key={ci} className="divide-y divide-[#EEF2F7]">
                {col.map(({ icon: Icon, title, desc, accent }) => (
                  <div key={title} className="group flex items-start gap-3.5 py-4 first:pt-0">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{ background: `${accent}16`, color: accent }}>
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-[14px] font-bold text-[#0F172A] leading-tight">{title}</h3>
                      <p className="mt-1 text-[12.5px] text-[#64748B] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Custom Domain ─── */
/* ─────────────────────────────────────────────────────────────
   Testimonials
   ───────────────────────────────────────────────────────────── */

/* Navy or white initial on the accent, whichever has the higher WCAG contrast. */
const inkOn = (hex: string) => {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (L + 0.05) / 0.062 >= 1.05 / (L + 0.05) ? "#0F172A" : "#fff";
};

function TestimonialCard({ t, copy = false }: { t: (typeof TESTIMONIALS)[number]; copy?: boolean }) {
  return (
    <figure aria-hidden={copy || undefined} className="relative flex w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-premium ring-1 ring-[#EEF2F7] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none">
      {/* A soft glow in the business's own colour */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-[0.14] blur-2xl" style={{ background: t.accent }} />
      <div className="relative flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${t.accent}1f` }}>
          <Quote size={15} style={{ color: t.accent }} aria-hidden="true" />
        </span>
        <span className="flex gap-0.5" role="img" aria-label="Rated 5 out of 5">
          {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[#F7B31C] text-[#F7B31C]" aria-hidden="true" />)}
        </span>
      </div>
      <blockquote className="relative mt-3 text-[14px] leading-relaxed text-[#334155]">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="relative mt-auto flex items-center gap-2.5 pt-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold"
          style={{ background: t.accent, color: inkOn(t.accent), boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${t.accent}55` }}
          aria-hidden="true"
        >
          {t.name.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold leading-tight text-[#0F172A]">{t.name}</span>
          <span className="block text-[11.5px] text-[#64748B]">{t.role}</span>
        </span>
      </figcaption>
    </figure>
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
            <div className="px-6 pb-6 mt-auto"><Link to="/refer-earn" className="text-sm font-bold text-[#D97706] inline-flex items-center gap-1 group-hover:gap-2 transition-all">See how referrals work <ArrowRight size={15} /></Link></div>
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

/* Phones: the reviews as a "stories" deck — one big quote at a time with
   progress bars that auto-advance (paused while touched, off-screen or with
   reduced motion), tap left/right or swipe to move, and every business as an
   avatar you can jump to. Desktop keeps the scrolling marquee. */
const STORY_MS = 6000;

function TestimonialStories() {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; t: number } | null>(null);
  const n = TESTIMONIALS.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    setReduce(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const t = TESTIMONIALS[i];
  const next1 = TESTIMONIALS[(i + 1) % n];
  const next2 = TESTIMONIALS[(i + 2) % n];
  const running = visible && !held && !reduce;

  return (
    <div ref={ref} className="relative px-4 sm:px-6 max-w-md mx-auto">
      {/* Deck */}
      <div className="relative pt-3 pb-6">
        <div aria-hidden="true" className="absolute inset-x-8 top-0 bottom-2 rounded-[28px] rotate-[4deg] opacity-60 transition-colors duration-500" style={{ background: `${next2.accent}33` }} />
        <div aria-hidden="true" className="absolute inset-x-5 top-1.5 bottom-4 rounded-[28px] -rotate-[3deg] transition-colors duration-500" style={{ background: `${next1.accent}40` }} />

        <figure
          className="relative rounded-[28px] bg-[#0F172A] text-white shadow-premium-lg overflow-hidden select-none"
          onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, t: Date.now() }; setHeld(true); }}
          onTouchEnd={(e) => {
            setHeld(false);
            const st = touch.current; touch.current = null;
            if (!st) return;
            const dx = e.changedTouches[0].clientX - st.x;
            if (Math.abs(dx) > 45) { go(dx < 0 ? 1 : -1); return; }
            if (Date.now() - st.t < 250) {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              go(e.changedTouches[0].clientX - r.left < r.width / 3 ? -1 : 1);
            }
          }}
          onTouchCancel={() => { setHeld(false); touch.current = null; }}
        >
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
          <div aria-hidden="true" className="absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40 transition-colors duration-700" style={{ background: t.accent }} />
          <div aria-hidden="true" className="absolute -bottom-28 -left-16 w-60 h-60 rounded-full blur-3xl bg-[#F7B31C]/10" />

          {/* Story progress */}
          <div className="relative flex gap-1.5 px-5 pt-5" aria-hidden="true">
            {TESTIMONIALS.map((x, k) => (
              <span key={x.name} className="h-[3px] flex-1 rounded-full bg-white/15 overflow-hidden">
                {k < i && <span className="block h-full w-full bg-white/80" />}
                {k === i && (
                  <span
                    key={`p-${i}`}
                    className="block h-full w-full bg-white origin-left"
                    style={{
                      animation: reduce ? undefined : `dc-story ${STORY_MS}ms linear forwards`,
                      animationPlayState: running ? "running" : "paused",
                      transform: reduce ? "scaleX(1)" : undefined,
                    }}
                    onAnimationEnd={() => go(1)}
                  />
                )}
              </span>
            ))}
          </div>

          <div key={t.name} className="dc-swap-in relative px-6 pt-6 pb-6 min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${t.accent}26` }}>
                <Quote size={24} style={{ color: t.accent }} />
              </span>
              <span className="flex gap-0.5" role="img" aria-label="Rated 5 out of 5">
                {[...Array(5)].map((_, k) => <Star key={k} size={15} className="fill-[#F7B31C] text-[#F7B31C]" />)}
              </span>
            </div>

            <blockquote className="mt-5 font-display text-[1.28rem] leading-[1.4] font-semibold tracking-tight text-white">
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            <figcaption className="mt-auto pt-6 flex items-center gap-3">
              <span className="w-12 h-12 rounded-full flex items-center justify-center text-[#0F172A] font-extrabold text-lg shrink-0 ring-2 ring-white/20" style={{ background: t.accent }}>
                {t.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-white">{t.name}</span>
                <span className="block text-[12.5px] text-[#94A3B8]">{t.role}</span>
              </span>
              <span className="ml-auto text-[11px] font-bold text-[#94A3B8] tabular-nums">{i + 1}/{n}</span>
            </figcaption>
          </div>
        </figure>
      </div>

      {/* Who's talking — jump to anyone */}
      <div className="flex items-center justify-center gap-2.5" role="tablist" aria-label="Choose a review">
        {TESTIMONIALS.map((x, k) => {
          const on = k === i;
          return (
            <button
              key={x.name}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${x.name}, ${x.role}`}
              onClick={() => setI(k)}
              className={`rounded-full flex items-center justify-center font-extrabold text-[#0F172A] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "w-12 h-12 text-base" : "w-9 h-9 text-[13px] opacity-60"}`}
              style={{ background: x.accent, boxShadow: on ? `0 0 0 3px #fff, 0 0 0 5px ${x.accent}` : undefined }}
            >
              {x.name.charAt(0)}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11.5px] text-[#94A3B8]">Tap the sides or swipe · hold to pause</p>
    </div>
  );
}

function TestimonialsSection() {
  // One row of compact white cards. The track is the reviews four times over:
  // two identical halves, each wider than a 1920px screen, so the -50% loop
  // never shows a gap. Hovering pauses it.
  const loop = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="relative py-12 sm:py-16 overflow-hidden bg-gradient-to-b from-white via-[#FFFBEB]/70 to-white">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-20 h-64 w-[46rem] -translate-x-1/2 rounded-full bg-[#F7B31C]/10 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Testimonials" title="They Say We Did a Great Job" subtitle="Businesses across India have replaced paper cards with DigitalCarda — here's what they think." />
      </div>

      <div className="md:hidden">
        <TestimonialStories />
      </div>

      <div className="relative hidden md:block mask-fade-x">
        {/* Only the first pass is read out; the copies just loop the scroll.
            pr-4 matches the gap so the -50% loop point lands exactly on a card. */}
        <div className="marquee-track gap-4 py-2 pr-4" style={{ animationDuration: "110s" }}>
          {loop.map((t, i) => <TestimonialCard key={i} t={t} copy={i >= TESTIMONIALS.length} />)}
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
    { name: "Free Trial", price: "₹0", period: "30 Days", popular: false, cta: "Start Free for 30 Days", href: "/signup?promo=FREE30D", features: ["Full Gold features", "1 Digital Card", "All 50+ templates", "No payment required", "Live in minutes"] },
    { name: "Gold", price: "₹999", period: "/ year", popular: true, cta: "Get Gold", features: ["1 Digital Card", "Products & Services", "Gallery, Videos & Offers", "QR & UPI Payments", "Enquiry Form + Leads", "Full Analytics", "Custom URL & Colours"] },
    { name: "Platinum", price: "₹1,999", period: "/ year", popular: false, cta: "Go Platinum", features: ["Everything in Gold", "Up to 3 Cards", "Unlimited Products & Offers", "Remove Branding", "Custom Domain + SEO", "AI Content Tools", "Priority Support"] },
  ];
  return (
    <section className="py-20 bg-[#F8FAFC]" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Pricing" title="Simple Pricing for Every Business" subtitle="Choose the plan that fits your needs. Start a 30-day free trial — ₹0, with no payment required." />
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
              <Link to={(plan as { href?: string }).href ?? "/signup"} className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-all ${plan.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:border-[#F7B31C]/40"}`}>
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
/* ─── FAQ ─────────────────────────────────────────────────────
   Doing two jobs at once: it answers the objections that actually stop
   a signup (cost, app install, technical skill, permanence), and it
   targets the question queries people type before they buy. Answers are
   written answer-first so AI Overviews can lift a clean sentence, and
   mirrored into FAQPage JSON-LD with identical text. */
const FAQS = [
  {
    q: "What is a digital business card?",
    a: "A digital business card is a shareable web page that holds your contact details, services, payment options and links in one place. You share it as a link or QR code, and the person opens it instantly — nothing is printed and nothing is installed.",
  },
  {
    q: "Does the other person need an app to open my card?",
    a: "No. Your card opens in any web browser on any phone, tablet or laptop. Neither you nor the person receiving it needs to download an app or create an account, which is why cards get opened far more often than a PDF or a contact file.",
  },
  {
    q: "How much does a digital business card cost in India?",
    a: "DigitalCarda plans start at Rs. 99 per month, and you can start a 30-day free trial without entering card details upfront. Compared with reprinting paper visiting cards every time a number, address or designation changes, a digital card usually pays for itself in the first year.",
  },
  {
    q: "Do I need any technical or design skills?",
    a: "No. You pick a ready template, add your details, and publish — most people publish their card in about two minutes. AI can also write your about section, service descriptions and SEO text for you, and you can paste your website link to have a full card generated automatically.",
  },
  {
    q: "If I redesign my card later, does my QR code stop working?",
    a: "No. Your QR code and link point to a permanent address, so you can change the design, template, phone number or content as often as you like and everything you already printed keeps working. That is the main advantage over paper cards.",
  },
  {
    q: "Can I use my own domain and branding?",
    a: "Yes. You can connect your own domain or subdomain, apply your brand colours and logo, and remove template styling so the card looks like part of your own website. Agencies and resellers can also white-label the whole platform for their clients.",
  },
  {
    q: "Can I see who viewed my digital card?",
    a: "Yes. You get analytics for card views, unique visitors, call and WhatsApp clicks, QR scans, enquiry form submissions, device type and traffic source — so you can tell which sharing channel actually brings you business.",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    ...FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
    // The "where to use your card link" answer block, higher up the page.
    {
      "@type": "Question",
      name: "Where can I use a digital business card link?",
      acceptedAnswer: { "@type": "Answer", text: LINK_ANSWER },
    },
  ],
};

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20 bg-[#F8FAFC] relative overflow-hidden" id="faq">
      <JsonLd id="dc-faq-ld" data={FAQ_LD} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          eyebrow="Questions"
          title={<>Everything You Might Be <span className="text-gradient-gold">Wondering</span></>}
          subtitle="The things people ask us most before they start."
        />

        <Reveal stagger className="space-y-3">
          {FAQS.map((f, i) => {
            const on = open === i;
            return (
              <div key={f.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/45 shadow-premium-lg" : "ring-[#E2E8F0] shadow-premium hover:ring-[#CBD5E1]"}`}>
                <button
                  type="button"
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  className="w-full flex items-center gap-4 text-left px-5 sm:px-6 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] rounded-2xl"
                >
                  <h3 className="flex-1"><span className="dc-faq-q">{f.q}</span></h3>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${on ? "bg-[#F7B31C] text-[#0F172A] rotate-90" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    <ChevronRight size={15} />
                  </span>
                </button>
                <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-5">
                      <p className="dc-faq-a">{f.a}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>

        <Reveal className="mt-9 text-center">
          <p className="text-[13.5px] text-[#64748B]">
            Still deciding?{" "}
            <Link to="/contact" className="font-semibold text-[#B45309] hover:underline">Talk to us</Link>
            {" "}or{" "}
            <Link to="/signup" className="font-semibold text-[#B45309] hover:underline">start the free trial</Link> — no card details needed.
          </p>
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
      {/* 1. Hook and proof */}
      <HeroSection />
      <StatsBand />
      <TrustedSection />
      {/* 2. Why switch from paper (dark) */}
      <WhyDigitalCardaSection />
      {/* 3. What you get, how easy it is, and a design to start from */}
      <TemplatesSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PersonaSection />
      {/* 4. Deeper value */}
      <AISection />
      <AnalyticsSection />
      <QRNFCSection />
      <WhereToUseSection />
      <GrowSection />
      {/* 5. Proof, price, objections, close */}
      <TestimonialsSection />
      {SHOW_RESELLER_SECTION && <ResellerSection />}
      {SHOW_PRICING_SECTION && <PricingSection />}
      <FaqSection />
    </>
  );
}
