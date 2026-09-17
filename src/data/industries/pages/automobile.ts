import type { IndustryPage } from "../types";

/* Car Dealers & Automobile Shops. Share flow: counter-qr (QR standee on the
   showroom desk). Teams: bulkFit, one card per salesperson. */
export const automobile: IndustryPage = {
  slug: "automobile",
  name: "Car Dealers & Automobile Shops",
  crumb: "Automobile",
  audience: "car dealers",
  group: "shops-food-travel",
  order: 16,

  h1: "Digital Visiting Card for Car Dealers & Automobile Shops",
  seoTitle: "Automobile Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for car dealers and automobile shops: car photos with prices, WhatsApp, directions and an enquiry form. Free for 30 days.",
  excerpt: "Cars with photos and prices, WhatsApp for test drives, directions and an enquiry form, from your showroom QR.",
  answer: "A **digital visiting card for car dealers and automobile shops** is one link with your name, showroom, the cars you sell with photos and prices, and buttons to call, WhatsApp or get directions. Buyers open it from a QR standee on your showroom desk or a link you send later, and their enquiries land in your Leads list.",
  primaryKeyword: "automobile visiting card",
  keywords: [
    "car dealer visiting card",
    "visiting card for car dealers",
    "car visiting card design",
    "visiting card for automobile shop",
    "business card for car salesman",
  ],
  searchTerms: ["car dealer", "showroom", "used cars", "garage", "car accessories", "bike"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#64748B", ink: "#334155", icon: "car-front", motif: "road" },

  sample: {
    name: "Sandeep Yadav",
    role: "Sales consultant",
    org: "AutoHub Motors",
    services: ["New & used cars", "Exchange", "Test drive on WhatsApp"],
  },

  pains: [
    {
      pain: "A buyer takes your card, then asks for the same car's photos and price on WhatsApp.",
      fix: "Each car goes on your card as a **service with a price**: a photo, the price and a WhatsApp button for that model.",
      feature: "servicesWithPrices",
    },
    {
      pain: "Sunday footfall fills a diary with numbers, and the Monday follow-up calls never happen.",
      fix: "Enquiries from your card land in your **Leads** list, where you set a stage, a note and a follow-up date for each buyer.",
      feature: "leadsPipeline",
    },
    {
      pain: "Each new salesperson needs a box of cards; old ones with wrong numbers still go around.",
      fix: "One design for the whole team. Each salesperson gets a card with their own link and QR, and details change without a reprint.",
      feature: "bulkCards",
    },
  ],

  checklist: [
    { item: "Your name, the dealership and the brands you sell", why: "Buyers visit three showrooms in a weekend. Your face, dealership and brands help them remember which one was you.", part: "profile" },
    { item: "The mobile number you answer on WhatsApp", why: "Buyers ask about price, colour and delivery time on WhatsApp. Put that number on the WhatsApp and Call buttons.", part: "actions" },
    { item: "Showroom address with a Maps link", why: "Buyers tap it for directions to the showroom or the workshop instead of calling you for the route.", part: "actions" },
    { item: "Cars as services, with photos and prices", why: "Each model gets a photo, the price and a WhatsApp button that opens a chat with the car's name already typed in.", part: "services" },
    { item: "A gallery of stock and delivery-day photos", why: "Cars on the floor and handover moments, in a gallery that opens full screen. Buyers forward the link to the family.", part: "gallery" },
    { item: "Exchange, finance help and servicing, in your About text", why: "Write what you offer besides the car, plainly. Add your showroom timings here too; there is no separate timings section.", part: "about" },
    { item: "An enquiry form for test-drive requests", why: "Buyers send their name, number and the car they want to try. No booking calendar: you call back to fix the time.", part: "enquiry" },
    { item: "A QR standee on the showroom desk", why: "Walk-ins scan it while the paperwork is being done and save your number in one tap.", part: "qr" },
  ],

  useCases: [
    { need: "Showing stock without flooding the chat", how: "Put car photos in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", feature: "gallery" },
    { need: "Cars with prices buyers can compare", how: "List each car with photos, its price and an offer price if you have one, and a button to call or WhatsApp about that car.", feature: "servicesWithPrices" },
    { need: "Test-drive requests on WhatsApp", how: "A car's button opens a WhatsApp chat with its name already typed in, so you know which model the buyer wants to drive.", feature: "whatsapp" },
    { need: "Requirements in the buyer's own words", how: "Buyers send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "A card for every salesperson", how: "For 10 or more staff, add the team, pick one design and get volume pricing from ₹799 down to ₹399 per card per year, plus GST.", feature: "bulkCards" },
    { need: "Festive-season and year-end deals", how: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires, so nobody asks for last month's deal.", feature: "offers" },
  ],

  shareFlow: { kind: "counter-qr", where: "showroom", client: "buyer" },

  faqs: [
    {
      q: "What should a car dealer visiting card include?",
      a: "Your name, the dealership, the brands you sell, the mobile number you answer on WhatsApp and the showroom address with a Maps link. A digital card adds the cars themselves: photos, prices and a WhatsApp button for each model, plus an enquiry form for test-drive requests. Write exchange, finance help, insurance and servicing in your About text, along with your showroom timings.",
    },
    {
      q: "How can I share car photos and prices with buyers?",
      a: "Add each car as a service with a photo and its price, and put more photos in the gallery, which opens full screen with 20 photos on Gold and 60 on Platinum. You can also add YouTube walkaround videos or Instagram Reels that play on the card. Then send one link on WhatsApp instead of a stream of photos. When a car sells, remove it; the link buyers already have shows what is on the floor now.",
    },
    {
      q: "Can buyers ask for a test drive from the card?",
      a: "Yes, by tapping WhatsApp or filling the enquiry form; there is no booking calendar or time slots on the card. A car's WhatsApp button opens a chat with the model already typed in, so the buyer only adds when they are free. Form requests land in your Leads list with the buyer's name and number, and you call back to fix the time.",
    },
    {
      q: "Can each salesperson have a card?",
      a: "Yes. For 10 or more staff, add the team, pick one design and every salesperson gets a card with their own link and QR, at volume pricing from ₹799 down to ₹399 per card per year, plus GST. Buyers save the person they dealt with, and details change without a reprint. A smaller showroom can run up to 3 cards from one Platinum login. See [team cards](/bulk-cards).",
    },
    {
      q: "How much does a digital visiting card for a car showroom cost?",
      a: "For a showroom the usual set-up is one card per salesperson plus an NFC standee at the desk. Team cards for 10 or more staff run from ₹799 down to ₹399 per card per year, plus GST, and the NFC standee is a one-time ₹1,499. A single card is free for 30 days with no payment details, then Gold is ₹99 a month or ₹999 a year and Platinum ₹199 a month or ₹1,999 a year with a 60-photo gallery. Your link and QR stay the same when you upgrade.",
    },
    {
      q: "Does it work for a garage, spare parts or accessories shop?",
      a: "Yes. Any automobile business that hands out a phone number can use it: list your services or parts with prices, add photos of the workshop, and put the QR on the counter so customers save your number while they wait. Two-wheeler dealers and showrooms work the same way, with bikes listed in place of cars.",
    },
  ],

  templateNatures: ["Automobile", "Home Services"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my car showroom",
  nfcFit: true,
  bulkFit: true,
  relatedIndustries: ["insurance-agents", "home-services", "travel-agencies"],
  relatedPosts: ["qr-code-business-card-vcard", "nfc-business-card-india", "how-to-make-a-digital-visiting-card"],
};

export default automobile;
