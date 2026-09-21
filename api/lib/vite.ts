import type { Context, Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { metaFor, injectCardMeta, cardSummaryHtml, type CardMeta } from "./card-og";
import { cardSeo } from "../../src/lib/cardSeo";
import { ogSignature } from "./card-og";
import { blogMeta, BLOG_POST_PATH } from "./blog-meta";
import { industryMeta, INDUSTRY_PATH } from "./industry-meta";
import { getIndustry } from "../../src/data/industries";

type App = Hono<{ Bindings: HttpBindings }>;
const SITE = "https://digitalcarda.in";

// Server-side meta + Product/Breadcrumb JSON-LD for product pages (§50, §52),
// so a product landing page is indexable with structured data even without JS.
// Cached briefly so repeated crawler hits don't re-query the DB every time.
const metaCache = new Map<string, { meta: CardMeta | null; at: number }>();
const META_TTL = 5 * 60_000;

/** Short content hash → cache-busting token for the OG image URL. */
/** A tRPC caller for public procedures, used on the server with no signed-in user. */
async function publicCaller(url: string) {
  const { appRouter } = await import("../router");
  return appRouter.createCaller({ req: new Request(url), resHeaders: new Headers() });
}

async function productMeta(pathname: string, distPath: string): Promise<CardMeta | null> {
  const m = pathname.match(/^\/digital-business-cards-templates\/([^/]+)\/?$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).toLowerCase();
  const hit = metaCache.get(slug);
  if (hit && Date.now() - hit.at < META_TTL) return hit.meta;

  let result: CardMeta | null = null;
  try {
    const { getDb } = await import("../queries/connection");
    const { products } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select().from(products).where(eq(products.slug, slug));
    const p = rows[0];
    if (p && p.status === "published") {
      const url = `${SITE}/digital-business-cards-templates/${slug}`;
      const title = p.seoTitle || `${p.name} — DigitalCarda`;
      const description = p.seoDescription || p.tagline || `${p.name} — try it free for ${p.trialDays} days. No app, no printing.`;
      // OG/Twitter/Merchant need ABSOLUTE image URLs. Product images may be stored
      // as site-relative paths (/products/…) — absolutize them here.
      const abs = (u: string) => (/^https?:/i.test(u) ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`);
      const rawImgs = ((p.images as string[] | null) || []).filter(Boolean);
      const imgs = rawImgs.map(abs);
      // Prefer the 1200×630 og.jpg banner (correct social size) sitting next to the
      // feature image; fall back to the feature image, then the site default.
      let image = imgs[0] || `${SITE}/why-businessman.png`;
      let imageW: number | undefined, imageH: number | undefined, imageType: string | undefined;
      if (rawImgs[0]) {
        const ogRel = rawImgs[0].replace(/[^/]+$/, "og.jpg");
        if (fs.existsSync(path.join(distPath, ogRel))) { image = abs(ogRel); imageW = 1200; imageH = 630; imageType = "image/jpeg"; }
      }
      const price = Number(p.salePrice || p.price).toFixed(2);
      const product = { "@context": "https://schema.org", "@type": "Product", name: p.name, description, brand: { "@type": "Brand", name: "DigitalCarda" }, ...(imgs.length ? { image: imgs } : { image }), offers: { "@type": "Offer", priceCurrency: p.currency || "INR", price, availability: "https://schema.org/InStock", url },
        // Server-rendered aggregateRating — matches ProductDetail.tsx and the
        // "4.9/5 from 1,456+ businesses" rating displayed on the home page.
        // Google Search Console flagged Product schema as missing this field.
        aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "1456", bestRating: "5", worstRating: "1" } };
      const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Digital Business Cards", item: `${SITE}/digital-business-cards-templates` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ] };
      result = { title, description, image, url, ogType: "product", jsonLd: JSON.stringify([product, breadcrumb]), imageW, imageH, imageType, imageAlt: `${p.name} — digital business card`, h1: p.name, locale: "en_IN" };
    }
  } catch { result = null; }
  metaCache.set(slug, { meta: result, at: Date.now() });
  return result;
}

/* /demo/<product> opens a template as a working sample card. It duplicates the
   product page, so it is served with that page as its canonical and kept out of
   the index — before this it had the bare shell title "DigitalCarda" and no
   canonical at all. */
async function demoMeta(pathname: string, distPath: string): Promise<CardMeta | null> {
  const m = pathname.match(/^\/demo\/([^/]+)\/?$/);
  if (!m) return null;
  const product = await productMeta(`/digital-business-cards-templates/${m[1]}`, distPath);
  if (!product) return null;
  return { ...product, title: `${product.h1 ?? product.title} — Live Demo | DigitalCarda`, robots: "noindex, follow", jsonLd: undefined, h1: `${product.h1 ?? product.title} — live demo card` };
}

// Per-card SEO/OG from the owner's PUBLISHED snapshot — so the Meta Title, Meta
// Description and keywords a customer sets in Settings → SEO actually drive their
// public card's <head> and Google listing. Falls back to auto values (name/role)
// for any field left blank. Returns null when there's no snapshot for the slug,
// so marketing pages and legacy-only cards fall through to metaFor(). Cached like
// productMeta so crawler hits don't re-query the DB.
async function cardSnapshotMeta(pathname: string): Promise<CardMeta | null> {
  const m = pathname.match(/^\/(?:c\/)?([^/]+)\/?$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).toLowerCase();
  if (!slug || slug.includes(".")) return null; // skip files like favicon.ico
  const key = `card:${slug}`;
  const hit = metaCache.get(key);
  if (hit && Date.now() - hit.at < META_TTL) return hit.meta;

  let result: CardMeta | null = null;
  try {
    const { getDb } = await import("../queries/connection");
    const { publishedCards } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select({ data: publishedCards.data }).from(publishedCards).where(eq(publishedCards.slug, slug)).limit(1);
    const data = rows[0]?.data as { customer?: Record<string, unknown>; products?: { name?: unknown }[] } | null;
    const cust = data?.customer;
    if (cust) {
      const s = (v: unknown) => String(v ?? "").trim();
      const logo = s(cust.logo);
      const hasImg = /^https?:/i.test(logo);
      // Per-card social preview (their branding + a QR of this card's URL),
      // generated by /og/:slug.png — not the customer's raw logo, which is the
      // wrong shape for a link preview, and never the generic stock photo.
      const image = `${SITE}/og/${encodeURIComponent(slug)}.png?v=${ogSignature(cust, slug)}`;
      const url = `${SITE}/${slug}`;

      // A paused card shows visitors a "temporarily paused" notice, so crawlers
      // must not be handed its full details either — that would be a page saying
      // one thing to people and another to search engines. Ask the same
      // procedure the card page asks. If that check fails, treat the card as
      // paused: the fallback is today's name-only heading, never extra content.
      let paused = true;
      try {
        const state = await (await publicCaller(url)).publish.publicState({ slug });
        paused = !!state?.paused;
      } catch { /* keep paused = true */ }

      // Title, description, structured data and the index decision all come
      // from src/lib/cardSeo.ts — the same rules sitemap.xml and the browser use.
      const seo = cardSeo({ slug, customer: cust, products: Array.isArray(data?.products) ? data.products : [], paused, image: hasImg ? image : undefined });
      result = { title: seo.title, description: seo.description, image, url, jsonLd: seo.jsonLd, breadcrumbLd: seo.breadcrumbLd,
        ogType: "profile", h1: seo.name, locale: "en_IN",
        ...(paused ? {} : { bodyHtml: cardSummaryHtml(seo, cust) }),
        ...(seo.indexable ? {} : { robots: "noindex, follow" }),
        imageW: 1200, imageH: 630, imageType: "image/png", imageAlt: `${seo.name}'s digital business card`,
        ...(seo.keywords ? { keywords: seo.keywords } : {}) };
    }
  } catch { result = null; }
  metaCache.set(key, { meta: result, at: Date.now() });
  return result;
}

/* ── Server rendering for public marketing pages ─────────────────────────────
   The site is a client-rendered React app. Without this, every URL is served
   an empty <div id="root"></div>, so crawlers that don't run JavaScript — and
   link previewers, SEO tools, AI answer engines — got a title and nothing else,
   and even Google only saw the content after its deferred rendering pass.

   These routes are rendered by src/entry-server.tsx (built to dist/server) and
   the browser attaches to that markup instead of rebuilding it.

   Deliberately conservative:
     · an allow-list — dashboard, admin and customer cards are never rendered
       here, only the public pages that are the same for every visitor;
     · any failure (bundle missing, render error, timeout) serves exactly the
       shell every page got before this existed;
     · SSR_PUBLIC=0 in the environment switches it off without a deploy. */
const SSR_ENABLED = process.env.SSR_PUBLIC !== "0";
const SSR_PATHS = new Set([
  "/", "/features", "/pricing", "/industries", "/bulk-cards", "/ai-card-generator",
  "/resellers", "/refer-earn", "/custom-domain", "/contact",
  "/free-tools", "/email-signature-generator", "/email-signature-templates",
  "/whatsapp-message-templates", "/whatsapp-business-messages", "/instagram-bio-templates",
  "/digital-business-cards-templates",
  "/privacy", "/refund-policy", "/shipping-policy", "/terms-of-service", "/sitemap",
  "/blog", "/about",
  // Long-form SEO pages added Sept 2026 — the pillar guide and the /vs/*
  // comparison pages ship as static content, so SSR gives them crawler-visible
  // HTML on the first byte.
  "/digital-business-card-guide",
]);
const PRODUCT_PATH = /^\/digital-business-cards-templates\/([^/]+)$/;
// City pages (/digital-visiting-card/<slug>) and comparison pages (/vs/<slug>)
// are matched by regex so any new city or competitor added to
// src/data/cities.ts or src/data/comparisons.ts gets SSR automatically.
const CITY_PATH = /^\/digital-visiting-card\/([a-z0-9-]+)$/;
const VS_PATH = /^\/vs\/([a-z0-9-]+)$/;
const SSR_DATA_TIMEOUT_MS = 2500;
const SSR_RENDER_TIMEOUT_MS = 4500;

type SsrSeed = { path: string; input?: unknown; data: unknown };
type SsrModule = {
  render: (url: string, seeds: SsrSeed[]) => Promise<{ html: string; state: string }>;
  renderBlogCoverSvg?: (cover: unknown) => string;
};

let ssrModule: Promise<SsrModule | null> | undefined;
function loadSsr(): Promise<SsrModule | null> {
  return (ssrModule ??= (async () => {
    for (const file of ["../dist/server/entry-server.js", "../dist/server/entry-server.mjs"]) {
      const p = path.resolve(import.meta.dirname, file);
      if (!fs.existsSync(p)) continue;
      try {
        return (await import(pathToFileURL(p).href)) as SsrModule;
      } catch (e) {
        console.error("[ssr] could not load the server bundle — serving client-rendered pages:", (e as Error).message);
        return null;
      }
    }
    console.warn("[ssr] no server bundle in dist/server — serving client-rendered pages");
    return null;
  })());
}

/** A blog cover as SVG markup, drawn by the page's own component in the server
    bundle; null when that bundle isn't available (e.g. the dev server). */
export async function blogCoverSvg(cover: unknown): Promise<string | null> {
  const mod = await loadSsr();
  try { return mod?.renderBlogCoverSvg ? mod.renderBlogCoverSvg(cover) : null; } catch { return null; }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, reject) => { t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms); }),
  ]);
}

/** The API data each page reads on its first render. Inputs must match the
    page's own useQuery call exactly, or it misses the cache and shows its
    loading state instead of the content. A failed fetch is simply left out. */
async function ssrSeeds(clean: string): Promise<SsrSeed[]> {
  const caller = await publicCaller(`${SITE}${clean}`);
  const jobs: Promise<SsrSeed | null>[] = [];
  const seed = (procPath: string, input: unknown, run: () => Promise<unknown>) =>
    jobs.push(run().then((data) => ({ path: procPath, input, data }), () => null));

  const product = clean.match(PRODUCT_PATH);
  // The industry hub and every industry page show template designs from the
  // catalogue (the same call, no input), so the tiles are in the server HTML.
  if (clean === "/" || clean === "/digital-business-cards-templates" || clean === "/sitemap" || product
    || clean === "/industries" || INDUSTRY_PATH.test(clean)) {
    seed("product.catalogue", undefined, () => caller.product.catalogue());
  }
  if (product) {
    const slug = decodeURIComponent(product[1]);
    seed("product.bySlug", { slug }, () => caller.product.bySlug({ slug }));
  }
  if (clean === "/pricing") {
    seed("package.features", undefined, () => caller.package.features());
    seed("package.list", undefined, () => caller.package.list());
  }
  if (clean === "/refer-earn") seed("referral.publicRates", undefined, () => caller.referral.publicRates());

  return (await Promise.all(jobs)).filter((x): x is SsrSeed => x !== null);
}

async function renderPublic(clean: string, href: string): Promise<{ html: string; state: string } | null> {
  const mod = await loadSsr();
  if (!mod) return null;
  try {
    const seeds = await withTimeout(ssrSeeds(clean), SSR_DATA_TIMEOUT_MS, "data").catch(() => [] as SsrSeed[]);
    return await withTimeout(mod.render(href, seeds), SSR_RENDER_TIMEOUT_MS, "render");
  } catch (e) {
    console.error(`[ssr] ${clean} fell back to client rendering: ${(e as Error).message}`);
    return null;
  }
}

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");
  // Read the shell once (it only changes on deploy) instead of per request.
  let indexShell = "";
  const readShell = () => (indexShell ||= fs.readFileSync(indexPath, "utf-8"));

  // Cache the fully-injected HTML per URL so repeat crawler/visitor hits skip the
  // meta build + render work (origin TTFB drops from ~200ms to ~few ms). Bounded
  // and short-lived so content stays fresh.
  const htmlCache = new Map<string, { html: string; at: number }>();
  const HTML_TTL = 5 * 60_000;
  const EDGE_CACHE = "public, max-age=0, s-maxage=120, stale-while-revalidate=600";

  // Serve index.html with per-page OG/meta + JSON-LD injected (marketing pages,
  // cards, products), and the page itself rendered for the public routes above.
  const serveHtml = async (c: Context<{ Bindings: HttpBindings }>) => {
    const reqUrl = new URL(c.req.url);
    const pathname = reqUrl.pathname;
    const clean = pathname.replace(/\/+$/, "") || "/";
    const isBlogPost = BLOG_POST_PATH.test(clean);
    // Any single segment under /industries — decided below: a known page renders,
    // anything else is a real 404. Not decoded: valid slugs have no escapes, and
    // decodeURIComponent can throw.
    const industryMatch = INDUSTRY_PATH.exec(clean);
    const ssrWanted = SSR_ENABLED && (SSR_PATHS.has(clean) || PRODUCT_PATH.test(clean) || isBlogPost || !!industryMatch || CITY_PATH.test(clean) || VS_PATH.test(clean));
    // /industries/Doctors → /industries/doctors: one URL per page, so a pasted
    // link with a capital never becomes a second, non-indexable copy. Only when
    // the lowercase form is a real page; other spellings fall through to 404.
    if (industryMatch) {
      const lower = industryMatch[1].toLowerCase();
      if (lower !== industryMatch[1] && getIndustry(lower)) return c.redirect(`/industries/${lower}${reqUrl.search}`, 301);
    }
    // Rendered markup can depend on the query string, so it's part of the key
    // for rendered routes; head-only pages ignore it, as before. The industry
    // pages read nothing from it and the hub only `group`, so a shared link's
    // tracking parameters (utm_*, fbclid) are dropped here: they would
    // otherwise render and cache a ~0.5 MB copy per distinct query string.
    let search = reqUrl.search;
    if (industryMatch) search = "";
    else if (clean === "/industries") {
      const group = reqUrl.searchParams.get("group");
      search = group ? `?group=${encodeURIComponent(group)}` : "";
    }
    const cacheKey = ssrWanted ? pathname + search : pathname;

    const hit = htmlCache.get(cacheKey);
    if (hit && Date.now() - hit.at < HTML_TTL) {
      c.header("Cache-Control", EDGE_CACHE);
      return c.html(hit.html);
    }
    let content = readShell();
    let cacheable = false;
    let status: 200 | 404 = 200;
    try {
      // The blog and the industry pages are checked first: their paths are ours,
      // so a customer card that happened to use the slug "blog" or "industries"
      // can never take over those pages' <head>. (The hub used to reach
      // cardSnapshotMeta before metaFor, so a card named "industries" could.)
      const meta = blogMeta(pathname) || industryMeta(pathname) || (await productMeta(pathname, distPath)) || (await demoMeta(pathname, distPath))
        || (await cardSnapshotMeta(pathname)) || metaFor(pathname, distPath);
      // Soft-404 guard: render a product page only when that product exists.
      // Otherwise an unknown slug would come back as a 200 with a full "not
      // found" page — which search engines index as a real, thin page.
      const productOk = !PRODUCT_PATH.test(clean) || meta?.ogType === "product";
      // Same for articles: an unknown /blog/<slug> is a real 404, not a thin page.
      const blogOk = !isBlogPost || meta?.ogType === "article";
      // And for /industries/<slug>: the data decides (exact slug), not og:type,
      // because industry pages are ordinary "website" pages.
      const industryOk = !industryMatch || !!getIndustry(industryMatch[1]);
      if (!blogOk || !industryOk) status = 404;
      const ssr = ssrWanted && productOk && blogOk && industryOk ? await renderPublic(clean, pathname + search) : null;

      // With rendered markup the page has its real <h1>; the hidden placeholder
      // heading is only for pages that still arrive empty.
      if (meta) { content = injectCardMeta(content, ssr ? { ...meta, h1: undefined, bodyHtml: undefined } : meta); cacheable = true; }
      // A URL nothing recognises — not a page, product, article or card — still
      // gets the app shell (the app shows its own "not found" screen), but it must
      // not be indexed: a 200 with a generic title is what Google reports as a
      // soft 404, and every mistyped link would otherwise become a thin page.
      else content = content.replace("</head>", () => `    <meta name="robots" content="noindex">\n  </head>`);
      // A customer's card saved to a home screen should open that card, not the
      // DigitalCarda dashboard app the manifest describes.
      if (meta?.ogType === "profile") content = content.replace(/<link rel="manifest"[^>]*>\s*/, "");
      if (ssr) {
        // The data lives in a JSON <script> OUTSIDE #root, so it isn't part of
        // what React hydrates. `<` is escaped so no value can close the tag.
        content = content.replace(/<div id="root">\s*<\/div>/, () =>
          `<div id="root" data-ssr="1">${ssr.html}</div>\n    <script type="application/json" id="__dc_rq">${ssr.state.replace(/</g, "\\u003c")}</script>`);
      }
    } catch { /* fall back to plain index.html */ }
    // Only cache real pages (meta matched); never cache arbitrary 404 paths.
    if (cacheable) {
      if (htmlCache.size > 500) htmlCache.clear();
      htmlCache.set(cacheKey, { html: content, at: Date.now() });
      // Let a CDN edge-cache the (public, non-personalised) page for 2 min while
      // keeping browsers revalidating. With a Cloudflare "Eligible for cache" rule
      // this makes crawler/social TTFB ~edge speed globally; a no-op without it.
      c.header("Cache-Control", EDGE_CACHE);
    }
    return c.html(content, status);
  };

  // The homepage would otherwise be served as a raw file by serveStatic, so
  // handle it first to inject meta.
  app.get("/", serveHtml);

  // The service worker, at an address without a file extension: Cloudflare
  // edge-caches *.js and stretches its browser cache to hours, which would
  // delay a worker update (or its off switch) that long. This path passes
  // straight through, like the manifest.
  app.get("/service-worker", (c) => {
    let js = "";
    try { js = fs.readFileSync(path.resolve(distPath, "sw.js"), "utf-8"); } catch { return c.notFound(); }
    c.header("Content-Type", "text/javascript; charset=utf-8");
    c.header("Cache-Control", "no-cache");
    c.header("Service-Worker-Allowed", "/");
    return c.body(js);
  });

  // Vite content-hashes every build asset under /assets/, so its contents can
  // never change under a given URL — cache them for a year (immutable). This is
  // the biggest safe perf win for repeat visits + Core Web Vitals (Phase 32).
  app.use("/assets/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  });
  // Un-hashed public images/fonts change rarely → a 1-day cache. HTML and the
  // JSON data files are deliberately left uncached so content stays fresh.
  app.use("*", async (c, next) => {
    await next();
    if (c.res.headers.get("cache-control")) return;
    // Only cache SUCCESSFUL asset responses — never a 404, or a missing file's
    // error page gets cached by the CDN for a day (e.g. /favicon.ico before it existed).
    if (c.res.status === 200 && /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|mp4)$/i.test(new URL(c.req.url).pathname)) {
      c.header("Cache-Control", "public, max-age=86400");
    }
  });
  // The service worker and manifest must be re-checked on every visit, or a
  // fix to either could sit in browser/CDN caches for hours.
  app.use("*", async (c, next) => {
    await next();
    const p = new URL(c.req.url).pathname;
    if (p === "/sw.js" || p === "/site.webmanifest" || p === "/offline.html") c.header("Cache-Control", "no-cache");
    if (p === "/site.webmanifest") c.header("Content-Type", "application/manifest+json");
  });
  app.use("*", serveStatic({ root: "./dist/public" }));
  app.notFound((c) => {
    const pathname = new URL(c.req.url).pathname;
    // Serve the SPA HTML (with OG/meta injected) for any page-like GET — no file
    // extension, not an /api/ path — REGARDLESS of the Accept header, so social
    // crawlers (WhatsApp, Facebook, LinkedIn, Telegram) that send "Accept: */*"
    // still get the preview tags. Only asset misses / API paths return JSON 404.
    if (c.req.method === "GET" && !pathname.startsWith("/api/") && !/\.[a-z0-9]+$/i.test(pathname)) {
      return serveHtml(c);
    }
    return c.json({ error: "Not Found" }, 404);
  });
}
