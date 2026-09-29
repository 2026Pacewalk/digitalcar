/* The super admin dashboard (contracts/admin-dashboard.ts) in one payload —
   analytics.adminDashboard, drawn by src/pages/admin/Dashboard.tsx.

   Where each number comes from:
     · Money in, cash basis — counted when it was paid: plan payments
       (payment_orders), NFC orders, card and domain add-ons
       (razorpay_fulfilments) and what resellers paid us (reseller_payments).
     · Engagement — card_events, the log the public card writes. Never the old
       `cards` / `analytics_events` tables, which almost nothing writes.
     · Needs action — the same rules as the owner's daily digest
       (api/cron/owner-digest.ts), so the page and the email agree.

   Dates: every window is worked out here in India time and compared as epoch
   seconds against UNIX_TIMESTAMP(column), and months/days are bucketed by
   adding +05:30 to that. The local MySQL runs on IST and production on UTC;
   this gives the same answer on both.

   Staff only get the sections their modules allow (a missing one is null), and
   a section whose query fails is logged, left out and named in `failed`
   instead of failing the page. Several admins poll this every minute, so a
   payload is kept for 20 seconds per set of modules — 3 seconds when a section
   failed, so it is tried again soon. */
import { sql, type SQL } from "drizzle-orm";
import type { getDb } from "../queries/connection";
import { hasAccess, STAFF_MODULE_KEYS, type StaffModule, type StaffPermissions } from "@contracts/staff";
import { teamModulesFor } from "@contracts/notifications";
import {
  REVENUE_STREAMS,
  type ActionItem, type ActionKey, type ActivityItem, type AdminDashboard, type CustomerSection,
  type EngagementSection, type FunnelStage, type HealthSection, type MonthPoint, type ProductRow,
  type ResellerRow, type ResellerSection, type RevenueSection, type RevenueStream, type SignupRow,
} from "@contracts/admin-dashboard";
import { staffAccessFor } from "./staff-access";
import { PAID_PACKAGE_IDS, legacyPlanCounts } from "./entitlement";

type Db = ReturnType<typeof getDb>;

/* ── Pure helpers (unit-tested in admin-dashboard.test.ts) ─────────────── */

export const IST_MS = 19_800_000;   // +05:30
export const DAY_MS = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-28": the India calendar day that contains `t`. */
export const istDayKey = (t: number) => new Date(t + IST_MS).toISOString().slice(0, 10);
/** "2026-09": the India calendar month that contains `t`. */
export const istMonthKey = (t: number) => istDayKey(t).slice(0, 7);

/** 00:00 IST of the India calendar day that contains `t`. */
export function istDayStart(t: number): number {
  const d = new Date(t + IST_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST_MS;
}

/** 00:00 IST on the 1st of the India month that contains `t`, moved by `offset` months. */
export function istMonthStart(t: number, offset = 0): number {
  const d = new Date(t + IST_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1) - IST_MS;
}

/** The last `n` India months up to this one, oldest first ("Oct ’25" … "Sep ’26"). */
export function lastMonths(now: number, n: number): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const start = istMonthStart(now, -k);
    const d = new Date(start + IST_MS);
    out.push({ ym: istMonthKey(start), label: `${MON[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}` });
  }
  return out;
}

/** The last `n` India days up to today, oldest first ("28 Sep"). */
export function lastDays(now: number, n: number): { date: string; label: string }[] {
  const today = istDayStart(now);
  const out: { date: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = today - i * DAY_MS;
    const d = new Date(start + IST_MS);
    out.push({ date: istDayKey(start), label: `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` });
  }
  return out;
}

/** Every point, in order; a point with no row gets `empty`, so a chart never has gaps. */
export function zeroFill<P extends object, T extends object>(points: P[], keyOf: (p: P) => string, rows: Map<string, T>, empty: T): (P & T)[] {
  return points.map((p) => ({ ...p, ...(rows.get(keyOf(p)) ?? empty) }));
}

/** Percent change to one decimal; null when there's nothing to compare with. */
export function growthPct(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Last month from its 1st up to the same point in the month as now. It never
    runs into this month, so on 31 March it is the whole of February. */
export function sameDaysLastMonth(now: number): { from: number; to: number } {
  const thisStart = istMonthStart(now);
  const from = istMonthStart(now, -1);
  return { from, to: Math.min(from + (now - thisStart), thisStart) };
}

/** Every window the dashboard counts in (epoch ms, India time). The 30-day
    figures cover today and the 29 days before, so they add up to their chart.
    Windows that run up to now end at `tomorrow`: a reseller payment the team
    dates ahead doesn't count until its day, and one dated today (stored at
    noon) counts all day. */
export function windows(now: number) {
  const today = istDayStart(now);
  return {
    now,
    today,
    tomorrow: today + DAY_MS,
    last7: today - 6 * DAY_MS,
    day30: today - 29 * DAY_MS,
    day60: today - 59 * DAY_MS,
    month: istMonthStart(now),
    lastMonth: istMonthStart(now, -1),
    sameDaysTo: sameDaysLastMonth(now).to,
    months12: istMonthStart(now, -11),
  };
}
type Windows = ReturnType<typeof windows>;

/** A card address as the site makes them. card_events takes any slug from
    anyone (POST /api/track needs no login), so only these are ever linked. */
export const isCardSlug = (slug: string) => /^[a-z0-9_-]{1,191}$/.test(slug);
export const cardPath = (slug: string) => `/${encodeURIComponent(slug)}`;

/** Emails the old site's plan counts leave out: people already counted from a
    plan here, and old-site customers an admin hid (erasing an account hides
    its old-site rows too) — unless the same email has a row still shown. */
export function oldSiteSkip(onPlatform: Iterable<string>, legacy: { id?: unknown; email?: string }[], hiddenIds: Set<string>): Set<string> {
  const skip = new Set(onPlatform);
  const shown = new Set<string>();
  const hidden = new Set<string>();
  for (const c of legacy) {
    const email = String(c.email || "").toLowerCase().trim();
    if (email) (hiddenIds.has(String(c.id)) ? hidden : shown).add(email);
  }
  for (const email of hidden) if (!shown.has(email)) skip.add(email);
  return skip;
}

/** The offline book across partners: the signed net, what they still owe
    (positive balances only) and what they hold in credit — so one partner's
    credit never hides another's debt. */
export function balanceTotals(outstanding: number[]): { outstanding: number; toCollect: number; credit: number } {
  const add = (pick: (n: number) => number) => Math.round(outstanding.reduce((s, n) => s + pick(n), 0) * 100) / 100;
  return { outstanding: add((n) => n), toCollect: add((n) => Math.max(0, n)), credit: add((n) => Math.max(0, -n)) };
}

/* ── Shared vocabulary ─────────────────────────────────────────────────── */

// Card event types that are page-level signals rather than a visitor doing
// something; every other type counts as an action. analytics.insights uses
// the same list, so a customer's report and this page count alike.
export const PASSIVE_TYPES = ["view", "section_view", "scroll", "time_on_card", "card_exit"];

// Every conversion step the site records, in funnel order. POST /api/funnel
// (api/boot.ts) accepts exactly these.
export const FUNNEL_STAGES: { stage: string; label: string }[] = [
  { stage: "product_view", label: "Viewed a design" },
  { stage: "demo_view", label: "Opened a demo" },
  { stage: "try_free", label: "Tapped Try free" },
  { stage: "registration", label: "Signed up" },
  { stage: "customization", label: "Edited their card" },
  { stage: "published", label: "Published a card" },
  { stage: "first_share", label: "Shared their card" },
  { stage: "payment", label: "Paid for a plan" },
  { stage: "upgrade", label: "Upgraded" },
];

// What a visitor did on a card. Unknown types are spelled out from the key.
const ACTION_LABELS: Record<string, string> = {
  call: "Call", whatsapp: "WhatsApp", email: "Email", website: "Website",
  directions: "Directions", map_click: "Directions",
  save_contact: "Saved contact", vcard_download: "Saved contact",
  share: "Share", share_channel: "Shared to an app", copy_link: "Copied link",
  qr_scan: "QR scan", enquiry: "Enquiry", enquiry_start: "Opened the enquiry form",
  product: "Product tap", product_click: "Product tap", product_enquiry: "Product enquiry",
  offer_click: "Offer tap", catalogue_view: "Opened the catalogue",
  social: "Social link", social_click: "Social link",
  gallery_open: "Opened the gallery", gallery_image: "Viewed a photo", video_play: "Played a video",
  brochure: "Brochure download", review_click: "Review link", review_write: "Wrote a review",
  pay_click: "Pay button", upi_copy: "Copied UPI ID", bank_copy: "Copied bank details", payment_qr: "Payment QR",
};
const actionLabel = (type: string) => ACTION_LABELS[type] ?? type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const ACTIONS: Record<ActionKey, Pick<ActionItem, "label" | "hint" | "link" | "module" | "tone">> = {
  payments_to_verify: { label: "Payments to verify", hint: "Check each UPI or bank payment, then switch the plan on.", link: "/admin/payment-orders", module: "payments", tone: "red" },
  nfc_to_print: { label: "NFC orders to print", hint: "Paid for. Print them and move them to In production.", link: "/admin/nfc-orders", module: "orders", tone: "red" },
  nfc_to_ship: { label: "NFC orders to ship", hint: "Printed. Ship them and add the tracking number.", link: "/admin/nfc-orders", module: "orders", tone: "amber" },
  nfc_awaiting_payment: { label: "NFC orders awaiting payment", hint: "Ordered without paying online. Collect the payment, then mark them paid.", link: "/admin/nfc-orders", module: "orders", tone: "amber" },
  bulk_new: { label: "New bulk requests", hint: "Businesses asking for a bulk quote. Call them back.", link: "/admin/bulk-orders", module: "orders", tone: "red" },
  payouts_pending: { label: "Payouts to send", hint: "Referrers and resellers waiting for their money.", link: "/admin/referrals", module: "referrals", tone: "red" },
  reseller_applications: { label: "Reseller applications", hint: "People asking to become a partner. Approve or decline them.", link: "/admin/resellers?tab=applications", module: "resellers", tone: "red" },
  deletions_due: { label: "Account deletions due", hint: "Their 30-day wait is over. Erase the accounts.", link: "/admin/deletion-requests", module: "system", tone: "red" },
  domains_pending: { label: "Domains not connected yet", hint: "Customers still adding their DNS records. Help anyone who is stuck.", link: "/admin/domains", module: "domains", tone: "blue" },
  emails_failed: { label: "Emails that failed today", hint: "Emails from the last 24 hours that didn't go out. Check the email log.", link: "/admin/email-log", module: "system", tone: "blue" },
  plans_expiring: { label: "Paid plans ending this week", hint: "Remind these customers to renew before their plan ends.", link: "/admin/customers", module: "customers", tone: "amber" },
  trials_ending: { label: "Trials ending in 3 days", hint: "Help these people pick a plan before their trial ends.", link: "/admin/customers", module: "customers", tone: "amber" },
};
const ACTION_KEYS = Object.keys(ACTIONS) as ActionKey[];

const TRIAL_PACKAGE_ID = 7;

/* ── Small SQL helpers ─────────────────────────────────────────────────── */

const num = (v: unknown) => Number(v ?? 0) || 0;
const money = (n: number) => Math.round(n * 100) / 100;
const sec = (ms: number) => Math.floor(ms / 1000);
const iso = (unixSec: unknown) => {
  const n = Number(unixSec);
  return unixSec == null || unixSec === "" || !Number.isFinite(n) ? null : new Date(n * 1000).toISOString();
};

/** Rows of a raw query. mysql2 returns [rows, fields]; drizzle may hand back either shape. */
async function rows<T>(db: Db, query: SQL): Promise<T[]> {
  const res = await db.execute(query);
  return (Array.isArray(res) ? res[0] : res) as unknown as T[];
}

// The India month / day of a unix-seconds expression, whatever the session time zone.
const istMonthOf = (unixExpr: string) => sql.raw(`DATE_FORMAT(DATE_ADD('1970-01-01', INTERVAL ${unixExpr} + 19800 SECOND), '%Y-%m')`);
const istDayOf = (unixExpr: string) => sql.raw(`DATE_FORMAT(DATE_ADD('1970-01-01', INTERVAL ${unixExpr} + 19800 SECOND), '%Y-%m-%d')`);
const PASSIVE_SQL = sql.raw(PASSIVE_TYPES.map((t) => `'${t}'`).join(", "));
const list = (values: string[]) => sql.join(values.map((v) => sql`${v}`), sql`, `);

// True for each user's newest subscriptions row (alias s) — the row that
// decides their plan, as in subscription.mySubscription and the billing emails.
const NEWEST_SUB = sql.raw(`NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = s.user_id
  AND (s2.created_at > s.created_at OR (s2.created_at = s.created_at AND s2.id > s.id)))`);

type SectionName = AdminDashboard["failed"][number];
const SECTION_ORDER: SectionName[] = ["revenue", "resellers", "actions", "customers", "engagement", "funnel", "products", "activity", "recentSignups", "health"];

/** One section's work. A failure is logged, the section left out and named in
    `failed` (under every section that shows it). */
async function section<T>(failed: Set<SectionName>, names: SectionName | SectionName[], fallback: T, fn: () => Promise<T>, label?: string): Promise<T> {
  try { return await fn(); } catch (e) {
    const all = Array.isArray(names) ? names : [names];
    console.error(`[admin-dashboard] ${label ?? all.join(", ")} failed: ${(e as Error).message}`);
    for (const n of all) failed.add(n);
    return fallback;
  }
}

/* ── Revenue ───────────────────────────────────────────────────────────── */

/* Every payment that reached us, one row each: (stream, amount, at = unix
   seconds, pay = an id unique per payment within its stream).
     · A Razorpay plan payment can be recorded twice when the browser's verify
       and the webhook race (payment-router recordRazorpayPayment), so only
       the first row per payment reference counts.
     · One NFC payment can cover two order rows (card + standee): the rows are
       summed and the payment counted once. Orders the team marked paid before
       paid_at was stamped fall back to when they were placed (a fixed date, so
       they never move to the day of a later edit).
     · Add-on rows from before razorpay_fulfilments had an amount are counted
       at the price of the buyer's billing cycle (their newest card_addons
       row), else the yearly price. */
function revenueEvents(addon: { yearly: number; monthly: number }, domainPrice: number): SQL {
  return sql`
    SELECT IF(p.gateway = 'razorpay', 'plans_online', 'plans_manual') AS stream, p.amount AS amount,
           UNIX_TIMESTAMP(COALESCE(p.verified_at, p.created_at)) AS at, CONCAT('po', p.id) AS pay
      FROM payment_orders p
     WHERE p.status = 'verified'
       AND NOT (p.gateway = 'razorpay' AND EXISTS (
             SELECT 1 FROM payment_orders d
              WHERE d.gateway = 'razorpay' AND d.status = 'verified' AND d.reference = p.reference AND d.id < p.id))
    UNION ALL
    SELECT 'nfc', n.amount, UNIX_TIMESTAMP(COALESCE(n.paid_at, n.created_at)),
           COALESCE(n.razorpay_payment_id, CONCAT('nfc', n.id))
      FROM nfc_orders n
     WHERE n.status IN ('paid', 'in_production', 'shipped', 'delivered')
    UNION ALL
    SELECT 'addons', COALESCE(f.amount,
             (SELECT IF(a.billing_cycle = 'monthly', ${addon.monthly}, ${addon.yearly}) FROM card_addons a
               WHERE a.user_id = f.user_id ORDER BY a.updated_at DESC, a.id DESC LIMIT 1),
             ${addon.yearly}),
           UNIX_TIMESTAMP(f.created_at), f.razorpay_order_id
      FROM razorpay_fulfilments f WHERE f.kind = 'card_addon'
    UNION ALL
    SELECT 'domains', COALESCE(f.amount, ${domainPrice}), UNIX_TIMESTAMP(f.created_at), f.razorpay_order_id
      FROM razorpay_fulfilments f WHERE f.kind = 'domain_addon'
    UNION ALL
    SELECT 'reseller_cash', r.amount, UNIX_TIMESTAMP(r.paid_on), CONCAT('rp', r.id)
      FROM reseller_payments r`;
}

type StreamRow = { stream: string; n: unknown; all_time: unknown; today: unknown; last7: unknown; this_month: unknown; last_month: unknown; same_days: unknown };

const STREAM_KEYS = REVENUE_STREAMS.map((s) => s.key);
const isStream = (s: string): s is RevenueStream => (STREAM_KEYS as string[]).includes(s);
const emptyStreams = () => Object.fromEntries(STREAM_KEYS.map((k) => [k, 0])) as Record<RevenueStream, number>;

/** Money in and out, all time and by India month. Also behind analytics.adminStats. */
export async function revenueSection(db: Db, now = Date.now()): Promise<RevenueSection> {
  const w = windows(now);
  // Loaded here, not at the top: those routers bring in the payment stack,
  // and this module has to load on its own in unit tests.
  const [{ ADDON_YEARLY, ADDON_MONTHLY }, { DOMAIN_ADDON_PRICE }] = await Promise.all([import("../addon-router"), import("../domain-router")]);
  const events = revenueEvents({ yearly: ADDON_YEARLY, monthly: ADDON_MONTHLY }, DOMAIN_ADDON_PRICE);
  const end = sec(w.tomorrow);

  // Every window up to now stops at the end of today (see windows()); last
  // month and its same days already end before this month began.
  const [byStream, byMonth, outRows, paidList, datedDomainUsers] = await Promise.all([
    rows<StreamRow>(db, sql`
      SELECT stream, COUNT(DISTINCT pay) AS n, SUM(amount) AS all_time,
             SUM(CASE WHEN at >= ${sec(w.today)} AND at < ${end} THEN amount ELSE 0 END) AS today,
             SUM(CASE WHEN at >= ${sec(w.last7)} AND at < ${end} THEN amount ELSE 0 END) AS last7,
             SUM(CASE WHEN at >= ${sec(w.month)} AND at < ${end} THEN amount ELSE 0 END) AS this_month,
             SUM(CASE WHEN at >= ${sec(w.lastMonth)} AND at < ${sec(w.month)} THEN amount ELSE 0 END) AS last_month,
             SUM(CASE WHEN at >= ${sec(w.lastMonth)} AND at < ${sec(w.sameDaysTo)} THEN amount ELSE 0 END) AS same_days
        FROM (${events}) e GROUP BY stream`),
    rows<{ ym: string; stream: string; total: unknown }>(db, sql`
      SELECT ${istMonthOf("at")} AS ym, stream, SUM(amount) AS total
        FROM (${events}) e WHERE at >= ${sec(w.months12)} AND at < ${end} GROUP BY ym, stream`),
    rows<Record<string, unknown>>(db, sql`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM reseller_commissions) AS rc_all,
        (SELECT COALESCE(SUM(amount), 0) FROM reseller_commissions WHERE UNIX_TIMESTAMP(created_at) >= ${sec(w.month)}) AS rc_month,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE type = 'reward' AND status = 'completed') AS rw_all,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE type = 'reward' AND status = 'completed'
            AND UNIX_TIMESTAMP(created_at) >= ${sec(w.month)}) AS rw_month,
        (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE status = 'paid') AS paid_out,
        (SELECT COALESCE(SUM(wallet_balance), 0) FROM users) AS wallets,
        (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE status = 'pending') AS payouts_pending`),
    rows<{ value: string }>(db, sql`SELECT value FROM app_settings WHERE \`key\` = 'domain_addon_users'`),
    rows<{ user_id: unknown }>(db, sql`SELECT DISTINCT user_id FROM razorpay_fulfilments WHERE kind = 'domain_addon'`),
  ]);

  // Domain add-ons sold before each sale got a dated row survive only as the
  // paid list, so they count toward all time and nowhere else.
  let listed: number[] = [];
  try { const v = JSON.parse(paidList[0]?.value || "[]"); listed = Array.isArray(v) ? v.map(Number) : []; } catch { listed = []; }
  const dated = new Set(datedDomainUsers.map((r) => num(r.user_id)));
  const undatedDomainSales = new Set(listed.filter((id) => id > 0 && !dated.has(id))).size;

  const agg = new Map(byStream.filter((r) => isStream(r.stream)).map((r) => [r.stream as RevenueStream, r]));
  const total = (f: Exclude<keyof StreamRow, "stream">) => money([...agg.values()].reduce((s, r) => s + num(r[f]), 0));
  const allTime = money(total("all_time") + undatedDomainSales * DOMAIN_ADDON_PRICE);
  const paidOrders = total("n") + undatedDomainSales;
  const thisMonth = total("this_month");
  const sameDays = total("same_days");

  const perMonth = new Map<string, Record<RevenueStream, number> & { total: number }>();
  for (const r of byMonth) {
    if (!isStream(r.stream)) continue;
    const m = perMonth.get(r.ym) ?? { ...emptyStreams(), total: 0 };
    m[r.stream] = money(m[r.stream] + num(r.total));
    m.total = money(m.total + num(r.total));
    perMonth.set(r.ym, m);
  }

  const o = outRows[0] ?? {};
  const resellerCommission = money(num(o.rc_all));
  const referralRewards = money(num(o.rw_all));
  const outThisMonth = money(num(o.rc_month) + num(o.rw_month));

  return {
    allTime,
    today: total("today"),
    last7: total("last7"),
    thisMonth,
    lastMonth: total("last_month"),
    sameDaysLastMonth: sameDays,
    growthPct: growthPct(thisMonth, sameDays),
    paidOrders,
    avgOrder: paidOrders ? money(allTime / paidOrders) : 0,
    byStream: STREAM_KEYS.map((key) => {
      const r = agg.get(key);
      const undated = key === "domains" ? undatedDomainSales : 0;
      return {
        key,
        allTime: money(num(r?.all_time) + undated * DOMAIN_ADDON_PRICE),
        thisMonth: money(num(r?.this_month)),
        count: num(r?.n) + undated,
      };
    }),
    months: zeroFill(lastMonths(now, 12), (p) => p.ym, perMonth, { ...emptyStreams(), total: 0 }),
    moneyOut: {
      resellerCommission,
      referralRewards,
      thisMonth: outThisMonth,
      payoutsPaid: money(num(o.paid_out)),
      // A pending payout has already left the wallet, so it is added back.
      owedNow: money(num(o.wallets) + num(o.payouts_pending)),
    },
    net: {
      allTime: money(allTime - resellerCommission - referralRewards),
      thisMonth: money(thisMonth - outThisMonth),
    },
    undatedDomainSales,
  };
}

/* ── Resellers ─────────────────────────────────────────────────────────── */

/* The offline book works as in Admin → Reseller accounts
   (api/reseller-ledger-router.ts): due to us = order value − their commission,
   payable = opening balance + due, outstanding = payable − payments, cancelled
   orders left out. Across partners, what's still to collect and what's held
   in credit are added up apart (balanceTotals). The online side is their
   customers paying us directly for plans (reseller_commissions). A reseller
   login with no ledger account still gets a row, with an empty offline book.
   The monthly bars stop at today, like the revenue windows. */
async function resellerSection(db: Db, w: Windows): Promise<ResellerSection> {
  const [accounts, orderAgg, payAgg, logins, customerAgg, commissionAgg, pendingPayouts, apps, monthRows] = await Promise.all([
    rows<{ id: unknown; name: string; company: string | null; uid: unknown; rate: unknown; opening: unknown; active: unknown }>(db, sql`
      SELECT id, name, company, reseller_user_id AS uid, commission_rate AS rate, opening_balance AS opening, active
        FROM reseller_accounts ORDER BY id`),
    rows<{ account_id: unknown; orders: unknown; cards: unknown; gross: unknown; commission: unknown; due: unknown }>(db, sql`
      SELECT account_id, COUNT(*) AS orders, SUM(quantity) AS cards, SUM(gross_amount) AS gross,
             SUM(commission_amount) AS commission, SUM(net_amount) AS due
        FROM reseller_orders WHERE status <> 'cancelled' GROUP BY account_id`),
    rows<{ account_id: unknown; received: unknown; last_at: unknown }>(db, sql`
      SELECT account_id, SUM(amount) AS received, MAX(UNIX_TIMESTAMP(paid_on)) AS last_at
        FROM reseller_payments GROUP BY account_id`),
    rows<{ id: unknown; name: string; status: string; wallet: unknown; company: string | null; rate: unknown }>(db, sql`
      SELECT u.id, u.full_name AS name, u.status, u.wallet_balance AS wallet, rp.company_name AS company, rp.commission_rate AS rate
        FROM users u LEFT JOIN reseller_profiles rp ON rp.user_id = u.id
       WHERE u.role = 'reseller' ORDER BY u.id`),
    rows<{ rid: unknown; n: unknown }>(db, sql`
      SELECT reseller_id AS rid, COUNT(*) AS n FROM users
       WHERE role = 'customer' AND reseller_id IS NOT NULL GROUP BY reseller_id`),
    rows<{ rid: unknown; sales: unknown; commission: unknown }>(db, sql`
      SELECT reseller_user_id AS rid, SUM(order_amount) AS sales, SUM(amount) AS commission
        FROM reseller_commissions GROUP BY reseller_user_id`),
    rows<{ n: unknown }>(db, sql`
      SELECT COALESCE(SUM(w.amount), 0) AS n FROM withdrawal_requests w
        JOIN users u ON u.id = w.user_id AND u.role = 'reseller'
       WHERE w.status = 'pending'`),
    rows<{ n: unknown }>(db, sql`SELECT COUNT(*) AS n FROM reseller_applications WHERE status = 'pending'`),
    rows<{ ym: string; due: unknown; received: unknown; online: unknown }>(db, sql`
      SELECT ym, SUM(due) AS due, SUM(received) AS received, SUM(online) AS online FROM (
        SELECT ${istMonthOf("UNIX_TIMESTAMP(order_date)")} AS ym, net_amount AS due, 0 AS received, 0 AS online
          FROM reseller_orders WHERE status <> 'cancelled'
           AND UNIX_TIMESTAMP(order_date) >= ${sec(w.months12)} AND UNIX_TIMESTAMP(order_date) < ${sec(w.tomorrow)}
        UNION ALL
        SELECT ${istMonthOf("UNIX_TIMESTAMP(paid_on)")}, 0, amount, 0
          FROM reseller_payments WHERE UNIX_TIMESTAMP(paid_on) >= ${sec(w.months12)} AND UNIX_TIMESTAMP(paid_on) < ${sec(w.tomorrow)}
        UNION ALL
        SELECT ${istMonthOf("UNIX_TIMESTAMP(created_at)")}, 0, 0, order_amount
          FROM reseller_commissions WHERE UNIX_TIMESTAMP(created_at) >= ${sec(w.months12)}
      ) x GROUP BY ym`),
  ]);

  const ordersBy = new Map(orderAgg.map((r) => [num(r.account_id), r]));
  const paysBy = new Map(payAgg.map((r) => [num(r.account_id), r]));
  const loginIds = new Set(logins.map((u) => num(u.id)));
  const customersBy = new Map(customerAgg.map((r) => [num(r.rid), num(r.n)]));
  const onlineBy = new Map(commissionAgg.map((r) => [num(r.rid), r]));

  // A login's online figures go on one row only, even if two ledger accounts
  // were linked to it.
  const shown = new Set<number>();
  const online = (userId: number | null) => {
    if (!userId || shown.has(userId)) return { customers: 0, onlineSales: 0, onlineCommission: 0 };
    shown.add(userId);
    const c = onlineBy.get(userId);
    return { customers: customersBy.get(userId) ?? 0, onlineSales: money(num(c?.sales)), onlineCommission: money(num(c?.commission)) };
  };

  const partners: ResellerRow[] = accounts.map((a) => {
    const id = num(a.id);
    const o = ordersBy.get(id);
    const p = paysBy.get(id);
    const userId = a.uid != null ? num(a.uid) : null;
    const opening = num(a.opening);
    const due = num(o?.due);
    const received = num(p?.received);
    return {
      accountId: id,
      userId,
      name: a.name,
      company: a.company || null,
      rate: num(a.rate),
      hasLogin: userId != null && loginIds.has(userId),
      active: !!num(a.active),
      orderValue: money(num(o?.gross)),
      commission: money(num(o?.commission)),
      dueToUs: money(due),
      openingBalance: money(opening),
      payable: money(opening + due),
      received: money(received),
      outstanding: money(opening + due - received),
      lastPaymentAt: iso(p?.last_at),
      ...online(userId),
    };
  });
  const linked = new Set(partners.map((r) => r.userId).filter((v): v is number => v != null));
  for (const u of logins) {
    const id = num(u.id);
    if (linked.has(id)) continue;
    partners.push({
      accountId: null, userId: id, name: u.name, company: u.company || null, rate: num(u.rate),
      hasLogin: true, active: u.status === "active",
      orderValue: 0, commission: 0, dueToUs: 0, openingBalance: 0, payable: 0, received: 0, outstanding: 0, lastPaymentAt: null,
      ...online(id),
    });
  }

  const sum = (rs: Record<string, unknown>[], f: string) => rs.reduce((s, r) => s + num(r[f]), 0);
  const dueToUs = money(sum(orderAgg, "due"));
  const opening = money(sum(accounts, "opening"));
  const balances = balanceTotals(partners.map((r) => r.outstanding));
  const offline = {
    orders: sum(orderAgg, "orders"),
    cards: sum(orderAgg, "cards"),
    orderValue: money(sum(orderAgg, "gross")),
    commission: money(sum(orderAgg, "commission")),
    dueToUs,
    opening,
    payable: money(opening + dueToUs),
    received: money(sum(payAgg, "received")),
    ...balances,
  };
  const channel = {
    customers: [...customersBy.values()].reduce((s, n) => s + n, 0),
    sales: money(sum(commissionAgg, "sales")),
    commission: money(sum(commissionAgg, "commission")),
    // Commission not paid out yet: what's in their wallets plus payouts in progress.
    owedNow: money(sum(logins, "wallet") + num(pendingPayouts[0]?.n)),
  };

  const perMonth = new Map(monthRows.map((r) => [r.ym, { dueToUs: money(num(r.due)), received: money(num(r.received)), onlineSales: money(num(r.online)) }]));
  const sales = (r: ResellerRow) => r.orderValue + r.onlineSales;

  return {
    partners: partners.length,
    withLogin: partners.filter((r) => r.hasLogin).length,
    active: partners.filter((r) => r.active).length,
    pendingApplications: num(apps[0]?.n),
    offline,
    online: channel,
    channelSales: money(offline.orderValue + channel.sales),
    ourShare: money(offline.dueToUs + channel.sales - channel.commission),
    months: zeroFill(lastMonths(w.now, 12), (p) => p.ym, perMonth, { dueToUs: 0, received: 0, onlineSales: 0 }),
    top: [...partners]
      .sort((a, b) => sales(b) - sales(a) || b.outstanding - a.outstanding || a.name.localeCompare(b.name))
      .slice(0, 8),
  };
}

/* ── Customers ─────────────────────────────────────────────────────────── */

type Expiring = { n: number; oldest: string | null } | null;

/** Paid plans (not the trial) whose holder's newest row ends in the next 7
    days: the owner digest's rule (latestPaidRowsEnding in api/cron/billing.ts),
    active accounts only. */
async function plansExpiring(db: Db, w: Windows): Promise<NonNullable<Expiring>> {
  const [r] = await rows<{ n: unknown; oldest: unknown }>(db, sql`
    SELECT COUNT(*) AS n, MIN(UNIX_TIMESTAMP(s.created_at)) AS oldest
      FROM subscriptions s JOIN users u ON u.id = s.user_id AND u.status = 'active'
     WHERE s.status = 'active' AND s.package_id <> ${TRIAL_PACKAGE_ID}
       AND UNIX_TIMESTAMP(s.current_period_end) >= ${sec(w.now)}
       AND UNIX_TIMESTAMP(s.current_period_end) < ${sec(w.now + 7 * DAY_MS)}
       AND ${NEWEST_SUB}`);
  return { n: num(r?.n), oldest: iso(r?.oldest) };
}

async function customerSection(db: Db, w: Windows, expiring: Promise<Expiring>): Promise<CustomerSection> {
  const { mergedCustomerCount, legacyCustomers } = await import("../admin-router");
  const [merged, signupRows, planRows, hiddenRows, packages, trials, cards, exp] = await Promise.all([
    mergedCustomerCount(db),
    rows<{ d: string; n: unknown }>(db, sql`
      SELECT ${istDayOf("UNIX_TIMESTAMP(created_at)")} AS d, COUNT(*) AS n
        FROM users WHERE role = 'customer' AND UNIX_TIMESTAMP(created_at) >= ${sec(w.day60)} GROUP BY d`),
    // Every active account whose newest subscriptions row is a plan still
    // running. An erased account is inactive, though its row stays active.
    rows<{ uid: unknown; package_id: unknown; email: string }>(db, sql`
      SELECT s.user_id AS uid, s.package_id, LOWER(TRIM(u.email)) AS email
        FROM subscriptions s JOIN users u ON u.id = s.user_id AND u.role IN ('customer', 'reseller') AND u.status = 'active'
       WHERE s.status = 'active'
         AND (s.current_period_end IS NULL OR UNIX_TIMESTAMP(s.current_period_end) > ${sec(w.now)})
         AND ${NEWEST_SUB}`),
    // Accounts and old-site customers an admin removed from the lists (as mergedCustomerCount).
    rows<{ k: string; value: string | null }>(db, sql`
      SELECT \`key\` AS k, value FROM app_settings WHERE \`key\` IN ('hidden_app_users', 'hidden_customers')`),
    rows<{ id: unknown; name: string; is_active: unknown }>(db, sql`
      SELECT id, name, is_active FROM subscription_packages ORDER BY display_order, id`),
    rows<{ active: unknown; converted: unknown; total: unknown }>(db, sql`
      SELECT SUM(status NOT IN ('converted', 'cancelled') AND UNIX_TIMESTAMP(ends_at) > ${sec(w.now)}) AS active,
             SUM(status = 'converted') AS converted, COUNT(*) AS total
        FROM card_trials`),
    rows<{ total: unknown; recent: unknown }>(db, sql`
      SELECT COUNT(*) AS total, SUM(UNIX_TIMESTAMP(published_at) >= ${sec(w.day30)}) AS recent FROM published_cards`),
    expiring,
  ]);

  const perDay = new Map(signupRows.map((r) => [String(r.d), num(r.n)]));
  const signups = lastDays(w.now, 30).map((d) => ({ ...d, count: perDay.get(d.date) ?? 0 }));
  const signedUp = (from: number, to = Infinity) => signupRows
    .filter((r) => { const t = Date.parse(`${r.d}T00:00:00+05:30`); return t >= from && t < to; })
    .reduce((s, r) => s + num(r.n), 0);

  const hidden = (key: string): string[] => {
    try {
      const v = JSON.parse(hiddenRows.find((r) => r.k === key)?.value || "[]");
      return Array.isArray(v) ? v.map(String) : [];
    } catch { return []; }
  };
  const hiddenUsers = new Set(hidden("hidden_app_users").map(Number));
  const hiddenLegacy = new Set(hidden("hidden_customers"));

  const platformBy = new Map<number, number>();
  const onPlatform: string[] = [];
  for (const r of planRows) {
    if (hiddenUsers.has(num(r.uid))) continue;
    platformBy.set(num(r.package_id), (platformBy.get(num(r.package_id)) ?? 0) + 1);
    onPlatform.push(String(r.email));
  }
  const oldSiteBy = legacyPlanCounts(oldSiteSkip(onPlatform, legacyCustomers(), hiddenLegacy), w.now);
  const holders = (id: number) => (platformBy.get(id) ?? 0) + (oldSiteBy.get(id) ?? 0);
  const plans = packages
    // Retired packages only while someone is still on one; paid plans first, the trial last.
    .filter((p) => !!num(p.is_active) || holders(num(p.id)) > 0)
    .map((p) => ({ packageId: num(p.id), name: p.name, platform: platformBy.get(num(p.id)) ?? 0, oldSite: oldSiteBy.get(num(p.id)) ?? 0 }))
    .sort((a, b) => Number(a.packageId === TRIAL_PACKAGE_ID) - Number(b.packageId === TRIAL_PACKAGE_ID));

  const t = trials[0];
  return {
    total: merged.total,
    platform: merged.total - merged.oldSiteOnly,
    oldSite: merged.oldSiteOnly,
    newToday: signedUp(w.today),
    new7: signedUp(w.last7),
    new30: signedUp(w.day30),
    prev30: signedUp(w.day60, w.day30),
    signups,
    plans,
    paidActive: plans.filter((p) => PAID_PACKAGE_IDS.has(p.packageId)).reduce((s, p) => s + p.platform + p.oldSite, 0),
    trialsActive: num(t?.active),
    trialConversion: { converted: num(t?.converted), total: num(t?.total) },
    expiring7: exp?.n ?? 0,
    publishedCards: num(cards[0]?.total),
    published30: num(cards[0]?.recent),
  };
}

/** The newest accounts, customers and resellers, with the plan on their newest subscriptions row. */
async function signupSection(db: Db): Promise<SignupRow[]> {
  const r = await rows<{ id: unknown; name: string; email: string; role: string; at: unknown; plan: string | null }>(db, sql`
    SELECT u.id, u.full_name AS name, u.email, u.role, UNIX_TIMESTAMP(u.created_at) AS at,
           (SELECT sp.name FROM subscriptions s JOIN subscription_packages sp ON sp.id = s.package_id
             WHERE s.user_id = u.id ORDER BY s.created_at DESC, s.id DESC LIMIT 1) AS plan
      FROM users u WHERE u.role IN ('customer', 'reseller')
     ORDER BY u.created_at DESC, u.id DESC LIMIT 8`);
  return r.map((u) => ({ id: num(u.id), name: u.name, email: u.email, role: u.role, createdAt: iso(u.at) ?? "", plan: u.plan ?? null }));
}

/* ── Engagement, funnel, products ──────────────────────────────────────── */

type LegacyCard = { slug?: string; name?: string; company_name?: string };

/** Which of these (lowercase) slugs are real cards, published here, in the
    `cards` table or on the old site (the systems the public card page serves),
    and their names: the owner of a card published here, else the old site's
    list. The old list is read only when a slug is still missing either.
    Also Admin → Customers → Card views' check that a card exists. */
export async function realCards(db: Db, slugs: string[]): Promise<{ real: Set<string>; nameBy: Map<string, string> }> {
  const real = new Set<string>();
  const nameBy = new Map<string, string>();
  if (!slugs.length) return { real, nameBy };
  const owners = await rows<{ slug: string; name: string | null }>(db, sql`
    SELECT pc.slug, u.full_name AS name FROM published_cards pc LEFT JOIN users u ON u.id = pc.user_id
     WHERE pc.slug IN (${list(slugs)})
    UNION ALL
    SELECT c.slug, NULL FROM cards c WHERE c.slug IN (${list(slugs)})`);
  for (const o of owners) {
    const slug = String(o.slug).toLowerCase();
    real.add(slug);
    if (o.name && !nameBy.has(slug)) nameBy.set(slug, o.name);
  }
  if (slugs.some((s) => !real.has(s) || !nameBy.has(s))) {
    const { legacyCustomers } = await import("../admin-router");
    for (const c of legacyCustomers() as LegacyCard[]) {
      const slug = String(c.slug || "").toLowerCase().trim();
      if (!slug) continue;
      real.add(slug);
      const name = String(c.name || c.company_name || "").trim();
      if (name && !nameBy.has(slug)) nameBy.set(slug, name);
    }
  }
  return { real, nameBy };
}

/* card_events is the busiest table and shares the site's one connection pool
   (10) with every card visit, so its queries run three at a time, and each
   filters created_at itself (FROM_UNIXTIME, not UNIX_TIMESTAMP(created_at)) so
   cardev_created_type_idx can serve the date range. */
async function engagementSection(db: Db, w: Windows): Promise<EngagementSection> {
  const from30 = sql`FROM_UNIXTIME(${sec(w.day30)})`;
  const from60 = sql`FROM_UNIXTIME(${sec(w.day60)})`;
  const [totals, daily, leadRows] = await Promise.all([
    rows<Record<string, unknown>>(db, sql`
      SELECT SUM(type = 'view' AND created_at >= ${from30}) AS views30,
             SUM(type = 'view' AND created_at < ${from30}) AS views_prev,
             SUM(type NOT IN (${PASSIVE_SQL}) AND created_at >= ${from30}) AS actions30,
             SUM(type NOT IN (${PASSIVE_SQL}) AND created_at < ${from30}) AS actions_prev,
             COUNT(DISTINCT CASE WHEN created_at >= ${from30} THEN visitor_id END) AS visitors30
        FROM card_events WHERE created_at >= ${from60}`),
    rows<{ d: string; views: unknown; visitors: unknown; actions: unknown }>(db, sql`
      SELECT ${istDayOf("UNIX_TIMESTAMP(created_at)")} AS d, SUM(type = 'view') AS views,
             COUNT(DISTINCT visitor_id) AS visitors, SUM(type NOT IN (${PASSIVE_SQL})) AS actions
        FROM card_events WHERE created_at >= ${from30} GROUP BY d`),
    rows<{ cur: unknown; prev: unknown }>(db, sql`
      SELECT SUM(created_at >= ${from30}) AS cur, SUM(created_at < ${from30}) AS prev
        FROM leads WHERE created_at >= ${from60}`),
  ]);
  const [top, sources, devices] = await Promise.all([
    // Anyone can log an event for any slug, so only real card addresses are
    // ranked, with room left to drop the ones that turn out not to be a card.
    rows<{ slug: string; views: unknown; actions: unknown }>(db, sql`
      SELECT slug, SUM(type = 'view') AS views, SUM(type NOT IN (${PASSIVE_SQL})) AS actions
        FROM card_events WHERE created_at >= ${from30} AND slug REGEXP '^[a-z0-9_-]{1,191}$'
       GROUP BY slug HAVING views > 0 ORDER BY views DESC, actions DESC LIMIT 200`),
    // Where visits came from and on what: counted per view, as a visit is one view.
    rows<{ k: string; n: unknown }>(db, sql`
      SELECT COALESCE(NULLIF(source, ''), 'direct') AS k, COUNT(*) AS n FROM card_events
       WHERE type = 'view' AND created_at >= ${from30} GROUP BY k ORDER BY n DESC`),
    rows<{ k: string; n: unknown }>(db, sql`
      SELECT COALESCE(NULLIF(device, ''), 'unknown') AS k, COUNT(*) AS n FROM card_events
       WHERE type = 'view' AND created_at >= ${from30} GROUP BY k ORDER BY n DESC`),
  ]);

  // The cards behind those slugs, and their names (realCards).
  const slugs = top.map((r) => String(r.slug).toLowerCase()).filter(isCardSlug);
  const [types, { real, nameBy }] = await Promise.all([
    rows<{ k: string; n: unknown }>(db, sql`
      SELECT type AS k, COUNT(*) AS n FROM card_events
       WHERE type NOT IN (${PASSIVE_SQL}) AND created_at >= ${from30} GROUP BY type ORDER BY n DESC`),
    realCards(db, slugs),
  ]);
  const topCards = top
    .map((r) => ({ ...r, slug: String(r.slug).toLowerCase() }))
    .filter((r) => isCardSlug(r.slug) && real.has(r.slug))
    .slice(0, 8);

  const perDay = new Map(daily.map((r) => [String(r.d), { views: num(r.views), visitors: num(r.visitors), actions: num(r.actions) }]));
  const t = totals[0] ?? {};
  const counted = (rs: { k: string; n: unknown }[]) => rs.map((r) => ({ key: String(r.k), count: num(r.n) }));
  return {
    views30: num(t.views30),
    viewsPrev30: num(t.views_prev),
    visitors30: num(t.visitors30),
    actions30: num(t.actions30),
    actionsPrev30: num(t.actions_prev),
    leads30: num(leadRows[0]?.cur),
    leadsPrev30: num(leadRows[0]?.prev),
    daily: zeroFill(lastDays(w.now, 30), (d) => d.date, perDay, { views: 0, visitors: 0, actions: 0 }),
    topCards: topCards.map((r) => ({
      slug: r.slug, name: nameBy.get(r.slug) ?? null,
      views: num(r.views), actions: num(r.actions), url: cardPath(r.slug),
    })),
    sources: counted(sources),
    devices: counted(devices),
    actionTypes: counted(types).map((r) => ({ ...r, label: actionLabel(r.key) })),
  };
}

/** Every funnel step in order, all time (the same counts as analytics.funnel). */
async function funnelSection(db: Db): Promise<FunnelStage[]> {
  const r = await rows<{ stage: string; n: unknown }>(db, sql`SELECT stage, COUNT(*) AS n FROM funnel_events GROUP BY stage`);
  const by = new Map(r.map((x) => [x.stage, num(x.n)]));
  return FUNNEL_STAGES.map((s) => ({ ...s, count: by.get(s.stage) ?? 0 }));
}

/** The designs that draw the most interest (analytics.productFunnel, top 8). */
async function productSection(db: Db): Promise<ProductRow[]> {
  const r = await rows<{ id: unknown; name: string; views: unknown; demos: unknown; tries: unknown }>(db, sql`
    SELECT p.id, p.name, SUM(f.stage = 'product_view') AS views, SUM(f.stage = 'demo_view') AS demos,
           SUM(f.stage = 'try_free') AS tries, SUM(f.stage = 'published') AS published
      FROM funnel_events f JOIN products p ON p.slug = f.product_slug
     GROUP BY p.id, p.name
    HAVING views > 0 OR tries > 0 OR published > 0
     ORDER BY views DESC, tries DESC, p.id LIMIT 8`);
  return r.map((p) => ({ productId: num(p.id), name: p.name, views: num(p.views), demos: num(p.demos), tries: num(p.tries) }));
}

/* ── Team activity, needs action, health ───────────────────────────────── */

/** The newest team notifications this admin may see: all of them for the super
    admin, their modules' for staff (api/team-notification-router.ts). */
async function activitySection(db: Db, modules: string[] | null): Promise<ActivityItem[]> {
  if (modules && !modules.length) return [];
  const where = modules ? sql`module IN (${list(modules)})` : sql`TRUE`;
  const r = await rows<{ id: unknown; type: string; category: string; title: string; message: string | null; link: string | null; at: unknown }>(db, sql`
    SELECT id, type, category, title, message, link, UNIX_TIMESTAMP(created_at) AS at
      FROM team_notifications WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT 8`);
  return r.map((n) => ({
    id: num(n.id), type: n.type, category: n.category, title: n.title,
    message: n.message ?? null, link: n.link ?? null, createdAt: iso(n.at) ?? "",
  }));
}

/** How many are waiting, their total (for money items) and the oldest one's date. */
function actionQuery(key: Exclude<ActionKey, "plans_expiring">, w: Windows): SQL {
  const now = sec(w.now);
  switch (key) {
    case "payments_to_verify": return sql`
      SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest
        FROM payment_orders WHERE status = 'pending' AND gateway = 'manual'`;
    case "nfc_to_print": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest FROM nfc_orders WHERE status = 'paid'`;
    case "nfc_to_ship": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest FROM nfc_orders WHERE status = 'in_production'`;
    // Manual orders only: an online checkout that never finished also waits in
    // pending_payment, but with a Razorpay order — nothing to collect there.
    case "nfc_awaiting_payment": return sql`
      SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest
        FROM nfc_orders WHERE status = 'pending_payment' AND razorpay_order_id IS NULL`;
    case "bulk_new": return sql`
      SELECT COUNT(*) AS n, COALESCE(SUM(total_estimate), 0) AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest
        FROM bulk_order_requests WHERE status = 'new'`;
    case "payouts_pending": return sql`
      SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest
        FROM withdrawal_requests WHERE status = 'pending'`;
    case "reseller_applications": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest FROM reseller_applications WHERE status = 'pending'`;
    case "deletions_due": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest
        FROM account_deletion_requests WHERE status = 'pending' AND UNIX_TIMESTAMP(scheduled_for) <= ${now}`;
    case "domains_pending": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest FROM custom_domains WHERE status = 'pending'`;
    case "emails_failed": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(created_at)) AS oldest
        FROM email_logs WHERE status = 'failed' AND UNIX_TIMESTAMP(created_at) >= ${now - DAY_MS / 1000}`;
    // Open trials of active accounts ending in the next 3 days (owner digest).
    case "trials_ending": return sql`
      SELECT COUNT(*) AS n, NULL AS amount, MIN(UNIX_TIMESTAMP(t.created_at)) AS oldest
        FROM card_trials t JOIN users u ON u.id = t.user_id AND u.status = 'active'
       WHERE t.status NOT IN ('converted', 'cancelled')
         AND UNIX_TIMESTAMP(t.ends_at) >= ${now} AND UNIX_TIMESTAMP(t.ends_at) < ${now + 3 * DAY_MS / 1000}`;
  }
}

/** Every item this admin's modules allow, including the ones at zero. */
async function actionItems(db: Db, w: Windows, can: (m: StaffModule) => boolean, expiring: () => Promise<Expiring>, failed: Set<SectionName>): Promise<ActionItem[]> {
  const items = await Promise.all(ACTION_KEYS.filter((key) => can(ACTIONS[key].module)).map((key) =>
    section<ActionItem | null>(failed, "actions", null, async () => {
      let n: number, amount: number | null, oldestAt: string | null;
      if (key === "plans_expiring") {
        const e = await expiring();
        if (!e) return null;
        ({ n, oldest: oldestAt } = e);
        amount = null;
      } else {
        const [r] = await rows<{ n: unknown; amount: unknown; oldest: unknown }>(db, actionQuery(key, w));
        n = num(r?.n);
        amount = r?.amount == null ? null : money(num(r.amount));
        oldestAt = iso(r?.oldest);
      }
      return { key, ...ACTIONS[key], count: n, amount, oldestAt };
    }, `actions.${key}`)));
  return items.filter((x): x is ActionItem => x != null);
}

/** Is everything wired up? Never returns keys or secrets. */
async function healthSection(db: Db, w: Windows): Promise<HealthSection> {
  const [{ smtpConfigured }, { resolveRazorpay }] = await Promise.all([import("./mail"), import("../payment-router")]);
  const [rzp, mail, settings] = await Promise.all([
    resolveRazorpay(db),
    rows<{ failed: unknown; sent: unknown }>(db, sql`
      SELECT SUM(status = 'failed') AS failed, SUM(status = 'sent') AS sent
        FROM email_logs WHERE UNIX_TIMESTAMP(created_at) >= ${sec(w.now - DAY_MS)}`),
    rows<{ k: string; value: string }>(db, sql`
      SELECT \`key\` AS k, value FROM app_settings WHERE \`key\` IN ('lifecycle_last_run', 'trial_offer_enabled')`),
  ]);
  const setting = new Map(settings.map((s) => [s.k, s.value]));
  return {
    smtp: smtpConfigured(),
    razorpay: { enabled: rzp.enabled, mode: rzp.mode },
    emailsFailed24h: num(mail[0]?.failed),
    emailsSent24h: num(mail[0]?.sent),
    lifecycleLastRun: setting.get("lifecycle_last_run") || null,
    trialOfferOn: setting.get("trial_offer_enabled") === "1",
  };
}

/* ── The payload ───────────────────────────────────────────────────────── */

export type Viewer = { id: number; role: string };

/** What this admin may see: everything for the super admin, and for staff the
    modules they hold at least "view" on. */
export async function viewerAccess(viewer: Viewer): Promise<{ perms: StaffPermissions | null; can: (m: StaffModule) => boolean }> {
  const perms = viewer.role === "staff" ? (await staffAccessFor(viewer.id)).permissions : null;
  const can = (m: StaffModule) => viewer.role === "super_admin" || (viewer.role === "staff" && hasAccess(perms, m, "view"));
  return { perms, can };
}

const CACHE_MS = 20_000;
const FAILED_CACHE_MS = 3_000;
const cache = new Map<string, { at: number; ttl: number; payload: Promise<AdminDashboard> }>();

export async function buildAdminDashboard(db: Db, viewer: Viewer): Promise<AdminDashboard> {
  const { perms, can } = await viewerAccess(viewer);
  // Two admins who may see the same modules get the same payload.
  const key = viewer.role === "super_admin" ? "*" : `${viewer.role}:${STAFF_MODULE_KEYS.filter(can).join(",")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.payload;
  const payload = assemble(db, viewer.role, perms, can);
  if (cache.size > 100) cache.clear();
  const entry = { at: Date.now(), ttl: CACHE_MS, payload };
  cache.set(key, entry);
  // A payload missing a section is shared only briefly, so the next poll tries again.
  payload.then(
    (p) => { if (p.failed.length) entry.ttl = FAILED_CACHE_MS; },
    () => { if (cache.get(key) === entry) cache.delete(key); },
  );
  return payload;
}

async function assemble(db: Db, role: string, perms: StaffPermissions | null, can: (m: StaffModule) => boolean): Promise<AdminDashboard> {
  const w = windows(Date.now());
  const failed = new Set<SectionName>();
  // Needed by both Customers and Needs action (both need the customers module); asked once.
  let expiring: Promise<Expiring> | null = null;
  const expiringOnce = () => (expiring ??= section<Expiring>(failed, ["customers", "actions"], null, () => plansExpiring(db, w), "plans expiring"));

  const [revenue, resellers, actions, customers, engagement, funnel, products, activity, recentSignups, health] = await Promise.all([
    can("payments") ? section(failed, "revenue", null, () => revenueSection(db, w.now)) : null,
    can("resellers") ? section(failed, "resellers", null, () => resellerSection(db, w)) : null,
    actionItems(db, w, can, expiringOnce, failed),
    can("customers") ? section(failed, "customers", null, () => customerSection(db, w, expiringOnce())) : null,
    can("overview") ? section(failed, "engagement", null, () => engagementSection(db, w)) : null,
    can("overview") ? section(failed, "funnel", null, () => funnelSection(db)) : null,
    can("overview") ? section(failed, "products", null, () => productSection(db)) : null,
    section<ActivityItem[]>(failed, "activity", [], () => activitySection(db, teamModulesFor(role, perms))),
    can("customers") ? section(failed, "recentSignups", null, () => signupSection(db)) : null,
    role === "super_admin" ? section(failed, "health", null, () => healthSection(db, w)) : null,
  ]);

  return {
    generatedAt: new Date(w.now).toISOString(), revenue, resellers, actions, customers, engagement, funnel, products, activity, recentSignups, health,
    failed: SECTION_ORDER.filter((s) => failed.has(s)),
  };
}
