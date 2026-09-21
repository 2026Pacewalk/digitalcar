import {
  Check, ArrowRight, ChevronRight, Sparkles, Zap, Crown, IdCard, QrCode, Images, Tag, MessageSquare, Globe, Star,
  ShieldCheck, Nfc, Truck, X, CalendarCheck, CreditCard, Rocket, Link2, BadgeIndianRupee, Users, Lock,
} from "lucide-react";
import { Link } from "react-router";
import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { planFeatures, type PlanPkg } from "@/lib/planFeatures";
import { NFC_PRODUCTS, NFC_DELIVERY } from "@/lib/nfcProducts";
import { Reveal } from "@/components/public/Reveal";
import JsonLd from "@/components/seo/JsonLd";

/* ── Billing periods ──────────────────────────────────────────── */
type Period = "monthly" | "yearly" | "3year";
const PERIODS: { id: Period; label: string; short: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly", short: "Monthly" },
  { id: "yearly", label: "Yearly", short: "Yearly", badge: "Save 16%" },
  { id: "3year", label: "3 Years", short: "3 Years", badge: "Best value" },
];

/* ── Plans (prices in ₹) ──────────────────────────────────────── */
type Plan = {
  name: string; tagline: string; icon: typeof IdCard; accent: string; popular?: boolean;
  cards: number;                    // digital cards the plan allows
  price: Record<Period, number>;
  cta: string;
  headline: string;                 // what the feature list is "on top of"
  features: { icon?: typeof Check; text: string }[];
};

/* The 30-day trial is ₹0 and needs no payment. FREE30D is the promo code behind
   it: every "Start Free for 30 Days" link carries it, so nobody has to type it,
   and the server records the activation against it. */
const TRIAL_PROMO = "FREE30D";
const TRIAL_CTA = "Start Free for 30 Days";
const TRIAL_SIGNUP = `/signup?promo=${TRIAL_PROMO}`;

const PLANS: Plan[] = [
  {
    name: "Free Trial", tagline: "Test-drive the full card", icon: Sparkles, accent: "#14B8A6", cards: 1,
    price: { monthly: 0, yearly: 0, "3year": 0 },
    cta: TRIAL_CTA,
    headline: "Everything, free for 30 days:",
    features: [
      { icon: Zap, text: "Your live digital card in minutes" },
      { icon: Crown, text: "All premium features unlocked" },
      { icon: QrCode, text: "Custom QR code + shareable link" },
      { icon: Check, text: "No payment required — instant activation" },
      { icon: Check, text: "Your card stays saved after the trial" },
      { icon: Check, text: "Upgrade anytime" },
    ],
  },
  {
    name: "Gold", tagline: "Everything a business needs", icon: Star, accent: "#F7B31C", popular: true, cards: 1,
    price: { monthly: 99, yearly: 999, "3year": 2499 },
    cta: "Get Gold",
    headline: "Your professional digital card:",
    features: [
      { icon: IdCard, text: "1 digital card + personal link & QR" },
      { icon: Tag, text: "Up to 25 products / services" },
      { icon: Images, text: "20-photo gallery + 8 videos" },
      { icon: Tag, text: "Up to 15 offers & deals" },
      { icon: MessageSquare, text: "Enquiry form — capture every lead" },
      { icon: Star, text: "Google reviews on your card" },
      { icon: Crown, text: "All 50+ templates + link-in-bio styles" },
      { icon: Check, text: "UPI / payment + bank details" },
      { icon: Check, text: "Visit & tap analytics" },
    ],
  },
  {
    name: "Platinum", tagline: "For brands that want it all", icon: Crown, accent: "#8B5CF6", cards: 3,
    price: { monthly: 199, yearly: 1999, "3year": 4999 },
    cta: "Go Platinum",
    headline: "Everything in Gold, plus:",
    features: [
      { icon: IdCard, text: "Up to 3 digital cards" },
      { icon: Tag, text: "Unlimited products & offers" },
      { icon: Images, text: "60-photo gallery + 25 videos" },
      { icon: Globe, text: "Custom domain (yourbrand.com)" },
      { icon: Crown, text: "Remove DigitalCarda branding" },
      { icon: Sparkles, text: "AI writes your card content" },
      { icon: Globe, text: "Multi-language card" },
      { icon: Zap, text: "Advanced analytics + export" },
      { icon: Star, text: "Full SEO controls + priority support" },
    ],
  },
];

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
/* Effective per-month + savings vs paying monthly */
const perMonth = (p: Plan, period: Period) =>
  period === "monthly" ? p.price.monthly : period === "yearly" ? Math.round(p.price.yearly / 12) : Math.round(p.price["3year"] / 36);
const perDay = (p: Plan, period: Period) => {
  const paid = p.price[period];
  const days = period === "monthly" ? 30 : period === "yearly" ? 365 : 1095;
  return paid / days;
};
const savingsPct = (p: Plan, period: Period) => {
  if (period === "monthly" || p.price.monthly === 0) return 0;
  const months = period === "yearly" ? 12 : 36;
  const full = p.price.monthly * months;
  const paid = period === "yearly" ? p.price.yearly : p.price["3year"];
  return Math.round(((full - paid) / full) * 100);
};
const periodLabel = (period: Period) => (period === "monthly" ? "/mo" : period === "yearly" ? "/yr" : "/ 3 yrs");

/* ── Build the display plans from the DB (admin → Packages). Prices, limits &
   feature flags come from subscription_packages; the per-plan bullets are
   auto-generated from that data, so editing a plan in the admin updates this
   page. Falls back to the static PLANS while the query loads. ── */
type DbPkg = {
  name: string; description?: string | null; monthlyPrice: string | number; yearlyPrice: string | number;
  threeYearPrice?: string | number | null;
  maxCards: number; maxProducts: number; maxGalleryImages: number; maxVideos: number;
  featureCustomDomain: boolean; featureSEO: boolean; featureAnalytics: boolean; featureLeadCapture: boolean;
  featureRemoveBranding: boolean; featureWhiteLabel: boolean; featurePrioritySupport: boolean;
  featureAI: boolean; featureMultilingual: boolean; featureCRM: boolean;
};
const ICON_BY: Record<string, typeof IdCard> = { Trial: Sparkles, Gold: Star, Platinum: Crown };
const ACCENT_BY: Record<string, string> = { Trial: "#14B8A6", Gold: "#F7B31C", Platinum: "#8B5CF6" };
const num = (v: unknown) => Number(v ?? 0);

function buildPlans(pkgs: DbPkg[]): Plan[] {
  return pkgs.map((p) => {
    const monthly = num(p.monthlyPrice), yearly = num(p.yearlyPrice);
    const isFree = monthly === 0 && yearly === 0;
    // The 3-year price is its own column (what checkout charges); only estimate it if missing.
    const three = num(p.threeYearPrice) || Math.round(yearly * 2.5);
    return {
      name: isFree ? "Free Trial" : p.name,
      tagline: p.description || "",
      icon: ICON_BY[p.name] || Star,
      accent: ACCENT_BY[p.name] || "#F7B31C",
      popular: p.name === "Gold",
      cards: Math.max(1, num(p.maxCards) || 1),
      price: { monthly, yearly, "3year": three },
      cta: isFree ? TRIAL_CTA : `Get ${p.name}`,
      headline: isFree ? "Everything, free for 30 days:" : `Your ${p.name} plan includes:`,
      // Shared with the dashboard Subscription module so the two never drift.
      features: planFeatures(p as unknown as PlanPkg).map((text) => ({ text })),
    };
  });
}

/* ── Comparison table (built from the same package rows) ──────── */
type Cell = boolean | string;
type CompareRow = { label: string; cells: Cell[] };
const FALLBACK_PKGS: DbPkg[] = [
  { name: "Trial", monthlyPrice: 0, yearlyPrice: 0, maxCards: 1, maxProducts: 25, maxGalleryImages: 20, maxVideos: 8, featureCustomDomain: false, featureSEO: false, featureAnalytics: true, featureLeadCapture: true, featureRemoveBranding: false, featureWhiteLabel: false, featurePrioritySupport: false, featureAI: false, featureMultilingual: false, featureCRM: false },
  { name: "Gold", monthlyPrice: 99, yearlyPrice: 999, threeYearPrice: 2499, maxCards: 1, maxProducts: 25, maxGalleryImages: 20, maxVideos: 8, featureCustomDomain: false, featureSEO: false, featureAnalytics: true, featureLeadCapture: true, featureRemoveBranding: false, featureWhiteLabel: false, featurePrioritySupport: false, featureAI: false, featureMultilingual: false, featureCRM: false },
  { name: "Platinum", monthlyPrice: 199, yearlyPrice: 1999, threeYearPrice: 4999, maxCards: 3, maxProducts: 9999, maxGalleryImages: 60, maxVideos: 25, featureCustomDomain: true, featureSEO: true, featureAnalytics: true, featureLeadCapture: true, featureRemoveBranding: true, featureWhiteLabel: false, featurePrioritySupport: true, featureAI: true, featureMultilingual: true, featureCRM: true },
];
function compareGroups(pkgs: DbPkg[]): { title: string; rows: CompareRow[] }[] {
  const all = (fn: (p: DbPkg) => Cell) => pkgs.map(fn);
  return [
    {
      title: "Your card",
      rows: [
        { label: "Digital cards", cells: all((p) => String(p.maxCards || 1)) },
        { label: "Personal link & QR code", cells: all(() => true) },
        { label: "50+ templates", cells: all(() => true) },
        { label: "Products & services", cells: all((p) => (num(p.maxProducts) >= 9999 ? "Unlimited" : String(p.maxProducts))) },
        { label: "Gallery photos", cells: all((p) => String(p.maxGalleryImages)) },
        { label: "Videos", cells: all((p) => String(p.maxVideos)) },
      ],
    },
    {
      title: "Grow your business",
      rows: [
        { label: "Enquiry form & leads", cells: all((p) => !!p.featureLeadCapture) },
        { label: "Google reviews & payment links", cells: all(() => true) },
        { label: "Analytics", cells: all((p) => (p.featureCustomDomain ? "Advanced" : p.featureAnalytics ? "Views & taps" : false)) },
        { label: "AI writes your content", cells: all((p) => !!p.featureAI) },
        { label: "Multi-language card", cells: all((p) => !!p.featureMultilingual) },
        { label: "Full SEO controls", cells: all((p) => !!p.featureSEO) },
      ],
    },
    {
      title: "Your brand",
      rows: [
        { label: "Remove DigitalCarda branding", cells: all((p) => !!p.featureRemoveBranding) },
        { label: "Custom domain", cells: all((p) => (p.featureCustomDomain ? "₹499 add-on" : false)) },
        { label: "Priority support", cells: all((p) => !!p.featurePrioritySupport) },
      ],
    },
  ];
}

const faqs = [
  { q: "Is the 30-day trial really free?", a: "Yes — ₹0, and no payment details of any kind. Promo code FREE30D is applied for you when you sign up, so you get the full card with every premium feature unlocked for 30 days. When it ends, pick a plan to keep your card live; nothing is ever charged automatically." },
  { q: "What do I actually get on a paid plan?", a: "Your live digital card on a personal link and QR, with lead capture, Google reviews, payment links, gallery and video, and all 50+ templates. Gold covers one card and up to 25 products; Platinum adds up to 3 cards, unlimited products, a bigger 60-photo gallery, AI content, multi-language and priority support." },
  { q: "Monthly, Yearly or 3-Year — which should I pick?", a: "The same card, cheaper the longer you commit. Yearly saves about 16% (roughly two months free) over monthly, and the 3-Year plan is the best value — and on Platinum it includes the custom-domain setup free." },
  { q: "Will my plan renew automatically?", a: "No. Plans don't renew by themselves — we send you a reminder before yours ends, and you choose whether to renew. You're never charged without paying yourself." },
  { q: "Can I upgrade later?", a: "Anytime. Your card, link and QR stay exactly the same — you just unlock more features and higher limits instantly. We never make you rebuild anything." },
  { q: "How do the NFC card and standee work?", a: "They are printed products with an NFC chip that opens your DigitalCarda link: tap a phone on them and your card opens, and the printed QR code works on any phone. The NFC PVC card is ₹499 per card, printed on both sides; the NFC standee is ₹1,499 per standee, printed on one side. Order from your dashboard — delivery is free across India and takes 3–7 working days." },
  { q: "How does the custom domain work?", a: "It's a one-time ₹499 add-on (free on the Platinum 3-Year plan). Buy a domain from any registrar or use one you already own — you keep full ownership — and our team connects it to your card with HTTPS, usually within 24–48 hours. The domain's own registration fee is separate." },
  { q: "What payment methods do you accept?", a: "UPI, credit/debit cards, net banking, Paytm and GPay, through Razorpay's secure checkout. On yearly and 3-year plans you pay once and you're set for the whole term." },
  { q: "Cards for a whole team?", a: "Use Bulk Cards for 10+ people — the more you add, the lower the per-card price (down to ₹399/card/year), with one shared company template and branding." },
  { q: "Can I get a refund?", a: "Yes — if your first paid plan isn't right for you, ask within 7 days of buying it for a full refund. See our refund policy for the details." },
];

const STEPS = [
  { icon: Rocket, title: "Start free", text: "Build your card and share it for 30 days — no payment details." },
  { icon: CalendarCheck, title: "Pick a plan", text: "Before the trial ends, choose Gold or Platinum and pay once." },
  { icon: Link2, title: "Keep everything", text: "Same card, same link, same QR — nothing to rebuild or reprint." },
];

/* Custom-domain visual: the address swaps from our link to the customer's own. */
function DomainMorph() {
  const [own, setOwn] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setOwn(true); return; }
    const t = setInterval(() => setOwn((v) => !v), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3" aria-hidden="true">
      <div className="flex items-center gap-1.5 px-1 pb-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80" /><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80" /><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/80" />
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-[#0B1120] px-3 h-10 ring-1 ring-white/10 overflow-hidden">
        <Lock size={13} className={own ? "text-[#22C55E]" : "text-[#94A3B8]"} />
        <span key={String(own)} className="dc-swap-in font-mono text-[13px] truncate">
          {own ? <><span className="text-white font-semibold">card.nayarainteriors</span><span className="text-[#C4B5FD]">.com</span></> : <span className="text-[#94A3B8]">digitalcarda.in/<span className="text-[#CBD5E1]">aarav</span></span>}
        </span>
        {own && <span className="ml-auto shrink-0 rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-bold text-[#4ADE80]">HTTPS</span>}
      </div>
    </div>
  );
}

/* NFC product illustrations (decorative). */
function NfcWaves({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`absolute flex items-center justify-center ${className}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="dc-nfc-wave absolute rounded-full border-2 border-[#F7B31C]" style={{ width: 26 + i * 20, height: 26 + i * 20, animationDelay: `${i * 0.45}s` }} />
      ))}
    </span>
  );
}

function NfcCardArt() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center [perspective:800px] lg:scale-[0.85]">
      {/* back card */}
      <div className="absolute w-[168px] h-[104px] rounded-xl bg-white shadow-lg ring-1 ring-black/5 rotate-[10deg] translate-x-8 translate-y-3 p-2.5 flex items-end justify-end">
        <span className="grid grid-cols-4 gap-[2px]">{Array.from({ length: 16 }).map((_, i) => <span key={i} className={`w-[5px] h-[5px] ${[0,1,3,4,6,9,11,12,13,15].includes(i) ? "bg-[#0F172A]" : ""}`} />)}</span>
      </div>
      {/* front card */}
      <div className="relative w-[168px] h-[104px] rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] shadow-[0_18px_30px_-12px_rgba(15,23,42,0.6)] -rotate-[8deg] -translate-x-6 transition-transform duration-500 group-hover:-rotate-[2deg] group-hover:-translate-y-1 overflow-hidden p-3">
        <span className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-[#F7B31C]/25 blur-xl" />
        <span className="block w-6 h-4 rounded bg-gradient-to-br from-[#FDE68A] to-[#B45309]" />
        <span className="mt-3 block h-1.5 w-16 rounded-full bg-white/80" />
        <span className="mt-1.5 block h-1 w-10 rounded-full bg-white/35" />
        <span className="absolute right-4 bottom-4"><NfcWaves /></span>
        <Nfc size={14} className="absolute right-[9px] bottom-[9px] text-[#F7B31C]" />
      </div>
    </div>
  );
}

function NfcStandeeArt() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-end justify-center pb-3">
      <div className="relative origin-bottom lg:scale-[0.8] transition-transform duration-500 group-hover:-translate-y-1">
        {/* stand base */}
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[112px] h-3 rounded-full bg-[#0F172A]/15 blur-[2px]" />
        <div className="relative w-[96px] h-[132px] rounded-t-[14px] rounded-b-md bg-white shadow-[0_18px_30px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/5 overflow-hidden">
          <div className="h-9 bg-gradient-to-br from-[#F7B31C] to-[#E09A12] flex items-center justify-center">
            <span className="h-1.5 w-12 rounded-full bg-[#0F172A]/70" />
          </div>
          <div className="mx-auto mt-2 w-12 h-12 rounded-md bg-white ring-1 ring-[#E2E8F0] p-1 grid grid-cols-5 gap-[1.5px]">
            {Array.from({ length: 25 }).map((_, i) => <span key={i} className={[0,1,2,4,5,7,10,12,14,17,19,20,22,23,24].includes(i) ? "bg-[#0F172A]" : ""} />)}
          </div>
          <span className="mx-auto mt-2 block h-1 w-14 rounded-full bg-[#CBD5E1]" />
          <span className="mx-auto mt-1 block h-1 w-9 rounded-full bg-[#E2E8F0]" />
        </div>
        <span className="absolute -right-10 top-6"><NfcWaves /></span>
        {/* phone tapping */}
        <div className="dc-nfc-tap absolute -right-14 top-2 w-9 h-16 rounded-[10px] bg-[#0F172A] ring-2 ring-[#334155] p-1">
          <span className="block w-full h-full rounded-[6px] bg-gradient-to-b from-[#14B8A6] to-[#0F766E]" />
        </div>
      </div>
    </div>
  );
}

function CompareCell({ v, accent }: { v: Cell; accent: string }) {
  if (v === true) return <span className="mx-auto w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${accent}1F`, color: accent === "#F7B31C" ? "#B45309" : accent }}><Check size={14} strokeWidth={3} aria-label="Included" /></span>;
  if (v === false) return <span className="mx-auto w-6 h-6 rounded-full flex items-center justify-center text-[#CBD5E1]"><X size={14} aria-label="Not included" /></span>;
  return <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#0F172A]">{v}</span>;
}

export default function Pricing() {
  const [period, setPeriod] = useState<Period>("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { data: pkgs } = trpc.package.list.useQuery();
  const plans = pkgs && pkgs.length ? buildPlans(pkgs as unknown as DbPkg[]) : PLANS;
  const tablePkgs = pkgs && pkgs.length ? (pkgs as unknown as DbPkg[]) : FALLBACK_PKGS;
  const groups = compareGroups(tablePkgs);

  // Phones show one plan at a time; Gold first.
  const popularIdx = Math.max(0, plans.findIndex((p) => p.popular));
  const [mobilePlan, setMobilePlan] = useState<number | null>(null);
  const activeMobile = mobilePlan ?? popularIdx;
  const touchX = useRef<number | null>(null);

  // Sliding indicator for the billing toggle, measured from the active button so
  // it tracks labels of different widths (and the badges that come and go).
  const periodRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const periodIdx = PERIODS.findIndex((p) => p.id === period);
  useLayoutEffect(() => {
    const measure = () => {
      const el = periodRefs.current[periodIdx];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [periodIdx]);

  /* Structured data: the FAQ, plus the paid plans as real Offers built from the
     LIVE prices so the markup can never drift from what is on screen. Built
     during render from the same `plans` the cards use, so it is in the
     server-rendered HTML and matches on hydration. */
  const paid = plans.filter((p) => p.price.monthly > 0);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      ...(paid.length ? [{
        "@type": "Product",
        name: "DigitalCarda digital business card",
        description: "A digital business card with QR code, WhatsApp chat, payment links, products, gallery, lead capture and analytics.",
        brand: { "@type": "Brand", name: "DigitalCarda" },
        offers: paid.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: String(p.price.monthly),
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: "https://digitalcarda.in/pricing",
        })),
        // Matches the rating shown on the home page — "4.9/5 from 1,456+
        // businesses" — collected from Indian customers using DigitalCarda.
        // Resolves the Search Console "Missing field aggregateRating" warning.
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "1456",
          bestRating: "5",
          worstRating: "1",
        },
      }] : []),
    ],
  };

  const goldPlan = plans.find((p) => p.popular);

  return (
    <div className="bg-[#F8FAFC] relative overflow-hidden">
      <JsonLd id="dc-pricing-ld" data={ld} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 sm:pt-32 lg:pt-28 pb-40 sm:pb-48 lg:pb-40">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-40 right-[-10%] w-[560px] h-[560px] rounded-full blur-3xl bg-[#F7B31C]/20 animate-aurora-drift" />
        <div aria-hidden="true" className="absolute top-40 left-[-15%] w-[460px] h-[460px] rounded-full blur-3xl bg-[#8B5CF6]/20 animate-aurora-drift" style={{ animationDelay: "3s" }} />
        <div aria-hidden="true" className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-[#0F172A]/40" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal stagger>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] ring-1 ring-white/10">
              <BadgeIndianRupee size={14} /> Simple pricing
            </span>
            <h1 className="mt-5 font-display text-[2.4rem] sm:text-[3.2rem] lg:text-[3.3rem] font-extrabold leading-[1.04] tracking-tight text-white [text-wrap:balance]">
              One card. <span className="text-gradient-gold">Every way to be found.</span>
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-[15.5px] sm:text-[18px] leading-relaxed text-[#CBD5E1]">
              Start free for 30 days — every feature, no payment required. Then keep your card live from just{" "}
              <span className="font-bold text-white">{goldPlan ? inr(Math.round(goldPlan.price.yearly / 12)) : "₹83"}/month</span>, billed yearly.
            </p>
          </Reveal>

          {/* Billing toggle */}
          <Reveal className="mt-8 flex justify-center">
            <div role="radiogroup" aria-label="Billing period" className="relative inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.07] ring-1 ring-white/15 backdrop-blur">
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 rounded-xl gradient-gold shadow-gold transition-all duration-500"
                style={{ left: pill.left, width: pill.width, transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
              />
              {PERIODS.map((p, i) => (
                <button
                  key={p.id}
                  ref={(el) => { periodRefs.current[i] = el; }}
                  onClick={() => setPeriod(p.id)}
                  role="radio"
                  aria-checked={period === p.id}
                  className={`relative z-10 px-3.5 sm:px-5 h-11 rounded-xl text-[13.5px] sm:text-sm font-bold transition-colors duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${period === p.id ? "text-[#0F172A]" : "text-[#CBD5E1] hover:text-white"}`}
                >
                  <span className="flex flex-col sm:flex-row items-center sm:gap-1.5 leading-none">
                    {p.label}
                    {p.badge && <span className={`mt-1 sm:mt-0 text-[9.5px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full transition-colors ${period === p.id ? "bg-[#0F172A]/12 text-[#0F172A]" : "bg-[#22C55E]/20 text-[#4ADE80]"}`}>{p.badge}</span>}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#4ADE80]" /> No payment details for the trial</span>
            <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#4ADE80]" /> No auto-renewal</span>
            <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#4ADE80]" /> 7-day money-back</span>
          </Reveal>
        </div>
      </section>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 sm:-mt-36 lg:-mt-32">
        {/* ── Mobile plan switcher ── */}
        <div className="md:hidden mb-4">
          <div role="tablist" aria-label="Choose a plan" className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white shadow-premium-lg ring-1 ring-[#E2E8F0]">
            {plans.map((p, i) => {
              const on = i === activeMobile;
              return (
                <button key={p.name} role="tab" aria-selected={on} aria-controls={`plan-${i}`} onClick={() => setMobilePlan(i)}
                  className={`relative h-12 rounded-xl text-[13px] font-bold transition-all active:scale-95 flex flex-col items-center justify-center leading-tight ${on ? "text-white shadow-md" : "text-[#64748B]"}`}
                  style={on ? { background: p.popular ? "linear-gradient(135deg,#F7B31C,#E09A12)" : "#0F172A", color: p.popular ? "#0F172A" : "#fff" } : undefined}>
                  <span className="flex items-center gap-1"><p.icon size={13} /> {p.name.replace("Free ", "")}</span>
                  <span className={`text-[10.5px] font-semibold ${on ? "opacity-80" : "text-[#94A3B8]"}`}>{p.price.monthly === 0 ? "₹0" : inr(p.price[period])}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Plans ── */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null;
            if (Math.abs(dx) > 60) setMobilePlan(Math.min(plans.length - 1, Math.max(0, activeMobile + (dx < 0 ? 1 : -1))));
          }}
        >
          {plans.map((plan, idx) => {
            const isFree = plan.price.monthly === 0;
            const price = plan.price[period];
            const sv = savingsPct(plan, period);
            const card = (
              <div className={`relative h-full flex flex-col rounded-[26px] bg-white overflow-hidden ${plan.popular ? "" : "ring-1 ring-[#E2E8F0] shadow-premium"}`}>
                {/* accent wash */}
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: `linear-gradient(180deg, ${plan.accent}1F, transparent)` }} />
                <div className="relative p-6 sm:p-7 lg:p-6 flex flex-col flex-1">
                  {/* Head */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 lg:w-10 lg:h-10 rounded-2xl lg:rounded-xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ background: plan.accent }}><plan.icon size={22} className={plan.popular ? "text-[#0F172A]" : ""} /></span>
                      <div>
                        <h2 className="font-display text-[1.25rem] lg:text-[1.15rem] font-extrabold text-[#0F172A] leading-none">{plan.name}</h2>
                        <p className="text-[12px] text-[#64748B] mt-1.5">{plan.tagline}</p>
                      </div>
                    </div>
                    {plan.popular && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-[#F7B31C]">
                        <Star size={11} className="fill-[#F7B31C]" /> POPULAR
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-6 lg:mt-4 flex items-end gap-1.5">
                    <span key={`${plan.name}-${period}`} className="dc-rise font-display text-[3rem] lg:text-[2.4rem] leading-none font-extrabold text-[#0F172A] tabular-nums tracking-tight">{isFree ? "₹0" : inr(price)}</span>
                    <span className="text-[14px] font-semibold text-[#94A3B8] mb-1.5">{isFree ? "/ 30 days" : periodLabel(period)}</span>
                  </div>
                  <div className="mt-2 min-h-[24px] flex flex-wrap items-center gap-1.5 text-[12.5px] text-[#64748B]">
                    {isFree && <span>No payment required · then from {goldPlan ? inr(Math.round(goldPlan.price.yearly / 12)) : "₹83"}/mo</span>}
                    {/* Multi-card plans are priced per card — ₹1,999 buys 3 cards, not one. */}
                    {!isFree && plan.cards > 1 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A]">
                        <IdCard size={13} style={{ color: plan.accent }} /> {plan.cards} cards · {inr(price / plan.cards)}/card{periodLabel(period)}
                      </span>
                    )}
                    {!isFree && plan.cards <= 1 && period !== "monthly" && <span className="font-semibold text-[#0F172A]">{inr(perMonth(plan, period))}/mo</span>}
                    {!isFree && plan.cards <= 1 && <span className="text-[#94A3B8]">≈ ₹{perDay(plan, period).toFixed(1)} a day</span>}
                    {sv > 0 && <span key={`sv-${period}`} className="dc-rise text-[11px] font-extrabold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full">Save {sv}%</span>}
                  </div>

                  {/* CTA — the free plan carries the promo code so it applies itself */}
                  <Link to={isFree ? TRIAL_SIGNUP : "/signup"}
                    className={`dc-btn group relative mt-6 lg:mt-4 w-full h-[52px] lg:h-11 rounded-2xl lg:rounded-xl text-[15px] lg:text-[14px] font-extrabold flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F7B31C] ${plan.popular ? "gradient-gold text-[#0F172A] shadow-gold hover:-translate-y-0.5 dc-btn-shine" : isFree ? "bg-[#0F172A] text-white hover:bg-[#1E293B] hover:-translate-y-0.5 dc-btn-shine" : "bg-white text-[#0F172A] ring-2 ring-[#0F172A] hover:bg-[#0F172A] hover:text-white"}`}>
                    <span className="relative z-10">{plan.cta}</span>
                    <ArrowRight size={17} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <p className="mt-2.5 text-center text-[11.5px] text-[#94A3B8]">
                    {isFree
                      ? <span className="inline-flex items-center gap-1 font-semibold text-[#0F9488]"><Check size={12} /> {TRIAL_PROMO} — auto applied</span>
                      : <span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500" /> Secure checkout · UPI, card, net banking</span>}
                  </p>

                  <div className="my-6 lg:my-4 h-px bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent" />

                  {/* Features */}
                  <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.12em] mb-3.5 lg:mb-2.5">{plan.headline}</p>
                  <ul className="space-y-2.5 lg:space-y-2">
                    {plan.features.map((f, j) => {
                      const Icon = f.icon || Check;
                      return (
                        (plan.cards > 1 && /digital cards/i.test(f.text)) ? (
                          <li key={j} className="-mx-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-bold text-[#0F172A] leading-snug" style={{ background: `${plan.accent}1A`, boxShadow: `inset 0 0 0 1px ${plan.accent}55` }}>
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: plan.accent }}><IdCard size={13} /></span>
                            <span className="flex-1">{f.text}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ background: plan.accent }}>{plan.cards}×</span>
                          </li>
                        ) : (
                        <li key={j} className="flex items-start gap-2.5 text-[13.5px] lg:text-[13px] text-[#334155] leading-snug">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px" style={{ background: `${plan.accent}24`, color: plan.accent === "#F7B31C" ? "#B45309" : plan.accent }}><Icon size={11} strokeWidth={3} /></span>
                          <span>{f.text}</span>
                        </li>
                        )
                      );
                    })}
                  </ul>

                  {/* Custom-domain add-on — free on Platinum 3-year, else a ₹499 add-on */}
                  {plan.name === "Platinum" && (
                    period === "3year" ? (
                      <div key="free-domain" className="dc-rise mt-5 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] border border-[#BBF7D0] px-3 py-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#16A34A] flex items-center justify-center shrink-0"><Globe size={14} className="text-white" /></span>
                        <span className="text-[12.5px] leading-tight text-[#166534]"><span className="font-bold">Custom domain included FREE</span> — worth ₹499</span>
                      </div>
                    ) : (
                      <div key="paid-domain" className="mt-5 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#F5F3FF] to-[#FAF5FF] border border-[#E9D5FF] px-3 py-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#8B5CF6] flex items-center justify-center shrink-0"><Globe size={14} className="text-white" /></span>
                        <span className="text-[12.5px] leading-tight text-[#5B21B6]"><span className="font-bold">Add-on: Custom domain</span> — ₹499 <span className="text-[#8B5CF6]">(free on 3-Year)</span></span>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
            return (
              <Reveal key={plan.name}
                className={`${idx === activeMobile ? "block" : "hidden"} md:block ${plan.popular ? "md:-mt-4 md:mb-4" : "md:mt-4"}`}>
                <div id={`plan-${idx}`} role="tabpanel" className="h-full">
                  {plan.popular ? (
                    /* Animated gradient border for the recommended plan */
                    <div className="relative h-full rounded-[28px] p-[2px] overflow-hidden shadow-[0_30px_60px_-25px_rgba(247,179,28,0.55)]">
                      <span aria-hidden="true" className="dc-border-spin absolute left-1/2 top-1/2 w-[200%] aspect-square -translate-x-1/2 -translate-y-1/2" />
                      <div className="relative h-full">{card}</div>
                    </div>
                  ) : card}
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Mobile swipe hint + dots */}
        <div className="md:hidden mt-4 flex items-center justify-center gap-2" aria-hidden="true">
          {plans.map((p, i) => (
            <span key={p.name} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === activeMobile ? 22 : 6, background: i === activeMobile ? p.accent : "#CBD5E1" }} />
          ))}
          <span className="ml-2 text-[11.5px] text-[#94A3B8]">Swipe to compare</span>
        </div>

        {/* ── How it works ── */}
        <Reveal className="mt-14 sm:mt-16">
          <div className="relative rounded-[28px] bg-white ring-1 ring-[#E2E8F0] shadow-premium p-5 sm:p-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">How paying works</p>
            <ol className="mt-5 grid gap-3 md:grid-cols-3 md:gap-6 relative">
              <span aria-hidden="true" className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px border-t-2 border-dashed border-[#E2E8F0]" />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex md:flex-col md:items-center md:text-center gap-4 md:gap-3 rounded-2xl md:rounded-none bg-[#F8FAFC] md:bg-transparent p-4 md:p-0">
                  <span className="relative z-10 w-14 h-14 rounded-2xl gradient-gold text-[#0F172A] flex items-center justify-center shrink-0 shadow-gold ring-4 ring-white">
                    <s.icon size={22} />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0F172A] text-white text-[11px] font-extrabold flex items-center justify-center">{i + 1}</span>
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold text-[#0F172A]">{s.title}</span>
                    <span className="block mt-0.5 text-[13px] text-[#64748B] leading-snug">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        {/* ── Compare plans ── */}
        <section aria-labelledby="compare-h" className="mt-16 sm:mt-20">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#92400E]">Compare</span>
            <h2 id="compare-h" className="mt-3 font-display text-[1.9rem] sm:text-[2.5rem] font-extrabold tracking-tight text-[#0F172A] leading-[1.1]">
              Which plan is <span className="text-gradient-gold">right for you?</span>
            </h2>
            <p className="mt-3 text-[14.5px] text-[#64748B]">Most businesses start on Gold. Pick Platinum for more cards, your own domain, AI and SEO.</p>
          </Reveal>

          <Reveal className="mt-8">
            <div className="rounded-[26px] bg-white ring-1 ring-[#E2E8F0] shadow-premium overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <caption className="sr-only">Plan comparison</caption>
                <thead>
                  <tr className="bg-[#0F172A] text-white">
                    <th scope="col" className="w-[40%] sm:w-[34%] text-left px-3.5 sm:px-6 py-4 text-[12px] sm:text-[13px] font-semibold text-[#94A3B8]">Features</th>
                    {plans.map((p) => (
                      <th key={p.name} scope="col" className="px-1 sm:px-4 py-3 text-center">
                        <span className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5">
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: p.accent }}><p.icon size={14} className={p.popular ? "text-[#0F172A]" : "text-white"} /></span>
                          <span className="text-[12px] sm:text-[14px] font-bold">{p.name.replace("Free ", "")}</span>
                        </span>
                        <span className="block mt-1 text-[10.5px] sm:text-[11.5px] font-medium text-[#94A3B8]">{p.price.monthly === 0 ? "₹0 · 30 days" : `${inr(p.price[period])}${periodLabel(period)}`}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.title}>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-t border-[#F1F5F9] hover:bg-[#FFFBEB]/60 transition-colors">
                        <th scope="row" className="text-left px-3.5 sm:px-6 py-3 lg:py-2.5 text-[12.5px] sm:text-[14px] font-medium text-[#334155] leading-snug">{r.label}</th>
                        {r.cells.slice(0, plans.length).map((c, k) => (
                          <td key={k} className={`px-1 sm:px-4 py-3 text-center ${plans[k]?.popular ? "bg-[#FFFBEB]/70" : ""}`}><CompareCell v={c} accent={plans[k]?.accent || "#F7B31C"} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot>
                  <tr className="border-t border-[#F1F5F9]">
                    <td className="px-3.5 sm:px-6 py-4" />
                    {plans.map((p) => (
                      <td key={p.name} className={`px-1 sm:px-4 py-4 text-center ${p.popular ? "bg-[#FFFBEB]/70" : ""}`}>
                        <Link to={p.price.monthly === 0 ? TRIAL_SIGNUP : "/signup"}
                          className={`group inline-flex items-center justify-center gap-1 h-9 sm:h-10 w-full max-w-[150px] rounded-xl text-[11.5px] sm:text-[13px] font-bold transition-all active:scale-95 ${p.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "bg-[#0F172A] text-white hover:bg-[#1E293B]"}`}>
                          {p.price.monthly === 0 ? "Try free" : "Choose"} <ArrowRight size={13} className="hidden sm:block transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Reveal>
        </section>

        {/* ── Add-ons ── */}
        <section aria-labelledby="addons-h" className="mt-16 sm:mt-20">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#5B21B6]">Add-ons</span>
            <h2 id="addons-h" className="mt-3 font-display text-[1.9rem] sm:text-[2.5rem] font-extrabold tracking-tight text-[#0F172A] leading-[1.1]">Go further, <span className="text-gradient-gold">online and offline.</span></h2>
          </Reveal>

          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {/* Custom domain */}
            <Reveal className="lg:col-span-2">
              <div className="relative h-full overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 lg:p-5 ring-1 ring-white/5 flex flex-col">
                <div aria-hidden="true" className="absolute -top-16 -right-10 w-64 h-64 bg-[#8B5CF6]/25 rounded-full blur-3xl" />
                <span className="relative inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#8B5CF6]/20 text-[#C4B5FD]"><Globe size={12} /> CUSTOM DOMAIN</span>
                <h3 className="relative mt-3 text-[1.35rem] font-extrabold text-white leading-tight">Your card on your own domain</h3>
                <div className="relative mt-4"><DomainMorph /></div>
                
                <ol className="relative mt-4 space-y-2">
                  {[
                    { t: "Choose your address", d: "Use a domain you own, or buy one from any registrar — it stays yours." },
                    { t: "We connect it for you", d: "Our team sets it up with HTTPS, usually within 24–48 hours." },
                    { t: "Share your brand, not ours", d: "Same card, same QR — now on card.yourbrand.com." },
                  ].map((st, k) => (
                    <li key={st.t} className="flex gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-3 py-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#8B5CF6] text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">{k + 1}</span>
                      <span>
                        <span className="block text-[13.5px] font-bold text-white">{st.t}</span>
                        <span className="block text-[12px] text-[#94A3B8] leading-snug">{st.d}</span>
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="relative mt-4 flex flex-wrap gap-1.5">
                  {["Your brand in every link", "Secure HTTPS", "You keep ownership"].map((b) => (
                    <span key={b} className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#DDD6FE]"><Check size={12} /> {b}</span>
                  ))}
                </div>

                <div className="relative mt-auto pt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="flex items-baseline gap-1.5"><span className="text-3xl font-extrabold text-white">₹499</span><span className="text-[12px] text-[#94A3B8]">one-time</span></p>
                    <p className="text-[11.5px] text-[#C4B5FD] font-semibold">Free on Platinum 3-Year</p>
                  </div>
                  <Link to="/custom-domain" className="group inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-white text-[#0F172A] text-[13px] font-bold hover:bg-[#F1F5F9] active:scale-95 transition-all">
                    Learn more <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* NFC products */}
            <Reveal className="lg:col-span-3">
              <div className="h-full rounded-[26px] bg-white p-5 sm:p-6 ring-1 ring-[#E2E8F0] shadow-premium">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E]"><Nfc size={12} /> PRINTED &amp; DELIVERED</span>
                    <h3 className="mt-3 text-[1.35rem] font-extrabold text-[#0F172A] leading-tight">Take your card offline with NFC</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#64748B]">Tap a phone on it and your digital card opens — the printed QR covers every other phone.</p>
                  </div>
                  <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-semibold text-[#166534]"><Truck size={14} /> Free delivery · {NFC_DELIVERY.label}</p>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {NFC_PRODUCTS.map((p) => {
                    const isCard = p.id === "nfc_card";
                    return (
                      <div key={p.id} className="group relative flex flex-col overflow-hidden rounded-[22px] bg-white ring-1 ring-[#E2E8F0] transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/50">
                        {/* Product stage */}
                        <div className={`relative h-44 lg:h-36 overflow-hidden ${isCard ? "bg-gradient-to-br from-[#FEF3C7] via-[#FDE68A]/60 to-[#FFFBEB]" : "bg-gradient-to-br from-[#CCFBF1] via-[#99F6E4]/50 to-[#F0FDFA]"}`}>
                          <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-40" />
                          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-[#0F172A] shadow-sm">{p.print.toUpperCase()}</span>
                          <span className="absolute right-3 top-3 z-10 rounded-2xl bg-[#0F172A] px-3 py-1.5 text-right shadow-lg">
                            <span className="block text-[17px] font-extrabold leading-none text-white">₹{p.price.toLocaleString("en-IN")}</span>
                            <span className="block text-[10px] font-semibold text-[#F7B31C]">per {p.unit}</span>
                          </span>
                          {isCard ? <NfcCardArt /> : <NfcStandeeArt />}
                        </div>

                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <h4 className="font-display text-[17px] font-extrabold text-[#0F172A]">{p.name}</h4>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-[#64748B] lg:line-clamp-2">{p.tagline}</p>
                          <ul className="mt-3 flex-1 space-y-1.5">
                            {p.points.map((pt, k) => {
                              const Icon = [Nfc, Images, ShieldCheck, Link2][k % 4];
                              return (
                                <li key={pt} className="flex items-start gap-2.5 text-[12.5px] lg:text-[12px] leading-snug text-[#334155]">
                                  <span className={`mt-px w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isCard ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#CCFBF1] text-[#0F766E]"}`}><Icon size={13} /></span>
                                  {pt}
                                </li>
                              );
                            })}
                          </ul>
                          <Link to="/login?next=/dashboard/nfc"
                            className={`dc-btn-shine group/btn relative mt-4 inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl text-[14px] font-extrabold transition-all hover:-translate-y-0.5 active:scale-[0.97] ${isCard ? "gradient-gold text-[#0F172A] shadow-gold" : "bg-[#0F172A] text-white hover:bg-[#1E293B]"}`}>
                            <span className="relative z-10">Order {p.short}</span> <ArrowRight size={16} className="relative z-10 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-[#64748B]">
                  <span className="inline-flex items-center gap-1"><Truck size={13} className="text-[#16A34A]" /> Free delivery across India</span>
                  <span className="inline-flex items-center gap-1"><CreditCard size={13} className="text-[#B45309]" /> Order from your dashboard</span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={13} className="text-[#16A34A]" /> Pay by UPI, card or net banking</span>
                </p>
              </div>
            </Reveal>
          </div>

          {/* Bulk teaser */}
          <Reveal className="mt-4">
            <Link to="/bulk-cards" className="group relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[22px] bg-gradient-to-r from-[#FEF3C7] via-[#FFFBEB] to-white ring-1 ring-[#FDE68A] px-5 sm:px-7 py-5 transition-all hover:shadow-premium-lg">
              <div className="flex items-center gap-3.5">
                <span className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shrink-0 shadow-gold transition-transform group-hover:scale-110"><Users size={22} className="text-[#0F172A]" /></span>
                <div>
                  <p className="text-[15px] font-extrabold text-[#0F172A]">Cards for your whole team?</p>
                  <p className="text-[13px] text-[#78350F]/80">Bulk pricing from 10 cards — as low as ₹399/card/year with shared branding.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0F172A] text-white text-[13px] font-bold whitespace-nowrap transition-all group-hover:gap-2.5">View Bulk Cards <ArrowRight size={15} /></span>
            </Link>
          </Reveal>
        </section>

        {/* ── FAQs ── */}
        <section aria-labelledby="faq-h" className="mt-16 sm:mt-24 max-w-3xl mx-auto">
          <Reveal className="text-center mb-8">
            <h2 id="faq-h" className="font-display text-[1.9rem] sm:text-[2.5rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.1]">Questions, <span className="text-gradient-gold">answered.</span></h2>
            <p className="mt-2.5 text-[14px] text-[#64748B]">The things people check before they pick a plan.</p>
          </Reveal>
          <Reveal stagger className="space-y-2.5">
            {faqs.map((faq, i) => {
              const on = openFaq === i;
              return (
                <div key={faq.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/50 shadow-premium-lg" : "ring-[#E2E8F0] hover:ring-[#CBD5E1]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(on ? null : i)}
                    aria-expanded={on}
                    className="w-full flex items-center gap-4 text-left px-4 sm:px-6 py-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[12px] font-extrabold tabular-nums transition-colors ${on ? "gradient-gold text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="flex-1"><span className="dc-faq-q">{faq.q}</span></h3>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${on ? "bg-[#0F172A] text-white rotate-90" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      <ChevronRight size={15} />
                    </span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <div className="px-4 sm:px-6 pb-5 sm:pl-[4.5rem]">
                        <p className="dc-faq-a">
                          {faq.a}
                          {faq.q === "Can I get a refund?" && <> <Link to="/refund-policy" className="font-semibold text-[#B45309] underline underline-offset-2">Refund policy</Link></>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </section>

        {/* ── Closing CTA ── */}
        <Reveal className="mt-16 sm:mt-24 mb-16 sm:mb-24">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 sm:p-14 text-center">
            <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
            <div aria-hidden="true" className="absolute -top-24 -right-16 w-80 h-80 bg-[#F7B31C]/20 rounded-full blur-3xl animate-aurora-drift" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-72 h-72 bg-[#14B8A6]/15 rounded-full blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-3 py-1 text-[12px] font-bold text-[#4ADE80] ring-1 ring-[#22C55E]/30"><ShieldCheck size={13} /> 7-day money-back on your first plan</span>
              <h2 className="mt-4 font-display text-[1.9rem] sm:text-[2.8rem] font-extrabold text-white leading-[1.1] tracking-tight">Your card is ready <span className="text-gradient-gold">in minutes.</span></h2>
              <p className="mt-3 text-[14.5px] text-[#94A3B8] max-w-lg mx-auto">₹0 for 30 days with every feature unlocked. No payment required — {TRIAL_PROMO} is applied for you.</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={TRIAL_SIGNUP} className="dc-btn-shine group relative overflow-hidden h-[52px] px-8 rounded-2xl gradient-gold text-[#0F172A] text-[15px] font-extrabold inline-flex items-center justify-center gap-2 shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                  <span className="relative z-10">{TRIAL_CTA}</span> <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/digital-business-cards-templates" className="h-[52px] px-7 rounded-2xl bg-white/[0.08] text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 ring-1 ring-white/15 hover:bg-white/[0.14] active:scale-[0.97] transition-all">
                  <CreditCard size={17} /> See card designs
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
