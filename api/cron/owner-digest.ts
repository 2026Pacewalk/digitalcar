/*
 * Owner's daily digest (email plan item 6).
 * ------------------------------------------------------------------
 * One email a day to the platform inbox (ownerAddress) with everything that is
 * waiting on the team: payments to verify, payouts, NFC orders to make or
 * collect for, deletions due, new bulk requests, trials and paid plans about
 * to end, failed emails — plus signups and revenue for the last 24 hours.
 * Several of these have no reminder anywhere else.
 *
 * Once per India calendar day, via its own app_settings key (owner_digest_last
 * = "YYYY-MM-DD" IST), written only after the send succeeds. The daily
 * scheduler's own marker isn't enough: POST /api/cron/trial-emails runs the
 * jobs without checking it.
 *
 * Each list is gathered on its own; one that fails to load is left out of the
 * email (the template then doesn't mention it) rather than sinking the digest.
 * Never throws.
 */
import { getDb } from "../queries/connection";
import {
  users, paymentOrders, nfcOrders, bulkOrderRequests, withdrawalRequests, accountDeletionRequests,
  cardTrials, emailLogs, subscriptionPackages, appSettings,
} from "@db/schema";
import { and, eq, gte, lt, lte, inArray, notInArray, isNull, asc, desc, sql } from "drizzle-orm";
import { sendEmail, ownerAddress } from "../lib/mail";
import { ownerDailyDigestEmail, type OwnerDigest } from "../lib/email-templates";
import { latestPaidRowsEnding } from "./billing";

type Db = ReturnType<typeof getDb>;

const DAY = 86_400_000;
const IST = 19_800_000;   // +05:30
const LAST_KEY = "owner_digest_last";
const ROWS = 25;          // rows fetched per list; the template shows 3–5 and says "+N more"

/** 00:00 IST of the India calendar day that contains `t`. */
const istMidnight = (t: number) => { const d = new Date(t + IST); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST; };
const ageDays = (at: Date | string | null | undefined, now: number) => at ? Math.max(0, Math.floor((now - new Date(at).getTime()) / DAY)) : 0;
const CYCLE: Record<string, string> = { monthly: "monthly", yearly: "yearly", triennial: "3 years" };
const PRODUCT: Record<string, string> = { nfc_card: "NFC card", nfc_standee: "NFC standee" };

async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

/** One list's query. A failure leaves that list out instead of failing the digest. */
async function gather<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try { return await fn(); } catch (e) {
    console.error(`[owner-digest] ${label}:`, (e as Error).message);
    return undefined;
  }
}

const countOf = (rows: { n: unknown }[]) => Number(rows[0]?.n) || 0;

async function peopleById(db: Db, ids: number[]) {
  const uniq = [...new Set(ids)];
  const rows = uniq.length
    ? await db.select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, status: users.status })
      .from(users).where(inArray(users.id, uniq))
    : [];
  return new Map(rows.map((u) => [u.id, u]));
}

/** "2 × NFC card, 1 × NFC standee" */
function itemsLine(rows: { product: string; quantity: number }[]): string {
  const qty = new Map<string, number>();
  for (const r of rows) qty.set(r.product, (qty.get(r.product) || 0) + (Number(r.quantity) || 1));
  return [...qty].map(([p, q]) => `${q} × ${PRODUCT[p] ?? p}`).join(", ");
}

/** NFC order rows grouped per customer, oldest group first. */
function groupNfc<R extends { id: number; userId: number; product: string; quantity: number; amount: string; shipName: string; createdAt: Date }>(
  rows: R[], people: Awaited<ReturnType<typeof peopleById>>, now: number,
) {
  const groups = new Map<number, R[]>();
  for (const r of rows) { const g = groups.get(r.userId); if (g) g.push(r); else groups.set(r.userId, [r]); }
  return [...groups].map(([uid, g]) => ({
    ids: g.map((r) => r.id),
    name: people.get(uid)?.fullName || g[0].shipName,
    items: itemsLine(g),
    amount: g.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    ageDays: Math.max(...g.map((r) => ageDays(r.createdAt, now))),
  }));
}

/** runLifecycle()'s result, if that's what was passed. */
function automationOf(v: unknown): OwnerDigest["automation"] {
  if (!v || typeof v !== "object") return undefined;
  const r = v as { enabled?: unknown; sent?: unknown; abandoned?: unknown };
  if (typeof r.enabled !== "boolean") return undefined;
  return { enabled: r.enabled, sent: Number(r.sent) || 0, abandoned: Number(r.abandoned) || 0 };
}

/** Read-only: every figure the digest shows, as of `now`. */
export async function buildOwnerDigest(db: Db, now = Date.now(), lifecycle?: unknown): Promise<OwnerDigest> {
  const since24h = new Date(now - DAY);
  const dayStart = istMidnight(now);
  const totals: NonNullable<OwnerDigest["totals"]> = {};

  const signups = await gather("signups", async () => {
    const [day, week] = await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "customer"), gte(users.createdAt, since24h))),
      db.select({ n: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "customer"), gte(users.createdAt, new Date(now - 7 * DAY)))),
    ]);
    return { today: countOf(day), week: countOf(week) };
  });

  // Plan payments only (payment_orders), the same figures as Payment Orders' cards.
  const revenue = await gather("revenue", async () => {
    const rows = await db.select({ gateway: paymentOrders.gateway, n: sql<number>`count(*)`, sum: sql<string>`coalesce(sum(${paymentOrders.amount}), 0)` })
      .from(paymentOrders).where(and(eq(paymentOrders.status, "verified"), gte(paymentOrders.verifiedAt, since24h)))
      .groupBy(paymentOrders.gateway);
    let manual = 0, online = 0, count = 0;
    for (const r of rows) {
      const s = Number(r.sum) || 0;
      if (r.gateway === "razorpay") online += s; else manual += s;
      count += Number(r.n) || 0;
    }
    return { manual, online, count };
  });

  const pendingPayments = await gather("pending payments", async () => {
    const where = and(eq(paymentOrders.status, "pending"), eq(paymentOrders.gateway, "manual"));
    const [rows, n] = await Promise.all([
      db.select().from(paymentOrders).where(where).orderBy(asc(paymentOrders.createdAt)).limit(ROWS),
      db.select({ n: sql<number>`count(*)` }).from(paymentOrders).where(where),
    ]);
    totals.pendingPayments = countOf(n);
    const people = await peopleById(db, rows.map((r) => r.userId));
    return rows.map((r) => ({
      name: people.get(r.userId)?.fullName || `User #${r.userId}`,
      plan: `${r.planName || "Plan"} · ${CYCLE[r.billingCycle] ?? r.billingCycle}`,
      amount: Number(r.amount) || 0,
      ageDays: ageDays(r.createdAt, now),
    }));
  });

  const nfcToProduce = await gather("NFC to produce", async () => {
    const rows = await db.select().from(nfcOrders).where(eq(nfcOrders.status, "paid")).orderBy(asc(nfcOrders.createdAt)).limit(200);
    const groups = groupNfc(rows, await peopleById(db, rows.map((r) => r.userId)), now);
    return groups.map(({ ids, name, items }) => ({ ids, name, items }));
  });

  // Manual NFC orders only: an online checkout that never finished also sits in
  // pending_payment, but with a razorpayOrderId — nothing to collect there.
  const nfcAwaitingPayment = await gather("NFC awaiting payment", async () => {
    const rows = await db.select().from(nfcOrders)
      .where(and(eq(nfcOrders.status, "pending_payment"), isNull(nfcOrders.razorpayOrderId)))
      .orderBy(asc(nfcOrders.createdAt)).limit(200);
    return groupNfc(rows, await peopleById(db, rows.map((r) => r.userId)), now);
  });

  const bulkRequests = await gather("bulk requests", async () => {
    const where = eq(bulkOrderRequests.status, "new");
    const [rows, n] = await Promise.all([
      db.select().from(bulkOrderRequests).where(where).orderBy(desc(bulkOrderRequests.createdAt)).limit(ROWS),
      db.select({ n: sql<number>`count(*)` }).from(bulkOrderRequests).where(where),
    ]);
    totals.bulkRequests = countOf(n);
    return rows.map((r) => ({
      company: r.company || "", quantity: Number(r.quantity) || 0,
      contact: [r.contactName, r.phone].filter(Boolean).join(" · ") || null,
    }));
  });

  const payoutsPending = await gather("payouts", async () => {
    const where = eq(withdrawalRequests.status, "pending");
    const [rows, n] = await Promise.all([
      db.select().from(withdrawalRequests).where(where).orderBy(asc(withdrawalRequests.createdAt)).limit(ROWS),
      db.select({ n: sql<number>`count(*)` }).from(withdrawalRequests).where(where),
    ]);
    totals.payoutsPending = countOf(n);
    const people = await peopleById(db, rows.map((r) => r.userId));
    return rows.map((r) => ({ name: people.get(r.userId)?.fullName || `User #${r.userId}`, amount: Number(r.amount) || 0, ageDays: ageDays(r.createdAt, now) }));
  });

  // Same rule as the admin Deletion requests page: pending and past its date.
  const deletionsDue = await gather("deletions due", async () => {
    const where = and(eq(accountDeletionRequests.status, "pending"), lte(accountDeletionRequests.scheduledFor, new Date(now)));
    const [rows, n] = await Promise.all([
      db.select({ email: accountDeletionRequests.email, due: accountDeletionRequests.scheduledFor }).from(accountDeletionRequests)
        .where(where).orderBy(asc(accountDeletionRequests.scheduledFor)).limit(ROWS),
      db.select({ n: sql<number>`count(*)` }).from(accountDeletionRequests).where(where),
    ]);
    totals.deletionsDue = countOf(n);
    return rows.map((r) => ({ email: r.email, due: r.due }));
  });

  // Sales follow-ups: open trials only, and only people who can still be helped
  // (an inactive account is suspended or waiting to be erased).
  const openTrial = notInArray(cardTrials.status, ["converted", "cancelled"]);
  /** Open trials ending in [from, to), with the person's contact details. */
  const trialRows = async (from: Date, to: Date) => {
    const rows = await db.select({ userId: cardTrials.userId, endsAt: cardTrials.endsAt }).from(cardTrials)
      .where(and(openTrial, gte(cardTrials.endsAt, from), lt(cardTrials.endsAt, to)))
      .orderBy(asc(cardTrials.endsAt)).limit(200);
    const people = await peopleById(db, rows.map((r) => r.userId));
    return rows.flatMap((r) => {
      const u = people.get(r.userId);
      return u && u.status === "active" && r.endsAt ? [{ name: u.fullName, email: u.email, phone: u.phone, at: r.endsAt }] : [];
    });
  };
  const trialsEnding = await gather("trials ending", async () =>
    (await trialRows(new Date(now), new Date(now + 3 * DAY))).map(({ at, ...p }) => ({ ...p, endsOn: at })));
  // Ended during yesterday's India date.
  const trialsEnded = await gather("trials ended", async () =>
    (await trialRows(new Date(dayStart - DAY), new Date(dayStart))).map(({ at, ...p }) => ({ ...p, endedOn: at })));

  const plansExpiring = await gather("plans expiring", async () => {
    const rows = await latestPaidRowsEnding(db, new Date(now), new Date(now + 7 * DAY), 500);
    const [people, pkgs] = await Promise.all([
      peopleById(db, rows.map((r) => r.userId)),
      db.select({ id: subscriptionPackages.id, name: subscriptionPackages.name }).from(subscriptionPackages),
    ]);
    const pkgName = new Map(pkgs.map((p) => [p.id, p.name]));
    return rows.flatMap((r) => {
      const u = people.get(r.userId);
      return u && u.status === "active"
        ? [{ name: u.fullName, email: u.email, plan: `${pkgName.get(r.packageId) || "Paid plan"} · ${CYCLE[r.billingCycle] ?? r.billingCycle}`, endsOn: r.currentPeriodEnd }]
        : [];
    });
  });

  const failedEmails = await gather("failed emails", async () => countOf(
    await db.select({ n: sql<number>`count(*)` }).from(emailLogs).where(and(eq(emailLogs.status, "failed"), gte(emailLogs.createdAt, since24h))),
  ));

  return {
    date: new Date(now), periodLabel: "last 24 hours",
    signups, revenue, pendingPayments, nfcToProduce, nfcAwaitingPayment, bulkRequests, payoutsPending,
    deletionsDue, trialsEnding, trialsEnded, plansExpiring, failedEmails, totals,
    automation: automationOf(lifecycle),
  };
}

export type OwnerDigestResult = { sent: boolean; date: string; skipped?: string; error?: string };

let running = false; // the scheduler and POST /api/cron/trial-emails share this process

export async function runOwnerDigest(opts?: { lifecycle?: unknown }): Promise<OwnerDigestResult> {
  const now = Date.now();
  const today = new Date(now + IST).toISOString().slice(0, 10); // India date
  const out: OwnerDigestResult = { sent: false, date: today };
  if (running) return { ...out, skipped: "already running" };
  running = true;
  try {
    const db = getDb();
    if ((await getSetting(db, "owner_digest_enabled")) === "0") { out.skipped = "switched off"; return out; }
    if ((await getSetting(db, LAST_KEY)) === today) { out.skipped = "already sent today"; return out; }

    const digest = await buildOwnerDigest(db, now, opts?.lifecycle);
    const res = await sendEmail(ownerAddress(), ownerDailyDigestEmail(digest));
    if (!res.ok) { out.error = res.error || "send failed"; return out; }
    out.sent = true;
    // Marked only now, so a failed send is retried by the next run the same day.
    try {
      await db.insert(appSettings).values({ key: LAST_KEY, value: today }).onDuplicateKeyUpdate({ set: { value: today } });
    } catch (e) {
      console.error("[owner-digest] could not save the day marker:", (e as Error).message);
    }
    return out;
  } catch (e) {
    console.error("[owner-digest] run error:", (e as Error).message);
    return { ...out, error: (e as Error).message };
  } finally {
    running = false;
    console.log(`[owner-digest] ${today}: ${out.sent ? "sent" : `not sent (${out.skipped || "see errors"})`}`);
  }
}
