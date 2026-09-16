import { describe, expect, it } from "vitest";
import { FOOTER_GROUPS, FOOTER_GUIDES, LEGAL_LINKS, SITEMAP_GROUPS } from "../../src/lib/publicNav";
import { BLOG_POSTS, blogPostPath } from "../../src/data/blog";
import { seoForPath } from "../../src/lib/publicSeo";

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
