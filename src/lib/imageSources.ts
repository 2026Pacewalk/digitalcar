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

/* What a design's picture actually shows, as alt text.

   Every design ships the same four views, and scripts/import-product-images.mjs
   names them by what they are, so the file name is enough to describe the
   picture. "Mockup 2 of 4" tells a screen-reader user nothing and gives Google
   Images nothing to index; this says what is in the frame.

   Anything else — an admin upload, a design with pictures out of this set —
   falls back to naming the design, which is still true of every picture of it. */
export function productImageAlt(src: string | null | undefined, name: string): string {
  const design = (name || "").trim() || "Digital business card";
  const file = String(src || "").toLowerCase();
  if (!/^\/products\//.test(file)) return `${design} — digital business card`;
  if (file.includes("-preview")) return `${design} on a phone beside its scan-to-connect QR code stand`;
  if (file.includes("-features")) return `${design}: no app to install, your own link and QR code, one-tap call, WhatsApp chat, lead capture and visitor analytics`;
  if (file.includes("-services")) return `The full ${design} page — services, photo gallery, Google reviews and enquiry form`;
  return `${design} open on a phone, showing one-tap call, WhatsApp and save-contact buttons`;
}
