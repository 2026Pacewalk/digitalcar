import type { IndustryPage } from "../types";

/* Travel Agencies & Tour Operators. Share flow: whatsapp-link (the card link sent
   in the chat right after a traveller's first enquiry). */
export const travelAgencies: IndustryPage = {
  slug: "travel-agencies",
  name: "Travel Agencies & Tour Operators",
  crumb: "Travel Agencies",
  audience: "travel agents",
  group: "shops-food-travel",
  order: 14,

  h1: "Digital Visiting Card for Travel Agencies",
  seoTitle: "Tour & Travels Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for travel agents and tour operators: packages with prices, WhatsApp, offers with end dates, an enquiry form. Free for 30 days.",
  excerpt: "Tour packages with prices, offers with end dates, WhatsApp and an enquiry form, with every lead in one list.",
  answer: "A **digital visiting card for travel agencies** is one link with your agency name, office address, packages with prices, photos from past trips and buttons to call, WhatsApp or save your number. Travellers open it from the link you send after the first enquiry, or by scanning your QR, and every enquiry from the card lands in your Leads list.",
  primaryKeyword: "travel agency visiting card",
  keywords: [
    "tour and travels visiting card",
    "visiting card for travel agent",
    "tour and travels visiting card in hindi",
    "visiting card for car rental",
    "visiting card tours and travels marathi",
  ],
  searchTerms: ["tours", "travels", "travel agent", "taxi", "car rental", "holidays"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#0284C7", ink: "#075985", icon: "plane", motif: "route" },

  sample: {
    name: "Wanderlust Trips",
    role: "Holidays & tour packages",
    org: "Wanderlust Trips",
    services: ["Domestic tours", "International holidays", "Group trips"],
  },

  pains: [
    {
      pain: "Your Goa package lives in a dozen forwarded images, and the price on half of them is old.",
      fix: "List packages as **services with prices**: a photo, MRP, offer price and a WhatsApp button on each. Edit a price once, everywhere.",
      feature: "servicesWithPrices",
    },
    {
      pain: "Enquiries pour in on WhatsApp all evening, and the ones to call back are gone by morning.",
      fix: "Enquiries from your card land in your **Leads** list, where you mark the stage, add a note and set a follow-up date.",
      feature: "leadsPipeline",
    },
    {
      pain: "An early-bird discount on your flyer is still being forwarded after the date has passed.",
      fix: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires.",
      feature: "offers",
    },
  ],

  checklist: [
    { item: "Your agency name, what you do and your face", why: "Tours, tickets, taxi or all three. A traveller should know in one line whether you can help, and whom they spoke to.", part: "profile" },
    { item: "The WhatsApp number you reply from, even on a Sunday", why: "Travel enquiries come at night and on holidays. Put the number you actually answer on the WhatsApp and Call buttons.", part: "actions" },
    { item: "Office address with a Maps link", why: "Near the bus stand or the station: travellers tap it for directions when they come to pay or collect tickets.", part: "actions" },
    { item: "Destinations and trip types you handle", why: "Kerala, Goa, Char Dham, honeymoons or group trips. Write them in About, in the language your customers read.", part: "about" },
    { item: "Packages as services with prices", why: "A photo, MRP and offer price for each package, with a WhatsApp button so travellers ask about the exact one they saw.", part: "services" },
    { item: "Photos from past trips as a gallery", why: "Real photos of your groups, the hotel and the bus, taken with permission, do more than a stock picture of a beach.", part: "gallery" },
    { item: "An enquiry form for dates and headcount", why: "Travellers send their name, number and requirement; ask them to write the dates and the number of people.", part: "enquiry" },
    { item: "Your QR on the office door and on receipts", why: "Anyone who scans it opens your card, sees the packages and saves your number in one tap.", part: "qr" },
  ],

  useCases: [
    { need: "Package prices travellers can see themselves", how: "List packages with photos, MRP and offer price, and a WhatsApp button on each, so a traveller asks about the exact package they saw.", feature: "servicesWithPrices" },
    { need: "Early-bird deals that end on a date", how: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires.", feature: "offers" },
    { need: "\"Is this package available for my dates?\"", how: "One tap opens a WhatsApp chat with you. A package button can open it with the package name already typed in.", feature: "whatsapp" },
    { need: "Travel dates and headcount in writing", how: "Travellers send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Photos from past trips", how: "Show your groups' photos in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", feature: "gallery" },
    { need: "Following up before the season fills", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "first enquiry", client: "traveller" },

  faqs: [
    {
      q: "What should I write on a tour and travels visiting card?",
      a: "Write your agency name, what you handle, such as holiday packages, tickets or taxi hire, the WhatsApp number you reply from, your office address and the destinations you cover. A digital card also carries your packages with prices, photos from past trips, offers with an end date and an enquiry form, which a printed card cannot.",
    },
    {
      q: "Can I share tour packages from my card?",
      a: "Yes. Add each package as a service with a photo, the MRP and the offer price, and a WhatsApp button that opens a chat with the package name already typed in. Edit a price once and every traveller who opens the link sees the new one. The card does not hold a day-wise itinerary file, so send that in the chat when a traveller asks.",
    },
    {
      q: "Can I show offers that expire on a date?",
      a: "Yes. Post an offer, such as an early-bird price for a December group trip, with a \"valid till\" date. It drops off your card by itself when it expires, so nobody quotes an old price from a forwarded flyer. Add a new offer whenever the next season opens.",
    },
    {
      q: "Can I write my card in Hindi or Marathi?",
      a: "Yes. Write your name, About text, packages and offers in any language; only the buttons, such as Call and WhatsApp, stay in English. There is no button that changes the language on one card, so write in the language most of your customers read. On Platinum you can run up to 3 cards from one login, each with its own link and QR, if you want a Marathi card and an English one.",
    },
    {
      q: "Can travellers book or pay for a package on the card?",
      a: "No. The card does not take bookings or payments. A traveller taps WhatsApp or fills the enquiry form with their dates and the number of people, and you confirm seats and collect payment the way you do today. You can show your payment QR and your Paytm, PhonePe or Google Pay number on the card, and the money goes straight to you.",
    },
    {
      q: "How much does a digital visiting card for a travel agency cost?",
      a: "Free for 30 days with no payment details, which covers a season of enquiries before you pay. After that, Gold is ₹99 a month or ₹999 a year with a 20-photo gallery, and Platinum is ₹199 a month or ₹1,999 a year with 60 photos and 25 videos, room for a gallery and a reel from each package. Your link and QR stay the same when you upgrade, so the QR on your office door keeps working.",
    },
  ],

  templateNatures: ["Travel", "Event Planning"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my travel agency",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["event-planners", "restaurants", "automobile"],
  relatedPosts: ["link-in-bio-vs-digital-business-card", "how-to-make-a-digital-visiting-card", "qr-code-business-card-vcard"],
};

export default travelAgencies;
