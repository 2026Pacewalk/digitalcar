/*
 * /big-brand-cards — how a large brand looks on a DigitalCarda card.
 *
 * Every brand shown is fictional (see src/data/brandShowcase.ts): invented names
 * that match no real company, fake numbers and example.com addresses. The page
 * says so plainly, so nobody reads it as a customer list.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Building2, Check, QrCode, RefreshCw, Share2, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import { buildCardHtml } from "@/card-template/buildCard";
import { withoutScrollbars } from "@/components/customer/PhoneMockup";
import { BRANDS, brandCard } from "@/data/brandShowcase";
import JsonLd from "@/components/seo/JsonLd";

const SIGNUP = "/signup?promo=FREE30D";

const WHY_BIG = [
  { icon: Store, t: "A card per outlet, one brand", d: "Every store, branch or showroom gets the same design with its own number, address and timings." },
  { icon: RefreshCw, t: "Change it once, everywhere", d: "New price list or festive offer? Update centrally — nothing printed goes out of date." },
  { icon: Users, t: "Enquiries land in one place", d: "Franchise, careers, corporate and service requests arrive as leads, tagged by what was tapped." },
  { icon: QrCode, t: "One QR on everything", d: "Bills, carry bags, standees, service stickers and ads all point at the same permanent link." },
];

export default function BrandShowcase() {
  const [active, setActive] = useState(0);
  const brand = BRANDS[active];

  const html = useMemo(() => {
    const { customer, products, offers, gallery } = brandCard(brand);
    return withoutScrollbars(buildCardHtml(
      customer as Parameters<typeof buildCardHtml>[0],
      products as Parameters<typeof buildCardHtml>[1],
      gallery as Parameters<typeof buildCardHtml>[2],
      [],
      offers as Parameters<typeof buildCardHtml>[4],
      [], [],
    ));
  }, [brand]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://digitalcarda.in/" },
      { "@type": "ListItem", position: 2, name: "Big brand cards", item: "https://digitalcarda.in/big-brand-cards" },
    ],
  };

  return (
    <div className="bg-[#F8FAFC]">
      <JsonLd id="dc-brands-ld" data={jsonLd} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 pb-28 sm:pt-32 sm:pb-32">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-40 right-[-12%] h-[520px] w-[520px] rounded-full blur-3xl animate-aurora-drift" style={{ background: `${brand.primary}33` }} />
        <div aria-hidden="true" className="absolute bottom-[-25%] left-[-10%] h-[420px] w-[420px] rounded-full bg-[#F7B31C]/15 blur-3xl animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#94A3B8]">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2 text-[#475569]">/</span>
            <span className="text-[#E2E8F0]">Big brand cards</span>
          </nav>
          <span className="dc-enter mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] ring-1 ring-white/10">
            <Building2 size={13} /> Brand showcase
          </span>
          <h1 className="dc-enter dc-enter-1 mt-5 font-display text-[2.2rem] font-extrabold leading-[1.06] tracking-tight text-white sm:text-[3.1rem] [text-wrap:balance]">
            What a <span className="text-gradient-gold">big brand</span> looks like on a DigitalCarda card
          </h1>
          <p className="dc-enter dc-enter-2 mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[#CBD5E1] sm:text-[17px]">
            Eight sample brands — a national appliance maker, a delivery app, a pizza chain, a group company, a fiber provider,
            a retail chain, a hotel group and a dealership. Tap any one to open its full card.
          </p>
          <p className="dc-enter dc-enter-2 mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] text-[#94A3B8] ring-1 ring-white/10">
            <ShieldCheck size={13} className="text-[#4ADE80]" /> Every brand here is made up for the demo — names, numbers and prices included
          </p>
        </div>
      </section>

      {/* ── Brand picker ── */}
      <section aria-label="Choose a sample brand" className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {BRANDS.map((b, i) => {
            const on = i === active;
            return (
              <button key={b.slug} type="button" onClick={() => setActive(i)} aria-pressed={on}
                className={`group flex items-center gap-2.5 rounded-2xl bg-white p-3 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-premium-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "shadow-premium-lg ring-2" : "shadow-premium ring-[#E2E8F0]"}`}
                style={on ? { borderColor: b.primary, boxShadow: `0 0 0 2px ${b.primary}, 0 18px 36px -20px ${b.primary}` } : undefined}>
                <img src={b.logo} alt="" width={40} height={40} loading="lazy"
                  className="h-10 w-10 shrink-0 rounded-xl shadow-md transition-transform group-hover:scale-110" />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-[#0F172A]">{b.name}</span>
                  <span className="block truncate text-[11.5px] text-[#64748B]">{b.category}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── The card on stage ── */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-12 lg:items-start">
          {/* Phone */}
          <div className="relative mx-auto w-full max-w-[380px]">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[3rem] opacity-30 blur-3xl transition-colors duration-500" style={{ background: brand.primary }} />
            <div className="relative mx-auto w-[320px] rounded-[2.6rem] bg-[#0F172A] p-2.5 shadow-[0_40px_90px_-30px_rgba(15,23,42,0.6)] ring-1 ring-black/10 sm:w-[340px]">
              <div className="relative overflow-hidden rounded-[2.1rem] bg-white">
                <span aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0F172A]" />
                <iframe
                  key={brand.slug}
                  title={`${brand.name} sample card`}
                  srcDoc={html}
                  sandbox="allow-scripts allow-popups"
                  className="dc-swap-in h-[640px] w-full border-0"
                  loading="lazy"
                />
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] text-[#94A3B8]">Live card — scroll inside the phone</p>
          </div>

          {/* Brand facts */}
          <div key={brand.slug} className="dc-swap-in">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em]"
              style={{ background: `${brand.primary}1A`, color: brand.secondary }}>
              {brand.category}
            </span>
            <h2 className="mt-3 font-display text-[1.9rem] font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-[2.3rem]">{brand.name}</h2>
            <p className="mt-1 text-[14.5px] font-semibold" style={{ color: brand.secondary }}>{brand.tagline}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#475569]">{brand.about}</p>

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {brand.stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-white p-3.5 ring-1 ring-[#E2E8F0]">
                  <p className="font-display text-[1.4rem] font-extrabold leading-none text-[#0F172A]">{s.value}</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-[#64748B]">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Why a brand this size uses one</p>
            <ul className="mt-3 space-y-2">
              {brand.why.map((w) => (
                <li key={w} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-[#E2E8F0]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: brand.primary }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span className="text-[14px] leading-snug text-[#334155]">{w}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to={SIGNUP} className="dc-btn-shine group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl gradient-gold px-7 text-[15px] font-extrabold text-[#0F172A] shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                <span className="relative z-10">Build my brand card</span>
                <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/bulk-cards" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-7 text-[15px] font-bold text-[#0F172A] ring-1 ring-[#E2E8F0] transition-all hover:ring-[#F7B31C] active:scale-[0.97]">
                <Users size={17} /> Cards for a whole team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why it works at scale ── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">
          What changes when the brand is <span className="text-gradient-gold">big</span>
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_BIG.map((w) => (
            <div key={w.t} className="group rounded-[22px] bg-white p-5 ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-1 hover:shadow-premium-lg">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-gold text-[#0F172A] shadow-gold transition-transform group-hover:-rotate-6">
                <w.icon size={19} />
              </span>
              <p className="mt-3.5 text-[15px] font-bold text-[#0F172A]">{w.t}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#64748B]">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 text-center sm:p-14">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#F7B31C]/20 blur-3xl animate-aurora-drift" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-3 py-1 text-[12px] font-bold text-[#4ADE80] ring-1 ring-[#22C55E]/30">
              <Sparkles size={13} /> ₹0 for 30 days · no payment details
            </span>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[2.6rem]">
              Your brand, on a card like this
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14.5px] text-[#94A3B8]">
              Pick a design, add your logo and brand colours, and share one link across every outlet.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={SIGNUP} className="dc-btn-shine group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl gradient-gold px-8 text-[15px] font-extrabold text-[#0F172A] shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                <span className="relative z-10">Start free trial</span>
                <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/contact" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl px-7 text-[15px] font-bold text-white ring-1 ring-white/20 transition-all hover:bg-white/10 active:scale-[0.97]">
                <Share2 size={17} /> Talk to our team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
