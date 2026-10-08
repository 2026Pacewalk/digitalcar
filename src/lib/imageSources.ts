/* Lighter image formats for the artwork that ships with the site.

   Every design in public/products ships as PNG (300 KB – 1.7 MB each) and every
   article cover in public/blog as JPEG (~200 KB). scripts/gen-product-webp.mjs
   writes a .webp beside each of them, so a <picture> can offer the WebP first
   and keep the original as the fallback.

   Only those two folders get a WebP source: those are the files the script
   converts, and it must be re-run when one is added or replaced. Anything else
   (an admin upload, a remote URL) returns null, because a <source> that points
   at a missing file breaks the image instead of falling back. */
export function webpFor(src: string | null | undefined): string | null {
  if (!src) return null;
  const m = /^(\/(?:products|blog)\/[^?#]+)\.(?:png|jpe?g)$/i.exec(src);
  // og.jpg is the social banner, which the script leaves alone.
  return m && !/\/og$/i.test(m[1]) ? `${m[1]}.webp` : null;
}

/* The designs whose four pictures are known to be named for what they show.
   The mockup tool exported earlier batches in several different orders, so on
   those designs -preview may be the long page and -services the callout panel;
   only this batch was checked frame by frame (scripts/import-product-images.mjs,
   ORDER v2). Add a folder here only after looking at its four files. */
const DESCRIBED = new Set([
  "agency-stack", "bento-grid", "boarding-pass", "bold-circles", "chat-thread",
  "corporate-slate", "diagonal-split", "flip", "geo-yellow", "link-hub",
  "map-first", "pastel-portrait", "photo-frame", "poster-collage", "ribbon-wave",
  "sky-profile", "story-slides", "terminal", "timeline", "vinyl-player",
]);

/* What a design's picture shows, as alt text.

   "Mockup 2 of 4" tells a screen-reader user nothing and gives Google Images
   nothing to index. Where the file name is known to describe the frame, say
   what is in it; everywhere else name the design, which is true of every
   picture of it. Alt text that confidently describes the wrong picture is
   worse than alt text that says little. */
export function productImageAlt(src: string | null | undefined, name: string): string {
  const design = (name || "").trim() || "Digital business card";
  const generic = `${design} — digital business card`;
  const file = String(src || "").toLowerCase();
  const folder = /^\/products\/([^/]+)\//.exec(file)?.[1];
  if (!folder || !DESCRIBED.has(folder)) return generic;
  if (file.includes("-preview")) return `${design} on a phone beside its scan-to-connect QR code stand`;
  if (file.includes("-features")) return `${design}: no app to install, your own link and QR code, one-tap call, WhatsApp chat, lead capture and visitor analytics`;
  if (file.includes("-services")) return `The full ${design} page — services, photo gallery, Google reviews and enquiry form`;
  if (/-(showcase|thumb|\d)\./.test(file)) return generic;
  return `${design} open on a phone, showing one-tap call, WhatsApp and save-contact buttons`;
}
