/*
 * Paid-plan renewal reminders + "plan ended" notice (email plan item 2).
 * ------------------------------------------------------------------
 * Runs once a day from runDailyEmailJobs. Nothing renews or charges by itself
 * and nothing ever flips a subscriptions row to "expired", so without this a
 * paying customer's plan just lapses silently.
 *
 * Who: each user's LATEST subscriptions row (same order as
 * subscription.mySubscription), only when it is still "active" and a paid plan.
 * Paid is decided by package, not amount: package 7 is the free trial, and
 * admin-granted Gold/Platinum rows are ₹0. Only active accounts (a pending
 * deletion or a suspension is skipped). Legacy customers.json plans have no row,
 * so they are not covered here.
 *
 *   ends in 2–7 India days  → one "ends in N days" reminder
 *   ends today / tomorrow   → one last reminder
 *   ended in the last 7 days → one "plan has ended" email
 *
 * Ledger: notifications rows ls_renew7_ / ls_renew1_ / ls_subexp_ + <subId>_<end
 * day>. The end day is part of the key because the admin's Change Package and
 * Extend Validity rewrite the SAME row with a new end date; keyed on the row id
 * alone, a customer renewed that way would never be reminded again. ls_* rows
 * survive "clear notifications" (notification-router clearAll).
 * Unlike lifecycle.ts's claim(), a marker is removed again when the send fails,
 * so an SMTP outage means a retry on the next run, not a lost reminder.
 * Never throws.
 */
import { getDb } from "../queries/connection";
import { subscriptions, subscriptionPackages, users, notifications, publishedCards, appSettings } from "@db/schema";
import { and, eq, ne, gte, lt, inArray, asc, desc } from "drizzle-orm";
import { sendEmail } from "../lib/mail";
import { allows } from "../lib/notify-prefs";
import { subscriptionRenewalReminderEmail, subscriptionExpiredEmail } from "../lib/email-templates";
import { getFxConfig, effectiveRowCurrency, usersWithUsdPayments } from "../lib/fx";
import { isCurrency, type Currency } from "@contracts/money";

type Db = ReturnType<typeof getDb>;
type Email = Parameters<typeof sendEmail>[1];

const DAY = 86_400_000;
const IST = 19_800_000;            // +05:30
const TRIAL_PACKAGE_ID = 7;
const MAX_SENDS = 150;             // per run; anything left is still inside its window tomorrow
const ENDED_WINDOW_DAYS = 7;       // so the first run doesn't tell people their plan ended months ago

/** 00:00 IST of the India calendar day that contains `t`. */
const istMidnight = (t: number) => { const d = new Date(t + IST); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST; };
/** "20261021" — the India calendar day of `t`, for ledger keys. */
const istYmd = (t: number) => new Date(t + IST).toISOString().slice(0, 10).replace(/-/g, "");
const showDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

/** Stand-in logins and erased accounts have no mailbox (sendEmail refuses them).
    Skipped before claiming, so they don't log a "skipped" row every day. */
export const mailable = (email?: string | null): email is string =>
  !!email && !/@(clients|deleted)\.digitalcarda\.in$/i.test(email.trim());

async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

/** Insert the send-once marker (also an in-app notification) if absent.
    Returns its id, or null when it was already claimed. */
async function claim(db: Db, userId: number, type: string, title: string, message: string, link: string): Promise<number | null> {
  const existing = await db.select({ id: notifications.id }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.type, type))).limit(1);
  if (existing.length) return null;
  const [ins] = await db.insert(notifications).values({ userId, type, title, message, link });
  return Number(ins.insertId);
}

/** Drop a marker whose email didn't go out, so the next run tries again. */
async function release(db: Db, id: number): Promise<void> {
  try { await db.delete(notifications).where(eq(notifications.id, id)); } catch { /* next run just skips it */ }
}

/** Each user's LATEST subscriptions row, when it is a paid plan still marked
    active whose period ends in [from, to). Soonest end first. Shared with the
    owner digest's "paid plans expiring" list. */
export async function latestPaidRowsEnding(db: Db, from: Date, to: Date, limit = 2000) {
  const rows = await db.select().from(subscriptions).where(and(
    eq(subscriptions.status, "active"),
    ne(subscriptions.packageId, TRIAL_PACKAGE_ID),
    gte(subscriptions.currentPeriodEnd, from),
    lt(subscriptions.currentPeriodEnd, to),
  )).orderBy(asc(subscriptions.currentPeriodEnd)).limit(limit);
  if (!rows.length) return rows;
  // Someone who renewed or changed plan has a newer row — that one is what counts.
  const uids = [...new Set(rows.map((r) => r.userId))];
  const all = await db.select({ id: subscriptions.id, userId: subscriptions.userId }).from(subscriptions)
    .where(inArray(subscriptions.userId, uids))
    .orderBy(desc(subscriptions.createdAt), desc(subscriptions.id));
  const newest = new Map<number, number>();
  for (const r of all) if (!newest.has(r.userId)) newest.set(r.userId, r.id);
  return rows.filter((r) => newest.get(r.userId) === r.id);
}

type Pkg = typeof subscriptionPackages.$inferSelect;
const priceFor = (p: Pkg, cycle: string) =>
  Number(cycle === "triennial" ? p.threeYearPrice : cycle === "yearly" ? p.yearlyPrice : p.monthlyPrice) || 0;
/** The next plan up on the same term (cheapest one that costs more), for the
    "upgrade before it ends and what you paid comes off" tip. */
export function nextTier(pkgs: Pkg[], current: Pkg | undefined, cycle: string): Pkg | null {
  if (!current) return null;
  const mine = priceFor(current, cycle);
  return pkgs
    .filter((p) => p.isActive && p.id !== TRIAL_PACKAGE_ID && p.id !== current.id && priceFor(p, cycle) > mine)
    .sort((a, b) => priceFor(a, cycle) - priceFor(b, cycle))[0] ?? null;
}

/** The currency a subscription was paid in. Anything but "USD" (every row from
    before USD existed) is ₹. */
export const rowCurrency = (v: unknown): Currency => (isCurrency(v) ? v : "INR");

/** Whether the reminder may say "upgrade before it ends and what you paid comes
    off": a paid row (admin-granted ₹0 rows get no tip, as before), and for a $
    plan only while USD checkout is on — with it off, upgrades are charged in ₹,
    so "the $12 you paid comes off" wouldn't be true. */
export const creditTipApplies = (row: { amount: unknown; currency?: unknown }, usdCheckoutOn: boolean) =>
  Number(row.amount) > 0 && (rowCurrency(row.currency) === "INR" || usdCheckoutOn);

/** USD checkout switch, for the tip above. Unreadable means off: the tip is then
    only left out of $ plans' reminders. */
async function usdCheckoutOn(db: Db): Promise<boolean> {
  try { return (await getFxConfig(db)).enabled; } catch { return false; }
}

export type BillingStage = "renew7" | "renew1" | "subexp";
export type DueBillingEmail = {
  subId: number; userId: number; to: string; stage: BillingStage;
  /** Ledger key, e.g. ls_renew7_812_20261028 (≤ 50 chars: notifications.type). */
  type: string; title: string; message: string;
  /** Built only when it is actually sent. */
  render: () => Email;
};

/** Read-only: the billing emails due now (before the ledger check), soonest end first. */
export async function dueBillingEmails(db: Db, now = Date.now()): Promise<{ scanned: number; due: DueBillingEmail[] }> {
  const today = istMidnight(now);
  // Ended up to 7 days ago … ends on or before the India day 7 days from today.
  const rows = await latestPaidRowsEnding(db, new Date(now - ENDED_WINDOW_DAYS * DAY), new Date(today + 8 * DAY));
  if (!rows.length) return { scanned: 0, due: [] };

  const uids = [...new Set(rows.map((s) => s.userId))];
  const [people, pkgs, cards] = await Promise.all([
    db.select({ id: users.id, email: users.email, fullName: users.fullName, status: users.status }).from(users).where(inArray(users.id, uids)),
    db.select().from(subscriptionPackages),
    db.select({ userId: publishedCards.userId, slug: publishedCards.slug }).from(publishedCards)
      .where(inArray(publishedCards.userId, uids)).orderBy(asc(publishedCards.cardId)),
  ]);
  const userOf = new Map(people.map((u) => [u.id, u]));
  const pkgOf = new Map(pkgs.map((p) => [p.id, p]));
  const slugOf = new Map<number, string>();
  for (const c of cards) if (!slugOf.has(c.userId)) slugOf.set(c.userId, c.slug); // primary card first
  // Only a $ plan needs the USD switch, so an all-₹ run makes no extra query.
  // And a row counts as $ only when that member really has a verified $ payment:
  // the 'USD' column default on a pre-USD row must not change their reminder
  // (api/lib/fx.ts — the rule the checkout lock uses too).
  const labelledUsd = rows.filter((s) => rowCurrency(s.currency) === "USD");
  const usdOn = labelledUsd.length ? await usdCheckoutOn(db) : false;
  const usdUsers = await usersWithUsdPayments(db, [...new Set(labelledUsd.map((s) => s.userId))]);
  const curOf = (s: { userId: number; currency: unknown }) => effectiveRowCurrency(s.currency, usdUsers.has(s.userId));

  const due: DueBillingEmail[] = [];
  for (const s of rows) {
    const u = userOf.get(s.userId);
    if (!u || u.status !== "active" || !mailable(u.email)) continue;

    const end = new Date(s.currentPeriodEnd).getTime();
    const pkg = pkgOf.get(s.packageId);
    const planName = pkg?.name ?? "";
    const planWords = planName ? `${planName} plan` : "plan";
    const base = { name: u.fullName, planName, billingCycle: s.billingCycle, slug: slugOf.get(s.userId) ?? null, packageId: s.packageId };

    let stage: BillingStage, render: () => Email, title: string, message: string;
    if (end <= now) {
      stage = "subexp";
      render = () => subscriptionExpiredEmail({ ...base, expiredOn: new Date(end) });
      title = `Your ${planWords} has ended`;
      message = "Your card is still online. Renew to switch your premium features back on.";
    } else {
      const daysLeft = Math.round((istMidnight(end) - today) / DAY);
      if (daysLeft > 7) continue;
      stage = daysLeft <= 1 ? "renew1" : "renew7";
      // "What you paid comes off" only holds for a paid row with a plan above it
      // (payment-router computeAmount); see creditTipApplies. The credit is shown
      // in the currency the row was paid in.
      const next = creditTipApplies({ amount: s.amount, currency: curOf(s) }, usdOn) ? nextTier(pkgs, pkg, s.billingCycle) : null;
      render = () => subscriptionRenewalReminderEmail({
        ...base, daysLeft, validTill: new Date(end),
        upgradeCredit: next ? Number(s.amount) : null, nextPlanName: next?.name ?? null,
        currency: curOf(s),
      });
      title = daysLeft === 0 ? `Your ${planWords} ends today` : daysLeft === 1 ? `Your ${planWords} ends tomorrow` : `Your ${planWords} ends in ${daysLeft} days`;
      message = `It ends on ${showDate(end)} and doesn't renew by itself. Renew to keep your premium features.`;
    }
    due.push({ subId: s.id, userId: s.userId, to: u.email, stage, type: `ls_${stage}_${s.id}_${istYmd(end)}`, title, message, render });
  }
  return { scanned: rows.length, due };
}

export type BillingEmailsResult = {
  enabled: boolean; scanned: number; reminded7: number; reminded1: number; ended: number; failed: number;
  capped?: boolean; error?: string;
};

let running = false; // the scheduler and POST /api/cron/trial-emails share this process

export async function runBillingEmails(): Promise<BillingEmailsResult> {
  const out: BillingEmailsResult = { enabled: true, scanned: 0, reminded7: 0, reminded1: 0, ended: 0, failed: 0 };
  if (running) return { ...out, error: "already running" };
  running = true;
  try {
    const db = getDb();
    if ((await getSetting(db, "billing_emails_enabled")) === "0") { out.enabled = false; return out; }

    const { scanned, due } = await dueBillingEmails(db);
    out.scanned = scanned;
    let attempts = 0;
    for (const d of due) {
      if (attempts >= MAX_SENDS) { out.capped = true; break; }
      let markerId: number | null = null;
      try {
        markerId = await claim(db, d.userId, d.type, d.title, d.message, "/dashboard/subscription");
        if (!markerId) continue;
        // Plan reminders switched off: the bell entry stays, the email doesn't go.
        if (!(await allows(d.userId, "plan"))) { markerId = null; continue; }
        attempts++;
        const res = await sendEmail(d.to, d.render());
        if (res.ok) {
          markerId = null; // delivered — the marker stays
          if (d.stage === "renew7") out.reminded7++; else if (d.stage === "renew1") out.reminded1++; else out.ended++;
        }
      } catch (e) {
        console.error("[billing-emails] subscription", d.subId, "error:", (e as Error).message);
      }
      if (markerId) { out.failed++; await release(db, markerId); }
    }
    return out;
  } catch (e) {
    console.error("[billing-emails] run error:", (e as Error).message);
    return { ...out, error: (e as Error).message };
  } finally {
    running = false;
    console.log(`[billing-emails] scanned ${out.scanned}, 7-day ${out.reminded7}, last-day ${out.reminded1}, ended ${out.ended}, failed ${out.failed}${out.capped ? " (capped)" : ""}${out.enabled ? "" : " (switched off)"}`);
  }
}
