import type { IndustryPage } from "../types";

/* Boutiques & Clothing Stores. Share flow: counter-qr (QR standee at the billing
   counter, scanned while the bill is being made). */
export const boutiques: IndustryPage = {
  slug: "boutiques",
  name: "Boutiques & Clothing Stores",
  crumb: "Boutiques",
  audience: "boutiques",
  group: "shops-food-travel",
  order: 13,

  h1: "Digital Visiting Card for Boutiques",
  seoTitle: "Boutique Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for your boutique: new arrivals as photos and reels, WhatsApp, offers, directions and Instagram. Free for 30 days.",
  excerpt: "New arrivals as photos and reels, WhatsApp, offers with end dates and your payment QR, scanned at the counter.",
  answer: "A **digital visiting card for boutiques** is one link with your shop name, address, new arrivals as photos and reels, and buttons to WhatsApp, call, get directions or save your number. Customers open it by scanning the QR at your billing counter or from a link you send, and follow your Instagram from the same page.",
  primaryKeyword: "boutique visiting card",
  keywords: [
    "boutique visiting card design",
    "visiting card for boutique shop",
    "visiting card for ladies boutique",
    "visiting card for clothing brand",
    "visiting card for kurti shop",
  ],
  searchTerms: ["boutique", "clothing", "kurti", "saree", "fashion", "garments"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#C026D3", ink: "#A21CAF", icon: "shirt", motif: "stitch" },

  sample: {
    name: "Aara Boutique",
    role: "Ethnic & designer wear",
    org: "Aara Boutique",
    services: ["New arrivals", "Custom stitching", "Bridal wear"],
  },

  pains: [
    {
      pain: "\"New collection aaya?\" And you forward the same twenty photos into every chat, one by one.",
      fix: "Put new arrivals in a **photo gallery** that opens full screen. One link shows the whole rack: 20 photos on Gold, 60 on Platinum.",
      feature: "gallery",
    },
    {
      pain: "A Diwali discount printed on your paper card is still walking in a month after it ended.",
      fix: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires, so nobody argues at the counter.",
      feature: "offers",
    },
    {
      pain: "A customer ordering on WhatsApp asks how to pay, and you hunt for a screenshot of your QR.",
      fix: "Your card shows your **payment QR** and Paytm, PhonePe or Google Pay number. They scan or copy it; the money goes straight to you.",
      feature: "paymentQr",
    },
  ],

  checklist: [
    { item: "Your boutique's name, what you sell and your storefront", why: "Ethnic, western, kids or bridal: say it in one line, with a photo of the shop or you, so customers recognise you later.", part: "profile" },
    { item: "The WhatsApp number you actually reply from", why: "Most boutique enquiries are a photo and \"price?\" on WhatsApp. Put that number on the WhatsApp and Call buttons.", part: "actions" },
    { item: "Shop address with a landmark and a Maps link", why: "Customers tap the address for directions, so name the market, the floor and the shop next door.", part: "actions" },
    { item: "Shop timings and your weekly off, in About", why: "There is no separate timings section. Write them in your About text and edit it when festive hours change.", part: "about" },
    { item: "New arrivals as a photo gallery", why: "Fresh stock in one place, full screen. Swap the photos as the rack changes; the link stays the same.", part: "gallery" },
    { item: "Stitching, alterations and bridal wear as services", why: "Each service gets a photo, a price and a WhatsApp button that opens a chat with the service name typed in.", part: "services" },
    { item: "Your Instagram, where customers already follow you", why: "One tap from the card, so a customer follows you before she leaves the shop instead of searching later.", part: "socials" },
    { item: "A QR standee at the billing counter", why: "Customers scan it while the bill is made, save your number and see the gallery. No app needed.", part: "qr" },
  ],

  useCases: [
    { need: "New arrivals without forwarding photos", how: "Put the fresh stock in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum. Swap photos as the rack changes.", feature: "gallery" },
    { need: "Reels that show the fall of a saree", how: "Add Instagram Reels, YouTube videos and Shorts that play on your card, so a customer sees the drape, not just a flat photo.", feature: "video" },
    { need: "Festive discounts that end on a date", how: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires.", feature: "offers" },
    { need: "Customers following you on Instagram", how: "Link Instagram, Facebook, YouTube and more. One tap from the card, so they follow you before they leave the shop.", feature: "socials" },
    { need: "\"Is this available in my size?\"", how: "One tap opens a WhatsApp chat with you. A service button can open it with \"Custom stitching\" already typed in.", feature: "whatsapp" },
    { need: "Payment for a WhatsApp order", how: "Show your payment QR and your Paytm, PhonePe or Google Pay number so customers scan or copy it. The money goes straight to you.", feature: "paymentQr" },
  ],

  shareFlow: { kind: "counter-qr", where: "billing counter", client: "customer" },

  faqs: [
    {
      q: "What should I write on a boutique visiting card?",
      a: "Write your boutique's name, what you sell, the WhatsApp number you reply from, your shop address with a landmark, and your timings in the About text. Add your Instagram. On a digital card, also add new arrivals as a photo gallery, a reel or two, services such as custom stitching with prices, and your payment QR.",
    },
    {
      q: "How do I share new arrivals with customers on WhatsApp?",
      a: "Send your card link once, and update the gallery whenever new stock comes in. The same link shows the latest photos, with a proper preview when it is pasted, so you stop forwarding twenty photos into every chat. A customer who likes a piece taps WhatsApp on the card and asks about it. Our free [WhatsApp message templates](/whatsapp-message-templates) include ready-to-copy messages with your card link.",
    },
    {
      q: "Can I add Instagram reels to my card?",
      a: "Yes. Paste the link of a reel and it plays on your card, along with YouTube videos and Shorts if you have them: 8 videos on Gold, 25 on Platinum. Reels show the fall of a saree or the flare of a lehenga better than a flat photo, so put your best ones on the card and change them as the collection changes.",
    },
    {
      q: "Can customers order or pay online from the card?",
      a: "No. There is no cart or checkout on the card. A customer taps WhatsApp to ask for a piece, and you confirm the size, price and delivery in the chat, the way you already do. To pay, she scans the payment QR on your card or copies your Paytm, PhonePe or Google Pay number. The money goes straight to you.",
    },
    {
      q: "What goes at my billing counter?",
      a: "A printed QR standee, or an NFC standee. Your QR comes as PNG or SVG in your colours, with a printable counter standee, and it keeps working when you redesign your card. An NFC standee is a one-time ₹1,499: customers tap their phone on it or scan it to open your card. Either way they save your number while the bill is made.",
    },
    {
      q: "How much does a digital visiting card for a boutique cost?",
      a: "The card is free for 30 days with no payment details, and your QR is free to download and print for the counter. After the trial, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year with a 60-photo gallery for more new arrivals. If you want customers to tap rather than scan, an NFC standee for the billing counter is a one-time ₹1,499. Your link and QR stay the same when you upgrade, so the standee keeps working.",
    },
  ],

  templateNatures: ["Fashion", "Jewellery", "Beauty & Salon"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my boutique",
  nfcFit: true,
  bulkFit: false,
  relatedIndustries: ["jewellers", "makeup-artists", "beauty-parlours"],
  relatedPosts: ["link-in-bio-vs-digital-business-card", "google-review-qr-code", "visiting-card-design-ideas"],
};

export default boutiques;
