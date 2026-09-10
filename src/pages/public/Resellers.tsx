/*
 * /resellers — sells a business opportunity, not a product.
 *
 * An agency owner lands here with exactly one question: "how much can I
 * actually make?" So the earnings calculator sits second, right under the
 * hero, and everything else supports the answer. The commission bands and
 * the average plan value are constants at the top — set them to your real
 * numbers and the whole page follows.
 */
import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  Users, CreditCard, BarChart3, Palette, FileText, TrendingUp, ArrowRight,
  ChevronRight, Check, Clock, Wallet, ShieldCheck, Globe, Rocket, Headphones,
  Handshake, Printer, Building2, Layers, BadgePercent, Sparkles, IndianRupee,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

/* ── Commission model ──────────────────────────────────────────────
   AVG_PLAN is the yearly value of a typical customer subscription and is
   stated on screen so the estimate is never a black box. */
const AVG_PLAN = 999;
const BANDS = [
  { name: "Starter", min: 5, max: 24, rate: 20, accent: "#14B8A6", blurb: "Getting your first customers on board." },
  { name: "Growth", min: 25, max: 99, rate: 25, accent: "#F7B31C", blurb: "A steady book of recurring accounts." },
  { name: "Elite", min: 100, max: Infinity, rate: 30, accent: "#8B5CF6", blurb: "A full agency operation at the top rate." },
];
const bandFor = (n: number) => BANDS.find((b) => n >= b.min && n <= b.max) ?? BANDS[0];
const inr = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

const WA_NUMBER = "919517722444";
const waLink = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const WHY = [
  { icon: TrendingUp, accent: "#14B8A6", title: "Recurring, Not One-Off", desc: "Every customer renews yearly, so the book you build this year still pays you next year." },
  { icon: Palette, accent: "#8B5CF6", title: "Your Brand, Not Ours", desc: "Your logo, your colours, your domain. Customers never see DigitalCarda anywhere." },
  { icon: ShieldCheck, accent: "#F7B31C", title: "No Stock, No Dev Team", desc: "Nothing to print, nothing to host, nothing to maintain. We run the platform, you run the business." },
];

const PLATFORM = [
  { icon: Users, title: "Add Customers", desc: "Create and manage unlimited customer accounts from one dashboard." },
  { icon: CreditCard, title: "Assign Packages", desc: "Allocate Trial, Gold or Platinum plans to each customer in a click." },
  { icon: Clock, title: "Track Expiry", desc: "See every renewal date and send reminders before a plan lapses." },
  { icon: BarChart3, title: "Manage Leads", desc: "Every lead captured across all your customers' cards, in one list." },
  { icon: Palette, title: "White-Label Branding", desc: "Rebrand the whole platform with your logo, colours and domain." },
  { icon: Wallet, title: "Commission Reports", desc: "Track earnings, commissions and payouts with a clear statement." },
  { icon: TrendingUp, title: "Customer Analytics", desc: "Views, clicks and engagement across your entire customer base." },
  { icon: FileText, title: "Marketing Material", desc: "Ready-made brochures, decks and email templates you can send today." },
];

const AUDIENCE = [
  { icon: Building2, accent: "#F7B31C", title: "Digital Agencies", desc: "Add a recurring line to the websites and marketing you already sell." },
  { icon: Printer, accent: "#EC4899", title: "Printers & Card Shops", desc: "Sell the digital version of the visiting cards you already print." },
  { icon: Handshake, accent: "#14B8A6", title: "Freelancers & Consultants", desc: "A product to sell alongside your service, without hiring anyone." },
  { icon: Globe, accent: "#8B5CF6", title: "IT & Software Resellers", desc: "Slot it into your existing SME catalogue as a low-touch upsell." },
];

const STEPS = [
  { icon: FileText, num: 1, title: "Apply", desc: "Send the reseller application. Our team reviews and approves your account." },
  { icon: Palette, num: 2, title: "Brand It", desc: "Add your logo, pick your colours and point your own domain at the platform." },
  { icon: Users, num: 3, title: "Add Customers", desc: "Create accounts, assign packages and build their cards from your dashboard." },
  { icon: Wallet, num: 4, title: "Earn Monthly", desc: "Commission accrues on every subscription and is paid out each month." },
];

const FAQS = [
  { q: "How much commission do resellers earn?", a: "Resellers earn between 20% and 30% recurring commission on every customer subscription. The rate is set by how many active customers you hold, and it applies to renewals as well as new sales, not just the first year." },
  { q: "Is there a minimum commitment?", a: "There is no lock-in and no minimum spend. The programme starts from five customer accounts, and you can grow at whatever pace suits your business." },
  { q: "Can I use my own domain and branding?", a: "Yes. Full white-label support means your logo, your colours and your own domain throughout. Your customers sign in to your brand and never see ours." },
  { q: "How and when do I get paid?", a: "Commissions are calculated monthly and paid by bank transfer or UPI once you cross the minimum payout threshold. Every statement itemises which customer each rupee came from." },
  { q: "Do I need technical knowledge to resell?", a: "No. There is nothing to host, install or maintain. If you can fill in a form you can create a customer's card, and our team handles the platform, updates and uptime." },
  { q: "What support do I get as a reseller?", a: "You get onboarding help, ready-made sales material, and a support channel for you rather than a general queue. Elite-tier partners also get a named account manager." },
];

/* Twelve months of a book of business compounding — the hero visual. */
const REVENUE_BARS = [8, 14, 19, 27, 34, 44, 52, 63, 71, 82, 91, 100];

/* ── Page ──────────────────────────────────────────────────────── */
export default function Resellers() {
  const [customers, setCustomers] = useState(25);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const band = bandFor(customers);
  const yearly = customers * AVG_PLAN * (band.rate / 100);
  const monthly = yearly / 12;

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
    let s = document.getElementById("dc-reseller-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-reseller-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-reseller-ld")?.remove(); };
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#8B5CF6]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
            <Reveal stagger>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C] animate-pulse" /> Reseller programme · 20–30% recurring
              </span>
              <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-extrabold text-[#0F172A] leading-[1.07] tracking-tight">
                Start Your Own{" "}
                <span className="relative inline-block text-gradient-gold">
                  Digital Card Business
                  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
                Sell digital cards under your own brand, on your own domain. We build and run the platform — you keep the customer and a recurring share of every subscription.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/become-reseller" className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                  Apply as Reseller <ArrowRight size={18} />
                </Link>
                <a href="#earnings" className="btn-navy h-12 px-7 flex items-center justify-center gap-2 text-base">
                  <IndianRupee size={17} /> See What You'd Earn
                </a>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                {[
                  { v: "30%", label: "Top commission" },
                  { v: "200+", label: "Active resellers" },
                  { v: "0", label: "Setup cost" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white shadow-premium border border-[#F1F5F9] px-3 py-3 text-center">
                    <p className="text-xl font-extrabold text-gradient-gold">{s.v}</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal className="lg:pl-4">
              <RevenueVisual />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Earnings calculator ── */}
      <section id="earnings" className="scroll-mt-24 py-20 bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Your earnings"
            title={<>What This Actually <span className="text-gradient-gold">Pays You</span></>}
            subtitle="Move the slider to your target number of customers. The rate changes automatically as your book grows."
          />

          <Reveal>
            <div className="rounded-3xl bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg overflow-hidden">
              <div className="grid lg:grid-cols-5">
                {/* control */}
                <div className="lg:col-span-3 p-6 sm:p-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="rs-customers" className="text-[12px] font-bold uppercase tracking-wide text-[#94A3B8]">
                      Customers you sell to
                    </label>
                    <span className="text-3xl font-extrabold text-[#0F172A] tabular-nums">{customers}</span>
                  </div>

                  <input
                    id="rs-customers"
                    type="range"
                    min={5}
                    max={200}
                    step={5}
                    value={customers}
                    onChange={(e) => setCustomers(Number(e.target.value))}
                    className="mt-4 w-full accent-[#F7B31C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#94A3B8] mt-1">
                    <span>5</span><span>100</span><span>200</span>
                  </div>

                  {/* band chips */}
                  <div className="mt-6 grid grid-cols-3 gap-2.5">
                    {BANDS.map((b) => {
                      const on = b.name === band.name;
                      return (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => setCustomers(b.min)}
                          className={`rounded-2xl p-3 text-left transition-all duration-300 ${on ? "ring-2 shadow-premium -translate-y-0.5" : "ring-1 ring-[#E8ECF3] hover:ring-[#CBD5E1]"}`}
                          style={on ? { borderColor: b.accent, boxShadow: `0 0 0 2px ${b.accent}` } : undefined}
                        >
                          <span className="text-[11px] font-bold" style={{ color: on ? b.accent : "#94A3B8" }}>{b.name}</span>
                          <p className="text-[15px] font-extrabold text-[#0F172A] leading-none mt-1">{b.rate}%</p>
                          <p className="text-[10px] text-[#94A3B8] mt-1">
                            {b.max === Infinity ? `${b.min}+ customers` : `${b.min}–${b.max}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-5 text-[11.5px] text-[#94A3B8] leading-relaxed">
                    Estimated on an average customer plan of {inr(AVG_PLAN)} per year at your {band.rate}% band.
                    Actual earnings depend on the mix of plans you sell.
                  </p>
                </div>

                {/* result */}
                <div className="lg:col-span-2 relative p-6 sm:p-8 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white overflow-hidden">
                  <div className="absolute inset-0 bg-grid-dark opacity-25" />
                  <div
                    className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl transition-colors duration-700"
                    style={{ background: `${band.accent}33` }}
                  />
                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: `${band.accent}26`, color: band.accent }}>
                      <BadgePercent size={11} /> {band.name} · {band.rate}%
                    </span>

                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Recurring, every year</p>
                    <p key={yearly} className="dc-swap-in text-[2.6rem] leading-none font-extrabold tabular-nums text-gradient-gold mt-1.5">
                      {inr(yearly)}
                    </p>

                    <div className="mt-6 pt-5 border-t border-white/10">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">That is about</p>
                      <p key={monthly} className="dc-swap-in text-xl font-extrabold tabular-nums text-white mt-1">{inr(monthly)} <span className="text-[13px] font-medium text-[#94A3B8]">/ month</span></p>
                    </div>

                    <p className="mt-5 text-[11.5px] text-[#94A3B8] leading-relaxed">{band.blurb}</p>

                    <a
                      href={waLink(`Hi DigitalCarda, I'm interested in the reseller programme. I'm planning for around ${customers} customers.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-6 w-full h-12 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      Discuss this on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Why resell ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why resell this"
            title={<>A Product You Can Sell <span className="text-gradient-gold">Without Building One</span></>}
            subtitle="Three reasons agencies pick a white-label product over building their own."
          />
          <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHY.map((w) => (
              <div key={w.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${w.accent}2E` }} />
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${w.accent}18`, color: w.accent }}>
                  <w.icon size={22} />
                </span>
                <h3 className="relative text-[15.5px] font-bold text-[#0F172A] mb-2">{w.title}</h3>
                <p className="relative text-[13px] text-[#64748B] leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Platform / what you get ── */}
      <section className="py-20 bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Your dashboard"
            title={<>Everything You Need to <span className="text-gradient-gold">Run It</span></>}
            subtitle="The reseller console you get on day one — no setup, no development."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORM.map((f) => (
              <div key={f.title} className="group rounded-2xl bg-white ring-1 ring-[#E8ECF3] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span className="w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                  <f.icon size={19} />
                </span>
                <h3 className="text-[14px] font-bold text-[#0F172A] mb-1.5 leading-snug">{f.title}</h3>
                <p className="text-[12.5px] text-[#64748B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-gradient-to-br from-[#F7B31C] via-[#D97706] to-[#F7B31C] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0F172A]/10 text-[#0F172A] mb-3">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">From Application to Payout</h2>
          </div>
          <Reveal stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-white/30" />
            {STEPS.map((s) => (
              <div key={s.num} className="text-center relative z-10 group">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                    <s.icon size={28} className="text-[#D97706]" />
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
        </div>
      </section>

      {/* ── Who resells ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Who resells with us"
            title={<>Already Selling to <span className="text-gradient-gold">Small Businesses?</span></>}
            subtitle="If you have the customers, this is a line you can add on Monday."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${a.accent}2E` }} />
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${a.accent}18`, color: a.accent }}>
                  <a.icon size={22} />
                </span>
                <h3 className="relative text-[15px] font-bold text-[#0F172A] mb-1.5 leading-snug">{a.title}</h3>
                <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title={<>Reseller <span className="text-gradient-gold">Questions</span></>}
            subtitle="What partners ask before they apply."
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

      {/* ── CTA ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative text-center rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-10 sm:p-14 overflow-hidden">
              <div className="absolute inset-0 bg-grid-dark opacity-25" />
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#F7B31C]/20 rounded-full blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#F7B31C]/15 text-[#F7B31C] ring-1 ring-[#F7B31C]/25">
                  <Sparkles size={11} /> Applications open
                </span>
                <h2 className="mt-4 text-2xl sm:text-[2.1rem] font-extrabold text-white tracking-tight">Ready to Become a Reseller?</h2>
                <p className="mt-3 text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Apply today, get your branding set up, and start signing customers on a platform you never have to maintain.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link to="/become-reseller" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
                    Apply Now <ArrowRight size={16} />
                  </Link>
                  <Link to="/contact" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
                    Talk to Sales <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#F7B31C]" /> No setup fee</span>
                  <span className="inline-flex items-center gap-1.5"><Rocket size={13} className="text-[#F7B31C]" /> Live in days, not months</span>
                  <span className="inline-flex items-center gap-1.5"><Headphones size={13} className="text-[#F7B31C]" /> Partner support channel</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* ── Hero visual: a book of business compounding over a year ───── */
function RevenueVisual() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#F7B31C]/20 to-[#8B5CF6]/10 blur-3xl" />
      <div className="relative rounded-[1.75rem] bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Recurring commission</p>
            <p className="text-[13px] text-[#64748B] mt-0.5">As your customer book grows</p>
          </div>
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#DCFCE7] text-[#166534] text-[11px] font-bold shrink-0">
            <TrendingUp size={12} /> Compounding
          </span>
        </div>

        {/* bars grow on mount */}
        <div className="mt-7 flex items-end justify-between gap-1.5 h-40" aria-hidden="true">
          {REVENUE_BARS.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#F7B31C] to-[#FCD34D] transition-all duration-1000 ease-out"
                style={{ height: grown ? `${h}%` : "0%", transitionDelay: `${i * 70}ms` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#94A3B8] mt-2 font-semibold">
          <span>Month 1</span><span>Month 6</span><span>Month 12</span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            { icon: Users, label: "Customers", value: "120" },
            { icon: Layers, label: "Cards live", value: "340" },
            { icon: BadgePercent, label: "Your rate", value: "30%" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[#F8FAFC] ring-1 ring-[#EEF2F7] px-3 py-2.5 text-center">
              <s.icon size={14} className="mx-auto text-[#B45309]" />
              <p className="text-[14px] font-extrabold text-[#0F172A] mt-1 tabular-nums leading-none">{s.value}</p>
              <p className="text-[9.5px] text-[#94A3B8] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* floating payout chip */}
      <div className="hidden sm:flex absolute -right-3 -bottom-4 items-center gap-2.5 bg-white rounded-2xl px-4 py-3 shadow-premium-lg ring-1 ring-[#F1F5F9] animate-float">
        <span className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center"><Wallet size={16} className="text-[#16A34A]" /></span>
        <div>
          <p className="text-[11px] font-extrabold text-[#0F172A] leading-none">Paid monthly</p>
          <p className="text-[9.5px] text-[#94A3B8] mt-1">Bank transfer or UPI</p>
        </div>
      </div>
    </div>
  );
}
