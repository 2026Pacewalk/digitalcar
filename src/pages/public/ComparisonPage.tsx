/**
 * /vs/:slug — head-to-head comparison against a named competitor. Captures
 * high-intent commercial searches like "DigitalCarda vs Linktree" and pulls in
 * traffic from "<competitor> alternative India" as a topical relevance signal.
 *
 * Their prices are quoted from their own pricing page, with the date we checked
 * printed on the page. Update src/data/comparisons.ts when they change.
 */
import { Link, useParams, Navigate } from "react-router";
import { getComparison, COMPARISONS } from "@/data/comparisons";
import JsonLd from "@/components/seo/JsonLd";
import { ArrowRight, BadgeIndianRupee, Check, MessageCircle, Nfc, ShieldCheck, Sparkles, Star, Wallet, X } from "lucide-react";

const SIGNUP = "/signup?promo=FREE30D";

/* Short reasons to switch — true for every competitor on this page. */
const EDGES = [
  { icon: MessageCircle, t: "WhatsApp built in", d: "One tap opens a chat with your message already written.", tint: "#22C55E" },
  { icon: Wallet, t: "UPI on the card", d: "GPay, PhonePe, Paytm and bank details with one-tap copy.", tint: "#EC4899" },
  { icon: Nfc, t: "NFC delivered in India", d: "A printed card for ₹499, free delivery to your pin code.", tint: "#F7B31C" },
  { icon: BadgeIndianRupee, t: "Priced in rupees", d: "₹999 a year, shown openly. No dollar billing, no surprises.", tint: "#3B82F6" },
];

const MOVE_STEPS = [
  { t: "Build your card", d: "Pick a design and add your details, or paste your website and let AI write it." },
  { t: "Bring your links across", d: "Copy the links from your old page — website, social, catalogue, booking." },
  { t: "Share the new link", d: "Put it in your WhatsApp profile, bio and email signature. Print the QR once." },
];

export default function ComparisonPage() {
  const { slug = "" } = useParams();
  const cmp = getComparison(slug);
  if (!cmp) return <Navigate to="/digital-business-card-guide" replace />;

  const url = `https://digitalcarda.in/vs/${cmp.slug}`;
  const wins = cmp.rows.filter((r) => r.win).length;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://digitalcarda.in/" },
          { "@type": "ListItem", position: 2, name: `DigitalCarda vs ${cmp.competitor}`, item: url },
        ],
      },
      {
        "@type": "Article",
        headline: `DigitalCarda vs ${cmp.competitor}: Which is Better for Indian Businesses?`,
        datePublished: "2026-09-20",
        author: { "@type": "Organization", name: "DigitalCarda" },
        publisher: {
          "@type": "Organization",
          name: "DigitalCarda",
          logo: { "@type": "ImageObject", url: "https://digitalcarda.in/apple-touch-icon.png" },
        },
        mainEntityOfPage: url,
      },
    ],
  };

  return (
    <div className="bg-[#F8FAFC] overflow-hidden">
      <JsonLd data={jsonLd} />

      {/* ── Hero: the two names, face to face ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 pb-28 sm:pt-32 sm:pb-36">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-40 left-[-10%] h-[460px] w-[460px] rounded-full bg-[#F7B31C]/20 blur-3xl animate-aurora-drift" />
        <div aria-hidden="true" className="absolute -bottom-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-[#64748B]/25 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="text-[12.5px] text-[#94A3B8]">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2 text-[#475569]">/</span>
            <span className="text-[#E2E8F0]">DigitalCarda vs {cmp.competitor}</span>
          </nav>

          <div className="dc-enter mt-6 flex items-center justify-center gap-3 sm:gap-5">
            <div className="flex-1 rounded-[22px] bg-gradient-to-br from-[#F7B31C] to-[#E09A12] p-4 text-center text-[#0F172A] shadow-[0_20px_50px_-20px_rgba(247,179,28,0.8)] sm:p-5">
              <p className="font-display text-[1.05rem] font-extrabold leading-tight sm:text-[1.35rem]">DigitalCarda</p>
              <p className="mt-0.5 text-[11.5px] font-semibold opacity-80">Built for India</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[13px] font-extrabold text-white ring-1 ring-white/20 sm:h-14 sm:w-14 sm:text-[15px]">VS</span>
            <div className="flex-1 rounded-[22px] bg-white/[0.06] p-4 text-center text-white ring-1 ring-white/10 sm:p-5">
              <p className="font-display text-[1.05rem] font-extrabold leading-tight sm:text-[1.35rem]">{cmp.competitor}</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-[#94A3B8]">{cmp.slug === "linktree" ? "Link-in-bio, global" : cmp.slug === "hihello" ? "US digital cards" : "US QR platform"}</p>
            </div>
          </div>

          <h1 className="dc-enter dc-enter-1 mt-8 text-center font-display text-[2rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.9rem] [text-wrap:balance]">
            DigitalCarda vs {cmp.competitor}: which is better for <span className="text-gradient-gold">Indian businesses?</span>
          </h1>

          <div className="dc-enter dc-enter-2 mx-auto mt-7 max-w-3xl rounded-[24px] bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur sm:p-6">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#FCD34D]">
              <Sparkles size={12} /> Short answer
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[#E2E8F0] sm:text-[16px]">{cmp.quickAnswer}</p>
          </div>

          <div className="dc-enter dc-enter-3 mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={SIGNUP} className="dc-btn-shine group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl gradient-gold px-7 text-[15px] font-extrabold text-[#0F172A] shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
              <span className="relative z-10">Start 30-day free trial</span>
              <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/pricing" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/[0.08] px-7 text-[15px] font-bold text-white ring-1 ring-white/15 transition-all hover:bg-white/[0.14] active:scale-[0.97]">
              See our pricing
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* ── Why people switch ── */}
        <section className="relative z-10 -mt-16 sm:-mt-20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EDGES.map((e) => (
              <div key={e.t} className="group rounded-[22px] bg-white p-4 shadow-premium ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-1 hover:shadow-premium-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:-rotate-6" style={{ background: e.tint }}>
                  <e.icon size={19} />
                </span>
                <p className="mt-3.5 text-[14.5px] font-bold text-[#0F172A]">{e.t}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-[#64748B]">{e.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature comparison ── */}
        <section className="pt-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#92400E]">Side by side</span>
              <h2 className="mt-3 font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">
                The full comparison
              </h2>
            </div>
            <p className="text-[12.5px] text-[#64748B]">
              {wins} things DigitalCarda does that {cmp.competitor} doesn&apos;t
            </p>
          </div>

          {/* Phones: one card per row. Desktop: a table. */}
          <div className="mt-6 space-y-2.5 md:hidden">
            {cmp.rows.map((r) => (
              <div key={r.label} className={`rounded-2xl bg-white p-4 ring-1 ${r.win ? "ring-[#F7B31C]/50" : "ring-[#E2E8F0]"}`}>
                <p className="text-[13.5px] font-bold text-[#0F172A]">{r.label}</p>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-start gap-2.5 rounded-xl bg-[#FFFBEB] px-3 py-2.5 ring-1 ring-[#FDE68A]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A]"><Check size={11} strokeWidth={3} /></span>
                    <span className="text-[13px] font-semibold text-[#0F172A]">{r.ours}</span>
                  </div>
                  <div className="flex items-start gap-2.5 px-3 py-1">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                      {r.win ? <X size={11} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />}
                    </span>
                    <span className="text-[13px] text-[#64748B]">{cmp.competitor}: {r.theirs}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-[24px] bg-white shadow-premium ring-1 ring-[#E2E8F0] md:block">
            <table className="w-full table-fixed border-collapse text-[14px]">
              <caption className="sr-only">DigitalCarda compared with {cmp.competitor}</caption>
              <thead>
                <tr className="bg-[#0F172A] text-white">
                  <th scope="col" className="w-[34%] px-6 py-4 text-left text-[13px] font-semibold text-[#94A3B8]">Feature</th>
                  <th scope="col" className="px-5 py-3 text-left">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gold text-[#0F172A]"><Star size={14} className="fill-[#0F172A]" /></span>
                      <span className="text-[14.5px] font-bold">DigitalCarda</span>
                    </span>
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[14.5px] font-bold text-[#CBD5E1]">{cmp.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {cmp.rows.map((r) => (
                  <tr key={r.label} className="border-t border-[#F1F5F9] transition-colors hover:bg-[#FFFBEB]/50">
                    <th scope="row" className="px-6 py-3.5 text-left text-[14px] font-medium leading-snug text-[#334155]">{r.label}</th>
                    <td className="bg-[#FFFBEB]/60 px-5 py-3.5">
                      <span className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A]"><Check size={11} strokeWidth={3} /></span>
                        <span className="text-[13.5px] font-semibold text-[#0F172A]">{r.ours}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                          {r.win ? <X size={11} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />}
                        </span>
                        <span className="text-[13.5px] text-[#64748B]">{r.theirs}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[12px] text-[#94A3B8]">
            {cmp.competitor} prices checked on {cmp.pricedOn} from {cmp.priceSource}. Their plans can change — please check their site before deciding.
          </p>
        </section>

        {/* ── Which one is right ── */}
        <section className="pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">Which one is right for you?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#FFFBEB] to-white p-6 ring-2 ring-[#F7B31C]/50">
              <div aria-hidden="true" className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#F7B31C]/25 blur-2xl" />
              <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-[#F7B31C]">
                <Star size={11} className="fill-[#F7B31C]" /> Choose DigitalCarda if
              </span>
              <p className="relative mt-4 text-[14.5px] leading-relaxed text-[#475569]">{cmp.usDescription}</p>
              <Link to={SIGNUP} className="relative mt-5 inline-flex h-11 items-center gap-2 rounded-xl gradient-gold px-5 text-[14px] font-bold text-[#0F172A] transition-all hover:shadow-gold active:scale-[0.97]">
                Start free trial <ArrowRight size={15} />
              </Link>
            </div>
            <div className="rounded-[24px] bg-white p-6 ring-1 ring-[#E2E8F0]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-[#64748B]">
                Choose {cmp.competitor} if
              </span>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#475569]">{cmp.themDescription}</p>
            </div>
          </div>
        </section>

        {/* ── Moving across ── */}
        <section className="pt-16">
          <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[2.3rem]">
            Moving from {cmp.competitor} <span className="text-gradient-gold">takes minutes</span>
          </h2>
          <ol className="relative mt-6 grid gap-3 md:grid-cols-3 md:gap-6">
            <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-[#E2E8F0] md:block" />
            {MOVE_STEPS.map((s, i) => (
              <li key={s.t} className="relative flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-[#E2E8F0] md:flex-col md:items-center md:bg-transparent md:p-0 md:text-center md:ring-0">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-gold font-display text-[19px] font-extrabold text-[#0F172A] shadow-gold ring-4 ring-[#F8FAFC]">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-bold text-[#0F172A]">{s.t}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#64748B]">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── CTA ── */}
        <section className="pt-16">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 text-center sm:p-14">
            <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#F7B31C]/20 blur-3xl animate-aurora-drift" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-3 py-1 text-[12px] font-bold text-[#4ADE80] ring-1 ring-[#22C55E]/30">
                <ShieldCheck size={13} /> 7-day money-back on your first plan
              </span>
              <h2 className="mt-4 font-display text-[1.9rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[2.5rem]">
                Try DigitalCarda free for <span className="text-gradient-gold">30 days</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[14.5px] text-[#94A3B8]">
                No payment details needed. Build your card and share it today.
              </p>
              <Link to={SIGNUP} className="dc-btn-shine group relative mt-7 inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl gradient-gold px-8 text-[15px] font-extrabold text-[#0F172A] shadow-gold transition-all hover:-translate-y-0.5 active:scale-[0.97]">
                <span className="relative z-10">Start free trial</span>
                <ArrowRight size={17} className="relative z-10 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Other comparisons ── */}
        <section className="pt-14">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Other comparisons</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {COMPARISONS.filter((c) => c.slug !== cmp.slug).map((other) => (
              <Link key={other.slug} to={`/vs/${other.slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#E2E8F0] transition-all hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/50">
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Compare</span>
                  <span className="block text-[15px] font-bold text-[#0F172A]">vs {other.competitor}</span>
                </span>
                <ArrowRight size={16} className="text-[#B45309] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
            <Link to="/digital-business-card-guide"
              className="group flex items-center justify-between gap-3 rounded-2xl bg-[#0F172A] p-4 text-white transition-all hover:-translate-y-1 hover:shadow-premium-lg">
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-wide text-[#FCD34D]">Read</span>
                <span className="block text-[15px] font-bold">The complete guide</span>
              </span>
              <ArrowRight size={16} className="text-[#F7B31C] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
