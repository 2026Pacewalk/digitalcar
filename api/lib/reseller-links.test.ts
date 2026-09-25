import { describe, it, expect } from "vitest";
import { visibleSinceLink } from "./reseller-links";
import { resellerCustomerLinkedEmail } from "./email/reseller";

/* A customer the team linked to a reseller: the reseller sees the payments
   from the link date on — and one verified after it, since that earned them
   commission — but not the history from before. */
describe("visibleSinceLink", () => {
  const linked = new Date("2026-09-25T12:00:00Z");
  it("shows everything for a customer the reseller created (no link date)", () => {
    expect(visibleSinceLink({ createdAt: "2025-01-01T00:00:00Z" }, undefined)).toBe(true);
    expect(visibleSinceLink({ createdAt: null }, null)).toBe(true);
  });
  it("hides a payment made and verified before the link", () => {
    expect(visibleSinceLink({ createdAt: "2026-09-01T10:00:00Z", verifiedAt: "2026-09-02T10:00:00Z" }, linked)).toBe(false);
  });
  it("shows a payment made after the link", () => {
    expect(visibleSinceLink({ createdAt: "2026-09-25T12:00:00Z" }, linked)).toBe(true);
    expect(visibleSinceLink({ createdAt: new Date("2026-10-01T09:00:00Z"), verifiedAt: null }, linked)).toBe(true);
  });
  it("shows an older payment verified after the link (it paid them commission)", () => {
    expect(visibleSinceLink({ createdAt: "2026-09-20T10:00:00Z", verifiedAt: "2026-09-26T10:00:00Z", status: "verified" }, linked)).toBe(true);
  });
  it("hides an older payment rejected after the link (and the rejection note)", () => {
    expect(visibleSinceLink({ createdAt: "2026-09-20T10:00:00Z", verifiedAt: "2026-09-26T10:00:00Z", status: "rejected" }, linked)).toBe(false);
  });
  it("hides an older payment still waiting for verification", () => {
    expect(visibleSinceLink({ createdAt: "2026-09-20T10:00:00Z", verifiedAt: null }, linked)).toBe(false);
  });
});

describe("resellerCustomerLinkedEmail", () => {
  it("names the customer, the rate and the from-today rule", () => {
    const e = resellerCustomerLinkedEmail({ name: "Aarav Mehta", customerName: "Rohan Kapoor", business: "Kapoor Interiors", rate: "20.00" });
    expect(e.kind).toBe("resellerCustomerLinkedEmail");
    expect(e.subject).toBe("Rohan Kapoor is now your customer");
    for (const part of [e.html, e.text]) {
      expect(part).toContain("Rohan Kapoor");
      expect(part).toContain("20%");
      expect(part).toMatch(/before today don.t earn commission/);
      expect(part).toContain("/reseller/customers");
    }
  });
  it("escapes hostile names", () => {
    const e = resellerCustomerLinkedEmail({ customerName: `<img src=x onerror=alert(1)>`, business: `<script>x</script>` });
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).not.toContain("<script>x</script>");
  });
});
