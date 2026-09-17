import type { IndustryPage } from "../types";

/* Photographers. Share flow: whatsapp-link (the card link sent in the chat after
   the first call with a couple). Gallery-first page. There is no booking
   calendar, so availability is answered on WhatsApp (see the FAQ). */
export const photographers: IndustryPage = {
  slug: "photographers",
  name: "Photographers",
  crumb: "Photographers",
  audience: "photographers",
  group: "beauty-events",
  order: 12,

  h1: "Digital Visiting Card for Photographers",
  seoTitle: "Photography Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for photographers: full-screen gallery, videos, packages, WhatsApp and an enquiry form in one link. Free for 30 days.",
  excerpt: "Your portfolio full screen, highlight films, packages with prices and an enquiry form, in one link.",
  answer: "A **digital visiting card for photographers** is one link with your portfolio that opens full screen, highlight films, packages with prices and an enquiry form. You send it in the WhatsApp chat after the first call, or put it in your Instagram bio, and a couple can see your work and send their date from the card.",
  primaryKeyword: "photography visiting card",
  keywords: [
    "photographer visiting card",
    "digital business card for photographers",
    "visiting card for photography studio",
    "photographer visiting card design",
    "visiting card for cameraman",
  ],
  searchTerms: ["photographer", "videographer", "studio", "wedding photography", "cameraman"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#A855F7", ink: "#7E22CE", icon: "camera", motif: "aperture" },

  sample: {
    name: "Ishaan Kapoor",
    role: "Wedding & portrait photographer",
    org: "Frame Stories",
    services: ["Weddings", "Pre-wedding shoots", "Portraits"],
  },

  pains: [
    {
      pain: "WhatsApp compresses your best frames, and the couple forwards the blur to their family.",
      fix: "Your work sits in a **photo gallery** that opens full screen. The couple forwards one link, and the family sees the same set.",
      feature: "gallery",
    },
    {
      pain: "Instagram shows your work, but a link in bio cannot take a date, a venue and a number.",
      fix: "Your card's **enquiry form** takes their name, number, email, date and venue. Those who leave an email get an automatic reply.",
      feature: "enquiryForm",
    },
    {
      pain: "Season enquiries pile up in chats, and you forget who was quoted for which date.",
      fix: "Enquiries land in your **Leads** list. Mark the stage, note the quote and the date, and set a follow-up so nobody slips.",
      feature: "leadsPipeline",
    },
  ],

  checklist: [
    { item: "Your name, studio and what you shoot", why: "Weddings, pre-weddings, portraits or products: say it in one line so a couple knows they found the right person.", part: "profile" },
    { item: "The number you answer on WhatsApp", why: "Couples send their date and venue on WhatsApp first. Put that number on the WhatsApp button.", part: "actions" },
    { item: "Your city and where you travel for shoots", why: "Write \"Mumbai, and destination weddings across India\" in About, so out-of-town couples know to ask.", part: "about" },
    { item: "A portfolio gallery, edited hard", why: "Your best frames only, in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum. Fewer, stronger images.", part: "gallery" },
    { item: "Highlight films and reels", why: "Add YouTube videos, Shorts and Instagram Reels that play on the card, so a couple sees how you cover a wedding day.", part: "gallery" },
    { item: "Packages with starting prices", why: "Half-day, full-day and pre-wedding packages with a price and a WhatsApp button, so the budget talk starts honestly.", part: "services" },
    { item: "An enquiry form for the date and venue", why: "Couples send their name, number, email and requirement. It lands in your Leads list with a follow-up date.", part: "enquiry" },
    { item: "Your Instagram and YouTube links", why: "Link Instagram, Facebook, YouTube and more, so a couple who found you on the card can follow the newer work too.", part: "socials" },
  ],

  useCases: [
    { need: "A portfolio that survives WhatsApp", how: "Show your work in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum. Change the set for each season.", feature: "gallery" },
    { need: "Highlight films a couple can watch at home", how: "Add YouTube videos, Shorts and Instagram Reels that play on your card, from teasers to full wedding films.", feature: "video" },
    { need: "Packages without retyping them in every chat", how: "List packages with photos, MRP and offer price, and a button to WhatsApp you about the one they like.", feature: "servicesWithPrices" },
    { need: "The date, venue and budget in writing", how: "Couples send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Your Instagram, one tap away", how: "Link Instagram, Facebook, YouTube and more, so a couple who lands on your card can see the latest work.", feature: "socials" },
    { need: "Knowing whether the link you sent was opened", how: "See how many people opened your card, what they tapped and where they came from, such as WhatsApp or a QR scan.", feature: "analytics" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "first call", client: "couple" },

  faqs: [
    {
      q: "What should I put on a photography visiting card?",
      a: "Your name, studio name, what you shoot, your city, the number you answer on WhatsApp and your Instagram handle. A digital photography visiting card adds what paper cannot: a portfolio that opens full screen, highlight films, packages with prices and an enquiry form for the date and venue. Keep the gallery short and strong; a couple decides in a few swipes.",
    },
    {
      q: "What makes a good digital business card for photographers?",
      a: "The work comes first: a full-screen gallery of your best frames, then films, then packages with prices, then one clear WhatsApp button. Add an enquiry form so a couple can send their date without calling, and link your Instagram for the newer work. Everything else, such as awards and a long bio, can wait for the About text.",
    },
    {
      q: "Can clients check my availability?",
      a: "No, the card has no calendar or booking system. Couples send you their date and venue on WhatsApp or through the enquiry form, and you confirm in the chat. If you keep a booking tool elsewhere, a service button can link to it. Enquiries from the form land in your Leads list, so a date you have already taken is easy to check against.",
    },
    {
      q: "How many photos and videos can I add?",
      a: "Gold gives you 20 photos and 8 videos; Platinum gives you 60 photos and 25 videos. Photos open in a full-screen gallery, and videos are YouTube links, Shorts or Instagram Reels that play on the card, so film length is not a problem. A tight set that changes each season usually works better than everything you have shot.",
    },
    {
      q: "Can I use the card as my Instagram link in bio?",
      a: "Yes. Paste your digitalcarda.in link in your Instagram bio, and visitors land on your portfolio, packages and WhatsApp button. The catalogue also has link-in-bio designs, but they do not include the enquiry form, so pick a classic design if you want couples to send their date from the card. [Link in bio vs digital business card](/blog/link-in-bio-vs-digital-business-card) explains the difference.",
    },
    {
      q: "How much does a digital visiting card for a photographer cost?",
      a: "Free for 30 days with no payment details. After that, Gold is ₹99 a month or ₹999 a year with a 20-photo gallery and 8 videos, and Platinum is ₹199 a month or ₹1,999 a year with 60 photos and 25 videos, room for a full wedding portfolio and a highlight film from each shoot. Your link and QR stay the same when you upgrade, so the link in your Instagram bio keeps working.",
    },
  ],

  templateNatures: ["Photography", "Event Planning"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my photography work",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["event-planners", "makeup-artists", "digital-agencies"],
  relatedPosts: ["link-in-bio-vs-digital-business-card", "visiting-card-design-ideas", "what-is-a-digital-visiting-card"],
};

export default photographers;
