import { describe, expect, it } from "vitest";
import { cardSeo, cityFromAddress } from "../../src/lib/cardSeo";

// Legacy specialities: each item reversed, then base64-encoded three times.
const legacySpecs = (items: string[]) =>
  items.map((s) => btoa(btoa(btoa(s.split("").reverse().join(""))))).join(",");

describe("cardSeo titles", () => {
  it("doesn't repeat a business name that is also its company", () => {
    const seo = cardSeo({ slug: "ibt-defence", customer: { name: "IBT Defence", company_name: "IBT Defence" } });
    expect(seo.title).toBe("IBT Defence — DigitalCarda");
    expect(seo.isBusiness).toBe(true);
  });

  it("collapses stray spaces", () => {
    const seo = cardSeo({ slug: "darpan", customer: { name: "Kapil Nagal", company_name: "DARPAN  " } });
    expect(seo.title).toBe("Kapil Nagal · DARPAN — DigitalCarda");
  });

  it("uses the owner's own SEO title and description when set", () => {
    const seo = cardSeo({ slug: "x", customer: { name: "A", seo_title: "My Title", seo_description: "My description" } });
    expect(seo.title).toBe("My Title");
    expect(seo.description).toBe("My description");
  });
});

describe("cardSeo descriptions", () => {
  it("builds a business description from type, city, year and services", () => {
    const seo = cardSeo({
      slug: "pacewalk",
      customer: {
        name: "Pacewalk", company_name: "Pacewalk", nature: "Digital Marketing Agency",
        address: "SCO-209, Green Lotus Avenue, Zirakpur, Punjab-140603", establishment: "2014",
        specialities: legacySpecs(["Web Designing", "SEO", "Video Animation"]),
      },
    });
    // The closing call-to-action is only added when it fits in 155 characters.
    expect(seo.description).toBe(
      "Pacewalk — Digital Marketing Agency in Zirakpur, since 2014. Web Designing, SEO and Video Animation.",
    );
    expect(seo.title).toBe("Pacewalk · Digital Marketing Agency — DigitalCarda");
  });

  it("builds a person description from role, company and About, clipped to 155", () => {
    const seo = cardSeo({
      slug: "p",
      customer: { name: "Yogesh Talreja", designation: "MANAGING DIRECTOR", company_name: "TCS", about_us: "<p>We build software for banks, insurers and retailers across India and the world, with more than twenty years of delivery.</p>" },
    });
    expect(seo.description.startsWith("Yogesh Talreja, Managing Director at TCS. We build software")).toBe(true);
    expect(seo.description.length).toBeLessThanOrEqual(155);
    expect(seo.description).not.toContain("View my digital business card");
  });

  it("uses product names shown on the card", () => {
    const seo = cardSeo({ slug: "s", customer: { name: "Naresh", company_name: "Skinstone" }, products: [{ name: "Facials" }, { name: "demo" }, { name: "Hair Spa" }] });
    expect(seo.services).toEqual(["Facials", "Hair Spa"]);
    expect(seo.description).toContain("Facials and Hair Spa.");
  });

  it("leaves the About text out when the card hides it", () => {
    const seo = cardSeo({ slug: "h", customer: { name: "A", designation: "CEO", about_us: "Secret about text that is long enough to count", about_on: 0 } });
    expect(seo.description).not.toContain("Secret");
  });
});

describe("cardSeo indexing", () => {
  it("keeps a name-only card out of the index", () => {
    expect(cardSeo({ slug: "e", customer: { name: "IBT English", company_name: "IBT English", mobile1: "999" } }).indexable).toBe(false);
  });

  it("indexes a card with a role, a separate company or services", () => {
    expect(cardSeo({ slug: "a", customer: { name: "A", designation: "CEO" } }).indexable).toBe(true);
    expect(cardSeo({ slug: "b", customer: { name: "Kapil", company_name: "DARPAN" } }).indexable).toBe(true);
    expect(cardSeo({ slug: "c", customer: { name: "C" }, products: [{ name: "Tax Filing" }] }).indexable).toBe(true);
  });

  it("keeps a paused card out of the index", () => {
    expect(cardSeo({ slug: "a", customer: { name: "A", designation: "CEO" }, paused: true }).indexable).toBe(false);
  });
});

describe("cardSeo structured data", () => {
  it("marks a business as an Organization and a person as a Person, without contact details", () => {
    const biz = JSON.parse(cardSeo({ slug: "k", customer: { name: "Kreative Events", company_name: "Kreative Events", mobile1: "9876543210", email: "a@b.com", facebook: "facebook.com/kreative" } }).jsonLd);
    expect(biz["@type"]).toBe("Organization");
    expect(biz.sameAs).toEqual(["https://facebook.com/kreative"]);
    const person = JSON.parse(cardSeo({ slug: "y", customer: { name: "Yogesh", designation: "CEO", company_name: "TCS", address: "Gandhibagh, Nagpur" } }).jsonLd);
    expect(person["@type"]).toBe("Person");
    expect(person.worksFor).toEqual({ "@type": "Organization", name: "TCS", address: { "@type": "PostalAddress", addressLocality: "Nagpur", addressCountry: "IN" } });
    expect(JSON.stringify([biz, person])).not.toMatch(/9876543210|a@b\.com|Gandhibagh/);
  });
});

describe("cityFromAddress", () => {
  it.each([
    ["Gurdwara Bazar, 151204, KotKapura, Punjab, India", "KotKapura"],
    ["Gandhibagh, Nagpur", "Nagpur"],
    ["Opposite Kartar Dhaba, Mai Hiran Gate, Jalandhar, Punjab 144001", "Jalandhar"],
    ["SCO-209, Green Lotus Avenue, Zirakpur, Punjab-140603", "Zirakpur"],
    ["Plot 7, Bengaluru Karnataka", "Bengaluru"],
    ["SCO 11-12, 2ND Floor, NK Sharma RD ZIRAKPUR, PUNJAB 140603", ""],
    ["#186, Kamla Nehru Colony ,Bibi Wala Road Bathinda", ""],
    ["", ""],
  ])("%s → %s", (address, city) => {
    expect(cityFromAddress(address)).toBe(city);
  });
});
