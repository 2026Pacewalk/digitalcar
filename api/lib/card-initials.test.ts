/* A card whose name starts outside the basic plane - a maths letter, an emoji -
   used to take the whole card down: the avatar initial was taken by UTF-16 unit,
   so it was half a surrogate pair, and encodeURIComponent threw on it. That was
   invisible until the legacy text was repaired on the way in, because the
   mangled name started with a plain "A-tilde".
   One live card, alpine-polydent, is named this way. */
import { describe, expect, it } from "vitest";
import { buildCardHtml, buildCardThumb, buildPausedHtml, TEMPLATE_COUNT } from "@/card-template/buildCard";
import { LINKBIO_START } from "@/card-template/linkbio";

/* As stored by the legacy import: the maths-bold name, UTF-8-as-latin1 mangled. */
const MANGLED_NAME =
  "\u00c3\u00b0\u00c2\u009d\u00c2\u0091\u00c2\u00a8\u00c3\u00b0\u00c2\u009d\u00c2\u0091\u00c2\u00b3";

const base = {
  slug: "astral-name", name: MANGLED_NAME, company_name: "Alpine Polydent",
  designation: "Dental Equipment", mobile1: "+91 90000 00000", email: "hello@example.com",
  address: "Mohali, Punjab", about_us: "Dental and medical equipment.", about_on: 1,
  logo: "467-WhatsApp Image.jpeg",   // a bare legacy filename: no usable image, so the initial is drawn
};

const THEMES = [1, LINKBIO_START, TEMPLATE_COUNT];   // default, link-in-bio, premium

describe("a name that starts outside the basic plane", () => {
  it.each(THEMES)("builds on theme %i", (theme) => {
    let html = "";
    expect(() => { html = buildCardHtml({ ...base, theme } as never, [], [], [], [], [], []); }).not.toThrow();
    expect(html.length).toBeGreaterThan(500);
    expect(html).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);   // no lone surrogate
  });

  it("builds as a thumbnail and as a paused card", () => {
    for (const theme of THEMES) expect(() => buildCardThumb({ ...base, theme } as never, theme)).not.toThrow();
    expect(() => buildPausedHtml({ ...base } as never)).not.toThrow();
  });

  it("draws the repaired letter, not the mangled one", () => {
    const html = buildCardHtml({ ...base, theme: 1 } as never, [], [], [], [], [], []);
    expect(html).toContain("\ud835\udc68");          // the repaired name is on the card
    expect(html).not.toContain(MANGLED_NAME);
  });

  it("survives an emoji name and a reviewer named with one", () => {
    expect(() =>
      buildCardHtml(
        { ...base, name: "\ud83d\udc87 Shagun Beauty Parlour", theme: 1, review_on: 1 } as never,
        [], [], [], [], [],
        [{ id: 1, name: "\ud83c\udf38 Priya", rating: 5, text: "Lovely work." }] as never,
      ),
    ).not.toThrow();
  });
});
