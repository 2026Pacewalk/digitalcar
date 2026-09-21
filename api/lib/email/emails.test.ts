import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import type { Email } from "./kit";
import { emailPreviewRouter } from "../../email-preview-router";
import { welcomeEmail, passwordResetEmail } from "./account";
import { cardLinkChangedEmail } from "./lifecycle";
import { newLeadOwnerEmail, enquiryAutoReplyEmail, hotLeadEmail } from "./leads";
import { newSignupAdminEmail, bulkOrderAdminEmail, contactEnquiryAdminEmail } from "./admin";
import { planExtendedEmail, paymentRejectedEmail } from "./billing";
import { nfcOrderConfirmedEmail } from "./nfc";
import { referralJoinedEmail } from "./referral";
import { resellerCommissionEmail } from "./reseller";

/* Every preview in api/lib/email/previews/ is rendered and checked, so a
   template that breaks on real-looking data fails here instead of in someone's
   inbox. The same files feed Admin → Email previews. */

type Preview = { name: string; module: string; audience: string; variant?: string; render: () => Email };

const dir = new URL("./previews/", import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3)).sort();
const all: Preview[] = [];
for (const f of files) {
  const mod = (await import(`./previews/${f}.ts`)) as { previews?: Preview[] };
  all.push(...(mod.previews ?? []));
}

const label = (p: Preview) => `${p.module} › ${p.name}${p.variant ? ` (${p.variant})` : ""}`;
/** Text we never want a customer to see: a missing field, bad maths or a bad date. */
const BROKEN = ["undefined", "NaN", "[object Object]", "Invalid Date"];
/** Gmail clips a message above ~102 KB; stay well under. */
const MAX_HTML = 80 * 1024;

describe("email previews", () => {
  it("finds the preview files", () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(all.length).toBeGreaterThan(100);
  });

  for (const p of all) {
    it(`renders ${label(p)}`, () => {
      const e = p.render();
      expect(e.subject.trim(), "subject").not.toBe("");
      expect(e.subject, "subject is one line").not.toMatch(/[\r\n]/);
      expect(e.text.trim(), "plain text").not.toBe("");
      expect(e.html, "html").toMatch(/^<!doctype html>/i);
      expect(Buffer.byteLength(e.html, "utf8"), "html size").toBeLessThan(MAX_HTML);
      expect(e.kind, "kind").toBeTruthy();
      for (const [part, body] of [["subject", e.subject], ["html", e.html], ["text", e.text]] as const) {
        for (const bad of BROKEN) expect(body.includes(bad), `"${bad}" in ${part}`).toBe(false);
      }
      // Templates never emit scripts; one appearing means user text got in raw.
      expect(/<script/i.test(e.html), "script tag in html").toBe(false);
    });
  }
});

describe("hostile input is escaped", () => {
  const X = `"><img src=x onerror=alert(1)><script>alert(1)</script>`;
  const clean = (e: Email) => {
    expect(e.html.includes("<script"), "raw <script> in html").toBe(false);
    expect(e.html.includes("<img src=x"), "raw injected <img> in html").toBe(false);
    // …and it did reach the page, escaped — so the checks above aren't passing vacuously.
    expect(e.html.includes("&lt;"), "escaped input in html").toBe(true);
    for (const part of [e.subject, e.html, e.text]) {
      for (const bad of BROKEN) expect(part.includes(bad), `"${bad}"`).toBe(false);
    }
  };
  const later = new Date("2026-10-21T09:40:00Z");

  it("welcomeEmail", () => clean(welcomeEmail({ name: X, companyName: X, slug: "pacewalk", trial: { days: 30, endsAt: later, voucher: X } })));
  it("passwordResetEmail", () => clean(passwordResetEmail({ name: X, link: "https://digitalcarda.in/reset-password?token=abc" })));
  it("cardLinkChangedEmail", () => clean(cardLinkChangedEmail({ name: X, oldSlug: "old-link", newSlug: "pacewalk", company: X, reason: X })));
  it("newLeadOwnerEmail", () => clean(newLeadOwnerEmail({ ownerName: X, name: X, email: X, contact: X, company: X, message: X, slug: "pacewalk", cardName: X, hot: true, reasons: [X] })));
  it("enquiryAutoReplyEmail", () => clean(enquiryAutoReplyEmail({ visitorName: X, message: X, business: X, ownerPhone: X, ownerEmail: X, slug: "pacewalk" })));
  it("hotLeadEmail", () => clean(hotLeadEmail({ name: X, email: X, contact: X, message: X, slug: X, cardName: X, ownerName: X, ownerEmail: X, ownerPhone: X })));
  it("newSignupAdminEmail", () => clean(newSignupAdminEmail({
    id: 1, name: X, email: "someone@example.com", phone: X, method: "email", emailVerified: false,
    business: X, slug: "pacewalk", referral: { name: X, code: X }, place: X, device: X, page: X,
  })));
  it("bulkOrderAdminEmail", () => clean(bulkOrderAdminEmail({ company: X, contactName: X, phone: X, email: X, quantity: 25, packageName: X, note: X })));
  it("contactEnquiryAdminEmail", () => clean(contactEnquiryAdminEmail({ name: X, email: X, phone: X, businessName: X, requirement: X, message: X, stored: false })));
  it("planExtendedEmail", () => clean(planExtendedEmail({ name: X, planName: X, days: 30, validTill: later })));
  it("paymentRejectedEmail", () => clean(paymentRejectedEmail({ name: X, planName: X, note: X, reference: X })));
  it("nfcOrderConfirmedEmail", () => clean(nfcOrderConfirmedEmail({
    name: X, orderId: 140, productName: X, quantity: 1, amount: 499, printLines: [X, X],
    address: X, cardUrl: "https://digitalcarda.in/pacewalk", deliveryDays: "5-7 days",
  })));
  it("referralJoinedEmail", () => clean(referralJoinedEmail({ name: X, friendName: X, rewardText: X, code: X })));
  it("resellerCommissionEmail", () => clean(resellerCommissionEmail({ name: X, customerName: X, amount: 99.9, planName: X, billingCycle: X })));
});

describe("Admin → Email log", () => {
  // Without a label the log still works, but shows a de-camel-cased function name.
  it("has a friendly name for every template kind", () => {
    const src = fs.readFileSync(new URL("../../../src/pages/admin/EmailLog.tsx", import.meta.url), "utf8");
    const start = src.indexOf("const KIND_LABEL");
    const block = src.slice(start, src.indexOf("};", start));
    const labelled = new Set([...block.matchAll(/^\s*(\w+):\s*"/gm)].map((m) => m[1]));
    const kinds = new Set(all.map((p) => p.render().kind ?? ""));
    expect([...kinds].filter((k) => !labelled.has(k))).toEqual([]);
  });
});

describe("Admin → Email previews", () => {
  const ctx = (role: string) => ({
    req: new Request("https://digitalcarda.in/api/trpc"), resHeaders: new Headers(),
    user: { id: 1, role, status: "active" } as unknown as User,
  });

  it("lists every preview with a unique id, and renders each one", async () => {
    const api = emailPreviewRouter.createCaller(ctx("super_admin"));
    const list = await api.list();
    expect(list.length).toBe(all.length);
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
    const first = await api.render({ id: list[0].id });
    expect(first.subject).toBe(list[0].subject);
    expect(first.html.length).toBeGreaterThan(0);
  });

  it("is for the owner only", async () => {
    await expect(emailPreviewRouter.createCaller(ctx("customer")).list()).rejects.toThrow();
    await expect(emailPreviewRouter.createCaller(ctx("reseller")).render({ id: "x" })).rejects.toThrow();
  });

  it("rejects unknown ids", async () => {
    await expect(emailPreviewRouter.createCaller(ctx("super_admin")).render({ id: "nope" })).rejects.toThrow(/No preview/);
  });
});
