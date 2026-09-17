/* Blueprint §2g: the server <head> and JSON-LD for /industries and every
 * /industries/<slug> page come from the same data the page renders. The loops
 * run over INDUSTRIES, so every page registered in src/data/industries/index.ts
 * is covered as soon as it is added. */
import { describe, expect, it } from "vitest";
import { INDUSTRIES, INDUSTRIES_PATH, INDUSTRY_HUB_FAQS, industryPath } from "../../src/data/industries";
import { seoForPath } from "../../src/lib/publicSeo";
import { INDUSTRY_HUB_H1, INDUSTRY_PATH, ROBOTS, industryMeta } from "./industry-meta";

const SITE = "https://digitalcarda.in";
const IST = /^\d{4}-\d{2}-\d{2}T09:00:00\+05:30$/;
/** Types industry pages must never carry: they are information pages, not listings. */
const FORBIDDEN_TYPES = /AggregateRating|"Review"|"Offer"|"Product"|HowTo/;
const BRAND_LEAK = /pacewalk|shekhar/i;

type Ld = Record<string, unknown> & { "@type": string };
const parseLd = (json: string | undefined): Ld[] => {
  expect(json, "jsonLd is set").toBeTypeOf("string");
  const parsed = JSON.parse(json as string);
  expect(Array.isArray(parsed), "jsonLd is an array").toBe(true);
  return parsed as Ld[];
};

describe("industryMeta: detail pages", () => {
  it("covers at least the three pilot pages", () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(3);
  });

  for (const ind of INDUSTRIES) {
    describe(ind.slug, () => {
      const path = industryPath(ind.slug);
      const url = `${SITE}${path}`;
      const meta = industryMeta(path);

      it("title, description, h1, url and robots come from the data", () => {
        expect(meta).not.toBeNull();
        expect(meta!.title).toBe(ind.seoTitle);
        expect(meta!.description).toBe(ind.description);
        expect(meta!.h1).toBe(ind.h1);
        expect(meta!.url).toBe(`${SITE}/industries/${ind.slug}`);
        expect(meta!.robots).toBe(ROBOTS);
        expect(meta!.ogType).toBe("website");
        expect(meta!.locale).toBe("en_IN");
        expect(meta!.image).toBe(`${SITE}/og-default.jpg`);
        expect(meta!.imageW).toBe(1200);
        expect(meta!.imageH).toBe(630);
        expect(meta!.imageAlt).toContain(ind.name);
        // No og:article tags, no crawler body: the page itself is server-rendered.
        expect(meta!.article).toBeUndefined();
        expect(meta!.bodyHtml).toBeUndefined();
      });

      it("a trailing slash serves the same canonical", () => {
        const slashed = industryMeta(`${path}/`);
        expect(slashed?.url).toBe(url);
        expect(slashed?.title).toBe(meta!.title);
      });

      it("carries no breadcrumbLd (the layout would delete the id'd copy)", () => {
        expect(meta!.breadcrumbLd).toBeUndefined();
      });

      it("JSON-LD is exactly [WebPage, BreadcrumbList, FAQPage]", () => {
        const ld = parseLd(meta!.jsonLd);
        expect(ld.map((x) => x["@type"])).toEqual(["WebPage", "BreadcrumbList", "FAQPage"]);
        for (const x of ld) expect(x["@context"]).toBe("https://schema.org");

        const page = ld[0];
        expect(page["@id"]).toBe(`${url}#webpage`);
        expect(page.url).toBe(url);
        expect(page.name).toBe(ind.h1);
        expect(page.description).toBe(ind.description);
        expect(page.inLanguage).toBe("en-IN");
        expect(page.isPartOf).toEqual({ "@id": `${SITE}/#website` });
        expect(page.about).toEqual({ "@id": `${SITE}/#app` });
        expect(page.publisher).toEqual({ "@id": `${SITE}/#organization` });
        expect(page.audience).toEqual({ "@type": "BusinessAudience", audienceType: ind.name });
        expect(page.datePublished).toBe(`${ind.publishedAt}T09:00:00+05:30`);
        expect(page.dateModified).toBe(`${ind.updatedAt}T09:00:00+05:30`);
        expect(page.datePublished).toMatch(IST);
        expect(page.dateModified).toMatch(IST);

        const crumbs = ld[1];
        expect(crumbs["@id"]).toBe(`${url}#breadcrumb`);
        expect(page.breadcrumb).toEqual({ "@id": crumbs["@id"] });
        const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
        expect(items).toHaveLength(3);
        expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
        expect(items[0]).toEqual({ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` });
        expect(items[1].item).toBe(`${SITE}${INDUSTRIES_PATH}`);
        expect(items[1].name).toBe(seoForPath(INDUSTRIES_PATH)!.crumb);
        expect(items[2].name).toBe(ind.crumb);
        expect(items[2].item).toBe(url);

        const faq = ld[2];
        const questions = faq.mainEntity as { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[];
        expect(questions).toHaveLength(ind.faqs.length);
        questions.forEach((q, i) => {
          expect(q["@type"]).toBe("Question");
          expect(q.name).toBe(ind.faqs[i].q);
          expect(q.acceptedAnswer["@type"]).toBe("Answer");
          // Answers are plain text: no **bold** or [label](href) marks leak into the markup.
          expect(q.acceptedAnswer.text).not.toMatch(/\*\*|\]\(/);
          expect(q.acceptedAnswer.text.length).toBeGreaterThan(0);
        });
      });

      it("never carries listing, rating, review or how-to markup, and no internal brand names", () => {
        expect(meta!.jsonLd).not.toMatch(FORBIDDEN_TYPES);
        expect(JSON.stringify(meta)).not.toMatch(BRAND_LEAK);
      });
    });
  }
});

describe("industryMeta: unknown paths", () => {
  it("returns null for an unknown slug, a wrong-case slug and a deeper path", () => {
    expect(industryMeta("/industries/nope")).toBeNull();
    expect(industryMeta("/industries/Doctors")).toBeNull();
    expect(industryMeta("/industries/doctors/extra")).toBeNull();
    expect(industryMeta("/industries/doctors%20")).toBeNull();
  });

  it("returns null for paths that are not the hub or a detail page", () => {
    expect(industryMeta("/")).toBeNull();
    expect(industryMeta("/blog")).toBeNull();
    expect(industryMeta("/industries-old")).toBeNull();
    expect(industryMeta("/doctors")).toBeNull();
  });

  it("INDUSTRY_PATH matches any single segment, so the server can 404 the wrong ones", () => {
    expect(INDUSTRY_PATH.test("/industries/Doctors")).toBe(true);
    expect(INDUSTRY_PATH.test("/industries/nope")).toBe(true);
    expect(INDUSTRY_PATH.test("/industries/doctors")).toBe(true);
    expect(INDUSTRY_PATH.test("/industries")).toBe(false);
    expect(INDUSTRY_PATH.test("/industries/")).toBe(false);
    expect(INDUSTRY_PATH.test("/industries/doctors/extra")).toBe(false);
    expect(INDUSTRY_PATH.exec("/industries/Doctors")![1]).toBe("Doctors");
  });
});

describe("industryMeta: hub", () => {
  const page = seoForPath(INDUSTRIES_PATH)!;
  const url = `${SITE}${INDUSTRIES_PATH}`;
  const meta = industryMeta(INDUSTRIES_PATH);

  it("title and description are the publicSeo entry; canonical has no slash", () => {
    expect(page).not.toBeNull();
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe(page.title);
    expect(meta!.description).toBe(page.description);
    expect(meta!.url).toBe(url);
    expect(meta!.h1).toBe(INDUSTRY_HUB_H1);
    expect(meta!.robots).toBe(ROBOTS);
    expect(meta!.locale).toBe("en_IN");
    expect(meta!.ogType).toBeUndefined(); // injectCardMeta defaults to "website"
    expect(meta!.image).toBe(`${SITE}/og-default.jpg`);
    expect(industryMeta(`${INDUSTRIES_PATH}/`)?.url).toBe(url);
  });

  it("keeps the layout's breadcrumb element (publicSeo knows the hub path)", () => {
    expect(meta!.breadcrumbLd).toBeDefined();
    const crumbs = JSON.parse(meta!.breadcrumbLd!);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[1].item).toBe(url);
  });

  it("JSON-LD is [CollectionPage, FAQPage] listing every industry in hub order", () => {
    const ld = parseLd(meta!.jsonLd);
    expect(ld.map((x) => x["@type"])).toEqual(["CollectionPage", "FAQPage"]);

    const collection = ld[0];
    expect(collection["@id"]).toBe(`${url}#page`);
    expect(collection.url).toBe(url);
    expect(collection.name).toBe(INDUSTRY_HUB_H1);
    expect(collection.description).toBe(page.description);
    expect(collection.inLanguage).toBe("en-IN");
    expect(collection.isPartOf).toEqual({ "@id": `${SITE}/#website` });
    expect(collection.about).toEqual({ "@id": `${SITE}/#app` });
    expect(collection.publisher).toEqual({ "@id": `${SITE}/#organization` });

    const list = collection.mainEntity as { "@type": string; itemListElement: { "@type": string; position: number; name: string; url: string }[] };
    expect(list["@type"]).toBe("ItemList");
    expect(list.itemListElement).toHaveLength(INDUSTRIES.length);
    expect(list.itemListElement.map((i) => i.url)).toEqual(INDUSTRIES.map((i) => `${SITE}${industryPath(i.slug)}`));
    expect(list.itemListElement.map((i) => i.name)).toEqual(INDUSTRIES.map((i) => i.name));
    expect(list.itemListElement.map((i) => i.position)).toEqual(INDUSTRIES.map((_, n) => n + 1));

    const faq = ld[1];
    const questions = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(questions).toHaveLength(INDUSTRY_HUB_FAQS.length);
    expect(questions.map((q) => q.name)).toEqual(INDUSTRY_HUB_FAQS.map((f) => f.q));
    for (const q of questions) expect(q.acceptedAnswer.text).not.toMatch(/\*\*|\]\(/);
  });

  it("never carries listing, rating, review or how-to markup, and no internal brand names", () => {
    expect(meta!.jsonLd).not.toMatch(FORBIDDEN_TYPES);
    expect(JSON.stringify(meta)).not.toMatch(BRAND_LEAK);
  });
});

describe("hub publicSeo entry", () => {
  it("fits Indian mobile results: title ≤ 60, description ≤ 155", () => {
    const page = seoForPath(INDUSTRIES_PATH)!;
    expect(page.title.length).toBeLessThanOrEqual(60);
    expect(page.description.length).toBeLessThanOrEqual(155);
    expect(page.crumb).toBe("Industries");
  });
});
