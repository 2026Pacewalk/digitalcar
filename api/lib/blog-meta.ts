/*
 * Server-side <head> tags and structured data for the blog.
 *
 *   /blog          → Blog + ItemList of every article, BreadcrumbList
 *   /blog/:slug    → BlogPosting, FAQPage (when the article has FAQs), BreadcrumbList,
 *                    og:type article with published/modified times
 *
 * Everything comes from src/data/blog — the same objects the page renders — so
 * the structured data always matches the visible article (a Google requirement
 * for FAQ and article rich results).
 */
import { BLOG_PATH, BLOG_POSTS, blogPostPath, categoryLabel, getBlogPost, plainText, postWordCount } from "../../src/data/blog";
import { seoForPath, breadcrumbJsonLd } from "../../src/lib/publicSeo";
import type { CardMeta } from "./card-og";

const SITE = "https://digitalcarda.in";
const OG_IMAGE = `${SITE}/og-default.jpg`;
const LOGO = `${SITE}/apple-touch-icon.png`;

export const BLOG_POST_PATH = /^\/blog\/([a-z0-9-]+)$/;

const organization = { "@type": "Organization", "@id": `${SITE}/#organization`, name: "DigitalCarda", url: `${SITE}/`, logo: { "@type": "ImageObject", url: LOGO } };

/** Meta for /blog or a blog article, or null for any other path (or an unknown article). */
export function blogMeta(pathname: string): CardMeta | null {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (clean === BLOG_PATH) {
    const page = seoForPath(BLOG_PATH);
    if (!page) return null;
    const url = `${SITE}${BLOG_PATH}`;
    const blog = {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": `${url}#blog`,
      name: "DigitalCarda Blog",
      url,
      description: page.description,
      inLanguage: "en-IN",
      publisher: organization,
      blogPost: BLOG_POSTS.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE}${blogPostPath(p.slug)}`,
        datePublished: p.publishedAt,
        dateModified: p.updatedAt,
      })),
    };
    return {
      title: page.title, description: page.description,
      image: OG_IMAGE, imageW: 1200, imageH: 630, imageType: "image/jpeg", imageAlt: "DigitalCarda blog — digital visiting card guides",
      url, locale: "en_IN", h1: "Digital visiting card guides",
      jsonLd: JSON.stringify(blog),
      breadcrumbLd: breadcrumbJsonLd(BLOG_PATH) ?? undefined,
    };
  }

  const m = BLOG_POST_PATH.exec(clean);
  if (!m) return null;
  const post = getBlogPost(m[1]);
  if (!post) return null;

  const url = `${SITE}${blogPostPath(post.slug)}`;
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.description,
    image: [OG_IMAGE],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "DigitalCarda Team", url: `${SITE}/` },
    publisher: organization,
    articleSection: categoryLabel(post.category),
    keywords: post.keywords.join(", "),
    wordCount: postWordCount(post),
    inLanguage: "en-IN",
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}${BLOG_PATH}` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  const faq = post.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plainText(f.a) } })),
      }
    : null;

  return {
    title: post.seoTitle,
    description: post.description,
    image: OG_IMAGE, imageW: 1200, imageH: 630, imageType: "image/jpeg", imageAlt: post.title,
    url, ogType: "article", locale: "en_IN", h1: post.title,
    keywords: post.keywords.join(", "),
    article: { publishedTime: post.publishedAt, modifiedTime: post.updatedAt, section: categoryLabel(post.category), tags: post.keywords },
    // The breadcrumb travels inside jsonLd (no element id), so the layout's own
    // breadcrumb handling in the browser leaves it alone.
    jsonLd: JSON.stringify(faq ? [article, breadcrumb, faq] : [article, breadcrumb]),
  };
}
