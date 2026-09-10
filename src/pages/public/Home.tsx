import { Link } from "react-router";
import {
  CreditCard, QrCode, MessageCircle, Download, FileDown, FileText,
  ShoppingBag, Image, Play, Wallet, MapPin, Star, Sparkles, Phone, Mail,
  Check, ArrowRight, Zap, Users, Eye, MousePointer,
  Share2, Layers, Shield, Clock, TrendingUp,
  ChevronRight, ChevronLeft, Monitor, Smartphone, Globe, BarChart3,
  Link2, Leaf, Quote, ScanLine, Gift, Building2, Plus,
} from "lucide-react";
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import TemplateThumb, { THUMB_W, THUMB_H } from "@/components/TemplateThumb";
import { STANDEE_STYLES, standeeMarkup } from "@/lib/standee";
import { useReveal, Reveal, SectionHeading } from "@/components/public/Reveal";

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
  // Two rows drifting opposite ways, with the rating anchored in the middle
  // so the strip reads as proof rather than decoration.
  const rowA = ["Digital Agencies", "Doctors & Clinics", "Consultants", "Restaurants", "Real Estate", "Freelancers"];
  const rowB = ["Retail Stores", "Coaches", "Salons", "Photographers", "Event Planners", "Startups"];
  const pill = (b: string, i: number) => (
    <span key={`${b}-${i}`} className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E2E8F0] shadow-premium text-sm font-medium text-[#475569]">
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
        <div className="marquee-track gap-3">{[...rowA, ...rowA].map(pill)}</div>
        <div className="marquee-track marquee-track--rev gap-3">{[...rowB, ...rowB].map(pill)}</div>
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
                    <span className="text-[13px] text-white font-medium">pacewalk.com</span>
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
  id: string; tab: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string; headline: string; pain: string; points: string[]; stat: string;
  card: { name: string; role: string; chips: string[] };
};

const PERSONAS: Persona[] = [
  {
    id: "clinics", tab: "Doctors & Clinics", icon: Plus, accent: "#14B8A6",
    headline: "Digital Visiting Card for Doctors & Clinics",
    pain: "Patients lose the paper slip with your OPD timings. Your card lives in their phone instead — timings, directions and a booking button always one tap away.",
    points: [
      "OPD timings and clinic address with one-tap directions",
      "Appointment requests straight to your WhatsApp",
      "Google review link that builds local trust",
      "Share reports, prescriptions and forms as PDFs",
    ],
    stat: "Clinics see 3× more appointment enquiries",
    card: { name: "Dr. Anita Sharma", role: "MD Physician · Sharma Clinic", chips: ["Call", "WhatsApp", "Directions"] },
  },
  {
    id: "realestate", tab: "Real Estate", icon: MapPin, accent: "#F7B31C",
    headline: "Digital Business Card for Real Estate Agents",
    pain: "You meet twenty people at a site visit and hand out twenty cards. Send one link instead — with your live listings already inside it.",
    points: [
      "Property listings with photos, pricing and highlights",
      "One-tap site-visit booking over WhatsApp",
      "Google Maps directions to every project",
      "Every enquiry captured as a lead you can follow up",
    ],
    stat: "Agents capture 4× more leads per site visit",
    card: { name: "Rohit Malhotra", role: "Realtor · Malhotra Properties", chips: ["Listings", "Site Visit", "Directions"] },
  },
  {
    id: "agencies", tab: "Agencies & Freelancers", icon: Monitor, accent: "#8B5CF6",
    headline: "Digital Business Card for Agencies & Freelancers",
    pain: "Your portfolio, your packages and your payment link should not need three different URLs and a follow-up email.",
    points: [
      "Portfolio gallery and showreel videos in one place",
      "Service packages with clear pricing",
      "UPI and payment links so you get paid faster",
      "Your own custom domain for a serious brand",
    ],
    stat: "Freelancers close new work 2× faster",
    card: { name: "Aarav Mehta", role: "Founder · Mehta Studio", chips: ["Portfolio", "Packages", "Pay Now"] },
  },
  {
    id: "retail", tab: "Restaurants & Retail", icon: ShoppingBag, accent: "#EC4899",
    headline: "Digital Card & QR Menu for Restaurants and Shops",
    pain: "One QR on the table can do the job of a menu, an offer board and a review request — without reprinting anything.",
    points: [
      "Menu and products with photos and live prices",
      "Today's offers, with an expiry date that self-removes",
      "UPI payment QR right at the counter",
      "Google review link that lifts your rating",
    ],
    stat: "Outlets collect 5× more Google reviews",
    card: { name: "Spice Route", role: "Multi-cuisine · Zirakpur", chips: ["Menu", "Offers", "Pay via UPI"] },
  },
  {
    id: "salons", tab: "Salons & Wellness", icon: Sparkles, accent: "#F97316",
    headline: "Digital Visiting Card for Salons & Spas",
    pain: "Clients rebook when booking takes one tap instead of one phone call they keep postponing.",
    points: [
      "Service menu with prices and duration",
      "WhatsApp booking in a single tap",
      "Before-and-after gallery of your work",
      "Packages and offers that bring clients back",
    ],
    stat: "Salons see 40% more repeat bookings",
    card: { name: "Glow Studio", role: "Hair & Skin · Chandigarh", chips: ["Services", "Book Now", "Gallery"] },
  },
  {
    id: "coaches", tab: "Coaches & Consultants", icon: Users, accent: "#3B82F6",
    headline: "Digital Business Card for Coaches & Consultants",
    pain: "Your credibility is the product. Let people see it before the first call, not during it.",
    points: [
      "Programmes and packages with transparent pricing",
      "Testimonials and Google reviews front and centre",
      "Discovery calls booked over WhatsApp or a link",
      "Videos and free resources that build trust early",
    ],
    stat: "Coaches book 3× more discovery calls",
    card: { name: "Neha Kapoor", role: "Business Coach · Delhi", chips: ["Programmes", "Book Call", "Reviews"] },
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
    btnRefs.current[active]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const p = PERSONAS[active];

  return (
    <section className="py-20 bg-white relative overflow-hidden" id="built-for-you">
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

        {/* Persona tabs with a sliding indicator */}
        <Reveal>
          <div ref={tabsRef} className="relative flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-[#F1F5F9] ring-1 ring-[#E2E8F0] mb-10">
            <span
              aria-hidden="true"
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-[#0F172A] shadow-premium transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ left: pill.left, width: pill.width }}
            />
            {PERSONAS.map((x, i) => {
              const on = i === active;
              return (
                <button
                  key={x.id}
                  ref={(el) => { btnRefs.current[i] = el; }}
                  type="button"
                  onClick={() => setActive(i)}
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

        {/* One shell, content swapped — keyed so it re-mounts and cross-fades */}
        <div key={p.id} className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
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
              <TrendingUp size={15} style={{ color: p.accent }} />
              <span className="text-[13px] font-bold text-[#0F172A]">{p.stat}</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-gold h-12 px-7 inline-flex items-center gap-2 text-base">
                Start Free <ArrowRight size={17} />
              </Link>
              <Link to="/industries" className="h-12 px-6 inline-flex items-center gap-2 text-sm font-semibold text-[#475569] border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-all">
                See more industries <ChevronRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card mock in that persona's world */}
          <div className="dc-swap-in dc-swap-d1 flex justify-center">
            <div className="relative w-full max-w-[330px]">
              <div className="absolute -inset-4 rounded-[2rem] blur-2xl opacity-60 transition-colors duration-700" style={{ background: `${p.accent}1F` }} />
              <div className="relative rounded-[1.75rem] bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg overflow-hidden">
                <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.accent}B3)` }}>
                  <div className="absolute inset-0 bg-grid-dark opacity-20" />
                </div>
                <div className="px-5 pb-6 -mt-10 relative">
                  <div className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-premium flex items-center justify-center mx-auto" style={{ color: p.accent }}>
                    <p.icon size={30} />
                  </div>
                  <p className="mt-3.5 text-center text-[17px] font-extrabold text-[#0F172A] leading-tight">{p.card.name}</p>
                  <p className="mt-1 text-center text-[12px] text-[#64748B]">{p.card.role}</p>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {p.card.chips.map((c) => (
                      <span key={c} className="h-9 rounded-xl text-[11px] font-bold flex items-center justify-center text-center px-1 leading-tight" style={{ background: `${p.accent}14`, color: p.accent }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-[#F1F5F9]" />
                    <div className="h-2 rounded-full bg-[#F1F5F9] w-4/5" />
                    <div className="h-2 rounded-full bg-[#F1F5F9] w-3/5" />
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2 text-[10.5px] font-semibold text-[#94A3B8]">
                    <QrCode size={13} /> digitalcarda.in/{p.id}
                  </div>
                </div>
              </div>
            </div>
          </div>
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

/* ─── Analytics ──────────────────────────────────────────────
   The section that most needed a real visual: a page selling analytics
   should SHOW analytics. One series (views over 12 months) with a hover
   crosshair, KPI tiles with sparklines, then the trackable metrics as
   chips — deliberately NOT another uniform card grid. */
const VIEW_SERIES = [2100, 2580, 3120, 2870, 3760, 4380, 5210, 4880, 6090, 7020, 7810, 9140];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Smooth cubic through points (midpoint control points — stable for any series). */
function smoothPath(pts: { x: number; y: number }[]) {
  if (!pts.length) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 70, H = 24;
  const max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - 3 - ((v - min) / span) * (H - 6) }));
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className="shrink-0">
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

const KPIS = [
  { label: "Total Views", value: "91,240", delta: "+18.2%", spark: [12, 18, 15, 22, 26, 24, 33], color: "#D97706" },
  { label: "WhatsApp Clicks", value: "12,806", delta: "+24.5%", spark: [8, 11, 10, 15, 14, 19, 23], color: "#16A34A" },
  { label: "QR Scans", value: "7,412", delta: "+11.8%", spark: [6, 8, 12, 10, 14, 16, 18], color: "#8B5CF6" },
  { label: "Leads Captured", value: "2,318", delta: "+31.4%", spark: [3, 5, 4, 8, 9, 12, 16], color: "#3B82F6" },
];

function AnalyticsPanel() {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 208, padL = 10, padR = 10, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...VIEW_SERIES) * 1.08;            // headroom so the peak is not clipped
  const pts = VIEW_SERIES.map((v, i) => ({
    x: padL + (i / (VIEW_SERIES.length - 1)) * innerW,
    y: padT + (1 - v / max) * innerH,
  }));
  const line = smoothPath(pts);
  const base = padT + innerH;                             // area charts sit on a zero baseline
  const area = `${line} L ${pts[pts.length - 1].x} ${base} L ${pts[0].x} ${base} Z`;
  const act = hover != null ? pts[hover] : null;

  return (
    <div className="rounded-3xl bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><BarChart3 size={17} className="text-[#B45309]" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#0F172A] leading-tight">Card Analytics</p>
            <p className="text-[11px] text-[#94A3B8]">Views over the last 12 months</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F8FAFC] ring-1 ring-[#E2E8F0] text-[11px] font-semibold text-[#475569] shrink-0">
          <Clock size={12} /> Last 12 months
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#F1F5F9]">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-white px-4 sm:px-5 py-4">
            <p className="text-[11px] font-medium text-[#94A3B8] truncate">{k.label}</p>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <p className="text-xl font-extrabold text-[#0F172A] tabular-nums leading-none">{k.value}</p>
              <Sparkline data={k.spark} color={k.color} />
            </div>
            <span className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 rounded-full px-2 py-0.5">
              <TrendingUp size={10} /> {k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="relative px-2 sm:px-4 pt-5 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img"
          aria-label="Card views rising from about 2,100 in January to about 9,140 in December">
          <defs>
            <linearGradient id="dcAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F7B31C" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#F7B31C" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={padL} x2={W - padR} y1={padT + t * innerH} y2={padT + t * innerH}
              stroke="#EEF2F7" strokeWidth="1" strokeDasharray={t === 1 ? "0" : "4 5"} />
          ))}
          <path d={area} fill="url(#dcAreaFill)" />
          <path d={line} fill="none" stroke="#D97706" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <text key={i} x={p.x} y={H - 8} textAnchor="middle" fill="#94A3B8" style={{ fontSize: 11, fontWeight: 600 }}>{MONTHS[i]}</text>
          ))}
          {act && (
            <g pointerEvents="none">
              <line x1={act.x} x2={act.x} y1={padT} y2={base} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={act.x} cy={act.y} r="6" fill="#ffffff" stroke="#D97706" strokeWidth="2.5" />
            </g>
          )}
          {pts.map((p, i) => (
            <rect key={`hit-${i}`} x={p.x - innerW / 24} y={padT} width={innerW / 12} height={innerH} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          ))}
        </svg>
        {act && hover != null && (
          <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full z-10"
            style={{ left: `${(act.x / W) * 100}%`, top: `${(act.y / H) * 100}%` }}>
            <div className="rounded-xl bg-[#0F172A] text-white px-3 py-2 shadow-lg whitespace-nowrap mb-2">
              <p className="text-[10px] font-medium text-[#94A3B8] leading-none">{MONTHS[hover]}</p>
              <p className="text-[13px] font-bold tabular-nums leading-tight mt-1">{VIEW_SERIES[hover].toLocaleString("en-US")} views</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsSection() {
  const tracked = [
    { icon: Eye, label: "Total Views" }, { icon: Users, label: "Unique Visitors" },
    { icon: Phone, label: "Call Clicks" }, { icon: MessageCircle, label: "WhatsApp Clicks" },
    { icon: Mail, label: "Email Clicks" }, { icon: QrCode, label: "QR Scans" },
    { icon: Globe, label: "Lead Forms" }, { icon: Share2, label: "Source Tracking" },
    { icon: Smartphone, label: "Device Reports" }, { icon: TrendingUp, label: "Monthly Growth" },
  ];
  return (
    <section className="py-20 bg-gradient-to-b from-white to-[#F8FAFC] relative overflow-hidden">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[#F7B31C]/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading eyebrow="Analytics" title={<>Track Every <span className="text-gradient-gold">Click and Lead</span></>} subtitle="Know exactly how customers interact with your card — views, WhatsApp and call clicks, QR scans, product views and enquiries." />
        <Reveal><AnalyticsPanel /></Reveal>
        <Reveal stagger className="mt-8 flex flex-wrap justify-center gap-2.5">
          {tracked.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white ring-1 ring-[#E2E8F0] shadow-premium text-[13px] font-medium text-[#334155] hover:ring-[#F7B31C]/50 hover:-translate-y-0.5 transition-all">
              <s.icon size={14} className="text-[#B45309]" /> {s.label}
            </span>
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

/* ─── Where to use the card link ───────────────────────────────
   Answer-engine content: a short, quotable answer block plus concrete
   placements. Written so Google AI Overviews / ChatGPT / Perplexity can
   lift a clean answer and cite us, and mirrored into FAQPage JSON-LD
   (schema text stays identical to the visible copy).

   Laid out as an editorial two-column list rather than another card
   grid — the page already has several of those. */
const LINK_ANSWER =
  "You can use a digital business card link anywhere you would normally hand over contact details — in email signatures, WhatsApp and SMS, social media bios, video-call backgrounds, printed material and packaging, mobile wallets, your website, your Google Business Profile, listing and job portals, event badges and standees, invoices, and paid ad campaigns.";

const LINK_PLACEMENTS = [
  { icon: Mail, title: "Email Signature", desc: "Under every outgoing email, quietly capturing leads.", accent: "#F7B31C" },
  { icon: MessageCircle, title: "WhatsApp & SMS", desc: "Chats, broadcasts and your WhatsApp Business profile.", accent: "#22C55E" },
  { icon: Link2, title: "Social Media Bios", desc: "Your single link-in-bio on Instagram, LinkedIn and X.", accent: "#8B5CF6" },
  { icon: Monitor, title: "Video Call Backgrounds", desc: "A QR in your Zoom, Meet or Teams background.", accent: "#3B82F6" },
  { icon: FileDown, title: "Print & Packaging", desc: "Visiting cards, brochures, flyers, packaging, signage.", accent: "#EC4899" },
  { icon: Wallet, title: "Mobile Wallet", desc: "Saved as a pass in Apple Wallet or Google Wallet.", accent: "#14B8A6" },
  { icon: Globe, title: "Website & Blog", desc: "Header, footer, author bio or Contact Us page.", accent: "#0EA5E9" },
  { icon: MapPin, title: "Google Business Profile", desc: "As your website or appointment link for local search.", accent: "#EF4444" },
  { icon: Building2, title: "Listing & Job Portals", desc: "IndiaMART, JustDial, Naukri — where one link is allowed.", accent: "#F97316" },
  { icon: ScanLine, title: "Events & Exhibitions", desc: "Badges, standees and stall banners people scan.", accent: "#6366F1" },
  { icon: FileText, title: "Invoices & Quotations", desc: "So clients can reach you straight from the document.", accent: "#0F766E" },
  { icon: TrendingUp, title: "Ads & Campaigns", desc: "The landing link for Google, Meta and WhatsApp ads.", accent: "#D97706" },
];

function WhereToUseSection() {
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: "Where can I use a digital business card link?",
        acceptedAnswer: { "@type": "Answer", text: LINK_ANSWER },
      }],
    };
    let s = document.getElementById("where-to-use-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "where-to-use-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("where-to-use-ld")?.remove(); };
  }, []);

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

              <Link to="/signup" className="btn-gold mt-7 h-12 px-7 inline-flex items-center gap-2 text-base">
                Create Your Card Link Free <ArrowRight size={17} />
              </Link>
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
    a: "No. You pick a ready template, add your details, and publish — most people finish in under ten minutes. AI can also write your about section, service descriptions and SEO text for you, and you can paste your website link to have a full card generated automatically.",
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

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    let s = document.getElementById("dc-faq-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-faq-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-faq-ld")?.remove(); };
  }, []);

  return (
    <section className="py-20 bg-[#F8FAFC] relative overflow-hidden" id="faq">
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
                  <h3 className="flex-1 text-[14.5px] sm:text-[15px] font-bold text-[#0F172A] leading-snug">{f.q}</h3>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${on ? "bg-[#F7B31C] text-[#0F172A] rotate-90" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    <ChevronRight size={15} />
                  </span>
                </button>
                <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <p className="px-5 sm:px-6 pb-5 text-[13.5px] text-[#64748B] leading-relaxed">{f.a}</p>
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
      <PersonaSection />
      <FeaturesSection />
      <WhyDigitalCardaSection />
      <AISection />
      <TemplatesSection />
      <HowItWorksSection />
      <AnalyticsSection />
      <QRNFCSection />
      <WhereToUseSection />
      <CustomDomainSection />
      <GrowSection />
      <TestimonialsSection />
      {SHOW_RESELLER_SECTION && <ResellerSection />}
      {SHOW_PRICING_SECTION && <PricingSection />}
      <FaqSection />
      <FinalCTA />
    </>
  );
}
