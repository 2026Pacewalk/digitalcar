import { describe, it, expect } from "vitest";
import {
  USER_TYPES, USER_PREFIXES, USER_CATEGORIES, TEAM_TYPES, TEAM_CATEGORIES,
  userCategory, userCategoryMatcher, userDef, teamDef, teamCanSee, teamModulesFor, teamCategoriesFor,
  dayGroup, timeAgo, clip, type UserCategory,
} from "@contracts/notifications";

/* The registry decides which chip a notification sits under, and the server
   filters with the same registry — so the two must agree for every type. */

// What the daily jobs and older code actually write, including the keyed ones.
const WRITTEN = [
  ...Object.keys(USER_TYPES),
  "ls_fu_20260928", "ls_renew7_12_20260928", "ls_renew1_12_20260929", "ls_subexp_12_20261001",
  "ls_d1", "ls_d7", "ls_d15", "ls_d21", "ls_d25", "something_new",
];

/** The SQL filter, evaluated in JS: does `type` match the category's matcher? */
function matches(type: string, category: UserCategory, audience: "customer" | "reseller"): boolean {
  const m = userCategoryMatcher(category, audience);
  const hit = m.exact.includes(type) || m.prefixes.some((p) => type.startsWith(p));
  return m.mode === "in" ? hit : !hit;
}

describe("user feed categories", () => {
  it("files every known type where people look for it", () => {
    const cases: [string, UserCategory][] = [
      ["enquiry_new", "leads"], ["ls_fu_20260928", "leads"],
      ["payment_pending", "billing"], ["payment_verified", "billing"], ["payment_rejected", "billing"],
      ["ls_renew7_12_20260928", "billing"], ["ls_subexp_12_20261001", "billing"], ["ls_ending", "billing"],
      ["ls_ended", "billing"], ["trial_email_ending", "billing"], ["ls_offer", "billing"], ["plan_upgraded", "billing"],
      ["nfc_shipped", "orders"], ["nfc_tracking", "orders"], ["nfc_cancelled", "orders"],
      ["referral_joined", "rewards"], ["referral_reward", "rewards"], ["payout_paid", "rewards"], ["payout_requested", "rewards"],
      ["welcome", "updates"], ["ls_abandoned", "updates"], ["ls_d7", "updates"], ["security_password", "updates"],
      ["card_published", "updates"], ["something_new", "updates"],
    ];
    for (const [type, cat] of cases) expect([type, userCategory(type, "customer")]).toEqual([type, cat]);
  });

  it("gives resellers their own chips, and everything else is an update", () => {
    expect(userCategory("reseller_commission", "reseller")).toBe("rewards");
    expect(userCategory("payout_paid", "reseller")).toBe("rewards");
    expect(userCategory("reseller_customer_linked", "reseller")).toBe("customers");
    expect(userCategory("reseller_customer_removed", "reseller")).toBe("customers");
    expect(userCategory("payment_verified", "reseller")).toBe("updates");
    expect(userCategory("reseller_welcome", "reseller")).toBe("updates");
  });

  it("the server's filter for each chip matches exactly the types shown under it", () => {
    for (const audience of ["customer", "reseller"] as const) {
      for (const { key } of USER_CATEGORIES[audience]) {
        for (const type of WRITTEN) {
          expect([audience, key, type, matches(type, key, audience)]).toEqual([audience, key, type, userCategory(type, audience) === key]);
        }
      }
    }
  });

  it("every type falls under exactly one chip", () => {
    for (const audience of ["customer", "reseller"] as const) {
      for (const type of WRITTEN) {
        const hits = USER_CATEGORIES[audience].filter(({ key }) => matches(type, key, audience));
        expect([type, hits.length]).toEqual([type, 1]);
      }
    }
  });

  it("prefix rules don't swallow exact types", () => {
    for (const [type, def] of Object.entries(USER_TYPES)) expect(userDef(type)).toBe(def);
    for (const [prefix] of USER_PREFIXES) expect(prefix.endsWith("_") || /^ls_(renew|d)$/.test(prefix)).toBe(true);
  });
});

describe("team feed", () => {
  it("every event has a category the chips know", () => {
    const keys = TEAM_CATEGORIES.map((c) => c.key);
    for (const [type, def] of Object.entries(TEAM_TYPES)) expect([type, keys.includes(def.category)]).toEqual([type, true]);
    expect(teamDef("unknown_event").module).toBeNull(); // unknown = super admin only
  });

  it("the super admin sees everything; staff see their modules; others see nothing", () => {
    expect(teamCanSee("super_admin", null, null)).toBe(true);
    expect(teamCanSee("super_admin", null, "payments")).toBe(true);
    expect(teamCanSee("staff", { payments: "view" }, "payments")).toBe(true);
    expect(teamCanSee("staff", { payments: "manage" }, "payments")).toBe(true);
    expect(teamCanSee("staff", { payments: "view" }, "orders")).toBe(false);
    expect(teamCanSee("staff", { payments: "view" }, null)).toBe(false); // security events
    expect(teamCanSee("staff", {}, "customers")).toBe(false);
    expect(teamCanSee("customer", null, "customers")).toBe(false);
    expect(teamCanSee("reseller", null, "resellers")).toBe(false);
  });

  it("module lists and chips follow the grants", () => {
    expect(teamModulesFor("super_admin", null)).toBeNull();
    expect(teamModulesFor("customer", null)).toEqual([]);
    expect(new Set(teamModulesFor("staff", { orders: "view", leads: "manage" }))).toEqual(new Set(["orders", "leads"]));
    expect(teamCategoriesFor("staff", { orders: "view" })).toEqual(["orders"]);
    expect(teamCategoriesFor("staff", { payments: "view" })).toEqual(["payments"]);
    expect(teamCategoriesFor("super_admin", null)).toContain("security");
    expect(teamCategoriesFor("staff", { settings: "manage" })).not.toContain("security");
  });

  it("the money and security events need someone", () => {
    for (const t of ["payment_to_verify", "payout_request", "reseller_application", "nfc_order_paid", "bulk_order", "deletion_requested"]) {
      expect([t, teamDef(t).severity]).toEqual([t, "action"]);
    }
    expect(teamDef("payment_settings_changed").severity).toBe("critical");
  });
});

describe("dates and text", () => {
  // 28 Sep 2026, 10:00 IST = 04:30 UTC.
  const now = new Date("2026-09-28T04:30:00Z");
  it("groups by the India calendar, not UTC", () => {
    expect(dayGroup("2026-09-27T19:00:00Z", now)).toBe("today");      // 28 Sep 00:30 IST
    expect(dayGroup("2026-09-27T18:00:00Z", now)).toBe("yesterday");  // 27 Sep 23:30 IST
    expect(dayGroup("2026-09-24T10:00:00Z", now)).toBe("week");
    expect(dayGroup("2026-09-01T10:00:00Z", now)).toBe("older");
  });
  it("says how long ago, then the date", () => {
    expect(timeAgo(new Date(now.getTime() - 20_000), now)).toBe("just now");
    expect(timeAgo(new Date(now.getTime() - 5 * 60_000), now)).toBe("5m ago");
    expect(timeAgo(new Date(now.getTime() - 3 * 3_600_000), now)).toBe("3h ago");
    expect(timeAgo(new Date(now.getTime() - 2 * 86_400_000), now)).toBe("2d ago");
    expect(timeAgo("2026-08-01T10:00:00Z", now)).toMatch(/1 Aug/);
    expect(timeAgo("not a date", now)).toBe("");
  });
  it("keeps other people's text to one short line", () => {
    expect(clip("Aarav\nMehta\t  Sons")).toBe("Aarav Mehta Sons");
    expect(clip("x".repeat(100), 10)).toHaveLength(10);
    expect(clip(null)).toBe("");
  });
});
