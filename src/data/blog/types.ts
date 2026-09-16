/* The shape of a DigitalCarda blog article.

   Articles are plain TypeScript data, not Markdown or HTML: the same objects
   render the page (src/pages/public/BlogPost.tsx), feed the server its <head>
   tags and BlogPosting/FAQPage structured data (api/lib/vite.ts), and list
   every URL in sitemap.xml — so none of those can drift from the article.

   Import-free (types only) so the server bundle can use it directly.

   Inline text supports two marks, nothing else:
     **bold**            → <strong>
     [label](/path)      → a link (site paths stay in the app; https:// opens a new tab) */

export type BlogCategoryId = "guides" | "nfc-qr" | "grow" | "industries" | "design";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "checklist"; items: string[] }
  /** Numbered, titled steps — for how-to sections. */
  | { type: "steps"; items: { title: string; text: string }[] }
  /** A helpful aside. `warn` is for mistakes to avoid. */
  | { type: "tip"; tone?: "tip" | "warn"; title: string; text: string }
  | { type: "quote"; text: string }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  /** An in-article call to action. */
  | { type: "cta"; title: string; text: string; href: string; label: string };

export type BlogSection = { id: string; heading: string; blocks: BlogBlock[] };

/** Art direction for the generated cover — no stock photos. */
export type BlogCover = {
  motif: "card" | "nfc" | "qr" | "stars" | "steps" | "clinic" | "palette" | "links";
  tone: "gold" | "navy" | "teal" | "violet" | "rose" | "emerald";
};

export type BlogPost = {
  slug: string;
  /** The on-page H1. */
  title: string;
  /** <title>, ≤ 60 characters. */
  seoTitle: string;
  /** Meta description, ≤ 155 characters. */
  description: string;
  /** One or two sentences for the article list. */
  excerpt: string;
  category: BlogCategoryId;
  /** Search terms the article is written for — primary first. */
  keywords: string[];
  /** ISO dates (YYYY-MM-DD). */
  publishedAt: string;
  updatedAt: string;
  cover: BlogCover;
  /** "The short version" box at the top. */
  takeaways: string[];
  /** Paragraphs before the first heading. */
  intro: string[];
  sections: BlogSection[];
  faqs: { q: string; a: string }[];
  /** Slugs of articles to suggest next. */
  related: string[];
};
