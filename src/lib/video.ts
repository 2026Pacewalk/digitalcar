/* One place that understands the video links a customer can paste into their card.
   Supports YouTube (watch, youtu.be, /embed, /shorts, /live, /v), Instagram
   (reel / reels / p / tv), and a permissive "other" fallback for any http(s) link.

   YouTube exposes a public thumbnail (img.youtube.com); Instagram does not expose
   a stable logged-out thumbnail without a Facebook app token, so the card renders a
   branded Instagram tile for those instead of a fetched frame. */

export type VideoProvider = "youtube" | "instagram" | "other";

export type VideoInfo = {
  provider: VideoProvider;
  id: string;        // YouTube video id, Instagram shortcode, or "" for other
  url: string;       // the original watch/reel/page URL (safe to open in a new tab)
  embedUrl: string;  // iframe src for inline playback ("" when not embeddable)
  thumb: string;     // thumbnail image URL ("" when there is no fetchable image)
};

/* Parse any pasted link. Returns null only when the input is not a usable URL. */
export function parseVideo(raw: unknown): VideoInfo | null {
  const url = String(raw ?? "").trim();
  if (!url) return null;

  // YouTube — every common form, including Shorts and Live.
  const yt = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i,
  );
  if (yt) {
    const id = yt[1];
    return {
      provider: "youtube",
      id,
      url,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
      thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Instagram — reels, posts and IGTV.
  const ig = url.match(/instagram\.com\/(?:reels?|p|tv)\/([\w-]+)/i);
  if (ig) {
    const id = ig[1];
    return {
      provider: "instagram",
      id,
      url,
      embedUrl: `https://www.instagram.com/reel/${id}/embed/`,
      thumb: "", // no reliable logged-out thumbnail — the UI shows a branded tile
    };
  }

  // Any other http(s) link — accept it, open it in a new tab (no inline embed).
  if (/^https?:\/\/[^\s.]+\.[^\s]+/i.test(url)) {
    return { provider: "other", id: "", url, embedUrl: "", thumb: "" };
  }

  return null;
}

/* True when the pasted text is a video link we can attach to a card. */
export const isVideoUrl = (raw: unknown): boolean => parseVideo(raw) !== null;

/* Thumbnail image URL for a link, or "" when there is no fetchable image
   (Instagram / other → render a branded placeholder tile instead). */
export const videoThumb = (raw: unknown): string => parseVideo(raw)?.thumb ?? "";

/* Backwards-compatible helper: the YouTube id (or "") for a link. */
export const youtubeId = (raw: unknown): string => {
  const v = parseVideo(raw);
  return v && v.provider === "youtube" ? v.id : "";
};
