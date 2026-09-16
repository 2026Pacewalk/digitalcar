/*
 * /blog/:slug — one article.
 *
 * The server writes this page's <title>, description, canonical, Open Graph
 * tags and BlogPosting + FAQPage + BreadcrumbList structured data into the raw
 * HTML (api/lib/vite.ts, blogMeta). The effect below only keeps the tab title
 * and tags right when a reader arrives by clicking inside the site.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Clock, Lightbulb, ListOrdered,
} from "lucide-react";
import PostVisual from "@/components/blog/PostVisual";
import { ShareCluster, ShareEnd, ShareRail } from "@/components/blog/ShareMenu";
import PostCard from "@/components/blog/PostCard";
import RichText from "@/components/blog/RichText";
import {
  BLOG_PATH, blogOgPath, blogPostPath, categoryLabel, formatBlogDate, getBlogPost, readingMinutes, relatedPosts,
  type BlogBlock, type BlogPost as Post,
} from "@/data/blog";

const SITE = "https://digitalcarda.in";

function setHead(post: Post) {
  const url = `${SITE}${blogPostPath(post.slug)}`;
  document.title = post.seoTitle;
  const meta = (attr: "name" | "property", key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute("content", content);
  };
  meta("name", "description", post.description);
  meta("property", "og:title", post.seoTitle);
  meta("property", "og:description", post.description);
  meta("property", "og:type", "article");
  meta("property", "og:url", url);
  const image = `${SITE}${blogOgPath(post)}`;
  meta("property", "og:image", image);
  meta("property", "og:image:alt", post.title);
  meta("name", "twitter:image", image);
  meta("name", "twitter:title", post.seoTitle);
  meta("name", "twitter:description", post.description);
  let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
  canon.href = url;
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "p":
      return <p className="mt-5"><RichText text={block.text} /></p>;
    case "h3":
      return <h3 className="mt-10 font-display text-[1.25rem] font-bold tracking-tight text-[#0F172A]">{block.text}</h3>;
    case "ul":
      return (
        <ul className="mt-5 space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="relative pl-6 before:absolute before:left-0 before:top-[0.72em] before:h-2 before:w-2 before:rounded-full before:bg-[#F7B31C]">
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case "checklist":
      return (
        <ul className="mt-6 grid gap-2.5 rounded-2xl bg-white p-5 ring-1 ring-[#EEE9DD] sm:p-6">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#DCFCE7] text-[#15803D]" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
              <span><RichText text={item} /></span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="mt-7 space-y-0">
          {block.items.map((step, i) => (
            <li key={i} className="relative flex gap-5 pb-7 last:pb-0">
              {i < block.items.length - 1 && <span aria-hidden="true" className="absolute left-[19px] top-11 bottom-1 w-px bg-[linear-gradient(#F7B31C,#F3E8CC)]" />}
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-display text-[15px] font-extrabold text-[#F7B31C]">{i + 1}</span>
              <div className="pt-1.5">
                <p className="font-display text-[1.05rem] font-bold text-[#0F172A]">{step.title}</p>
                <p className="mt-1.5"><RichText text={step.text} /></p>
              </div>
            </li>
          ))}
        </ol>
      );
    case "tip": {
      const warn = block.tone === "warn";
      const Icon = warn ? AlertTriangle : Lightbulb;
      return (
        <aside className={`mt-7 flex gap-4 rounded-2xl p-5 sm:p-6 ${warn ? "bg-[#FFF1F2] ring-1 ring-[#FECDD3]" : "bg-[#FFF8E6] ring-1 ring-[#F9E2A8]"}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${warn ? "bg-[#E11D48] text-white" : "bg-[#F7B31C] text-[#0F172A]"}`} aria-hidden="true"><Icon size={19} /></span>
          <div>
            <p className={`font-display text-[15.5px] font-bold ${warn ? "text-[#9F1239]" : "text-[#78350F]"}`}>{block.title}</p>
            <p className="mt-1 text-[16px] leading-relaxed text-[#44403C]"><RichText text={block.text} /></p>
          </div>
        </aside>
      );
    }
    case "quote":
      return (
        <blockquote className="relative my-10 border-l-4 border-[#F7B31C] py-1 pl-6 font-display text-[1.3rem] font-semibold leading-snug text-[#0F172A] sm:text-[1.45rem]">
          {block.text}
        </blockquote>
      );
    case "table":
      return (
        <figure className="mt-7">
          <div className="overflow-x-auto rounded-2xl ring-1 ring-[#E7E0CF]">
            <table className="w-full min-w-[520px] border-collapse bg-white text-left text-[15px]">
              <thead>
                <tr className="bg-[#0F172A] text-white">
                  {block.head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-display text-[13.5px] font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-t border-[#F1ECE0] even:bg-[#FCFBF7]">
                    {row.map((cell, c) => c === 0
                      ? <th key={c} scope="row" className="px-4 py-3 align-top font-semibold text-[#0F172A]"><RichText text={cell} /></th>
                      : <td key={c} className="px-4 py-3 align-top text-[#44403C]"><RichText text={cell} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && <figcaption className="mt-2.5 text-[13px] text-[#78716C]">{block.caption}</figcaption>}
        </figure>
      );
    case "related": {
      const target = getBlogPost(block.slug);
      if (!target) return null;
      return (
        <aside className="mt-8">
          <Link to={blogPostPath(target.slug)} className="group flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-[#E7E0CF] transition hover:ring-[#F7B31C] sm:p-5">
            <span className="h-16 w-24 shrink-0 overflow-hidden rounded-xl sm:h-[4.5rem] sm:w-28"><PostVisual post={target} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]">Related guide</span>
              <span className="mt-1 block font-display text-[16px] font-bold leading-snug text-[#0F172A] group-hover:underline group-hover:decoration-[#F7B31C] group-hover:decoration-2 group-hover:underline-offset-4">{target.title}</span>
              {block.note && <span className="mt-1 block text-[14px] leading-snug text-[#78716C]">{block.note}</span>}
            </span>
            <ArrowRight size={18} className="shrink-0 text-[#0F172A] transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </aside>
      );
    }
    case "cta":
      return (
        <aside className="relative mt-10 overflow-hidden rounded-3xl bg-[#0F172A] p-7 text-white sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F7B31C]/25 blur-2xl" />
          <p className="relative font-display text-xl font-extrabold tracking-tight">{block.title}</p>
          <p className="relative mt-2 text-[15.5px] leading-relaxed text-[#CBD5E1]">{block.text}</p>
          <Link to={block.href} className="relative mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#F7B31C] px-5 text-[14.5px] font-bold text-[#0F172A] transition hover:bg-[#FBBF24]">
            {block.label} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      );
  }
}

export default function BlogPost() {
  const { slug = "" } = useParams();
  const post = getBlogPost(slug);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (post) setHead(post); }, [post]);

  // Reading progress + the table-of-contents highlight.
  useEffect(() => {
    if (!post) return;
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      setProgress(Math.min(1, Math.max(0, -rect.top / Math.max(1, total))));
      let current = "";
      for (const s of post.sections) {
        const h = document.getElementById(s.id);
        if (h && h.getBoundingClientRect().top < 140) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [post]);

  if (!post) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-40 pb-24 text-center">
        <meta name="robots" content="noindex" />
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#92400E]">Blog</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-[#0F172A]">We couldn't find that article</h1>
        <p className="mt-3 text-[#64748B]">It may have moved. Every guide is on the blog page.</p>
        <Link to={BLOG_PATH} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F172A] px-5 font-bold text-white"><ArrowLeft size={16} /> All guides</Link>
      </div>
    );
  }

  const minutes = readingMinutes(post);
  const toc = post.sections.map((s) => ({ id: s.id, heading: s.heading }));

  return (
    <div className="bg-[#FAFAF7]">
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent" aria-hidden="true">
        <div className="h-full origin-left bg-[#F7B31C]" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden pt-28 sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(247,179,28,0.16),transparent_40%)]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#78716C]">
              <li><Link to="/" className="hover:text-[#0F172A]">Home</Link></li>
              <li aria-hidden="true"><ChevronRight size={13} /></li>
              <li><Link to={BLOG_PATH} className="hover:text-[#0F172A]">Blog</Link></li>
              <li aria-hidden="true"><ChevronRight size={13} /></li>
              <li aria-current="page" className="min-w-0 max-w-[16rem] truncate font-semibold text-[#44403C] sm:max-w-md">{post.title}</li>
            </ol>
          </nav>
          <p className="mt-6 inline-flex rounded-full bg-[#FEF3C7] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#92400E]">{categoryLabel(post.category)}</p>
          <h1 className="mt-4 font-display text-[2.1rem] font-extrabold leading-[1.08] tracking-tight text-[#0F172A] sm:text-[3.1rem] [text-wrap:balance]">{post.title}</h1>
          <p className="mt-5 max-w-3xl text-[18px] leading-relaxed text-[#57534E]">{post.excerpt}</p>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-y border-[#EEE9DD] py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F172A] font-display text-[14px] font-extrabold text-[#F7B31C]" aria-hidden="true">DC</span>
              <div className="text-[13.5px] leading-tight">
                <p className="font-bold text-[#0F172A]">By <Link to="/about" rel="author" className="underline decoration-[#F7B31C] decoration-2 underline-offset-4 hover:text-[#92400E]">the DigitalCarda team</Link></p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[#78716C]">
                  {post.updatedAt > post.publishedAt
                    ? <span>Updated <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time></span>
                    : <span>Published <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time></span>}
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" /> {minutes} min read</span>
                </p>
              </div>
            </div>
            <ShareCluster post={post} />
          </div>
        </div>
        <div className="relative mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="aspect-[16/9] overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-50px_rgba(15,23,42,0.55)] ring-1 ring-black/5 sm:aspect-[21/9]">
            <PostVisual post={post} priority />
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
        <div ref={articleRef} className="min-w-0">
          <div className="relative mx-auto max-w-[44rem] text-[17.5px] leading-[1.8] text-[#44403C]">
            {/* Share rail beside the article on wide screens */}
            <div className="pointer-events-none absolute -left-[5.5rem] top-0 hidden h-full xl:block">
              <div className="pointer-events-auto sticky top-32"><ShareRail post={post} /></div>
            </div>

            {/* The short version */}
            <section aria-labelledby="short-version" className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white sm:p-8">
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-[#F7B31C]/20 blur-2xl" />
              <h2 id="short-version" className="relative font-display text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#F7B31C]">The short version</h2>
              <ul className="relative mt-4 space-y-3 text-[16px] leading-relaxed text-[#E2E8F0]">
                {post.takeaways.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-[5px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A]" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Contents on small screens */}
            <details className="group mt-8 rounded-2xl bg-white ring-1 ring-[#EEE9DD] lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-display text-[15px] font-bold text-[#0F172A]">
                <span className="inline-flex items-center gap-2"><ListOrdered size={17} aria-hidden="true" /> In this guide</span>
                <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ol className="space-y-2 px-5 pb-5 text-[15px]">
                {toc.map((t, i) => (
                  <li key={t.id}><a href={`#${t.id}`} className="flex gap-3 text-[#57534E] hover:text-[#0F172A]"><span className="font-bold text-[#F7B31C]">{i + 1}</span>{t.heading}</a></li>
                ))}
              </ol>
            </details>

            <div className="mt-8 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[4.2rem] first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-[#0F172A]">
              {post.intro.map((para, i) => <p key={i} className={i ? "mt-5" : ""}><RichText text={para} /></p>)}
            </div>

            {post.sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                <h2 id={section.id} className="mt-14 scroll-mt-28 font-display text-[1.65rem] font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-[1.9rem] [text-wrap:balance]">
                  {section.heading}
                </h2>
                {section.blocks.map((b, i) => <Block key={i} block={b} />)}
              </section>
            ))}

            {/* FAQ */}
            {post.faqs.length > 0 && (
              <section aria-labelledby="faq" className="mt-16">
                <h2 id="faq" className="scroll-mt-28 font-display text-[1.65rem] font-extrabold tracking-tight text-[#0F172A] sm:text-[1.9rem]">Frequently asked questions</h2>
                <div className="mt-6 divide-y divide-[#EEE9DD] overflow-hidden rounded-2xl bg-white ring-1 ring-[#EEE9DD]">
                  {post.faqs.map((f, i) => (
                    <details key={i} className="group" open={i === 0}>
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 font-display text-[16px] font-bold leading-snug text-[#0F172A] sm:px-6">
                        {f.q}
                        <ChevronDown size={18} className="mt-0.5 shrink-0 text-[#A8A29E] transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <p className="px-5 pb-5 text-[16px] leading-relaxed text-[#57534E] sm:px-6"><RichText text={f.a} /></p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <ShareEnd post={post} />

            {/* About */}
            <aside className="mt-14 flex gap-4 rounded-2xl border border-[#EEE9DD] bg-white p-5 sm:p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-display text-[15px] font-extrabold text-[#F7B31C]" aria-hidden="true">DC</span>
              <div className="text-[15px] leading-relaxed">
                <p className="font-display font-bold text-[#0F172A]">Written by the DigitalCarda team</p>
                <p className="mt-1 text-[#57534E]">We build digital visiting cards for businesses across India — shops, clinics, consultants and sales teams — and write down what we learn from helping them get found and called back. Read <Link to="/about#how-we-write" className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">how we write and check our guides</Link>, or see what a card can do on our <Link to="/features" className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">features page</Link>.</p>
              </div>
            </aside>
          </div>
        </div>

        {/* Sticky contents (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <nav aria-label="In this guide" className="rounded-2xl bg-white p-5 ring-1 ring-[#EEE9DD]">
              <p className="font-display text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#A8A29E]">In this guide</p>
              <ol className="mt-4 space-y-1">
                {toc.map((t) => {
                  const on = active === t.id;
                  return (
                    <li key={t.id}>
                      <a href={`#${t.id}`} aria-current={on ? "location" : undefined}
                        className={`block rounded-lg border-l-2 px-3 py-1.5 text-[13.5px] leading-snug transition-colors ${on ? "border-[#F7B31C] bg-[#FFF8E6] font-semibold text-[#0F172A]" : "border-transparent text-[#78716C] hover:text-[#0F172A]"}`}>
                        {t.heading}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
            <div className="overflow-hidden rounded-2xl bg-[#F7B31C] p-5">
              <p className="font-display text-[17px] font-extrabold leading-snug text-[#0F172A]">Your digital visiting card, ready today</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#422006]">₹0 for 30 days. No payment required.</p>
              <Link to="/signup?promo=FREE30D" className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] text-[13.5px] font-bold text-white hover:bg-[#1E293B]">
                Start free <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Keep reading ───────────────────────────────────────── */}
      <section aria-labelledby="keep-reading" className="border-t border-[#EEE9DD] bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 id="keep-reading" className="font-display text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">Keep reading</h2>
            <Link to={BLOG_PATH} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#0F172A] hover:text-[#92400E]">All guides <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts(post).map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
