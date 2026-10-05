/* Google Tag Manager (container GTM-PK44T5J9) is in index.html as Google's own
   snippet, unmodified: Merchant Center / Search Console verify the site by
   finding that exact code in the page, so it can't be wrapped in a hostname
   check the way the GA4 tag above it is.

   Instead the page is served with the snippet only on the live site. Local
   dev, previews and customers' own domains get the page without it, so they
   never report into the container. */

/** digitalcarda.in and its subdomains (www). A port is ignored. */
export function isLiveHost(host: string | null | undefined): boolean {
  const name = String(host || "").trim().toLowerCase().replace(/:\d+$/, "");
  return name === "digitalcarda.in" || name.endsWith(".digitalcarda.in");
}

// Google's comment markers delimit both halves of the snippet.
const HEAD_BLOCK = /[ \t]*<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->[ \t]*\r?\n?/;
const BODY_BLOCK = /[ \t]*<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->[ \t]*\r?\n?/;

/** The page without the Tag Manager snippet (both halves). */
export function withoutTagManager(html: string): string {
  return html.replace(HEAD_BLOCK, "").replace(BODY_BLOCK, "");
}

/** The page as this host should get it: untouched on the live site, without
    the snippet anywhere else. */
export function pageForHost(html: string, host: string | null | undefined): string {
  return isLiveHost(host) ? html : withoutTagManager(html);
}
