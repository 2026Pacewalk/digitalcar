import type { Context, Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { metaFor, injectCardMeta, type CardMeta } from "./card-og";

type App = Hono<{ Bindings: HttpBindings }>;
const SITE = "https://digitalcarda.in";

// Server-side meta + Product/Breadcrumb JSON-LD for product pages (§50, §52),
// so a product landing page is indexable with structured data even without JS.
// Cached briefly so repeated crawler hits don't re-query the DB every time.
const metaCache = new Map<string, { meta: CardMeta | null; at: number }>();
const META_TTL = 5 * 60_000;

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
      const product = { "@context": "https://schema.org", "@type": "Product", name: p.name, description, brand: { "@type": "Brand", name: "DigitalCarda" }, ...(imgs.length ? { image: imgs } : { image }), offers: { "@type": "Offer", priceCurrency: p.currency || "INR", price, availability: "https://schema.org/InStock", url } };
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

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");
  // Read the shell once (it only changes on deploy) instead of per request.
  let indexShell = "";
  const readShell = () => (indexShell ||= fs.readFileSync(indexPath, "utf-8"));

  // Cache the fully-injected HTML per URL so repeat crawler/visitor hits skip the
  // meta build + string work (origin TTFB drops from ~200ms to ~few ms). Bounded
  // and short-lived so content stays fresh.
  const htmlCache = new Map<string, { html: string; at: number }>();
  const HTML_TTL = 5 * 60_000;

  // Serve index.html with per-page OG/meta + JSON-LD injected (marketing pages,
  // cards, products) so social shares and crawlers get proper previews + schema.
  const serveHtml = async (c: Context<{ Bindings: HttpBindings }>) => {
    const pathname = new URL(c.req.url).pathname;
    const hit = htmlCache.get(pathname);
    if (hit && Date.now() - hit.at < HTML_TTL) return c.html(hit.html);
    let content = readShell();
    let cacheable = false;
    try {
      const meta = (await productMeta(pathname, distPath)) || metaFor(pathname, distPath);
      if (meta) { content = injectCardMeta(content, meta); cacheable = true; }
    } catch { /* fall back to plain index.html */ }
    // Only cache real pages (meta matched); never cache arbitrary 404 paths.
    if (cacheable) {
      if (htmlCache.size > 500) htmlCache.clear();
      htmlCache.set(pathname, { html: content, at: Date.now() });
    }
    return c.html(content);
  };

  // The homepage would otherwise be served as a raw file by serveStatic, so
  // handle it first to inject meta.
  app.get("/", serveHtml);

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
  app.use("*", serveStatic({ root: "./dist/public" }));
  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) return c.json({ error: "Not Found" }, 404);
    return serveHtml(c);
  });
}
