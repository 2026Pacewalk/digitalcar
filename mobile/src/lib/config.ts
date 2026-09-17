/* Where the app talks to. Production by default; point a development build at
   a local server with EXPO_PUBLIC_API_URL (e.g. http://192.168.1.20:3005 for a
   phone on the same Wi-Fi, http://localhost:3005 for the web preview). */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

export const API_URL = fromEnv || "https://digitalcarda.in";

/** Public card links always use the real domain, even against a local API,
    so a QR shown in development still opens a real card. */
export const SITE_URL = "https://digitalcarda.in";

export const SUPPORT_WHATSAPP = "919517722444";

export const cardUrl = (slug: string) => `${SITE_URL}/${slug}`;
export const qrUrl = (publicId: string | null | undefined, slug: string) =>
  publicId ? `${SITE_URL}/q/${publicId}` : cardUrl(slug);
