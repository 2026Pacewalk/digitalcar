import type { BlogPost } from "../types";

export const qrCodeBusinessCardVcard: BlogPost = {
  slug: "qr-code-business-card-vcard",
  title: "QR Code Business Cards and vCards: How to Let People Save Your Number in One Tap",
  seoTitle: "QR Code Business Card and vCard: Save Contacts in One Tap",
  description: "How QR code business cards and vCards work, why a card link usually beats a plain vCard QR, and how to set one up so people save your number in one tap.",
  excerpt: "There are two kinds of business card QR codes, and they behave very differently once printed. Here's which one to use, and how to make saving your number effortless.",
  category: "nfc-qr",
  keywords: ["qr code business card", "vcard", "business card qr code generator", "vcard qr code", "save contact qr code"],
  publishedAt: "2026-09-16",
  updatedAt: "2026-09-16",
  cover: { motif: "qr", tone: "navy" },
  takeaways: [
    "A vCard is a standard contact file (.vcf) that phones understand, so tapping it offers to save the contact.",
    "A vCard QR code stores your details inside the code itself — it can't be changed after printing.",
    "A link QR code opens your digital card, which has a Save Contact button — and you can update it any time.",
    "For anything you print, use a link QR. Keep the code large, high-contrast and tested.",
  ],
  intro: [
    "Everyone agrees a QR code on a business card is useful. What most people don't realise is that there are two very different kinds of business card QR codes, and choosing the wrong one means reprinting cards the next time your number changes.",
    "This guide explains vCards, the two kinds of QR codes, and how to set yours up so the person scanning ends up with your details properly saved — not a screenshot they'll never look at again.",
  ],
  sections: [
    {
      id: "vcard",
      heading: "First, what is a vCard?",
      blocks: [
        { type: "p", text: "A **vCard** is a small, standard file format for contact details — name, company, job title, phone numbers, email, website and address. The file usually ends in **.vcf**. Android phones, iPhones, Gmail and Outlook all understand it." },
        { type: "p", text: "When you open a vCard on a phone, it offers to **add the contact**. Everything lands in the right field. That's the magic: no typing, no \"Ramesh Plumber New\" in someone's phonebook." },
      ],
    },
    {
      id: "two-kinds",
      heading: "The two kinds of business card QR codes",
      blocks: [
        { type: "table", caption: "What happens when someone scans each type", head: ["", "vCard QR (details inside)", "Link QR (opens your card)"], rows: [
          ["What's stored", "Your contact details, encoded directly", "A short web link"],
          ["What the scanner sees", "An option to save the contact", "Your full digital card with a Save Contact button"],
          ["Change your number later?", "No — you must make and print a new code", "Yes — edit your card, the code keeps working"],
          ["Works without internet?", "Yes", "Needs mobile data or Wi-Fi to open"],
          ["Can show more?", "No — contact details only", "Photos, services, WhatsApp, maps, payments, reviews"],
          ["Code size", "Gets dense with more details, harder to scan", "Stays simple and easy to scan"],
        ] },
        { type: "p", text: "A vCard QR is fine for a one-off event badge. For anything you'll print in bulk or use for years, a link QR is almost always the better choice." },
      ],
    },
    {
      id: "best-of-both",
      heading: "The best setup: a link QR that saves a vCard",
      blocks: [
        { type: "p", text: "You don't actually have to choose. A [digital visiting card](/blog/what-is-a-digital-visiting-card) gives you a link QR code, and the card itself has a **Save Contact** button that downloads a proper vCard to the visitor's phone." },
        { type: "steps", items: [
          { title: "They scan your QR", text: "Your card opens in their browser — no app needed." },
          { title: "They see who you are", text: "Photo, what you do, services, and buttons to call or WhatsApp you." },
          { title: "They tap Save Contact", text: "Their phone offers to add you as a contact, with every field filled in correctly." },
          { title: "You stay editable", text: "Change your number next year, and the same printed QR code still saves the new one." },
        ] },
        { type: "tip", title: "Share without printing", text: "Send your card link on WhatsApp or put it in your [email signature](/email-signature-generator). The Save Contact button works the same way from a link." },
      ],
    },
    {
      id: "printing",
      heading: "How to print a QR code that scans every time",
      blocks: [
        { type: "checklist", items: [
          "Keep it at least 2 cm × 2 cm on a visiting card, and much larger on posters or standees",
          "Use dark code on a light background — never light on dark or low-contrast brand colours",
          "Leave a clear margin (the \"quiet zone\") of empty space around the code",
          "Avoid glossy lamination over the code if you can; glare stops scans",
          "Add a short line beside it: \"Scan to save my contact\"",
          "Test the printed proof with two or three different phones before the full print run",
        ] },
        { type: "tip", tone: "warn", title: "Don't use a temporary link", text: "Some free QR generators create short links that stop working after a trial ends. Make sure your QR points to a link you control, like your own card address." },
      ],
    },
    {
      id: "beyond-cards",
      heading: "Where else your QR code earns its keep",
      blocks: [
        { type: "p", text: "Once you have one QR code that opens your card, use it everywhere: shop counters, product packaging, invoices, delivery bags, exhibition banners and restaurant tables. Add your [Google review link](/blog/google-review-qr-code) to the card and the same code collects reviews too." },
        { type: "p", text: "For counters and meetings, pair it with an NFC tap — our [NFC business card guide](/blog/nfc-business-card-india) explains how." },
        { type: "cta", title: "Get your QR code and Save Contact button", text: "Every DigitalCarda card comes with its own QR code and a one-tap Save Contact button. Free for 30 days.", href: "/signup?promo=FREE30D", label: "Get my QR card free" },
      ],
    },
  ],
  faqs: [
    { q: "What is a vCard QR code?", a: "A QR code that stores contact details directly inside the code. Scanning it offers to save the contact, but the details can't be changed after the code is printed." },
    { q: "Which is better for a business card: a vCard QR or a link QR?", a: "A link QR is usually better. It opens your digital card with a Save Contact button, and you can update your details without reprinting the code." },
    { q: "What is a .vcf file?", a: "A .vcf file is a vCard — a standard contact file that phones and email apps can open to add a contact with all fields filled in." },
    { q: "How big should a QR code be on a visiting card?", a: "At least about 2 cm × 2 cm, dark on a light background, with clear empty space around it. Test the printed proof on a few phones." },
  ],
  related: ["nfc-business-card-india", "how-to-make-a-digital-visiting-card", "google-review-qr-code"],
};
