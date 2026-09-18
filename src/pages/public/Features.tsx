/*
 * /features — the page people read when they are comparing us with someone
 * else, so it is built to answer "can it do X?" fast and then show why that
 * matters.
 *
 *  - A dark hero with the card at the centre and features orbiting it.
 *  - Five job-based categories (Create / Share / Sell / Grow / Scale) as big
 *    jump tiles, then the full catalogue with a sliding filter and search.
 *  - Three animated spotlights for the features that actually win the deal.
 *  - Custom domain, a paper-vs-digital comparison and a feature-level FAQ
 *    (mirrored into FAQPage JSON-LD).
 *
 * Every feature and claim here exists in the product today — keep it that way.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  CreditCard, QrCode, MessageCircle, Download, FileDown, FileText, ShoppingBag,
  Image as ImageIcon, Play, Wallet, MapPin, Star, Link2, Globe, BarChart3, Sparkles,
  Shield, Layers, Users, Eye, Check, X, ArrowRight, ChevronRight, Palette, Languages,
  ScanLine, Smartphone, Share2, MousePointer, TrendingUp, Gift, Building2, Clock,
  UserPlus, Rocket, PauseCircle, Wand2, Crop, PanelsTopLeft, Receipt, CalendarClock, Search, Phone,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import JsonLd from "@/components/seo/JsonLd";

/* ── The catalogue, grouped by the job each feature does ───────── */
type Cat = "create" | "share" | "sell" | "grow" | "scale";
type IconT = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

const CATS: { id: Cat | "all"; label: string; icon: IconT; blurb?: string }[] = [
  { id: "all", label: "Everything", icon: Layers },
  { id: "create", label: "Create", icon: Wand2, blurb: "Design it in minutes" },
  { id: "share", label: "Share", icon: Share2, blurb: "Link, QR, NFC, WhatsApp" },
  { id: "sell", label: "Sell", icon: Wallet, blurb: "Products, offers, UPI" },
  { id: "grow", label: "Grow", icon: TrendingUp, blurb: "Leads, analytics, reviews" },
  { id: "scale", label: "Scale", icon: Building2, blurb: "Teams and resellers" },
];

const CAT_ACCENT: Record<Cat, string> = {
  create: "#8B5CF6",
  share: "#14B8A6",
  sell: "#EC4899",
  grow: "#3B82F6",
  scale: "#F7B31C",
};

type Feature = { cat: Cat; icon: IconT; title: string; desc: string; href?: string };

const FEATURES: Feature[] = [
  // Create
  { cat: "create", icon: PanelsTopLeft, title: "50+ Ready Templates", desc: "Professional designs for every trade — switch anytime without losing content.", href: "/digital-business-cards-templates" },
  { cat: "create", icon: Palette, title: "Brand Colour Extraction", desc: "Upload your logo and the card picks up your brand colours automatically." },
  { cat: "create", icon: Crop, title: "Logo, Photo & Shape Control", desc: "Round, square or plain transparent PNG, sized exactly how you want it." },
  { cat: "create", icon: ImageIcon, title: "Custom Backgrounds", desc: "Gradients, patterns or your own image behind the card." },
  { cat: "create", icon: Sparkles, title: "AI Card Generator", desc: "Paste your website link and AI builds the whole card from it.", href: "/ai-card-generator" },
  { cat: "create", icon: FileText, title: "AI Content Writer", desc: "Bio, about us, product copy, FAQs and SEO text written in seconds." },
  { cat: "create", icon: Languages, title: "Multilingual Cards", desc: "Publish the same card in more than one language." },
  { cat: "create", icon: Layers, title: "Compact or Full Layout", desc: "Collapse a long card into tap-to-open sections when you want it short." },

  // Share
  { cat: "share", icon: QrCode, title: "Permanent QR Code", desc: "Redesign the card as often as you like — anything already printed keeps working." },
  { cat: "share", icon: ScanLine, title: "NFC Card Ready", desc: "Tap-to-share on NFC cards, keychains and smart accessories.", href: "/pricing" },
  { cat: "share", icon: MessageCircle, title: "WhatsApp Click-to-Chat", desc: "One tap opens a chat with your message already filled in." },
  { cat: "share", icon: Download, title: "Save Contact (vCard)", desc: "Visitors add you to their phonebook in a single tap." },
  { cat: "share", icon: FileDown, title: "Download PDF Card", desc: "A branded PDF version for email and offline sharing." },
  { cat: "share", icon: Share2, title: "Built-in Share Sheet", desc: "WhatsApp, Telegram, LinkedIn, X, email and copy-link in one place." },
  { cat: "share", icon: Globe, title: "Custom Domain", desc: "Run the card on your own domain or subdomain for a serious brand.", href: "/custom-domain" },
  { cat: "share", icon: Link2, title: "Short Branded Link", desc: "A clean digitalcarda.in/yourname URL that is easy to say out loud." },
  { cat: "share", icon: Smartphone, title: "Add to Home Screen", desc: "Visitors can pin your card like an app on their phone." },

  // Sell
  { cat: "sell", icon: ShoppingBag, title: "Products & Services", desc: "Photos, pricing, offer price and a Buy button for everything you sell." },
  { cat: "sell", icon: Gift, title: "Offers & Deals", desc: "Time-limited offers that drop off the card by themselves once they expire." },
  { cat: "sell", icon: Wallet, title: "UPI & Wallet Payments", desc: "BHIM, Google Pay, PhonePe and Paytm shown side by side with copy buttons." },
  { cat: "sell", icon: Receipt, title: "Bank Account Details", desc: "Account, IFSC and GST laid out cleanly with one-tap copy." },
  { cat: "sell", icon: QrCode, title: "Payment QR", desc: "A scan-to-pay code sitting right inside the card." },
  { cat: "sell", icon: UserPlus, title: "Enquiry Form", desc: "Capture name, number and requirement straight into your leads list." },
  { cat: "sell", icon: CalendarClock, title: "Booking & Appointment Links", desc: "Send people to your calendar, form or WhatsApp to book you." },
  { cat: "sell", icon: ImageIcon, title: "Image Gallery", desc: "A portfolio of your work with a full-screen lightbox." },
  { cat: "sell", icon: Play, title: "Videos & Reels", desc: "Embed YouTube, Shorts and Instagram reels that play in the card." },

  // Grow
  { cat: "grow", icon: BarChart3, title: "Analytics Dashboard", desc: "Views, unique visitors, clicks, QR scans and traffic sources over time." },
  { cat: "grow", icon: Users, title: "Lead Manager", desc: "Every enquiry captured, tracked by status and exportable when you need it." },
  { cat: "grow", icon: MousePointer, title: "Click Tracking", desc: "See which button people actually press — call, WhatsApp, website or pay." },
  { cat: "grow", icon: Smartphone, title: "Device & Source Reports", desc: "Mobile versus desktop, and exactly where your visitors came from." },
  { cat: "grow", icon: Star, title: "Google Review Link", desc: "One tap to your Google review page, so happy customers actually leave one.", href: "/blog/google-review-qr-code" },
  { cat: "grow", icon: MapPin, title: "Google Maps Directions", desc: "Your address opens turn-by-turn directions instantly." },
  { cat: "grow", icon: Shield, title: "SEO Settings", desc: "Custom meta title, description and slug to help your card show up in search." },
  { cat: "grow", icon: Gift, title: "Refer & Earn", desc: "Friends save on their first plan, and you earn cash on every one who goes paid.", href: "/refer-earn" },

  // Scale
  { cat: "scale", icon: Rocket, title: "Bulk Card Creation", desc: "Cards for your whole team in one upload, with consistent branding.", href: "/bulk-cards" },
  { cat: "scale", icon: CreditCard, title: "Multiple Cards Per Account", desc: "Run several brands, branches or profiles from one login." },
  { cat: "scale", icon: Building2, title: "Reseller & White-Label", desc: "Sell digital cards under your own brand, on your own domain.", href: "/resellers" },
  { cat: "scale", icon: Users, title: "Customer Management", desc: "Assign packages, track expiry and manage every client in one place." },
  { cat: "scale", icon: BarChart3, title: "Commission Reports", desc: "See exactly what each reseller has sold and earned." },
  { cat: "scale", icon: PauseCircle, title: "Pause & Expiry Control", desc: "Switch a card off without deleting anything, and switch it back on later." },
];

/* ── Spotlights: the three that actually close the deal ────────── */
const SPOTLIGHTS = [
  {
    eyebrow: "AI",
    title: "Paste a link. Get a finished card.",
    body: "Already have a website? Drop the URL in and AI reads it — pulling your logo, brand colours, services, contact details and location, then writing the copy to match. What normally takes an evening takes about a minute.",
    points: ["Logo and brand colours detected", "Services written from your real content", "SEO title and description generated"],
    accent: "#8B5CF6",
    to: "/ai-card-generator",
    cta: "Try the AI generator",
  },
  {
    eyebrow: "QR & NFC",
    title: "Print it once. Change it forever.",
    body: "Your QR code points at a permanent address, so the design, the phone number, even the whole template can change and every card, standee and brochure you already printed keeps working. That is the thing paper can never do.",
    points: ["Reprint nothing when details change", "Works on NFC cards and tags", "Scan straight to save contact"],
    accent: "#14B8A6",
    to: "/signup",
    cta: "Get your QR code",
  },
  {
    eyebrow: "Analytics",
    title: "Know which sharing actually works.",
    body: "Most people share a card and hope. You get views, unique visitors, call and WhatsApp taps, QR scans, form submissions, device split and traffic source — so you can tell the difference between a channel that looks busy and one that brings business.",
    points: ["Every tap tracked, not just views", "Source reports per channel", "Leads captured and exportable"],
    accent: "#3B82F6",
    to: "/signup",
    cta: "Start tracking free",
  },
];

/* ── Paper vs digital: the comparison the visitor is already running ── */
const COMPARISON = [
  { label: "Updating your details", paper: "Reprint the whole batch", digital: "Edit once — live instantly" },
  { label: "Where it ends up", paper: "Lost in a wallet or thrown away", digital: "Saved in their phone" },
  { label: "Saving your contact", paper: "Typed in by hand, often wrong", digital: "One tap to the phonebook" },
  { label: "Showing products & pricing", paper: "Not possible", digital: "Photos, prices and a Buy button" },
  { label: "Taking payments", paper: "Not possible", digital: "UPI, QR and bank details built in" },
  { label: "Knowing who saw it", paper: "No idea", digital: "Full analytics and lead capture" },
  { label: "Sharing at distance", paper: "Hand it over in person", digital: "A link, anywhere, instantly" },
  { label: "Running cost", paper: "Paper and ink, every reprint", digital: "From Rs. 99/month, no printing" },
];

const FAQS = [
  {
    q: "Do I need an app to use a digital business card?",
    a: "No. Your card is a web page, so it opens in any browser on any device. Neither you nor the person you share it with has to install anything or create an account.",
  },
  {
    q: "Can I change my card after I have printed the QR code?",
    a: "Yes. The QR points to a permanent address, so you can change the design, template, phone number, products or anything else as often as you like and every printed QR keeps working.",
  },
  {
    q: "Can I take payments through my digital card?",
    a: "Yes. You can show UPI IDs for BHIM, Google Pay, PhonePe and Paytm, add your bank account details with one-tap copy, and display a scan-to-pay QR code directly inside the card.",
  },
  {
    q: "Can I use my own domain instead of digitalcarda.in?",
    a: "Yes. On the Platinum plan you can connect a domain or subdomain you own, such as card.yourbusiness.com. Setup is a one-time ₹499 (free on Platinum 3-Year) and our team connects it with HTTPS.",
  },
  {
    q: "Are all these features in every plan?",
    a: "Most are. Gold covers everything a single business card needs — templates, QR, WhatsApp, products, payments, enquiries and analytics. Platinum adds up to 3 cards, a custom domain, AI writing, multi-language cards, full SEO controls and priority support. The pricing page compares them side by side.",
  },
  {
    q: "Can I create cards for my whole team?",
    a: "Yes. Bulk creation builds cards for every member of your team in one go with consistent branding, and agencies can resell white-labelled cards under their own brand with commission reporting.",
  },
];

// Feature-level FAQ schema, text identical to what is on screen.
const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/* ── Hero art: the card, with features orbiting it (decorative) ── */
const ORBIT: { icon: IconT; label: string; tint: string; pos: string; delay: string }[] = [
  { icon: QrCode, label: "QR scan", tint: "#14B8A6", pos: "left-[-8%] top-[14%]", delay: "0s" },
  { icon: MessageCircle, label: "WhatsApp", tint: "#22C55E", pos: "right-[-10%] top-[8%]", delay: ".8s" },
  { icon: Wallet, label: "UPI paid", tint: "#EC4899", pos: "right-[-14%] top-[46%]", delay: "1.6s" },
  { icon: Sparkles, label: "AI wrote it", tint: "#8B5CF6", pos: "left-[-14%] top-[52%]", delay: "2.4s" },
  { icon: BarChart3, label: "+38 views", tint: "#3B82F6", pos: "left-[4%] bottom-[2%]", delay: "1.2s" },
  { icon: UserPlus, label: "New lead", tint: "#F7B31C", pos: "right-[-2%] bottom-[6%]", delay: "2s" },
];

function HeroArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-[240px] sm:w-[270px] h-[400px] sm:h-[440px]">
      <span className="absolute inset-[-30%] rounded-full border border-white/[0.06]" />
      <span className="absolute inset-[-12%] rounded-full border border-dashed border-white/[0.08] dc-feat-spin" />
      <div className="absolute inset-0 rounded-[2.2rem] bg-[#0B1120] p-2.5 ring-1 ring-white/15 shadow-[0_40px_90px_-30px_rgba(247,179,28,0.45)] dc-feat-float">
        <div className="h-full rounded-[1.8rem] bg-white overflow-hidden flex flex-col">
          <div className="h-24 bg-gradient-to-br from-[#F7B31C] to-[#E09A12] relative">
            <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 w-16 h-16 rounded-2xl bg-[#0F172A] ring-4 ring-white flex items-center justify-center font-display text-lg font-extrabold text-[#F7B31C]">AM</span>
          </div>
          <div className="pt-10 px-4 text-center">
            <p className="font-display text-[15px] font-extrabold text-[#0F172A]">Aarav Mehta</p>
            <p className="text-[11px] text-[#64748B]">Nayara Interiors</p>
          </div>
          <div className="mt-3 px-4 grid grid-cols-3 gap-1.5">
            {[{ i: Phone, c: "#3B82F6" }, { i: MessageCircle, c: "#22C55E" }, { i: MapPin, c: "#EF4444" }].map(({ i: I, c }, k) => (
              <span key={k} className="h-9 rounded-xl flex items-center justify-center" style={{ background: `${c}1A`, color: c }}><I size={15} /></span>
            ))}
          </div>
          <div className="mt-3 mx-4 rounded-xl bg-[#F8FAFC] p-2.5 space-y-1.5">
            <span className="block h-2 w-3/4 rounded-full bg-[#E2E8F0]" />
            <span className="block h-2 w-1/2 rounded-full bg-[#E2E8F0]" />
          </div>
          <div className="mt-auto m-4 h-10 rounded-xl bg-[#0F172A] text-white text-[12px] font-bold flex items-center justify-center gap-1.5"><Download size={13} /> Save contact</div>
        </div>
      </div>
      {ORBIT.map((o) => (
        <span key={o.label} className={`absolute ${o.pos} dc-feat-bob`} style={{ animationDelay: o.delay }}>
          <span className="flex items-center gap-1.5 rounded-full bg-white/95 pl-1 pr-2.5 py-1 text-[11px] font-bold text-[#0F172A] shadow-xl whitespace-nowrap">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: o.tint }}><o.icon size={12} /></span>
            {o.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── Spotlight visuals (decorative, animated) ── */
function AiVisual() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0] px-3 h-11">
        <Globe size={15} className="text-[#8B5CF6]" />
        <span className="font-mono text-[13px] text-[#0F172A] overflow-hidden whitespace-nowrap dc-feat-type">nayarainteriors.com</span>
        <span className="w-[2px] h-4 bg-[#8B5CF6] dc-feat-caret" />
        <span className="ml-auto rounded-lg bg-[#8B5CF6] px-2.5 py-1 text-[11px] font-bold text-white inline-flex items-center gap-1"><Sparkles size={11} /> Build</span>
      </div>
      {[
        { t: "Logo & colours", w: "70%", d: ".4s" },
        { t: "About us written", w: "90%", d: "1s" },
        { t: "6 services added", w: "80%", d: "1.6s" },
        { t: "SEO title ready", w: "60%", d: "2.2s" },
      ].map((r) => (
        <div key={r.t} className="flex items-center gap-3 dc-feat-pop" style={{ animationDelay: r.d }}>
          <span className="w-7 h-7 rounded-lg bg-[#8B5CF6]/12 text-[#8B5CF6] flex items-center justify-center shrink-0"><Check size={14} strokeWidth={3} /></span>
          <span className="flex-1">
            <span className="block text-[12px] font-semibold text-[#334155]">{r.t}</span>
            <span className="mt-1 block h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden"><span className="block h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD] dc-feat-fill" style={{ width: r.w, animationDelay: r.d }} /></span>
          </span>
        </div>
      ))}
    </div>
  );
}

function QrVisual() {
  const cells = [0, 1, 2, 4, 6, 8, 10, 12, 13, 15, 16, 18, 20, 22, 23, 24, 26, 28, 30, 31, 33, 35, 36, 38, 40, 42, 43, 44, 46, 48];
  return (
    <div aria-hidden="true" className="flex items-center gap-5">
      <div className="relative w-36 h-36 shrink-0 rounded-2xl bg-white ring-1 ring-[#E2E8F0] p-3 overflow-hidden">
        <div className="grid grid-cols-7 gap-[3px] h-full">
          {Array.from({ length: 49 }).map((_, i) => <span key={i} className={`rounded-[2px] ${cells.includes(i) ? "bg-[#0F172A]" : ""}`} />)}
        </div>
        <span className="absolute inset-x-2 h-[3px] rounded-full bg-[#14B8A6] shadow-[0_0_12px_2px_rgba(20,184,166,.7)] dc-feat-scan" />
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Same QR, new details</p>
        <div className="relative h-10 rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0] overflow-hidden">
          <span className="absolute inset-0 flex items-center gap-2 px-3 text-[12.5px] font-semibold text-[#94A3B8] line-through dc-feat-swap-out"><Phone size={13} /> +91 98765 00000</span>
          <span className="absolute inset-0 flex items-center gap-2 px-3 text-[12.5px] font-semibold text-[#0F172A] dc-feat-swap-in"><Phone size={13} className="text-[#14B8A6]" /> +91 98765 43210</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-[#14B8A6]/10 px-3 h-10 text-[12px] font-bold text-[#0F766E]"><Check size={14} strokeWidth={3} /> Printed cards still work</div>
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  const bars = [38, 52, 44, 70, 58, 86, 74];
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-3 gap-2">
        {[{ k: "Views", v: "128", c: "#3B82F6" }, { k: "WhatsApp", v: "42", c: "#22C55E" }, { k: "Leads", v: "18", c: "#F7B31C" }].map((m) => (
          <div key={m.k} className="rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0] p-2.5">
            <p className="text-[18px] font-extrabold text-[#0F172A] leading-none">{m.v}</p>
            <p className="mt-1 text-[10.5px] font-semibold" style={{ color: m.c }}>{m.k}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 h-28 flex items-end gap-2 rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0] px-3 pt-3">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#3B82F6] to-[#93C5FD] origin-bottom dc-feat-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-[#94A3B8] text-center">Sample data · last 7 days</p>
    </div>
  );
}

const SPOT_VISUALS = [AiVisual, QrVisual, AnalyticsVisual];

/* ── Page ──────────────────────────────────────────────────────── */
export default function Features() {
  const [cat, setCat] = useState<Cat | "all">("all");
  const [q, setQ] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const catalogueRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  const activeIdx = CATS.findIndex((c) => c.id === cat);

  // Measure the active filter so the pill can slide between labels of
  // different widths (and stay right when the viewport changes).
  useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[activeIdx];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIdx]);

  // Links like /features#custom-domain: the page renders after the router has
  // scrolled to the top, so jump to the section once it's on screen.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 120);
    return () => window.clearTimeout(t);
  }, []);

  const needle = q.trim().toLowerCase();
  const inCat = cat === "all" ? FEATURES : FEATURES.filter((f) => f.cat === cat);
  const shown = needle ? inCat.filter((f) => `${f.title} ${f.desc}`.toLowerCase().includes(needle)) : inCat;
  const countFor = (id: Cat | "all") => (id === "all" ? FEATURES.length : FEATURES.filter((f) => f.cat === id).length);

  const pickCategory = (id: Cat) => {
    setCat(id); setQ("");
    catalogueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-[#F8FAFC] overflow-hidden">
      <JsonLd id="dc-features-ld" data={FAQ_LD} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 pb-20 sm:pt-32 sm:pb-24">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-40 right-[-10%] w-[560px] h-[560px] bg-[#F7B31C]/20 rounded-full blur-3xl animate-aurora-drift" />
        <div aria-hidden="true" className="absolute bottom-[-20%] left-[-10%] w-[480px] h-[480px] bg-[#8B5CF6]/20 rounded-full blur-3xl animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:items-center">
          <Reveal stagger className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] ring-1 ring-white/10">
              <Sparkles size={13} /> {FEATURES.length} features · one card
            </span>
            <h1 className="mt-5 font-display text-[2.35rem] sm:text-[3.2rem] lg:text-[3.5rem] font-extrabold text-white leading-[1.06] tracking-tight [text-wrap:balance]">
              Every Feature Your <span className="text-gradient-gold">Digital Business Card</span> Needs
            </h1>
            <p className="mt-5 text-[15.5px] sm:text-lg text-[#CBD5E1] leading-relaxed max-w-xl mx-auto lg:mx-0">
              Build it, share it, sell from it and measure it — without printing anything, and without asking anyone to install an app.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/signup" className="dc-btn-shine group relative overflow-hidden h-[52px] px-7 rounded-2xl gradient-gold text-[#0F172A] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                <span className="relative z-10">Start 30-Day Free Trial</span> <ArrowRight size={18} className="relative z-10 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#all-features" onClick={(e) => { e.preventDefault(); catalogueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className="h-[52px] px-7 rounded-2xl bg-white/[0.08] text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 ring-1 ring-white/15 hover:bg-white/[0.14] active:scale-[0.97] transition-all">
                <Eye size={18} /> Browse all features
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[12.5px] text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#4ADE80]" /> No app to install</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#4ADE80]" /> Works on every phone</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-[#4ADE80]" /> Live in minutes</span>
            </div>
          </Reveal>
          <div className="hidden sm:block mt-14 lg:mt-0"><HeroArt /></div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section aria-label="Feature categories" className="relative -mt-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {CATS.filter((c) => c.id !== "all").map((c, i) => {
            const accent = CAT_ACCENT[c.id as Cat];
            return (
              <button key={c.id} type="button" onClick={() => pickCategory(c.id as Cat)}
                className={`group relative overflow-hidden rounded-[22px] bg-white p-4 text-left ring-1 ring-[#E2E8F0] shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity" style={{ background: `${accent}55` }} />
                <span className="relative flex items-center justify-between">
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" style={{ background: accent }}><c.icon size={20} /></span>
                  <span className="font-display text-[1.6rem] font-extrabold text-[#0F172A] leading-none tabular-nums">{countFor(c.id)}</span>
                </span>
                <span className="relative mt-3 block text-[15px] font-bold text-[#0F172A]">{c.label}</span>
                <span className="relative block text-[12px] text-[#64748B] leading-snug">{c.blurb}</span>
                <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left" style={{ background: accent }} />
              </button>
            );
          })}
        </Reveal>
      </section>

      {/* ── Feature catalogue ── */}
      <section ref={catalogueRef} className="scroll-mt-20 py-16 sm:py-20 relative" id="all-features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The full list"
            title={<>Grouped by What You <span className="text-gradient-gold">Actually Want to Do</span></>}
            subtitle="Filter by the job in front of you, or search for the feature you need."
          />

          <div className="sticky top-[72px] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-[#F8FAFC]/85 backdrop-blur-md mb-8">
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-white ring-1 ring-[#E2E8F0] shadow-sm">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 bottom-1.5 rounded-xl bg-[#0F172A] shadow-premium transition-all duration-500"
                  style={{ left: pill.left, width: pill.width, transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
                />
                {CATS.map((c, i) => {
                  const on = c.id === cat;
                  return (
                    <button
                      key={c.id}
                      ref={(el) => { btnRefs.current[i] = el; }}
                      type="button"
                      onClick={() => setCat(c.id)}
                      aria-pressed={on}
                      className={`relative z-10 shrink-0 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-[13px] font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "text-white" : "text-[#475569] hover:text-[#0F172A]"}`}
                    >
                      <c.icon size={15} className={on ? "" : "text-[#94A3B8]"} />
                      <span className="whitespace-nowrap">{c.label}</span>
                      <span className={`text-[11px] font-bold tabular-nums ${on ? "text-[#F7B31C]" : "text-[#94A3B8]"}`}>{countFor(c.id)}</span>
                    </button>
                  );
                })}
              </div>
              <label className="relative md:w-64 shrink-0">
                <span className="sr-only">Search features</span>
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input
                  type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. UPI, QR, leads"
                  className="w-full h-[52px] md:h-full rounded-2xl bg-white ring-1 ring-[#E2E8F0] shadow-sm pl-10 pr-3 text-[16px] md:text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#F7B31C]"
                />
              </label>
            </div>
          </div>

          {/* keyed so the grid re-mounts and the cards cascade in on every change */}
          <div key={`${cat}-${needle}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((f, i) => {
              const accent = CAT_ACCENT[f.cat];
              return (
                <div
                  key={f.title}
                  className="dc-feat-card group relative rounded-[22px] bg-white ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40"
                  style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
                >
                  <span aria-hidden="true" className="absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${accent}33` }} />
                  <span aria-hidden="true" className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform duration-300" style={{ background: accent }} />
                  <div className="relative flex items-start gap-3.5">
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: `${accent}18`, color: accent }}>
                      <f.icon size={19} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-bold text-[#0F172A] leading-snug">
                        {f.href ? <Link to={f.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{f.title}</Link> : f.title}
                      </h3>
                      <p className="mt-1 text-[12.5px] text-[#64748B] leading-relaxed">{f.desc}</p>
                      {f.href && (
                        <span className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#B45309] transition-all group-hover:gap-2">
                          Learn more <ArrowRight size={13} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {shown.length === 0 && (
            <div className="rounded-[22px] bg-white ring-1 ring-[#E2E8F0] p-8 text-center">
              <p className="text-[15px] font-semibold text-[#0F172A]">No feature matches “{q}”.</p>
              <p className="mt-1 text-[13px] text-[#64748B]">Try another word, or <a href={`https://wa.me/919517722444?text=${encodeURIComponent(`Does DigitalCarda have: ${q}?`)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#B45309] underline underline-offset-2">ask us on WhatsApp</a>.</p>
              <button type="button" onClick={() => { setQ(""); setCat("all"); }} className="mt-4 h-10 px-4 rounded-xl bg-[#0F172A] text-white text-[13px] font-bold">Show all features</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Spotlights ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Worth a closer look"
            title={<>The Three That Change <span className="text-gradient-gold">How You Work</span></>}
            subtitle="Most features are conveniences. These three change the outcome."
          />

          <div className="space-y-14 lg:space-y-20">
            {SPOTLIGHTS.map((s, i) => {
              const Visual = SPOT_VISUALS[i];
              return (
                <Reveal key={s.title}>
                  <div className={`grid lg:grid-cols-2 gap-8 lg:gap-14 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                    <div>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: `${s.accent}16`, color: s.accent }}>
                        <span className="font-display text-[13px]">0{i + 1}</span> {s.eyebrow}
                      </span>
                      <h3 className="mt-4 text-[1.7rem] sm:text-[2.1rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">{s.title}</h3>
                      <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">{s.body}</p>
                      <ul className="mt-6 grid gap-2">
                        {s.points.map((p) => (
                          <li key={p} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] ring-1 ring-[#F1F5F9] px-3.5 py-2.5">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: s.accent }}>
                              <Check size={13} strokeWidth={3} />
                            </span>
                            <span className="text-[14px] font-medium text-[#334155] leading-snug">{p}</span>
                          </li>
                        ))}
                      </ul>
                      <Link to={s.to} className="dc-btn-shine group relative overflow-hidden mt-7 inline-flex items-center gap-2 h-12 px-6 rounded-2xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.97]" style={{ background: s.accent, boxShadow: `0 14px 30px -14px ${s.accent}` }}>
                        <span className="relative z-10">{s.cta}</span> <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>

                    <div className="flex justify-center">
                      <div className="relative w-full max-w-[440px]">
                        <div aria-hidden="true" className="absolute -inset-6 rounded-[2.4rem] blur-3xl opacity-60" style={{ background: `${s.accent}2E` }} />
                        <div className="relative rounded-[1.75rem] bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-5 sm:p-6">
                          <div className="flex items-center gap-2 mb-5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/70" />
                            <span className="ml-auto text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: s.accent }}>{s.eyebrow}</span>
                          </div>
                          <Visual />
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Custom domain ── */}
      <section className="scroll-mt-20 py-16 sm:py-24 bg-[#F8FAFC] relative overflow-hidden" id="custom-domain">
        <div aria-hidden="true" className="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full bg-[#8B5CF6]/10 blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EDE9FE] text-[#6D28D9]"><Globe size={12} /> Custom domain</span>
              <h2 className="mt-4 text-[1.9rem] sm:text-[2.4rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.12]">
                Use your <span className="text-gradient-gold">own domain</span>
              </h2>
              <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">
                Put your card on an address that carries your brand — like <span className="font-mono text-[#0F172A]">card.yourbusiness.com</span> — instead of ours. Customers see a professional link that matches your website and email.
              </p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-2.5">
                {[
                  { t: "Your brand in every link", d: "On WhatsApp, QR codes and printed material." },
                  { t: "Secure HTTPS included", d: "We set up the certificate for you." },
                  { t: "You keep ownership", d: "Use a domain you own or buy one anywhere." },
                  { t: "Same card, same QR", d: "Nothing to rebuild — just a new address." },
                ].map((b) => (
                  <li key={b.t} className="flex gap-3 rounded-2xl bg-white ring-1 ring-[#E7EBF2] p-3.5">
                    <span className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 mt-0.5"><Check size={13} strokeWidth={3} /></span>
                    <span>
                      <span className="block text-[14px] font-semibold text-[#0F172A]">{b.t}</span>
                      <span className="block text-[12.5px] text-[#64748B] leading-snug">{b.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link to="/custom-domain" className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#7C3AED] transition-all hover:-translate-y-0.5 hover:bg-[#6D28D9]">
                  How custom domains work <ArrowRight size={15} />
                </Link>
                <p className="text-[13px] text-[#64748B]"><span className="font-bold text-[#0F172A]">₹499</span> one-time setup · free on Platinum 3-Year</p>
              </div>
            </Reveal>

            <Reveal>
              <div className="relative mx-auto w-full max-w-[460px]">
                <div aria-hidden="true" className="absolute -inset-6 rounded-[2.4rem] bg-[#8B5CF6]/15 blur-3xl" />
                <div className="relative rounded-[1.75rem] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-5 sm:p-6 ring-1 ring-white/10 shadow-premium-lg overflow-hidden">
                  <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
                  <div className="relative flex items-center gap-1.5 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80" /><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80" /><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/80" />
                    <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Pick your address</span>
                  </div>
                  <div className="relative space-y-2.5">
                    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-4 h-12 opacity-60">
                      <Link2 size={15} className="text-[#94A3B8]" />
                      <span className="font-mono text-[13px] text-[#94A3B8] line-through decoration-[#EF4444]/60">digitalcarda.in/yourname</span>
                    </div>
                    {["card.yourbusiness.com", "profile.yourbusiness.com", "me.yourbusiness.com"].map((d, i) => (
                      <div key={d} className={`flex items-center gap-3 rounded-xl px-4 h-12 ring-1 transition-all ${i === 0 ? "bg-[#8B5CF6]/20 ring-[#A78BFA]/50 shadow-[0_10px_30px_-12px_rgba(139,92,246,0.7)]" : "bg-white/[0.05] ring-white/10"}`}>
                        <Shield size={15} className="text-[#4ADE80]" />
                        <span className="font-mono text-[13px] sm:text-[14px] text-white truncate">{d}</span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-bold text-[#4ADE80]"><Check size={11} /> HTTPS</span>
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                    {[{ k: "1", t: "Choose address" }, { k: "2", t: "We connect it" }, { k: "3", t: "Share it" }].map((st) => (
                      <div key={st.k} className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-2 py-2.5">
                        <span className="mx-auto w-6 h-6 rounded-full bg-[#F7B31C] text-[#0F172A] text-[11px] font-extrabold flex items-center justify-center">{st.k}</span>
                        <span className="mt-1.5 block text-[11.5px] font-semibold text-[#CBD5E1]">{st.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Paper vs digital ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
        <div aria-hidden="true" className="absolute top-1/2 left-1/4 w-[420px] h-[420px] bg-[#F7B31C]/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <SectionHeading
            eyebrow="The honest comparison"
            title={<>Paper Card vs <span className="text-gradient-gold">Digital Card</span></>}
            subtitle="The same eight things, side by side. This is the comparison you are already running."
            light
          />

          <div className="hidden md:grid grid-cols-[1.1fr_1fr_1fr] gap-3 mb-3 px-5 text-[12px] font-bold uppercase tracking-wider">
            <span />
            <span className="inline-flex items-center gap-1.5 text-[#94A3B8]"><X size={14} /> Paper card</span>
            <span className="inline-flex items-center gap-1.5 text-[#F7B31C]"><Check size={14} /> DigitalCarda</span>
          </div>
          <Reveal stagger className="space-y-2.5">
            {COMPARISON.map((row) => (
              <div key={row.label} className="group grid md:grid-cols-[1.1fr_1fr_1fr] gap-2 md:gap-3 items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4 md:px-5 transition-colors hover:bg-white/[0.07] hover:ring-[#F7B31C]/30">
                <span className="text-[14px] font-semibold text-white">{row.label}</span>
                <span className="flex items-center gap-2 text-[13px] text-[#94A3B8]">
                  <span className="w-5 h-5 rounded-full bg-[#EF4444]/15 text-[#F87171] flex items-center justify-center shrink-0"><X size={11} strokeWidth={3} /></span>{row.paper}
                </span>
                <span className="flex items-center gap-2 text-[13px] font-medium text-[#E2E8F0]">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"><Check size={11} strokeWidth={3} /></span>{row.digital}
                </span>
              </div>
            ))}
          </Reveal>

          <Reveal className="text-center mt-10">
            <Link to="/signup" className="dc-btn-shine group relative overflow-hidden h-[52px] px-8 rounded-2xl gradient-gold text-[#0F172A] text-[15px] font-extrabold inline-flex items-center gap-2 shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
              <span className="relative z-10">Switch to a digital card</span> <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-24 bg-[#F8FAFC]" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Questions"
            title={<>Before You <span className="text-gradient-gold">Ask Us</span></>}
            subtitle="The feature questions that come up most often."
          />
          <Reveal stagger className="space-y-2.5">
            {FAQS.map((f, i) => {
              const on = openFaq === i;
              return (
                <div key={f.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/50 shadow-premium-lg" : "ring-[#E2E8F0] hover:ring-[#CBD5E1]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(on ? null : i)}
                    aria-expanded={on}
                    className="w-full flex items-center gap-4 text-left px-4 sm:px-6 py-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[12px] font-extrabold tabular-nums transition-colors ${on ? "gradient-gold text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="flex-1"><span className="dc-faq-q">{f.q}</span></h3>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${on ? "bg-[#0F172A] text-white rotate-90" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      <ChevronRight size={15} />
                    </span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <div className="px-4 sm:px-6 pb-5 sm:pl-[4.5rem]">
                        <p className="dc-faq-a">{f.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Reveal>
          <p className="mt-5 text-center text-[13px] text-[#64748B]">
            Compare what each plan includes on the <Link to="/pricing" className="font-semibold text-[#B45309] underline underline-offset-2">pricing page</Link>.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="pb-16 sm:pb-24 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 sm:p-14 text-center overflow-hidden ring-1 ring-white/10">
              <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
              <div aria-hidden="true" className="absolute -top-16 -right-16 w-72 h-72 bg-[#F7B31C]/20 rounded-full blur-3xl animate-aurora-drift" />
              <div aria-hidden="true" className="absolute -bottom-20 -left-16 w-64 h-64 bg-[#8B5CF6]/15 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="font-display text-[1.9rem] sm:text-[2.6rem] font-extrabold text-white tracking-tight leading-[1.1]">Ready to Build <span className="text-gradient-gold">Your Card?</span></h2>
                <p className="mt-3 text-[14.5px] text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Try the full card free for 30 days. No payment details needed to start.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/signup" className="dc-btn-shine group relative overflow-hidden h-[52px] px-8 rounded-2xl gradient-gold text-[#0F172A] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                    <span className="relative z-10">Start Free Trial</span> <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link to="/pricing" className="h-[52px] px-8 rounded-2xl inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white ring-1 ring-white/20 hover:bg-white/10 active:scale-[0.97] transition-all">
                    See Pricing <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
