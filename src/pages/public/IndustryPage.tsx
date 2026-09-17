/*
 * /industries/:slug — one profession's page (blueprint §4b).
 *
 * The server writes this page's <title>, description, canonical, Open Graph
 * tags and WebPage + BreadcrumbList + FAQPage structured data into the raw
 * HTML (api/lib/industry-meta.ts). The effect below only keeps the tab title
 * and tags right when a reader arrives by clicking inside the site. No JSON-LD
 * is rendered here.
 *
 * Everything on the page comes from one IndustryPage object in
 * src/data/industries, so the visible copy, the head and the structured data
 * always agree. The sample phone card is HTML/CSS (HeroCard), the storyboard
 * is CSS-only (ShareFlow), and every animation is transform/opacity with the
 * finished state as the base, so the server HTML, no-JS and reduced-motion all
 * read as the complete page.
 *
 * Nothing here reads window, document or the clock during render: the head
 * update, the checklist highlight and the observers live in effects and
 * handlers, and <Inner key={slug}> resets all state between industries.
 */
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, ChevronRight, IndianRupee, Info, MessageCircle, X } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import RichText from "@/components/blog/RichText";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import CtaPanel from "@/components/industries/CtaPanel";
import HeroCard from "@/components/industries/HeroCard";
import IndustryArt from "@/components/industries/IndustryArt";
import IndustryCard from "@/components/industries/IndustryCard";
import IndustryFaq from "@/components/industries/IndustryFaq";
import { FeatureIcon, IndustryIcon } from "@/components/industries/IndustryIcon";
import ShareEverywhere from "@/components/industries/ShareEverywhere";
import ShareFlow from "@/components/industries/ShareFlow";
import TemplateStrip from "@/components/industries/TemplateStrip";
import UseCaseTable from "@/components/industries/UseCaseTable";
import { INDUSTRY_CSS } from "@/components/industries/industryCss";
import { formatBlogDate, getBlogPost, type BlogPost } from "@/data/blog";
import {
  FEATURES, INDUSTRIES, INDUSTRIES_PATH, PRICE_LINE, SHARE_CHIPS, SIGNUP_HREF, TRIAL_LINE, UPGRADE_LINE,
  fillTokens, getIndustry, industryPath, relatedIndustries,
  type CardPart, type IndustryPage as Industry,
} from "@/data/industries";
import { CONTACT } from "@/lib/publicNav";

const SITE = "https://digitalcarda.in";
const OG_IMAGE = `${SITE}/og-default.jpg`;

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const SECTION = "py-14 sm:py-20";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2";

/** Inline style with CSS custom properties. */
const css = (o: Record<string, string | number | undefined>) => o as CSSProperties;

/** The site's WhatsApp number with a canned message, from CONTACT. */
const whatsappHref = (text: string) => `${CONTACT.whatsappHref.split("?")[0]}?text=${encodeURIComponent(text)}`;

/** Where each checklist item lives on the sample card (shown beside it on lg). */
const PART_LABEL: Record<CardPart, string> = {
  profile: "Profile", actions: "Buttons", about: "About", services: "Services",
  gallery: "Gallery", enquiry: "Enquiry form", qr: "QR code", socials: "Socials",
};

/* Same shape as BlogPost's setHead: the server already wrote these for a
   direct visit; this keeps them right after in-app navigation. It returns an
   undo that puts every tag back the way it was (PublicLayout only resets the
   title, description and og:title/description on the next route, so without
   this the hub, /pricing or the home page kept an industry page's og:url,
   og:image:alt and twitter:* after in-app navigation). The og:image:alt is
   the same string api/lib/industry-meta.ts writes. */
function setHead(ind: Industry): () => void {
  const url = `${SITE}${industryPath(ind.slug)}`;
  const undo: (() => void)[] = [];
  const prevTitle = document.title;
  document.title = ind.seoTitle;
  undo.push(() => { document.title = prevTitle; });
  const set = (el: Element | null, make: () => Element, attr: string, value: string) => {
    if (el) {
      const was = el.getAttribute(attr);
      const kept = el;
      undo.push(() => { if (was === null) kept.removeAttribute(attr); else kept.setAttribute(attr, was); });
    } else {
      el = make();
      document.head.appendChild(el);
      const made = el;
      undo.push(() => made.remove());
    }
    el.setAttribute(attr, value);
  };
  const meta = (attr: "name" | "property", key: string, content: string) =>
    set(document.querySelector(`meta[${attr}="${key}"]`), () => { const m = document.createElement("meta"); m.setAttribute(attr, key); return m; }, "content", content);
  meta("name", "description", ind.description);
  meta("property", "og:title", ind.seoTitle);
  meta("property", "og:description", ind.description);
  meta("property", "og:type", "website");
  meta("property", "og:url", url);
  meta("property", "og:image", OG_IMAGE);
  meta("property", "og:image:alt", `${ind.name} digital visiting card: DigitalCarda`);
  meta("name", "twitter:image", OG_IMAGE);
  meta("name", "twitter:title", ind.seoTitle);
  meta("name", "twitter:description", ind.description);
  set(document.querySelector('link[rel="canonical"]'), () => { const l = document.createElement("link"); l.rel = "canonical"; return l; }, "href", url);
  return () => { for (let i = undo.length - 1; i >= 0; i--) undo[i](); };
}

/** True from lg up, but only after hydration: the server and the first
    client render both leave the annotated card out, so phones never parse or
    hydrate a card they cannot see. */
function useLgUp() {
  const [lg, setLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setLg(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);
  return lg;
}

/** "Digital Visiting Card for Doctors & Clinics" → ["Digital Visiting Card for ", "Doctors & Clinics"]. */
function splitH1(h1: string): [string, string] {
  const i = h1.indexOf(" for ");
  return i < 0 ? [h1, ""] : [h1.slice(0, i + 5), h1.slice(i + 5)];
}

/** The hand-drawn accent underline under the profession in the H1. */
function Underlined({ text, accent }: { text: string; accent: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-[1]">{text}</span>
      <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="dc-ind-underline pointer-events-none absolute inset-x-0 -bottom-[0.06em] h-[0.28em] w-full" fill="none" focusable="false">
        <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity=".55" />
      </svg>
    </span>
  );
}

/** Left-aligned section heading in the page's accent (the centred
    SectionHeading is used only where the blueprint asks for it). */
function Heading({ id, eyebrow, title, subtitle, accent, ink }: {
  id: string; eyebrow?: string; title: ReactNode; subtitle?: string; accent: string; ink: string;
}) {
  return (
    <Reveal className="max-w-3xl">
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em]" style={{ background: `${accent}1A`, color: ink }}>
          {eyebrow}
        </span>
      )}
      <h2 id={id} className="mt-4 scroll-mt-28 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-[#0F172A] [text-wrap:balance] sm:text-[2.25rem]">{title}</h2>
      {subtitle && <p className="mt-3 text-[15.5px] leading-relaxed text-[#64748B] sm:text-[16.5px]">{subtitle}</p>}
    </Reveal>
  );
}

/* Chip positions around the hero phone: inside the column on phones, at the
   column edges from lg. */
const CHIP_POS = [
  "left-2 top-[13%] lg:-left-4 lg:top-[16%]",
  "right-2 top-[45%] lg:-right-4",
  "left-2 bottom-[11%] lg:left-0 lg:bottom-[15%]",
];

export default function IndustryPage() {
  const { slug = "" } = useParams();
  const ind = getIndustry(slug);
  if (!ind) return <NotFound />;
  return <Inner key={ind.slug} ind={ind} />;
}

/* The server answers an unknown slug with 404 + noindex and no rendered
   markup, so this is only ever drawn in the browser; the title is set here
   because PublicLayout leaves unknown routes alone. */
function NotFound() {
  useEffect(() => { document.title = "Profession not found | DigitalCarda"; }, []);
  return (
    <div className="mx-auto max-w-xl px-4 pt-40 pb-24 text-center">
      <meta name="robots" content="noindex" />
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#92400E]">Industries</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-[#0F172A]">We couldn't find that profession</h1>
      <p className="mt-3 text-[#64748B]">It may have moved. Every profession page is listed on the industries page.</p>
      <Link to={INDUSTRIES_PATH} className={`mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F172A] px-5 font-bold text-white ${FOCUS}`}>
        <ArrowLeft size={16} aria-hidden="true" /> All industries
      </Link>
      {INDUSTRIES.length > 0 && (
        <ul className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Popular professions">
          {INDUSTRIES.slice(0, 6).map((i) => (
            <li key={i.slug}>
              <Link to={industryPath(i.slug)} className={`inline-flex min-h-[44px] items-center rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0] transition-colors hover:ring-[#F7B31C] ${FOCUS}`}>
                {i.crumb}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Inner({ ind }: { ind: Industry }) {
  const { accent, ink, icon, motif } = ind.theme;
  const [hl, setHl] = useState<CardPart | null>(null);
  const lgUp = useLgUp();

  useEffect(() => setHead(ind), [ind]);

  const [h1Before, h1After] = splitH1(ind.h1);
  const chips = SHARE_CHIPS[ind.shareFlow.kind];
  const posts = ind.relatedPosts.map(getBlogPost).filter((p): p is BlogPost => !!p);
  const related = relatedIndustries(ind);
  const wa = whatsappHref(ind.whatsappText);

  return (
    <div className="bg-[#F8FAFC]" style={css({ "--ind": accent, "--ind-ink": ink })}>
      <style>{INDUSTRY_CSS}</style>

      {/* ── 0 + 1. Breadcrumb and hero ─────────────────────────────────── */}
      <section className="relative overflow-x-clip pt-24 sm:pt-28 lg:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px]" style={{ background: `radial-gradient(60% 55% at 85% 18%, ${accent}2E, transparent 70%)` }} />
        <div className={`relative ${CONTAINER}`}>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-[#64748B]">
              <li><Link to="/" className="hover:text-[#0F172A]">Home</Link></li>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li><Link to={INDUSTRIES_PATH} className="hover:text-[#0F172A]">Industries</Link></li>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li aria-current="page" className="font-semibold text-[#334155]">{ind.crumb}</li>
            </ol>
          </nav>

          <div className="mt-8 grid items-center gap-10 pb-14 sm:pb-20 lg:grid-cols-12 lg:gap-8">
            {/* copy */}
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold" style={{ background: `${accent}1A`, color: ink }}>
                <IndustryIcon name={icon} size={15} className="shrink-0" />
                For {ind.audience}
              </span>
              <h1 className="mt-5 font-display text-[2.15rem] font-extrabold leading-[1.08] tracking-tight text-[#0F172A] [text-wrap:balance] sm:text-5xl lg:text-[3.35rem]">
                {h1Before}
                {h1After && <Underlined text={h1After} accent={accent} />}
              </h1>
              <p className="mt-5 max-w-[40rem] text-[16px] leading-relaxed text-[#475569] sm:text-[17px]"><RichText text={ind.answer} /></p>

              <div className="dc-enter dc-enter-1 mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to={SIGNUP_HREF} className={`btn-gold group inline-flex h-12 w-full items-center justify-center gap-2 px-6 sm:w-auto ${FOCUS}`}>
                  Start free for 30 days
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </Link>
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0] transition-all duration-200 hover:ring-[#CBD5E1] hover:shadow-premium active:scale-[0.98] motion-reduce:transition-none sm:w-auto ${FOCUS}`}
                >
                  <MessageCircle size={17} className="text-[#25D366] transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6" aria-hidden="true" />
                  Ask on WhatsApp
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[13px] text-[#64748B]">
                <Check size={14} className="mt-[3px] shrink-0" style={{ color: ink }} aria-hidden="true" />
                <span>{TRIAL_LINE} {UPGRADE_LINE}</span>
              </p>
              <p className="mt-4 text-[12.5px] text-[#64748B]">
                Updated <time dateTime={ind.updatedAt}>{formatBlogDate(ind.updatedAt)}</time> · By the{" "}
                <Link to="/about" rel="author" className="underline decoration-[#F7B31C] decoration-2 underline-offset-4 hover:text-[#0F172A]">DigitalCarda team</Link>
              </p>
            </div>

            {/* art: glow, motif, rings, the sample phone and three event chips */}
            <div className="relative lg:col-span-5">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(closest-side, ${accent}40, transparent 70%)` }} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ color: accent }}>
                <IndustryArt motif={motif} className="dc-ind-wipe h-auto w-full opacity-40" />
              </div>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`dc-ind-ring absolute h-[280px] w-[280px] rounded-full border-2 sm:h-[340px] sm:w-[340px] ${i === 2 ? "hidden sm:block" : ""}`}
                    style={css({ borderColor: `${accent}66`, "--i": i })}
                  />
                ))}
              </div>
              <div className="dc-ind-phone relative mx-auto w-[260px] py-8 sm:w-[290px] sm:py-10">
                <HeroCard ind={ind} mode="hero" />
              </div>
              {/* decorative: the card's own label already describes the sample */}
              {chips.map((label, i) => (
                <div key={label} aria-hidden="true" className={`dc-ind-chip pointer-events-none absolute z-[2] max-w-[150px] lg:max-w-none ${CHIP_POS[i]}`} style={css({ "--i": i })}>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold leading-snug text-[#0F172A] shadow-premium ring-1 ring-[#E2E8F0]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }} />
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Paper card → digital card ───────────────────────────────── */}
      <section aria-labelledby="pains" className={SECTION}>
        <div className={CONTAINER}>
          <SectionHeading eyebrow="Paper vs digital" title={<span id="pains">What changes for {ind.audience}</span>} />
          <Reveal stagger className="space-y-4 sm:space-y-5">
            {ind.pains.map((row, i) => {
              const f = FEATURES[row.feature];
              return (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E2E8F0]">
                    <p className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF1F2] text-[#E11D48]" aria-hidden="true"><X size={13} strokeWidth={3} /></span>
                      <span className="relative">
                        Paper card
                        <span aria-hidden="true" className="dc-ind-strike absolute left-0 top-1/2 h-[2px] w-full rounded-full bg-[#E11D48]/40" />
                      </span>
                    </p>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#64748B]">{row.pain}</p>
                  </div>
                  <div className="flex items-center justify-center text-[#94A3B8]" aria-hidden="true">
                    <span className="flex rotate-90 sm:rotate-0"><ArrowRight size={22} className="dc-ind-arrow" /></span>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: `${accent}0F`, boxShadow: `inset 0 0 0 1px ${accent}33` }}>
                    {/* the industry motif as a faint watermark behind the digital side */}
                    <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-4 w-[240px] opacity-[0.1]" style={{ color: ink }}>
                      <IndustryArt motif={motif} className="h-auto w-full" />
                    </div>
                    <p className="relative inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em]" style={{ color: ink }}>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                      Digital card
                    </p>
                    <p className="relative mt-3 text-[15px] leading-relaxed text-[#334155]"><RichText text={row.fix} /></p>
                    {/* 40px pill; the ::before pad brings the tap area to 44px */}
                    <Link
                      to={f.href}
                      className={`group relative mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold ring-1 ring-[#E2E8F0] transition-all duration-200 before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-[''] hover:ring-[color:var(--ind)] hover:shadow-sm motion-reduce:transition-none ${FOCUS}`}
                      style={{ color: ink }}
                    >
                      <FeatureIcon name={f.icon} size={14} className="transition-transform duration-300 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110" />
                      {f.label}
                    </Link>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* ── 3. Checklist with the annotated card ───────────────────────── */}
      <section aria-labelledby="checklist" className={`${SECTION} bg-white`}>
        <div className={CONTAINER}>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Heading
                id="checklist"
                eyebrow="Checklist"
                title={`What to put on a visiting card for ${ind.audience}`}
                subtitle="Each item names the part of the card it lives on."
                accent={accent}
                ink={ink}
              />
              <ol className="mt-8 space-y-3">
                {ind.checklist.map((c, i) => {
                  const on = hl === c.part;
                  return (
                    <li
                      key={i}
                      className={`group relative flex gap-4 rounded-2xl bg-[#F8FAFC] p-4 ring-1 transition-all duration-300 motion-reduce:transition-none sm:p-5 ${on ? "bg-white shadow-premium ring-[color:var(--ind)]" : "ring-[#E2E8F0] hover:bg-white hover:shadow-premium"}`}
                      onMouseEnter={() => setHl(c.part)}
                      onMouseLeave={() => setHl(null)}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold transition-transform duration-300 motion-safe:group-hover:scale-110 motion-reduce:transition-none" style={{ background: `${accent}1A`, color: ink }} aria-hidden="true">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          {/* The button's ::before covers the whole row (the li is
                              relative), so a tap anywhere on the item selects it;
                              the part chip fills at every size, which is the
                              visible result on phones, where the card is not shown. */}
                          <button
                            type="button"
                            className="rounded-md text-left text-[15.5px] font-semibold leading-snug text-[#0F172A] before:absolute before:inset-0 before:rounded-2xl before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                            onFocus={() => setHl(c.part)}
                            onBlur={() => setHl(null)}
                            onClick={() => setHl(c.part)}
                            aria-describedby={`checklist-part-${i}`}
                          >
                            {c.item}
                          </button>
                          <span
                            id={`checklist-part-${i}`}
                            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] transition-colors duration-300 ${on ? "text-white" : "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]"}`}
                            style={on ? { background: ink } : undefined}
                          >
                            {PART_LABEL[c.part]}
                          </span>
                        </div>
                        <p className="mt-1 text-[14.5px] leading-relaxed text-[#64748B]">{c.why}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {ind.conduct && (
                <div role="note" className="mt-6 flex gap-3.5 rounded-2xl bg-white p-5 ring-1 ring-[#E2E8F0]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}1A`, color: ink }} aria-hidden="true">
                    <Info size={18} />
                  </span>
                  <p className="text-[14.5px] leading-relaxed text-[#475569]">
                    <RichText text={ind.conduct.note} /> This is general information, not legal advice.
                  </p>
                </div>
              )}
            </div>

            {/* Mounted only from lg, after hydration (useLgUp): the section is
                below the fold, so nobody sees it arrive, and phones skip ~170
                hidden nodes. The full card is ~760px tall, so it is scaled down
                on shorter screens (transform only; the layout box keeps its height). */}
            {lgUp && (
              <aside className="hidden lg:col-span-5 lg:block" aria-label="Sample card with the current item highlighted">
                <div className="lg:sticky lg:top-24">
                  <div className="mx-auto w-[270px] origin-top scale-[.92] [@media(max-height:860px)]:scale-[.8] [@media(max-height:720px)]:scale-[.7]">
                    <HeroCard ind={ind} mode="annotate" highlight={hl} />
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Storyboard ──────────────────────────────────────────────── */}
      <section aria-labelledby="share-flow" className={SECTION}>
        <div className={CONTAINER}>
          <Heading
            id="share-flow"
            eyebrow="From hello to saved"
            title={fillTokens("How a {client} reaches you", ind)}
            subtitle="What happens after you share your card."
            accent={accent}
            ink={ink}
          />
          <div className="mt-10">
            <ShareFlow ind={ind} />
          </div>
        </div>
      </section>

      {/* ── 5. Use-case table ──────────────────────────────────────────── */}
      <section aria-labelledby="use-cases" className={`${SECTION} bg-white`}>
        <div className={CONTAINER}>
          <Heading id="use-cases" eyebrow="Features that matter" title={`What your card does for ${ind.audience}`} accent={accent} ink={ink} />
          <div className="mt-8">
            <UseCaseTable ind={ind} />
          </div>
        </div>
      </section>

      {/* ── 6. Designs ─────────────────────────────────────────────────── */}
      <section aria-labelledby="designs" className={SECTION}>
        <div className={CONTAINER}>
          <Heading
            id="designs"
            eyebrow="Designs"
            title={`Designs shown with sample details for ${ind.audience}`}
            subtitle="Every design works for any business. Open a live demo, then start free on the one you like."
            accent={accent}
            ink={ink}
          />
          <div className="mt-8">
            <TemplateStrip ind={ind} />
          </div>
        </div>
      </section>

      {/* ── 7. Share it everywhere ─────────────────────────────────────── */}
      <section aria-label="Share it everywhere" className="pb-14 sm:pb-20">
        <div className={CONTAINER}>
          <ShareEverywhere ind={ind} />
        </div>
      </section>

      {/* ── 8. Price strip ─────────────────────────────────────────────── */}
      <section aria-label="Pricing summary" className="pb-14 sm:pb-20">
        <div className={CONTAINER}>
          <Reveal>
            <div className="flex flex-col justify-between gap-5 rounded-3xl bg-white p-6 ring-1 ring-[#E2E8F0] shadow-premium sm:flex-row sm:items-center sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E]" aria-hidden="true">
                  <IndianRupee size={20} />
                </span>
                <p className="text-[15px] leading-relaxed text-[#475569]">
                  <strong className="font-bold text-[#0F172A]">{TRIAL_LINE}</strong> {PRICE_LINE} {UPGRADE_LINE}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Link to="/pricing" className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1E293B] ${FOCUS}`}>
                  See pricing <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link to={SIGNUP_HREF} className={`btn-gold inline-flex h-11 items-center justify-center px-5 text-[14px] ${FOCUS}`}>
                  Start free
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 9. FAQ ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="faq" className={`${SECTION} bg-white`}>
        <div className={CONTAINER}>
          <Heading id="faq" eyebrow="FAQ" title={`Questions ${ind.audience} ask`} accent={accent} ink={ink} />
          <div className="mt-8">
            <IndustryFaq faqs={ind.faqs} />
          </div>
        </div>
      </section>

      {/* ── 10. Guides and related professions ─────────────────────────── */}
      {posts.length > 0 && (
        <section aria-labelledby="guides" className={SECTION}>
          <div className={CONTAINER}>
            <div className="flex items-end justify-between gap-4">
              <Heading id="guides" eyebrow="Read next" title={`Guides for ${ind.audience}`} accent={accent} ink={ink} />
              <Link to="/blog" className={`hidden shrink-0 items-center gap-1.5 text-[14px] font-bold text-[#0F172A] hover:text-[#B45309] sm:inline-flex ${FOCUS}`}>
                All guides <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <Reveal stagger className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => <PostCard key={p.slug} post={p} headingLevel="h3" />)}
            </Reveal>
          </div>
        </section>
      )}

      <section aria-labelledby="related" className={posts.length ? "pb-14 sm:pb-20" : SECTION}>
        <div className={CONTAINER}>
          <div className="flex items-end justify-between gap-4">
            <Heading id="related" eyebrow="More professions" title="Related professions" accent={accent} ink={ink} />
            <Link to={INDUSTRIES_PATH} className={`hidden shrink-0 items-center gap-1.5 text-[14px] font-bold text-[#0F172A] hover:text-[#B45309] sm:inline-flex ${FOCUS}`}>
              All industries <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {related.length > 0 && (
            <Reveal stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <IndustryCard key={r.slug} ind={r} variant="related" />)}
            </Reveal>
          )}
          <Link to={INDUSTRIES_PATH} className={`mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-[14.5px] font-bold text-[#0F172A] hover:text-[#B45309] sm:hidden ${FOCUS}`}>
            All industries <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── 11. Closing CTA ────────────────────────────────────────────── */}
      <section aria-label="Start your card" className="pb-16 sm:pb-24">
        <div className={CONTAINER}>
          <CtaPanel
            title="Your digital visiting card, live today"
            text={TRIAL_LINE}
            accent={accent}
            whatsappText={ind.whatsappText}
            bulkFit={ind.bulkFit}
          />
        </div>
      </section>
    </div>
  );
}
