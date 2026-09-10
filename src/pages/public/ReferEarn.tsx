/*
 * /refer-earn — the public pitch for the referral programme.
 *
 * Rates are pulled live from referral.publicRates, so the whole page (copy,
 * examples, FAQ and schema) follows whatever the admin sets rather than
 * hard-coded numbers.
 *
 * Deliberately NOT another slider: /resellers already owns that interaction.
 * Here the earnings question is answered with three worked examples, which
 * reads faster for a much smaller decision.
 */
import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  Gift, Share2, UserCheck, Wallet, Banknote, ArrowRight, ArrowDownToLine,
  Check, Sparkles, Link2, Users, Percent, ShieldCheck, Send, ChevronRight,
  TrendingUp, Infinity as InfinityIcon,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

/* Average first paid plan value, used only for the worked examples and shown
   on screen so the estimate is never presented as a promise. */
const AVG_PLAN = 999;
const EXAMPLES = [5, 25, 100];
const inr = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

export default function ReferEarnPublic() {
  const { data: rates } = trpc.referral.publicRates.useQuery();
  const commission = rates?.commissionPercent ?? 15;
  const discount = rates?.discountPercent ?? 15;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    { icon: Link2, title: "Share your link", desc: "Every DigitalCarda account gets a unique referral link and code. Send it to friends, clients and your network." },
    { icon: UserCheck, title: "They join and upgrade", desc: `They sign up through your link and get ${discount}% off their first paid plan — an instant reason to say yes.` },
    { icon: Banknote, title: "You earn cash", desc: `The moment they go paid you earn ${commission}% of what they pay, credited straight to your in-app wallet.` },
    { icon: Wallet, title: "Withdraw anytime", desc: "Cash out to your bank account or UPI whenever you like. No lock-in, no minimum tier to unlock first." },
  ];

  const perks = [
    { icon: Percent, accent: "#F7B31C", title: `${discount}% off for your friend`, desc: `Anyone who joins on your link saves ${discount}% on their first paid plan.` },
    { icon: Banknote, accent: "#16A34A", title: `${commission}% cash for you`, desc: `Earn a flat ${commission}% commission on every paid plan your referrals buy.` },
    { icon: Wallet, accent: "#8B5CF6", title: "Built-in wallet", desc: "Every reward lands in your dashboard wallet with a full statement of earnings." },
    { icon: ArrowDownToLine, accent: "#3B82F6", title: "Bank or UPI payouts", desc: "Request a payout to your bank account or UPI and our team processes it." },
    { icon: InfinityIcon, accent: "#EC4899", title: "Unlimited referrals", desc: "There is no cap. Refer as many people as you like and keep earning on each." },
    { icon: ShieldCheck, accent: "#14B8A6", title: "Transparent and fair", desc: "One clear reward per referred user, with a full audit trail you can check." },
  ];

  const faqs = [
    { q: "Who can join the Refer & Earn programme?", a: "Every DigitalCarda user gets a referral link automatically. Sign in, open the Refer & Earn page in your dashboard, and your link and code are already waiting there — there is nothing to apply for." },
    { q: "When do I earn my commission?", a: `You earn when someone you referred upgrades to a paid plan. You receive ${commission}% of what they pay, credited to your wallet once the payment is confirmed.` },
    { q: "What does my friend get?", a: `Your friend gets ${discount}% off their first paid plan when they sign up using your referral link, so you are giving them something real rather than just asking a favour.` },
    { q: "How do I get paid?", a: "Your rewards collect in your in-app wallet. Request a payout to your bank account or UPI and our team processes it — the entry is marked paid with a reference you can see in your statement." },
    { q: "Is there a limit on how much I can earn?", a: "No. There is no cap on how many people you refer or how much you earn. The more referrals who go paid, the more you earn." },
    { q: "Do I earn again if my friend upgrades later?", a: "The reward is one-time per referred user, on their first paid plan. Later upgrades adjust their existing balance toward the new plan rather than creating a second reward." },
  ];

  // FAQPage schema — rebuilt when the live rates arrive so the text always
  // matches what is rendered.
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    let s = document.getElementById("dc-refer-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-refer-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-refer-ld")?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commission, discount]);

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#16A34A]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
            <Reveal stagger>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
                <Gift size={13} className="text-[#F7B31C]" /> Refer &amp; Earn · No cap on earnings
              </span>
              <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-extrabold text-[#0F172A] leading-[1.07] tracking-tight">
                Give {discount}%,{" "}
                <span className="relative inline-block text-gradient-gold">
                  get {commission}% cash
                  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
                Share DigitalCarda with your network. Your friends save {discount}% on their first paid plan, and you earn a flat {commission}% cash — paid to your wallet and withdrawable to bank or UPI.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/signup" className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                  Get your referral link <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn-navy h-12 px-7 flex items-center justify-center gap-2 text-base">
                  Sign in to refer
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#64748B]">
                <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Free to join</span>
                <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> No cap on referrals</span>
                <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Paid to bank or UPI</span>
              </div>
            </Reveal>

            {/* Give / get visual */}
            <Reveal className="lg:pl-4">
              <div className="relative">
                <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#F7B31C]/20 to-[#16A34A]/10 blur-3xl" />
                <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-6 sm:p-7 shadow-premium-lg ring-1 ring-white/10">
                  <div className="absolute inset-0 bg-grid-dark opacity-25" />
                  <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-[#F7B31C]/25 blur-3xl pointer-events-none" />
                  <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-[#16A34A]/20 blur-3xl pointer-events-none" />

                  <div className="relative grid grid-cols-2 gap-3.5">
                    <div className="rounded-2xl bg-white/[0.08] ring-1 ring-white/10 p-5 text-center backdrop-blur-sm">
                      <span className="inline-flex w-11 h-11 rounded-xl bg-[#F7B31C]/20 items-center justify-center mb-3"><Percent size={20} className="text-[#F7B31C]" /></span>
                      <p className="text-[1.75rem] font-extrabold text-white leading-none">{discount}%</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#F7B31C] mt-1.5">They save</p>
                      <p className="text-[11.5px] text-white/55 mt-2 leading-snug">on their first paid plan</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.08] ring-1 ring-white/10 p-5 text-center backdrop-blur-sm">
                      <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-400/20 items-center justify-center mb-3"><Banknote size={20} className="text-emerald-300" /></span>
                      <p className="text-[1.75rem] font-extrabold text-white leading-none">{commission}%</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mt-1.5">You earn</p>
                      <p className="text-[11.5px] text-white/55 mt-2 leading-snug">cash, on every paid plan</p>
                    </div>
                  </div>

                  {/* mini wallet ticker */}
                  <div className="relative mt-4 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Wallet balance</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300"><TrendingUp size={11} /> Growing</span>
                    </div>
                    <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">Rs. 2,650</p>
                    <div className="mt-3 space-y-1.5">
                      {[{ n: "Priya S.", a: "+Rs. 127" }, { n: "Rahul M.", a: "+Rs. 300" }].map((r) => (
                        <div key={r.n} className="flex items-center gap-2.5 text-[11.5px]">
                          <span className="w-6 h-6 rounded-lg bg-emerald-400/15 text-emerald-300 flex items-center justify-center shrink-0"><Banknote size={11} /></span>
                          <span className="text-white/60 flex-1 truncate">Referral reward — {r.n}</span>
                          <span className="font-bold text-emerald-300">{r.a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-center justify-center gap-2 text-[11.5px] text-white/45">
                    <Sparkles size={12} className="text-[#F7B31C]" /> Withdrawable to bank or UPI
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── What it adds up to ── */}
      <section className="py-20 bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The maths"
            title={<>What It Actually <span className="text-gradient-gold">Adds Up To</span></>}
            subtitle="Three worked examples at the current rate. There is no cap — these are just markers along the way."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {EXAMPLES.map((n, i) => {
              const earn = n * AVG_PLAN * (commission / 100);
              const hero = i === 1;
              return (
                <div
                  key={n}
                  className={`relative rounded-2xl p-6 text-center overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${
                    hero
                      ? "bg-gradient-to-b from-[#0F172A] to-[#1E293B] ring-1 ring-[#F7B31C]/40 shadow-premium-lg"
                      : "bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] shadow-premium hover:ring-[#F7B31C]/40"
                  }`}
                >
                  {hero && <span className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#F7B31C]/20 blur-2xl" />}
                  <div className="relative">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${hero ? "text-[#F7B31C]" : "text-[#94A3B8]"}`}>
                      <Users size={12} /> Refer {n}
                    </span>
                    <p className={`mt-3 text-[2rem] font-extrabold tabular-nums leading-none ${hero ? "text-white" : "text-[#0F172A]"}`}>{inr(earn)}</p>
                    <p className={`text-[11.5px] mt-2 ${hero ? "text-[#94A3B8]" : "text-[#94A3B8]"}`}>in cash rewards</p>
                  </div>
                </div>
              );
            })}
          </Reveal>
          <Reveal className="mt-6">
            <p className="text-center text-[12px] text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              Estimated at {commission}% of an average first paid plan of {inr(AVG_PLAN)}. What you actually earn depends on the plans your referrals choose.
            </p>
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
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Four Steps, One Link</h2>
          </div>
          <Reveal stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-white/30" />
            {steps.map((s, i) => (
              <div key={s.title} className="text-center relative z-10 group">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                    <s.icon size={28} className="text-[#D97706]" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#0F172A] border-2 border-[#F7B31C] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#F7B31C]">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Perks ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="What you get"
            title={<>Built to Be <span className="text-gradient-gold">Worth Your While</span></>}
            subtitle="A referral programme is only good if the money is real and the payout is simple. This one is both."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((p) => (
              <div key={p.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${p.accent}2E` }} />
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${p.accent}18`, color: p.accent }}>
                  <p.icon size={21} />
                </span>
                <h3 className="relative text-[14.5px] font-bold text-[#0F172A] mb-1.5">{p.title}</h3>
                <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Wallet ── */}
      <section className="py-20 bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4"><Wallet size={13} /> Your earnings wallet</span>
              <h2 className="text-2xl sm:text-[2rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">Track every reward, cash out on your terms</h2>
              <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">
                Every referral reward lands in your wallet with a clear statement. When you are ready, request a payout to your bank account or UPI — our team processes it and marks it paid with a reference you can see.
              </p>
              <div className="mt-6 space-y-3">
                {["Real-time wallet balance and statement", "Payout by bank transfer or UPI", "No cap — refer and earn as much as you like", "One transparent reward per referred user"].map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check size={12} strokeWidth={3} /></span>
                    <span className="text-[14px] text-[#334155] leading-relaxed">{t}</span>
                  </div>
                ))}
              </div>
              <Link to="/signup" className="btn-gold mt-7 h-12 px-7 inline-flex items-center gap-2 text-base">
                Start earning <ArrowRight size={17} />
              </Link>
            </Reveal>

            <Reveal className="flex justify-center">
              <div className="relative w-full max-w-[420px]">
                <div className="absolute -inset-5 rounded-[2.2rem] bg-gradient-to-br from-[#F7B31C]/15 to-[#16A34A]/10 blur-3xl" />
                <div className="relative rounded-[1.75rem] bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-6">
                  <div className="flex items-start justify-between mb-5 gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5"><Wallet size={13} className="text-[#F7B31C]" /> Wallet balance</p>
                      <p className="text-[2rem] font-extrabold text-[#0F172A] mt-1 tabular-nums leading-none">Rs. 2,650</p>
                    </div>
                    <span className="h-9 px-4 rounded-xl bg-[#0F172A] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0"><ArrowDownToLine size={14} /> Withdraw</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { icon: Banknote, label: "Referral reward — Priya S.", amt: "+Rs. 127", pos: true },
                      { icon: Banknote, label: "Referral reward — Rahul M.", amt: "+Rs. 300", pos: true },
                      { icon: ArrowDownToLine, label: "Payout to UPI · paid", amt: "−Rs. 500", pos: false },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] ring-1 ring-[#EEF2F7] px-3 py-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.pos ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}><r.icon size={15} /></span>
                        <p className="text-[12.5px] font-medium text-[#0F172A] flex-1 truncate">{r.label}</p>
                        <p className={`text-[12.5px] font-bold tabular-nums ${r.pos ? "text-emerald-600" : "text-red-500"}`}>{r.amt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Share channels ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative text-center rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-9 sm:p-11 overflow-hidden">
              <div className="absolute inset-0 bg-grid-dark opacity-25" />
              <div className="absolute -top-14 -right-14 w-56 h-56 bg-[#F7B31C]/15 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Share in seconds, earn for months</h2>
                <p className="mt-2.5 text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Send your link over WhatsApp, social media or email — one tap from your dashboard.
                </p>
                <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
                  {[{ i: Send, t: "WhatsApp" }, { i: Share2, t: "Social" }, { i: Link2, t: "Copy link" }].map((c) => (
                    <span key={c.t} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white/[0.08] ring-1 ring-white/10 text-white text-sm font-semibold transition-all hover:bg-white/[0.14] hover:-translate-y-0.5">
                      <c.i size={15} className="text-[#F7B31C]" /> {c.t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title={<>Refer &amp; Earn <span className="text-gradient-gold">Questions</span></>}
            subtitle="What people check before they start sharing their link."
          />
          <Reveal stagger className="space-y-3">
            {faqs.map((f, i) => {
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
                  <Gift size={11} /> Free to join
                </span>
                <h2 className="mt-4 text-2xl sm:text-[2.1rem] font-extrabold text-white tracking-tight">Start earning today</h2>
                <p className="mt-3 text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Create your free card, grab your referral link, and turn your network into real cash rewards.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
                    Create your free card <ArrowRight size={16} />
                  </Link>
                  <Link to="/login" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
                    I already have an account <ChevronRight size={16} />
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
