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

const OG_IMAGE = `${SITE}/why-businessman.png`;

// Per-page SEO/OG for the marketing site.
const MARKETING: Record<string, { title: string; description: string }> = {
  "/": { title: "DigitalCarda — AI-Powered Digital Business Cards", description: "Create a stunning digital business card with QR sharing, lead capture, payment links and analytics. Start your free 7-day trial." },
  "/features": { title: "Features — DigitalCarda", description: "QR & WhatsApp sharing, lead capture, mini-CRM, analytics, payments and custom branding — everything to turn a shared card into a customer." },
  "/pricing": { title: "Pricing — DigitalCarda", description: "Simple plans for individuals, professionals, teams and resellers. Start free, upgrade anytime." },
  "/templates": { title: "Card Templates — DigitalCarda", description: "Beautiful, professional digital card templates for every industry." },
  "/industries": { title: "Solutions by Industry — DigitalCarda", description: "Digital cards built for real estate, finance, healthcare, consultants and more." },
  "/bulk-cards": { title: "Bulk Cards for Teams — DigitalCarda", description: "Create and manage digital business cards for your whole team from one dashboard." },
  "/ai-card-generator": { title: "AI Card Generator — DigitalCarda", description: "Let AI write your headline, about and services and build your card in minutes." },
  "/resellers": { title: "Become a Reseller — DigitalCarda", description: "Partner with DigitalCarda: manage customers, earn commissions and grow your agency." },
  "/refer-earn": { title: "Refer & Earn — DigitalCarda", description: "Invite others to DigitalCarda and earn rewards to your wallet." },
  "/custom-domain": { title: "Custom Domain — DigitalCarda", description: "Put your digital card on your own branded domain." },
  "/contact": { title: "Contact — DigitalCarda", description: "Get in touch with the DigitalCarda team." },
};

/** Meta for any public page — marketing routes or a customer card. */
export function metaFor(pathname: string, distPath: string): CardMeta | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const mk = MARKETING[clean];
  if (mk) return { ...mk, image: OG_IMAGE, url: `${SITE}${clean === "/" ? "" : clean}` };
  return cardMetaFor(pathname, distPath);
}

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
