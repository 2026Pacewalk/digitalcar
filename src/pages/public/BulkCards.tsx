/*
 * /bulk-cards — the page a company or reseller reads before asking for a
 * quote on 10–300 cards.
 *
 * The in-page order builder (quantity stepper, team roster, company form,
 * live order summary) has been removed: filling a roster is work a buyer
 * will not do before they have talked to anyone, and it pushed the pricing
 * — the thing they actually came for — far down the page. The page now
 * sells the volume pricing and hands off to sales or WhatsApp.
 */
import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  Users, Building2, Briefcase, Check, ArrowRight, TrendingDown,
  ShieldCheck, Zap, Clock, MessageSquare, BadgePercent, Layers, Phone, Mail,
  Globe, UploadCloud, Rocket, ListChecks, ChevronRight, GraduationCap,
  Store, Handshake, IdCard,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

/* ── Pricing config ────────────────────────────────────────────── */
const BASE_PRICE = 999; // single-card yearly price, used to compute savings
const MIN_QTY = 10;
const TIERS = [
  { min: 10, max: 24, price: 799, label: "10–24" },
  { min: 25, max: 49, price: 699, label: "25–49" },
  { min: 50, max: 99, price: 599, label: "50–99" },
  { min: 100, max: 249, price: 499, label: "100–249" },
  { min: 250, max: Infinity, price: 399, label: "250+" },
];

const inr = (n: number) => "Rs. " + n.toLocaleString("en-IN");
const pct = (price: number) => Math.round(((BASE_PRICE - price) / BASE_PRICE) * 100);

const WA_NUMBER = "919517722444";
const waLink = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const PACKAGES = [
  {
    name: "Team", icon: Users, qty: 10, pricePerCard: 799, tagline: "Small teams & startups",
    color: "from-[#14B8A6] to-[#0D9488]", accent: "#14B8A6", popular: false,
    features: ["10 digital cards", "Shared team template", "QR code on every card", "WhatsApp & call buttons", "Basic lead tracking", "Email support"],
  },
  {
    name: "Business", icon: Briefcase, qty: 25, pricePerCard: 699, tagline: "Growing companies & agencies",
    color: "from-[#F7B31C] to-[#D97706]", accent: "#F7B31C", popular: true,
    features: ["25 digital cards", "Custom branded template", "Company logo on all cards", "Products & services", "Advanced analytics", "Bulk QR download", "Priority support"],
  },
  {
    name: "Enterprise", icon: Building2, qty: 100, pricePerCard: 499, tagline: "Large orgs & partners",
    color: "from-[#0F172A] to-[#334155]", accent: "#6366F1", popular: false,
    features: ["100 digital cards", "White-label branding", "Custom domain", "Dedicated onboarding", "Team roles & access", "CRM / CSV export", "Account manager"],
  },
];

const PERKS = [
  { icon: TrendingDown, accent: "#14B8A6", title: "Volume Discounts", desc: "The more cards you order, the lower the per-card price — up to 60% off." },
  { icon: Zap, accent: "#F7B31C", title: "Built For You", desc: "Send us the list. We build every card so nobody on your team has to." },
  { icon: ShieldCheck, accent: "#8B5CF6", title: "Consistent Branding", desc: "Every card carries the same logo, colours and template automatically." },
  { icon: Clock, accent: "#3B82F6", title: "Live in 48 Hours", desc: "Share your list and the whole set goes live within two business days." },
];

const AUDIENCES = [
  { icon: Building2, accent: "#F7B31C", title: "Companies & Corporates", desc: "One template, every employee. Onboard new joiners without reprinting a thing.", note: "Sales teams, HR, field staff" },
  { icon: Handshake, accent: "#8B5CF6", title: "Agencies & Resellers", desc: "Buy at volume rates and resell under your own brand with white-label domains.", note: "White-label ready" },
  { icon: GraduationCap, accent: "#14B8A6", title: "Institutes & Associations", desc: "Cards for faculty, chapters and members — updated centrally, always current.", note: "Faculty & members" },
  { icon: Store, accent: "#EC4899", title: "Franchises & Chains", desc: "Every outlet gets its own card with local details under one brand identity.", note: "Multi-location brands" },
];

const STEPS = [
  { icon: ListChecks, num: 1, title: "Tell Us the Quantity", desc: "Share how many cards you need — volume pricing applies from ten upwards." },
  { icon: UploadCloud, num: 2, title: "Send Your List", desc: "A spreadsheet of names and designations is enough. Details can follow later." },
  { icon: Rocket, num: 3, title: "We Build & Publish", desc: "Our team designs every card in your branding and makes them live in 48 hours." },
];

const FAQS = [
  { q: "What is the minimum order for bulk pricing?", a: "Bulk pricing starts from 10 cards. Below that the standard single-card plan of Rs. 999 per year applies. Every bulk card is billed yearly, and the more cards you add the lower the per-card price becomes." },
  { q: "Can each card have different details?", a: "Yes. Every card is personalised with that individual's name, designation, phone, email and photo, while sharing your company's logo, colours and template so the whole set stays consistent." },
  { q: "Do I have to send everyone's details upfront?", a: "No. You can confirm the quantity first and share the full list later. Names alone are enough to reserve a card, and missing details can be filled in any time after the cards are live." },
  { q: "How is billing handled for bulk orders?", a: "You get a single consolidated, GST-compliant invoice for the whole order. Nothing is charged upfront — our team confirms your requirement and shares the final invoice before any payment." },
  { q: "Can I add more cards later?", a: "Yes. You can top up your order at any time and the same volume tier pricing applies to the additional cards, so you are never penalised for growing." },
  { q: "Is white-label or reseller branding available?", a: "Yes, from the Enterprise package upward. You can fully white-label the cards with your own domain and branding, which is what most agencies and reseller partners use it for." },
];

/* ── Page ──────────────────────────────────────────────────────── */
export default function BulkCards() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // FAQPage schema, text identical to what is rendered on screen.
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
    let s = document.getElementById("dc-bulk-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-bulk-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-bulk-ld")?.remove(); };
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#14B8A6]/12 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <Reveal stagger>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C] animate-pulse" /> Bulk cards for teams · Volume pricing
              </span>
              <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.6rem] font-extrabold text-[#0F172A] leading-[1.06] tracking-tight">
                Digital Cards for Your{" "}
                <span className="relative inline-block text-gradient-gold">
                  Entire Team
                  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
                Cards for your staff, partners and resellers — same branding on every one, built by our team, with pricing that drops the more you add.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="#pricing" className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                  <BadgePercent size={18} /> See Bulk Pricing
                </a>
                <a
                  href={waLink("Hi DigitalCarda, I'd like a quote for bulk digital cards for my team.")}
                  target="_blank" rel="noopener noreferrer"
                  className="h-12 px-7 inline-flex items-center justify-center gap-2 text-base font-semibold text-white rounded-xl bg-[#16A34A] hover:bg-[#15803D] transition-all active:scale-[0.98]"
                >
                  <MessageSquare size={18} /> Get a Quote
                </a>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                {[
                  { v: "60%", label: "Max discount" },
                  { v: "48h", label: "Turnaround" },
                  { v: "10+", label: "Min. per order" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white shadow-premium border border-[#F1F5F9] px-3 py-3 text-center">
                    <p className="text-xl font-extrabold text-gradient-gold">{s.v}</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal className="lg:pl-6">
              <TeamStackVisual />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Perks ── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PERKS.map((p) => (
              <div key={p.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${p.accent}2E` }} />
                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: `${p.accent}18`, color: p.accent }}>
                  <p.icon size={20} />
                </div>
                <h3 className="relative text-[14.5px] font-bold text-[#0F172A] mb-1.5">{p.title}</h3>
                <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Volume pricing ladder — the thing people came for ── */}
      <section id="pricing" className="scroll-mt-24 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Volume pricing"
            title={<>The More You Add, <span className="text-gradient-gold">The Less You Pay</span></>}
            subtitle="Per card, billed yearly. Bulk rates apply automatically from ten cards — nothing to apply for."
          />

          <Reveal stagger className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {TIERS.map((t, i) => {
              const off = pct(t.price);
              const best = i === TIERS.length - 1;
              return (
                <div
                  key={t.label}
                  className={`group relative rounded-2xl p-5 text-center overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${
                    best
                      ? "bg-gradient-to-b from-[#0F172A] to-[#1E293B] ring-1 ring-[#F7B31C]/40 shadow-premium-lg"
                      : "bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] shadow-premium hover:ring-[#F7B31C]/40"
                  }`}
                >
                  {best && <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-[#0F172A] bg-[#F7B31C] rounded-full px-2 py-0.5">Best rate</span>}
                  <p className={`text-[11px] font-semibold ${best ? "text-[#94A3B8]" : "text-[#94A3B8]"}`}>{t.label} cards</p>
                  <p className={`mt-2 text-[1.7rem] font-extrabold tabular-nums leading-none ${best ? "text-white" : "text-[#0F172A]"}`}>{inr(t.price)}</p>
                  <p className={`text-[10.5px] mt-1 ${best ? "text-[#94A3B8]" : "text-[#94A3B8]"}`}>per card / year</p>

                  {/* savings bar — length tracks the discount, so the ladder reads at a glance */}
                  <div className={`mt-4 h-1.5 rounded-full overflow-hidden ${best ? "bg-white/10" : "bg-[#F1F5F9]"}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-[#F7B31C] to-[#D97706] transition-all duration-700 group-hover:brightness-110" style={{ width: `${off}%` }} />
                  </div>
                  <p className="mt-2 text-[11.5px] font-bold text-[#F7B31C]">{off}% off</p>
                </div>
              );
            })}
          </Reveal>

          <Reveal className="mt-6">
            <p className="text-center text-[12px] text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              A single card is {inr(BASE_PRICE)} per year. Bulk rates apply from {MIN_QTY} cards. Prices exclude 18% GST, and every order is invoiced once, GST-compliant.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Packages ── */}
      <section id="packages" className="scroll-mt-24 py-16 bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Bulk packages"
            title={<>Pick a <span className="text-gradient-gold">Ready-Made Bundle</span></>}
            subtitle="Curated for the team sizes we get asked for most. Any other quantity is fine too — just ask."
          />
          <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PACKAGES.map((pkg) => {
              const total = pkg.pricePerCard * pkg.qty;
              const save = (BASE_PRICE - pkg.pricePerCard) * pkg.qty;
              return (
                <div key={pkg.name} className={`relative flex flex-col rounded-3xl bg-white ring-1 shadow-premium overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium-lg ${pkg.popular ? "ring-2 ring-[#F7B31C]" : "ring-black/5"}`}>
                  {pkg.popular && (
                    <span className="absolute top-4 right-4 z-10 px-2.5 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full shadow">MOST POPULAR</span>
                  )}
                  <div className={`relative bg-gradient-to-r ${pkg.color} px-6 py-5`}>
                    <div className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center">
                        <pkg.icon size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white leading-none">{pkg.name}</h3>
                        <p className="text-[11px] text-white/80 mt-1">{pkg.tagline}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-end gap-1.5">
                      <span className="text-3xl font-extrabold text-[#0F172A]">{inr(pkg.pricePerCard)}</span>
                      <span className="text-sm text-[#94A3B8] mb-1">/ card / yr</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 mb-4">{pkg.qty} cards · <span className="font-semibold text-[#0F172A]">{inr(total)}</span> / year</p>
                    <span className="inline-flex items-center gap-1 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#166534] mb-5">
                      <TrendingDown size={12} /> Save {inr(save)} · {pct(pkg.pricePerCard)}% off
                    </span>
                    <div className="space-y-2.5 mb-6 flex-1">
                      {pkg.features.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-xs text-[#64748B]">
                          <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
                        </div>
                      ))}
                    </div>
                    <a
                      href={waLink(`Hi DigitalCarda, I'd like a quote for the ${pkg.name} bulk package (${pkg.qty} cards at ${inr(pkg.pricePerCard)} per card).`)}
                      target="_blank" rel="noopener noreferrer"
                      className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${pkg.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]"}`}
                    >
                      Get a quote for {pkg.name} <ArrowRight size={15} />
                    </a>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* ── Who orders in bulk ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Who orders in bulk"
            title={<>Built for Teams of <span className="text-gradient-gold">Every Shape</span></>}
            subtitle="Four kinds of buyer, one problem — everyone needs the same brand on a different person's card."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${a.accent}2E` }} />
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${a.accent}18`, color: a.accent }}>
                  <a.icon size={22} />
                </span>
                <h3 className="relative text-[15px] font-bold text-[#0F172A] mb-1.5 leading-snug">{a.title}</h3>
                <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{a.desc}</p>
                <span className="relative mt-4 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1" style={{ background: `${a.accent}14`, color: a.accent }}>
                  <IdCard size={11} /> {a.note}
                </span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── How bulk works ── */}
      <section className="py-20 bg-gradient-to-br from-[#F7B31C] via-[#D97706] to-[#F7B31C] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0F172A]/10 text-[#0F172A] mb-3">How bulk ordering works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">From List to Live in 3 Steps</h2>
          </div>
          <Reveal stagger className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-white/30" />
            {STEPS.map((s) => (
              <div key={s.num} className="text-center relative z-10 group">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                    <s.icon size={30} className="text-[#D97706]" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#0F172A] border-2 border-[#F7B31C] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#F7B31C]">{s.num}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </Reveal>
          <div className="text-center mt-12">
            <a
              href={waLink("Hi DigitalCarda, I'd like to start a bulk order for my team.")}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-12 px-10 bg-[#0F172A] text-white rounded-2xl text-sm font-semibold hover:bg-[#1E293B] transition-all hover:shadow-lg active:scale-[0.98]"
            >
              Start Your Bulk Order <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title={<>Bulk Order <span className="text-gradient-gold">Questions</span></>}
            subtitle="What teams ask us before placing an order."
          />
          <Reveal stagger className="space-y-3">
            {FAQS.map((f, i) => {
              const on = openFaq === i;
              return (
                <div key={f.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/45 shadow-premium-lg" : "ring-[#E2E8F0] shadow-premium hover:ring-[#CBD5E1]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(on ? null : i)}
                    aria-expanded={on}
                    className="w-full flex items-center gap-4 text-left px-5 sm:px-6 py-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
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
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative text-center rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-10 sm:p-14 overflow-hidden">
              <div className="absolute inset-0 bg-grid-dark opacity-25" />
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#F7B31C]/20 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl sm:text-[2.1rem] font-extrabold text-white tracking-tight">Tell us how many cards you need</h2>
                <p className="mt-3 text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Send the quantity and we will come back with a firm quote — including custom pricing above 250 cards, white-label branding and dedicated onboarding.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={waLink("Hi DigitalCarda, I'd like a bulk quote. Quantity needed: ")}
                    target="_blank" rel="noopener noreferrer"
                    className="h-12 px-8 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-[#16A34A] hover:bg-[#15803D] transition-all active:scale-[0.98]"
                  >
                    <MessageSquare size={17} /> Quote on WhatsApp
                  </a>
                  <Link to="/contact" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
                    Talk to Sales <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#F7B31C]" /> No payment upfront</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#F7B31C]" /> GST-compliant invoicing</span>
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-[#F7B31C]" /> Reply within 24 hours</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* ── Hero visual: a fanned stack of team cards ─────────────────── */
const HERO_TEAM = [
  { name: "AARAV SHAH", role: "SALES HEAD", accent: "#F7B31C" },
  { name: "MEERA IYER", role: "MARKETING", accent: "#14B8A6" },
  { name: "ROHAN DESAI", role: "CONSULTANT", accent: "#8B5CF6" },
];

function TeamStackVisual() {
  return (
    <div className="relative flex justify-center items-center min-h-[380px]">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[360px] rounded-[48px] bg-gradient-to-b from-[#F7B31C]/25 via-[#F7B31C]/5 to-transparent blur-2xl" />
      </div>

      {HERO_TEAM.map((m, i) => (
        <div
          key={m.name}
          className="absolute w-[210px] bg-white rounded-3xl shadow-premium-lg border border-[#F1F5F9] ring-1 ring-black/5 overflow-hidden animate-float"
          style={{
            transform: `translateX(${(i - 1) * 62}px) translateY(${Math.abs(i - 1) * 26}px) rotate(${(i - 1) * 7}deg)`,
            zIndex: i === 1 ? 30 : 10,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          <div className="h-1.5" style={{ background: m.accent }} />
          <div className="p-4">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2.5 flex items-center justify-center text-white font-bold" style={{ background: m.accent }}>
              {m.name.charAt(0)}
            </div>
            <p className="text-center text-[11px] font-bold text-[#0F172A] tracking-wide">{m.name}</p>
            <p className="text-center text-[9px] text-[#94A3B8] font-medium mt-0.5">{m.role}</p>
            <div className="mt-3 space-y-1.5">
              {[Phone, Mail, Globe].map((Icon, k) => (
                <div key={k} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2 py-1.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${m.accent}1A` }}>
                    <Icon size={10} style={{ color: m.accent }} />
                  </span>
                  <span className="h-1.5 rounded-full bg-[#E2E8F0]" style={{ width: `${60 - k * 8}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <div className="h-6 rounded-lg flex items-center justify-center" style={{ background: m.accent }}>
                <Phone size={11} className="text-white" />
              </div>
              <div className="h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                <MessageSquare size={11} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="hidden sm:flex absolute -left-2 top-4 items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-premium-lg border border-[#F1F5F9] z-40 animate-float">
        <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center"><Layers size={15} className="text-[#16A34A]" /></div>
        <div>
          <p className="text-[10px] font-bold text-[#0F172A] leading-none">50 Cards</p>
          <p className="text-[9px] text-[#94A3B8] mt-0.5">One order</p>
        </div>
      </div>
      <div className="hidden sm:flex absolute -right-2 bottom-6 items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-premium-lg border border-[#F1F5F9] z-40 animate-float" style={{ animationDelay: "1.2s" }}>
        <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><TrendingDown size={15} className="text-[#F7B31C]" /></div>
        <div>
          <p className="text-[10px] font-bold text-[#0F172A] leading-none">Save 42%</p>
          <p className="text-[9px] text-[#94A3B8] mt-0.5">Bulk price</p>
        </div>
      </div>
    </div>
  );
}
