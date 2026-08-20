/* Shared catalogue of social platforms for the flexible "Follow Us" links.
 * Used by BOTH the card renderer (buildCard.ts — needs the Font Awesome class /
 * inline SVG + brand colour) and the dashboard editor (Social.tsx — needs the
 * label, colour and placeholder). Keep it framework-free so buildCard can import
 * it without React.
 *
 * `fa`  – Font Awesome 5.12 class (what the card loads). Omit when FA5 has no
 *         glyph and use `svg` (a raw inline SVG string, fill=currentColor).
 * `color` – official brand colour (used in "brand" icon mode).
 * `fg`  – icon colour on the brand background (defaults to #fff; set for light
 *         brands like Snapchat where white would vanish).
 */
export type SocialPlatform = { key: string; label: string; color: string; fg?: string; fa?: string; svg?: string; ph: string };

// Inline SVGs for brands Font Awesome 5.12 predates.
const X_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.21-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.16 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>`;
const TIKTOK_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z"/></svg>`;

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "facebook",  label: "Facebook",  color: "#1877F2", fa: "fab fa-facebook-f",     ph: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", color: "#E4405F", fa: "fab fa-instagram",      ph: "https://instagram.com/yourhandle" },
  { key: "x",         label: "X (Twitter)", color: "#000000", svg: X_SVG,                ph: "https://x.com/yourhandle" },
  { key: "youtube",   label: "YouTube",   color: "#FF0000", fa: "fab fa-youtube",        ph: "https://youtube.com/@yourchannel" },
  { key: "linkedin",  label: "LinkedIn",  color: "#0A66C2", fa: "fab fa-linkedin-in",    ph: "https://linkedin.com/in/you" },
  { key: "whatsapp",  label: "WhatsApp",  color: "#25D366", fa: "fab fa-whatsapp",       ph: "https://wa.me/919999999999" },
  { key: "telegram",  label: "Telegram",  color: "#229ED9", fa: "fab fa-telegram-plane", ph: "https://t.me/yourhandle" },
  { key: "tiktok",    label: "TikTok",    color: "#000000", svg: TIKTOK_SVG,             ph: "https://tiktok.com/@yourhandle" },
  { key: "pinterest", label: "Pinterest", color: "#E60023", fa: "fab fa-pinterest-p",    ph: "https://pinterest.com/you" },
  { key: "snapchat",  label: "Snapchat",  color: "#FFFC00", fg: "#111", fa: "fab fa-snapchat-ghost", ph: "https://snapchat.com/add/you" },
  { key: "github",    label: "GitHub",    color: "#181717", fa: "fab fa-github",         ph: "https://github.com/you" },
  { key: "behance",   label: "Behance",   color: "#1769FF", fa: "fab fa-behance",        ph: "https://behance.net/you" },
  { key: "dribbble",  label: "Dribbble",  color: "#EA4C89", fa: "fab fa-dribbble",       ph: "https://dribbble.com/you" },
  { key: "spotify",   label: "Spotify",   color: "#1DB954", fa: "fab fa-spotify",        ph: "https://open.spotify.com/artist/…" },
  { key: "twitch",    label: "Twitch",    color: "#9146FF", fa: "fab fa-twitch",         ph: "https://twitch.tv/you" },
  { key: "discord",   label: "Discord",   color: "#5865F2", fa: "fab fa-discord",        ph: "https://discord.gg/invite" },
  { key: "website",   label: "Website",   color: "#0EA5E9", fa: "fa fa-globe",           ph: "https://yourwebsite.com" },
];

export const SOCIAL_BY_KEY: Record<string, SocialPlatform> =
  Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, p]));

// Legacy fixed fields on the customer record → catalogue keys, so cards saved
// before the flexible editor keep working (twitter is now "x").
export const LEGACY_SOCIAL_FIELDS: { field: string; key: string }[] = [
  { field: "facebook", key: "facebook" }, { field: "instagram", key: "instagram" },
  { field: "youtube", key: "youtube" }, { field: "twitter", key: "x" },
  { field: "pinterest", key: "pinterest" }, { field: "linkedin", key: "linkedin" },
];

export type SocialLink = { platform: string; url: string };

/** Normalise whatever is stored (new JSON array or legacy fields) into a list. */
export function readSocialLinks(rec: Record<string, unknown>): SocialLink[] {
  const raw = rec.social_links;
  if (raw !== undefined && raw !== null && raw !== "") {
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      // A present, valid array wins outright (even if empty) — so a user who
      // clears every link isn't shown the old legacy fields again.
      if (Array.isArray(arr)) {
        return arr
          .filter((x) => x && typeof x === "object")
          .map((x) => ({ platform: String((x as SocialLink).platform || ""), url: String((x as SocialLink).url || "").trim() }))
          .filter((x) => x.platform && x.url);
      }
    } catch { /* fall through to legacy */ }
  }
  return LEGACY_SOCIAL_FIELDS
    .map(({ field, key }) => ({ platform: key, url: String(rec[field] ?? "").trim() }))
    .filter((x) => x.url);
}
