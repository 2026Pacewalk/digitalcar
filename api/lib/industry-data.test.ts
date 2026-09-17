/* Blueprint §3d: the industry page data must be true, consistent and safe to
 * publish. Every rule lives in ./industry-checks.ts, so content writers can run
 * exactly the same checks on a page before it is registered. */
import { describe, expect, it } from "vitest";
import {
  INDUSTRIES, INDUSTRY_GROUPS, INDUSTRIES_PATH, getIndustry, industriesInGroup, industriesLastmod,
  industryPath, inr, fillTokens, relatedIndustries, plainText, wordCount, SHARE_STEPS,
} from "../../src/data/industries";
import { checkCount, checkIndustry, checkLinks, checkRegistry, PLANNED_INDUSTRY_SLUGS } from "./industry-checks";

describe("industry pages", () => {
  it("has at least the three pilot pages", () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(3);
    for (const slug of ["doctors", "advocates", "real-estate"]) expect(getIndustry(slug), slug).not.toBeNull();
  });

  for (const ind of INDUSTRIES) {
    it(`${ind.slug} passes every content rule`, () => {
      expect(checkIndustry(ind)).toEqual([]);
    });
  }

  it("the registry, features, storyboard and hub FAQ are clean", () => {
    expect(checkRegistry()).toEqual([]);
  });

  it("is complete: 14–20 pages, and every related link resolves", () => {
    // Expected to fail until WP6 adds the remaining pages.
    expect([...checkCount(), ...checkLinks()]).toEqual([]);
  });

  it("every registered slug is a planned one, and the planned list has 20", () => {
    expect(PLANNED_INDUSTRY_SLUGS).toHaveLength(20);
    expect(new Set(PLANNED_INDUSTRY_SLUGS).size).toBe(20);
    for (const ind of INDUSTRIES) expect(PLANNED_INDUSTRY_SLUGS, ind.slug).toContain(ind.slug);
  });
});

describe("industry helpers", () => {
  it("getIndustry matches the raw slug only", () => {
    expect(getIndustry("doctors")?.name).toBe("Doctors & Clinics");
    expect(getIndustry("Doctors")).toBeNull();
    expect(getIndustry("doctors/")).toBeNull();
    expect(getIndustry("nope")).toBeNull();
    expect(industryPath("doctors")).toBe(`${INDUSTRIES_PATH}/doctors`);
  });

  it("sorts by order and keeps every page in exactly one group", () => {
    const orders = INDUSTRIES.map((i) => i.order);
    expect([...orders]).toEqual([...orders].sort((a, b) => a - b));
    const grouped = INDUSTRY_GROUPS.flatMap((g) => industriesInGroup(g.id));
    expect(grouped).toHaveLength(INDUSTRIES.length);
    expect(new Set(grouped.map((i) => i.slug)).size).toBe(INDUSTRIES.length);
  });

  it("relatedIndustries drops unknown slugs and never returns the page itself", () => {
    for (const ind of INDUSTRIES) {
      const related = relatedIndustries(ind);
      expect(related.length).toBeLessThanOrEqual(3);
      for (const r of related) expect(r.slug).not.toBe(ind.slug);
      for (const r of related) expect(getIndustry(r.slug)).not.toBeNull();
    }
  });

  it("industriesLastmod is the newest updatedAt", () => {
    const newest = INDUSTRIES.reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), "");
    expect(industriesLastmod()).toBe(newest);
  });

  it("inr formats with Indian grouping and no locale call", () => {
    expect(inr(499)).toBe("₹499");
    expect(inr(1499)).toBe("₹1,499");
    expect(inr(99999)).toBe("₹99,999");
  });

  it("plainText and wordCount ignore inline marks", () => {
    expect(plainText("**Save Contact** puts it in [your phonebook](/features).")).toBe("Save Contact puts it in your phonebook.");
    expect(wordCount("**one** [two](/x) three")).toBe(3);
  });

  it("fillTokens fills the storyboard from the page, with the right article", () => {
    const doctors = getIndustry("doctors")!;
    const step = SHARE_STEPS[doctors.shareFlow.kind][0];
    expect(fillTokens(step.title, doctors)).toBe("A patient scans your QR.");
    expect(fillTokens(step.text, doctors)).toContain("reception desk");
    expect(fillTokens(SHARE_STEPS["counter-qr"][2].text, doctors)).toContain("Sharma Clinic");

    const realEstate = getIndustry("real-estate")!;
    expect(fillTokens(SHARE_STEPS["whatsapp-link"][2].text, realEstate)).toContain("\"Flats for sale\"");
    expect(fillTokens("A {client} taps your card.", { ...doctors, shareFlow: { ...doctors.shareFlow, client: "attendee" } }))
      .toBe("An attendee taps your card.");
    expect(fillTokens("a {where}", { ...doctors, shareFlow: { ...doctors.shareFlow, where: "admission desk" } }))
      .toBe("an admission desk");
  });

  it("leaves no storyboard token unfilled", () => {
    for (const ind of INDUSTRIES) {
      for (const s of SHARE_STEPS[ind.shareFlow.kind]) {
        expect(fillTokens(`${s.title} ${s.text}`, ind), ind.slug).not.toMatch(/[{}]/);
      }
    }
  });
});
