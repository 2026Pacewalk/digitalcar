/* Lighter image formats for the bundled template artwork.

   Every design in public/products ships as PNG (300 KB – 1.7 MB each).
   scripts/gen-product-webp.mjs writes a .webp beside each of them, so a
   <picture> can offer the WebP first and keep the PNG as the fallback.

   Only paths under /products/ get a WebP source: those are the files the script
   converts. Anything else (an admin upload, a remote URL) returns null, because
   a <source> that points at a missing file breaks the image instead of falling
   back to the PNG. */
export function webpFor(src: string | null | undefined): string | null {
  if (!src) return null;
  const m = /^(\/products\/[^?#]+)\.png$/i.exec(src);
  return m ? `${m[1]}.webp` : null;
}
