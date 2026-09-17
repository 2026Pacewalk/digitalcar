import type { IndustryPage } from "../types";

/* Jewellers & Jewellery Shops. Share flow: counter-qr (QR or NFC standee at the
   showroom counter). Not a regulated profession here, so offers and the review
   button are fine. Gold rates change daily, so the copy never quotes a price. */
export const jewellers: IndustryPage = {
  slug: "jewellers",
  name: "Jewellers & Jewellery Shops",
  crumb: "Jewellers",
  audience: "jewellers",
  group: "shops-food-travel",
  order: 10,

  h1: "Digital Visiting Card for Jewellery Shops",
  seoTitle: "Jewellery Shop Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for your jewellery shop: collections in a photo gallery, WhatsApp, directions, offers and save contact. Free for 30 days.",
  excerpt: "Collections as a full-screen gallery and reels, festival offers and directions, from a QR at your counter.",
  answer: "A **digital visiting card for a jewellery shop** is one link with your shop name, address, photos of your collections, reels of new designs and buttons to call, WhatsApp, get directions or save your number. Customers open it by scanning the QR standee at your counter, or from a WhatsApp message you send, so your shop stays in their phone.",
  primaryKeyword: "jewellery visiting card",
  keywords: [
    "jewellery shop visiting card",
    "visiting card for jewellery showroom",
    "jewellery shop visiting card design",
    "visiting card for artificial jewellery shop",
    "visiting card for gold shop",
  ],
  searchTerms: ["jeweller", "gold", "silver", "diamond", "artificial jewellery"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#CA8A04", ink: "#854D0E", icon: "gem", motif: "facets" },

  sample: {
    name: "Suhani Jewels",
    role: "Gold · Diamond · Silver",
    org: "Suhani Jewels",
    services: ["Bridal sets", "Daily wear gold", "Custom designs"],
  },

  pains: [
    {
      pain: "\"Send me photos\" means your staff WhatsApp the tray from their personal phones.",
      fix: "Your collections sit in a **photo gallery** that opens full screen. One link shows the whole family every set, in your name.",
      feature: "gallery",
    },
    {
      pain: "The Dhanteras offer on your printed card is over, but the card is still in circulation.",
      fix: "Post an offer with a \"valid till\" date. It drops off your card by itself when the festival is over, so nobody asks for it later.",
      feature: "offers",
    },
    {
      pain: "Customers remember the bazaar lane and the counter, not your shop's name and number.",
      fix: "**Save Contact** puts your shop's name, number and address into their phonebook in one tap, before they leave the counter.",
      feature: "saveContact",
    },
  ],

  checklist: [
    { item: "Shop name and what you sell", why: "Gold, silver, diamond or artificial: say it in the first line so a customer knows they are at the right shop.", part: "profile" },
    { item: "BIS hallmarking and your exchange policy, in About", why: "Customers ask about both before buying gold. Write them plainly in About and edit them when the policy changes.", part: "about" },
    { item: "The number your counter answers on WhatsApp", why: "Customers send screenshots of a design and ask for the rate there. Put that number on the WhatsApp button.", part: "actions" },
    { item: "Shop address with the lane and a landmark", why: "Customers tap the address for directions in Google Maps, which matters in a crowded market.", part: "actions" },
    { item: "Your collections as a photo gallery", why: "Bridal sets, daily wear and custom pieces in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", part: "gallery" },
    { item: "Festival offers with an end date", why: "Making-charge offers for Dhanteras or Akshaya Tritiya, with a valid till date, so the card is never out of date.", part: "services" },
    { item: "A Google review button", why: "A \"Write a Review\" button opens your Google review page. Ask once the piece is packed and the customer is happy.", part: "actions" },
    { item: "A QR standee at the counter", why: "Customers scan it while the piece is being packed and save your number before they leave.", part: "qr" },
  ],

  useCases: [
    { need: "Showing the whole collection without the tray", how: "Put your sets in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum. Swap them as new stock arrives.", feature: "gallery" },
    { need: "New designs the customer's family can see", how: "Add YouTube videos, Shorts and Instagram Reels of new arrivals that play on your card.", feature: "video" },
    { need: "Festival offers that end on time", how: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires, so nobody asks for a finished offer.", feature: "offers" },
    { need: "Customers finding the shop in the market", how: "Customers tap your address to open directions in Google Maps.", feature: "mapsLink" },
    { need: "Rate enquiries on WhatsApp", how: "One tap opens a WhatsApp chat with your counter number. A collection's button can open the chat with its name already typed in.", feature: "whatsapp" },
    { need: "A tap or scan at the counter", how: "An NFC standee (₹1,499) at the counter: customers tap their phone on it or scan it to open your card.", feature: "nfcStandee" },
  ],

  shareFlow: { kind: "counter-qr", where: "showroom counter", client: "customer" },

  faqs: [
    {
      q: "What should be on a jewellery shop visiting card?",
      a: "Your shop name, what you sell (gold, silver, diamond or artificial), the WhatsApp number your counter answers, the address with a landmark, and a line on BIS hallmarking and exchange. A digital card adds a photo gallery of your collections, reels of new designs, festival offers and buttons to call, WhatsApp, get directions and save your number.",
    },
    {
      q: "Can I show my collection on the card?",
      a: "Yes. Photos of your sets go into a gallery that opens full screen, with 20 photos on Gold and 60 on Platinum, and you can add YouTube videos, Shorts or Instagram Reels that play on the card. Swap pieces as stock changes; the link and the QR on your counter stay the same. Gold rates change daily, so you can leave prices out and let customers ask on WhatsApp.",
    },
    {
      q: "Can I write my card details in Hindi?",
      a: "Yes, write your shop name, About text, collections and offers in Hindi or any language you like, and rename the section titles too. The buttons such as Call, WhatsApp and Save Contact stay in English. Customers who prefer Hindi read your details in Hindi, and the buttons work the same way for everyone.",
    },
    {
      q: "How do customers find my showroom?",
      a: "They tap your address on the card, and directions open in Google Maps. Add the lane, the floor and a landmark in the address, because market addresses are hard to follow on a map alone. The card links to Maps; it does not show a map inside the card.",
    },
    {
      q: "Can customers pay by scanning the card?",
      a: "You can show your payment QR image and your Paytm, PhonePe or Google Pay number on the card, and customers scan or copy it at the counter. The money goes straight to you; DigitalCarda does not handle it. The card has no cart or checkout, so it is for paying at the counter, not for ordering online.",
    },
    {
      q: "How much does a digital visiting card for a jewellery shop cost?",
      a: "The card is free for 30 days with no payment details, and your QR is free to download for a counter standee. After that, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year with a 60-photo gallery, room for every collection. An NFC standee for the showroom counter is a one-time ₹1,499. Your link and QR stay the same when you upgrade, so the standee keeps working.",
    },
  ],

  templateNatures: ["Jewellery", "Fashion"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my jewellery shop",
  nfcFit: true,
  bulkFit: false,
  relatedIndustries: ["boutiques", "makeup-artists", "event-planners"],
  relatedPosts: ["google-review-qr-code", "nfc-business-card-india", "visiting-card-design-ideas"],
};

export default jewellers;
