import { useEffect } from "react";

/* Per-page title, description and social tags.
 *
 * This app renders client-side, so there is no server template to put these in
 * — each public page sets them on mount. The pattern was already copied by hand
 * across several pages; this is the same thing in one place, so a page cannot
 * accidentally ship without a canonical link or with a stale og:title.
 */

type Seo = {
  title: string;
  description: string;
  /** Path only, e.g. "/email-signature-generator". Made absolute here. */
  canonical?: string;
  /** JSON-LD, injected as a single <script> keyed by page. */
  jsonLd?: Record<string, unknown>;
};

const ORIGIN = "https://digitalcarda.in";
const LD_ID = "page-jsonld";

function setMeta(selector: string, attr: string, value: string): void {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr.startsWith("og:") || attr.startsWith("twitter:") ? "property" : "name", attr);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function usePageSeo({ title, description, canonical, jsonLd }: Seo): void {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', "description", description);
    setMeta('meta[property="og:title"]', "og:title", title);
    setMeta('meta[property="og:description"]', "og:description", description);
    setMeta('meta[property="og:type"]', "og:type", "website");

    if (canonical) {
      const href = canonical.startsWith("http") ? canonical : `${ORIGIN}${canonical}`;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
      setMeta('meta[property="og:url"]', "og:url", href);
    }

    // Replaced rather than appended, so navigating between pages cannot leave
    // two competing structured-data blocks in the document.
    document.getElementById(LD_ID)?.remove();
    if (jsonLd) {
      const s = document.createElement("script");
      s.id = LD_ID;
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
    return () => { document.getElementById(LD_ID)?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, JSON.stringify(jsonLd ?? null)]);
}
