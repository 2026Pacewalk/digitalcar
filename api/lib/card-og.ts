/*
 * Server-side Open Graph / meta injection for public cards. When a card URL
 * (/c/<slug> or /<slug>) is requested, we inject per-card <title> + OG/Twitter
 * tags into index.html so shares on WhatsApp / Facebook / X / LinkedIn show the
 * person's name, role and logo instead of a blank DigitalCarda link.
 *
 * Pure functions + a cached file read — no framework deps, so it's unit-testable.
 */
import fs from "fs";
import path from "path";

const SITE = "https://digitalcarda.in";
const IMG_BASE = process.env.VITE_IMG_BASE || "https://digitalcarda.in/otdo-panel/uploads";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

type Row = { slug?: string; name?: string; designation?: string; company_name?: string; about_us?: string; logo?: string };

let cache: Row[] | null = null;
let cacheAt = 0;
function customers(distPath: string): Row[] {
  const now = Date.now();
  if (cache && now - cacheAt < 60_000) return cache;
  for (const p of [path.resolve(distPath, "customers.json"), path.resolve("./public/customers.json")]) {
    try { cache = JSON.parse(fs.readFileSync(p, "utf-8")); cacheAt = now; return cache!; } catch { /* try next */ }
  }
  return cache ?? [];
}

export interface CardMeta { title: string; description: string; image: string; url: string }

/** Returns OG meta for a card path, or null if the path isn't a known card. */
export function cardMetaFor(pathname: string, distPath: string): CardMeta | null {
  const m = pathname.match(/^\/(?:c\/)?([^/]+)\/?$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).toLowerCase();
  if (!slug || slug.includes(".")) return null; // skip files like favicon.ico
  const row = customers(distPath).find((x) => String(x.slug || "").toLowerCase() === slug);
  if (!row) return null;

  const name = String(row.name || slug).trim();
  const title = `${name}${row.company_name ? " · " + row.company_name : ""} — DigitalCarda`;
  const description = (row.designation
    ? `${row.designation}${row.company_name ? " at " + row.company_name : ""}`
    : String(row.about_us || "").replace(/<[^>]*>/g, "").slice(0, 150)) || "View my digital business card.";
  const logo = String(row.logo || "");
  const image = logo ? (/^https?:/.test(logo) ? logo : `${IMG_BASE}/home/${encodeURIComponent(logo)}`) : `${SITE}/why-businessman.png`;
  return { title, description, image, url: `${SITE}/c/${slug}` };
}

/** Inject the meta into an index.html string. */
export function injectCardMeta(html: string, meta: CardMeta): string {
  const tags = [
    `<meta name="description" content="${esc(meta.description)}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="DigitalCarda">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:image" content="${esc(meta.image)}">`,
    `<meta property="og:url" content="${esc(meta.url)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${esc(meta.image)}">`,
  ].join("\n    ");
  return html
    .replace(/<title>.*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace("</head>", `    ${tags}\n  </head>`);
}
