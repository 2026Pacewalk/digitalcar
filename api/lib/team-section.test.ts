/*
 * "Our Team" (Platinum) — the owner adds colleagues and picks who appears.
 * It must render the same way on a classic template and on a premium design,
 * must honour the per-member switch, and must disappear when the section is off.
 */
import { describe, expect, test } from "vitest";
import { buildCardHtml } from "../../src/card-template/buildCard";

const team = [
  { id: 1, name: "Isha Khanna", role: "Project Lead", photo: "/demo/avatars/studio-nivas.svg", phone: "+91 90000 00012", email: "", link: "", show: true },
  { id: 2, name: "Rohan Das", role: "Site Manager", photo: "", phone: "", email: "rohan@example.com", link: "", show: true },
  { id: 3, name: "Hidden Person", role: "Not on this card", photo: "", phone: "", email: "", link: "", show: false },
];

const card = (over: Record<string, unknown>) => buildCardHtml({
  slug: "team-test", name: "Aarav Mehta", company_name: "Nayara Interiors",
  designation: "Founder", mobile1: "+91 90000 00011", email: "hello@example.com",
  color: "#6366F1", color2: "#1E1B4B", about_on: 1,
  ...over,
} as never, [] as never, [] as never, [] as never, [] as never, [] as never, [] as never);

/* 1 = a classic template, 63 = a premium design: both read the same field. */
for (const [label, theme] of [["classic template", 1], ["premium design", 63]] as const) {
  describe(label, () => {
    test("shows the members the owner chose", () => {
      const html = card({ theme, team_on: 1, team: JSON.stringify(team) });
      expect(html).toContain("Isha Khanna");
      expect(html).toContain("Project Lead");
      expect(html).toContain("Rohan Das");
      expect(html).toContain("tel:+919000000012");          // photo-less member still links out
      expect(html).toContain("mailto:rohan@example.com");
      expect(html).not.toContain("Hidden Person");          // per-member switch is off
    });

    test("renders nothing when the section is switched off", () => {
      const html = card({ theme, team_on: 0, team: JSON.stringify(team) });
      expect(html).not.toContain("Isha Khanna");
      expect(html).not.toContain("team-section");
    });

    test("renders nothing when no one has been added", () => {
      const html = card({ theme, team_on: 1, team: "[]" });
      expect(html).not.toContain("team-section");
    });

    test("accepts the list as an array as well as JSON", () => {
      const html = card({ theme, team_on: 1, team });
      expect(html).toContain("Isha Khanna");
    });
  });
}
