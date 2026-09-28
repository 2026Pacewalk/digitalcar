import { describe, expect, it } from "vitest";
import { MANUAL_EMAIL_LIMITS, MANUAL_TEMPLATES, type ManualTemplateKey } from "@contracts/customer-email";
import {
  addressProblem, blockReason, buildEmail, cleanCustom, emailHash, legacyRecord, loggedKind, manualKinds, oldSitePlan,
  optedOut, planLabel, preheaderOf, previewWarnings, templateAvailability, templateCategory, templateKind, EmailBuildError, TIPS_KINDS,
  OWNER_ALERT_KINDS, type PlanInfo, type Recipient, type TrialInfo,
} from "./customer-email";
import { linkPieces, normalizeMessage, oneLine, teamMessageEmail } from "./email/manual";
import { summarizeInput } from "./staff-access";

/* The pure half of Admin → Customers → Send email: cleaning what the admin
   typed, turning links into links, which templates fit which customer, and the
   hash that ties a send to its preview. The database half (who the customer
   is, the limits) is exercised end to end against the dev server. */

const NOW = Date.parse("2026-09-28T06:30:00Z"); // noon in India
const DAY = 86_400_000;
const BROKEN = ["undefined", "NaN", "[object Object]", "Invalid Date"];

function person(o: Partial<Recipient> = {}): Recipient {
  return {
    source: "platform", userId: 41, legacyId: null, name: "Aarav Mehta", email: "aarav@example.com",
    emailVerified: true, blocked: null, card: null, plans: { platform: null, oldSite: null },
    trial: null, trialDays: 30, prefs: { plan: true, tips: true }, ...o,
  };
}
const paid = (endsInDays: number, o: Partial<PlanInfo> = {}): PlanInfo => {
  const end = new Date(NOW + endsInDays * DAY);
  return {
    source: "platform", packageId: 5, name: "Gold", paid: true, active: endsInDays > 0, endsAt: end, lastDay: end,
    billingCycle: "yearly", upgradeCredit: null, nextPlanName: null, ...o,
  };
};
const trial = (status: string, daysLeft: number): TrialInfo =>
  ({ status, daysLeft, totalDays: 30, endsAt: new Date(NOW + daysLeft * DAY), graceDays: 0, voucher: null });
const CARD = { slug: "pacewalk", publicId: "abc123", company: "Mehta Interiors", published: true };
const fits = (r: Recipient, key: ManualTemplateKey) => templateAvailability(r, key, NOW);

describe("custom message: cleaning", () => {
  it("makes the subject one clean line", () => {
    const c = cleanCustom({ subject: "  Hello\r\nBcc: x@example.com\t\u0000there  ", message: "Hi", promotional: false });
    expect(c.ok && c.value.subject).toBe("Hello Bcc: x@example.com there");
    expect(oneLine("a\u{2028}b\u{200B}c")).toBe("a bc");
  });

  it("keeps subjects between 3 and 150 characters", () => {
    expect(cleanCustom({ subject: "Hi", message: "x", promotional: false }).ok).toBe(false);
    expect(cleanCustom({ subject: "   \n\t ", message: "x", promotional: false }).ok).toBe(false);
    expect(cleanCustom({ subject: "a".repeat(150), message: "x", promotional: false }).ok).toBe(true);
    expect(cleanCustom({ subject: "a".repeat(151), message: "x", promotional: false }).ok).toBe(false);
  });

  it("normalises line breaks and keeps messages between 1 and 5,000 characters", () => {
    const c = cleanCustom({ subject: "Hello", message: "one\r\ntwo\rthree\n\n\n\nfour  \n", promotional: true });
    expect(c.ok && c.value).toEqual({ subject: "Hello", message: "one\ntwo\nthree\n\nfour", promotional: true });
    expect(cleanCustom({ subject: "Hello", message: " \n \n", promotional: false }).ok).toBe(false);
    expect(cleanCustom({ subject: "Hello", message: "x".repeat(MANUAL_EMAIL_LIMITS.messageMax), promotional: false }).ok).toBe(true);
    expect(cleanCustom({ subject: "Hello", message: "x".repeat(MANUAL_EMAIL_LIMITS.messageMax + 1), promotional: false }).ok).toBe(false);
    // CRLF counts once, so a pasted message isn't refused for its line endings.
    expect(cleanCustom({ subject: "Hello", message: "x\r\n".repeat(2400), promotional: false }).ok).toBe(true);
  });

  it("drops invisible characters that could disguise text", () => {
    expect(normalizeMessage("pay\u{202E}moc.evil\u{202C} now\u{FEFF}")).toBe("paymoc.evil now");
  });
});

describe("custom message: links", () => {
  it("links bare http(s) addresses, without trailing punctuation", () => {
    const { links } = linkPieces("See https://digitalcarda.in/pricing. Or (https://wa.me/919517722444), http://example.com/a_(b)!");
    expect(links).toEqual(["https://digitalcarda.in/pricing", "https://wa.me/919517722444", "http://example.com/a_(b)"]);
  });

  it("never links anything but a plain http(s) address", () => {
    const { links } = linkPieces("javascript:alert(1) data:text/html,x ftp://example.com https://digitalcarda.in@example.com/login https://localhost/x www.example.com");
    expect(links).toEqual([]);
  });

  it("links at most 10 addresses; the rest stay as text", () => {
    const msg = Array.from({ length: 12 }, (_, i) => `https://digitalcarda.in/p/${i}`).join("\n");
    const { links, extra } = linkPieces(msg);
    expect(links.length).toBe(MANUAL_EMAIL_LIMITS.linksMax);
    expect(extra).toBe(2);
    const e = teamMessageEmail({ name: "A", subject: "Links", message: msg });
    expect((e.html.match(/<a href="https:\/\/digitalcarda\.in\/p\//g) || []).length).toBe(10);
    expect(e.html).toContain("https://digitalcarda.in/p/11");
  });

  it("stops an address at curly quotes and at sentence punctuation in any script", () => {
    const { links } = linkPieces([
      "Plans: “https://digitalcarda.in/pricing” or ‘https://wa.me/1’.",
      "देखें https://digitalcarda.in/pricing। और https://digitalcarda.in/a॥",
      "See https://digitalcarda.in/b… 見て https://digitalcarda.in/c。 https://digitalcarda.in/d，",
      "«https://digitalcarda.in/e» https://digitalcarda.in/f/ https://example.com/a_(b)",
    ].join("\n"));
    expect(links).toEqual([
      "https://digitalcarda.in/pricing", "https://wa.me/1", "https://digitalcarda.in/pricing", "https://digitalcarda.in/a",
      "https://digitalcarda.in/b", "https://digitalcarda.in/c", "https://digitalcarda.in/d", "https://digitalcarda.in/e",
      "https://digitalcarda.in/f/", "https://example.com/a_(b)",
    ]);
    const e = teamMessageEmail({ name: "A", subject: "Plans", message: "See https://digitalcarda.in/pricing। Or “https://digitalcarda.in/dashboard/subscription”…" });
    expect(e.html).toContain('href="https://digitalcarda.in/pricing"');
    expect(e.html).toContain('href="https://digitalcarda.in/dashboard/subscription"');
    expect(e.html).toContain("</a>।");
    expect(e.html).toContain("</a>”…");
  });

  it("shows every link in full and escapes it", () => {
    const e = teamMessageEmail({ name: "A", subject: "Link", message: "Go: https://digitalcarda.in/x?a=1&b=2" });
    expect(e.html).toContain('<a href="https://digitalcarda.in/x?a=1&amp;b=2"');
    expect(e.html).toContain(">https://digitalcarda.in/x?a=1&amp;b=2</a>");
  });
});

describe("teamMessageEmail", () => {
  it("turns blank lines into paragraphs and single breaks into <br>", () => {
    const e = teamMessageEmail({ name: "Aarav Mehta", subject: "Your QR standee", message: "First line\nsecond line\n\nNew paragraph" });
    expect(e.kind).toBe("teamMessageEmail");
    expect(e.html).toContain("First line<br>second line</p>");
    expect(e.html).toContain(">New paragraph</p>");
    expect(e.text).toContain("Hi Aarav,\n\nFirst line\nsecond line\n\nNew paragraph");
    expect(preheaderOf(e.html)).toBe("First line");
  });

  it("lets no markup or script through, and keeps the subject one line", () => {
    const X = `"><img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">x</a>`;
    const e = teamMessageEmail({ name: X, subject: `${X}\r\nBcc: someone@example.com`, message: `${X}\n\n${X} https://example.com/${X}` });
    expect(e.html).not.toMatch(/<script/i);
    expect(e.html).not.toMatch(/<[^>]+\bonerror\s*=/i);
    expect(e.html).not.toMatch(/href="javascript:/i);
    expect(e.subject).not.toMatch(/[\r\n]/);
    for (const part of [e.subject, e.html, e.text]) for (const bad of BROKEN) expect(part.includes(bad)).toBe(false);
  });

  it("doesn't greet twice when the message opens with its own greeting", () => {
    const e = teamMessageEmail({ name: "Priya Sharma", subject: "Diwali", message: "Hi Priya,\n\nFestive designs are here." });
    expect(e.html.match(/Hi Priya,/g)?.length).toBe(1);
    expect(e.text.startsWith("Hi Priya,\n\nFestive designs")).toBe(true);
    expect(preheaderOf(e.html)).toBe("Festive designs are here.");
    // A message that doesn't greet still gets one.
    const plain = teamMessageEmail({ name: "Priya Sharma", subject: "Note", message: "Your standee shipped." });
    expect(plain.text.startsWith("Hi Priya,\n\nYour standee shipped.")).toBe(true);
  });

  it("says where to switch promotions off, and only on promotions", () => {
    expect(teamMessageEmail({ name: "A", subject: "News", message: "x", promotional: true }).html).toContain("Switch them off");
    expect(teamMessageEmail({ name: "A", subject: "Note", message: "x", promotional: false }).html).not.toContain("Switch them off");
  });
});

describe("who can be emailed", () => {
  it("refuses erased, hidden, leaving, suspended and non-customer accounts, and bad addresses", () => {
    const ok = { email: "a@example.com", hidden: false, pendingDeletion: false, status: "active", role: "customer" };
    expect(blockReason(ok)).toBeNull();
    expect(blockReason({ ...ok, email: "deleted-user-9@deleted.digitalcarda.in" })).toMatch(/erased/);
    expect(blockReason({ ...ok, hidden: true })).toMatch(/deleted from the Customers list/);
    expect(blockReason({ ...ok, pendingDeletion: true })).toMatch(/asked for their account to be deleted/);
    expect(blockReason({ ...ok, status: "suspended" })).toMatch(/suspended/);
    expect(blockReason({ ...ok, status: "inactive" })).toMatch(/closed/);
    for (const role of ["super_admin", "staff", "reseller"]) expect(blockReason({ ...ok, role })).toMatch(/isn't a customer account/);
    expect(blockReason({ ...ok, status: null, role: null })).toBeNull(); // old-site customer, no account here
    expect(addressProblem("")).toMatch(/no email address/);
    expect(addressProblem("client-12@clients.digitalcarda.in")).toMatch(/stand-in/);
    expect(addressProblem("not-an-email")).toMatch(/doesn't look valid/);
    expect(addressProblem("a@b")).toMatch(/doesn't look valid/);
    // Address syntax the mailer would read as a group or comment — it could
    // deliver somewhere other than the address shown to the admin.
    for (const bad of ["victim.com:attacker@evil.com", "good(bad@evil.com)x@good.com", "a[b]@x.com", "a\\b@x.com"]) {
      expect(addressProblem(bad)).toMatch(/doesn't look valid/);
    }
    for (const good of ["priya@example.com", "first.last+tag@gmail.com", "x@y.co.in"]) expect(addressProblem(good)).toBeNull();
  });

  it("a blocked customer gets nothing, with the reason on every template", () => {
    const r = person({ blocked: "Their account is suspended." });
    for (const t of MANUAL_TEMPLATES) expect(fits(r, t.key)).toEqual({ available: false, reason: "Their account is suspended." });
    expect(() => buildEmail(r, "feature_update", null, NOW)).toThrow(EmailBuildError);
  });
});

describe("old-site customers (customers.json)", () => {
  // A stand-in for the gitignored file: real rows also carry a password and bank fields.
  const rows = [
    { id: 7, name: "Priya Nair", email: " Priya@Example.com ", slug: "priya-nair", company_name: "Nair Dental", package_id: "6", expired_on: "2026-10-08", password: "plain-text", bank_account: "000111", upi_id: "x@upi" },
    { id: "8", name: "No Slug", email: "noslug@example.com", slug: "", package_id: 7, expired_on: "" },
    { id: 0, email: "bad@example.com" },
  ];

  it("copies only the fields the feature needs", () => {
    const l = rows.map(legacyRecord);
    expect(l[0]).toEqual({ id: 7, name: "Priya Nair", email: "priya@example.com", slug: "priya-nair", company: "Nair Dental", packageId: 6, expiredOn: "2026-10-08" });
    expect(JSON.stringify(l)).not.toMatch(/plain-text|000111|x@upi/);
    expect(l[1]?.slug).toBeNull();
    expect(l[2]).toBeNull();
  });

  it("reads the old-site plan the way the entitlement check does", () => {
    const soon = oldSitePlan({ packageId: 6, expiredOn: "2026-10-08" }, "Platinum", NOW)!;
    expect(soon).toMatchObject({ source: "old_site", paid: true, active: true, name: "Platinum" });
    expect(soon.lastDay?.toISOString().slice(0, 10)).toBe("2026-10-08");
    expect(oldSitePlan({ packageId: 5, expiredOn: "2024-01-03" }, "Gold", NOW)).toMatchObject({ paid: true, active: false });
    expect(oldSitePlan({ packageId: 5, expiredOn: "" }, "Gold", NOW)).toMatchObject({ active: true, endsAt: null });
    expect(oldSitePlan({ packageId: 7, expiredOn: "2027-01-01" }, "Trial", NOW)).toMatchObject({ paid: false });
  });

  it("offers what fits someone with no account here", () => {
    const r = person({
      source: "old_site", userId: null, legacyId: 7, emailVerified: null,
      card: { slug: "priya-nair", publicId: null, company: "Nair Dental", published: false },
      plans: { platform: null, oldSite: oldSitePlan({ packageId: 6, expiredOn: "2026-10-08" }, "Platinum", NOW) },
    });
    for (const key of ["welcome", "account_details", "finish_card"] as const) expect(fits(r, key).reason).toBe("No account on the new site yet");
    for (const key of ["custom", "card_live", "renewal_reminder", "feature_update", "review_request"] as const) expect(fits(r, key).available).toBe(true);
    expect(fits(r, "plan_expired").available).toBe(false);
    const e = buildEmail(r, "renewal_reminder", null, NOW).email;
    expect(e.subject).toBe("Your Platinum plan ends in 10 days");
    expect(e.userId).toBeUndefined();
    expect(previewWarnings(r, "custom", null, null).join(" ")).toMatch(/Old-site customer/);
  });
});

describe("which templates fit", () => {
  it("plan reminders follow the paid plan", () => {
    const soon = person({ card: CARD, plans: { platform: paid(10), oldSite: null } });
    expect(fits(soon, "renewal_reminder").available).toBe(true);
    expect(fits(soon, "plan_expired").reason).toBe("Their paid plan is still active");
    expect(fits(person({ plans: { platform: paid(40), oldSite: null } }), "renewal_reminder").reason).toMatch(/more than 30 days away/);
    const ended = person({ card: CARD, plans: { platform: paid(-3), oldSite: null } });
    expect(fits(ended, "renewal_reminder").reason).toBe("Their paid plan has already ended");
    expect(fits(ended, "plan_expired").available).toBe(true);
    expect(fits(person(), "renewal_reminder").reason).toBe("No active paid plan");
    expect(fits(person(), "plan_expired").reason).toBe("No paid plan has ended");
    // A trial package is not a paid plan.
    expect(fits(person({ plans: { platform: paid(10, { packageId: 7, paid: false, name: "Trial" }), oldSite: null } }), "renewal_reminder").available).toBe(false);
  });

  it("trial emails follow the trial", () => {
    expect(fits(person({ trial: trial("expiring_soon", 2) }), "trial_ending").available).toBe(true);
    expect(fits(person({ trial: trial("active", 20) }), "trial_ending").reason).toMatch(/20 days left/);
    expect(fits(person({ trial: trial("expiring_soon", 2), plans: { platform: paid(100), oldSite: null } }), "trial_ending").reason).toBe("They're on a paid plan");
    expect(fits(person({ trial: trial("expired", 0) }), "trial_ending").reason).toBe("Their trial has already ended");
    expect(fits(person({ trial: trial("expired", 0) }), "trial_ended").available).toBe(true);
    expect(fits(person({ trial: trial("grace", 0) }), "trial_ended").reason).toMatch(/grace period/);
    expect(fits(person({ trial: trial("converted", 0) }), "trial_ended").reason).toBe("Their trial became a paid plan");
    expect(fits(person(), "trial_ending").reason).toBe("No free trial");
  });

  it("card emails follow the card", () => {
    expect(fits(person(), "card_live").reason).toBe("No published card yet");
    expect(fits(person(), "finish_card").available).toBe(true);
    expect(fits(person({ card: CARD }), "finish_card").reason).toBe("Their card is already published");
    expect(fits(person({ trial: trial("active", 20) }), "finish_card").reason).toBe("Their trial has already started");
    // A paused card is not "live", and not "still online".
    const paused = person({ card: CARD, trial: trial("expired", 0), plans: { platform: paid(-3), oldSite: null } });
    expect(fits(paused, "card_live").available).toBe(false);
    expect(fits(paused, "plan_expired").available).toBe(false);
  });

  it("any active plan row keeps the card up, a Trial one included (publicState)", () => {
    // Extend Validity on a trial customer adds an active package-7 row.
    const trialRow = paid(20, { packageId: 7, paid: false, name: "Trial" });
    const kept = person({ card: CARD, trial: trial("expired", 0), plans: { platform: trialRow, oldSite: null } });
    expect(fits(kept, "card_live").available).toBe(true);
    expect(fits(kept, "trial_ended").reason).toBe("An active plan keeps their card live");
    expect(buildEmail(kept, "welcome", null, NOW).email.html).toContain("Mehta Interiors is live");
    expect(buildEmail(kept, "account_details", null, NOW).email.subject).toBe("Mehta Interiors — your digital card is live");
    expect(planLabel(kept, NOW)).toMatch(/^Trial · till /);
    // An ended paid plan with the card still up: the expiry email fits.
    const lapsed = person({ ...kept, plans: { platform: trialRow, oldSite: oldSitePlan({ packageId: 5, expiredOn: "2026-09-01" }, "Gold", NOW) } });
    expect(fits(lapsed, "plan_expired").available).toBe(true);
    // Trial ending: only when the row runs out before the trial (and grace) does.
    const ending = person({ card: CARD, trial: trial("expiring_soon", 2), plans: { platform: trialRow, oldSite: null } });
    expect(fits(ending, "trial_ending").reason).toBe("An active plan keeps their card live after the trial");
    expect(fits(person({ ...ending, plans: { platform: paid(1, { packageId: 7, paid: false, name: "Trial" }), oldSite: null } }), "trial_ending").available).toBe(true);
  });

  it("account details never call a paused card live", () => {
    const paused = person({ card: CARD, trial: trial("expired", 0) });
    expect(fits(paused, "card_live").available).toBe(false);
    const e = buildEmail(paused, "account_details", null, NOW).email;
    expect(e.subject).toBe("Mehta Interiors — your DigitalCarda login");
    expect(`${e.html} ${e.text}`).not.toMatch(/is live|pacewalk/);
  });

  it("counts trial days by India's calendar", () => {
    // Ends at 21:00 IST today; it's noon: "today", not "in 1 day".
    const lastDay = person({ card: CARD, trial: { ...trial("expiring_soon", 1), endsAt: new Date(NOW + 9 * 3_600_000) } });
    expect(buildEmail(lastDay, "trial_ending", null, NOW).email.subject).toBe("⏳ Your free trial ends today");
    expect(planLabel(lastDay, NOW)).toBe("Free trial · ends today");
    expect(buildEmail(lastDay, "trial_ending", null, NOW - 2 * DAY).email.subject).toBe("⏳ Your free trial ends in 2 days");
    // 23:00 IST seven days on is 7 India days away (the hours round up to 8).
    const week = person({ trial: { ...trial("active", 8), endsAt: new Date(NOW + 7 * DAY + 11 * 3_600_000) } });
    expect(fits(week, "trial_ending").available).toBe(true);
    expect(fits(person({ trial: { ...trial("active", 8), endsAt: new Date(NOW + 8 * DAY) } }), "trial_ending").reason).toMatch(/8 days left/);
  });

  it("an old-site plan has ended for the plan emails once its last day is over in India", () => {
    const plan = (at: number) => person({ card: CARD, plans: { platform: null, oldSite: oldSitePlan({ packageId: 5, expiredOn: "2026-09-27" }, "Gold", at) } });
    const evening = Date.parse("2026-09-27T15:30:00Z"); // 21:00 IST on its last day
    expect(templateAvailability(plan(evening), "renewal_reminder", evening).available).toBe(true);
    expect(buildEmail(plan(evening), "renewal_reminder", null, evening).email.subject).toMatch(/today/);
    expect(templateAvailability(plan(evening), "plan_expired", evening).reason).toBe("Their paid plan is still active");
    const night = Date.parse("2026-09-27T19:30:00Z"); // 01:00 IST the next day
    expect(plan(night).plans.oldSite?.active).toBe(true); // the entitlement check keeps it (and the card) till 05:30
    expect(templateAvailability(plan(night), "renewal_reminder", night).reason).toBe("Their paid plan has already ended");
    expect(templateAvailability(plan(night), "plan_expired", night).available).toBe(true);
    expect(planLabel(plan(night), night)).toMatch(/^Gold · ended 27 Sept/);
  });

  it("builds every template that fits without a broken value", () => {
    const rich = person({
      card: CARD, trial: trial("expiring_soon", 2),
      plans: { platform: null, oldSite: oldSitePlan({ packageId: 5, expiredOn: "2026-09-01" }, "Gold", NOW) },
    });
    const built: string[] = [];
    for (const t of MANUAL_TEMPLATES) {
      if (!fits(rich, t.key).available) continue;
      const { email } = buildEmail(rich, t.key, { subject: "Hello there", message: "A note.", promotional: false }, NOW);
      expect(email.html).toMatch(/^<!doctype html>/i);
      expect(email.userId).toBe(41);
      for (const part of [email.subject, email.html, email.text]) for (const bad of BROKEN) expect([t.key, part.includes(bad)]).toEqual([t.key, false]);
      built.push(t.key);
    }
    expect(built).toEqual(expect.arrayContaining(["custom", "welcome", "account_details", "card_live", "plan_expired", "trial_ending", "feature_update", "review_request"]));
    // The welcome carries the running trial, and no voucher that wasn't really used.
    const welcome = buildEmail(rich, "welcome", null, NOW).email;
    expect(welcome.html).toContain("free trial");
    expect(welcome.html).not.toContain("Trial code");
    // Account details never carry a password.
    expect(buildEmail(rich, "account_details", null, NOW).email.html).not.toMatch(/Password/);
  });
});

describe("switches and categories", () => {
  it("a promotion counts as tips & news; any other custom message is service mail", () => {
    expect(templateCategory("custom", { promotional: true })).toBe("tips");
    expect(templateCategory("custom", { promotional: false })).toBe("service");
    expect(templateCategory("trial_ending")).toBe("plan");
    expect(templateCategory("feature_update")).toBe("tips");
    const off = person({ prefs: { plan: false, tips: false } });
    expect(optedOut(off, "tips")).toBe(true);
    expect(optedOut(off, "plan")).toBe(true);
    expect(optedOut(off, "service")).toBe(false);
    expect(previewWarnings(off, "custom", { subject: "Hi there", message: "x", promotional: true }, null)[0]).toMatch(/switched off tips and news/);
    expect(previewWarnings(off, "custom", { subject: "Hi there", message: "x", promotional: false }, null).join(" ")).not.toMatch(/switched off/);
  });

  it("logs sends by hand under manual:<template>, promotions marked", () => {
    expect(loggedKind("welcome")).toBe("manual:welcomeEmail");
    expect(loggedKind("custom")).toBe("manual:teamMessageEmail");
    expect(loggedKind("custom", true)).toBe("manual:promo:teamMessageEmail");
    expect(manualKinds("custom")).toEqual(["manual:teamMessageEmail", "manual:promo:teamMessageEmail"]);
    expect(TIPS_KINDS).toEqual(expect.arrayContaining(["featureUpdateEmail", "manual:featureUpdateEmail", "manual:reviewRequestEmail", "manual:abandonedPublishEmail", "manual:promo:teamMessageEmail"]));
    expect(TIPS_KINDS).not.toContain("manual:teamMessageEmail");
    for (const k of TIPS_KINDS) expect(k.length).toBeLessThanOrEqual(64); // email_logs.kind
  });

  it("knows which logged kinds are the team's own alerts", () => {
    expect(OWNER_ALERT_KINDS).toEqual(expect.arrayContaining(["newSignupAdminEmail", "leadNotificationEmail", "contactEnquiryAdmin", "ownerDailyDigestEmail", "smtpTestEmail"]));
    for (const t of MANUAL_TEMPLATES) expect(OWNER_ALERT_KINDS).not.toContain(templateKind(t.key));
  });
});

describe("preview and send agree", () => {
  const r = person({ card: CARD, plans: { platform: paid(10), oldSite: null } });
  const msg = { subject: "Your QR standee", message: "It ships tomorrow.", promotional: false };

  it("the same inputs always give the same hash", () => {
    const a = buildEmail(r, "custom", msg, NOW);
    const b = buildEmail(structuredClone(r), "custom", { ...msg }, NOW);
    expect(a.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(b.hash).toBe(a.hash);
    expect(emailHash(a.email)).toBe(a.hash);
    expect(buildEmail(r, "renewal_reminder", null, NOW).hash).toBe(buildEmail(r, "renewal_reminder", null, NOW).hash);
  });

  it("any change to what goes out changes the hash", () => {
    const a = buildEmail(r, "custom", msg, NOW).hash;
    expect(buildEmail(r, "custom", { ...msg, message: "It ships today." }, NOW).hash).not.toBe(a);
    expect(buildEmail(r, "custom", { ...msg, promotional: true }, NOW).hash).not.toBe(a);
    expect(buildEmail(person({ ...r, name: "Priya Nair" }), "custom", msg, NOW).hash).not.toBe(a);
    // A day later the reminder counts one day fewer.
    expect(buildEmail(r, "renewal_reminder", null, NOW + DAY).hash).not.toBe(buildEmail(r, "renewal_reminder", null, NOW).hash);
  });

  it("refuses a custom message that breaks the rules", () => {
    expect(() => buildEmail(r, "custom", null, NOW)).toThrow(EmailBuildError);
    expect(() => buildEmail(r, "custom", { subject: "Hi", message: "x", promotional: false }, NOW)).toThrow(/subject/);
  });

  it("warns about links outside digitalcarda.in and past the link limit", () => {
    const w = previewWarnings(r, "custom", {
      subject: "Links", promotional: false,
      message: ["https://digitalcarda.in/a", "https://wa.me/1", "https://evil.example.com/x", ...Array.from({ length: 9 }, (_, i) => `https://digitalcarda.in/${i}`)].join(" "),
    }, { at: new Date(NOW - DAY), byHand: true });
    expect(w.join(" ")).toMatch(/Links outside digitalcarda\.in: evil\.example\.com/);
    expect(w.join(" ")).toMatch(/Only the first 10 links are clickable; 2 more addresses stay/);
    expect(w.join(" ")).toMatch(/already got this email from the team/);
    expect(previewWarnings(person({ emailVerified: false }), "feature_update", null, null)[0]).toMatch(/haven't confirmed/);
  });

  it("the plan label says where they stand", () => {
    expect(planLabel(r, NOW)).toMatch(/^Gold · till /);
    expect(planLabel(person({ trial: trial("expiring_soon", 2) }), NOW)).toBe("Free trial · 2 days left");
    expect(planLabel(person({ plans: { platform: paid(-3), oldSite: null } }), NOW)).toMatch(/^Gold · ended /);
    expect(planLabel(person(), NOW)).toBeNull();
  });
});

describe("activity log", () => {
  it("keeps the subject but never the text of a message", () => {
    const { summary, target } = summarizeInput({
      userId: 41, template: "custom", custom: { subject: "Your QR standee", message: "Private words for the customer", promotional: false },
      previewHash: "a".repeat(64), requestId: "3b241101-e2bb-4255-8caf-4136c566a962",
    });
    expect(summary).toContain("custom.subject: Your QR standee");
    expect(summary).toContain("custom.message: [30 chars]");
    expect(summary).not.toContain("Private words");
    expect(target).toBe("41");
    expect(summarizeInput({ legacyId: 7, body: "secret words" }).summary).toBe("legacyId: 7, body: [12 chars]");
    expect(summarizeInput({ legacyId: 7 }).target).toBe("7");
  });
});
