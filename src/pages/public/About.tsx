/*
 * /about — who makes DigitalCarda, what we believe, and how the blog guides are
 * written.
 *
 * Google's helpful-content guidance asks that readers can see who is behind a
 * site's content and how it is produced ("Who, How and Why"). Article bylines
 * and the BlogPosting author in structured data point here.
 *
 * Every figure, price and quote on this page is one the site already publishes
 * (homepage numbers, pricing page, customer reviews) — nothing is invented.
 */
import { Link } from "react-router";
import {
  ArrowRight, BadgeCheck, BookOpen, Check, CreditCard, Eye, FileSearch, Globe, Heart, Layers, Link2, Mail,
  MessageCircle, Nfc, Phone, Quote, RefreshCw, Scale, ShieldCheck, Sparkles, Star, Users, Wand2, X,
} from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { CONTACT } from "@/lib/publicNav";
import { TESTIMONIALS } from "@/data/testimonials";
import { trpc } from "@/providers/trpc";

const ABOUT_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://digitalcarda.in/about#page",
  url: "https://digitalcarda.in/about",
  name: "About DigitalCarda",
  inLanguage: "en-IN",
  about: { "@id": "https://digitalcarda.in/#organization" },
};

const PAPER = [
  "Runs out right when you meet someone important",
  "Change your number or address — reprint the whole box",
  "No idea who kept it or who threw it away",
  "Can't hold your products, photos, reviews or payment details",
];
const DIGITAL = [
  "Shared in a second on WhatsApp, by QR or with a tap",
  "Edit anytime — the same link and QR keep working",
  "See views, clicks and enquiries in your dashboard",
  "Products, gallery, Google reviews and UPI, all on one card",
];

const WHAT_WE_MAKE = [
  { icon: CreditCard, tint: "#F7B31C", title: "Digital visiting cards", text: "50+ designs with a QR code, Call, WhatsApp and Save Contact buttons, an enquiry form, UPI details, Google reviews and visit analytics.", tag: "From ₹999 / year", href: "/digital-business-cards-templates", cta: "Browse designs" },
  { icon: Nfc, tint: "#14B8A6", title: "NFC cards and standees", text: "A printed PVC card or counter standee that opens your digital card with a tap, delivered free across India.", tag: "Card ₹499 · Standee ₹1,499", href: "/pricing", cta: "See prices" },
  { icon: Wand2, tint: "#8B5CF6", title: "Free tools", text: "An email signature generator and WhatsApp Business message templates anyone can use without signing up.", tag: "No sign-up", href: "/free-tools", cta: "Try the tools" },
  { icon: Users, tint: "#3B82F6", title: "For teams and resellers", text: "Matching cards for whole teams, and a white-label programme for agencies that sell cards to their own clients.", tag: "Teams · White label", href: "/resellers", cta: "Reseller programme" },
];

const BELIEFS = [
  { icon: Sparkles, title: "Try it before you pay", text: "Every card starts with a 30-day free trial — no card details asked." },
  { icon: Link2, title: "Your link never breaks", text: "Redesign or update your card as often as you like; printed QR codes keep working." },
  { icon: Scale, title: "Simple, open pricing", text: "Gold is ₹999 a year, Platinum ₹1,999 a year. Plans don't renew by themselves." },
  { icon: MessageCircle, title: "Real people on WhatsApp", text: "Stuck? Message us and a person from our team replies." },
  { icon: ShieldCheck, title: "Your data isn't for sale", text: "We never sell personal data, and the enquiries on your card are yours." },
  { icon: Heart, title: "Less paper, more business", text: "One card that's never thrown away, instead of boxes of reprints." },
];

const HOW_WE_WRITE = [
  { icon: BookOpen, title: "Written for Indian businesses", text: "Each guide answers one real question — the kind shop owners, doctors and consultants search for — in plain English, with steps you can follow the same day." },
  { icon: FileSearch, title: "Checked against official sources", text: "Facts about Google, NFC, QR codes and contact files are checked against the organisations that set the rules — such as Google's help centre, the NFC Forum, Apple and Android documentation, W3C and the IETF — and we link to those pages so you can check them too." },
  { icon: Sparkles, title: "Honest about how they're made", text: "We use AI writing tools to help draft some guides. Before a guide is published its facts are checked against those sources and against how DigitalCarda actually works. We don't publish invented statistics, reviews or experiences." },
  { icon: BadgeCheck, title: "Clear about our own product", text: "When a guide mentions DigitalCarda, it says so plainly and only describes features and prices that exist today." },
  { icon: RefreshCw, title: "Kept up to date", text: "Every guide shows the date it was published or last updated. When a product, price or rule changes, we update the guide." },
];

function SectionTag({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] ${dark ? "bg-white/[0.08] text-[#FCD34D] ring-1 ring-white/10" : "bg-[#FEF3C7] text-[#92400E]"}`}>
      {children}
    </p>
  );
}

export default function About() {
  const { data: catalogue } = trpc.product.catalogue.useQuery();
  const templates = catalogue?.length ? catalogue.length : 50;

  const numbers = [
    { value: "91,000+", label: "Card views", icon: Eye, tint: "#F7B31C" },
    { value: "5,173+", label: "Active cards", icon: CreditCard, tint: "#14B8A6" },
    { value: "1,456+", label: "Happy clients", icon: Users, tint: "#EC4899" },
    { value: `${templates}+`, label: "Card designs", icon: Layers, tint: "#8B5CF6" },
    { value: "5", label: "Countries", icon: Globe, tint: "#3B82F6" },
  ];

  return (
    <div className="bg-[#FAFAF7] overflow-hidden">
      <JsonLd id="dc-about-ld" data={ABOUT_LD} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 pb-24 sm:pt-36 sm:pb-32">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full blur-3xl bg-[#F7B31C]/20 animate-aurora-drift" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-24 w-[460px] h-[460px] rounded-full blur-3xl bg-[#14B8A6]/15 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:items-center">
          <div>
            <p className="dc-enter inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F7B31C] animate-pulse" aria-hidden="true" /> About DigitalCarda
            </p>
            <h1 className="dc-enter dc-enter-1 mt-5 font-display text-[2.35rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[3.4rem] lg:text-[3.8rem] [text-wrap:balance]">
              The visiting card that <span className="text-gradient-gold">never runs out.</span>
            </h1>
            <p className="dc-enter dc-enter-2 mt-5 max-w-xl text-[16px] sm:text-[18px] leading-relaxed text-[#CBD5E1]">
              DigitalCarda makes digital visiting cards for businesses and professionals across India — a single link and QR code that lets people save your number, message you on WhatsApp, pay you and find you, without printing a new card every time something changes.
            </p>
            <div className="dc-enter dc-enter-3 mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup?promo=FREE30D" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl gradient-gold px-6 text-[15px] font-bold text-[#0F172A] hover:shadow-gold active:scale-[0.98] transition-all">
                Start free for 30 days <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a href="#our-story" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-6 text-[15px] font-semibold text-white ring-1 ring-white/15 hover:bg-white/[0.14] transition-colors">
                Why we built it
              </a>
            </div>
          </div>

          {/* Card-in-hand visual */}
          <div className="relative mt-14 lg:mt-0 flex justify-center" aria-hidden="true">
            <div className="relative w-[280px] sm:w-[320px]">
              {/* old paper card, crossed out */}
              <div className="absolute -left-6 top-10 w-[210px] h-[122px] -rotate-[14deg] rounded-xl bg-[#F5F0E6] shadow-xl p-3.5 ring-1 ring-black/5">
                <div className="h-2.5 w-24 rounded bg-[#D6CFC0]" />
                <div className="mt-2 h-1.5 w-16 rounded bg-[#E4DDD0]" />
                <div className="mt-6 space-y-1.5"><div className="h-1.5 w-28 rounded bg-[#E4DDD0]" /><div className="h-1.5 w-20 rounded bg-[#E4DDD0]" /></div>
                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#EF4444] text-white flex items-center justify-center shadow-lg"><X size={16} strokeWidth={3} /></span>
              </div>
              {/* the digital card */}
              <div className="relative ml-auto mt-24 w-[230px] sm:w-[250px] rotate-[5deg] rounded-[28px] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden ring-1 ring-white/20">
                <div className="h-20 bg-gradient-to-br from-[#F7B31C] to-[#E09A12] relative">
                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-[#0F172A] ring-4 ring-white flex items-center justify-center font-display text-lg font-extrabold text-[#F7B31C]">AM</span>
                </div>
                <div className="pt-9 px-4 pb-4 text-center">
                  <p className="font-display text-[15px] font-extrabold text-[#0F172A]">Aarav Mehta</p>
                  <p className="text-[11px] text-[#64748B]">Nayara Interiors</p>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {[{ i: Phone, c: "#3B82F6" }, { i: MessageCircle, c: "#22C55E" }, { i: Mail, c: "#EC4899" }].map(({ i: I, c }, k) => (
                      <span key={k} className="h-9 rounded-xl flex items-center justify-center" style={{ background: `${c}1A`, color: c }}><I size={15} /></span>
                    ))}
                  </div>
                  <div className="mt-2 h-9 rounded-xl bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center gap-1.5"><Check size={13} /> Save contact</div>
                </div>
              </div>
              <span className="absolute -right-2 top-16 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0F172A] shadow-lg flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Updated just now
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Numbers ── */}
      <section aria-label="DigitalCarda in numbers" className="relative -mt-14 sm:-mt-16 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-white shadow-premium-lg ring-1 ring-[#EEE9DD] p-2 sm:p-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {numbers.map((n, k) => (
            <div key={n.label} className={`rounded-2xl bg-[#FAFAF7] px-4 py-4 sm:py-5 ${k === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${n.tint}1A`, color: n.tint === "#F7B31C" ? "#B45309" : n.tint }}><n.icon size={17} aria-hidden="true" /></span>
              <p className="mt-3 font-display text-[1.7rem] sm:text-[1.9rem] font-extrabold leading-none text-[#0F172A] tabular-nums">{n.value}</p>
              <p className="mt-1 text-[12.5px] font-medium text-[#78716C]">{n.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] text-[#78716C]">
          <span className="flex" aria-hidden="true">{[...Array(5)].map((_, k) => <Star key={k} size={12} className="fill-[#F7B31C] text-[#F7B31C]" />)}</span>
          Rated 4.9 out of 5 by our clients
        </p>
      </section>

      {/* ── Why ── */}
      <section id="our-story" aria-labelledby="why-h" className="scroll-mt-24 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <div className="max-w-2xl">
          <SectionTag>Why we exist</SectionTag>
          <h2 id="why-h" className="mt-4 font-display text-[1.9rem] sm:text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-[#0F172A] [text-wrap:balance]">
            Paper cards weren&apos;t built for how India does business now.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#57534E]">
            Customers find you on WhatsApp, pay you by UPI and check your Google reviews before they visit. A paper card can&apos;t do any of that — so we built one that can.
          </p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          <div className="relative rounded-[26px] bg-[#F3EFE6] p-6 sm:p-7 ring-1 ring-[#E7E0D1]">
            <p className="flex items-center gap-2 font-display text-[18px] font-extrabold text-[#57534E]">
              <span className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center text-[#A8A29E]"><CreditCard size={18} aria-hidden="true" /></span> The paper card
            </p>
            <ul className="mt-5 space-y-3">
              {PAPER.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[14.5px] leading-snug text-[#78716C]">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0"><X size={12} strokeWidth={3} aria-hidden="true" /></span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-[26px] bg-[#0F172A] p-6 sm:p-7 text-white shadow-premium-lg">
            <div aria-hidden="true" className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[#F7B31C]/25 blur-3xl" />
            <p className="relative flex items-center gap-2 font-display text-[18px] font-extrabold">
              <span className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center text-[#0F172A]"><Sparkles size={18} aria-hidden="true" /></span> A DigitalCarda card
            </p>
            <ul className="relative mt-5 space-y-3">
              {DIGITAL.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[14.5px] leading-snug text-[#E2E8F0]">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── What we make ── */}
      <section aria-labelledby="what-we-make" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <SectionTag>What we make</SectionTag>
        <h2 id="what-we-make" className="mt-4 font-display text-[1.9rem] sm:text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-[#0F172A]">
          Everything you need to <span className="text-gradient-gold">be found and remembered.</span>
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {WHAT_WE_MAKE.map((item) => (
            <Link key={item.title} to={item.href}
              className="group relative overflow-hidden rounded-[26px] bg-white p-6 ring-1 ring-[#EEE9DD] transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <div aria-hidden="true" className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: item.tint }} />
              <div className="relative flex items-start justify-between gap-3">
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: item.tint }}><item.icon size={22} aria-hidden="true" /></span>
                <span className="rounded-full bg-[#FAFAF7] px-2.5 py-1 text-[11.5px] font-bold text-[#57534E] ring-1 ring-[#EEE9DD]">{item.tag}</span>
              </div>
              <h3 className="relative mt-5 font-display text-[18px] font-extrabold text-[#0F172A]">{item.title}</h3>
              <p className="relative mt-1.5 text-[14.5px] leading-relaxed text-[#57534E]">{item.text}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-[13.5px] font-bold text-[#B45309]">
                {item.cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── What we believe ── */}
      <section aria-labelledby="believe-h" className="relative mt-16 sm:mt-24 bg-[#0F172A] py-16 sm:py-24 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
        <div aria-hidden="true" className="absolute left-1/2 top-0 -translate-x-1/2 w-[640px] h-[320px] rounded-full blur-3xl bg-[#F7B31C]/10" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <SectionTag dark>What we believe</SectionTag>
            <h2 id="believe-h" className="mt-4 font-display text-[1.9rem] sm:text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-white">
              Six promises we <span className="text-gradient-gold">build around.</span>
            </h2>
          </div>
          <ol className="mt-10 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            {BELIEFS.map((b, k) => (
              <li key={b.title} className="group relative rounded-[22px] bg-white/[0.04] p-4 sm:p-5 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute right-3 top-3 sm:right-5 sm:top-4 font-display text-2xl sm:text-4xl font-extrabold text-transparent [-webkit-text-stroke:1.2px_rgba(247,179,28,0.35)]">0{k + 1}</span>
                <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#F7B31C]/15 text-[#F7B31C] flex items-center justify-center"><b.icon size={20} aria-hidden="true" /></span>
                <h3 className="mt-3 sm:mt-4 text-[14px] sm:text-[16px] font-bold leading-snug text-white">{b.title}</h3>
                <p className="mt-1 text-[12px] sm:text-[13.5px] leading-snug sm:leading-relaxed text-[#94A3B8]">{b.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Voices ── */}
      <section aria-labelledby="voices-h" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <SectionTag>In their words</SectionTag>
            <h2 id="voices-h" className="mt-4 font-display text-[1.9rem] sm:text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-[#0F172A]">Businesses that switched.</h2>
          </div>
        </div>
        <div className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none pb-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="snap-center shrink-0 w-[82%] sm:w-auto relative rounded-[24px] bg-white p-6 ring-1 ring-[#EEE9DD] flex flex-col">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 rounded-t-[24px]" style={{ background: t.accent }} />
              <div className="flex items-center justify-between">
                <Quote size={24} style={{ color: t.accent }} aria-hidden="true" />
                <span className="flex" aria-label="Rated 5 out of 5">{[...Array(5)].map((_, k) => <Star key={k} size={13} className="fill-[#F7B31C] text-[#F7B31C]" />)}</span>
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed text-[#44403C]">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-auto pt-5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[#0F172A]" style={{ background: t.accent }}>{t.name.charAt(0)}</span>
                <span>
                  <span className="block text-[14px] font-bold text-[#0F172A]">{t.name}</span>
                  <span className="block text-[12px] text-[#78716C]">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── How we write ── */}
      <section aria-labelledby="how-we-write" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <div className="lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="lg:sticky lg:top-28 self-start">
            <SectionTag>Our guides</SectionTag>
            <h2 id="how-we-write" className="scroll-mt-28 mt-4 font-display text-[1.9rem] sm:text-[2.4rem] font-extrabold leading-[1.1] tracking-tight text-[#0F172A]">How we write our guides</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#57534E]">
              The guides on our <Link to="/blog" className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">blog</Link> are written by the DigitalCarda team. Here is how we make sure they are useful and accurate.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#FFF8E6] p-5 ring-1 ring-[#F9E2A8]">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#B45309]" aria-hidden="true" />
              <p className="text-[14.5px] leading-relaxed text-[#44403C]">
                <strong className="text-[#0F172A]">Spotted something wrong or out of date?</strong> Email <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Correction to a DigitalCarda guide")}`} className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4 break-all">{CONTACT.email}</a> with the page link and we&apos;ll check it.
              </p>
            </div>
          </div>

          <ol className="relative mt-8 lg:mt-0 space-y-3">
            <span aria-hidden="true" className="absolute left-[21px] top-6 bottom-6 w-px bg-gradient-to-b from-[#F7B31C] via-[#EEE9DD] to-transparent" />
            {HOW_WE_WRITE.map(({ icon: Icon, title, text }) => (
              <li key={title} className="relative flex gap-4">
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-[#F7B31C] ring-4 ring-[#FAFAF7]" aria-hidden="true"><Icon size={19} /></span>
                <div className="flex-1 rounded-2xl bg-white p-5 ring-1 ring-[#EEE9DD]">
                  <h3 className="font-display text-[16px] font-bold text-[#0F172A]">{title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[#57534E]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Talk to us ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <section aria-labelledby="contact-us" className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-7 text-white sm:p-12">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
          <div aria-hidden="true" className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full blur-3xl bg-[#F7B31C]/25" />
          <div className="relative lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div>
              <h2 id="contact-us" className="font-display text-[1.9rem] font-extrabold tracking-tight sm:text-[2.5rem] leading-[1.1]">Talk to us</h2>
              <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-[#CBD5E1]">Questions about cards, NFC products, bulk orders or the reseller programme — we&apos;re happy to help.</p>
              <div className="mt-6 grid gap-2.5 sm:flex sm:flex-wrap">
                <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-[14.5px] font-bold text-white hover:brightness-95"><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>
                <a href={CONTACT.phoneHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-[14.5px] font-bold text-white ring-1 ring-white/20 hover:bg-white/15"><Phone size={16} aria-hidden="true" /> {CONTACT.phone}</a>
                <a href={`mailto:${CONTACT.email}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-[14.5px] font-bold text-white ring-1 ring-white/20 hover:bg-white/15"><Mail size={16} aria-hidden="true" /> {CONTACT.email}</a>
              </div>
            </div>
            <Link to="/signup?promo=FREE30D" className="mt-8 lg:mt-0 inline-flex w-full lg:w-auto h-12 shrink-0 items-center justify-center gap-2 rounded-xl gradient-gold px-6 text-[15px] font-bold text-[#0F172A] hover:shadow-gold">
              Make your card — free for 30 days <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <nav aria-label="More about DigitalCarda" className="relative mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#94A3B8]">
            {[["Features", "/features"], ["Pricing", "/pricing"], ["Blog", "/blog"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms-of-service"], ["Refunds", "/refund-policy"]].map(([l, h]) => (
              <Link key={h} to={h} className="hover:text-white transition-colors">{l}</Link>
            ))}
          </nav>
        </section>
      </div>
    </div>
  );
}
