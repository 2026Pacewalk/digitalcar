import type { BlogPost } from "../types";

export const qrCodeBusinessCardVcard: BlogPost = {
  slug: "qr-code-business-card-vcard",
  title: "QR Code Business Cards and vCards: How to Let People Save Your Number in One Tap",
  seoTitle: "QR Code Business Card and vCard: Save Contacts in One Tap",
  description: "A QR code business card lets people save your number in one tap. See how vCard and link QR codes differ, and how to make one for your visiting card.",
  excerpt: "A QR code business card can hold your details inside the code (vCard QR) or open your digital card (link QR). Here's how they differ, which one to print, and how to make saving your number effortless.",
  category: "nfc-qr",
  keywords: ["qr code business card", "vcard qr code", "what is vcard file", "how to make qr code for visiting card", "vcard qr code generator free", "qr code for contact details", "save contact qr code", "business card qr code generator"],
  publishedAt: "2026-07-26",
  updatedAt: "2026-07-26",
  cover: { motif: "qr", tone: "navy" },
  image: { src: "/blog/qr-code-business-card-vcard.jpg", alt: "A printed card carrying a vCard QR code beside a phone showing the same contact as a full digital business card", width: 1600, height: 900 },
  takeaways: [
    "A vCard is a standard contact file (.vcf) that phones understand, so tapping it offers to save the contact.",
    "A vCard QR code stores your details inside the code itself — it can't be changed after printing.",
    "A link QR code opens your digital card, which has a Save Contact button — and you can update it any time.",
    "For anything you print, use a link QR. Keep the code at least 2 cm wide, dark on light, and tested.",
  ],
  intro: [
    "A **QR code business card** is a visiting card with a QR code people scan to get your contact details. There are two kinds: a vCard QR code, which stores your details inside the code and can't be changed, and a link QR code, which opens a digital card with a Save Contact button you can update any time.",
    "Choosing the wrong kind means reprinting cards the next time your number changes. This guide explains what a vCard file is, how the two QR codes compare, and how to make a QR code for your visiting card so the person scanning ends up with your details properly saved — not a screenshot they'll never look at again.",
  ],
  sections: [
    {
      id: "vcard",
      heading: "What is a vCard file?",
      blocks: [
        { type: "p", text: "A **vCard** is a small, [standard file format](https://www.rfc-editor.org/rfc/rfc6350.html) for contact details — name, company, job title, phone numbers, email, website and address. The file usually ends in **.vcf**. Android phones, iPhones, Gmail and Outlook all understand it." },
        { type: "p", text: "When you open a vCard on a phone, it offers to **add the contact**, with everything in the right field. No typing, and no \"Ramesh Plumber New\" in someone's phonebook." },
      ],
    },
    {
      id: "two-kinds",
      heading: "vCard QR code vs link QR code: which should your business card use?",
      blocks: [
        { type: "table", caption: "What happens when someone scans each type", head: ["", "vCard QR (details inside)", "Link QR (opens your card)"], rows: [
          ["What's stored", "Your contact details, encoded directly", "A short web link"],
          ["What the scanner sees", "An option to save the contact", "Your full digital card with a Save Contact button"],
          ["Change your number later?", "No — you must make and print a new code", "Yes — edit your card, the code keeps working"],
          ["Works without internet?", "Yes", "Needs mobile data or Wi-Fi to open"],
          ["Can show more?", "No — contact details only", "Photos, services, WhatsApp, payments, reviews"],
          ["Code size", "Gets dense with more details, harder to scan", "Stays simple and easy to scan"],
        ] },
        { type: "p", text: "If you only need a quick QR code for contact details on a one-off event badge, a vCard QR is fine. For anything you'll print in bulk or use for years, a link QR is almost always the better choice." },
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
        { type: "tip", title: "Share without printing", text: "Send your card link on WhatsApp or put it in your [email signature](/email-signature-generator). The Save Contact button works the same way from a link, something a [plain link-in-bio page](/blog/link-in-bio-vs-digital-business-card) isn't built for." },
        { type: "related", slug: "how-to-make-a-digital-visiting-card", note: "Ready to set this up? This step-by-step guide gets your card and QR code live in about ten minutes." },
      ],
    },
    {
      id: "printing",
      heading: "How to print a QR code on your visiting card so it scans every time",
      blocks: [
        { type: "checklist", items: [
          "Keep it at least 2 cm × 2 cm on a visiting card, and much larger on posters or standees",
          "Use dark code on a light background — never light on dark or low-contrast brand colours (more on this in our [design tips for readable visiting cards](/blog/visiting-card-design-ideas))",
          "Leave a clear margin (the [\"quiet zone\"](https://www.qrcode.com/en/howto/code.html)) of empty space around the code",
          "Avoid glossy lamination over the code if you can; glare stops scans",
          "Add a short line beside it: \"Scan to save my contact\"",
          "Test the printed proof with two or three different phones before the full print run",
        ] },
        { type: "tip", tone: "warn", title: "Don't use a temporary link", text: "Some free business card QR code generators create short links that stop working after a trial ends. Make sure your QR points to a link you control, like your own card address." },
      ],
    },
    {
      id: "beyond-cards",
      heading: "Where else your QR code earns its keep",
      blocks: [
        { type: "p", text: "Once you have one QR code that opens your card, use it everywhere: shop counters, product packaging, invoices, delivery bags, exhibition banners and restaurant tables. Add your [Google review link](/blog/google-review-qr-code) to the card and the same code collects reviews too." },
        { type: "p", text: "For counters and meetings, pair it with an NFC tap — our [NFC business card guide](/blog/nfc-business-card-india) explains how." },
        { type: "cta", title: "Get your QR code and Save Contact button", text: "Every DigitalCarda card comes with its own QR code and a one-tap Save Contact button. Free for 30 days, with no payment needed.", href: "/signup?promo=FREE30D", label: "Get my QR card free" },
      ],
    },
  ],
  faqs: [
    { q: "What is a vCard QR code?", a: "A vCard QR code is a QR code that stores your contact details directly inside the code. Scanning it offers to save the contact, even without internet, but the details can't be changed once the code is printed." },
    { q: "Which is better for a business card: a vCard QR or a link QR?", a: "A link QR code is usually better for a business card. It opens your digital card with a Save Contact button, and you can update your number or other details later without reprinting the code." },
    { q: "What is a vCard (.vcf) file?", a: "A vCard (.vcf) file is a standard contact file that Android phones, iPhones, Gmail and Outlook can open to add a contact with every field filled in." },
    { q: "How do I make a QR code for my visiting card?", a: "To make a QR code for your visiting card, create a digital card and place the QR code it gives you on your card design at 2 cm × 2 cm or larger. Every DigitalCarda card includes its own QR code and Save Contact button, free for 30 days." },
    { q: "Is there a free vCard QR code generator?", a: "Yes, many free online generators make vCard QR codes. A true vCard QR stores your details in the code itself, so it doesn't expire, but it can't be edited. If a free generator gives you a short link instead, check that the link won't stop working after a trial." },
    { q: "How big should a QR code be on a visiting card?", a: "A QR code on a visiting card should be at least about 2 cm × 2 cm. Print it dark on a light background, leave clear empty space around it, and test the printed proof on two or three phones." },
  ],
  related: ["nfc-business-card-india", "how-to-make-a-digital-visiting-card", "google-review-qr-code"],
};
