/**
 * The topical-authority pillar for "digital business card" and "digital visiting
 * card" — one long-form guide at /digital-business-card-guide that answers the
 * head-term queries directly and links out to every industry and city page.
 *
 * SEO metadata is in src/lib/publicSeo.ts under "/digital-business-card-guide".
 *
 * Every price, limit and feature named here is one the product actually has
 * (see /pricing and src/data/industries) — no invented statistics.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, BadgeIndianRupee, BookOpen, Check, ChevronRight, Clock, CreditCard, Globe, IdCard, Image as ImageIcon,
  Languages, Link2, MapPin, MessageCircle, Nfc, Phone, QrCode, Share2, Sparkles, Star, Users, Wallet, X, Zap,
} from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import TutorialPlayer from "@/components/TutorialPlayer";
import { TUTORIAL, tutorialVideoLd } from "@/data/tutorial";
import { INDUSTRIES, industryPath } from "@/data/industries";
import { IndustryIcon } from "@/components/industries/IndustryIcon";

const SIGNUP = "/signup?promo=FREE30D";
const WA = "https://wa.me/919517722444?text=Hi%20DigitalCarda";

/* Short labels so the contents bar stays one row on a laptop. */
const SECTIONS = [
  { id: "what-is", label: "What it is" },
  { id: "why-switch", label: "Why switch" },
  { id: "cost", label: "Cost" },
  { id: "nfc-vs-qr", label: "NFC vs QR" },
  { id: "whats-on-it", label: "On the card" },
  { id: "professions", label: "Professions" },
  { id: "how-to", label: "How to" },
  { id: "where-to-share", label: "Where to share" },
  { id: "cities", label: "Cities" },
  { id: "faq", label: "FAQ" },
];

const PLANS = [
  { name: "Free trial", price: "₹0", unit: "for 30 days", note: "No card details asked", accent: "#14B8A6", icon: Sparkles },
  { name: "Gold", price: "₹999", unit: "/ year", note: "₹99/month · 1 card, everything a business needs", accent: "#F7B31C", icon: Star, popular: true },
  { name: "Platinum", price: "₹1,999", unit: "/ year", note: "₹199/month · up to 3 cards, custom domain, AI writing", accent: "#8B5CF6", icon: CreditCard },
  { name: "NFC card", price: "₹499", unit: "one-time", note: "Printed both sides, free delivery across India", accent: "#3B82F6", icon: Nfc },
];

const PAPER_VS = [
  { label: "Changing a number or address", paper: "Reprint the whole box", digital: "Edit once — every share updates" },
  { label: "Sharing at a distance", paper: "Only hand to hand", digital: "A link on WhatsApp, anywhere" },
  { label: "Knowing who saw it", paper: "No idea", digital: "Views, taps and enquiries" },
  { label: "Taking a booking advance", paper: "Not possible", digital: "UPI and payment QR on the card" },
];

const ESSENTIALS = [
  { icon: IdCard, t: "Name, designation, company, logo" },
  { icon: Phone, t: "One-tap call, WhatsApp, email" },
  { icon: Users, t: "Save Contact (vCard) button" },
  { icon: Link2, t: "Website or Instagram link" },
];
const FOR_BUSINESS = [
  { icon: ImageIcon, t: "Services and products with photos and prices" },
  { icon: MapPin, t: "Google Maps directions" },
  { icon: Wallet, t: "UPI, GPay, PhonePe and bank details" },
  { icon: Star, t: "Google review link" },
  { icon: MessageCircle, t: "Enquiry form straight to your dashboard" },
  { icon: Zap, t: "Analytics — views, clicks, QR scans, sources" },
];

const STEPS = [
  { t: "Pick a design", d: "50+ ready-made templates, one for every trade.", icon: ImageIcon },
  { t: "Add your details", d: "Or paste your website and AI writes the card for you.", icon: Sparkles },
  { t: "Publish and share", d: "A permanent link and QR code you can print anywhere.", icon: QrCode },
];

const SHARE_SPOTS = [
  "Email signature", "WhatsApp Business profile", "Instagram bio", "LinkedIn", "Google Business Profile",
  "Video-call background", "Visiting cards", "Packaging", "Shop counter", "IndiaMART", "JustDial",
  "Event badges", "Invoices", "Ads",
];

const CITIES: [string, string][] = [
  ["mumbai", "Mumbai"], ["delhi", "Delhi"], ["bangalore", "Bangalore"], ["hyderabad", "Hyderabad"],
  ["chennai", "Chennai"], ["kolkata", "Kolkata"], ["pune", "Pune"], ["ahmedabad", "Ahmedabad"],
  ["jaipur", "Jaipur"], ["chandigarh", "Chandigarh"], ["lucknow", "Lucknow"], ["surat", "Surat"],
  ["ludhiana", "Ludhiana"], ["indore", "Indore"], ["nagpur", "Nagpur"], ["gurgaon", "Gurgaon"],
];

const FAQS = [
  { q: "Does the person receiving it need an app?", a: "No. The card is a web page, so it opens in any phone browser. Neither you nor the person you share it with installs anything — the reason cards get opened far more often than a PDF or a contact file." },
  { q: "What if my details or design change later?", a: "Change them any time. The link and the QR code stay the same, so every card, standee and brochure you have already printed keeps working." },
  { q: "Can I have more than one card on one login?", a: "Yes. The Platinum plan covers up to 3 cards — useful for a team, a second branch or a second business." },
  { q: "Can I write my card in Hindi or a regional language?", a: "Yes. You can type or paste the text you want in any language, so the card can be in Hindi, Marathi, Tamil or any other language your customers read." },
  { q: "Does it work without internet?", a: "The card needs a data connection to open. Once it is open, Save Contact downloads a vCard, so your number stays in the visitor's phone even offline." },
];

export default function DigitalBusinessCardGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.35;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://digitalcarda.in/" },
          { "@type": "ListItem", position: 2, name: "Digital Business Card Guide", item: "https://digitalcarda.in/digital-business-card-guide" },
        ],
      },
      {
        "@type": "Article",
        headline: "Digital Business Card: The Complete India Guide (2026)",
        datePublished: "2026-09-20",
        dateModified: "2026-09-20",
        author: { "@type": "Organization", name: "DigitalCarda" },
        publisher: {
          "@type": "Organization",
          name: "DigitalCarda",
          logo: { "@type": "ImageObject", url: "https://digitalcarda.in/apple-touch-icon.png" },
        },
        mainEntityOfPage: "https://digitalcarda.in/digital-business-card-guide",
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // The site header and this contents bar both float above the page, so scroll
    // to the heading minus their height — otherwise the heading lands under them.
    const bar = document.getElementById("guide-toc")?.getBoundingClientRect().height ?? 48;
    const top = el.getBoundingClientRect().top + window.scrollY - (72 + bar + 16);
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="bg-[#F8FAFC]">
      <JsonLd data={jsonLd} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 pb-24 sm:pt-32 sm:pb-28">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-40 right-[-12%] h-[520px] w-[520px] rounded-full bg-[#F7B31C]/20 blur-3xl animate-aurora-drift" />
        <div aria-hidden="true" className="absolute bottom-[-25%] left-[-10%] h-[420px] w-[420px] rounded-full bg-[#14B8A6]/15 blur-3xl animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#94A3B8]">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2 text-[#475569]">/</span>
            <span className="text-[#E2E8F0]">Digital Business Card Guide</span>
          </nav>

          <span className="dc-enter mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] ring-1 ring-white/10">
            <BookOpen size={13} /> Complete guide
          </span>
          <h1 className="dc-enter dc-enter-1 mt-5 font-display text-[2.3rem] font-extrabold leading-[1.06] tracking-tight text-white sm:text-[3.2rem] [text-wrap:balance]">
            Digital Business Card: the complete <span className="text-gradient-gold">India guide</span>
          </h1>
          <p className="dc-enter dc-enter-2 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-[#FCD34D]" /> 12 minute read</span>
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#4ADE80]" /> Updated September 2026</span>
            <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-[#FCD34D]" /> By the DigitalCarda team</span>
          </p>

          <div className="dc-enter dc-enter-2 mt-7 rounded-[24px] bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur sm:p-6">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#FCD34D]">
              <Zap size={12} /> Quick answer
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[#E2E8F0] sm:text-[16.5px]">
              A digital business card is a web link and QR code that replaces printed visiting cards. In India it costs{" "}
              <strong className="text-white">₹999 a year (₹99/month)</strong> after a <strong className="text-white">30-day free trial</strong>,
              a printed NFC card is <strong className="text-white">₹499</strong> with free delivery, and the card carries WhatsApp, UPI payments,
              your services and an enquiry form. Most people publish theirs in about two minutes.
            </p>
          </div>

          <div className="dc-enter dc-enter-3 mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to={SIGNUP} className="dc-btn-shine group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl gradient-gold px-7 text-[15px] font-extrabold text-[#0F172A] shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
              <span className="relative z-10">Start 30-day free trial</span>
              <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href={WA} target="_blank" rel="noreferrer" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/[0.08] px-7 text-[15px] font-bold text-white ring-1 ring-white/15 transition-all hover:bg-white/[0.14] active:scale-[0.97]">
              <MessageCircle size={17} className="text-[#22C55E]" /> Ask us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Contents ── */}
      <nav id="guide-toc" aria-label="On this page" className="sticky top-[68px] z-30 -mt-10 bg-[#F8FAFC]/85 py-1 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none rounded-2xl bg-white p-1.5 shadow-premium ring-1 ring-[#E2E8F0] [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] md:flex-wrap md:justify-center md:overflow-visible md:[mask-image:none]">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" onClick={() => jump(s.id)} aria-current={active === s.id ? "location" : undefined}
                className={`shrink-0 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-all lg:px-3.5 ${active === s.id ? "bg-[#0F172A] text-white shadow-sm" : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* ── What it is ── */}
        <section id="what-is" className="scroll-mt-32 pt-14">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">What is a digital business card?</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[24px] bg-white p-6 ring-1 ring-[#E2E8F0]">
              <p className="text-[15.5px] leading-relaxed text-[#475569]">
                A digital business card — also called a digital visiting card or smart business card — is a web page carrying your contact
                details, services, payment options and social links in one place. You share it as a link or a QR code, and whoever receives it
                opens it straight away in any browser. Nothing is printed, and no app or account is needed on either side.
              </p>
              <p className="mt-4 text-[15.5px] leading-relaxed text-[#475569]">
                The card lives on a permanent address you own, so you can redesign it, change your number or move offices and every share you
                have ever made keeps working.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["No app to install", "Opens on any phone", "Permanent link & QR", "Edit anytime"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[12.5px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0]">
                    <Check size={12} className="text-[#16A34A]" /> {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 text-white">
              <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#F7B31C]/25 blur-3xl" />
              <p className="relative text-[11px] font-bold uppercase tracking-[0.14em] text-[#FCD34D]">In one line</p>
              <p className="relative mt-3 font-display text-[1.3rem] font-extrabold leading-snug">
                One link. Call, WhatsApp, directions, services, payments and your details — saved in a tap.
              </p>
              <div className="relative mt-5 grid grid-cols-2 gap-2">
                {[{ i: Phone, l: "Call" }, { i: MessageCircle, l: "WhatsApp" }, { i: Wallet, l: "Pay by UPI" }, { i: QrCode, l: "Scan QR" }].map(({ i: I, l }) => (
                  <span key={l} className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[12.5px] font-semibold ring-1 ring-white/10">
                    <I size={14} className="text-[#FCD34D]" /> {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Why switch ── */}
        <section id="why-switch" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">
            Why Indian professionals are moving <span className="text-gradient-gold">off paper</span>
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#64748B]">
            Customers find you on WhatsApp, pay you by UPI and check your Google reviews before they visit. A paper card can do none of that.
          </p>

          <div className="mt-6 hidden grid-cols-[1.1fr_1fr_1fr] gap-3 px-5 text-[12px] font-bold uppercase tracking-wider md:grid">
            <span />
            <span className="inline-flex items-center gap-1.5 text-[#94A3B8]"><X size={14} /> Paper card</span>
            <span className="inline-flex items-center gap-1.5 text-[#B45309]"><Check size={14} /> Digital card</span>
          </div>
          <div className="mt-2 space-y-2.5">
            {PAPER_VS.map((row) => (
              <div key={row.label} className="grid items-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-[#E2E8F0] transition-shadow hover:shadow-premium md:grid-cols-[1.1fr_1fr_1fr] md:gap-3 md:px-5">
                <span className="text-[14.5px] font-bold text-[#0F172A]">{row.label}</span>
                <span className="flex items-center gap-2 text-[13.5px] text-[#94A3B8]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]"><X size={11} strokeWidth={3} /></span>{row.paper}
                </span>
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-[#334155]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white"><Check size={11} strokeWidth={3} /></span>{row.digital}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cost ── */}
        <section id="cost" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">What does it cost in India?</h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#64748B]">Every plan starts with a 30-day free trial, and nothing renews by itself.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.name} className={`relative overflow-hidden rounded-[22px] bg-white p-5 ring-1 transition-all hover:-translate-y-1 hover:shadow-premium-lg ${p.popular ? "ring-2 ring-[#F7B31C]" : "ring-[#E2E8F0]"}`}>
                {p.popular && <span className="absolute right-4 top-4 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#92400E]">Popular</span>}
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: p.accent }}><p.icon size={20} /></span>
                <p className="mt-4 text-[13px] font-bold uppercase tracking-wide text-[#94A3B8]">{p.name}</p>
                <p className="mt-1 font-display text-[2rem] font-extrabold leading-none text-[#0F172A]">
                  {p.price} <span className="text-[13px] font-semibold text-[#94A3B8]">{p.unit}</span>
                </p>
                <p className="mt-2 text-[12.5px] leading-snug text-[#64748B]">{p.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13.5px] text-[#64748B]">
            A custom domain such as card.yourbrand.com is a one-time ₹499 (free on the Platinum 3-Year plan), and a printed NFC standee for your
            counter is ₹1,499. <Link to="/pricing" className="font-semibold text-[#B45309] underline underline-offset-2">See the full pricing page</Link>.
          </p>
        </section>

        {/* ── NFC vs QR ── */}
        <section id="nfc-vs-qr" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">NFC or QR — what's the difference?</h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#64748B]">Both open exactly the same card. The difference is only in how it opens.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { icon: QrCode, t: "QR code", tint: "#14B8A6", d: "Free to reproduce. Print it on cards, boards, packaging or a standee — every phone camera reads it.", points: ["Costs nothing to reprint", "Works on every phone", "Good for counters and print"] },
              { icon: Nfc, t: "NFC card", tint: "#F7B31C", d: "A printed PVC card with a chip inside. Tap it on a phone and your card opens — with a QR on the back for phones without NFC.", points: ["₹499, free delivery", "Feels premium in person", "No app for the other person"] },
            ].map((c) => (
              <div key={c.t} className="group relative overflow-hidden rounded-[24px] bg-white p-6 ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-1 hover:shadow-premium-lg">
                <div aria-hidden="true" className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: c.tint }} />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: c.tint }}><c.icon size={22} /></span>
                <h3 className="relative mt-4 font-display text-[1.25rem] font-extrabold text-[#0F172A]">{c.t}</h3>
                <p className="relative mt-2 text-[14.5px] leading-relaxed text-[#64748B]">{c.d}</p>
                <ul className="relative mt-4 space-y-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-[#334155]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${c.tint}24`, color: c.tint === "#F7B31C" ? "#B45309" : c.tint }}><Check size={11} strokeWidth={3} /></span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13.5px] text-[#64748B]">
            Most people use both. <Link to="/blog/nfc-vs-qr-business-card" className="font-semibold text-[#B45309] underline underline-offset-2">Read the full NFC vs QR comparison</Link>.
          </p>
        </section>

        {/* ── What goes on it ── */}
        <section id="whats-on-it" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">What goes on a digital business card?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-white p-6 ring-1 ring-[#E2E8F0]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">The essentials</p>
              <ul className="mt-4 space-y-2.5">
                {ESSENTIALS.map((e) => (
                  <li key={e.t} className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] px-3.5 py-3 text-[14px] text-[#334155]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#0F172A] ring-1 ring-[#E2E8F0]"><e.icon size={15} /></span>{e.t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#FFFBEB] to-white p-6 ring-1 ring-[#FDE68A]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309]">If you run a business</p>
              <ul className="mt-4 space-y-2.5">
                {FOR_BUSINESS.map((e) => (
                  <li key={e.t} className="flex items-center gap-3 text-[14px] text-[#334155]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-gold text-[#0F172A]"><e.icon size={15} /></span>{e.t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── By profession ── */}
        <section id="professions" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">Digital cards by profession</h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#64748B]">What to put on the card, and how people share it, differs by trade. Pick yours:</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {INDUSTRIES.map((ind) => (
              <Link key={ind.slug} to={industryPath(ind.slug)}
                className="group flex items-center gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-0.5 hover:shadow-premium hover:ring-[#F7B31C]/50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ background: `${ind.theme.accent}1A`, color: ind.theme.ink }}>
                  <IndustryIcon name={ind.theme.icon} size={16} />
                </span>
                <span className="min-w-0 text-[12.5px] font-semibold leading-tight text-[#0F172A]">{ind.crumb}</span>
              </Link>
            ))}
          </div>
          <Link to="/industries" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#B45309]">
            See all industries <ArrowRight size={14} />
          </Link>
        </section>

        {/* ── How to ── */}
        <section id="how-to" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">How to make one in two minutes</h2>
          <ol className="relative mt-6 grid gap-3 md:grid-cols-3 md:gap-6">
            <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-[#E2E8F0] md:block" />
            {STEPS.map((s, i) => (
              <li key={s.t} className="relative flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-[#E2E8F0] md:flex-col md:items-center md:bg-transparent md:p-0 md:text-center md:ring-0">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-gold text-[#0F172A] shadow-gold ring-4 ring-[#F8FAFC]">
                  <s.icon size={22} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0F172A] text-[11px] font-extrabold text-white">{i + 1}</span>
                </span>
                <span>
                  <span className="block text-[15px] font-bold text-[#0F172A]">{s.t}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#64748B]">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          {/* The same three steps, done on screen. */}
          <div className="mt-8 overflow-hidden rounded-3xl bg-[#0B1120] p-4 ring-1 ring-[#0F172A]/10 sm:p-5">
            <JsonLd id="dc-tutorial-ld" data={tutorialVideoLd()} />
            <TutorialPlayer />
            <p className="mt-3 px-1 text-[13px] text-[#94A3B8]">
              {TUTORIAL.description}{" "}
              <a href={TUTORIAL.watchUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#F7B31C] hover:underline">Watch on YouTube</a> ({TUTORIAL.lengthLabel}).
            </p>
          </div>
          <p className="mt-5 text-[13.5px] text-[#64748B]">
            Step-by-step: <Link to="/blog/how-to-make-a-digital-visiting-card" className="font-semibold text-[#B45309] underline underline-offset-2">How to make a digital visiting card</Link>.
          </p>
        </section>

        {/* ── Where to share ── */}
        <section id="where-to-share" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">Where to share your card</h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#64748B]">Anywhere you would have handed over a paper card — and plenty of places you couldn't.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SHARE_SPOTS.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-0.5 hover:ring-[#F7B31C]">
                <Share2 size={12} className="text-[#B45309]" /> {s}
              </span>
            ))}
          </div>
        </section>

        {/* ── Cities ── */}
        <section id="cities" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">Digital business card in your city</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {CITIES.map(([slug, name]) => (
              <Link key={slug} to={`/digital-visiting-card/${slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-0.5 hover:bg-[#0F172A] hover:text-white">
                <MapPin size={12} className="text-[#B45309] group-hover:text-[#F7B31C]" /> {name}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Compared with other tools ── */}
        <section className="pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">Compared with other tools</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[["linktree", "Linktree"], ["hihello", "HiHello"], ["beaconstac", "Beaconstac"]].map(([slug, name]) => (
              <Link key={slug} to={`/vs/${slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/50">
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Compare</span>
                  <span className="block text-[15px] font-bold text-[#0F172A]">vs {name}</span>
                </span>
                <ArrowRight size={16} className="text-[#B45309] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-32 pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">Frequently asked questions</h2>
          <div className="mt-6 space-y-2.5">
            {FAQS.map((f, i) => {
              const on = openFaq === i;
              return (
                <div key={f.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/50 shadow-premium-lg" : "ring-[#E2E8F0] hover:ring-[#CBD5E1]"}`}>
                  <button type="button" onClick={() => setOpenFaq(on ? null : i)} aria-expanded={on}
                    className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] sm:px-6">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold tabular-nums transition-colors ${on ? "gradient-gold text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="flex-1 text-[14.5px] font-bold leading-snug text-[#0F172A] sm:text-[15px]">{f.q}</h3>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${on ? "rotate-90 bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}><ChevronRight size={15} /></span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="px-4 pb-5 text-[13.5px] leading-relaxed text-[#64748B] sm:px-6 sm:pl-[4.5rem]">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pt-16">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 text-center sm:p-14">
            <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#F7B31C]/20 blur-3xl animate-aurora-drift" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-3 py-1 text-[12px] font-bold text-[#4ADE80] ring-1 ring-[#22C55E]/30">
                <BadgeIndianRupee size={13} /> ₹0 for 30 days · no payment details
              </span>
              <h2 className="mt-4 font-display text-[1.9rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[2.6rem]">
                Make your card <span className="text-gradient-gold">in two minutes</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[14.5px] text-[#94A3B8]">
                Pick a design, add your details, and share the link on WhatsApp today.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to={SIGNUP} className="dc-btn-shine group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl gradient-gold px-8 text-[15px] font-extrabold text-[#0F172A] shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                  <span className="relative z-10">Start free trial</span>
                  <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/digital-business-cards-templates" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl px-7 text-[15px] font-bold text-white ring-1 ring-white/20 transition-all hover:bg-white/10 active:scale-[0.97]">
                  <Globe size={17} /> See card designs
                </Link>
              </div>
              <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#94A3B8]">
                <span className="inline-flex items-center gap-1.5"><Languages size={13} className="text-[#FCD34D]" /> Write it in any language</span>
                <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#4ADE80]" /> No auto-renewal</span>
                <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#4ADE80]" /> 7-day money-back</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
