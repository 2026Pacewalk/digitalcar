/* The notification registry, shared by the API and the web app.
 *
 * Every notification has a `type`. What it is about (its category, the filter
 * chip it sits under), how it looks and — for the team feed — who on the team
 * may see it all come from here, so the chips always match what the server
 * filters on. The category is worked out from the type when it is read, which
 * is why the existing rows (and the daily jobs that write them, keyed on the
 * type) need no migration.
 *
 * Two feeds:
 *  - the user feed (table `notifications`): a customer's or a reseller's own
 *    notifications, one row per person;
 *  - the team feed (table `team_notifications`): what the DigitalCarda team is
 *    told — one row per event, shown to the super admin and to each staff
 *    member whose access covers the event's module.
 */

import { hasAccess, type StaffModule, type StaffPermissions } from "./staff";

export type NotifIcon =
  | "mail" | "clock" | "calendar" | "calendarPlus" | "check" | "x" | "banknote" | "users" | "userPlus"
  | "userMinus" | "sparkles" | "package" | "truck" | "percent" | "wand" | "link" | "shield" | "handshake"
  | "trending" | "globe" | "trash" | "store" | "inbox" | "bell";
export type NotifTone = "amber" | "green" | "red" | "blue" | "violet" | "gold" | "teal" | "slate";
export type NotifSeverity = "info" | "action" | "critical";

export type Audience = "customer" | "reseller" | "team";

type Look = { icon: NotifIcon; tone: NotifTone };
type UserDef = Look & { category: UserCategory; label: string };
type TeamDef = Look & { category: TeamCategory; label: string; module: StaffModule | null; severity: NotifSeverity };

/* ── Categories (the filter chips) ───────────────────────────────────────── */

export const USER_CATEGORY_KEYS = ["leads", "billing", "orders", "rewards", "customers", "updates"] as const;
export type UserCategory = (typeof USER_CATEGORY_KEYS)[number];

/** The chips a customer and a reseller see, in order. "updates" is the catch-all. */
export const USER_CATEGORIES: Record<"customer" | "reseller", { key: UserCategory; label: string }[]> = {
  customer: [
    { key: "leads", label: "Leads" },
    { key: "billing", label: "Plan & billing" },
    { key: "orders", label: "Orders" },
    { key: "rewards", label: "Rewards" },
    { key: "updates", label: "Updates" },
  ],
  reseller: [
    { key: "customers", label: "Customers" },
    { key: "rewards", label: "Earnings" },
    { key: "updates", label: "Updates" },
  ],
};

export const TEAM_CATEGORY_KEYS = ["signups", "payments", "orders", "payouts", "resellers", "leads", "domains", "system", "security"] as const;
export type TeamCategory = (typeof TEAM_CATEGORY_KEYS)[number];

export const TEAM_CATEGORIES: { key: TeamCategory; label: string }[] = [
  { key: "signups", label: "Sign-ups" },
  { key: "payments", label: "Payments" },
  { key: "orders", label: "Orders" },
  { key: "payouts", label: "Payouts" },
  { key: "resellers", label: "Resellers" },
  { key: "leads", label: "Leads" },
  { key: "domains", label: "Domains" },
  { key: "system", label: "System" },
  { key: "security", label: "Security" },
];

/* ── The user feed ───────────────────────────────────────────────────────── */

const u = (category: UserCategory, icon: NotifIcon, tone: NotifTone, label: string): UserDef => ({ category, icon, tone, label });

/** Exact types. */
export const USER_TYPES: Record<string, UserDef> = {
  enquiry_new: u("leads", "mail", "amber", "New enquiry on your card"),
  welcome: u("updates", "sparkles", "gold", "Welcome"),
  card_published: u("updates", "sparkles", "green", "Card published"),
  card_link_changed: u("updates", "link", "blue", "Card link changed"),
  ls_abandoned: u("updates", "wand", "gold", "Card not published yet"),
  referral_joined: u("rewards", "users", "blue", "Someone joined with your link"),
  referral_reward: u("rewards", "banknote", "green", "Referral reward"),
  reseller_commission: u("rewards", "banknote", "green", "Commission earned"),
  payout_requested: u("rewards", "clock", "amber", "Payout requested"),
  payout_paid: u("rewards", "check", "green", "Payout sent"),
  payout_rejected: u("rewards", "x", "red", "Payout declined"),
  payment_pending: u("billing", "clock", "amber", "Payment submitted"),
  payment_verified: u("billing", "check", "green", "Payment verified"),
  payment_rejected: u("billing", "x", "red", "Payment not verified"),
  plan_upgraded: u("billing", "package", "violet", "Plan changed by the team"),
  plan_extended: u("billing", "calendarPlus", "green", "Plan extended"),
  addon_active: u("billing", "check", "green", "Add-on active"),
  ls_ending: u("billing", "calendar", "amber", "Trial ending"),
  trial_email_ending: u("billing", "calendar", "amber", "Trial ending"),
  ls_ended: u("billing", "calendar", "red", "Trial ended"),
  trial_email_ended: u("billing", "calendar", "red", "Trial ended"),
  ls_offer: u("billing", "percent", "gold", "Upgrade offer"),
  nfc_received: u("orders", "package", "amber", "NFC order received"),
  nfc_confirmed: u("orders", "check", "green", "NFC order confirmed"),
  nfc_shipped: u("orders", "truck", "blue", "NFC order shipped"),
  nfc_tracking: u("orders", "truck", "blue", "NFC tracking number"),
  nfc_delivered: u("orders", "check", "green", "NFC order delivered"),
  nfc_cancelled: u("orders", "x", "red", "NFC order cancelled"),
  security_password: u("updates", "shield", "red", "Password changed"),
  security_email: u("updates", "shield", "red", "Sign-in email changed"),
  reseller_customer_linked: u("customers", "handshake", "teal", "Customer added to your account"),
  reseller_customer_removed: u("customers", "userMinus", "slate", "Customer moved out of your account"),
  reseller_customer_created: u("customers", "userPlus", "teal", "Customer created"),
  reseller_welcome: u("updates", "sparkles", "gold", "Welcome, partner"),
};

/** Types the daily jobs key by date or subscription (ls_renew7_12_20260928 …). */
export const USER_PREFIXES: [string, UserDef][] = [
  ["ls_fu_", u("leads", "clock", "amber", "Follow-ups due")],
  ["ls_renew", u("billing", "calendar", "amber", "Plan renewal reminder")],
  ["ls_subexp_", u("billing", "calendar", "red", "Plan ended")],
  ["ls_d", u("updates", "trending", "blue", "Trial update")],
];

const FALLBACK_USER: UserDef = u("updates", "bell", "slate", "Update");

/** The definition for a user-feed type (never undefined). */
export function userDef(type: string): UserDef {
  if (USER_TYPES[type]) return USER_TYPES[type];
  for (const [prefix, def] of USER_PREFIXES) if (type.startsWith(prefix)) return def;
  return FALLBACK_USER;
}

/** The chip a type sits under, for this person. Anything a reseller's chips
    don't cover is an update. */
export function userCategory(type: string, audience: "customer" | "reseller"): UserCategory {
  const c = userDef(type).category;
  return USER_CATEGORIES[audience].some((x) => x.key === c) ? c : "updates";
}

/** What a SQL filter for one category must match: the exact types and the
    prefixes in it, or — for the catch-all "updates" — everything NOT matched
    by the other chips this person has. */
export function userCategoryMatcher(category: UserCategory, audience: "customer" | "reseller"):
  { mode: "in"; exact: string[]; prefixes: string[] } | { mode: "notIn"; exact: string[]; prefixes: string[] } {
  const chips = USER_CATEGORIES[audience].map((c) => c.key).filter((k) => k !== "updates");
  const collect = (keys: UserCategory[]) => ({
    exact: Object.entries(USER_TYPES).filter(([, d]) => keys.includes(d.category)).map(([t]) => t),
    prefixes: USER_PREFIXES.filter(([, d]) => keys.includes(d.category)).map(([p]) => p),
  });
  if (category === "updates") return { mode: "notIn", ...collect(chips) };
  return { mode: "in", ...collect([category]) };
}

/* ── The team feed ───────────────────────────────────────────────────────── */

const t = (category: TeamCategory, module: StaffModule | null, severity: NotifSeverity, icon: NotifIcon, tone: NotifTone, label: string): TeamDef =>
  ({ category, module, severity, icon, tone, label });

/** Every event the team is told about. `module` decides which staff see it
    (null = the super admin only); "action" events wait in Needs action until
    someone handles them. */
export const TEAM_TYPES: Record<string, TeamDef> = {
  signup_new: t("signups", "customers", "info", "userPlus", "blue", "New sign-up"),
  customer_created: t("signups", "customers", "info", "userPlus", "teal", "Customer added by a reseller or the team"),
  payment_to_verify: t("payments", "payments", "action", "clock", "amber", "Payment to verify"),
  online_sale: t("payments", "payments", "info", "banknote", "green", "Online payment received"),
  // Add-on sales open pages of other modules, so only staff who can open them see these.
  addon_sale: t("payments", "customers", "info", "banknote", "green", "Card add-on bought online"),
  domain_sale: t("payments", "domains", "info", "banknote", "green", "Custom domain add-on bought online"),
  payout_request: t("payouts", "referrals", "action", "banknote", "amber", "Payout requested"),
  reseller_application: t("resellers", "resellers", "action", "store", "violet", "Reseller application"),
  nfc_order_paid: t("orders", "orders", "action", "package", "green", "NFC order to print"),
  nfc_order_awaiting: t("orders", "orders", "action", "package", "amber", "NFC order awaiting payment"),
  bulk_order: t("orders", "orders", "action", "inbox", "blue", "Bulk order request"),
  lead_new: t("leads", "leads", "info", "mail", "amber", "Enquiry on a customer's card"),
  contact_new: t("leads", "leads", "info", "inbox", "blue", "Website enquiry"),
  domain_added: t("domains", "domains", "info", "globe", "blue", "Custom domain added"),
  deletion_requested: t("system", "system", "action", "trash", "red", "Account deletion requested"),
  deletion_cancelled: t("system", "system", "info", "check", "green", "Account deletion cancelled"),
  payment_settings_changed: t("security", null, "critical", "shield", "red", "Payment details changed"),
};

const FALLBACK_TEAM: TeamDef = t("system", null, "info", "bell", "slate", "Update");

export function teamDef(type: string): TeamDef {
  return TEAM_TYPES[type] ?? FALLBACK_TEAM;
}

/** May this admin see an event from `module`? The super admin sees everything;
    staff see the modules they were given (view is enough); nobody else sees
    the team feed, and a module-less event is the super admin's alone. */
export function teamCanSee(role: string, perms: StaffPermissions | null | undefined, module: StaffModule | null): boolean {
  if (role === "super_admin") return true;
  if (role !== "staff" || !module) return false;
  return hasAccess(perms, module, "view");
}

/** The team categories this admin can see at all (for the chips). */
export function teamCategoriesFor(role: string, perms: StaffPermissions | null | undefined): TeamCategory[] {
  const out = new Set<TeamCategory>();
  for (const d of Object.values(TEAM_TYPES)) if (teamCanSee(role, perms, d.module)) out.add(d.category);
  return TEAM_CATEGORIES.map((c) => c.key).filter((k) => out.has(k));
}

/** The modules this admin can see (for SQL). null = everything (super admin). */
export function teamModulesFor(role: string, perms: StaffPermissions | null | undefined): StaffModule[] | null {
  if (role === "super_admin") return null;
  if (role !== "staff") return [];
  const mods = new Set<StaffModule>();
  for (const d of Object.values(TEAM_TYPES)) if (d.module && teamCanSee(role, perms, d.module)) mods.add(d.module);
  return [...mods];
}

/* ── Shared helpers ──────────────────────────────────────────────────────── */

/** Names and free text people typed end up in other people's notifications:
    keep them to one short line. */
export function clip(s: unknown, max = 80): string {
  const one = String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
}

const IST_MS = 330 * 60_000;
const istDay = (ms: number) => Math.floor((ms + IST_MS) / 86_400_000);

/** Which date heading a notification goes under, by the India calendar. */
export function dayGroup(at: Date | string | number, now: Date | number = Date.now()): "today" | "yesterday" | "week" | "older" {
  const when = new Date(at).getTime();
  const diff = istDay(new Date(now).getTime()) - istDay(when);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return "week";
  return "older";
}

export const DAY_GROUP_LABEL: Record<ReturnType<typeof dayGroup>, string> = {
  today: "Today", yesterday: "Yesterday", week: "Earlier this week", older: "Older",
};

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(at: Date | string | number, now: Date | number = Date.now()): string {
  const when = new Date(at).getTime();
  if (Number.isNaN(when)) return "";
  const sec = Math.max(0, Math.floor((new Date(now).getTime() - when) / 1000));
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(when).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: d > 300 ? "numeric" : undefined });
}

/** The exact time, in India time, for a tooltip. */
export function exactTime(at: Date | string | number): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) + " IST";
}
