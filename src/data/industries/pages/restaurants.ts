import type { IndustryPage } from "../types";

/* Restaurants & Cafes. Share flow: counter-qr (QR or NFC standee at the billing
   counter, scanned while the bill is settled). */
export const restaurants: IndustryPage = {
  slug: "restaurants",
  name: "Restaurants & Cafes",
  crumb: "Restaurants & Cafes",
  audience: "restaurants",
  group: "shops-food-travel",
  order: 7,

  h1: "Digital Visiting Card for Restaurants & Cafes",
  seoTitle: "Restaurant Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for your restaurant or cafe: menu photos, WhatsApp, directions, offers and a Google review button. Free for 30 days.",
  excerpt: "Menu photos, today's specials, directions, WhatsApp for takeaway and a Google review button at the counter.",
  answer: "A **digital visiting card for restaurants** is one link with your restaurant's name, menu photos, today's specials with prices, directions and buttons to call or WhatsApp. Guests open it by scanning the QR standee at your billing counter or from a link you send, so they can find you again, message for takeaway and leave a Google review.",
  primaryKeyword: "restaurant visiting card",
  keywords: [
    "restaurant visiting card design",
    "cafe visiting card",
    "visiting card for restaurant owner",
    "google review qr code for restaurant",
    "restaurant visiting card in hindi",
  ],
  searchTerms: ["cafe", "dhaba", "bakery", "cloud kitchen", "food", "hotel"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#EF4444", ink: "#B91C1C", icon: "utensils-crossed", motif: "steam" },
  mockup: {
    img: "digital-business-card-restaurants-retail",
    alt: "Spice Route, a multi-cuisine restaurant: a sample DigitalCarda digital visiting card on a smartphone",
  },

  sample: {
    name: "Spice Route",
    role: "Multi-cuisine restaurant",
    org: "Spice Route Restaurant",
    services: ["Today's specials", "Family dining", "Takeaway on WhatsApp"],
  },

  pains: [
    {
      pain: "A guest asks for the menu to show at home, and the only copy is stuck to table six.",
      fix: "Show the menu as **photos in the gallery** or as a services list with prices. One link, and the whole menu is on their phone.",
      feature: "gallery",
    },
    {
      pain: "\"Bhaiya, restaurant exactly kahan hai?\" The phone rings through every dinner rush.",
      fix: "Guests tap your address to open directions in Google Maps, landmark and all, and your staff can stay on the floor.",
      feature: "mapsLink",
    },
    {
      pain: "Regulars promise a Google review on the way out and forget before they reach the car.",
      fix: "A **Write a Review** button opens your Google review page, so they can leave one while the bill is being settled.",
      feature: "reviewButton",
    },
  ],

  checklist: [
    { item: "Your restaurant's name, logo and a photo of the dining area", why: "Guests remember the place, not the owner. Use the exact name on your board and on Google so all three match.", part: "profile" },
    { item: "The number your counter actually answers", why: "Put it on the Call and WhatsApp buttons. A landline nobody picks up during the rush loses the takeaway order.", part: "actions" },
    { item: "Address with a landmark and a Maps link", why: "Guests tap it for directions. Add the landmark and the parking note you repeat on the phone every evening.", part: "actions" },
    { item: "Opening hours and your weekly off, in your About text", why: "There is no separate timings section. Write lunch and dinner hours in About and update them for festival days.", part: "about" },
    { item: "Today's specials and combos as services with prices", why: "Each item gets a photo, a price and a WhatsApp button, so a guest messages for takeaway with the dish already typed in.", part: "services" },
    { item: "Menu pages as photos in the gallery", why: "Photograph each page in good light. Guests zoom in full screen, and you replace one photo when a price changes.", part: "gallery" },
    { item: "Your payment QR, on the counter and on the card", why: "Guests scan your payment QR or copy your Paytm, PhonePe or Google Pay number. The money goes straight to you.", part: "actions" },
    { item: "A QR standee at the billing counter", why: "Guests scan it while paying, save your number for the next order and tap the Google review button from the same card.", part: "qr" },
  ],

  useCases: [
    { need: "The menu on the guest's phone", how: "Put your menu pages in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum. Swap one photo when a price changes.", feature: "gallery" },
    { need: "Today's specials and takeaway combos", how: "List dishes or combos with photos, MRP and offer price, and a button that opens WhatsApp with the dish name already typed in.", feature: "servicesWithPrices" },
    { need: "Weekday lunch deals and festival offers", how: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires, so nobody argues about last week's deal.", feature: "offers" },
    { need: "Google reviews from happy guests", how: "A \"Write a Review\" button opens your Google review page, so a guest can leave one at the counter while the bill is settled.", feature: "reviewButton" },
    { need: "First-time guests finding the place", how: "Guests tap your address to open directions in Google Maps.", feature: "mapsLink" },
    { need: "A standee at the billing counter", how: "An NFC standee (₹1,499): guests tap their phone on it or scan it to open your card, save your number and review you.", feature: "nfcStandee" },
    { need: "Payment without asking for the QR", how: "Show your payment QR and your Paytm, PhonePe or Google Pay number so guests can scan or copy it. The money goes straight to you.", feature: "paymentQr" },
  ],

  shareFlow: { kind: "counter-qr", where: "billing counter", client: "guest" },

  faqs: [
    {
      q: "What should I put on a restaurant visiting card?",
      a: "Your restaurant's name, the number your counter answers, your address with a landmark, your opening hours and the kind of food you serve. On a digital card, add menu photos, today's specials with prices, a WhatsApp button for takeaway, your payment QR and a Google review button. Write your hours in the About text, since there is no separate timings section.",
    },
    {
      q: "Can I show my menu on the card?",
      a: "Yes, as photos or as a services list with prices, not as a PDF. Photograph each menu page and put it in the gallery, which opens full screen, or list dishes as services with a photo and a price each. There is no file upload on the card, so a PDF menu will not work; the photo route is faster to update anyway, because one photo swap fixes a price change.",
    },
    {
      q: "Can guests reserve a table from the card?",
      a: "No, the card has no reservation system. Guests tap Call or WhatsApp to ask for a table, and a service button such as Family dining can open WhatsApp with that text already typed in, so your counter knows what the message is about. If you take table requests through another tool, a service button can link to it.",
    },
    {
      q: "How do I get more Google reviews for my restaurant?",
      a: "Make leaving a review a one-tap job and ask at the right moment. The \"Write a Review\" button on your card opens your Google review page, and a standee at the billing counter puts it in front of every guest as they pay. Ask every guest, not only the happy ones, and never offer a discount or a free dessert for a review; Google can remove reviews gained that way. Our [Google review QR code guide](/blog/google-review-qr-code) has the wording to use.",
    },
    {
      q: "How much does a QR or NFC standee cost?",
      a: "Your QR code is free: download it as PNG or SVG from your dashboard and print a counter standee yourself. An NFC standee, printed on one side, is a one-time ₹1,499, and an NFC card is ₹499. Guests tap their phone on the standee or scan its QR to open your card. The digital card is free for 30 days, then Gold is ₹99 a month or ₹999 a year.",
    },
    {
      q: "Can I make my restaurant visiting card in Hindi?",
      a: "Yes, write your restaurant's name, dishes, About text and section titles in Hindi or any language you like. The buttons such as Call, WhatsApp and Save Contact stay in English. Dish names in Hindi with prices in numerals read well on any phone, and guests who prefer Hindi can read every detail.",
    },
  ],

  templateNatures: ["Restaurant", "Cafe & Bakery"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my restaurant",
  nfcFit: true,
  bulkFit: false,
  relatedIndustries: ["event-planners", "boutiques", "travel-agencies"],
  relatedPosts: ["google-review-qr-code", "nfc-business-card-india", "link-in-bio-vs-digital-business-card"],
};

export default restaurants;
