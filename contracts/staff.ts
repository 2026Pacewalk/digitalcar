/* Staff permissions — the admin portal split into modules the super admin can
 * grant to team members. Shared by the server (which enforces them on every
 * admin action) and the admin UI (which hides what a staff member can't open).
 *
 * "view" lets them open the pages and read; "manage" also lets them make
 * changes. Staff management, the activity log and anything not listed here
 * stay with the super admin. */

export type StaffLevel = "view" | "manage";

export const STAFF_MODULES = [
  { key: "overview", label: "Dashboard & analytics", hint: "Business totals, sign-ups, revenue and traffic", paths: ["/admin"] },
  { key: "customers", label: "Customers", hint: "Customer list, plans and validity, card limits, account details, migration", paths: ["/admin/customers", "/admin/migration"] },
  { key: "leads", label: "Leads & enquiries", hint: "Every enquiry sent from customer cards and the website", paths: ["/admin/leads"] },
  { key: "resellers", label: "Resellers", hint: "Resellers, applications and reseller accounts & ledger", paths: ["/admin/resellers", "/admin/reseller-applications", "/admin/reseller-accounts"] },
  { key: "orders", label: "Bulk & NFC orders", hint: "Bulk card requests and NFC card / standee orders", paths: ["/admin/bulk-orders", "/admin/nfc-orders"] },
  { key: "payments", label: "Payment orders", hint: "Plan payments: verify or reject manual payments", paths: ["/admin/payment-orders"] },
  { key: "referrals", label: "Referrals & payouts", hint: "Referral rewards and withdrawal requests", paths: ["/admin/referrals"] },
  { key: "catalog", label: "Products, packages & templates", hint: "Card designs, plans and template presets", paths: ["/admin/products", "/admin/packages", "/admin/templates"] },
  { key: "marketing", label: "Coupons, offer popups & AI", hint: "Discount codes, announcement popups, AI generator history", paths: ["/admin/coupons", "/admin/announcements", "/admin/ai-generator"] },
  { key: "domains", label: "Custom domains", hint: "Customer domains and their verification", paths: ["/admin/domains"] },
  { key: "system", label: "URL conflicts, emails & deletions", hint: "Card address conflicts, email log and previews, account deletion requests", paths: ["/admin/url-conflicts", "/admin/email-log", "/admin/email-previews", "/admin/deletion-requests"] },
  { key: "settings", label: "Site settings", hint: "Payment gateway, email (SMTP), trial rules, currency and site configuration", paths: ["/admin/settings"] },
] as const;

export type StaffModule = (typeof STAFF_MODULES)[number]["key"];
export type StaffPermissions = Partial<Record<StaffModule, StaffLevel>>;

export const STAFF_MODULE_KEYS = STAFF_MODULES.map((m) => m.key) as StaffModule[];

export function moduleLabel(key: string | null | undefined): string {
  return STAFF_MODULES.find((m) => m.key === key)?.label ?? (key === "staff" ? "Staff & activity" : key === "impersonate" ? "Log in as customer" : key ?? "");
}

/** The module an admin page belongs to, or null for super-admin-only pages. */
export function moduleForAdminPath(pathname: string): StaffModule | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  for (const m of STAFF_MODULES) if ((m.paths as readonly string[]).includes(clean)) return m.key;
  return null;
}

/** "manage" includes "view". */
export function hasAccess(perms: StaffPermissions | null | undefined, module: StaffModule, level: StaffLevel = "view"): boolean {
  const have = perms?.[module];
  if (!have) return false;
  return level === "view" ? true : have === "manage";
}

/** Keep only known modules and levels — whatever a client sends. */
export function cleanPermissions(input: unknown): StaffPermissions {
  const out: StaffPermissions = {};
  if (!input || typeof input !== "object") return out;
  for (const key of STAFF_MODULE_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    if (v === "view" || v === "manage") out[key] = v;
  }
  return out;
}

/** Where a staff member lands after signing in: the first page they may open. */
export function firstAllowedPath(perms: StaffPermissions | null | undefined): string {
  for (const m of STAFF_MODULES) if (perms?.[m.key]) return m.paths[0];
  return "/admin/profile";
}
