import type { BlogPost } from "../types";

export const googleReviewQrCode: BlogPost = {
  slug: "google-review-qr-code",
  title: "Google Review QR Code: How to Get More Reviews Without Awkwardly Asking",
  seoTitle: "Google Review QR Code: How to Get More Google Reviews",
  description: "Make a Google review QR code in five minutes, where to put it, what to say, and the Google review rules to follow so your reviews stay up.",
  excerpt: "Happy customers rarely leave reviews on their own — it's too many steps. A QR code cuts it to one. Here's how to make it, where to place it, and what to say.",
  category: "grow",
  keywords: ["google review qr code", "google review link", "how to get more google reviews", "qr code for google reviews"],
  publishedAt: "2026-09-16",
  updatedAt: "2026-09-16",
  cover: { motif: "stars", tone: "emerald" },
  takeaways: [
    "Get your review link from your Google Business Profile — look for \"Ask for reviews\" or \"Get more reviews\".",
    "Turn that link into a QR code and place it where customers are happiest: the billing counter, the table, the delivery bag.",
    "Ask at the right moment, in one friendly sentence. Timing matters more than wording.",
    "Never pay or reward people for reviews, and never ask only happy customers. Both break Google's rules.",
  ],
  intro: [
    "Here's the frustrating truth about reviews: your happiest customers usually don't leave one. Not because they don't want to, but because finding your business on Google, scrolling to reviews and tapping \"Write a review\" is just enough effort to put it off forever.",
    "A Google review QR code removes almost all of that effort. Scan, rate, write a line, done. This guide shows you how to set one up properly and use it without feeling pushy.",
  ],
  sections: [
    {
      id: "why-reviews",
      heading: "Why Google reviews matter so much for local businesses",
      blocks: [
        { type: "p", text: "When someone searches \"dentist near me\" or \"cake shop in Indore\", the businesses at the top of Google Maps are the ones they call. Your rating and the number of recent reviews are right there beside your name, and people compare them in seconds." },
        { type: "p", text: "Reviews also answer questions you never get to: Is parking easy? Do they deliver on time? Is the doctor patient with kids? Every honest review does a bit of selling for you." },
      ],
    },
    {
      id: "get-link",
      heading: "Step 1: Find your Google review link",
      blocks: [
        { type: "steps", items: [
          { title: "Open your Business Profile", text: "Sign in to the Google account that manages your business, then search your business name on Google or open it in the Google Maps app." },
          { title: "Find the review option", text: "Look for **Ask for reviews** or **Get more reviews**. Google changes the exact label now and then, but it's always in your profile's options." },
          { title: "Copy the link", text: "Google gives you a short link that opens the review box directly. Copy it and send it to yourself on WhatsApp so it's handy." },
          { title: "Test it", text: "Open the link on a phone that isn't signed in to your business account. The review box should appear for your business." },
        ] },
        { type: "tip", title: "No Business Profile yet?", text: "Create one first — it's free. Without it, customers can't review you on Google at all." },
      ],
    },
    {
      id: "make-qr",
      heading: "Step 2: Turn the link into a QR code",
      blocks: [
        { type: "p", text: "Any reliable QR generator can turn your review link into a QR code. Download it as a high-resolution PNG or SVG so it stays sharp when printed." },
        { type: "p", text: "There's a smarter option if you already have a digital visiting card: add your review link to the card. DigitalCarda cards can show a **Write a Review** button that opens your Google review page. Now one QR code does everything — customers save your number, message you, pay you and review you from the same place." },
        { type: "tip", tone: "warn", title: "Print test first", text: "Before you print a hundred stickers, print one, stick it where it'll go, and scan it from where a customer would stand. Glare, small size and bad lighting are the usual culprits." },
      ],
    },
    {
      id: "placement",
      heading: "Step 3: Put it where customers are happiest",
      blocks: [
        { type: "p", text: "The best place for a review QR code is wherever a customer feels good about you and has a free minute:" },
        { type: "table", head: ["Business", "Best spots"], rows: [
          ["Restaurant or café", "On the table, with the bill, at the pickup counter"],
          ["Salon or spa", "At the mirror station and the billing desk"],
          ["Clinic", "At reception on the way out, on the prescription folder"],
          ["Shop", "Billing counter, shopping bag, printed on the invoice"],
          ["Home services", "On the job card or invoice, sent on WhatsApp after the work is done"],
          ["Online orders", "A small card in the parcel"],
        ] },
        { type: "p", text: "A counter standee works especially well because customers see it while they wait. Our [NFC standee](/blog/nfc-business-card-india) lets them tap or scan to open your card and review button." },
      ],
    },
    {
      id: "what-to-say",
      heading: "Step 4: Ask at the right moment (and keep it short)",
      blocks: [
        { type: "p", text: "The QR code does the heavy lifting, but a friendly nudge makes the difference. Ask right after a good moment — when they compliment the food, thank you for the fix, or smile at their new haircut." },
        { type: "quote", text: "\"So glad you liked it! If you have a minute, a Google review really helps a small business like ours — just scan this.\"" },
        { type: "p", text: "For customers you serve remotely, send the link on WhatsApp the same day, while the experience is fresh. Our free [WhatsApp message templates](/whatsapp-message-templates) have polite follow-up messages you can adapt." },
      ],
    },
    {
      id: "rules",
      heading: "The rules: how not to lose your reviews",
      blocks: [
        { type: "p", text: "Google removes reviews that break its policies, and can restrict profiles that keep doing it. Keep it clean:" },
        { type: "checklist", items: [
          "Don't offer discounts, gifts or cashback in exchange for reviews",
          "Don't ask only happy customers — ask everyone, and let them say what they think",
          "Don't write reviews for your own business, or ask staff and family to",
          "Don't post many reviews from one device or location at once",
          "Do reply to reviews, especially the unhappy ones, calmly and helpfully",
        ] },
        { type: "p", text: "A mix of glowing and imperfect reviews, with thoughtful replies, looks far more trustworthy than a wall of five stars." },
        { type: "cta", title: "One QR code for calls, saves, payments and reviews", text: "Add your Google review link to a DigitalCarda card and print a single QR code. Free for 30 days.", href: "/signup?promo=FREE30D", label: "Try it free" },
      ],
    },
  ],
  faqs: [
    { q: "How do I get my Google review link?", a: "Sign in to the Google account that manages your Business Profile, open your business on Google Search or Maps, and choose \"Ask for reviews\" or \"Get more reviews\" to copy the link." },
    { q: "Is a Google review QR code free?", a: "Yes. The review link comes free with your Google Business Profile, and many tools can turn it into a QR code at no cost." },
    { q: "Can I give a discount to customers who leave a review?", a: "No. Google's policies don't allow offering incentives for reviews, and such reviews can be removed." },
    { q: "Where should I put my Google review QR code?", a: "Wherever customers are happiest and have a minute: the billing counter, tables, reception, invoices, shopping bags or a card in delivery parcels." },
  ],
  related: ["nfc-business-card-india", "qr-code-business-card-vcard", "digital-visiting-card-for-doctors"],
};
