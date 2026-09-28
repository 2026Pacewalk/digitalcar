import { useMemo } from "react";

/* An email's HTML as the recipient sees it, for the admin pages that show one
   (Email Log → View, Customers → Send email).

   A sandboxed iframe with no scripts and its own origin, so nothing in an email
   body, stored or freshly built, can run code in the admin session. Links open
   in a new tab instead of inside the frame. The frame can't read the email's
   height (that needs allow-same-origin), so it scrolls inside; give it a
   height through className. */

export type EmailDevice = "desktop" | "phone";

export default function EmailFrame({ html, device, title, className = "" }: {
  html: string; device: EmailDevice; title: string; className?: string;
}) {
  const srcDoc = useMemo(() => {
    if (!html) return "";
    return /<head[^>]*>/i.test(html)
      ? html.replace(/<head([^>]*)>/i, (_m, a) => `<head${a}><base target="_blank">`)
      : `<base target="_blank">${html}`;
  }, [html]);

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className={`rounded-xl bg-white shadow-sm ring-1 ring-[#E2E8F0] transition-[width] duration-300 ${device === "phone" ? "w-[380px] max-w-full" : "w-full max-w-[760px]"} ${className}`}
    />
  );
}
