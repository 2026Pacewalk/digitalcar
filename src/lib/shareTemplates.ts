/* WhatsApp message templates the super-admin sends to customers.

   These mirror the branded emails in api/lib/email-templates.ts
   (accountDetailsEmail / featureUpdateEmail) so a customer gets the same
   message whichever channel it arrives on.

   Two hard rules, learned the hard way:

   1. A URL always sits ALONE on its own line. WhatsApp only turns a URL into a
      tappable link when it can cleanly find the start of it — a label, colon or
      symbol in front of it on the same line can leave it as plain text.

   2. The CARD link comes FIRST. WhatsApp builds the link preview from the first
      URL it finds, so leading with the login link made every share preview the
      generic site instead of the customer's own branded card.

   3. No emoji. WhatsApp renders them with the DEVICE's own font, and some
      Windows / WhatsApp Web setups draw a replacement box for every one of
      them — even 2010-era emoji. WhatsApp's own *bold* and _italic_ plus line
      spacing carry the structure with nothing that can fail to render. */

const SITE = "https://digitalcarda.in";

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
    `Hi ${o.name || "there"},`,
    "",
    "Welcome to *DigitalCarda* — your digital business card is ready.",
    ...(o.company ? [`We're glad to have *${o.company}* on board.`] : []),
    "",
    ...(cardUrl ? ["*YOUR CARD LINK*", cardUrl, ""] : []),
    "*YOUR LOGIN*",
    `Email: ${o.loginEmail}`,
    ...(o.password ? [`Password: ${o.password}`] : []),
    "",
    "Sign in here:",
    `${SITE}/login`,
    "",
    ...(o.password ? ["_Please change your password after your first sign-in (Dashboard → Settings)._", ""] : []),
    "Share your card on WhatsApp, by email, or with your QR code — one link shows everything about your business.",
    "",
    "Need help setting it up? Just reply to this message.",
    "",
    "— Team DigitalCarda",
  ];
  return lines.join("\n");
}

/* Keep in step with FEATURE_HIGHLIGHTS in api/lib/email-templates.ts. */
const FEATURES: string[] = [
  "*Brand-new card editor* — everything on one screen with a live preview, and it saves itself",
  "*New premium designs* plus a Compact layout for long cards",
  "*Gallery & video layouts* — full-width or grid, stacked or swipe",
  "*Better services* — price, savings badge and buttons, or a compact icon list",
  "*Your brand colours* picked automatically from your logo, plus custom backgrounds",
  "*AI card generator* — paste your website link and we build the card",
  "*Tap-to-navigate address* with your Google Maps link",
  "*You control what shows* — QR, share, views, plan badge and section order",
];

/** "What's new" announcement for existing customers. */
export function featureUpdateWhatsApp(o: { name?: string | null; slug?: string | null }): string {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  const lines = [
    `Hi ${o.name || "there"},`,
    "",
    "Good news — your *DigitalCarda* card just got a big update:",
    "",
    ...FEATURES.map((t) => `• ${t}`),
    "",
    ...(cardUrl ? ["Your card (same link and QR):", cardUrl, ""] : []),
    "Open your dashboard:",
    `${SITE}/dashboard/build`,
    "",
    "It's all included in your current plan — nothing extra to pay.",
    "Reply here if you'd like a quick walkthrough.",
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
