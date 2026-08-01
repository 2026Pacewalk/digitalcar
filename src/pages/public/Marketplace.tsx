import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, SlidersHorizontal, Sparkles, X, ArrowRight, Eye } from "lucide-react";
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
const industryOf = (p: Product): string => String(demoForProduct(p).customer.nature || "Other");

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "newest", label: "Newest" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) { const ind = industryOf(p); if (ind) set.add(ind); }
    return [...set].sort();
  }, [products]);

  const shown = useMemo(() => {
    const term = q.toLowerCase().trim();
    let list = products.filter((p) => {
      const ind = industryOf(p);
      if (cat !== "all" && ind !== cat) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || ind.toLowerCase().includes(term) || (p.tagline || "").toLowerCase().includes(term);
    });
    const price = (p: Product) => Number(p.salePrice || p.price);
    list = [...list].sort((a, b) =>
      sort === "newest" ? b.id - a.id
      : sort === "price_low" ? price(a) - price(b)
      : sort === "price_high" ? price(b) - price(a)
      : (Number(b.isFeatured) - Number(a.isFeatured)) || (a.displayOrder - b.displayOrder));
    return list;
  }, [products, q, cat, sort]);

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
          {/* Search */}
          <div className="mt-6 max-w-xl mx-auto">
            <div className="flex items-center gap-2.5 bg-white border border-[#E2E8F0] rounded-2xl px-5 py-3.5 shadow-premium-lg focus-within:border-[#F7B31C] focus-within:ring-4 focus-within:ring-[#F7B31C]/10 transition-all">
              <Search size={18} className="text-[#94A3B8] shrink-0" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search real estate, doctor, luxury black, minimal…" className="flex-1 bg-transparent outline-none text-sm text-[#0F172A] placeholder:text-[#94A3B8]" />
              {q && <button onClick={() => setQ("")} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>}
            </div>
          </div>
          {/* Quick industries */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {QUICK.map((qi) => (
              <button key={qi.label} onClick={() => setCat(cat === qi.label ? "all" : qi.label)}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${cat === qi.label ? "gradient-gold text-[#0F172A] shadow-gold" : "bg-white/80 ring-1 ring-[#E2E8F0] text-[#475569] hover:ring-[#F7B31C]/50 backdrop-blur"}`}>
                <span className="text-[14px] leading-none">{qi.emoji}</span> {qi.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky filter bar (app-like) */}
      <div className="sticky top-16 z-30 bg-[#F8FAFC]/90 backdrop-blur-xl border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            <button onClick={() => setCat("all")} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${cat === "all" ? "gradient-gold text-[#0F172A] shadow-gold" : "bg-white ring-1 ring-[#E2E8F0] text-[#64748B] hover:ring-[#F7B31C]/50"}`}>All</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 ${cat === c ? "gradient-gold text-[#0F172A] shadow-gold" : "bg-white ring-1 ring-[#E2E8F0] text-[#64748B] hover:ring-[#F7B31C]/50"}`}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal size={15} className="hidden sm:block text-[#94A3B8]" />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="h-9 bg-white ring-1 ring-[#E2E8F0] rounded-full px-3 text-[13px] text-[#334155] outline-none focus:ring-[#F7B31C] max-w-[130px]">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-[13px] text-[#64748B] mb-4">{isLoading ? "Loading cards…" : `${shown.length} card${shown.length === 1 ? "" : "s"}`}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-2xl bg-white border border-[#F1F5F9] h-[380px] animate-pulse" />)
              : shown.map((p) => {
                const onSale = !!p.salePrice && Number(p.salePrice) < Number(p.price);
                return (
                  <article key={p.id} className="group rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-premium hover:shadow-premium-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
                    <Link to={`/digital-business-cards-templates/${p.slug}`} className="relative block active:scale-[0.99] transition-transform">
                      <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/90 text-[#92400E] shadow-sm backdrop-blur">◷ {p.trialDays}d trial</span>
                      {p.isFeatured && <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F172A] text-[#F7B31C] shadow-sm">★ Featured</span>}
                      <TemplateThumb style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} />
                      <div className="absolute inset-0 hidden md:flex items-center justify-center bg-[#0F172A]/0 group-hover:bg-[#0F172A]/30 transition-colors duration-300">
                        <span className="opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-[#0F172A] text-[13px] font-bold shadow-lg"><Eye size={14} /> Live Preview</span>
                      </div>
                    </Link>
                    <div className="p-3.5 flex flex-col flex-1">
                      <p className="text-[10px] font-bold text-[#F7B31C] uppercase tracking-wide truncate">{industryOf(p)}</p>
                      <Link to={`/digital-business-cards-templates/${p.slug}`} className="hover:text-[#F7B31C] transition-colors"><h3 className="text-[14px] font-bold text-[#0F172A] leading-snug line-clamp-2 min-h-[36px] mt-0.5">{p.name}</h3></Link>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-[16px] font-extrabold text-[#0F172A] tabular-nums">{inr(p.salePrice || p.price)}</span>
                        {onSale && <span className="text-[12px] text-[#94A3B8] line-through tabular-nums">{inr(p.price)}</span>}
                        <span className="text-[11px] text-[#94A3B8]">/year</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-0.5">
                        <Link to={`/signup?product=${encodeURIComponent(p.slug)}`} className="flex-1 h-9 rounded-xl gradient-gold text-[#0F172A] text-[13px] font-bold flex items-center justify-center whitespace-nowrap hover:shadow-gold active:scale-[0.97] transition-all">Try Free</Link>
                        <Link to={`/demo/${p.slug}`} className="h-9 px-2.5 rounded-xl border border-[#E2E8F0] text-[#334155] text-[13px] font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap hover:border-[#F7B31C] hover:text-[#F7B31C] active:scale-[0.97] transition-all"><Eye size={14} /> View</Link>
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
