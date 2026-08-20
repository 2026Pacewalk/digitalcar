/* Deep-analytics enrichment helpers.

   Turns a bare tracking beacon into a useful analytics row: which device, which
   browser, where the visitor came from, and a stable-but-anonymous visitor key.

   PRIVACY (India DPDP-friendly, Plausible-style):
   - We never store an IP address, and never read one into a row.
   - `visitorId` starts life as a random first-party id the visitor's own browser
     generated (see PublicCard.tsx). We additionally hash it with a server secret
     before storage, so even a database dump cannot be correlated back to the
     value held in any browser.
   - Geo is coarse (country + city) and comes from the CDN edge headers that are
     already attached to the request — we do no IP lookups ourselves.
   - No cross-site identifiers, no ad-tech, no cookies added. */

import { createHash } from "node:crypto";

export type UaInfo = { device: string; os: string; browser: string };

/* Deliberately small UA parser — a full UA library is a large dependency for a
   hot request path, and we only need three coarse buckets for reporting. */
export function parseUa(uaRaw: string): UaInfo {
  const ua = String(uaRaw || "");
  const l = ua.toLowerCase();

  // Tablets must be tested BEFORE phones: an iPad's UA contains neither
  // "mobile" nor "android" reliably, and many Android tablets say "android"
  // without "mobile".
  const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  const isMobile = !isTablet && /mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua);
  const device = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let os = "Other";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod|ios/i.test(ua)) os = "iOS";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Order matters — Edge/Opera/Brave all contain "Chrome", and Chrome contains
  // "Safari". Test the most specific first.
  let browser = "Other";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/whatsapp/i.test(l)) browser = "WhatsApp";

  return { device, os, browser };
}

/* Where did this visit come from?

   Two inputs, in priority order:
   1. An explicit `src` tag we control — the QR image and every share button
      append one (?src=qr, ?src=whatsapp), which is the only reliable signal for
      QR scans and for apps that strip the referrer.
   2. The referrer host. */
const SRC_ALLOW = new Set([
  "qr", "whatsapp", "instagram", "facebook", "linkedin", "twitter", "telegram",
  "youtube", "google", "email", "sms", "nfc", "bio", "direct", "share", "copy",
]);

export function deriveSource(referrerRaw: string, srcTag?: string): string {
  const tag = String(srcTag || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 32);
  if (tag && SRC_ALLOW.has(tag)) return tag;

  const ref = String(referrerRaw || "").toLowerCase();
  if (!ref) return "direct";
  let host = ref;
  try { host = new URL(ref).hostname.toLowerCase(); } catch { /* keep raw */ }

  if (/wa\.me|whatsapp/.test(host)) return "whatsapp";
  if (/instagram/.test(host)) return "instagram";
  if (/facebook|fb\.com|fb\.me/.test(host)) return "facebook";
  if (/linkedin|lnkd\.in/.test(host)) return "linkedin";
  if (/twitter|t\.co|x\.com/.test(host)) return "twitter";
  if (/telegram|t\.me/.test(host)) return "telegram";
  if (/youtube|youtu\.be/.test(host)) return "youtube";
  if (/google|bing|duckduckgo|yahoo/.test(host)) return "google";
  if (/mail\.|gmail|outlook|zoho/.test(host)) return "email";
  // Our own site (someone browsing from the marketplace/dashboard preview).
  if (/digitalcarda/.test(host)) return "internal";
  return "referral";
}

/* Anonymise the browser-generated visitor id before it is stored.
   Salted with a server secret so stored values can't be matched to any value a
   browser holds. Truncated — 32 hex chars is ample to avoid collisions here. */
export function hashVisitor(raw: string, salt: string): string | null {
  const v = String(raw || "").trim();
  if (!v) return null;
  return createHash("sha256").update(salt + "|" + v).digest("hex").slice(0, 32);
}

/* Coarse geo straight from the CDN edge (Cloudflare in production). We only ever
   read headers that are already on the request; we never resolve an IP. */
export function edgeGeo(header: (name: string) => string | undefined | null): { country: string | null; city: string | null } {
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = header(n);
      if (v && String(v).trim() && String(v).trim() !== "XX") return String(v).trim();
    }
    return "";
  };
  const country = pick("cf-ipcountry", "x-vercel-ip-country", "x-geo-country").slice(0, 2).toUpperCase();
  // Cloudflare only sends city on some plans — absent is fine, the column is nullable.
  const cityRaw = pick("cf-ipcity", "x-vercel-ip-city", "x-geo-city");
  let city = "";
  try { city = decodeURIComponent(cityRaw); } catch { city = cityRaw; }
  return { country: country || null, city: city ? city.slice(0, 64) : null };
}

/* Every event type the public card may report.

   The first group is the original set (kept for backwards compatibility with
   rows already in the table); the rest are the deeper signals added so owners
   can see WHAT works, not just THAT something happened. */
export const TRACK_TYPES = [
  // original
  "view", "call", "whatsapp", "email", "website", "directions", "save_contact",
  "qr_scan", "product", "share", "social", "enquiry",
  // engagement depth
  "section_view",     // label = section id (about/services/gallery/video/…)
  "scroll",           // label = 25 | 50 | 75 | 100
  "time_on_card",     // durationMs = ms the card was actually visible
  "card_exit",
  // content interest — label carries WHICH item
  "product_click", "product_enquiry", "offer_click", "catalogue_view",
  "gallery_open", "gallery_image", "video_play", "brochure",
  "review_click", "review_write",
  // contact & sharing intent
  "social_click",     // label = platform
  "share_channel",    // label = whatsapp/facebook/copy/native
  "copy_link", "map_click", "vcard_download",
  // payments
  "pay_click", "upi_copy", "bank_copy", "payment_qr",
  // enquiry funnel (start → submit lets us show drop-off)
  "enquiry_start",
] as const;

export const TRACK_TYPE_SET: ReadonlySet<string> = new Set(TRACK_TYPES);
