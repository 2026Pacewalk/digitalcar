/* WhatsApp message templates the super-admin sends to customers.

   These mirror the branded emails in api/lib/email-templates.ts
   (accountDetailsEmail / featureUpdateEmail) so a customer gets the same
   message whichever channel it arrives on. WhatsApp has no HTML: *bold* and
   line breaks are the only formatting, so the copy is written for that. */

const SITE = "https://digitalcarda.in";

/* Two rules for these messages:
   1. A URL always sits alone on its own line. WhatsApp only linkifies a URL it
      can find the start of — a label or emoji in front of it can stop the link
      being tappable.
   2. Emoji stay within Unicode 6.0 (2010) and carry no variation
      selectors. WhatsApp renders with the device's own emoji font, and Windows
      Segoe UI Emoji / older Android have no glyph for newer code points — they
      draw a replacement box. Anything from 2014 onwards is a gamble. */

/** Everything a new customer needs: greeting, login, card link. */
export function accountDetailsWhatsApp(o: {
  name?: string | null;
  loginEmail: string;
  password?: string | null;
  slug?: string | null;
  company?: string | null;
}): string {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  const lines = [
    `Hi ${o.name || "there"} 👋`,
    "",
    `Welcome to *DigitalCarda* — your digital business card is ready! 🎉`,
    ...(o.company ? [`We're glad to have *${o.company}* on board.`] : []),
    "",
    "*Your login details*",
    `📧 Email: ${o.loginEmail}`,
    ...(o.password ? [`🔑 Password: ${o.password}`] : []),
    "",
    "🔗 Sign in here:",
    `${SITE}/login`,
    ...(cardUrl ? ["", "📇 *Your card link*", cardUrl] : []),
    "",
    ...(o.password ? ["_Please change your password after your first sign-in (Dashboard → Settings)._", ""] : []),
    "Share your card on WhatsApp, email or with your QR code — one link shows everything about your business.",
    "",
    "Need help setting it up? Just reply to this message",
    "",
    "— Team DigitalCarda",
    SITE,
  ];
  return lines.join("\n");
}

/* Keep in step with FEATURE_HIGHLIGHTS in api/lib/email-templates.ts. */
const FEATURES: [string, string][] = [
  ["🎨", "*Brand-new card editor* — everything on one screen with a live preview, and it saves itself"],
  ["✨", "*New premium designs* + a Compact layout for long cards"],
  ["📷", "*Gallery & video layouts* — full-width or grid, stacked or swipe"],
  ["💼", "*Better services* — price, savings badge & buttons, or a compact icon list"],
  ["🌈", "*Your brand colours* picked automatically from your logo, plus custom backgrounds"],
  ["⚡", "*AI card generator* — paste your website link and we build the card"],
  ["📍", "*Tap-to-navigate address* with your Google Maps link"],
  ["🔧", "*You control what shows* — QR, share, views, plan badge & section order"],
];

/** "What's new" announcement for existing customers. */
export function featureUpdateWhatsApp(o: { name?: string | null; slug?: string | null }): string {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  const lines = [
    `Hi ${o.name || "there"} 👋`,
    "",
    `Good news — your *DigitalCarda* card just got a big update ✨`,
    "",
    ...FEATURES.map(([icon, text]) => `${icon} ${text}`),
    "",
    "👉 Open your dashboard:",
    `${SITE}/dashboard/build`,
    ...(cardUrl ? ["", "📇 Your card (same link & QR):", cardUrl] : []),
    "",
    "It's all included in your current plan — nothing extra to pay.",
    "Reply here if you'd like a quick walkthrough",
    "",
    "— Team DigitalCarda",
  ];
  return lines.join("\n");
}

/** wa.me deep link. Digits only; India assumed when no country code is given. */
export function whatsappLink(phone: string, message: string): string {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;            // bare Indian mobile
  d = d.replace(/^0+/, "");
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}
