/*
 * /custom-domain — sells the ₹499 custom-domain add-on.
 *
 * Copy is held to what the product actually does (api/domain-router.ts and
 * the pricing FAQ). The previous version promised three things it does not:
 * "activates instantly" (it is usually 24–48 hours while DNS and HTTPS
 * settle), "upgrade to Premium" (it is a one-time add-on, free only on the
 * Platinum 3-Year plan), and "custom domains rank better on Google" (a
 * branded address builds trust; it is not a ranking factor).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Globe, Check, ArrowRight, ShieldCheck, Lock, BadgeCheck, Server, Copy,
  ChevronRight, Sparkles, KeyRound, MousePointerClick, Clock, X,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import JsonLd from "@/components/seo/JsonLd";

const PRICE = 499; // mirrors DOMAIN_ADDON_PRICE in api/domain-router.ts

/* Addresses the hero cycles through. */
const DOMAINS = ["card.yourbrand.com", "me.aaravmehta.in", "profile.sharmaclinic.com", "connect.acmedigital.co", "vcard.yourcompany.com"];

const BENEFITS = [
  { icon: BadgeCheck, accent: "#F7B31C", title: "Your name in the address bar", desc: "People see your brand the moment they open the card — not ours in front of it." },
  { icon: ShieldCheck, accent: "#14B8A6", title: "Trust before the first tap", desc: "A familiar domain reads as a real business. That matters most with first-time customers." },
  { icon: Lock, accent: "#3B82F6", title: "HTTPS included", desc: "A security certificate is issued for your domain automatically. No setup on your side." },
  { icon: KeyRound, accent: "#8B5CF6", title: "You keep ownership", desc: "Use a domain you already own or buy one anywhere. It stays yours; we only point it at your card." },
];

const STEPS = [
  { icon: MousePointerClick, num: 1, title: "Add the domain", desc: "Tell us the address you want, such as card.yourbrand.com, from your dashboard." },
  { icon: Server, num: 2, title: "Add one DNS record", desc: "We give you the exact record. Paste it in at your registrar — it takes about two minutes." },
  { icon: Lock, num: 3, title: "HTTPS is issued", desc: "Once the record is found, a certificate is set up for your domain automatically." },
  { icon: Globe, num: 4, title: "Your card goes live", desc: "Usually within 24–48 hours, while DNS updates spread across the internet." },
];

const FAQS = [
  { q: "How much does a custom domain cost?", a: `It is a one-time setup fee of Rs. ${PRICE}, and it is included free on the Platinum 3-Year plan. The domain itself is registered separately with any registrar you choose, and its yearly registration fee is paid to them.` },
  { q: "Do I need to buy a new domain?", a: "No. You can use a domain you already own — most people add a subdomain like card.yourbrand.com so their main website stays exactly as it is. If you do not have one yet, you can buy it from any registrar." },
  { q: "How long does it take to go live?", a: "Usually 24 to 48 hours. Most of that is DNS updates spreading across the internet after you add the record; the certificate for HTTPS is issued automatically once the record is found." },
  { q: "What exactly do I change in my DNS?", a: "You add one CNAME record at your domain registrar, and occasionally a TXT record for verification. We show you the exact values to copy, so there is nothing to work out yourself." },
  { q: "Will my existing website be affected?", a: "No. If you use a subdomain such as card.yourbrand.com, only that subdomain points at your card. Your main website, email and every other address on the domain keep working as before." },
  { q: "Who owns the domain?", a: "You do. We never take ownership or registrar control — the DNS record simply points the address at your card, and you can remove it whenever you like." },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduce(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

export default function CustomDomain() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  // Cycle the hero address. Held still for anyone who prefers reduced motion.
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % DOMAINS.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const domain = DOMAINS[idx];

  const copyExample = async () => {
    try { await navigator.clipboard.writeText("cname.digitalcarda.in"); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="bg-[#F8FAFC] overflow-hidden">
      <JsonLd id="dc-domain-ld" data={FAQ_LD} />
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div aria-hidden="true" className="absolute inset-0 bg-grid mask-fade-b opacity-60" />
        <div aria-hidden="true" className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#14B8A6]/14 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div aria-hidden="true" className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#F7B31C]/12 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          <Reveal stagger>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#115E59] shadow-premium ring-1 ring-[#CCFBF1]">
              <Globe size={13} className="text-[#14B8A6]" /> Custom domain · Rs. {PRICE} one-time
            </span>
            <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-extrabold text-[#0F172A] leading-[1.07] tracking-tight">
              Your Card, on{" "}
              <span className="relative inline-block text-gradient-gold">
                Your Own Domain
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
              Turn <span className="font-mono text-[#94A3B8]">digitalcarda.in/you</span> into{" "}
              <span className="font-mono font-semibold text-[#0F172A]">card.yourbrand.com</span> — with HTTPS, and a domain that stays yours.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                Get started <ArrowRight size={18} />
              </Link>
              <a href="#how" className="btn-navy h-12 px-7 flex items-center justify-center gap-2 text-base">
                See how it works
              </a>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#64748B]">
              <span className="inline-flex items-center gap-1.5"><Lock size={13} className="text-emerald-500" /> HTTPS included</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-emerald-500" /> Live in 24–48 hours</span>
              <span className="inline-flex items-center gap-1.5"><KeyRound size={13} className="text-emerald-500" /> You keep ownership</span>
            </div>
          </Reveal>

          {/* Browser mock — the address bar cycles through real-looking domains */}
          <Reveal className="lg:pl-4">
            <div className="relative">
              <div aria-hidden="true" className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#14B8A6]/20 to-[#F7B31C]/15 blur-3xl" />
              <div className="relative rounded-[1.5rem] bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#EEF2F7]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
                  <div className="ml-2 flex-1 min-w-0 flex items-center gap-2 h-9 px-3 rounded-lg bg-white ring-1 ring-[#E2E8F0]">
                    <Lock size={13} className="text-emerald-600 shrink-0" />
                    <span key={domain} className="dc-swap-in font-mono text-[13px] text-[#0F172A] truncate" aria-live="polite">
                      https://<span className="font-bold">{domain}</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  {/* Inset banner rather than an edge-to-edge slab: navy in the site's
                      palette, lifted by a soft glow so it reads as a profile cover. */}
                  <div className="relative h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#16324A] to-[#0F4C4A]">
                    <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
                    <div aria-hidden="true" className="absolute -top-10 -right-6 w-40 h-40 rounded-full bg-[#14B8A6]/35 blur-2xl" />
                    <div aria-hidden="true" className="absolute -bottom-12 left-10 w-32 h-32 rounded-full bg-[#F7B31C]/20 blur-2xl" />
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-semibold text-white/80">
                      <Lock size={10} /> Secure
                    </span>
                  </div>

                  {/* Own stacking context so the avatar sits over the positioned banner.
                      -mt-6 overlaps 24px of the 72px avatar; the ~42px name block needs
                      the remaining 48px, so the name sits fully below the banner edge. */}
                  <div className="relative z-10 -mt-6 px-3 flex items-end gap-3.5">
                    <div className="w-[72px] h-[72px] rounded-2xl p-[3px] bg-gradient-to-br from-[#F7B31C] to-[#D97706] shadow-premium-lg shrink-0">
                      <div className="w-full h-full rounded-[13px] bg-white flex items-center justify-center text-[#0F172A] text-2xl font-extrabold">A</div>
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className="text-[16px] font-extrabold text-[#0F172A] leading-tight truncate">Aarav Mehta</p>
                      <p className="text-[12px] text-[#64748B] truncate">Founder · Acme Digital</p>
                    </div>
                  </div>

                  <div className="mt-5 px-1 grid grid-cols-3 gap-2">
                    <span className="h-9 rounded-xl bg-[#0F172A] text-white text-[11.5px] font-bold flex items-center justify-center">Call</span>
                    <span className="h-9 rounded-xl bg-[#25D366] text-white text-[11.5px] font-bold flex items-center justify-center">WhatsApp</span>
                    <span className="h-9 rounded-xl ring-1 ring-[#E2E8F0] text-[#334155] text-[11.5px] font-bold flex items-center justify-center">Save</span>
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="h-2 rounded-full bg-[#F1F5F9]" />
                    <div className="h-2 rounded-full bg-[#F1F5F9] w-4/5" />
                    <div className="h-2 rounded-full bg-[#F1F5F9] w-3/5" />
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex absolute -left-4 -bottom-5 items-center gap-2.5 bg-white rounded-2xl px-4 py-3 shadow-premium-lg ring-1 ring-[#F1F5F9] animate-float">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShieldCheck size={17} /></span>
                <div>
                  <p className="text-[11.5px] font-extrabold text-[#0F172A] leading-none">Certificate active</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Issued automatically</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Before / after ── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The difference"
            title={<>The Same Card. <span className="text-gradient-gold">A Different First Impression.</span></>}
            subtitle="What your customer reads before they have even seen your card."
          />
          <Reveal stagger className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white ring-1 ring-[#E8ECF3] p-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]"><X size={12} /> Without</span>
              <div className="mt-3 flex items-center gap-2 h-11 px-3 rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0]">
                <Lock size={13} className="text-[#94A3B8] shrink-0" />
                <span className="font-mono text-[13px] text-[#64748B] truncate">digitalcarda.in/aarav</span>
              </div>
              <p className="mt-3 text-[12.5px] text-[#64748B] leading-relaxed">Works perfectly — but the first word a customer reads is someone else's brand.</p>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#1E293B] ring-1 ring-[#14B8A6]/40 p-5 overflow-hidden">
              <div aria-hidden="true" className="absolute -top-10 -right-10 w-32 h-32 bg-[#14B8A6]/25 rounded-full blur-2xl" />
              <span className="relative inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5EEAD4]"><Check size={12} /> With a custom domain</span>
              <div className="relative mt-3 flex items-center gap-2 h-11 px-3 rounded-xl bg-white/[0.08] ring-1 ring-white/15">
                <Lock size={13} className="text-emerald-400 shrink-0" />
                <span className="font-mono text-[13px] text-white font-semibold truncate">card.acmedigital.co</span>
              </div>
              <p className="relative mt-3 text-[12.5px] text-[#94A3B8] leading-relaxed">Your name, start to finish — the card reads as part of your own business.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="What you get"
            title={<>Built for Businesses That <span className="text-gradient-gold">Care About the Details</span></>}
            subtitle="Nothing to host, nothing to renew with us, nothing technical to maintain."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${b.accent}2E` }} />
                <span className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${b.accent}18`, color: b.accent }}>
                  <b.icon size={19} />
                </span>
                <h3 className="relative text-[14.5px] font-bold text-[#0F172A] mb-1.5 leading-snug">{b.title}</h3>
                <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="scroll-mt-24 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title={<>Four Steps, <span className="text-gradient-gold">One DNS Record</span></>}
            subtitle="The only technical part is pasting a single record at your registrar — and we give you the exact value."
          />
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <Reveal stagger className="lg:col-span-3 space-y-3.5">
              {STEPS.map((s) => (
                <div key={s.num} className="group flex items-start gap-4 rounded-2xl bg-white ring-1 ring-[#E8ECF3] p-4 sm:p-5 transition-all duration-300 hover:shadow-premium hover:ring-[#F7B31C]/40">
                  <span className="relative w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                    <s.icon size={20} />
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0F172A] text-[#F7B31C] text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white">{s.num}</span>
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-[15px] font-bold text-[#0F172A]">{s.title}</h3>
                    <p className="mt-1 text-[13px] text-[#64748B] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </Reveal>

            {/* The record, shown as the registrar screen people will actually see */}
            <Reveal className="lg:col-span-2 lg:sticky lg:top-24">
              <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-5 relative overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5"><Server size={12} /> Your registrar · DNS records</p>
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-[12.5px]">
                    <span className="text-[#64748B]">Type</span>
                    <span className="font-mono font-semibold text-white">CNAME</span>
                    <span className="text-[#64748B]">Name</span>
                    <span className="font-mono font-semibold text-white">card</span>
                    <span className="text-[#64748B]">Value</span>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-[#5EEAD4] truncate">cname.digitalcarda.in</span>
                      <button type="button" onClick={copyExample} aria-label="Copy example value" className="shrink-0 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/25 px-3 py-2.5">
                    <BadgeCheck size={15} className="text-emerald-400 shrink-0" />
                    <span className="text-[12px] text-emerald-200">Record found · certificate issuing</span>
                  </div>
                  <p className="mt-4 text-[11px] text-[#64748B] leading-relaxed">
                    An example. Your dashboard shows the exact record for your domain — occasionally with one extra TXT record for verification.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Price ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative rounded-3xl ring-2 ring-[#F7B31C] bg-gradient-to-b from-white to-[#FFFBEB] p-8 sm:p-10 overflow-hidden shadow-premium-lg">
              <div aria-hidden="true" className="absolute -top-16 -right-16 w-56 h-56 bg-[#F7B31C]/20 rounded-full blur-3xl" />
              <div className="relative grid sm:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#0F172A] text-[#F7B31C]"><Sparkles size={11} /> Add-on</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-[#0F172A] tracking-tight">Rs. {PRICE}</span>
                    <span className="text-[14px] text-[#64748B]">one-time</span>
                  </div>
                  <p className="mt-2 text-[13.5px] text-[#475569]">
                    <span className="font-bold text-[#0F172A]">Free</span> on the Platinum 3-Year plan.
                  </p>
                  <p className="mt-3 text-[12px] text-[#94A3B8] leading-relaxed">
                    Domain registration is separate and paid to your registrar. No monthly fee to us.
                  </p>
                </div>
                <div>
                  <ul className="space-y-2.5">
                    {["Connect one domain or subdomain", "HTTPS certificate included", "Setup guidance from our team", "Keep full ownership of your domain"].map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-[#334155]">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check size={12} strokeWidth={3} /></span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-col gap-2.5">
                    <Link to="/signup" className="btn-gold h-12 inline-flex items-center justify-center gap-2 text-base">Get started <ArrowRight size={17} /></Link>
                    <Link to="/pricing" className="h-11 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#475569] rounded-xl ring-1 ring-[#E2E8F0] hover:bg-white transition-all">
                      Compare plans <ChevronRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Questions"
            title={<>Custom Domain <span className="text-gradient-gold">Questions</span></>}
            subtitle="What people check before they connect their domain."
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
                    <h3 className="flex-1 text-[14.5px] font-bold text-[#0F172A] leading-snug">{f.q}</h3>
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

      {/* ── Related ── */}
      <section className="pb-14" aria-labelledby="cd-related">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="cd-related" className="text-center text-[12px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Goes well with your own domain</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/features#custom-domain", t: "All card features", d: "40+ features, including custom domains" },
              { to: "/pricing", t: "Plans & pricing", d: "₹499 setup · free on Platinum 3-Year" },
              { to: "/digital-business-cards-templates", t: "Card designs", d: "Pick a template for your brand" },
              { to: "/resellers", t: "White-label reseller", d: "Sell cards on your own domain" },
            ].map((r) => (
              <Link key={r.to} to={r.to} className="group rounded-2xl bg-white ring-1 ring-[#E2E8F0] p-4 transition-all hover:-translate-y-0.5 hover:shadow-premium hover:ring-[#F7B31C]/50">
                <span className="flex items-center justify-between text-[14.5px] font-bold text-[#0F172A]">{r.t} <ArrowRight size={15} className="text-[#B45309] transition-transform group-hover:translate-x-1" /></span>
                <span className="mt-1 block text-[12.5px] text-[#64748B] leading-snug">{r.d}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative text-center rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-10 sm:p-14 overflow-hidden">
              <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
              <div aria-hidden="true" className="absolute -top-16 -right-16 w-64 h-64 bg-[#14B8A6]/20 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl sm:text-[2.1rem] font-extrabold text-white tracking-tight">Ready to put your name on it?</h2>
                <p className="mt-3 text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Start with the free trial, build your card, then connect your domain whenever you are ready.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">Start free trial <ArrowRight size={16} /></Link>
                  <Link to="/contact" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">Talk to us <ChevronRight size={16} /></Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
