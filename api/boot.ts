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
  if (!payload) return null;
  // Re-check the CURRENT role in the DB — never trust the (possibly stale) token
  // claim for the most sensitive endpoint in the app (Phase 31). A demoted admin
  // must lose access immediately, not at token expiry.
  const { getDb } = await import("./queries/connection");
  const { users } = await import("@db/schema");
  const { eq } = await import("drizzle-orm");
  const row = await getDb().select({ role: users.role }).from(users).where(eq(users.id, payload.userId));
  return row[0]?.role === "super_admin" ? payload : null;
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
// it can never take the site down. Behind Cloudflare/nginx we trust the
// forwarded client IP headers.
const rlBuckets = new Map<string, { count: number; resetAt: number }>();
let rlLastSweep = Date.now();
function rateLimit(
  c: { req: { header: (k: string) => string | undefined } },
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
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = bucket + ":" + ip;
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

// Public enquiry capture for the legacy (customers.json) cards — stores the lead
// when the slug maps to a known card, and always emails the owner.
app.post("/api/enquiry", async (c) => {
  if (!rateLimit(c, "enquiry", 10, 60_000)) return c.json({ ok: false, error: "rate_limited" }, 429);
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

// Daily lifecycle + trial emails. Runs the §9 milestone journey (card_trials
// engine) plus the legacy subscription-trial FOMO emailer. Both are dedup-safe.
async function runDailyEmailJobs() {
  const [{ runLifecycle }, { runTrialEmails }] = await Promise.all([
    import("./cron/lifecycle"),
    import("./cron/trial-emails"),
  ]);
  const lifecycle = await runLifecycle();          // new card_trials milestones
  const legacy = await runTrialEmails().catch((e) => { console.error("[cron] legacy trial-emails:", (e as Error).message); return null; });
  return { lifecycle, legacy };
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

app.get("/api/admin/data/:file", async (c) => {
  const file = c.req.param("file");
  if (!SENSITIVE.has(file)) return c.json({ error: "Not found" }, 404);
  if (!(await requireSuperAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
  const data = await readPublicJson(file);
  if ((file === "enquiries" || file === "customers") && Array.isArray(data)) {
    const hidden = await getHiddenIds(file);
    if (hidden.size) return c.json((data as Record<string, unknown>[]).filter((r) => !hidden.has(String(r.id))));
  }
  return c.json(data);
});

// Super-admin: persist a delete by hiding record ids from the JSON overlay.
app.post("/api/admin/hide", async (c) => {
  if (!(await requireSuperAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
  try {
    const body = await c.req.json<{ file?: string; ids?: (string | number)[] }>();
    const file = String(body.file || "");
    if (file !== "enquiries" && file !== "customers") return c.json({ error: "Invalid file" }, 400);
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
    const rows = await db.select({ slug: publishedCards.slug, data: publishedCards.data, cardId: publishedCards.cardId })
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
const TRACK_TYPES = ["view", "call", "whatsapp", "email", "website", "directions", "save_contact", "qr_scan", "product", "share", "social", "enquiry"];
app.post("/api/track", async (c) => {
  if (!rateLimit(c, "track", 120, 60_000)) return c.json({ ok: false, error: "rate_limited" }, 429);
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
// the client verify ran, this still activates their plan. Verifies the webhook
// signature (HMAC of the RAW body with the webhook secret), then on
// payment.captured records + activates the order idempotently (dedup by payment id,
// shared with the client-verify path). Non-2xx makes Razorpay retry, so a transient
// DB/API hiccup never loses a payment.
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

// Dynamic sitemap: marketing pages + every public card, so Google can discover
// all 500+ card profiles.
app.get("/sitemap.xml", async (c) => {
  const base = "https://digitalcarda.in";
  const pages = ["", "/digital-business-cards-templates", "/features", "/pricing", "/industries", "/bulk-cards",
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
    productSlugs.map((s) => url(`${base}/digital-business-cards-templates/${encodeURIComponent(s)}`, "0.8")).join("\n") + "\n" +
    slugs.map((s) => url(`${base}/${encodeURIComponent(s)}`, "0.5")).join("\n") +
    `\n</urlset>`;
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
