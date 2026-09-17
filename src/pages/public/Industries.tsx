/*
 * /industries — the directory of profession pages (blueprint §4c).
 *
 * Every profession card is a real <Link> in the server HTML, so crawlers see
 * and follow all of them; the search box and the group chips only set the
 * `hidden` attribute in the browser (a chip click also remounts the directory
 * for its swap-in; typing never does). The group filter lives in the URL
 * (?group=health) through useSearchParams, which StaticRouter also has, so the
 * server and the browser render the same cards hidden. The search text starts
 * empty on both sides.
 *
 * Title, description, canonical, CollectionPage + FAQPage structured data and
 * the breadcrumb trail all come from the server (api/lib/industry-meta.ts and
 * src/lib/publicSeo.ts); nothing here writes JSON-LD.
 *
 * Motion: the three persona phones fan and sway on desktop (they are inside a
 * display:none box below lg, so phones never download them); two marquee rows
 * of profession pills stand in on phones. Everything is transform/opacity with
 * the finished state as the base, and INDUSTRY_CSS turns it all off under
 * prefers-reduced-motion.
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowRight, LayoutTemplate, MessageCircle, Palette, PencilLine, Search, Share2, WandSparkles, X } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";
import CtaPanel from "@/components/industries/CtaPanel";
import IndustryCard from "@/components/industries/IndustryCard";
import IndustryFaq from "@/components/industries/IndustryFaq";
import { IndustryIcon } from "@/components/industries/IndustryIcon";
import TemplateStrip from "@/components/industries/TemplateStrip";
import { INDUSTRY_CSS } from "@/components/industries/industryCss";
import {
  INDUSTRIES, INDUSTRY_GROUPS, INDUSTRY_HUB_FAQS, PERSONA_IMAGE_DIR, SIGNUP_HREF, TRIAL_LINE, industriesInGroup,
  type IndustryGroupId, type IndustryPage, type PersonaImg,
} from "@/data/industries";
import { CONTACT } from "@/lib/publicNav";

const GOLD = "#F7B31C";
const GOLD_INK = "#B45309";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2";

/** The H1 the server also writes (api/lib/industry-meta.ts INDUSTRY_HUB_H1). */
const H1_BEFORE = "Digital visiting cards for ";
const H1_UNDERLINED = "every profession";
const ANSWER = "A digital visiting card is one link that opens your contact details, services and buttons to call, WhatsApp or save your number. Pick your profession below to see what to put on the card, which features matter most for your work and sample designs you can start free for 30 days.";
const HUB_WHATSAPP = "Hi DigitalCarda, I want a digital visiting card for my business";

const css = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const whatsappHref = (text: string) => `${CONTACT.whatsappHref.split("?")[0]}?text=${encodeURIComponent(text)}`;

/* The vertical connector of the three steps on phones. The shared
   INDUSTRY_CSS only has the horizontal (scaleX) grow, so this is the one
   hub-only rule; it follows the same pattern and the same reduced-motion stop. */
const HUB_CSS = `
@keyframes dc-ind-grow-y{from{transform:scaleY(0)}}
.is-visible .dc-ind-line-v{transform-origin:top;animation:dc-ind-grow-y 1s cubic-bezier(.16,1,.3,1) .2s backwards}
@media (prefers-reduced-motion:reduce){.dc-ind-line-v{animation:none!important}}
`;

/* Three sample cards for the desktop fan. Fictional personas, described
   without names (the hub card alt text already names them where a page has
   a mockup). */
const FAN: { img: PersonaImg; alt: string; r: string }[] = [
  { img: "digital-business-card-doctors-clinics", alt: "A sample digital visiting card for a clinic on a smartphone", r: "-9deg" },
  { img: "digital-business-card-real-estate", alt: "A sample digital visiting card for a property dealer on a smartphone", r: "0deg" },
  { img: "digital-business-card-salons-spas", alt: "A sample digital visiting card for a salon on a smartphone", r: "9deg" },
];

const STEPS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: LayoutTemplate, title: "Pick a design", text: "Every design works for any business. Open a live demo on your phone before you choose." },
  { Icon: PencilLine, title: "Add your details", text: "Your name, services, photos and the buttons people tap: call, WhatsApp, directions and save contact." },
  { Icon: Share2, title: "Share by link, QR or NFC", text: "Send the link on WhatsApp, print the QR for your counter, or hand over an NFC card." },
];

const OTHER: { Icon: LucideIcon; title: string; text: string; href: string; external?: boolean }[] = [
  { Icon: Palette, title: "Use any design", text: "The gallery shows every design with a live demo. None of them is tied to a profession.", href: "/digital-business-cards-templates" },
  { Icon: WandSparkles, title: "Let AI write a first draft", text: "Describe your business and get a draft of your card text to edit.", href: "/ai-card-generator" },
  { Icon: MessageCircle, title: "Ask us on WhatsApp", text: "Tell us what you do and we will show you a card that fits.", href: whatsappHref(HUB_WHATSAPP), external: true },
];

const GROUP_IDS = new Set<string>(INDUSTRY_GROUPS.map((g) => g.id));
const isGroupId = (s: string | null): s is IndustryGroupId => !!s && GROUP_IDS.has(s);

/** Name, crumb, audience and the page's own search words, lowercased. */
function matches(ind: IndustryPage, q: string): boolean {
  if (!q) return true;
  return [ind.name, ind.crumb, ind.audience, ...ind.searchTerms].some((t) => t.toLowerCase().includes(q));
}

/** Enough pills for a seamless loop, even while the directory is short. */
function padTo(list: IndustryPage[], min: number): IndustryPage[] {
  if (list.length === 0) return list;
  const out: IndustryPage[] = [];
  while (out.length < min) out.push(...list);
  return out;
}

function Underlined({ text }: { text: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-[1]">{text}</span>
      <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="dc-ind-underline pointer-events-none absolute inset-x-0 -bottom-[0.06em] h-[0.28em] w-full" fill="none" focusable="false">
        <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity=".7" />
      </svg>
    </span>
  );
}

function Heading({ id, eyebrow, title, subtitle, center }: { id: string; eyebrow?: string; title: ReactNode; subtitle?: string; center?: boolean }) {
  return (
    <Reveal className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#92400E]">{eyebrow}</span>}
      <h2 id={id} className="mt-4 scroll-mt-28 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-[#0F172A] [text-wrap:balance] sm:text-[2.25rem]">{title}</h2>
      {subtitle && <p className="mt-3 text-[15.5px] leading-relaxed text-[#64748B] sm:text-[16.5px]">{subtitle}</p>}
    </Reveal>
  );
}

/** A profession pill for the mobile marquee: decoration, not a link. */
function Pill({ ind }: { ind: IndustryPage }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-[#334155] shadow-premium ring-1 ring-[#E2E8F0]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${ind.theme.accent}1A`, color: ind.theme.ink }}>
        <IndustryIcon name={ind.theme.icon} size={14} />
      </span>
      {ind.crumb}
    </span>
  );
}

function MarqueeRow({ items, reverse }: { items: IndustryPage[]; reverse?: boolean }) {
  const half = padTo(items, 8);
  const track = [...half, ...half];
  return (
    <div className="overflow-hidden py-1">
      <div className={`dc-ind-marquee gap-2 ${reverse ? "dc-ind-marquee--rev" : ""}`}>
        {track.map((ind, i) => <Pill key={`${ind.slug}-${i}`} ind={ind} />)}
      </div>
    </div>
  );
}

export default function Industries() {
  const [params, setParams] = useSearchParams();
  const groupParam = params.get("group");
  const group: IndustryGroupId | "all" = isGroupId(groupParam) ? groupParam : "all";
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const visibleIn = (id: IndustryGroupId) => industriesInGroup(id).filter((i) => matches(i, q));
  const shown = INDUSTRY_GROUPS.reduce((n, g) => n + ((group === "all" || group === g.id) ? visibleIn(g.id).length : 0), 0);
  const total = INDUSTRIES.length;

  const pickGroup = (id: IndustryGroupId | "all") =>
    setParams(id === "all" ? {} : { group: id }, { replace: true, preventScrollReset: true });

  const marqueeA = INDUSTRIES.filter((_, i) => i % 2 === 0);
  const marqueeB = INDUSTRIES.filter((_, i) => i % 2 === 1);

  return (
    <div className="bg-[#F8FAFC]" style={css({ "--ind": GOLD, "--ind-ink": GOLD_INK })}>
      <style>{INDUSTRY_CSS + HUB_CSS}</style>

      {/* ── 1. Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-x-clip pt-24 sm:pt-28 lg:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_55%_at_85%_15%,rgba(247,179,28,0.22),transparent_70%),radial-gradient(40%_40%_at_0%_80%,rgba(15,23,42,0.05),transparent_60%)]" />
        <div className={`relative ${CONTAINER}`}>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#92400E]">By profession</span>
              <h1 className="mt-5 font-display text-[2.15rem] font-extrabold leading-[1.08] tracking-tight text-[#0F172A] [text-wrap:balance] sm:text-5xl lg:text-[3.35rem]">
                {H1_BEFORE}<Underlined text={H1_UNDERLINED} />
              </h1>
              <p className="mt-5 max-w-[40rem] text-[16px] leading-relaxed text-[#475569] sm:text-[17px]">{ANSWER}</p>
              <div className="dc-enter dc-enter-1 mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to={SIGNUP_HREF} className={`btn-gold group inline-flex h-12 w-full items-center justify-center gap-2 px-6 sm:w-auto ${FOCUS}`}>
                  Start free for 30 days
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </Link>
                <a href="#directory" className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0] transition-all duration-200 hover:ring-[#CBD5E1] hover:shadow-premium active:scale-[0.98] motion-reduce:transition-none sm:w-auto ${FOCUS}`}>
                  Find your profession
                  <ArrowDown size={16} className="transition-transform duration-300 motion-safe:group-hover:translate-y-0.5" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-3 text-[13px] text-[#64748B]">{TRIAL_LINE} {total} profession pages, every design works for any business.</p>
            </div>

            {/* desktop art: three sample cards fanned out over two rings */}
            <div className="hidden lg:col-span-5 lg:block">
              <div className="relative mx-auto h-[420px] w-full max-w-[440px]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                  {[0, 1].map((i) => (
                    <span key={i} className="dc-ind-ring absolute h-[360px] w-[360px] rounded-full border-2 border-[#F7B31C]/50" style={css({ "--i": i })} />
                  ))}
                  <span className="absolute h-[300px] w-[300px] rounded-full bg-[radial-gradient(closest-side,rgba(247,179,28,0.28),transparent_72%)]" />
                </div>
                {FAN.map((f, i) => (
                  <div
                    key={f.img}
                    className={`absolute w-[190px] ${i === 0 ? "left-0 top-9" : i === 1 ? "left-[calc(50%-95px)] top-0 z-[1]" : "right-0 top-9"}`}
                  >
                    <div className="dc-ind-fan" style={css({ "--r": f.r, "--i": i })}>
                      <picture className="block drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)]">
                        <source type="image/webp" srcSet={`${PERSONA_IMAGE_DIR}/${f.img}.webp`} />
                        <img src={`${PERSONA_IMAGE_DIR}/${f.img}.png`} width={640} height={960} loading="lazy" decoding="async" alt={f.alt} className="block h-auto w-full rounded-[22px]" />
                      </picture>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[12px] text-[#475569]">Sample cards · fictional details</p>
            </div>
          </div>
        </div>

        {/* mobile art: two marquee rows of profession pills */}
        {INDUSTRIES.length > 0 && (
          <div className="mt-10 space-y-2 lg:hidden" aria-hidden="true">
            <MarqueeRow items={marqueeA} />
            <MarqueeRow items={marqueeB.length ? marqueeB : marqueeA} reverse />
          </div>
        )}
      </section>

      {/* ── 2 + 3. Filter bar and the directory ───────────────────────── */}
      <section aria-label="All professions" className="pt-10 sm:pt-14">
        <div className={CONTAINER}>
          {/* Below lg only the chips row (with the count) is sticky, about 60px
              under the 64px header; the search box scrolls away like normal
              content. From lg, search, chips and count are one sticky row. The
              outer div is display:contents below lg, so the chips row sticks
              against the whole directory instead of against a short bar. */}
          <div className="contents lg:sticky lg:top-[76px] lg:z-20 lg:-mx-8 lg:flex lg:items-center lg:gap-4 lg:border-b lg:border-[#E2E8F0] lg:bg-[#F8FAFC]/95 lg:px-8 lg:py-2">
            <label id="directory" className="relative block w-full scroll-mt-20 lg:max-w-xs lg:scroll-mt-24">
              <span className="sr-only">Search professions</span>
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: dentist, property, salon…"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-11 pr-12 text-[15px] text-[#0F172A] outline-none transition focus:border-[#F7B31C] focus:ring-4 focus:ring-[#F7B31C]/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className={`absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] ${FOCUS}`}>
                  <X size={15} />
                </button>
              )}
            </label>
            <div className="sticky top-[64px] z-20 -mx-4 mt-3 flex items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC]/95 px-4 py-1 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-0 lg:min-w-0 lg:flex-1 lg:gap-4 lg:border-0 lg:bg-transparent lg:p-0">
              <div role="group" aria-label="Filter by group" className="no-scrollbar -ml-4 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pl-4 pr-1 sm:-ml-6 sm:pl-6 lg:ml-0 lg:pl-0 lg:pr-0">
                {[{ id: "all" as const, label: "All", count: total }, ...INDUSTRY_GROUPS.map((g) => ({ id: g.id, label: g.label, count: industriesInGroup(g.id).length }))].map((c) => {
                  const on = group === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pickGroup(c.id)}
                      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-all duration-200 motion-reduce:transition-none ${FOCUS} ${on ? "bg-[#0F172A] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.6)]" : "bg-white text-[#334155] ring-1 ring-[#E2E8F0] hover:ring-[#F7B31C]"}`}
                    >
                      {c.label}
                      <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-white/15 text-[#FCD34D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{c.count}</span>
                    </button>
                  );
                })}
              </div>
              <p aria-live="polite" className="shrink-0 whitespace-nowrap text-[12.5px] tabular-nums text-[#64748B]">
                <span className="sr-only sm:not-sr-only">Showing </span>{shown} of {total}
              </p>
            </div>
          </div>

          {/* Keyed on the group only: a chip click swaps the directory in, while
              typing just flips `hidden` on the cards (a remount per keystroke
              replayed every card's scroll-reveal). */}
          <div key={group} className="dc-swap-in">
            {INDUSTRY_GROUPS.map((g) => {
              const all = industriesInGroup(g.id);
              const visible = visibleIn(g.id);
              const hiddenSection = (group !== "all" && group !== g.id) || visible.length === 0;
              return (
                <section key={g.id} id={g.id} aria-labelledby={`group-${g.id}`} hidden={hiddenSection} className="pt-10 sm:pt-12">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 id={`group-${g.id}`} className="font-display text-[1.4rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[1.7rem]">{g.label}</h2>
                      <p className="mt-1 text-[14.5px] text-[#64748B]">{g.blurb}</p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#64748B]">{visible.length} of {all.length}</span>
                  </div>
                  {/* Card wrappers carry no display utility: Tailwind's .flex would outrank [hidden]. */}
                  <Reveal stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {all.map((i) => (
                      <div key={i.slug} hidden={!matches(i, q)}>
                        <IndustryCard ind={i} variant="hub" />
                      </div>
                    ))}
                  </Reveal>
                </section>
              );
            })}

            {shown === 0 && (
              <div className="dc-swap-in mt-10 rounded-3xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
                <p className="font-display text-lg font-bold text-[#0F172A]">No match. Every design works for any business.</p>
                <p className="mt-2 text-[14.5px] text-[#64748B]">Try another word, or start from a design, a draft or a chat.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Link to="/digital-business-cards-templates" className={`inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#0F172A] px-5 text-[14px] font-semibold text-white hover:bg-[#1E293B] ${FOCUS}`}>Browse designs <ArrowRight size={15} aria-hidden="true" /></Link>
                  <Link to="/ai-card-generator" className={`inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-5 text-[14px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0] hover:ring-[#F7B31C] ${FOCUS}`}><WandSparkles size={15} aria-hidden="true" /> AI card generator</Link>
                  <a href={whatsappHref(HUB_WHATSAPP)} target="_blank" rel="noreferrer" className={`inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-5 text-[14px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0] hover:ring-[#F7B31C] ${FOCUS}`}><MessageCircle size={15} className="text-[#25D366]" aria-hidden="true" /> Ask on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a>
                </div>
                <button type="button" onClick={() => { setQuery(""); pickGroup("all"); }} className="mt-5 text-[14px] font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">Show every profession</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Three steps ────────────────────────────────────────────── */}
      <section aria-labelledby="steps" className="py-16 sm:py-24">
        <div className={CONTAINER}>
          <Heading id="steps" eyebrow="How it works" title="Three steps to your card" center />
          <Reveal className="relative mt-10">
            {/* connectors: vertical on phones, horizontal from sm; both grow in once the block is visible */}
            <div aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px sm:hidden"><span className="dc-ind-line-v block h-full w-full bg-[#CBD5E1]" /></div>
            <div aria-hidden="true" className="absolute inset-x-[16.66%] top-6 hidden h-px sm:block"><span className="dc-ind-line block h-full w-full bg-[#CBD5E1]" /></div>
            <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-4 sm:flex-col sm:items-center sm:text-center">
                  <span className="relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0F172A] shadow-premium ring-1 ring-[#E2E8F0]">
                    <s.Icon size={20} aria-hidden="true" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F7B31C] text-[10.5px] font-extrabold text-[#0F172A]">{i + 1}</span>
                  </span>
                  <div className="pt-1 sm:pt-0">
                    <p className="font-display text-[16.5px] font-bold text-[#0F172A]">{s.title}</p>
                    <p className="mt-1.5 max-w-xs text-[14.5px] leading-relaxed text-[#64748B]">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── 5. Featured designs ───────────────────────────────────────── */}
      <section aria-labelledby="designs" className="bg-white py-14 sm:py-20">
        <div className={CONTAINER}>
          <Heading id="designs" eyebrow="Designs" title="Designs that work for any profession." subtitle="Featured designs from the gallery, shown with sample details. Open a live demo, then start free on the one you like." />
          <div className="mt-8">
            <TemplateStrip limit={6} />
          </div>
        </div>
      </section>

      {/* ── 6. Don't see your profession? ─────────────────────────────── */}
      <section aria-labelledby="other" className="py-14 sm:py-20">
        <div className={CONTAINER}>
          <Heading id="other" eyebrow="Any business" title="Don't see your profession?" subtitle="The card is the same for everyone: you choose the sections and write the details." />
          <Reveal stagger className="mt-8 grid gap-4 sm:grid-cols-3">
            {OTHER.map((o) => {
              const inner = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E] transition-transform duration-300 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110 motion-reduce:transition-none" aria-hidden="true">
                    <o.Icon size={20} />
                  </span>
                  <span className="mt-4 block font-display text-[16.5px] font-bold text-[#0F172A]">{o.title}</span>
                  <span className="mt-1.5 block text-[14.5px] leading-relaxed text-[#64748B]">{o.text}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#B45309]">
                    {o.external ? "Open WhatsApp" : "Open"} <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                  </span>
                </>
              );
              const cls = `group block rounded-3xl bg-white p-6 ring-1 ring-[#E2E8F0] transition-all duration-300 hover:shadow-premium-lg hover:ring-[#F7B31C] motion-safe:hover:-translate-y-1 motion-reduce:transition-none ${FOCUS}`;
              return o.external
                ? <a key={o.title} href={o.href} target="_blank" rel="noreferrer" className={cls}>{inner}<span className="sr-only"> (opens in a new tab)</span></a>
                : <Link key={o.title} to={o.href} className={cls}>{inner}</Link>;
            })}
          </Reveal>
          <p className="mt-6 text-[14.5px] text-[#64748B]">
            Cards for 10 or more staff?{" "}
            <Link to="/bulk-cards" className={`font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4 hover:text-[#B45309] ${FOCUS}`}>Bulk cards for teams</Link>
          </p>
        </div>
      </section>

      {/* ── 7. FAQ ────────────────────────────────────────────────────── */}
      <section aria-labelledby="faq" className="bg-white py-14 sm:py-20">
        <div className={CONTAINER}>
          <Heading id="faq" eyebrow="FAQ" title="Common questions" />
          <div className="mt-8">
            <IndustryFaq faqs={INDUSTRY_HUB_FAQS} />
          </div>
        </div>
      </section>

      {/* ── 8. Closing CTA ────────────────────────────────────────────── */}
      <section aria-label="Start your card" className="py-14 sm:py-20">
        <div className={CONTAINER}>
          <CtaPanel title="Your digital visiting card, live today" text={TRIAL_LINE} whatsappText={HUB_WHATSAPP} />
        </div>
      </section>
    </div>
  );
}
