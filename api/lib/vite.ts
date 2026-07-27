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
async function productMeta(pathname: string): Promise<CardMeta | null> {
  const m = pathname.match(/^\/digital-business-cards\/([^/]+)\/?$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).toLowerCase();
  try {
    const { getDb } = await import("../queries/connection");
    const { products } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select().from(products).where(eq(products.slug, slug));
    const p = rows[0];
    if (!p || p.status !== "published") return null;
    const url = `${SITE}/digital-business-cards/${slug}`;
    const title = p.seoTitle || `${p.name} — DigitalCarda`;
    const description = p.seoDescription || p.tagline || `${p.name} — try it free for ${p.trialDays} days. No app, no printing.`;
    const image = ((p.images as string[] | null)?.[0]) || `${SITE}/why-businessman.png`;
    const price = Number(p.salePrice || p.price).toFixed(2);
    const product = { "@context": "https://schema.org", "@type": "Product", name: p.name, description, brand: { "@type": "Brand", name: "DigitalCarda" }, ...(image ? { image } : {}), offers: { "@type": "Offer", priceCurrency: p.currency || "INR", price, availability: "https://schema.org/InStock", url } };
    const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Digital Business Cards", item: `${SITE}/digital-business-cards` },
      { "@type": "ListItem", position: 3, name: p.name, item: url },
    ] };
    return { title, description, image, url, ogType: "product", jsonLd: JSON.stringify([product, breadcrumb]) };
  } catch { return null; }
}

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");

  // Serve index.html with per-page OG/meta + JSON-LD injected (marketing pages,
  // cards, products) so social shares and crawlers get proper previews + schema.
  const serveHtml = async (c: Context<{ Bindings: HttpBindings }>) => {
    let content = fs.readFileSync(indexPath, "utf-8");
    try {
      const pathname = new URL(c.req.url).pathname;
      const meta = (await productMeta(pathname)) || metaFor(pathname, distPath);
      if (meta) content = injectCardMeta(content, meta);
    } catch { /* fall back to plain index.html */ }
    return c.html(content);
  };

  // The homepage would otherwise be served as a raw file by serveStatic, so
  // handle it first to inject meta.
  app.get("/", serveHtml);
  app.use("*", serveStatic({ root: "./dist/public" }));
  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) return c.json({ error: "Not Found" }, 404);
    return serveHtml(c);
  });
}
