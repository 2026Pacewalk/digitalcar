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
  | { type: "cta"; title: string; text: string; href: string; label: string }
  /** A "Related guide" box pointing to another article, placed where it fits the reading. */
  | { type: "related"; slug: string; note?: string };

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
  /**
   * Optional feature image. Put the file in public/blog/ (e.g. public/blog/nfc-card.jpg)
   * and set src to "/blog/nfc-card.jpg" — letters, numbers, dots, dashes and
   * underscores only, ending .jpg, .jpeg, .png or .webp. A 1600×900 (16:9) image
   * under ~250 KB works best. Keep the subject in the centre: cards show it at
   * 16:9, the article header crops it wider (21:9) on larger screens, and the
   * social preview uses a tall slice from the middle.
   * When set, it replaces the generated cover art on the blog cards, at the top
   * of the article and in the social preview. To change the picture later, save
   * it under a NEW file name and update src, so cached previews refresh.
   * `alt` describes what the picture shows, for Google Images and screen readers.
   */
  image?: { src: string; alt: string; width: number; height: number };
  /** "The short version" box at the top. */
  takeaways: string[];
  /** Paragraphs before the first heading. */
  intro: string[];
  sections: BlogSection[];
  faqs: { q: string; a: string }[];
  /** Slugs of articles to suggest next. */
  related: string[];
};
