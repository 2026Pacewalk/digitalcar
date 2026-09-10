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

/** Short by design: a phone message people actually read, with the card link
    first so it is both the preview and the point. */
export function accountDetailsWhatsApp(o: {
  name?: string | null;
  loginEmail: string;
  password?: string | null;
  slug?: string | null;
  company?: string | null;
}): string {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  return [
    `Hi ${o.name || "there"},`,
    "",
    `Your digital business card${o.company ? ` for *${o.company}*` : ""} is ready.`,
    ...(cardUrl ? ["", "*YOUR CARD*", cardUrl] : []),
    "",
    "*LOGIN*",
    o.loginEmail,
    ...(o.password ? [`Password: ${o.password}`] : []),
    `${SITE}/login`,
    "",
    "Share the link or your QR code — everything about your business in one tap.",
    "",
    "— Team DigitalCarda",
  ].join("\n");
}

/* Keep in step with FEATURE_HIGHLIGHTS in api/lib/email-templates.ts. */
const FEATURES: string[] = [
  "*New card editor* — one screen, live preview, saves itself",
  "*New premium designs* and a Compact layout",
  "*Your brand colours* picked from your logo",
  "*AI card generator* — paste your website, we build the card",
  "*Better gallery, videos and services* layouts",
];

/** "What's new" announcement for existing customers. */
export function featureUpdateWhatsApp(o: { name?: string | null; slug?: string | null }): string {
  const cardUrl = o.slug ? `${SITE}/${o.slug}` : "";
  const lines = [
    `Hi ${o.name || "there"},`,
    "",
    "Your *DigitalCarda* card just got a big update:",
    "",
    ...FEATURES.map((t) => `• ${t}`),
    ...(cardUrl ? ["", "Your card — same link, same QR:", cardUrl] : []),
    "",
    "See it here:",
    `${SITE}/dashboard/build`,
    "",
    "All included in your plan. Reply if you'd like a quick walkthrough.",
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
