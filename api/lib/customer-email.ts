/* "Send email" to one customer: Admin → Customers → ⋮ → Send email.
 * The contract is contracts/customer-email.ts; the router is
 * api/customer-email-router.ts.
 *
 * Everything that decides what a customer gets lives here:
 *  - resolveRecipient finds the customer from their id — never from an address
 *    the browser sends — and gathers what the templates need (card, plan,
 *    trial, their email switches), or says why nothing may be sent to them;
 *  - TEMPLATES says, per template, whether it makes sense for them right now,
 *    and builds it with the existing template function and their real data;
 *  - buildEmail makes the email for the preview and the send alike, with a
 *    hash the send compares against what the admin saw.
 * Only resolveRecipient reads the database. The rest are pure functions of the
 * Recipient it returns, which is what keeps the preview and the send the same.
 */
import { createHash } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import type { getDb } from "../queries/connection";
import { users, publishedCards, subscriptions, subscriptionPackages, cardTrials, accountDeletionRequests } from "@db/schema";
import {
  MANUAL_EMAIL_LIMITS, MANUAL_TEMPLATES,
  type CustomMessageInput, type ManualTemplateKey, type RecipientRef, type TemplateCategory,
} from "@contracts/customer-email";
import { ALERT_KIND_BY_TEMPLATE } from "@contracts/settings";
import { dateIst, whenIst, type Email } from "./email/kit";
import {
  welcomeEmail, accountDetailsEmail, cardPublishedEmail, subscriptionRenewalReminderEmail, subscriptionExpiredEmail,
  trialEndingEmail, trialEndedEmail, abandonedPublishEmail, featureUpdateEmail, reviewRequestEmail,
} from "./email-templates";
import { teamMessageEmail, oneLine, normalizeMessage, linkPieces } from "./email/manual";
import { PAID_PACKAGE_IDS, legacyPlanOf } from "./entitlement";
import { getPrefs } from "./notify-prefs";

type Db = ReturnType<typeof getDb>;

const DAY = 86_400_000;
const IST = 19_800_000; // +05:30
/** 00:00 IST of the India calendar day that contains `t` (as the billing job counts). */
const istMidnight = (t: number) => { const d = new Date(t + IST); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST; };
/** Whole India calendar days from today to `d`: 0 = today, 1 = tomorrow. */
const istDaysUntil = (d: Date, now: number) => Math.round((istMidnight(d.getTime()) - istMidnight(now)) / DAY);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ── The customer ────────────────────────────────────────────────────────── */

export type PlanInfo = {
  source: "platform" | "old_site";
  packageId: number;
  /** "Gold"; "" when the package is unknown. */
  name: string;
  paid: boolean;
  active: boolean;
  /** When it stops; null = no end recorded (an old-site row with no date). */
  endsAt: Date | null;
  /** The last day it covers, for the email ("ends on 8 Oct"). */
  lastDay: Date | null;
  billingCycle: string | null;
  /** What the renewal job's "upgrade and what you paid comes off" tip needs:
      only a paid platform row with a plan above it has one. */
  upgradeCredit: number | null;
  nextPlanName: string | null;
};

export type TrialInfo = {
  /** trial-router computeState: active | expiring_soon | grace | expired | converted | cancelled. */
  status: string;
  daysLeft: number;
  totalDays: number;
  endsAt: Date;
  /** Days the card stays up after the trial (0 when grace is off). */
  graceDays: number;
  /** The voucher their trial really started with (card_trials.coupon_code). */
  voucher: string | null;
};

export type Recipient = {
  source: "platform" | "old_site";
  userId: number | null;
  legacyId: number | null;
  name: string;
  email: string;
  emailVerified: boolean | null;
  /** Why nothing may be sent to them; null = they can be emailed. */
  blocked: string | null;
  /** Their published card, else their old-site card. */
  card: { slug: string; publicId: string | null; company: string | null; published: boolean } | null;
  plans: { platform: PlanInfo | null; oldSite: PlanInfo | null };
  trial: TrialInfo | null;
  /** The trial length a new card gets (Settings), for "finish your card". */
  trialDays: number;
  /** Their own switches (Notifications). Old-site customers have none: all on. */
  prefs: { plan: boolean; tips: boolean };
};

/** The few fields of an old-site (customers.json) row this feature uses. The
    row itself also holds a plain-text password and bank details, so it never
    travels further than this function. */
export type LegacyRecord = {
  id: number; name: string; email: string; slug: string | null; company: string | null;
  packageId: number | null; expiredOn: string | null;
};

export function legacyRecord(row: unknown): LegacyRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = Number(r.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const str = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");
  const slug = str(r.slug, 191);
  const pkg = str(r.package_id, 10);
  return {
    id,
    name: str(r.name, 120),
    email: str(r.email, 254).toLowerCase(),
    slug: slug && !/[\s/?#]/.test(slug) ? slug : null,
    company: str(r.company_name, 120) || null,
    packageId: pkg && Number.isFinite(Number(pkg)) ? Number(pkg) : null,
    expiredOn: str(r.expired_on, 40) || null,
  };
}

const findLegacy = (rows: unknown[], id: number) => {
  for (const row of rows) { const l = legacyRecord(row); if (l?.id === id) return l; }
  return null;
};
const legacyByEmail = (rows: unknown[], email: string) => {
  const key = email.toLowerCase().trim();
  return key ? rows.map(legacyRecord).filter((l): l is LegacyRecord => !!l && l.email === key) : [];
};

const PLACEHOLDER = /@clients\.digitalcarda\.in$/i;
const ERASED = /@deleted\.digitalcarda\.in$/i;
// No characters the mailer reads as address syntax: "a:b@evil.com" is a group
// that delivers to b@evil.com, "x(y)@z" carries a comment.
const ADDRESS = /^[^@\s"'<>,;:()[\]\\]+@[^@\s"'<>,;:()[\]\\]+\.[^@\s"'<>,;:()[\]\\]{2,}$/;

/** Why this address can't be mailed, or null. The stand-in and erased domains
    are the rule mailable() (api/cron/billing.ts) and sendEmail use. */
export function addressProblem(email: string): string | null {
  const e = email.trim();
  if (!e) return "There's no email address for this customer.";
  if (ERASED.test(e)) return "This account was erased.";
  if (PLACEHOLDER.test(e)) return "They only have a stand-in sign-in address — add their real email first.";
  if (e.length > 254 || !ADDRESS.test(e)) return "The email address on file doesn't look valid.";
  return null;
}

/** Why nothing may be sent to this customer, or null. `status`/`role` are
    null for an old-site customer with no account here. */
export function blockReason(o: { email: string; hidden: boolean; pendingDeletion: boolean; status: string | null; role: string | null }): string | null {
  if (ERASED.test(o.email.trim())) return "This account was erased.";
  if (o.hidden) return "This customer was deleted from the Customers list.";
  if (o.pendingDeletion) return "They've asked for their account to be deleted.";
  if (o.status && o.status !== "active") return o.status === "suspended" ? "Their account is suspended." : "Their account is closed.";
  // The Customers list is customers only — never the super admin, staff or a partner.
  if (o.role && o.role !== "customer") return "This isn't a customer account — only customers can be emailed from here.";
  return addressProblem(o.email);
}

/** An old-site plan as the entitlement check reads it: valid through the end
    of the recorded day, and a missing or unreadable date means no end. */
export function oldSitePlan(p: { packageId: number; expiredOn: string } | null, name: string, now: number): PlanInfo | null {
  if (!p) return null;
  const ms = p.expiredOn ? Date.parse(p.expiredOn) : NaN;
  const dated = Number.isFinite(ms);
  return {
    source: "old_site", packageId: p.packageId, name, paid: PAID_PACKAGE_IDS.has(p.packageId),
    active: !dated || ms + DAY > now,
    endsAt: dated ? new Date(ms + DAY) : null,
    lastDay: dated ? new Date(ms) : null,
    billingCycle: null, upgradeCredit: null, nextPlanName: null,
  };
}

const PACKAGE_FALLBACK: Record<number, string> = { 5: "Gold", 6: "Platinum", 7: "Trial" };

/**
 * The customer behind `ref`, with everything the templates need, or null when
 * there is no such customer. Exactly one of userId / legacyId is read. An
 * old-site id is matched to an account here by its email, and that account
 * (when there is one) decides status, role and the rest.
 */
export async function resolveRecipient(db: Db, ref: RecipientRef, now = Date.now()): Promise<Recipient | null> {
  const admin = await import("../admin-router");
  const rows = admin.legacyCustomers() as unknown[];
  const userCols = {
    id: users.id, email: users.email, fullName: users.fullName, status: users.status,
    role: users.role, emailVerified: users.emailVerified,
  };

  let legacy: LegacyRecord | null = null;
  let user: { id: number; email: string; fullName: string; status: string; role: string; emailVerified: boolean } | undefined;
  let hidden = false;
  if (ref.legacyId != null) {
    legacy = findLegacy(rows, ref.legacyId);
    if (!legacy) return null;
    hidden = (await admin.hiddenIdSet(db, "customers")).has(String(legacy.id));
    if (legacy.email) user = (await db.select(userCols).from(users).where(eq(users.email, legacy.email)).limit(1))[0];
  } else if (ref.userId != null) {
    user = (await db.select(userCols).from(users).where(eq(users.id, ref.userId)).limit(1))[0];
    if (!user) return null;
    const mine = legacyByEmail(rows, user.email);
    legacy = mine.find((l) => l.slug) ?? mine[0] ?? null;
  } else {
    return null;
  }
  const uid = user ? Number(user.id) : null;
  if (uid && (await admin.hiddenAppUserIds(db)).has(uid)) hidden = true;
  const pending = uid
    ? (await db.select({ id: accountDeletionRequests.id }).from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.userId, uid), eq(accountDeletionRequests.status, "pending"))).limit(1)).length > 0
    : false;

  const email = (user?.email ?? legacy?.email ?? "").trim();
  const base: Recipient = {
    source: user ? "platform" : "old_site",
    userId: uid,
    legacyId: legacy?.id ?? null,
    name: (user?.fullName?.trim() || legacy?.name || "").slice(0, 120),
    email,
    emailVerified: user ? !!user.emailVerified : null,
    blocked: blockReason({ email, hidden, pendingDeletion: pending, status: user?.status ?? null, role: user?.role ?? null }),
    card: null,
    plans: { platform: null, oldSite: null },
    trial: null,
    trialDays: 30,
    prefs: { plan: true, tips: true },
  };
  if (base.blocked) return base;

  const [trialApi, billing, publish] = await Promise.all([import("../trial-router"), import("../cron/billing"), import("../publish-router")]);
  const [cardRows, subRows, pkgs, trialRows, grace, trialDays, prefs] = await Promise.all([
    uid ? db.select({ slug: publishedCards.slug, publicId: publishedCards.publicId, data: publishedCards.data })
      .from(publishedCards).where(eq(publishedCards.userId, uid)).orderBy(asc(publishedCards.cardId)).limit(1) : [],
    uid ? db.select().from(subscriptions).where(eq(subscriptions.userId, uid))
      .orderBy(desc(subscriptions.createdAt), desc(subscriptions.id)).limit(1) : [],
    db.select().from(subscriptionPackages),
    uid ? db.select().from(cardTrials).where(eq(cardTrials.userId, uid)).limit(1) : [],
    trialApi.graceConfig(db),
    trialApi.trialDays(db),
    uid ? getPrefs(uid) : null,
  ]);

  // Card: the published one (lowest card id, like the plan emails), else the old-site one.
  const pc = cardRows[0];
  const company = (pc?.data as { customer?: { company_name?: unknown } } | null)?.customer?.company_name;
  const card: Recipient["card"] = pc
    ? { slug: pc.slug, publicId: pc.publicId ?? null, company: typeof company === "string" && company.trim() ? company.trim().slice(0, 120) : null, published: true }
    : legacy?.slug ? { slug: legacy.slug, publicId: null, company: legacy.company, published: false } : null;

  // Plans: the newest subscriptions row (as the admin list reads it), and the
  // old-site plan recorded for this address. Package names from the catalogue.
  const pkgById = new Map(pkgs.map((p) => [Number(p.id), p]));
  const pkgName = (id: number) => pkgById.get(id)?.name?.trim() || PACKAGE_FALLBACK[id] || "";
  let platform: PlanInfo | null = null;
  const sub = subRows[0];
  if (sub) {
    const end = new Date(sub.currentPeriodEnd);
    const dated = !Number.isNaN(end.getTime());
    const paid = PAID_PACKAGE_IDS.has(Number(sub.packageId));
    // Same rule as the renewal job: a paid row with a plan above it (admin-granted ₹0 rows get no tip).
    const next = paid && Number(sub.amount) > 0 ? billing.nextTier(pkgs, pkgById.get(Number(sub.packageId)), sub.billingCycle) : null;
    platform = {
      source: "platform", packageId: Number(sub.packageId), name: pkgName(Number(sub.packageId)), paid,
      // Active exactly while it keeps their card live (publish-router publicState).
      active: publish.subscriptionKeepsCardLive(sub, now),
      endsAt: dated ? end : null, lastDay: dated ? end : null, billingCycle: sub.billingCycle,
      upgradeCredit: next ? Number(sub.amount) : null, nextPlanName: next?.name ?? null,
    };
  }
  const lp = legacyPlanOf(email);
  const oldSite = oldSitePlan(lp, lp ? pkgName(lp.packageId) : "", now);

  // Trial: the live state, computed the way the trial engine does.
  const tr = trialRows[0];
  const trial: TrialInfo | null = tr?.endsAt ? (() => {
    const s = trialApi.computeState(tr, grace);
    return {
      status: s.status, daysLeft: s.daysLeft, totalDays: s.totalDays, endsAt: new Date(tr.endsAt),
      graceDays: grace.enabled ? grace.days : 0, voucher: tr.couponCode?.trim() || null,
    };
  })() : null;

  return {
    ...base, card, plans: { platform, oldSite }, trial, trialDays,
    prefs: prefs ? { plan: prefs.plan, tips: prefs.tips } : { plan: true, tips: true },
  };
}

/* ── What the customer's situation is ────────────────────────────────────── */

const TRIAL_RUNNING = new Set(["active", "expiring_soon"]);

/** A paid plan that is valid right now (the entitlement check: what keeps the card up). */
export const activePaidPlan = (r: Pick<Recipient, "plans">): PlanInfo | null =>
  [r.plans.platform, r.plans.oldSite].find((p) => p?.paid && p.active) ?? null;

/** Has this plan run out, for the plan emails? When it stops — except that an
    old-site plan, which the entitlement check keeps valid until 05:30 IST the
    morning after its last day, has ended by India's calendar at midnight. The
    renewal reminder and the expiry email switch over at that same instant. */
const ranOut = (p: PlanInfo, now: number) =>
  !!p.endsAt && (p.active ? !!p.lastDay && istDaysUntil(p.lastDay, now) < 0 : p.endsAt.getTime() <= now);

/** The paid plan the plan emails treat as running: activePaidPlan, less an
    old-site plan whose last day is already behind us. */
export const runningPaidPlan = (r: Pick<Recipient, "plans">, now: number): PlanInfo | null =>
  [r.plans.platform, r.plans.oldSite].find((p) => p?.paid && p.active && !ranOut(p, now)) ?? null;

/** The most recent paid plan that has run out, when none is running. */
export function endedPaidPlan(r: Pick<Recipient, "plans">, now: number): PlanInfo | null {
  const ended = [r.plans.platform, r.plans.oldSite]
    .filter((p): p is PlanInfo & { endsAt: Date } => !!p?.paid && ranOut(p, now));
  return ended.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime())[0] ?? null;
}

/** A plan holds their published card up: any active subscriptions row,
    whatever the package — a Trial one an admin granted included
    (publish-router subscriptionKeepsCardLive) — or a valid old-site paid plan. */
const planKeepsCardUp = (r: Recipient) => !!r.plans.platform?.active || !!activePaidPlan(r);

/** Visitors see a paused published card: the trial ran out (past any grace)
    and no plan holds it up — publish-router publicState. */
const cardPaused = (r: Recipient) => !!r.card?.published && r.trial?.status === "expired" && !planKeepsCardUp(r);

/** Days left in the trial by India's calendar: 0 on its last day ("ends today"). */
const trialDaysLeft = (t: TrialInfo, now: number) => Math.max(0, istDaysUntil(t.endsAt, now));

/** "Gold · till 8 Oct 2026", "Free trial · 5 days left", or null. */
export function planLabel(r: Recipient, now = Date.now()): string | null {
  const paid = runningPaidPlan(r, now);
  if (paid) return `${paid.name || "Paid plan"}${paid.lastDay ? ` · till ${dateIst(paid.lastDay)}` : ""}`;
  const t = r.trial;
  if (t && TRIAL_RUNNING.has(t.status)) {
    const left = trialDaysLeft(t, now);
    return `Free trial · ${left === 0 ? "ends today" : `${plural(left, "day")} left`}`;
  }
  if (t?.status === "grace") return "Trial ended · grace period";
  // A plan row that isn't a paid one (a Trial package an admin granted) still keeps the card up.
  const up = r.plans.platform?.active ? r.plans.platform : null;
  if (up) return `${up.name || "Plan"}${up.lastDay ? ` · till ${dateIst(up.lastDay)}` : ""}`;
  const ended = endedPaidPlan(r, now);
  if (ended?.lastDay) return `${ended.name || "Paid plan"} · ended ${dateIst(ended.lastDay)}`;
  if (t?.status === "expired") return "Trial ended";
  return null;
}

/* ── The templates ───────────────────────────────────────────────────────── */

type Def = {
  /** The template's Email.kind (what the email log records, after "manual:"). */
  kind: string;
  /** Why it doesn't fit this customer right now, or null when it does. */
  unavailable: (r: Recipient, now: number) => string | null;
  build: (r: Recipient, now: number, custom: CustomMessageInput | null) => Email;
};

const needsAccount = (r: Recipient) => (r.userId ? null : "No account on the new site yet");
const cardOf = (r: Recipient) => r.card?.slug ?? null;

const TEMPLATES: Record<ManualTemplateKey, Def> = {
  custom: {
    kind: "teamMessageEmail",
    unavailable: () => null,
    build: (r, _now, c) => {
      if (!c) throw new EmailBuildError("Write a subject and a message first.");
      return teamMessageEmail({ name: r.name, subject: c.subject, message: c.message, promotional: c.promotional });
    },
  },
  welcome: {
    kind: "welcomeEmail",
    unavailable: needsAccount,
    build: (r) => {
      // "Your card is live" only while it is; trial details only for a running trial.
      const live = r.card && !cardPaused(r) ? r.card : null;
      const t = r.trial && TRIAL_RUNNING.has(r.trial.status) ? r.trial : null;
      return welcomeEmail({
        name: r.name, slug: live?.slug ?? null, companyName: live?.company ?? null,
        trial: t ? { days: t.totalDays || r.trialDays, endsAt: t.endsAt, voucher: t.voucher } : null,
      });
    },
  },
  account_details: {
    kind: "accountDetailsEmail",
    unavailable: needsAccount,
    // Never a password: this is a resend of the sign-in email and card link.
    // With a card link it says the card is live, so a paused card goes without one.
    build: (r) => accountDetailsEmail({ name: r.name, loginEmail: r.email, slug: cardPaused(r) ? null : cardOf(r), company: r.card?.company ?? null }),
  },
  card_live: {
    kind: "cardPublishedEmail",
    unavailable: (r) => (!r.card ? "No published card yet"
      : cardPaused(r) ? "Their card is paused — the trial ended and there's no active plan" : null),
    build: (r) => cardPublishedEmail({ name: r.name, slug: r.card!.slug, company: r.card!.company, publicId: r.card!.publicId }),
  },
  renewal_reminder: {
    kind: "subscriptionRenewalReminderEmail",
    unavailable: (r, now) => {
      const plan = runningPaidPlan(r, now);
      if (!plan) return endedPaidPlan(r, now) ? "Their paid plan has already ended" : "No active paid plan";
      if (!plan.lastDay) return "Their plan has no end date";
      if (istDaysUntil(plan.lastDay, now) > 30) return `Their plan runs till ${dateIst(plan.lastDay)} — more than 30 days away`;
      return null;
    },
    build: (r, now) => {
      const plan = runningPaidPlan(r, now)!;
      return subscriptionRenewalReminderEmail({
        name: r.name, planName: plan.name, daysLeft: Math.max(0, istDaysUntil(plan.lastDay!, now)), validTill: plan.lastDay!,
        billingCycle: plan.billingCycle, slug: cardOf(r), packageId: plan.packageId,
        upgradeCredit: plan.upgradeCredit, nextPlanName: plan.nextPlanName,
      });
    },
  },
  plan_expired: {
    kind: "subscriptionExpiredEmail",
    unavailable: (r, now) => {
      if (runningPaidPlan(r, now)) return "Their paid plan is still active";
      if (!endedPaidPlan(r, now)) return "No paid plan has ended";
      // The email says their card is still online.
      if (cardPaused(r)) return "Their card is paused — the trial ended too";
      return null;
    },
    build: (r, now) => {
      const plan = endedPaidPlan(r, now)!;
      return subscriptionExpiredEmail({
        name: r.name, planName: plan.name, expiredOn: plan.lastDay, slug: cardOf(r),
        packageId: plan.packageId, billingCycle: plan.billingCycle,
      });
    },
  },
  trial_ending: {
    kind: "trialEndingEmail",
    unavailable: (r, now) => {
      const t = r.trial;
      if (!t) return "No free trial";
      if (t.status === "converted") return "Their trial became a paid plan";
      if (t.status === "cancelled") return "Their trial was cancelled";
      if (!TRIAL_RUNNING.has(t.status)) return "Their trial has already ended";
      if (activePaidPlan(r)) return "They're on a paid plan";
      // The email says visitors stop seeing the card after the trial (and any
      // grace); a plan row that runs past that keeps it up.
      const up = r.plans.platform;
      if (up?.active && (!up.endsAt || up.endsAt.getTime() > t.endsAt.getTime() + t.graceDays * DAY)) {
        return "An active plan keeps their card live after the trial";
      }
      const left = trialDaysLeft(t, now);
      if (left > 7) return `Their trial has ${plural(left, "day")} left — this is for the last 7 days`;
      return null;
    },
    // No offer: one only exists with a real coupon grant (api/lib/offer-grants.ts).
    build: (r, now) => trialEndingEmail({
      name: r.name, daysLeft: trialDaysLeft(r.trial!, now), slug: cardOf(r), endsAt: r.trial!.endsAt,
      trialDays: r.trial!.totalDays || r.trialDays, graceDays: r.trial!.graceDays,
    }),
  },
  trial_ended: {
    kind: "trialEndedEmail",
    unavailable: (r) => {
      const t = r.trial;
      if (!t) return "No free trial";
      if (t.status === "converted") return "Their trial became a paid plan";
      if (t.status === "cancelled") return "Their trial was cancelled";
      if (TRIAL_RUNNING.has(t.status)) return "Their trial is still running";
      // The email says the card is paused, which only happens after the grace period.
      if (t.status === "grace") return "Their trial is in its grace period — their card is still up";
      if (activePaidPlan(r)) return "They're on a paid plan";
      if (planKeepsCardUp(r)) return "An active plan keeps their card live";
      return null;
    },
    build: (r) => trialEndedEmail({ name: r.name, slug: cardOf(r) }),
  },
  finish_card: {
    kind: "abandonedPublishEmail",
    unavailable: (r) => {
      if (!r.userId) return "No account on the new site yet";
      if (r.card) return r.card.published ? "Their card is already published" : "They already have a card on the old site";
      // The email says the trial starts on the day they publish.
      if (r.trial) return "Their trial has already started";
      if (activePaidPlan(r)) return "They're on a paid plan";
      return null;
    },
    build: (r) => abandonedPublishEmail({ name: r.name, trialDays: r.trialDays }),
  },
  feature_update: {
    kind: "featureUpdateEmail",
    unavailable: () => null,
    build: (r) => featureUpdateEmail({ name: r.name, slug: cardOf(r) }),
  },
  review_request: {
    kind: "reviewRequestEmail",
    unavailable: () => null,
    // No review page is configured anywhere yet, so it asks for a reply instead.
    build: (r) => reviewRequestEmail({ name: r.name }),
  },
};

const CATEGORY = new Map(MANUAL_TEMPLATES.map((t) => [t.key, t.category]));

/** Which of the customer's switches governs this send: a promotional custom
    message counts as tips & news; any other custom message is service mail. */
export const templateCategory = (key: ManualTemplateKey, custom?: { promotional?: boolean } | null): TemplateCategory =>
  key === "custom" ? (custom?.promotional ? "tips" : "service") : CATEGORY.get(key) ?? "service";

/** The customer switched this kind of email off (service mail always goes). */
export const optedOut = (r: Pick<Recipient, "prefs">, category: TemplateCategory) =>
  category === "plan" ? !r.prefs.plan : category === "tips" ? !r.prefs.tips : false;

export function templateAvailability(r: Recipient, key: ManualTemplateKey, now = Date.now()): { available: boolean; reason: string | null } {
  const reason = r.blocked ?? TEMPLATES[key].unavailable(r, now);
  return { available: !reason, reason };
}

/* ── Email-log kinds ─────────────────────────────────────────────────────── */

/** What a send by hand is logged as: "manual:" + the template's kind, and
    "manual:promo:teamMessageEmail" for a promotional custom message (the last
    part is always the template, so the log can name it). */
export const loggedKind = (key: ManualTemplateKey, promotional = false) =>
  key === "custom" && promotional ? `manual:promo:${TEMPLATES.custom.kind}` : `manual:${TEMPLATES[key].kind}`;

/** Every logged kind a template's sends by hand can have. */
export const manualKinds = (key: ManualTemplateKey) =>
  key === "custom" ? [loggedKind("custom"), loggedKind("custom", true)] : [loggedKind(key)];

/** The template's own kind, as the platform logs it when it sends it by itself. */
export const templateKind = (key: ManualTemplateKey) => TEMPLATES[key].kind;

/** Tips & news, whoever sent it (the weekly limit): the tips templates, by
    hand or not, and promotional custom messages. */
export const TIPS_KINDS: string[] = [
  ...MANUAL_TEMPLATES.filter((t) => t.category === "tips").flatMap((t) => [TEMPLATES[t.key].kind, loggedKind(t.key)]),
  loggedKind("custom", true),
];

/** Emails to the team's own inbox (layout audience "admin"): every owner alert
    Settings → Alerts can switch off, and the SMTP test. They name other
    customers, so they never show up in a customer's list of recent emails. */
export const OWNER_ALERT_KINDS: string[] = [...Object.keys(ALERT_KIND_BY_TEMPLATE), "smtpTestEmail"];

/* ── Building the email ──────────────────────────────────────────────────── */

/** A refusal the admin can act on (the router turns it into a BAD_REQUEST). */
export class EmailBuildError extends Error {}

/** The admin's subject and message, cleaned: one-line subject without control
    characters, message with line breaks normalised; then the length limits. */
export function cleanCustom(input: Partial<CustomMessageInput> | null | undefined):
  { ok: true; value: CustomMessageInput } | { ok: false; error: string } {
  const L = MANUAL_EMAIL_LIMITS;
  const subject = oneLine(input?.subject);
  const message = normalizeMessage(input?.message);
  if (subject.length < 3) return { ok: false, error: "Add a subject (at least 3 characters)." };
  if (subject.length > L.subjectMax) return { ok: false, error: `Keep the subject to ${L.subjectMax} characters.` };
  if (!message) return { ok: false, error: "Write a message." };
  if (message.length > L.messageMax) return { ok: false, error: `Keep the message to ${L.messageMax.toLocaleString("en-IN")} characters.` };
  return { ok: true, value: { subject, message, promotional: !!input?.promotional } };
}

/** sha256 of subject + html + text: what the send compares with the preview. */
export const emailHash = (e: Pick<Email, "subject" | "html" | "text">) =>
  createHash("sha256").update(`${e.subject}\n${e.html}\n${e.text}`).digest("hex");

/** The one place a manual email is made — the preview and the send both call
    this. Throws EmailBuildError when the template doesn't fit the customer or
    the custom message breaks a rule. */
export function buildEmail(r: Recipient, key: ManualTemplateKey, custom?: Partial<CustomMessageInput> | null, now = Date.now()): { email: Email; hash: string } {
  const { available, reason } = templateAvailability(r, key, now);
  if (!available) throw new EmailBuildError(reason || "This email doesn't fit this customer.");
  let clean: CustomMessageInput | null = null;
  if (key === "custom") {
    const c = cleanCustom(custom);
    if (!c.ok) throw new EmailBuildError(c.error);
    clean = c.value;
  }
  const email: Email = { ...TEMPLATES[key].build(r, now, clean), userId: r.userId ?? undefined };
  return { email, hash: emailHash(email) };
}

/** The inbox preview line of a built email, as plain text. */
export function preheaderOf(html: string): string {
  const m = html.match(/<div style="display:none;[^"]*">([\s\S]*?)&#8199;/);
  if (!m) return "";
  return m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
}

const TRUSTED_HOST = (host: string) => host === "digitalcarda.in" || host.endsWith(".digitalcarda.in") || host === "wa.me";

/** Things worth a second look before sending. `lastSent` is the newest email
    of this template they got in the last week (by hand or automatically). */
export function previewWarnings(
  r: Recipient, key: ManualTemplateKey, custom: CustomMessageInput | null,
  lastSent: { at: Date; byHand: boolean } | null,
): string[] {
  const out: string[] = [];
  const category = templateCategory(key, custom);
  if (optedOut(r, category)) {
    out.push(category === "plan"
      ? "They've switched off plan and trial emails, so this can't be sent."
      : "They've switched off tips and news, so this can't be sent.");
  }
  if (r.emailVerified === false) out.push("They haven't confirmed this email address yet, so it may not reach them.");
  if (r.source === "old_site") out.push("Old-site customer with no account here yet: there's no in-app notification, and their email switches can't be checked.");
  if (custom) {
    const { links, extra } = linkPieces(normalizeMessage(custom.message));
    const outside = [...new Set(links.map((u) => new URL(u).hostname.toLowerCase()).filter((h) => !TRUSTED_HOST(h)))];
    if (outside.length) out.push(`Links outside digitalcarda.in: ${outside.join(", ")}. Make sure you trust them.`);
    if (extra) out.push(`Only the first ${MANUAL_EMAIL_LIMITS.linksMax} links are clickable; ${extra} more ${extra === 1 ? "address stays" : "addresses stay"} as plain text.`);
  }
  if (lastSent) out.push(`They already got this email ${lastSent.byHand ? "from the team" : "automatically"} on ${whenIst(lastSent.at)}.`);
  return out;
}
