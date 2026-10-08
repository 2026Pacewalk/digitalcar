/* The poster design writes the card's name as ink lettering on blocks of the
   brand colour. A dark brand colour used to make it unreadable — poster-collage
   ships #111827, which is the ink itself, so the name rendered as solid blocks. */
import { describe, expect, it } from "vitest";
import { buildCardHtml } from "@/card-template/buildCard";
import { TEMPLATE_COUNT } from "@/card-template/buildCard";

const POSTER = TEMPLATE_COUNT - 10;   // 10 designs follow the poster in the premium set

const card = (color: string) =>
  buildCardHtml({ slug: "poster", name: "Rohit Nair", company_name: "Nair Consulting",
    designation: "Growth & Marketing Consultant", mobile1: "+91 90000 00033",
    email: "rohit@example.com", color, color2: "#374151", theme: POSTER } as never,
    [], [], [], [], [], []);

const nameBlock = (html: string) => /\.po-name span\{[^}]*\}/.exec(html)?.[0] ?? "";

describe("the poster design's name", () => {
  it("stays readable when the brand colour is as dark as the ink", () => {
    const block = nameBlock(card("#111827"));
    expect(block).toContain("color:#ffffff");
    expect(block).not.toContain("color:#111827");
  });

  it("drops the multiply blend that would swallow white lettering", () => {
    expect(card("#111827")).not.toMatch(/\.po-name\{[^}]*mix-blend-mode/);
    expect(card("#F7B31C")).toMatch(/\.po-name\{[^}]*mix-blend-mode:multiply/);
  });

  it("keeps ink lettering on a light brand colour", () => {
    expect(nameBlock(card("#F7B31C"))).toContain("color:#111827");
  });
});
