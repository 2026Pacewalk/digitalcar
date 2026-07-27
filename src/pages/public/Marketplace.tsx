import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Search, SlidersHorizontal, Sparkles, X, ExternalLink, ArrowRight, Eye, ShieldCheck, Zap, Share2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, buildCardHtml } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";

type Product = {
  id: number; slug: string; name: string; tagline?: string | null; category?: string | null;
  styleNumber: number; price: string; salePrice?: string | null; trialDays: number;
  primaryColor?: string | null; secondaryColor?: string | null; isFeatured: boolean; displayOrder: number;
};

const inr = (v?: string | number | null) => "₹" + Number(v || 0).toLocaleString("en-IN");
const THUMB_W = 375, THUMB_H = 560;

/* Responsive card-front preview (same engine the real cards use). */
function ThumbFrame({ style, primary, secondary }: { style: number; primary?: string | null; secondary?: string | null }) {
  const html = useMemo(
    () => buildCardThumb({ ...DEFAULT_CUSTOMER, color: primary || "#F7B31C", color2: secondary || "" }, style),
    [style, primary, secondary],
  );
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={`Design ${style}`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: THUMB_W, height: THUMB_H, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "newest", label: "Newest" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

export default function Marketplace() {
  const { data: products = [], isLoading } = trpc.product.catalogue.useQuery();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<SortId>("popular");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return [...set].sort();
  }, [products]);

  const shown = useMemo(() => {
    const term = q.toLowerCase().trim();
    let list = products.filter((p) => {
      if (cat !== "all" && (p.category || "") !== cat) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || (p.category || "").toLowerCase().includes(term) || (p.tagline || "").toLowerCase().includes(term);
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
      <section className="pt-28 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#F7B31C] bg-[#FEF3C7]/60 px-3 py-1.5 rounded-full"><Sparkles size={13} /> Digital Business Card Marketplace</span>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight text-balance">Choose a card. Make it yours. <span className="text-gradient-gold">Try it free.</span></h1>
          <p className="mt-3 text-[15px] sm:text-base text-[#64748B] max-w-2xl mx-auto">Browse professionally-designed digital cards, preview a live demo, and start your 30-day free trial — no app, no printing, no credit card upfront.</p>
          {/* Search */}
          <div className="mt-6 max-w-xl mx-auto">
            <div className="flex items-center gap-2.5 bg-white border border-[#E2E8F0] rounded-full px-5 py-3 shadow-premium focus-within:border-[#F7B31C] transition-colors">
              <Search size={18} className="text-[#94A3B8] shrink-0" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search real estate, doctor, luxury black, minimal…" className="flex-1 bg-transparent outline-none text-sm text-[#0F172A] placeholder:text-[#94A3B8]" />
              {q && <button onClick={() => setQ("")} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={16} /></button>}
            </div>
          </div>
          {/* Trust */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-[#64748B]">
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Instant activation</span>
            <span className="inline-flex items-center gap-1.5"><Share2 size={14} className="text-[#F7B31C]" /> Share instantly</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#F7B31C]" /> Permanent URL &amp; QR</span>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button onClick={() => setCat("all")} className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${cat === "all" ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#F7B31C]"}`}>All cards</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${cat === c ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#F7B31C]"}`}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal size={15} className="text-[#94A3B8]" />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="h-10 bg-white border border-[#E2E8F0] rounded-lg px-3 text-sm text-[#334155] outline-none focus:border-[#F7B31C]">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </section>

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
                  <article key={p.id} className="group rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-premium hover:shadow-premium-lg hover:-translate-y-1 transition-all flex flex-col">
                    <Link to={`/digital-business-cards/${p.slug}`} className="relative block">
                      <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">◷ {p.trialDays}-Day Trial</span>
                      {p.isFeatured && <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F172A] text-[#F7B31C]">★ Featured</span>}
                      <ThumbFrame style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} />
                    </Link>
                    <div className="p-3.5 flex flex-col flex-1">
                      <p className="text-[10px] font-bold text-[#F7B31C] uppercase tracking-wide truncate">{p.category || "Digital Card"}</p>
                      <Link to={`/digital-business-cards/${p.slug}`} className="hover:text-[#F7B31C] transition-colors"><h3 className="text-[14px] font-bold text-[#0F172A] leading-snug line-clamp-2 min-h-[36px] mt-0.5">{p.name}</h3></Link>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-[16px] font-extrabold text-[#0F172A] tabular-nums">{inr(p.salePrice || p.price)}</span>
                        {onSale && <span className="text-[12px] text-[#94A3B8] line-through tabular-nums">{inr(p.price)}</span>}
                        <span className="text-[11px] text-[#94A3B8]">/year</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-0.5">
                        <Link to={`/signup?product=${encodeURIComponent(p.slug)}`} className="flex-1 h-9 rounded-xl gradient-gold text-[#0F172A] text-[13px] font-bold flex items-center justify-center hover:shadow-gold transition-all">Try Free</Link>
                        <Link to={`/demo/${p.slug}`} className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-[#334155] text-[13px] font-semibold flex items-center gap-1.5 hover:border-[#F7B31C] hover:text-[#F7B31C] transition-colors"><Eye size={14} /> View</Link>
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
