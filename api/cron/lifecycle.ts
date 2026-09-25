/*
 * Trial LIFECYCLE engine (Phase 30, §8–§9).
 * ------------------------------------------------------------------
 * Runs once a day. Drives the §9 milestone journey off the authoritative
 * card_trials engine (trial starts on first publish), sending each user at
 * most ONE email per stage. Metric emails show only real numbers from
 * card_events (§36). Also nudges new-flow users who set up a card but never
 * published (§59) — funnel-scoped so legacy customers are never emailed.
 *
 * De-dup: the notifications table is the ledger. A marker row per (userId,
 * milestone-type) means the email fires exactly once, resilient to reruns.
 * Never throws per-user — one bad row can't stop the batch.
 */
import { getDb } from "../queries/connection";
import {
  cardTrials, users, notifications, publishedCards, cardEvents, funnelEvents, appSettings,
  subscriptions, paymentOrders, subscriptionPackages, accountDeletionRequests,
} from "@db/schema";
import { and, eq, inArray, sql, gt, or } from "drizzle-orm";
import { legacyPaidPlan } from "../lib/entitlement";
import { sendEmail } from "../lib/mail";
import { allows } from "../lib/notify-prefs";
import {
  trialDay1Email, trialDay7Email, trialDay15Email, trialDay21Email, trialDay25Email,
  trialEndingEmail, trialEndedEmail, abandonedPublishEmail, trialOfferEmail, type TrialMetrics, type OfferPriceRow,
} from "../lib/email-templates";
import {
  ensureEarlyCoupon, earlyCouponState, releaseStaleClaims, claimGrant, startGrant, releaseGrant,
  addWorkingHours, EARLY_COUPON_CODE, EARLY_PERCENT,
} from "../lib/offer-grants";

const DAY = 86_400_000;
const SITE = "https://digitalcarda.in";

async function getSetting(db: ReturnType<typeof getDb>, key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

/** Insert the ledger marker + in-app notification if absent. True = first time. */
async function claim(db: ReturnType<typeof getDb>, userId: number, type: string, title: string, message: string, link = "/dashboard/subscription"): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({ where: and(eq(notifications.userId, userId), eq(notifications.type, type)) });
  if (existing) return false;
  await db.insert(notifications).values({ userId, type, title, message, link });
  return true;
}

async function metricsFor(db: ReturnType<typeof getDb>, slug: string): Promise<TrialMetrics> {
  const rows = await db.select({ type: cardEvents.type, n: sql<number>`count(*)` }).from(cardEvents).where(eq(cardEvents.slug, slug)).groupBy(cardEvents.type);
  const g = (t: string) => Number(rows.find((r) => r.type === t)?.n || 0);
  return { views: g("view"), saves: g("save_contact"), whatsapp: g("whatsapp"), calls: g("call"), leads: g("enquiry") };
}

// Milestones keyed by elapsed days since publish; "current" = largest reached.
const MILESTONES = [
  { key: "ls_d1", day: 1, needsMetrics: false },
  { key: "ls_d7", day: 7, needsMetrics: false },
  { key: "ls_d15", day: 15, needsMetrics: true },
  { key: "ls_d21", day: 21, needsMetrics: true },
  { key: "ls_d25", day: 25, needsMetrics: true },
] as const;

export async function runLifecycle(): Promise<{ enabled: boolean; scanned: number; sent: number; abandoned: number; offers: number }> {
  const db = getDb();
  if ((await getSetting(db, "lifecycle_enabled")) === "0") return { enabled: false, scanned: 0, sent: 0, abandoned: 0, offers: 0 };

  const now = Date.now();
  const graceEnabled = (await getSetting(db, "grace_enabled")) === "1";
  const graceDays = Math.max(0, Number(await getSetting(db, "grace_days")) || 0);

  const trials = await db.select().from(cardTrials);
  // Map userId -> published slug (for metrics + card URL) in one query.
  const uids = trials.map((t) => t.userId);
  const slugRows = uids.length ? await db.select({ userId: publishedCards.userId, slug: publishedCards.slug, data: publishedCards.data }).from(publishedCards).where(inArray(publishedCards.userId, uids)) : [];
  const slugOf = new Map(slugRows.map((r) => [r.userId, r.slug]));
  // Users on a manual/legacy paid plan (admin-set Gold=5 / Platinum=6, valid
  // expired_on) — they are PAYING customers with no subscriptions row, so the
  // trial clock must never email/pause them (real prod incident).
  //
  // Sourced from customers.json (admin-written), NOT from the card snapshot.
  // The snapshot is customer-supplied via publish.saveSnapshot, and this loop
  // does not merely read it: a match STAMPS the trial "converted" below, which
  // is permanent. Trusting it let a customer publish `package_id: 6` and write
  // themselves a free account for good.
  const paidUids = new Set<number>();
  const trialUsers = uids.length
    ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, uids))
    : [];
  for (const u of trialUsers) {
    if (legacyPaidPlan(u.email, now)) paidUids.add(u.id);
  }

  // ── Day-2 upgrade offer (EARLY20) ──────────────────────────────────────
  // Off unless the admin switched it on (Admin → Settings → Trial). Sent once,
  // on day 2–3 of the trial, to customers who have never paid; the code then
  // works for them for 24 working hours (api/lib/offer-grants.ts).
  let offers = 0;
  const offerOn = (await getSetting(db, "trial_offer_enabled")) === "1";
  const early = offerOn ? await ensureEarlyCoupon(db) : null;
  // Only while checkout will actually accept the code (active, in date, uses left).
  const state = early ? await earlyCouponState(db, early.id, new Date(now)) : null;
  const offerLive = !!early && !!state?.usable;
  const offerHours = Math.max(1, Number(await getSetting(db, "trial_offer_hours")) || 24);
  const holidays = String((await getSetting(db, "offer_holidays")) || "").split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const offerPct = state?.usable ? state.percent : EARLY_PERCENT;
  const offerUntil = state?.usable ? state.validUntil : null;
  const prices: OfferPriceRow[] = [];
  if (early && offerLive) {
    await releaseStaleClaims(db, early.id);
    const pkgs = await db.select().from(subscriptionPackages).where(inArray(subscriptionPackages.id, [5, 6]));
    for (const pk of pkgs.sort((a, b) => a.id - b.id)) {
      // Same rounding as checkout (exactPercentDiscount), so the email's price is the price they pay.
      for (const [label, v] of [["1 year", pk.yearlyPrice], ["3 years", pk.threeYearPrice], ["monthly", pk.monthlyPrice]] as const) {
        const usual = Math.round(Number(v));
        if (usual > 0) prices.push({ plan: pk.name, cycle: label, usual, withCode: Math.round(usual * (1 - offerPct / 100)) });
      }
    }
  }
  /** Send the offer if this trial customer qualifies. "skip" = not eligible (or
      already offered); "sent" / "failed" = they were this run's email. */
  const tryOffer = async (userId: number, cardUrl: string): Promise<"skip" | "sent" | "failed"> => {
    if (!early || !offerLive) return "skip";
    const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true, fullName: true, role: true, status: true, resellerId: true } });
    // Customers only; a partner's client is the partner's to discount.
    if (!u?.email || u.role !== "customer" || u.status !== "active" || u.resellerId) return "skip";
    if (/@(clients|deleted)\.digitalcarda\.in$/i.test(u.email)) return "skip";
    // Never paid, and not on a plan an admin set (a comp or a manual paid plan).
    const [sub] = await db.select({ id: subscriptions.id }).from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), or(gt(subscriptions.amount, "0"), inArray(subscriptions.packageId, [5, 6])))).limit(1);
    if (sub) return "skip";
    // Pending counts too: a UPI/bank payment waiting for the team to verify it.
    const [paid] = await db.select({ id: paymentOrders.id }).from(paymentOrders)
      .where(and(eq(paymentOrders.userId, userId), inArray(paymentOrders.status, ["pending", "verified"]))).limit(1);
    if (paid) return "skip";
    const [leaving] = await db.select({ id: accountDeletionRequests.id }).from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "pending"))).limit(1);
    if (leaving) return "skip";
    if (!(await allows(userId, "plan"))) return "skip";
    const sentAt = new Date();
    const endsAt = addWorkingHours(sentAt, offerHours, holidays);
    // The coupon itself must outlast their deadline, or the promise can't be kept.
    if (offerUntil && endsAt > offerUntil) return "skip";
    // One grant per customer, ever (unique on coupon + user).
    if (!(await claimGrant(db, early.id, userId))) return "skip";
    const res = await sendEmail(u.email, trialOfferEmail({ name: u.fullName, cardUrl, code: EARLY_COUPON_CODE, percent: offerPct, endsAt, prices }));
    if (!res.ok) { await releaseGrant(db, early.id, userId); return "failed"; } // tomorrow's run retries (day 3)
    await startGrant(db, early.id, userId, sentAt, endsAt);
    await db.insert(notifications).values({
      userId, type: "ls_offer", title: `${offerPct}% off — code ${EARLY_COUPON_CODE}`,
      message: `Choose a paid plan before ${endsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })} IST.`,
      link: `/dashboard/subscription?coupon=${EARLY_COUPON_CODE}`,
    });
    offers++;
    return "sent";
  };

  let sent = 0;
  for (const t of trials) {
    try {
      if (t.status === "converted" || t.status === "cancelled") continue;
      // Paid plan detected → mark the trial converted (self-heals the data) and
      // skip all trial-lifecycle messaging for this user.
      if (paidUids.has(t.userId)) {
        await db.update(cardTrials).set({ status: "converted" }).where(eq(cardTrials.userId, t.userId));
        continue;
      }
      const started = t.publishedAt ? new Date(t.publishedAt).getTime() : (t.startedAt ? new Date(t.startedAt).getTime() : 0);
      const ends = t.endsAt ? new Date(t.endsAt).getTime() : 0;
      if (!started || !ends) continue;
      const elapsed = Math.floor((now - started) / DAY);
      const daysLeft = Math.ceil((ends - now) / DAY);
      const graceEnd = ends + (graceEnabled ? graceDays : 0) * DAY;

      const emailUser = async (type: string, title: string, msg: string, email: Parameters<typeof sendEmail>[1]) => {
        if (!(await claim(db, t.userId, type, title, msg))) return;
        // Owners who turned plan reminders off keep the bell entry, not the email.
        if (!(await allows(t.userId, "plan"))) return;
        const u = await db.query.users.findFirst({ where: eq(users.id, t.userId), columns: { email: true, fullName: true } });
        if (u?.email) { await sendEmail(u.email, email); sent++; }
      };

      // Expired past grace → "ended" once.
      if (now > graceEnd) {
        const u = await db.query.users.findFirst({ where: eq(users.id, t.userId), columns: { email: true, fullName: true } });
        await emailUser("ls_ended", "Your trial ended", "Your card is paused — reactivate anytime.", trialEndedEmail({ name: u?.fullName }));
        continue;
      }
      // Final urgency: ≤2 days left → ending email once.
      if (daysLeft <= 2 && daysLeft >= 0) {
        const u = await db.query.users.findFirst({ where: eq(users.id, t.userId), columns: { email: true, fullName: true } });
        await emailUser("ls_ending", "Trial ending soon", `Only ${Math.max(daysLeft, 1)} day(s) left — keep your card live.`, trialEndingEmail({ name: u?.fullName, daysLeft: Math.max(daysLeft, 1) }));
        continue;
      }
      const slug = slugOf.get(t.userId);
      const cardUrl = slug ? `${SITE}/${slug}` : `${SITE}/dashboard`;
      // Day 2–3: the upgrade offer, once. It takes this run's email slot; a
      // failed send also waits for tomorrow rather than sending something else.
      if (elapsed >= 2 && elapsed <= 3) {
        const r = await tryOffer(t.userId, cardUrl);
        if (r !== "skip") continue;
      }
      // Otherwise the current milestone (largest reached).
      const m = [...MILESTONES].reverse().find((x) => elapsed >= x.day);
      if (!m) continue;
      const u = await db.query.users.findFirst({ where: eq(users.id, t.userId), columns: { email: true, fullName: true } });
      const name = u?.fullName;
      const metrics = m.needsMetrics && slug ? await metricsFor(db, slug) : { views: 0, saves: 0, whatsapp: 0, calls: 0, leads: 0 };
      const emailByKey: Record<string, Parameters<typeof sendEmail>[1]> = {
        ls_d1: trialDay1Email({ name, cardUrl }),
        ls_d7: trialDay7Email({ name, cardUrl }),
        ls_d15: trialDay15Email({ name, daysLeft: Math.max(daysLeft, 0), metrics }),
        ls_d21: trialDay21Email({ name, daysLeft: Math.max(daysLeft, 0), metrics }),
        ls_d25: trialDay25Email({ name, daysLeft: Math.max(daysLeft, 0), metrics }),
      };
      await emailUser(m.key, "Trial update", "See how your card is doing.", emailByKey[m.key]);
    } catch (e) {
      console.error("[lifecycle] user", t.userId, "error:", (e as Error).message);
    }
  }

  // ── Abandoned customisation (§59) — new-flow only, funnel-scoped ──────────
  // Users who reached the 'customization' funnel stage in the last 14 days but
  // never published (no card_trials, no published_cards). Legacy customers have
  // no funnel_events, so they can never be included.
  let abandoned = 0;
  try {
    const since = new Date(now - 14 * DAY);
    const custRows = await db.select({ userId: funnelEvents.userId }).from(funnelEvents)
      .where(and(eq(funnelEvents.stage, "customization"), gt(funnelEvents.createdAt, since)));
    const candidates = [...new Set(custRows.map((r) => r.userId).filter((x): x is number => !!x))];
    const trialUsers = new Set(trials.map((t) => t.userId));
    const pubUsers = new Set(slugRows.map((r) => r.userId));
    for (const uid of candidates) {
      if (trialUsers.has(uid) || pubUsers.has(uid)) continue; // already published → not abandoned
      const already = await db.query.notifications.findFirst({ where: and(eq(notifications.userId, uid), eq(notifications.type, "ls_abandoned")) });
      if (already) continue;
      const u = await db.query.users.findFirst({ where: eq(users.id, uid), columns: { email: true, fullName: true } });
      if (!u?.email) continue;
      await db.insert(notifications).values({ userId: uid, type: "ls_abandoned", title: "Your card is almost ready", message: "Publish it to make it live and start your free trial.", link: "/dashboard/build" });
      if (!(await allows(uid, "tips"))) continue;   // a nudge, not something they must hear
      await sendEmail(u.email, abandonedPublishEmail({ name: u.fullName, cardUrl: `${SITE}/dashboard/build` }));
      abandoned++;
    }
  } catch (e) {
    console.error("[lifecycle] abandoned sweep error:", (e as Error).message);
  }

  return { enabled: true, scanned: trials.length, sent, abandoned, offers };
}
