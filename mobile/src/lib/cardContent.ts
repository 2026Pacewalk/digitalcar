/* The card's content lists and their rules, mirroring the website's editors
   (src/pages/customer/Products.tsx, Media.tsx, Payments.tsx, Social.tsx and
   src/lib/video.ts, src/lib/socialPlatforms.ts) so a card edited in the app is
   exactly what the website would have written. */

export type Product = {
  id: number; name: string; filename: string; price: string; offer_price: string;
  description: string; button: string; button_title: string; isOffer?: boolean; valid?: string;
};
export type GalleryItem = { id: number; name: string; filename: string };
export type VideoItem = { id: number; title: string; url: string };
export type QrItem = { id: number; name: string; filename: string };
export type SocialLink = { platform: string; url: string };

export const DESC_MAX = 2000;

export const asList = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => String(v ?? "").trim();

/* ── Text ── */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

/** A description as plain text, the way the website's editor shows it. */
export function plainText(raw: unknown): string {
  return String(raw ?? "")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1)) || 32) : m))
    .replace(/[•\n]+/g, " · ")
    .replace(/\s*·\s*/g, " · ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export const hasMarkup = (raw: unknown) => /<[a-z][^>]*>/i.test(String(raw ?? ""));

/* ── Prices ── */

export const amount = (v: unknown) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const percentOff = (price: unknown, offer: unknown) => {
  const p = amount(price), o = amount(offer);
  return o > 0 && p > 0 && o < p ? Math.round(((p - o) / p) * 100) : 0;
};

/* ── Offers ── */

/** An offer's end date as the website stores it (YYYY-MM-DD). */
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const offerEnded = (valid?: string) => {
  const s = str(valid);
  if (!s) return false;
  const end = new Date(`${s}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
};

/* ── Buttons on services ── */

export const CTA_GROUPS: { label: string; options: string[] }[] = [
  { label: "Sales", options: ["Buy Now", "Order Now", "Shop Now", "Add to Cart", "Get Offer"] },
  { label: "Enquiry", options: ["Enquire Now", "Send Enquiry", "Get Quote", "Request Callback", "Know More", "Learn More"] },
  { label: "Booking", options: ["Book Now", "Book Appointment", "Book Site Visit", "Reserve Now"] },
  { label: "Contact", options: ["Call Now", "Contact Us", "WhatsApp Us", "Message Now", "Visit Us"] },
];
export const CTA_OPTIONS = CTA_GROUPS.flatMap((g) => g.options);

/** What a button with this label does on the live card. */
export function ctaHint(title: string) {
  const t = (title || "").toLowerCase();
  if (/call|phone|dial|ring/.test(t)) return "Dials your phone number";
  if (/whatsapp|chat/.test(t)) return "Opens WhatsApp with a ready message";
  if (/visit|map|location|direction|reach|near|store/.test(t)) return "Opens your Google Maps location";
  if (/mail|email/.test(t)) return "Opens the customer's email to you";
  if (/buy|order|shop|cart|book|reserve|site|web|learn|know|offer|quote|get/.test(t)) return "Opens your button link";
  return "Opens a WhatsApp enquiry";
}

/* ── Videos ── */

export type VideoInfo = { provider: "youtube" | "instagram" | "other"; id: string; thumb: string };

export function parseVideo(raw: unknown): VideoInfo | null {
  const url = str(raw);
  if (!url) return null;
  const yt = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return { provider: "youtube", id: yt[1], thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` };
  const ig = url.match(/instagram\.com\/(reels?|p|tv)\/([\w-]+)/i);
  if (ig) return { provider: "instagram", id: ig[2], thumb: "" };
  if (/^https?:\/\/[^\s.]+\.[^\s]+/i.test(url)) return { provider: "other", id: "", thumb: "" };
  return null;
}

/* ── Social profiles ── */

export type SocialPlatform = { key: string; label: string; color: string; placeholder: string };

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "facebook", label: "Facebook", color: "#1877F2", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", color: "#E4405F", placeholder: "https://instagram.com/yourhandle" },
  { key: "x", label: "X (Twitter)", color: "#000000", placeholder: "https://x.com/yourhandle" },
  { key: "youtube", label: "YouTube", color: "#FF0000", placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", placeholder: "https://linkedin.com/in/you" },
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", placeholder: "https://wa.me/919999999999" },
  { key: "telegram", label: "Telegram", color: "#229ED9", placeholder: "https://t.me/yourhandle" },
  { key: "tiktok", label: "TikTok", color: "#000000", placeholder: "https://tiktok.com/@you" },
  { key: "pinterest", label: "Pinterest", color: "#E60023", placeholder: "https://pinterest.com/you" },
  { key: "snapchat", label: "Snapchat", color: "#E8E100", placeholder: "https://snapchat.com/add/you" },
  { key: "github", label: "GitHub", color: "#181717", placeholder: "https://github.com/you" },
  { key: "behance", label: "Behance", color: "#1769FF", placeholder: "https://behance.net/you" },
  { key: "dribbble", label: "Dribbble", color: "#EA4C89", placeholder: "https://dribbble.com/you" },
  { key: "spotify", label: "Spotify", color: "#1DB954", placeholder: "https://open.spotify.com/artist/…" },
  { key: "twitch", label: "Twitch", color: "#9146FF", placeholder: "https://twitch.tv/you" },
  { key: "discord", label: "Discord", color: "#5865F2", placeholder: "https://discord.gg/invite" },
  { key: "website", label: "Website", color: "#0EA5E9", placeholder: "https://yourwebsite.com" },
];
export const SOCIAL_BY_KEY = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, p]));
/** Website is a repeatable custom link (up to 6); every other platform once. */
export const MAX_WEBSITE_LINKS = 6;

const LEGACY_SOCIAL_FIELDS = [
  { field: "facebook", key: "facebook" }, { field: "instagram", key: "instagram" },
  { field: "youtube", key: "youtube" }, { field: "twitter", key: "x" },
  { field: "pinterest", key: "pinterest" }, { field: "linkedin", key: "linkedin" },
];

/** The card's social links: the saved list, else the older one-per-platform fields. */
export function readSocialLinks(customer: Record<string, unknown> | undefined): SocialLink[] {
  const raw = customer?.social_links;
  if (raw !== undefined && raw !== null && raw !== "") {
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) {
        return arr
          .filter((x) => x && typeof x === "object")
          .map((x) => ({ platform: String((x as SocialLink).platform || ""), url: String((x as SocialLink).url || "").trim() }))
          .filter((x) => x.platform && x.url);
      }
    } catch { /* fall back to the older fields */ }
  }
  return LEGACY_SOCIAL_FIELDS
    .map(({ field, key }) => ({ platform: key, url: str(customer?.[field]) }))
    .filter((x) => x.url);
}

/** Web links need a scheme; a bare "instagram.com/x" is fixed up, anything else left alone. */
export function normaliseUrl(v: string) {
  const s = v.trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(s)) return `https://${s}`;
  return s;
}
