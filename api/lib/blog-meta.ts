/*
 * Server-side <head> tags and structured data for the blog.
 *
 *   /blog          → Blog listing every article, BreadcrumbList
 *   /blog/:slug    → BlogPosting, FAQPage (when the article has FAQs), BreadcrumbList,
 *                    og:type article with published/modified times
 *
 * Everything comes from src/data/blog — the same objects the page renders — so
 * the structured data always matches the visible article.
 *
 * Follows Google Search Central's Article guidance: several high-resolution
 * images in 16:9, 4:3 and 1:1; dates with a time zone; the author as an entity
 * with a page about it (/about); and max-image-preview:large so articles can
 * show large images in Discover and AI features.
 */
import { BLOG_PATH, BLOG_POSTS, blogArtPath, blogIndexOgPath, blogOgPath, blogPostPath, categoryLabel, getBlogPost, plainText, postWordCount } from "../../src/data/blog";
import { seoForPath, breadcrumbJsonLd } from "../../src/lib/publicSeo";
import type { CardMeta } from "./card-og";

const SITE = "https://digitalcarda.in";
const LOGO = `${SITE}/apple-touch-icon.png`;

export const BLOG_POST_PATH = /^\/blog\/([a-z0-9-]+)$/;

/** Indexable, with full-size image previews and unrestricted snippets. */
const ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

/** An owner-chosen calendar date (YYYY-MM-DD) as a full timestamp in India time,
    so Google doesn't read it in its own time zone and shift the day. */
const istDate = (day: string) => `${day}T09:00:00+05:30`;

const organization = {
  "@type": "Organization", "@id": `${SITE}/#organization`, name: "DigitalCarda", url: `${SITE}/`,
  logo: { "@type": "ImageObject", url: LOGO },
};
/** The team that writes the guides — the same organization, described on /about. */
const author = { "@type": "Organization", "@id": `${SITE}/#organization`, name: "DigitalCarda", url: `${SITE}/about` };

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
        image: `${SITE}${blogArtPath(p, "16x9")}`,
        datePublished: istDate(p.publishedAt),
        dateModified: istDate(p.updatedAt),
        author,
      })),
    };
    return {
      title: page.title, description: page.description,
      image: `${SITE}${blogIndexOgPath()}`, imageW: 1200, imageH: 630, imageType: "image/jpeg", imageAlt: "DigitalCarda blog — digital visiting card guides",
      url, locale: "en_IN", h1: "Digital visiting card guides", robots: ROBOTS,
      jsonLd: JSON.stringify(blog),
      breadcrumbLd: breadcrumbJsonLd(BLOG_PATH) ?? undefined,
    };
  }

  const m = BLOG_POST_PATH.exec(clean);
  if (!m) return null;
  const post = getBlogPost(m[1]);
  if (!post) return null;

  const url = `${SITE}${blogPostPath(post.slug)}`;
  const images = [
    ...(post.image ? [`${SITE}${post.image.src}`] : []),
    `${SITE}${blogArtPath(post, "16x9")}`,
    `${SITE}${blogArtPath(post, "4x3")}`,
    `${SITE}${blogArtPath(post, "1x1")}`,
  ];
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.description,
    image: images,
    datePublished: istDate(post.publishedAt),
    dateModified: istDate(post.updatedAt),
    author,
    publisher: organization,
    articleSection: categoryLabel(post.category),
    wordCount: postWordCount(post),
    inLanguage: "en-IN",
  };
  // Same trail the page shows: Home › Blog › this article.
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}${BLOG_PATH}` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  // Google no longer shows FAQ rich results for most sites, but the questions
  // are on the page and the markup describes them accurately.
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
    image: `${SITE}${blogOgPath(post)}`, imageW: 1200, imageH: 630, imageType: "image/jpeg", imageAlt: post.title,
    url, ogType: "article", locale: "en_IN", h1: post.title, robots: ROBOTS,
    article: { publishedTime: istDate(post.publishedAt), modifiedTime: istDate(post.updatedAt), section: categoryLabel(post.category), tags: [categoryLabel(post.category)] },
    // The breadcrumb travels inside jsonLd (no element id), so the layout's own
    // breadcrumb handling in the browser leaves it alone.
    jsonLd: JSON.stringify(faq ? [article, breadcrumb, faq] : [article, breadcrumb]),
  };
}
