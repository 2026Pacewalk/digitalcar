import type { IndustryPage } from "../types";

/* Makeup Artists. Share flow: whatsapp-link (the card link sent in the chat
   after the first enquiry from a bride). */
export const makeupArtists: IndustryPage = {
  slug: "makeup-artists",
  name: "Makeup Artists",
  crumb: "Makeup Artists",
  audience: "makeup artists",
  group: "beauty-events",
  order: 9,

  h1: "Digital Visiting Card for Makeup Artists",
  seoTitle: "Makeup Artist Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for makeup artists: bridal portfolio, Instagram reels, packages, WhatsApp and an enquiry form in one link. Free for 30 days.",
  excerpt: "Your bridal portfolio, reels, packages with prices and an enquiry form in one link sent after the first chat.",
  answer: "A **digital visiting card for makeup artists** is one link with your name, bridal portfolio, reels, packages with prices and buttons to WhatsApp or call. Brides open it from the link you send after the first chat or from your Instagram bio, so your work and rates reach them in one place, not as a string of forwarded photos.",
  primaryKeyword: "makeup artist visiting card",
  keywords: [
    "visiting card for makeup artist online free",
    "makeup artist visiting card design",
    "visiting card for freelance makeup artist",
    "mehndi artist visiting card",
    "visiting card for nail artist",
  ],
  searchTerms: ["mua", "bridal makeup", "mehndi", "nail art", "hair stylist"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#EC4899", ink: "#BE185D", icon: "brush", motif: "brush" },

  sample: {
    name: "Tanya Arora",
    role: "Bridal & party makeup artist",
    org: "Tanya Arora Makeup",
    services: ["Bridal makeup", "Party makeup", "HD & airbrush makeup"],
  },

  pains: [
    {
      pain: "Every bride asks \"send your work\", and you forward the same photos from your phone again.",
      fix: "Your **photo gallery** opens full screen from the card. Send one link and the bride sees your best bridal looks in one place.",
      feature: "gallery",
    },
    {
      pain: "Your best reels live on Instagram, where a bride scrolls past everything else to find one.",
      fix: "Add Instagram Reels, YouTube videos and Shorts that play on your card, next to your packages and WhatsApp button.",
      feature: "video",
    },
    {
      pain: "Rates go out one chat at a time, and two brides quote two different prices back to you.",
      fix: "Your **packages with prices** sit on the card, so every bride sees the same bridal, party and airbrush rates.",
      feature: "servicesWithPrices",
    },
  ],

  checklist: [
    { item: "Your name, a clear photo and what you specialise in", why: "Brides hire you, not a studio. Say bridal, party or HD and airbrush makeup plainly, and add mehndi or hair if you do it.", part: "profile" },
    { item: "The WhatsApp number you actually reply on", why: "Almost every enquiry starts as a WhatsApp message. Put that number on the WhatsApp and Call buttons.", part: "actions" },
    { item: "Packages with prices: bridal, party, engagement, trial", why: "Say what each package includes, such as hairstyle and draping. A bride who knows the rate asks about her date instead.", part: "services" },
    { item: "Your bridal portfolio in the gallery", why: "Your best looks, added in the order you want them seen: 20 photos on Gold, 60 on Platinum. Swap them each season.", part: "gallery" },
    { item: "Reels of the transformation, not just the final photo", why: "Add Instagram Reels, Shorts and YouTube videos that play on the card. Brides watch how you work before they message.", part: "gallery" },
    { item: "Your Instagram and YouTube links", why: "Link the profiles brides already follow, and put your card link in your Instagram bio so followers see your packages.", part: "socials" },
    { item: "An enquiry form for the event date and venue", why: "Brides send their name, number, email and requirement, so the date, city and functions reach you in writing.", part: "enquiry" },
    { item: "Cities you travel to and how you charge for outstation", why: "Write it in your About text. It saves the third question in every chat and sets expectations before the trial.", part: "about" },
  ],

  useCases: [
    { need: "Sending your portfolio to a new bride", how: "Your bridal looks in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum. One link instead of a string of forwards.", feature: "gallery" },
    { need: "Reels brides can watch before they decide", how: "Add Instagram Reels, YouTube videos and Shorts that play on your card, so the transformation sits next to your prices.", feature: "video" },
    { need: "The same rates for every bride", how: "List packages with photos, MRP and offer price, and a button that opens WhatsApp with the package name already typed in.", feature: "servicesWithPrices" },
    { need: "Event dates collected in writing", how: "Brides send their name, number, email and requirement, such as the date and venue; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Followers who become clients", how: "Link Instagram, Facebook and YouTube on your card, and put the card link in your Instagram bio so followers see your packages.", feature: "socials" },
    { need: "Quick replies on WhatsApp", how: "One tap opens a WhatsApp chat with you. A package button opens it with \"Bridal makeup\" already typed, so you know what she wants.", feature: "whatsapp" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "first chat", client: "bride" },

  faqs: [
    {
      q: "What should a makeup artist write on a visiting card?",
      a: "Your name, what you specialise in, the WhatsApp number you reply on, your Instagram handle and the cities you travel to. On a digital card, add your bridal portfolio, reels, packages with prices and an enquiry form for the event date. Write your outstation policy and trial details in the About text, so the first chat starts from the date and not the basics.",
    },
    {
      q: "Can I show my bridal makeup portfolio on the card?",
      a: "Yes. Photos go into a gallery that opens full screen, with 20 photos on Gold and 60 on Platinum. Upload your strongest bridal looks first, since photos show in the order you add them, then add party and engagement work, and swap the set after each wedding season. The link you already shared shows the new set, so an old bride's forward still leads to your latest work.",
    },
    {
      q: "Can I add Instagram reels to my card?",
      a: "Yes. Paste the link to an Instagram Reel, a YouTube video or a Short, and it plays on your card. A getting-ready reel next to your bridal package tells a bride more than the final photo alone. Gold allows 8 videos and Platinum 25, so pick the ones that show your range.",
    },
    {
      q: "How do brides send me their event date?",
      a: "Through the enquiry form on your card or on WhatsApp. The form takes their name, number, email and requirement, so a bride writes the date, venue and functions in the requirement box and, if she leaves an email, gets an automatic reply saying you received it. Every enquiry lands in your Leads list, where you mark its stage, add a note and set a follow-up date for the trial. There is no calendar or booking system, so confirm the date on WhatsApp as you do now.",
    },
    {
      q: "How much does a digital visiting card for a makeup artist cost?",
      a: "Free for 30 days with no payment details, long enough to send it to every bride who enquires this month. After that, Gold is ₹99 a month or ₹999 a year with a 20-photo gallery and 8 videos, and Platinum is ₹199 a month or ₹1,999 a year with 60 photos and 25 videos for a full bridal portfolio and reels. Your link and QR stay the same when you upgrade, so the link in your Instagram bio keeps working.",
    },
    {
      q: "I am a freelance makeup artist with no studio. Does the card still work?",
      a: "Yes, it works without an address. Leave the address out or write the cities you cover in the About text, and put the WhatsApp number you reply on at the top. Brides open your card from a WhatsApp link or your Instagram bio, not from a shop counter, so the card is your studio front: portfolio, packages, reels and an enquiry form in one link.",
    },
    {
      q: "Does it work for mehndi and nail artists too?",
      a: "Yes, the card works the same way for mehndi artists, nail artists and hair stylists. Put your designs in the gallery, list packages with prices such as bridal mehndi or gel extensions, and add a reel of your process. If you offer makeup and mehndi together, list both as services so a bride can ask for both in one message.",
    },
  ],

  templateNatures: ["Beauty & Salon", "Fashion", "Photography"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my makeup work",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["beauty-parlours", "photographers", "event-planners"],
  relatedPosts: ["link-in-bio-vs-digital-business-card", "visiting-card-design-ideas", "google-review-qr-code"],
};

export default makeupArtists;
