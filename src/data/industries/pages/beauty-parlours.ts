import type { IndustryPage } from "../types";

/* Beauty Parlours & Salons. Share flow: counter-qr (QR or NFC standee at the
   front desk, scanned while a client waits or pays). */
export const beautyParlours: IndustryPage = {
  slug: "beauty-parlours",
  name: "Beauty Parlours & Salons",
  crumb: "Beauty Parlours & Salons",
  audience: "beauty parlours",
  group: "beauty-events",
  order: 6,

  h1: "Digital Visiting Card for Beauty Parlours & Salons",
  seoTitle: "Beauty Parlour Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for your salon or beauty parlour: services with prices, WhatsApp, offers, a gallery and a Google review button. Free for 30 days.",
  excerpt: "Your price list, offers, photos, WhatsApp and a Google review button, opened from a standee at the front desk.",
  answer: "A **digital visiting card for beauty parlours** is one link with your salon's name, services with prices, offers, photos and buttons to call, WhatsApp or save your number. Clients open it by scanning the QR standee at your front desk or from a link you send on WhatsApp, so the rate card lives in their phone.",
  primaryKeyword: "beauty parlour visiting card",
  keywords: [
    "beauty parlour visiting card design",
    "salon visiting card design",
    "salon visiting card",
    "visiting card for beauty salon",
    "online visiting card for beauty parlour",
    "qr code business cards for google reviews",
  ],
  searchTerms: ["salon", "parlour", "spa", "unisex salon", "hair", "beauty"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#F97316", ink: "#C2410C", icon: "scissors", motif: "sparkle" },
  mockup: {
    img: "digital-business-card-salons-spas",
    alt: "Glow Studio, a hair and skin salon: a sample DigitalCarda digital visiting card on a smartphone",
  },

  sample: {
    name: "Glow Studio",
    role: "Hair & Skin",
    org: "Glow Beauty Studio",
    services: ["Hair styling", "Facials", "Bridal makeup"],
  },

  pains: [
    {
      pain: "Every WhatsApp starts with \"facial kitna hai?\", and the desk types the rates out again.",
      fix: "Your **services with prices** sit on the card, so clients see the rate first and message you for a slot instead.",
      feature: "servicesWithPrices",
    },
    {
      pain: "A festive offer goes up on a poster, and clients still ask for it weeks after it ended.",
      fix: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires, so nobody quotes an old price.",
      feature: "offers",
    },
    {
      pain: "Happy clients say \"I'll review you\" at the counter, then forget by the time they get home.",
      fix: "A **Write a Review** button opens your Google review page, so they can leave one while the bill is being made.",
      feature: "reviewButton",
    },
  ],

  checklist: [
    { item: "Your salon's name, logo and a photo of the interior", why: "Clients remember the place, not the owner's name. Use the name on your board so the card and the shopfront match.", part: "profile" },
    { item: "The WhatsApp number your front desk answers", why: "Most clients message before they visit. Put that number on the WhatsApp and Call buttons, not a phone left in a drawer.", part: "actions" },
    { item: "Services with prices, grouped like your rate card", why: "Hair, skin, nails and bridal, each with a price. A client who knows the rate messages for a slot, not for the price.", part: "services" },
    { item: "Photos of your work: hairstyles, nails and bridal looks", why: "The gallery opens full screen. Pick your best and swap them each season instead of sending photos one by one.", part: "gallery" },
    { item: "Opening days and hours, in your About text", why: "There is no separate timings section. Write your hours and weekly off in About and change them for festival weeks.", part: "about" },
    { item: "Your address with a landmark", why: "Clients tap it for directions in Google Maps, which saves the \"which floor?\" call on a busy Sunday.", part: "actions" },
    { item: "Your Instagram, where clients already follow you", why: "Link Instagram and Facebook so a client who found you through the card can follow your latest work.", part: "socials" },
    { item: "A QR standee at the front desk", why: "Clients scan it while they wait or pay, save your number and leave a Google review from the same card.", part: "qr" },
  ],

  useCases: [
    { need: "Rate card questions on WhatsApp", how: "List services with photos, MRP and offer price, and a button to call or WhatsApp. Clients see the rate before they message.", feature: "servicesWithPrices" },
    { need: "Slot requests without a phone call", how: "One tap opens a WhatsApp chat with your front desk. A service button opens it with the service name, such as Facials, already typed in.", feature: "whatsapp" },
    { need: "Festive and off-season offers", how: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires, so nobody asks for last month's deal.", feature: "offers" },
    { need: "Showing your work before the first visit", how: "A gallery that opens full screen: 20 photos on Gold, 60 on Platinum. Hairstyles, nail art and bridal looks in one place.", feature: "gallery" },
    { need: "More Google reviews from regulars", how: "A \"Write a Review\" button opens your Google review page, so a happy client can leave one at the counter while the bill is made.", feature: "reviewButton" },
    { need: "A standee clients tap or scan at the desk", how: "An NFC standee (₹1,499) at your front desk: clients tap their phone on it or scan it to open your card.", feature: "nfcStandee" },
  ],

  shareFlow: { kind: "counter-qr", where: "front desk", client: "client" },

  faqs: [
    {
      q: "How do I make a beauty parlour visiting card?",
      a: "Sign up free, pick a design and add your salon's name, WhatsApp number, address and a photo of the interior. Enter your services with prices, add photos of your work to the gallery and paste your Google review link. Then download your QR for a standee at the front desk and put the link in your Instagram bio. You can write the details in Hindi or any language; the buttons stay in English.",
    },
    {
      q: "What should a salon visiting card include?",
      a: "Your salon's name, the WhatsApp number your front desk answers, your address with a landmark, your services with prices and your opening hours. On a digital card, add photos of your work, current offers, your Instagram link and a Google review button. Keep the prices current: it is one edit, and your link and QR stay the same.",
    },
    {
      q: "Can clients book an appointment from the card?",
      a: "No, there is no booking system or calendar on the card. Clients tap WhatsApp or Call to ask for a slot, and a service button can open WhatsApp with the service name already typed in, so you know what they want before you reply. Enquiries from the form land in your Leads list. If you already use a booking tool, a service button can link to it.",
    },
    {
      q: "How do I get more Google reviews for my salon?",
      a: "The card makes leaving a review easier, which is the hard part: a \"Write a Review\" button opens your Google review page in one tap. Ask each client as they pay, point at the standee and let them choose. Google's rules do not allow discounts or gifts for reviews, and reviews gained that way can be removed. Our [Google review QR code guide](/blog/google-review-qr-code) covers where to place the code and what to say.",
    },
    {
      q: "How much does an NFC standee for my counter cost?",
      a: "An NFC standee is a one-time ₹1,499, printed on one side, and an NFC card is ₹499. Clients tap their phone on the standee or scan its QR to open your card. If you only want a QR for now, download it free from your dashboard as PNG or SVG and print your own standee. The card itself is free for 30 days, then Gold is ₹99 a month or ₹999 a year.",
    },
    {
      q: "I have two branches. Do I need two cards?",
      a: "Yes, one card per branch works best, because each branch has its own address, staff and timings. Platinum runs up to 3 cards from one login, each with its own link and QR, so you can put a different standee at each front desk and see each branch's visits and enquiries separately.",
    },
  ],

  templateNatures: ["Beauty & Salon", "Fitness"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my salon",
  nfcFit: true,
  bulkFit: false,
  relatedIndustries: ["makeup-artists", "boutiques", "physiotherapists"],
  relatedPosts: ["google-review-qr-code", "nfc-business-card-india", "visiting-card-design-ideas"],
};

export default beautyParlours;
