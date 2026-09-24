import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { verifyToken } from "./lib/jwt";
import { clientIp } from "./lib/rate-limit";

const app = new Hono<{ Bindings: HttpBindings }>();

async function requireSuperAdmin(
  c: { req: { header: (k: string) => string | undefined } },
  // Staff may reach these with the matching module (Customers / Leads) at this level.
  staffNeeds?: { module: "customers" | "leads"; level: "view" | "manage" },
) {
  const token = c.req.header("x-auth-token") || c.req.header("authorization")?.replace("Bearer ", "");
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return null;
  // Re-check the CURRENT role in the DB — never trust the (possibly stale) token
  // claim for the most sensitive endpoint in the app (Phase 31). A demoted admin
  // must lose access immediately, not at token expiry.
  const { getDb } = await import("./queries/connection");
  const { users } = await import("@db/schema");
  const { eq } = await import("drizzle-orm");
  const row = await getDb().select({ role: users.role, status: users.status }).from(users).where(eq(users.id, payload.userId));
  if (row[0]?.role === "super_admin") return payload;
  if (row[0]?.role === "staff" && row[0].status === "active" && staffNeeds) {
    const { staffAccessFor, staffMayUse } = await import("./lib/staff-access");
    if (staffMayUse(await staffAccessFor(payload.userId), staffNeeds.module, staffNeeds.level)) return payload;
  }
  return null;
}

// Local development only: the mobile app's web preview (Expo on localhost)
// calls this API from another origin. Production sends no CORS headers — the
// native app doesn't need them and the website is same-origin.
if (!env.isProduction) {
  app.use("/api/*", cors({
    origin: (origin) => (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null),
    allowHeaders: ["content-type", "x-auth-token", "authorization", "trpc-accept"],
  }));
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

// ── Lightweight in-memory rate limiter (per client IP + bucket) ───────
// Single-process (PM2) guard for the public write endpoints — blunts abuse
// without adding a dependency or external store. Fails OPEN on any error so
// it can never take the site down. The IP comes from clientIp(), which only
// trusts headers our own proxies wrote.
const rlBuckets = new Map<string, { count: number; resetAt: number }>();
let rlLastSweep = Date.now();
function rateLimit(
  c: { req: { raw: Request } },
  bucket: string,
  limit: number,
  windowMs: number,
): boolean {
  try {
    const now = Date.now();
    if (now - rlLastSweep > 60_000) {
      rlLastSweep = now;
      for (const [k, v] of rlBuckets) if (now > v.resetAt) rlBuckets.delete(k);
    }
    const key = bucket + ":" + clientIp(c.req.raw);
    const b = rlBuckets.get(key);
    if (!b || now > b.resetAt) {
      rlBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (b.count >= limit) return false;
    b.count++;
    return true;
  } catch {
    return true;
  }
}

/* Per-card Open Graph image: /og/<slug>.png
   Pasting a card link into WhatsApp/Facebook/LinkedIn used to preview a generic
   stock photo for every customer. This renders that person's own card — name,
   role, company, logo — with a QR of their card URL, so the preview itself is
   scannable. Cached in memory and at the CDN because scrapers hit it in bursts. */
const ogCache = new Map<string, { png: Buffer; at: number }>();
const OG_TTL = 10 * 60_000;

const ogHandler = async (c: { req: { param: (k: string) => string } }): Promise<Response> => {
  const file = c.req.param("file");
  const slug = file.replace(/\.png$/i, "").toLowerCase();
  if (!slug || !/^[a-z0-9_-]{2,80}$/.test(slug)) return new Response("Not found", { status: 404 });

  try {
    const { getDb } = await import("./queries/connection");
    const { publishedCards } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select({ data: publishedCards.data })
      .from(publishedCards).where(eq(publishedCards.slug, slug)).limit(1);

    let cust = ((rows[0]?.data as { customer?: Record<string, unknown> })?.customer) || null;
    if (!cust) {
      // Legacy customers.json card (readPublicJson is declared below in this
      // module; this only runs at request time, so it is initialised by then).
      const list = (await readPublicJson("customers")) as Record<string, unknown>[] | null;
      cust = (Array.isArray(list) ? list : []).find((r) => String(r.slug || "").toLowerCase() === slug) || null;
    }
    if (!cust) return new Response("Not found", { status: 404 });

    // Key the cache by what the image is MADE of, not just the slug. Keyed by
    // slug alone, a logo change kept serving the old PNG for up to OG_TTL - and
    // the CDN then pinned those stale bytes for a day under the fresh ?v= URL,
    // so the preview stayed wrong long after the edit.
    const { ogSignature } = await import("./lib/card-og");
    const key = slug + "|" + ogSignature(cust, slug);
    const hit = ogCache.get(key);
    if (hit && Date.now() - hit.at < OG_TTL) {
      return new Response(new Uint8Array(hit.png), {
        headers: { "content-type": "image/png", "cache-control": "public, max-age=600, s-maxage=86400" },
      });
    }

    const { renderCardOg } = await import("./lib/og-image");
    const png = await renderCardOg({
      slug,
      name: (cust.name as string) || null,
      designation: (cust.designation as string) || null,
      company: (cust.company_name as string) || null,
      logo: (cust.logo as string) || null,
      photo: (cust.photo as string) || null,
      phone: (cust.mobile1 as string) || null,
      email: (cust.email as string) || null,
      website: (cust.url as string) || null,
      accent: (cust.color as string) || null,
      second: (cust.color2 as string) || null,
    });
    ogCache.set(key, { png, at: Date.now() });
    if (ogCache.size > 500) ogCache.clear();   // crude bound; it refills lazily
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=600, s-maxage=86400" },
    });
  } catch (e) {
    console.error("[og] render failed:", (e as Error).message);
    return Response.redirect("https://digitalcarda.in/og-default.jpg", 302); // never show a broken preview
  }
};
// Pretty path for production; /api/ alias so it also works behind the dev
// server, which only routes /api/* to this app.
app.get("/og/:file", ogHandler);
app.get("/api/og/:file", ogHandler);

/* Blog social preview images: /og/blog/<article-slug>.jpg and /og/blog/index.jpg
   (api/lib/blog-og.ts). Meta tags add ?v=<hash of what is drawn> (blogOgPath),
   and the cache here is keyed the same way, so an edited title or a newly added
   feature image is picked up at once instead of after the CDN's cache expires.

   Renders are shared while in flight (a link posted to a busy WhatsApp group
   brings many scrapers at once), and an image drawn WITHOUT its artwork — or a
   failure — is never cached, so a passing problem can't stick to the URL. */
const blogOgCache = new Map<string, Buffer>();
const blogOgInFlight = new Map<string, Promise<{ jpeg: Buffer; hasArt: boolean }>>();
const blogOgHandler = async (c: { req: { param: (k: string) => string } }): Promise<Response> => {
  const name = String(c.req.param("file") || "").replace(/\.(jpe?g|png)$/i, "").toLowerCase();
  // <slug>.jpg is the social preview; <slug>-16x9|4x3|1x1.jpg is the text-free
  // artwork used in structured data and at the top of the article.
  const parts = /^([a-z0-9-]{1,80}?)(?:-(16x9|4x3|1x1))?$/.exec(name);
  if (!parts) return new Response("Not found", { status: 404 });
  const slug = parts[1];
  const ratio = parts[2] as "16x9" | "4x3" | "1x1" | undefined;
  try {
    const { BLOG_ART_SIZES, BLOG_POSTS, blogArtPath, blogIndexOgPath, blogOgPath, categoryLabel, getBlogPost, readingMinutes } = await import("../src/data/blog");
    const post = slug === "index" ? null : getBlogPost(slug);
    if ((slug !== "index" || ratio) && !post) return new Response("Not found", { status: 404 });

    const key = post ? (ratio ? blogArtPath(post, ratio) : blogOgPath(post)) : blogIndexOgPath();
    const cached = blogOgCache.get(key);
    if (cached) {
      return new Response(new Uint8Array(cached), {
        headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600, s-maxage=86400" },
      });
    }

    let job = blogOgInFlight.get(key);
    if (!job) {
      job = (async () => {
        const { renderBlogOg } = await import("./lib/blog-og");
        const { blogCoverSvg } = await import("./lib/vite");
        const { existsSync } = await import("node:fs");
        const path = await import("node:path");
        // The article (or, for the blog page, the newest article) whose artwork is drawn.
        const subject = post ?? BLOG_POSTS[0];
        // A feature image is a file under public/blog/ (see BlogPost.image); only
        // plain file names inside that folder are read.
        let imagePath: string | null = null;
        const src = subject?.image?.src ?? "";
        if (/^\/blog\/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i.test(src)) {
          imagePath = [path.resolve("./dist/public" + src), path.resolve("./public" + src)].find((p) => existsSync(p)) ?? null;
        }
        // The cover art is always passed too: it is the fallback if the photo can't be read.
        const coverSvg = await blogCoverSvg(subject?.cover ?? { motif: "card", tone: "gold" });
        if (post && ratio) {
          const { renderBlogArt } = await import("./lib/blog-og");
          return renderBlogArt({ ...BLOG_ART_SIZES[ratio], imagePath, coverSvg });
        }
        return post
          ? renderBlogOg({
              label: categoryLabel(post.category),
              title: post.seoTitle,
              footer: `digitalcarda.in/blog  ·  ${readingMinutes(post)} min read`,
              imagePath,
              coverSvg,
            })
          : renderBlogOg({
              label: "The Card Room",
              title: "Digital visiting card guides for Indian businesses",
              footer: `digitalcarda.in/blog  ·  ${BLOG_POSTS.length} guides`,
              imagePath,
              coverSvg,
            });
      })().finally(() => blogOgInFlight.delete(key));
      blogOgInFlight.set(key, job);
    }

    const { jpeg, hasArt } = await job;
    if (hasArt) {
      if (blogOgCache.size > 100) blogOgCache.clear();
      blogOgCache.set(key, jpeg);
    }
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "content-type": "image/jpeg",
        // Without its artwork the image is incomplete: let caches keep it only briefly.
        "cache-control": hasArt ? "public, max-age=3600, s-maxage=86400" : "public, max-age=60, s-maxage=60",
      },
    });
  } catch (e) {
    console.error("[og] blog render failed:", (e as Error).message);
    // no-store, so a brief failure can't pin the generic image under this URL.
    return new Response(null, { status: 302, headers: { location: "https://digitalcarda.in/og-default.jpg", "cache-control": "no-store" } });
  }
};
app.get("/og/blog/:file", blogOgHandler);
app.get("/api/og/blog/:file", blogOgHandler);

/* A card's logo or photo at a real URL, for email signatures.
   Uploaded images live inside the card snapshot as data: URIs, and Gmail,
   Outlook and Apple Mail refuse data: URIs in <img> — the picture silently
   vanishes from the signature. Serving the same bytes from a URL is what lets
   it show everywhere. Public by design: these images are already on the public
   card. Raster types only — never SVG, which can carry script. */
const SIG_IMG_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const sigImgHandler = async (c: { req: { param: (k: string) => string } }): Promise<Response> => {
  const slug = String(c.req.param("slug") || "").toLowerCase();
  const kind = String(c.req.param("file") || "").replace(/\.(png|jpe?g|webp|gif)$/i, "").toLowerCase();
  if (!/^[a-z0-9_-]{2,80}$/.test(slug) || (kind !== "logo" && kind !== "photo")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const { getDb } = await import("./queries/connection");
    const { publishedCards } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select({ data: publishedCards.data })
      .from(publishedCards).where(eq(publishedCards.slug, slug)).limit(1);
    let value = String(((rows[0]?.data as { customer?: Record<string, unknown> })?.customer || {})[kind] || "");
    if (!value && kind === "logo") {
      // Legacy customers.json card: its logo is a file in the migrated uploads.
      const list = (await readPublicJson("customers")) as Record<string, unknown>[] | null;
      const row = (Array.isArray(list) ? list : []).find((r) => String(r.slug || "").toLowerCase() === slug);
      const file = String(row?.logo || "");
      if (file) value = /^https?:\/\//i.test(file) ? file : `https://digitalcarda.in/otdo-panel/uploads/home/${encodeURIComponent(file)}`;
    }
    if (!value) return new Response("Not found", { status: 404 });
    if (/^https?:\/\//i.test(value)) return Response.redirect(value, 302);
    const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(value);
    if (!m || !SIG_IMG_TYPES.has(m[1].toLowerCase())) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(Buffer.from(m[2], "base64")), {
      headers: {
        "content-type": m[1].toLowerCase(),
        "cache-control": "public, max-age=86400, s-maxage=604800",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[sig-img] failed:", (e as Error).message);
    return new Response("Not found", { status: 404 });
  }
};
app.get("/sig-img/:slug/:file", sigImgHandler);
app.get("/api/sig-img/:slug/:file", sigImgHandler);

// Public enquiry capture for the legacy (customers.json) cards — stores the lead
// when the slug maps to a known card, and always emails the platform inbox (plus
// the card's owner when the slug maps to one).
app.post("/api/enquiry", async (c) => {
  if (!rateLimit(c, "enquiry", 10, 60_000)) return c.json({ ok: false, error: "rate_limited" }, 429);
  try {
    // Robust body parse: the public card submits via sendBeacon with a
    // text/plain Blob (CORS-safelisted so it fires from the sandboxed card's
    // opaque origin), so accept a text/plain JSON body too — same as /api/track.
    let body: { slug?: string; name?: string; contact?: string; email?: string; description?: string };
    try { body = await c.req.json(); } catch { try { body = JSON.parse(await c.req.text()); } catch { body = {}; } }
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!name) return c.json({ ok: false, error: "Name required" }, 400);

    // Best-effort DB storage (only if the slug maps to a card).
    let pushOwnerId: number | null = null;
    let cardName: string | null = null; // snapshot cards: mail.ts reads it from the published data
    try {
      const { getDb } = await import("./queries/connection");
      const { cards, leads, publishedCards, cardEvents } = await import("@db/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = getDb();
      const card = await db.query.cards.findFirst({ where: eq(cards.slug, slug) });
      if (card) {
        pushOwnerId = card.userId;
        cardName = card.title;
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
          pushOwnerId = pc[0].userId;
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

    const { sendLeadNotification, sendEmail } = await import("./lib/mail");
    // The owner's own copy goes out in the background (mail.ts); only the
    // platform alert is awaited here, as before.
    const verdict = await sendLeadNotification({ name, email: body.email, contact: body.contact, message: body.description, slug, cardName, ownerUserId: pushOwnerId });

    /* Tell the card owner on their phone (DigitalCarda app). Enquiries the
       triage marks as spam don't buzz anyone. Not awaited: the visitor's
       "sent" confirmation never waits on a push. */
    if (pushOwnerId && verdict !== "spam") {
      const ownerId = pushOwnerId;
      void (async () => {
        const { allows } = await import("./lib/notify-prefs");
        if (!(await allows(ownerId, "enquiries"))) return;
        const { getDb } = await import("./queries/connection");
        const { leads } = await import("@db/schema");
        const { and, desc, eq } = await import("drizzle-orm");
        const latest = await getDb().select({ id: leads.id }).from(leads)
          .where(and(eq(leads.userId, ownerId), eq(leads.fullName, name))).orderBy(desc(leads.id)).limit(1);
        const { pushToUser } = await import("./lib/push");
        const snippet = String(body.description || body.contact || body.email || "").replace(/\s+/g, " ").trim();
        await pushToUser(ownerId, {
          title: `${verdict === "important" ? "🔥 " : ""}New enquiry from ${name}`,
          body: snippet ? (snippet.length > 140 ? `${snippet.slice(0, 139)}…` : snippet) : "Open DigitalCarda to reply.",
          data: { type: "lead", leadId: latest[0]?.id ?? null },
          channelId: "leads",
        });
      })().catch((e) => console.error("[enquiry] push skipped:", (e as Error).message));
    }

    /* Reply to the VISITOR on the card owner's behalf. Until now only the owner
       was emailed, so whoever filled the form heard nothing back and our
       customer looked unresponsive. Best-effort: a failure here must never fail
       the enquiry, which is already stored. */
    try {
      const visitorEmail = String(body.email || "").trim();
      // No reply to spam: it would mail addresses bots typed in, in our customer's name.
      if (verdict !== "spam" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(visitorEmail)) {
        const { getDb } = await import("./queries/connection");
        const { publishedCards } = await import("@db/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await getDb().select({ data: publishedCards.data })
          .from(publishedCards).where(eq(publishedCards.slug, slug)).limit(1);
        const cust = ((rows[0]?.data as { customer?: Record<string, unknown> })?.customer) || {};
        const business = String(cust.company_name || cust.name || "").trim();
        if (business) {
          const { enquiryAutoReplyEmail } = await import("./lib/email-templates");
          await sendEmail(visitorEmail, enquiryAutoReplyEmail({
            visitorName: name,
            message: body.description || null,
            business,
            ownerPhone: (cust.mobile1 as string) || null,
            ownerEmail: (cust.email as string) || null,
            whatsapp: (cust.mobile2 as string) || (cust.mobile1 as string) || null,
            slug,
          }), (cust.email as string) || null);
        }
      }
    } catch (e) {
      console.error("[enquiry] auto-reply skipped:", (e as Error).message);
    }

    return c.json({ ok: true });
  } catch (e) {
    console.error("[enquiry] error:", (e as Error).message);
    return c.json({ ok: false }, 500);
  }
});

// Daily lifecycle + trial emails. Runs the §9 milestone journey (card_trials
// engine) plus the legacy subscription-trial FOMO emailer. Both are dedup-safe.
async function runDailyEmailJobs() {
  const [{ runLifecycle }, { runTrialEmails }, { runBillingEmails }, { runLeadFollowUps }, { runOwnerDigest }] = await Promise.all([
    import("./cron/lifecycle"),
    import("./cron/trial-emails"),
    import("./cron/billing"),
    import("./cron/lead-followups"),
    import("./cron/owner-digest"),
  ]);
  // Each job is independent: one failing must not skip the ones after it.
  const lifecycle = await runLifecycle().catch((e) => { console.error("[cron] lifecycle:", (e as Error).message); return null; }); // new card_trials milestones
  const legacy = await runTrialEmails().catch((e) => { console.error("[cron] legacy trial-emails:", (e as Error).message); return null; });
  const billing = await runBillingEmails();        // paid-plan renewal reminders + ended notices
  const followUps = await runLeadFollowUps();      // card owners' follow-ups due today
  // Last, so the summary can report what the jobs above did. Once per India day.
  const digest = await runOwnerDigest({ lifecycle });
  return { lifecycle, legacy, billing, followUps, digest };
}

// Manual/external trigger (e.g. an OS cron): POST with ?key=CRON_SECRET. Always runs.
app.post("/api/cron/trial-emails", async (c) => {
  const key = c.req.query("key") || c.req.header("x-cron-key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return c.json({ error: "Unauthorized" }, 401);
  try {
    return c.json({ ok: true, ...(await runDailyEmailJobs()) });
  } catch (e) {
    console.error("[cron] daily jobs error:", (e as Error).message);
    return c.json({ ok: false }, 500);
  }
});

// In-process daily scheduler (production only) — guarantees the lifecycle runs
// once per calendar day even without an OS crontab. Guarded by a date marker in
// app_settings so a restart (or an OS cron also hitting the endpoint) can't
// double-run. Checks every 6h; the dedup ledger makes any overlap harmless.
if (process.env.NODE_ENV === "production") {
  const runIfDue = async () => {
    try {
      const { getDb } = await import("./queries/connection");
      const { appSettings } = await import("@db/schema");
      const { eq } = await import("drizzle-orm");
      const db = getDb();
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db.select().from(appSettings).where(eq(appSettings.key, "lifecycle_last_run"));
      if (rows[0]?.value === today) return;
      await db.insert(appSettings).values({ key: "lifecycle_last_run", value: today }).onDuplicateKeyUpdate({ set: { value: today } });
      const res = await runDailyEmailJobs();
      console.log("[lifecycle] daily run", JSON.stringify(res));
    } catch (e) {
      console.error("[lifecycle] scheduler error:", (e as Error).message);
    }
  };
  setTimeout(runIfDue, 45_000);              // shortly after boot
  setInterval(runIfDue, 6 * 60 * 60 * 1000); // and every 6 hours
}

// Mobile app tables: device sessions, push tokens, account deletion requests.
// Idempotent and additive, like the other boot-time ensures below.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS app_sessions (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint unsigned NOT NULL,
        token_hash varchar(64) NOT NULL,
        prev_token_hash varchar(64) NULL,
        platform varchar(16) NOT NULL DEFAULT 'unknown',
        device_name varchar(120) NULL,
        app_version varchar(32) NULL,
        last_used_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at timestamp NOT NULL,
        revoked_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY app_sessions_token_hash_unique (token_hash),
        KEY app_sessions_prev_hash_idx (prev_token_hash),
        KEY app_sessions_user_idx (user_id)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint unsigned NOT NULL,
        session_id bigint unsigned NULL,
        token varchar(255) NOT NULL,
        platform varchar(16) NOT NULL DEFAULT 'unknown',
        disabled_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY push_tokens_token_unique (token),
        KEY push_tokens_user_idx (user_id)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS account_deletion_requests (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint unsigned NOT NULL,
        email varchar(255) NOT NULL,
        reason varchar(500) NULL,
        source varchar(16) NOT NULL DEFAULT 'app',
        status enum('pending','cancelled','completed') NOT NULL DEFAULT 'pending',
        scheduled_for timestamp NOT NULL,
        completed_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY adr_user_idx (user_id),
        KEY adr_status_idx (status)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS app_web_links (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint unsigned NOT NULL,
        code_hash varchar(64) NOT NULL,
        next varchar(200) NOT NULL,
        expires_at timestamp NOT NULL,
        used_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY app_web_links_code_unique (code_hash),
        KEY app_web_links_user_idx (user_id)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS notification_prefs (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint unsigned NOT NULL,
        enquiries tinyint(1) NOT NULL DEFAULT 1,
        follow_ups tinyint(1) NOT NULL DEFAULT 1,
        plan tinyint(1) NOT NULL DEFAULT 1,
        rewards tinyint(1) NOT NULL DEFAULT 1,
        tips tinyint(1) NOT NULL DEFAULT 1,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY notification_prefs_user_unique (user_id)
      )
    `));
    console.log("[schema] app_sessions, push_tokens, account_deletion_requests, notification_prefs ensured");
  } catch (e) {
    console.error("[schema] ensure mobile app tables failed:", (e as Error).message);
  }
})();

// One-time, idempotent schema ensure for the custom_domains table — lets the
// custom-domains module go live without manual SQL access. Runs with the app's
// own DB credentials on boot; CREATE TABLE IF NOT EXISTS is a no-op once the
// table exists. Additive only — never drops or alters existing data.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    await getDb().execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS custom_domains (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        domain varchar(255) NOT NULL,
        user_id bigint unsigned NOT NULL,
        card_id int NOT NULL DEFAULT 1,
        status enum('pending','active','disabled') NOT NULL DEFAULT 'pending',
        verify_token varchar(64) NOT NULL,
        added_by_role enum('admin','reseller','customer') NOT NULL DEFAULT 'admin',
        verified_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY custom_domains_domain_unique (domain),
        KEY cd_user_card_idx (user_id, card_id),
        KEY cd_status_idx (status)
      )
    `));
    console.log("[schema] custom_domains table ensured");
  } catch (e) {
    console.error("[schema] ensure custom_domains failed:", (e as Error).message);
  }
})();

// One-time, idempotent add of payment_orders.gateway (Payment Orders module). MySQL
// has no "ADD COLUMN IF NOT EXISTS", so check information_schema first. Additive with
// a default — every existing row becomes 'manual', which is correct (all prior orders
// were manual). Never drops or rewrites data.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db.execute(sql.raw(
      `SELECT COUNT(*) AS n FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'payment_orders' AND column_name = 'gateway'`,
    ));
    const n = Number((rows as unknown as [{ n?: number }[]])[0]?.[0]?.n ?? (rows as unknown as { n?: number }[])[0]?.n ?? 0);
    if (!n) {
      await db.execute(sql.raw(
        `ALTER TABLE payment_orders ADD COLUMN gateway ENUM('manual','razorpay') NOT NULL DEFAULT 'manual' AFTER method`,
      ));
      console.log("[schema] payment_orders.gateway column added");
    }
  } catch (e) {
    console.error("[schema] ensure payment_orders.gateway failed:", (e as Error).message);
  }
})();

// One-time, idempotent schema ensure for nfc_orders (NFC card & standee orders).
// CREATE TABLE IF NOT EXISTS is a no-op once the table exists; additive only.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    await getDb().execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS nfc_orders (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint unsigned NOT NULL,
        product enum('nfc_card','nfc_standee') NOT NULL,
        quantity int NOT NULL DEFAULT 1,
        unit_price decimal(10,2) NOT NULL,
        amount decimal(12,2) NOT NULL,
        print_name varchar(120) NOT NULL,
        print_title varchar(120) NULL,
        print_company varchar(160) NULL,
        print_phone varchar(40) NULL,
        card_url varchar(255) NOT NULL,
        logo_url varchar(500) NULL,
        ship_name varchar(120) NOT NULL,
        ship_phone varchar(20) NOT NULL,
        ship_line1 varchar(255) NOT NULL,
        ship_line2 varchar(255) NULL,
        ship_city varchar(100) NOT NULL,
        ship_state varchar(100) NOT NULL,
        ship_pincode varchar(10) NOT NULL,
        status enum('pending_payment','paid','in_production','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending_payment',
        razorpay_order_id varchar(64) NULL,
        razorpay_payment_id varchar(64) NULL,
        tracking varchar(255) NULL,
        admin_note varchar(500) NULL,
        paid_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY nfc_user_idx (user_id),
        KEY nfc_status_idx (status),
        KEY nfc_rzp_order_idx (razorpay_order_id)
      )
    `));
    console.log("[schema] nfc_orders table ensured");
  } catch (e) {
    console.error("[schema] ensure nfc_orders failed:", (e as Error).message);
  }
})();

// One-time, idempotent schema ensure for razorpay_fulfilments (which Razorpay
// orders for card add-ons have been granted — dedups verify vs webhook). Additive only.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    await getDb().execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS razorpay_fulfilments (
        razorpay_order_id varchar(64) NOT NULL,
        kind varchar(32) NOT NULL,
        user_id bigint unsigned NOT NULL,
        razorpay_payment_id varchar(64) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (razorpay_order_id),
        KEY rzp_fulfil_user_idx (user_id)
      )
    `));
    console.log("[schema] razorpay_fulfilments table ensured");
  } catch (e) {
    console.error("[schema] ensure razorpay_fulfilments failed:", (e as Error).message);
  }
})();

// One-time, idempotent schema ensure for coupons, coupon_redemptions and
// announcements (coupon system + offer popups). Additive only.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS coupons (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        code varchar(40) NOT NULL,
        description varchar(255) NULL,
        discount_type enum('percent','flat') NOT NULL DEFAULT 'percent',
        discount_value decimal(10,2) NOT NULL,
        max_discount decimal(10,2) NULL,
        min_amount decimal(10,2) NULL,
        valid_from timestamp NULL,
        valid_until timestamp NULL,
        usage_limit int NULL,
        per_user_limit int NOT NULL DEFAULT 1,
        plan_ids varchar(255) NULL,
        cycles varchar(60) NULL,
        active tinyint(1) NOT NULL DEFAULT 1,
        used_count int NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY coupons_code_unique (code),
        KEY coupon_active_idx (active)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        coupon_id bigint unsigned NOT NULL,
        user_id bigint unsigned NOT NULL,
        package_id bigint unsigned NOT NULL,
        payment_order_id bigint unsigned NULL,
        payment_ref varchar(64) NULL,
        amount_before decimal(12,2) NOT NULL,
        discount decimal(12,2) NOT NULL,
        amount_paid decimal(12,2) NOT NULL,
        status enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY cr_coupon_idx (coupon_id),
        KEY cr_user_idx (user_id),
        KEY cr_order_idx (payment_order_id)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS announcements (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        title varchar(120) NOT NULL,
        message varchar(500) NULL,
        kind enum('offer','teaser','info') NOT NULL DEFAULT 'offer',
        theme enum('diwali','holi','newyear','festive','brand','dark') NOT NULL DEFAULT 'festive',
        badge varchar(40) NULL,
        coupon_id bigint unsigned NULL,
        cta_label varchar(40) NULL,
        cta_url varchar(255) NULL,
        show_from timestamp NULL,
        show_until timestamp NULL,
        countdown_to timestamp NULL,
        audience enum('public','dashboard','both') NOT NULL DEFAULT 'both',
        active tinyint(1) NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `));
    console.log("[schema] coupons, coupon_redemptions, announcements ensured");
    // The FREE30D free-trial voucher, created once. An admin can then edit or
    // switch it off in Admin → Coupons; this never overwrites their settings.
    const { ensureTrialCoupon } = await import("./lib/coupons");
    await ensureTrialCoupon(db);
  } catch (e) {
    console.error("[schema] ensure coupon/announcement tables failed:", (e as Error).message);
  }
})();

// One-time, idempotent add of card_trials.coupon_code / activation_source — how a
// trial was started (FREE30D, and from where). MySQL has no "ADD COLUMN IF NOT
// EXISTS", so check information_schema first. Both are nullable: every existing
// trial stays exactly as it is, with no coupon recorded.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    for (const [column, ddl] of [
      ["coupon_code", "ADD COLUMN coupon_code varchar(40) NULL AFTER published_at"],
      ["activation_source", "ADD COLUMN activation_source varchar(40) NULL AFTER coupon_code"],
    ] as const) {
      const rows = await db.execute(sql.raw(
        `SELECT COUNT(*) AS n FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'card_trials' AND column_name = '${column}'`,
      ));
      const n = Number((rows as unknown as [{ n?: number }[]])[0]?.[0]?.n ?? (rows as unknown as { n?: number }[])[0]?.n ?? 0);
      if (!n) {
        await db.execute(sql.raw(`ALTER TABLE card_trials ${ddl}`));
        console.log(`[schema] card_trials.${column} column added`);
      }
    }
  } catch (e) {
    console.error("[schema] ensure card_trials trial-voucher columns failed:", (e as Error).message);
  }
})();

// One-time, idempotent schema ensure for reseller accounts, orders and payments
// (offline reseller ledger). Additive only.
(async () => {
  try {
    const { getDb } = await import("./queries/connection");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS reseller_accounts (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        name varchar(160) NOT NULL,
        company varchar(160) NULL,
        phone varchar(30) NULL,
        email varchar(160) NULL,
        reseller_user_id bigint unsigned NULL,
        commission_rate decimal(5,2) NOT NULL DEFAULT 10.00,
        opening_balance decimal(12,2) NOT NULL DEFAULT 0.00,
        notes varchar(500) NULL,
        active tinyint(1) NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ra_user_idx (reseller_user_id)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS reseller_orders (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        account_id bigint unsigned NOT NULL,
        order_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        title varchar(200) NOT NULL,
        plan varchar(100) NULL,
        quantity int NOT NULL DEFAULT 1,
        unit_price decimal(10,2) NOT NULL,
        gross_amount decimal(12,2) NOT NULL,
        commission_rate decimal(5,2) NOT NULL,
        commission_amount decimal(12,2) NOT NULL,
        net_amount decimal(12,2) NOT NULL,
        customer_names varchar(1000) NULL,
        status enum('pending','in_progress','delivered','cancelled') NOT NULL DEFAULT 'pending',
        notes varchar(500) NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ro_account_idx (account_id)
      )
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS reseller_payments (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        account_id bigint unsigned NOT NULL,
        order_id bigint unsigned NULL,
        amount decimal(12,2) NOT NULL,
        method enum('cash','upi','bank','cheque','other') NOT NULL,
        reference varchar(120) NULL,
        paid_on timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        note varchar(500) NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY rp_account_idx (account_id),
        KEY rp_order_idx (order_id)
      )
    `));
    console.log("[schema] reseller_accounts, reseller_orders, reseller_payments ensured");
  } catch (e) {
    console.error("[schema] ensure reseller ledger tables failed:", (e as Error).message);
  }
})();

// ─── Sensitive data files: block public access, serve only to super-admins ───
// customers.json has passwords + bank/UPI details; enquiries.json is lead PII;
// members_data / members_migration are full user PII dumps. None may be
// publicly downloadable — served only via the super-admin route below.
const SENSITIVE = new Set(["customers", "enquiries", "members_data", "members_migration"]);

const readPublicJson = async (file: string): Promise<unknown[]> => {
  const { readFile } = await import("node:fs/promises");
  for (const p of [`./dist/public/${file}.json`, `./public/${file}.json`]) {
    try { return JSON.parse(await readFile(p, "utf8")); } catch { /* try next */ }
  }
  return [];
};

// Persistent "hidden records" overlay: the legacy enquiries/customers live in
// read-only JSON files, so an admin "delete" is stored as a hidden-id list in
// app_settings and filtered out on read — deletes now survive a refresh.
async function getHiddenIds(file: string): Promise<Set<string>> {
  try {
    const { getDb } = await import("./queries/connection");
    const { appSettings } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select().from(appSettings).where(eq(appSettings.key, `hidden_${file}`));
    const arr = rows[0]?.value ? JSON.parse(rows[0].value) : [];
    return new Set((Array.isArray(arr) ? arr : []).map(String));
  } catch { return new Set(); }
}
async function addHiddenIds(file: string, ids: string[]): Promise<number> {
  const { getDb } = await import("./queries/connection");
  const { appSettings } = await import("@db/schema");
  const { eq } = await import("drizzle-orm");
  const cur = await getHiddenIds(file);
  ids.forEach((id) => cur.add(String(id)));
  const value = JSON.stringify([...cur]);
  await getDb().insert(appSettings).values({ key: `hidden_${file}`, value }).onDuplicateKeyUpdate({ set: { value } });
  return cur.size;
}

/* Enquiries sent through the website's contact form. They are stored in the
   leads table (source "website"), not the legacy enquiries file, so they are
   shaped like the file's rows here and put in front of them — the admin Leads
   page then shows one list. Ids are prefixed so they can never collide with a
   legacy id, and hiding one works through the same overlay. */
async function websiteEnquiries(): Promise<Record<string, unknown>[]> {
  try {
    const { getDb } = await import("./queries/connection");
    const { leads } = await import("@db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await getDb().select().from(leads)
      .where(eq(leads.source, "website")).orderBy(desc(leads.createdAt)).limit(1000);
    // The legacy rows carry India time as "YYYY-MM-DD HH:MM:SS".
    const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 19).replace("T", " ");
    return rows.map((r) => ({
      id: `web-${r.id}`,
      name: r.fullName,
      contact: r.phone || "",
      email: r.email || "",
      description: [r.company ? `Business: ${r.company}` : "", r.message || ""].filter(Boolean).join("\n"),
      uname: "admin",
      created_on: ist(new Date(r.createdAt)),
      status: r.status === "converted" ? "converted" : "",
      reseller_convert: null,
      converted_on: null,
      remarks: r.notes || null,
    }));
  } catch (e) {
    console.error("[admin] website enquiries skipped:", (e as Error).message);
    return [];
  }
}

app.get("/api/admin/data/:file", async (c) => {
  const file = c.req.param("file");
  if (!SENSITIVE.has(file)) return c.json({ error: "Not found" }, 404);
  const staffModule = file === "customers" ? "customers" : file === "enquiries" ? "leads" : undefined;
  if (!(await requireSuperAdmin(c, staffModule ? { module: staffModule, level: "view" } : undefined))) return c.json({ error: "Unauthorized" }, 401);
  let data = await readPublicJson(file);
  if (file === "enquiries" && Array.isArray(data)) data = [...(await websiteEnquiries()), ...data];
  if ((file === "enquiries" || file === "customers") && Array.isArray(data)) {
    const hidden = await getHiddenIds(file);
    if (hidden.size) return c.json((data as Record<string, unknown>[]).filter((r) => !hidden.has(String(r.id))));
  }
  return c.json(data);
});

// Super-admin: persist a delete by hiding record ids from the JSON overlay.
app.post("/api/admin/hide", async (c) => {
  try {
    const body = await c.req.json<{ file?: string; ids?: (string | number)[] }>();
    const file = String(body.file || "");
    if (file !== "enquiries" && file !== "customers") return c.json({ error: "Invalid file" }, 400);
    const actor = await requireSuperAdmin(c, { module: file === "customers" ? "customers" : "leads", level: "manage" });
    if (!actor) return c.json({ error: "Unauthorized" }, 401);
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).filter(Boolean);
    if (!ids.length) return c.json({ ok: true, hidden: 0 });
    const total = await addHiddenIds(file, ids);
    return c.json({ ok: true, hidden: ids.length, total });
  } catch (e) {
    console.error("[admin/hide] error:", (e as Error).message);
    return c.json({ ok: false }, 500);
  }
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

// The signed-in user's PUBLISHED snapshot (customer + products + gallery + …).
// Used to hydrate the dashboard for NEW-FLOW users (not in customers.json) and
// on a fresh browser/device, so their real card loads everywhere — not just on
// the browser where they built it. Read-only, scoped to the token's user.
app.get("/api/my/snapshot", async (c) => {
  const token = c.req.header("x-auth-token") || c.req.header("authorization")?.replace("Bearer ", "");
  const user = token ? await verifyToken(token) : null;
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { getDb } = await import("./queries/connection");
    const { publishedCards } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db.select({ slug: publishedCards.slug, data: publishedCards.data, cardId: publishedCards.cardId, updatedAt: publishedCards.updatedAt })
      .from(publishedCards).where(eq(publishedCards.userId, Number(user.userId)));
    if (!rows.length) return c.json(null);
    rows.sort((a, b) => Number(a.cardId) - Number(b.cardId)); // primary card first
    return c.json(rows[0]);
  } catch {
    return c.json(null);
  }
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

// Caddy on-demand-TLS gate: only issue an SSL certificate for domains we
// actually serve (an ACTIVE custom domain) — stops cert-issuance abuse from
// arbitrary hosts pointed at the server. Caddy calls GET /api/tls/check?domain=
app.get("/api/tls/check", async (c) => {
  const domain = String(c.req.query("domain") || "").toLowerCase().trim().replace(/\.$/, "");
  if (!domain) return c.json({ error: "no domain" }, 400);
  if (domain === "digitalcarda.in" || domain.endsWith(".digitalcarda.in")) return c.text("ok");
  try {
    const { getDb } = await import("./queries/connection");
    const { customDomains } = await import("@db/schema");
    const { and, eq } = await import("drizzle-orm");
    const row = await getDb().select({ id: customDomains.id }).from(customDomains)
      .where(and(eq(customDomains.domain, domain), eq(customDomains.status, "active")));
    return row.length ? c.text("ok") : c.json({ error: "unknown domain" }, 403);
  } catch { return c.json({ error: "error" }, 500); }
});

// Real engagement analytics: the public card beacons here on view + every
// action tap (call/whatsapp/email/website/directions/save-contact). Slug-keyed
// so it works for snapshot AND legacy cards. Numbers are always real (§36).
// Salt for the anonymous visitor hash. A stable per-deployment secret keeps
// unique/returning counts consistent over time; falling back to the JWT secret
// means there is always *a* salt, and it never leaves the server.
const VISITOR_SALT = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || "dc-analytics";

app.post("/api/track", async (c) => {
  if (!rateLimit(c, "track", 240, 60_000)) return c.json({ ok: false, error: "rate_limited" }, 429);
  try {
    let body: Record<string, unknown> | null = null;
    try { body = await c.req.json(); } catch { try { body = JSON.parse(await c.req.text()); } catch { body = null; } }
    const s = (v: unknown, n: number) => (v == null ? "" : String(v).slice(0, n));

    const slug = s(body?.slug, 191).toLowerCase();
    const type = s(body?.type, 32);
    const { TRACK_TYPE_SET, parseUa, deriveSource, hashVisitor, edgeGeo } = await import("./lib/analytics");
    if (!slug || !TRACK_TYPE_SET.has(type)) return c.body(null, 204);

    const ua = parseUa(c.req.header("user-agent") || "");
    const geo = edgeGeo((n) => c.req.header(n));
    const referrer = s(body?.referrer, 255);
    const source = deriveSource(referrer, s(body?.src, 32));
    const visitorId = hashVisitor(s(body?.visitorId, 128), VISITOR_SALT);

    // Duration is only meaningful for dwell events; clamp to a sane window so a
    // backgrounded tab can't report a 9-hour "visit".
    const rawMs = Number(body?.durationMs);
    const durationMs = Number.isFinite(rawMs) && rawMs > 0 ? Math.min(Math.round(rawMs), 2 * 60 * 60_000) : null;
    const rawCard = Number(body?.cardId);
    const cardId = Number.isFinite(rawCard) && rawCard > 0 ? Math.min(Math.round(rawCard), 100000) : null;

    const { getDb } = await import("./queries/connection");
    const { cardEvents } = await import("@db/schema");
    getDb().insert(cardEvents).values({
      slug, type,
      label: s(body?.label, 191) || null,
      cardId,
      visitorId,
      sessionId: s(body?.sessionId, 64) || null,
      device: ua.device, os: ua.os, browser: ua.browser,
      source, referrer: referrer || null,
      country: geo.country, city: geo.city,
      durationMs,
    }).catch(() => {});
  } catch { /* best-effort — analytics must never break a card view */ }
  return c.body(null, 204);
});

// Public: the REAL view count for a card slug — the same "view" events the card
// beacons to /api/track above, so the eye-counter shows live reality instead of
// a frozen snapshot number. A few cards carry a starting base (their historic
// count from the old platform) that new real views add on top of. ACAO:* so the
// parent page (or the card) can read it; short cache to spare the DB.
const VIEW_BASE: Record<string, number> = { pacewalk: 11542 };
app.get("/api/views/:slug", async (c) => {
  const slug = String(c.req.param("slug") || "").slice(0, 191).toLowerCase();
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Cache-Control", "public, max-age=30");
  if (!slug) return c.json({ views: 0 });
  try {
    const { getDb } = await import("./queries/connection");
    const { cardEvents } = await import("@db/schema");
    const { and, eq, sql } = await import("drizzle-orm");
    const rows = await getDb().select({ n: sql<number>`count(*)` }).from(cardEvents)
      .where(and(eq(cardEvents.slug, slug), eq(cardEvents.type, "view")));
    return c.json({ views: (VIEW_BASE[slug] || 0) + Number(rows[0]?.n || 0) });
  } catch { return c.json({ views: VIEW_BASE[slug] || 0 }); }
});

// Conversion funnel: one row per step a visitor reaches (product_view → demo →
// try_free → registration → published → payment) so drop-off is visible (§62).
const FUNNEL_STAGES = ["product_view", "demo_view", "try_free", "registration", "customization", "published", "first_share", "payment", "upgrade"];
app.post("/api/funnel", async (c) => {
  if (!rateLimit(c, "funnel", 60, 60_000)) return c.json({ ok: false, error: "rate_limited" }, 429);
  try {
    let body: { stage?: string; productSlug?: string; userId?: number } | null = null;
    try { body = await c.req.json(); } catch { try { body = JSON.parse(await c.req.text()); } catch { body = null; } }
    const stage = String(body?.stage || "").slice(0, 40);
    if (FUNNEL_STAGES.includes(stage)) {
      // Attribute to the signed-in user (from the token) — never a client-supplied
      // userId, which would let anyone pollute another user's funnel (Phase 31).
      const tk = c.req.header("x-auth-token") || c.req.header("authorization")?.replace("Bearer ", "");
      const authed = tk ? await verifyToken(tk) : null;
      const { getDb } = await import("./queries/connection");
      const { funnelEvents } = await import("@db/schema");
      getDb().insert(funnelEvents).values({
        stage,
        productSlug: body?.productSlug ? String(body.productSlug).slice(0, 191) : null,
        userId: authed?.userId ?? null,
      }).catch(() => {});
    }
  } catch { /* best-effort */ }
  return c.body(null, 204);
});

// ── Razorpay webhook: server-to-server payment confirmation (backstop to the
// browser-side verify). If the customer's browser closed after paying but before
// the client verify ran, this still activates their plan — or confirms their NFC
// order / grants their add-on. Verifies the webhook signature (HMAC of the RAW
// body with the webhook secret), then on payment.captured runs the same
// fulfilment as the client-verify path, idempotently (plans dedup by payment id,
// NFC orders by their pending→paid flip, add-ons per Razorpay order). Non-2xx
// makes Razorpay retry, so a transient DB/API hiccup never loses a payment.
app.post("/api/razorpay/webhook", async (c) => {
  const raw = await c.req.text();
  try {
    const { getDb } = await import("./queries/connection");
    const { resolveRazorpay, recordRazorpayPayment } = await import("./payment-router");
    const { verifyRazorpayWebhook, fetchRazorpayOrder } = await import("./lib/razorpay");
    const db = getDb();
    const cr = await resolveRazorpay(db);
    if (!verifyRazorpayWebhook(raw, c.req.header("x-razorpay-signature"), cr.webhookSecret)) {
      return c.json({ error: "invalid signature" }, 400);
    }
    const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } } };
    // Ack every non-target event so Razorpay stops retrying it.
    if (event.event !== "payment.captured") return c.json({ ok: true, ignored: event.event });
    const pay = event.payload?.payment?.entity;
    if (!pay?.id || !pay.order_id) return c.json({ ok: true, note: "no payment entity" });

    // Read the notes we stashed on the order at creation to know which plan to activate.
    const order = await fetchRazorpayOrder(pay.order_id, cr);
    const notes = order.notes || {};
    const userId = Number(notes.userId);

    // NFC orders and add-ons carry no packageId. Confirm them with the function
    // their in-browser verify calls — same checks, same emails — which is
    // idempotent against that verify and against Razorpay's own retries.
    if (!notes.packageId && userId) {
      const kind = notes.nfcOrderIds || notes.nfcOrderId ? "nfc order"
        : notes.addonType ? "card add-on"
        : notes.addon === "custom_domain" ? "domain add-on"
        : null;
      if (kind) {
        const args = { userId, razorpayOrderId: pay.order_id, paymentId: pay.id, gatewayOrder: order };
        const { TRPCError } = await import("@trpc/server");
        try {
          let fulfilled: boolean;
          if (kind === "nfc order") fulfilled = (await (await import("./nfc-router")).fulfilNfcPayment(db, args)).confirmed;
          else if (kind === "card add-on") fulfilled = (await (await import("./addon-router")).fulfilAddonPayment(db, args)).granted;
          else fulfilled = (await (await import("./domain-router")).fulfilDomainAddonPayment(db, args)).granted;
          console.log(`[razorpay webhook] payment.captured ${pay.id} → ${kind} ${fulfilled ? "fulfilled" : "already fulfilled"}`);
        } catch (e) {
          if (!(e instanceof TRPCError)) throw e; // DB / gateway trouble → 500 → Razorpay retries
          // Owner, amount or notes don't match — a retry can't change that, so
          // ack it and leave the payment for support to look at.
          console.error(`[razorpay webhook] payment.captured ${pay.id} → ${kind} NOT fulfilled: ${e.message}`);
        }
        return c.json({ ok: true });
      }
    }

    const packageId = Number(notes.packageId);
    const cycle = notes.billingCycle;
    const billingCycle = (cycle === "monthly" || cycle === "yearly" || cycle === "triennial") ? cycle : "yearly";
    if (!userId || !packageId) return c.json({ ok: true, note: "order missing notes" });

    const res = await recordRazorpayPayment(db, {
      userId, packageId,
      planName: String(notes.planName || "Plan"),
      billingCycle,
      amountRupees: Number(order.amount || pay.amount || 0) / 100, // the authoritative charged amount
      paymentId: pay.id,
      couponCode: String(notes.couponCode || "") || undefined,
      couponDiscount: Number(notes.couponDiscount || 0),
    });
    console.log(`[razorpay webhook] payment.captured ${pay.id} → ${res.already ? "already recorded" : "activated"}`);
    return c.json({ ok: true });
  } catch (e) {
    console.error("[razorpay webhook] error:", (e as Error).message);
    return c.json({ ok: false }, 500); // 500 → Razorpay retries later
  }
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

// /templates and /card-designs used to be a second templates page. There is one
// page now — /digital-business-cards-templates — so the old URLs move there permanently (301),
// keeping links and search rankings they earned. The query string is kept.
for (const from of ["/templates", "/templates/", "/card-designs", "/card-designs/"]) {
  app.get(from, (c) => c.redirect(`/digital-business-cards-templates${new URL(c.req.url).search}`, 301));
}

// Dynamic sitemap: marketing pages, template pages and every public card worth
// indexing, so Google can discover the card profiles. Built from every published
// snapshot, so the result is kept for a few minutes rather than rebuilt per hit.
let sitemapXml: { body: string; at: number } | null = null;
const SITEMAP_TTL = 10 * 60_000;
app.get("/sitemap.xml", async (c) => {
  const base = "https://digitalcarda.in";
  const pages = ["", "/digital-business-cards-templates", "/features", "/pricing", "/industries", "/bulk-cards",
    "/ai-card-generator", "/resellers", "/refer-earn", "/custom-domain", "/contact",
    // Free tools — canonical URLs only; each has an alias route that deliberately
    // stays out of the sitemap so the two never compete for the same terms.
    "/free-tools", "/email-signature-generator", "/whatsapp-message-templates", "/instagram-bio-templates",
    "/privacy", "/refund-policy", "/shipping-policy", "/terms-of-service", "/sitemap", "/blog", "/about",
    // Long-form SEO surface added Sept 2026:
    // - the pillar guide for the "digital business card" topic
    // - one page per Tier 1/2 Indian city (data lives in src/data/cities.ts)
    // - competitor comparison pages (data lives in src/data/comparisons.ts)
    "/digital-business-card-guide",
    ...[
      "delhi","mumbai","bangalore","hyderabad","chennai","kolkata","pune","ahmedabad",
      "jaipur","chandigarh","lucknow","surat","ludhiana","indore","nagpur","gurgaon",
    ].map((s) => `/digital-visiting-card/${s}`),
    ...["linktree","hihello","beaconstac"].map((s) => `/vs/${s}`),
  ];
  if (sitemapXml && Date.now() - sitemapXml.at < SITEMAP_TTL) {
    return c.body(sitemapXml.body, 200, { "content-type": "application/xml; charset=utf-8" });
  }
  const customers = (await readPublicJson("customers")) as Record<string, unknown>[];
  const legacyProducts = (await readPublicJson("product")) as Record<string, unknown>[];
  const { cardSeo } = await import("../src/lib/cardSeo");

  // <lastmod> lets crawlers spend their visits on pages that actually changed.
  // Only real dates go in: product and card edits come from the database;
  // marketing pages change only on deploy, so the build's own timestamp is their
  // honest upper bound. A legacy card with no stored edit date gets no lastmod
  // rather than an invented one.
  const day = (d: Date | string | null | undefined) => {
    const t = d ? new Date(d) : null;
    return t && !Number.isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : "";
  };
  let deployDay = "";
  try {
    const { statSync } = await import("node:fs");
    deployDay = day(statSync("./dist/public/index.html").mtime);
  } catch { /* dev server: no build yet */ }

  // Published product landing pages (indexable ecommerce pages, §50).
  let productRows: { slug: string; updatedAt: Date | null; images: unknown }[] = [];
  const cardEdited = new Map<string, string>();
  // Cards published from the dashboard, newest per slug: they override the
  // legacy customers.json row, exactly as they do on the card page itself.
  const published = new Map<string, { slug: string; customer: Record<string, unknown>; products: { name?: unknown }[] }>();
  try {
    const { getDb } = await import("./queries/connection");
    const { products, publishedCards } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    productRows = (await db.select({ slug: products.slug, updatedAt: products.updatedAt, images: products.images }).from(products).where(eq(products.status, "published")))
      .filter((r) => r.slug);
    const snaps = await db.select({ slug: publishedCards.slug, data: publishedCards.data, updatedAt: publishedCards.updatedAt }).from(publishedCards);
    snaps.sort((a, b) => new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime());
    for (const r of snaps) {
      const key = String(r.slug || "").trim().toLowerCase();
      if (!key) continue;
      const d = day(r.updatedAt);
      // A customer can publish more than one card on a slug over time — keep the latest.
      if (d && d > (cardEdited.get(key) || "")) cardEdited.set(key, d);
      const data = r.data as { customer?: Record<string, unknown>; products?: { name?: unknown }[] } | null;
      if (data?.customer) published.set(key, { slug: String(r.slug).trim(), customer: data.customer, products: Array.isArray(data.products) ? data.products : [] });
    }
  } catch { /* products / published_cards may not exist yet */ }
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // Image sitemap entries (Google's image extension) let the pictures on a page
  // be found for Google Images — including ones a crawler would otherwise only
  // meet after running JavaScript. Absolute URLs on this site only.
  const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`);
  const imageTags = (images: string[]) =>
    images.filter(Boolean).slice(0, 5).map((i) => `<image:image><image:loc>${esc(abs(i))}</image:loc></image:image>`).join("");
  const url = (loc: string, pri: string, lastmod = "", images: string[] = []) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${pri}</priority>${imageTags(images)}</url>`;
  // Industry pages: one URL per profession, dated by the page's own last edit.
  // Detail pages carry no image entries: they don't show the persona pictures.
  const { INDUSTRIES, industryPath, industriesLastmod, PERSONA_IMAGE_DIR } = await import("../src/data/industries");
  const industryUrls = INDUSTRIES.map((i) => url(`${base}${industryPath(i.slug)}`, "0.7", i.updatedAt));
  // The hub changes when a profession page is added or edited, not on every deploy.
  const industryLastmod = industriesLastmod() || deployDay;
  // The pictures each marketing page shows (the page itself is server-rendered).
  const pageImages: Record<string, string[]> = {
    "": ["/hero/digital-business-card-app-mockup.png", "/hero/digital-business-card-nfc-card-professional.png", "/hero/digital-business-card-analytics-dashboard.png"],
    // The hub's cards show the sample phone screenshots. Several professions
    // share one picture, so each is listed once (imageTags keeps the first 5).
    "/industries": [...new Set(INDUSTRIES.flatMap((i) => (i.mockup ? [`${PERSONA_IMAGE_DIR}/${i.mockup.img}.png`] : [])))],
  };

  // Cards: legacy customers.json plus cards published from the dashboard. Only
  // cards src/lib/cardSeo.ts marks indexable are listed — the same rule that puts
  // noindex on the card page — so the sitemap never points Google at a page
  // that asks to be left out.
  const legacyBySlug = new Map<string, Record<string, unknown>>();
  const cardSlugs = new Map<string, string>(); // lowercase → as written
  for (const r of customers) {
    const s = String(r.slug || "").trim();
    if (!s || legacyBySlug.has(s.toLowerCase())) continue;
    legacyBySlug.set(s.toLowerCase(), r);
    cardSlugs.set(s.toLowerCase(), s);
  }
  for (const [k, v] of published) if (!cardSlugs.has(k)) cardSlugs.set(k, v.slug);
  const productsBySlug = new Map<string, Record<string, unknown>[]>();
  for (const p of legacyProducts) {
    const k = String(p.uname ?? "").toLowerCase();
    if (k) productsBySlug.set(k, [...(productsBySlug.get(k) ?? []), p]);
  }
  const cardUrls: string[] = [];
  for (const [k, s] of cardSlugs) {
    const snap = published.get(k);
    const customer = snap?.customer ?? legacyBySlug.get(k);
    if (!customer) continue;
    if (!cardSeo({ slug: k, customer, products: snap ? snap.products : productsBySlug.get(k) }).indexable) continue;
    cardUrls.push(url(`${base}/${encodeURIComponent(s)}`, "0.5", cardEdited.get(k) || ""));
  }
  // Blog articles, with the date each was last really updated.
  const { BLOG_POSTS, blogArtPath, blogPostPath } = await import("../src/data/blog");
  // Each article's picture: its feature image when set, and the cover artwork
  // shown at the top of the article (the same image as its structured data).
  const blogUrls = BLOG_POSTS.map((p) => url(`${base}${blogPostPath(p.slug)}`, "0.7", p.updatedAt,
    [...(p.image ? [p.image.src] : []), blogArtPath(p, "16x9")]));
  // The blog page changes when an article is added or updated, not on every deploy.
  const blogLastmod = BLOG_POSTS.map((p) => p.updatedAt).sort().at(-1) || deployDay;
  // A template page shows its design images (product.images, site paths or URLs).
  const productImages = (images: unknown) => (Array.isArray(images) ? images : []).map((i) => String(i ?? "").trim()).filter((i) => /^(https?:\/\/|\/)/i.test(i));
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    pages.map((p) => url(base + p, p === "" ? "1.0" : "0.7", p === "/blog" ? blogLastmod : p === "/industries" ? industryLastmod : deployDay, pageImages[p] ?? [])).join("\n") + "\n" +
    blogUrls.join("\n") + "\n" +
    industryUrls.join("\n") + "\n" +
    productRows.map((r) => url(`${base}/digital-business-cards-templates/${encodeURIComponent(r.slug)}`, "0.8", day(r.updatedAt), productImages(r.images))).join("\n") + "\n" +
    cardUrls.join("\n") +
    `\n</urlset>`;
  sitemapXml = { body, at: Date.now() };
  return c.body(body, 200, { "content-type": "application/xml; charset=utf-8" });
});

// Block the raw public files outright (defence-in-depth alongside the CDN rule).
// Google Merchant product feed (RSS 2.0 + g: namespace), generated from the
// published catalogue (§48). Prices match the product pages (§49); every item
// is honestly described as a DIGITAL service — no physical/NFC claims (§47).
// Note: this only makes the feed eligible; Google approval is never guaranteed.
const serveMerchantFeed = async (c: import("hono").Context) => {
  let rows: import("./lib/merchant-feed").FeedProduct[] = [];
  try {
    const { getDb } = await import("./queries/connection");
    const { products } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    rows = await getDb().select().from(products).where(eq(products.status, "published")) as unknown as import("./lib/merchant-feed").FeedProduct[];
  } catch { /* products table may not exist yet */ }
  const { buildProductFeedXml } = await import("./lib/merchant-feed");
  return c.body(buildProductFeedXml(rows), 200, { "content-type": "application/xml; charset=utf-8" });
};
// Canonical Merchant Center feed URL + legacy alias.
app.get("/merchant-feed.xml", serveMerchantFeed);
app.get("/feed/products.xml", serveMerchantFeed);

// Block every sensitive dump at the web root — otherwise serveStatic serves
// them verbatim. Admins fetch these only via the token-gated /api/admin/data/:file.
for (const f of SENSITIVE) app.get(`/${f}.json`, (c) => c.json({ error: "Forbidden" }, 403));

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStatic } = await import("@hono/node-server/serve-static");
  const { serveStaticFiles } = await import("./lib/vite");

  // Legacy customer media (logos, gallery, products, QR codes, offers) migrated
  // from the old PHP site's /otdo-panel/uploads/. Served from ./media so it
  // PERSISTS across deploys (dist/public is rebuilt each time) and stays OUT of
  // git (uploaded to the server directly). Files live at
  // ./media/otdo-panel/uploads/<home|gallery|product|qrcode|offer>/... Cached 7d.
  app.use("/otdo-panel/uploads/*", async (c, next) => {
    await next();
    if (c.res.status === 200) c.header("Cache-Control", "public, max-age=604800");
  });
  app.use("/otdo-panel/uploads/*", serveStatic({ root: "./media" }));

  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
