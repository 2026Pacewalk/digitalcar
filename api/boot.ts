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
      const { cards, leads } = await import("@db/schema");
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

// Block the raw public files outright (defence-in-depth alongside the CDN rule).
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
