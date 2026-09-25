import { describe, it, expect } from "vitest";
import { addWorkingHours, deadlineIst } from "./offer-grants";
import { trialOfferEmail } from "./email/lifecycle";

/* The EARLY20 deadline: 24 working hours = Mon–Sat, 10 am–6 pm India time.
   Times below are written in IST (+05:30) so each case reads like the calendar. */
const ist = (s: string) => new Date(`${s}+05:30`);
const inIst = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16).replace("T", " ");

describe("addWorkingHours (Mon–Sat 10:00–18:00 IST)", () => {
  it("an early-morning send gets three full working days", () => {
    // Tue 29 Sep 2026, 06:30 → Tue 8h + Wed 8h + Thu 8h → Thu 18:00
    expect(inIst(addWorkingHours(ist("2026-09-29T06:30:00"), 24))).toBe("2026-10-01 18:00");
  });
  it("skips Sunday", () => {
    // Fri 2 Oct 06:30 → Fri, Sat, (Sun off), Mon 18:00
    expect(inIst(addWorkingHours(ist("2026-10-02T06:30:00"), 24))).toBe("2026-10-05 18:00");
  });
  it("a send after 6 pm starts counting at 10 am the next working day", () => {
    // Mon 28 Sep 19:10 → Tue, Wed, Thu → Thu 18:00
    expect(inIst(addWorkingHours(ist("2026-09-28T19:10:00"), 24))).toBe("2026-10-01 18:00");
  });
  it("a send in the middle of a working day carries the rest over", () => {
    // Wed 30 Sep 14:00 → 4h Wed, 8h Thu, 8h Fri, 4h Sat → Sat 14:00
    expect(inIst(addWorkingHours(ist("2026-09-30T14:00:00"), 24))).toBe("2026-10-03 14:00");
  });
  it("a send on Sunday starts Monday", () => {
    expect(inIst(addWorkingHours(ist("2026-10-04T11:00:00"), 24))).toBe("2026-10-07 18:00");
  });
  it("holidays don't count", () => {
    // Tue 29 Sep 06:30 with Fri 2 Oct off: Tue, Wed, Thu is unaffected…
    expect(inIst(addWorkingHours(ist("2026-09-29T06:30:00"), 24, ["2026-10-02"]))).toBe("2026-10-01 18:00");
    // …but Thu 1 Oct off pushes it to Fri.
    expect(inIst(addWorkingHours(ist("2026-09-29T06:30:00"), 24, ["2026-10-01"]))).toBe("2026-10-02 18:00");
  });
  it("the deadline reads in India time", () => {
    expect(deadlineIst(ist("2026-10-01T18:00:00"))).toMatch(/Thu.*1 Oct.*6:00\s?pm/i);
  });
});

describe("trialOfferEmail", () => {
  const base = {
    name: "Aarav Mehta", cardUrl: "https://digitalcarda.in/pacewalk", code: "EARLY20", percent: 20,
    endsAt: ist("2026-10-01T18:00:00"),
    prices: [{ plan: "Gold", cycle: "1 year", usual: 999, withCode: 799 }],
  };
  it("states the code, the exact deadline, the real prices and the checkout link", () => {
    const e = trialOfferEmail(base);
    expect(e.kind).toBe("trialOfferEmail");
    expect(e.subject).toMatch(/20% off/);
    for (const part of [e.html, e.text]) {
      expect(part).toContain("EARLY20");
      expect(part).toMatch(/1 Oct/);
      expect(part).toContain("dashboard/subscription?coupon=EARLY20");
      expect(part).toContain("799");
    }
    expect(e.text).toContain("youtu.be/7d0G0Hu4x7o");
  });
  it("only promises plan features the product actually has", () => {
    const e = trialOfferEmail(base);
    for (const part of [e.html, e.text]) expect(part).not.toMatch(/branding|multi-language|priority support/i);
  });
  it("escapes a hostile name", () => {
    const e = trialOfferEmail({ ...base, name: `<script>alert(1)</script>` });
    expect(e.html).not.toContain("<script>alert(1)</script>");
  });
});
