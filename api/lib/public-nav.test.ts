import { describe, expect, it } from "vitest";
import { FOOTER_GROUPS, FOOTER_GUIDES, HEADER_MENUS, INDUSTRY_SEARCH, LEGAL_LINKS, SEARCH_PAGES, SITEMAP_GROUPS } from "../../src/lib/publicNav";
import { BLOG_POSTS, blogPostPath } from "../../src/data/blog";
import { INDUSTRIES, getIndustry, industryPath } from "../../src/data/industries";
import { seoForPath } from "../../src/lib/publicSeo";

const INDUSTRY_DETAIL = "/industries/";
const industrySlug = (href: string) => href.split("?")[0].slice(INDUSTRY_DETAIL.length);

describe("public navigation links", () => {
  it("footer guides point at real blog articles", () => {
    const paths = new Set(BLOG_POSTS.map((p) => blogPostPath(p.slug)));
    for (const g of FOOTER_GUIDES) expect(paths.has(g.href), g.href).toBe(true);
  });

  it("footer, legal and sitemap links are pages the site knows", () => {
    const links = [...FOOTER_GROUPS, ...SITEMAP_GROUPS].flatMap((g) => g.links).concat(LEGAL_LINKS);
    for (const l of links) {
      const path = l.href.split("?")[0];
      expect(seoForPath(path), l.href).not.toBeNull();
    }
  });
});

/* publicNav.ts is import-free, so its industry links are written by hand.
   These keep them in step with src/data/industries: a link to a page that
   isn't registered would 404, and a registered page missing from the search
   would be unreachable from the header. */
describe("industry links in the header", () => {
  it("every /industries/ link in the header menus is a registered industry", () => {
    const hrefs = HEADER_MENUS.flatMap((m) => m.items.map((i) => i.href)).filter((h) => h.startsWith(INDUSTRY_DETAIL));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(getIndustry(industrySlug(href)), href).not.toBeNull();
  });

  it("every /industries/ link in the header search is a registered industry", () => {
    const hrefs = SEARCH_PAGES.map((p) => p.href).filter((h) => h.startsWith(INDUSTRY_DETAIL));
    const unknown = hrefs.filter((h) => !getIndustry(industrySlug(h)));
    expect(unknown, `not registered in src/data/industries: ${unknown.join(", ")}`).toEqual([]);
  });

  it("INDUSTRY_SEARCH lists exactly the registered industries", () => {
    const listed = new Set(INDUSTRY_SEARCH.map((l) => l.href));
    const registered = new Set(INDUSTRIES.map((i) => industryPath(i.slug)));
    expect(listed.size, "duplicate hrefs in INDUSTRY_SEARCH").toBe(INDUSTRY_SEARCH.length);
    const missing = [...registered].filter((h) => !listed.has(h));
    const extra = [...listed].filter((h) => !registered.has(h));
    expect(missing, "registered industries with no INDUSTRY_SEARCH entry").toEqual([]);
    expect(extra, "INDUSTRY_SEARCH entries with no registered industry").toEqual([]);
  });

  it("INDUSTRY_SEARCH entries are labelled and sit at the end of the search list", () => {
    for (const l of INDUSTRY_SEARCH) {
      expect(l.label, l.href).toMatch(/^Digital card for /);
      expect(l.desc?.trim(), l.href).toBeTruthy();
    }
    // Appended last, so the first pages shown before anything is typed stay the same.
    expect(SEARCH_PAGES.slice(-INDUSTRY_SEARCH.length)).toEqual(INDUSTRY_SEARCH);
    const firstIndustry = SEARCH_PAGES.findIndex((p) => p.href.startsWith(INDUSTRY_DETAIL));
    expect(firstIndustry).toBeGreaterThanOrEqual(8);
  });
});
