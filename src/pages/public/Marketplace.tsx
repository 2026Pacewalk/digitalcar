import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, SlidersHorizontal, Sparkles, X, ArrowRight, Eye, Star } from "lucide-react";
import { trpc } from "@/providers/trpc";
import TemplateThumb from "@/components/TemplateThumb";
import { demoForProduct } from "@/lib/demoData";

type Product = {
  id: number; slug: string; name: string; tagline?: string | null; category?: string | null;
  styleNumber: number; price: string; salePrice?: string | null; trialDays: number;
  primaryColor?: string | null; secondaryColor?: string | null; isFeatured: boolean; displayOrder: number;
};

const inr = (v?: string | number | null) => "₹" + Number(v || 0).toLocaleString("en-IN");

/* The industry a card belongs to (from its assigned demo persona), so the
   filter reflects every industry shown — not just the few with a DB category. */
/* Shown first on this page, in this order, in every sort and filter they appear in. */
const PINNED_SLUGS = ["corporate-business-card", "professional-profile-card"];

const STYLES = [
  { id: "all", label: "All" },
  { id: "featured", label: "Featured" },
  { id: "basic", label: "Basic" },
  { id: "modern", label: "Modern" },
  { id: "bio", label: "Bio" },
  { id: "professional", label: "Professional" },
  { id: "premium", label: "Premium" },
] as const;
type StyleId = (typeof STYLES)[number]["id"];

const industryOf = (p: Product): string => String(demoForProduct(p).customer.nature || "Other");

// No price sorting — designs carry no individual price (plan covers them all).
const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "newest", label: "Newest" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

/* Quick-pick industries for the hero (labels match the persona `nature`). */
const QUICK = [
  { label: "Real Estate", emoji: "🏠" }, { label: "Healthcare", emoji: "⚕️" },
  { label: "Restaurant", emoji: "🍽️" }, { label: "Beauty & Salon", emoji: "💇" },
  { label: "Legal Services", emoji: "⚖️" }, { label: "Photography", emoji: "📸" },
  { label: "Fitness", emoji: "💪" }, { label: "IT & Digital", emoji: "💻" },
];

export default function Marketplace() {
  const { data: products = [], isLoading } = trpc.product.catalogue.useQuery();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<SortId>("popular");
  const [style, setStyle] = useState<StyleId>("all");

  // Design style (Basic / Modern / Bio / Professional / Premium) and "featured"
  // come from the template presets set in the admin — the same source as the
  // dashboard template picker. (The copies on product rows aren't always in
  // step.) A product maps to its preset by style number.
  const { data: presetData } = trpc.template.presets.useQuery();
  const presetByStyle = useMemo(() => {
    const m = new Map<number, { category?: string; featured?: boolean }>();
    for (const t of presetData?.list ?? []) if (!m.has(t.style)) m.set(t.style, t as { category?: string; featured?: boolean });
    return m;
  }, [presetData]);
  const styleOf = (p: Product): string => presetByStyle.get(p.styleNumber)?.category || "modern";
  const isFeat = (p: Product): boolean => presetByStyle.has(p.styleNumber) ? !!presetByStyle.get(p.styleNumber)?.featured : !!p.isFeatured;
  const inStyle = (p: Product, id: StyleId) => id === "all" ? true : id === "featured" ? isFeat(p) : styleOf(p) === id;
  const styleCount = (id: StyleId) => products.filter((p) => inStyle(p, id)).length;


  const shown = useMemo(() => {
    const term = q.toLowerCase().trim();
    let list = products.filter((p) => {
      const ind = industryOf(p);
      if (cat !== "all" && ind !== cat) return false;
      if (!inStyle(p, style)) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || ind.toLowerCase().includes(term) || (p.tagline || "").toLowerCase().includes(term);
    });
    const price = (p: Product) => Number(p.salePrice || p.price);
    list = [...list].sort((a, b) =>
      sort === "newest" ? b.id - a.id
      : sort === "price_low" ? price(a) - price(b)
      : sort === "price_high" ? price(b) - price(a)
      : (Number(isFeat(b)) - Number(isFeat(a))) || (a.displayOrder - b.displayOrder));
    // The flagship designs always lead, whatever the sort.
    const pinned = PINNED_SLUGS.flatMap((slug) => list.filter((p) => p.slug === slug));
    if (pinned.length) list = [...pinned, ...list.filter((p) => !pinned.includes(p))];
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, cat, sort, style, presetByStyle]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[440px] bg-gradient-to-b from-[#FFFCF3] to-transparent" />
          <div className="absolute -top-16 left-[22%] w-80 h-80 rounded-full bg-[#F7B31C]/25 blur-[90px]" />
          <div className="absolute top-2 right-[16%] w-72 h-72 rounded-full bg-[#14B8A6]/15 blur-[90px]" />
          <div className="absolute top-28 left-[10%] w-56 h-56 rounded-full bg-[#8B5CF6]/10 blur-[80px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#B45309] bg-white/70 ring-1 ring-[#F7B31C]/30 px-3.5 py-1.5 rounded-full shadow-sm backdrop-blur"><Sparkles size={13} className="text-[#F7B31C]" /> Digital Business Card Marketplace</span>
          <h1 className="mt-4 text-[32px] leading-[1.16] sm:text-4xl lg:text-[52px] font-extrabold text-[#0F172A] tracking-tight text-balance">
            Choose a card. Make it{" "}
            <span className="relative inline-block text-[#D97706]">yours
              <svg viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden className="absolute -bottom-1 left-0 w-full h-[9px] text-[#F7B31C]">
                <path d="M3 9 C 30 2, 90 2, 117 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>.{" "}
            <span className="relative inline-block">
              <span className="text-gradient-gold">Try it free.</span>
              <Sparkles size={20} className="absolute -top-2 -right-3 text-[#F7B31C] hidden sm:block animate-pulse" />
            </span>
          </h1>
          <p className="mt-3.5 text-[15px] sm:text-base text-[#64748B] max-w-xl mx-auto">40+ ready designs for every industry. Preview a live demo and launch in minutes — no app, no printing.</p>
          {/* Search + quick industries, merged into one box: the input on top and
              the industries as a single scrolling row underneath (they used to
              wrap into four rows of chips on phones). */}
          <div className="mt-6 max-w-xl mx-auto text-left bg-white border border-[#E2E8F0] rounded-2xl shadow-premium-lg focus-within:border-[#F7B31C] focus-within:ring-4 focus-within:ring-[#F7B31C]/10 transition-all overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3">
              <Search size={18} className="text-[#94A3B8] shrink-0" aria-hidden="true" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search real estate, doctor, luxury black, minimal…"
                aria-label="Search card designs"
                className="flex-1 min-w-0 bg-transparent outline-none text-[16px] sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              {q && <button onClick={() => setQ("")} aria-label="Clear search" className="text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>}
            </div>
            <div className="border-t border-[#F1F5F9] py-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none px-3 sm:px-4 [mask-image:linear-gradient(to_right,black_85%,transparent)]" role="group" aria-label="Filter by industry">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] pr-1">Popular:</span>
                {QUICK.map((qi) => (
                  <button key={qi.label} onClick={() => setCat(cat === qi.label ? "all" : qi.label)} aria-pressed={cat === qi.label}
                    className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-all active:scale-95 ${cat === qi.label ? "gradient-gold text-[#0F172A] shadow-gold" : "bg-[#F8FAFC] ring-1 ring-[#E2E8F0] text-[#475569] hover:ring-[#F7B31C]/50"}`}>
                    <span className="text-[13px] leading-none" aria-hidden="true">{qi.emoji}</span> {qi.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filter bar (app-like) */}
      <div className="sticky top-16 z-30 bg-[#F8FAFC]/90 backdrop-blur-xl border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto pl-4 pr-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3">
          {/* Chips scroll sideways; the right edge fades so it's clear there's more. */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none -ml-1 pl-1 pr-6 py-0.5 -mr-3 sm:mr-0 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]" role="group" aria-label="Filter by design style">
            {STYLES.map((st) => {
              const on = style === st.id;
              const n = styleCount(st.id);
              if (st.id !== "all" && n === 0) return null;
              return (
                <button key={st.id} onClick={() => setStyle(st.id)} aria-pressed={on}
                  className={`shrink-0 inline-flex items-center gap-1.5 h-8 sm:h-9 px-3.5 sm:px-4 rounded-full text-[12.5px] sm:text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 ${on ? "bg-[#0F172A] text-white shadow-md" : "bg-white ring-1 ring-[#E2E8F0] text-[#475569] hover:ring-[#F7B31C]/50"}`}>
                  {st.id === "featured" && <Star size={13} className="fill-[#F7B31C] text-[#F7B31C]" aria-hidden="true" />}
                  {st.label}
                  <span className={`text-[11px] font-bold tabular-nums ${on ? "text-[#F7B31C]" : "text-[#94A3B8]"}`}>{n}</span>
                </button>
              );
            })}
          </div>
          {cat !== "all" && (
            <button onClick={() => setCat("all")} aria-label={`Clear industry filter: ${cat}`}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 sm:h-9 pl-3 pr-2 rounded-full bg-[#FEF3C7] ring-1 ring-[#F7B31C]/50 text-[12.5px] font-semibold text-[#92400E] max-w-[46%] sm:max-w-none">
              <span className="truncate">{cat}</span> <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <section className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[13px] text-[#64748B]">{isLoading ? "Loading cards…" : `${shown.length} card${shown.length === 1 ? "" : "s"}`}</p>
            {/* Sort: an always-visible segmented toggle (a native <select> opened
                an unstyled picker on some phones). */}
            <div role="radiogroup" aria-label="Sort designs" className="inline-flex items-center gap-0.5 p-1 rounded-full bg-white ring-1 ring-[#E2E8F0] shadow-sm">
              <SlidersHorizontal size={14} className="ml-1.5 mr-0.5 text-[#94A3B8]" aria-hidden="true" />
              {SORTS.map((s) => {
                const on = sort === s.id;
                return (
                  <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setSort(s.id)}
                    className={`h-8 px-3.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "bg-[#0F172A] text-white shadow" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-2xl bg-white border border-[#F1F5F9] h-[380px] animate-pulse" />)
              : shown.map((p) => {
                return (
                  <article key={p.id} className="group rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-premium hover:shadow-premium-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
                    <div className="relative">
                      <Link to={`/digital-business-cards-templates/${p.slug}`} className="relative block active:scale-[0.99] transition-transform">
                        {isFeat(p) && <span role="img" aria-label="Featured design" title="Featured" className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-[#0F172A]/45 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shadow-sm"><Star size={13} className="fill-[#F7B31C] text-[#F7B31C]" aria-hidden="true" /></span>}
                        <TemplateThumb style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} name={p.name} />
                        <div className="absolute inset-0 hidden md:flex items-center justify-center bg-[#0F172A]/0 group-hover:bg-[#0F172A]/30 transition-colors duration-300">
                          <span className="opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-[#0F172A] text-[13px] font-bold shadow-lg"><Eye size={14} /> Live Preview</span>
                        </div>
                      </Link>
                    </div>
                    <div className="p-3.5 flex items-start gap-2 flex-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[#F7B31C] uppercase tracking-wide truncate">{industryOf(p)}</p>
                        <Link to={`/digital-business-cards-templates/${p.slug}`} className="hover:text-[#F7B31C] transition-colors"><h3 className="text-[13px] sm:text-[14px] font-bold text-[#0F172A] leading-snug line-clamp-3 md:line-clamp-2 min-h-[36px] mt-0.5">{p.name}</h3></Link>
                      </div>
                      {/* Actions beside the name as small see-through icons. The eye
                          (live preview) is phones-only: from md up the "Live Preview"
                          hover overlay on the design does that job. */}
                      <div className="flex flex-col md:flex-row gap-1.5 shrink-0">
                        <Link
                          to={`/signup?product=${encodeURIComponent(p.slug)}`}
                          aria-label={`Try ${p.name} free`}
                          title="Try free"
                          className="w-8 h-8 rounded-full bg-[#F7B31C]/20 ring-1 ring-[#F7B31C]/35 text-[#B45309] flex items-center justify-center hover:bg-[#F7B31C] hover:text-[#0F172A] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                        >
                          <Sparkles size={15} aria-hidden="true" />
                        </Link>
                        <Link
                          to={`/demo/${p.slug}`}
                          aria-label={`Live preview of ${p.name}`}
                          title="Live preview"
                          className="md:hidden w-8 h-8 rounded-full bg-[#0F172A]/[0.05] ring-1 ring-[#0F172A]/10 text-[#334155] flex items-center justify-center hover:bg-[#0F172A] hover:text-white active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                        >
                          <Eye size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
          {!isLoading && shown.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#F1F5F9] flex items-center justify-center mx-auto mb-3 shadow-premium"><Search size={24} className="text-[#94A3B8]" /></div>
              <p className="text-sm font-semibold text-[#0F172A]">No cards match your search</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">Try a different keyword or category.</p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#0F172A] text-center px-6 py-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(247,179,28,.25), transparent)" }} />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Not sure which card to pick?</h2>
            <p className="mt-2 text-[#94A3B8] max-w-xl mx-auto">Start free — you can switch designs anytime. Your card, URL and QR stay the same even if you change the look.</p>
            <Link to="/signup" className="mt-6 inline-flex items-center gap-2 h-12 px-7 rounded-xl gradient-gold text-[#0F172A] font-bold hover:shadow-gold transition-all">Start Free <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

    </div>
  );
}
