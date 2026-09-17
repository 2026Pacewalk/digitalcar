/* Catalogue designs for an industry page, or the featured designs for the hub
   (blueprint §4b-6 and §4c-5).

   With `ind`: the published designs whose demo persona matches one of
   ind.templateNatures, in that priority order (then featured first, then
   displayOrder, then id), capped at `limit` (6). Fewer than 3 matches are
   filled from the other designs, and those carry a "Works for any business"
   tag. Without `ind`: the featured designs, for the hub.

   The order is a pure function of the catalogue, so the server and the
   browser render the same tiles. Names and links are in the server HTML; the
   card preview (an iframe, ~37 KB each) is built only in the browser and only
   once the tile is within 300px of the viewport.

   The local production server has no database, so the query can fail: on
   error, or with an empty catalogue, a calm fallback links to the templates
   page. Never a blank area. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Eye, Palette, Sparkles, Star } from "lucide-react";
import { trpc } from "@/providers/trpc";
import TemplateThumb from "@/components/TemplateThumb";
import { demoForProduct } from "@/lib/demoData";
import { SIGNUP_HREF, signupForProduct, type IndustryPage } from "@/data/industries";

type Product = {
  id: number; slug: string; name: string; category?: string | null; styleNumber: number;
  primaryColor?: string | null; secondaryColor?: string | null; isFeatured: boolean; displayOrder: number;
};
type Tile = { p: Product; filled: boolean };

const TEMPLATES_PATH = "/digital-business-cards-templates";
const FRAME_RATIO = "375 / 626";

const natureOf = (p: Product) => String(demoForProduct(p).customer.nature ?? "");
/** Featured first, then the catalogue's own order, then id (a stable tiebreak). */
const byFeatured = (a: Product, b: Product) =>
  (Number(b.isFeatured) - Number(a.isFeatured)) || (a.displayOrder - b.displayOrder) || (a.id - b.id);

function pickTiles(products: Product[], ind: IndustryPage | undefined, limit: number): Tile[] {
  if (!ind) return [...products].sort(byFeatured).slice(0, limit).map((p) => ({ p, filled: false }));
  const natures = ind.templateNatures as readonly string[];
  const rank = (p: Product) => { const i = natures.indexOf(natureOf(p)); return i < 0 ? 99 : i; };
  const matched = products
    .filter((p) => rank(p) < 99)
    .sort((a, b) => (rank(a) - rank(b)) || byFeatured(a, b))
    .slice(0, limit);
  const tiles: Tile[] = matched.map((p) => ({ p, filled: false }));
  const want = Math.min(3, limit);
  if (tiles.length < want) {
    const seen = new Set(matched.map((p) => p.id));
    const rest = products.filter((p) => !seen.has(p.id)).sort(byFeatured);
    for (const p of rest) {
      if (tiles.length >= want) break;
      tiles.push({ p, filled: true });
    }
  }
  return tiles;
}

/** True once the element is within 300px of the viewport (never before an
    effect runs, so the server and the first client render both show the
    placeholder). No timeout: a tile that is never scrolled to never builds. */
function useNear<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer support (very old browsers): build on the next tick. This
      // is not a scroll timeout; with an observer, only nearness sets `near`.
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, near };
}

const ITEM = "w-[72%] shrink-0 snap-start sm:w-auto";
const STRIP = "flex snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 scroll-px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3";

export default function TemplateStrip({ ind, limit }: { ind?: IndustryPage; limit?: number }) {
  // No input, so the key matches the server's SSR seed and Marketplace's own
  // call. Fresh for ten minutes: moving between industry pages reuses the
  // catalogue instead of refetching it. One retry, so a failed request shows
  // the fallback quickly instead of pulsing skeletons for several seconds.
  const { data, isError } = trpc.product.catalogue.useQuery(undefined, { staleTime: 10 * 60_000, retry: 1 });
  const cap = limit ?? 6;
  const tiles = useMemo(() => (data ? pickTiles(data as Product[], ind, cap) : []), [data, ind, cap]);

  if (isError || (data && tiles.length === 0)) return <Fallback />;
  if (!data) {
    return (
      <div className={STRIP} role="status" aria-busy="true" aria-label="Loading designs">
        {[0, 1, 2].map((i) => <Skeleton key={i} />)}
      </div>
    );
  }
  return (
    <div>
      <ul className={STRIP}>
        {tiles.map(({ p, filled }) => <li key={p.slug} className={ITEM}><DesignTile p={p} filled={filled} /></li>)}
      </ul>
      <div className="mt-8 text-center">
        <Link
          to={TEMPLATES_PATH}
          className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[15px] font-semibold text-[#0F172A] transition-colors hover:text-[#B45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
        >
          Browse all designs
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function DesignTile({ p, filled }: { p: Product; filled: boolean }) {
  const { ref, near } = useNear<HTMLDivElement>();
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-[#E9EDF3] transition-all duration-300 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] hover:ring-[#F7B31C]/60 motion-safe:hover:-translate-y-1">
      <Link
        to={`${TEMPLATES_PATH}/${p.slug}`}
        aria-label={`${p.name}: see this design`}
        className="relative block overflow-hidden bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F7B31C]"
      >
        {/* Fixed 375/626 box: the preview fills in without moving anything. */}
        <div ref={ref} className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:transform-none" style={{ aspectRatio: FRAME_RATIO }}>
          {near
            ? <TemplateThumb style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} name={p.name} />
            : <div className="h-full w-full animate-pulse bg-[#F1F5F9]" style={{ aspectRatio: FRAME_RATIO }} />}
        </div>
        {/* Top edge fades the phone into the tile; the bottom edge lifts the caption. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        {filled && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#0F172A] shadow-sm ring-1 ring-[#E2E8F0]">
            <Sparkles size={11} className="text-[#B45309]" aria-hidden="true" /> Works for any business
          </span>
        )}
        {p.isFeatured && !filled && (
          <span role="img" aria-label="Featured design" title="Featured" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#0F172A]/55 ring-1 ring-white/20">
            <Star size={13} className="fill-[#F7B31C] text-[#F7B31C]" aria-hidden="true" />
          </span>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 translate-y-2 items-center gap-1.5 rounded-full bg-[#0F172A] px-3 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
          <Eye size={13} /> See this design
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4 pt-3 sm:p-5 sm:pt-3">
        <h3 className="font-display text-[15.5px] font-extrabold leading-snug tracking-tight text-[#0F172A]">{p.name}</h3>
        <div className="mt-3 flex items-center gap-2">
          <Link
            to={`/demo/${p.slug}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F8FAFC] px-3 text-[13.5px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0] transition-all duration-200 hover:bg-white hover:ring-[#CBD5E1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] motion-reduce:transition-none"
          >
            <Eye size={15} aria-hidden="true" /> Live demo
          </Link>
          <Link
            to={signupForProduct(p.slug)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-[#0F172A] px-3 text-[13.5px] font-semibold text-white transition-all duration-200 hover:bg-[#1E293B] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Use this design
          </Link>
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className={`${ITEM} overflow-hidden rounded-3xl bg-white ring-1 ring-[#E9EDF3]`} aria-hidden="true">
      <div className="animate-pulse bg-[#F1F5F9]" style={{ aspectRatio: FRAME_RATIO }} />
      <div className="p-4 sm:p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#F1F5F9]" />
        <div className="mt-3 flex gap-2">
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-[#F1F5F9]" />
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-[#F1F5F9]" />
        </div>
      </div>
    </div>
  );
}

/** Shown when the catalogue fails to load or is empty. */
function Fallback() {
  return (
    <div className="flex flex-col gap-5 rounded-3xl bg-white p-6 ring-1 ring-[#E2E8F0] shadow-premium sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E]" aria-hidden="true">
          <Palette size={20} />
        </span>
        <div>
          <p className="font-display text-[16px] font-bold text-[#0F172A]">Browse the design gallery</p>
          <p className="mt-1 text-[14.5px] leading-relaxed text-[#64748B]">
            Every design works for any business. The templates page shows them all, each with a live demo you can open on your phone.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
        <Link to={TEMPLATES_PATH} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2">
          Browse all designs <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link to={SIGNUP_HREF} className="btn-gold inline-flex h-11 items-center justify-center px-5 text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2">
          Start free
        </Link>
      </div>
    </div>
  );
}
