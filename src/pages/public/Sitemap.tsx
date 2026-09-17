/*
 * /sitemap — every public page, for people.
 *
 * sitemap.xml is the index search engines read; this is the one a person can
 * browse, and it doubles as a crawlable hub linking to every template page.
 *
 * Page groups come from src/lib/publicNav.ts, the same source as the footer,
 * so the two can't list different pages. Industry pages come from
 * src/data/industries, the same data that renders them. Templates come from
 * the live catalogue — the server seeds that query, so all of them are in the
 * raw HTML.
 *
 * Customer cards are deliberately NOT listed. A public page naming every
 * customer would be a ready-made directory for competitors and spammers; the
 * cards are already in sitemap.xml, which is where search engines need them.
 */
import { Link } from "react-router";
import { FileCode2, ArrowUpRight, LayoutGrid, BookOpen, Building2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SITEMAP_GROUPS } from "@/lib/publicNav";
import { BLOG_PATH, BLOG_POSTS, blogPostPath } from "@/data/blog";
import { INDUSTRIES, INDUSTRIES_PATH, industryPath } from "@/data/industries";

export default function Sitemap() {
  const { data: products = [] } = trpc.product.catalogue.useQuery();
  const pageCount = SITEMAP_GROUPS.reduce((n, g) => n + g.links.length, 0);

  return (
    <div className="pt-24 pb-20 bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E]">Sitemap</span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F172A] text-balance">
            Every page on DigitalCarda
          </h1>
          <p className="mt-3 text-[15px] text-[#64748B] leading-relaxed">
            {pageCount} site pages
            {products.length > 0
              ? `, ${INDUSTRIES.length} industry pages and ${products.length} digital business card templates`
              : ` and ${INDUSTRIES.length} industry pages`}
            , grouped by what you're looking for.
          </p>
        </header>

        {/* The machine-readable index, one click away. */}
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noreferrer"
          className="group mt-8 flex items-center gap-4 rounded-2xl bg-[#0F172A] p-5 sm:p-6 text-white transition-colors hover:bg-[#162033]"
        >
          <span className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shrink-0">
            <FileCode2 size={22} className="text-[#0F172A]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-sm text-[#F7B31C] break-all">digitalcarda.in/sitemap.xml</span>
            <span className="mt-1 block text-sm text-[#CBD5E1] leading-relaxed">
              The XML sitemap search engines read — every public page, template and customer card, with last-updated dates.
            </span>
          </span>
          <ArrowUpRight size={20} className="text-[#94A3B8] transition-colors group-hover:text-white shrink-0" />
        </a>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SITEMAP_GROUPS.map((g) => (
            <section key={g.title} className="rounded-2xl border border-[#EEF2F6] bg-white p-6">
              <h2 className="text-sm font-bold text-[#0F172A]">{g.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-sm text-[#475569] transition-colors hover:text-[#B45309]">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* One page per profession, straight from the industry data. */}
        <section className="mt-5 rounded-2xl border border-[#EEF2F6] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0F172A]">
              <Building2 size={16} className="text-[#F7B31C]" /> Industries
            </h2>
            <Link to={INDUSTRIES_PATH} className="text-sm font-semibold text-[#B45309] hover:underline">All {INDUSTRIES.length} industries</Link>
          </div>
          <ul className="mt-5 columns-1 gap-8 sm:columns-2 lg:columns-3">
            {INDUSTRIES.map((i) => (
              <li key={i.slug} className="break-inside-avoid py-1.5">
                <Link to={industryPath(i.slug)} className="text-sm text-[#475569] transition-colors hover:text-[#B45309]">{i.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl border border-[#EEF2F6] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0F172A]">
              <BookOpen size={16} className="text-[#F7B31C]" /> Blog guides
            </h2>
            <Link to={BLOG_PATH} className="text-sm font-semibold text-[#B45309] hover:underline">All {BLOG_POSTS.length} guides</Link>
          </div>
          <ul className="mt-5 columns-1 gap-8 sm:columns-2">
            {BLOG_POSTS.map((p) => (
              <li key={p.slug} className="break-inside-avoid py-1.5">
                <Link to={blogPostPath(p.slug)} className="text-sm text-[#475569] transition-colors hover:text-[#B45309]">{p.title}</Link>
              </li>
            ))}
          </ul>
        </section>

        {products.length > 0 && (
          <section className="mt-5 rounded-2xl border border-[#EEF2F6] bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <LayoutGrid size={16} className="text-[#F7B31C]" /> Digital business card templates
              </h2>
              <Link to="/digital-business-cards-templates" className="text-sm font-semibold text-[#B45309] hover:underline">
                Browse all {products.length}
              </Link>
            </div>
            <ul className="mt-5 columns-1 gap-8 sm:columns-2 lg:columns-3">
              {products.map((p) => (
                <li key={p.slug} className="break-inside-avoid py-1.5">
                  <Link to={`/digital-business-cards-templates/${p.slug}`} className="text-sm text-[#475569] transition-colors hover:text-[#B45309]">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-xs text-[#94A3B8]">
          Individual customer cards aren't listed on this page — they're included in sitemap.xml for search engines.
        </p>
      </div>
    </div>
  );
}
