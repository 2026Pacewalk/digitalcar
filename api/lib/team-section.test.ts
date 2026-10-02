/*
 * "Our Team" (Platinum) — the owner adds colleagues and picks who appears.
 * It must render the same way on a classic template and on a premium design,
 * must honour the per-member switch, and must disappear when the section is off.
 */
import { describe, expect, test } from "vitest";
import { buildCardHtml } from "../../src/card-template/buildCard";

/* Members are DigitalCarda profiles, added by their @handle: the card shows the
   name, title and photo copied from that profile and links back to it. The last
   two entries cover cards still holding the older hand-typed shape. */
const team = [
  { id: 1, slug: "isha-khanna", name: "Isha Khanna", role: "Project Lead", photo: "/demo/avatars/studio-nivas.svg", link: "isha-khanna", show: true },
  { id: 2, name: "Rohan Das", role: "Site Manager", photo: "", phone: "+91 90000 00012", email: "rohan@example.com", link: "", show: true },
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
      expect(html).toContain("https://digitalcarda.in/isha-khanna");  // tapping opens their own card
      expect(html).toContain("tel:+919000000012");                    // older hand-typed member still links out
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

    test("links the member's picture instead of copying it", () => {
      const html = card({ theme, team_on: 1, team: JSON.stringify([
        { id: 1, slug: "pacewalk", name: "Shekhar Jain", company: "Pacewalk", role: "Director",
          pic: "https://digitalcarda.in/api/sig-img/pacewalk/logo", fit: "contain", link: "pacewalk", show: true },
      ]) });
      expect(html).toContain("https://digitalcarda.in/api/sig-img/pacewalk/logo");
      expect(html).toContain("is-logo");                       // a logo is fitted, not cropped
      // The member's picture is a link, never a copy of their image bytes.
      const section = html.slice(html.indexOf("team-section"), html.indexOf("team-section") + 1200);
      expect(section).not.toContain("data:image");
    });

    test("falls back photo → logo → the business initial", () => {
      const html = card({ theme, team_on: 1, team: JSON.stringify([
        { id: 1, slug: "a", name: "With Photo", company: "Alpha Ltd", photo: "/demo/avatars/pixelforge.svg", logo: "/demo/logos/pixelforge.svg", show: true },
        { id: 2, slug: "b", name: "Logo Only", company: "Beta Ltd", photo: "", logo: "/demo/logos/jain-co.svg", show: true },
        { id: 3, slug: "c", name: "Nothing At All", company: "Carla Interiors", photo: "", logo: "", show: true },
      ]) });
      expect(html).toContain("/demo/avatars/pixelforge.svg");   // the person's own picture wins
      expect(html).not.toContain("/demo/logos/pixelforge.svg"); // ...so their logo is not used
      expect(html).toContain("/demo/logos/jain-co.svg");        // no photo → the logo
      expect(html).toContain("is-logo");                        // and it is fitted, not cropped
      expect(html).toMatch(/>C</);                              // neither → the business initial
    });

    test("accepts the list as an array as well as JSON", () => {
      const html = card({ theme, team_on: 1, team });
      expect(html).toContain("Isha Khanna");
    });
  });
}
