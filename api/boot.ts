import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { verifyToken } from "./lib/jwt";

const app = new Hono<{ Bindings: HttpBindings }>();

async function requireSuperAdmin(c: { req: { header: (k: string) => string | undefined } }) {
  const token = c.req.header("x-auth-token") || c.req.header("authorization")?.replace("Bearer ", "");
  const payload = token ? await verifyToken(token) : null;
  return payload?.role === "super_admin" ? payload : null;
}

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Public enquiry capture for the legacy (customers.json) cards — stores the lead
// when the slug maps to a known card, and always emails the owner.
app.post("/api/enquiry", async (c) => {
  try {
    const body = await c.req.json<{ slug?: string; name?: string; contact?: string; email?: string; description?: string }>();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!name) return c.json({ ok: false, error: "Name required" }, 400);

    // Best-effort DB storage (only if the slug maps to a card).
    try {
      const { getDb } = await import("./queries/connection");
      const { cards, leads, publishedCards, cardEvents } = await import("@db/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = getDb();
      const card = await db.query.cards.findFirst({ where: eq(cards.slug, slug) });
      if (card) {
        await db.insert(leads).values({
          cardId: card.id, userId: card.userId, fullName: name,
          email: body.email || null, phone: body.contact || null,
          message: body.description || null, source: "card",
        });
        await db.update(cards).set({ leadCount: sql`${cards.leadCount} + 1` }).where(eq(cards.id, card.id));
      } else {
        // New-flow snapshot card: resolve the owner by slug and store the lead
        // (no DB card row, so cardId is null) — it still shows in their CRM.
        const pc = await db.select({ userId: publishedCards.userId }).from(publishedCards).where(eq(publishedCards.slug, slug));
        if (pc[0]) {
          await db.insert(leads).values({
            userId: pc[0].userId, fullName: name,
            email: body.email || null, phone: body.contact || null,
            message: body.description || null, source: "card",
          });
          db.insert(cardEvents).values({ slug, type: "enquiry" }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("[enquiry] DB store skipped:", (e as Error).message);
    }

    const { sendLeadNotification } = await import("./lib/mail");
    await sendLeadNotification({ name, email: body.email, contact: body.contact, message: body.description, slug });
    return c.json({ ok: true });
  } catch (e) {
    console.error("[enquiry] error:", (e as Error).message);
    return c.json({ ok: false }, 500);
  }
});

// Daily trial FOMO emailer — trigger from a cron: POST with ?key=CRON_SECRET
app.post("/api/cron/trial-emails", async (c) => {
  const key = c.req.query("key") || c.req.header("x-cron-key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { runTrialEmails } = await import("./cron/trial-emails");
    return c.json({ ok: true, ...(await runTrialEmails()) });
  } catch (e) {
    console.error("[cron] trial-emails error:", (e as Error).message);
    return c.json({ ok: false }, 500);
  }
});

// ─── Sensitive data files: block public access, serve only to super-admins ───
// customers.json has passwords + bank/UPI details; enquiries.json is lead PII.
// Neither may be publicly downloadable.
const SENSITIVE = new Set(["customers", "enquiries"]);

const readPublicJson = async (file: string): Promise<unknown[]> => {
  const { readFile } = await import("node:fs/promises");
  for (const p of [`./dist/public/${file}.json`, `./public/${file}.json`]) {
    try { return JSON.parse(await readFile(p, "utf8")); } catch { /* try next */ }
  }
  return [];
};

app.get("/api/admin/data/:file", async (c) => {
  const file = c.req.param("file");
  if (!SENSITIVE.has(file)) return c.json({ error: "Not found" }, 404);
  if (!(await requireSuperAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
  const { readFile } = await import("node:fs/promises");
  for (const p of [`./dist/public/${file}.json`, `./public/${file}.json`]) {
    try { return c.body(await readFile(p, "utf8"), 200, { "content-type": "application/json" }); } catch { /* try next */ }
  }
  return c.json({ error: "Not found" }, 404);
});

// A customer's OWN leads only — scoped server-side by their card slug(s), so one
// customer can never read another's enquiries (unlike the old public file).
app.get("/api/my/leads", async (c) => {
  const token = c.req.header("x-auth-token") || c.req.header("authorization")?.replace("Bearer ", "");
  const user = token ? await verifyToken(token) : null;
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const email = String(user.email || "").toLowerCase();
  if (!email) return c.json([]);
  const customers = (await readPublicJson("customers")) as { email?: string; slug?: string }[];
  const slugs = new Set(
    customers.filter((x) => String(x.email || "").toLowerCase() === email)
      .map((x) => String(x.slug || "").toLowerCase()).filter(Boolean),
  );
  if (!slugs.size) return c.json([]);
  const enquiries = (await readPublicJson("enquiries")) as { uname?: string }[];
  return c.json(enquiries.filter((e) => slugs.has(String(e.uname || "").toLowerCase())));
});

// The signed-in user's OWN card profile, matched by email (server-side, so the
// sensitive customers.json is never exposed). Used to hydrate the dashboard with
// the real card the user already owns instead of a blank seed. Read-only —
// changes nothing, and keeps the card's real slug (no slug reconciliation here).
app.get("/api/my/card", async (c) => {
  const token = c.req.header("x-auth-token") || c.req.header("authorization")?.replace("Bearer ", "");
  const user = token ? await verifyToken(token) : null;
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const email = String(user.email || "").toLowerCase().trim();
  if (!email) return c.json({ error: "Not found" }, 404);
  const customers = (await readPublicJson("customers")) as Record<string, unknown>[];
  const rows = customers.filter((x) => String(x.email || "").toLowerCase().trim() === email);
  if (!rows.length) return c.json({ error: "Not found" }, 404);
  // If one email owns several cards (rare bulk accounts), pick the most-viewed one.
  const row = rows.sort((a, b) => Number(b.views || 0) - Number(a.views || 0))[0];
  const { password: _p, email_verify_on: _vo, ...pub } = row;
  return c.json(pub);
});

// Public single-card data by slug — returns ONLY what the card publicly
// displays (credentials stripped). Replaces the old bulk customers.json read
// so a public card can render without exposing everyone's data.
app.get("/api/card/:slug", async (c) => {
  const slug = String(c.req.param("slug") || "").toLowerCase();
  if (!slug) return c.json({ error: "Not found" }, 404);
  const customers = (await readPublicJson("customers")) as Record<string, unknown>[];
  const row = customers.find((x) => String(x.slug || "").toLowerCase() === slug);
  if (!row) return c.json({ error: "Not found" }, 404);
  // Strip login/internal fields; the rest (contact, socials, payment display)
  // is exactly what the owner chose to show on their public card.
  const { password: _p, email_verify: _v, email_verify_on: _vo, ...pub } = row;
  return c.json(pub);
});

// Real engagement analytics: the public card beacons here on view + every
// action tap (call/whatsapp/email/website/directions/save-contact). Slug-keyed
// so it works for snapshot AND legacy cards. Numbers are always real (§36).
const TRACK_TYPES = ["view", "call", "whatsapp", "email", "website", "directions", "save_contact", "qr_scan", "product", "share", "social", "enquiry"];
app.post("/api/track", async (c) => {
  try {
    let body: { slug?: string; type?: string } | null = null;
    try { body = await c.req.json(); } catch { try { body = JSON.parse(await c.req.text()); } catch { body = null; } }
    const slug = String(body?.slug || "").slice(0, 191).toLowerCase();
    const type = String(body?.type || "").slice(0, 32);
    if (slug && TRACK_TYPES.includes(type)) {
      const { getDb } = await import("./queries/connection");
      const { cardEvents } = await import("@db/schema");
      getDb().insert(cardEvents).values({ slug, type }).catch(() => {});
    }
  } catch { /* best-effort */ }
  return c.body(null, 204);
});

// Conversion funnel: one row per step a visitor reaches (product_view → demo →
// try_free → registration → published → payment) so drop-off is visible (§62).
const FUNNEL_STAGES = ["product_view", "demo_view", "try_free", "registration", "customization", "published", "first_share", "payment", "upgrade"];
app.post("/api/funnel", async (c) => {
  try {
    let body: { stage?: string; productSlug?: string; userId?: number } | null = null;
    try { body = await c.req.json(); } catch { try { body = JSON.parse(await c.req.text()); } catch { body = null; } }
    const stage = String(body?.stage || "").slice(0, 40);
    if (FUNNEL_STAGES.includes(stage)) {
      const { getDb } = await import("./queries/connection");
      const { funnelEvents } = await import("@db/schema");
      getDb().insert(funnelEvents).values({
        stage,
        productSlug: body?.productSlug ? String(body.productSlug).slice(0, 191) : null,
        userId: Number(body?.userId) || null,
      }).catch(() => {});
    }
  } catch { /* best-effort */ }
  return c.body(null, 204);
});

// Permanent QR / print target: /q/<public_id> resolves to the card's CURRENT
// slug and 302-redirects. Content, design, even the slug can change behind it,
// so a printed QR never breaks (Phase 04 / §14). Works without JavaScript.
app.get("/q/:publicId", async (c) => {
  const publicId = String(c.req.param("publicId") || "");
  try {
    const { getDb } = await import("./queries/connection");
    const { publishedCards, cardEvents } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db.select({ slug: publishedCards.slug }).from(publishedCards).where(eq(publishedCards.publicId, publicId));
    if (rows[0]?.slug) {
      db.insert(cardEvents).values({ slug: rows[0].slug, type: "qr_scan" }).catch(() => {}); // count the scan
      return c.redirect(`/${rows[0].slug}`, 302);
    }
  } catch { /* fall through */ }
  return c.redirect("/", 302);
});

// Dynamic sitemap: marketing pages + every public card, so Google can discover
// all 500+ card profiles.
app.get("/sitemap.xml", async (c) => {
  const base = "https://digitalcarda.in";
  const pages = ["", "/digital-business-cards", "/features", "/pricing", "/templates", "/industries", "/bulk-cards",
    "/ai-card-generator", "/resellers", "/refer-earn", "/custom-domain", "/contact",
    "/privacy", "/refund-policy", "/terms-of-service"];
  const customers = (await readPublicJson("customers")) as { slug?: string }[];
  const slugs = [...new Set(customers.map((x) => String(x.slug || "").trim()).filter(Boolean))];
  // Published product landing pages (indexable ecommerce pages, §50).
  let productSlugs: string[] = [];
  try {
    const { getDb } = await import("./queries/connection");
    const { products } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select({ slug: products.slug }).from(products).where(eq(products.status, "published"));
    productSlugs = rows.map((r) => r.slug).filter(Boolean);
  } catch { /* products table may not exist yet */ }
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const url = (loc: string, pri: string) => `  <url><loc>${esc(loc)}</loc><priority>${pri}</priority></url>`;
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => url(base + p, p === "" ? "1.0" : "0.7")).join("\n") + "\n" +
    productSlugs.map((s) => url(`${base}/digital-business-cards/${encodeURIComponent(s)}`, "0.8")).join("\n") + "\n" +
    slugs.map((s) => url(`${base}/${encodeURIComponent(s)}`, "0.5")).join("\n") +
    `\n</urlset>`;
  return c.body(body, 200, { "content-type": "application/xml; charset=utf-8" });
});

// Block the raw public files outright (defence-in-depth alongside the CDN rule).
// Google Merchant product feed (RSS 2.0 + g: namespace), generated from the
// published catalogue (§48). Prices match the product pages (§49); every item
// is honestly described as a DIGITAL service — no physical/NFC claims (§47).
// Note: this only makes the feed eligible; Google approval is never guaranteed.
app.get("/feed/products.xml", async (c) => {
  const base = "https://digitalcarda.in";
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch));
  let items = "";
  try {
    const { getDb } = await import("./queries/connection");
    const { products } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select().from(products).where(eq(products.status, "published"));
    items = rows.map((p) => {
      const link = `${base}/digital-business-cards/${encodeURIComponent(p.slug)}`;
      const price = Number(p.price).toFixed(2);
      const sale = p.salePrice != null ? Number(p.salePrice).toFixed(2) : null;
      const image = ((p.images as string[] | null)?.[0]) || `${base}/why-businessman.png`;
      const desc = (p.description || p.tagline || `${p.name}: a personalised digital business card you share online.`) +
        ` Digital service — instant activation, no app, no physical delivery. Includes a ${p.trialDays}-day free trial, then 1 year of access.`;
      return [
        "  <item>",
        `    <g:id>${esc(p.slug)}</g:id>`,
        `    <g:title>${esc(p.name)} — 1 Year Access</g:title>`,
        `    <g:description>${esc(desc)}</g:description>`,
        `    <g:link>${esc(link)}</g:link>`,
        `    <g:image_link>${esc(image)}</g:image_link>`,
        `    <g:availability>in_stock</g:availability>`,
        `    <g:price>${price} INR</g:price>`,
        ...(sale && Number(sale) < Number(price) ? [`    <g:sale_price>${sale} INR</g:sale_price>`] : []),
        `    <g:brand>DigitalCarda</g:brand>`,
        `    <g:condition>new</g:condition>`,
        `    <g:identifier_exists>no</g:identifier_exists>`,
        `    <g:product_type>Digital Business Cards${p.category ? " &gt; " + esc(p.category) : ""}</g:product_type>`,
        ...(p.category ? [`    <g:custom_label_0>${esc(p.category)}</g:custom_label_0>`] : []),
        "  </item>",
      ].join("\n");
    }).join("\n");
  } catch { /* products table may not exist yet */ }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n  <title>DigitalCarda — Digital Business Cards</title>\n  <link>${base}/digital-business-cards</link>\n  <description>Digital business card products by DigitalCarda</description>\n${items}\n</channel>\n</rss>`;
  return c.body(body, 200, { "content-type": "application/xml; charset=utf-8" });
});

app.get("/customers.json", (c) => c.json({ error: "Forbidden" }, 403));
app.get("/enquiries.json", (c) => c.json({ error: "Forbidden" }, 403));

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
