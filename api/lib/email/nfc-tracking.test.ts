import { describe, it, expect } from "vitest";
import { nfcOrderShippedEmail } from "./nfc";

/* An order marked shipped before its tracking number was saved gets a second
   email carrying the number (order #3, 28 Sep 2026: the first said "No tracking
   number on this one" and the number saved seconds later never reached them). */
const base = { name: "Aarav Mehta", orderId: 3, productName: "NFC PVC Card", quantity: 1 };

describe("nfcOrderShippedEmail", () => {
  it("the first shipped email with a tracking number shows it", () => {
    const e = nfcOrderShippedEmail({ ...base, tracking: "DTDC D12345678" });
    expect(e.kind).toBe("nfcOrderShippedEmail");
    expect(e.subject).toBe("Shipped — your NFC PVC Card (#3)");
    expect(e.html).toContain("DTDC D12345678");
    expect(e.html).not.toContain("No tracking number on this one");
  });
  it("a tracking number added later is its own email, led by the number", () => {
    const e = nfcOrderShippedEmail({ ...base, tracking: "test10100000000", trackingUpdate: "added" });
    expect(e.kind).toBe("nfcTrackingEmail");
    expect(e.subject).toBe("Tracking number for your NFC PVC Card (#3)");
    for (const part of [e.html, e.text]) expect(part).toContain("test10100000000");
    expect(e.html).toContain("Here&#39;s your tracking number");
    expect(e.html).not.toContain("No tracking number on this one");
  });
  it("a corrected number says so", () => {
    const e = nfcOrderShippedEmail({ ...base, tracking: "DTDC D87654321", trackingUpdate: "changed" });
    expect(e.subject).toBe("Updated tracking for your NFC PVC Card (#3)");
    expect(e.text).toMatch(/corrected the tracking number/);
  });
  it("without a number it stays the plain shipped email", () => {
    const e = nfcOrderShippedEmail({ ...base, tracking: null, trackingUpdate: "added" });
    expect(e.kind).toBe("nfcOrderShippedEmail");
  });
});
