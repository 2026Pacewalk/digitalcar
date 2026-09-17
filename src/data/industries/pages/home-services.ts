import type { IndustryPage } from "../types";

/* Electricians, Plumbers & Home Services. Share flow: whatsapp-link (the card
   link sent in the chat after a job). Covers electrical, plumbing, AC repair,
   carpentry, painting and pest control. The QR is printed as a plain sticker;
   there is no NFC sticker product, so the copy never says one exists. */
export const homeServices: IndustryPage = {
  slug: "home-services",
  name: "Electricians, Plumbers & Home Services",
  crumb: "Home Services",
  audience: "home service providers",
  group: "property-home",
  order: 11,

  h1: "Digital Visiting Card for Electricians, Plumbers & Home Services",
  seoTitle: "Electrician & Plumber Visiting Card: Digital | DigitalCarda",
  description: "A digital visiting card for electricians, plumbers and AC repair: one-tap call, WhatsApp, service prices and a Google review button. Free for 30 days.",
  excerpt: "Call and WhatsApp in one tap, a rate list, payment QR and a Google review button, sent after every job.",
  answer: "A **digital visiting card for electricians and plumbers** is one link with your name, the areas you cover, a rate list, your payment QR and buttons to call or WhatsApp you. You send it in the WhatsApp chat after a job, or the customer scans it from a sticker, so they find you next time instead of searching.",
  primaryKeyword: "electrician visiting card",
  keywords: [
    "plumber visiting card",
    "ac repair visiting card",
    "visiting card for electrician and plumber",
    "electrician visiting card hindi template",
    "visiting card for carpenter",
  ],
  searchTerms: ["electrician", "plumber", "ac repair", "carpenter", "painter", "pest control"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#65A30D", ink: "#3F6212", icon: "wrench", motif: "bolt" },

  sample: {
    name: "QuickFix Home Services",
    role: "Electrical · Plumbing · AC",
    org: "QuickFix",
    services: ["Electrical repairs", "Plumbing work", "AC service"],
  },

  pains: [
    {
      pain: "The sticker with your number peels off, and the customer calls whoever comes up online.",
      fix: "**Save Contact** puts your name and number into their phonebook in one tap. Next time they search their contacts, not Google.",
      feature: "saveContact",
    },
    {
      pain: "Every enquiry starts with \"kitna lagega?\" and turns into a long call about rates.",
      fix: "List your services with prices, such as visit charge or AC service. Customers see the rate first and message you about the job.",
      feature: "servicesWithPrices",
    },
    {
      pain: "A happy customer tells the society group about you, but a paper card cannot be forwarded.",
      fix: "Your digitalcarda.in link forwards in one tap on WhatsApp, with a preview showing your name, so neighbours can save you too.",
      feature: "shareLink",
    },
  ],

  checklist: [
    { item: "Your name, trade and the areas you cover", why: "\"Electrician, Kothrud and Karve Nagar\" tells a customer in one line whether you will come to them.", part: "profile" },
    { item: "The mobile number you answer on site", why: "Put it on both the Call and WhatsApp buttons. Customers send a photo of the fault on WhatsApp before you visit.", part: "actions" },
    { item: "Working days and emergency timings, in About", why: "There is no separate timings section. Write \"Sunday open, night calls for emergencies\" in your About text.", part: "about" },
    { item: "Services with prices", why: "Visit charge, AC service, geyser fitting: each with a price and a WhatsApp button, so rate questions answer themselves.", part: "services" },
    { item: "A Google review button", why: "A \"Write a Review\" button opens your Google review page. Ask at the end of the job, while the fan is running again.", part: "actions" },
    { item: "Your QR on the meter box or the AC unit", why: "Print your QR as a sticker and leave it at the job. The next time something trips, they scan it and call.", part: "qr" },
  ],

  useCases: [
    { need: "A customer with a burst pipe right now", how: "Customers call you with one tap from your card, with no number to type or misread.", feature: "call" },
    { need: "A photo of the fault before you visit", how: "One tap opens a WhatsApp chat with you. A service button can open the chat with \"AC service\" already typed in.", feature: "whatsapp" },
    { need: "Rate questions answered before the call", how: "List services with photos, MRP and offer price, and a button to call or WhatsApp. Visit charge, fan fitting, AC service, each with its rate.", feature: "servicesWithPrices" },
    { need: "Reviews from customers who were happy", how: "A \"Write a Review\" button that opens your Google review page. Show it right after the job, while the customer is pleased.", feature: "reviewButton" },
    { need: "Being found again months later", how: "Print your QR as a sticker for the meter box or the AC unit. The QR link stays the same when you redesign your card.", feature: "qr" },
    { need: "Getting paid on the spot", how: "Show your payment QR and your Paytm, PhonePe or Google Pay number so customers can scan or copy it. The money goes straight to you.", feature: "paymentQr" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "job", client: "customer" },

  faqs: [
    {
      q: "What should an electrician or plumber put on a visiting card?",
      a: "Your name, your trade, the areas you cover, the mobile number you answer, your working days and a short list of services with rates. On a digital card, add a Call button, a WhatsApp button, your payment QR and a Google review button, and write the details in Hindi or any language you like.",
    },
    {
      q: "Can customers call or WhatsApp me straight from the card?",
      a: "Yes. The Call button dials your number in one tap, and the WhatsApp button opens a chat with you. Each service can have its own WhatsApp button that opens the chat with the service name already typed, so \"AC service\" arrives as the first message and you know what the job is before you reply.",
    },
    {
      q: "How do I get more Google reviews from customers?",
      a: "Add your Google review link to the card, and it becomes a \"Write a Review\" button that opens your review page. Ask every customer at the end of the job, when the fan is running and the leak has stopped: send the card link in the chat and say one line. Never pay or offer a discount for a review; that breaks Google's rules.",
    },
    {
      q: "Can I write my card in Hindi?",
      a: "Yes, write your name, services, About text and rates in Hindi or any language you like, and rename the section titles too. The buttons such as Call, WhatsApp and Save Contact stay in English. Many people search for an electrician visiting card Hindi template to print; a digital card lets you type it once and change it any time.",
    },
    {
      q: "Can customers book a technician from the card?",
      a: "Not with a calendar or time slots; the card has no booking system. Customers tap WhatsApp or the enquiry form and tell you the problem and when they are home, and you confirm the time in the chat. Enquiries from the form land in your Leads list with a follow-up date, which helps when three jobs come in on one evening.",
    },
    {
      q: "How much does a digital visiting card for an electrician or plumber cost?",
      a: "Free for 30 days with no payment details, and the QR is free to download, so you can print stickers for your van and the jobs you finish before paying anything. After that, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year if you want a bigger gallery of finished work. Your link and QR stay the same when you upgrade, so the stickers you have already left at jobs keep working.",
    },
  ],

  templateNatures: ["Home Services", "Automobile"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my home services business",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["interior-designers", "automobile", "real-estate"],
  relatedPosts: ["google-review-qr-code", "qr-code-business-card-vcard", "how-to-make-a-digital-visiting-card"],
};

export default homeServices;
