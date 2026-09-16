/* Font Awesome, loaded only where the React app actually uses it.

   It used to be a <link> in index.html, which made every page (including the
   public marketing pages) wait on a render-blocking stylesheet that only the
   dashboard's social-link icons need (Social Links editor, Email Signature).
   Components that render FA classes call ensureFontAwesome() from a useEffect.

   Published cards are unaffected: they render in their own iframe documents,
   and each of those documents links its own copy of Font Awesome. */
export const FONT_AWESOME_HREF = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
const LINK_ID = "fa-css";

/** Append the Font Awesome stylesheet to <head> once. Safe to call repeatedly. */
export function ensureFontAwesome(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(LINK_ID)) return;
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = FONT_AWESOME_HREF;
  document.head.appendChild(link);
}
