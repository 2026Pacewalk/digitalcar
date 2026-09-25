/* Staff access + the admin activity log.
 *
 * Every admin-only tRPC procedure passes through one middleware (adminQuery in
 * api/middleware.ts). It asks this file two things: which module does this
 * procedure belong to, and may this staff member use it at this level. Reads
 * need "view", changes need "manage". A procedure not listed here stays with
 * the super admin, so a new admin endpoint is never opened to staff by accident.
 *
 * The same middleware records every change (by staff and the super admin) and
 * every refused attempt in admin_activity. */
import { eq } from "drizzle-orm";
import { cleanPermissions, hasAccess, type StaffModule, type StaffPermissions } from "@contracts/staff";
import type { User } from "@db/schema";
// The database is loaded only when a check actually needs it, so a plain
// super-admin read never touches it (and the module loads in unit tests).
import { clientIp } from "./rate-limit";

const getDb = async () => (await import("../queries/connection")).getDb();

export type Grant = StaffModule | "impersonate";

// Routers whose admin procedures all belong to one module.
const BY_ROUTER: Record<string, Grant> = {
  bulkOrder: "orders",
  nfc: "orders",
  coupon: "marketing",
  announcement: "marketing",
  domain: "domains",
  product: "catalog",
  package: "catalog",
  template: "catalog",
  referral: "referrals",
  reseller: "resellers",
  resellerLedger: "resellers",
  emailPreview: "system",
  settings: "settings",
  trial: "settings",
  currency: "settings",
};

// Routers that mix modules: listed procedure by procedure.
const BY_PROCEDURE: Record<string, Grant> = {
  "analytics.adminOverview": "overview",
  "analytics.adminStats": "overview",
  "analytics.funnel": "overview",
  "analytics.productFunnel": "overview",
  "user.overview": "overview",

  "user.list": "customers",
  "user.getById": "customers",
  "user.create": "customers",
  "user.update": "customers",
  "user.delete": "customers",
  "user.setPackage": "customers",
  "user.sendAccountDetails": "customers",
  "user.sendFeatureUpdate": "customers",
  "user.setPassword": "customers",
  "user.createCustomer": "customers",
  "user.extendValidity": "customers",
  "user.setCardLimit": "customers",
  "user.deactivateCustomer": "customers",
  "admin.appUsers": "customers",
  "admin.deleteAppUser": "customers",
  "admin.lookupAccount": "customers",
  "subscription.list": "customers",
  "card.listAll": "customers",

  "lead.listAll": "leads",

  "payment.adminOrders": "payments",
  "payment.adminStats": "payments",
  "payment.verifyOrder": "payments",
  "payment.rejectOrder": "payments",

  "subscription.getUpgradeOffer": "catalog",
  "subscription.setUpgradeOffer": "catalog",

  "ai.list": "marketing",

  "admin.slugConflicts": "system",
  "admin.reslugCard": "system",
  "admin.emailLogs": "system",
  "admin.pruneEmailLogs": "system",
  "admin.deletionRequests": "system",
  "admin.completeDeletion": "system",
  "admin.cancelDeletion": "system",

  "payment.getConfig": "settings",
  "payment.setConfig": "settings",
  "payment.getRazorpayConfig": "settings",
  "payment.setRazorpayConfig": "settings",

  "auth.impersonate": "impersonate",
};

/** The module an admin procedure belongs to; null = super admin only. */
export function grantForPath(path: string): Grant | null {
  return BY_PROCEDURE[path] ?? BY_ROUTER[path.split(".")[0]] ?? null;
}

/* ── A staff member's access, cached briefly so a page's burst of requests
      costs one query. Changes made on the Staff page clear the cache. ── */
type Access = { permissions: StaffPermissions; canImpersonate: boolean; jobTitle: string | null };
const CACHE_MS = 30_000;
const cache = new Map<number, { access: Access; at: number }>();

export function forgetStaffAccess(userId: number) {
  cache.delete(userId);
}

export async function staffAccessFor(userId: number): Promise<Access> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.access;
  const { staffAccess } = await import("@db/schema");
  const rows = await (await getDb()).select().from(staffAccess).where(eq(staffAccess.userId, userId)).limit(1);
  const r = rows[0];
  const access: Access = r
    ? { permissions: cleanPermissions(typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions), canImpersonate: !!r.canImpersonate, jobTitle: r.jobTitle }
    : { permissions: {}, canImpersonate: false, jobTitle: null };
  if (cache.size > 2000) cache.clear();
  cache.set(userId, { access, at: Date.now() });
  return access;
}

export function staffMayUse(access: Access, grant: Grant, level: "view" | "manage"): boolean {
  // Signing in as a customer is its own switch, and only makes sense for
  // someone who can already see customers.
  if (grant === "impersonate") return access.canImpersonate && hasAccess(access.permissions, "customers", "view");
  return hasAccess(access.permissions, grant, level);
}

/* ── Staff can't touch admin accounts ───────────────────────────────────────
   These actions take a user by id or email. A staff member with Customers →
   Edit may use them on customers and resellers, but never on the super admin
   or another staff account (e.g. setting the super admin's password), and
   never to give anyone a role. Returns the refusal message, or null if fine. */
const ACCOUNT_ACTIONS = new Set([
  "user.create", "user.update", "user.delete", "user.setPackage", "user.sendAccountDetails",
  "user.sendFeatureUpdate", "user.setPassword", "user.extendValidity", "user.setCardLimit",
  "user.deactivateCustomer", "admin.deleteAppUser",
]);

export async function staffAccountViolation(path: string, input: unknown): Promise<string | null> {
  if (!ACCOUNT_ACTIONS.has(path) || !input || typeof input !== "object") return null;
  const rec = input as Record<string, unknown>;
  if (typeof rec.role === "string" && rec.role !== "customer") return "Only the super admin can give an account a role.";
  const id = Number(rec.id ?? rec.userId);
  const email = typeof rec.email === "string" ? rec.email.toLowerCase().trim() : "";
  if (!id && !email) return null;
  const { users } = await import("@db/schema");
  const row = (await (await getDb()).select({ role: users.role }).from(users)
    .where(id ? eq(users.id, id) : eq(users.email, email)).limit(1))[0];
  if (row && (row.role === "super_admin" || row.role === "staff")) return "Staff can't change admin or staff accounts.";
  return null;
}

/* ── Activity log ───────────────────────────────────────────────────────── */

// Plain-language names for the actions people will look for most. Anything
// else is spelled out from the procedure name ("user.extendValidity" →
// "Extend validity").
const ACTION_LABELS: Record<string, string> = {
  "user.create": "Created a user",
  "user.update": "Edited a user",
  "user.delete": "Deleted a user",
  "user.setPackage": "Changed a customer's plan",
  "user.setPassword": "Set a customer's password",
  "user.createCustomer": "Created a customer",
  "user.extendValidity": "Extended plan validity",
  "user.setCardLimit": "Changed a card limit",
  "user.deactivateCustomer": "Deactivated a customer",
  "user.sendAccountDetails": "Emailed account details",
  "user.sendFeatureUpdate": "Emailed a feature update",
  "admin.deleteAppUser": "Removed an account",
  "admin.reslugCard": "Changed a card address",
  "admin.completeDeletion": "Erased a deleted account",
  "admin.cancelDeletion": "Restored an account from deletion",
  "admin.pruneEmailLogs": "Cleared old email log entries",
  "auth.impersonate": "Logged in as a customer",
  "payment.verifyOrder": "Verified a payment",
  "payment.rejectOrder": "Rejected a payment",
  "payment.setConfig": "Changed payment settings",
  "payment.setRazorpayConfig": "Changed Razorpay settings",
  "referral.creditReward": "Credited a referral reward",
  "referral.payWithdrawal": "Paid a withdrawal",
  "referral.rejectWithdrawal": "Rejected a withdrawal",
  "referral.setConfig": "Changed referral settings",
  "reseller.approve": "Approved a reseller application",
  "reseller.reject": "Rejected a reseller application",
  "reseller.grantLogin": "Gave a reseller a login",
  "settings.update": "Changed site settings",
  "settings.sendTestEmail": "Sent a test email",
  "settings.sendMarketingEmail": "Sent a marketing email",
  "nfc.update": "Updated an NFC order",
  "bulkOrder.setStatus": "Updated a bulk order",
  "domain.assign": "Assigned a custom domain",
  "domain.remove": "Removed a custom domain",
  "coupon.save": "Saved a coupon",
  "coupon.remove": "Deleted a coupon",
  "announcement.save": "Saved an offer popup",
  "announcement.remove": "Deleted an offer popup",
  "product.create": "Created a product",
  "product.update": "Edited a product",
  "package.update": "Edited a plan",
  "template.update": "Edited a template",
};

export function actionLabel(path: string): string {
  if (ACTION_LABELS[path]) return ACTION_LABELS[path];
  const name = path.split(".").pop() || path;
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SECRET_KEY = /pass|secret|token|otp|key|credential|signature|cvv|card_?number|account_?number|ifsc/i;

/** A short, redacted description of what was sent — never passwords, tokens or images. */
export function summarizeInput(input: unknown): { summary: string | null; target: string | null } {
  if (input == null || typeof input !== "object") return { summary: input == null ? null : String(input).slice(0, 120), target: null };
  const rec = input as Record<string, unknown>;
  const target = ["email", "slug", "domain", "code", "name", "userId", "id", "orderId"]
    .map((k) => rec[k])
    .find((v) => (typeof v === "string" && v.trim()) || typeof v === "number");
  const parts: string[] = [];
  for (const [k, v] of Object.entries(rec)) {
    if (parts.join(", ").length > 240) break;
    if (SECRET_KEY.test(k)) { parts.push(`${k}: [hidden]`); continue; }
    if (v == null || v === "") continue;
    if (typeof v === "string") parts.push(`${k}: ${/^data:/.test(v) ? "[image]" : v.length > 60 ? v.slice(0, 57) + "…" : v}`);
    else if (typeof v === "number" || typeof v === "boolean") parts.push(`${k}: ${v}`);
    else if (Array.isArray(v)) parts.push(`${k}: ${v.length} item${v.length === 1 ? "" : "s"}`);
    else parts.push(`${k}: {…}`);
  }
  return { summary: parts.join(", ").slice(0, 300) || null, target: target != null ? String(target).slice(0, 191) : null };
}

export type ActivityEntry = {
  actor: Pick<User, "id" | "fullName" | "email" | "role">;
  module: string | null;
  action: string;
  summary?: string | null;
  target?: string | null;
  status?: "ok" | "denied" | "error";
  error?: string | null;
  req?: Request;
};

/** Fire-and-forget: a logging problem must never fail the action itself. */
export function recordActivity(e: ActivityEntry): void {
  void (async () => {
    try {
      const { adminActivity } = await import("@db/schema");
      await (await getDb()).insert(adminActivity).values({
        actorId: e.actor.id,
        actorName: (e.actor.fullName || e.actor.email || "Unknown").slice(0, 255),
        actorRole: String(e.actor.role).slice(0, 20),
        module: e.module ? e.module.slice(0, 40) : null,
        action: e.action.slice(0, 80),
        summary: e.summary ? e.summary.slice(0, 300) : null,
        target: e.target ? e.target.slice(0, 191) : null,
        status: e.status ?? "ok",
        error: e.error ? e.error.slice(0, 300) : null,
        ip: e.req ? clientIp(e.req).slice(0, 64) : null,
        userAgent: e.req ? (e.req.headers.get("user-agent") || "").slice(0, 255) : null,
      });
    } catch (err) {
      console.error("[activity] not recorded:", (err as Error).message);
    }
  })();
}
