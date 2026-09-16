import type { BlogPost } from "../types";

export const nfcBusinessCardIndia: BlogPost = {
  slug: "nfc-business-card-india",
  title: "NFC Business Cards in India: How They Work, What They Cost, and Whether You Need One",
  seoTitle: "NFC Business Card in India: How It Works and Price",
  description: "How NFC business cards work, which phones can read them, what they cost in India, and when a printed QR code does the same job. A practical, no-hype guide.",
  excerpt: "Tap a card on a phone and your details pop up. It feels like magic, but it's simple tech. Here's how NFC cards work, what they cost, and who they're worth it for.",
  category: "nfc-qr",
  keywords: ["nfc business card", "nfc visiting card", "nfc card price", "pvc visiting card", "smart visiting card"],
  publishedAt: "2026-09-16",
  updatedAt: "2026-09-16",
  cover: { motif: "nfc", tone: "violet" },
  takeaways: [
    "An NFC business card has a tiny chip that opens a link when tapped on a phone. It doesn't need a battery or an app.",
    "Most recent Android phones and iPhones from the XS/XR onward can read it, but a QR code on the back covers everyone else.",
    "The chip only stores a link to your digital card, so you can change your details without replacing the card.",
    "DigitalCarda's NFC PVC card is ₹499 (printed both sides) and the NFC standee is ₹1,499, with free delivery across India.",
  ],
  intro: [
    "You've probably seen it happen: someone taps a sleek card against a phone, and a full contact page opens. No typing, no scanning, no app. It's a lovely moment, and it tends to start a conversation.",
    "But is an NFC business card worth buying, or is it a gimmick? This guide explains how they actually work, which phones read them, what they cost in India, and how to decide.",
  ],
  sections: [
    {
      id: "how-it-works",
      heading: "How does an NFC business card work?",
      blocks: [
        { type: "p", text: "NFC stands for Near Field Communication. It's the same short-range technology behind tap-to-pay. Inside the card sits a small chip and antenna. When a phone with NFC comes within a few centimetres, it powers the chip for a moment and reads what's stored on it." },
        { type: "p", text: "On a business card, what's stored is usually just **a web link** — the address of your digital visiting card. The phone sees the link and offers to open it. That's it. No battery, no charging, nothing to wear out except the card itself." },
        { type: "tip", title: "Why a link, not your details?", text: "If the chip held your phone number directly, you'd need a new card every time it changed. Storing a link to your [digital visiting card](/blog/what-is-a-digital-visiting-card) means you edit the card online and the NFC card keeps working forever." },
      ],
    },
    {
      id: "phones",
      heading: "Which phones can read an NFC card?",
      blocks: [
        { type: "p", text: "Most mid-range and flagship Android phones sold in the last few years have NFC. Many budget phones don't, and some people keep NFC switched off in settings. On iPhones, the iPhone XS, XR and later can read NFC tags without opening any app." },
        { type: "p", text: "In practice this means NFC works for many — but not all — of the people you'll meet. That's why a good NFC card always carries **a QR code on the back**. Tap if the phone supports it, scan if it doesn't. Nobody is left out." },
        { type: "steps", items: [
          { title: "Unlock the phone", text: "Most phones only read NFC when the screen is on and unlocked." },
          { title: "Tap near the top of the back", text: "The NFC antenna usually sits near the camera on iPhones and around the middle-back on many Androids. Hold the card there for a second." },
          { title: "Open the notification", text: "A pop-up or notification appears with your link. One tap opens your card." },
        ] },
      ],
    },
    {
      id: "price",
      heading: "What does an NFC business card cost in India?",
      blocks: [
        { type: "p", text: "Prices depend mostly on the material. Printed PVC cards are the most affordable and feel like a bank card. Metal and wooden cards look more premium and cost more. Some sellers also bundle a yearly profile subscription, so compare what's actually included, not just the card price." },
        { type: "table", caption: "DigitalCarda NFC products", head: ["Product", "Price", "What you get"], rows: [
          ["NFC PVC Card", "₹499 per card", "Full-colour print on both sides, NFC chip plus a QR code on the back"],
          ["NFC Standee", "₹1,499 per standee", "Counter standee printed on one side, tap or scan to open your card"],
          ["Delivery", "Free", "Pan-India, usually 3–7 working days"],
        ] },
        { type: "p", text: "Both open your DigitalCarda digital card, so every update you make online shows up instantly. You can order them from your dashboard, and the details are on our [pricing page](/pricing)." },
      ],
    },
    {
      id: "nfc-vs-qr",
      heading: "NFC card vs QR code: do you need both?",
      blocks: [
        { type: "table", head: ["", "NFC tap", "QR code"], rows: [
          ["Works on", "Phones with NFC switched on", "Any phone with a camera"],
          ["Speed", "Instant — just tap", "Open camera, point, tap the link"],
          ["Impression", "Memorable, feels premium", "Familiar and practical"],
          ["Cost", "Needs a chip card or standee", "Free to print anywhere"],
        ] },
        { type: "p", text: "They're not rivals. NFC is the nicer experience when it works; QR is the safety net that always works. Put both on the same card and you get the best of each. If you only want a QR for now, our guide to [QR code business cards and vCards](/blog/qr-code-business-card-vcard) explains how to set it up well." },
      ],
    },
    {
      id: "worth-it",
      heading: "Is an NFC business card worth it for you?",
      blocks: [
        { type: "p", text: "It's worth it if you meet people face to face often and first impressions matter — sales, real estate, consultants, founders at events. A **standee** is worth it for any counter where customers wait: shops, salons, clinics, restaurants. They can save your number, leave a Google review or pay you without asking." },
        { type: "p", text: "It's probably not worth it if nearly all your business happens on WhatsApp and you rarely meet customers. A digital card link and a printed QR code will do the job." },
        { type: "tip", tone: "warn", title: "Before you order", text: "Make your digital card first and check it looks right on a phone. The NFC card only opens what's there, so the card itself is what makes the impression." },
        { type: "cta", title: "Start with the card, add NFC when you're ready", text: "Build your digital visiting card free for 30 days. Order an NFC card or standee from your dashboard whenever you like.", href: "/signup?promo=FREE30D", label: "Start free for 30 days" },
      ],
    },
  ],
  faqs: [
    { q: "Does an NFC business card need a battery or an app?", a: "No. The chip is powered for a moment by the phone that taps it, and the phone opens the stored link in its browser without any app." },
    { q: "Can iPhones read NFC business cards?", a: "Yes. The iPhone XS, XR and later can read NFC tags without opening an app. The phone needs to be unlocked." },
    { q: "What happens if someone's phone doesn't have NFC?", a: "They scan the QR code printed on the card instead. It opens the same digital card." },
    { q: "Can I update my details without buying a new NFC card?", a: "Yes. The card stores a link to your digital card, so any change you make online appears the next time someone taps." },
    { q: "How much is an NFC visiting card on DigitalCarda?", a: "The NFC PVC card is ₹499 per card, printed on both sides, and the NFC standee is ₹1,499. Delivery is free across India and usually takes 3–7 working days." },
  ],
  related: ["qr-code-business-card-vcard", "what-is-a-digital-visiting-card", "google-review-qr-code"],
};
