// Single source of truth for where the legacy card images (logos, products,
// gallery, offers, QR codes, uploads) are served from. Override with
// VITE_IMG_BASE in .env to point at a different host (e.g. a local mirror).
export const IMG_BASE =
  import.meta.env.VITE_IMG_BASE || "https://digitalcarda.in/otdo-panel/uploads";

/* Re-point any absolute `…/otdo-panel/uploads/<path>` URL to the CURRENT image
   base. Stored card data (localStorage + published snapshots) bakes the full
   host into each image URL at hydration time; when that host later changes or
   goes away — e.g. a dev session baked a `127.0.0.1:8081` host, or images move
   between mirrors — those URLs break. Healing at read/render time keeps images
   working regardless of which base they were originally baked with. Non-upload
   URLs (data:, external images, YouTube thumbs) pass through unchanged. */
export function healUploadUrl(u: unknown): string {
  const s = String(u ?? "");
  const m = s.match(/^https?:\/\/[^/]+\/otdo-panel\/uploads\/(.+)$/);
  return m ? `${IMG_BASE}/${m[1]}` : s;
}
