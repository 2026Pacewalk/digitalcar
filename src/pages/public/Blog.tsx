/*
 * /blog — "The Card Room": guides for getting found, saved and called back.
 *
 * Every article is rendered in the server HTML (filters only hide cards in the
 * browser), so crawlers see and follow links to all of them. Title,
 * description, canonical and Blog structured data come from the server
 * (api/lib/vite.ts) and src/lib/publicSeo.ts.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BookOpen, Clock, Search, Sparkles, X } from "lucide-react";
import BlogCover from "@/components/blog/BlogCover";
import PostCard from "@/components/blog/PostCard";
import {
  BLOG_CATEGORIES, BLOG_POSTS, blogPostPath, categoryLabel, formatBlogDate, plainText, readingMinutes,
  type BlogCategoryId,
} from "@/data/blog";

export default function Blog() {
  const [topic, setTopic] = useState<BlogCategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const featured = BLOG_POSTS[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOG_POSTS.filter((p) => {
      if (topic !== "all" && p.category !== topic) return false;
      if (!q) return true;
      return [p.title, p.excerpt, ...p.keywords].some((t) => plainText(t).toLowerCase().includes(q));
    });
  }, [topic, query]);
  const browsing = topic !== "all" || query.trim() !== "";
  // While nothing is filtered, the featured article is shown large, so the grid skips it.
  const grid = browsing ? filtered : filtered.filter((p) => p.slug !== featured.slug);

  return (
    <div className="bg-[#FAFAF7]">
      {/* ── Masthead ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#EEE9DD] pt-32 pb-14 sm:pt-36 sm:pb-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(247,179,28,0.18),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.06),transparent_40%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 h-px bg-[linear-gradient(90deg,transparent,#E7DFC9,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#92400E]">
            <span className="inline-flex items-center gap-2"><BookOpen size={14} aria-hidden="true" /> The Card Room</span>
            <span className="h-1 w-1 rounded-full bg-[#D6CBB0]" aria-hidden="true" />
            <span className="text-[#A8A29E]">{BLOG_POSTS.length} guides · written for Indian businesses</span>
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[2.4rem] font-extrabold leading-[1.04] tracking-tight text-[#0F172A] sm:text-6xl [text-wrap:balance]">
            Digital visiting card guides that get you{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">saved</span>
              <span aria-hidden="true" className="absolute inset-x-[-4px] bottom-[0.08em] z-0 h-[0.34em] rounded-sm bg-[#F7B31C]/70" />
            </span>
            , not forgotten.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[#57534E]">
            Plain-English guides on digital business cards, NFC and QR codes, Google reviews and design — so more of the people you meet end up calling you back.
          </p>

          {/* Search + topics */}
          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">Search the guides</span>
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E]" aria-hidden="true" />
              <input
                id="blog-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: NFC, QR code, reviews…"
                className="h-12 w-full rounded-2xl border border-[#E7E0CF] bg-white pl-11 pr-10 text-[15px] text-[#0F172A] outline-none transition focus:border-[#F7B31C] focus:ring-4 focus:ring-[#F7B31C]/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#A8A29E] hover:bg-[#F5F5F4] hover:text-[#0F172A]">
                  <X size={15} />
                </button>
              )}
            </label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filter by topic">
              {[{ id: "all" as const, label: "All guides" }, ...BLOG_CATEGORIES].map((c) => {
                const on = topic === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTopic(c.id)}
                    className={`h-10 shrink-0 rounded-full px-4 text-[13.5px] font-semibold transition-all ${on ? "bg-[#0F172A] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.6)]" : "bg-white text-[#44403C] ring-1 ring-[#E7E0CF] hover:ring-[#F7B31C]"}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {/* ── Featured ───────────────────────────────────────────── */}
        {!browsing && (
          <article className="group relative grid overflow-hidden rounded-[2rem] bg-[#0F172A] text-white shadow-[0_40px_80px_-40px_rgba(15,23,42,0.6)] lg:grid-cols-[1.15fr_1fr]">
            <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[420px]">
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]">
                <BlogCover cover={featured.cover} />
              </div>
            </div>
            <div className="relative flex flex-col justify-center p-7 sm:p-10">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F7B31C] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0F172A]">
                <Sparkles size={12} aria-hidden="true" /> Start here
              </span>
              <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F7B31C]">{categoryLabel(featured.category)}</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[2.1rem] [text-wrap:balance]">
                <Link to={blogPostPath(featured.slug)} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-[2rem] focus-visible:after:ring-2 focus-visible:after:ring-[#F7B31C]">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-[#CBD5E1]">{featured.excerpt}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-[#94A3B8]">
                <span className="inline-flex items-center gap-1.5"><Clock size={14} aria-hidden="true" /> {readingMinutes(featured)} min read</span>
                <span>Updated {formatBlogDate(featured.updatedAt)}</span>
                <span className="ml-auto inline-flex items-center gap-2 font-bold text-white" aria-hidden="true">
                  Read the guide <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A] transition-transform group-hover:translate-x-1"><ArrowRight size={16} /></span>
                </span>
              </div>
            </div>
          </article>
        )}

        {/* ── Grid ───────────────────────────────────────────────── */}
        <div className="mt-14 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">
            {browsing ? (topic !== "all" ? categoryLabel(topic) : "Search results") : "Latest guides"}
          </h2>
          <p className="text-[13.5px] text-[#78716C]" aria-live="polite">{grid.length} {grid.length === 1 ? "article" : "articles"}</p>
        </div>

        {grid.length ? (
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        ) : (
          <div className="mt-7 rounded-3xl border border-dashed border-[#E7E0CF] bg-white px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-[#0F172A]">No guide matches that yet</p>
            <p className="mt-2 text-[14.5px] text-[#78716C]">Try another word, or <button type="button" onClick={() => { setQuery(""); setTopic("all"); }} className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">see every guide</button>.</p>
          </div>
        )}

        {/* ── Topics ─────────────────────────────────────────────── */}
        {!browsing && (
          <section className="mt-20" aria-labelledby="topics-heading">
            <h2 id="topics-heading" className="font-display text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">Browse by topic</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {BLOG_CATEGORIES.map((c, i) => {
                const count = BLOG_POSTS.filter((p) => p.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setTopic(c.id); document.getElementById("blog-search")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                    className="group flex flex-col rounded-2xl bg-white p-5 text-left ring-1 ring-[#EEE9DD] transition-all hover:-translate-y-0.5 hover:ring-[#F7B31C]"
                  >
                    <span className="font-display text-[2rem] font-extrabold leading-none text-[#F7B31C]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="mt-4 font-display text-[15.5px] font-bold text-[#0F172A]">{c.label}</span>
                    <span className="mt-1 text-[13px] leading-snug text-[#78716C]">{c.blurb}</span>
                    <span className="mt-4 text-[12px] font-semibold text-[#A8A29E] group-hover:text-[#92400E]">{count} {count === 1 ? "guide" : "guides"} →</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Call to action ─────────────────────────────────────── */}
        <section className="relative mt-20 overflow-hidden rounded-[2rem] bg-[#F7B31C] px-6 py-12 text-center sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/25" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-[#0F172A]/10" />
          <h2 className="relative font-display text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl [text-wrap:balance]">Ready to put this into practice?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[16px] text-[#422006]">Make your digital visiting card in minutes. ₹0 for 30 days — no payment required.</p>
          <Link to="/signup?promo=FREE30D" className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0F172A] px-7 text-[15px] font-bold text-white transition hover:bg-[#1E293B]">
            Start Free for 30 Days <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
