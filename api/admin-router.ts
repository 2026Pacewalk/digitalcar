import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { publishedCards, users, cardTrials, subscriptions } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { legacySlugSet, slugTakenByOther } from "./publish-router";

/* Emails that belong to a LEGACY customers.json card — used to flag which DB
   accounts are genuinely "new-flow" (i.e. NOT already in the legacy list, which
   is all the admin Customers page shows). Cached 60s. */
let legacyEmailCache: Set<string> | null = null;
let legacyEmailAt = 0;
function legacyEmailSet(): Set<string> {
  const now = Date.now();
  if (legacyEmailCache && now - legacyEmailAt < 60_000) return legacyEmailCache;
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(fs.readFileSync(path.resolve(p), "utf-8")) as { email?: string }[];
      legacyEmailCache = new Set(rows.map((r) => String(r.email || "").toLowerCase().trim()).filter(Boolean));
      legacyEmailAt = now;
      return legacyEmailCache;
    } catch { /* try next */ }
  }
  return legacyEmailCache ?? new Set();
}

/* Super-admin tools. Today: resolve cross-system card-URL conflicts, where a
   NEW-FLOW snapshot card shares a slug with a LEGACY (customers.json) card and
   — because "snapshot wins over legacy JSON" on the public page — shadows the
   rightful legacy owner (the pacewalk -> Taniya incident). These new-flow
   accounts don't appear in the customers.json-based admin list, so this is the
   only place to see and fix them. Super-admin only. */
export const adminRouter = createRouter({
  // Every NEW-FLOW DB account (i.e. NOT already in the legacy customers.json list,
  // which is all the Customers page shows). Mapped to the same shape the admin
  // Customers table renders so they merge in seamlessly. Super-admin only.
  appUsers: adminQuery.query(async () => {
    const db = getDb();
    const legacyEmails = legacyEmailSet();
    const [allUsers, pubs, subs, trials] = await Promise.all([
      db.select({ id: users.id, email: users.email, name: users.fullName, phone: users.phone, status: users.status, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
      db.select({ userId: publishedCards.userId, slug: publishedCards.slug }).from(publishedCards),
      db.select({ userId: subscriptions.userId, packageId: subscriptions.packageId, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd, currentPeriodStart: subscriptions.currentPeriodStart }).from(subscriptions).orderBy(desc(subscriptions.createdAt)),
      db.select({ userId: cardTrials.userId, startedAt: cardTrials.startedAt, endsAt: cardTrials.endsAt }).from(cardTrials),
    ]);
    const slugBy = new Map<number, string>();
    for (const p of pubs) if (!slugBy.has(Number(p.userId))) slugBy.set(Number(p.userId), p.slug);
    const subBy = new Map<number, (typeof subs)[number]>();
    for (const s of subs) if (!subBy.has(Number(s.userId))) subBy.set(Number(s.userId), s); // latest (desc order)
    const trialBy = new Map<number, (typeof trials)[number]>();
    for (const t of trials) trialBy.set(Number(t.userId), t);
    const now = Date.now();
    // Crash-proof: a bad/zero date must never throw and kill the whole list.
    const iso = (d: unknown) => {
      if (!d) return null;
      const t = new Date(d as string | number | Date).getTime();
      return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 19).replace("T", " ");
    };
    // Return EVERY non-super-admin account (not just those missing from the
    // legacy list) so no app user can ever be hidden; the frontend dedupes by
    // email against the legacy list. Each row is wrapped so one bad record can
    // never throw and blank the whole list.
    return allUsers
      .filter((u) => u.role !== "super_admin")
      .map((u) => {
        try {
          const uid = Number(u.id);
          const sub = subBy.get(uid);
          const trial = trialBy.get(uid);
          const subActive = !!sub && sub.status === "active" && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd).getTime() > now);
          return {
            id: 900_000_000 + uid, // offset so it can't collide with a legacy customer id (React keys / sort)
            dbId: uid,
            name: u.name || "—",
            username: slugBy.get(uid) || String(u.email).split("@")[0],
            email: u.email,
            mobile1: u.phone || "",
            slug: slugBy.get(uid) || "",
            package_id: subActive && sub?.packageId ? Number(sub.packageId) : 7,
            admin_id: 0, // new-flow signups = Website
            activated_on: sub?.currentPeriodStart ? iso(sub.currentPeriodStart) : (trial?.startedAt ? iso(trial.startedAt) : iso(u.createdAt)),
            expired_on: subActive && sub?.currentPeriodEnd ? iso(sub.currentPeriodEnd) : (trial?.endsAt ? iso(trial.endsAt) : null),
            status: u.status === "active" ? 1 : 0,
            password: "",
            isNew: !legacyEmails.has(String(u.email).toLowerCase().trim()),
          };
        } catch { return null; }
      })
      .filter(Boolean);
  }),

  // Diagnostic: look up any account by email / phone / name / id and explain
  // exactly whether (and how) it appears in the Customers list. Super-admin only.
  lookupAccount: adminQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const q = input.query.trim().toLowerCase();
      const digits = input.query.replace(/\D/g, "");
      const legacyEmails = legacyEmailSet();
      const all = await db.select({ id: users.id, email: users.email, name: users.fullName, phone: users.phone, role: users.role, status: users.status, createdAt: users.createdAt }).from(users);
      const matches = all.filter((u) => {
        const email = String(u.email || "").toLowerCase();
        const phone = String(u.phone || "").replace(/\D/g, "");
        const name = String(u.name || "").toLowerCase();
        return email.includes(q) || name.includes(q) || String(u.id) === q || (digits.length >= 6 && phone.includes(digits));
      }).slice(0, 20);
      const pubs = matches.length ? await db.select({ userId: publishedCards.userId, slug: publishedCards.slug }).from(publishedCards) : [];
      const slugBy = new Map<number, string>();
      for (const p of pubs) if (!slugBy.has(Number(p.userId))) slugBy.set(Number(p.userId), p.slug);
      const day = (d: unknown) => { const t = d ? new Date(d as string).getTime() : NaN; return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10); };
      return {
        found: matches.length,
        accounts: matches.map((u) => {
          const inLegacy = legacyEmails.has(String(u.email).toLowerCase().trim());
          const isSuper = u.role === "super_admin";
          return {
            id: Number(u.id), email: u.email, name: u.name, phone: u.phone, role: u.role, status: u.status,
            slug: slugBy.get(Number(u.id)) || null, createdAt: day(u.createdAt),
            inLegacy, showsInCustomers: !isSuper,
            verdict: isSuper
              ? "Hidden — super-admin accounts aren't listed in Customers."
              : inLegacy
                ? "Shows in Customers as a LEGACY entry (also in customers.json)."
                : "Shows in Customers as a NEW-flow account (green NEW badge).",
          };
        }),
      };
    }),

  // List every snapshot whose slug ALSO belongs to a legacy customers.json card.
  slugConflicts: adminQuery.query(async () => {
    const db = getDb();
    const legacy = legacySlugSet();
    if (!legacy.size) return [];
    const snaps = await db
      .select({
        id: publishedCards.id,
        userId: publishedCards.userId,
        cardId: publishedCards.cardId,
        slug: publishedCards.slug,
        publicId: publishedCards.publicId,
        email: users.email,
        name: users.fullName,
        updatedAt: publishedCards.updatedAt,
      })
      .from(publishedCards)
      .leftJoin(users, eq(users.id, publishedCards.userId));
    return snaps
      .filter((s) => legacy.has(String(s.slug).toLowerCase().trim()))
      .map((s) => ({ ...s, suggested: `${String(s.slug).toLowerCase()}-2` }));
  }),

  // Move a snapshot card off a conflicting URL. Only touches the ONE snapshot
  // row (by userId+cardId); the legacy card is never modified. Guarded so the
  // new slug isn't itself taken. Super-admin only.
  reslugCard: adminQuery
    .input(z.object({
      userId: z.number().int().positive(),
      cardId: z.number().int().positive().default(1),
      newSlug: z.string().min(1).max(191),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const slug = input.newSlug.trim().replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
      if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid URL." });
      if (await slugTakenByOther(db, slug, input.userId, input.cardId))
        throw new TRPCError({ code: "CONFLICT", message: "That URL is already taken — pick another." });
      const owner = and(eq(publishedCards.userId, input.userId), eq(publishedCards.cardId, input.cardId));
      const existing = await db.select({ id: publishedCards.id }).from(publishedCards).where(owner);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "No published card for that account." });
      await db.update(publishedCards).set({ slug }).where(owner);
      return { ok: true, slug };
    }),
});
