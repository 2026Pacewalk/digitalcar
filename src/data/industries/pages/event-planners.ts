import type { IndustryPage } from "../types";

/* Event Planners, Decorators & Caterers. Share flow: whatsapp-link (the card link
   sent in the chat after a venue visit). */
export const eventPlanners: IndustryPage = {
  slug: "event-planners",
  name: "Event Planners, Decorators & Caterers",
  crumb: "Event Planners",
  audience: "event planners",
  group: "beauty-events",
  order: 15,

  h1: "Digital Visiting Card for Event Planners & Caterers",
  seoTitle: "Event Management Visiting Card: Digital | DigitalCarda",
  description: "A digital visiting card for event planners, decorators and caterers: past-event gallery, packages, WhatsApp and an enquiry form. Free for 30 days.",
  excerpt: "Past events as photos and reels, packages with prices, WhatsApp and an enquiry form. Every lead in one list.",
  answer: "A **digital visiting card for event planners** is one link with your name, company, past events as photos and reels, packages with prices and buttons to call, WhatsApp or save your number. Clients open it from the link you send after a venue visit, or by scanning your QR, and every enquiry from the card lands in your Leads list.",
  primaryKeyword: "event management visiting card",
  keywords: [
    "wedding planner visiting card",
    "visiting card for event management company",
    "catering visiting card",
    "visiting card for decoration business",
    "event planner visiting card",
  ],
  searchTerms: ["wedding planner", "decorator", "caterer", "catering", "tent house", "events"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#F43F5E", ink: "#BE123C", icon: "party-popper", motif: "confetti" },

  sample: {
    name: "Riya Sethi",
    role: "Event & wedding planner",
    org: "Celebrations by Riya",
    services: ["Weddings", "Birthday parties", "Corporate events"],
  },

  pains: [
    {
      pain: "The client asks to see your last wedding stage, and you scroll through months of chats.",
      fix: "Put past events in a **photo gallery** that opens full screen: 20 photos on Gold, 60 on Platinum. One link shows your best work.",
      feature: "gallery",
    },
    {
      pain: "\"Per plate kitna?\" comes with no date, venue or headcount. You spend the evening asking.",
      fix: "The **enquiry form** collects name, number, email and requirement. Ask clients to write the date, venue and guest count there.",
      feature: "enquiryForm",
    },
    {
      pain: "A dozen enquiries for one wedding weekend, and you have forgotten who you already quoted.",
      fix: "Every enquiry lands in your **Leads** list. Mark its stage, add a note about the quote and set a follow-up date.",
      feature: "leadsPipeline",
    },
  ],

  checklist: [
    { item: "Your name, company and what you handle", why: "Planning, decor, catering or all three. One line, so a client knows whether to call you for the mandap or the menu.", part: "profile" },
    { item: "The WhatsApp number clients reach during an event", why: "On the day, the family calls whoever picks up. Put the number that is always answered on the WhatsApp and Call buttons.", part: "actions" },
    { item: "Cities and venues you work in", why: "Write the cities you travel to and the venues you know well in About, so out-of-town clients ask the right questions.", part: "about" },
    { item: "Past events as a photo gallery", why: "Stage, mandap, table settings and buffet counters. Photos of real work, with your clients' permission.", part: "gallery" },
    { item: "Packages as services with prices", why: "Birthday decor, a haldi setup or a per-plate menu: a photo, a price and a WhatsApp button for each.", part: "services" },
    { item: "Reels of the entry and the stage reveal", why: "Instagram Reels and YouTube videos play on the card. Decor moves, and a reel shows that better than a photo.", part: "gallery" },
    { item: "An enquiry form that asks for the date", why: "Clients send their name, number and requirement. Ask for the date, venue and guest count, so the first reply is a quote.", part: "enquiry" },
    { item: "Your Instagram, where clients already look", why: "One tap from the card, so the family that saw your work at a wedding follows you before they forget your name.", part: "socials" },
  ],

  useCases: [
    { need: "Showing past events at a venue visit", how: "Open your gallery on the client's phone: 20 photos on Gold, 60 on Platinum, full screen. Swap in your newest event any time.", feature: "gallery" },
    { need: "The bride's entry and the stage reveal", how: "Add Instagram Reels, YouTube videos and Shorts of past events that play on your card.", feature: "video" },
    { need: "Packages and per-plate rates in writing", how: "List packages and menus with photos, MRP and offer price, and a WhatsApp button that opens a chat with that package's name typed in.", feature: "servicesWithPrices" },
    { need: "Enquiries with the date and headcount", how: "Clients send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Quoting many clients for one season", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
    { need: "Quick questions the night before", how: "One tap opens a WhatsApp chat with you. A service button can open it with the service name already typed in.", feature: "whatsapp" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "venue visit", client: "client" },

  faqs: [
    {
      q: "What should an event management visiting card include?",
      a: "Your name, company name, what you handle, such as planning, decor or catering, the WhatsApp number that is answered during an event, and the cities you work in. A digital card adds what a printed one cannot: a gallery of past events, reels, packages with prices, an enquiry form and a Save Contact button, so the family has your number before the wedding.",
    },
    {
      q: "Can I show past events and packages on the card?",
      a: "Yes. Past events go into a photo gallery that opens full screen, with 20 photos on Gold and 60 on Platinum, and reels or YouTube videos play on the card. Packages are listed as services with a photo, the MRP and the offer price, each with a WhatsApp button, so a client asks about the exact package they liked.",
    },
    {
      q: "How do I share a catering menu with clients?",
      a: "Add menus as services with prices, such as a veg menu at a per-plate rate, or put photos of the menu card and the buffet in your gallery. A client opens the link and sees the options and prices before they call. The card cannot hold a PDF, so if a client wants the full printed menu, send it in the WhatsApp chat.",
    },
    {
      q: "How do clients send an enquiry with their event date?",
      a: "They fill the enquiry form on your card with their name, number, email and requirement; ask them to write the date, venue and guest count in the requirement. It lands in your Leads list, where you mark the stage, add notes and set a follow-up date. There is no calendar on the card, so you confirm the date yourself.",
    },
    {
      q: "Can I take an advance payment through the card?",
      a: "No. The card does not take payments or hold a checkout. You can show your payment QR and your Paytm, PhonePe or Google Pay number on the card, so a client scans or copies it to send the advance, and the money goes straight to you. Confirm the amount and the date in the WhatsApp chat, as you do now.",
    },
    {
      q: "How much does a digital visiting card for an event planner cost?",
      a: "Free for 30 days with no payment details, so you can send the link to clients this wedding season before you pay anything. After that, Gold is ₹99 a month or ₹999 a year with a 20-photo gallery, and Platinum is ₹199 a month or ₹1,999 a year with 60 photos and 25 videos, enough for a decor gallery and a reel from each event. Your link and QR stay the same when you upgrade, so the link you already shared with clients keeps working.",
    },
  ],

  templateNatures: ["Event Planning", "Photography", "Cafe & Bakery"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my event business",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["photographers", "restaurants", "makeup-artists"],
  relatedPosts: ["visiting-card-design-ideas", "link-in-bio-vs-digital-business-card", "how-to-make-a-digital-visiting-card"],
};

export default eventPlanners;
