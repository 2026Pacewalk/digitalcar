import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight, ArrowUp, CalendarDays, Check, ChevronDown, Clock, FileText, Link2, Mail, MessageCircle,
  Phone, Printer, ReceiptIndianRupee, Scale, ShieldCheck,
} from "lucide-react";
import { CONTACT } from "@/lib/publicNav";

/* Shared shell for the three legal pages (/privacy, /terms-of-service,
   /refund-policy): a navy hero with a policy switcher, "in short" highlights,
   a sticky table of contents with scroll-spy, numbered clause cards and
   links across to the other two policies.

   The clause wording itself lives in each page and is kept as published —
   this layout only changes how it is presented. */

export type LegalKey = "privacy" | "terms" | "refund";

export type LegalSection = { id: string; title: string; icon: LucideIcon; body: ReactNode };
export type LegalHighlight = { icon: LucideIcon; title: string; text: string };

export const POLICIES: Record<LegalKey, { label: string; short: string; href: string; icon: LucideIcon; blurb: string; tint: string }> = {
  privacy: { label: "Privacy Policy", short: "Privacy", href: "/privacy", icon: ShieldCheck, blurb: "What we collect, why, and the rights you have over your data.", tint: "#14B8A6" },
  terms: { label: "Terms & Conditions", short: "Terms", href: "/terms-of-service", icon: Scale, blurb: "The rules for using DigitalCarda, your account and your content.", tint: "#6366F1" },
  refund: { label: "Refund Policy", short: "Refunds", href: "/refund-policy", icon: ReceiptIndianRupee, blurb: "The free trial, the 7-day money-back window and how to ask.", tint: "#F7B31C" },
};

const ORDER: LegalKey[] = ["privacy", "terms", "refund"];

/** Inline link used inside clause text. */
export function LegalLink({ to, children }: { to: string; children: ReactNode }) {
  const cls = "font-semibold text-[#B45309] underline decoration-[#F7B31C]/50 underline-offset-2 hover:text-[#92400E] hover:decoration-[#B45309]";
  return /^(mailto:|tel:|https?:)/.test(to)
    ? <a href={to} className={cls} {...(to.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>
    : <Link to={to} className={cls}>{children}</Link>;
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] || "");
  useEffect(() => {
    const onScroll = () => {
      // The last section whose heading has passed ~35% of the viewport.
      const line = window.innerHeight * 0.35;
      let current = ids[0] || "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom, light the last one even if it's short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1] || current;
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [ids]);
  return active;
}

function useReadProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return p;
}

const jumpTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
};

export default function LegalLayout({ current, updated, readMinutes, intro, highlights, sections }: {
  current: LegalKey;
  updated: string;
  readMinutes: number;
  intro: string;
  highlights: LegalHighlight[];
  sections: LegalSection[];
}) {
  const policy = POLICIES[current];
  const ids = sections.map((s) => s.id);
  const active = useActiveSection(ids);
  const progress = useReadProgress();
  const [tocOpen, setTocOpen] = useState(false);
  const [copied, setCopied] = useState("");

  // Honour a #section link on first load (content renders after the router scrolls to top).
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id && ids.includes(id)) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try { await navigator.clipboard.writeText(url); setCopied(id); setTimeout(() => setCopied(""), 1800); } catch { /* clipboard blocked — the anchor still works */ }
    history.replaceState(null, "", `#${id}`);
  };

  const activeIndex = Math.max(0, ids.indexOf(active));
  const others = ORDER.filter((k) => k !== current);

  return (
    <div className="bg-[#F8FAFC]">
      {/* Reading progress */}
      <div aria-hidden="true" className="fixed top-0 inset-x-0 z-[60] h-[3px] print:hidden">
        <div className="h-full gradient-gold origin-left transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] pt-28 sm:pt-32 pb-28 sm:pb-32 print:bg-none print:pt-6 print:pb-6">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40 print:hidden" />
        <div aria-hidden="true" className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full blur-3xl opacity-25 print:hidden" style={{ background: policy.tint }} />
        <div aria-hidden="true" className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full blur-3xl bg-[#F7B31C]/10 print:hidden" />
        {/* Big watermark icon */}
        <policy.icon aria-hidden="true" strokeWidth={1} className="hidden md:block absolute right-[6%] top-1/2 -translate-y-1/2 w-72 h-72 text-white/[0.04] print:hidden" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="dc-enter text-[12.5px] text-[#94A3B8] print:hidden">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2 text-[#475569]">/</span>
            <span>Legal</span>
            <span className="mx-2 text-[#475569]">/</span>
            <span className="text-[#E2E8F0]" aria-current="page">{policy.short}</span>
          </nav>

          <div className="dc-enter dc-enter-1 mt-5 flex items-center gap-3">
            <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/10" style={{ background: `${policy.tint}26` }}>
              <policy.icon size={26} style={{ color: policy.tint }} aria-hidden="true" />
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#FCD34D]">Legal centre</span>
          </div>

          <h1 className="dc-enter dc-enter-1 font-display mt-4 text-[2.25rem] sm:text-5xl lg:text-[3.5rem] leading-[1.05] font-extrabold text-white tracking-tight print:text-[#0F172A]">
            {policy.label}
          </h1>
          <p className="dc-enter dc-enter-2 mt-4 max-w-2xl text-[15px] sm:text-[17px] leading-relaxed text-[#CBD5E1] print:text-[#475569]">{intro}</p>

          <div className="dc-enter dc-enter-2 mt-6 flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-[#E2E8F0]">
              <CalendarDays size={13} className="text-[#FCD34D]" aria-hidden="true" /> Last updated {updated}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-[#E2E8F0]">
              <Clock size={13} className="text-[#FCD34D]" aria-hidden="true" /> {readMinutes} min read
            </span>
            <button type="button" onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-[#E2E8F0] hover:bg-white/[0.14] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] print:hidden">
              <Printer size={13} className="text-[#FCD34D]" aria-hidden="true" /> Print / save PDF
            </button>
          </div>

          {/* Policy switcher — the three policies are one set */}
          <nav aria-label="Legal policies" className="dc-enter dc-enter-3 mt-8 print:hidden">
            <div className="inline-flex max-w-full overflow-x-auto scrollbar-none rounded-2xl bg-white/[0.06] border border-white/10 p-1 gap-1">
              {ORDER.map((k) => {
                const p = POLICIES[k];
                const on = k === current;
                return (
                  <Link key={k} to={p.href} aria-current={on ? "page" : undefined}
                    className={`shrink-0 inline-flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-[13px] sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${
                      on ? "bg-white text-[#0F172A] shadow-lg" : "text-[#CBD5E1] hover:text-white hover:bg-white/[0.08]"}`}>
                    <p.icon size={15} style={{ color: on ? p.tint : undefined }} aria-hidden="true" />
                    <span className="sm:hidden">{p.short}</span><span className="hidden sm:inline">{p.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </section>

      {/* ── In short ── */}
      <section aria-labelledby="in-short" className="relative -mt-16 sm:-mt-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 print:mt-4">
        <div className="rounded-[26px] bg-white border border-[#E2E8F0] shadow-premium-lg p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3">
            <h2 id="in-short" className="font-display text-[1.1rem] sm:text-xl font-extrabold text-[#0F172A] tracking-tight">In short</h2>
            <span className="text-[11.5px] text-[#94A3B8]">A plain-English summary — the full text below is what applies.</span>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {highlights.map((h) => (
              <li key={h.title} className="group relative rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] p-3.5 sm:p-4 transition-all lg:hover:-translate-y-0.5 lg:hover:bg-white lg:hover:shadow-premium">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${policy.tint}1F` }}>
                  <h.icon size={17} style={{ color: policy.tint === "#F7B31C" ? "#B45309" : policy.tint }} aria-hidden="true" />
                </span>
                <p className="mt-2.5 sm:mt-3 text-[13px] sm:text-[14px] font-bold text-[#0F172A] leading-snug">{h.title}</p>
                <p className="mt-1 text-[11.5px] sm:text-[12.5px] text-[#64748B] leading-snug">{h.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
        {/* Table of contents */}
        <aside className="contents lg:block print:hidden">
          {/* Phones & tablets: collapsible */}
          <div className="lg:hidden sticky top-[70px] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-[#F8FAFC]/90 backdrop-blur-md">
            <button type="button" onClick={() => setTocOpen((o) => !o)} aria-expanded={tocOpen} aria-controls="legal-toc-mobile"
              className="w-full h-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm px-4 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <span className="w-7 h-7 rounded-lg gradient-gold text-[#0F172A] text-[12px] font-extrabold flex items-center justify-center shrink-0">{activeIndex + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[#94A3B8]">On this page · {activeIndex + 1}/{sections.length}</span>
                <span className="block text-[13.5px] font-semibold text-[#0F172A] truncate">{sections[activeIndex]?.title}</span>
              </span>
              <ChevronDown size={18} className={`text-[#64748B] transition-transform ${tocOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {tocOpen && (
              <ol id="legal-toc-mobile" className="dc-rise mt-2 max-h-[55vh] overflow-y-auto rounded-2xl bg-white border border-[#E2E8F0] shadow-premium-lg p-2">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); setTocOpen(false); jumpTo(s.id); }}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] ${s.id === active ? "bg-[#FEF3C7] text-[#0F172A] font-semibold" : "text-[#475569]"}`}>
                      <span className="w-5 text-[12px] font-bold text-[#94A3B8] tabular-nums">{i + 1}</span>{s.title}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Desktop: sticky rail */}
          <nav aria-label="On this page" className="hidden lg:block sticky top-28">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">On this page</p>
            <ol className="mt-3 relative border-l border-[#E2E8F0]">
              <span aria-hidden="true" className="absolute -left-px w-[2px] rounded-full gradient-gold transition-all duration-300"
                style={{ top: `${(activeIndex / sections.length) * 100}%`, height: `${100 / sections.length}%` }} />
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); jumpTo(s.id); }} aria-current={s.id === active ? "location" : undefined}
                    className={`flex gap-2.5 py-[7px] pl-4 text-[13px] leading-snug transition-colors rounded-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${
                      s.id === active ? "text-[#0F172A] font-semibold" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                    <span className={`tabular-nums text-[12px] ${s.id === active ? "text-[#B45309]" : "text-[#CBD5E1]"}`}>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-2xl bg-[#0F172A] p-4 text-white relative overflow-hidden">
              <div aria-hidden="true" className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl bg-[#F7B31C]/25" />
              <p className="relative text-[13px] font-semibold">Questions about this?</p>
              <p className="relative mt-1 text-[12px] text-[#94A3B8] leading-snug">A real person replies, usually the same working day.</p>
              <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer"
                className="relative mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#22C55E] text-white text-[12.5px] font-semibold hover:bg-[#16A34A] transition-colors">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp us
              </a>
            </div>
          </nav>
        </aside>

        {/* Clauses */}
        <main className="mt-4 lg:mt-0 space-y-4 sm:space-y-5 min-w-0">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}
              className={`group scroll-mt-36 lg:scroll-mt-28 relative rounded-[22px] bg-white border p-5 sm:p-7 transition-all duration-300 print:shadow-none print:break-inside-avoid ${
                s.id === active ? "border-[#F7B31C]/50 shadow-premium" : "border-[#E2E8F0]"}`}>
              <div className="flex items-center gap-3.5 sm:gap-4">
                <span className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-center shrink-0">
                  <s.icon size={20} className="text-[#0F172A]" aria-hidden="true" />
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full gradient-gold text-[#0F172A] text-[10.5px] font-extrabold flex items-center justify-center tabular-nums">{i + 1}</span>
                </span>
                <h2 id={`${s.id}-h`} className="min-w-0 flex-1 font-display text-[1.08rem] sm:text-[1.25rem] font-extrabold text-[#0F172A] tracking-tight leading-snug">{s.title}</h2>
                <button type="button" onClick={() => copyLink(s.id)} aria-label={`Copy link to “${s.title}”`}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] print:hidden">
                  {copied === s.id ? <Check size={15} className="text-[#16A34A]" aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                </button>
              </div>
              <div className="legal-prose mt-4 sm:pl-16 text-[14.5px] sm:text-[15px] text-[#475569] leading-[1.75]">{s.body}</div>
            </section>
          ))}

          <div className="flex items-center justify-between gap-3 pt-2 print:hidden">
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[#94A3B8]"><FileText size={13} aria-hidden="true" /> {policy.label} · updated {updated}</p>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12.5px] font-semibold text-[#475569] hover:bg-white hover:text-[#0F172A] border border-transparent hover:border-[#E2E8F0] transition-all">
              <ArrowUp size={14} aria-hidden="true" /> Back to top
            </button>
          </div>
        </main>
      </div>

      {/* ── Related policies + contact ── */}
      <section aria-labelledby="related-policies" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 print:hidden">
        <h2 id="related-policies" className="font-display text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">Read the rest of the set</h2>
        <p className="mt-1 text-sm text-[#64748B]">Our three policies work together — each one refers to the others.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {others.map((k) => {
            const p = POLICIES[k];
            return (
              <Link key={k} to={p.href}
                className="group relative overflow-hidden rounded-[22px] bg-white border border-[#E2E8F0] p-5 sm:p-6 transition-all hover:-translate-y-1 hover:shadow-premium-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <div aria-hidden="true" className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity" style={{ background: p.tint }} />
                <span className="relative w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${p.tint}1F` }}>
                  <p.icon size={20} style={{ color: p.tint === "#F7B31C" ? "#B45309" : p.tint }} aria-hidden="true" />
                </span>
                <p className="relative mt-4 text-[16px] font-bold text-[#0F172A]">{p.label}</p>
                <p className="relative mt-1 text-[13px] text-[#64748B] leading-snug">{p.blurb}</p>
                <span className="relative mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#B45309]">
                  Read policy <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            );
          })}

          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-5 sm:p-6 text-white">
            <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
            <div aria-hidden="true" className="absolute -bottom-14 -right-10 w-40 h-40 rounded-full blur-3xl bg-[#F7B31C]/25" />
            <p className="relative text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FCD34D]">Talk to us</p>
            <p className="relative mt-2 text-[16px] font-bold">Still have a question?</p>
            <ul className="relative mt-4 space-y-2.5 text-[13px]">
              <li><a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 text-[#E2E8F0] hover:text-white"><Mail size={14} className="text-[#FCD34D]" aria-hidden="true" /> {CONTACT.email}</a></li>
              <li><a href={CONTACT.phoneHref} className="inline-flex items-center gap-2 text-[#E2E8F0] hover:text-white"><Phone size={14} className="text-[#FCD34D]" aria-hidden="true" /> {CONTACT.phone}</a></li>
              <li><a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#E2E8F0] hover:text-white"><MessageCircle size={14} className="text-[#22C55E]" aria-hidden="true" /> WhatsApp chat</a></li>
            </ul>
            <Link to="/contact" className="relative mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#FCD34D] hover:text-white">
              Contact page <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
