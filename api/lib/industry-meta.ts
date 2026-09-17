/*
 * Server-side <head> tags and structured data for the industry pages.
 *
 *   /industries          → CollectionPage listing every profession page, FAQPage;
 *                          BreadcrumbList through the layout's own element id
 *   /industries/:slug    → WebPage (audience, published/modified dates),
 *                          BreadcrumbList, FAQPage; og:type website
 *
 * Everything comes from src/data/industries — the same objects the page renders —
 * so the structured data always matches the visible page. These are information
 * pages, not listings: never Product, Offer, AggregateRating, Review or HowTo.
 *
 * Slugs match exactly (no lowercasing, no decoding). Anything else under
 * /industries/ returns null, and api/lib/vite.ts turns that into a real 404.
 */
import { INDUSTRIES, INDUSTRIES_PATH, INDUSTRY_HUB_FAQS, getIndustry, industryPath, plainText } from "../../src/data/industries";
import { seoForPath, breadcrumbJsonLd } from "../../src/lib/publicSeo";
import type { CardMeta } from "./card-og";

const SITE = "https://digitalcarda.in";
/** The site-wide 1200×630 banner: industry pages have no picture of their own. */
const OG_IMAGE = `${SITE}/og-default.jpg`;

/** Any single segment under /industries. Broad on purpose: the server decides
    200 vs 404 for every such path (unknown slug, wrong case, stray characters),
    so a customer card can never answer for one of these URLs. */
export const INDUSTRY_PATH = /^\/industries\/([^/]+)$/;

/** Indexable, with full-size image previews and unrestricted snippets. */
export const ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

/** An owner-chosen calendar date (YYYY-MM-DD) as a full timestamp in India time,
    so Google doesn't read it in its own time zone and shift the day. */
const istDate = (day: string) => `${day}T09:00:00+05:30`;

export const INDUSTRY_HUB_H1 = "Digital visiting cards for every profession";

// Entities PublicLayout defines once for the whole site, referenced by id.
const website = { "@id": `${SITE}/#website` };
const app = { "@id": `${SITE}/#app` };
const organization = { "@id": `${SITE}/#organization` };

// Google no longer shows FAQ rich results for most sites, but the questions are
// on the page and the markup describes them accurately.
const faqPage = (faqs: readonly { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plainText(f.a) } })),
});

/** Meta for /industries or an industry page, or null for any other path (or an unknown industry). */
export function industryMeta(pathname: string): CardMeta | null {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (clean === INDUSTRIES_PATH) {
    const page = seoForPath(INDUSTRIES_PATH);
    if (!page) return null;
    const url = `${SITE}${INDUSTRIES_PATH}`;
    const collection = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name: INDUSTRY_HUB_H1,
      description: page.description,
      inLanguage: "en-IN",
      isPartOf: website,
      about: app,
      publisher: organization,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: INDUSTRIES.map((i, n) => ({
          "@type": "ListItem", position: n + 1, name: i.name, url: `${SITE}${industryPath(i.slug)}`,
        })),
      },
    };
    return {
      title: page.title, description: page.description,
      image: OG_IMAGE, imageW: 1200, imageH: 630, imageType: "image/jpeg", imageAlt: "Digital visiting cards by profession",
      url, locale: "en_IN", h1: INDUSTRY_HUB_H1, robots: ROBOTS,
      jsonLd: JSON.stringify([collection, faqPage(INDUSTRY_HUB_FAQS)]),
      // The layout keeps this element in step on in-app navigation, because
      // publicSeo knows the hub path.
      breadcrumbLd: breadcrumbJsonLd(INDUSTRIES_PATH) ?? undefined,
    };
  }

  const m = INDUSTRY_PATH.exec(clean);
  if (!m) return null;
  const ind = getIndustry(m[1]);
  if (!ind) return null;

  const url = `${SITE}${industryPath(ind.slug)}`;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: ind.h1,
    description: ind.description,
    inLanguage: "en-IN",
    isPartOf: website,
    about: app,
    publisher: organization,
    audience: { "@type": "BusinessAudience", audienceType: ind.name },
    breadcrumb: { "@id": `${url}#breadcrumb` },
    datePublished: istDate(ind.publishedAt),
    dateModified: istDate(ind.updatedAt),
  };
  // Same trail the page shows: Home › Industries › this profession.
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: seoForPath(INDUSTRIES_PATH)?.crumb ?? "Industries", item: `${SITE}${INDUSTRIES_PATH}` },
      { "@type": "ListItem", position: 3, name: ind.crumb, item: url },
    ],
  };

  return {
    title: ind.seoTitle,
    description: ind.description,
    image: OG_IMAGE, imageW: 1200, imageH: 630, imageType: "image/jpeg", imageAlt: `${ind.name} digital visiting card: DigitalCarda`,
    url, ogType: "website", locale: "en_IN", h1: ind.h1, robots: ROBOTS,
    // The breadcrumb travels inside jsonLd (no element id): PublicLayout deletes
    // #dc-breadcrumb-ld on paths publicSeo doesn't know, and it doesn't know
    // the detail pages, so an id'd copy here would vanish after hydration.
    jsonLd: JSON.stringify([webPage, breadcrumb, faqPage(ind.faqs)]),
  };
}
