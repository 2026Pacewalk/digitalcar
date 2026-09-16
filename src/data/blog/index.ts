/* The DigitalCarda blog: every article, newest first, plus the helpers the
   pages, the server and the sitemap share.

   Adding an article: write it in ./posts, add it to POSTS below. The page,
   <head> tags, structured data, sitemap entry and "related" links all follow.

   Import-free apart from its own data files, so the server bundle can use it. */
import type { BlogBlock, BlogCategoryId, BlogPost } from "./types";
import { whatIsADigitalVisitingCard } from "./posts/what-is-a-digital-visiting-card";
import { howToMakeADigitalVisitingCard } from "./posts/how-to-make-a-digital-visiting-card";
import { nfcBusinessCardIndia } from "./posts/nfc-business-card-india";
import { googleReviewQrCode } from "./posts/google-review-qr-code";
import { visitingCardDesignIdeas } from "./posts/visiting-card-design-ideas";
import { digitalVisitingCardForDoctors } from "./posts/digital-visiting-card-for-doctors";
import { qrCodeBusinessCardVcard } from "./posts/qr-code-business-card-vcard";
import { linkInBioVsDigitalBusinessCard } from "./posts/link-in-bio-vs-digital-business-card";

export type { BlogBlock, BlogCategoryId, BlogPost, BlogSection, BlogCover } from "./types";

export const BLOG_PATH = "/blog";

export const BLOG_CATEGORIES: { id: BlogCategoryId; label: string; blurb: string }[] = [
  { id: "guides", label: "Getting started", blurb: "Digital visiting cards, explained simply" },
  { id: "nfc-qr", label: "NFC & QR codes", blurb: "Tap, scan and save — how sharing works" },
  { id: "grow", label: "Grow your business", blurb: "Reviews, enquiries and more customers" },
  { id: "design", label: "Design", blurb: "Cards people remember" },
  { id: "industries", label: "By profession", blurb: "What to put on a card for your line of work" },
];

/** Every article. The blog lists them newest first (the newest is featured). */
const ALL_POSTS: BlogPost[] = [
  howToMakeADigitalVisitingCard,
  nfcBusinessCardIndia,
  googleReviewQrCode,
  whatIsADigitalVisitingCard,
  qrCodeBusinessCardVcard,
  visitingCardDesignIdeas,
  digitalVisitingCardForDoctors,
  linkInBioVsDigitalBusinessCard,
];

// ISO dates sort as text; the slug breaks ties so the order never varies.
const POSTS: BlogPost[] = [...ALL_POSTS].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));

export const BLOG_POSTS: readonly BlogPost[] = POSTS;

export const blogPostPath = (slug: string) => `${BLOG_PATH}/${slug}`;

export function getBlogPost(slug: string): BlogPost | null {
  const s = String(slug || "").toLowerCase();
  return POSTS.find((p) => p.slug === s) ?? null;
}

export const categoryLabel = (id: BlogCategoryId) => BLOG_CATEGORIES.find((c) => c.id === id)?.label ?? "Guides";

/** Text with the inline marks (**bold**, [label](href)) reduced to plain words. */
export const plainText = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function blockText(b: BlogBlock): string[] {
  switch (b.type) {
    case "p": case "h3": case "quote": return [b.text];
    case "ul": case "checklist": return b.items;
    case "steps": return b.items.flatMap((i) => [i.title, i.text]);
    case "tip": return [b.title, b.text];
    case "table": return [b.caption ?? "", ...b.head, ...b.rows.flat()];
    case "cta": return [b.title, b.text];
    case "related": return b.note ? [b.note] : [];
  }
}

/** Every word a reader sees in the article body (for reading time and wordCount). */
export function postWordCount(post: BlogPost): number {
  const parts = [
    post.title, ...post.takeaways, ...post.intro,
    ...post.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap(blockText)]),
    ...post.faqs.flatMap((f) => [f.q, f.a]),
  ];
  return plainText(parts.join(" ")).split(/\s+/).filter(Boolean).length;
}

/** Minutes at an easy 200 words a minute, never less than 1. */
export const readingMinutes = (post: BlogPost) => Math.max(1, Math.round(postWordCount(post) / 200));

/** "16 Sept 2026" — fixed format so the server and the browser render the same text. */
export function formatBlogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  return `${d} ${months[(m || 1) - 1]} ${y}`;
}

/** Short, stable hash for cache-busting tokens. */
function hash36(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

/** Path of an article's social preview image (rendered by the server, see
    api/lib/blog-og.ts). The ?v= token is built from everything drawn on the
    image, so WhatsApp, Facebook and CDN caches fetch a new one after any edit.
    (A replaced feature image must get a new file name — see BlogPost.image.) */
export function blogOgPath(post: BlogPost): string {
  const drawn = [post.seoTitle, categoryLabel(post.category), post.cover.motif, post.cover.tone, post.image?.src ?? "", readingMinutes(post)];
  return `/og/blog/${post.slug}.jpg?v=${hash36(drawn.join("|"))}`;
}

export type BlogArtRatio = "16x9" | "4x3" | "1x1";
export const BLOG_ART_SIZES: Record<BlogArtRatio, { width: number; height: number }> = {
  "16x9": { width: 1200, height: 675 },
  "4x3": { width: 1200, height: 900 },
  "1x1": { width: 1200, height: 1200 },
};

/** An article's picture without any text — its feature image or cover art —
    at one of the aspect ratios Google asks for in Article structured data.
    Also the crawlable <img> at the top of the article. */
export function blogArtPath(post: BlogPost, ratio: BlogArtRatio): string {
  const drawn = [post.cover.motif, post.cover.tone, post.image?.src ?? ""];
  return `/og/blog/${post.slug}-${ratio}.jpg?v=${hash36(drawn.join("|"))}`;
}

/** The blog page's own social preview image: the guide count and the newest
    article's artwork are drawn on it, so both are part of its token. */
export function blogIndexOgPath(): string {
  const newest = POSTS[0];
  const drawn = [POSTS.length, newest?.slug ?? "", newest?.cover.motif ?? "", newest?.cover.tone ?? "", newest?.image?.src ?? ""];
  return `/og/blog/index.jpg?v=${hash36(drawn.join("|"))}`;
}

/** Suggested next reads: the article's own picks, then others from its category. */
export function relatedPosts(post: BlogPost, count = 3): BlogPost[] {
  const picked = post.related.map(getBlogPost).filter((p): p is BlogPost => !!p && p.slug !== post.slug);
  const fill = POSTS.filter((p) => p.slug !== post.slug && !picked.includes(p) && p.category === post.category);
  const rest = POSTS.filter((p) => p.slug !== post.slug && !picked.includes(p) && !fill.includes(p));
  return [...picked, ...fill, ...rest].slice(0, count);
}
