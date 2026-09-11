/* Titles and descriptions for the free public tools.
 *
 * They live here because TWO things need them and they must not disagree:
 * PublicLayout keeps a path→SEO map and sets document.title on every route
 * change, and each tool page sets its own canonical link and JSON-LD. React
 * runs a child's effect BEFORE its parent's, so the layout would otherwise
 * overwrite whatever the page had just set, and the tools would ship with the
 * site's default title.
 *
 * Importing a constant is also why this is not simply exported from the page
 * modules: the layout must not pull a lazily-loaded page into the main bundle.
 */

export const SEO_EMAIL_SIGNATURE = {
  title: "Free Email Signature Generator — 14 Templates | DigitalCarda",
  description:
    "Create a professional email signature free. Fill in your details, pick from 14 designs, and copy it straight into Gmail, Outlook or Apple Mail. No sign-up needed.",
};

export const SEO_WHATSAPP_TEMPLATES = {
  title: "Free WhatsApp Business Message Templates — 12 Ready Replies | DigitalCarda",
  description:
    "Free WhatsApp Business greeting, away and quick-reply templates. Fill in your details, edit the wording, and copy them into WhatsApp Business. No sign-up needed.",
};
