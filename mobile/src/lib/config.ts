/* Where the app talks to. Production by default; point a development build at
   a local server with EXPO_PUBLIC_API_URL (e.g. http://192.168.1.20:3005 for a
   phone on the same Wi-Fi, http://localhost:3005 for the web preview). */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

export const API_URL = fromEnv || "https://digitalcarda.in";

/** Public card links always use the real domain, even against a local API,
    so a QR shown in development still opens a real card. */
export const SITE_URL = "https://digitalcarda.in";

export const SUPPORT_WHATSAPP = "919517722444";

/** Whether the app may point people to digitalcarda.in to buy or renew a plan.
    Store builds are a free companion to the web service: until in-app purchase
    exists, the App Store (guideline 3.1.3(f)) and Google Play don't allow an app
    to send people elsewhere to pay for a digital plan, so preview and production
    builds set EXPO_PUBLIC_PURCHASE_LINKS=off (eas.json) and show plan status only.
    Development builds keep the links for testing. Physical products (NFC cards)
    aren't affected. */
export const PURCHASE_LINKS = process.env.EXPO_PUBLIC_PURCHASE_LINKS !== "off";

/** "You've used all 20 photos on your plan." plus what the owner can do next. */
export const limitReached = (limit: number, what: string) =>
  `You've used all ${limit} ${what} on your plan. ${PURCHASE_LINKS ? "Remove one or upgrade to add more." : "Remove one to add another."}`;

export const cardUrl = (slug: string) => `${SITE_URL}/${slug}`;
export const qrUrl = (publicId: string | null | undefined, slug: string) =>
  publicId ? `${SITE_URL}/q/${publicId}` : cardUrl(slug);
