/* Lightweight GA4 event helper for the live DigitalCarda site.
   The live page already loads GA4 (G-ZQ76JQ5PY2) and GTM. We send events
   through gtag when it is available; if a tag manager-only build is ever used,
   the dataLayer fallback keeps the event available to GTM. */

type AnalyticsParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function isLiveDigitalCarda(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "digitalcarda.in" || host.endsWith(".digitalcarda.in");
}

function compact(params: AnalyticsParams): AnalyticsParams {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

/** Send one event to the production GA4 property. Never pollutes local/preview analytics. */
export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (!name || !isLiveDigitalCarda()) return;
  const payload = compact({ ...params, page_path: window.location.pathname });

  if (typeof window.gtag === "function") {
    window.gtag("event", name, payload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...payload });
}

/** Global lead-intent clicks so every page measures WhatsApp / phone / email / pricing CTAs. */
export function installLeadClickTracking(): () => void {
  if (typeof document === "undefined") return () => {};

  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!target) return;

    const rawHref = target.getAttribute("href") || "";
    const href = rawHref.trim();
    if (!href) return;

    if (/^https?:\/\/(?:api\.)?wa\.me\//i.test(href) || /^(?:https?:\/\/)?(?:www\.)?whatsapp\.com\//i.test(href)) {
      trackEvent("whatsapp_click", { link_url: href });
      return;
    }
    if (/^tel:/i.test(href)) {
      trackEvent("phone_click", { link_url: href });
      return;
    }
    if (/^mailto:/i.test(href)) {
      trackEvent("email_click", { link_url: href });
      return;
    }

    try {
      const url = new URL(href, window.location.origin);
      if (url.origin === window.location.origin && url.pathname === "/pricing") {
        trackEvent("pricing_cta_click", { link_url: url.pathname + url.search });
      }
    } catch {
      // Ignore malformed or non-navigation hrefs.
    }
  };

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
